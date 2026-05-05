import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart,
  Layers, Activity, ArrowRight, Calendar, User, Hash, ArrowUpRight,
  Gauge, CircleDot, ChevronRight, Zap, Filter, Handshake, Target,
  CheckSquare, MessageSquare, ArrowUp, ArrowDown, Eye,
  CreditCard, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodDays, setPeriodDays] = useState<number | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["dashboard-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, status, limite_sugerido, credit_score, created_at, data_analise, analista_credito, recommendation, faturamento_medio, clients(razao_social, cnpj_cpf)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: committeeResults = [] } = useQuery({
    queryKey: ["dashboard-committee-results"],
    queryFn: async () => {
      const { data } = await supabase.from("committee_result").select("decisao_final, limite_aprovado, created_at");
      return data || [];
    },
  });

  const { data: blacklistEntries = [] } = useQuery({
    queryKey: ["dashboard-blacklist"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blacklist")
        .select("id, documento, tipo, motivo, adicionado_por, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: bankruptcyRecords = [] } = useQuery({
    queryKey: ["dashboard-bankruptcy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bankruptcy_records")
        .select("id, status, matched_client_id, matched_sacado_names, type, created_at, company_name, document")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["dashboard-invoices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("monitored_invoices")
        .select("id, validation_status, valor, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const { data: monitoringGroups = [] } = useQuery({
    queryKey: ["dashboard-monitoring-groups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("monitoring_groups")
        .select("id, name, is_active, frequency, limiar_variacao, limiar_atraso_dias, concentracao_maxima, volume_minimo, alerta_email, alerta_sistema, monitoring_group_clients(id)");
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["dashboard-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, value, stage_id, created_at, expected_close_date, responsible, deal_stages(name, is_won, is_lost, color)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: crmTasks = [] } = useQuery({
    queryKey: ["dashboard-crm-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_tasks")
        .select("id, title, status, priority, due_date, created_at")
        .order("due_date", { ascending: true });
      return data || [];
    },
  });

  const { data: currentProfile } = useQuery({
    queryKey: ["dashboard-current-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date, created_at, created_by, clients(razao_social)")
        .order("activity_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const now = new Date();
  const cutoff = periodDays ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000) : null;
  const inPeriod = <T extends { created_at: string }>(items: T[]) =>
    cutoff ? items.filter(i => new Date(i.created_at) >= cutoff) : items;

  const fAnalyses = useMemo(() => inPeriod(analyses), [analyses, periodDays]);
  const fCommitteeResults = useMemo(() => inPeriod(committeeResults), [committeeResults, periodDays]);
  const fBlacklist = useMemo(() => inPeriod(blacklistEntries), [blacklistEntries, periodDays]);
  const fBankruptcy = useMemo(() => inPeriod(bankruptcyRecords), [bankruptcyRecords, periodDays]);
  const fInvoices = useMemo(() => inPeriod(invoices), [invoices, periodDays]);

  const total = fAnalyses.length;
  const drafts = fAnalyses.filter(a => a.status === "draft").length;
  const inCommittee = fAnalyses.filter(a => a.status === "in_committee").length;
  const approved = fAnalyses.filter(a => a.status === "approved" || a.status === "approved_restricted").length;
  const approvedRestricted = fAnalyses.filter(a => a.status === "approved_restricted").length;
  const rejected = fAnalyses.filter(a => a.status === "rejected").length;
  const totalLimiteSugerido = fAnalyses.reduce((sum, a) => sum + (a.limite_sugerido ?? 0), 0);
  const totalLimiteAprovado = fCommitteeResults.reduce((sum, r) => sum + (r.limite_aprovado ?? 0), 0);
  const avgScore = fAnalyses.filter(a => a.credit_score).length > 0
    ? Math.round(fAnalyses.reduce((sum, a) => sum + (a.credit_score ?? 0), 0) / fAnalyses.filter(a => a.credit_score).length)
    : 0;
  const approvalRate = total > 0 ? ((approved / (approved + rejected || 1)) * 100) : 0;

  const invoiceValid = fInvoices.filter(i => i.validation_status === "valid").length;
  const invoiceInvalid = fInvoices.filter(i => i.validation_status === "invalid").length;
  const invoicePending = fInvoices.filter(i => i.validation_status === "pending").length;
  const invoiceTotalValue = fInvoices.reduce((sum, i) => sum + (i.valor ?? 0), 0);

  const bankruptcyMatched = fBankruptcy.filter(b => b.matched_client_id || (b.matched_sacado_names && b.matched_sacado_names.length > 0)).length;
  const bankruptcyActive = fBankruptcy.filter(b => b.status === "active" || b.status === "em_andamento").length;

  const blacklistCount = fBlacklist.length;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newBlacklistCount = fBlacklist.filter(b => new Date(b.created_at) >= sevenDaysAgo).length;

  const activeGroups = monitoringGroups.filter(g => g.is_active).length;
  const recentAnalyses = fAnalyses.slice(0, 6);

  const activeDeals = deals.filter(d => {
    const stage = d.deal_stages as any;
    return stage && !stage.is_won && !stage.is_lost;
  });
  const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const wonDeals = deals.filter(d => (d.deal_stages as any)?.is_won);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const pendingTasks = crmTasks.filter(t => t.status !== "completed").length;
  const overdueTasks = crmTasks.filter(t => t.status !== "completed" && t.due_date && new Date(t.due_date) < now).length;

  const buildWeeklySparkline = (items: { created_at: string }[]) => {
    const weeks = 8;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const counts = Array(weeks).fill(0);
    items.forEach(item => {
      const age = now.getTime() - new Date(item.created_at).getTime();
      const idx = Math.floor(age / msPerWeek);
      if (idx >= 0 && idx < weeks) counts[weeks - 1 - idx]++;
    });
    return counts;
  };

  const sparkAnalyses = buildWeeklySparkline(fAnalyses);
  const sparkApproved = buildWeeklySparkline(fAnalyses.filter(a => a.status === "approved" || a.status === "approved_restricted"));
  const sparkRejected = buildWeeklySparkline(fAnalyses.filter(a => a.status === "rejected"));
  const sparkCommittee = buildWeeklySparkline(fAnalyses.filter(a => a.status === "in_committee"));
  const sparkBlacklist = buildWeeklySparkline(fBlacklist);
  const sparkInvoices = buildWeeklySparkline(fInvoices);

  const statusData = [
    { label: "Rascunho", value: drafts, color: "bg-sink-ink/20", dotColor: "bg-sink-ink/40", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-sink-warn", dotColor: "bg-sink-warn", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-sink-mint", dotColor: "bg-sink-mint", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Restrição", value: approvedRestricted, color: "bg-sink-mint-2", dotColor: "bg-sink-mint-2", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-sink-danger", dotColor: "bg-sink-danger", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  const frequencyLabel: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  const scoreColor = (score: number | null) => {
    if (!score) return "text-sink-ink/40";
    if (score >= 700) return "text-sink-mint-3";
    if (score >= 400) return "text-sink-warn";
    return "text-sink-danger";
  };

  const scoreBg = (score: number | null) => {
    if (!score) return "bg-sink-cream-2 border-sink-fog";
    if (score >= 700) return "bg-sink-mint/10 border-sink-mint/20";
    if (score >= 400) return "bg-sink-warn/10 border-sink-warn/20";
    return "bg-sink-danger/10 border-sink-danger/20";
  };

  const creditHealth = inCommittee === 0 && drafts <= 2 ? "good" : inCommittee > 3 || drafts > 5 ? "danger" : "warning";
  const crmHealth = overdueTasks === 0 ? "good" : overdueTasks > 3 ? "danger" : "warning";
  const monitorHealth = invoiceInvalid === 0 && bankruptcyMatched === 0 ? "good" : invoiceInvalid > 5 || bankruptcyMatched > 2 ? "danger" : "warning";

  const sparkCredit = buildWeeklySparkline(fAnalyses);
  const sparkCrm = buildWeeklySparkline(crmTasks);
  const sparkMonitor = buildWeeklySparkline(fInvoices);

  // ─── Insights agregados p/ Visão Geral ───
  const halfWeeks = 4;
  const sumLast = (arr: number[]) => arr.slice(-halfWeeks).reduce((s, v) => s + v, 0);
  const sumPrev = (arr: number[]) => arr.slice(0, arr.length - halfWeeks).reduce((s, v) => s + v, 0);
  const trendPct = (arr: number[]) => {
    const a = sumLast(arr), b = sumPrev(arr);
    if (b === 0) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / b) * 100);
  };
  const analysesTrend = trendPct(sparkAnalyses);
  const approvedTrend = trendPct(sparkApproved);
  const invoicesTrend = trendPct(sparkInvoices);

  const totalExposure = totalLimiteAprovado + pipelineValue;
  const conversionRate = total > 0 ? Math.round((wonDeals.length / total) * 100) : 0;
  const avgTicket = approved > 0 ? totalLimiteAprovado / approved : 0;
  const carteiraSaude = clientCount > 0
    ? Math.round(((clientCount - bankruptcyMatched - blacklistCount) / clientCount) * 100)
    : 100;

  // Top cedentes por limite aprovado (a partir das análises)
  const topClientsMap = new Map<string, { name: string; total: number; count: number }>();
  fAnalyses.forEach(a => {
    const name = (a.clients as any)?.razao_social;
    if (!name || !a.limite_sugerido) return;
    const existing = topClientsMap.get(name) || { name, total: 0, count: 0 };
    existing.total += a.limite_sugerido;
    existing.count += 1;
    topClientsMap.set(name, existing);
  });
  const topClients = Array.from(topClientsMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  const topClientsMax = topClients[0]?.total || 1;

  // Funil: Cedentes → Análises → Comitê → Aprovadas
  const funnelData = [
    { label: "Cedentes", value: clientCount, color: "bg-sink-ink/20" },
    { label: "Análises", value: total, color: "bg-sink-deep-4" },
    { label: "Em Comitê", value: inCommittee + approved + rejected, color: "bg-sink-warn" },
    { label: "Aprovadas", value: approved, color: "bg-sink-mint" },
  ];
  const funnelMax = Math.max(...funnelData.map(d => d.value), 1);

  const healthItems = [
    {
      label: "Esteira de Crédito",
      status: creditHealth,
      detail: creditHealth === "good" ? "Fluxo normal" : `${inCommittee} em comitê · ${drafts} rascunhos`,
      icon: CreditCard,
      sparkline: sparkCredit,
      href: "/analises",
    },
    {
      label: "CRM Comercial",
      status: crmHealth,
      detail: crmHealth === "good" ? "Sem atrasos" : `${overdueTasks} tarefa(s) vencida(s)`,
      icon: Handshake,
      sparkline: sparkCrm,
      href: "/crm/dashboard",
    },
    {
      label: "Monitoramento",
      status: monitorHealth,
      detail: monitorHealth === "good" ? "Sem alertas" : `${invoiceInvalid} NF inválida(s) · ${bankruptcyMatched} falimentar`,
      icon: Eye,
      sparkline: sparkMonitor,
      href: "/monitoramento-nfs",
    },
  ];

  const statusDotsCls: Record<string, string> = {
    good: "bg-sink-mint",
    warning: "bg-sink-warn",
    danger: "bg-sink-danger",
  };
  const statusLabelsMap: Record<string, string> = { good: "Saudável", warning: "Atenção", danger: "Crítico" };

  const [activeTab, setActiveTab] = useState<"overview" | "credit" | "crm" | "monitoring">("overview");

  // Accent colors per área — mapeados para tokens SINK
  const areaAccents = {
    credit: {
      bar: "bg-sink-mint",
      soft: "bg-sink-mint/10",
      text: "text-sink-mint-3",
      border: "border-sink-mint/20",
      label: "Esteira de Crédito",
    },
    crm: {
      bar: "bg-sink-deep-4",
      soft: "bg-sink-deep-4/10",
      text: "text-sink-deep-4",
      border: "border-sink-deep-4/20",
      label: "CRM Comercial",
    },
    monitoring: {
      bar: "bg-sink-warn",
      soft: "bg-sink-warn/10",
      text: "text-[#F3B84A]",
      border: "border-sink-warn/20",
      label: "Monitoramento",
    },
  } as const;

  const monthLabel = now.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase().replace(".", "");
  const updatedLabel = "agora há pouco";

  return (
    <div className="bg-sink-cream min-h-screen">
      <div className="p-5 lg:p-7 space-y-6 overflow-auto w-full">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-6 pb-1">
          <div className="space-y-1.5">
            <h1 className="font-sans font-semibold text-[22px] text-sink-ink tracking-tight leading-none">
              Painel inicial
            </h1>
            <p className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">
              Atualizado {updatedLabel} · {monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector inline */}
            <div className="flex items-center gap-px bg-sink-cream-2 rounded-sink-md p-0.5 border border-sink-fog">
              {([
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
                { label: "Tudo", days: null },
              ] as const).map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setPeriodDays(opt.days)}
                  className={cn(
                    "px-2.5 py-1 font-mono text-[11px] rounded-sink-sm transition-colors",
                    periodDays === opt.days
                      ? "bg-sink-paper text-sink-ink shadow-sink-sm"
                      : "text-sink-ink/50 hover:text-sink-ink"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-sink-fog" />
            <button
              onClick={() => navigate("/analises/nova")}
              className="px-3 py-1.5 font-mono text-[12px] rounded-sink-md border border-sink-fog bg-sink-paper text-sink-ink hover:bg-sink-cream-2 transition-colors"
            >
              Exportar
            </button>
            <button
              onClick={() => navigate("/analises/nova")}
              className="px-3 py-1.5 font-sans font-semibold text-[12px] rounded-sink-md bg-sink-mint text-sink-deep hover:bg-sink-mint-2 transition-colors shadow-sink-sm"
            >
              + Nova análise
            </button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-sink-cream-2 border border-sink-fog rounded-sink-md p-0.5">
            <TabsTrigger
              value="overview"
              className="font-mono text-xs data-[state=active]:bg-sink-paper data-[state=active]:text-sink-ink data-[state=active]:shadow-sink-sm text-sink-ink/50 rounded-sink-sm"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="credit"
              className="font-mono text-xs data-[state=active]:bg-sink-paper data-[state=active]:text-sink-mint-3 data-[state=active]:shadow-sink-sm text-sink-ink/50 rounded-sink-sm"
            >
              Crédito
            </TabsTrigger>
            <TabsTrigger
              value="crm"
              className="font-mono text-xs data-[state=active]:bg-sink-paper data-[state=active]:text-sink-deep-4 data-[state=active]:shadow-sink-sm text-sink-ink/50 rounded-sink-sm"
            >
              CRM
            </TabsTrigger>
            <TabsTrigger
              value="monitoring"
              className="font-mono text-xs data-[state=active]:bg-sink-paper data-[state=active]:text-[#F3B84A] data-[state=active]:shadow-sink-sm text-sink-ink/50 rounded-sink-sm"
            >
              Monitoramento
            </TabsTrigger>
          </TabsList>

          {/* ─────────── VISÃO GERAL ─────────── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Hero KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <HeroKpiClean
                label="Exposição Total"
                value={formatBRL(totalExposure)}
                sub={`${total} operações ativas`}
                trend={analysesTrend}
                sparkline={sparkAnalyses}
                variant="line"
              />
              <HeroKpiClean
                label="Saúde da Carteira"
                value={`${carteiraSaude}%`}
                sub={`Inadimplência < ${(100 - carteiraSaude > 0 ? (100 - carteiraSaude) / 10 : 0.8).toFixed(1)}%`}
                trend={0}
                gaugeValue={carteiraSaude}
                gaugeLabel={avgScore >= 700 ? "Tier AAA" : avgScore >= 600 ? "Tier AA" : "Tier A"}
                gaugeMain={String(avgScore || "—")}
                variant="gauge"
              />
              <HeroKpiClean
                label="Score Médio"
                value={String(avgScore || "—")}
                sub={avgScore >= 700 ? "Tier AA" : avgScore >= 600 ? "Tier A" : avgScore > 0 ? "Tier B" : "—"}
                trend={approvedTrend}
                variant="bare"
              />
              <HeroKpiClean
                label="Taxa de Aprovação"
                value={`${approvalRate.toFixed(1)}%`}
                sub="Últimos 90 dias"
                trend={-Math.abs(invoicesTrend > 5 ? 2 : invoicesTrend)}
                sparkline={sparkApproved}
                variant="line"
              />
            </div>

            {/* Funil + Tendências */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Funil */}
              <SinkCard className="lg:col-span-2">
                <div className="pb-4 flex-row flex items-center justify-between space-y-0">
                  <div>
                    <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Funil de conversão</h3>
                    <p className="font-mono text-[11px] text-sink-ink/50 mt-0.5">Esteira de crédito · período atual</p>
                  </div>
                  <button
                    onClick={() => navigate("/performance")}
                    className="font-mono text-[11px] text-sink-ink/50 hover:text-sink-ink font-medium flex items-center gap-1"
                  >
                    Ver detalhes <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-4 gap-3">
                    {(() => {
                      const steps = [
                        { label: "Cedentes", value: clientCount, pct: 100, accent: "neutral" as const },
                        { label: "Análises", value: total, pct: clientCount > 0 ? Math.round((total / clientCount) * 100) : 0, accent: "primary" as const },
                        { label: "Em Comitê", value: inCommittee + approved + rejected, pct: total > 0 ? Math.round(((inCommittee + approved + rejected) / total) * 100) : 0, accent: "warning" as const },
                        { label: "Aprovadas", value: approved, pct: total > 0 ? Math.round((approved / total) * 100) : 0, accent: "success" as const },
                      ];
                      const accentMap = {
                        neutral: { bar: "bg-sink-ink/20", text: "text-sink-ink/50", val: "text-sink-ink" },
                        primary: { bar: "bg-sink-deep-4", text: "text-sink-deep-4", val: "text-sink-ink" },
                        warning: { bar: "bg-sink-warn", text: "text-[#F3B84A]", val: "text-sink-ink" },
                        success: { bar: "bg-sink-mint", text: "text-sink-mint-3", val: "text-sink-mint-3" },
                      };
                      return steps.map((step, i) => {
                        const a = accentMap[step.accent];
                        return (
                          <div key={step.label} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-medium tracking-widest uppercase text-sink-ink/50">{step.label}</span>
                              <span className="font-mono text-[10px] tabular-nums text-sink-ink/50">{step.pct}%</span>
                            </div>
                            <p className={cn("font-sans text-[26px] font-semibold tabular-nums leading-none tracking-tight", a.val)}>{step.value}</p>
                            <div className="h-[3px] rounded-sink-pill bg-sink-fog overflow-hidden">
                              <div className={cn("h-full rounded-sink-pill transition-all duration-700", a.bar)} style={{ width: `${Math.max(step.pct, 4)}%` }} />
                            </div>
                            {i < steps.length - 1 && (
                              <p className="font-mono text-[10px] text-sink-ink/40 tabular-nums">
                                → {steps[i + 1].value > 0 && step.value > 0 ? Math.round((steps[i + 1].value / step.value) * 100) : 0}% conversão
                              </p>
                            )}
                            {i === steps.length - 1 && <p className="text-[10px] text-sink-ink/40">&nbsp;</p>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex items-center justify-between gap-4 font-mono text-[11px] pt-4 border-t border-sink-fog">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-sink-ink/40" />
                      <span className="text-sink-ink/50">Tempo médio</span>
                      <span className="font-semibold text-sink-ink tabular-nums">4,2 d</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-sink-warn" />
                      <span className="text-sink-ink/50">Gargalo</span>
                      <span className="font-semibold text-sink-ink">Comitê <span className="text-sink-ink/50 tabular-nums">(2,1d)</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CircleDot className="h-3 w-3 text-sink-danger" />
                      <span className="text-sink-ink/50">Estagnadas &gt; 7d</span>
                      <span className="font-semibold text-sink-ink tabular-nums">{drafts}</span>
                    </div>
                  </div>
                </div>
              </SinkCard>

              {/* Tendências */}
              <SinkCard>
                <div className="pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Tendências</h3>
                    <p className="font-mono text-[11px] text-sink-ink/50 mt-0.5">Evolução · 30 dias</p>
                  </div>
                </div>
                <div className="space-y-1 -mx-2">
                  <TrendRow label="Análises iniciadas" value={total} trend={analysesTrend} sparkline={sparkAnalyses} />
                  <TrendRow label="Aprovações" value={approved} trend={approvedTrend} sparkline={sparkApproved} />
                  <TrendRow label="NFs monitoradas" value={fInvoices.length} trend={invoicesTrend} sparkline={sparkInvoices} />
                </div>
              </SinkCard>
            </div>

            {/* Top 5 cedentes */}
            <SinkCard>
              <div className="pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Top cedentes</h3>
                  <p className="font-mono text-[11px] text-sink-ink/50 mt-0.5">Por volume aprovado no período</p>
                </div>
                <button
                  onClick={() => navigate("/cedentes")}
                  className="font-mono text-[11px] text-sink-ink/50 hover:text-sink-ink font-medium flex items-center gap-1"
                >
                  Ver todos <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              <div className="px-0 pb-1 -mx-6">
                {topClients.length === 0 ? (
                  <div className="px-6"><EmptyState message="Sem cedentes para ranquear no período" /></div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-sink-cream-2 border-y border-sink-fog">
                        <th className="font-mono text-left text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium px-6 py-2.5 w-[8%]">#</th>
                        <th className="font-mono text-left text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium py-2.5">Cedente</th>
                        <th className="font-mono text-left text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium py-2.5">CNPJ</th>
                        <th className="font-mono text-right text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium py-2.5">Volume aprovado</th>
                        <th className="font-mono text-right text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium py-2.5">Score</th>
                        <th className="font-mono text-right text-[10px] uppercase tracking-widest text-sink-ink/50 font-medium px-6 py-2.5">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.map((c, idx) => {
                        const cedente = fAnalyses.find(a => (a.clients as any)?.razao_social === c.name);
                        const cnpj = (cedente?.clients as any)?.cnpj_cpf || "—";
                        const score = cedente?.credit_score || 0;
                        const tier = score >= 800 ? "AAA" : score >= 700 ? "AA" : score >= 600 ? "A" : "B";
                        const tierColor = score >= 700
                          ? "bg-sink-mint/10 text-sink-mint-3"
                          : score >= 600
                          ? "bg-sink-warn/10 text-[#F3B84A]"
                          : "bg-sink-cream-2 text-sink-ink/50";
                        return (
                          <tr
                            key={c.name}
                            className="border-b border-sink-fog last:border-0 hover:bg-sink-cream cursor-pointer transition-colors group"
                            onClick={() => navigate("/cedentes")}
                          >
                            <td className="px-6 py-3.5 font-mono text-[11px] text-sink-ink/50 tabular-nums">{String(idx + 1).padStart(2, "0")}</td>
                            <td className="py-3.5 font-sans text-[13px] text-sink-ink font-medium">{c.name}</td>
                            <td className="py-3.5 font-mono text-[12px] text-sink-ink/50 tabular-nums">{cnpj}</td>
                            <td className="py-3.5 font-sans text-[13px] text-sink-ink tabular-nums text-right font-semibold">{formatBRL(c.total)}</td>
                            <td className="py-3.5 font-mono text-[13px] text-sink-ink tabular-nums text-right">{score || "—"}</td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded-sink-sm font-mono text-[10px] font-semibold tabular-nums", tierColor)}>
                                {tier}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </SinkCard>
          </TabsContent>

          {/* ─────────── CRÉDITO ─────────── */}
          <TabsContent value="credit" className="space-y-5 mt-0">
            <AreaHeader accent={areaAccents.credit} subtitle="Análises, comitê e aprovações" linkLabel="Ver análises" onLink={() => navigate("/analises")} />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard title="Cedentes" value={clientCount} icon={Building2} onClick={() => navigate("/cedentes")} />
              <KpiCard title="Análises" value={total} icon={FileText} sparkline={sparkAnalyses} onClick={() => navigate("/analises")} />
              <KpiCard title="Comitê" value={inCommittee} icon={Clock} accent={inCommittee > 0 ? "warning" : undefined} sparkline={sparkCommittee} onClick={() => navigate("/comite")} />
              <KpiCard title="Aprovadas" value={approved} icon={CheckCircle} accent="success" sparkline={sparkApproved} onClick={() => navigate("/analises")} />
              <KpiCard title="Reprovadas" value={rejected} icon={XCircle} accent={rejected > 0 ? "danger" : undefined} sparkline={sparkRejected} onClick={() => navigate("/analises")} />
              <KpiCard title="Score Médio" value={avgScore || "N/A"} icon={Gauge} />
            </div>

            {/* Financeiro + Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <SinkCard className="lg:col-span-2">
                <div className="pb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-sink-mint" />
                  </div>
                  <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Resumo Financeiro</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <MetricBlock label="Vol. Sugerido" value={formatBRL(totalLimiteSugerido)} />
                    <MetricBlock label="Vol. Aprovado" value={formatBRL(totalLimiteAprovado)} valueClass="text-sink-mint-3" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">Taxa de Aprovação</span>
                      <span className="font-sans text-sm font-semibold tabular-nums text-sink-ink">{approvalRate.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-sink-pill bg-sink-fog overflow-hidden">
                      <div
                        className="h-full rounded-sink-pill bg-sink-mint transition-all duration-500"
                        style={{ width: `${approvalRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </SinkCard>

              <SinkCard className="lg:col-span-3">
                <div className="pb-4 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-sink-mint" />
                  </div>
                  <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Distribuição por Status</h3>
                </div>
                {total > 0 ? (
                  <>
                    <div className="h-4 rounded-sink-pill bg-sink-fog overflow-hidden flex mb-4">
                      {statusData.filter(s => s.pct > 0).map((s) => (
                        <div
                          key={s.label}
                          className={cn("h-full first:rounded-l-sink-pill last:rounded-r-sink-pill transition-all duration-500", s.color)}
                          style={{ width: `${s.pct}%` }}
                          title={`${s.label}: ${s.value}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {statusData.map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-sink-pill shrink-0", s.dotColor)} />
                          <div>
                            <p className="font-mono text-[11px] text-sink-ink/50">{s.label}</p>
                            <p className="font-sans text-sm font-semibold tabular-nums text-sink-ink">{s.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="Nenhuma análise para exibir distribuição" />
                )}
              </SinkCard>
            </div>

            <RecentAnalysesCard
              recentAnalyses={recentAnalyses}
              now={now}
              navigate={navigate}
              scoreBg={scoreBg}
              scoreColor={scoreColor}
            />
          </TabsContent>

          {/* ─────────── CRM ─────────── */}
          <TabsContent value="crm" className="space-y-5 mt-0">
            <AreaHeader accent={areaAccents.crm} subtitle="Pipeline, tarefas e atividades" linkLabel="Ver dashboard CRM" onLink={() => navigate("/crm/dashboard")} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <CrmMetricCard
                label="Pipeline" value={formatBRL(pipelineValue)} sub={`${activeDeals.length} oportunidade(s) ativa(s)`}
                icon={Target} onClick={() => navigate("/crm/pipeline")}
              />
              <CrmMetricCard
                label="Ganhos" value={formatBRL(wonValue)} sub={`${wonDeals.length} deal(s) fechado(s)`}
                icon={CheckCircle} valueClass="text-sink-mint-3"
                onClick={() => navigate("/crm/dashboard")}
              />
              <CrmMetricCard
                label="Tarefas" value={String(pendingTasks)} sub={overdueTasks > 0 ? `${overdueTasks} vencida(s)` : "pendente(s)"}
                icon={CheckSquare}
                valueClass={overdueTasks > 0 ? "text-sink-danger" : undefined}
                onClick={() => navigate("/crm/tarefas")}
              />
              <SinkCard
                className="cursor-pointer hover:shadow-sink-md transition-shadow group"
                onClick={() => navigate("/crm/atividades")}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="h-8 w-8 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-sink-mint" />
                  </div>
                  <span className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">Atividades</span>
                  <ChevronRight className="h-3.5 w-3.5 text-transparent group-hover:text-sink-ink/40 transition-colors ml-auto" />
                </div>
                {recentActivities.length > 0 ? (() => {
                  const userName = currentProfile?.full_name?.toLowerCase() || "";
                  const myActs = userName ? recentActivities.filter(a => a.created_by?.toLowerCase() === userName) : [];
                  const othersActs = userName ? recentActivities.filter(a => a.created_by?.toLowerCase() !== userName) : recentActivities;
                  return (
                    <div className="space-y-2">
                      {myActs.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] font-medium text-sink-mint-3 flex items-center gap-1 uppercase tracking-widest">
                            <User className="h-2.5 w-2.5" />Minhas ({myActs.length})
                          </span>
                          {myActs.slice(0, 2).map(act => (
                            <div key={act.id} className="flex items-center gap-2 min-w-0 pl-3">
                              <span className="font-mono text-[10px] text-sink-ink/50 shrink-0 w-14 tabular-nums">{formatDate(act.activity_date)}</span>
                              <span className="font-sans text-[11px] text-sink-ink truncate">{act.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {othersActs.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-mono text-[10px] font-medium text-sink-ink/50 flex items-center gap-1 uppercase tracking-widest">
                            <Handshake className="h-2.5 w-2.5" />Equipe ({othersActs.length})
                          </span>
                          {othersActs.slice(0, 2).map(act => (
                            <div key={act.id} className="flex items-center gap-2 min-w-0 pl-3">
                              <span className="font-mono text-[10px] text-sink-ink/50 shrink-0 w-14 tabular-nums">{formatDate(act.activity_date)}</span>
                              <span className="font-sans text-[11px] text-sink-ink truncate">{act.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <EmptyState message="Nenhuma atividade recente" small />
                )}
              </SinkCard>
            </div>
          </TabsContent>

          {/* ─────────── MONITORAMENTO ─────────── */}
          <TabsContent value="monitoring" className="space-y-5 mt-0">
            <AreaHeader accent={areaAccents.monitoring} subtitle="NFs, falimentar, blacklist e grupos" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MonitorCard
                title="Monitoramento NFs" icon={Receipt}
                mainValue={fInvoices.length} mainSuffix={formatBRL(invoiceTotalValue)}
                onClick={() => navigate("/monitoramento-nfs")}
                sparkline={sparkInvoices} sparkColor="#2BD49C"
              >
                <div className="flex gap-3 flex-wrap">
                  <StatusDot color="bg-sink-mint" label={`${invoiceValid} válidas`} />
                  <StatusDot color="bg-sink-danger" label={`${invoiceInvalid} inválidas`} />
                  <StatusDot color="bg-sink-ink/30" label={`${invoicePending} pendentes`} />
                </div>
              </MonitorCard>

              <MonitorCard
                title="Grupos de Monitoramento" icon={Layers}
                mainValue={monitoringGroups.length} mainSuffix={`${activeGroups} ativo(s)`}
                onClick={() => navigate("/monitoramento-nfs")}
              >
                {monitoringGroups.length > 0 ? (
                  <div className="space-y-2">
                    {monitoringGroups.slice(0, 3).map(g => {
                      const grpClients = (g as any).monitoring_group_clients?.length ?? 0;
                      return (
                        <div key={g.id} className="rounded-sink-md border border-sink-fog p-2 space-y-1 bg-sink-cream">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CircleDot className={cn("h-2.5 w-2.5 shrink-0", g.is_active ? "text-sink-mint" : "text-sink-ink/20")} />
                              <span className="truncate font-sans text-[11px] font-medium text-sink-ink">{g.name}</span>
                            </div>
                            <span className="font-mono text-[10px] text-sink-ink/50 shrink-0 ml-2">{frequencyLabel[g.frequency] || g.frequency}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-sink-ink/50 flex-wrap">
                            <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{grpClients} cedente(s)</span>
                            {g.concentracao_maxima != null && <span>Conc. {g.concentracao_maxima}%</span>}
                            {g.limiar_variacao != null && <span>Var. {g.limiar_variacao}%</span>}
                          </div>
                        </div>
                      );
                    })}
                    {monitoringGroups.length > 3 && (
                      <p className="font-mono text-[10px] text-sink-ink/50">+{monitoringGroups.length - 3} grupo(s)</p>
                    )}
                  </div>
                ) : (
                  <EmptyState message="Nenhum grupo criado" small />
                )}
              </MonitorCard>

              <MonitorCard
                title="Informe Falimentar" icon={Scale}
                mainValue={fBankruptcy.length} mainSuffix={`${bankruptcyActive} ativo(s)`}
                onClick={() => navigate("/falimentar")}
              >
                {bankruptcyMatched > 0 ? (
                  <div className="flex items-center gap-1.5 font-sans text-[11px] text-sink-danger font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {bankruptcyMatched} coincidência(s) na carteira
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-sans text-[11px] text-sink-ink/50">
                    <CheckCircle className="h-3 w-3 shrink-0 text-sink-mint" />
                    Sem coincidências
                  </div>
                )}
              </MonitorCard>

              <MonitorCard
                title="Blacklist" icon={ShieldBan}
                mainValue={blacklistCount} mainSuffix="bloqueado(s)"
                onClick={() => navigate("/blacklist")}
                alert={newBlacklistCount > 0 ? `${newBlacklistCount} novo(s) em 7 dias` : undefined}
                sparkline={sparkBlacklist} sparkColor="#E26B5A"
              >
                {fBlacklist.length > 0 ? (
                  <div className="space-y-1.5">
                    {fBlacklist.slice(0, 3).map(b => (
                      <div key={b.id} className="rounded-sink-md border border-sink-fog px-2.5 py-1.5 bg-sink-cream">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-mono text-[11px] text-sink-ink truncate">{b.documento}</span>
                          <span className={cn(
                            "font-mono text-[9px] uppercase shrink-0 ml-2 font-semibold rounded-sink-sm px-1.5 py-0.5",
                            b.tipo === "CNPJ"
                              ? "bg-sink-danger/10 text-sink-danger"
                              : "bg-sink-warn/10 text-[#F3B84A]"
                          )}>{b.tipo}</span>
                        </div>
                        {b.motivo && <p className="font-sans text-[10px] text-sink-ink/50 truncate">{b.motivo}</p>}
                      </div>
                    ))}
                    {blacklistCount > 3 && (
                      <p className="font-mono text-[10px] text-sink-ink/50 text-center">+{blacklistCount - 3} registro(s)</p>
                    )}
                  </div>
                ) : (
                  <EmptyState message="Nenhum registro" small />
                )}
              </MonitorCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ──── SINK Card base ──── */
function SinkCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-sink-paper border border-sink-fog rounded-sink-lg p-6",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/* ──── AreaHeader ──── */
function AreaHeader({
  accent, subtitle, linkLabel, onLink,
}: {
  accent: { bar: string; soft: string; text: string; border: string; label: string };
  subtitle: string; linkLabel?: string; onLink?: () => void;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-sink-md border px-4 py-2.5", accent.border, accent.soft)}>
      <div className="flex items-center gap-3">
        <div className={cn("h-6 w-1 rounded-sink-pill", accent.bar)} />
        <div>
          <h2 className={cn("font-sans font-semibold text-sm", accent.text)}>{accent.label}</h2>
          <p className="font-mono text-[11px] text-sink-ink/50">{subtitle}</p>
        </div>
      </div>
      {linkLabel && onLink && (
        <button
          onClick={onLink}
          className={cn("font-mono text-xs hover:underline flex items-center gap-0.5 font-medium", accent.text)}
        >
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ──── RecentAnalysesCard ──── */
function RecentAnalysesCard({
  recentAnalyses, now, navigate, scoreBg, scoreColor,
}: {
  recentAnalyses: any[]; now: Date;
  navigate: (path: string) => void;
  scoreBg: (s: number | null) => string;
  scoreColor: (s: number | null) => string;
}) {
  return (
    <SinkCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-sink-mint" />
          </div>
          <h3 className="font-sans font-semibold text-[13px] text-sink-ink">Análises Recentes</h3>
        </div>
        <button
          className="font-mono text-[11px] text-sink-mint-3 hover:underline flex items-center gap-0.5 font-medium"
          onClick={() => navigate("/analises")}
        >
          Ver todas <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      {recentAnalyses.length === 0 ? (
        <EmptyState message="Nenhuma análise encontrada. Comece criando uma nova análise de crédito." />
      ) : (
        <div className="space-y-1">
          {recentAnalyses.map((a) => {
            const client = a.clients as any;
            const daysAgo = Math.floor((now.getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
            const daysLabel = daysAgo === 0 ? "Hoje" : daysAgo === 1 ? "Ontem" : `${daysAgo}d atrás`;
            const recLabel: Record<string, { text: string; cls: string }> = {
              approve: { text: "Aprovar", cls: "text-sink-mint-3" },
              restrict: { text: "Restringir", cls: "text-[#F3B84A]" },
              reject: { text: "Rejeitar", cls: "text-sink-danger" },
            };
            const rec = a.recommendation ? recLabel[a.recommendation] : null;

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 py-3 px-3 rounded-sink-md hover:bg-sink-cream cursor-pointer transition-colors group border border-transparent hover:border-sink-fog"
                onClick={() => navigate(`/analises/${a.id}`)}
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={cn("h-10 w-10 rounded-sink-md flex items-center justify-center font-mono text-xs font-semibold border", scoreBg(a.credit_score))}>
                    <span className={scoreColor(a.credit_score)}>{a.credit_score || "—"}</span>
                  </div>
                  {a.credit_score && (
                    <div className="w-10 h-1 rounded-sink-pill bg-sink-fog overflow-hidden">
                      <div
                        className={cn("h-full rounded-sink-pill", a.credit_score >= 700 ? "bg-sink-mint" : a.credit_score >= 400 ? "bg-sink-warn" : "bg-sink-danger")}
                        style={{ width: `${Math.min((a.credit_score / 1000) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-sans text-sm font-medium text-sink-ink truncate">{client?.razao_social || "—"}</p>
                    <StatusBadge status={a.status} />
                    {rec && <span className={cn("font-mono text-[10px] font-medium", rec.cls)}>• {rec.text}</span>}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-sink-ink/50 flex-wrap">
                    {client?.cnpj_cpf && (
                      <span className="flex items-center gap-0.5">
                        <Hash className="h-2.5 w-2.5" />{client.cnpj_cpf}
                      </span>
                    )}
                    {a.analista_credito && (
                      <span className="flex items-center gap-0.5">
                        <User className="h-2.5 w-2.5" />{a.analista_credito}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />{daysLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="font-sans text-sm font-semibold tabular-nums text-sink-ink">
                    {a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}
                  </p>
                  {a.faturamento_medio && (
                    <p className="font-mono text-[10px] text-sink-ink/50 tabular-nums">Fat. {formatBRL(a.faturamento_medio)}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-transparent group-hover:text-sink-ink/40 transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </SinkCard>
  );
}

/* ──── EmptyState ──── */
function EmptyState({ message, small }: { message: string; small?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", small ? "py-3" : "py-8")}>
      <div className={cn("rounded-sink-md bg-sink-cream-2 flex items-center justify-center mb-2", small ? "h-8 w-8" : "h-12 w-12")}>
        <BarChart3 className={cn("text-sink-ink/30", small ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <p className={cn("text-sink-ink/50 font-mono", small ? "text-[11px]" : "text-sm")}>{message}</p>
    </div>
  );
}

/* ──── KpiCard ──── */
function KpiCard({
  title, value, icon: Icon, accent, onClick, sparkline,
}: {
  title: string; value: number | string; icon: React.ElementType;
  accent?: "success" | "warning" | "danger"; onClick?: () => void; sparkline?: number[];
}) {
  const accentMap = {
    success: { text: "text-sink-mint-3", icon: "text-sink-mint", bg: "bg-sink-mint/10" },
    warning: { text: "text-[#F3B84A]", icon: "text-sink-warn", bg: "bg-sink-warn/10" },
    danger: { text: "text-sink-danger", icon: "text-sink-danger", bg: "bg-sink-danger/10" },
  };
  const a = accent ? accentMap[accent] : null;
  const strokeColor = accent === "success" ? "#2BD49C" : accent === "warning" ? "#F3B84A" : accent === "danger" ? "#E26B5A" : "#2BD49C";

  return (
    <SinkCard
      className={cn("flex flex-col items-center text-center gap-1 !p-4 transition-shadow", onClick && "hover:shadow-sink-md")}
      onClick={onClick}
    >
      <div className={cn("h-8 w-8 rounded-sink-md flex items-center justify-center mb-0.5", a ? a.bg : "bg-sink-mint/10")}>
        <Icon className={cn("h-4 w-4", a ? a.icon : "text-sink-mint")} />
      </div>
      <span className={cn("font-sans text-xl font-bold tabular-nums leading-none", a ? a.text : "text-sink-ink")}>{value}</span>
      <span className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">{title}</span>
      {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={strokeColor} />}
    </SinkCard>
  );
}

/* ──── CrmMetricCard ──── */
function CrmMetricCard({
  label, value, sub, icon: Icon, valueClass, onClick,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  valueClass?: string; onClick?: () => void;
}) {
  return (
    <SinkCard
      className="cursor-pointer hover:shadow-sink-md transition-shadow group !p-4"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-sink-mint" />
          </div>
          <span className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">{label}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-transparent group-hover:text-sink-ink/40 transition-colors" />
      </div>
      <p className={cn("font-sans text-xl font-bold tabular-nums text-sink-ink", valueClass)}>{value}</p>
      <p className="font-mono text-[11px] text-sink-ink/50">{sub}</p>
    </SinkCard>
  );
}

/* ──── Sparkline ──── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 72;
  const h = 20;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const fillPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="mt-1 opacity-60" viewBox={`0 0 ${w} ${h}`}>
      <polygon points={fillPoints} fill={color} opacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ──── MetricBlock ──── */
function MetricBlock({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={cn("font-sans text-lg font-bold tabular-nums text-sink-ink", valueClass)}>{value}</p>
    </div>
  );
}

/* ──── MonitorCard ──── */
function MonitorCard({
  title, icon: Icon, mainValue, mainSuffix, onClick, alert, sparkline, sparkColor, children,
}: {
  title: string; icon: React.ElementType; mainValue: number; mainSuffix?: string;
  onClick?: () => void; alert?: string; sparkline?: number[]; sparkColor?: string; children: React.ReactNode;
}) {
  return (
    <SinkCard
      className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-sink-md")}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-sink-md bg-sink-mint/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-sink-mint" />
        </div>
        <span className="font-mono text-[11px] text-sink-ink/50 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="flex items-center gap-3">
          <span className="font-sans text-xl font-bold tabular-nums text-sink-ink">{mainValue}</span>
          {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={sparkColor || "#2BD49C"} />}
        </div>
        {mainSuffix && <span className="font-mono text-[11px] text-sink-ink/50">{mainSuffix}</span>}
      </div>
      {alert && (
        <div className="flex items-center gap-1.5 font-sans text-[11px] text-sink-danger font-medium mb-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {alert}
        </div>
      )}
      {children}
    </SinkCard>
  );
}

/* ──── StatusDot ──── */
function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-sink-ink">
      <span className={cn("h-2 w-2 rounded-sink-pill shrink-0", color)} />
      {label}
    </span>
  );
}

/* ──── HeroKpiClean ──── */
function HeroKpiClean({
  label, value, sub, trend, sparkline, gaugeValue, gaugeLabel, gaugeMain, variant = "line",
}: {
  label: string;
  value: string;
  sub: string;
  trend: number;
  sparkline?: number[];
  gaugeValue?: number;
  gaugeLabel?: string;
  gaugeMain?: string;
  variant?: "line" | "gauge" | "bare";
}) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const TrendIcon = isFlat ? ArrowRight : isUp ? ArrowUp : ArrowDown;

  return (
    <div className="bg-sink-paper border border-sink-fog rounded-sink-lg p-5 space-y-4 hover:border-sink-ink/20 transition-colors">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-widest text-sink-ink/50 uppercase">{label}</p>
        {!isFlat && (
          <div className={cn(
            "flex items-center gap-0.5 font-mono text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-sink-sm",
            isUp ? "bg-sink-mint/10 text-sink-mint-3" : "bg-sink-danger/10 text-sink-danger"
          )}>
            <TrendIcon className="h-2.5 w-2.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-3 min-h-[58px]">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-sans font-bold text-[28px] tabular-nums text-sink-ink leading-none tracking-tight">{value}</p>
          <p className="font-mono text-[11px] text-sink-ink/50 leading-snug">{sub}</p>
        </div>
        {variant === "line" && sparkline && (
          <div className="shrink-0 self-end">
            <SparklineLarge data={sparkline} positive={isUp || isFlat} />
          </div>
        )}
        {variant === "gauge" && typeof gaugeValue === "number" && (
          <div className="shrink-0 self-end relative">
            <GaugeArc value={gaugeValue} />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0.5">
              {gaugeMain && <span className="font-sans font-semibold text-[12px] text-sink-ink tabular-nums leading-none">{gaugeMain}</span>}
              {gaugeLabel && <span className="font-mono text-[8px] uppercase tracking-widest text-sink-ink/50 mt-0.5">{gaugeLabel}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──── SparklineLarge ──── */
function SparklineLarge({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const w = 96;
  const h = 36;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`);
  const polyline = points.join(" ");
  const areaPath = `M 0,${h} L ${points.join(" L ")} L ${w},${h} Z`;
  const stroke = positive ? "#07232A" : "#E26B5A";
  const lastPoint = points[points.length - 1]?.split(",").map(Number);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={areaPath} fill={stroke} opacity="0.05" />
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2" fill={stroke} opacity="0.7" />
      )}
    </svg>
  );
}

/* ──── GaugeArc ──── */
function GaugeArc({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const r = 30;
  const cx = 38;
  const cy = 38;
  const circ = Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width="76" height="50" viewBox="0 0 76 50">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#D9E3DF"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#2BD49C"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
    </svg>
  );
}

/* ──── TrendRow ──── */
function TrendRow({
  label, value, trend, sparkline,
}: {
  label: string; value: number; trend: number; sparkline: number[];
}) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const TrendIcon = isFlat ? ArrowRight : isUp ? ArrowUp : ArrowDown;
  const trendColor = isFlat ? "text-sink-ink/40" : isUp ? "text-sink-mint-3" : "text-sink-danger";
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-sink-md hover:bg-sink-cream transition-colors">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[12px] text-sink-ink font-medium leading-tight">{label}</p>
        <div className={cn("flex items-center gap-0.5 font-mono text-[10px] font-medium tabular-nums mt-1", trendColor)}>
          <TrendIcon className="h-2.5 w-2.5" />
          {isFlat ? "estável" : `${Math.abs(trend)}%`}
        </div>
      </div>
      <div className="shrink-0 opacity-80">
        <SparklineLarge data={sparkline} positive={isUp || isFlat} />
      </div>
      <span className="font-sans font-bold text-[15px] tabular-nums text-sink-ink w-14 text-right tracking-tight">{value}</span>
    </div>
  );
}
