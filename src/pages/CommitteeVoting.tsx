import { useState, useMemo } from "react";
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
import { toast } from "@/hooks/use-toast";
import { formatBRL, formatDate, voteLabels, statusLabels } from "@/lib/formatters";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { PageHeader } from "@/components/trilho/PageHeader";
import { classifyRisk, getScoreGrade, suggestLimit, calculateConcentration } from "@/lib/credit-calculations";
import { ScoreGauge } from "@/components/ScoreGauge";
import ReactMarkdown from "react-markdown";

const SAFE_MD_ELEMENTS = ["p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "code", "pre", "blockquote", "hr", "br", "a"];
import {
  ArrowLeft, Vote, CheckCircle, Building2, User, MapPin, Calendar,
  TrendingUp, AlertTriangle, ShieldAlert, Scale, FileText, Sparkles,
  BarChart3, Users, DollarSign, Clock, Percent, ExternalLink
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
      const { error } = await supabase.from("credit_committee").insert({
        credit_analysis_id: id!,
        member_name: memberName,
        member_role: memberRole || null,
        vote: vote as CommitteeVoteType,
        observation: observation || null,
      });
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

  const calculateResult = (): Database["public"]["Enums"]["credit_status"] => {
    const counts = { approve: 0, restrict: 0, reject: 0 };
    votes.forEach((v) => counts[v.vote]++);
    const max = Math.max(counts.approve, counts.restrict, counts.reject);
    // Regra de empate: se nenhum voto tem maioria estrita (> totalMembers/2),
    // OU se há empate entre os top votos, decisão prudente é aprovar com restrição.
    // Comitê deve revotar caso queira approve/reject puro.
    const tied = Object.values(counts).filter((v) => v === max).length > 1;
    const hasStrictMajority = max > totalMembers / 2;
    if (tied || !hasStrictMajority) {
      console.warn("[CommitteeVoting] Sem maioria estrita ou empate detectado — aplicando decisão prudente (approved_restricted)", { counts, totalMembers });
      return "approved_restricted";
    }
    if (counts.reject === max) return "rejected";
    if (counts.restrict === max) return "approved_restricted";
    if (counts.approve === max) return "approved";
    return "approved_restricted";
  };

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const decision = calculateResult();
      const { error: resultError } = await supabase.from("committee_result").insert({
        credit_analysis_id: id!,
        limite_aprovado: limiteAprovado ? parseFloat(limiteAprovado) : null,
        prazo_aprovado: prazoAprovado ? parseInt(prazoAprovado) : null,
        concentracao_maxima: concentracaoMax ? parseFloat(concentracaoMax) : null,
        condicoes_adicionais: condicoesAdicionais || null,
        decisao_final: decision,
      });
      if (resultError) throw resultError;
      const { error: updateError } = await supabase
        .from("credit_analysis")
        .update({ status: decision })
        .eq("id", id);
      if (updateError) throw updateError;

      // Auto-create CRM deal on approval
      if (decision === "approved" || decision === "approved_restricted") {
        try {
          // Get first active (non-won, non-lost) stage
          const { data: firstStage } = await supabase
            .from("deal_stages")
            .select("id")
            .eq("is_active", true)
            .eq("is_won", false)
            .eq("is_lost", false)
            .order("order")
            .limit(1)
            .single();

          if (firstStage && analysis) {
            const clientName = client?.razao_social || "Cliente";
            const dealTitle = `${decision === "approved" ? "Crédito aprovado" : "Crédito aprovado c/ restrição"} — ${clientName}`;
            await supabase.from("deals").insert({
              client_id: analysis.client_id,
              stage_id: firstStage.id,
              title: dealTitle,
              value: limiteAprovado ? parseFloat(limiteAprovado) : (analysis.limite_sugerido || null),
              responsible: analysis.responsavel_comercial || analysis.analista_credito || null,
              credit_analysis_id: id!,
              notes: condicoesAdicionais || null,
            });
          }
        } catch (e) {
          console.warn("Falha ao criar deal CRM automaticamente:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-queue"] });
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Decisão do comitê finalizada" });
      navigate("/comite");
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const allVoted = votes.length >= totalMembers;
  const isFinalized = !!existingResult || (analysis && analysis.status !== "in_committee");

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
                  {votes.map((v) => (
                    <div key={v.id} className="flex items-start justify-between border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{v.member_name}</p>
                        <p className="text-[10px] text-muted-foreground">{v.member_role || "Membro"} • {formatDate(v.vote_date)}</p>
                        {v.observation && <p className="text-xs text-muted-foreground mt-0.5 italic">"{v.observation}"</p>}
                      </div>
                      <Badge className={
                        v.vote === "approve" ? "bg-status-approved/10 text-status-approved border-status-approved/20" :
                        v.vote === "reject" ? "bg-sink-danger/10 text-sink-danger border-sink-danger/20" :
                        "bg-sink-warn/10 text-sink-warn border-sink-warn/20"
                      }>
                        {voteLabels[v.vote]}
                      </Badge>
                    </div>
                  ))}
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

              {allVoted && (
                <Card className="border-status-approved/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-status-approved" /> Finalizar Decisão
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Resultado por maioria: <strong>{statusLabels[calculateResult()]}</strong>
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
                    <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending} className="w-full h-9 text-sm">
                      {finalizeMutation.isPending ? "Finalizando..." : "Finalizar Decisão do Comitê"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

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
