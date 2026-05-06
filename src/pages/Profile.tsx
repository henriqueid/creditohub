import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { toast } from "sonner";
import { Loader2, Lock, User, ShieldCheck, LogOut, Bot, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-[9px] rounded-[10px] text-[14px] outline-none transition-all"
      style={{
        background: disabled ? T.cinza : T.white,
        border: `1px solid ${T.border}`,
        color: disabled ? T.textMute : T.text,
        fontFamily: "var(--font-sans)",
        boxShadow: disabled ? "none" : "var(--shadow-sm)",
      }}
      onFocus={e => !disabled && (e.target.style.borderColor = T.esmeralda)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />
  );
}

function Section({ title, sub, icon: Icon, children }: {
  title: string; sub?: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[16px]"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}
    >
      <div className="px-6 py-5" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(0,212,154,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon style={{ width: 16, height: 16, color: T.esmeralda }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>{title}</p>
            {sub && <p style={{ fontSize: 12, color: T.textMute, marginTop: 1 }}>{sub}</p>}
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState({ full_name: "", cargo: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUser(u);
      supabase.from("profiles").select("full_name, cargo").eq("user_id", u.id).maybeSingle().then(({ data: p }) => {
        if (p) {
          setProfile({ full_name: p.full_name || "", cargo: p.cargo || "" });
          setAnthropicKey((p as any).anthropic_api_key || "");
        }
        setLoading(false);
      });
    });
  }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const name = profile.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "—";

  const saveAnthropicKey = async () => {
    if (!user) return;
    setSavingKey(true);
    const { error } = await supabase.from("profiles").upsert(
      { user_id: user.id, anthropic_api_key: anthropicKey || null } as any,
      { onConflict: "user_id" }
    );
    setSavingKey(false);
    if (error) toast.error("Erro ao salvar chave");
    else toast.success("Chave Anthropic salva!");
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").upsert({ user_id: user.id, full_name: profile.full_name, cargo: profile.cargo }, { onConflict: "user_id" });
    setSavingProfile(false);
    if (error) toast.error("Erro ao salvar perfil");
    else toast.success("Perfil atualizado!");
  };

  const savePassword = async () => {
    if (passwords.next !== passwords.confirm) { toast.error("As senhas não conferem"); return; }
    if (passwords.next.length < 6) { toast.error("A nova senha deve ter no mínimo 6 caracteres"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha atualizada!"); setPasswords({ current: "", next: "", confirm: "" }); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 style={{ width: 22, height: 22, color: T.textMute, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="p-7 space-y-[14px]">
      <PageHeader
        title="Meu perfil"
        subtitle="CONTA E SEGURANÇA"
      />

      {/* Avatar + resumo */}
      <div
        className="rounded-[16px] flex items-center gap-6 px-7 py-6"
        style={{ background: T.marinho, boxShadow: "var(--shadow-md)" }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0 text-[26px] font-semibold"
          style={{ width: 72, height: 72, background: "rgba(0,212,154,0.2)", color: T.esmeralda, letterSpacing: "-0.02em" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 20, fontWeight: 600, color: "#FAFAF7", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{name}</p>
          {profile.cargo && <p style={{ fontSize: 13, color: "rgba(250,250,247,0.60)", marginTop: 3 }}>{profile.cargo}</p>}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(250,250,247,0.40)", marginTop: 6, letterSpacing: "0.04em" }}>
            {user?.email} · membro desde {memberSince}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-[8px] rounded-[999px] text-[12px] font-medium transition-opacity hover:opacity-80"
          style={{ background: "rgba(176,24,42,0.25)", color: "#FF8A94", border: "1px solid rgba(176,24,42,0.35)" }}
        >
          <LogOut style={{ width: 13, height: 13 }} />
          Sair da conta
        </button>
      </div>

      <div className="grid gap-[14px]" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* Informações pessoais */}
        <Section title="Informações pessoais" sub="Nome e cargo exibidos no sistema" icon={User}>
          <div className="space-y-4">
            <Field label="Nome completo">
              <TextInput
                value={profile.full_name}
                onChange={v => setProfile(p => ({ ...p, full_name: v }))}
                placeholder="Seu nome completo"
              />
            </Field>
            <Field label="Cargo / Função">
              <TextInput
                value={profile.cargo}
                onChange={v => setProfile(p => ({ ...p, cargo: v }))}
                placeholder="Ex: Analista de Crédito"
              />
            </Field>
            <Field label="E-mail">
              <TextInput value={user?.email || ""} disabled />
            </Field>
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-[9px] rounded-[999px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: T.marinho, color: "#FAFAF7" }}
            >
              {savingProfile && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
              Salvar informações
            </button>
          </div>
        </Section>

        {/* Configurações de IA */}
        <Section title="Configurações de IA" sub="Chave Anthropic por usuário · não compartilhada" icon={Bot}>
          <div className="space-y-4">
            <div
              className="rounded-[10px] px-4 py-3 text-[12px]"
              style={{ background: "rgba(0,212,154,0.06)", border: `1px solid rgba(0,212,154,0.15)`, color: T.textMute }}
            >
              Gera insights usando{" "}
              <span style={{ fontWeight: 600, color: T.text }}>Claude (Anthropic)</span>.
              Obtenha sua chave em{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline"
                style={{ color: T.esmeralda }}
              >
                console.anthropic.com <ExternalLink style={{ width: 10, height: 10 }} />
              </a>.
              Cada usuário usa sua própria chave — seus créditos, seu controle.
            </div>
            <Field label="Chave de API Anthropic (sk-ant-...)">
              <div className="relative">
                <input
                  value={anthropicKey}
                  onChange={e => setAnthropicKey(e.target.value)}
                  type={showKey ? "text" : "password"}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none transition-all pr-10"
                  style={{
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    fontFamily: "var(--font-mono)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  onFocus={e => (e.target.style.borderColor = T.esmeralda)}
                  onBlur={e => (e.target.style.borderColor = T.border)}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: T.textMute }}
                >
                  {showKey ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </Field>
            {anthropicKey && (
              <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>
                {anthropicKey.startsWith("sk-ant-") ? "✅ Formato válido" : "⚠️ Chave deve começar com sk-ant-"}
              </p>
            )}
            <button
              onClick={saveAnthropicKey}
              disabled={savingKey}
              className="flex items-center gap-2 px-5 py-[9px] rounded-[999px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: T.esmeralda, color: T.marinho }}
            >
              {savingKey && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
              Salvar chave
            </button>
          </div>
        </Section>

        {/* Segurança */}
        <div className="space-y-[14px]">
          <Section title="Alterar senha" sub="Recomendamos uma senha com 12+ caracteres" icon={Lock}>
            <div className="space-y-4">
              <Field label="Nova senha">
                <TextInput
                  value={passwords.next}
                  onChange={v => setPasswords(p => ({ ...p, next: v }))}
                  placeholder="Nova senha"
                />
              </Field>
              <Field label="Confirmar nova senha">
                <TextInput
                  value={passwords.confirm}
                  onChange={v => setPasswords(p => ({ ...p, confirm: v }))}
                  placeholder="Repita a nova senha"
                />
              </Field>
              {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
                <p style={{ fontSize: 12, color: T.danger }}>As senhas não conferem</p>
              )}
              <button
                onClick={savePassword}
                disabled={savingPassword || !passwords.next || !passwords.confirm}
                className="flex items-center gap-2 px-5 py-[9px] rounded-[999px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: T.esmeralda, color: T.marinho }}
              >
                {savingPassword && <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />}
                Atualizar senha
              </button>
            </div>
          </Section>

          <Section title="Sessão e acesso" sub="Informações da conta" icon={ShieldCheck}>
            <div className="space-y-3">
              {[
                { label: "E-mail verificado", value: user?.email_confirmed_at ? "Sim" : "Não", ok: !!user?.email_confirmed_at },
                { label: "Autenticação", value: "E-mail e senha", ok: true },
                { label: "Membro desde", value: memberSince, ok: true },
                { label: "Último acesso", value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("pt-BR") : "—", ok: true },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-[9px]" style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: T.textMute }}>{item.label}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: 12,
                      color: item.ok ? T.text : T.danger,
                      fontWeight: 500,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
