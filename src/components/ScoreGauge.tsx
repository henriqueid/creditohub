import { cn } from "@/lib/utils";
import { classifyRisk, getScoreGrade } from "@/lib/credit-calculations";

interface ScoreGaugeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreGauge({ score, size = "md" }: ScoreGaugeProps) {
  const s = score ?? 0;
  const pct = Math.min(s / 1000, 1);
  const risk = classifyRisk(s);
  const grade = getScoreGrade(s);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - pct * circumference;

  const dims = size === "sm" ? "w-20 h-20" : size === "lg" ? "w-36 h-36" : "w-28 h-28";
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const gradeSize = size === "sm" ? "text-[9px]" : "text-xs";

  return (
    <div className={cn("relative flex items-center justify-center", dims)}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50" cy="50" r="40" fill="none" strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-700 ease-out",
            risk.level === "very_low" ? "stroke-emerald-500" :
            risk.level === "low" ? "stroke-green-500" :
            risk.level === "medium" ? "stroke-amber-500" :
            risk.level === "high" ? "stroke-orange-500" : "stroke-red-500"
          )}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className={cn("font-bold tabular-nums", textSize)}>{s}</span>
        <span className={cn("font-semibold tracking-wider", gradeSize, risk.color)}>{grade}</span>
      </div>
    </div>
  );
}
