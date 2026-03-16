import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";
import { ArrowLeft, Plus, Trash2, Send, Printer, Save, Building2, BarChart3, Users, ShieldCheck, TrendingUp, AlertTriangle, Settings2, FileCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchPrintData, generatePrintHtml, openPrintWindow } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

interface SacadoRow {
  id?: string;
  sacado_nome: string;
  percentual_faturamento: number | null;
  prazo_medio: number | null;
}

interface SocioRow {
  id?: string;
  nome: string;
  cpf: string;
  participacao: number | null;
  cargo: string;
}

const SECTIONS = [
  { id: "identificacao", label: "Identificação", icon: Building2 },
  { id: "operacional", label: "Operacional", icon: BarChart3 },
  { id: "societaria", label: "Societária", icon: Users },
  { id: "credito", label: "Crédito", icon: ShieldCheck },
  { id: "financeira", label: "Financeira", icon: TrendingUp },
  { id: "riscos", label: "Riscos", icon: AlertTriangle },
  { id: "operacao", label: "Operação", icon: Settings2 },
  { id: "parecer", label: "Parecer", icon: FileCheck },
] as const;

function SectionHeader({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) {
  return (
    <div id={id} className="flex items-center gap-2 pt-6 pb-3 border-b border-border first:pt-0 scroll-mt-4">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold tracking-wide uppercase text-primary">{title}</h2>
    </div>
  );
}

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const gridCols = cols === 4 ? "grid-cols-2 md:grid-cols-4" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";
  return <div className={`grid ${gridCols} gap-x-6 gap-y-3`}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export default function CreditAnalysisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "nova";
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("identificacao");

  // Form state
  const [clientId, setClientId] = useState("");
  const [responsavelComercial, setResponsavelComercial] = useState("");
  const [analistaCredito, setAnalistaCredito] = useState("");
  const [dataAnalise, setDataAnalise] = useState(new Date().toISOString().split("T")[0]);
  const [faturamentoMedio, setFaturamentoMedio] = useState("");
  const [volumeEstimado, setVolumeEstimado] = useState("");
  const [prazoMedioTitulos, setPrazoMedioTitulos] = useState("");
  const [historicoSocios, setHistoricoSocios] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [protestos, setProtestos] = useState("");
  const [pendencias, setPendencias] = useState("");
  const [chequesSemFundo, setChequesSemFundo] = useState("");
  const [acoesJudiciais, setAcoesJudiciais] = useState("");
  const [observacoesCredito, setObservacoesCredito] = useState("");
  const [analiseFaturamento, setAnaliseFaturamento] = useState("");
  const [estruturaFinanceira, setEstruturaFinanceira] = useState("");
  const [endividamento, setEndividamento] = useState("");
  const [dependenciaClientes, setDependenciaClientes] = useState("");
  const [riscos, setRiscos] = useState("");
  const [pontosPositivos, setPontosPositivos] = useState("");
  const [limiteSugerido, setLimiteSugerido] = useState("");
  const [prazoMedioPermitido, setPrazoMedioPermitido] = useState("");
  const [concentracaoMaxima, setConcentracaoMaxima] = useState("");
  const [garantias, setGarantias] = useState("");
  const [parecerAnalista, setParecerAnalista] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [sacados, setSacados] = useState<SacadoRow[]>([]);
  const [socios, setSocios] = useState<SocioRow[]>([]);

  // Scroll spy
  const handleScroll = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop + 60;
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = document.getElementById(SECTIONS[i].id);
      if (el && el.offsetTop <= scrollTop) {
        setActiveSection(SECTIONS[i].id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      return data || [];
    },
  });

  const { data: analysis } = useQuery({
    queryKey: ["credit-analysis", id],
    queryFn: async () => {
      if (!isEditing) return null;
      const { data, error } = await supabase.from("credit_analysis").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const { data: existingSacados = [] } = useQuery({
    queryKey: ["sacados", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_sacados").select("*").eq("credit_analysis_id", id);
      return data || [];
    },
    enabled: isEditing,
  });

  const { data: existingSocios = [] } = useQuery({
    queryKey: ["socios", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_socios").select("*").eq("credit_analysis_id", id);
      return data || [];
    },
    enabled: isEditing,
  });

  // Populate form
  useEffect(() => {
    if (analysis) {
      setClientId(analysis.client_id);
      setResponsavelComercial(analysis.responsavel_comercial || "");
      setAnalistaCredito(analysis.analista_credito || "");
      setDataAnalise(analysis.data_analise || "");
      setFaturamentoMedio(analysis.faturamento_medio?.toString() || "");
      setVolumeEstimado(analysis.volume_estimado?.toString() || "");
      setPrazoMedioTitulos(analysis.prazo_medio_titulos?.toString() || "");
      setHistoricoSocios(analysis.historico_socios || "");
      setCreditScore(analysis.credit_score?.toString() || "");
      setProtestos(analysis.protestos || "");
      setPendencias(analysis.pendencias || "");
      setChequesSemFundo(analysis.cheques_sem_fundo || "");
      setAcoesJudiciais(analysis.acoes_judiciais || "");
      setObservacoesCredito(analysis.observacoes_credito || "");
      setAnaliseFaturamento(analysis.analise_faturamento || "");
      setEstruturaFinanceira(analysis.estrutura_financeira || "");
      setEndividamento(analysis.endividamento || "");
      setDependenciaClientes(analysis.dependencia_clientes || "");
      setRiscos(analysis.riscos || "");
      setPontosPositivos(analysis.pontos_positivos || "");
      setLimiteSugerido(analysis.limite_sugerido?.toString() || "");
      setPrazoMedioPermitido(analysis.prazo_medio_permitido?.toString() || "");
      setConcentracaoMaxima(analysis.concentracao_maxima?.toString() || "");
      setGarantias(analysis.garantias || "");
      setParecerAnalista(analysis.parecer_analista || "");
      setRecommendation(analysis.recommendation || "");
      setStatus(analysis.status);
    }
  }, [analysis]);

  useEffect(() => {
    if (existingSacados.length) {
      setSacados(existingSacados.map((s) => ({
        id: s.id, sacado_nome: s.sacado_nome, percentual_faturamento: s.percentual_faturamento, prazo_medio: s.prazo_medio,
      })));
    }
  }, [existingSacados]);

  useEffect(() => {
    if (existingSocios.length) {
      setSocios(existingSocios.map((s) => ({
        id: s.id, nome: s.nome, cpf: s.cpf || "", participacao: s.participacao, cargo: s.cargo || "",
      })));
    }
  }, [existingSocios]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        responsavel_comercial: responsavelComercial || null,
        analista_credito: analistaCredito || null,
        data_analise: dataAnalise || null,
        faturamento_medio: faturamentoMedio ? parseFloat(faturamentoMedio) : null,
        volume_estimado: volumeEstimado ? parseFloat(volumeEstimado) : null,
        prazo_medio_titulos: prazoMedioTitulos ? parseInt(prazoMedioTitulos) : null,
        historico_socios: historicoSocios || null,
        credit_score: creditScore ? parseInt(creditScore) : null,
        protestos: protestos || null,
        pendencias: pendencias || null,
        cheques_sem_fundo: chequesSemFundo || null,
        acoes_judiciais: acoesJudiciais || null,
        observacoes_credito: observacoesCredito || null,
        analise_faturamento: analiseFaturamento || null,
        estrutura_financeira: estruturaFinanceira || null,
        endividamento: endividamento || null,
        dependencia_clientes: dependenciaClientes || null,
        riscos: riscos || null,
        pontos_positivos: pontosPositivos || null,
        limite_sugerido: limiteSugerido ? parseFloat(limiteSugerido) : null,
        prazo_medio_permitido: prazoMedioPermitido ? parseInt(prazoMedioPermitido) : null,
        concentracao_maxima: concentracaoMaxima ? parseFloat(concentracaoMaxima) : null,
        garantias: garantias || null,
        parecer_analista: parecerAnalista || null,
        recommendation: (recommendation || null) as any,
        status: status as any,
      };

      let analysisId = id;
      if (isEditing) {
        const { error } = await supabase.from("credit_analysis").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("credit_analysis").insert(payload).select("id").single();
        if (error) throw error;
        analysisId = data.id;
      }

      if (isEditing) await supabase.from("credit_analysis_sacados").delete().eq("credit_analysis_id", analysisId!);
      if (sacados.length > 0) {
        await supabase.from("credit_analysis_sacados").insert(
          sacados.map((s) => ({ credit_analysis_id: analysisId!, sacado_nome: s.sacado_nome, percentual_faturamento: s.percentual_faturamento, prazo_medio: s.prazo_medio }))
        );
      }

      if (isEditing) await supabase.from("credit_analysis_socios").delete().eq("credit_analysis_id", analysisId!);
      if (socios.length > 0) {
        await supabase.from("credit_analysis_socios").insert(
          socios.map((s) => ({ credit_analysis_id: analysisId!, nome: s.nome, cpf: s.cpf || null, participacao: s.participacao, cargo: s.cargo || null }))
        );
      }
      return analysisId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      toast({ title: "Análise salva com sucesso" });
      navigate("/analises");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const sendToCommittee = useMutation({
    mutationFn: async () => {
      if (!isEditing) throw new Error("Salve a análise antes de enviar ao comitê");
      const { error } = await supabase.from("credit_analysis").update({ status: "in_committee" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      toast({ title: "Análise enviada ao Comitê de Crédito" });
      navigate("/comite");
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Selecione um cedente", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  const isReadOnly = status !== "draft";
  const addSacado = () => setSacados([...sacados, { sacado_nome: "", percentual_faturamento: null, prazo_medio: null }]);
  const removeSacado = (i: number) => setSacados(sacados.filter((_, idx) => idx !== i));
  const addSocio = () => setSocios([...socios, { nome: "", cpf: "", participacao: null, cargo: "" }]);
  const removeSocio = (i: number) => setSocios(socios.filter((_, idx) => idx !== i));

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Scroll-spy sidebar */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-border bg-muted/30 py-4 px-2">
        <div className="mb-4 px-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={() => navigate("/analises")}>
            <ArrowLeft className="h-3 w-3 mr-1.5" /> Voltar
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left",
                activeSection === s.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Quick stats */}
        {(limiteSugerido || creditScore) && (
          <div className="mt-auto pt-4 px-2 space-y-2 border-t border-border">
            {limiteSugerido && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite</p>
                <p className="text-sm font-bold tabular-nums">{formatBRL(parseFloat(limiteSugerido))}</p>
              </div>
            )}
            {creditScore && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
                <p className="text-sm font-bold tabular-nums">{creditScore}</p>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => navigate("/analises")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">
                {isEditing ? (selectedClient?.razao_social || "Análise de Crédito") : "Nova Análise de Crédito"}
              </h1>
              {isEditing && <p className="text-xs text-muted-foreground">Relatório de análise de crédito</p>}
            </div>
            {isEditing && <StatusBadge status={status} />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  try {
                    const data = await fetchPrintData(id!);
                    const html = generatePrintHtml(data);
                    openPrintWindow(html);
                  } catch {
                    toast({ title: "Erro ao gerar relatório", variant: "destructive" });
                  }
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            )}
            {!isReadOnly && (
              <>
                <Button size="sm" className="text-xs" onClick={handleSubmit} disabled={saveMutation.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                {isEditing && (
                  <Button
                    size="sm"
                    className="text-xs bg-status-committee hover:bg-status-committee/90"
                    onClick={() => sendToCommittee.mutate()}
                    disabled={sendToCommittee.isPending || !recommendation}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Comitê
                  </Button>
                )}
              </>
            )}
          </div>
        </header>

        {/* Scrollable report */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-4 space-y-1">

            {/* 1. Identificação */}
            <SectionHeader id="identificacao" title="Identificação do Cliente" icon={Building2} />
            <FieldGroup cols={2}>
              <Field label="Cedente *">
                <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o cedente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data da Análise">
                <Input type="date" value={dataAnalise} onChange={(e) => setDataAnalise(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" />
              </Field>
              <Field label="Responsável Comercial">
                <Input value={responsavelComercial} onChange={(e) => setResponsavelComercial(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="—" />
              </Field>
              <Field label="Analista de Crédito">
                <Input value={analistaCredito} onChange={(e) => setAnalistaCredito(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="—" />
              </Field>
            </FieldGroup>

            {/* 2. Operacional */}
            <SectionHeader id="operacional" title="Informações Operacionais" icon={BarChart3} />
            <FieldGroup cols={3}>
              <Field label="Faturamento Médio (R$)">
                <Input type="number" step="0.01" value={faturamentoMedio} onChange={(e) => setFaturamentoMedio(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0,00" />
              </Field>
              <Field label="Volume Estimado (R$)">
                <Input type="number" step="0.01" value={volumeEstimado} onChange={(e) => setVolumeEstimado(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0,00" />
              </Field>
              <Field label="Prazo Médio (dias)">
                <Input type="number" value={prazoMedioTitulos} onChange={(e) => setPrazoMedioTitulos(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
              </Field>
            </FieldGroup>

            {/* Sacados inline table */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Principais Sacados</span>
                {!isReadOnly && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addSacado}>
                    <Plus className="h-3 w-3 mr-1" /> Sacado
                  </Button>
                )}
              </div>
              {sacados.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs h-8">Sacado</TableHead>
                        <TableHead className="text-xs h-8 w-32">% Fat.</TableHead>
                        <TableHead className="text-xs h-8 w-28">Prazo</TableHead>
                        {!isReadOnly && <TableHead className="w-10 h-8" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sacados.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="p-1.5">
                            <Input value={s.sacado_nome} onChange={(e) => { const u = [...sacados]; u[i].sacado_nome = e.target.value; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input type="number" step="0.1" value={s.percentual_faturamento ?? ""} onChange={(e) => { const u = [...sacados]; u[i].percentual_faturamento = e.target.value ? parseFloat(e.target.value) : null; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input type="number" value={s.prazo_medio ?? ""} onChange={(e) => { const u = [...sacados]; u[i].prazo_medio = e.target.value ? parseInt(e.target.value) : null; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          {!isReadOnly && (
                            <TableCell className="p-1.5">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSacado(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* 3. Societária */}
            <SectionHeader id="societaria" title="Estrutura Societária" icon={Users} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quadro Societário</span>
                {!isReadOnly && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addSocio}>
                    <Plus className="h-3 w-3 mr-1" /> Sócio
                  </Button>
                )}
              </div>
              {socios.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs h-8">Nome</TableHead>
                        <TableHead className="text-xs h-8 w-36">CPF</TableHead>
                        <TableHead className="text-xs h-8 w-24">Part. %</TableHead>
                        <TableHead className="text-xs h-8 w-32">Cargo</TableHead>
                        {!isReadOnly && <TableHead className="w-10 h-8" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {socios.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="p-1.5">
                            <Input value={s.nome} onChange={(e) => { const u = [...socios]; u[i].nome = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input value={s.cpf} onChange={(e) => { const u = [...socios]; u[i].cpf = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input type="number" step="0.1" value={s.participacao ?? ""} onChange={(e) => { const u = [...socios]; u[i].participacao = e.target.value ? parseFloat(e.target.value) : null; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input value={s.cargo} onChange={(e) => { const u = [...socios]; u[i].cargo = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1" />
                          </TableCell>
                          {!isReadOnly && (
                            <TableCell className="p-1.5">
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSocio(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className="pt-3">
              <Field label="Histórico Empresarial dos Sócios">
                <Textarea value={historicoSocios} onChange={(e) => setHistoricoSocios(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Descrição do histórico empresarial..." />
              </Field>
            </div>

            {/* 4. Crédito */}
            <SectionHeader id="credito" title="Consulta de Crédito" icon={ShieldCheck} />
            <FieldGroup cols={3}>
              <Field label="Score de Crédito">
                <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
              </Field>
              <Field label="Protestos">
                <Input value={protestos} onChange={(e) => setProtestos(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Nada consta" />
              </Field>
              <Field label="Pendências Financeiras">
                <Input value={pendencias} onChange={(e) => setPendencias(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Nada consta" />
              </Field>
              <Field label="Cheques sem Fundo">
                <Input value={chequesSemFundo} onChange={(e) => setChequesSemFundo(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Nada consta" />
              </Field>
              <Field label="Ações Judiciais">
                <Input value={acoesJudiciais} onChange={(e) => setAcoesJudiciais(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Nada consta" />
              </Field>
            </FieldGroup>
            <div className="pt-3">
              <Field label="Observações da Consulta">
                <Textarea value={observacoesCredito} onChange={(e) => setObservacoesCredito(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Observações relevantes..." />
              </Field>
            </div>

            {/* 5. Financeira */}
            <SectionHeader id="financeira" title="Análise Financeira" icon={TrendingUp} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Análise de Faturamento">
                <Textarea value={analiseFaturamento} onChange={(e) => setAnaliseFaturamento(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" />
              </Field>
              <Field label="Estrutura Financeira">
                <Textarea value={estruturaFinanceira} onChange={(e) => setEstruturaFinanceira(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" />
              </Field>
              <Field label="Endividamento Aparente">
                <Textarea value={endividamento} onChange={(e) => setEndividamento(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" />
              </Field>
              <Field label="Dependência de Clientes">
                <Textarea value={dependenciaClientes} onChange={(e) => setDependenciaClientes(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" />
              </Field>
            </div>

            {/* 6. Riscos */}
            <SectionHeader id="riscos" title="Riscos e Pontos Positivos" icon={AlertTriangle} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Riscos Identificados">
                <Textarea value={riscos} onChange={(e) => setRiscos(e.target.value)} disabled={isReadOnly} rows={4} className="text-sm resize-none" />
              </Field>
              <Field label="Pontos Positivos">
                <Textarea value={pontosPositivos} onChange={(e) => setPontosPositivos(e.target.value)} disabled={isReadOnly} rows={4} className="text-sm resize-none" />
              </Field>
            </div>

            {/* 7. Operação */}
            <SectionHeader id="operacao" title="Operação Proposta" icon={Settings2} />
            <FieldGroup cols={3}>
              <Field label="Limite Sugerido (R$)">
                <Input type="number" step="0.01" value={limiteSugerido} onChange={(e) => setLimiteSugerido(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums font-semibold" placeholder="0,00" />
              </Field>
              <Field label="Prazo Médio Permitido (dias)">
                <Input type="number" value={prazoMedioPermitido} onChange={(e) => setPrazoMedioPermitido(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
              </Field>
              <Field label="Concentração Máx. Sacado (%)">
                <Input type="number" step="0.1" value={concentracaoMaxima} onChange={(e) => setConcentracaoMaxima(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
              </Field>
            </FieldGroup>
            <div className="pt-3">
              <Field label="Garantias">
                <Textarea value={garantias} onChange={(e) => setGarantias(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" />
              </Field>
            </div>

            {/* 8. Parecer */}
            <SectionHeader id="parecer" title="Parecer do Analista" icon={FileCheck} />
            <Field label="Parecer">
              <Textarea value={parecerAnalista} onChange={(e) => setParecerAnalista(e.target.value)} disabled={isReadOnly} rows={5} className="text-sm resize-none" />
            </Field>
            <div className="pt-3">
              <Field label="Recomendação">
                <div className="flex gap-2 pt-1">
                  {[
                    { value: "approve", label: "Aprovar", color: "bg-status-approved/10 border-status-approved text-status-approved" },
                    { value: "restrict", label: "Aprovar c/ Restrição", color: "bg-status-restricted/10 border-status-restricted text-status-restricted" },
                    { value: "reject", label: "Reprovar", color: "bg-status-rejected/10 border-status-rejected text-status-rejected" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setRecommendation(opt.value)}
                      className={cn(
                        "px-4 py-2 rounded-md text-xs font-semibold border-2 transition-all",
                        recommendation === opt.value
                          ? opt.color
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Bottom spacer */}
            <div className="h-16" />
          </form>
        </div>
      </div>
    </div>
  );
}
