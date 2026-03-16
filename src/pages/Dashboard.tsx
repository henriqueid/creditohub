import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3, AlertTriangle, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";

export default function Dashboard() {
  const navigate = useNavigate();

  // All analyses with details
  const { data: analyses = [] } = useQuery({
    queryKey: ["dashboard-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, status, limite_sugerido, credit_score, created_at, data_analise, analista_credito, clients(razao_social)")
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

  // Computed metrics
  const total = analyses.length;
  const drafts = analyses.filter(a => a.status === "draft").length;
  const inCommittee = analyses.filter(a => a.status === "in_committee").length;
  const approved = analyses.filter(a => a.status === "approved" || a.status === "approved_restricted").length;
  const approvedRestricted = analyses.filter(a => a.status === "approved_restricted").length;
  const rejected = analyses.filter(a => a.status === "rejected").length;

  const totalLimiteSugerido = analyses.reduce((sum, a) => sum + (a.limite_sugerido ?? 0), 0);
  const totalLimiteAprovado = committeeResults.reduce((sum, r) => sum + (r.limite_aprovado ?? 0), 0);
  const avgScore = analyses.filter(a => a.credit_score).length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + (a.credit_score ?? 0), 0) / analyses.filter(a => a.credit_score).length)
    : 0;

  const approvalRate = total > 0 ? ((approved / (approved + rejected || 1)) * 100) : 0;

  // Recent analyses (last 5)
  const recentAnalyses = analyses.slice(0, 8);

  // Status distribution for bar chart
  const statusData = [
    { label: "Rascunho", value: drafts, color: "bg-muted-foreground/40", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-status-committee", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-status-approved", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Aprovados c/ Restrição", value: approvedRestricted, color: "bg-status-restricted", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-status-rejected", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Painel consolidado do módulo de crédito</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/cedentes")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cedentes</CardTitle>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{clientCount}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/analises")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Análises</CardTitle>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{total}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/comite")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-status-committee">Em Comitê</CardTitle>
            <Clock className="h-3.5 w-3.5 text-status-committee" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums text-status-committee">{inCommittee}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/analises")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-status-approved">Aprovados</CardTitle>
            <CheckCircle className="h-3.5 w-3.5 text-status-approved" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums text-status-approved">{approved}</div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/analises")}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-status-rejected">Reprovados</CardTitle>
            <XCircle className="h-3.5 w-3.5 text-status-rejected" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums text-status-rejected">{rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Score Médio</CardTitle>
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{avgScore || "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: Financial + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Volume Total Sugerido</p>
              <p className="text-xl font-bold tabular-nums">{formatBRL(totalLimiteSugerido)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volume Total Aprovado</p>
              <p className="text-xl font-bold tabular-nums text-status-approved">{formatBRL(totalLimiteAprovado)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Aprovação</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-status-approved transition-all" style={{ width: `${approvalRate}%` }} />
                </div>
                <span className="text-sm font-bold tabular-nums">{approvalRate.toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusData.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent analyses */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Análises Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma análise encontrada</p>
            ) : (
              <div className="space-y-2">
                {recentAnalyses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/analises/${a.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{(a.clients as any)?.razao_social || "—"}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(inCommittee > 0 || drafts > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Pendências</p>
              <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                {inCommittee > 0 && <p>• {inCommittee} análise(s) aguardando votação no comitê</p>}
                {drafts > 0 && <p>• {drafts} análise(s) em rascunho para finalizar</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
