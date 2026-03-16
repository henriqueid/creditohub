import { Badge } from "@/components/ui/badge";
import { statusLabels, statusColors } from "@/lib/formatters";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`border-0 font-medium ${statusColors[status] || ""}`}>
      {statusLabels[status] || status}
    </Badge>
  );
}
