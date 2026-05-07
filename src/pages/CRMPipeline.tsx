import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { toast } from "sonner";
import {
  Plus, ChevronRight, Trophy, XCircle, FileSearch,
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Calendar, User, TrendingUp, Link2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/trilho/PageHeader";
import { NewDealDialog } from "@/components/crm/NewDealDialog";
import { DealDetailSheet } from "@/components/crm/DealDetailSheet";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

const LOSS_REASONS = ["preço", "prazo", "concorrência", "sem fit", "cliente desistiu", "outro"] as const;
type LossReason = typeof LOSS_REASONS[number];

interface Deal {
  id: string;
  client_id: string;
  stage_id: string;
  title: string;
  value: number | null;
  monthly_volume: number | null;
  probability: number | null;
  expected_close_date: string | null;
  responsible: string | null;
  notes: string | null;
  credit_analysis_id: string | null;
  prospect_id: string | null;
  created_at: string;
  clients?: { razao_social: string; cnpj_cpf: string };
}

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

interface CreditAnalysis {
  id: string;
  client_id: string;
  status: string;
  credit_score: number | null;
  limite_sugerido: number | null;
  recommendation: string | null;
  committee_result?: { limite_aprovado: number | null; prazo_aprovado: number | null }[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string; icon: React.ElementType }> = {
  draft:               { label: "Em Análise", bg: "#FFF6DC", fg: "#7A5B00", icon: FileSearch },
  in_committee:        { label: "Em Comitê",  bg: "#E8F4FD", fg: "#0A5F9E", icon: FileSearch },
  approved:            { label: "Aprovado",   bg: "#D6F5E8", fg: "#009E73", icon: ShieldCheck },
  approved_restricted: { label: "Restrição",  bg: "#FCE3CE", fg: "#8A3B00", icon: ShieldAlert },
  rejected:            { label: "Reprovado",  bg: "#F5D6DA", fg: "#7A0E1E", icon: ShieldX },
};

function scoreColor(s: number) {
  if (s >= 700) return T.esmeralda;
  if (s >= 400) return T.amber;
  return T.danger;
}

export default function CRMPipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [guardDialog, setGuardDialog] = useState<{
    open: boolean; dealId: string; stageId: string; stageName: string; reason: string;
  } | null>(null);
  const [lossDialog, setLossDialog] = useState<{
    open: boolean; dealId: string; stageId: string; stageName: string;
  } | null>(null);
  const [lossReason, setLossReason] = useState<LossReason>("preço");
  const [lossNote, setLossNote] = useState("");
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; deal: Deal } | null>(null);
  const [detailDealId, setDetailDealId] = useState<string | null>(null);

  const { data: stages = [] } = useQuery({
    queryKey: ["deal-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_stages").select("*").eq("is_active", true).order("order");
      return (data || []) as Stage[];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals").select("*, clients(razao_social, cnpj_cpf)")
        .order("created_at", { ascending: false });
      return (data || []) as Deal[];
    },
  });

  const { data: creditAnalyses = [] } = useQuery({
    queryKey: ["credit-analyses-for-pipeline"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis")
        .select("id, client_id, status, credit_score, limite_sugerido, recommendation, committee_result(limite_aprovado, prazo_aprovado)")
        .order("created_at", { ascending: false });
      return (data || []) as CreditAnalysis[];
    },
  });

  const latestAnalysisByClient = creditAnalyses.reduce<Record<string, CreditAnalysis>>((acc, ca) => {
    if (!acc[ca.client_id]) acc[ca.client_id] = ca;
    return acc;
  }, {});

  const analysisById = creditAnalyses.reduce<Record<string, CreditAnalysis>>((acc, ca) => {
    acc[ca.id] = ca;
    return acc;
  }, {});

  const moveDeal = useMutation({
    mutationFn: async ({ dealId, stageId, lossReason }: { dealId: string; stageId: string; lossReason?: string | null }) => {
      const payload: Record<string, unknown> = { stage_id: stageId };
      if (lossReason !== undefined) payload.loss_reason = lossReason;
      const { error } = await supabase.from("deals").update(payload).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const linkAnalysis = useMutation({
    mutationFn: async ({ dealId, analysisId }: { dealId: string; analysisId: string }) => {
      const { error } = await supabase.from("deals").update({ credit_analysis_id: analysisId }).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deals"] }); toast.success("Análise vinculada!"); },
  });

  // Cria análise nova vinculada ao cedente + ao deal e abre o dossiê.
  // Se já existe análise em andamento (draft/in_committee) pro cedente, reusa.
  const startAnalysisFromDeal = useMutation({
    mutationFn: async (deal: Deal) => {
      if (!deal.client_id) throw new Error("Deal sem cedente vinculado");

      // Reusa análise existente em andamento, se houver
      const { data: existing } = await supabase
        .from("credit_analysis")
        .select("id")
        .eq("client_id", deal.client_id)
        .in("status", ["draft", "in_committee"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let analysisId = existing?.id;

      if (!analysisId) {
        const { data: created, error } = await supabase
          .from("credit_analysis")
          .insert({
            client_id: deal.client_id,
            status: "draft",
            limite_sugerido: deal.value ?? null,
            volume_estimado: deal.monthly_volume ?? null,
            modalidade_operacao: (deal as any).operation_type ?? null,
          } as { client_id: string } & Record<string, unknown>)
          .select("id")
          .single();
        if (error) throw error;
        analysisId = created.id;
      }

      // Vincula deal -> análise (se ainda não estiver)
      if (deal.credit_analysis_id !== analysisId) {
        await supabase.from("deals").update({ credit_analysis_id: analysisId }).eq("id", deal.id);
      }

      return { analysisId, reused: !!existing };
    },
    onSuccess: ({ analysisId, reused }) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["credit-analyses-for-pipeline"] });
      toast.success(reused ? "Análise existente aberta" : "Análise iniciada!");
      navigate(`/analises/${analysisId}`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao iniciar análise"),
  });

  const { activeStages, wonStage, lostStage, dealsByStage } = useMemo(() => {
    const activeStages = stages.filter(s => !s.is_won && !s.is_lost);
    const wonStage = stages.find(s => s.is_won);
    const lostStage = stages.find(s => s.is_lost);

    // Indexa deals por stage_id pra evitar O(deals × stages) em cada coluna
    const dealsByStage = new Map<string, Deal[]>();
    for (const stage of stages) dealsByStage.set(stage.id, []);
    for (const deal of deals) {
      const arr = dealsByStage.get(deal.stage_id);
      if (arr) arr.push(deal);
    }
    return { activeStages, wonStage, lostStage, dealsByStage };
  }, [stages, deals]);

  const wonDeals = wonStage ? dealsByStage.get(wonStage.id) ?? [] : [];
  const lostDeals = lostStage ? dealsByStage.get(lostStage.id) ?? [] : [];
  const activeDeals = activeStages.flatMap(s => dealsByStage.get(s.id) ?? []);

  const getAnalysis = (deal: Deal): CreditAnalysis | null => {
    if (deal.credit_analysis_id && analysisById[deal.credit_analysis_id]) return analysisById[deal.credit_analysis_id];
    return latestAnalysisByClient[deal.client_id] || null;
  };

  // Limite estimado: soma de deal.value (sempre — é o cap que o comercial pretende liberar).
  // Limite aprovado: soma de committee_result.limite_aprovado quando comitê já decidiu —
  // entra como informação adicional (não substitui o estimado).
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const totalApproved = activeDeals.reduce((s, d) => {
    const aprovado = getAnalysis(d)?.committee_result?.[0]?.limite_aprovado;
    return s + (aprovado && aprovado > 0 ? aprovado : 0);
  }, 0);
  const totalMonthlyVolume = activeDeals.reduce((s, d) => s + (d.monthly_volume || 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const conversionRate = (wonDeals.length + lostDeals.length) > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  const getClientAnalyses = (clientId: string): CreditAnalysis[] =>
    creditAnalyses.filter(a => a.client_id === clientId);

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 68px)", background: "var(--off)" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-7 pt-4 sm:pt-7 pb-0">
        <PageHeader
          title="Pipeline comercial"
          subtitle={`${deals.length} OPORTUNIDADES · ${formatBRL(totalPipeline)} EM ABERTO`}
          actions={
            <button
              onClick={() => setNewDealOpen(true)}
              className="flex items-center gap-2 px-[16px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: T.marinho }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Nova oportunidade
            </button>
          }
        />

        <NewDealDialog open={newDealOpen} onOpenChange={setNewDealOpen} />

        {/* ── KPI strip ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 mb-4">
          {[
            {
              label: "Limite estimado total",
              value: formatBRL(totalPipeline),
              sub: totalApproved > 0
                ? `${formatBRL(totalApproved)} já aprovado em comitê`
                : `${activeDeals.length} deals · cap pretendido`,
              icon: TrendingUp,
            },
            { label: "Volume/mês ativo", value: formatBRL(totalMonthlyVolume), sub: "fluxo esperado mensal", icon: TrendingUp },
            { label: "Taxa de conversão", value: `${conversionRate}%`,   sub: `${wonDeals.length + lostDeals.length} finalizados`, icon: Trophy },
            { label: "Sem análise",     value: String(activeDeals.filter(d => !getAnalysis(d)).length), sub: "oportunidades em risco", icon: AlertTriangle },
          ].map((k, i) => {
            const isAlert = i === 3 && activeDeals.filter(d => !getAnalysis(d)).length > 0;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
                style={{
                  background: T.white,
                  border: `1px solid ${T.border}`,
                  boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
                }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: isAlert ? "rgba(176,24,42,0.08)" : "rgba(0,212,154,0.10)",
                  }}
                >
                  <k.icon style={{ width: 15, height: 15, color: isAlert ? T.danger : T.esmeralda }} />
                </div>
                <div className="min-w-0">
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.10em", color: T.textMute, marginBottom: 2 }}>
                    {k.label}
                  </p>
                  <p className="tabular-nums truncate" style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
                    {k.value}
                  </p>
                  <p className="truncate" style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{k.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto px-4 sm:px-7 pb-7">
        <DragDropContext
          onDragEnd={(result: DropResult) => {
            const { destination, source, draggableId } = result;
            if (!destination) return;
            if (destination.droppableId === source.droppableId) return;

            const targetStage = stages.find(s => s.id === destination.droppableId);

            // Se destino é "Perdido", abre dialog de motivo antes de mover
            if (targetStage?.is_lost) {
              setLossReason("preço");
              setLossNote("");
              setLossDialog({
                open: true,
                dealId: draggableId,
                stageId: destination.droppableId,
                stageName: targetStage.name,
              });
              return;
            }

            const linked = analysisById[deals.find(d => d.id === draggableId)?.credit_analysis_id || ""];
            const requiresApproval = !!targetStage && (
              /proposta|negocia|fechamento/i.test(targetStage.name)
              || targetStage.is_won // mover pra "Ganho" sem análise aprovada também precisa confirmação
            );
            const isApproved = linked && (linked.status === "approved" || linked.status === "approved_restricted");

            if (requiresApproval && !isApproved) {
              setGuardDialog({
                open: true,
                dealId: draggableId,
                stageId: destination.droppableId,
                stageName: targetStage?.name || "",
                reason: linked
                  ? `A análise vinculada está com status "${linked.status}".`
                  : "Não há análise de crédito vinculada a esta oportunidade.",
              });
              return;
            }
            moveDeal.mutate({ dealId: draggableId, stageId: destination.droppableId });
          }}
        >
        <div className="flex gap-3 h-full" style={{ minHeight: "calc(100vh - 320px)" }}>

          {/* Colunas ativas — flex: 1 para preencher o espaço */}
          {activeStages.map(stage => {
            const stageDeals = dealsByStage.get(stage.id) ?? [];
            const stageTotal = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={stage.id} className="flex flex-col" style={{ flex: "1 1 0", minWidth: 220 }}>
                {/* Coluna header */}
                <div
                  className="flex items-center justify-between px-3 py-[10px] rounded-t-[12px]"
                  style={{
                    background: T.white,
                    borderTop: `3px solid ${stage.color}`,
                    border: `1px solid ${T.border}`,
                    borderBottom: "none",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{stage.name}</span>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginTop: 1 }}>
                      {formatBRL(stageTotal)}
                    </div>
                  </div>
                  <span
                    className="flex items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ width: 22, height: 22, background: stageDeals.length > 0 ? stage.color + "22" : T.cinza, color: stageDeals.length > 0 ? stage.color : T.textMute }}
                  >
                    {stageDeals.length}
                  </span>
                </div>

                {/* Cards */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto rounded-b-[12px] transition-colors"
                      style={{
                        background: snapshot.isDraggingOver
                          ? "rgba(0,212,154,0.06)"
                          : "rgba(10,21,56,0.025)",
                        border: `1px solid ${snapshot.isDraggingOver ? T.esmeralda : T.border}`,
                        borderTop: "none",
                        maxHeight: "calc(100vh - 380px)",
                      }}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                opacity: dragSnapshot.isDragging ? 0.92 : 1,
                                boxShadow: dragSnapshot.isDragging ? "0 12px 28px -8px rgba(10,21,56,0.25)" : undefined,
                                cursor: dragSnapshot.isDragging ? "grabbing" : "grab",
                              }}
                            >
                              <DealCard
                                deal={deal}
                                stages={activeStages}
                                currentStage={stage}
                                analysis={getAnalysis(deal)}
                                clientAnalyses={getClientAnalyses(deal.client_id)}
                                onOpenDetail={() => setDetailDealId(deal.id)}
                                onLinkAnalysis={() => setLinkDialog({ open: true, deal })}
                                onMove={(stageId) => {
                                  const target = stages.find(s => s.id === stageId);
                                  const requiresApproval = !!target && /proposta|negocia|fechamento/i.test(target.name);
                                  const linked = getAnalysis(deal);
                                  const isApproved = linked && (linked.status === "approved" || linked.status === "approved_restricted");
                                  if (requiresApproval && !isApproved) {
                                    setGuardDialog({
                                      open: true,
                                      dealId: deal.id,
                                      stageId,
                                      stageName: target?.name || "",
                                      reason: linked
                                        ? `A análise vinculada está com status "${linked.status}".`
                                        : "Não há análise de crédito vinculada a esta oportunidade.",
                                    });
                                    return;
                                  }
                                  moveDeal.mutate({ dealId: deal.id, stageId });
                                }}
                                onStartAnalysis={() => startAnalysisFromDeal.mutate(deal)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center py-8 pointer-events-none">
                          <span style={{ fontSize: 12, color: T.textFaint }}>Nenhuma oportunidade</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}

          {/* Colunas fechadas (ganhos / perdidos) */}
          {wonStage && (
            <ClosedColumn
              stage={wonStage}
              deals={wonDeals}
              icon={Trophy}
              accent={T.esmeralda}
            />
          )}
          {lostStage && (
            <ClosedColumn
              stage={lostStage}
              deals={lostDeals}
              icon={XCircle}
              accent={T.danger}
            />
          )}
        </div>
        </DragDropContext>
      </div>

      {/* Guard dialog */}
      <AlertDialog open={!!guardDialog?.open} onOpenChange={(o) => !o && setGuardDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: T.amber }} />
              Avançar para "{guardDialog?.stageName}" sem crédito aprovado?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {guardDialog?.reason} Mover para etapas avançadas sem análise aprovada pode comprometer a operação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (guardDialog) moveDeal.mutate({ dealId: guardDialog.dealId, stageId: guardDialog.stageId });
                setGuardDialog(null);
              }}
            >
              Avançar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loss reason dialog */}
      <AlertDialog open={!!lossDialog?.open} onOpenChange={(o) => !o && setLossDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" style={{ color: T.danger }} />
              Marcar oportunidade como perdida
            </AlertDialogTitle>
            <AlertDialogDescription>
              Registre o motivo da perda para análise futura do funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em", color: T.textMute, marginBottom: 8 }}>
                Motivo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LOSS_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setLossReason(reason)}
                    className="px-3 py-2 rounded-[8px] text-[12px] font-medium transition-all text-left capitalize"
                    style={{
                      background: lossReason === reason ? T.marinho : T.white,
                      color: lossReason === reason ? T.white : T.text,
                      border: `1px solid ${lossReason === reason ? T.marinho : T.border}`,
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            {lossReason === "outro" && (
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.10em", color: T.textMute, marginBottom: 6 }}>
                  Detalhes
                </p>
                <Textarea
                  value={lossNote}
                  onChange={e => setLossNote(e.target.value)}
                  placeholder="Descreva o motivo da perda..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lossDialog) {
                  const finalReason = lossReason === "outro"
                    ? `outro${lossNote.trim() ? `: ${lossNote.trim()}` : ""}`
                    : lossReason;
                  moveDeal.mutate({ dealId: lossDialog.dealId, stageId: lossDialog.stageId, lossReason: finalReason });
                }
                setLossDialog(null);
              }}
              style={{ background: T.danger }}
            >
              Marcar como perdida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link analysis dialog */}
      <Dialog open={!!linkDialog?.open} onOpenChange={(o) => !o && setLinkDialog(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vincular análise existente</DialogTitle>
            <DialogDescription>
              Selecione uma análise de crédito do cedente <strong>{linkDialog?.deal.clients?.razao_social}</strong> para vincular a esta oportunidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {linkDialog && getClientAnalyses(linkDialog.deal.client_id).length === 0 && (
              <p style={{ fontSize: 12, color: T.textMute, padding: "16px 0", textAlign: "center" }}>
                Nenhuma análise encontrada para este cedente.
              </p>
            )}
            {linkDialog && getClientAnalyses(linkDialog.deal.client_id).map(a => {
              const cfg = STATUS_CONFIG[a.status];
              const Icon = cfg?.icon || FileSearch;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    linkAnalysis.mutate({ dealId: linkDialog.deal.id, analysisId: a.id });
                    setLinkDialog(null);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-[10px] transition-all hover:shadow-[0_4px_14px_rgba(10,21,56,0.10)] text-left"
                  style={{ background: T.white, border: `1px solid ${T.border}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 32, height: 32, borderRadius: 8, background: cfg?.bg || T.cinza }}
                    >
                      <Icon style={{ width: 14, height: 14, color: cfg?.fg || T.textMute }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
                        {cfg?.label || a.status}
                      </p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginTop: 2 }}>
                        {a.credit_score != null && <>SCORE {a.credit_score} · </>}
                        {a.limite_sugerido != null && <>{formatBRL(a.limite_sugerido)}</>}
                      </p>
                    </div>
                  </div>
                  <Link2 style={{ width: 14, height: 14, color: T.esmeralda, flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <DealDetailSheet
        dealId={detailDealId}
        open={!!detailDealId}
        onOpenChange={(o) => !o && setDetailDealId(null)}
      />
    </div>
  );
}

/* ── Deal Card ──────────────────────────────────────────────────── */

function DealCard({
  deal, stages, currentStage, analysis, clientAnalyses, onMove, onStartAnalysis, onOpenDetail, onLinkAnalysis,
}: {
  deal: Deal;
  stages: Stage[];
  currentStage: Stage;
  analysis: CreditAnalysis | null;
  clientAnalyses: CreditAnalysis[];
  onMove: (stageId: string) => void;
  onStartAnalysis: () => void;
  onOpenDetail: () => void;
  onLinkAnalysis: () => void;
}) {
  const navigate = useNavigate();
  const nextStage = stages.find(s => s.order === currentStage.order + 1);
  const statusCfg = analysis ? STATUS_CONFIG[analysis.status] : null;
  const StatusIcon = statusCfg?.icon || FileSearch;
  const score = analysis?.credit_score ?? null;
  const noAnalysis = !analysis;
  const notLinked = !deal.credit_analysis_id;
  const hasAvailableAnalyses = notLinked && clientAnalyses.length > 0;
  const isHighValue = (deal.value || 0) > 50000;
  const probability = deal.probability ?? null;
  const probColor = probability == null
    ? T.textFaint
    : probability >= 70 ? T.esmeralda : probability >= 40 ? T.amber : T.textMute;
  const probBg = probability == null
    ? T.cinza
    : probability >= 70 ? "rgba(0,212,154,0.10)" : probability >= 40 ? "rgba(217,163,0,0.10)" : "rgba(10,21,56,0.05)";

  return (
    <div
      className="rounded-[10px] cursor-pointer transition-all hover:shadow-[0_4px_14px_rgba(10,21,56,0.10)] hover:-translate-y-[1px]"
      style={{ background: T.white, border: `1px solid ${T.border}` }}
      onClick={onOpenDetail}
    >
      {/* Card body */}
      <div className="p-[10px]">
        {/* Título + badge de análise + probabilidade */}
        <div className="flex items-start justify-between gap-1 mb-[6px]">
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3, flex: 1 }}>
            {deal.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {probability != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="px-[6px] py-[2px] rounded-[5px] tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: 700,
                      color: probColor,
                      background: probBg,
                    }}
                  >
                    {probability}%
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Probabilidade de fechamento
                </TooltipContent>
              </Tooltip>
            )}
          {statusCfg && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/analises/${analysis!.id}`); }}
                  className="flex items-center gap-[3px] px-[6px] py-[2px] rounded-[5px] text-[9px] font-semibold transition-opacity hover:opacity-80 shrink-0"
                  style={{ background: statusCfg.bg, color: statusCfg.fg }}
                >
                  <StatusIcon style={{ width: 9, height: 9 }} />
                  {statusCfg.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs space-y-1">
                <p className="font-semibold">Análise de Crédito</p>
                {score != null && <p>Score: {score}</p>}
                {analysis?.limite_sugerido != null && <p>Limite: {formatBRL(analysis.limite_sugerido)}</p>}
                <p className="text-muted-foreground">Clique para abrir</p>
              </TooltipContent>
            </Tooltip>
          )}
          </div>
        </div>

        {/* Cliente */}
        {deal.clients && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginBottom: 6, lineHeight: 1.2 }}>
            {deal.clients.razao_social}
          </p>
        )}

        {/* Score bar — escala 0-1000 */}
        {score != null && (
          <div className="mb-[7px]">
            <div className="flex justify-between items-center mb-[3px]">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.textFaint, letterSpacing: "0.06em" }}>SCORE</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: scoreColor(score) }}>{score}</span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: T.cinza, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(score / 1000) * 100}%`, background: scoreColor(score), borderRadius: 999, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}

        {/* Limite + Volume mensal + data */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            {deal.value != null && deal.value > 0 ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
                {formatBRL(deal.value)}
                <span style={{ fontSize: 9, fontWeight: 600, color: T.textFaint, marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  estimado
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: T.textFaint }}>Sem limite</span>
            )}
            {(() => {
              const aprovado = analysis?.committee_result?.[0]?.limite_aprovado;
              if (aprovado != null && aprovado > 0) {
                return (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: T.esmeralda, marginTop: 1 }}>
                    {formatBRL(aprovado)}
                    <span style={{ fontSize: 9, fontWeight: 600, color: T.esmeralda, marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      aprovado
                    </span>
                  </span>
                );
              }
              return null;
            })()}
            {deal.monthly_volume != null && deal.monthly_volume > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.esmeralda, marginTop: 1 }}>
                {formatBRL(deal.monthly_volume)}<span style={{ color: T.textFaint }}>/mês</span>
              </span>
            )}
          </div>
          {deal.expected_close_date && (
            <span className="flex items-center gap-1 self-start" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint }}>
              <Calendar style={{ width: 9, height: 9 }} />
              {new Date(deal.expected_close_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>

        {/* Responsável + origem prospect */}
        <div className="flex items-center justify-between gap-2 mt-[5px]">
          {deal.responsible ? (
            <div className="flex items-center gap-1 min-w-0">
              <User style={{ width: 9, height: 9, color: T.textFaint }} />
              <span className="truncate" style={{ fontSize: 10, color: T.textFaint }}>{deal.responsible}</span>
            </div>
          ) : <span />}
          {deal.prospect_id && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/prospects"); }}
              className="flex items-center gap-1 px-[5px] py-[1px] rounded-[4px] hover:bg-sink-fog/30 transition-colors flex-shrink-0"
              title="Originado de prospect"
              style={{ background: "rgba(0,212,154,0.08)", border: "1px solid rgba(0,212,154,0.20)" }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.esmeralda, letterSpacing: "0.04em" }}>
                via prospect
              </span>
            </button>
          )}
        </div>

        {/* Alerta sem análise */}
        {noAnalysis && isHighValue && (
          <div className="flex items-center gap-1 mt-[5px] px-[6px] py-[3px] rounded-[5px]" style={{ background: "#FFF6DC" }}>
            <AlertTriangle style={{ width: 10, height: 10, color: "#7A5B00", flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#7A5B00" }}>Sem análise de crédito</span>
          </div>
        )}
      </div>

      {/* Rodapé de ações — sempre visível */}
      <div
        className="flex gap-0"
        style={{ borderTop: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {noAnalysis && !hasAvailableAnalyses && (
          <button
            className="flex-1 flex items-center justify-center gap-1 py-[7px] text-[10px] font-semibold transition-colors hover:bg-[#FFF6DC]"
            style={{ color: "#7A5B00", borderRight: `1px solid ${T.border}`, borderBottomLeftRadius: 10 }}
            onClick={onStartAnalysis}
          >
            <FileSearch style={{ width: 11, height: 11 }} />
            Iniciar análise
          </button>
        )}
        {hasAvailableAnalyses && (
          <button
            className="flex-1 flex items-center justify-center gap-1 py-[7px] text-[10px] font-semibold transition-colors hover:bg-[rgba(0,212,154,0.06)]"
            style={{ color: T.esmeralda, borderRight: `1px solid ${T.border}`, borderBottomLeftRadius: 10 }}
            onClick={onLinkAnalysis}
          >
            <Link2 style={{ width: 11, height: 11 }} />
            Vincular análise
          </button>
        )}
        {nextStage && (
          <button
            className="flex-1 flex items-center justify-center gap-1 py-[7px] text-[10px] font-semibold transition-colors hover:bg-[rgba(0,212,154,0.06)]"
            style={{
              color: T.esmeralda,
              borderBottomRightRadius: 10,
              borderBottomLeftRadius: (noAnalysis || hasAvailableAnalyses) ? 0 : 10,
            }}
            onClick={() => onMove(nextStage.id)}
          >
            {nextStage.name}
            <ChevronRight style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Closed Column ──────────────────────────────────────────────── */

function ClosedColumn({ stage, deals, icon: Icon, accent }: {
  stage: Stage;
  deals: Deal[];
  icon: React.ElementType;
  accent: string;
}) {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <Droppable droppableId={stage.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="flex flex-col rounded-[12px] transition-colors"
          style={{
            width: 180,
            minWidth: 180,
            border: `1px solid ${snapshot.isDraggingOver ? accent : T.border}`,
            background: snapshot.isDraggingOver ? `${accent}10` : T.white,
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-[10px] rounded-t-[11px]"
            style={{ borderBottom: `1px solid ${T.border}`, borderTop: `3px solid ${accent}` }}
          >
            <Icon style={{ width: 13, height: 13, color: accent }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{stage.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginLeft: "auto" }}>{deals.length}</span>
          </div>
          <div className="px-3 py-4 text-center">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color: accent }}>{formatBRL(total)}</div>
            <div style={{ fontSize: 11, color: T.textMute, marginTop: 3 }}>
              {snapshot.isDraggingOver ? `Soltar para mover` : `${deals.length} oportunidade${deals.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          {deals.slice(0, 4).map((d) => (
            <div
              key={d.id}
              className="px-3 py-[6px] truncate"
              style={{ borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textMute }}
            >
              {d.clients?.razao_social || d.title}
            </div>
          ))}
          {deals.length > 4 && (
            <div className="px-3 py-[6px]" style={{ borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.textFaint }}>
              +{deals.length - 4} mais
            </div>
          )}
          <span style={{ display: "none" }}>{provided.placeholder}</span>
        </div>
      )}
    </Droppable>
  );
}
