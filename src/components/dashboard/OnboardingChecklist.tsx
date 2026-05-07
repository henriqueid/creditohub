import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";
import { T } from "@/lib/tokens";

const DISMISS_KEY = "onboarding.dismissed";

type Step = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  cta: string;
  href: string;
};

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  const { data: counts } = useQuery({
    queryKey: ["onboarding-counts"],
    queryFn: async () => {
      const [clients, deals, members, settings, contacts] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("deal_stages").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("committee_members").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("system_settings").select("key").eq("key", "committee_required_fields").maybeSingle(),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
      ]);
      return {
        clients: clients.count ?? 0,
        stages: deals.count ?? 0,
        committee: members.count ?? 0,
        committeeReqs: !!settings.data,
        contacts: contacts.count ?? 0,
      };
    },
  });

  if (!counts) return null;

  const steps: Step[] = [
    {
      key: "stages",
      title: "Configurar etapas do funil",
      description: "Defina as etapas do seu Pipeline comercial (Qualificação → Proposta → Fechamento, etc.)",
      done: counts.stages > 0,
      cta: "Ver Pipeline",
      href: "/crm/pipeline",
    },
    {
      key: "committee",
      title: "Adicionar membros do comitê",
      description: "Pelo menos 1 membro precisa estar cadastrado pra você votar análises",
      done: counts.committee > 0,
      cta: "Configurar comitê",
      href: "/configuracoes",
    },
    {
      key: "client",
      title: "Cadastrar primeiro cedente",
      description: "Comece pela Consulta de CNPJ pra puxar dados da Receita automaticamente",
      done: counts.clients > 0,
      cta: counts.clients > 0 ? "Ver cedentes" : "Nova consulta",
      href: counts.clients > 0 ? "/cedentes" : "/consulta",
    },
    {
      key: "contacts",
      title: "Adicionar contato no cedente",
      description: "Quem decide, quem assina, quem paga — registre os contatos relevantes",
      done: counts.contacts > 0,
      cta: counts.clients > 0 ? "Abrir um cedente" : "Cadastrar cedente primeiro",
      href: counts.clients > 0 ? "/cedentes" : "/consulta",
    },
  ];

  const totalDone = steps.filter((s) => s.done).length;
  const allDone = totalDone === steps.length;

  // Esconde quando tudo feito ou usuário dispensou
  if (allDone || dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* */ }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: `linear-gradient(135deg, ${T.esmeralda}08 0%, ${T.esmeralda}03 100%)`,
        border: `1px solid ${T.esmeralda}25`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, background: `${T.esmeralda}18`, color: T.esmeralda }}
          >
            <Sparkles style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
              Configure seu workspace
            </h3>
            <p style={{ fontSize: 12.5, color: T.textMute, marginTop: 2 }}>
              {totalDone} de {steps.length} passos concluídos. Termine pra liberar o fluxo completo.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-[rgba(10,21,56,0.05)]"
          title="Dispensar"
        >
          <X style={{ width: 14, height: 14, color: T.textMute }} />
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden mb-4"
        style={{ background: "rgba(10,21,56,0.07)" }}
      >
        <div
          style={{
            height: "100%",
            width: `${(totalDone / steps.length) * 100}%`,
            background: T.esmeralda,
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-3 p-3 rounded-[10px]"
            style={{
              background: T.white,
              border: `1px solid ${s.done ? T.esmeralda : T.border}40`,
              opacity: s.done ? 0.7 : 1,
            }}
          >
            {s.done ? (
              <CheckCircle2 style={{ width: 18, height: 18, color: T.esmeralda, flexShrink: 0 }} />
            ) : (
              <Circle style={{ width: 18, height: 18, color: T.textFaint, flexShrink: 0 }} />
            )}
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, textDecoration: s.done ? "line-through" : "none" }}>
                {s.title}
              </p>
              {!s.done && (
                <p style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{s.description}</p>
              )}
            </div>
            {!s.done && (
              <button
                onClick={() => navigate(s.href)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-[12px] font-medium text-white transition-opacity hover:opacity-90 flex-shrink-0"
                style={{ background: T.marinho }}
              >
                {s.cta}
                <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
