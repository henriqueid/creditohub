/**
 * Perfil 360° do cedente — visão consolidada com identificação, status,
 * análises, deals, sacados, sócios, atividades e tarefas.
 *
 * Rota: /cedentes/:id/perfil
 *
 * Não confundir com:
 *   /cedentes/:id          → ClientForm (edição cadastral)
 *   /cedentes/:id/historico → ClientHistory (apenas histórico de análises)
 *   /crm/cliente/:id       → CRMClientProfile (visão CRM, será deprecado)
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCNPJorCPF, formatBRL, formatDate, statusLabels, ESTADOS_BR } from "@/lib/formatters";
import {
  Building2, Edit, FileText, BarChart3, Users, Receipt, Activity,
  CheckSquare, ExternalLink, MapPin, Calendar, Briefcase, Loader2,
  ArrowRight, AlertTriangle, TrendingUp, Workflow, Sparkles, Contact as ContactIcon,
  Save, X as XIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ContactsSection } from "@/components/cedente/ContactsSection";

function getTier(score: number | null) {
  if (!score) return null;
  if (score >= 800) return "AAA";
  if (score >= 700) return "AA";
  if (score >= 600) return "A";
  return "BBB";
}

export default function CedenteProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const startInEdit = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(startInEdit);
  const [editForm, setEditForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    data_fundacao: "",
    segmento: "",
    cidade: "",
    estado: "",
  });

  // ── Cliente ────────────────────────────────────────────────────────
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["cedente-profile", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Hidrata form de edição quando cliente carrega ou ao entrar em edit
  useEffect(() => {
    if (client && editing) {
      setEditForm({
        razao_social: client.razao_social || "",
        nome_fantasia: client.nome_fantasia || "",
        data_fundacao: client.data_fundacao || "",
        segmento: client.segmento || "",
        cidade: client.cidade || "",
        estado: client.estado || "",
      });
    }
  }, [client, editing]);

  const saveCadastral = useMutation({
    mutationFn: async () => {
      if (!editForm.razao_social.trim()) throw new Error("Razão social é obrigatória");
      const { error } = await supabase
        .from("clients")
        .update({
          razao_social: editForm.razao_social,
          nome_fantasia: editForm.nome_fantasia || null,
          data_fundacao: editForm.data_fundacao || null,
          segmento: editForm.segmento || null,
          cidade: editForm.cidade || null,
          estado: editForm.estado || null,
        })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cedente-profile", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cadastro atualizado");
      setEditing(false);
      // limpa o ?edit=1 da URL
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  // ── Análises do cliente ────────────────────────────────────────────
  const { data: analyses = [] } = useQuery({
    queryKey: ["cedente-analyses", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis")
        .select("id, status, credit_score, limite_sugerido, faturamento_medio, data_analise, analista_credito, recommendation, created_at, committee_result(limite_aprovado, prazo_aprovado, decisao_final)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Deals do cliente ───────────────────────────────────────────────
  const { data: deals = [] } = useQuery({
    queryKey: ["cedente-deals", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, value, expected_close_date, responsible, deal_stages(name, is_won, is_lost, color)")
        .eq("client_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Sacados (da análise mais recente) ─────────────────────────────
  const latestAnalysisId = analyses[0]?.id;
  const { data: sacados = [] } = useQuery({
    queryKey: ["cedente-sacados", latestAnalysisId],
    enabled: !!latestAnalysisId,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis_sacados")
        .select("*")
        .eq("credit_analysis_id", latestAnalysisId!);
      return data || [];
    },
  });

  // ── Sócios (da análise mais recente) ──────────────────────────────
  const { data: socios = [] } = useQuery({
    queryKey: ["cedente-socios", latestAnalysisId],
    enabled: !!latestAnalysisId,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis_socios")
        .select("*")
        .eq("credit_analysis_id", latestAnalysisId!);
      return data || [];
    },
  });

  // ── Atividades ─────────────────────────────────────────────────────
  const { data: activities = [] } = useQuery({
    queryKey: ["cedente-activities", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date, created_by")
        .eq("client_id", id!)
        .order("activity_date", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // ── Tarefas pendentes ──────────────────────────────────────────────
  const { data: tasks = [] } = useQuery({
    queryKey: ["cedente-tasks", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_tasks")
        .select("id, title, status, priority, due_date")
        .eq("client_id", id!)
        .neq("status", "completed")
        .order("due_date", { ascending: true });
      return data || [];
    },
  });

  // ── Derived ───────────────────────────────────────────────────────
  const latestAnalysis = analyses[0] as any;
  const bestScore = Math.max(0, ...analyses.map(a => a.credit_score || 0));
  const tier = getTier(bestScore);
  const limiteAprovadoTotal = analyses.reduce((sum, a) =>
    sum + ((a as any).committee_result?.[0]?.limite_aprovado ?? 0), 0);
  const overallStatus = latestAnalysis?.status as string | undefined;
  const activeDeals = deals.filter(d => {
    const s = (d as any).deal_stages;
    return s && !s.is_won && !s.is_lost;
  });
  const wonDeals = deals.filter(d => (d as any).deal_stages?.is_won);

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-7">
        <p style={{ color: T.textMute }}>Cedente não encontrado.</p>
        <button
          onClick={() => navigate("/cedentes")}
          className="mt-3 text-[13px] font-medium underline"
          style={{ color: T.esmeralda }}
        >
          Voltar para o portfólio
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title={client.razao_social || "—"}
        subtitle={`${formatCNPJorCPF(client.cnpj_cpf || "")} · ${client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "Local não informado"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/cedentes/${id}/historico`)}
              className="px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
              style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5 inline" /> Histórico
            </button>
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    const next = new URLSearchParams(searchParams);
                    next.delete("edit");
                    setSearchParams(next, { replace: true });
                  }}
                  className="px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                  style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
                >
                  <XIcon className="h-3.5 w-3.5 mr-1.5 inline" /> Cancelar edição
                </button>
                <button
                  onClick={() => saveCadastral.mutate()}
                  disabled={saveCadastral.isPending}
                  className="px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: T.esmeralda, color: T.marinho }}
                >
                  {saveCadastral.isPending
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 inline animate-spin" />
                    : <Save className="h-3.5 w-3.5 mr-1.5 inline" />}
                  Salvar cadastro
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5 inline" /> Editar cadastro
              </button>
            )}
            {latestAnalysis ? (
              <button
                onClick={() => navigate(`/analises/${latestAnalysis.id}`)}
                className="px-[14px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: T.marinho }}
              >
                Abrir análise atual <ArrowRight className="h-3.5 w-3.5 ml-1 inline" />
              </button>
            ) : (
              <button
                onClick={() => navigate(`/analises/nova?client_id=${id}`)}
                className="px-[14px] py-[9px] rounded-[999px] text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{ background: T.esmeralda, color: T.marinho }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" /> Iniciar análise
              </button>
            )}
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiBlock
          label="Status"
          value={overallStatus ? <StatusBadge status={overallStatus} /> : <span style={{ color: T.textFaint }}>Sem análise</span>}
        />
        <KpiBlock
          label="Score"
          value={bestScore > 0 ? String(bestScore) : "—"}
          color={bestScore >= 700 ? T.esmeralda : bestScore >= 400 ? T.amber : bestScore > 0 ? T.danger : T.textMute}
        />
        <KpiBlock
          label="Tier"
          value={tier ? <StatusBadge status={tier} /> : <span style={{ color: T.textFaint }}>—</span>}
        />
        <KpiBlock
          label="Limite aprovado"
          value={limiteAprovadoTotal > 0 ? formatBRL(limiteAprovadoTotal) : "—"}
          color={limiteAprovadoTotal > 0 ? T.esmeralda : T.textMute}
        />
        <KpiBlock
          label="Faturamento"
          value={latestAnalysis?.faturamento_medio ? formatBRL(latestAnalysis.faturamento_medio) : "—"}
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">

        {/* Coluna 1: Identificação + Sócios */}
        <div className="space-y-[14px]">
          <Section title="Identificação" icon={Building2}>
            {editing ? (
              <div className="space-y-3 py-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Razão social *</Label>
                  <Input
                    value={editForm.razao_social}
                    onChange={(e) => setEditForm((p) => ({ ...p, razao_social: e.target.value }))}
                    className="h-8 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Nome fantasia</Label>
                  <Input
                    value={editForm.nome_fantasia}
                    onChange={(e) => setEditForm((p) => ({ ...p, nome_fantasia: e.target.value }))}
                    className="h-8 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">CNPJ/CPF</Label>
                  <p className="text-[13px] py-1.5 font-mono" style={{ color: T.textMute }}>
                    {formatCNPJorCPF(client.cnpj_cpf || "")} <span className="text-[10px] uppercase tracking-wider ml-2">(não editável)</span>
                  </p>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Segmento</Label>
                  <Input
                    value={editForm.segmento}
                    onChange={(e) => setEditForm((p) => ({ ...p, segmento: e.target.value }))}
                    className="h-8 text-[13px]"
                    placeholder="Ex: Indústria têxtil"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Data de fundação</Label>
                  <Input
                    type="date"
                    value={editForm.data_fundacao}
                    onChange={(e) => setEditForm((p) => ({ ...p, data_fundacao: e.target.value }))}
                    className="h-8 text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Cidade</Label>
                    <Input
                      value={editForm.cidade}
                      onChange={(e) => setEditForm((p) => ({ ...p, cidade: e.target.value }))}
                      className="h-8 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">UF</Label>
                    <Select
                      value={editForm.estado}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, estado: v }))}
                    >
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Row label="Razão social" value={client.razao_social || "—"} />
                <Row label="Nome fantasia" value={client.nome_fantasia || "—"} />
                <Row label="CNPJ/CPF" value={formatCNPJorCPF(client.cnpj_cpf || "")} mono />
                <Row label="Segmento" value={client.segmento || "—"} />
                <Row label="Fundação" value={client.data_fundacao ? formatDate(client.data_fundacao) : "—"} />
                <Row label="Local" value={client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "—"} />
              </>
            )}
          </Section>

          <Section title="Contatos" icon={ContactIcon}>
            <ContactsSection clientId={id!} />
          </Section>

          <Section title={`Sócios (${socios.length})`} icon={Users}>
            {socios.length === 0 ? (
              <Empty text="Sem sócios cadastrados" />
            ) : (
              socios.map((s: any) => (
                <div key={s.id} className="py-2 flex justify-between items-center" style={{ borderTop: `1px solid ${T.border}`, fontSize: 13 }}>
                  <div className="min-w-0">
                    <p style={{ fontWeight: 500, color: T.text }}>{s.nome || "—"}</p>
                    <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>
                      {s.cargo || "—"}
                    </p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text, fontWeight: 600 }}>
                    {s.participacao ? `${s.participacao}%` : "—"}
                  </span>
                </div>
              ))
            )}
          </Section>
        </div>

        {/* Coluna 2: Análises + Deals */}
        <div className="space-y-[14px]">
          <Section title={`Análises (${analyses.length})`} icon={BarChart3} action={
            analyses.length > 0 && (
              <button
                onClick={() => navigate(`/cedentes/${id}/historico`)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}
              >
                VER TODOS →
              </button>
            )
          }>
            {analyses.length === 0 ? (
              <Empty text="Nenhuma análise" />
            ) : (
              analyses.slice(0, 4).map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/analises/${a.id}`)}
                  className="w-full py-2 flex justify-between items-center text-left transition-colors hover:bg-[rgba(10,21,56,0.02)] rounded-[6px] px-2 -mx-2"
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={a.status} />
                      {a.credit_score && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute }}>
                          Score {a.credit_score}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: "var(--font-mono)" }}>
                      {formatDate(a.created_at)} {a.analista_credito && `· ${a.analista_credito}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.committee_result?.[0]?.limite_aprovado ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: T.esmeralda }}>
                        {formatBRL(a.committee_result[0].limite_aprovado)}
                      </span>
                    ) : a.limite_sugerido ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.textMute }}>
                        ~{formatBRL(a.limite_sugerido)}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </Section>

          <Section title={`Deals (${deals.length})`} icon={Workflow}>
            {deals.length === 0 ? (
              <Empty text="Nenhum deal vinculado" />
            ) : (
              <>
                {activeDeals.length > 0 && (
                  <div className="mb-2">
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 4 }}>
                      Em andamento
                    </p>
                    {activeDeals.slice(0, 3).map((d: any) => (
                      <button
                        key={d.id}
                        onClick={() => navigate(`/crm/pipeline`)}
                        className="w-full py-2 flex justify-between items-center text-left transition-colors hover:bg-[rgba(10,21,56,0.02)] rounded-[6px] px-2 -mx-2"
                      >
                        <div className="min-w-0">
                          <p style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{d.title}</p>
                          <p style={{ fontSize: 11, color: T.textMute }}>
                            {d.deal_stages?.name} {d.responsible && `· ${d.responsible}`}
                          </p>
                        </div>
                        {d.value && (
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: T.text }}>
                            {formatBRL(d.value)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {wonDeals.length > 0 && (
                  <p style={{ fontSize: 11, color: T.textFaint, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                    <CheckSquare className="h-3 w-3 inline mr-1" style={{ color: T.esmeralda }} />
                    {wonDeals.length} ganho{wonDeals.length > 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}
          </Section>
        </div>

        {/* Coluna 3: Sacados + Atividades + Tarefas */}
        <div className="space-y-[14px]">
          <Section title={`Sacados (${sacados.length})`} icon={Receipt}>
            {sacados.length === 0 ? (
              <Empty text="Sem sacados na análise" />
            ) : (
              sacados.slice(0, 5).map((s: any) => (
                <div key={s.id} className="py-2 flex justify-between items-center" style={{ borderTop: `1px solid ${T.border}`, fontSize: 13 }}>
                  <div className="min-w-0">
                    <p style={{ fontWeight: 500, color: T.text }}>{s.sacado_nome || "—"}</p>
                    {s.prazo_medio && (
                      <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>
                        Prazo {s.prazo_medio} dias
                      </p>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text, fontWeight: 600 }}>
                    {s.percentual_faturamento ? `${s.percentual_faturamento.toFixed(0)}%` : "—"}
                  </span>
                </div>
              ))
            )}
          </Section>

          <Section title={`Tarefas pendentes (${tasks.length})`} icon={CheckSquare}>
            {tasks.length === 0 ? (
              <Empty text="Sem tarefas pendentes" />
            ) : (
              tasks.slice(0, 4).map((t: any) => (
                <div key={t.id} className="py-2 flex justify-between items-center gap-2" style={{ borderTop: `1px solid ${T.border}`, fontSize: 13 }}>
                  <div className="min-w-0">
                    <p style={{ fontWeight: 500, color: T.text }}>{t.title}</p>
                    {t.due_date && (
                      <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>
                        Vence {formatDate(t.due_date)}
                      </p>
                    )}
                  </div>
                  {t.priority === "high" && (
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: T.danger }} />
                  )}
                </div>
              ))
            )}
          </Section>

          <Section title="Atividades recentes" icon={Activity}>
            {activities.length === 0 ? (
              <Empty text="Sem atividades" />
            ) : (
              activities.slice(0, 5).map((a: any) => (
                <div key={a.id} className="py-2" style={{ borderTop: `1px solid ${T.border}`, fontSize: 12 }}>
                  <p style={{ color: T.text }}>{a.description || "—"}</p>
                  <p style={{ fontSize: 10, color: T.textFaint, fontFamily: "var(--font-mono)", marginTop: 2 }}>
                    {a.activity_type} · {formatDate(a.activity_date)}
                  </p>
                </div>
              ))
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function KpiBlock({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div
      className="rounded-[14px] px-4 py-3"
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>
        {label}
      </p>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? T.text, fontFamily: "var(--font-mono)", lineHeight: 1.2, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: T.esmeralda }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="px-4 py-2">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2" style={{ borderTop: `1px solid ${T.border}`, fontSize: 13 }}>
      <span style={{ color: T.textMute }}>{label}</span>
      <span style={{ color: T.text, fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)" }}>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="py-3 text-center" style={{ fontSize: 12, color: T.textFaint }}>{text}</p>
  );
}
