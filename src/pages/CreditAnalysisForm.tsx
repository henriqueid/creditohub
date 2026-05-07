import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useCommitteeRequirements, evaluateReadiness, DEFAULT_REQUIRED_FIELDS } from "@/hooks/useCommitteeRequirements";
import { formatBRL } from "@/lib/formatters";
import { differenceInYears, parseISO, isValid } from "date-fns";
import {
  ArrowLeft, Plus, Trash2, Send, Printer, Save, Building2, BarChart3,
  Users, ShieldCheck, TrendingUp, AlertTriangle, Settings2, FileCheck,
  Sparkles, Brain, Target, Gauge, FileText, Zap, ChevronDown, Check, Eye, EyeOff,
  Landmark, Handshake, MapPin, DollarSign, Scale, Activity, ChevronsDownUp, ChevronsUpDown, Receipt
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchPrintData, generatePrintHtml, openPrintWindow } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";
import { ScoreGauge } from "@/components/ScoreGauge";
import { RiskIndicator } from "@/components/RiskIndicator";
import { ConcentrationChart } from "@/components/credit/ConcentrationChart";
import { SectionFileUpload } from "@/components/credit/SectionFileUpload";
import { AIInsightsPanel } from "@/components/credit/AIInsightsPanel";
import { AnalysisDealsLink } from "@/components/credit/AnalysisDealsLink";
import { FinancialIndicatorsPanel } from "@/components/credit/FinancialIndicatorsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  classifyRisk, suggestLimit, calculateConcentration,
  calculateSociosTotal, calculateLimitUtilization, getScoreGrade,
  suggestRate, calculateOverallRiskScore, calculateRiskRadar,
  calculateFinancialRatios
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/60 font-medium">{label}</label>
      {children}
      {hint && <p className="font-mono text-[10px] text-sink-deep/40">{hint}</p>}
    </div>
  );
}

function FieldGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const gridCols = cols === 4
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    : cols === 3
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2";
  return <div className={`grid ${gridCols} gap-4`}>{children}</div>;
}

