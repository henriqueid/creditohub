import { Card } from "./Card";
import { Sparkline } from "./Sparkline";
import { ScoreGauge } from "@/components/ScoreGauge";

interface KPIProps {
  label: string;
  value?: string | number;
  sub?: string;
  trend?: string;
  trendDir?: "up" | "down";
  spark?: number[];
  gauge?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KPI({ label, value, sub, trend, trendDir = "up", spark, gauge, icon, onClick }: KPIProps) {
  return (
    <Card
      padding={22}
      className={onClick ? "cursor-pointer hover:border-[rgba(10,21,56,0.18)]" : ""}
      style={onClick ? { transition: "box-shadow 150ms, border-color 150ms" } : undefined}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-[14px]">
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-mute)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        {icon && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: "var(--cinza-soft)" }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {value !== undefined && (
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 32,
                fontWeight: 500,
                color: "var(--text)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
          )}
          {sub && (
            <div
              className="mt-[6px]"
              style={{ fontSize: 12, color: "var(--text-mute)" }}
            >
              {sub}
            </div>
          )}
        </div>
        {spark && <Sparkline data={spark} />}
        {gauge !== undefined && <ScoreGauge score={gauge} size={84} />}
      </div>

      {/* Trend */}
      {trend && (
        <div
          className="mt-[14px] inline-flex items-center gap-1 px-[10px] py-[3px] rounded-full"
          style={{
            background: trendDir === "up" ? "#D6F5E8" : "#F5D6DA",
            color: trendDir === "up" ? "#009E73" : "#7A0E1E",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          {trendDir === "up" ? "▲" : "▼"} {trend}
        </div>
      )}
    </Card>
  );
}
