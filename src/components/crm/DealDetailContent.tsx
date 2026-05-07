import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ExternalLink, FileSearch, ShieldCheck, ShieldAlert, ShieldX,
  Calendar, User, TrendingUp, MessageSquare, CheckCircle2, Building2, Loader2, Link2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { T } from "@/lib/tokens";
import { formatBRL } from "@/lib/formatters";

interface Deal {
  id: string;
  client_id: string;
  stage_id: string;
  title: string;
  value: number | null;
  monthly_volume?: number | null;
  probability: number | null;
  expected_close_date: string | null;
  responsible: string | null;
  notes: string | null;
  credit_analysis_id: string | null;
  prospect_id?: string | null;
  loss_reason: string | null;
  created_at: string;
  updated_at: string;
  clients?: { id: string; razao_social: string; cnpj_cpf: string };
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  is_active: boolean;
  is_won: boolean;
  is_lost: boolean;
}

interface CreditAnalysis {
  id: string;
  status: string;
  credit_score: number | null;
  limite_sugerido: number | null;
  created_at: string;
  committee_result?: { limite_aprovado: number | null }[];
}

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  activity_date: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  changed_by_email: string | null;
  created_at: string;
  old_data: any;
  new_data: any;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string; icon: React.ElementType }> = {
  draft:               { label: "Em Análise", bg: "#FFF6DC", fg: "#7A5B00", icon: FileSearch },
  in_committee:        { label: "Em Comitê",  bg: "#E8F4FD", fg: "#0A5F9E", icon: FileSearch },
  approved:            { label: "Aprovado",   bg: "#D6F5E8", fg: "#009E73", icon: ShieldCheck },
  approved_restricted: { label: "Restrição",  bg: "#FCE3CE", fg: "#8A3B00", icon: ShieldAlert },
  rejected:            { label: "Reprovado",  bg: "#F5D6DA", fg: "#7A0E1E", icon: ShieldX },
};

interface DealDetailContentProps {
  dealId: string;
  variant?: "sheet" | "page";
}

