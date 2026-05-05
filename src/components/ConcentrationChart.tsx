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
    return <p className="font-mono text-xs text-sink-ink/40 italic">Nenhum sacado cadastrado</p>;
  }

  return (
    <div className="space-y-2.5">
      {sorted.map((s, i) => {
        const pct = s.percentual_faturamento ?? 0;
        const overLimit = pct > maxConcentration;
        return (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <span className="font-sans text-xs font-medium text-sink-ink truncate mr-2">{s.sacado_nome}</span>
              <span className={cn("font-mono text-xs tabular-nums font-semibold shrink-0", overLimit ? "text-sink-danger" : "text-sink-ink")}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-sink-pill bg-sink-fog overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-sink-pill transition-all duration-500",
                  overLimit ? "bg-sink-danger" : "bg-sink-mint"
                )}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
      {maxConcentration && (
        <p className="font-mono text-[10px] text-sink-ink/40 mt-1">
          Concentração máxima recomendada: {maxConcentration}%
        </p>
      )}
    </div>
  );
}
