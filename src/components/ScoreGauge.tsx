import { classifyRisk, getScoreGrade } from "@/lib/credit-calculations";

interface ScoreGaugeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

function getTierColor(riskLevel: string): string {
  if (riskLevel === "very_low") return "#00D49A";
  if (riskLevel === "low") return "#00D49A";
  if (riskLevel === "medium") return "#D9A300";
  if (riskLevel === "high") return "#D97706";
  return "#B0182A";
}

export function ScoreGauge({ score, size = "md" }: ScoreGaugeProps) {
  const s = score ?? 0;
  const pct = Math.min(s / 1000, 1);
  const risk = classifyRisk(s);
  const grade = getScoreGrade(s);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - pct * circumference;
  const color = getTierColor(risk.level);

  const dims = size === "sm" ? "w-20 h-20" : size === "lg" ? "w-36 h-36" : "w-28 h-28";
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const gradeSize = size === "sm" ? "text-[9px]" : "text-xs";

  return (
    <div className={`relative flex items-center justify-center ${dims}`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" stroke="#E8E9E2" />
        <circle
          cx="50" cy="50" r="40" fill="none" strokeWidth="8"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span
          className={`font-mono font-bold tabular-nums ${textSize}`}
          style={{ color: "var(--text)" }}
        >
          {s}
        </span>
        <span
          className={`font-mono font-semibold tracking-wider ${gradeSize}`}
          style={{ color }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}