export function DealDetailContent({ dealId, variant = "page" }: DealDetailContentProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal-detail", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, clients(id, razao_social, cnpj_cpf)")
        .eq("id", dealId)
        .single();
      if (error) throw error;
      return data as Deal;
    },
    enabled: !!dealId,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["deal-stages-all"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_stages").select("*").order("order");
      return (data || []) as Stage[];
    },
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["client-analyses-detail", deal?.client_id],
    queryFn: async () => {
      if (!deal?.client_id) return [];
      const { data } = await supabase
        .from("credit_analysis")
        .select("id, status, credit_score, limite_sugerido, created_at, committee_result(limite_aprovado)")
        .eq("client_id", deal.client_id)
        .order("created_at", { ascending: false });
      return (data || []) as CreditAnalysis[];
    },
    enabled: !!deal?.client_id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date")
        .eq("deal_id", dealId)
        .order("activity_date", { ascending: false })
        .limit(20);
      return (data || []) as Activity[];
    },
    enabled: !!dealId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["deal-tasks", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_tasks")
        .select("id, title, status, priority, due_date")
        .eq("deal_id", dealId)
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(20);
      return (data || []) as Task[];
    },
    enabled: !!dealId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["deal-history", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, changed_by_email, created_at, old_data, new_data")
        .eq("table_name", "deals")
        .eq("record_id", dealId)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data || []) as AuditEntry[];
    },
    enabled: !!dealId,
  });

  // Local edit state
  const [edit, setEdit] = useState<Partial<Deal>>({});

  useEffect(() => {
    if (deal) {
      setEdit({
        title: deal.title,
        value: deal.value,
        monthly_volume: deal.monthly_volume,
        probability: deal.probability ?? 50,
        expected_close_date: deal.expected_close_date,
        responsible: deal.responsible,
        notes: deal.notes,
      });
    }
  }, [deal?.id]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from("deals").update(payload).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-detail", dealId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal-history", dealId] });
      toast.success("Salvo");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const stageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase.from("deals").update({ stage_id: stageId }).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-detail", dealId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["deal-history", dealId] });
      toast.success("Estágio atualizado");
    },
  });

  const linkAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string | null) => {
      const { error } = await supabase.from("deals").update({ credit_analysis_id: analysisId }).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal-detail", dealId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Análise vinculada");
    },
  });

  const saveField = (field: keyof Deal, value: any) => {
    if (deal && (deal as any)[field] !== value) {
      updateMutation.mutate({ [field]: value });
    }
  };

  if (isLoading || !deal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" style={{ width: 22, height: 22, color: T.textMute }} />
      </div>
    );
  }

  const currentStage = stages.find(s => s.id === deal.stage_id);
  const linkedAnalysis = analyses.find(a => a.id === deal.credit_analysis_id);
  const probability = (edit.probability ?? 50) as number;
  const probColor = probability >= 70 ? T.esmeralda : probability >= 40 ? T.amber : T.textMute;

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.10em",
    color: T.textMute,
    marginBottom: 8,
  };

  return (
    <div className={variant === "page" ? "p-4 sm:p-7 space-y-[14px]" : "space-y-[14px] p-1"}>
      {/* Header */}
      <div
        className="rounded-[14px] p-4"
        style={{
          background: T.white,
          border: `1px solid ${T.border}`,
          boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <Input
              value={(edit.title ?? "") as string}
              onChange={e => setEdit(p => ({ ...p, title: e.target.value }))}
              onBlur={() => saveField("title", edit.title)}
              className="border-0 px-0 text-[18px] font-semibold focus-visible:ring-0"
              style={{ color: T.text }}
            />
            {deal.clients && (
              <button
                onClick={() => navigate(`/cedentes/${deal.clients!.id}/perfil`)}
                className="mt-1 flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <Building2 style={{ width: 11, height: 11, color: T.textMute }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute }}>
                  {deal.clients.razao_social}
                </span>
                <ExternalLink style={{ width: 10, height: 10, color: T.textFaint }} />
              </button>
            )}
          </div>
          {currentStage && (
            <span
              className="px-3 py-1 rounded-[999px] flex-shrink-0"
              style={{
                fontSize: 11, fontWeight: 600,
                background: currentStage.color + "22",
                color: currentStage.color,
              }}
            >
              {currentStage.name}
            </span>
          )}
        </div>

        {/* KPIs inline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <div>
            <p style={sectionLabel}>Limite estimado</p>
            <Input
              type="number"
              value={(edit.value ?? "") as number | string}
              onChange={e => setEdit(p => ({ ...p, value: e.target.value === "" ? null : Number(e.target.value) }))}
              onBlur={() => saveField("value", edit.value)}
              className="border-0 px-0 tabular-nums focus-visible:ring-0"
              style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: T.text }}
              placeholder="0"
            />
          </div>
          <div>
            <p style={sectionLabel}>Volume/mês</p>
            <Input
              type="number"
              value={(edit.monthly_volume ?? "") as number | string}
              onChange={e => setEdit(p => ({ ...p, monthly_volume: e.target.value === "" ? null : Number(e.target.value) }))}
              onBlur={() => saveField("monthly_volume", edit.monthly_volume)}
              className="border-0 px-0 tabular-nums focus-visible:ring-0"
              style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: T.esmeralda }}
              placeholder="0"
            />
          </div>
          <div>
            <p style={sectionLabel}>Previsão</p>
            <Input
              type="date"
              value={(edit.expected_close_date ?? "") as string}
              onChange={e => setEdit(p => ({ ...p, expected_close_date: e.target.value || null }))}
              onBlur={() => saveField("expected_close_date", edit.expected_close_date)}
              className="border-0 px-0 focus-visible:ring-0"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text }}
            />
          </div>
          <div>
            <p style={sectionLabel}>Responsável</p>
            <Input
              value={(edit.responsible ?? "") as string}
              onChange={e => setEdit(p => ({ ...p, responsible: e.target.value }))}
              onBlur={() => saveField("responsible", edit.responsible)}
              className="border-0 px-0 focus-visible:ring-0"
              style={{ fontSize: 12, color: T.text }}
              placeholder="—"
            />
          </div>
        </div>
      </div>

      {/* Probability + Stage selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        <div
          className="rounded-[14px] p-4"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={sectionLabel}>Probabilidade</p>
            <span
              className="tabular-nums"
              style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: probColor }}
            >
              {probability}%
            </span>
          </div>
          <Slider
            value={[probability]}
            min={0}
            max={100}
            step={5}
            onValueChange={v => setEdit(p => ({ ...p, probability: v[0] ?? 50 }))}
            onValueCommit={v => saveField("probability", v[0] ?? 50)}
          />
        </div>

        <div
          className="rounded-[14px] p-4"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <p style={sectionLabel}>Estágio</p>
          <div className="flex flex-wrap gap-1.5">
            {stages.filter(s => s.is_active).map(s => (
              <button
                key={s.id}
                onClick={() => stageMutation.mutate(s.id)}
                className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all"
                style={{
                  background: s.id === deal.stage_id ? s.color : T.white,
                  color: s.id === deal.stage_id ? T.white : T.text,
                  border: `1px solid ${s.id === deal.stage_id ? s.color : T.border}`,
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          {deal.loss_reason && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
              <p style={sectionLabel}>Motivo da perda</p>
              <p style={{ fontSize: 12, color: T.danger }}>{deal.loss_reason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar — análise vinculada + prospect origem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        <div
          className="rounded-[14px] p-4"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={sectionLabel}>Análise de crédito</p>
            {linkedAnalysis && (
              <button
                onClick={() => linkAnalysisMutation.mutate(null)}
                className="text-[10px] hover:underline"
                style={{ color: T.textMute }}
              >
                desvincular
              </button>
            )}
          </div>
          {linkedAnalysis ? (
            <button
              onClick={() => navigate(`/analises/${linkedAnalysis.id}`)}
              className="w-full flex items-center justify-between gap-2 p-3 rounded-[10px] transition-all hover:shadow-[0_2px_8px_rgba(10,21,56,0.08)]"
              style={{ background: STATUS_CONFIG[linkedAnalysis.status]?.bg || T.cinza, border: `1px solid ${T.border}` }}
            >
              <div className="text-left min-w-0">
                <p style={{ fontSize: 12, fontWeight: 600, color: STATUS_CONFIG[linkedAnalysis.status]?.fg || T.text }}>
                  {STATUS_CONFIG[linkedAnalysis.status]?.label || linkedAnalysis.status}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginTop: 2 }}>
                  {linkedAnalysis.credit_score != null && <>SCORE {linkedAnalysis.credit_score}</>}
                </p>
                {(() => {
                  const aprovado = linkedAnalysis.committee_result?.[0]?.limite_aprovado;
                  if (aprovado != null && aprovado > 0) {
                    return (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: T.esmeralda, marginTop: 4 }}>
                        {formatBRL(aprovado)} <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>aprovado</span>
                      </p>
                    );
                  }
                  if (linkedAnalysis.limite_sugerido != null) {
                    return (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: T.text, marginTop: 4 }}>
                        {formatBRL(linkedAnalysis.limite_sugerido)} <span style={{ fontSize: 9, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.04em" }}>sugerido</span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <ExternalLink style={{ width: 14, height: 14, color: T.textMute, flexShrink: 0 }} />
            </button>
          ) : analyses.length > 0 ? (
            <div className="space-y-1.5">
              <p style={{ fontSize: 11, color: T.textMute, marginBottom: 8 }}>
                Sem análise vinculada. Selecione uma das análises do cedente:
              </p>
              {analyses.map(a => (
                <button
                  key={a.id}
                  onClick={() => linkAnalysisMutation.mutate(a.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] hover:shadow-[0_2px_8px_rgba(10,21,56,0.08)] transition-all text-left"
                  style={{ background: T.white, border: `1px solid ${T.border}` }}
                >
                  <div className="min-w-0">
                    <p style={{ fontSize: 12, fontWeight: 500, color: T.text }}>
                      {STATUS_CONFIG[a.status]?.label || a.status}
                      {a.credit_score != null && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginLeft: 6 }}>
                          {a.credit_score}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link2 style={{ width: 12, height: 12, color: T.esmeralda, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate(`/analises/nova?client_id=${deal.client_id}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-[12px] font-medium transition-colors"
              style={{ background: T.off, color: T.text, border: `1px dashed ${T.border}` }}
            >
              <FileSearch style={{ width: 13, height: 13 }} />
              Iniciar análise
            </button>
          )}
        </div>

        <div
          className="rounded-[14px] p-4"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <p style={sectionLabel}>Origem</p>
          {(deal as any).prospect_id ? (
            <button
              onClick={() => navigate("/prospects")}
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] hover:opacity-80 transition-opacity"
              style={{ background: "rgba(0,212,154,0.08)", border: "1px solid rgba(0,212,154,0.20)" }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.esmeralda }}>via prospect</span>
              <ExternalLink style={{ width: 11, height: 11, color: T.esmeralda }} />
            </button>
          ) : (
            <p style={{ fontSize: 12, color: T.textFaint }}>Cadastro direto (sem prospect)</p>
          )}
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <p style={sectionLabel}>Criado em</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute }}>
              {new Date(deal.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div
        className="rounded-[14px] p-4"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <p style={sectionLabel}>Observações</p>
        <Textarea
          value={(edit.notes ?? "") as string}
          onChange={e => setEdit(p => ({ ...p, notes: e.target.value }))}
          onBlur={() => saveField("notes", edit.notes)}
          rows={3}
          placeholder="Notas sobre a oportunidade..."
        />
      </div>

      {/* Tarefas pendentes */}
      <div
        className="rounded-[14px] p-4"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <p style={sectionLabel}>Tarefas pendentes</p>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute }}>
            {tasks.length}
          </span>
        </div>
        {tasks.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textFaint }}>Nenhuma tarefa pendente.</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px]"
                style={{ background: T.off, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 style={{ width: 12, height: 12, color: T.textMute, flexShrink: 0 }} />
                  <span className="truncate" style={{ fontSize: 12, color: T.text }}>{t.title}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, flexShrink: 0 }}>
                  {t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atividades */}
      <div
        className="rounded-[14px] p-4"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <p style={sectionLabel}>Atividades</p>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute }}>
            {activities.length}
          </span>
        </div>
        {activities.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textFaint }}>Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="flex gap-2 items-start">
                <MessageSquare style={{ width: 11, height: 11, color: T.textMute, marginTop: 2, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p style={{ fontSize: 12, color: T.text }}>{a.description}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, marginTop: 2 }}>
                    {a.activity_type} · {new Date(a.activity_date).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico */}
      <div
        className="rounded-[14px] p-4"
        style={{ background: T.white, border: `1px solid ${T.border}` }}
      >
        <p style={sectionLabel}>Histórico de movimentação</p>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textFaint }}>Sem histórico registrado.</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => {
              const oldStage = h.old_data?.stage_id;
              const newStage = h.new_data?.stage_id;
              const stageChanged = oldStage && newStage && oldStage !== newStage;
              const oldName = stages.find(s => s.id === oldStage)?.name;
              const newName = stages.find(s => s.id === newStage)?.name;
              return (
                <div key={h.id} className="flex gap-2 items-start text-[11px]">
                  <TrendingUp style={{ width: 10, height: 10, color: T.textFaint, marginTop: 3, flexShrink: 0 }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ color: T.text }}>
                      {stageChanged
                        ? <>Movido de <strong>{oldName || "?"}</strong> para <strong>{newName || "?"}</strong></>
                        : <span style={{ color: T.textMute }}>{h.action}</span>}
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, marginTop: 1 }}>
                      {h.changed_by_email || "—"} · {new Date(h.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
