import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import {
  Building2, Shield, Zap, Users, Save, Target, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, XCircle, Percent, DollarSign, BarChart3,
  Bot, Bell, CalendarClock, Plug, Plus, Trash2, Edit, TestTube,
  UserSearch, Loader2, ChevronRight,
} from "lucide-react";
import { COMMITTEE_FIELD_OPTIONS, DEFAULT_REQUIRED_FIELDS } from "@/hooks/useCommitteeRequirements";
import CommitteeMembersSection from "@/components/settings/CommitteeMembersSection";

/* ── Types ────────────────────────────────────────────────────────── */

type SettingRow = { id: string; key: string; value: any; category: string; description: string | null; updated_at: string };

function parseValue(val: any): string {
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

type Section = "empresa" | "aprovacao" | "comite" | "membros_comite" | "automacao" | "integracoes" | "acessos";

/* ── Sub-components ────────────────────────────────────────────────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-[14px]">
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</p>
        {hint && <p style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-[14px]">
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</p>
        {hint && <p style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SettingsInput({ value, onChange, type = "text", placeholder, max, min, step, width = 120 }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  max?: number; min?: number; step?: string; width?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      max={max}
      min={min}
      step={step}
      className="px-3 py-[7px] rounded-[8px] text-[13px] outline-none transition-all"
      style={{
        width,
        background: T.white,
        border: `1px solid ${T.border}`,
        color: T.text,
        fontFamily: "var(--font-mono)",
        boxShadow: "var(--shadow-sm)",
      }}
      onFocus={e => (e.target.style.borderColor = T.esmeralda)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textFaint, fontWeight: 500, marginBottom: 2 }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border }} />;
}

/* ── Settings page ─────────────────────────────────────────────────── */

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("empresa");
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("category");
      if (error) throw error;
      return data as SettingRow[];
    },
  });

  const { data: integrationList = [] } = useQuery({
    queryKey: ["integration-configs-count"],
    queryFn: async () => {
      const { data } = await supabase.from("integration_configs").select("id, is_active");
      return data || [];
    },
  });
  const activeIntegrations = integrationList.filter((i: any) => i.is_active).length;
  const totalIntegrations = integrationList.length;

  useEffect(() => {
    if (settings.length > 0 && Object.keys(localSettings).length === 0) {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = parseValue(s.value); });
      setLocalSettings(map);
    }
  }, [settings]);

  const set = (key: string, value: string) => { setLocalSettings(p => ({ ...p, [key]: value })); setDirty(true); };
  const get = (key: string) => localSettings[key] ?? "";
  const getBool = (key: string) => get(key) === "true";
  const getHint = (key: string) => settings.find(s => s.key === key)?.description ?? "";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(localSettings).map(([key, value]) => {
        let jsonValue: any;
        if (value === "true" || value === "false") jsonValue = value === "true";
        else if (!isNaN(Number(value)) && value.trim() !== "") jsonValue = Number(value);
        else jsonValue = value;
        return supabase.from("system_settings").update({ value: jsonValue, updated_at: new Date().toISOString() }).eq("key", key);
      });
      await Promise.all(promises);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["system-settings"] }); setDirty(false); toast.success("Configurações salvas!"); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const NAV: { key: Section; label: string; icon: React.ElementType; badge?: string }[] = [
    { key: "empresa",      label: "Empresa",            icon: Building2 },
    { key: "aprovacao",    label: "Políticas de crédito", icon: Shield },
    { key: "comite",       label: "Requisitos do comitê", icon: CheckCircle2 },
    { key: "membros_comite", label: "Membros do comitê", icon: Users },
    { key: "automacao",    label: "Automações",          icon: Zap },
    { key: "integracoes",  label: "Integrações",         icon: Plug, badge: totalIntegrations > 0 ? `${activeIntegrations}/${totalIntegrations}` : undefined },
    { key: "acessos",      label: "Acessos",             icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 style={{ width: 20, height: 20, color: T.textMute, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title="Configurações"
        subtitle="SISTEMA E OPERAÇÕES"
        actions={
          dirty && (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-5 py-[9px] rounded-[999px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: T.marinho, color: "#FAFAF7" }}
            >
              {saveMutation.isPending ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 13, height: 13 }} />}
              Salvar alterações
            </button>
          )
        }
      />

      {/* Motor de Crédito — destaque */}
      <button
        onClick={() => navigate("/configuracoes/motor")}
        className="w-full flex items-center justify-between px-5 py-4 rounded-[14px] text-left transition-opacity hover:opacity-90"
        style={{
          background: T.marinho,
          boxShadow: "0 4px 14px -6px rgba(10,21,56,0.30)",
        }}
      >
        <div className="flex items-center gap-4">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,212,154,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: 20, height: 20, color: T.esmeralda }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF7" }}>Motor de Crédito</p>
            <p style={{ fontSize: 12, color: "rgba(250,250,247,0.55)", marginTop: 1 }}>Configure pesos, faixas de score e políticas de decisão automática</p>
          </div>
        </div>
        <ChevronRight style={{ width: 18, height: 18, color: "rgba(250,250,247,0.4)" }} />
      </button>

      {/* Sidebar + content */}
      <div className="grid gap-[14px] grid-cols-1 lg:grid-cols-[200px_1fr]">

        {/* Sidebar nav (desktop) / Tabs horizontais (mobile) */}
        <div
          className="rounded-[14px] py-2 h-fit overflow-x-auto lg:overflow-visible"
          style={{
            background: T.white,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
            scrollbarWidth: "none",
          }}
        >
          <div className="flex lg:flex-col">
            {NAV.map(item => {
              const active = section === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className="flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-[10px] text-left transition-colors whitespace-nowrap"
                  style={{
                    background: active ? "rgba(0,212,154,0.08)" : "transparent",
                    borderLeft: `3px solid ${active ? T.esmeralda : "transparent"}`,
                  }}
                >
                  <item.icon style={{ width: 15, height: 15, color: active ? T.esmeralda : T.textMute, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? T.text : T.textMute, flex: 1 }}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div
          className="rounded-[14px]"
          style={{
            background: T.white,
            border: `1px solid ${T.border}`,
            boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
            overflow: "hidden",
          }}
        >

          {/* ── Empresa ──────────────────────────────────────────── */}
          {section === "empresa" && (
            <div>
              <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
                <SectionTitle>Dados da empresa</SectionTitle>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Informações gerais do sistema</p>
              </div>
              <div className="px-6 divide-y" style={{ borderColor: T.border }}>
                <Field label="Nome da empresa" hint={getHint("company_name")}>
                  <SettingsInput value={get("company_name")} onChange={v => set("company_name", v)} width={220} />
                </Field>
                <Field label="CNPJ da empresa" hint={getHint("company_cnpj")}>
                  <SettingsInput value={get("company_cnpj")} onChange={v => set("company_cnpj", v)} placeholder="00.000.000/0000-00" width={200} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Aprovação ─────────────────────────────────────────── */}
          {section === "aprovacao" && (
            <div>
              <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
                <SectionTitle>Políticas de crédito</SectionTitle>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Thresholds, limites e regras de decisão</p>
              </div>
              <div className="px-6 divide-y" style={{ borderColor: T.border }}>

                {/* Comitê */}
                <div className="py-4">
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 2 }}>COMITÊ</p>
                </div>
                <Field label="Membros mínimos do comitê" hint={getHint("min_committee_members")}>
                  <SettingsInput type="number" value={get("min_committee_members")} onChange={v => set("min_committee_members", v)} min={1} max={20} width={80} />
                </Field>

                {/* Score */}
                <div className="py-4">
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 2 }}>THRESHOLDS DE SCORE</p>
                </div>
                <Field label="Score mínimo para aprovação automática" hint={getHint("auto_approve_score")}>
                  <SettingsInput type="number" value={get("auto_approve_score")} onChange={v => set("auto_approve_score", v)} min={0} max={1000} width={80} />
                </Field>
                <Field label="Score máximo para rejeição automática" hint={getHint("auto_reject_score")}>
                  <SettingsInput type="number" value={get("auto_reject_score")} onChange={v => set("auto_reject_score", v)} min={0} max={1000} width={80} />
                </Field>

                {/* Régua visual de score */}
                <div className="py-4">
                  <div className="flex rounded-[8px] overflow-hidden" style={{ height: 28, fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    <div style={{ flex: Number(get("auto_reject_score")) || 300, background: T.danger, display: "flex", alignItems: "center", paddingLeft: 8, color: "#fff", fontSize: 10 }}>
                      0–{get("auto_reject_score") || "300"}
                    </div>
                    <div style={{ flex: (Number(get("auto_approve_score")) || 800) - (Number(get("auto_reject_score")) || 300), background: T.amber, display: "flex", alignItems: "center", paddingLeft: 8, color: T.marinho, fontSize: 10 }}>
                      Análise manual
                    </div>
                    <div style={{ flex: 1000 - (Number(get("auto_approve_score")) || 800), background: T.esmeralda, display: "flex", alignItems: "center", paddingLeft: 8, color: T.marinho, fontSize: 10 }}>
                      {get("auto_approve_score") || "800"}–1000
                    </div>
                  </div>
                </div>

                {/* Limites */}
                <div className="py-4">
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint, marginBottom: 2 }}>LIMITES E TAXAS</p>
                </div>
                <Field label="Concentração máxima (%)" hint={getHint("max_concentration")}>
                  <SettingsInput type="number" value={get("max_concentration")} onChange={v => set("max_concentration", v)} min={1} max={100} width={80} />
                </Field>
                <Field label="Prazo máximo (dias)" hint={getHint("max_term_days")}>
                  <SettingsInput type="number" value={get("max_term_days")} onChange={v => set("max_term_days", v)} min={1} width={80} />
                </Field>
                <Field label="Taxa padrão sugerida (%)" hint={getHint("default_rate")}>
                  <SettingsInput type="number" value={get("default_rate")} onChange={v => set("default_rate", v)} step="0.1" min={0} width={80} />
                </Field>
                <Field label="Limite mínimo de operação (R$)" hint={getHint("min_limit_amount")}>
                  <SettingsInput type="number" value={get("min_limit_amount")} onChange={v => set("min_limit_amount", v)} min={0} width={140} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Comitê — campos obrigatórios ──────────────────────── */}
          {section === "comite" && (() => {
            const raw = get("committee_required_fields");
            let required: string[] = DEFAULT_REQUIRED_FIELDS;
            try {
              if (raw) required = JSON.parse(raw);
            } catch { /* keep default */ }

            const toggleField = (key: string) => {
              const next = required.includes(key)
                ? required.filter(k => k !== key)
                : [...required, key];
              set("committee_required_fields", JSON.stringify(next));
            };

            const toggleBlock = (block: string, allChecked: boolean) => {
              const blockKeys = COMMITTEE_FIELD_OPTIONS.filter(o => o.block === block).map(o => o.key);
              const next = allChecked
                ? required.filter(k => !blockKeys.includes(k))
                : Array.from(new Set([...required, ...blockKeys]));
              set("committee_required_fields", JSON.stringify(next));
            };

            const blocks = Array.from(new Set(COMMITTEE_FIELD_OPTIONS.map(o => o.block)));

            return (
              <div>
                <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
                  <SectionTitle>Requisitos do comitê</SectionTitle>
                  <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>O que precisa estar preenchido para enviar uma análise ao comitê</p>
                  <p style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>
                    {required.length} {required.length === 1 ? "campo marcado" : "campos marcados"} como obrigatórios.
                    Análises sem esses campos preenchidos não conseguem avançar para votação.
                  </p>
                </div>
                <div className="px-6 py-4 space-y-5">
                  {blocks.map(block => {
                    const blockOptions = COMMITTEE_FIELD_OPTIONS.filter(o => o.block === block);
                    const blockChecked = blockOptions.filter(o => required.includes(o.key)).length;
                    const allChecked = blockChecked === blockOptions.length;
                    return (
                      <div key={block} className="rounded-[12px]" style={{ border: `1px solid ${T.border}`, background: T.paper }}>
                        <div
                          className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderBottom: `1px solid ${T.border}`, background: allChecked ? "rgba(0,212,154,0.06)" : T.white }}
                        >
                          <div className="flex items-center gap-2">
                            <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{block}</p>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)", fontSize: 10,
                                padding: "2px 8px", borderRadius: 999,
                                background: blockChecked === 0 ? T.cinza : "rgba(0,212,154,0.12)",
                                color: blockChecked === 0 ? T.textMute : T.esmeralda,
                              }}
                            >
                              {blockChecked}/{blockOptions.length}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleBlock(block, allChecked)}
                            className="text-[11px] font-medium px-2 py-1 rounded-[6px] hover:bg-[rgba(10,21,56,0.04)]"
                            style={{ color: T.textMute, fontFamily: "var(--font-mono)" }}
                          >
                            {allChecked ? "Desmarcar todos" : "Marcar todos"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                          {blockOptions.map(opt => {
                            const checked = required.includes(opt.key);
                            return (
                              <label
                                key={opt.key}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] cursor-pointer transition-colors text-[12.5px] select-none"
                                style={{
                                  background: checked ? "rgba(0,212,154,0.06)" : "transparent",
                                  border: `1px solid ${checked ? "rgba(0,212,154,0.25)" : "transparent"}`,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleField(opt.key)}
                                  className="h-3.5 w-3.5 accent-sink-mint"
                                  style={{ accentColor: T.esmeralda }}
                                />
                                <span style={{ color: checked ? T.text : T.textMute, fontWeight: checked ? 500 : 400 }}>
                                  {opt.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="rounded-[10px] px-4 py-3 text-[12px]"
                    style={{ background: "rgba(0,212,154,0.06)", border: "1px solid rgba(0,212,154,0.20)", color: T.textMute }}
                  >
                    <span style={{ fontWeight: 600, color: T.text }}>Como aplica:</span>{" "}
                    O analista vê esses campos no card "Prontidão para Comitê" do dossiê.
                    O botão "Enviar ao Comitê" só destrava quando 100% deles está preenchido.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Membros do comitê ─────────────────────────────────── */}
          {section === "membros_comite" && <CommitteeMembersSection />}

          {/* ── Automação ─────────────────────────────────────────── */}
          {section === "automacao" && (
            <div>
              <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
                <SectionTitle>Automações</SectionTitle>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Processos executados automaticamente pelo sistema</p>
              </div>
              <div className="px-6 divide-y" style={{ borderColor: T.border }}>
                <Toggle label="Verificação de blacklist" hint="Verifica automaticamente ao criar uma análise" checked={getBool("auto_blacklist_check")} onChange={v => set("auto_blacklist_check", String(v))} />
                <Toggle label="Cálculo automático de score" hint="Calcula com base nos dados preenchidos" checked={getBool("auto_score_calculation")} onChange={v => set("auto_score_calculation", String(v))} />
                <Toggle label="Envio automático ao comitê" hint="Envia quando todos os campos obrigatórios estão preenchidos" checked={getBool("auto_send_committee")} onChange={v => set("auto_send_committee", String(v))} />
                <Toggle label="Notificar análises pendentes" hint="Alerta membros sobre análises aguardando votação" checked={getBool("notify_committee_pending")} onChange={v => set("notify_committee_pending", String(v))} />
                <Toggle label="Follow-up automático de oportunidades" hint="Cria tarefas para deals parados no mesmo estágio" checked={getBool("auto_followup_enabled")} onChange={v => set("auto_followup_enabled", String(v))} />
                <Field label="Dias para follow-up automático" hint="Dias sem movimentação antes de criar tarefa">
                  <SettingsInput type="number" value={get("followup_stale_days")} onChange={v => set("followup_stale_days", v)} min={1} max={90} placeholder="7" width={80} />
                </Field>
                <Field label="Validade da qualificação de prospects (dias)" hint="Dias antes da pré-qualificação expirar">
                  <SettingsInput type="number" value={get("prospect_qualification_validity_days")} onChange={v => set("prospect_qualification_validity_days", v)} min={1} max={365} placeholder="30" width={80} />
                </Field>
                <Field label="Dias para expirar análise sem movimentação" hint={getHint("days_to_expire_analysis")}>
                  <SettingsInput type="number" value={get("days_to_expire_analysis")} onChange={v => set("days_to_expire_analysis", v)} min={1} width={80} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Integrações ───────────────────────────────────────── */}
          {section === "integracoes" && <IntegrationsSection />}

          {/* ── Acessos ───────────────────────────────────────────── */}
          {section === "acessos" && (
            <div>
              <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
                <SectionTitle>Controle de acesso</SectionTitle>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Usuários e permissões</p>
              </div>
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                <div style={{ width: 56, height: 56, borderRadius: 16, background: T.cinza, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users style={{ width: 26, height: 26, color: T.textMute }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Gerenciamento de acessos</p>
                <p style={{ fontSize: 13, color: T.textMute, maxWidth: 380, lineHeight: 1.6 }}>
                  Gerencie usuários, papéis e permissões diretamente no painel do Supabase enquanto este módulo está em desenvolvimento.
                </p>
                <div className="flex gap-2 flex-wrap justify-center mt-2">
                  {["Admin", "Analista", "Comitê", "Comercial"].map(role => (
                    <span key={role} className="px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: T.cinza, color: T.textMute }}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Integrations section ──────────────────────────────────────────── */

interface IntegrationForm {
  name: string; integration_type: string; api_url: string;
  auth_type: string; auth_secret_name: string; notes: string; is_active: boolean;
}

const emptyForm: IntegrationForm = {
  name: "", integration_type: "export_cadastro", api_url: "",
  auth_type: "bearer", auth_secret_name: "", notes: "", is_active: false,
};

const TYPE_LABELS: Record<string, string> = {
  export_cadastro: "Exportar Cadastro",
  webhook: "Webhook",
  api_sync: "Sincronização API",
};

function IntegrationsSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<IntegrationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_configs").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, integration_type: form.integration_type,
        api_url: form.api_url || null, auth_type: form.auth_type,
        auth_secret_name: form.auth_secret_name || null,
        notes: form.notes || null, is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("integration_configs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integration_configs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Integração atualizada!" : "Integração criada!");
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      queryClient.invalidateQueries({ queryKey: ["integration-configs-count"] });
      setDialogOpen(false); setForm(emptyForm); setEditingId(null);
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integration_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integração removida");
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      queryClient.invalidateQueries({ queryKey: ["integration-configs-count"] });
    },
  });

  const openEdit = (item: any) => {
    setForm({ name: item.name, integration_type: item.integration_type, api_url: item.api_url || "", auth_type: item.auth_type || "bearer", auth_secret_name: item.auth_secret_name || "", notes: item.notes || "", is_active: item.is_active });
    setEditingId(item.id); setDialogOpen(true);
  };

  return (
    <div>
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.textFaint, marginBottom: 2 }}>INTEGRAÇÕES</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Conexões com sistemas externos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-[8px] rounded-[999px] text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: T.marinho, color: "#FAFAF7" }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              Nova integração
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} integração</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-1">
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>Nome do sistema</label>
                <input className="w-full mt-1 px-3 py-2 rounded-[8px] border text-[13px]" style={{ border: `1px solid ${T.border}`, background: T.white }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Sistema de Operações XYZ" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: 12, color: T.textMute }}>Tipo</label>
                  <Select value={form.integration_type} onValueChange={v => setForm({ ...form, integration_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="export_cadastro">Exportar Cadastro</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="api_sync">Sincronização API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: T.textMute }}>Autenticação</label>
                  <Select value={form.auth_type} onValueChange={v => setForm({ ...form, auth_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="none">Nenhuma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>URL da API</label>
                <input className="w-full mt-1 px-3 py-2 rounded-[8px] border text-[13px]" style={{ border: `1px solid ${T.border}`, background: T.white }} value={form.api_url} onChange={e => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.sistema.com/v1/..." />
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>Nome da secret (token/chave)</label>
                <input className="w-full mt-1 px-3 py-2 rounded-[8px] border text-[13px]" style={{ border: `1px solid ${T.border}`, background: T.white }} value={form.auth_secret_name} onChange={e => setForm({ ...form, auth_secret_name: e.target.value })} placeholder="SISTEMA_XYZ_API_KEY" />
                <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>Nome da variável de ambiente que contém a credencial.</p>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>Observações</label>
                <Textarea className="mt-1" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <label style={{ fontSize: 13, color: T.text }}>Ativa</label>
              </div>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!form.name || saveMutation.isPending}
                className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: T.marinho, color: "#FAFAF7" }}
              >
                {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar integração"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="py-8 text-center" style={{ color: T.textMute, fontSize: 13 }}>Carregando...</div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <div style={{ width: 48, height: 48, borderRadius: 14, background: T.cinza, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plug style={{ width: 22, height: 22, color: T.textMute }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Nenhuma integração</p>
            <p style={{ fontSize: 13, color: T.textMute, textAlign: "center", maxWidth: 320 }}>
              Configure conexões para enviar dados a sistemas externos via API ou Webhook.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.map((item: any) => (
              <div
                key={item.id}
                className="rounded-[12px] p-4"
                style={{
                  border: `1px solid ${T.border}`,
                  background: item.is_active ? T.paper : T.cinza,
                  opacity: item.is_active ? 1 : 0.7,
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.name}</p>
                  <span
                    className="px-2 py-[2px] rounded-full text-[10px] font-semibold"
                    style={{ background: item.is_active ? "rgba(0,212,154,0.12)" : T.cinza, color: item.is_active ? T.esmeralda : T.textMute }}
                  >
                    {item.is_active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, marginBottom: 2 }}>
                  {TYPE_LABELS[item.integration_type] || item.integration_type}
                </p>
                {item.api_url && (
                  <p className="truncate" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute }}>{item.api_url}</p>
                )}
                {item.notes && <p style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>{item.notes}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(item)} className="flex items-center gap-1 px-3 py-[5px] rounded-[6px] text-[11px] font-medium transition-colors hover:bg-[rgba(10,21,56,0.06)]" style={{ color: T.textMute, border: `1px solid ${T.border}` }}>
                    <Edit style={{ width: 11, height: 11 }} /> Editar
                  </button>
                  <button disabled className="flex items-center gap-1 px-3 py-[5px] rounded-[6px] text-[11px] font-medium opacity-40" style={{ color: T.textMute, border: `1px solid ${T.border}` }}>
                    <TestTube style={{ width: 11, height: 11 }} /> Testar
                  </button>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="ml-auto flex items-center gap-1 px-3 py-[5px] rounded-[6px] text-[11px] font-medium transition-colors hover:bg-[rgba(176,24,42,0.06)]" style={{ color: T.danger }}>
                    <Trash2 style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
