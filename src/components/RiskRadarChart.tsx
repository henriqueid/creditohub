import { useMemo } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type RiskDimension, calculateOverallRiskScore } from "@/lib/credit-calculations";
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface RiskRadarChartProps {
  dimensions: RiskDimension[];
  className?: string;
}

export function RiskRadarChart({ dimensions, className }: RiskRadarChartProps) {
  const overallScore = useMemo(() => calculateOverallRiskScore(dimensions), [dimensions]);
  const riskLabel = overallScore >= 70 ? "Baixo" : overallScore >= 40 ? "Médio" : "Alto";
  const riskColor = overallScore >= 70 ? "text-status-approved" : overallScore >= 40 ? "text-sink-warn" : "text-sink-danger";
  const RiskIcon = overallScore >= 70 ? ShieldCheck : overallScore >= 40 ? Shield : overallScore >= 25 ? ShieldAlert : ShieldX;

  const chartData = dimensions.map(d => ({
    dimension: d.label,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Radar de Risco Multidimensional</CardTitle>
          <div className="flex items-center gap-2">
            <RiskIcon className={cn("h-5 w-5", riskColor)} />
            <div className="text-right">
              <span className={cn("text-2xl font-bold tabular-nums", riskColor)}>{overallScore}</span>
              <span className="text-[10px] text-muted-foreground block">Risco {riskLabel}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickCount={5}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg">
                      <p className="text-xs font-semibold">{d.payload.dimension}</p>
                      <p className="text-sm font-bold tabular-nums">{d.value}/100</p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension breakdown */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          {dimensions.map((d) => (
            <div key={d.dimension} className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full shrink-0",
                d.status === "good" ? "bg-status-approved" : d.status === "warning" ? "bg-sink-warn" : "bg-sink-danger"
              )} />
              <span className="text-[11px] text-muted-foreground truncate">{d.label}</span>
              <span className={cn(
                "text-[11px] font-bold tabular-nums ml-auto",
                d.status === "good" ? "text-status-approved" : d.status === "warning" ? "text-sink-warn" : "text-sink-danger"
              )}>{d.score}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
