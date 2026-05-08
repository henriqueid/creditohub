import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatCNPJorCPF } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { differenceInDays, parseISO } from "date-fns";
import { Clock, Scale, Users, ArrowRight } from "lucide-react";
import { getTier } from "@/lib/credit-calculations";

function daysSince(dateStr: string) {
  try {
    return differenceInDays(new Date(), parseISO(dateStr));
  } catch {
    return 0;
  }
}

function UrgencyBadge({ days }: { days: number }) {
  if (days > 7) return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: T.danger, background: "#F5D6DA", padding: "2px 8px", borderRadius: 99 }}>
      {days}d — urgente
    </span>
  );
  if (days > 3) return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "#7A5B00", background: "#FFF6DC", padding: "2px 8px", borderRadius: 99 }}>
      {days}d — atenção
    </span>
  );
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, background: "rgba(10,21,56,0.06)", padding: "2px 8px", borderRadius: 99 }}>
      {days}d
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div
      className="rounded-[16px] flex items-center gap-4 px-5 py-4"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "var(--shadow-sm)", flex: 1 }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,212,154,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 18, height: 18, color: T.esmeralda }} />
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textMute, marginBottom: 2 }}>{label}</p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function CommitteeQueue() {
  const navigate = useNavigate();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["committee-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf)")
        .eq("status", "in_committee")
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const maxDays = analyses.length > 0
    ? Math.max(...analyses.map(a => daysSince(a.updated_at)))
    : 0;
  const maxLimite = analyses.length > 0
    ? Math.max(...analyses.map(a => a.limite_sugerido || 0))
    : 0;

  return (
    <div className="p-7 space-y-6" style={{ minHeight: "calc(100vh - 104px)" }}>
      <PageHeader
        title="Comitê de Crédito"
        subtitle={`${analyses.length} ANÁLISES EM PAUTA`}
      />

      {/* KPI Strip */}
      <div className="flex gap-4">
        <KpiCard label="Em pauta" value={analyses.length} sub="análises aguardando votação" icon={Users} />
        <KpiCard label="Mais antiga" value={`${maxDays}d`} sub="dias em espera" icon={Clock} />
        <KpiCard label="Maior limite" value={maxLimite ? formatBRL(maxLimite) : "—"} sub="limite solicitado" icon={Scale} />
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20" style={{ color: T.textMute, fontSize: 13 }}>
          Carregando…
        </div>
      ) : analyses.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-[16px]"
          style={{ background: T.white, border: `1px solid ${T.border}` }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(0,212,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Users style={{ width: 22, height: 22, color: T.esmeralda }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Nenhuma análise em pauta</p>
          <p style={{ fontSize: 12, color: T.textMute }}>As análises enviadas ao comitê aparecerão aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyses.map((a) => {
            const name = (a.clients as any)?.razao_social || "—";
            const cnpj = (a.clients as any)?.cnpj_cpf || "";
            const days = daysSince(a.updated_at);
            const tier = a.credit_score ? getTier(a.credit_score) : null;

            return (
              <div
                key={a.id}
                className="rounded-[16px] overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
                style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "var(--shadow-sm)" }}
              >
                {/* Card header */}
                <div
                  className="px-5 py-4 flex items-start justify-between gap-3"
                  style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}
                >
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 2 }}>{name}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textMute }}>{cnpj ? formatCNPJorCPF(cnpj) : "—"}</p>
                  </div>
                  <UrgencyBadge days={days} />
                </div>

                {/* Card body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMute, marginBottom: 2 }}>Score</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: T.text }}>
                        {a.credit_score ?? "—"}
                        {tier && <span style={{ fontSize: 10, fontWeight: 500, color: T.textMute, marginLeft: 4 }}>{tier}</span>}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMute, marginBottom: 2 }}>Limite</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: T.text }}>{formatBRL(a.limite_sugerido)}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: T.textMute, marginBottom: 2 }}>Analista</p>
                      <p style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{a.analista_credito || "—"}</p>
                    </div>
                  </div>

                  {a.parecer_analista && (
                    <p style={{ fontSize: 12, color: T.textMute, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                      "{a.parecer_analista.substring(0, 120)}{a.parecer_analista.length > 120 ? "…" : ""}"
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/comite/${a.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
                    style={{ background: T.marinho, color: "#FAFAF7" }}
                  >
                    Iniciar Votação
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
