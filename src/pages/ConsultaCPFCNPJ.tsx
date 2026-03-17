import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Info, Ban, Scale, Banknote, Users, MapPin, Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatBRL, formatDate, formatPercent, statusLabels, statusColors } from "@/lib/formatters";
import { motion, AnimatePresence } from "framer-motion";
import { fetchExternalConsulta, type ExternalSourceResult, type ExternalConsultaData } from "@/lib/external-consulta";

// --- Helpers ---
function cleanDocument(value: string) {
  return value.replace(/\D/g, "");
}

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
    low: { label: "Baixo", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    medium: { label: "Médio", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    high: { label: "Alto", className: "bg-red-500/15 text-red-600 border-red-500/30" },
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
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function ConsultaCPFCNPJ() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [searchDoc, setSearchDoc] = useState<string | null>(null);

  const digits = searchDoc ? cleanDocument(searchDoc) : "";
  const isPJ = digits.length > 11;

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const d = cleanDocument(inputValue);
    if (d.length >= 11) {
      setSearchDoc(inputValue);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consulta CPF / CNPJ</h1>
        <p className="text-muted-foreground">Visão 360° — base interna e fontes externas</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o CPF ou CNPJ..."
                value={inputValue}
                onChange={(e) => setInputValue(formatInputDocument(e.target.value))}
                className="pl-9 font-mono"
                maxLength={18}
              />
            </div>
            <Button type="submit" disabled={cleanDocument(inputValue).length < 11}>
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
            {/* Identity Header */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      {isPJ ? <Building2 className="h-6 w-6 text-primary" /> : <User className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <p className="font-mono text-lg font-semibold">{formatCNPJorCPF(digits)}</p>
                      {client ? (
                        <>
                          <p className="text-base font-medium">{client.razao_social}</p>
                          {client.nome_fantasia && <p className="text-sm text-muted-foreground">{client.nome_fantasia}</p>}
                        </>
                      ) : socioRecords.length > 0 ? (
                        <p className="text-base font-medium">{socioRecords[0].nome}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Não encontrado na base interna</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {found && <RiskBadge level={deriveRiskLevel(bestScore)} />}
                    {!found && hasSearched && !isLoading && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Sem registros</Badge>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                {client && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
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

            {/* Tabs */}
            <Tabs defaultValue="resumo">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="analises">Análises ({analyses.length})</TabsTrigger>
                <TabsTrigger value="restricoes">Restritivos</TabsTrigger>
                {!isPJ && <TabsTrigger value="participacoes">Participações ({socioRecords.length})</TabsTrigger>}
                <TabsTrigger value="fontes">Fontes Externas</TabsTrigger>
              </TabsList>

              {/* TAB: Resumo */}
              <TabsContent value="resumo" className="space-y-4 mt-4">
                {client ? (
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
                                {v.vote === "approve" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                {v.vote === "restrict" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                                {v.vote === "reject" && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
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
                ) : !isLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Nenhum cadastro encontrado na base interna para este documento.</p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate("/cedentes/novo")}>
                        Cadastrar Cedente
                      </Button>
                    </CardContent>
                  </Card>
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
                                      a.recommendation === "approve" ? "bg-emerald-500/15 text-emerald-600" :
                                      a.recommendation === "restrict" ? "bg-amber-500/15 text-amber-600" :
                                      "bg-red-500/15 text-red-600"
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

              {/* TAB: Restritivos */}
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
                          <div className="flex items-center gap-3 py-6 justify-center text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm font-medium">Nenhum restritivo encontrado nas análises internas</span>
                          </div>
                        )}
                      </div>
                    )}
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

              {/* TAB: Fontes Externas */}
              <TabsContent value="fontes" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Fontes Externas
                    </CardTitle>
                    <CardDescription>
                      Integre APIs externas (Serasa, Receita Federal, SCR/Bacen, etc.) para enriquecer a consulta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {externalSources.map((src, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-muted">
                              {src.status === "success" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : src.status === "error" ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{src.source}</p>
                              <p className="text-xs text-muted-foreground">{src.message || "Dados disponíveis"}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={
                            src.status === "success" ? "bg-emerald-500/15 text-emerald-600" :
                            src.status === "error" ? "bg-red-500/15 text-red-600" :
                            "bg-muted text-muted-foreground"
                          }>
                            {src.status === "success" ? "Conectado" : src.status === "error" ? "Erro" : "Não configurado"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      Para ativar fontes externas, entre em contato com o administrador para configurar as chaves de API necessárias.
                    </p>
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
