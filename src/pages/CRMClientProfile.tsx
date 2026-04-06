import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ClientTagManager } from "@/components/ClientTagManager";
import { formatBRL, formatDate, formatCNPJorCPF } from "@/lib/formatters";
import {
  ArrowLeft, Building2, Phone, Mail, AlertTriangle, ShieldAlert,
  FileText, TrendingUp, Users, Activity, CheckCircle2, XCircle,
  Clock, Target, CalendarDays, DollarSign,
} from "lucide-react";

export default function CRMClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Client data
  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Latest credit analysis
  const { data: latestAnalysis } = useQuery({
    queryKey: ["client-latest-analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // All analyses count
  const { data: analyses = [] } = useQuery({
    queryKey: ["client-analyses-summary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, status, credit_score, limite_sugerido, created_at, recommendation")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Deals for this client
  const { data: deals = [] } = useQuery({
    queryKey: ["client-deals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, deal_stages(name, color)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["client-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("client_id", id!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Activities
  const { data: activities = [] } = useQuery({
    queryKey: ["client-activities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("client_id", id!)
        .order("activity_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Monitoring alerts: blacklist matches
  const { data: blacklistMatch } = useQuery({
    queryKey: ["client-blacklist", id],
    queryFn: async () => {
      if (!client) return null;
      const doc = client.cnpj_cpf.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("blacklist")
        .select("*")
        .eq("documento", doc)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!client,
  });

  // Bankruptcy matches
  const { data: bankruptcyMatches = [] } = useQuery({
    queryKey: ["client-bankruptcy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bankruptcy_records")
        .select("*")
        .eq("matched_client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Invalid invoices count
  const { data: invalidInvoices = 0 } = useQuery({
    queryKey: ["client-invalid-invoices", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("monitored_invoices")
        .select("*", { count: "exact", head: true })
        .eq("client_id", id!)
        .eq("validation_status", "invalid");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const hasAlerts = !!blacklistMatch || bankruptcyMatches.length > 0 || invalidInvoices > 0;

  const score = latestAnalysis?.credit_score;
  const scoreColor = score == null ? "text-muted-foreground" : score >= 700 ? "text-status-approved" : score >= 400 ? "text-status-restricted" : "text-status-rejected";

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{client?.razao_social || "..."}</h1>
              <p className="text-sm text-muted-foreground">
                {client ? formatCNPJorCPF(client.cnpj_cpf) : "—"}
                {client?.nome_fantasia && ` · ${client.nome_fantasia}`}
                {client?.segmento && ` · ${client.segmento}`}
              </p>
            </div>
          </div>
          {id && (
            <div className="ml-15 pt-1">
              <ClientTagManager clientId={id} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/cedentes/${id}`)}>
            <FileText className="h-4 w-4 mr-1" /> Editar Cadastro
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/cedentes/${id}/historico`)}>
            <Clock className="h-4 w-4 mr-1" /> Histórico
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {hasAlerts && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 flex flex-wrap items-center gap-4">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm font-semibold text-destructive">Alertas de Monitoramento</span>
            {blacklistMatch && (
              <Badge variant="destructive" className="text-xs">
                Blacklist — {blacklistMatch.motivo || "Documento restrito"}
              </Badge>
            )}
            {bankruptcyMatches.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {bankruptcyMatches.length} registro(s) de falência/RJ
              </Badge>
            )}
            {invalidInvoices > 0 && (
              <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                {invalidInvoices} NF(s) inválida(s)
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Score + KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score de Crédito</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-4">
            {score != null ? (
              <>
                <ScoreGauge score={score} />
                <p className={`text-3xl font-bold mt-2 ${scoreColor}`}>{score}</p>
                <p className="text-xs text-muted-foreground">
                  {score >= 700 ? "Baixo risco" : score >= 400 ? "Risco moderado" : "Alto risco"}
                </p>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">Sem análise</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs">Limite Aprovado</span>
            </div>
            <p className="text-2xl font-bold">{latestAnalysis?.limite_sugerido ? formatBRL(latestAnalysis.limite_sugerido) : "—"}</p>
            {latestAnalysis && <StatusBadge status={latestAnalysis.status} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Pipeline CRM</span>
            </div>
            <p className="text-2xl font-bold">{formatBRL(totalDealValue)}</p>
            <p className="text-xs text-muted-foreground">{deals.length} oportunidade(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Contatos / Atividades</span>
            </div>
            <p className="text-2xl font-bold">{contacts.length} / {activities.length}</p>
            <p className="text-xs text-muted-foreground">
              {contacts.filter(c => c.is_decision_maker).length} decisor(es)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Oportunidades
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/crm/pipeline")}>
                Ver pipeline
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {deals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma oportunidade</p>
            ) : (
              deals.slice(0, 5).map((deal: any) => (
                <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {deal.deal_stages && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-0 px-1.5 py-0"
                          style={{ backgroundColor: deal.deal_stages.color + "20", color: deal.deal_stages.color }}
                        >
                          {deal.deal_stages.name}
                        </Badge>
                      )}
                      {deal.expected_close_date && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(deal.expected_close_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatBRL(deal.value)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Contatos
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/crm/contatos")}>
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contato</p>
            ) : (
              contacts.slice(0, 5).map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      {contact.is_decision_maker && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">Decisor</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {[contact.role, contact.department].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {contact.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                    {contact.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Atividades Recentes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/crm/atividades")}>
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade</p>
            ) : (
              activities.slice(0, 5).map((act) => (
                <div key={act.id} className="p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{act.activity_type}</Badge>
                    {act.created_by && <span className="text-[10px] text-muted-foreground">por {act.created_by}</span>}
                  </div>
                  <p className="text-sm mt-0.5 line-clamp-2">{act.description}</p>
                  <time className="text-[10px] text-muted-foreground tabular-nums">
                    {new Date(act.activity_date).toLocaleString("pt-BR")}
                  </time>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Credit Analysis History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Histórico de Análises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma análise</p>
            ) : (
              analyses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/analises/${a.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
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
                      <p className="text-xs text-muted-foreground">
                        Limite: {formatBRL(a.limite_sugerido)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
