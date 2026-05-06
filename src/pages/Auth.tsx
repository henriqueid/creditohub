import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, ArrowRight, Eye, EyeOff,
  Lock, Shield, FileCheck, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { StatsCounter } from "@/components/auth/StatsCounter";
import { MiniPipeline } from "@/components/auth/MiniPipeline";
import { TrilhoHeroLoop } from "@/components/auth/TrilhoHeroLoop";

/* ── Tipos ───────────────────────────────────────────────────────── */

type AuthMode = "login" | "signup" | "forgot";

/* ── Painel decorativo esquerdo ──────────────────────────────────── */

function DecorativePanel() {
  return (
    <div className="hidden lg:flex flex-col relative overflow-hidden bg-marinho w-[52%] shrink-0">
      {/* Hero animado da marca como camada de fundo full-panel */}
      <TrilhoHeroLoop />

      {/* Conteúdo no terço inferior — sobreposto ao hero */}
      <div className="relative z-10 mt-auto flex flex-col gap-7 px-12 pb-10 pt-16"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(7,15,43,0.55) 30%, rgba(7,15,43,0.85) 100%)",
        }}
      >
        {/* STATS STRIP */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
          className="flex items-stretch gap-6"
        >
          <StatBlock
            value={<><span className="text-white/50 text-[18px] mr-1">R$</span><StatsCounter to={2.3} format="currency-bi" delay={800} /></>}
            unit="bi processados"
          />
          <StatDivider />
          <StatBlock
            value={<StatsCounter to={1247} delay={800} />}
            unit="cedentes ativos"
          />
          <StatDivider />
          <StatBlock
            value={<><StatsCounter to={94} format="percent" delay={800} /><span className="text-esmeralda">%</span></>}
            unit="aprovação no comitê"
          />
        </motion.div>

        {/* MINI-PIPELINE */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Esteira do crédito
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <MiniPipeline />
        </motion.div>

        {/* TRUST STRIP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="flex items-center flex-wrap gap-x-5 gap-y-2 pt-1"
        >
          <TrustBadge icon={Lock} label="LGPD" />
          <TrustDot />
          <TrustBadge icon={Shield} label="SSL/TLS" />
          <TrustDot />
          <TrustBadge icon={FileCheck} label="Auditoria automática" />
          <TrustDot />
          <TrustBadge icon={Award} label="SOC 2" />
        </motion.div>
      </div>
    </div>
  );
}

function StatBlock({ value, unit }: { value: React.ReactNode; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <div
        className="text-white font-bold leading-none whitespace-nowrap"
        style={{
          fontSize: 30,
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </div>
      <span className="text-white/50 text-[12px] mt-1">{unit}</span>
    </div>
  );
}

function StatDivider() {
  return <div className="w-px self-stretch bg-gradient-to-b from-transparent via-white/15 to-transparent" />;
}

function TrustBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 12, height: 12, color: "rgba(255,255,255,0.40)" }} />
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">
        {label}
      </span>
    </div>
  );
}

function TrustDot() {
  return <span className="text-white/20 text-xs">·</span>;
}

/* ── Campo de input estilizado ───────────────────────────────────── */

function SinkInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-[11.5px] font-semibold uppercase tracking-wider text-ink/55"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={cn(
            "h-11 bg-white border-cinza text-ink placeholder:text-ink/30",
            "focus-visible:ring-2 focus-visible:ring-esmeralda focus-visible:ring-offset-0 focus-visible:border-esmeralda",
            "rounded-t-sm text-[14px]",
            isPassword && "pr-10"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Botão primário SINK ─────────────────────────────────────────── */

function SinkButton({
  children,
  loading,
  disabled,
  type = "submit",
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "w-full h-11 flex items-center justify-center gap-2 rounded-t-pill",
        "bg-esmeralda text-marinho text-[14px] font-bold tracking-wide",
        "transition-all duration-150",
        "hover:bg-esmeralda-2 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "shadow-sm hover:shadow-t-sm"
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/* ── Auth principal ──────────────────────────────────────────────── */

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  /* Handlers (preservados da implementação original) */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada com sucesso!");
      navigate("/");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de recuperação enviado!");
      setMode("login");
    }
  };

  const handleSubmit =
    mode === "login"
      ? handleLogin
      : mode === "signup"
      ? handleSignup
      : handleForgotPassword;

  const titles: Record<AuthMode, { heading: string; sub: string }> = {
    login: {
      heading: "Bem-vindo de volta",
      sub: "Entre com suas credenciais para acessar a plataforma",
    },
    signup: {
      heading: "Criar conta",
      sub: "Preencha seus dados para se cadastrar",
    },
    forgot: {
      heading: "Recuperar senha",
      sub: "Informe seu email e enviaremos um link de recuperação",
    },
  };

  const ctaLabel: Record<AuthMode, string> = {
    login: "Entrar",
    signup: "Criar Conta",
    forgot: "Enviar Link",
  };

  return (
    <div className="min-h-screen flex bg-off">
      <DecorativePanel />

      {/* Painel direito: formulário em card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-off">
        {/* Logo mobile */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <svg width="28" height="28" viewBox="0 0 64 64" style={{ display: "block", flexShrink: 0 }}>
            <rect x="6" y="20" width="52" height="6" rx="3" fill="#0A1538" />
            <rect x="6" y="38" width="52" height="6" rx="3" fill="#0A1538" />
            <circle cx="46" cy="32" r="7" fill="#00D49A" />
          </svg>
          <span className="text-lg font-medium tracking-tight text-ink" style={{ letterSpacing: "-0.03em" }}>
            Trilho<span style={{ color: "#00D49A" }}>.</span>
          </span>
        </div>

        {/* Card do formulário */}
        <div
          className="w-full max-w-[420px] rounded-[16px] bg-white"
          style={{
            border: "1px solid rgba(10,21,56,0.06)",
            boxShadow: "var(--shadow-md)",
            padding: "40px 36px",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex flex-col gap-7"
            >
              {/* Cabeçalho */}
              <div className="flex flex-col gap-2">
                <h2
                  className="font-bold text-ink"
                  style={{
                    fontSize: 32,
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {titles[mode].heading}
                </h2>
                <p
                  className="text-ink/55"
                  style={{ fontSize: 14.5, lineHeight: 1.6 }}
                >
                  {titles[mode].sub}
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {mode === "signup" && (
                  <SinkInput
                    id="fullName"
                    label="Nome completo"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Seu nome completo"
                    required
                    autoComplete="name"
                  />
                )}

                <SinkInput
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />

                {mode !== "forgot" && (
                  <div className="flex flex-col gap-1.5">
                    <SinkInput
                      id="password"
                      label="Senha"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    {mode === "login" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-[12px] text-esmeralda-dark hover:text-esmeralda font-medium transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <SinkButton loading={loading}>{ctaLabel[mode]}</SinkButton>
              </form>

              {/* Links secundários */}
              <div className="text-center text-[13px] text-ink/45">
                {mode === "login" && (
                  <p>
                    Não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-esmeralda-dark hover:text-esmeralda font-semibold transition-colors"
                    >
                      Cadastre-se
                    </button>
                  </p>
                )}
                {mode === "signup" && (
                  <p>
                    Já tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-esmeralda-dark hover:text-esmeralda font-semibold transition-colors"
                    >
                      Entrar
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-esmeralda-dark hover:text-esmeralda font-semibold transition-colors"
                  >
                    Voltar para o login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rodapé */}
        <p className="text-center text-[11px] text-ink/30 mt-6 font-mono">
          &copy; {new Date().getFullYear()} CreditoHub · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
