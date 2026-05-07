import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card as SCard, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatBRL, formatDate, voteLabels, statusLabels } from "@/lib/formatters";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { PageHeader } from "@/components/trilho/PageHeader";
import { classifyRisk, getScoreGrade, suggestLimit, calculateConcentration } from "@/lib/credit-calculations";
import { ScoreGauge } from "@/components/ScoreGauge";
import { T } from "@/lib/tokens";
import ReactMarkdown from "react-markdown";

const SAFE_MD_ELEMENTS = ["p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "code", "pre", "blockquote", "hr", "br", "a"];
import {
  ArrowLeft, Vote, CheckCircle, Building2, User, MapPin, Calendar,
  TrendingUp, AlertTriangle, ShieldAlert, Scale, FileText, Sparkles,
  BarChart3, Users, DollarSign, Clock, Percent, ExternalLink, Pencil, Lock,
  ShieldCheck, ChevronDown, ChevronUp
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

const Card = SCard;

type CommitteeVoteType = Database["public"]["Enums"]["committee_vote"];

function InfoRow({ icon: Icon, label, value, mono }: { icon?: any; label: string; value: any; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <span className="text-xs text-muted-foreground min-w-[100px]">{label}</span>
      <span className={`text-xs font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function RestrictionItem({ label, value }: { label: string; value: string | null }) {
  if (!value || value.toLowerCase() === "nada consta" || value === "0" || value === "") return null;
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-destructive/10 text-destructive text-xs">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span className="font-medium">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

export default function CommitteeVoting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [vote, setVote] = useState<string>("");
  const [observation, setObservation] = useState("");
  const [totalMembers, setTotalMembers] = useState(3);
  const [limiteAprovado, setLimiteAprovado] = useState("");
  const [prazoAprovado, setPrazoAprovado] = useState("");
  const [concentracaoMax, setConcentracaoMax] = useState("");
  const [condicoesAdicionais, setCondicoesAdicionais] = useState("");

  // Edit-vote dialog
  const [editingVoteId, setEditingVoteId] = useState<string | null>(null);
  const [editVote, setEditVote] = useState<string>("");
  const [editObservation, setEditObservation] = useState("");

  // Override fluxo
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");

  // Quem é o user atual + se é admin
  const { data: currentUserId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["current-user-is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: analysis } = useQuery({
    queryKey: ["committee-analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf, segmento, cidade, estado, data_fundacao, nome_fantasia)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: sacados = [] } = useQuery({
    queryKey: ["committee-sacados", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis_sacados")
        .select("*")
        .eq("credit_analysis_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: socios = [] } = useQuery({
    queryKey: ["committee-socios", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis_socios")
        .select("*")
        .eq("credit_analysis_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["committee-insights", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis_insights")
        .select("*")
        .eq("credit_analysis_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: votes = [], refetch: refetchVotes } = useQuery({
    queryKey: ["committee-votes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_committee")
        .select("*")
        .eq("credit_analysis_id", id!)
        .order("vote_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: existingResult } = useQuery({
    queryKey: ["committee-result", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_result")
        .select("*")
        .eq("credit_analysis_id", id!)
        .maybeSingle();
      return data;
    },
  });

  // Derived data
  const client = analysis?.clients as any;
  const riskClass = useMemo(() => classifyRisk(analysis?.credit_score || null), [analysis?.credit_score]);
  const scoreGrade = useMemo(() => getScoreGrade(analysis?.credit_score || null), [analysis?.credit_score]);
  const concentration = useMemo(() => calculateConcentration(sacados), [sacados]);
  const summaryInsight = insights.find((i: any) => i.insight_type === "summary");
  const riskInsight = insights.find((i: any) => i.insight_type === "risk");

  const restrictions = useMemo(() => {
    if (!analysis) return [];
    return [
      { label: "Protestos", value: analysis.protestos },
      { label: "Pendências", value: analysis.pendencias },
      { label: "Ações Judiciais", value: analysis.acoes_judiciais },
      { label: "Cheques s/ Fundo", value: analysis.cheques_sem_fundo },
      { label: "Restrições CNPJ", value: analysis.restricoes_cnpj },
    ].filter(r => r.value && r.value.toLowerCase() !== "nada consta" && r.value !== "0" && r.value !== "");
  }, [analysis]);

  const voteMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        credit_analysis_id: id!,
        member_name: memberName,
        member_role: memberRole || null,
        vote: vote as CommitteeVoteType,
        observation: observation || null,
      };
      // voter_id (coluna nova) — types.ts pode estar desatualizado, vai como `as any`
      if (currentUserId) payload.voter_id = currentUserId;
      const { error } = await (supabase as any).from("credit_committee").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setMemberName(""); setMemberRole(""); setVote(""); setObservation("");
      refetchVotes();
      toast({ title: "Voto registrado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const editVoteMutation = useMutation({
    mutationFn: async () => {
      if (!editingVoteId) return;
      const { error } = await (supabase as any)
        .from("credit_committee")
        .update({
          vote: editVote as CommitteeVoteType,
          observation: editObservation || null,
        })
        .eq("id", editingVoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ["committee-votes", id] });
      setEditingVoteId(null);
      setEditVote("");
      setEditObservation("");
      toast({ title: "Voto atualizado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar voto", description: err.message, variant: "destructive" });
    },
  });

  const openEditVote = (v: any) => {
    setEditingVoteId(v.id);
    setEditVote(v.vote);
    setEditObservation(v.observation || "");
  };

  const calculateResult = (): { decision: Database["public"]["Enums"]["credit_status"]; isTie: boolean; counts: { approve: number; restrict: number; reject: number } } => {
    const counts = { approve: 0, restrict: 0, reject: 0 };
    votes.forEach((v) => counts[v.vote]++);
    const max = Math.max(counts.approve, counts.restrict, counts.reject);
    const tied = Object.values(counts).filter((v) => v === max).length > 1;
    const hasStrictMajority = max > totalMembers / 2;
    if (tied || !hasStrictMajority) {
      return { decision: "approved_restricted", isTie: true, counts };
    }
    if (counts.reject === max) return { decision: "rejected", isTie: false, counts };
    if (counts.restrict === max) return { decision: "approved_restricted", isTie: false, counts };
    if (counts.approve === max) return { decision: "approved", isTie: false, counts };
    return { decision: "approved_restricted", isTie: false, counts };
  };

  // Finalização via RPC `finalize_committee` — banco calcula decisão a partir dos votos,
  // exige justificativa em caso de override, trava votos, audita.
  const finalizeMutation = useMutation({
    mutationFn: async ({
      finalDecision,
      reason,
    }: {
      finalDecision: Database["public"]["Enums"]["credit_status"];
      reason: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc("finalize_committee", {
        p_analysis_id: id,
        p_final_decision: finalDecision,
        p_override_reason: reason,
      });
      if (error) throw error;

      // Cria committee_result — falha aqui é crítica (perde limite_aprovado/prazo/condições).
      const { error: resultError } = await supabase.from("committee_result").insert({
        credit_analysis_id: id!,
        limite_aprovado: limiteAprovado ? parseFloat(limiteAprovado) : null,
        prazo_aprovado: prazoAprovado ? parseInt(prazoAprovado) : null,
        concentracao_maxima: concentracaoMax ? parseFloat(concentracaoMax) : null,
        condicoes_adicionais: condicoesAdicionais || null,
        decisao_final: finalDecision,
      });
      if (resultError) {
        throw new Error(`Decisão registrada mas resultado do comitê falhou ao salvar: ${resultError.message}`);
      }

      // Cria deal CRM em aprovação. Falha aqui não trava a finalização — sinaliza pra UI.
      let dealCreationWarning: string | null = null;
      if (finalDecision === "approved" || finalDecision === "approved_restricted") {
        const { data: firstStage, error: stageError } = await supabase
          .from("deal_stages")
          .select("id")
          .eq("is_active", true)
          .eq("is_won", false)
          .eq("is_lost", false)
          .order("order")
          .limit(1)
          .maybeSingle();

        if (stageError || !firstStage) {
          dealCreationWarning = "Aprovação registrada, mas não encontrou estágio inicial ativo no Pipeline";
        } else if (analysis) {
          const clientName = client?.razao_social || "Cliente";
          const dealTitle = `${finalDecision === "approved" ? "Crédito aprovado" : "Crédito aprovado c/ restrição"} — ${clientName}`;
          const { error: dealError } = await supabase.from("deals").insert({
            client_id: analysis.client_id,
            stage_id: firstStage.id,
            title: dealTitle,
            value: limiteAprovado ? parseFloat(limiteAprovado) : (analysis.limite_sugerido || null),
            responsible: analysis.responsavel_comercial || analysis.analista_credito || null,
            credit_analysis_id: id!,
            notes: condicoesAdicionais || null,
          });
          if (dealError) {
            dealCreationWarning = `Aprovação registrada, mas criação automática de deal falhou: ${dealError.message}`;
          }
        }
      }

      return { ...(data as { ok: boolean; was_override: boolean; calculated: string; final: string }), dealCreationWarning };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["committee-queue"] });
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["committee-analysis", id] });
      queryClient.invalidateQueries({ queryKey: ["committee-votes", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      if (result?.was_override) {
        toast({
          title: "Decisão final aplicada via override admin",
          description: `Calculada: ${statusLabels[result.calculated as keyof typeof statusLabels] || result.calculated}. Final: ${statusLabels[result.final as keyof typeof statusLabels] || result.final}.`,
        });
      } else {
        toast({ title: "Decisão do comitê finalizada" });
      }
      if (result?.dealCreationWarning) {
        toast({
          title: "Atenção",
          description: result.dealCreationWarning,
          variant: "destructive",
        });
      }
      setOverrideOpen(false);
      setOverrideDecision("");
      setOverrideReason("");
      navigate("/comite");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" });
    },
  });

  const allVoted = votes.length >= totalMembers;
  const isFinalized = !!existingResult || (analysis && analysis.status !== "in_committee");

  // Override metadata (colunas novas; types pode estar desatualizado)
  const analysisAny = analysis as any;
  const hadOverride = !!analysisAny?.committee_override_by;
  const overrideMeta = {
    reason: analysisAny?.committee_override_reason as string | null,
    calculated: analysisAny?.committee_calculated_decision as string | null,
    finalStatus: analysis?.status as string | null,
    at: analysisAny?.committee_override_at as string | null,
  };

  return (
    <div className="p-7 space-y-[14px]">
      <PageHeader
        title={`Comitê · ${client?.razao_social || "..."}`}
        subtitle={`VOTAÇÃO · QUÓRUM ${votes.length}/${totalMembers}`}
        actions={
          <>
            <button
              onClick={() => navigate("/comite")}
              className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
              style={{ border: "1px solid var(--border-strong)", color: "#0A1538" }}
            >
              ← Voltar
            </button>
            <button
              onClick={() => navigate(`/analises/${id}`)}
              className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
              style={{ border: "1px solid var(--border-strong)", color: "#0A1538" }}
            >
              Dossiê completo
            </button>
          </>
        }
      />

      {hadOverride && (
        <div
          className="rounded-[12px] px-4 py-3 flex items-start gap-3"
          style={{
            background: "rgba(217,163,0,0.10)",
            border: `1px solid ${T.amber}40`,
          }}
        >
          <AlertTriangle style={{ width: 18, height: 18, color: T.amber, flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 text-[12.5px]" style={{ color: T.text, lineHeight: 1.55 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              Esta análise teve override admin
            </p>
            <p style={{ color: T.textMute }}>
              <span>Decisão calculada pelos votos: </span>
              <strong>{overrideMeta.calculated ? statusLabels[overrideMeta.calculated as keyof typeof statusLabels] || overrideMeta.calculated : "—"}</strong>
              <span> · Decisão final aplicada: </span>
              <strong>{overrideMeta.finalStatus ? statusLabels[overrideMeta.finalStatus as keyof typeof statusLabels] || overrideMeta.finalStatus : "—"}</strong>
              {overrideMeta.at && (
                <span> · em {formatDate(overrideMeta.at)}</span>
              )}
            </p>
            {overrideMeta.reason && (
              <p style={{ marginTop: 6, fontStyle: "italic", color: T.text }}>
                "{overrideMeta.reason}"
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Dossiê Resumido para o Comitê (60%) */}
        <div className="lg:col-span-3 space-y-4">

          {/* Header: Client identity + Score */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h2 className="text-lg font-bold">{client?.razao_social || "—"}</h2>
                      <StatusBadge status={analysis?.status || "draft"} />
                    </div>
                    {client?.nome_fantasia && (
                      <p className="text-xs text-muted-foreground ml-6">{client.nome_fantasia}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 ml-6">
                    <InfoRow icon={FileText} label="CNPJ/CPF" value={client?.cnpj_cpf} mono />
                    <InfoRow icon={BarChart3} label="Segmento" value={client?.segmento} />
                    <InfoRow icon={MapPin} label="Localização" value={client?.cidade && client?.estado ? `${client.cidade} / ${client.estado}` : null} />
                    <InfoRow icon={Calendar} label="Fundação" value={client?.data_fundacao} />
                    <InfoRow icon={Clock} label="Tempo Atividade" value={analysis?.tempo_atividade} />
                    <InfoRow icon={Users} label="Funcionários" value={analysis?.numero_funcionarios} />
                    <InfoRow icon={User} label="Analista" value={analysis?.analista_credito} />
                    <InfoRow icon={Calendar} label="Data Análise" value={formatDate(analysis?.data_analise)} />
                  </div>
                </div>
                {/* Score visual */}
                <div className="shrink-0 text-center">
                  <ScoreGauge score={analysis?.credit_score || 0} size="sm" />
                  <div className="mt-1">
                    <Badge className={riskClass.bgColor + " " + riskClass.color + " text-[10px]"}>
                      {riskClass.label}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Grau {scoreGrade}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial KPIs strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <DollarSign className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums">{formatBRL(analysis?.faturamento_medio)}</div>
                <div className="text-[10px] text-muted-foreground">Fat. Médio</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums">{formatBRL(analysis?.limite_sugerido)}</div>
                <div className="text-[10px] text-muted-foreground">Limite Sugerido</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums">{formatBRL(analysis?.volume_estimado)}</div>
                <div className="text-[10px] text-muted-foreground">Volume Estimado</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 text-center">
                <Percent className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-sm font-bold tabular-nums">{analysis?.taxa_sugerida ? `${analysis.taxa_sugerida}%` : "—"}</div>
                <div className="text-[10px] text-muted-foreground">Taxa Sugerida</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Restrições, Sacados, Parecer IA */}
          <Tabs defaultValue="overview">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview" className="text-xs gap-1"><FileText className="h-3 w-3" /> Resumo</TabsTrigger>
              <TabsTrigger value="restrictions" className="text-xs gap-1">
                <ShieldAlert className="h-3 w-3" /> Restrições
                {restrictions.length > 0 && <Badge variant="destructive" className="h-4 px-1 text-[9px] ml-1">{restrictions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sacados" className="text-xs gap-1"><Users className="h-3 w-3" /> Sacados</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> Parecer IA</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 mt-3">
              <Card>
                <CardContent className="pt-4 space-y-3 text-sm">
                  {analysis?.parecer_analista && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Parecer do Analista</p>
                      <p className="text-xs leading-relaxed">{analysis.parecer_analista}</p>
                    </div>
                  )}
                  {analysis?.pontos_positivos && (
                    <div>
                      <p className="text-xs font-semibold text-status-approved mb-1">Pontos Positivos</p>
                      <p className="text-xs leading-relaxed">{analysis.pontos_positivos}</p>
                    </div>
                  )}
                  {analysis?.riscos && (
                    <div>
                      <p className="text-xs font-semibold text-destructive mb-1">Riscos Identificados</p>
                      <p className="text-xs leading-relaxed">{analysis.riscos}</p>
                    </div>
                  )}
                  {analysis?.garantias && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Garantias</p>
                      <p className="text-xs leading-relaxed">{analysis.garantias}</p>
                    </div>
                  )}
                  {analysis?.condicoes_especiais && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Condições Especiais</p>
                      <p className="text-xs leading-relaxed">{analysis.condicoes_especiais}</p>
                    </div>
                  )}
                  <div className="border-t pt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                    <InfoRow label="Capital Social" value={analysis?.capital_social ? formatBRL(analysis.capital_social) : null} />
                    <InfoRow label="Receita Líquida" value={analysis?.receita_liquida ? formatBRL(analysis.receita_liquida) : null} />
                    <InfoRow label="Endividamento" value={analysis?.endividamento} />
                    <InfoRow label="Margem Líquida" value={analysis?.margem_liquida} />
                    <InfoRow label="Índice Liquidez" value={analysis?.indice_liquidez} />
                    <InfoRow label="Prazo Médio" value={analysis?.prazo_medio_titulos ? `${analysis.prazo_medio_titulos} dias` : null} />
                    <InfoRow label="Hist. Pagamentos" value={analysis?.historico_pagamentos} />
                    <InfoRow label="Tipo Sede" value={analysis?.tipo_imovel_sede} />
                  </div>
                  {/* Sócios */}
                  {socios.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Quadro Societário</p>
                      <div className="space-y-1">
                        {socios.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-xs">
                            <span>{s.nome} {s.cargo ? `(${s.cargo})` : ""}</span>
                            <span className="font-mono">{s.participacao ? `${s.participacao}%` : "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="restrictions" className="mt-3">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  {restrictions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-status-approved" />
                      Nenhuma restrição identificada no dossiê
                    </div>
                  ) : (
                    restrictions.map((r, i) => (
                      <RestrictionItem key={i} label={r.label} value={r.value} />
                    ))
                  )}
                  {analysis?.referencias_bancarias && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Referências Bancárias</p>
                      <p className="text-xs">{analysis.referencias_bancarias}</p>
                    </div>
                  )}
                  {analysis?.referencias_comerciais && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Referências Comerciais</p>
                      <p className="text-xs">{analysis.referencias_comerciais}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sacados" className="mt-3">
              <Card>
                <CardContent className="pt-4">
                  {sacados.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground text-sm">Nenhum sacado cadastrado</p>
                  ) : (
                    <>
                      <div className="mb-3 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Concentração total</span>
                            <span className="font-mono">{concentration.totalConcentration.toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(concentration.totalConcentration, 100)} className="h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold">{sacados.length}</div>
                          <div className="text-[10px] text-muted-foreground">Sacados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold">{concentration.hhi.toFixed(0)}</div>
                          <div className="text-[10px] text-muted-foreground">HHI</div>
                        </div>
                      </div>
                      {concentration.alerts.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {concentration.alerts.map((a, i) => (
                            <div key={i} className="text-[11px] text-sink-warn bg-sink-warn/10 px-2 py-1 rounded flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> {a}
                            </div>
                          ))}
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Sacado</TableHead>
                            <TableHead className="text-xs text-right">% Faturamento</TableHead>
                            <TableHead className="text-xs text-right">Prazo Médio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sacados.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell className="text-xs">{s.sacado_nome}</TableCell>
                              <TableCell className="text-xs text-right font-mono">{s.percentual_faturamento ? `${s.percentual_faturamento}%` : "—"}</TableCell>
                              <TableCell className="text-xs text-right">{s.prazo_medio ? `${s.prazo_medio}d` : "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="mt-3">
              <Card>
                <CardContent className="pt-4">
                  {!summaryInsight && !riskInsight ? (
                    <p className="text-center py-6 text-muted-foreground text-sm">
                      Nenhum insight de IA foi gerado para esta análise.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {summaryInsight && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs font-semibold">Parecer Executivo (IA)</p>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs">
                            <ReactMarkdown allowedElements={SAFE_MD_ELEMENTS} unwrapDisallowed>{summaryInsight.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {riskInsight && (
                        <div className="border-t pt-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                            <p className="text-xs font-semibold">Análise de Risco (IA)</p>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs">
                            <ReactMarkdown allowedElements={SAFE_MD_ELEMENTS} unwrapDisallowed>{riskInsight.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT: Voting (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Votes registered */}
          {votes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Votos ({votes.length}/{totalMembers})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {votes.map((v) => {
                    const vAny = v as any;
                    const isLocked = !!vAny.is_locked;
                    const isOwnVote = currentUserId && vAny.voter_id === currentUserId;
                    const canEdit = isOwnVote && !isLocked;
                    return (
                      <div key={v.id} className="flex items-start justify-between border-b last:border-0 pb-2 last:pb-0 gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium">{v.member_name}</p>
                            {isLocked && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[9px] font-semibold uppercase tracking-wider"
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  background: "rgba(10,21,56,0.06)",
                                  color: T.textMute,
                                }}
                                title="Voto travado após finalização do comitê"
                              >
                                <Lock style={{ width: 9, height: 9 }} />
                                Travado
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {v.member_role || "Membro"} • {formatDate(v.vote_date)}
                          </p>
                          {v.observation && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                              "{v.observation}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <Badge className={
                            v.vote === "approve" ? "bg-status-approved/10 text-status-approved border-status-approved/20" :
                            v.vote === "reject" ? "bg-sink-danger/10 text-sink-danger border-sink-danger/20" :
                            "bg-sink-warn/10 text-sink-warn border-sink-warn/20"
                          }>
                            {voteLabels[v.vote]}
                          </Badge>
                          {canEdit && (
                            <button
                              onClick={() => openEditVote(v)}
                              className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] text-[10px] font-medium transition-colors hover:bg-[rgba(10,21,56,0.06)]"
                              style={{
                                color: T.textMute,
                                border: `1px solid ${T.border}`,
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              <Pencil style={{ width: 10, height: 10 }} />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!isFinalized && (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Configuração</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-xs">Nº de membros do comitê</Label>
                    <Input type="number" min={1} max={20} value={totalMembers} onChange={(e) => setTotalMembers(parseInt(e.target.value) || 3)} className="h-8 text-sm" />
                  </div>
                </CardContent>
              </Card>

              {!allVoted && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Vote className="h-4 w-4" /> Registrar Voto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cargo</Label>
                        <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Voto *</Label>
                      <Select value={vote} onValueChange={setVote}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">✅ Aprovar</SelectItem>
                          <SelectItem value="restrict">⚠️ Aprovar com Restrições</SelectItem>
                          <SelectItem value="reject">❌ Reprovar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observação</Label>
                      <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} className="text-sm" />
                    </div>
                    <Button onClick={() => voteMutation.mutate()} disabled={!memberName || !vote || voteMutation.isPending} className="w-full h-9 text-sm">
                      {voteMutation.isPending ? "Registrando..." : "Registrar Voto"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {allVoted && (() => {
                const r = calculateResult();
                const calculated = r.decision;
                const overrideIsSame = overrideDecision === calculated;
                const overrideValid =
                  !!overrideDecision &&
                  !overrideIsSame &&
                  overrideReason.trim().length > 0;
                return (
                  <Card className="border-status-approved/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-status-approved" /> Finalizar Decisão
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Resultado calculado pelos votos: <strong>{statusLabels[calculated]}</strong>
                        {" "}
                        ({r.counts.approve}A · {r.counts.restrict}R · {r.counts.reject}X)
                        {r.isTie && (
                          <span
                            className="block mt-1.5 px-2 py-1 rounded text-[11px]"
                            style={{
                              background: "rgba(217,163,0,0.10)",
                              color: "#7A5B00",
                              border: "1px solid rgba(217,163,0,0.25)",
                            }}
                          >
                            Sem maioria estrita — decisão prudente será aplicada se finalizar agora.
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Limite Aprovado (R$)</Label>
                          <Input type="number" step="0.01" value={limiteAprovado} onChange={(e) => setLimiteAprovado(e.target.value)} className="h-8 text-sm tabular-nums" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prazo (dias)</Label>
                          <Input type="number" value={prazoAprovado} onChange={(e) => setPrazoAprovado(e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Concentração Máxima (%)</Label>
                        <Input type="number" step="0.1" value={concentracaoMax} onChange={(e) => setConcentracaoMax(e.target.value)} className="h-8 text-sm tabular-nums" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Condições Adicionais</Label>
                        <Textarea value={condicoesAdicionais} onChange={(e) => setCondicoesAdicionais(e.target.value)} rows={2} className="text-sm" />
                      </div>

                      {/* Botão principal: aplica decisão calculada */}
                      <Button
                        onClick={() =>
                          finalizeMutation.mutate({ finalDecision: calculated, reason: null })
                        }
                        disabled={finalizeMutation.isPending}
                        className="w-full h-9 text-sm"
                        style={{ background: T.esmeralda, color: T.marinho }}
                      >
                        {finalizeMutation.isPending
                          ? "Finalizando..."
                          : `Finalizar com decisão calculada (${statusLabels[calculated]})`}
                      </Button>

                      {/* Override admin */}
                      {isAdmin && (
                        <div
                          className="rounded-[10px] overflow-hidden"
                          style={{ border: `1px solid ${T.border}`, background: T.paper }}
                        >
                          <button
                            onClick={() => setOverrideOpen((o) => !o)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-[rgba(10,21,56,0.04)]"
                            style={{ color: T.text }}
                          >
                            <span className="flex items-center gap-2">
                              <ShieldCheck style={{ width: 13, height: 13, color: T.amber }} />
                              Aplicar decisão diferente (override admin)
                            </span>
                            {overrideOpen ? (
                              <ChevronUp style={{ width: 14, height: 14, color: T.textMute }} />
                            ) : (
                              <ChevronDown style={{ width: 14, height: 14, color: T.textMute }} />
                            )}
                          </button>
                          {overrideOpen && (
                            <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: `1px solid ${T.border}` }}>
                              <p className="text-[11px]" style={{ color: T.textMute, lineHeight: 1.5 }}>
                                Use para registrar uma decisão diferente da calculada pelos votos.
                                A justificativa fica auditada e visível no dossiê.
                              </p>
                              <div className="space-y-1">
                                <Label className="text-xs">Decisão final</Label>
                                <Select value={overrideDecision} onValueChange={setOverrideDecision}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Aprovar</SelectItem>
                                    <SelectItem value="approved_restricted">Aprovar com restrição</SelectItem>
                                    <SelectItem value="rejected">Rejeitar</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Justificativa do override <span style={{ color: T.danger }}>*</span>
                                </Label>
                                <Textarea
                                  value={overrideReason}
                                  onChange={(e) => setOverrideReason(e.target.value)}
                                  rows={3}
                                  placeholder="Explique por que está aplicando uma decisão diferente da calculada..."
                                  className="text-sm"
                                />
                              </div>
                              {overrideIsSame && overrideDecision && (
                                <p
                                  className="text-[11px] px-2 py-1 rounded"
                                  style={{
                                    background: "rgba(217,163,0,0.10)",
                                    color: "#7A5B00",
                                    border: "1px solid rgba(217,163,0,0.25)",
                                  }}
                                >
                                  A decisão escolhida é igual à calculada — use o botão verde acima.
                                </p>
                              )}
                              <Button
                                onClick={() =>
                                  finalizeMutation.mutate({
                                    finalDecision:
                                      overrideDecision as Database["public"]["Enums"]["credit_status"],
                                    reason: overrideReason.trim(),
                                  })
                                }
                                disabled={!overrideValid || finalizeMutation.isPending}
                                className="w-full h-8 text-sm"
                                style={{ background: T.amber, color: T.marinho }}
                              >
                                {finalizeMutation.isPending
                                  ? "Aplicando..."
                                  : "Aplicar override"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}

          {/* Dialog de edição de voto próprio */}
          <Dialog
            open={!!editingVoteId}
            onOpenChange={(open) => {
              if (!open) {
                setEditingVoteId(null);
                setEditVote("");
                setEditObservation("");
              }
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar voto</DialogTitle>
                <DialogDescription>
                  Você pode editar enquanto o comitê não estiver finalizado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs">Voto</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: "approve", label: "Aprovar", color: T.esmeralda },
                      { value: "restrict", label: "Aprovar com restrição", color: T.amber },
                      { value: "reject", label: "Rejeitar", color: T.danger },
                    ].map((opt) => {
                      const selected = editVote === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setEditVote(opt.value)}
                          className="flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors text-left"
                          style={{
                            background: selected ? `${opt.color}20` : T.white,
                            border: `1.5px solid ${selected ? opt.color : T.border}`,
                            color: selected ? opt.color : T.text,
                          }}
                        >
                          <span>{opt.label}</span>
                          {selected && <CheckCircle style={{ width: 14, height: 14 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Justificativa / observação</Label>
                  <Textarea
                    value={editObservation}
                    onChange={(e) => setEditObservation(e.target.value)}
                    rows={3}
                    className="text-sm"
                    placeholder="Motivo do voto (opcional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <button
                  onClick={() => {
                    setEditingVoteId(null);
                    setEditVote("");
                    setEditObservation("");
                  }}
                  className="px-4 py-[7px] rounded-[999px] text-[12px] font-medium border"
                  style={{ border: `1px solid ${T.border}`, color: T.textMute }}
                >
                  Cancelar
                </button>
                <Button
                  onClick={() => editVoteMutation.mutate()}
                  disabled={!editVote || editVoteMutation.isPending}
                  className="h-8 text-sm"
                >
                  {editVoteMutation.isPending ? "Salvando..." : "Salvar voto"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isFinalized && existingResult && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2"><CardTitle className="text-base">Resultado do Comitê</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="text-muted-foreground text-xs">Decisão:</span> <StatusBadge status={existingResult.decisao_final} /></div>
                <InfoRow label="Limite Aprovado" value={formatBRL(existingResult.limite_aprovado)} mono />
                <InfoRow label="Prazo" value={existingResult.prazo_aprovado ? `${existingResult.prazo_aprovado} dias` : null} />
                <InfoRow label="Concentração Máx" value={existingResult.concentracao_maxima ? `${existingResult.concentracao_maxima}%` : null} />
                {existingResult.condicoes_adicionais && (
                  <div className="border-t pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Condições:</p>
                    <p className="text-xs">{existingResult.condicoes_adicionais}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
