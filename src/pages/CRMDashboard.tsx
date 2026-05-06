import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/formatters";
import { T } from "@/lib/tokens";
import { Card } from "@/components/trilho/Card";
import { KPI } from "@/components/trilho/KPI";
import { SectionTitle } from "@/components/trilho/SectionTitle";
import { DataTable } from "@/components/trilho/DataTable";
import { StatusBadge } from "@/components/trilho/StatusBadge";
import { PageHeader } from "@/components/trilho/PageHeader";
import { Sparkline } from "@/components/trilho/Sparkline";
import { NewDealDialog } from "@/components/crm/NewDealDialog";

const BRL = (v: number) => formatBRL(v);

interface Stage { id: string; name: string; order: number; color: string; is_won: boolean; is_lost: boolean; }
interface Deal { id: string; stage_id: string; value: number | null; responsible: string | null; expected_close_date: string | null; created_at: string; title: string; clients?: { razao_social: string }; }

export default function CRMDashboard() {
  const navigate = useNavigate();
  const [newDealOpen, setNewDealOpen] = useState(false);

  const { data: stages = [] } = useQuery({
    queryKey: ["deal-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_stages").select("*").eq("is_active", true).order("order");
      return (data || []) as Stage[];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*, clients(razao_social)").order("created_at", { ascending: false });
      return (data || []) as Deal[];
    },
  });

  const { data: taskCount = 0 } = useQuery({
    queryKey: ["crm-tasks-pending-count"],
    queryFn: async () => {
      const { count } = await supabase.from("crm_tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"]);
      return count || 0;
    },
  });

  const { data: activityCount = 0 } = useQuery({
    queryKey: ["activities-week-count"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("activities").select("*", { count: "exact", head: true }).gte("activity_date", weekAgo);
      return count || 0;
    },
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, activity_type, description, activity_date, clients(razao_social)")
        .order("activity_date", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const wonStage = stages.find(s => s.is_won);
  const lostStage = stages.find(s => s.is_lost);
  const activeDeals = useMemo(() => deals.filter(d => {
    const s = stages.find(st => st.id === d.stage_id);
    return s && !s.is_won && !s.is_lost;
  }), [deals, stages]);
  const wonDeals = useMemo(() => deals.filter(d => d.stage_id === wonStage?.id), [deals, wonStage]);

  const pipelineTotal = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);

  // Ranking por responsável
  const responsibleRanking = useMemo(() => {
    const map = new Map<string, { total: number; wonValue: number }>();
    deals.forEach(d => {
      const name = d.responsible || "Não atribuído";
      const entry = map.get(name) || { total: 0, wonValue: 0 };
      entry.total += d.value || 0;
      if (d.stage_id === wonStage?.id) entry.wonValue += d.value || 0;
      map.set(name, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.wonValue - a.wonValue)
      .slice(0, 5);
  }, [deals, wonStage]);

  const maxRanking = responsibleRanking[0]?.wonValue || 1;

  // Sparklines
  const now = new Date();
  const buildWeekly = (items: { created_at: string }[]) => {
    const w = 7;
    const ms = 7 * 86400000;
    const c = Array(w).fill(0);
    items.forEach(i => {
      const idx = Math.floor((now.getTime() - new Date(i.created_at).getTime()) / ms);
      if (idx >= 0 && idx < w) c[w - 1 - idx]++;
    });
    return c;
  };
  const sparkPipeline = buildWeekly(activeDeals);
  const sparkActivities = Array(7).fill(0).map((_, i) => Math.max(1, activityCount - i * 2));

  // Funil por estágio — limite (cap) e volume mensal por coluna
  const funnelStages = useMemo(() =>
    stages.filter(s => !s.is_won && !s.is_lost).map(s => {
      const stageDeals = deals.filter(d => d.stage_id === s.id);
      return {
        name: s.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
        monthly_volume: stageDeals.reduce((sum, d) => sum + ((d as any).monthly_volume || 0), 0),
      };
    }), [stages, deals]);

  return (
    <div className="p-7 space-y-[14px]">
      <PageHeader
        title="Painel comercial"
        subtitle={`EQUIPE COMERCIAL · ${new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase()}`}
        actions={
          <>
            <button
              className="px-[14px] py-[6px] rounded-[999px] text-[12px] font-medium border transition-colors hover:bg-[#F0F1EB]"
              style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
            >
              Filtrar
            </button>
            <button
              onClick={() => setNewDealOpen(true)}
              className="px-[16px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--marinho)" }}
            >
              + Nova oportunidade
            </button>
          </>
        }
      />

      <NewDealDialog
        open={newDealOpen}
        onOpenChange={setNewDealOpen}
        onCreated={() => navigate("/crm/pipeline")}
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Pipeline aberto" value={BRL(pipelineTotal)} sub={`${activeDeals.length} deals`} trend="vs. mês ant." spark={sparkPipeline} />
        <KPI label="Ganhos acumulados" value={BRL(wonTotal)} sub={`${wonDeals.length} deals fechados`} trend="acumulado" trendDir="up" />
        <KPI label="Tarefas pendentes" value={String(taskCount)} sub="pendentes" trendDir={taskCount > 5 ? "down" : "up"} />
        <KPI label="Atividades · semana" value={String(activityCount)} sub="últimos 7 dias" spark={sparkActivities} />
      </div>

      {/* Funil + Ranking */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <Card padding={18}>
          <SectionTitle
            action={<span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}>PIPELINE</span>}
          >
            Funil de conversão
          </SectionTitle>
          <div className="flex items-end gap-4 mt-4" style={{ height: 180, paddingBottom: 8 }}>
            {funnelStages.map((s, i) => {
              const maxCount = funnelStages[0]?.count || 1;
              const h = Math.max((s.count / maxCount) * 140, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: T.text, lineHeight: 1 }}>
                    {BRL(s.value).replace("R$ ", "R$")}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: T.esmeralda, marginBottom: 4 }}>
                    {s.monthly_volume > 0 ? `${BRL(s.monthly_volume)}/mês` : "—"}
                  </div>
                  <div
                    className="w-full rounded-[3px_3px_0_0]"
                    style={{ height: h, background: i === funnelStages.length - 1 ? T.esmeralda : T.marinho, opacity: 1 - i * 0.12 }}
                  />
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{s.count}</div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap" style={{ fontSize: 11, color: T.textMute }}>
            {funnelStages.map((s, i) => (
              <span key={i} className="flex-1 text-center truncate">{s.name}</span>
            ))}
          </div>
          <p style={{ fontSize: 10, color: T.textFaint, marginTop: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
            LIMITE TOTAL · <span style={{ color: T.esmeralda }}>VOLUME/MÊS</span>
          </p>
        </Card>

        <Card padding={18}>
          <SectionTitle>Ranking de responsáveis</SectionTitle>
          {responsibleRanking.map((r, i) => (
            <div key={i} className="py-[10px]" style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}>
              <div className="flex justify-between items-center mb-[5px]">
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 500 : 400, color: T.text }}>
                  <span style={{ color: T.textFaint, fontFamily: "var(--font-mono)", fontSize: 11, marginRight: 8 }}>
                    0{i + 1}
                  </span>
                  {r.name}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text, fontWeight: 500 }}>
                  {BRL(r.wonValue)}
                </span>
              </div>
              <div style={{ height: 4, background: T.cinza, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(r.wonValue / maxRanking) * 100}%`,
                    height: "100%",
                    background: i === 0 ? T.esmeralda : T.marinho,
                  }}
                />
              </div>
            </div>
          ))}
          {responsibleRanking.length === 0 && (
            <div className="py-6 text-center" style={{ fontSize: 13, color: T.textMute }}>
              Nenhum dado disponível
            </div>
          )}
        </Card>
      </div>

      {/* Atividades recentes */}
      <Card padding={0}>
        <div
          className="flex justify-between items-center px-[18px] py-[14px]"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Atividades recentes</div>
          <button
            onClick={() => navigate("/crm/atividades")}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: T.textFaint, letterSpacing: "0.08em" }}
          >
            VER TODAS →
          </button>
        </div>
        <DataTable
          cols={[
            { key: "date", label: "Quando", width: "110px", mono: true },
            { key: "type", label: "Tipo", width: "120px" },
            { key: "client", label: "Cliente", width: "1.6fr" },
            { key: "desc", label: "Descrição", width: "1.4fr" },
          ]}
          rows={recentActivities.map((a: any) => ({
            date: new Date(a.activity_date || a.created_at).toLocaleDateString("pt-BR"),
            type: a.activity_type || "—",
            client: (a.clients as any)?.razao_social || "—",
            desc: a.description || "—",
          }))}
          onRowClick={() => navigate("/crm/atividades")}
        />
      </Card>
    </div>
  );
}
