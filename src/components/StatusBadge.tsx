import { statusLabels } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const sinkStatusColors: Record<string, string> = {
  draft:               "bg-sink-ink/8 text-sink-ink/60",
  in_committee:        "bg-sink-warn/10 text-sink-warn",
  approved:            "bg-sink-mint/10 text-sink-mint-3",
  approved_restricted: "bg-sink-mint-2/10 text-sink-mint-3",
  rejected:            "bg-sink-danger/10 text-sink-danger",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-sink-sm font-mono text-[10px] font-semibold uppercase tracking-widest",
        sinkStatusColors[status] || "bg-sink-cream-2 text-sink-ink/50"
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
