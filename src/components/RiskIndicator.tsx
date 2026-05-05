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
      <span className={cn(
        "inline-flex items-center gap-1 font-mono text-xs font-semibold",
        risk.level === "very_low" || risk.level === "low" ? "text-sink-mint" :
        risk.level === "medium" ? "text-sink-warn" : "text-sink-danger"
      )}>
        <Icon className="h-3.5 w-3.5" />
        {risk.label}
      </span>
    );
  }

  const isGood = risk.level === "very_low" || risk.level === "low";
  const isMedium = risk.level === "medium";

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-sink-md border",
      isGood
        ? "border-sink-mint/30 bg-sink-mint/5"
        : isMedium
        ? "border-sink-warn/30 bg-sink-warn/5"
        : "border-sink-danger/30 bg-sink-danger/5"
    )}>
      <Icon className={cn("h-5 w-5",
        isGood ? "text-sink-mint" : isMedium ? "text-sink-warn" : "text-sink-danger"
      )} />
      <div>
        <p className={cn("font-sans text-sm font-semibold",
          isGood ? "text-sink-deep" : isMedium ? "text-sink-warn" : "text-sink-danger"
        )}>Risco {risk.label}</p>
        <p className="font-mono text-xs text-sink-ink/50">Score {score ?? 0}/1000</p>
      </div>
    </div>
  );
}
