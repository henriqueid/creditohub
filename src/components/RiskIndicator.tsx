import { cn } from "@/lib/utils";
import { classifyRisk, type RiskLevel } from "@/lib/credit-calculations";
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

interface RiskIndicatorProps {
  score: number | null;
  compact?: boolean;
}

const icons: Record<RiskLevel, React.ElementType> = {
  very_low: ShieldCheck,
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
  very_high: ShieldX,
};

export function RiskIndicator({ score, compact }: RiskIndicatorProps) {
  const risk = classifyRisk(score);
  const Icon = icons[risk.level];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", risk.color)}>
        <Icon className="h-3.5 w-3.5" />
        {risk.label}
      </span>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border",
      risk.level === "very_low" || risk.level === "low"
        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
        : risk.level === "medium"
        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
    )}>
      <Icon className={cn("h-5 w-5", risk.color)} />
      <div>
        <p className={cn("text-sm font-semibold", risk.color)}>Risco {risk.label}</p>
        <p className="text-xs text-muted-foreground">Score {score ?? 0}/1000</p>
      </div>
    </div>
  );
}
