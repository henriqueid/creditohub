import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    { label: "Rascunho", value: drafts, color: "bg-muted-foreground/40", dotColor: "bg-muted-foreground", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-status-committee", dotColor: "bg-status-committee", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-status-approved", dotColor: "bg-status-approved", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Restrição", value: approvedRestricted, color: "bg-status-restricted", dotColor: "bg-status-restricted", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-status-rejected", dotColor: "bg-status-rejected", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  const frequencyLabel: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  const scoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 700) return "text-status-approved";
    if (score >= 400) return "text-status-committee";
    return "text-status-rejected";
  };

  const scoreBg = (score: number | null) => {
    if (!score) return "bg-muted";
    if (score >= 700) return "bg-status-approved/8 border-status-approved/20";
    if (score >= 400) return "bg-status-committee/8 border-status-committee/20";
    return "bg-status-rejected/8 border-status-rejected/20";
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
    { label: "Cedentes", value: clientCount, color: "bg-muted-foreground/40" },
    { label: "Análises", value: total, color: "bg-primary" },
    { label: "Em Comitê", value: inCommittee + approved + rejected, color: "bg-status-committee" },
    { label: "Aprovadas", value: approved, color: "bg-status-approved" },
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

  const statusDots: Record<string, string> = { good: "bg-status-approved", warning: "bg-status-committee", danger: "bg-status-rejected" };
  const statusLabels: Record<string, string> = { good: "Saudável", warning: "Atenção", danger: "Crítico" };

  const [activeTab, setActiveTab] = useState<"overview" | "credit" | "crm" | "monitoring">("overview");

  // Accent colors per área (semantic tokens via index.css)
  const areaAccents = {
    credit:     { bar: "bg-primary",            soft: "bg-primary/8",            text: "text-primary",            border: "border-primary/20",            label: "Esteira de Crédito" },
    crm:        { bar: "bg-status-approved",    soft: "bg-status-approved/8",    text: "text-status-approved",    border: "border-status-approved/20",    label: "CRM Comercial" },
    monitoring: { bar: "bg-status-committee",   soft: "bg-status-committee/8",   text: "text-status-committee",   border: "border-status-committee/20",   label: "Monitoramento" },
  } as const;

  const monthLabel = now.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase().replace(".", "");
  const updatedLabel = "agora há pouco";

  return (
    <div className="p-6 lg:p-10 space-y-8 overflow-auto max-w-[1440px] mx-auto">
      {/* Header — refinado */}
      <div className="flex items-end justify-between flex-wrap gap-6 pb-1">
        <div className="space-y-1.5">
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-none">Painel inicial</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.14em] font-medium">
            Atualizado {updatedLabel} · {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector inline */}
          <div className="flex items-center gap-px bg-muted/60 rounded-md p-0.5">
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
                  "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
                  periodDays === opt.days
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-border" />
          <button
            onClick={() => navigate("/analises/nova")}
            className="px-3 py-1.5 text-[12px] font-medium rounded-md border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            Exportar
          </button>
          <button
            onClick={() => navigate("/analises/nova")}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Nova análise
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
          <TabsTrigger value="credit" className="text-xs data-[state=active]:text-primary">Crédito</TabsTrigger>
          <TabsTrigger value="crm" className="text-xs data-[state=active]:text-status-approved">CRM</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs data-[state=active]:text-status-committee">Monitoramento</TabsTrigger>
        </TabsList>

        {/* ─────────── VISÃO GERAL — refinada ─────────── */}
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
            {/* Funil — design refinado, claro com barras de proporção */}
            <Card className="lg:col-span-2 border-border/70">
              <CardHeader className="pb-4 flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-[13px] font-semibold text-foreground">Funil de conversão</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Esteira de crédito · período atual</p>
                </div>
                <button onClick={() => navigate("/performance")} className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
                  Ver detalhes <ArrowUpRight className="h-3 w-3" />
                </button>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-4 gap-3">
                  {(() => {
                    const steps = [
                      { label: "Cedentes", value: clientCount, pct: 100, accent: "neutral" as const },
                      { label: "Análises", value: total, pct: clientCount > 0 ? Math.round((total / clientCount) * 100) : 0, accent: "primary" as const },
                      { label: "Em Comitê", value: inCommittee + approved + rejected, pct: total > 0 ? Math.round(((inCommittee + approved + rejected) / total) * 100) : 0, accent: "warning" as const },
                      { label: "Aprovadas", value: approved, pct: total > 0 ? Math.round((approved / total) * 100) : 0, accent: "success" as const },
                    ];
                    const accentMap = {
                      neutral: { bar: "bg-muted-foreground/40", text: "text-muted-foreground", val: "text-foreground" },
                      primary: { bar: "bg-primary", text: "text-primary", val: "text-foreground" },
                      warning: { bar: "bg-status-committee", text: "text-status-committee", val: "text-foreground" },
                      success: { bar: "bg-status-approved", text: "text-status-approved", val: "text-status-approved" },
                    };
                    return steps.map((step, i) => {
                      const a = accentMap[step.accent];
                      return (
                        <div key={step.label} className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground">{step.label}</span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">{step.pct}%</span>
                          </div>
                          <p className={cn("text-[26px] font-semibold tabular-nums leading-none tracking-tight", a.val)}>{step.value}</p>
                          <div className="h-[3px] rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-700", a.bar)} style={{ width: `${Math.max(step.pct, 4)}%` }} />
                          </div>
                          {i < steps.length - 1 && (
                            <p className="text-[10px] text-muted-foreground/70 tabular-nums">
                              → {steps[i + 1].value > 0 && step.value > 0 ? Math.round((steps[i + 1].value / step.value) * 100) : 0}% conversão
                            </p>
                          )}
                          {i === steps.length - 1 && <p className="text-[10px] text-muted-foreground/70">&nbsp;</p>}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex items-center justify-between gap-4 text-[11px] pt-4 border-t border-border/70">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Tempo médio</span>
                    <span className="font-semibold text-foreground tabular-nums">4,2 d</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-status-committee" />
                    <span className="text-muted-foreground">Gargalo</span>
                    <span className="font-semibold text-foreground">Comitê <span className="text-muted-foreground tabular-nums">(2,1d)</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-3 w-3 text-status-rejected" />
                    <span className="text-muted-foreground">Estagnadas &gt; 7d</span>
                    <span className="font-semibold text-foreground tabular-nums">{drafts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tendências — refinada */}
            <Card className="border-border/70">
              <CardHeader className="pb-4 flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-[13px] font-semibold text-foreground">Tendências</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Evolução · 30 dias</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 -mx-2">
                <TrendRow label="Análises iniciadas" value={total} trend={analysesTrend} sparkline={sparkAnalyses} />
                <TrendRow label="Aprovações" value={approved} trend={approvedTrend} sparkline={sparkApproved} />
                <TrendRow label="NFs monitoradas" value={fInvoices.length} trend={invoicesTrend} sparkline={sparkInvoices} />
              </CardContent>
            </Card>
          </div>

          {/* Top 5 cedentes — refinada */}
          <Card className="border-border/70">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-[13px] font-semibold text-foreground">Top cedentes</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Por volume aprovado no período</p>
              </div>
              <button onClick={() => navigate("/cedentes")} className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="px-0 pb-1">
              {topClients.length === 0 ? (
                <div className="px-6"><EmptyState message="Sem cedentes para ranquear no período" /></div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground border-b border-border/70">
                      <th className="text-left font-medium px-6 py-2.5 w-[8%]">#</th>
                      <th className="text-left font-medium py-2.5">Cedente</th>
                      <th className="text-left font-medium py-2.5">CNPJ</th>
                      <th className="text-right font-medium py-2.5">Volume aprovado</th>
                      <th className="text-right font-medium py-2.5">Score</th>
                      <th className="text-right font-medium px-6 py-2.5">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((c, idx) => {
                      const cedente = fAnalyses.find(a => (a.clients as any)?.razao_social === c.name);
                      const cnpj = (cedente?.clients as any)?.cnpj_cpf || "—";
                      const score = cedente?.credit_score || 0;
                      const tier = score >= 800 ? "AAA" : score >= 700 ? "AA" : score >= 600 ? "A" : "B";
                      const tierColor = score >= 700 ? "bg-status-approved/12 text-status-approved" : score >= 600 ? "bg-status-committee/15 text-status-committee" : "bg-muted text-muted-foreground";
                      return (
                        <tr key={c.name} className="border-b border-border/40 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={() => navigate("/cedentes")}>
                          <td className="px-6 py-3.5 text-[11px] text-muted-foreground tabular-nums font-medium">{String(idx + 1).padStart(2, "0")}</td>
                          <td className="py-3.5 text-[13px] text-foreground font-medium">{c.name}</td>
                          <td className="py-3.5 text-[12px] text-muted-foreground font-mono tabular-nums">{cnpj}</td>
                          <td className="py-3.5 text-[13px] text-foreground tabular-nums text-right font-semibold">{formatBRL(c.total)}</td>
                          <td className="py-3.5 text-[13px] text-foreground tabular-nums text-right">{score || "—"}</td>
                          <td className="px-6 py-3.5 text-right">
                            <span className={cn("inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums", tierColor)}>
                              {tier}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
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
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <MetricBlock label="Vol. Sugerido" value={formatBRL(totalLimiteSugerido)} />
                  <MetricBlock label="Vol. Aprovado" value={formatBRL(totalLimiteAprovado)} valueClass="text-status-approved" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Taxa de Aprovação</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{approvalRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-status-approved transition-all duration-500" style={{ width: `${approvalRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {total > 0 ? (
                  <>
                    <div className="h-4 rounded-full bg-muted overflow-hidden flex mb-4">
                      {statusData.filter(s => s.pct > 0).map((s) => (
                        <div
                          key={s.label}
                          className={cn("h-full first:rounded-l-full last:rounded-r-full transition-all duration-500", s.color)}
                          style={{ width: `${s.pct}%` }}
                          title={`${s.label}: ${s.value}`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {statusData.map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.dotColor)} />
                          <div>
                            <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                            <p className="text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="Nenhuma análise para exibir distribuição" />
                )}
              </CardContent>
            </Card>
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
              icon={CheckCircle} valueClass="text-status-approved"
              onClick={() => navigate("/crm/dashboard")}
            />
            <CrmMetricCard
              label="Tarefas" value={String(pendingTasks)} sub={overdueTasks > 0 ? `${overdueTasks} vencida(s)` : "pendente(s)"}
              icon={CheckSquare}
              valueClass={overdueTasks > 0 ? "text-status-rejected" : undefined}
              onClick={() => navigate("/crm/tarefas")}
            />
            <Card className="cursor-pointer hover:shadow-sm transition-shadow group" onClick={() => navigate("/crm/atividades")}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Atividades</span>
                  <ChevronRight className="h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground transition-colors ml-auto" />
                </div>
                {recentActivities.length > 0 ? (() => {
                  const userName = currentProfile?.full_name?.toLowerCase() || "";
                  const myActs = userName ? recentActivities.filter(a => a.created_by?.toLowerCase() === userName) : [];
                  const othersActs = userName ? recentActivities.filter(a => a.created_by?.toLowerCase() !== userName) : recentActivities;
                  return (
                    <div className="space-y-2">
                      {myActs.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-medium text-primary flex items-center gap-1"><User className="h-2.5 w-2.5" />Minhas ({myActs.length})</span>
                          {myActs.slice(0, 2).map(act => (
                            <div key={act.id} className="flex items-center gap-2 min-w-0 pl-3">
                              <span className="text-[10px] text-muted-foreground shrink-0 w-14 tabular-nums">{formatDate(act.activity_date)}</span>
                              <span className="text-[11px] text-foreground truncate">{act.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {othersActs.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Handshake className="h-2.5 w-2.5" />Equipe ({othersActs.length})</span>
                          {othersActs.slice(0, 2).map(act => (
                            <div key={act.id} className="flex items-center gap-2 min-w-0 pl-3">
                              <span className="text-[10px] text-muted-foreground shrink-0 w-14 tabular-nums">{formatDate(act.activity_date)}</span>
                              <span className="text-[11px] text-foreground truncate">{act.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <EmptyState message="Nenhuma atividade recente" small />
                )}
              </CardContent>
            </Card>
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
              sparkline={sparkInvoices} sparkColor="hsl(var(--status-approved))"
            >
              <div className="flex gap-3 flex-wrap">
                <StatusDot color="bg-status-approved" label={`${invoiceValid} válidas`} />
                <StatusDot color="bg-status-rejected" label={`${invoiceInvalid} inválidas`} />
                <StatusDot color="bg-muted-foreground" label={`${invoicePending} pendentes`} />
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
                      <div key={g.id} className="rounded-md border border-border p-2 space-y-1 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CircleDot className={cn("h-2.5 w-2.5 shrink-0", g.is_active ? "text-status-approved" : "text-muted-foreground/40")} />
                            <span className="truncate text-[11px] font-medium text-foreground">{g.name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{frequencyLabel[g.frequency] || g.frequency}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{grpClients} cedente(s)</span>
                          {g.concentracao_maxima != null && <span>Conc. {g.concentracao_maxima}%</span>}
                          {g.limiar_variacao != null && <span>Var. {g.limiar_variacao}%</span>}
                        </div>
                      </div>
                    );
                  })}
                  {monitoringGroups.length > 3 && <p className="text-[10px] text-muted-foreground">+{monitoringGroups.length - 3} grupo(s)</p>}
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
                <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {bankruptcyMatched} coincidência(s) na carteira
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle className="h-3 w-3 shrink-0 text-status-approved" />
                  Sem coincidências
                </div>
              )}
            </MonitorCard>

            <MonitorCard
              title="Blacklist" icon={ShieldBan}
              mainValue={blacklistCount} mainSuffix="bloqueado(s)"
              onClick={() => navigate("/blacklist")}
              alert={newBlacklistCount > 0 ? `${newBlacklistCount} novo(s) em 7 dias` : undefined}
              sparkline={sparkBlacklist} sparkColor="hsl(var(--status-rejected))"
            >
              {fBlacklist.length > 0 ? (
                <div className="space-y-1.5">
                  {fBlacklist.slice(0, 3).map(b => (
                    <div key={b.id} className="rounded-md border border-border px-2.5 py-1.5 bg-muted/30">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-[11px] text-foreground truncate">{b.documento}</span>
                        <span className={cn(
                          "text-[9px] uppercase shrink-0 ml-2 font-semibold rounded px-1.5 py-0.5",
                          b.tipo === "CNPJ" ? "bg-status-rejected/8 text-status-rejected" : "bg-status-committee/8 text-status-committee"
                        )}>{b.tipo}</span>
                      </div>
                      {b.motivo && <p className="text-[10px] text-muted-foreground truncate">{b.motivo}</p>}
                    </div>
                  ))}
                  {blacklistCount > 3 && <p className="text-[10px] text-muted-foreground text-center">+{blacklistCount - 3} registro(s)</p>}
                </div>
              ) : (
                <EmptyState message="Nenhum registro" small />
              )}
            </MonitorCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ──── Sub-components ──── */

function AreaHeader({
  accent, subtitle, linkLabel, onLink,
}: {
  accent: { bar: string; soft: string; text: string; border: string; label: string };
  subtitle: string; linkLabel?: string; onLink?: () => void;
}) {
  return (
    <div className={cn("flex items-center justify-between rounded-md border px-4 py-2.5", accent.border, accent.soft)}>
      <div className="flex items-center gap-3">
        <div className={cn("h-6 w-1 rounded-full", accent.bar)} />
        <div>
          <h2 className={cn("text-sm font-semibold", accent.text)}>{accent.label}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {linkLabel && onLink && (
        <button onClick={onLink} className={cn("text-xs hover:underline flex items-center gap-0.5 font-medium", accent.text)}>
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function RecentAnalysesCard({
  recentAnalyses, now, navigate, scoreBg, scoreColor,
}: {
  recentAnalyses: any[]; now: Date;
  navigate: (path: string) => void;
  scoreBg: (s: number | null) => string;
  scoreColor: (s: number | null) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Análises Recentes
          </CardTitle>
          <button className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium" onClick={() => navigate("/analises")}>
            Ver todas <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {recentAnalyses.length === 0 ? (
          <EmptyState message="Nenhuma análise encontrada. Comece criando uma nova análise de crédito." />
        ) : (
          <div className="space-y-1">
            {recentAnalyses.map((a) => {
              const client = a.clients as any;
              const daysAgo = Math.floor((now.getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
              const daysLabel = daysAgo === 0 ? "Hoje" : daysAgo === 1 ? "Ontem" : `${daysAgo}d atrás`;
              const recLabel: Record<string, { text: string; cls: string }> = {
                approve: { text: "Aprovar", cls: "text-status-approved" },
                restrict: { text: "Restringir", cls: "text-status-committee" },
                reject: { text: "Rejeitar", cls: "text-status-rejected" },
              };
              const rec = a.recommendation ? recLabel[a.recommendation] : null;

              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-3 px-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/analises/${a.id}`)}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={cn("h-10 w-10 rounded-md flex items-center justify-center text-xs font-semibold border", scoreBg(a.credit_score))}>
                      <span className={scoreColor(a.credit_score)}>{a.credit_score || "—"}</span>
                    </div>
                    {a.credit_score && (
                      <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", a.credit_score >= 700 ? "bg-status-approved" : a.credit_score >= 400 ? "bg-status-committee" : "bg-status-rejected")}
                          style={{ width: `${Math.min((a.credit_score / 1000) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{client?.razao_social || "—"}</p>
                      <StatusBadge status={a.status} />
                      {rec && <span className={cn("text-[10px] font-medium", rec.cls)}>• {rec.text}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      {client?.cnpj_cpf && <span className="flex items-center gap-0.5 font-mono"><Hash className="h-2.5 w-2.5" />{client.cnpj_cpf}</span>}
                      {a.analista_credito && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{a.analista_credito}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{daysLabel}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}</p>
                    {a.faturamento_medio && <p className="text-[10px] text-muted-foreground tabular-nums">Fat. {formatBRL(a.faturamento_medio)}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-transparent group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──── Sub-components ──── */

function SectionWrapper({
  title, subtitle, linkLabel, onLink, children,
}: {
  title: string; subtitle: string;
  linkLabel?: string; onLink?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {linkLabel && onLink && (
          <button onClick={onLink} className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium">
            {linkLabel} <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message, small }: { message: string; small?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", small ? "py-3" : "py-8")}>
      <div className={cn("rounded-md bg-muted flex items-center justify-center mb-2", small ? "h-8 w-8" : "h-12 w-12")}>
        <BarChart3 className={cn("text-muted-foreground/50", small ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <p className={cn("text-muted-foreground", small ? "text-[11px]" : "text-sm")}>{message}</p>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, accent, onClick, sparkline,
}: {
  title: string; value: number | string; icon: React.ElementType;
  accent?: "success" | "warning" | "danger"; onClick?: () => void; sparkline?: number[];
}) {
  const accentMap = { success: "text-status-approved", warning: "text-status-committee", danger: "text-status-rejected" };
  const strokeMap: Record<string, string> = { success: "hsl(var(--status-approved))", warning: "hsl(var(--status-committee))", danger: "hsl(var(--status-rejected))" };
  const color = accent ? accentMap[accent] : "text-foreground";
  const strokeColor = accent ? strokeMap[accent] : "hsl(var(--primary))";

  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-sm")} onClick={onClick}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center mb-0.5">
          <Icon className={cn("h-4 w-4", accent ? accentMap[accent] : "text-muted-foreground")} />
        </div>
        <span className={cn("text-xl font-semibold tabular-nums leading-none", color)}>{value}</span>
        <span className="text-[11px] text-muted-foreground font-medium">{title}</span>
        {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={strokeColor} />}
      </CardContent>
    </Card>
  );
}

function CrmMetricCard({
  label, value, sub, icon: Icon, valueClass, onClick,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  valueClass?: string; onClick?: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow group" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground transition-colors" />
        </div>
        <div>
          <p className={cn("text-xl font-semibold tabular-nums text-foreground", valueClass)}>{value}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 72;
  const h = 20;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const fillPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="mt-1 opacity-50" viewBox={`0 0 ${w} ${h}`}>
      <polygon points={fillPoints} fill={color} opacity="0.1" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricBlock({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums text-foreground", valueClass)}>{value}</p>
    </div>
  );
}

function MonitorCard({
  title, icon: Icon, mainValue, mainSuffix, onClick, alert, sparkline, sparkColor, children,
}: {
  title: string; icon: React.ElementType; mainValue: number; mainSuffix?: string;
  onClick?: () => void; alert?: string; sparkline?: number[]; sparkColor?: string; children: React.ReactNode;
}) {
  return (
    <Card className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-sm")} onClick={onClick}>
      <CardHeader className="pb-1.5 pt-4 px-4">
        <CardTitle className="text-xs flex items-center gap-2 font-medium text-foreground">
          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tabular-nums text-foreground">{mainValue}</span>
            {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={sparkColor || "hsl(var(--primary))"} />}
          </div>
          {mainSuffix && <span className="text-[11px] text-muted-foreground">{mainSuffix}</span>}
        </div>
        {alert && (
          <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {alert}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function HeroKpi({
  label, value, sub, icon: Icon, accent = "neutral", gauge,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  accent?: "primary" | "success" | "warning" | "danger" | "neutral";
  gauge?: number;
}) {
  const accentMap = {
    primary: { text: "text-primary", bar: "bg-primary", soft: "bg-primary/10" },
    success: { text: "text-status-approved", bar: "bg-status-approved", soft: "bg-status-approved/10" },
    warning: { text: "text-status-committee", bar: "bg-status-committee", soft: "bg-status-committee/10" },
    danger: { text: "text-status-rejected", bar: "bg-status-rejected", soft: "bg-status-rejected/10" },
    neutral: { text: "text-foreground", bar: "bg-muted-foreground", soft: "bg-muted" },
  };
  const a = accentMap[accent];
  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1 w-full", a.bar)} />
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", a.soft)}>
            <Icon className={cn("h-3.5 w-3.5", a.text)} />
          </div>
        </div>
        <div>
          <p className={cn("text-2xl font-semibold tabular-nums leading-tight", a.text)}>{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{sub}</p>
        </div>
        {typeof gauge === "number" && (
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full transition-all duration-700", a.bar)} style={{ width: `${Math.min(Math.max(gauge, 0), 100)}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendCard({
  title, icon: Icon, current, previous, trend, sparkline, color, positiveIsGood,
}: {
  title: string; icon: React.ElementType;
  current: number; previous: number; trend: number;
  sparkline: number[]; color: string; positiveIsGood?: boolean;
}) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const goodTrend = positiveIsGood ? isUp : false;
  const trendColor = isFlat
    ? "text-muted-foreground"
    : goodTrend || (positiveIsGood && isUp)
      ? "text-status-approved"
      : !positiveIsGood && !isUp
        ? "text-muted-foreground"
        : isUp
          ? "text-status-approved"
          : "text-status-rejected";
  const TrendIcon = isFlat ? ArrowRight : isUp ? ArrowUp : ArrowDown;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-foreground">{title}</span>
          </div>
          <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground leading-none">{current}</p>
            <p className="text-[10px] text-muted-foreground mt-1">vs {previous} no período anterior</p>
          </div>
          <div className="shrink-0">
            <Sparkline data={sparkline} color={color} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
      <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
      {label}
    </span>
  );
}

/* ──── Hero KPI estilo "Tracto" — limpo, com sparkline ou gauge ──── */
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
  const trendColor = isFlat ? "text-muted-foreground" : isUp ? "text-status-approved" : "text-status-rejected";

  return (
    <Card className="border-border/70 hover:border-border transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
          {!isFlat && (
            <div className={cn("flex items-center gap-0.5 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded",
              isUp ? "bg-status-approved/8 text-status-approved" : "bg-status-rejected/8 text-status-rejected"
            )}>
              <TrendIcon className="h-2.5 w-2.5" />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 min-h-[58px]">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[28px] font-semibold tabular-nums text-foreground leading-none tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{sub}</p>
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
                {gaugeMain && <span className="text-[12px] font-semibold text-foreground tabular-nums leading-none">{gaugeMain}</span>}
                {gaugeLabel && <span className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">{gaugeLabel}</span>}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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
  const stroke = positive ? "hsl(var(--foreground))" : "hsl(var(--status-rejected))";
  const lastPoint = points[points.length - 1]?.split(",").map(Number);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={areaPath} fill={stroke} opacity="0.04" />
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {lastPoint && (
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2" fill={stroke} />
      )}
    </svg>
  );
}

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
        stroke="hsl(var(--muted))"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="hsl(var(--status-approved))"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
    </svg>
  );
}

function TrendRow({
  label, value, trend, sparkline,
}: {
  label: string; value: number; trend: number; sparkline: number[];
}) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const TrendIcon = isFlat ? ArrowRight : isUp ? ArrowUp : ArrowDown;
  const trendColor = isFlat ? "text-muted-foreground" : isUp ? "text-status-approved" : "text-status-rejected";
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-foreground font-medium leading-tight">{label}</p>
        <div className={cn("flex items-center gap-0.5 text-[10px] font-medium tabular-nums mt-1", trendColor)}>
          <TrendIcon className="h-2.5 w-2.5" />
          {isFlat ? "estável" : `${Math.abs(trend)}%`}
        </div>
      </div>
      <div className="shrink-0 opacity-80">
        <SparklineLarge data={sparkline} positive={isUp || isFlat} />
      </div>
      <span className="text-[15px] font-semibold tabular-nums text-foreground w-14 text-right tracking-tight">{value}</span>
    </div>
  );
}
