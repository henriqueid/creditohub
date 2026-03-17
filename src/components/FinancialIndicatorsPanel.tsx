import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Area, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/formatters";
import {
  type RiskDimension, type FinancialRatios,
  calculateFinancialRatios, calculateRiskRadar, calculateOverallRiskScore,
  suggestRate, parseRevenueData, calculateConcentration,
} from "@/lib/credit-calculations";
import { RiskRadarChart } from "@/components/RiskRadarChart";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  TrendingUp, TrendingDown, DollarSign, Shield, Percent, Users, BarChart3,
  Activity, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle, CheckCircle2, XCircle
} from "lucide-react";

interface FinancialIndicatorsPanelProps {
  creditScore: number | null;
  faturamentoMedio: number | null;
  receitaLiquida: number | null;
  capitalSocial: number | null;
  limiteSugerido: number | null;
  volumeEstimado: number | null;
  numeroFuncionarios: number | null;
  margemLiquida: string | null;
  indiceLiquidez: string | null;
  prazoMedioTitulos: number | null;
  protestos: string | null;
  pendencias: string | null;
  acoesJudiciais: string | null;
  chequesSemFundo: string | null;
  historicoPagamentos: string | null;
  tempoAtividade: string | null;
  faturamentoDetalhado: string | null;
  sacados: { sacado_nome: string; percentual_faturamento: number | null }[];
  socios: { participacao: number | null }[];
}

