import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock, TrendingUp, ArrowRight, AlertTriangle, CheckCircle,
  XCircle, BarChart3, Timer, Gauge, GitBranch, Filter, Zap,
  ChevronRight, Activity, ArrowDown, ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_committee: "Em Comitê",
  approved: "Aprovado",
  approved_restricted: "Aprovado c/ Restrição",
  rejected: "Reprovado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  in_committee: "bg-status-committee",
  approved: "bg-status-approved",
  approved_restricted: "bg-status-restricted",
  rejected: "bg-status-rejected",
};

function daysDiff(a: string, b: string) {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default function PipelineMetrics() {
  const [periodDays, setPeriodDays] = useState<number | null>(30);

  const { data: analyses = [] } = useQuery({
    queryKey: ["metrics-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, status, created_at, updated_at, credit_score, recommendation, analista_credito, limite_sugerido, clients(razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: committeeVotes = [] } = useQuery({
    queryKey: ["metrics-votes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_committee")
        .select("credit_analysis_id, vote, vote_date, created_at");
      return data || [];
    },
  });

  const { data: committeeResults = [] } = useQuery({
    queryKey: ["metrics-results"],
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_result")
        .select("credit_analysis_id, decisao_final, created_at");
      return data || [];
    },
  });

  const now = new Date();
  const cutoff = periodDays ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000) : null;
  const filtered = useMemo(
    () => cutoff ? analyses.filter(a => new Date(a.created_at) >= cutoff) : analyses,
    [analyses, periodDays]
  );

  const metrics = useMemo(() => {
    const total = filtered.length;
    if (total === 0) return null;

    // Status distribution
    const byStatus: Record<string, number> = {};
    filtered.forEach(a => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

    // Conversion funnel
    const drafts = byStatus["draft"] || 0;
    const inCommittee = byStatus["in_committee"] || 0;
    const approved = (byStatus["approved"] || 0) + (byStatus["approved_restricted"] || 0);
    const rejected = byStatus["rejected"] || 0;
    const decided = approved + rejected;

    const draftToCommittee = total > 0 ? ((inCommittee + decided) / total) * 100 : 0;
    const committeeToDecision = (inCommittee + decided) > 0 ? (decided / (inCommittee + decided)) * 100 : 0;
    const approvalRate = decided > 0 ? (approved / decided) * 100 : 0;
    const rejectionRate = decided > 0 ? (rejected / decided) * 100 : 0;

    // Time metrics
    const completedAnalyses = filtered.filter(a =>
      ["approved", "approved_restricted", "rejected"].includes(a.status)
    );

    const totalDays = completedAnalyses.map(a => daysDiff(a.created_at, a.updated_at));
    const avgTotalDays = totalDays.length > 0
      ? totalDays.reduce((s, d) => s + d, 0) / totalDays.length
      : 0;

    // Stage durations (estimate: draft→committee uses first vote date)
    const draftToCommitteeDays: number[] = [];
    const committeeToResultDays: number[] = [];

    completedAnalyses.forEach(a => {
      const votes = committeeVotes.filter(v => v.credit_analysis_id === a.id);
      const result = committeeResults.find(r => r.credit_analysis_id === a.id);
      if (votes.length > 0) {
        const firstVote = votes.reduce((min, v) =>
          new Date(v.created_at) < new Date(min.created_at) ? v : min
        );
        draftToCommitteeDays.push(daysDiff(a.created_at, firstVote.created_at));
        if (result) {
          committeeToResultDays.push(daysDiff(firstVote.created_at, result.created_at));
        }
      }
    });

    const avgDraftToCommittee = draftToCommitteeDays.length > 0
      ? draftToCommitteeDays.reduce((s, d) => s + d, 0) / draftToCommitteeDays.length
      : 0;
    const avgCommitteeToResult = committeeToResultDays.length > 0
      ? committeeToResultDays.reduce((s, d) => s + d, 0) / committeeToResultDays.length
      : 0;

    // Bottleneck: which stage is slowest
    const stages = [
      { name: "Rascunho → Comitê", days: avgDraftToCommittee },
      { name: "Comitê → Decisão", days: avgCommitteeToResult },
    ];
    const bottleneck = stages.reduce((max, s) => s.days > max.days ? s : max, stages[0]);

    // Score distribution
    const withScore = filtered.filter(a => a.credit_score != null);
    const scoreRanges = [
      { label: "0-300", min: 0, max: 300, color: "bg-status-rejected" },
      { label: "301-500", min: 301, max: 500, color: "bg-status-restricted" },
      { label: "501-700", min: 501, max: 700, color: "bg-status-committee" },
      { label: "701-1000", min: 701, max: 1000, color: "bg-status-approved" },
    ];
    const scoreDist = scoreRanges.map(r => ({
      ...r,
      count: withScore.filter(a => a.credit_score! >= r.min && a.credit_score! <= r.max).length,
    }));
    const maxScoreCount = Math.max(...scoreDist.map(s => s.count), 1);

    // Stale analyses (draft for >7 days)
    const staleAnalyses = filtered.filter(a =>
      a.status === "draft" && daysDiff(a.created_at, now.toISOString()) > 7
    );

    // Weekly throughput
    const weeks = 8;
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeklyCreated = Array(weeks).fill(0);
    const weeklyCompleted = Array(weeks).fill(0);
    filtered.forEach(item => {
      const age = now.getTime() - new Date(item.created_at).getTime();
      const idx = Math.floor(age / msPerWeek);
      if (idx >= 0 && idx < weeks) weeklyCreated[weeks - 1 - idx]++;
    });
    completedAnalyses.forEach(item => {
      const age = now.getTime() - new Date(item.updated_at).getTime();
      const idx = Math.floor(age / msPerWeek);
      if (idx >= 0 && idx < weeks) weeklyCompleted[weeks - 1 - idx]++;
    });

    return {
      total, byStatus, drafts, inCommittee, approved, rejected, decided,
      draftToCommittee, committeeToDecision, approvalRate, rejectionRate,
      avgTotalDays, avgDraftToCommittee, avgCommitteeToResult,
      bottleneck, scoreDist, maxScoreCount, staleAnalyses,
      weeklyCreated, weeklyCompleted,
    };
  }, [filtered, committeeVotes, committeeResults]);

  const periods = [
    { label: "7 dias", value: 7 },
    { label: "30 dias", value: 30 },
    { label: "90 dias", value: 90 },
    { label: "Todos", value: null },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {/* Header */}
      <motion.div {...fade(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Performance da Esteira
          </h1>
          <p className="text-muted-foreground text-sm">Métricas de conversão, tempo e gargalos do fluxo de crédito</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {periods.map(p => (
            <Button
              key={p.label}
              variant={periodDays === p.value ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setPeriodDays(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {!metrics ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma análise encontrada no período</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Row */}
          <motion.div {...fade(0.05)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard icon={BarChart3} label="Total Análises" value={metrics.total} />
            <MetricCard icon={Clock} label="Tempo Médio Total" value={`${metrics.avgTotalDays.toFixed(1)}d`} accent="warning" />
            <MetricCard icon={Timer} label="Rascunho → Comitê" value={`${metrics.avgDraftToCommittee.toFixed(1)}d`} />
            <MetricCard icon={Timer} label="Comitê → Decisão" value={`${metrics.avgCommitteeToResult.toFixed(1)}d`} />
            <MetricCard icon={CheckCircle} label="Taxa Aprovação" value={`${metrics.approvalRate.toFixed(0)}%`} accent="success" />
            <MetricCard icon={XCircle} label="Taxa Reprovação" value={`${metrics.rejectionRate.toFixed(0)}%`} accent="danger" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversion Funnel */}
            <motion.div {...fade(0.1)}>
              <Card className="glass-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <GitBranch className="h-4 w-4 text-primary" /> Funil de Conversão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FunnelStep
                    label="Criadas"
                    count={metrics.total}
                    pct={100}
                    color="bg-muted-foreground"
                  />
                  <FunnelArrow pct={metrics.draftToCommittee} />
                  <FunnelStep
                    label="Enviadas ao Comitê"
                    count={metrics.inCommittee + metrics.decided}
                    pct={metrics.draftToCommittee}
                    color="bg-status-committee"
                  />
                  <FunnelArrow pct={metrics.committeeToDecision} />
                  <FunnelStep
                    label="Com Decisão Final"
                    count={metrics.decided}
                    pct={metrics.total > 0 ? (metrics.decided / metrics.total) * 100 : 0}
                    color="bg-primary"
                  />
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1 rounded-lg border border-status-approved/30 bg-status-approved/5 p-3 text-center">
                      <span className="text-lg font-bold text-status-approved tabular-nums">{metrics.approved}</span>
                      <p className="text-[10px] text-muted-foreground">Aprovadas</p>
                    </div>
                    <div className="flex-1 rounded-lg border border-status-rejected/30 bg-status-rejected/5 p-3 text-center">
                      <span className="text-lg font-bold text-status-rejected tabular-nums">{metrics.rejected}</span>
                      <p className="text-[10px] text-muted-foreground">Reprovadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Time Analysis + Bottleneck */}
            <motion.div {...fade(0.15)}>
              <Card className="glass-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <Gauge className="h-4 w-4 text-primary" /> Análise de Tempo & Gargalos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timeline bar */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Tempo médio por etapa</p>
                    <TimelineBar
                      stages={[
                        { label: "Rascunho → Comitê", days: metrics.avgDraftToCommittee, color: "bg-status-committee" },
                        { label: "Comitê → Decisão", days: metrics.avgCommitteeToResult, color: "bg-primary" },
                      ]}
                      totalDays={metrics.avgTotalDays}
                    />
                  </div>

                  {/* Bottleneck alert */}
                  {metrics.bottleneck.days > 0 && (
                    <div className="rounded-lg border border-status-restricted/30 bg-status-restricted/5 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-status-restricted shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Gargalo identificado</p>
                        <p className="text-[11px] text-muted-foreground">
                          A etapa <strong className="text-foreground">{metrics.bottleneck.name}</strong> é a mais lenta,
                          levando em média <strong className="text-foreground">{metrics.bottleneck.days.toFixed(1)} dias</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stale analyses */}
                  {metrics.staleAnalyses.length > 0 && (
                    <div className="rounded-lg border border-status-rejected/30 bg-status-rejected/5 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-status-rejected" />
                        <p className="text-xs font-medium text-foreground">
                          {metrics.staleAnalyses.length} análise(s) parada(s) há mais de 7 dias
                        </p>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {metrics.staleAnalyses.slice(0, 5).map(a => (
                          <div key={a.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-foreground truncate">{(a.clients as any)?.razao_social || "—"}</span>
                            <span className="text-muted-foreground shrink-0 ml-2 tabular-nums">
                              {daysDiff(a.created_at, now.toISOString()).toFixed(0)}d parada
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Distribution */}
            <motion.div {...fade(0.2)}>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <Activity className="h-4 w-4 text-primary" /> Distribuição de Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {metrics.scoreDist.map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">{s.label}</span>
                      <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", s.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.count / metrics.maxScoreCount) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground w-8 tabular-nums">{s.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Weekly Throughput */}
            <motion.div {...fade(0.25)}>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> Throughput Semanal (8 semanas)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklyChart created={metrics.weeklyCreated} completed={metrics.weeklyCompleted} />
                  <div className="flex items-center justify-center gap-6 mt-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-sm bg-primary/60" /> Criadas
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-sm bg-status-approved/60" /> Concluídas
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Status Distribution */}
          <motion.div {...fade(0.3)}>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                  <Filter className="h-4 w-4 text-primary" /> Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-4 rounded-full overflow-hidden bg-muted/30 mb-3">
                  {Object.entries(metrics.byStatus).map(([status, count]) => {
                    const pct = (count / metrics.total) * 100;
                    return pct > 0 ? (
                      <motion.div
                        key={status}
                        className={cn(STATUS_COLORS[status] || "bg-muted-foreground")}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        title={`${STATUS_LABELS[status] || status}: ${count}`}
                      />
                    ) : null;
                  })}
                </div>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(metrics.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLORS[status] || "bg-muted-foreground")} />
                      <span className="text-xs text-muted-foreground">{STATUS_LABELS[status] || status}</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function MetricCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: "success" | "warning" | "danger";
}) {
  const accentMap = { success: "text-status-approved", warning: "text-status-committee", danger: "text-status-rejected" };
  const color = accent ? accentMap[accent] : "text-foreground";
  return (
    <Card className="glass-card">
      <CardContent className="p-3 flex flex-col items-center text-center gap-0.5">
        <Icon className={cn("h-4 w-4", accent ? accentMap[accent] : "text-muted-foreground")} />
        <span className={cn("text-xl font-bold tabular-nums leading-none", color)}>{value}</span>
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 2)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

function FunnelArrow({ pct }: { pct: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-0.5">
      <ArrowDown className="h-3 w-3 text-muted-foreground" />
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

function TimelineBar({ stages, totalDays }: { stages: { label: string; days: number; color: string }[]; totalDays: number }) {
  return (
    <div className="space-y-2">
      <div className="flex h-6 rounded-full overflow-hidden bg-muted/30">
        {stages.map(s => {
          const pct = totalDays > 0 ? (s.days / totalDays) * 100 : 50;
          return (
            <motion.div
              key={s.label}
              className={cn("h-full flex items-center justify-center", s.color)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, 5)}%` }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-[9px] font-bold text-white drop-shadow-sm truncate px-1">
                {s.days.toFixed(1)}d
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {stages.map(s => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

function WeeklyChart({ created, completed }: { created: number[]; completed: number[] }) {
  const max = Math.max(...created, ...completed, 1);
  const barH = 80;
  const weeks = created.length;

  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height: barH + 20 }}>
      {Array.from({ length: weeks }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-[2px] w-full justify-center" style={{ height: barH }}>
            <motion.div
              className="bg-primary/60 rounded-t-sm flex-1 max-w-3"
              initial={{ height: 0 }}
              animate={{ height: `${(created[i] / max) * barH}px` }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            />
            <motion.div
              className="bg-status-approved/60 rounded-t-sm flex-1 max-w-3"
              initial={{ height: 0 }}
              animate={{ height: `${(completed[i] / max) * barH}px` }}
              transition={{ duration: 0.4, delay: i * 0.04 + 0.1 }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums">S{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
