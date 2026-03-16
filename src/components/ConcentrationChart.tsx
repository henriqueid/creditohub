import { cn } from "@/lib/utils";

interface ConcentrationChartProps {
  sacados: { sacado_nome: string; percentual_faturamento: number | null }[];
  maxConcentration?: number;
}

export function ConcentrationChart({ sacados, maxConcentration = 30 }: ConcentrationChartProps) {
  const sorted = [...sacados]
    .filter(s => s.sacado_nome && s.percentual_faturamento != null)
    .sort((a, b) => (b.percentual_faturamento ?? 0) - (a.percentual_faturamento ?? 0));

  if (sorted.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum sacado cadastrado</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => {
        const pct = s.percentual_faturamento ?? 0;
        const overLimit = pct > maxConcentration;
        return (
          <div key={i} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium truncate mr-2">{s.sacado_nome}</span>
              <span className={cn("tabular-nums font-semibold shrink-0", overLimit ? "text-red-600" : "text-foreground")}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  overLimit ? "bg-red-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
      {maxConcentration && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Concentração máxima recomendada: {maxConcentration}%
        </p>
      )}
    </div>
  );
}
