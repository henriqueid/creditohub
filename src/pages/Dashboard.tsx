import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  BarChart3, AlertTriangle, DollarSign, ShieldBan, Scale, FileBarChart,
  Layers, Activity, Eye, UserSearch, ArrowRight, Calendar, User, Hash
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

  const { data: prospectCount = 0 } = useQuery({
    queryKey: ["dashboard-prospects"],
    queryFn: async () => {
      // Prospects don't have a dedicated table yet, placeholder
      return 0;
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
  const bankruptcyActive = bankruptcyRecords.filter(b => b.status === "active" || b.status === "em_andamento").length;

  // Blacklist metrics
  const blacklistCount = blacklistEntries.length;
  const recentBlacklist = blacklistEntries.slice(0, 5);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newBlacklistCount = blacklistEntries.filter(b => new Date(b.created_at) >= sevenDaysAgo).length;

  // Monitoring groups
  const activeGroups = monitoringGroups.filter(g => g.is_active).length;

  const recentAnalyses = analyses.slice(0, 6);

  const statusData = [
    { label: "Rascunho", value: drafts, color: "bg-muted-foreground/40", pct: total > 0 ? (drafts / total) * 100 : 0 },
    { label: "Em Comitê", value: inCommittee, color: "bg-status-committee", pct: total > 0 ? (inCommittee / total) * 100 : 0 },
    { label: "Aprovados", value: approved - approvedRestricted, color: "bg-status-approved", pct: total > 0 ? ((approved - approvedRestricted) / total) * 100 : 0 },
    { label: "Aprov. c/ Restrição", value: approvedRestricted, color: "bg-status-restricted", pct: total > 0 ? (approvedRestricted / total) * 100 : 0 },
    { label: "Reprovados", value: rejected, color: "bg-status-rejected", pct: total > 0 ? (rejected / total) * 100 : 0 },
  ];

  const alertItems: { text: string; href: string; icon: React.ElementType; severity: "high" | "medium" | "low" }[] = [];
  if (inCommittee > 0) alertItems.push({ text: `${inCommittee} análise(s) aguardando votação no comitê`, href: "/comite", icon: Clock, severity: "high" });
  if (invoiceInvalid > 0) alertItems.push({ text: `${invoiceInvalid} NF(s) com problemas de validação`, href: "/monitoramento-nfs", icon: FileBarChart, severity: "high" });
  if (bankruptcyMatched > 0) alertItems.push({ text: `${bankruptcyMatched} coincidência(s) falimentar(es) na carteira`, href: "/falimentar", icon: Scale, severity: "high" });
  if (newBlacklistCount > 0) alertItems.push({ text: `${newBlacklistCount} novo(s) bloqueio(s) na blacklist nos últimos 7 dias`, href: "/blacklist", icon: ShieldBan, severity: "medium" });
  if (drafts > 0) alertItems.push({ text: `${drafts} rascunho(s) de análise pendente(s) de finalização`, href: "/analises", icon: FileText, severity: "low" });

  const frequencyLabel: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  return (
    <div className="p-6 space-y-5 overflow-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold tracking-tight">Painel Inicial</h1>
        <p className="text-muted-foreground text-sm">Visão consolidada da plataforma de inteligência de crédito</p>
      </motion.div>

      {/* Alerts banner */}
      {alertItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="py-3 px-4 space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {alertItems.length} pendência(s) requerem atenção
                </span>
              </div>
              {alertItems.map((alert, i) => (
                <button
                  key={i}
                  onClick={() => navigate(alert.href)}
                  className="w-full flex items-center gap-2 text-left text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors group"
                >
                  <alert.icon className="h-3 w-3 shrink-0" />
                  <span className="flex-1">{alert.text}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Row 1: Esteira de Crédito strip */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Esteira de Crédito</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { title: "Cedentes", value: clientCount, icon: Building2, href: "/cedentes" },
            { title: "Análises", value: total, icon: FileText, href: "/analises" },
            { title: "Aguardando Comitê", value: inCommittee, icon: Clock, href: "/comite", color: inCommittee > 0 ? "text-status-committee" : undefined },
            { title: "Aprovadas", value: approved, icon: CheckCircle, href: "/analises", color: "text-status-approved" },
            { title: "Reprovadas", value: rejected, icon: XCircle, href: "/analises", color: rejected > 0 ? "text-status-rejected" : undefined },
            { title: "Score Médio", value: avgScore || "—", icon: BarChart3 },
          ].map((card) => (
            <Card
              key={card.title}
              className={cn("glass-card cursor-pointer hover:shadow-md transition-shadow", !card.href && "cursor-default")}
              onClick={() => card.href && navigate(card.href)}
            >
              <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                <card.icon className={cn("h-4 w-4", card.color || "text-muted-foreground")} />
                <span className={cn("text-xl font-bold tabular-nums leading-none", card.color)}>{card.value}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{card.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Row 2: Financial + Distribution */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="glass-card lg:col-span-2">
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

        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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

      {/* Row 3: Monitoring section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monitoramento & Restrições</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NFs */}
          <Card className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/monitoramento-nfs")}>
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
          <Card className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/monitoramento-nfs")}>
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
                    <div key={g.id} className="flex items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <Activity className={cn("h-2.5 w-2.5 shrink-0", g.is_active ? "text-status-approved" : "text-muted-foreground/40")} />
                        <span className="truncate">{g.name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{frequencyLabel[g.frequency] || g.frequency}</span>
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
          <Card className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/falimentar")}>
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
                  {bankruptcyMatched} coincidência(s) na carteira
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  Sem coincidências na carteira
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blacklist */}
          <Card className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/blacklist")}>
            <CardHeader className="pb-1.5 pt-4 px-4">
              <CardTitle className="text-xs flex items-center gap-2 font-medium">
                <ShieldBan className="h-3.5 w-3.5 text-primary" /> Blacklist
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums">{blacklistCount}</span>
                <span className="text-[10px] text-muted-foreground">bloqueado(s)</span>
              </div>
              {newBlacklistCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {newBlacklistCount} novo(s) nos últimos 7 dias
                </div>
              )}
              {recentBlacklist.length > 0 ? (
                <div className="space-y-0.5">
                  {recentBlacklist.slice(0, 3).map(b => (
                    <div key={b.id} className="flex items-center justify-between text-[10px]">
                      <span className="font-mono truncate">{b.documento}</span>
                      <span className="text-muted-foreground uppercase shrink-0 ml-1">{b.tipo}</span>
                    </div>
                  ))}
                  {blacklistCount > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{blacklistCount - 3} registro(s)</p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Nenhum registro na blacklist</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Row 4: Recent analyses - enriched */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="glass-card">
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
              <div className="space-y-1.5">
                {recentAnalyses.map((a) => {
                  const client = a.clients as any;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/analises/${a.id}`)}
                    >
                      {/* Score indicator */}
                      <div className={cn(
                        "h-9 w-9 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border",
                        a.credit_score && a.credit_score >= 700
                          ? "bg-status-approved/10 text-status-approved border-status-approved/30"
                          : a.credit_score && a.credit_score >= 400
                            ? "bg-status-committee/10 text-status-committee border-status-committee/30"
                            : a.credit_score
                              ? "bg-status-rejected/10 text-status-rejected border-status-rejected/30"
                              : "bg-muted text-muted-foreground border-border"
                      )}>
                        {a.credit_score || "—"}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{client?.razao_social || "—"}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          {client?.cnpj_cpf && (
                            <span className="flex items-center gap-0.5 font-mono">
                              <Hash className="h-2.5 w-2.5" />
                              {client.cnpj_cpf}
                            </span>
                          )}
                          {a.analista_credito && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-2.5 w-2.5" />
                              {a.analista_credito}
                            </span>
                          )}
                          {a.created_at && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(a.created_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: limit + recommendation */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">
                          {a.limite_sugerido ? formatBRL(a.limite_sugerido) : "—"}
                        </p>
                        {a.faturamento_medio && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            Fat. {formatBRL(a.faturamento_medio)}
                          </p>
                        )}
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
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
