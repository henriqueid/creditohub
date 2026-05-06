import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, formatCNPJorCPF, voteLabels, recommendationLabels } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { Card } from "@/components/trilho/Card";
import { PageHeader } from "@/components/trilho/PageHeader";
import { DataTable } from "@/components/trilho/DataTable";

interface TimelineEvent {
  id: string;
  date: string;
  type: "analysis_created" | "status_change" | "vote" | "committee_result" | "deal_created" | "activity" | "task";
  title: string;
  description: string;
  status?: string;
  meta?: Record<string, string>;
}

function getDotColor(type: TimelineEvent["type"], status?: string) {
  if (type === "vote") {
    if (status === "approve") return T.esmeralda;
    if (status === "reject") return T.red;
    return T.amber;
  }
  if (type === "committee_result" || type === "deal_created") return T.esmeralda;
  if (type === "analysis_created") return T.marinho;
  return T.cinza;
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

  const { data: deals = [] } = useQuery({
    queryKey: ["client-deals-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, deal_stages(name, color)")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: crmActivities = [] } = useQuery({
    queryKey: ["client-activities-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("client_id", id!)
        .order("activity_date", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: crmTasks = [] } = useQuery({
    queryKey: ["client-tasks-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_tasks")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id,
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

  deals.forEach((d: any) => {
    timeline.push({
      id: `deal-${d.id}`,
      date: d.created_at,
      type: "deal_created",
      title: "Oportunidade criada",
      description: d.title,
      meta: {
        ...(d.value ? { "Valor": formatBRL(d.value) } : {}),
        ...(d.deal_stages?.name ? { "Etapa": d.deal_stages.name } : {}),
        ...(d.responsible ? { "Responsável": d.responsible } : {}),
        ...(d.credit_analysis_id ? { "Origem": "Análise de crédito" } : {}),
      },
    });
  });

  crmActivities.forEach((act: any) => {
    timeline.push({
      id: `act-${act.id}`,
      date: act.activity_date,
      type: "activity",
      title: `Atividade: ${act.activity_type}`,
      description: act.description,
      meta: act.created_by ? { "Por": act.created_by } : undefined,
    });
  });

  crmTasks.forEach((t: any) => {
    timeline.push({
      id: `task-${t.id}`,
      date: t.completed_at || t.created_at,
      type: "task",
      title: t.completed_at ? `Tarefa concluída: ${t.title}` : `Tarefa criada: ${t.title}`,
      description: t.description || "—",
      status: t.status,
      meta: {
        ...(t.priority ? { "Prioridade": t.priority } : {}),
        ...(t.due_date ? { "Prazo": new Date(t.due_date).toLocaleDateString("pt-BR") } : {}),
        ...(t.assigned_to ? { "Responsável": t.assigned_to } : {}),
      },
    });
  });

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const cnpjDisplay = client ? formatCNPJorCPF(client.cnpj_cpf) : "—";

  return (
    <div className="p-7 space-y-[14px]">
      <PageHeader
        title={client?.razao_social || "Histórico do cedente"}
        subtitle={`${cnpjDisplay} · ${analyses.length} ANÁLISES`}
        actions={
          <button
            onClick={() => navigate("/cedentes")}
            className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
            style={{ border: "1px solid var(--border-strong)", color: T.text }}
          >
            ← Voltar
          </button>
        }
      />

      {/* Info strip */}
      <Card padding={16}>
        <div className="grid grid-cols-4 gap-4">
          {[
            ["CNPJ/CPF", cnpjDisplay, true],
            ["Segmento", client?.segmento || "—", false],
            ["Cidade/UF", [client?.cidade, client?.estado].filter(Boolean).join("/") || "—", false],
            ["Análises", String(analyses.length), true],
          ].map(([label, value, mono], i) => (
            <div key={i}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginTop: 3, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Analyses */}
      <Card padding={0}>
        <div className="px-[18px] py-[14px]" style={{ borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 500, color: T.text }}>
          Análises de crédito
        </div>
        <DataTable
          cols={[
            { key: "date", label: "Data", width: "120px", mono: true },
            { key: "analista", label: "Analista", width: "1.4fr" },
            { key: "score", label: "Score", width: "80px", align: "right", mono: true },
            { key: "limite", label: "Limite", width: "140px", align: "right", mono: true },
            { key: "status", label: "Status", width: "130px" },
          ]}
          rows={analyses.map(a => ({
            date: formatDate(a.data_analise) || "—",
            analista: a.analista_credito || "—",
            score: a.credit_score ? String(a.credit_score) : "—",
            limite: formatBRL(a.limite_sugerido),
            status: <StatusBadge status={a.status} />,
          }))}
          onRowClick={(_, i) => navigate(`/analises/${analyses[i].id}`)}
        />
      </Card>

      {/* Timeline */}
      <Card padding={18}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 16 }}>Timeline de auditoria</div>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textMute, textAlign: "center", padding: "24px 0" }}>Nenhum evento registrado.</div>
        ) : (
          <div className="relative" style={{ paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 7, top: 4, bottom: 4, width: 1, background: T.border }} />
            {timeline.map((event, idx) => (
              <div key={event.id} style={{ position: "relative", paddingBottom: idx < timeline.length - 1 ? 20 : 0 }}>
                <div style={{
                  position: "absolute", left: -17, top: 4, width: 9, height: 9,
                  borderRadius: "50%", background: getDotColor(event.type, event.status),
                }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, letterSpacing: "0.06em" }}>
                  {new Date(event.date).toLocaleString("pt-BR")}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text, marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  {event.title}
                  {event.status && <StatusBadge status={event.status} />}
                </div>
                {event.description && (
                  <div style={{ fontSize: 12, color: T.textMute, marginTop: 1 }}>{event.description}</div>
                )}
                {event.meta && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "2px 16px", marginTop: 4 }}>
                    {Object.entries(event.meta).map(([k, v]) => (
                      <span key={k} style={{ fontSize: 11, color: T.textMute }}>
                        {k}: <span style={{ color: T.text, fontWeight: 500 }}>{v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