function KPICard({ label, value, subtext, icon: Icon, trend, className }: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {trend && (
              <div className={cn("flex items-center gap-0.5 text-[10px] font-semibold",
                trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
              )}>
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> :
                 trend === "down" ? <ArrowDownRight className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrafficLight({ label, status, detail }: { label: string; status: "good" | "warning" | "danger" | "neutral"; detail?: string }) {
  const Icon = status === "good" ? CheckCircle2 : status === "danger" ? XCircle : AlertTriangle;
  const color = status === "good" ? "text-emerald-600" : status === "danger" ? "text-red-600" : status === "warning" ? "text-amber-600" : "text-muted-foreground";
  const bg = status === "good" ? "bg-emerald-50 dark:bg-emerald-950" : status === "danger" ? "bg-red-50 dark:bg-red-950" : status === "warning" ? "bg-amber-50 dark:bg-amber-950" : "bg-muted/30";

  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg", bg)}>
      <Icon className={cn("h-4 w-4 shrink-0", color)} />
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold", color)}>{label}</p>
        {detail && <p className="text-[10px] text-muted-foreground truncate">{detail}</p>}
      </div>
    </div>
  );
}

export function FinancialIndicatorsPanel(props: FinancialIndicatorsPanelProps) {
  const concentration = useMemo(() => calculateConcentration(props.sacados), [props.sacados]);

  const ratios = useMemo(() => calculateFinancialRatios({
    receitaLiquida: props.receitaLiquida,
    faturamentoMedio: props.faturamentoMedio,
    capitalSocial: props.capitalSocial,
    limiteSugerido: props.limiteSugerido,
    volumeEstimado: props.volumeEstimado,
    numeroFuncionarios: props.numeroFuncionarios,
    margemLiquida: props.margemLiquida,
    indiceLiquidez: props.indiceLiquidez,
  }), [props.receitaLiquida, props.faturamentoMedio, props.capitalSocial, props.limiteSugerido, props.volumeEstimado, props.numeroFuncionarios, props.margemLiquida, props.indiceLiquidez]);

  const radarDimensions = useMemo(() => calculateRiskRadar({
    creditScore: props.creditScore,
    faturamentoMedio: props.faturamentoMedio,
    limiteSugerido: props.limiteSugerido,
    volumeEstimado: props.volumeEstimado,
    sacadosCount: props.sacados.length,
    sociosCount: props.socios.length,
    protestos: props.protestos,
    pendencias: props.pendencias,
    acoesJudiciais: props.acoesJudiciais,
    chequesSemFundo: props.chequesSemFundo,
    historicoPagamentos: props.historicoPagamentos,
    tempoAtividade: props.tempoAtividade,
    hhi: concentration.hhi,
    coberturaDivida: ratios.coberturaDivida,
    margemLiquidaNum: ratios.margemLiquidaNum,
  }), [props, concentration.hhi, ratios.coberturaDivida, ratios.margemLiquidaNum]);

  const overallScore = useMemo(() => calculateOverallRiskScore(radarDimensions), [radarDimensions]);

  const suggestedRate = useMemo(() => suggestRate(props.creditScore, props.prazoMedioTitulos), [props.creditScore, props.prazoMedioTitulos]);

  const revenueData = useMemo(() => parseRevenueData(props.faturamentoDetalhado), [props.faturamentoDetalhado]);

  // Comparative data for bar chart
  const comparisonData = useMemo(() => [
    { name: "Faturamento", value: props.faturamentoMedio || 0, fill: "hsl(var(--primary))" },
    { name: "Receita Líq.", value: props.receitaLiquida || 0, fill: "hsl(210, 60%, 50%)" },
    { name: "Limite", value: props.limiteSugerido || 0, fill: "hsl(145, 60%, 40%)" },
    { name: "Volume Est.", value: props.volumeEstimado || 0, fill: "hsl(35, 90%, 50%)" },
    { name: "Capital Soc.", value: props.capitalSocial || 0, fill: "hsl(270, 50%, 50%)" },
  ].filter(d => d.value > 0), [props.faturamentoMedio, props.receitaLiquida, props.limiteSugerido, props.volumeEstimado, props.capitalSocial]);

  // Traffic lights
  const nadaConsta = (s: string | null) => !s || s.toLowerCase().includes("nada consta") || s.toLowerCase().includes("nenhum");
  const trafficLights = useMemo(() => [
    { label: "Protestos", status: nadaConsta(props.protestos) ? "good" as const : "danger" as const, detail: props.protestos || "Nada consta" },
    { label: "Pendências", status: nadaConsta(props.pendencias) ? "good" as const : "danger" as const, detail: props.pendencias || "Nada consta" },
    { label: "Ações Judiciais", status: nadaConsta(props.acoesJudiciais) ? "good" as const : "danger" as const, detail: props.acoesJudiciais || "Nada consta" },
    { label: "Cheques s/ Fundo", status: nadaConsta(props.chequesSemFundo) ? "good" as const : "danger" as const, detail: props.chequesSemFundo || "Nada consta" },
    { label: "Concentração", status: concentration.hhi < 1500 ? "good" as const : concentration.hhi < 2500 ? "warning" as const : "danger" as const, detail: `HHI: ${concentration.hhi.toFixed(0)}` },
    { label: "Hist. Pagamentos", status: !props.historicoPagamentos ? "neutral" as const : props.historicoPagamentos.toLowerCase().includes("pontual") ? "good" as const : "warning" as const, detail: props.historicoPagamentos || "Não informado" },
  ], [props.protestos, props.pendencias, props.acoesJudiciais, props.chequesSemFundo, concentration.hhi, props.historicoPagamentos]);

  // Concentration pie chart data
  const pieData = useMemo(() => props.sacados
    .filter(s => s.percentual_faturamento && s.percentual_faturamento > 0)
    .map((s, i) => ({
      name: s.sacado_nome || `Sacado ${i + 1}`,
      value: s.percentual_faturamento!,
    })), [props.sacados]);

  const COLORS = ["hsl(var(--primary))", "hsl(210, 60%, 50%)", "hsl(145, 60%, 40%)", "hsl(35, 90%, 50%)", "hsl(270, 50%, 50%)", "hsl(0, 70%, 50%)", "hsl(180, 50%, 40%)", "hsl(300, 40%, 50%)"];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Score Global"
          value={`${overallScore}/100`}
          subtext={overallScore >= 70 ? "Perfil saudável" : overallScore >= 40 ? "Atenção recomendada" : "Risco elevado"}
          icon={Shield}
          trend={overallScore >= 70 ? "up" : overallScore >= 40 ? "neutral" : "down"}
        />
        <KPICard
          label="Cobertura da Dívida"
          value={ratios.coberturaDivida ? `${ratios.coberturaDivida.toFixed(1)}x` : "—"}
          subtext={ratios.coberturaDivida && ratios.coberturaDivida >= 2 ? "Adequada" : "Baixa"}
          icon={DollarSign}
          trend={ratios.coberturaDivida && ratios.coberturaDivida >= 2 ? "up" : "down"}
        />
        <KPICard
          label="Taxa Sugerida"
          value={`${suggestedRate}% a.m.`}
          subtext="Baseada no score e prazo"
          icon={Percent}
        />
        <KPICard
          label="Receita/Funcionário"
          value={ratios.receitaPorFuncionario ? formatBRL(ratios.receitaPorFuncionario) : "—"}
          subtext={props.numeroFuncionarios ? `${props.numeroFuncionarios} funcionários` : ""}
          icon={Users}
        />
      </div>

      {/* Row 2: Radar + Traffic Lights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskRadarChart dimensions={radarDimensions} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Semáforo de Restritivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trafficLights.map((t, i) => (
              <TrafficLight key={i} {...t} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Comparative Financial + Concentration Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Comparativo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={85} />
                    <Tooltip
                      formatter={(value: number) => formatBRL(value)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {comparisonData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Concentração de Sacados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name.substring(0, 10)} ${value}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <span>HHI: <strong className="text-foreground">{concentration.hhi.toFixed(0)}</strong></span>
                <span className="mx-1">•</span>
                <span>{concentration.hhi < 1500 ? "Baixa concentração" : concentration.hhi < 2500 ? "Concentração moderada" : "Alta concentração"}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 4: Revenue Trend (if available) */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução do Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatBRL(value)}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 5: Financial Ratios Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Indicadores Financeiros Calculados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <RatioItem label="Margem Líquida" value={ratios.margemLiquidaNum !== null ? `${ratios.margemLiquidaNum.toFixed(1)}%` : "—"} benchmark="≥ 8% ideal" status={ratios.margemLiquidaNum !== null ? (ratios.margemLiquidaNum >= 8 ? "good" : ratios.margemLiquidaNum >= 3 ? "warning" : "danger") : "neutral"} />
            <RatioItem label="Índice de Liquidez" value={ratios.indiceLiquidezNum !== null ? ratios.indiceLiquidezNum.toFixed(2) : "—"} benchmark="≥ 1.0 ideal" status={ratios.indiceLiquidezNum !== null ? (ratios.indiceLiquidezNum >= 1.0 ? "good" : ratios.indiceLiquidezNum >= 0.7 ? "warning" : "danger") : "neutral"} />
            <RatioItem label="Endivid. / Faturamento" value={ratios.endividamentoRelativo !== null ? `${ratios.endividamentoRelativo.toFixed(1)}%` : "—"} benchmark="≤ 30% ideal" status={ratios.endividamentoRelativo !== null ? (ratios.endividamentoRelativo <= 30 ? "good" : ratios.endividamentoRelativo <= 50 ? "warning" : "danger") : "neutral"} />
            <RatioItem label="Cobertura da Dívida" value={ratios.coberturaDivida !== null ? `${ratios.coberturaDivida.toFixed(1)}x` : "—"} benchmark="≥ 2.0x ideal" status={ratios.coberturaDivida !== null ? (ratios.coberturaDivida >= 2 ? "good" : ratios.coberturaDivida >= 1 ? "warning" : "danger") : "neutral"} />
            <RatioItem label="Capital de Giro Líq." value={ratios.capitalGiroLiquido !== null ? formatBRL(ratios.capitalGiroLiquido) : "—"} benchmark="Positivo é ideal" status={ratios.capitalGiroLiquido !== null ? (ratios.capitalGiroLiquido > 0 ? "good" : "danger") : "neutral"} />
            <RatioItem label="Receita / Funcionário" value={ratios.receitaPorFuncionario !== null ? formatBRL(ratios.receitaPorFuncionario) : "—"} benchmark="Varia por setor" status="neutral" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RatioItem({ label, value, benchmark, status }: { label: string; value: string; benchmark: string; status: "good" | "warning" | "danger" | "neutral" }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums",
        status === "good" ? "text-emerald-600" : status === "warning" ? "text-amber-600" : status === "danger" ? "text-red-600" : "text-foreground"
      )}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{benchmark}</p>
    </div>
  );
}
