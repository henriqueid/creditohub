import { useEffect, useState } from "react";

interface StatsCounterProps {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
  decimals?: number;
  format?: "number" | "currency-bi" | "percent";
}

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function formatValue(v: number, fmt: StatsCounterProps["format"], decimals: number) {
  if (fmt === "currency-bi") {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (fmt === "percent") return Math.round(v).toString();
  return v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function StatsCounter({
  to,
  prefix = "",
  suffix = "",
  duration = 1500,
  delay = 600,
  decimals = 0,
  format = "number",
}: StatsCounterProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    const start = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / duration, 1);
        setValue(easeOutQuad(p) * to);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    timeoutId = setTimeout(start, delay);
    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return (
    <span style={{ fontFamily: "var(--font-mono)" }}>
      {prefix}
      {formatValue(value, format, decimals)}
      {suffix}
    </span>
  );
}
