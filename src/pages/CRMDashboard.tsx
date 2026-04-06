import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, Target, Trophy, XCircle, Users, Handshake, 
  CheckSquare, Clock, ArrowRight, BarChart3, DollarSign, 
  Calendar, Activity, Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area
} from "recharts";
import { useMemo } from "react";

interface Stage { id: string; name: string; order: number; color: string; is_won: boolean; is_lost: boolean; }
interface Deal { id: string; stage_id: string; value: number | null; responsible: string | null; expected_close_date: string | null; created_at: string; title: string; clients?: { razao_social: string }; }

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CRMDashboard() {
  const navigate = useNavigate();

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

  const { data: contactCount = 0 } = useQuery({
    queryKey: ["contacts-count"],
    queryFn: async () => {
      const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Derived data
  const activeStages = useMemo(() => stages.filter(s => !s.is_won && !s.is_lost), [stages]);
  const wonStage = stages.find(s => s.is_won);
  const lostStage = stages.find(s => s.is_lost);

  const activeDeals = useMemo(() => deals.filter(d => {
    const s = stages.find(st => st.id === d.stage_id);
    return s && !s.is_won && !s.is_lost;
  }), [deals, stages]);

  const wonDeals = useMemo(() => deals.filter(d => d.stage_id === wonStage?.id), [deals, wonStage]);
  const lostDeals = useMemo(() => deals.filter(d => d.stage_id === lostStage?.id), [deals, lostStage]);

  const pipelineTotal = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const lostTotal = lostDeals.reduce((s, d) => s + (d.value || 0), 0);
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / Math.max(wonDeals.length + lostDeals.length, 1)) * 100) : 0;
  const avgDealValue = activeDeals.length > 0 ? pipelineTotal / activeDeals.length : 0;

  // Funnel data
  const funnelData = useMemo(() => {
    return activeStages.map(stage => {
      const stageDeals = deals.filter(d => d.stage_id === stage.id);
      return {
        name: stage.name,
        count: stageDeals.length,
        value: stageDeals.reduce((s, d) => s + (d.value || 0), 0),
        color: stage.color,
      };
    });
  }, [activeStages, deals]);

  // Conversion rates between stages
  const conversionData = useMemo(() => {
    if (activeStages.length < 2) return [];
    const results: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < activeStages.length - 1; i++) {
      const fromCount = deals.filter(d => {
        const s = stages.find(st => st.id === d.stage_id);
        return s && s.order >= activeStages[i].order;
      }).length;
      const toCount = deals.filter(d => {
        const s = stages.find(st => st.id === d.stage_id);
        return s && s.order >= activeStages[i + 1].order;
      }).length;
      results.push({
        from: activeStages[i].name,
        to: activeStages[i + 1].name,
        rate: fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0,
      });
    }
    return results;
  }, [activeStages, deals, stages]);

  // Ranking by responsible
  const responsibleRanking = useMemo(() => {
    const map = new Map<string, { total: number; won: number; count: number; wonValue: number }>();
    deals.forEach(d => {
      const name = d.responsible || "Não atribuído";
      const entry = map.get(name) || { total: 0, won: 0, count: 0, wonValue: 0 };
      entry.count++;
      entry.total += d.value || 0;
      if (d.stage_id === wonStage?.id) { entry.won++; entry.wonValue += d.value || 0; }
      map.set(name, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [deals, wonStage]);

  // Forecast: weighted pipeline
  const forecastData = useMemo(() => {
    const monthMap = new Map<string, number>();
    activeDeals.forEach(d => {
      if (!d.expected_close_date) return;
      const month = d.expected_close_date.slice(0, 7);
      const stage = stages.find(s => s.id === d.stage_id);
      if (!stage) return;
      // Weight by stage position
      const weight = stage.order / Math.max(...activeStages.map(s => s.order), 1);
      monthMap.set(month, (monthMap.get(month) || 0) + (d.value || 0) * weight);
    });
    return Array.from(monthMap.entries())
      .map(([month, value]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        forecast: Math.round(value),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(0, 6);
  }, [activeDeals, stages, activeStages]);

  // Win/Loss pie
  const winLossData = [
    { name: "Ganhos", value: wonDeals.length, color: "#22c55e" },
    { name: "Perdidos", value: lostDeals.length, color: "#ef4444" },
    { name: "Em aberto", value: activeDeals.length, color: "hsl(var(--primary))" },
  ].filter(d => d.value > 0);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { month: string; ganhos: number; perdidos: number; novos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const ganhos = wonDeals.filter(dl => dl.created_at.startsWith(key)).length;
      const perdidos = lostDeals.filter(dl => dl.created_at.startsWith(key)).length;
      const novos = deals.filter(dl => dl.created_at.startsWith(key)).length;
      months.push({ month: label, ganhos, perdidos, novos });
    }
    return months;
  }, [deals, wonDeals, lostDeals]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard CRM</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada do funil comercial</p>
        </div>
        <button onClick={() => navigate("/crm/pipeline")} className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver Pipeline <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Target} label="Pipeline" value={BRL(pipelineTotal)} accent="primary" onClick={() => navigate("/crm/pipeline")} />
        <KpiCard icon={Trophy} label="Ganhos" value={BRL(wonTotal)} accent="success" />
        <KpiCard icon={TrendingUp} label="Taxa Conversão" value={`${winRate}%`} accent="primary" />
        <KpiCard icon={Handshake} label="Deals Ativos" value={String(activeDeals.length)} onClick={() => navigate("/crm/pipeline")} />
        <KpiCard icon={CheckSquare} label="Tarefas Pendentes" value={String(taskCount)} accent={taskCount > 5 ? "warning" : undefined} onClick={() => navigate("/crm/tarefas")} />
        <KpiCard icon={Activity} label="Atividades (7d)" value={String(activityCount)} onClick={() => navigate("/crm/atividades")} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-3">
                {funnelData.map((stage, i) => {
                  const maxCount = Math.max(...funnelData.map(s => s.count), 1);
                  const pct = (stage.count / maxCount) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                          <span className="font-medium text-foreground">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-[10px]">{stage.count}</Badge>
                          <span className="text-muted-foreground w-24 text-right">{BRL(stage.value)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
                      </div>
                    </div>
                  );
                })}

                {/* Conversion rates */}
                {conversionData.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Taxas de Conversão</p>
                    <div className="flex flex-wrap gap-2">
                      {conversionData.map((c, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs bg-muted/50 rounded-md px-2 py-1">
                          <span className="text-muted-foreground">{c.from}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{c.to}</span>
                          <Badge variant="outline" className={cn("text-[10px] ml-1", c.rate >= 50 ? "text-green-600 border-green-500/30" : c.rate >= 25 ? "text-amber-600 border-amber-500/30" : "text-red-600 border-red-500/30")}>
                            {c.rate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma oportunidade no funil</div>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {winLossData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={winLossData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {winLossData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => v} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {winLossData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}: <span className="font-semibold text-foreground">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Forecast de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Area type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" fill="url(#forecastGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">Defina datas de fechamento nas oportunidades para gerar forecast</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Tendência Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="novos" name="Novos" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ganhos" name="Ganhos" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="perdidos" name="Perdidos" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Ranking de Responsáveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {responsibleRanking.length > 0 ? (
            <div className="space-y-2">
              {responsibleRanking.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-amber-500/20 text-amber-600" : i === 1 ? "bg-gray-300/30 text-gray-500" : i === 2 ? "bg-orange-400/20 text-orange-500" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.count} deal{r.count !== 1 ? "s" : ""} • {r.won} ganho{r.won !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{BRL(r.wonValue)}</p>
                    <p className="text-[10px] text-muted-foreground">Pipeline: {BRL(r.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhum responsável atribuído</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, onClick }: { icon: React.ElementType; label: string; value: string; accent?: "primary" | "success" | "warning"; onClick?: () => void }) {
  const accentColors = {
    primary: "text-primary",
    success: "text-green-600",
    warning: "text-amber-600",
  };
  return (
    <button onClick={onClick} className={cn("text-left p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors", onClick && "cursor-pointer")}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", accent ? accentColors[accent] : "text-muted-foreground")} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", accent ? accentColors[accent] : "text-foreground")}>{value}</p>
    </button>
  );
}
