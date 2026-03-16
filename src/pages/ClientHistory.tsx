import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatDate, formatCNPJorCPF, voteLabels, recommendationLabels } from "@/lib/formatters";
import { ArrowLeft, FileText, Users, CheckCircle2, Clock, AlertTriangle, XCircle, Circle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface TimelineEvent {
  id: string;
  date: string;
  type: "analysis_created" | "status_change" | "vote" | "committee_result";
  title: string;
  description: string;
  status?: string;
  meta?: Record<string, string>;
}

function getTimelineIcon(type: TimelineEvent["type"], status?: string) {
  switch (type) {
    case "analysis_created":
      return <FileText className="h-4 w-4 text-primary" />;
    case "status_change":
      return <Clock className="h-4 w-4 text-status-committee" />;
    case "vote":
      if (status === "approve") return <CheckCircle2 className="h-4 w-4 text-status-approved" />;
      if (status === "reject") return <XCircle className="h-4 w-4 text-status-rejected" />;
      return <AlertTriangle className="h-4 w-4 text-status-restricted" />;
    case "committee_result":
      return <Users className="h-4 w-4 text-primary" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ClientHistory() {
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

  const { data: analyses = [] } = useQuery({
    queryKey: ["client-analyses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["client-votes", id],
    queryFn: async () => {
      const analysisIds = analyses.map((a) => a.id);
      if (analysisIds.length === 0) return [];
      const { data, error } = await supabase
        .from("credit_committee")
        .select("*")
        .in("credit_analysis_id", analysisIds)
        .order("vote_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: analyses.length > 0,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["client-results", id],
    queryFn: async () => {
      const analysisIds = analyses.map((a) => a.id);
      if (analysisIds.length === 0) return [];
      const { data, error } = await supabase
        .from("committee_result")
        .select("*")
        .in("credit_analysis_id", analysisIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: analyses.length > 0,
  });

  // Build timeline events
  const timeline: TimelineEvent[] = [];

  analyses.forEach((a) => {
    timeline.push({
      id: `created-${a.id}`,
      date: a.created_at,
      type: "analysis_created",
      title: "Análise criada",
      description: `Analista: ${a.analista_credito || "—"} · Limite sugerido: ${formatBRL(a.limite_sugerido)}`,
      meta: {
        "Recomendação": a.recommendation ? recommendationLabels[a.recommendation] || a.recommendation : "—",
        "Score": a.credit_score?.toString() || "—",
      },
    });

    if (a.status !== "draft") {
      timeline.push({
        id: `status-${a.id}`,
        date: a.updated_at,
        type: "status_change",
        title: "Status alterado",
        description: `Análise movida para status atual`,
        status: a.status,
      });
    }
  });

  votes.forEach((v) => {
    timeline.push({
      id: `vote-${v.id}`,
      date: v.vote_date,
      type: "vote",
      title: `Voto: ${voteLabels[v.vote] || v.vote}`,
      description: `${v.member_name}${v.member_role ? ` (${v.member_role})` : ""}`,
      status: v.vote,
      meta: v.observation ? { "Observação": v.observation } : undefined,
    });
  });

  results.forEach((r) => {
    timeline.push({
      id: `result-${r.id}`,
      date: r.created_at,
      type: "committee_result",
      title: "Decisão do Comitê",
      description: `Decisão final registrada`,
      status: r.decisao_final,
      meta: {
        "Limite aprovado": formatBRL(r.limite_aprovado),
        "Prazo": r.prazo_aprovado ? `${r.prazo_aprovado} dias` : "—",
        "Concentração máx.": r.concentracao_maxima ? `${r.concentracao_maxima}%` : "—",
        ...(r.condicoes_adicionais ? { "Condições": r.condicoes_adicionais } : {}),
      },
    });
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/cedentes")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {/* Client header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Histórico — {client?.razao_social || "..."}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">CNPJ/CPF</span>
              <p className="font-medium tabular-nums">{client ? formatCNPJorCPF(client.cnpj_cpf) : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Segmento</span>
              <p className="font-medium">{client?.segmento || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cidade/UF</span>
              <p className="font-medium">{[client?.cidade, client?.estado].filter(Boolean).join("/") || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total de Análises</span>
              <p className="font-medium">{analyses.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyses summary cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Análises de Crédito</h2>
        {analyses.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma análise encontrada para este cedente.</p>
        ) : (
          <div className="grid gap-3">
            {analyses.map((a) => (
              <Card
                key={a.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/analises/${a.id}`)}
              >
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm">
                        Análise de {formatDate(a.data_analise)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Analista: {a.analista_credito || "—"} · Limite: {formatBRL(a.limite_sugerido)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Audit timeline */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Timeline de Auditoria</h2>
        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum evento registrado.</p>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="relative pl-8 space-y-0">
              {/* vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              {timeline.map((event, idx) => (
                <div key={event.id} className="relative pb-6 last:pb-0">
                  {/* dot */}
                  <div className="absolute -left-8 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border">
                    {getTimelineIcon(event.type, event.status)}
                  </div>

                  <div className="ml-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.title}</span>
                      {event.status && <StatusBadge status={event.status} />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                    <time className="text-xs text-muted-foreground/70 tabular-nums">
                      {new Date(event.date).toLocaleString("pt-BR")}
                    </time>

                    {event.meta && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(event.meta).map(([k, v]) => (
                          <span key={k} className="text-xs">
                            <span className="text-muted-foreground">{k}:</span>{" "}
                            <span className="font-medium">{v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
