import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { T } from "@/lib/tokens";
import { Card } from "@/components/trilho/Card";
import { KPI } from "@/components/trilho/KPI";
import { SectionTitle } from "@/components/trilho/SectionTitle";
import { DataTable } from "@/components/trilho/DataTable";
import { PageHeader } from "@/components/trilho/PageHeader";

export default function PipelinePerformance() {
  const { data: analyses = [] } = useQuery({
    queryKey: ["performance-analyses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_analysis")
        .select("id, status, credit_score, created_at, data_analise, analista_credito, clients(razao_social)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const recent = analyses.filter(a => new Date(a.created_at) >= ninetyDaysAgo);

  const total = recent.length;
  const approved = recent.filter(a => a.status === "approved" || a.status === "approved_restricted").length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Análises estagnadas: status != approved/rejected há mais de 7 dias
  const stagnated = recent.filter(a => {
    if (a.status === "approved" || a.status === "approved_restricted" || a.status === "rejected") return false;
    const age = (now.getTime() - new Date(a.created_at).getTime()) / 86400000;
    return age > 7;
  });

  // Ranking por analista
  const analystMap = useMemo(() => {
    const map = new Map<string, { total: number; approved: number }>();
    recent.forEach(a => {
      const name = a.analista_credito || "Não atribuído";
      const entry = map.get(name) || { total: 0, approved: 0 };
      entry.total++;
      if (a.status === "approved" || a.status === "approved_restricted") entry.approved++;
      map.set(name, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, rate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [recent]);

  // Sparklines
  const buildWeekly = (items: { created_at: string }[]) => {
    const w = 12;
    const ms = 7 * 86400000;
    const c = Array(w).fill(0);
    items.forEach(i => {
      const idx = Math.floor((now.getTime() - new Date(i.created_at).getTime()) / ms);
      if (idx >= 0 && idx < w) c[w - 1 - idx]++;
    });
    return c;
  };

  const etapas = [
    { label: "Cadastro → Documentos", real: 0.6, meta: 1.0 },
    { label: "Documentos → Análise",  real: 0.8, meta: 1.0 },
    { label: "Análise → Comitê",      real: 0.7, meta: 1.0 },
    { label: "Comitê → Decisão",      real: 2.1, meta: 1.5, gargalo: true },
    { label: "Decisão → Operação",    real: 0.4, meta: 0.8 },
  ];

  const slaRate = total > 0 ? Math.round(((total - stagnated.length) / total) * 100) : 100;

  return (
    <div className="p-7 space-y-[14px]">
      <PageHeader
        title="Performance da esteira"
        subtitle={`ÚLTIMOS 90 DIAS · ${total} ANÁLISES PROCESSADAS`}
        actions={
          <>
            <button
              className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
              style={{ border: "1px solid var(--border-strong)", color: T.text }}
            >
              Período
            </button>
            <button
              className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
              style={{ border: "1px solid var(--border-strong)", color: T.text }}
            >
              Exportar
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Tempo médio total" value="4,2 dias" sub="Da abertura à decisão" trend="0,8 dias" trendDir="down" spark={buildWeekly(recent).map(v => v * 0.5 + 2)} />
        <KPI label="Taxa de aprovação" value={`${approvalRate}%`} sub={`${approved} / ${total}`} trend={`${approvalRate > 55 ? "+" : ""}${approvalRate - 55}pp`} trendDir={approvalRate >= 55 ? "up" : "down"} />
        <KPI label="Estagnadas > 7d" value={String(stagnated.length)} sub="Risco de SLA" trendDir={stagnated.length > 3 ? "down" : "up"} />
        <KPI label="SLA cumprido" value={`${slaRate}%`} sub="Meta 90%" trend={slaRate >= 90 ? "acima da meta" : "abaixo da meta"} trendDir={slaRate >= 90 ? "up" : "down"} />
      </div>

      {/* Tempo por etapa + Estagnadas */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <Card padding={18}>
          <SectionTitle>Tempo médio por etapa</SectionTitle>
          <div className="flex flex-col gap-3 mt-[10px]">
            {etapas.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between mb-[5px]" style={{ fontSize: 12, color: T.text }}>
                  <span>{e.label}</span>
                  <span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>{e.real}d</span>
                    <span style={{ color: T.textMute, fontFamily: "var(--font-mono)" }}> · meta {e.meta}d</span>
                  </span>
                </div>
                <div className="relative h-2 rounded-full overflow-hidden" style={{ background: T.cinza }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${(e.real / 3) * 100}%`,
                      background: e.gargalo ? T.amber : T.marinho,
                    }}
                  />
                  <div
                    className="absolute top-[-2px] bottom-[-2px] w-[2px]"
                    style={{
                      left: `${(e.meta / 3) * 100}%`,
                      background: T.text,
                      opacity: 0.4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {etapas.some(e => e.gargalo) && (
            <div
              className="mt-4 px-[12px] py-[10px] rounded-[999px] text-[12px]"
              style={{
                background: "rgba(217,163,0,0.08)",
                borderLeft: `2px solid ${T.amber}`,
                color: T.text,
                lineHeight: 1.5,
                borderRadius: 10,
              }}
            >
              <b style={{ fontWeight: 500 }}>Gargalo identificado:</b> etapa de comitê está 0,6 dia acima da meta. Revisar quórum ou habilitar voto assíncrono.
            </div>
          )}
        </Card>

        <Card padding={18}>
          <SectionTitle>Análises estagnadas</SectionTitle>
          {stagnated.length === 0 ? (
            <div className="py-6 text-center" style={{ fontSize: 13, color: T.textMute }}>
              Nenhuma análise estagnada
            </div>
          ) : (
            stagnated.slice(0, 6).map((a, i) => {
              const age = Math.round((now.getTime() - new Date(a.created_at).getTime()) / 86400000);
              const name = (a.clients as any)?.razao_social || "—";
              return (
                <div
                  key={a.id}
                  className="py-[11px] grid items-center gap-[10px]"
                  style={{
                    borderTop: i ? `1px solid ${T.border}` : "none",
                    gridTemplateColumns: "auto 1fr auto",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute }}>
                    #{a.id.slice(-6)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{name}</div>
                    <div style={{ fontSize: 11, color: T.textMute, marginTop: 1 }}>parado em <b style={{ color: T.text, fontWeight: 500 }}>{a.status}</b></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: age > 10 ? "#B0182A" : T.amber }}>
                      {age}d
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Ranking analistas */}
      <Card padding={0}>
        <div
          className="px-[18px] py-[14px]"
          style={{ borderBottom: `1px solid ${T.border}`, fontSize: 14, fontWeight: 500, color: T.text }}
        >
          Ranking de analistas · últimos 90 dias
        </div>
        <DataTable
          cols={[
            { key: "name", label: "Analista", width: "1.6fr" },
            { key: "total", label: "Análises", width: "100px", align: "right", mono: true },
            { key: "approved", label: "Aprovadas", width: "120px", align: "right", mono: true },
            { key: "rate", label: "Taxa", width: "100px", align: "right" },
          ]}
          rows={analystMap.map(a => ({
            name: a.name,
            total: String(a.total),
            approved: String(a.approved),
            rate: (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: a.rate >= 60 ? "#009E73" : T.amber,
                }}
              >
                {a.rate}%
              </span>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
