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
  Calendar, User, TrendingUp,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/trilho/PageHeader";
import { NewDealDialog } from "@/components/crm/NewDealDialog";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

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
        .select("id, client_id, status, credit_score, limite_sugerido, recommendation")
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
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { error } = await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);
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

  const totalPipeline = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const totalMonthlyVolume = activeDeals.reduce((s, d) => s + (d.monthly_volume || 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const conversionRate = (wonDeals.length + lostDeals.length) > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;

  const getAnalysis = (deal: Deal): CreditAnalysis | null => {
    if (deal.credit_analysis_id && analysisById[deal.credit_analysis_id]) return analysisById[deal.credit_analysis_id];
    return latestAnalysisByClient[deal.client_id] || null;
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 68px)", background: "var(--off)" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-7 pt-6 pb-0">
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
        <div className="grid grid-cols-4 gap-3 mt-5 mb-5">
          {[
            { label: "Limite ativo",    value: formatBRL(totalPipeline),  sub: `${activeDeals.length} deals · cap de crédito`, icon: TrendingUp },
            { label: "Volume/mês ativo", value: formatBRL(totalMonthlyVolume), sub: "fluxo esperado mensal", icon: TrendingUp },
            { label: "Taxa de conversão", value: `${conversionRate}%`,   sub: `${wonDeals.length + lostDeals.length} finalizados`, icon: Trophy },
            { label: "Sem análise",     value: String(activeDeals.filter(d => !getAnalysis(d)).length), sub: "oportunidades em risco", icon: AlertTriangle },
          ].map((k, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-[14px]"
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: i === 3 && activeDeals.filter(d => !getAnalysis(d)).length > 0
                    ? "rgba(176,24,42,0.08)" : "rgba(0,212,154,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <k.icon style={{
                  width: 16, height: 16,
                  color: i === 3 && activeDeals.filter(d => !getAnalysis(d)).length > 0 ? T.danger : T.esmeralda,
                }} />
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.10em", color: T.textMute, marginBottom: 2 }}>
                  {k.label}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                  {k.value}
                </p>
                <p style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{k.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-x-auto px-7 pb-7">
        <DragDropContext
          onDragEnd={(result: DropResult) => {
            const { destination, source, draggableId } = result;
            if (!destination) return;
            if (destination.droppableId === source.droppableId) return;

            const targetStage = stages.find(s => s.id === destination.droppableId);
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
                                onStartAnalysis={() => navigate(`/analises/nova?client_id=${deal.client_id}`)}
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
    </div>
  );
}

/* ── Deal Card ──────────────────────────────────────────────────── */

function DealCard({
  deal, stages, currentStage, analysis, onMove, onStartAnalysis,
}: {
  deal: Deal;
  stages: Stage[];
  currentStage: Stage;
  analysis: CreditAnalysis | null;
  onMove: (stageId: string) => void;
  onStartAnalysis: () => void;
}) {
  const navigate = useNavigate();
  const nextStage = stages.find(s => s.order === currentStage.order + 1);
  const statusCfg = analysis ? STATUS_CONFIG[analysis.status] : null;
  const StatusIcon = statusCfg?.icon || FileSearch;
  const score = analysis?.credit_score ?? null;
  const noAnalysis = !analysis;
  const isHighValue = (deal.value || 0) > 50000;

  return (
    <div
      className="rounded-[10px] cursor-pointer transition-all hover:shadow-[0_4px_14px_rgba(10,21,56,0.10)] hover:-translate-y-[1px]"
      style={{ background: T.white, border: `1px solid ${T.border}` }}
      onClick={() => navigate(`/crm/cliente/${deal.client_id}`)}
    >
      {/* Card body */}
      <div className="p-[10px]">
        {/* Título + badge de análise */}
        <div className="flex items-start justify-between gap-1 mb-[6px]">
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3, flex: 1 }}>
            {deal.title}
          </p>
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
            {deal.value != null ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
                {formatBRL(deal.value)}
                <span style={{ fontSize: 9, fontWeight: 400, color: T.textFaint, marginLeft: 4 }}>limite</span>
              </span>
            ) : (
              <span style={{ fontSize: 11, color: T.textFaint }}>Sem limite</span>
            )}
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
        {noAnalysis && (
          <button
            className="flex-1 flex items-center justify-center gap-1 py-[7px] text-[10px] font-semibold transition-colors hover:bg-[#FFF6DC] rounded-bl-[10px]"
            style={{ color: "#7A5B00", borderRight: `1px solid ${T.border}` }}
            onClick={onStartAnalysis}
          >
            <FileSearch style={{ width: 11, height: 11 }} />
            Iniciar análise
          </button>
        )}
        {nextStage && (
          <button
            className="flex-1 flex items-center justify-center gap-1 py-[7px] text-[10px] font-semibold transition-colors hover:bg-[rgba(0,212,154,0.06)] rounded-br-[10px]"
            style={{ color: T.esmeralda, borderRadius: noAnalysis ? "0 0 10px 0" : "0 0 10px 10px" }}
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
