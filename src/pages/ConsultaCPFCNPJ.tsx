import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Building2, User, FileText, AlertTriangle, CheckCircle2,
  XCircle, Clock, TrendingUp, Shield, History, ExternalLink, Loader2,
  Info, Ban, Scale, Banknote, Users, MapPin, Calendar, Phone, Briefcase,
  Hash, Receipt, Landmark, Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/trilho/PageHeader";
import { formatCNPJorCPF, formatBRL, formatDate, formatPercent, statusLabels, statusColors, cleanDocument } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { fetchExternalConsulta, type ExternalSourceResult, type ExternalConsultaData } from "@/lib/external-consulta";
import { qualifyProspect, saveProspectQualification, type QualificationResult } from "@/lib/prospect-qualification";
import { buildConsultaSnapshot, ensureClientFromSnapshot, type ConsultaSnapshot } from "@/lib/consulta-snapshot";
import { ANALYSIS_STATUS } from "@/lib/analysis-status";
import { toast } from "sonner";

function formatInputDocument(value: string) {
  const digits = cleanDocument(value);
  if (digits.length <= 11) {
    // CPF mask
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ mask
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" | "unknown" }) {
  const config = {
    low: { label: "Baixo", className: "bg-status-approved/10 text-status-approved border-status-approved/30" },
    medium: { label: "Médio", className: "bg-status-restricted/10 text-status-restricted border-status-restricted/30" },
    high: { label: "Alto", className: "bg-status-rejected/10 text-status-rejected border-status-rejected/30" },
    unknown: { label: "Indeterminado", className: "bg-muted text-muted-foreground border-border" },
  };
  const c = config[level];
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
}

function deriveRiskLevel(score: number | null): "low" | "medium" | "high" | "unknown" {
  if (score == null) return "unknown";
  if (score >= 700) return "low";
  if (score >= 400) return "medium";
  return "high";
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-[10px] bg-muted/50">
      <div className="p-1.5 rounded-[8px] bg-primary/10 flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[13px] font-semibold truncate mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function ConsultaCPFCNPJ() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState("");
  const [searchDoc, setSearchDoc] = useState<string | null>(null);

  // Auto-search se chegou via /consulta?doc=...
  useEffect(() => {
    const docParam = searchParams.get("doc");
    if (docParam && docParam !== searchDoc) {
      setInputValue(formatInputDocument(docParam));
      setSearchDoc(docParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [qualification, setQualification] = useState<QualificationResult | null>(null);
  const [qualifyingInProgress, setQualifyingInProgress] = useState(false);

  const digits = searchDoc ? cleanDocument(searchDoc) : "";
  const isPJ = digits.length > 11;

  // Blacklist check
  const { data: blacklistEntry } = useQuery({
    queryKey: ["consulta-blacklist", digits],
    enabled: digits.length >= 11,
    queryFn: async () => {
      const { data } = await supabase
        .from("blacklist")
        .select("*")
        .eq("documento", digits)
        .maybeSingle();
      return data;
    },
  });

  // Internal: client
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["consulta-client", digits],
    enabled: digits.length >= 11,
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("cnpj_cpf", digits)
        .maybeSingle();
      return data;
    },
  });

  // Internal: analyses for this client
  const { data: analyses = [], isLoading: loadingAnalyses } = useQuery({
    queryKey: ["consulta-analyses", client?.id],
    enabled: !!client?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis")
        .select("*")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Internal: committee results
  const analysisIds = analyses.map((a) => a.id);
  const { data: committeeResults = [] } = useQuery({
    queryKey: ["consulta-committee", analysisIds],
    enabled: analysisIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_result")
        .select("*")
        .in("credit_analysis_id", analysisIds);
      return data || [];
    },
  });

  // Internal: votes
  const { data: votes = [] } = useQuery({
    queryKey: ["consulta-votes", analysisIds],
    enabled: analysisIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_committee")
        .select("*")
        .in("credit_analysis_id", analysisIds);
      return data || [];
    },
  });

  // Internal: socios (if searching CPF, find as sócio)
  const { data: socioRecords = [] } = useQuery({
    queryKey: ["consulta-socio", digits],
    enabled: digits.length === 11,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis_socios")
        .select("*, credit_analysis(id, client_id, status, credit_score, created_at, clients:client_id(razao_social, cnpj_cpf))")
        .eq("cpf", digits);
      return data || [];
    },
  });

  // External sources placeholder
  const { data: externalSources = [], isLoading: loadingExternal } = useQuery({
    queryKey: ["consulta-external", digits],
    enabled: digits.length >= 11,
    queryFn: () => fetchExternalConsulta(digits),
  });

  // Derived metrics
  const latestAnalysis = analyses[0] || null;
  const bestScore = analyses.reduce((max, a) => Math.max(max, a.credit_score || 0), 0);
  const totalLimit = analyses.reduce((sum, a) => sum + (a.limite_sugerido || 0), 0);
  const approvedResults = committeeResults.filter((r) => r.decisao_final === "approved" || r.decisao_final === "approved_restricted");
  const rejectedResults = committeeResults.filter((r) => r.decisao_final === "rejected");
  const hasRestrictions = analyses.some((a) => a.protestos || a.pendencias || a.cheques_sem_fundo || a.acoes_judiciais || a.restricoes_cnpj);

  const isLoading = loadingClient || loadingAnalyses || loadingExternal;
  const hasSearched = searchDoc !== null;
  const found = !!client || socioRecords.length > 0;

  // Get BrasilAPI data for pre-filling registration
  const brasilApiData = externalSources.find((s) => s.source === "BrasilAPI (Receita Federal)" && s.status === "success")?.data;
  const externalName = brasilApiData?.razao_social || brasilApiData?.nome_fantasia;

  // Snapshot consolidado da consulta — usado para popular Prospect, Cedente e Análise.
  const consultaSnapshot: ConsultaSnapshot | null = hasSearched && !isLoading
    ? buildConsultaSnapshot({ documento: digits, externalSources })
    : null;

  // Compute qualification (sem auto-save — usuário decide via botão)
  const qualificationInput = !hasSearched || isLoading || !digits || digits.length < 11 ? null : {
    documento: digits,
    nome: client?.razao_social || externalName || undefined,
    tipo: (digits.length > 11 ? "cnpj" : "cpf") as "cpf" | "cnpj",
    clientId: client?.id || undefined,
    creditScore: latestAnalysis?.credit_score,
    limiteAprovado: latestAnalysis?.limite_sugerido,
    analysisStatus: latestAnalysis?.status,
    hasProtestos: !!latestAnalysis?.protestos && latestAnalysis.protestos !== "Nada consta",
    hasPendencias: !!latestAnalysis?.pendencias && latestAnalysis.pendencias !== "Nada consta",
    hasAcoesJudiciais: !!latestAnalysis?.acoes_judiciais && latestAnalysis.acoes_judiciais !== "Nada consta",
    hasBlacklist: !!blacklistEntry,
    tempoAtividade: latestAnalysis?.tempo_atividade,
    faturamentoMedio: latestAnalysis?.faturamento_medio ? Number(latestAnalysis.faturamento_medio) : undefined,
    snapshot: consultaSnapshot ? (consultaSnapshot as unknown as Record<string, any>) : undefined,
  };

  useEffect(() => {
    if (!qualificationInput) return;
    let cancelled = false;
    setQualifyingInProgress(true);
    qualifyProspect(qualificationInput)
      .then(result => { if (!cancelled) setQualification(result); })
      .catch(err => console.error("Qualification error:", err))
      .finally(() => { if (!cancelled) setQualifyingInProgress(false); });
    return () => { cancelled = true; };
  }, [hasSearched, isLoading, digits, client?.id, latestAnalysis?.id, blacklistEntry?.documento]);

  // Salvar como prospect
  const createProspectMutation = useMutation({
    mutationFn: async () => {
      if (!qualificationInput || !qualification) throw new Error("Qualificação não disponível");
      await saveProspectQualification(qualificationInput, qualification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Adicionado como prospect");
      navigate("/prospects");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar prospect"),
  });

  // Adicionar direto à carteira (cedente + análise draft)
  const addToPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!qualificationInput) throw new Error("Documento inválido");
      const clientId = await ensureClientFromSnapshot(digits, consultaSnapshot, {
        razao_social: brasilApiData?.razao_social || qualificationInput.nome,
        nome_fantasia: brasilApiData?.nome_fantasia,
        segmento: brasilApiData?.cnae_descricao,
        cidade: brasilApiData?.endereco?.cidade,
        estado: brasilApiData?.endereco?.uf,
      });
      await supabase.from("credit_analysis").insert({
        client_id: clientId,
        status: ANALYSIS_STATUS.draft,
      } as { client_id: string; status: string });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cedente adicionado à carteira");
      navigate("/cedentes");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao adicionar cedente"),
  });

  const isCreating = createProspectMutation.isPending || addToPortfolioMutation.isPending;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const d = cleanDocument(inputValue);
    if (d.length >= 11) {
      setSearchDoc(inputValue);
    }
  }

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title="Consulta CPF / CNPJ"
        subtitle="VISÃO 360° · BASE INTERNA E FONTES EXTERNAS"
      />

      {/* Search Bar */}
      <Card className="rounded-[14px] shadow-none border-border">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o CPF ou CNPJ..."
                value={inputValue}
                onChange={(e) => setInputValue(formatInputDocument(e.target.value))}
                className="pl-9 font-mono rounded-[10px]"
                maxLength={18}
              />
            </div>
            <Button type="submit" disabled={cleanDocument(inputValue).length < 11} className="rounded-[999px] px-5">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Consultar
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Blacklist Alert */}
            {blacklistEntry && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="p-2.5 rounded-full bg-destructive/15">
                      <Ban className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-destructive">Documento na Blacklist</h3>
                        <Badge variant="destructive" className="text-[10px]">BLOQUEADO</Badge>
                      </div>
                      <p className="text-sm text-destructive/80 mt-1">
                        Este {blacklistEntry.tipo === "cpf" ? "CPF" : "CNPJ"} está bloqueado para operações de crédito.
                      </p>
                      {blacklistEntry.motivo && (
                        <p className="text-sm mt-1"><span className="font-medium">Motivo:</span> {blacklistEntry.motivo}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Adicionado em {formatDate(blacklistEntry.created_at)}
                        {blacklistEntry.adicionado_por && ` por ${blacklistEntry.adicionado_por}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => navigate("/blacklist")}>
                      Ver Blacklist
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Identity Header */}
            <Card className="rounded-[14px] shadow-none border-border">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="p-2.5 sm:p-3 rounded-[12px] bg-primary/10 flex-shrink-0">
                      {isPJ ? <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[15px] sm:text-lg font-semibold truncate">{formatCNPJorCPF(digits)}</p>
                      {client ? (
                        <>
                          <p className="text-[14px] sm:text-base font-medium truncate">{client.razao_social}</p>
                          {client.nome_fantasia && <p className="text-[12.5px] sm:text-sm text-muted-foreground truncate">{client.nome_fantasia}</p>}
                        </>
                      ) : socioRecords.length > 0 ? (
                        <p className="text-[14px] sm:text-base font-medium truncate">{socioRecords[0].nome}</p>
                      ) : externalName ? (
                        <>
                          <p className="text-[14px] sm:text-base font-medium truncate">{externalName}</p>
                          <p className="text-xs text-muted-foreground">Dados da Receita Federal (não cadastrado)</p>
                        </>
                      ) : (
                        <p className="text-[12.5px] sm:text-sm text-muted-foreground">Não encontrado na base interna</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {found && <RiskBadge level={deriveRiskLevel(bestScore)} />}
                    {!found && hasSearched && !isLoading && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Sem registros</Badge>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                {client && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-5">
                    <StatCard icon={MapPin} label="Localização" value={client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "—"} />
                    <StatCard icon={Calendar} label="Cadastro" value={formatDate(client.created_at)} />
                    <StatCard icon={Shield} label="Melhor Score" value={bestScore ? String(bestScore) : "—"} />
                    <StatCard icon={FileText} label="Análises" value={String(analyses.length)} />
                    <StatCard icon={Banknote} label="Limite Total" value={formatBRL(totalLimit)} />
                    <StatCard icon={Scale} label="Comitê" value={`${approvedResults.length} aprov. / ${rejectedResults.length} repr.`} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Qualification Result */}
            {qualification && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border ${
                  qualification.status === "qualified" ? "border-status-approved/30 bg-status-approved/5" :
                  qualification.status === "not_qualified" ? "border-status-rejected/30 bg-status-rejected/5" :
                  "border-status-restricted/30 bg-status-restricted/5"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          qualification.status === "qualified" ? "bg-status-approved/15" :
                          qualification.status === "not_qualified" ? "bg-status-rejected/15" : "bg-status-restricted/15"
                        }`}>
                          {qualification.status === "qualified" ? (
                            <CheckCircle2 className="h-5 w-5 text-status-approved" />
                          ) : qualification.status === "not_qualified" ? (
                            <XCircle className="h-5 w-5 text-status-rejected" />
                          ) : (
                            <Clock className="h-5 w-5 text-status-restricted" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">
                              {qualification.status === "qualified" ? "Prospect Qualificado" :
                               qualification.status === "not_qualified" ? "Prospect Não Qualificado" :
                               "Qualificação Pendente"}
                            </h3>
                            <Badge variant="outline" className="text-[10px]">
                              Score: {qualification.score}/100
                            </Badge>
                            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{qualification.suggestedAction}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${qualification.score}%`,
                              backgroundColor: qualification.score >= 60 ? '#10b981' : qualification.score >= 30 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {(qualification.positives.length > 0 || qualification.reasons.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        {qualification.positives.length > 0 && (
                          <div className="space-y-1">
                            {qualification.positives.map((p, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-status-approved">
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> {p}
                              </div>
                            ))}
                          </div>
                        )}
                        {qualification.reasons.length > 0 && (
                          <div className="space-y-1">
                            {qualification.reasons.map((r, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs text-status-rejected">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> {r}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {qualifyingInProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Qualificando prospect...
              </div>
            )}
            <Tabs defaultValue="resumo">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="analises">Análises ({analyses.length})</TabsTrigger>
                {!isPJ && <TabsTrigger value="participacoes">Participações ({socioRecords.length})</TabsTrigger>}
                <TabsTrigger value="restricoes">Restritivos</TabsTrigger>
              </TabsList>

              {/* TAB: Resumo */}
              <TabsContent value="resumo" className="space-y-4 mt-4">
                {client ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Cadastral */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4" /> Dados Cadastrais
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <Row label="Razão Social" value={client.razao_social} />
                          <Row label="Nome Fantasia" value={client.nome_fantasia || "—"} />
                          <Row label="CNPJ/CPF" value={formatCNPJorCPF(client.cnpj_cpf)} mono />
                          <Row label="Segmento" value={client.segmento || "—"} />
                          <Row label="Fundação" value={formatDate(client.data_fundacao)} />
                          <Row label="Cidade/UF" value={client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "—"} />
                        </CardContent>
                      </Card>

                      {/* Latest analysis summary */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Última Análise
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {latestAnalysis ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge variant="outline" className={statusColors[latestAnalysis.status]}>
                                  {statusLabels[latestAnalysis.status]}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <Row label="Data" value={formatDate(latestAnalysis.data_analise)} />
                                <Row label="Score" value={latestAnalysis.credit_score ? String(latestAnalysis.credit_score) : "—"} />
                                <Row label="Limite Sugerido" value={formatBRL(latestAnalysis.limite_sugerido)} />
                                <Row label="Fat. Médio" value={formatBRL(latestAnalysis.faturamento_medio)} />
                                <Row label="Analista" value={latestAnalysis.analista_credito || "—"} />
                              </div>
                              {latestAnalysis.credit_score != null && (
                                <div className="pt-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Score</span>
                                    <span className="font-medium">{latestAnalysis.credit_score}/1000</span>
                                  </div>
                                  <Progress value={(latestAnalysis.credit_score / 1000) * 100} className="h-2" />
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => navigate(`/analises/${latestAnalysis.id}`)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" /> Abrir Análise
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma análise encontrada</p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Committee history */}
                      {votes.length > 0 && (
                        <Card className="md:col-span-2">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Users className="h-4 w-4" /> Histórico de Votos
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {votes.slice(0, 6).map((v) => (
                                <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                  {v.vote === "approve" && <CheckCircle2 className="h-4 w-4 text-status-approved shrink-0" />}
                                  {v.vote === "restrict" && <AlertTriangle className="h-4 w-4 text-status-committee shrink-0" />}
                                  {v.vote === "reject" && <XCircle className="h-4 w-4 text-status-rejected shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{v.member_name}</p>
                                    <p className="text-xs text-muted-foreground">{v.member_role} • {formatDate(v.vote_date)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* External data inline in Resumo */}
                    {externalSources.some((s) => s.status === "success" && s.data) && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold text-foreground">Dados de Fontes Externas</h3>
                        </div>
                        <ExternalDataDisplay sources={externalSources} />
                      </>
                    )}
                  </>
                ) : !isLoading ? (
                  <div className="space-y-4">
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center space-y-4">
                        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                          {isPJ ? <Building2 className="h-7 w-7 text-primary" /> : <User className="h-7 w-7 text-primary" />}
                        </div>
                        <div>
                          <p className="font-medium text-lg">
                            {externalName || formatCNPJorCPF(digits)}
                          </p>
                          <p className="text-muted-foreground text-sm mt-1">
                            {brasilApiData
                              ? "Encontrado na Receita Federal, mas não está na sua base interna."
                              : "Nenhum cadastro encontrado na base interna para este documento."}
                          </p>
                        </div>
                        {brasilApiData && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {brasilApiData.situacao_cadastral && <p>Situação: <span className="font-medium text-foreground">{brasilApiData.situacao_cadastral}</span></p>}
                            {brasilApiData.cnae_descricao && <p>Atividade: <span className="font-medium text-foreground">{brasilApiData.cnae_descricao}</span></p>}
                            {brasilApiData.endereco?.cidade && brasilApiData.endereco?.uf && (
                              <p>Local: <span className="font-medium text-foreground">{brasilApiData.endereco.cidade}/{brasilApiData.endereco.uf}</span></p>
                            )}
                          </div>
                        )}
                        <Separator />
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Como deseja seguir com este {isPJ ? "CNPJ" : "CPF"}?
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                            {/* Primário — filled mint sólido (Adicionar como prospect) */}
                            <button
                              onClick={() => createProspectMutation.mutate()}
                              disabled={!qualification || isCreating}
                              className="flex flex-col gap-2 p-4 rounded-[12px] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-left hover:opacity-90"
                              style={{
                                background: "#00D49A",
                                color: "#0A1538",
                                boxShadow: "0 4px 14px -4px rgba(0,212,154,0.45)",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4" style={{ color: "#0A1538" }} />
                                <span className="font-bold text-sm" style={{ color: "#0A1538" }}>Adicionar como prospect</span>
                                {createProspectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" style={{ color: "#0A1538" }} />}
                              </div>
                              <p className="text-[12px] leading-snug" style={{ color: "rgba(10,21,56,0.75)" }}>
                                Vai pro funil de prospecção. Ideal para leads que ainda precisam ser qualificados/abordados pelo comercial.
                              </p>
                            </button>

                            {/* Secundário — outlined com border mint claro (Adicionar à carteira) */}
                            <button
                              onClick={() => addToPortfolioMutation.mutate()}
                              disabled={isCreating}
                              className="flex flex-col gap-2 p-4 rounded-[12px] border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                              style={{
                                borderColor: "#2BD49C",
                                background: "rgba(43,212,156,0.06)",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(43,212,156,0.12)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(43,212,156,0.06)"; }}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-sink-mint-3" />
                                <span className="font-semibold text-sm" style={{ color: "#0A1538" }}>Adicionar à carteira</span>
                                {addToPortfolioMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-sink-mint-3" />}
                              </div>
                              <p className="text-[12px] leading-snug" style={{ color: "rgba(10,21,56,0.65)" }}>
                                Vira cedente direto no Portfólio com análise pré-aberta. Pula o prospect — use quando já tem decisão de incluir.
                              </p>
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* External data for non-registered */}
                    {externalSources.some((s) => s.status === "success" && s.data) && (
                      <>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-semibold text-foreground">Dados de Fontes Externas</h3>
                        </div>
                        <ExternalDataDisplay sources={externalSources} />
                      </>
                    )}
                  </div>
                ) : null}
              </TabsContent>

              {/* TAB: Análises */}
              <TabsContent value="analises" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Limite Sugerido</TableHead>
                            <TableHead>Fat. Médio</TableHead>
                            <TableHead>Analista</TableHead>
                            <TableHead>Recomendação</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                Nenhuma análise registrada
                              </TableCell>
                            </TableRow>
                          ) : (
                            analyses.map((a) => (
                              <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/analises/${a.id}`)}>
                                <TableCell>{formatDate(a.data_analise)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                                </TableCell>
                                <TableCell className="font-mono">{a.credit_score ?? "—"}</TableCell>
                                <TableCell>{formatBRL(a.limite_sugerido)}</TableCell>
                                <TableCell>{formatBRL(a.faturamento_medio)}</TableCell>
                                <TableCell>{a.analista_credito || "—"}</TableCell>
                                <TableCell>
                                  {a.recommendation ? (
                                    <Badge variant="outline" className={
                                      a.recommendation === "approve" ? "bg-status-approved/10 text-status-approved" :
                                      a.recommendation === "restrict" ? "bg-status-restricted/10 text-status-restricted" :
                                      "bg-status-rejected/10 text-status-rejected"
                                    }>
                                      {a.recommendation === "approve" ? "Aprovar" : a.recommendation === "restrict" ? "Restringir" : "Reprovar"}
                                    </Badge>
                                  ) : "—"}
                                </TableCell>
                                <TableCell>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Participações (CPF only) */}
              {!isPJ && (
                <TabsContent value="participacoes" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" /> Participações Societárias
                      </CardTitle>
                      <CardDescription>Empresas onde este CPF aparece como sócio</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {socioRecords.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma participação encontrada</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Empresa</TableHead>
                              <TableHead>CNPJ</TableHead>
                              <TableHead>Cargo</TableHead>
                              <TableHead>Participação</TableHead>
                              <TableHead>Status Análise</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {socioRecords.map((s: any) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.credit_analysis?.clients?.razao_social || "—"}</TableCell>
                                <TableCell className="font-mono">{s.credit_analysis?.clients?.cnpj_cpf ? formatCNPJorCPF(s.credit_analysis.clients.cnpj_cpf) : "—"}</TableCell>
                                <TableCell>{s.cargo || "—"}</TableCell>
                                <TableCell>{s.participacao ? formatPercent(s.participacao) : "—"}</TableCell>
                                <TableCell>
                                  {s.credit_analysis?.status ? (
                                    <Badge variant="outline" className={statusColors[s.credit_analysis.status]}>
                                      {statusLabels[s.credit_analysis.status]}
                                    </Badge>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* TAB: Restritivos (last) */}
              <TabsContent value="restricoes" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ban className="h-4 w-4" /> Restritivos e Apontamentos
                    </CardTitle>
                    <CardDescription>Consolidação de restritivos encontrados nas análises internas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Sem análises para consolidar restritivos</p>
                    ) : (
                      <div className="space-y-4">
                        <RestrictiveItem icon={AlertTriangle} label="Protestos" items={analyses.map((a) => a.protestos).filter(Boolean) as string[]} />
                        <RestrictiveItem icon={Ban} label="Pendências Financeiras" items={analyses.map((a) => a.pendencias).filter(Boolean) as string[]} />
                        <RestrictiveItem icon={XCircle} label="Cheques sem Fundo" items={analyses.map((a) => a.cheques_sem_fundo).filter(Boolean) as string[]} />
                        <RestrictiveItem icon={Scale} label="Ações Judiciais" items={analyses.map((a) => a.acoes_judiciais).filter(Boolean) as string[]} />
                        <RestrictiveItem icon={Shield} label="Restrições CNPJ" items={analyses.map((a) => a.restricoes_cnpj).filter(Boolean) as string[]} />

                        {!hasRestrictions && (
                          <div className="flex items-center gap-3 py-6 justify-center text-status-approved">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">Nenhum restritivo encontrado nas análises internas</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function RestrictiveItem({ icon: Icon, label, items }: { icon: React.ElementType; label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-destructive" />
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="outline" className="ml-auto text-xs">{items.length} registro(s)</Badge>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <p key={i} className="text-sm text-muted-foreground pl-6">{item}</p>
        ))}
      </div>
    </div>
  );
}

function ExternalDataDisplay({ sources }: { sources: ExternalSourceResult[] }) {
  const apiData = sources.find((s) => s.source === "API Própria" && s.status === "success")?.data;
  const brasilApiData = sources.find((s) => s.source === "BrasilAPI (Receita Federal)" && s.status === "success")?.data;
  const data = apiData || brasilApiData;
  if (!data) return null;

  const formatPhoneDisplay = (phone?: string) => {
    if (!phone) return null;
    const d = phone.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Cadastral */}
      {(data.razao_social || data.situacao_cadastral || data.cnae_descricao) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Dados Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.razao_social && <Row label="Razão Social" value={data.razao_social} />}
            {data.nome_fantasia && <Row label="Nome Fantasia" value={data.nome_fantasia} />}
            {data.situacao_cadastral && <Row label="Situação" value={data.situacao_cadastral} />}
            {data.descricao_motivo_situacao && data.descricao_motivo_situacao !== "SEM MOTIVO" && (
              <Row label="Motivo Situação" value={data.descricao_motivo_situacao} />
            )}
            {data.data_situacao && <Row label="Data Situação" value={data.data_situacao} />}
            {data.natureza_juridica && <Row label="Natureza Jurídica" value={data.natureza_juridica} />}
            {data.porte && <Row label="Porte" value={data.porte} />}
            {data.capital_social != null && <Row label="Capital Social" value={formatBRL(data.capital_social)} />}
            {data.data_abertura && <Row label="Início Atividade" value={data.data_abertura} />}
            {data.identificador_matriz_filial && (
              <Row label="Tipo" value={data.identificador_matriz_filial} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Contato & Endereço */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contato & Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.endereco && (
            <>
              <Row
                label="Endereço"
                value={[
                  data.endereco.tipo_logradouro,
                  data.endereco.logradouro,
                  data.endereco.numero,
                ].filter(Boolean).join(" ")}
              />
              {data.endereco.complemento && <Row label="Complemento" value={data.endereco.complemento} />}
              {data.endereco.bairro && <Row label="Bairro" value={data.endereco.bairro} />}
              <Row label="Cidade/UF" value={`${data.endereco.cidade || "—"}/${data.endereco.uf || "—"}`} />
              {data.endereco.cep && <Row label="CEP" value={data.endereco.cep} mono />}
            </>
          )}
          {formatPhoneDisplay(data.telefone_1) && <Row label="Telefone 1" value={formatPhoneDisplay(data.telefone_1)!} mono />}
          {formatPhoneDisplay(data.telefone_2) && <Row label="Telefone 2" value={formatPhoneDisplay(data.telefone_2)!} mono />}
          {formatPhoneDisplay(data.fax) && <Row label="Fax" value={formatPhoneDisplay(data.fax)!} mono />}
          {data.email && <Row label="E-mail" value={data.email} />}
          {!data.endereco && !data.telefone_1 && !data.email && (
            <p className="text-muted-foreground text-center py-2">Sem dados de contato</p>
          )}
          {/* Google Maps Embed — requer VITE_GOOGLE_MAPS_API_KEY no .env.local com restrição de domínio */}
          {data.endereco && (data.endereco.logradouro || data.endereco.cidade) && import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (() => {
            const parts = [
              data.endereco!.tipo_logradouro,
              data.endereco!.logradouro,
              data.endereco!.numero,
              data.endereco!.bairro,
              data.endereco!.cidade,
              data.endereco!.uf,
              data.endereco!.cep,
            ].filter(Boolean).join(", ");
            const q = encodeURIComponent(parts);
            const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            return (
              <div className="mt-4 rounded-lg overflow-hidden border">
                <iframe
                  title="Localização no mapa"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${q}`}
                />
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* CNAE Principal + Secundários */}
      {(data.cnae_descricao || (data.cnaes_secundarios && data.cnaes_secundarios.length > 0)) && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Atividades Econômicas (CNAEs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.cnae_descricao && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                <Badge variant="outline" className="shrink-0 bg-primary/10 text-primary border-primary/30">Principal</Badge>
                <span className="text-sm font-medium">{data.cnae_descricao}</span>
                {data.cnae_principal && <span className="text-xs text-muted-foreground font-mono ml-auto">{data.cnae_principal}</span>}
              </div>
            )}
            {data.cnaes_secundarios && data.cnaes_secundarios.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Secundários ({data.cnaes_secundarios.length})</p>
                {data.cnaes_secundarios.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30 text-sm">
                    <span>{c.descricao}</span>
                    <span className="text-xs text-muted-foreground font-mono">{c.codigo}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Simples Nacional / MEI */}
      {(data.opcao_simples != null || data.opcao_mei != null) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Simples Nacional / MEI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <span className="text-muted-foreground">Simples Nacional</span>
              <Badge variant="outline" className={
                data.opcao_simples === true ? "bg-status-approved/10 text-status-approved border-status-approved/30"
                : data.opcao_simples === false ? "bg-muted text-muted-foreground"
                : "bg-muted text-muted-foreground"
              }>
                {data.opcao_simples === true ? "Optante" : data.opcao_simples === false ? "Não optante" : "Não informado"}
              </Badge>
            </div>
            {data.data_opcao_simples && <Row label="Data Opção Simples" value={data.data_opcao_simples} />}
            {data.data_exclusao_simples && <Row label="Data Exclusão Simples" value={data.data_exclusao_simples} />}

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <span className="text-muted-foreground">MEI</span>
              <Badge variant="outline" className={
                data.opcao_mei === true ? "bg-status-approved/10 text-status-approved border-status-approved/30"
                : data.opcao_mei === false ? "bg-muted text-muted-foreground"
                : "bg-muted text-muted-foreground"
              }>
                {data.opcao_mei === true ? "Optante" : data.opcao_mei === false ? "Não optante" : "Não informado"}
              </Badge>
            </div>
            {data.data_opcao_mei && <Row label="Data Opção MEI" value={data.data_opcao_mei} />}
            {data.data_exclusao_mei && <Row label="Data Exclusão MEI" value={data.data_exclusao_mei} />}
          </CardContent>
        </Card>
      )}

      {/* Regime Tributário */}
      {data.regime_tributario && data.regime_tributario.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Regime Tributário
              <Badge variant="outline" className="ml-auto text-xs">{data.regime_tributario.length} ano(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.regime_tributario
                .sort((a, b) => b.ano - a.ano)
                .map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30 text-sm">
                    <span className="font-mono font-medium">{r.ano}</span>
                    <span className="text-muted-foreground">{r.forma_tributacao}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score from external */}
      {(data.score != null || data.classe_risco) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Score Externo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.score != null && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-2xl font-bold">{data.score}</span>
                </div>
                <Progress value={(data.score / 1000) * 100} className="h-2" />
              </>
            )}
            {data.score_descricao && <Row label="Descrição" value={data.score_descricao} />}
            {data.classe_risco && <Row label="Classe de Risco" value={data.classe_risco} />}
            {data.probabilidade_inadimplencia != null && (
              <Row label="Prob. Inadimplência" value={`${(data.probabilidade_inadimplencia * 100).toFixed(1)}%`} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Protestos from external */}
      {data.protestos && data.protestos.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Protestos
              <Badge variant="outline" className="ml-auto">{data.protestos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartório</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.protestos.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.cartorio || "—"}</TableCell>
                    <TableCell>{p.valor ? formatBRL(p.valor) : "—"}</TableCell>
                    <TableCell>{p.data || "—"}</TableCell>
                    <TableCell>{p.cidade || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sócios */}
      {data.socios && data.socios.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Quadro Societário
              <Badge variant="outline" className="ml-auto">{data.socios.length} sócio(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Qualificação</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Faixa Etária</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.socios.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {s.nome}
                      {s.representante_legal && (
                        <span className="block text-xs text-muted-foreground">Rep. Legal: {s.representante_legal}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{s.cpf_cnpj || "—"}</TableCell>
                    <TableCell>{s.qualificacao || "—"}</TableCell>
                    <TableCell>{s.data_entrada || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.faixa_etaria || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
