import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ClientTagManager } from "@/components/crm/ClientTagManager";
import { formatBRL, formatDate, formatCNPJorCPF } from "@/lib/formatters";
import {
  ArrowLeft, Building2, Phone, Mail, ShieldAlert,
  FileText, TrendingUp, Users, Activity, Clock, Target,
  CalendarDays, DollarSign, AlertTriangle, CheckCircle2,
  Scale, Receipt, Pencil, Plus,
} from "lucide-react";

export default function CRMClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: latestAnalysis } = useQuery({
    queryKey: ["client-latest-analysis", id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_analysis").select("*").eq("client_id", id!)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["client-analyses-summary", id],
    queryFn: async () => {
      const { data } = await supabase.from("credit_analysis")
        .select("id, status, credit_score, limite_sugerido, created_at, recommendation")
        .eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["client-deals", id],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*, deal_stages(name, color)")
        .eq("client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["client-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("*").eq("client_id", id!).order("name");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["client-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("client_id", id!)
        .order("activity_date", { ascending: false }).limit(15);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_tasks").select("*").eq("client_id", id!)
        .order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: blacklistMatch } = useQuery({
    queryKey: ["client-blacklist", id],
    queryFn: async () => {
      if (!client) return null;
      const doc = client.cnpj_cpf.replace(/\D/g, "");
      const { data } = await supabase.from("blacklist").select("*").eq("documento", doc).limit(1).maybeSingle();
      return data;
    },
    enabled: !!client,
  });

  const { data: bankruptcyMatches = [] } = useQuery({
    queryKey: ["client-bankruptcy", id],
    queryFn: async () => {
      const { data } = await supabase.from("bankruptcy_records").select("*")
        .eq("matched_client_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ["client-invoice-stats", id],
    queryFn: async () => {
      const { data } = await supabase.from("monitored_invoices").select("validation_status").eq("client_id", id!);
      const items = data || [];
      return {
        total: items.length,
        valid: items.filter(i => i.validation_status === "valid").length,
        invalid: items.filter(i => i.validation_status === "invalid").length,
        pending: items.filter(i => i.validation_status === "pending").length,
      };
    },
    enabled: !!id,
  });

  const { data: patrimonial = [] } = useQuery({
    queryKey: ["client-patrimonial", id],
    queryFn: async () => {
      const { data } = await supabase.from("patrimonial_info").select("*").eq("client_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const totalDealValue = deals.reduce((sum, d: any) => sum + (d.value || 0), 0);
  const hasAlerts = !!blacklistMatch || bankruptcyMatches.length > 0 || (invoiceStats?.invalid || 0) > 0;
  const score = latestAnalysis?.credit_score;
  const scoreColor = score == null ? "text-muted-foreground" : score >= 700 ? "text-status-approved" : score >= 400 ? "text-status-restricted" : "text-status-rejected";
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress").length;
  const totalPatrimonialValue = patrimonial.reduce((s, p) => s + (p.valor_estimado || 0), 0);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Back + Header */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{client?.razao_social || "..."}</h1>
              <p className="text-sm text-muted-foreground">
                {client ? formatCNPJorCPF(client.cnpj_cpf) : "—"}
                {client?.nome_fantasia && ` · ${client.nome_fantasia}`}
                {client?.segmento && ` · ${client.segmento}`}
                {client?.cidade && ` · ${client.cidade}`}
                {client?.estado && `/${client.estado}`}
              </p>
            </div>
          </div>
          {id && <div className="ml-14 pt-1"><ClientTagManager clientId={id} /></div>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(`/cedentes/${id}`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/analises/nova?client=${id}`)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Análise
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/cedentes/${id}/historico`)}>
            <Clock className="h-3.5 w-3.5 mr-1" /> Histórico
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 flex flex-wrap items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm font-semibold text-destructive">Alertas</span>
            {blacklistMatch && <Badge variant="destructive" className="text-[10px]">Blacklist — {blacklistMatch.motivo || "Restrito"}</Badge>}
            {bankruptcyMatches.length > 0 && <Badge variant="destructive" className="text-[10px]">{bankruptcyMatches.length} falência/RJ</Badge>}
            {(invoiceStats?.invalid || 0) > 0 && <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">{invoiceStats?.invalid} NF inválida(s)</Badge>}
          </CardContent>
        </Card>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiMini icon={Target} label="Score" value={score != null ? String(score) : "—"} sub={score != null ? (score >= 700 ? "Baixo risco" : score >= 400 ? "Moderado" : "Alto risco") : "Sem análise"} />
        <KpiMini icon={DollarSign} label="Limite" value={latestAnalysis?.limite_sugerido ? formatBRL(latestAnalysis.limite_sugerido) : "—"} />
        <KpiMini icon={TrendingUp} label="Pipeline" value={formatBRL(totalDealValue)} sub={`${deals.length} deal(s)`} />
        <KpiMini icon={Users} label="Contatos" value={String(contacts.length)} sub={`${contacts.filter(c => c.is_decision_maker).length} decisor(es)`} />
        <KpiMini icon={Activity} label="Atividades" value={String(activities.length)} />
        <KpiMini icon={CheckCircle2} label="Tarefas" value={`${pendingTasks} pendente(s)`} sub={`${tasks.length} total`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="credit">Crédito ({analyses.length})</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Score de Crédito</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-4">
                {score != null ? (
                  <>
                    <ScoreGauge score={score} />
                    <p className={`text-3xl font-bold mt-2 ${scoreColor}`}>{score}</p>
                    {latestAnalysis && <StatusBadge status={latestAnalysis.status} />}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Nenhuma análise realizada</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(`/analises/nova?client=${id}`)}>
                      Iniciar Análise
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Deals */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Oportunidades Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/pipeline")}>Ver pipeline</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {deals.length === 0 ? <Empty msg="Nenhuma oportunidade" /> : deals.slice(0, 4).map((deal: any) => (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {deal.deal_stages && (
                          <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0"
                            style={{ backgroundColor: deal.deal_stages.color + "20", color: deal.deal_stages.color }}>
                            {deal.deal_stages.name}
                          </Badge>
                        )}
                        {deal.expected_close_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <CalendarDays className="h-3 w-3" /> {formatDate(deal.expected_close_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(deal.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Atividades Recentes
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/atividades")}>Ver todas</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {activities.length === 0 ? <Empty msg="Nenhuma atividade" /> : activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{act.activity_type}</Badge>
                      {act.created_by && <span className="text-[10px] text-muted-foreground">por {act.created_by}</span>}
                    </div>
                    <p className="text-sm mt-0.5 line-clamp-1">{act.description}</p>
                    <time className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(act.activity_date).toLocaleString("pt-BR")}
                    </time>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Contatos
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/contatos")}>Ver todos</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {contacts.length === 0 ? <Empty msg="Nenhum contato" /> : contacts.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.is_decision_maker && <Badge variant="secondary" className="text-[9px] px-1 py-0">Decisor</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{[c.role, c.department].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                      {c.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credit Tab */}
        <TabsContent value="credit" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Score + Latest */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Última Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestAnalysis ? (
                  <>
                    <div className="flex flex-col items-center">
                      <ScoreGauge score={score || 0} />
                      <p className={`text-2xl font-bold mt-1 ${scoreColor}`}>{score ?? "—"}</p>
                      <StatusBadge status={latestAnalysis.status} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <Row label="Limite" value={formatBRL(latestAnalysis.limite_sugerido)} />
                      <Row label="Faturamento" value={formatBRL(latestAnalysis.faturamento_medio)} />
                      <Row label="Prazo médio" value={latestAnalysis.prazo_medio_titulos ? `${latestAnalysis.prazo_medio_titulos}d` : "—"} />
                      <Row label="Concentração máx." value={latestAnalysis.concentracao_maxima ? `${latestAnalysis.concentracao_maxima}%` : "—"} />
                      <Row label="Taxa sugerida" value={latestAnalysis.taxa_sugerida ? `${latestAnalysis.taxa_sugerida}%` : "—"} />
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/analises/${latestAnalysis.id}`)}>
                      <FileText className="h-3.5 w-3.5 mr-1" /> Abrir Dossiê
                    </Button>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma análise</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate(`/analises/nova?client=${id}`)}>
                      Iniciar Análise
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analysis History */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Histórico de Análises</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {analyses.length === 0 ? <Empty msg="Nenhuma análise" /> : analyses.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/analises/${a.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                        a.credit_score != null
                          ? a.credit_score >= 700 ? "bg-status-approved/10 text-status-approved"
                          : a.credit_score >= 400 ? "bg-status-restricted/10 text-status-restricted"
                          : "bg-status-rejected/10 text-status-rejected"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {a.credit_score ?? "—"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(a.created_at)}</p>
                        <p className="text-xs text-muted-foreground">Limite: {formatBRL(a.limite_sugerido)}</p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Patrimonial summary */}
          {patrimonial.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Patrimônio Declarado</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/patrimonial")}>Gerenciar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-lg font-bold">{formatBRL(totalPatrimonialValue)}</span>
                  <span className="text-sm text-muted-foreground">{patrimonial.length} bem(ns)</span>
                  {patrimonial.slice(0, 3).map(p => (
                    <Badge key={p.id} variant="outline" className="text-[10px]">{p.tipo}: {p.descricao}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Deals */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Oportunidades ({deals.length})</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/pipeline")}>Pipeline</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {deals.length === 0 ? <Empty msg="Nenhuma oportunidade" /> : deals.map((deal: any) => (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {deal.deal_stages && (
                          <Badge variant="outline" className="text-[10px] border-0 px-1.5 py-0"
                            style={{ backgroundColor: deal.deal_stages.color + "20", color: deal.deal_stages.color }}>
                            {deal.deal_stages.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatBRL(deal.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Tarefas ({pendingTasks} pendentes)</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/tarefas")}>Ver todas</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {tasks.length === 0 ? <Empty msg="Nenhuma tarefa" /> : tasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      t.status === "done" ? "bg-status-approved" : t.status === "in_progress" ? "bg-status-committee" : "bg-muted-foreground/40"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${t.status === "done" ? "line-through text-muted-foreground" : "font-medium"}`}>{t.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {t.priority === "high" && <span className="text-destructive font-medium">Alta</span>}
                        {t.due_date && <span>{formatDate(t.due_date)}</span>}
                        {t.assigned_to && <span>{t.assigned_to}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Contacts full list */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Contatos ({contacts.length})</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/contatos")}>Gerenciar</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {contacts.length === 0 ? <Empty msg="Nenhum contato" /> : contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.is_decision_maker && <Badge variant="secondary" className="text-[9px] px-1 py-0">Decisor</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{[c.role, c.department].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()}><Mail className="h-3.5 w-3.5 hover:text-primary" /></a>}
                      {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}><Phone className="h-3.5 w-3.5 hover:text-primary" /></a>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Activities full */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Timeline ({activities.length})</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/atividades")}>Registrar</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {activities.length === 0 ? <Empty msg="Nenhuma atividade" /> : activities.slice(0, 8).map((act) => (
                  <div key={act.id} className="p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{act.activity_type}</Badge>
                      {act.created_by && <span className="text-[10px] text-muted-foreground">por {act.created_by}</span>}
                      <time className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                        {new Date(act.activity_date).toLocaleString("pt-BR")}
                      </time>
                    </div>
                    <p className="text-sm mt-0.5 line-clamp-2">{act.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Blacklist */}
            <Card className={blacklistMatch ? "border-destructive/30" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Blacklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blacklistMatch ? (
                  <div className="space-y-1">
                    <Badge variant="destructive" className="text-xs">Documento restrito</Badge>
                    <p className="text-sm">{blacklistMatch.motivo || "Sem motivo informado"}</p>
                    <p className="text-[10px] text-muted-foreground">Adicionado em {formatDate(blacklistMatch.created_at)}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-4">
                    <CheckCircle2 className="h-4 w-4 text-status-approved" />
                    <span className="text-sm text-muted-foreground">Nenhuma restrição</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bankruptcy */}
            <Card className={bankruptcyMatches.length > 0 ? "border-destructive/30" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" /> Falimentar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bankruptcyMatches.length === 0 ? (
                  <div className="flex items-center gap-2 py-4">
                    <CheckCircle2 className="h-4 w-4 text-status-approved" />
                    <span className="text-sm text-muted-foreground">Nenhum registro</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bankruptcyMatches.slice(0, 3).map(b => (
                      <div key={b.id} className="p-2 rounded-lg bg-destructive/5">
                        <p className="text-sm font-medium">{b.company_name}</p>
                        <p className="text-xs text-muted-foreground">{b.type} · {b.status} · {b.court}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> Notas Fiscais
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/monitoramento-nfs")}>Gerenciar</Button>
                </div>
              </CardHeader>
              <CardContent>
                {invoiceStats && invoiceStats.total > 0 ? (
                  <div className="space-y-2">
                    <div className="flex gap-4 text-sm">
                      <span><strong>{invoiceStats.total}</strong> total</span>
                      <span className="text-status-approved"><strong>{invoiceStats.valid}</strong> válidas</span>
                      <span className="text-destructive"><strong>{invoiceStats.invalid}</strong> inválidas</span>
                      <span className="text-muted-foreground"><strong>{invoiceStats.pending}</strong> pendentes</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-4">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nenhuma NF monitorada</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Patrimonial in monitoring */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Patrimônio Declarado</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/patrimonial")}>Gerenciar</Button>
              </div>
            </CardHeader>
            <CardContent>
              {patrimonial.length === 0 ? (
                <Empty msg="Nenhum bem cadastrado" />
              ) : (
                <div className="space-y-1.5">
                  <p className="text-lg font-bold">{formatBRL(totalPatrimonialValue)} <span className="text-sm font-normal text-muted-foreground">em {patrimonial.length} bem(ns)</span></p>
                  {patrimonial.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">{p.descricao}</p>
                        <p className="text-xs text-muted-foreground">{p.tipo} · {p.proprietario || "—"}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatBRL(p.valor_estimado)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiMini({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/50 bg-card/60">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{msg}</p>;
}
