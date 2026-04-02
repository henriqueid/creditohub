import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, FileText, Users, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart, UserSearch, Percent
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
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

  const recentAnalyses = analyses.slice(0, 6);

  const statusData = [
    { label: "Rascunho", value: drafts, color: "bg-muted-foreground/40", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-status-committee", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-status-approved", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Aprovados c/ Restrição", value: approvedRestricted, color: "bg-status-restricted", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-status-rejected", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight">Painel Inicial</h1>
        <p className="text-muted-foreground">Visão consolidada da plataforma de inteligência de crédito</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: "Cedentes", value: clientCount, icon: Building2, href: "/cedentes", colorClass: "" },
          { title: "Total Análises", value: total, icon: FileText, href: "/analises", colorClass: "" },
          { title: "Em Comitê", value: inCommittee, icon: Clock, href: "/comite", colorClass: "text-status-committee" },
          { title: "Aprovados", value: approved, icon: CheckCircle, href: "/analises", colorClass: "text-status-approved" },
          { title: "Reprovados", value: rejected, icon: XCircle, href: "/analises", colorClass: "text-status-rejected" },
          { title: "Score Médio", value: avgScore || "—", icon: BarChart3, href: "", colorClass: "" },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card
              className={cn("cursor-pointer hover:shadow-md transition-shadow", !card.href && "cursor-default")}
              onClick={() => card.href && navigate(card.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className={cn("text-xs font-medium", card.colorClass || "text-muted-foreground")}>{card.title}</CardTitle>
                <card.icon className={cn("h-3.5 w-3.5", card.colorClass || "text-muted-foreground")} />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={cn("text-2xl font-bold tabular-nums", card.colorClass)}>{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Row: Financial + Distribution + Recent */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
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
      </motion.div>

      {/* Row: Monitoring modules */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.65 }}>
        {/* Invoice Monitoring Summary */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/monitoramento-nfs")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-primary" /> Monitoramento NFs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Total NFs</p>
                <p className="text-lg font-bold tabular-nums">{invoices.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Volume Total</p>
                <p className="text-sm font-bold tabular-nums">{formatBRL(invoiceTotalValue)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-status-approved" />
                <span>{invoiceValid} válidas</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-status-rejected" />
                <span>{invoiceInvalid} inválidas</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span>{invoicePending} pendentes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bankruptcy Summary */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/falimentar")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Informe Falimentar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Registros Ativos</p>
                <p className="text-lg font-bold tabular-nums">{bankruptcyActive}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Monitorado</p>
                <p className="text-lg font-bold tabular-nums">{bankruptcyRecords.length}</p>
              </div>
            </div>
            {bankruptcyMatched > 0 ? (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-destructive/10 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="font-medium">{bankruptcyMatched} coincidência(s) com a carteira</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted text-muted-foreground text-xs">
                <CheckCircle className="h-3 w-3 shrink-0" />
                <span>Nenhuma coincidência com a carteira</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blacklist Summary */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/blacklist")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldBan className="h-4 w-4 text-primary" /> Blacklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Registros na Blacklist</p>
              <p className="text-lg font-bold tabular-nums">{blacklistCount}</p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              CPFs e CNPJs bloqueados para operações. Consultas automáticas verificam a blacklist antes de prosseguir.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts */}
      {(inCommittee > 0 || drafts > 0 || bankruptcyMatched > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }}>
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Pendências e Alertas</p>
                <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {inCommittee > 0 && <p>• {inCommittee} análise(s) aguardando votação no comitê</p>}
                  {drafts > 0 && <p>• {drafts} análise(s) em rascunho para finalizar</p>}
                  {bankruptcyMatched > 0 && <p>• {bankruptcyMatched} registro(s) falimentar(es) coincidem com a carteira</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
