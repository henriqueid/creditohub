import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCommitteeRequirements, evaluateReadiness, DEFAULT_REQUIRED_FIELDS } from "@/hooks/useCommitteeRequirements";
import { ANALYSIS_STATUS, type AnalysisStatus, findDealStageForAnalysisStatus } from "@/lib/analysis-status";

const STAGES: { key: AnalysisStatus; label: string; color: string }[] = [
  { key: ANALYSIS_STATUS.draft,               label: "Em análise",  color: T.marinho },
  { key: ANALYSIS_STATUS.in_committee,        label: "Comitê",      color: T.amber },
  { key: ANALYSIS_STATUS.approved,            label: "Aprovado",    color: T.esmeralda },
  { key: ANALYSIS_STATUS.approved_restricted, label: "Restrito",    color: "#D97706" },
  { key: ANALYSIS_STATUS.rejected,            label: "Reprovado",   color: T.danger },
];

function getTier(score: number | null) {
  if (!score) return null;
  if (score >= 800) return "AAA";
  if (score >= 700) return "AA";
  if (score >= 600) return "A";
  return "BBB";
}

function calcReadiness(a: any, requiredKeys: string[]): { pct: number; missing: string[] } {
  const r = evaluateReadiness(requiredKeys, a);
  return { pct: r.pct, missing: r.missing };
}

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct === 100 ? T.esmeralda : pct >= 50 ? T.amber : T.danger;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Prontidão para comitê
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: "rgba(10,21,56,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export default function CreditAnalysisList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [readinessAlert, setReadinessAlert] = useState<{ analysisId: string; missing: string[] } | null>(null);
  const { data: committeeRequiredFields } = useCommitteeRequirements();
  const requiredKeys = committeeRequiredFields ?? DEFAULT_REQUIRED_FIELDS;

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["credit-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf), credit_analysis_sacados(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Deal stages — usado pra sincronizar deal vinculado quando análise muda de status
  const { data: dealStages = [] } = useQuery({
    queryKey: ["deal-stages-for-sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_stages")
        .select("id, name, is_won, is_lost")
        .eq("is_active", true)
        .order("order");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Atualiza status + sincroniza deal_stage do deal vinculado
  const moveStatus = useMutation({
    mutationFn: async ({ analysisId, status }: { analysisId: string; status: AnalysisStatus }) => {
      // 1. Atualiza análise
      const { error } = await supabase
        .from("credit_analysis")
        .update({ status: status as any })
        .eq("id", analysisId);
      if (error) throw error;

      // 2. Sync com Pipeline — atualiza stage do deal vinculado (se houver)
      const targetStageId = findDealStageForAnalysisStatus(status, dealStages);
      if (!targetStageId) return { dealsUpdated: 0, status };

      const { data: deals } = await supabase
        .from("deals")
        .select("id, stage_id")
        .eq("credit_analysis_id", analysisId);

      if (!deals?.length) return { dealsUpdated: 0, status };

      const toUpdate = deals.filter(d => d.stage_id !== targetStageId);
      await Promise.all(
        toUpdate.map(d => supabase.from("deals").update({ stage_id: targetStageId }).eq("id", d.id))
      );
      return { dealsUpdated: toUpdate.length, status };
    },
    onSuccess: ({ dealsUpdated, status }) => {
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      const stageLabel = STAGES.find(s => s.key === status)?.label ?? status;
      if (dealsUpdated > 0) {
        toast.success(`Análise → ${stageLabel} · Deal sincronizado no Pipeline`);
      } else {
        toast.success(`Análise → ${stageLabel}`);
      }
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao mover análise"),
  });

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Defesa: se dealStages ainda não carregou, bloqueia o drag para evitar
    // sync silenciosamente pulado entre análise e Pipeline (deal.stage_id).
    if (dealStages.length === 0) {
      toast.warning("Pipeline ainda carregando, aguarde um instante e tente novamente");
      return;
    }

    const targetStatus = destination.droppableId as AnalysisStatus;
    const analysis = analyses.find(a => a.id === draggableId);
    if (!analysis) return;

    // Guard: ao mover draft → in_committee, exigir prontidão 100%
    if (source.droppableId === ANALYSIS_STATUS.draft && targetStatus === ANALYSIS_STATUS.in_committee) {
      const r = calcReadiness(analysis, requiredKeys);
      if (r.pct < 100) {
        setReadinessAlert({ analysisId: analysis.id, missing: r.missing });
        return;
      }
    }
    moveStatus.mutate({ analysisId: draggableId, status: targetStatus });
  }

  const byStage = STAGES.reduce<Record<string, typeof analyses>>((acc, s) => {
    acc[s.key] = analyses.filter(a => a.status === s.key);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-7 flex flex-col h-full" style={{ minHeight: "calc(100vh - 104px)" }}>
      <PageHeader
        title="Análises de Crédito"
        subtitle={`${analyses.length} ANÁLISES · ARRASTE PARA MOVER ETAPA`}
        actions={
          <button
            onClick={() => navigate("/analises/nova")}
            className="px-[14px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--marinho)" }}
          >
            + Nova análise
          </button>
        }
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: T.textMute, fontSize: 13 }}>
          Carregando…
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            className="flex-1 grid gap-[10px] overflow-x-auto"
            style={{
              gridTemplateColumns: `repeat(${STAGES.length}, minmax(240px, 1fr))`,
              minHeight: 400,
            }}
          >
            {STAGES.map((stage) => {
              const cards = byStage[stage.key] || [];
              const isDraftCol = stage.key === ANALYSIS_STATUS.draft;
              return (
                <div key={stage.key} className="flex flex-col min-w-0">
                  {/* Column header */}
                  <div
                    className="flex justify-between items-center px-[10px] py-[8px]"
                    style={{
                      background: T.white,
                      border: `1px solid ${T.border}`,
                      borderTop: `3px solid ${stage.color}`,
                      borderRadius: "10px 10px 0 0",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{stage.label}</span>
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 22, height: 22,
                        background: cards.length > 0 ? `${stage.color}22` : T.cinza,
                        color: cards.length > 0 ? stage.color : T.textMute,
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards area (droppable) */}
                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto transition-colors"
                        style={{
                          background: snapshot.isDraggingOver ? "rgba(0,212,154,0.06)" : "rgba(10,21,56,0.025)",
                          border: `1px solid ${snapshot.isDraggingOver ? T.esmeralda : T.border}`,
                          borderTop: "none",
                          borderRadius: "0 0 12px 12px",
                          minHeight: 200,
                        }}
                      >
                        {cards.map((a, index) => {
                          const name = (a.clients as any)?.razao_social || "—";
                          const cnpj = (a.clients as any)?.cnpj_cpf || "";
                          const score = a.credit_score;
                          const limite = a.limite_sugerido;
                          const tier = getTier(score);
                          const readiness = isDraftCol ? calcReadiness(a, requiredKeys) : null;
                          const isReady = readiness?.pct === 100;

                          return (
                            <Draggable key={a.id} draggableId={a.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => navigate(`/analises/${a.id}`)}
                                  className="rounded-[10px] p-[10px] cursor-pointer transition-shadow"
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    background: T.white,
                                    border: `1px solid ${dragSnapshot.isDragging ? T.esmeralda : T.border}`,
                                    fontSize: 12,
                                    boxShadow: dragSnapshot.isDragging
                                      ? "0 12px 28px -8px rgba(10,21,56,0.25)"
                                      : "var(--shadow-sm)",
                                    opacity: dragSnapshot.isDragging ? 0.95 : 1,
                                  }}
                                >
                                  <div style={{ fontWeight: 500, color: T.text, lineHeight: 1.3, marginBottom: 4 }}>
                                    {name}
                                  </div>
                                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginBottom: 8 }}>
                                    {cnpj}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.text }}>
                                      {score ? `Score ${score}` : "Sem score"}
                                    </span>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.text }}>
                                      {limite ? formatBRL(limite) : "—"}
                                    </span>
                                  </div>
                                  {tier && (
                                    <div className="mt-2">
                                      <StatusBadge status={tier} />
                                    </div>
                                  )}
                                  {readiness && <ReadinessBar pct={readiness.pct} />}
                                  {isReady && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveStatus.mutate({ analysisId: a.id, status: ANALYSIS_STATUS.in_committee });
                                      }}
                                      disabled={moveStatus.isPending}
                                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors hover:opacity-90"
                                      style={{ background: T.esmeralda, color: T.marinho }}
                                    >
                                      <Send style={{ width: 10, height: 10 }} />
                                      Enviar ao Comitê
                                    </button>
                                  )}
                                  {readiness && !isReady && readiness.missing.length > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.textMute, marginBottom: 2 }}>
                                        Faltando:
                                      </p>
                                      {readiness.missing.slice(0, 3).map(m => (
                                        <span key={m} style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, color: T.textMute }}>
                                          · {m}
                                        </span>
                                      ))}
                                      {readiness.missing.length > 3 && (
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.textMute }}>
                                          · +{readiness.missing.length - 3} mais
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {cards.length === 0 && !snapshot.isDraggingOver && (
                          <div
                            className="flex-1 flex items-center justify-center py-6 pointer-events-none"
                            style={{ fontSize: 12, color: T.textFaint }}
                          >
                            Nenhuma
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      <AlertDialog open={!!readinessAlert} onOpenChange={(o) => !o && setReadinessAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dossiê incompleto</AlertDialogTitle>
            <AlertDialogDescription>
              Antes de enviar ao comitê, preencha os campos obrigatórios faltantes:
              <ul style={{ marginTop: 8 }}>
                {readinessAlert?.missing.map(m => (
                  <li key={m} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text }}>· {m}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (readinessAlert) navigate(`/analises/${readinessAlert.analysisId}`);
                setReadinessAlert(null);
              }}
            >
              Abrir dossiê
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
