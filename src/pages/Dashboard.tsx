import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { Card } from "@/components/trilho/Card";
import { KPI } from "@/components/trilho/KPI";
import { SectionTitle } from "@/components/trilho/SectionTitle";
import { DataTable } from "@/components/trilho/DataTable";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { PageHeader } from "@/components/trilho/PageHeader";
import { Sparkline } from "@/components/trilho/Sparkline";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, Clock, CheckSquare, Activity, ChevronRight, Calendar, X } from "lucide-react";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { getTier } from "@/lib/credit-calculations";

const DISMISSED_ALERTS_KEY = "dashboard.dismissedAlerts";

// Cada alerta dismissado tem TTL — depois disso volta a aparecer mesmo se a condição persistir.
// Útil pra "snooze" de 4h em vez de "esconder pra sempre".
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000; // 4h

function loadDismissed(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    // Remove expirados
    return Object.fromEntries(Object.entries(data).filter(([_, ts]) => now - ts < DISMISS_TTL_MS));
  } catch { return {}; }
}

function saveDismissed(d: Record<string, number>) {
  try { localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(d)); } catch { /* ignora */ }
}

function daysSince(d: string) {
  try { return differenceInDays(new Date(), parseISO(d)); } catch { return 0; }
}

function daysUntil(d: string) {
  try { return differenceInDays(parseISO(d), new Date()); } catch { return 999; }
}

function PriorityDot({ priority }: { priority: string }) {
  const c = priority === "high" ? T.danger : priority === "medium" ? T.amber : T.textFaint;
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />;
}

