import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart,
  Layers, Activity, ArrowRight, Calendar, User, Hash, ArrowUpRight,
  Gauge, CircleDot, ChevronRight, Zap, Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodDays, setPeriodDays] = useState<number | null>(null); // null = all time

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
        .select("id, name, is_active, frequency, limiar_variacao, limiar_atraso_dias, concentracao_maxima, volume_minimo, alerta_email, alerta_sistema");
      return data || [];
    },
  });

  // Period filter
  const now = new Date();
  const cutoff = periodDays ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000) : null;
  const inPeriod = <T extends { created_at: string }>(items: T[]) =>
    cutoff ? items.filter(i => new Date(i.created_at) >= cutoff) : items;

  const fAnalyses = useMemo(() => inPeriod(analyses), [analyses, periodDays]);
  const fCommitteeResults = useMemo(() => inPeriod(committeeResults), [committeeResults, periodDays]);
  const fBlacklist = useMemo(() => inPeriod(blacklistEntries), [blacklistEntries, periodDays]);
  const fBankruptcy = useMemo(() => inPeriod(bankruptcyRecords), [bankruptcyRecords, periodDays]);
  const fInvoices = useMemo(() => inPeriod(invoices), [invoices, periodDays]);

  // Metrics (use filtered data)
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

  // Build sparkline data: count per week for last 8 weeks
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

  const alertItems: { text: string; href: string; icon: React.ElementType; severity: "high" | "medium" | "low" }[] = [];
  if (inCommittee > 0) alertItems.push({ text: `${inCommittee} análise(s) aguardando votação no comitê`, href: "/comite", icon: Clock, severity: "high" });
  if (invoiceInvalid > 0) alertItems.push({ text: `${invoiceInvalid} NF(s) com problemas de validação`, href: "/monitoramento-nfs", icon: FileBarChart, severity: "high" });
  if (bankruptcyMatched > 0) alertItems.push({ text: `${bankruptcyMatched} coincidência(s) falimentar(es) na carteira`, href: "/falimentar", icon: Scale, severity: "high" });
  if (newBlacklistCount > 0) alertItems.push({ text: `${newBlacklistCount} novo(s) bloqueio(s) na blacklist nos últimos 7 dias`, href: "/blacklist", icon: ShieldBan, severity: "medium" });
  if (drafts > 0) alertItems.push({ text: `${drafts} rascunho(s) de análise pendente(s)`, href: "/analises", icon: FileText, severity: "low" });

  const frequencyLabel: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  // Score color helper
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

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {/* Header */}
      <motion.div className="flex items-center justify-between flex-wrap gap-3" {...fade(0)}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Inicial</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada da plataforma de inteligência de crédito</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
          {([
            { label: "7 dias", days: 7 },
            { label: "30 dias", days: 30 },
            { label: "90 dias", days: 90 },
            { label: "Tudo", days: null },
          ] as const).map(opt => (
            <button
              key={opt.label}
              onClick={() => setPeriodDays(opt.days)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                periodDays === opt.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Alerts */}
      {alertItems.length > 0 && (
        <motion.div {...fade(0.05)}>
          <div className="rounded-lg border border-status-committee/30 bg-status-committee/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-status-committee" />
              <span className="text-xs font-semibold text-foreground">{alertItems.length} pendência(s) requerem atenção</span>
            </div>
            <div className="space-y-1">
              {alertItems.map((alert, i) => (
                <button
                  key={i}
                  onClick={() => navigate(alert.href)}
                  className={cn(
                    "w-full flex items-center gap-2 text-left text-xs py-1 px-2 rounded transition-colors group",
                    alert.severity === "high" ? "text-destructive hover:bg-destructive/10" :
                    alert.severity === "medium" ? "text-status-committee hover:bg-status-committee/10" :
                    "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <alert.icon className="h-3 w-3 shrink-0" />
                  <span className="flex-1">{alert.text}</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI strip */}
      <motion.div {...fade(0.1)}>
        <SectionHeader title="Esteira de Crédito" icon={Zap} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard title="Cedentes" value={clientCount} icon={Building2} onClick={() => navigate("/cedentes")} />
          <KpiCard title="Análises" value={total} icon={FileText} sparkline={sparkAnalyses} onClick={() => navigate("/analises")} />
          <KpiCard
            title="Comitê"
            value={inCommittee}
            icon={Clock}
            accent={inCommittee > 0 ? "warning" : undefined}
            sparkline={sparkCommittee}
            onClick={() => navigate("/comite")}
          />
          <KpiCard title="Aprovadas" value={approved} icon={CheckCircle} accent="success" sparkline={sparkApproved} onClick={() => navigate("/analises")} />
          <KpiCard title="Reprovadas" value={rejected} icon={XCircle} accent={rejected > 0 ? "danger" : undefined} sparkline={sparkRejected} onClick={() => navigate("/analises")} />
          <KpiCard title="Score Médio" value={avgScore || "—"} icon={Gauge} />
        </div>
      </motion.div>

      {/* Financial + Distribution */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-5 gap-4" {...fade(0.2)}>
        {/* Financial summary */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <DollarSign className="h-4 w-4 text-primary" /> Resumo Financeiro
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
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-status-approved"
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalRate}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-6 rounded-full bg-muted overflow-hidden flex mb-4">
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
          </CardContent>
        </Card>
      </motion.div>

      {/* Monitoring section */}
      <motion.div {...fade(0.3)}>
        <SectionHeader title="Monitoramento & Restrições" icon={Activity} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NFs */}
          <MonitorCard
            title="Monitoramento NFs"
            icon={FileBarChart}
            mainValue={invoices.length}
            mainSuffix={formatBRL(invoiceTotalValue)}
            onClick={() => navigate("/monitoramento-nfs")}
          >
            <div className="flex gap-3 flex-wrap">
              <StatusDot color="bg-status-approved" label={`${invoiceValid} válidas`} />
              <StatusDot color="bg-status-rejected" label={`${invoiceInvalid} inválidas`} />
              <StatusDot color="bg-muted-foreground" label={`${invoicePending} pendentes`} />
            </div>
          </MonitorCard>

          {/* Groups */}
          <MonitorCard
            title="Grupos de Monitoramento"
            icon={Layers}
            mainValue={monitoringGroups.length}
            mainSuffix={`${activeGroups} ativo(s)`}
            onClick={() => navigate("/monitoramento-nfs")}
          >
            {monitoringGroups.length > 0 ? (
              <div className="space-y-1.5">
                {monitoringGroups.slice(0, 3).map(g => (
                  <div key={g.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CircleDot className={cn("h-2.5 w-2.5 shrink-0", g.is_active ? "text-status-approved" : "text-muted-foreground/40")} />
                      <span className="truncate text-foreground">{g.name}</span>
                    </div>
                    <span className="text-muted-foreground shrink-0 ml-2">{frequencyLabel[g.frequency] || g.frequency}</span>
                  </div>
                ))}
                {monitoringGroups.length > 3 && <p className="text-[10px] text-muted-foreground">+{monitoringGroups.length - 3} grupo(s)</p>}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhum grupo criado</p>
            )}
          </MonitorCard>

          {/* Bankruptcy */}
          <MonitorCard
            title="Informe Falimentar"
            icon={Scale}
            mainValue={bankruptcyRecords.length}
            mainSuffix={`${bankruptcyActive} ativo(s)`}
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

          {/* Blacklist */}
          <MonitorCard
            title="Blacklist"
            icon={ShieldBan}
            mainValue={blacklistCount}
            mainSuffix="bloqueado(s)"
            onClick={() => navigate("/blacklist")}
            alert={newBlacklistCount > 0 ? `${newBlacklistCount} novo(s) em 7 dias` : undefined}
          >
            {blacklistEntries.length > 0 ? (
              <div className="space-y-1">
                {blacklistEntries.slice(0, 3).map(b => (
                  <div key={b.id} className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-foreground truncate">{b.documento}</span>
                    <span className="text-muted-foreground uppercase shrink-0 ml-2 text-[9px] font-semibold">{b.tipo}</span>
                  </div>
                ))}
                {blacklistCount > 3 && <p className="text-[10px] text-muted-foreground">+{blacklistCount - 3} registro(s)</p>}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Nenhum registro</p>
            )}
          </MonitorCard>
        </div>
      </motion.div>

      {/* Recent Analyses */}
      <motion.div {...fade(0.4)}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" /> Análises Recentes
              </CardTitle>
              <button
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
                onClick={() => navigate("/analises")}
              >
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma análise encontrada</p>
            ) : (
              <div className="space-y-2">
                {recentAnalyses.map((a) => {
                  const client = a.clients as any;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 py-3 px-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-accent/30 cursor-pointer transition-all group"
                      onClick={() => navigate(`/analises/${a.id}`)}
                    >
                      {/* Score */}
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border",
                        scoreBg(a.credit_score)
                      )}>
                        <span className={scoreColor(a.credit_score)}>{a.credit_score || "—"}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-foreground truncate">{client?.razao_social || "—"}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {client?.cnpj_cpf && (
                            <span className="flex items-center gap-0.5 font-mono">
                              <Hash className="h-2.5 w-2.5" />{client.cnpj_cpf}
                            </span>
                          )}
                          {a.analista_credito && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-2.5 w-2.5" />{a.analista_credito}
                            </span>
                          )}
                          {a.created_at && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />{formatDate(a.created_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Values */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums text-foreground">
                          {a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}
                        </p>
                        {a.faturamento_medio && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            Fat. {formatBRL(a.faturamento_medio)}
                          </p>
                        )}
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

/* ─── Sub-components ─── */

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function KpiCard({
  title, value, icon: Icon, accent, onClick, sparkline,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  accent?: "success" | "warning" | "danger";
  onClick?: () => void;
  sparkline?: number[];
}) {
  const accentMap = {
    success: "text-status-approved",
    warning: "text-status-committee",
    danger: "text-status-rejected",
  };
  const strokeMap: Record<string, string> = {
    success: "hsl(var(--status-approved))",
    warning: "hsl(var(--status-committee))",
    danger: "hsl(var(--status-rejected))",
  };
  const color = accent ? accentMap[accent] : "text-foreground";
  const strokeColor = accent ? strokeMap[accent] : "hsl(var(--primary))";

  return (
    <Card
      className={cn("glass-card transition-all overflow-hidden", onClick && "cursor-pointer hover:border-primary/30")}
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-1 relative">
        <Icon className={cn("h-5 w-5", accent ? accentMap[accent] : "text-muted-foreground")} />
        <span className={cn("text-2xl font-bold tabular-nums leading-none", color)}>{value}</span>
        <span className="text-[11px] text-muted-foreground font-medium">{title}</span>
        {sparkline && sparkline.some(v => v > 0) && <Sparkline data={sparkline} color={strokeColor} />}
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
  title, icon: Icon, mainValue, mainSuffix, onClick, alert, children,
}: {
  title: string;
  icon: React.ElementType;
  mainValue: number;
  mainSuffix?: string;
  onClick?: () => void;
  alert?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("glass-card transition-all", onClick && "cursor-pointer hover:border-primary/30")} onClick={onClick}>
      <CardHeader className="pb-1.5 pt-4 px-4">
        <CardTitle className="text-xs flex items-center gap-2 font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums text-foreground">{mainValue}</span>
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
