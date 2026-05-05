import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Tipos ───────────────────────────────────────────────────────── */

type AuthMode = "login" | "signup" | "forgot";

/* ── Rede de nós animada ─────────────────────────────────────────── */

interface Node {
  x: number; y: number; vx: number; vy: number; r: number;
}

function NodeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const MINT = "43,212,156";
    const NODE_COUNT = 28;
    const MAX_DIST = 160;
    let animId: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: 2 + Math.random() * 2.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.35;
            ctx.strokeStyle = `rgba(${MINT},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${MINT},0.55)`;
        ctx.fill();
        // glow ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${MINT},0.12)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  );
}

/* ── Painel decorativo esquerdo ──────────────────────────────────── */

function DecorativePanel() {
  return (
    <div className="hidden lg:flex flex-col relative overflow-hidden bg-sink-deep w-[52%] shrink-0">
      {/* Rede de nós animada */}
      <NodeNetwork />

      {/* Gradiente diagonal interno para profundidade */}
      <div className="absolute inset-0 bg-gradient-to-br from-sink-deep-2/60 via-transparent to-sink-deep-4/50" />

      {/* Orb de glow no canto */}
      <div
        className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(43,212,156,0.15) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -top-16 -left-16 h-48 w-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(43,212,156,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col h-full px-12 py-14">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="CreditoHub" className="h-9 w-9 shrink-0" />
          <span className="text-xl font-bold tracking-tight text-white">
            Credito<span className="text-sink-mint">Hub</span>
          </span>
        </div>

        {/* Texto central */}
        <div className="mt-auto mb-auto flex flex-col gap-5 max-w-[340px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sink-pill border border-sink-mint/30 bg-sink-mint/10 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-sink-mint" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-sink-mint">
              Plataforma de Crédito
            </span>
          </div>

          <h1 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-white">
            Inteligência para{" "}
            <span className="text-sink-mint">decisões</span>{" "}
            de crédito
          </h1>

          <p className="text-[15px] text-sink-fog/60 leading-relaxed">
            Esteira completa — da prospecção ao comitê. Análise, monitoramento
            e CRM integrados em um único lugar.
          </p>
        </div>

        {/* Features footer */}
        <div className="flex flex-col gap-2.5">
          {[
            "Análise de crédito estruturada em dossiê",
            "Comitê com votação e parecer colaborativo",
            "Monitoramento de NFs e informe falimentar",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full bg-sink-mint/20 flex items-center justify-center shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-sink-mint" />
              </div>
              <span className="text-[13px] text-sink-fog/55">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
        className="text-[12px] font-semibold uppercase tracking-wider text-sink-ink/60"
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
            "h-11 bg-white border-sink-fog text-sink-ink placeholder:text-sink-ink/30",
            "focus-visible:ring-2 focus-visible:ring-sink-mint focus-visible:ring-offset-0 focus-visible:border-sink-mint",
            "rounded-sink-sm text-[14px]",
            isPassword && "pr-10"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sink-ink/30 hover:text-sink-ink/60 transition-colors"
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
        "w-full h-11 flex items-center justify-center gap-2 rounded-sink-pill",
        "bg-sink-mint text-sink-deep text-[14px] font-bold tracking-wide",
        "transition-all duration-150",
        "hover:bg-sink-mint-2 active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "shadow-sm hover:shadow-sink-sm"
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

  /* Handlers ── preservando toda a lógica existente */

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

  /* Títulos por modo */
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
    <div className="min-h-screen flex bg-sink-cream">
      {/* Painel esquerdo decorativo */}
      <DecorativePanel />

      {/* Painel direito: formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-sink-cream">
        {/* Logo mobile (só visível no mobile) */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <img src="/logo.svg" alt="CreditoHub" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-sink-ink">
            Credito<span className="text-sink-mint-3">Hub</span>
          </span>
        </div>

        {/* Card do formulário */}
        <div className="w-full max-w-[380px] flex flex-col gap-8">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[1.5rem] font-bold tracking-tight text-sink-ink leading-tight">
              {titles[mode].heading}
            </h2>
            <p className="text-[13px] text-sink-ink/50 leading-relaxed">
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
                      className="text-[12px] text-sink-mint-3 hover:text-sink-mint font-medium transition-colors"
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
          <div className="text-center text-[13px] text-sink-ink/45">
            {mode === "login" && (
              <p>
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-sink-mint-3 hover:text-sink-mint font-semibold transition-colors"
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
                  className="text-sink-mint-3 hover:text-sink-mint font-semibold transition-colors"
                >
                  Entrar
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sink-mint-3 hover:text-sink-mint font-semibold transition-colors"
              >
                Voltar para o login
              </button>
            )}
          </div>

          {/* Rodapé discreto */}
          <p className="text-center text-[11px] text-sink-ink/25 mt-4">
            &copy; {new Date().getFullYear()} CreditoHub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
