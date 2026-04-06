import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart,
  Layers, Activity, ArrowRight, Calendar, User, Hash, ArrowUpRight,
  Gauge, CircleDot, ChevronRight, Zap, Filter, Handshake, Target,
  CheckSquare, MessageSquare, ArrowUp, ArrowDown, Sparkles, Eye,
  CreditCard, Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

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

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date, created_at, clients(razao_social)")
        .order("activity_date", { ascending: false })
        .limit(5);
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
    if (score >= 700) return "bg-status-approved/10 border-status-approved/30";
    if (score >= 400) return "bg-status-committee/10 border-status-committee/30";
    return "bg-status-rejected/10 border-status-rejected/30";
  };

  const creditHealth = inCommittee === 0 && drafts <= 2 ? "good" : inCommittee > 3 || drafts > 5 ? "danger" : "warning";
  const crmHealth = overdueTasks === 0 ? "good" : overdueTasks > 3 ? "danger" : "warning";
  const monitorHealth = invoiceInvalid === 0 && bankruptcyMatched === 0 ? "good" : invoiceInvalid > 5 || bankruptcyMatched > 2 ? "danger" : "warning";

  const sparkCredit = buildWeeklySparkline(fAnalyses);
  const sparkCrm = buildWeeklySparkline(crmTasks);
  const sparkMonitor = buildWeeklySparkline(fInvoices);

  const healthItems = [
    {
      label: "Esteira de Crédito",
      status: creditHealth,
      detail: creditHealth === "good" ? "Fluxo normal" : `${inCommittee} em comitê · ${drafts} rascunhos`,
      icon: CreditCard,
      sparkline: sparkCredit,
      sparkColor: "hsl(var(--muted-foreground))",
      href: "/analises",
    },
    {
      label: "CRM Comercial",
      status: crmHealth,
      detail: crmHealth === "good" ? "Sem atrasos" : `${overdueTasks} tarefa(s) vencida(s)`,
      icon: Handshake,
      sparkline: sparkCrm,
      sparkColor: "hsl(var(--muted-foreground))",
      href: "/crm/dashboard",
    },
    {
      label: "Monitoramento",
      status: monitorHealth,
      detail: monitorHealth === "good" ? "Sem alertas" : `${invoiceInvalid} NF inválida(s) · ${bankruptcyMatched} falimentar`,
      icon: Eye,
      sparkline: sparkMonitor,
      sparkColor: "hsl(var(--muted-foreground))",
      href: "/monitoramento-nfs",
    },
  ];

  const statusColors: Record<string, string> = { good: "text-status-approved", warning: "text-status-committee", danger: "text-status-rejected" };
  const statusDots: Record<string, string> = { good: "bg-status-approved", warning: "bg-status-committee", danger: "bg-status-rejected" };
  const statusLabels: Record<string, string> = { good: "Saudável", warning: "Atenção", danger: "Crítico" };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 overflow-auto max-w-[1600px] mx-auto">
      <motion.div className="flex items-end justify-between flex-wrap gap-4" {...fade(0)}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Painel Inicial</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-10">Visão consolidada — Crédito, Monitoramento e CRM</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/70 rounded-lg p-1 border border-border/50">
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
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                periodDays === opt.days
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div {...fade(0.05)} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {healthItems.map((item, idx) => (
          <motion.div
            key={item.label}
            onClick={() => navigate(item.href)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 + idx * 0.05 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="group relative rounded-lg border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3 cursor-pointer hover:border-border hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60 shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusDots[item.status])} />
                    <span className="text-[11px] text-muted-foreground">{statusLabels[item.status]}</span>
                    <span className="text-[10px] text-muted-foreground/70">· {item.detail}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Sparkline data={item.sparkline} color={item.sparkColor} />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div {...fade(0.1)}>
        <SectionWrapper
          title="Esteira de Crédito"
          subtitle="Análises, comitê e aprovações"
          accentColor="bg-primary"
          linkLabel="Ver análises"
          onLink={() => navigate("/analises")}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard title="Cedentes" value={clientCount} icon={Building2} onClick={() => navigate("/cedentes")} />
            <KpiCard title="Análises" value={total} icon={FileText} sparkline={sparkAnalyses} onClick={() => navigate("/analises")} />
            <KpiCard title="Comitê" value={inCommittee} icon={Clock} accent={inCommittee > 0 ? "warning" : undefined} sparkline={sparkCommittee} onClick={() => navigate("/comite")} />
            <KpiCard title="Aprovadas" value={approved} icon={CheckCircle} accent="success" sparkline={sparkApproved} onClick={() => navigate("/analises")} />
            <KpiCard title="Reprovadas" value={rejected} icon={XCircle} accent={rejected > 0 ? "danger" : undefined} sparkline={sparkRejected} onClick={() => navigate("/analises")} />
            <KpiCard title="Score Médio" value={avgScore || "N/A"} icon={Gauge} />
          </div>
        </SectionWrapper>
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" {...fade(0.15)}>
        <Card className="glass-card lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </div>
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
                <span className="text-sm font-bold tabular-nums text-foreground">{approvalRate.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-status-approved/80 to-status-approved"
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalRate}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              </div>
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {total > 0 ? (
              <>
                <div className="h-5 rounded-full bg-muted overflow-hidden flex mb-4">
                  {statusData.filter(s => s.pct > 0).map((s) => (
                    <motion.div
                      key={s.label}
                      className={cn("h-full first:rounded-l-full last:rounded-r-full", s.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      title={`${s.label}: ${s.value}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {statusData.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className={cn("h-3 w-3 rounded-full shrink-0", s.dotColor)} />
                      <div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
                        <p className="text-sm font-bold tabular-nums text-foreground">{s.value}</p>
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
      </motion.div>

      <motion.div {...fade(0.2)}>
        <SectionWrapper
          title="CRM Comercial"
          subtitle="Pipeline, tarefas e atividades"
          accentColor="bg-status-approved"
          linkLabel="Ver dashboard CRM"
          onLink={() => navigate("/crm/dashboard")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CrmMetricCard
              label="Pipeline" value={formatBRL(pipelineValue)} sub={`${activeDeals.length} oportunidade(s) ativa(s)`}
              icon={Target} iconBg="bg-primary/10" iconColor="text-primary"
              onClick={() => navigate("/crm/pipeline")}
            />
            <CrmMetricCard
              label="Ganhos" value={formatBRL(wonValue)} sub={`${wonDeals.length} deal(s) fechado(s)`}
              icon={CheckCircle} iconBg="bg-status-approved/10" iconColor="text-status-approved"
              valueClass="text-status-approved"
              onClick={() => navigate("/crm/dashboard")}
            />
            <CrmMetricCard
              label="Tarefas" value={String(pendingTasks)} sub={overdueTasks > 0 ? `${overdueTasks} vencida(s)` : "pendente(s)"}
              icon={CheckSquare}
              iconBg={overdueTasks > 0 ? "bg-status-rejected/10" : "bg-status-committee/10"}
              iconColor={overdueTasks > 0 ? "text-status-rejected" : "text-status-committee"}
              valueClass={overdueTasks > 0 ? "text-status-rejected" : undefined}
              onClick={() => navigate("/crm/tarefas")}
            />
            <Card className="glass-card cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group" onClick={() => navigate("/crm/atividades")}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-foreground/70" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Atividades</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all ml-auto" />
                </div>
                {recentActivities.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentActivities.slice(0, 3).map(act => (
                      <div key={act.id} className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground shrink-0 w-14 tabular-nums">
                          {formatDate(act.activity_date)}
                        </span>
                        <span className="text-[11px] text-foreground truncate">{act.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Nenhuma atividade recente" small />
                )}
              </CardContent>
            </Card>
          </div>
        </SectionWrapper>
      </motion.div>

      <motion.div {...fade(0.25)}>
        <SectionWrapper
          title="Monitoramento & Restrições"
          subtitle="NFs, falimentar, blacklist e grupos"
          accentColor="bg-status-committee"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <div key={g.id} className="rounded-lg border border-border/50 p-2 space-y-1 bg-background/50">
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
                    <div key={b.id} className="rounded-lg border border-border/50 px-2.5 py-1.5 bg-background/50">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-[11px] text-foreground truncate">{b.documento}</span>
                        <span className={cn(
                          "text-[9px] uppercase shrink-0 ml-2 font-bold rounded px-1.5 py-0.5",
                          b.tipo === "CNPJ" ? "bg-status-rejected/10 text-status-rejected" : "bg-status-committee/10 text-status-committee"
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
        </SectionWrapper>
      </motion.div>

      <motion.div {...fade(0.3)}>
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
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
              <div className="space-y-2">
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
                      className="flex items-center gap-3 py-3 px-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm cursor-pointer transition-all group"
                      onClick={() => navigate(`/analises/${a.id}`)}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold border", scoreBg(a.credit_score))}>
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
                          <p className="text-sm font-semibold text-foreground truncate">{client?.razao_social || "—"}</p>
                          <StatusBadge status={a.status} />
                          {rec && <span className={cn("text-[10px] font-semibold", rec.cls)}>• {rec.text}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          {client?.cnpj_cpf && <span className="flex items-center gap-0.5 font-mono"><Hash className="h-2.5 w-2.5" />{client.cnpj_cpf}</span>}
                          {a.analista_credito && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{a.analista_credito}</span>}
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{daysLabel}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        <p className="text-sm font-bold tabular-nums text-foreground">{a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}</p>
                        {a.faturamento_medio && <p className="text-[10px] text-muted-foreground tabular-nums">Fat. {formatBRL(a.faturamento_medio)}</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function SectionWrapper({
  title, subtitle, accentColor, linkLabel, onLink, children,
}: {
  title: string; subtitle: string; accentColor: string;
  linkLabel?: string; onLink?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-9 w-1.5 rounded-full", accentColor)} />
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {linkLabel && onLink && (
          <button onClick={onLink} className="text-[11px] text-primary hover:underline flex items-center gap-0.5 font-medium">
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
      <div className={cn("rounded-full bg-muted flex items-center justify-center mb-2", small ? "h-8 w-8" : "h-12 w-12")}>
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
    <Card className={cn("glass-card transition-all overflow-hidden group", onClick && "cursor-pointer hover:border-primary/30 hover:shadow-md")} onClick={onClick}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1 relative">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-0.5", accent ? `${accentMap[accent].replace("text-", "bg-")}/10` : "bg-muted")}>
          <Icon className={cn("h-4 w-4", accent ? accentMap[accent] : "text-muted-foreground")} />
        </div>
        <span className={cn("text-2xl font-bold tabular-nums leading-none", color)}>{value}</span>
        <span className="text-[11px] text-muted-foreground font-medium">{title}</span>
        {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={strokeColor} />}
      </CardContent>
    </Card>
  );
}

function CrmMetricCard({
  label, value, sub, icon: Icon, iconBg, iconColor, valueClass, onClick,
}: {
  label: string; value: string; sub: string; icon: React.ElementType;
  iconBg: string; iconColor: string; valueClass?: string; onClick?: () => void;
}) {
  return (
    <Card className="glass-card cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
        </div>
        <div>
          <p className={cn("text-xl font-bold tabular-nums text-foreground", valueClass)}>{value}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 24;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");
  const fillPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="mt-1 opacity-60" viewBox={`0 0 ${w} ${h}`}>
      <polygon points={fillPoints} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricBlock({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums text-foreground", valueClass)}>{value}</p>
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
    <Card className={cn("glass-card transition-all overflow-hidden", onClick && "cursor-pointer hover:border-primary/30 hover:shadow-md")} onClick={onClick}>
      <CardHeader className="pb-1.5 pt-4 px-4">
        <CardTitle className="text-xs flex items-center gap-2 font-semibold text-foreground">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-foreground">{mainValue}</span>
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

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
      <span className={cn("h-2 w-2 rounded-full shrink-0", color)} />
      {label}
    </span>
  );
}
