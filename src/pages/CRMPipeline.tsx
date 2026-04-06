import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Building2, Calendar, DollarSign, User, ChevronRight, TrendingUp, Target, Trophy, XCircle, FileSearch, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Deal {
  id: string;
  client_id: string;
  stage_id: string;
  title: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  responsible: string | null;
  notes: string | null;
  credit_analysis_id: string | null;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Em Análise", color: "text-amber-600 bg-amber-50 border-amber-200", icon: FileSearch },
  in_committee: { label: "Em Comitê", color: "text-blue-600 bg-blue-50 border-blue-200", icon: FileSearch },
  approved: { label: "Aprovado", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: ShieldCheck },
  approved_restricted: { label: "Restrição", color: "text-orange-600 bg-orange-50 border-orange-200", icon: ShieldAlert },
  rejected: { label: "Reprovado", color: "text-red-600 bg-red-50 border-red-200", icon: ShieldX },
};

export default function CRMPipeline() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: "", client_id: "", stage_id: "", value: "", responsible: "", expected_close_date: "", notes: "" });

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
      const { data } = await supabase.from("deals").select("*, clients(razao_social, cnpj_cpf)").order("created_at", { ascending: false });
      return (data || []) as Deal[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      return data || [];
    },
  });

  // Fetch credit analyses for all clients that have deals
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

  // Map: client_id -> latest credit analysis
  const latestAnalysisByClient = creditAnalyses.reduce<Record<string, CreditAnalysis>>((acc, ca) => {
    if (!acc[ca.client_id]) acc[ca.client_id] = ca;
    return acc;
  }, {});

  // Map: deal credit_analysis_id -> analysis
  const analysisById = creditAnalyses.reduce<Record<string, CreditAnalysis>>((acc, ca) => {
    acc[ca.id] = ca;
    return acc;
  }, {});

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        title: newDeal.title,
        client_id: newDeal.client_id,
        stage_id: newDeal.stage_id || stages[0]?.id,
        value: newDeal.value ? Number(newDeal.value) : null,
        responsible: newDeal.responsible || null,
        expected_close_date: newDeal.expected_close_date || null,
        notes: newDeal.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      setNewDealOpen(false);
      setNewDeal({ title: "", client_id: "", stage_id: "", value: "", responsible: "", expected_close_date: "", notes: "" });
      toast.success("Oportunidade criada!");
    },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Análise vinculada à oportunidade!");
    },
  });

  const activeStages = stages.filter(s => !s.is_won && !s.is_lost);
  const wonStage = stages.find(s => s.is_won);
  const lostStage = stages.find(s => s.is_lost);

  const totalPipeline = deals.filter(d => {
    const stage = stages.find(s => s.id === d.stage_id);
    return stage && !stage.is_won && !stage.is_lost;
  }).reduce((sum, d) => sum + (d.value || 0), 0);

  const wonTotal = deals.filter(d => d.stage_id === wonStage?.id).reduce((sum, d) => sum + (d.value || 0), 0);

  const getAnalysisForDeal = (deal: Deal): CreditAnalysis | null => {
    if (deal.credit_analysis_id && analysisById[deal.credit_analysis_id]) {
      return analysisById[deal.credit_analysis_id];
    }
    return latestAnalysisByClient[deal.client_id] || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pipeline Comercial</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie oportunidades de negócio</p>
          </div>
          <Dialog open={newDealOpen} onOpenChange={setNewDealOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Oportunidade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Oportunidade</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Título</Label>
                  <Input value={newDeal.title} onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Antecipação de recebíveis" />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select value={newDeal.client_id} onValueChange={v => setNewDeal(p => ({ ...p, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor estimado (R$)</Label>
                    <Input type="number" value={newDeal.value} onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Previsão de fechamento</Label>
                    <Input type="date" value={newDeal.expected_close_date} onChange={e => setNewDeal(p => ({ ...p, expected_close_date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Input value={newDeal.responsible} onChange={e => setNewDeal(p => ({ ...p, responsible: e.target.value }))} />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={newDeal.notes} onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>
                <Button className="w-full" onClick={() => createDeal.mutate()} disabled={!newDeal.title || !newDeal.client_id}>
                  Criar Oportunidade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI strip */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Pipeline</p>
              <p className="text-sm font-bold">{totalPipeline.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Ganhos</p>
              <p className="text-sm font-bold text-green-600">{wonTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Oportunidades</p>
              <p className="text-sm font-bold">{deals.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {activeStages.map(stage => {
            const stageDeals = deals.filter(d => d.stage_id === stage.id);
            const stageTotal = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={stage.id} className="w-[280px] flex flex-col bg-muted/30 rounded-lg border border-border/50">
                <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-foreground">{stage.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageDeals.length}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {stageTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stages={activeStages}
                      currentStage={stage}
                      analysis={getAnalysisForDeal(deal)}
                      onMove={(stageId) => moveDeal.mutate({ dealId: deal.id, stageId })}
                      onLinkAnalysis={(analysisId) => linkAnalysis.mutate({ dealId: deal.id, analysisId })}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">Nenhuma oportunidade</div>
                  )}
                </div>
              </div>
            );
          })}

          {wonStage && (
            <ClosedColumn stage={wonStage} deals={deals.filter(d => d.stage_id === wonStage.id)} icon={Trophy} />
          )}
          {lostStage && (
            <ClosedColumn stage={lostStage} deals={deals.filter(d => d.stage_id === lostStage.id)} icon={XCircle} />
          )}
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, stages, currentStage, analysis, onMove, onLinkAnalysis }: {
  deal: Deal;
  stages: Stage[];
  currentStage: Stage;
  analysis: CreditAnalysis | null;
  onMove: (stageId: string) => void;
  onLinkAnalysis: (analysisId: string) => void;
}) {
  const navigate = useNavigate();
  const nextStage = stages.find(s => s.order === currentStage.order + 1);
  const statusCfg = analysis ? STATUS_CONFIG[analysis.status] : null;
  const StatusIcon = statusCfg?.icon || FileSearch;

  return (
    <div className="bg-background border border-border/50 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/crm/cliente/${deal.client_id}`)}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-foreground leading-tight flex-1">{deal.title}</p>
        {analysis && statusCfg && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/analises/${analysis.id}`); }}
                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusCfg.color} hover:opacity-80 transition-opacity`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p className="font-semibold">Análise de Crédito</p>
              {analysis.credit_score != null && <p>Score: {analysis.credit_score}</p>}
              {analysis.limite_sugerido != null && (
                <p>Limite: {analysis.limite_sugerido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              )}
              <p className="text-muted-foreground mt-1">Clique para abrir</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {deal.clients && (
        <div className="flex items-center gap-1 mt-1.5">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">{deal.clients.razao_social}</span>
        </div>
      )}

      {/* Credit score bar */}
      {analysis?.credit_score != null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(analysis.credit_score, 100)}%`,
                backgroundColor: analysis.credit_score >= 70 ? '#10b981' : analysis.credit_score >= 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">{analysis.credit_score}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        {deal.value && (
          <span className="text-xs font-semibold text-primary">
            {deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
          </span>
        )}
        {deal.expected_close_date && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Calendar className="h-3 w-3" />
            {new Date(deal.expected_close_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {deal.responsible && (
        <div className="flex items-center gap-1 mt-1.5">
          <User className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{deal.responsible}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!analysis && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/analises/nova?client_id=${deal.client_id}`); }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] text-amber-600 font-medium py-1 rounded border border-amber-200 hover:bg-amber-50 transition-colors"
          >
            <FileSearch className="h-3 w-3" /> Iniciar Análise
          </button>
        )}
        {nextStage && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove(nextStage.id); }}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] text-primary font-medium py-1 rounded border border-primary/20 hover:bg-primary/5 transition-colors"
          >
            {nextStage.name} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Warning if no analysis and deal has high value */}
      {!analysis && deal.value && deal.value > 50000 && (
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Sem análise de crédito vinculada</span>
        </div>
      )}
    </div>
  );
}

function ClosedColumn({ stage, deals, icon: Icon }: { stage: Stage; deals: Deal[]; icon: React.ElementType }) {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="w-[200px] flex flex-col bg-muted/20 rounded-lg border border-border/30">
      <div className="px-3 py-2.5 border-b border-border/30 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: stage.color }} />
        <span className="text-sm font-semibold text-foreground">{stage.name}</span>
        <Badge variant="secondary" className="text-[10px] h-5">{deals.length}</Badge>
      </div>
      <div className="p-3 text-center">
        <p className="text-lg font-bold" style={{ color: stage.color }}>
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">{deals.length} oportunidade{deals.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
