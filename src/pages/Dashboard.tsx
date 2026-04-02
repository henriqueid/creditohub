import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart,
  Layers, Activity, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";

export default function Dashboard() {
  const navigate = useNavigate();

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

  const { data: blacklistCount = 0 } = useQuery({
    queryKey: ["dashboard-blacklist-count"],
    queryFn: async () => {
      const { count } = await supabase.from("blacklist").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: bankruptcyRecords = [] } = useQuery({
    queryKey: ["dashboard-bankruptcy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bankruptcy_records")
        .select("id, status, matched_client_id, matched_sacado_names, type, created_at, company_name")
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
        .select("id, name, is_active, frequency, limiar_variacao, limiar_atraso_dias, concentracao_maxima");
      return data || [];
    },
  });

  // Credit metrics
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

  // Invoice metrics
  const invoiceValid = invoices.filter(i => i.validation_status === "valid").length;
  const invoiceInvalid = invoices.filter(i => i.validation_status === "invalid").length;
  const invoicePending = invoices.filter(i => i.validation_status === "pending").length;
  const invoiceTotalValue = invoices.reduce((sum, i) => sum + (i.valor ?? 0), 0);

  // Bankruptcy metrics
  const bankruptcyMatched = bankruptcyRecords.filter(b => b.matched_client_id || (b.matched_sacado_names && b.matched_sacado_names.length > 0)).length;
  const bankruptcyActive = bankruptcyRecords.filter(b => b.status === "active").length;

  // Monitoring groups
  const activeGroups = monitoringGroups.filter(g => g.is_active).length;

  const recentAnalyses = analyses.slice(0, 5);

  const statusData = [
    { label: "Rascunho", value: drafts, color: "bg-muted-foreground/40", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-status-committee", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-status-approved", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Aprov. c/ Restrição", value: approvedRestricted, color: "bg-status-restricted", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-status-rejected", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  const alertCount = (inCommittee > 0 ? 1 : 0) + (drafts > 0 ? 1 : 0) + (bankruptcyMatched > 0 ? 1 : 0) + (invoiceInvalid > 0 ? 1 : 0);

  return (
    <div className="p-6 space-y-5 overflow-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight">Painel Inicial</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada da plataforma de inteligência de crédito</p>
      </motion.div>

      {/* Alerts banner - top priority */}
      {alertCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="py-3 px-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-600 dark:text-amber-400">
                {inCommittee > 0 && <span>• {inCommittee} análise(s) aguardando comitê</span>}
                {drafts > 0 && <span>• {drafts} rascunho(s) pendente(s)</span>}
                {bankruptcyMatched > 0 && <span>• {bankruptcyMatched} coincidência(s) falimentar(es)</span>}
                {invoiceInvalid > 0 && <span>• {invoiceInvalid} NF(s) inválida(s)</span>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Row 1: Compact overview strip */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {[
          { title: "Cedentes", value: clientCount, icon: Building2, href: "/cedentes" },
          { title: "Análises", value: total, icon: FileText, href: "/analises" },
          { title: "Em Comitê", value: inCommittee, icon: Clock, href: "/comite", color: "text-status-committee" },
          { title: "Aprovados", value: approved, icon: CheckCircle, href: "/analises", color: "text-status-approved" },
          { title: "Reprovados", value: rejected, icon: XCircle, href: "/analises", color: "text-status-rejected" },
          { title: "Score Médio", value: avgScore || "—", icon: BarChart3 },
          { title: "Blacklist", value: blacklistCount, icon: ShieldBan, href: "/blacklist" },
          { title: "Grupos Ativos", value: activeGroups, icon: Layers, href: "/monitoramento-nfs" },
        ].map((card) => (
          <Card
            key={card.title}
            className={cn("cursor-pointer hover:shadow-md transition-shadow", !card.href && "cursor-default")}
            onClick={() => card.href && navigate(card.href)}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <card.icon className={cn("h-4 w-4", card.color || "text-muted-foreground")} />
              <span className={cn("text-xl font-bold tabular-nums leading-none", card.color)}>{card.value}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{card.title}</span>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Row 2: Financial + Distribution */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        {/* Financial Summary - compact 2-col */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Vol. Sugerido</p>
                <p className="text-base font-bold tabular-nums">{formatBRL(totalLimiteSugerido)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Vol. Aprovado</p>
                <p className="text-base font-bold tabular-nums text-status-approved">{formatBRL(totalLimiteAprovado)}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground">Taxa de Aprovação</p>
                <span className="text-xs font-bold tabular-nums">{approvalRate.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-status-approved transition-all" style={{ width: `${approvalRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Combined bar */}
            <div className="h-5 rounded-full bg-muted overflow-hidden flex mb-3">
              {statusData.filter(s => s.pct > 0).map((s) => (
                <div
                  key={s.label}
                  className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", s.color)}
                  style={{ width: `${s.pct}%` }}
                  title={`${s.label}: ${s.value}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statusData.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.color)} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                    <p className="text-xs font-bold tabular-nums">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: Monitoring modules (4 cols) */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        {/* NFs */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/monitoramento-nfs")}>
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs flex items-center gap-2 font-medium">
              <FileBarChart className="h-3.5 w-3.5 text-primary" /> Monitoramento NFs
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{invoices.length}</span>
              <span className="text-[10px] text-muted-foreground">{formatBRL(invoiceTotalValue)}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-status-approved" />{invoiceValid} válidas</span>
              <span className="inline-flex items-center gap-1 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-status-rejected" />{invoiceInvalid} inválidas</span>
              <span className="inline-flex items-center gap-1 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />{invoicePending} pendentes</span>
            </div>
          </CardContent>
        </Card>

        {/* Grupos de Monitoramento */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/monitoramento-nfs")}>
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs flex items-center gap-2 font-medium">
              <Layers className="h-3.5 w-3.5 text-primary" /> Grupos de Monitoramento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{monitoringGroups.length}</span>
              <span className="text-[10px] text-muted-foreground">{activeGroups} ativo(s)</span>
            </div>
            {monitoringGroups.length > 0 ? (
              <div className="space-y-1">
                {monitoringGroups.slice(0, 3).map(g => (
                  <div key={g.id} className="flex items-center gap-1.5 text-[10px]">
                    <Activity className={cn("h-2.5 w-2.5", g.is_active ? "text-status-approved" : "text-muted-foreground/40")} />
                    <span className="truncate">{g.name}</span>
                  </div>
                ))}
                {monitoringGroups.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{monitoringGroups.length - 3} grupo(s)</p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Nenhum grupo criado</p>
            )}
          </CardContent>
        </Card>

        {/* Falimentar */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/falimentar")}>
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs flex items-center gap-2 font-medium">
              <Scale className="h-3.5 w-3.5 text-primary" /> Informe Falimentar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{bankruptcyRecords.length}</span>
              <span className="text-[10px] text-muted-foreground">{bankruptcyActive} ativo(s)</span>
            </div>
            {bankruptcyMatched > 0 ? (
              <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {bankruptcyMatched} coincidência(s)
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle className="h-3 w-3 shrink-0" />
                Sem coincidências
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blacklist */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/blacklist")}>
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs flex items-center gap-2 font-medium">
              <ShieldBan className="h-3.5 w-3.5 text-primary" /> Blacklist
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums">{blacklistCount}</span>
              <span className="text-[10px] text-muted-foreground">registro(s)</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              CPFs/CNPJs bloqueados verificados automaticamente nas consultas.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 4: Recent analyses */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Análises Recentes
              </CardTitle>
              <button
                className="text-[10px] text-primary hover:underline"
                onClick={() => navigate("/analises")}
              >
                Ver todas →
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma análise encontrada</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {recentAnalyses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
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
      </motion.div>
    </div>
  );
}