function SectionWrapper({ title, icon: Icon, children, section, analysisId, attachments, onAttachmentsChange, onDataExtracted, analysisContext, disabled, defaultOpen = true, summary, compactMode, bulkToggle }: {
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
  defaultOpen?: boolean;
  summary?: string[];
  compactMode?: boolean;
  bulkToggle?: { open: boolean; version: number };
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const attachCount = attachments.length;
  const showContent = compactMode ? false : isOpen;

  // Reage ao trigger global de "Contrair tudo / Expandir tudo"
  useEffect(() => {
    if (bulkToggle && bulkToggle.version > 0) {
      setIsOpen(bulkToggle.open);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkToggle?.version]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className="bg-sink-paper rounded-sink-lg overflow-hidden transition-all duration-300 hover:shadow-md"
        style={{
          borderLeft: "4px solid #00D49A",
          border: "1px solid rgba(10,21,56,0.10)",
          borderLeftWidth: 4,
          borderLeftColor: "#00D49A",
          boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
          style={{
            background: "linear-gradient(180deg, rgba(10,21,56,0.05) 0%, rgba(10,21,56,0.025) 100%)",
            borderBottom: "1px solid rgba(10,21,56,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-sink-md flex items-center justify-center" style={{ background: "rgba(0,212,154,0.15)", border: "1px solid rgba(0,212,154,0.25)" }}>
              <Icon className="h-4 w-4 text-sink-mint" />
            </div>
            <h2 className="font-sans text-[14px] font-semibold text-sink-deep tracking-tight">{title}</h2>
            {attachCount > 0 && (
              <span className="font-mono text-[10px] font-semibold bg-sink-mint/10 text-sink-deep px-1.5 py-0.5 rounded-sink-pill border border-sink-mint/20">
                {attachCount} {attachCount === 1 ? 'anexo' : 'anexos'}
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: showContent ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-sink-deep/40" />
          </motion.div>
        </button>

        {/* Compact summary */}
        <AnimatePresence initial={false}>
          {compactMode && !isOpen && summary && summary.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 py-2.5 bg-sink-cream/30 border-t border-sink-fog/40">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {summary.map((item, i) => (
                    <span key={i} className="font-mono text-[11px] text-sink-deep/50">
                      <span className="text-sink-deep font-semibold">{item.split(": ")[0]}:</span>{" "}
                      {item.split(": ").slice(1).join(": ") || "—"}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {compactMode && !isOpen && (!summary || summary.length === 0) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 py-2 bg-sink-cream/30 border-t border-sink-fog/40">
                <span className="font-mono text-[11px] text-sink-deep/40 italic">Nenhum dado preenchido</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {(compactMode ? isOpen : showContent) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 py-4 space-y-4">
                {children}

                <div className="pt-2 border-t border-sink-fog/40">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function CreditAnalysisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isEditing = !!id && id !== "nova";

  const [activeTab, setActiveTab] = useState("dossie");
  const [compactMode, setCompactMode] = useState(false);
  const [bulkToggle, setBulkToggle] = useState<{ open: boolean; version: number }>({ open: true, version: 0 });
  const { data: committeeRequiredFields } = useCommitteeRequirements();

  // Novo cedente rápido
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientRazao, setNewClientRazao] = useState("");
  const [newClientCnpj, setNewClientCnpj] = useState("");
  const [newClientCreateDeal, setNewClientCreateDeal] = useState(false);

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
  // New enriched fields
  const [referenciasBancarias, setReferenciasBancarias] = useState("");
  const [referenciasComerciais, setReferenciasComerciais] = useState("");
  const [tipoImovelSede, setTipoImovelSede] = useState("");
  const [numeroFuncionarios, setNumeroFuncionarios] = useState("");
  const [capitalSocial, setCapitalSocial] = useState("");
  const [receitaLiquida, setReceitaLiquida] = useState("");
  const [margemLiquida, setMargemLiquida] = useState("");
  const [indiceLiquidez, setIndiceLiquidez] = useState("");
  const [historicoPagamentos, setHistoricoPagamentos] = useState("");
  const [restricoesCnpj, setRestricoesCnpj] = useState("");
  const [tempoAtividade, setTempoAtividade] = useState("");
  const [tempoAtividadeManual, setTempoAtividadeManual] = useState(false);
  const [faturamentoDetalhado, setFaturamentoDetalhado] = useState("");
  const [condicoesEspeciais, setCondicoesEspeciais] = useState("");
  const [modalidadesOperacao, setModalidadesOperacao] = useState<string[]>([]);
  const [taxaSugerida, setTaxaSugerida] = useState("");
  const [fonteInformacao, setFonteInformacao] = useState("");
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

  const ratios = useMemo(() => calculateFinancialRatios({
    receitaLiquida: receitaLiquida ? parseFloat(receitaLiquida) : null,
    faturamentoMedio: fatNum,
    capitalSocial: capitalSocial ? parseFloat(capitalSocial) : null,
    limiteSugerido: limiteNum,
    volumeEstimado: volNum,
    numeroFuncionarios: numeroFuncionarios ? parseInt(numeroFuncionarios) : null,
    margemLiquida: margemLiquida || null,
    indiceLiquidez: indiceLiquidez || null,
  }), [receitaLiquida, fatNum, capitalSocial, limiteNum, volNum, numeroFuncionarios, margemLiquida, indiceLiquidez]);

  const radarDimensions = useMemo(() => calculateRiskRadar({
    creditScore: scoreNum, faturamentoMedio: fatNum, limiteSugerido: limiteNum, volumeEstimado: volNum,
    sacadosCount: sacados.length, sociosCount: socios.length,
    protestos, pendencias, acoesJudiciais, chequesSemFundo,
    historicoPagamentos, tempoAtividade,
    hhi: concentration.hhi, coberturaDivida: ratios.coberturaDivida, margemLiquidaNum: ratios.margemLiquidaNum,
  }), [scoreNum, fatNum, limiteNum, volNum, sacados.length, socios.length, protestos, pendencias, acoesJudiciais, chequesSemFundo, historicoPagamentos, tempoAtividade, concentration.hhi, ratios.coberturaDivida, ratios.margemLiquidaNum]);

  const overallRiskScore = useMemo(() => calculateOverallRiskScore(radarDimensions), [radarDimensions]);
  const autoRate = useMemo(() => suggestRate(scoreNum, prazoMedioTitulos ? parseInt(prazoMedioTitulos) : null), [scoreNum, prazoMedioTitulos]);

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
      // New fields
      setReferenciasBancarias((analysis as any).referencias_bancarias || "");
      setReferenciasComerciais((analysis as any).referencias_comerciais || "");
      setTipoImovelSede((analysis as any).tipo_imovel_sede || "");
      setNumeroFuncionarios((analysis as any).numero_funcionarios?.toString() || "");
      setCapitalSocial((analysis as any).capital_social?.toString() || "");
      setReceitaLiquida((analysis as any).receita_liquida?.toString() || "");
      setMargemLiquida((analysis as any).margem_liquida || "");
      setIndiceLiquidez((analysis as any).indice_liquidez || "");
      setHistoricoPagamentos((analysis as any).historico_pagamentos || "");
      setRestricoesCnpj((analysis as any).restricoes_cnpj || "");
      setTempoAtividade((analysis as any).tempo_atividade || "");
      setFaturamentoDetalhado((analysis as any).faturamento_detalhado || "");
      setCondicoesEspeciais((analysis as any).condicoes_especiais || "");
      // modalidade_operacao pode ser string (legado) ou comma-separated
      const rawMod = (analysis as any).modalidade_operacao || "";
      setModalidadesOperacao(rawMod ? rawMod.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setTaxaSugerida((analysis as any).taxa_sugerida?.toString() || "");
      setFonteInformacao((analysis as any).fonte_informacao || "");
    }
  }, [analysis]);

  // Pre-select cedente from URL param (e.g. /analises/nova?client_id=X)
  // Bloqueia análise vazia: se rota /analises/nova for acessada sem client_id,
  // redireciona pra Cedentes (precisa selecionar quem analisar antes).
  useEffect(() => {
    if (!isEditing) {
      const cid = searchParams.get("client_id");
      if (cid) {
        setClientId(cid);
      } else {
        toast({
          title: "Análise precisa de um cedente",
          description: "Escolha um cedente ou cadastre um novo antes de iniciar a análise.",
          variant: "destructive",
        });
        navigate("/cedentes", { replace: true });
      }
    }
  }, [isEditing, searchParams, navigate]);

  // Se o cedente escolhido já tem análise em andamento (draft / em comitê),
  // redireciona pra ela em vez de criar duplicada.
  // Senão, pré-preenche limite e volume do deal vinculado mais recente (se houver).
  useEffect(() => {
    if (isEditing || !clientId) return;
    let cancelled = false;
    (async () => {
      const [analysisRes, dealRes] = await Promise.all([
        supabase
          .from("credit_analysis")
          .select("id, status")
          .eq("client_id", clientId)
          .in("status", ["draft", "in_committee"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("deals")
          .select("value, monthly_volume")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (analysisRes.data?.id) {
        toast({ title: "Análise existente aberta", description: "Este cedente já tinha análise em andamento." });
        navigate(`/analises/${analysisRes.data.id}`, { replace: true });
        return;
      }
      // Pré-preenche limite/volume do deal mais recente — só se ainda não preencheu manual
      const deal = dealRes.data as { value?: number | null; monthly_volume?: number | null } | null;
      if (deal) {
        if (deal.value && !limiteSugerido) setLimiteSugerido(String(deal.value));
        if (deal.monthly_volume && !volumeEstimado) setVolumeEstimado(String(deal.monthly_volume));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, isEditing, navigate]);

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
        referencias_bancarias: referenciasBancarias || null,
        referencias_comerciais: referenciasComerciais || null,
        tipo_imovel_sede: tipoImovelSede || null,
        numero_funcionarios: numeroFuncionarios ? parseInt(numeroFuncionarios) : null,
        capital_social: capitalSocial ? parseFloat(capitalSocial) : null,
        receita_liquida: receitaLiquida ? parseFloat(receitaLiquida) : null,
        margem_liquida: margemLiquida || null,
        indice_liquidez: indiceLiquidez || null,
        historico_pagamentos: historicoPagamentos || null,
        restricoes_cnpj: restricoesCnpj || null,
        tempo_atividade: tempoAtividade || null,
        faturamento_detalhado: faturamentoDetalhado || null,
        condicoes_especiais: condicoesEspeciais || null,
        modalidade_operacao: modalidadesOperacao.length > 0 ? modalidadesOperacao.join(",") : null,
        taxa_sugerida: taxaSugerida ? parseFloat(taxaSugerida) : null,
        fonte_informacao: fonteInformacao || null,
      } as any;

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

  const createClientMutation = useMutation({
    mutationFn: async () => {
      if (!newClientRazao.trim()) throw new Error("Informe a razão social");
      const { data, error } = await supabase
        .from("clients")
        .insert({ razao_social: newClientRazao.trim(), cnpj_cpf: newClientCnpj.trim() || null })
        .select("id")
        .single();
      if (error) throw error;

      if (newClientCreateDeal) {
        const { data: stages } = await supabase
          .from("deal_stages")
          .select("id")
          .eq("is_active", true)
          .order("order", { ascending: true })
          .limit(1);
        if (stages && stages[0]) {
          await supabase.from("deals").insert({
            client_id: data.id,
            stage_id: stages[0].id,
            title: newClientRazao.trim(),
          });
        }
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients-select"] });
      setClientId(data.id);
      setNewClientOpen(false);
      setNewClientRazao("");
      setNewClientCnpj("");
      setNewClientCreateDeal(false);
      toast({ title: newClientCreateDeal ? "Cedente cadastrado e deal criado no Pipeline" : "Cedente cadastrado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar cedente", description: err.message, variant: "destructive" });
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

  // Tempo de atividade derivado de clients.data_fundacao (somente se não foi editado manualmente)
  const dataFundacao = (selectedClient as any)?.data_fundacao as string | null | undefined;
  const tempoAtividadeAuto = useMemo(() => {
    if (!dataFundacao) return null;
    const d = parseISO(dataFundacao);
    if (!isValid(d)) return null;
    const anos = differenceInYears(new Date(), d);
    return { anos, label: `${anos} ano${anos === 1 ? "" : "s"} · desde ${d.getFullYear()}` };
  }, [dataFundacao]);
  const tempoAtividadeDisplay = tempoAtividadeManual || !tempoAtividadeAuto ? tempoAtividade : tempoAtividadeAuto.label;

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

  // Section completion tracking
  const sectionProgress = useMemo(() => {
    const sections = [
      {
        key: "identificacao", label: "Identificação", icon: Building2,
        fields: [clientId, dataAnalise, responsavelComercial, analistaCredito, tempoAtividadeDisplay, numeroFuncionarios],
        required: [clientId],
      },
      {
        key: "operacional", label: "Operacional", icon: BarChart3,
        fields: [faturamentoMedio, volumeEstimado, prazoMedioTitulos, faturamentoDetalhado, tipoImovelSede],
        required: [faturamentoMedio],
      },
      {
        key: "societaria", label: "Societária", icon: Users,
        fields: [historicoSocios, ...(socios.length > 0 ? ["has_socios"] : [])],
        required: [],
      },
      {
        key: "credito", label: "Crédito", icon: ShieldCheck,
        fields: [creditScore, protestos, pendencias, chequesSemFundo, acoesJudiciais, observacoesCredito, restricoesCnpj, historicoPagamentos],
        required: [creditScore],
      },
      {
        key: "referencias", label: "Referências", icon: Handshake,
        fields: [referenciasBancarias, referenciasComerciais, fonteInformacao],
        required: [],
      },
      {
        key: "financeira", label: "Financeira", icon: TrendingUp,
        fields: [analiseFaturamento, estruturaFinanceira, endividamento, dependenciaClientes, margemLiquida, indiceLiquidez, capitalSocial, receitaLiquida],
        required: [],
      },
      {
        key: "riscos", label: "Riscos", icon: AlertTriangle,
        fields: [riscos, pontosPositivos],
        required: [],
      },
      {
        key: "operacao", label: "Operação", icon: Settings2,
        fields: [limiteSugerido, prazoMedioPermitido, concentracaoMaxima, garantias, modalidadesOperacao.join(","), taxaSugerida, condicoesEspeciais],
        required: [limiteSugerido],
      },
    ];

    return sections.map(s => {
      const filled = s.fields.filter(f => f && String(f).trim() !== "").length;
      const total = s.fields.length;
      const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
      const requiredOk = s.required.every(f => f && String(f).trim() !== "");
      return { ...s, filled, total, pct, requiredOk };
    });
  }, [clientId, dataAnalise, responsavelComercial, analistaCredito, tempoAtividadeDisplay, tipoImovelSede, numeroFuncionarios, faturamentoMedio, volumeEstimado, prazoMedioTitulos, faturamentoDetalhado, receitaLiquida, capitalSocial, historicoSocios, socios.length, creditScore, protestos, pendencias, chequesSemFundo, acoesJudiciais, observacoesCredito, restricoesCnpj, historicoPagamentos, referenciasBancarias, referenciasComerciais, fonteInformacao, analiseFaturamento, estruturaFinanceira, endividamento, dependenciaClientes, margemLiquida, indiceLiquidez, riscos, pontosPositivos, limiteSugerido, prazoMedioPermitido, concentracaoMaxima, garantias, modalidadesOperacao, taxaSugerida, condicoesEspeciais]);

  const overallProgress = useMemo(() => {
    const totalFilled = sectionProgress.reduce((a, s) => a + s.filled, 0);
    const totalFields = sectionProgress.reduce((a, s) => a + s.total, 0);
    return totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;
  }, [sectionProgress]);

  const committeeReadiness = useMemo(() => {
    const requiredKeys = committeeRequiredFields ?? DEFAULT_REQUIRED_FIELDS;

    // Snapshot do form state em formato compatível com evaluateReadiness
    const snapshot: Record<string, any> = {
      client_id: clientId,
      responsavel_comercial: responsavelComercial,
      analista_credito: analistaCredito,
      tempo_atividade: tempoAtividadeDisplay,
      faturamento_medio: faturamentoMedio,
      volume_estimado: volumeEstimado,
      prazo_medio_titulos: prazoMedioTitulos,
      numero_funcionarios: numeroFuncionarios,
      capital_social: capitalSocial,
      historico_socios: historicoSocios,
      credit_score: creditScore,
      protestos: protestos,
      pendencias: pendencias,
      acoes_judiciais: acoesJudiciais,
      referencias_bancarias: referenciasBancarias,
      referencias_comerciais: referenciasComerciais,
      analise_faturamento: analiseFaturamento,
      estrutura_financeira: estruturaFinanceira,
      endividamento: endividamento,
      riscos: riscos,
      pontos_positivos: pontosPositivos,
      limite_sugerido: limiteSugerido,
      modalidade_operacao: modalidadesOperacao.length > 0 ? modalidadesOperacao.join(",") : "",
      taxa_sugerida: taxaSugerida,
      garantias: garantias,
      parecer_analista: parecerAnalista,
      recommendation: recommendation,
    };
    return evaluateReadiness(requiredKeys, snapshot, {
      sacadosCount: sacados.length,
      sociosCount: socios.length,
    });
  }, [
    committeeRequiredFields, clientId, responsavelComercial, analistaCredito, tempoAtividadeDisplay,
    faturamentoMedio, volumeEstimado, prazoMedioTitulos, numeroFuncionarios, capitalSocial,
    historicoSocios, creditScore, protestos, pendencias, acoesJudiciais,
    referenciasBancarias, referenciasComerciais, analiseFaturamento, estruturaFinanceira,
    endividamento, riscos, pontosPositivos, limiteSugerido, modalidadesOperacao,
    taxaSugerida, garantias, parecerAnalista, recommendation, sacados.length, socios.length,
  ]);

  const sectionSummaries = useMemo(() => {
    const f = (v: string, label: string) => v.trim() ? `${label}: ${v.trim().substring(0, 60)}${v.trim().length > 60 ? "…" : ""}` : null;
    const recLiqNum = receitaLiquida ? parseFloat(receitaLiquida) : null;
    const capSocNum = capitalSocial ? parseFloat(capitalSocial) : null;
    return {
      identificacao: [
        selectedClient ? `Cedente: ${selectedClient.razao_social}` : null,
        f(dataAnalise, "Data"),
        f(responsavelComercial, "Comercial"),
        f(analistaCredito, "Analista"),
        f(tempoAtividadeDisplay, "Tempo Ativ."),
        numeroFuncionarios ? `Funcionários: ${numeroFuncionarios}` : null,
      ].filter(Boolean) as string[],
      operacional: [
        fatNum ? `Faturamento: ${formatBRL(fatNum)}` : null,
        volNum ? `Volume: ${formatBRL(volNum)}` : null,
        prazoMedioTitulos ? `Prazo: ${prazoMedioTitulos} dias` : null,
        f(tipoImovelSede, "Imóvel sede"),
      ].filter(Boolean) as string[],
      sacados: [
        sacados.length > 0
          ? `${sacados.length} sacado${sacados.length > 1 ? "s" : ""}`
          : null,
        concentration.totalConcentration > 0
          ? `Total: ${concentration.totalConcentration.toFixed(0)}%`
          : null,
        concentration.maxSingleConcentration > 0
          ? `Maior: ${concentration.maxSingleConcentration.toFixed(0)}%`
          : null,
        concentration.hhi > 0 ? `HHI: ${concentration.hhi.toFixed(0)}` : null,
      ].filter(Boolean) as string[],
      societaria: [
        socios.length > 0 ? `${socios.length} sócio(s) • ${sociosTotal.totalParticipacao.toFixed(1)}%` : null,
        f(historicoSocios, "Histórico"),
      ].filter(Boolean) as string[],
      credito: [
        scoreNum ? `Score: ${scoreNum} (${grade})` : null,
        f(protestos, "Protestos"),
        f(pendencias, "Pendências"),
        f(chequesSemFundo, "Cheques s/ fundo"),
        f(acoesJudiciais, "Ações judiciais"),
        f(restricoesCnpj, "Restrições CNPJ"),
        f(historicoPagamentos, "Hist. Pagamentos"),
      ].filter(Boolean) as string[],
      referencias: [
        f(referenciasBancarias, "Bancárias"),
        f(referenciasComerciais, "Comerciais"),
        f(fonteInformacao, "Fonte"),
      ].filter(Boolean) as string[],
      financeira: [
        capSocNum ? `Capital Social: ${formatBRL(capSocNum)}` : null,
        recLiqNum ? `Receita Líq.: ${formatBRL(recLiqNum)}` : null,
        f(analiseFaturamento, "Faturamento"),
        f(estruturaFinanceira, "Estrutura"),
        f(endividamento, "Endividamento"),
        f(dependenciaClientes, "Dependência"),
        f(margemLiquida, "Margem"),
        f(indiceLiquidez, "Liquidez"),
      ].filter(Boolean) as string[],
      riscos: [
        f(riscos, "Riscos"),
        f(pontosPositivos, "Positivos"),
      ].filter(Boolean) as string[],
      operacao: [
        limiteNum ? `Limite: ${formatBRL(limiteNum)}` : null,
        modalidadesOperacao.length > 0 ? `Modalidade: ${modalidadesOperacao.join(", ")}` : null,
        taxaSugerida ? `Taxa: ${taxaSugerida}%` : null,
        prazoMedioPermitido ? `Prazo: ${prazoMedioPermitido} dias` : null,
        concentracaoMaxima ? `Conc. máx: ${concentracaoMaxima}%` : null,
        f(garantias, "Garantias"),
        f(condicoesEspeciais, "Condições"),
      ].filter(Boolean) as string[],
    };
  }, [selectedClient, dataAnalise, responsavelComercial, analistaCredito, tempoAtividadeDisplay, tipoImovelSede, numeroFuncionarios, fatNum, volNum, receitaLiquida, capitalSocial, prazoMedioTitulos, sacados.length, socios.length, sociosTotal, historicoSocios, scoreNum, grade, protestos, pendencias, chequesSemFundo, acoesJudiciais, restricoesCnpj, historicoPagamentos, referenciasBancarias, referenciasComerciais, fonteInformacao, analiseFaturamento, estruturaFinanceira, endividamento, dependenciaClientes, margemLiquida, indiceLiquidez, riscos, pontosPositivos, limiteNum, modalidadesOperacao, taxaSugerida, prazoMedioPermitido, concentracaoMaxima, garantias, condicoesEspeciais]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden" style={{ background: "#EDEEE7" }}>
      {/* Aviso mobile: edição apenas em telas maiores */}
      <div
        className="sm:hidden fixed inset-0 z-[150] flex items-center justify-center p-6"
        style={{ background: "rgba(10,21,56,0.92)" }}
      >
        <div
          className="rounded-[16px] px-6 py-7 max-w-sm text-center"
          style={{ background: "#FBFBF7", boxShadow: "0 12px 40px -8px rgba(0,0,0,0.4)" }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: "rgba(0,212,154,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <FileText style={{ width: 26, height: 26, color: "#00D49A" }} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#0A1538", marginBottom: 8 }}>
            Dossiê em modo leitura
          </h2>
          <p style={{ fontSize: 13, color: "rgba(10,21,56,0.65)", lineHeight: 1.5, marginBottom: 16 }}>
            Edição disponível apenas em telas maiores. Abra no desktop ou tablet horizontal para preencher e enviar ao comitê.
          </p>
          <button
            onClick={() => navigate("/analises")}
            className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#0A1538", color: "#FAFAF7" }}
          >
            Voltar para Análises
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-b border-sink-fog bg-sink-paper shadow-sink-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-sink-md text-sink-deep/60 hover:text-sink-deep hover:bg-sink-cream"
              onClick={() => navigate("/analises")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-sans font-bold text-base text-sink-deep truncate">
                {isEditing ? (selectedClient?.razao_social || "Dossiê de Crédito") : "Novo Dossiê de Crédito"}
              </h1>
              {isEditing && <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Dossiê inteligente de análise de crédito</p>}
            </div>
            {isEditing && <StatusBadge status={status} />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-sink-fog bg-transparent text-sink-deep/70 hover:bg-sink-cream rounded-sink-md"
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
                <Button
                  size="sm"
                  className="text-xs bg-sink-mint text-sink-deep hover:bg-sink-mint-2 rounded-sink-md font-semibold"
                  onClick={() => handleSubmit()}
                  disabled={saveMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                {isEditing && (
                  <Button
                    size="sm"
                    title={committeeReadiness.pct < 100 ? `Faltando: ${committeeReadiness.checks.filter(c => !c.ok).map(c => c.label).join(", ")}` : "Enviar ao Comitê"}
                    className="text-xs rounded-sink-md font-semibold"
                    style={committeeReadiness.pct === 100 ? { background: "#00D49A", color: "#0A1538" } : { background: "rgba(10,21,56,0.1)", color: "rgba(10,21,56,0.5)" }}
                    onClick={() => sendToCommittee.mutate()}
                    disabled={sendToCommittee.isPending || committeeReadiness.pct < 100}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {committeeReadiness.pct < 100 ? `${committeeReadiness.pct}% pronto` : "Enviar ao Comitê"}
                  </Button>
                )}
              </>
            )}
          </div>
        </header>

        {/* KPI Strip */}
        <motion.div
          className="shrink-0 px-6 py-2.5"
          style={{
            background: "linear-gradient(180deg, #FBFBF7 0%, #F0F1EB 100%)",
            borderBottom: "1px solid rgba(10,21,56,0.10)",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <div className="flex items-center gap-5 overflow-x-auto">
            <div className="flex items-center gap-2.5 shrink-0">
              <ScoreGauge score={scoreNum} size="sm" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Risco</p>
                <RiskIndicator score={scoreNum} compact />
              </div>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Limite Sugerido</p>
              <p className="font-mono text-base font-bold tabular-nums text-sink-deep">{limiteNum ? formatBRL(limiteNum) : "—"}</p>
              {autoLimit > 0 && !limiteNum && (
                <button type="button" className="font-mono text-[10px] text-sink-mint hover:underline" onClick={() => setLimiteSugerido(autoLimit.toString())}>
                  <Zap className="h-2.5 w-2.5 inline mr-0.5" />Sugerir {formatBRL(autoLimit)}
                </button>
              )}
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Utilização</p>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-sink-fog overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", limitUtil > 100 ? "bg-sink-danger" : limitUtil > 80 ? "bg-sink-warn" : "bg-sink-mint")}
                    style={{ width: `${Math.min(limitUtil, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold tabular-nums text-sink-deep">{limitUtil.toFixed(0)}%</span>
              </div>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Concentração</p>
              <p className={cn("font-mono text-xs font-semibold tabular-nums", concentration.alerts.length > 0 ? "text-sink-danger" : "text-sink-deep")}>
                Max: {concentration.maxSingleConcentration.toFixed(1)}%
              </p>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Societária</p>
              <p className={cn("font-mono text-xs font-semibold tabular-nums", !sociosTotal.isValid && socios.length > 0 ? "text-sink-danger" : "text-sink-deep")}>
                {socios.length} sócios • {sociosTotal.totalParticipacao.toFixed(1)}%
              </p>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Score Global</p>
              <p className={cn("font-mono text-xs font-bold tabular-nums",
                overallRiskScore >= 70 ? "text-sink-mint" : overallRiskScore >= 40 ? "text-sink-warn" : "text-sink-danger"
              )}>
                {overallRiskScore}/100
              </p>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Taxa IA</p>
              <p className="font-mono text-xs font-semibold tabular-nums text-sink-deep">{autoRate}% a.m.</p>
            </div>

            <div className="h-8 w-px bg-sink-fog shrink-0" />

            <div className="shrink-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Anexos</p>
              <p className="font-mono text-xs font-semibold tabular-nums flex items-center gap-1 text-sink-deep">
                <FileText className="h-3 w-3 text-sink-mint" />
                {Object.values(sectionAttachments).flat().length}
              </p>
            </div>

            {isEditing && id && selectedClient && (
              <>
                <div className="h-8 w-px bg-sink-fog shrink-0" />
                <AnalysisDealsLink
                  analysisId={id}
                  clientId={selectedClient.id}
                  clientName={selectedClient.razao_social}
                  limiteSugerido={limiteNum || null}
                  responsavel={responsavelComercial || analistaCredito || null}
                />
              </>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div
            className="shrink-0 px-6 pt-2"
            style={{
              background: "#FBFBF7",
              borderBottom: "1px solid rgba(10,21,56,0.10)",
            }}
          >
            <TabsList className="h-9 bg-transparent gap-0 p-0">
              {[
                { value: "dossie", icon: FileCheck, label: "Dossiê" },
                { value: "insights", icon: Brain, label: "Insights IA" },
                { value: "concentracao", icon: Target, label: "Concentração" },
                { value: "indicadores", icon: Activity, label: "Indicadores" },
                { value: "parecer", icon: Gauge, label: "Parecer & Decisão" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    "font-mono text-[11px] px-4 rounded-none border-b-2 gap-1.5 transition-all h-9",
                    activeTab === value
                      ? "border-sink-mint text-sink-mint bg-transparent font-semibold"
                      : "border-transparent text-sink-deep/50 hover:text-sink-deep hover:border-sink-fog"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* TAB: Dossiê */}
          <TabsContent value="dossie" className="flex-1 overflow-y-auto mt-0 p-0">
            <motion.form
              key="dossie"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onSubmit={handleSubmit}
              className="w-full px-5 py-5 space-y-5"
            >

              {/* Progress Stepper */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-sink-paper rounded-sink-lg p-4"
                style={{
                  border: "1px solid rgba(10,21,56,0.10)",
                  boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 font-semibold">Progresso do Dossiê</p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 font-mono text-[10px] gap-1 px-2 rounded-sink-md border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream"
                      onClick={() => {
                        setCompactMode(false);
                        setBulkToggle(p => ({ open: false, version: p.version + 1 }));
                      }}
                      title="Contrai todas as seções"
                    >
                      <ChevronsDownUp className="h-3 w-3" />
                      Contrair tudo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 font-mono text-[10px] gap-1 px-2 rounded-sink-md border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream"
                      onClick={() => {
                        setCompactMode(false);
                        setBulkToggle(p => ({ open: true, version: p.version + 1 }));
                      }}
                      title="Expande todas as seções"
                    >
                      <ChevronsUpDown className="h-3 w-3" />
                      Expandir tudo
                    </Button>
                    <Button
                      type="button"
                      variant={compactMode ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-6 font-mono text-[10px] gap-1 px-2 rounded-sink-md",
                        compactMode
                          ? "bg-sink-mint text-sink-deep hover:bg-sink-mint-2 border-0"
                          : "border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream"
                      )}
                      onClick={() => setCompactMode(!compactMode)}
                      title="Modo compacto: mostra só resumos"
                    >
                      {compactMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      Resumo
                    </Button>
                    <span className={cn(
                      "font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded-sink-pill",
                      overallProgress === 100 ? "bg-sink-mint/10 text-sink-deep" : "bg-sink-fog/30 text-sink-deep/50"
                    )}>
                      {overallProgress}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-sink-pill bg-sink-fog overflow-hidden mb-4">
                  <motion.div
                    className="h-full rounded-sink-pill bg-sink-mint"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                  {sectionProgress.map((s, i) => {
                    const Icon = s.icon;
                    const isComplete = s.pct === 100;
                    const hasContent = s.pct > 0 && s.pct < 100;
                    return (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: 0.05 * i + 0.2 }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-sink-md text-center cursor-default transition-colors",
                          isComplete ? "bg-sink-mint/10" : hasContent ? "bg-sink-cream" : "bg-sink-fog/20"
                        )}
                      >
                        <div className={cn(
                          "h-7 w-7 rounded-sink-pill flex items-center justify-center transition-colors",
                          isComplete
                            ? "bg-sink-mint text-sink-deep"
                            : hasContent
                              ? "bg-sink-cream-2 text-sink-deep"
                              : "bg-sink-fog/40 text-sink-deep/40"
                        )}>
                          {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        </div>
                        <span className={cn(
                          "font-mono text-[10px] font-medium leading-tight",
                          isComplete ? "text-sink-deep" : hasContent ? "text-sink-deep" : "text-sink-deep/40"
                        )}>
                          {s.label}
                        </span>
                        <span className={cn(
                          "font-mono text-[9px] tabular-nums",
                          isComplete ? "text-sink-mint" : "text-sink-deep/40"
                        )}>
                          {s.filled}/{s.total}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Prontidão para Comitê */}
              {!isReadOnly && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="rounded-sink-lg border overflow-hidden shadow-sink-sm"
                  style={{
                    borderColor: committeeReadiness.pct === 100 ? "#00D49A" : committeeReadiness.pct >= 50 ? "#D9A300" : "rgba(10,21,56,0.10)",
                    background: committeeReadiness.pct === 100 ? "rgba(0,212,154,0.05)" : "var(--paper)",
                  }}
                >
                  <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid rgba(10,21,56,0.07)" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(10,21,56,0.5)", fontWeight: 600 }}>
                        Prontidão para Comitê
                      </span>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700,
                      color: committeeReadiness.pct === 100 ? "#00D49A" : committeeReadiness.pct >= 50 ? "#D9A300" : "#B0182A",
                    }}>
                      {committeeReadiness.pct}%
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <div style={{ height: 6, borderRadius: 99, background: "rgba(10,21,56,0.07)", overflow: "hidden", marginBottom: 10 }}>
                      <div style={{
                        height: "100%",
                        width: `${committeeReadiness.pct}%`,
                        borderRadius: 99,
                        background: committeeReadiness.pct === 100 ? "#00D49A" : committeeReadiness.pct >= 50 ? "#D9A300" : "#B0182A",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5">
                      {committeeReadiness.checks.map(c => (
                        <div key={c.label} className="flex items-center gap-1.5">
                          <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: c.ok ? "#00D49A" : "rgba(10,21,56,0.15)" }} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: c.ok ? "rgba(10,21,56,0.6)" : "rgba(10,21,56,0.4)" }}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 1. Identificação */}
              <SectionWrapper title="Identificação do Cliente" icon={Building2} section="identificacao"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.identificacao || []}
                onAttachmentsChange={updateSectionAttachments("identificacao")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.identificacao}
              >
                <FieldGroup cols={2}>
                  <Field label="Cedente *">
                    <div className="flex gap-2">
                      <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                        <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Selecione o cedente" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="font-medium">{c.razao_social}</span>
                              {c.cnpj_cpf && <span className="ml-2 text-xs opacity-50 font-mono">{c.cnpj_cpf}</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setNewClientOpen(true)}
                          title="Cadastrar novo cedente"
                          className="h-9 w-9 flex items-center justify-center rounded-sink-md border border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream hover:text-sink-deep transition-colors flex-shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Field>

                  {/* Dialog: cadastro rápido de cedente */}
                  <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Novo cedente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                          <Label className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/60">Razão Social *</Label>
                          <Input
                            value={newClientRazao}
                            onChange={e => setNewClientRazao(e.target.value)}
                            placeholder="Nome empresarial completo"
                            className="h-9"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/60">CNPJ / CPF</Label>
                          <Input
                            value={newClientCnpj}
                            onChange={e => setNewClientCnpj(e.target.value)}
                            placeholder="00.000.000/0001-00"
                            className="h-9 font-mono"
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={newClientCreateDeal}
                            onChange={e => setNewClientCreateDeal(e.target.checked)}
                            className="rounded border-sink-fog accent-sink-mint"
                          />
                          <span className="text-sm text-sink-deep/70">Criar oportunidade no Pipeline Comercial</span>
                        </label>
                      </div>
                      <DialogFooter>
                        <button
                          type="button"
                          onClick={() => setNewClientOpen(false)}
                          className="px-4 py-2 text-sm text-sink-deep/60 hover:text-sink-deep transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => createClientMutation.mutate()}
                          disabled={!newClientRazao.trim() || createClientMutation.isPending}
                          className="px-4 py-2 text-sm font-medium rounded-sink-md bg-sink-deep text-white hover:bg-sink-deep/90 transition-colors disabled:opacity-40"
                        >
                          {createClientMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                <FieldGroup cols={2}>
                  <Field label="Tempo de Atividade" hint={tempoAtividadeAuto && !tempoAtividadeManual ? "Calculado a partir da data de fundação do cedente" : "Ex: 15 anos, desde 2009"}>
                    {tempoAtividadeAuto && !tempoAtividadeManual ? (
                      <div className="flex items-center gap-2">
                        <div className="h-9 flex-1 flex items-center px-3 rounded-sink-md border border-sink-fog bg-sink-cream/40 text-sm text-sink-deep tabular-nums">
                          {tempoAtividadeAuto.label}
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => setTempoAtividadeManual(true)}
                            className="h-9 px-3 text-[11px] font-mono uppercase tracking-wider rounded-sink-md border border-sink-fog text-sink-deep/60 hover:bg-sink-cream hover:text-sink-deep transition-colors flex-shrink-0"
                          >
                            Editar manual
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input value={tempoAtividade} onChange={(e) => setTempoAtividade(e.target.value)} disabled={isReadOnly} className="h-9 text-sm flex-1" placeholder="Ex: 12 anos" />
                        {tempoAtividadeAuto && tempoAtividadeManual && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => { setTempoAtividadeManual(false); setTempoAtividade(""); }}
                            className="h-9 px-3 text-[11px] font-mono uppercase tracking-wider rounded-sink-md border border-sink-fog text-sink-deep/60 hover:bg-sink-cream hover:text-sink-deep transition-colors flex-shrink-0"
                            title="Voltar ao valor calculado automaticamente"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                    )}
                  </Field>
                  <Field label="Nº de Funcionários">
                    <Input type="number" value={numeroFuncionarios} onChange={(e) => setNumeroFuncionarios(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
                  </Field>
                </FieldGroup>
              </SectionWrapper>

              {/* 2. Operacional */}
              <SectionWrapper title="Informações Operacionais" icon={BarChart3} section="operacional"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.operacional || []}
                onAttachmentsChange={updateSectionAttachments("operacional")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.operacional}
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
                <div className="pt-3">
                  <Field label="Detalhamento de Faturamento" hint="Evolução mensal, sazonalidade, tendências">
                    <Textarea value={faturamentoDetalhado} onChange={(e) => setFaturamentoDetalhado(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Ex: Jan R$100k, Fev R$120k... ou descrição qualitativa" />
                  </Field>
                </div>

                {/* Mini-bloco patrimonial */}
                <div className="pt-4 mt-4 border-t border-sink-fog/60">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 mb-3">Patrimonial</p>
                  <FieldGroup cols={2}>
                    <Field label="Tipo Imóvel Sede" hint="Próprio, alugado, cedido">
                      <Select value={tipoImovelSede} onValueChange={setTipoImovelSede} disabled={isReadOnly}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proprio">Próprio</SelectItem>
                          <SelectItem value="alugado">Alugado</SelectItem>
                          <SelectItem value="cedido">Cedido</SelectItem>
                          <SelectItem value="comodato">Comodato</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                </div>
              </SectionWrapper>

              {/* 3. Sacados (carteira do cedente) */}
              <SectionWrapper title="Sacados" icon={Receipt} section="sacados"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.sacados || []}
                onAttachmentsChange={updateSectionAttachments("sacados")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.sacados}
              >
                {/* Métricas de concentração */}
                {sacados.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <div className="rounded-sink-md p-3" style={{ background: "var(--paper)", border: "1px solid rgba(10,21,56,0.08)" }}>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-sink-deep/50 mb-1">Sacados</p>
                      <p className="text-[20px] font-bold text-sink-deep tabular-nums leading-none">{sacados.length}</p>
                    </div>
                    <div className="rounded-sink-md p-3" style={{ background: "var(--paper)", border: "1px solid rgba(10,21,56,0.08)" }}>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-sink-deep/50 mb-1">Total Fat.</p>
                      <p className={cn("text-[20px] font-bold tabular-nums leading-none",
                        concentration.totalConcentration > 100 ? "text-sink-danger"
                          : concentration.totalConcentration > 0 ? "text-sink-deep" : "text-sink-deep/30"
                      )}>
                        {concentration.totalConcentration.toFixed(0)}<span className="text-[12px]">%</span>
                      </p>
                    </div>
                    <div className="rounded-sink-md p-3" style={{ background: "var(--paper)", border: "1px solid rgba(10,21,56,0.08)" }}>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-sink-deep/50 mb-1">Maior Sacado</p>
                      <p className={cn("text-[20px] font-bold tabular-nums leading-none",
                        concentration.maxSingleConcentration > 30 ? "text-sink-danger"
                          : concentration.maxSingleConcentration > 0 ? "text-sink-deep" : "text-sink-deep/30"
                      )}>
                        {concentration.maxSingleConcentration.toFixed(0)}<span className="text-[12px]">%</span>
                      </p>
                    </div>
                    <div className="rounded-sink-md p-3" style={{ background: "var(--paper)", border: "1px solid rgba(10,21,56,0.08)" }}>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-sink-deep/50 mb-1">HHI</p>
                      <p className={cn("text-[20px] font-bold tabular-nums leading-none",
                        concentration.hhi > 2500 ? "text-sink-danger"
                          : concentration.hhi > 1500 ? "text-sink-warn" : "text-sink-mint"
                      )}>
                        {concentration.hhi.toFixed(0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Alertas */}
                {concentration.alerts.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {concentration.alerts.map((alert, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-sink-md text-[12px]"
                        style={{ background: "rgba(217,163,0,0.08)", border: "1px solid rgba(217,163,0,0.25)", color: "#7A5B00" }}>
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tabela de sacados */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 font-semibold">Carteira de Sacados</span>
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 font-mono text-[10px] rounded-sink-md border border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream hover:text-sink-deep"
                        onClick={addSacado}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar Sacado
                      </Button>
                    )}
                  </div>
                  {sacados.length > 0 ? (
                    <div className="rounded-sink-md border border-sink-fog overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-sink-cream/80 border-b border-sink-fog hover:bg-sink-cream">
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8">Sacado</TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8 w-32">% Faturamento</TableHead>
                            <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8 w-28">Prazo Médio (dias)</TableHead>
                            {!isReadOnly && <TableHead className="w-10 h-8" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sacados.map((s, i) => (
                            <TableRow key={i} className="border-b border-sink-fog/40 hover:bg-sink-cream/40">
                              <TableCell className="p-1.5">
                                <Input value={s.sacado_nome} onChange={(e) => { const u = [...sacados]; u[i].sacado_nome = e.target.value; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" placeholder="Nome do sacado" />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input type="number" step="0.1" value={s.percentual_faturamento ?? ""} onChange={(e) => { const u = [...sacados]; u[i].percentual_faturamento = e.target.value ? parseFloat(e.target.value) : null; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" placeholder="0" />
                              </TableCell>
                              <TableCell className="p-1.5">
                                <Input type="number" value={s.prazo_medio ?? ""} onChange={(e) => { const u = [...sacados]; u[i].prazo_medio = e.target.value ? parseInt(e.target.value) : null; setSacados(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" placeholder="0" />
                              </TableCell>
                              {!isReadOnly && (
                                <TableCell className="p-1.5">
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sink-sm hover:bg-sink-danger/10" onClick={() => removeSacado(i)}><Trash2 className="h-3 w-3 text-sink-danger" /></Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-sink-md border border-dashed border-sink-fog p-6 text-center">
                      <Receipt className="h-6 w-6 text-sink-deep/30 mx-auto mb-2" />
                      <p className="text-[12px] text-sink-deep/50">
                        Nenhum sacado cadastrado.{!isReadOnly && " Clique em \"Adicionar Sacado\" pra começar."}
                      </p>
                    </div>
                  )}
                </div>
              </SectionWrapper>

              {/* 4. Societária */}
              <SectionWrapper title="Estrutura Societária" icon={Users} section="societaria"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.societaria || []}
                onAttachmentsChange={updateSectionAttachments("societaria")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.societaria}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 font-semibold">
                    Quadro Societário
                    {socios.length > 0 && (
                      <span className={cn("ml-2", sociosTotal.isValid ? "text-sink-mint" : "text-sink-danger")}>
                        ({sociosTotal.totalParticipacao.toFixed(1)}% total)
                      </span>
                    )}
                  </span>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 font-mono text-[10px] rounded-sink-md border border-sink-fog bg-transparent text-sink-deep/60 hover:bg-sink-cream hover:text-sink-deep"
                      onClick={addSocio}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Sócio
                    </Button>
                  )}
                </div>
                {socios.length > 0 && (
                  <div className="rounded-sink-md border border-sink-fog overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-sink-cream/80 border-b border-sink-fog hover:bg-sink-cream">
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8">Nome</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8 w-36">CPF</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8 w-24">Part. %</TableHead>
                          <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 h-8 w-32">Cargo</TableHead>
                          {!isReadOnly && <TableHead className="w-10 h-8" />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {socios.map((s, i) => (
                          <TableRow key={i} className="border-b border-sink-fog/40 hover:bg-sink-cream/40">
                            <TableCell className="p-1.5">
                              <Input value={s.nome} onChange={(e) => { const u = [...socios]; u[i].nome = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input value={s.cpf} onChange={(e) => { const u = [...socios]; u[i].cpf = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input type="number" step="0.1" value={s.participacao ?? ""} onChange={(e) => { const u = [...socios]; u[i].participacao = e.target.value ? parseFloat(e.target.value) : null; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm tabular-nums border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" />
                            </TableCell>
                            <TableCell className="p-1.5">
                              <Input value={s.cargo} onChange={(e) => { const u = [...socios]; u[i].cargo = e.target.value; setSocios(u); }} disabled={isReadOnly} className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-sink-mint" />
                            </TableCell>
                            {!isReadOnly && (
                              <TableCell className="p-1.5">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sink-sm hover:bg-sink-danger/10" onClick={() => removeSocio(i)}><Trash2 className="h-3 w-3 text-sink-danger" /></Button>
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
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.credito}
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
                  <Field label="Restrições CNPJ" hint="Situação cadastral, impedimentos">
                    <Input value={restricoesCnpj} onChange={(e) => setRestricoesCnpj(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Nada consta" />
                  </Field>
                </FieldGroup>
                <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Histórico de Pagamentos" hint="Pontualidade, atrasos recorrentes, etc.">
                    <Textarea value={historicoPagamentos} onChange={(e) => setHistoricoPagamentos(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Descreva o histórico de pagamentos..." />
                  </Field>
                  <Field label="Observações da Consulta">
                    <Textarea value={observacoesCredito} onChange={(e) => setObservacoesCredito(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Observações relevantes..." />
                  </Field>
                </div>
              </SectionWrapper>

              {/* 5. Referências */}
              <SectionWrapper title="Referências Bancárias e Comerciais" icon={Handshake} section="referencias"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.referencias || []}
                onAttachmentsChange={updateSectionAttachments("referencias")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.referencias}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Referências Bancárias" hint="Bancos, agências, limites, tempo de conta">
                    <Textarea value={referenciasBancarias} onChange={(e) => setReferenciasBancarias(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" placeholder="Banco X — Ag. 1234 — Conta desde 2015 — Limite R$ 50k..." />
                  </Field>
                  <Field label="Referências Comerciais" hint="Fornecedores, parceiros, clientes">
                    <Textarea value={referenciasComerciais} onChange={(e) => setReferenciasComerciais(e.target.value)} disabled={isReadOnly} rows={3} className="text-sm resize-none" placeholder="Fornecedor Y — Desde 2018 — Sem atrasos..." />
                  </Field>
                </div>
                <div className="pt-3">
                  <Field label="Fonte das Informações" hint="Serasa, Boa Vista, bureau interno, etc.">
                    <Input value={fonteInformacao} onChange={(e) => setFonteInformacao(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Ex: Serasa Experian, SCR Bacen" />
                  </Field>
                </div>
              </SectionWrapper>

              {/* 6. Financeira */}
              <SectionWrapper title="Análise Financeira" icon={TrendingUp} section="financeira"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.financeira || []}
                onAttachmentsChange={updateSectionAttachments("financeira")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.financeira}
              >
                <FieldGroup cols={2}>
                  <Field label="Capital Social (R$)">
                    <Input type="number" step="0.01" value={capitalSocial} onChange={(e) => setCapitalSocial(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0,00" />
                  </Field>
                  <Field label="Receita Líquida (R$)">
                    <Input type="number" step="0.01" value={receitaLiquida} onChange={(e) => setReceitaLiquida(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0,00" />
                  </Field>
                </FieldGroup>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-3">
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
                <FieldGroup cols={2}>
                  <Field label="Margem Líquida" hint="Percentual ou descrição qualitativa">
                    <Input value={margemLiquida} onChange={(e) => setMargemLiquida(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Ex: 8,5% ou Adequada" />
                  </Field>
                  <Field label="Índice de Liquidez" hint="Corrente, seca, geral">
                    <Input value={indiceLiquidez} onChange={(e) => setIndiceLiquidez(e.target.value)} disabled={isReadOnly} className="h-9 text-sm" placeholder="Ex: LC 1,35 / LS 0,98" />
                  </Field>
                </FieldGroup>
              </SectionWrapper>

              {/* 7. Riscos */}
              <SectionWrapper title="Riscos e Pontos Positivos" icon={AlertTriangle} section="riscos"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.riscos || []}
                onAttachmentsChange={updateSectionAttachments("riscos")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.riscos}
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

              {/* 8. Operação */}
              <SectionWrapper title="Operação Proposta" icon={Settings2} section="operacao"
                analysisId={isEditing ? id! : null} attachments={sectionAttachments.operacao || []}
                onAttachmentsChange={updateSectionAttachments("operacao")}
                onDataExtracted={handleDataExtracted} analysisContext={analysisDataForAI} disabled={isReadOnly}
                compactMode={compactMode} bulkToggle={bulkToggle} summary={sectionSummaries.operacao}
              >
                <FieldGroup cols={3}>
                  <Field label="Modalidades da Operação" hint="Marque uma ou mais — o cliente pode combinar tipos">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { value: "factoring",            label: "Factoring" },
                        { value: "fidc",                 label: "FIDC" },
                        { value: "antecipacao",          label: "Antecipação" },
                        { value: "desconto_duplicatas",  label: "Desconto Duplicatas" },
                        { value: "capital_giro",         label: "Capital de Giro" },
                        { value: "outro",                label: "Outro" },
                      ].map(opt => {
                        const checked = modalidadesOperacao.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sink-md border cursor-pointer transition-colors text-[12px] select-none"
                            style={{
                              borderColor: checked ? "#00D49A" : "rgba(10,21,56,0.10)",
                              background: checked ? "rgba(0,212,154,0.08)" : "transparent",
                              opacity: isReadOnly ? 0.6 : 1,
                              pointerEvents: isReadOnly ? "none" : "auto",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setModalidadesOperacao(prev =>
                                  checked ? prev.filter(v => v !== opt.value) : [...prev, opt.value]
                                );
                              }}
                              className="h-3.5 w-3.5 accent-sink-mint"
                            />
                            <span style={{ color: checked ? "#0A1538" : "rgba(10,21,56,0.7)", fontWeight: checked ? 600 : 400 }}>
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Limite Sugerido (R$)">
                    <div className="space-y-1">
                      <Input type="number" step="0.01" value={limiteSugerido} onChange={(e) => setLimiteSugerido(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums font-semibold" placeholder="0,00" />
                      {autoLimit > 0 && (
                        <p className="font-mono text-[10px] text-sink-deep/40">
                          <Sparkles className="h-2.5 w-2.5 inline mr-0.5 text-sink-mint" />
                          IA sugere: {formatBRL(autoLimit)} (baseado no faturamento e score)
                        </p>
                      )}
                    </div>
                  </Field>
                  <Field label="Taxa Sugerida (% a.m.)">
                    <Input type="number" step="0.01" value={taxaSugerida} onChange={(e) => setTaxaSugerida(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0,00" />
                  </Field>
                  <Field label="Prazo Médio Permitido (dias)">
                    <Input type="number" value={prazoMedioPermitido} onChange={(e) => setPrazoMedioPermitido(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
                  </Field>
                  <Field label="Concentração Máx. Sacado (%)">
                    <Input type="number" step="0.1" value={concentracaoMaxima} onChange={(e) => setConcentracaoMaxima(e.target.value)} disabled={isReadOnly} className="h-9 text-sm tabular-nums" placeholder="0" />
                  </Field>
                </FieldGroup>
                <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Garantias">
                    <Textarea value={garantias} onChange={(e) => setGarantias(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Aval dos sócios, nota promissória, etc." />
                  </Field>
                  <Field label="Condições Especiais" hint="Condições adicionais da operação">
                    <Textarea value={condicoesEspeciais} onChange={(e) => setCondicoesEspeciais(e.target.value)} disabled={isReadOnly} rows={2} className="text-sm resize-none" placeholder="Ex: Requer certidão negativa mensal, revisão trimestral..." />
                  </Field>
                </div>
              </SectionWrapper>

              <div className="h-8" />
            </motion.form>
          </TabsContent>

          {/* TAB: Insights IA */}
          <TabsContent value="insights" className="flex-1 overflow-y-auto mt-0 p-0">
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="w-full px-5 py-5 space-y-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-sink-mint" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-sink-deep">Insights Inteligentes</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">IA analisa os dados e gera insights profundos sobre o cedente</p>
                </div>
              </div>

              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="client" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("client")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="market" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("market")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="financial" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("financial")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="risk" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("risk")} />
              <AIInsightsPanel analysisId={isEditing ? id! : null} insightType="summary" analysisData={analysisDataForAI} clientData={clientDataForAI} existingInsight={getInsight("summary")} />
            </motion.div>
          </TabsContent>

          {/* TAB: Concentração */}
          <TabsContent value="concentracao" className="flex-1 overflow-y-auto mt-0 p-0">
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="w-full px-5 py-5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-sink-mint" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-sink-deep">Análise de Concentração</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Visualização da concentração de sacados e alertas automáticos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-sink-paper rounded-sink-lg p-5" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 mb-2">Sacados Cadastrados</p>
                  <p className="font-sans text-3xl font-bold tabular-nums text-sink-deep">{sacados.length}</p>
                </div>
                <div className="bg-sink-paper rounded-sink-lg p-5" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 mb-2">Concentração Máxima</p>
                  <p className={cn("font-sans text-3xl font-bold tabular-nums", concentration.maxSingleConcentration > 30 ? "text-sink-danger" : "text-sink-deep")}>
                    {concentration.maxSingleConcentration.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-sink-paper rounded-sink-lg p-5" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 mb-2">Total Concentração</p>
                  <p className="font-sans text-3xl font-bold tabular-nums text-sink-deep">{concentration.totalConcentration.toFixed(1)}%</p>
                </div>
              </div>

              {concentration.alerts.length > 0 && (
                <div className="rounded-sink-lg border border-sink-danger/30 bg-sink-danger/5 p-4 border-l-4 border-l-sink-danger">
                  <p className="font-sans text-sm font-semibold text-sink-danger mb-2">Alertas de Concentração</p>
                  <ul className="space-y-1">
                    {concentration.alerts.map((a, i) => (
                      <li key={i} className="font-mono text-xs text-sink-danger/80">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-sink-paper rounded-sink-lg overflow-hidden" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                <div className="px-5 py-3.5 border-b border-sink-fog bg-sink-cream/60">
                  <h3 className="font-sans font-semibold text-sm text-sink-deep">Distribuição por Sacado</h3>
                </div>
                <div className="p-5">
                  <ConcentrationChart
                    sacados={sacados}
                    maxConcentration={concentracaoMaxima ? parseFloat(concentracaoMaxima) : 30}
                  />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* TAB: Indicadores */}
          <TabsContent value="indicadores" className="flex-1 overflow-y-auto mt-0 p-0">
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="w-full px-5 py-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-sink-mint" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-sink-deep">Indicadores & Gráficos</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Dashboard completo de indicadores financeiros, radar de risco e análise comparativa</p>
                </div>
              </div>

              <FinancialIndicatorsPanel
                creditScore={scoreNum}
                faturamentoMedio={fatNum}
                receitaLiquida={receitaLiquida ? parseFloat(receitaLiquida) : null}
                capitalSocial={capitalSocial ? parseFloat(capitalSocial) : null}
                limiteSugerido={limiteNum}
                volumeEstimado={volNum}
                numeroFuncionarios={numeroFuncionarios ? parseInt(numeroFuncionarios) : null}
                margemLiquida={margemLiquida || null}
                indiceLiquidez={indiceLiquidez || null}
                prazoMedioTitulos={prazoMedioTitulos ? parseInt(prazoMedioTitulos) : null}
                protestos={protestos}
                pendencias={pendencias}
                acoesJudiciais={acoesJudiciais}
                chequesSemFundo={chequesSemFundo}
                historicoPagamentos={historicoPagamentos}
                tempoAtividade={tempoAtividade}
                faturamentoDetalhado={faturamentoDetalhado}
                sacados={sacados}
                socios={socios}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="parecer" className="flex-1 overflow-y-auto mt-0 p-0">
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="w-full px-5 py-5 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-sink-mint" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-base text-sink-deep">Parecer & Decisão Final</h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/40">Recomendação do analista com base no dossiê completo</p>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-sink-paper rounded-sink-lg overflow-hidden" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                  <div className="px-5 py-3.5 border-b border-sink-fog bg-sink-cream/60">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 font-semibold">Classificação de Risco</p>
                  </div>
                  <div className="px-5 py-4 flex items-center gap-4">
                    <ScoreGauge score={scoreNum} size="md" />
                    <div>
                      <RiskIndicator score={scoreNum} />
                      <p className="font-mono text-xs text-sink-deep/50 mt-2">
                        Grade: <span className="font-bold text-sink-deep">{grade}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-sink-paper rounded-sink-lg overflow-hidden" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                  <div className="px-5 py-3.5 border-b border-sink-fog bg-sink-cream/60">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-sink-deep/50 font-semibold">Operação Proposta</p>
                  </div>
                  <div className="px-5 py-4 space-y-2.5">
                    {[
                      { label: "Limite", value: limiteNum ? formatBRL(limiteNum) : "—" },
                      { label: "Prazo", value: prazoMedioPermitido ? `${prazoMedioPermitido} dias` : "—" },
                      { label: "Conc. Máx", value: concentracaoMaxima ? `${concentracaoMaxima}%` : "—" },
                      { label: "Utilização", value: `${limitUtil.toFixed(0)}%`, danger: limitUtil > 100 },
                    ].map(({ label, value, danger }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="font-mono text-xs text-sink-deep/50">{label}</span>
                        <span className={cn("font-mono text-sm font-bold tabular-nums", danger ? "text-sink-danger" : "text-sink-deep")}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
              <div className="bg-sink-paper rounded-sink-lg p-5" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                <Field label="Parecer do Analista">
                  <Textarea
                    value={parecerAnalista}
                    onChange={(e) => setParecerAnalista(e.target.value)}
                    disabled={isReadOnly}
                    rows={6}
                    className="text-sm resize-none border-sink-fog focus:ring-1 focus:ring-sink-mint focus:border-sink-mint"
                    placeholder="Escreva seu parecer aqui ou gere automaticamente com a IA acima..."
                  />
                </Field>
              </div>

              {/* Recommendation */}
              <div className="bg-sink-paper rounded-sink-lg p-5" style={{ border: "1px solid rgba(10,21,56,0.10)", boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
                <Field label="Recomendação Final">
                  <div className="flex gap-3 pt-2">
                    {[
                      {
                        value: "approve",
                        label: "Aprovar",
                        activeClass: "border-sink-mint bg-sink-mint/10 text-sink-deep shadow-sink-glow",
                        dot: "bg-sink-mint",
                      },
                      {
                        value: "restrict",
                        label: "Aprovar c/ Restrição",
                        activeClass: "border-sink-warn bg-sink-warn/10 text-sink-warn",
                        dot: "bg-sink-warn",
                      },
                      {
                        value: "reject",
                        label: "Reprovar",
                        activeClass: "border-sink-danger bg-sink-danger/10 text-sink-danger",
                        dot: "bg-sink-danger",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => setRecommendation(opt.value)}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-sink-lg font-sans text-sm font-semibold border-2 transition-all",
                          recommendation === opt.value
                            ? opt.activeClass
                            : "border-sink-fog text-sink-deep/50 hover:border-sink-fog/80 hover:bg-sink-cream bg-sink-paper"
                        )}
                      >
                        <span className={cn("block h-2 w-2 rounded-full mx-auto mb-2", recommendation === opt.value ? opt.dot : "bg-sink-fog")} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