export default function Dashboard() {
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed());

  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  function dismissAlert(key: string) {
    setDismissed(prev => ({ ...prev, [key]: Date.now() }));
  }
  function dismissAll(keys: string[]) {
    const now = Date.now();
    setDismissed(prev => ({ ...prev, ...Object.fromEntries(keys.map(k => [k, now])) }));
  }

  const navigate = useNavigate();
  const [periodDays, setPeriodDays] = useState<number | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["dashboard-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, status, limite_sugerido, credit_score, created_at, updated_at, data_analise, analista_credito, recommendation, faturamento_medio, clients(razao_social, cnpj_cpf)")
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
      const { data } = await supabase.from("committee_result").select("credit_analysis_id, decisao_final, limite_aprovado, created_at");
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
        .neq("status", "completed")
        .order("due_date", { ascending: true })
        .limit(50);
      return data || [];
    },
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date, clients(razao_social)")
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
  const fInvoices = useMemo(() => inPeriod(invoices), [invoices, periodDays]);

  const total = fAnalyses.length;
  const inCommittee = fAnalyses.filter(a => a.status === "in_committee").length;
  const approved = fAnalyses.filter(a => a.status === "approved" || a.status === "approved_restricted").length;
  const rejected = fAnalyses.filter(a => a.status === "rejected").length;
  const totalLimiteAprovado = fCommitteeResults.reduce((sum, r) => sum + ((r as any).limite_aprovado ?? 0), 0);
  const avgScore = fAnalyses.filter(a => a.credit_score).length > 0
    ? Math.round(fAnalyses.reduce((sum, a) => sum + (a.credit_score ?? 0), 0) / fAnalyses.filter(a => a.credit_score).length)
    : 0;
  const approvalRate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

  const activeDeals = deals.filter(d => {
    const stage = (d as any).deal_stages;
    return stage && !stage.is_won && !stage.is_lost;
  });
  const pipelineValue = activeDeals.reduce((sum, d) => sum + ((d as any).value ?? 0), 0);

  // ── Alertas ─────────────────────────────────────────────────────────
  const committeeUrgent = analyses.filter(a =>
    a.status === "in_committee" && daysSince((a as any).updated_at || a.created_at) >= 5
  );
  const overdueTasks = crmTasks.filter(t =>
    t.due_date && daysUntil(t.due_date) < 0
  );
  const overdueInvoices = invoices.filter(i =>
    (i as any).validation_status === "vencido" || (i as any).validation_status === "atrasado"
  );
  const staleAnalyses = analyses.filter(a =>
    a.status === "draft" && daysSince(a.created_at) >= 14
  );

  const alerts = [
    committeeUrgent.length > 0 && {
      key: "committee",
      label: `${committeeUrgent.length} análise${committeeUrgent.length > 1 ? "s" : ""} urgente${committeeUrgent.length > 1 ? "s" : ""} no comitê`,
      color: T.danger,
      bg: "#FEF0F0",
      path: "/comite",
    },
    overdueTasks.length > 0 && {
      key: "tasks",
      label: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} vencida${overdueTasks.length > 1 ? "s" : ""}`,
      color: "#7A5B00",
      bg: "#FFF6DC",
      path: "/crm/tarefas",
    },
    staleAnalyses.length > 0 && {
      key: "stale",
      label: `${staleAnalyses.length} análise${staleAnalyses.length > 1 ? "s" : ""} parada${staleAnalyses.length > 1 ? "s" : ""} há +14d`,
      color: "#7A5B00",
      bg: "#FFF6DC",
      path: "/analises",
    },
    overdueInvoices.length > 0 && {
      key: "invoices",
      label: `${overdueInvoices.length} NF${overdueInvoices.length > 1 ? "s" : ""} vencida${overdueInvoices.length > 1 ? "s" : ""}`,
      color: T.danger,
      bg: "#FEF0F0",
      path: "/monitoramento-nfs",
    },
  ].filter(Boolean) as { key: string; label: string; color: string; bg: string; path: string }[];

  const visibleAlerts = alerts.filter(a => !(a.key in dismissed));

  // ── Tarefas para exibir ──────────────────────────────────────────────
  const visibleTasks = crmTasks.slice(0, 5);
  const pendingTasks = crmTasks.length;

  // ── Sparklines ──────────────────────────────────────────────────────
  const buildWeeklySparkline = (items: { created_at: string }[]) => {
    const weeks = 12;
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
  const sparkInvoices = buildWeeklySparkline(fInvoices);

  // ── Top cedentes por LIMITE APROVADO ───────────────────────────────
  // Soma committee_result.limite_aprovado por cliente (cap de crédito real liberado).
  // Antes usava limite_sugerido — cap teórico que ninguém preenchia → ficava R$ 0.
  const topClientsMap = new Map<string, { id: string; name: string; cnpj: string; total: number; score: number }>();
  // Indexa committee_result por analysis_id pra cruzar com analyses
  const committeeByAnalysis = new Map<string, number>();
  fCommitteeResults.forEach((r: any) => {
    if (r.credit_analysis_id && r.limite_aprovado) {
      committeeByAnalysis.set(r.credit_analysis_id, r.limite_aprovado);
    }
  });
  fAnalyses.forEach(a => {
    const name = (a.clients as any)?.razao_social;
    const cnpj = (a.clients as any)?.cnpj_cpf || "";
    if (!name) return;
    const limiteAprovado = committeeByAnalysis.get(a.id) ?? 0;
    const existing = topClientsMap.get(name) || { id: a.client_id, name, cnpj, total: 0, score: 0 };
    existing.total += limiteAprovado;
    existing.score = Math.max(existing.score, a.credit_score ?? 0);
    topClientsMap.set(name, existing);
  });
  const topClients = Array.from(topClientsMap.values())
    .filter(c => c.total > 0)  // só cedentes com limite aprovado de fato
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Funil ─────────────────────────────────────────────────────────
  const funnelData = [
    { stage: "Cedentes",  n: clientCount, pct: 100 },
    { stage: "Análises",  n: total,       pct: clientCount > 0 ? Math.round((total / clientCount) * 100) : 0 },
    { stage: "Comitê",    n: inCommittee + approved + rejected, pct: total > 0 ? Math.round(((inCommittee + approved + rejected) / clientCount) * 100) : 0 },
    { stage: "Aprovadas", n: approved,    pct: total > 0 ? Math.round((approved / clientCount) * 100) : 0 },
  ];

  const trendRows = [
    { l: "Análises iniciadas", v: String(total),             spark: sparkAnalyses },
    { l: "Aprovações",         v: String(approved),          spark: sparkApproved },
    { l: "NFs monitoradas",    v: String(fInvoices.length),  spark: sparkInvoices },
  ];

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title="Painel inicial"
        subtitle={`ATUALIZADO AGORA · ${new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase()}`}
        actions={
          <button
            onClick={() => navigate("/consulta")}
            className="px-[16px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--marinho)" }}
          >
            + Nova consulta
          </button>
        }
      />

      {/* ── Onboarding (mostra só quando workspace incompleto) ──── */}
      <OnboardingChecklist />

      {/* ── Alert strip ──────────────────────────────────────────── */}
      {visibleAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {visibleAlerts.map(alert => (
            <div
              key={alert.key}
              className="flex items-center rounded-[8px] overflow-hidden"
              style={{ background: alert.bg, border: `1px solid ${alert.color}22` }}
            >
              <button
                onClick={() => navigate(alert.path)}
                className="flex items-center gap-2 px-[12px] py-[7px] text-[12px] font-medium transition-opacity hover:opacity-80"
                style={{ color: alert.color, background: "transparent", border: "none" }}
                title="Abrir tela relacionada"
              >
                <AlertTriangle style={{ width: 13, height: 13 }} />
                {alert.label}
                <ChevronRight style={{ width: 12, height: 12, opacity: 0.6 }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); dismissAlert(alert.key); }}
                className="flex items-center justify-center px-[8px] py-[7px] transition-opacity hover:opacity-100"
                style={{ color: alert.color, opacity: 0.5, background: "transparent", border: "none", borderLeft: `1px solid ${alert.color}22` }}
                title="Dispensar alerta (volta em 4h)"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
          {visibleAlerts.length > 1 && (
            <button
              onClick={() => dismissAll(visibleAlerts.map(a => a.key))}
              className="px-[10px] py-[7px] rounded-[8px] text-[11px] font-medium transition-colors hover:bg-[rgba(10,21,56,0.06)]"
              style={{ color: T.textMute, background: "transparent", border: `1px dashed ${T.borderMed}` }}
              title="Dispensa todos por 4h"
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="Exposição total"
          value={formatBRL(totalLimiteAprovado + pipelineValue)}
          sub={`${total} análises`}
          trend={`${approvalRate}% aprovação`}
          trendDir="up"
          spark={sparkAnalyses}
          onClick={() => navigate("/analises")}
        />
        <KPI
          label="Score médio"
          value={avgScore > 0 ? String(avgScore) : "—"}
          sub={avgScore > 0 ? `Tier ${getTier(avgScore)}` : "Sem dados"}
          gauge={avgScore > 0 ? avgScore : undefined}
          onClick={() => navigate("/analises")}
        />
        <KPI
          label="Análises aprovadas"
          value={String(approved)}
          sub={`${rejected} rejeitadas`}
          trend={`${approvalRate}%`}
          trendDir="up"
          spark={sparkApproved}
          onClick={() => navigate("/analises")}
        />
        <KPI
          label="Pipeline CRM"
          value={formatBRL(pipelineValue)}
          sub={`${activeDeals.length} deals · ${pendingTasks} tarefas`}
          spark={buildWeeklySparkline(deals)}
          onClick={() => navigate("/crm/dashboard")}
        />
      </div>

      {/* ── Funil + Tendências ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        <Card padding={18}>
          <SectionTitle>Funil de conversão · esteira</SectionTitle>
          <div className="flex items-stretch gap-0 mt-[14px]">
            {funnelData.map((f, i) => (
              <div key={i} style={{ flex: Math.max(f.pct, 10), position: "relative", paddingRight: i < funnelData.length - 1 ? 8 : 0 }}>
                <div
                  className="flex flex-col justify-between rounded-[10px] px-[12px] py-[10px]"
                  style={{
                    height: 64,
                    background: i === funnelData.length - 1 ? T.esmeralda : T.marinho,
                    opacity: i === funnelData.length - 1 ? 1 : 1 - i * 0.18,
                    color: i === funnelData.length - 1 ? T.marinho : T.off,
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {f.stage}
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>{f.n}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{f.pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-[18px]" style={{ fontSize: 12, color: T.textMute }}>
            <span>Em comitê agora: <b style={{ color: T.text, fontWeight: 500 }}>{inCommittee}</b></span>
            {committeeUrgent.length > 0 && (
              <button onClick={() => navigate("/comite")} style={{ color: T.danger, fontWeight: 500 }}>
                {committeeUrgent.length} urgente{committeeUrgent.length > 1 ? "s" : ""} →
              </button>
            )}
          </div>
        </Card>

        <Card padding={18}>
          <SectionTitle
            action={
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}>
                30 DIAS
              </span>
            }
          >
            Tendências
          </SectionTitle>
          {trendRows.map((r, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-[10px]"
              style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}
            >
              <div>
                <div style={{ fontSize: 13, color: T.text }}>{r.l}</div>
                <div style={{ fontSize: 11, color: "#009E73", fontFamily: "var(--font-mono)", marginTop: 2 }}>▲ ult. 30d</div>
              </div>
              <div className="flex items-center gap-3">
                <Sparkline data={r.spark} w={80} h={26} />
                <div style={{ fontSize: 18, fontWeight: 500, color: T.text, minWidth: 44, textAlign: "right" }}>
                  {r.v}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Tarefas + Atividades ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Tarefas pendentes */}
        <Card padding={0}>
          <button
            className="w-full flex items-center justify-between px-[18px] py-[14px] hover:opacity-80 transition-opacity"
            style={{ borderBottom: `1px solid ${T.border}` }}
            onClick={() => navigate("/crm/tarefas")}
          >
            <div className="flex items-center gap-2">
              <CheckSquare style={{ width: 15, height: 15, color: T.esmeralda }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Tarefas pendentes</span>
              {pendingTasks > 0 && (
                <span
                  className="flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ width: 20, height: 20, background: overdueTasks.length > 0 ? T.danger : T.marinho, color: "#fff" }}
                >
                  {pendingTasks > 99 ? "99+" : pendingTasks}
                </span>
              )}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}>
              VER TODAS →
            </span>
          </button>

          {visibleTasks.length === 0 ? (
            <div className="py-8 text-center" style={{ fontSize: 13, color: T.textFaint }}>
              Nenhuma tarefa pendente
            </div>
          ) : (
            <div>
              {visibleTasks.map((task, i) => {
                const due = task.due_date ? daysUntil(task.due_date) : null;
                const isOverdue = due !== null && due < 0;
                const isDueSoon = due !== null && due >= 0 && due <= 2;
                return (
                  <button
                    key={task.id}
                    className="w-full flex items-center gap-3 px-[18px] py-[11px] text-left hover:bg-[rgba(10,21,56,0.02)] transition-colors"
                    style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}
                    onClick={() => navigate("/crm/tarefas")}
                  >
                    <PriorityDot priority={task.priority || "low"} />
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: T.text }}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span
                        className="flex items-center gap-1 flex-shrink-0"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          color: isOverdue ? T.danger : isDueSoon ? "#7A5B00" : T.textFaint,
                          fontWeight: isOverdue || isDueSoon ? 600 : 400,
                        }}
                      >
                        <Calendar style={{ width: 10, height: 10 }} />
                        {isOverdue ? `${Math.abs(due!)}d atraso` : due === 0 ? "hoje" : `${due}d`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Atividades recentes */}
        <Card padding={0}>
          <button
            className="w-full flex items-center justify-between px-[18px] py-[14px] hover:opacity-80 transition-opacity"
            style={{ borderBottom: `1px solid ${T.border}` }}
            onClick={() => navigate("/crm/atividades")}
          >
            <div className="flex items-center gap-2">
              <Activity style={{ width: 15, height: 15, color: T.esmeralda }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Atividades recentes</span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}>
              VER TODAS →
            </span>
          </button>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center" style={{ fontSize: 13, color: T.textFaint }}>
              Nenhuma atividade registrada
            </div>
          ) : (
            <div>
              {recentActivities.map((act: any, i) => (
                <button
                  key={act.id}
                  className="w-full flex items-center gap-3 px-[18px] py-[11px] text-left hover:bg-[rgba(10,21,56,0.02)] transition-colors"
                  style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}
                  onClick={() => navigate("/crm/atividades")}
                >
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: 8, background: "rgba(0,212,154,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      fontSize: 11, color: T.esmeralda, fontWeight: 600,
                    }}
                  >
                    {(act.activity_type || "AT").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13, color: T.text, fontWeight: 500, lineHeight: 1.2 }}>
                      {act.clients?.razao_social || "—"}
                    </p>
                    <p className="truncate" style={{ fontSize: 11, color: T.textMute, marginTop: 1 }}>
                      {act.description || act.activity_type || "—"}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, flexShrink: 0 }}>
                    {act.activity_date ? formatDate(act.activity_date) : "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Top Cedentes ─────────────────────────────────────────── */}
      <Card padding={0}>
        <div
          className="flex justify-between items-center px-[18px] py-[14px]"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Top cedentes por limite aprovado</div>
          <button
            onClick={() => navigate("/cedentes")}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}
          >
            VER TODOS →
          </button>
        </div>
        {topClients.length > 0 ? (
          <DataTable
            cols={[
              { key: "name",  label: "Cedente",         width: "2fr" },
              { key: "cnpj",  label: "CNPJ",            width: "1.4fr", mono: true },
              { key: "total", label: "Limite aprovado", width: "1fr",   align: "right", mono: true },
              { key: "score", label: "Score",           width: "100px", align: "right", mono: true },
              { key: "tier",  label: "Tier",            width: "80px",  align: "right" },
            ]}
            rows={topClients.map(c => ({
              _id: c.id,
              name:  <span style={{ fontWeight: 500 }}>{c.name}</span>,
              cnpj:  c.cnpj,
              total: formatBRL(c.total),
              score: c.score > 0 ? String(c.score) : "—",
              tier:  c.score > 0 ? <StatusBadge status={getTier(c.score)} /> : <span style={{ color: T.textFaint }}>—</span>,
            }))}
            onRowClick={(row: any) => row._id && navigate(`/cedentes/${row._id}/perfil`)}
          />
        ) : (
          <div className="py-12 text-center space-y-1.5" style={{ fontSize: 13, color: T.textFaint }}>
            <p style={{ color: T.textMute, fontSize: 14, fontWeight: 500 }}>Nenhum cedente com limite aprovado</p>
            <p style={{ fontSize: 12 }}>Análises aprovadas pelo comitê aparecem aqui automaticamente</p>
          </div>
        )}
      </Card>
    </div>
  );
}
