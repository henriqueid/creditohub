import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";
import {
  ArrowLeft, Plus, Trash2, Send, Printer, Save, Building2, BarChart3,
  Users, ShieldCheck, TrendingUp, AlertTriangle, Settings2, FileCheck,
  Sparkles, Brain, Target, Gauge, FileText, Zap
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchPrintData, generatePrintHtml, openPrintWindow } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";
import { ScoreGauge } from "@/components/ScoreGauge";
import { RiskIndicator } from "@/components/RiskIndicator";
import { ConcentrationChart } from "@/components/ConcentrationChart";
import { SectionFileUpload } from "@/components/SectionFileUpload";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import {
  classifyRisk, suggestLimit, calculateConcentration,
  calculateSociosTotal, calculateLimitUtilization, getScoreGrade
} from "@/lib/credit-calculations";

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

interface FileAttachment {
  id?: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  ai_extracted_data: any;
}

type SectionAttachments = Record<string, FileAttachment[]>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const gridCols = cols === 4 ? "grid-cols-2 md:grid-cols-4" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2";
  return <div className={`grid ${gridCols} gap-x-6 gap-y-3`}>{children}</div>;
}

function SectionWrapper({ title, icon: Icon, children, section, analysisId, attachments, onAttachmentsChange, onDataExtracted, analysisContext, disabled }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  section: string;
  analysisId: string | null;
  attachments: FileAttachment[];
  onAttachmentsChange: (atts: FileAttachment[]) => void;
  onDataExtracted?: (data: any) => void;
  analysisContext?: any;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-primary">{title}</h2>
      </div>
      {children}
      <div className="pt-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Anexos — {title}</p>
        <SectionFileUpload
          analysisId={analysisId}
          section={section}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          onDataExtracted={onDataExtracted}
          analysisContext={analysisContext}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default function CreditAnalysisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "nova";

  const [activeTab, setActiveTab] = useState("dossie");

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
  const [sectionAttachments, setSectionAttachments] = useState<SectionAttachments>({});

  // Computed values
  const scoreNum = creditScore ? parseInt(creditScore) : null;
  const fatNum = faturamentoMedio ? parseFloat(faturamentoMedio) : null;
  const limiteNum = limiteSugerido ? parseFloat(limiteSugerido) : null;
  const volNum = volumeEstimado ? parseFloat(volumeEstimado) : null;

  const riskClass = useMemo(() => classifyRisk(scoreNum), [scoreNum]);
  const grade = useMemo(() => getScoreGrade(scoreNum), [scoreNum]);
  const autoLimit = useMemo(() => suggestLimit(fatNum, scoreNum), [fatNum, scoreNum]);
  const concentration = useMemo(() => calculateConcentration(sacados), [sacados]);
  const sociosTotal = useMemo(() => calculateSociosTotal(socios), [socios]);
  const limitUtil = useMemo(() => calculateLimitUtilization(volNum, limiteNum), [volNum, limiteNum]);

  // Queries
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social, cnpj_cpf, segmento").order("razao_social");
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

  const { data: existingAttachments = [] } = useQuery({
    queryKey: ["attachments", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_attachments").select("*").eq("credit_analysis_id", id);
      return data || [];
    },
    enabled: isEditing,
  });

  const { data: existingInsights = [] } = useQuery({
    queryKey: ["insights", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_insights").select("*").eq("credit_analysis_id", id);
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

  useEffect(() => {
    if (existingAttachments.length) {
      const grouped: SectionAttachments = {};
      existingAttachments.forEach((a: any) => {
        if (!grouped[a.section]) grouped[a.section] = [];
        grouped[a.section].push({
          id: a.id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_type: a.file_type,
          file_size: a.file_size,
          ai_extracted_data: a.ai_extracted_data,
        });
      });
      setSectionAttachments(grouped);
    }
  }, [existingAttachments]);

  // Handle AI extracted data — auto-fill fields
  const handleDataExtracted = useCallback((data: any) => {
    if (data.score_credito && !creditScore) setCreditScore(data.score_credito.toString());
    if (data.protestos && !protestos) setProtestos(data.protestos);
    if (data.pendencias && !pendencias) setPendencias(data.pendencias);
    if (data.acoes_judiciais && !acoesJudiciais) setAcoesJudiciais(data.acoes_judiciais);
    if (data.faturamento_medio && !faturamentoMedio) setFaturamentoMedio(data.faturamento_medio.toString());
    if (data.socios && data.socios.length > 0 && socios.length === 0) {
      setSocios(data.socios.map((s: any) => ({
        nome: s.nome || "", cpf: s.cpf || "", participacao: s.participacao || null, cargo: s.cargo || "",
      })));
    }
    if (data.riscos_identificados?.length && !riscos) {
      setRiscos(data.riscos_identificados.join("\n• "));
    }
    if (data.pontos_positivos?.length && !pontosPositivos) {
      setPontosPositivos(data.pontos_positivos.join("\n• "));
    }
    toast({ title: "Dados preenchidos automaticamente", description: "Revise os campos que foram atualizados pela IA" });
  }, [creditScore, protestos, pendencias, acoesJudiciais, faturamentoMedio, socios, riscos, pontosPositivos]);

  const updateSectionAttachments = (section: string) => (atts: FileAttachment[]) => {
    setSectionAttachments(prev => ({ ...prev, [section]: atts }));
  };

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const analysisDataForAI = {
    faturamento_medio: fatNum, volume_estimado: volNum, credit_score: scoreNum,
    prazo_medio_titulos: prazoMedioTitulos ? parseInt(prazoMedioTitulos) : null,
    limite_sugerido: limiteNum, protestos, pendencias, acoes_judiciais: acoesJudiciais,
    cheques_sem_fundo: chequesSemFundo, riscos, pontos_positivos: pontosPositivos,
    endividamento, estrutura_financeira: estruturaFinanceira, concentracao_maxima: concentracaoMaxima,
    sacados_count: sacados.length, socios_count: socios.length,
  };

  const clientDataForAI = selectedClient ? {
    razao_social: selectedClient.razao_social,
    cnpj_cpf: selectedClient.cnpj_cpf,
    segmento: (selectedClient as any).segmento,
  } : null;

  const getInsight = (type: string) => existingInsights.find((i: any) => i.insight_type === type)?.content || null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/analises")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">
                {isEditing ? (selectedClient?.razao_social || "Dossiê de Crédito") : "Novo Dossiê de Crédito"}
              </h1>
              {isEditing && <p className="text-xs text-muted-foreground">Relatório inteligente de análise de crédito</p>}
            </div>
            {isEditing && <StatusBadge status={status} />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing && (
              <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
                try {
                  const data = await fetchPrintData(id!);
                  const html = generatePrintHtml(data);
                  openPrintWindow(html);
                } catch {
                  toast({ title: "Erro ao gerar relatório", variant: "destructive" });
                }
              }}>
                <Printer className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            )}
            {!isReadOnly && (
              <>
                <Button size="sm" className="text-xs" onClick={() => handleSubmit()} disabled={saveMutation.isPending}>
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
                    <Send className="h-3.5 w-3.5 mr-1" /> Comitê
                  </Button>
                )}
              </>
            )}
          </div>
        </header>

        {/* KPI Strip */}
        <div className="shrink-0 border-b border-border bg-muted/20 px-6 py-3">
          <div className="flex items-center gap-6 overflow-x-auto">
            {/* Score Gauge */}
            <div className="flex items-center gap-3 shrink-0">
              <ScoreGauge score={scoreNum} size="sm" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risco</p>
                <RiskIndicator score={scoreNum} compact />
              </div>
            </div>

            <div className="h-10 w-px bg-border shrink-0" />

            {/* Limit */}
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite Sugerido</p>
              <p className="text-lg font-bold tabular-nums">{limiteNum ? formatBRL(limiteNum) : "—"}</p>
              {autoLimit > 0 && !limiteNum && (
                <button
                  type="button"
                  className="text-[10px] text-primary hover:underline"
                  onClick={() => setLimiteSugerido(autoLimit.toString())}
                >
                  <Zap className="h-2.5 w-2.5 inline mr-0.5" />
                  Sugerir {formatBRL(autoLimit)}
                </button>
              )}
            </div>

            <div className="h-10 w-px bg-border shrink-0" />

            {/* Utilization */}
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Utilização</p>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", limitUtil > 100 ? "bg-red-500" : limitUtil > 80 ? "bg-amber-500" : "bg-primary")}
                    style={{ width: `${Math.min(limitUtil, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums">{limitUtil.toFixed(0)}%</span>
              </div>
            </div>

            <div className="h-10 w-px bg-border shrink-0" />

            {/* Concentration */}
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Concentração</p>
              <p className={cn("text-sm font-semibold tabular-nums", concentration.alerts.length > 0 ? "text-amber-600" : "text-foreground")}>
                Max: {concentration.maxSingleConcentration.toFixed(1)}%
              </p>
              {concentration.alerts.length > 0 && (
                <p className="text-[10px] text-amber-600">⚠ {concentration.alerts[0]}</p>
              )}
            </div>

            <div className="h-10 w-px bg-border shrink-0" />

            {/* Socios */}
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Societária</p>
              <p className={cn("text-sm font-semibold tabular-nums", !sociosTotal.isValid && socios.length > 0 ? "text-red-600" : "text-foreground")}>
                {socios.length} sócios • {sociosTotal.totalParticipacao.toFixed(1)}%
              </p>
            </div>

            <div className="h-10 w-px bg-border shrink-0" />

            {/* Attachments count */}
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Anexos</p>
              <p className="text-sm font-semibold tabular-nums flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {Object.values(sectionAttachments).flat().length} arquivos
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-6 pt-2 border-b border-border bg-card">
            <TabsList className="h-9 bg-transparent gap-1 p-0">
              <TabsTrigger value="dossie" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none px-4 gap-1.5">
                <FileCheck className="h-3.5 w-3.5" /> Dossiê
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none px-4 gap-1.5">
                <Brain className="h-3.5 w-3.5" /> Insights IA
              </TabsTrigger>
              <TabsTrigger value="concentracao" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none px-4 gap-1.5">
                <Target className="h-3.5 w-3.5" /> Concentração
              </TabsTrigger>
              <TabsTrigger value="parecer" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md rounded-b-none px-4 gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Parecer & Decisão
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: Dossiê */}
          <TabsContent value="dossie" className="flex-1 overflow-y-auto mt-0 p-0">
            <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-6 space-y-8">

              {/* 1. Identificação */}
              <SectionWrapper title="Identificação do Cliente" icon={Building2} section="identificacao"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.identificacao || []}
                onAttachmentsChange={updateSectionAttachments("identificacao")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
                <FieldGroup cols={2}>
                  <Field label="Cedente *">
                    <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o cedente" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
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
              </SectionWrapper>

              {/* 2. Operacional */}
              <SectionWrapper title="Informações Operacionais" icon={BarChart3} section="operacional"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.operacional || []}
                onAttachmentsChange={updateSectionAttachments("operacional")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
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

                {/* Sacados table */}
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
              </SectionWrapper>

              {/* 3. Societária */}
              <SectionWrapper title="Estrutura Societária" icon={Users} section="societaria"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.societaria || []}
                onAttachmentsChange={updateSectionAttachments("societaria")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quadro Societário
                    {socios.length > 0 && (
                      <span className={cn("ml-2", sociosTotal.isValid ? "text-primary" : "text-red-600")}>
                        ({sociosTotal.totalParticipacao.toFixed(1)}% total)
                      </span>
                    )}
                  </span>
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
                <div className="pt-3">
                  <Field label="Histórico Empresarial dos Sócios">
                    <Textarea value={historicoSocios} onChange={(e) => setHistoricoSocios(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Descrição do histórico empresarial..." />
                  </Field>
                </div>
              </SectionWrapper>

              {/* 4. Crédito */}
              <SectionWrapper title="Consulta de Crédito" icon={ShieldCheck} section="credito"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.credito || []}
                onAttachmentsChange={updateSectionAttachments("credito")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
                <FieldGroup cols={3}>
                  <Field label="Score de Crédito">
                    <div className="flex items-center gap-2">
                      <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
                      {scoreNum && <span className={cn("text-xs font-bold", riskClass.color)}>{grade}</span>}
                    </div>
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
              </SectionWrapper>

              {/* 5. Financeira */}
              <SectionWrapper title="Análise Financeira" icon={TrendingUp} section="financeira"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.financeira || []}
                onAttachmentsChange={updateSectionAttachments("financeira")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
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
              </SectionWrapper>

              {/* 6. Riscos */}
              <SectionWrapper title="Riscos e Pontos Positivos" icon={AlertTriangle} section="riscos"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.riscos || []}
                onAttachmentsChange={updateSectionAttachments("riscos")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Riscos Identificados">
                    <Textarea value={riscos} onChange={(e) => setRiscos(e.target.value)} disabled={isReadOnly} rows={4} className="text-sm resize-none" />
                  </Field>
                  <Field label="Pontos Positivos">
                    <Textarea value={pontosPositivos} onChange={(e) => setPontosPositivos(e.target.value)} disabled={isReadOnly} rows={4} className="text-sm resize-none" />
                  </Field>
                </div>
              </SectionWrapper>

              {/* 7. Operação */}
              <SectionWrapper title="Operação Proposta" icon={Settings2} section="operacao"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.operacao || []}
                onAttachmentsChange={updateSectionAttachments("operacao")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
              >
                <FieldGroup cols={3}>
                  <Field label="Limite Sugerido (R$)">
                    <div className="space-y-1">
                      <Input type="number" step="0.01" value={limiteSugerido} onChange={(e) => setLimiteSugerido(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums font-semibold" placeholder="0,00" />
                      {autoLimit > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
                          IA sugere: {formatBRL(autoLimit)} (baseado no faturamento e score)
                        </p>
                      )}
                    </div>
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
              </SectionWrapper>

              <div className="h-8" />
            </form>
          </TabsContent>

          {/* TAB: Insights IA */}
          <TabsContent value="insights" className="flex-1 overflow-y-auto mt-0 p-0">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-base font-semibold">Insights Inteligentes</h2>
                  <p className="text-xs text-muted-foreground">IA analisa os dados e gera insights profundos sobre o cedente</p>
                </div>
              </div>

              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="client" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("client")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="market" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("market")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="financial" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("financial")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="risk" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("risk")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="summary" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("summary")} />
            </div>
          </TabsContent>

          {/* TAB: Concentração */}
          <TabsContent value="concentracao" className="flex-1 overflow-y-auto mt-0 p-0">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-base font-semibold">Análise de Concentração</h2>
                  <p className="text-xs text-muted-foreground">Visualização da concentração de sacados e alertas automáticos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Sacados Cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums">{sacados.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Concentração Máxima</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={cn("text-3xl font-bold tabular-nums", concentration.maxSingleConcentration > 30 ? "text-red-600" : "text-foreground")}>
                      {concentration.maxSingleConcentration.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Concentração</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tabular-nums">{concentration.totalConcentration.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              {concentration.alerts.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">⚠ Alertas de Concentração</p>
                  <ul className="space-y-1">
                    {concentration.alerts.map((a, i) => (
                      <li key={i} className="text-xs text-amber-600 dark:text-amber-300">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuição por Sacado</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConcentrationChart
                    sacados={sacados}
                    maxConcentration={concentracaoMaxima ? parseFloat(concentracaoMaxima) : 30}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: Parecer & Decisão */}
          <TabsContent value="parecer" className="flex-1 overflow-y-auto mt-0 p-0">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-base font-semibold">Parecer & Decisão Final</h2>
                  <p className="text-xs text-muted-foreground">Recomendação do analista com base no dossiê completo</p>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Classificação de Risco</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <ScoreGauge score={scoreNum} size="md" />
                    <div>
                      <RiskIndicator score={scoreNum} />
                      <p className="text-xs text-muted-foreground mt-2">
                        Grade: <span className="font-bold">{grade}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Operação Proposta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limite:</span>
                      <span className="font-bold tabular-nums">{limiteNum ? formatBRL(limiteNum) : "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prazo:</span>
                      <span className="font-bold tabular-nums">{prazoMedioPermitido || "—"} dias</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conc. Máx:</span>
                      <span className="font-bold tabular-nums">{concentracaoMaxima || "—"}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilização:</span>
                      <span className={cn("font-bold tabular-nums", limitUtil > 100 ? "text-red-600" : "text-foreground")}>{limitUtil.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Executive Summary */}
              <AIInsightsPanel
                analysisId={isEditing ? id! : null}
                insightType="summary"
                analysisData={analysisDataForAI}
                clientData={clientDataForAI}
                existingInsight={getInsight("summary")}
                className="mb-4"
              />

              {/* Parecer text */}
              <Field label="Parecer do Analista">
                <Textarea value={parecerAnalista} onChange={(e) => setParecerAnalista(e.target.value)} disabled={isReadOnly} rows={6} className="text-sm resize-none" placeholder="Escreva seu parecer aqui ou gere automaticamente com a IA acima..." />
              </Field>

              {/* Recommendation */}
              <div className="pt-2">
                <Field label="Recomendação Final">
                  <div className="flex gap-3 pt-2">
                    {[
                      { value: "approve", label: "Aprovar", icon: "✅", color: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
                      { value: "restrict", label: "Aprovar c/ Restrição", icon: "⚠️", color: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
                      { value: "reject", label: "Reprovar", icon: "❌", color: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setRecommendation(opt.value)}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                          recommendation === opt.value
                            ? opt.color
                            : "border-border text-muted-foreground hover:border-muted-foreground/50 bg-card"
                        )}
                      >
                        <span className="text-lg block mb-1">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
