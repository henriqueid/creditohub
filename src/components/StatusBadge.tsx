import { statusLabels } from "@/lib/formatters";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Aceita chaves enum (draft, in_committee, ...) ou strings de exibição ("Aprovado", "Ativo", ...)
const STATUS_MAP: Record<string, [string, string]> = {
  // Chaves enum
  draft:               ["#E8E9E2", "#0A1538"],
  in_committee:        ["#FFE9B8", "#7A5B00"],
  approved:            ["#D6F5E8", "#009E73"],
  approved_restricted: ["#FCE3CE", "#8A3B00"],
  rejected:            ["#F5D6DA", "#7A0E1E"],
  // Strings de exibição — NFs, scores, misc
  Rascunho:    ["#E8E9E2", "#0A1538"],
  "Em Análise":["#FFF6DC", "#7A5B00"],
  "Em Comitê": ["#FFE9B8", "#7A5B00"],
  Aprovado:    ["#D6F5E8", "#009E73"],
  Aprovada:    ["#D6F5E8", "#009E73"],
  Restrito:    ["#FCE3CE", "#8A3B00"],
  Rejeitado:   ["#F5D6DA", "#7A0E1E"],
  Pago:        ["#D6F5E8", "#009E73"],
  "A vencer":  ["#E8E9E2", "#0A1538"],
  Atrasado:    ["#FCE3CE", "#8A3B00"],
  Vencido:     ["#F5D6DA", "#7A0E1E"],
  // Tiers de crédito
  AAA: ["#D6F5E8", "#009E73"],
  AA:  ["#D6F5E8", "#009E73"],
  A:   ["#E2F2EC", "#009E73"],
  BBB: ["#FFF6DC", "#7A5B00"],
  BB:  ["#FFE9B8", "#7A5B00"],
  B:   ["#FCE3CE", "#8A3B00"],
  C:   ["#FCE3CE", "#8A3B00"],
  D:   ["#F5D6DA", "#7A0E1E"],
  // Misc
  Decisor: ["#D9DEEF", "#0A1538"],
  Ativo:   ["#D6F5E8", "#009E73"],
  Inativo: ["#E8E9E2", "#0A1538"],
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const [bg, fg] = STATUS_MAP[status] ?? ["#E8E9E2", "#0A1538"];
  const label = statusLabels[status] || status;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
