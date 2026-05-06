import { useEffect, useState } from "react";
import { Briefcase, BarChart3, Scale, CheckCircle2, ArrowRight } from "lucide-react";

const steps = [
  { icon: Briefcase, label: "Comercial" },
  { icon: BarChart3, label: "Análise" },
  { icon: Scale, label: "Comitê" },
  { icon: CheckCircle2, label: "Cedente" },
] as const;

export function MiniPipeline() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % steps.length);
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === active;
        return (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div
              className="flex flex-col items-center justify-center gap-1.5 rounded-[12px] flex-1 py-3 transition-all duration-500"
              style={{
                background: isActive ? "rgba(0,212,154,0.12)" : "rgba(255,255,255,0.04)",
                border: isActive
                  ? "1px solid rgba(0,212,154,0.55)"
                  : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isActive ? "0 0 20px rgba(0,212,154,0.25)" : "none",
              }}
            >
              <Icon
                className="transition-all duration-500"
                style={{
                  width: 18,
                  height: 18,
                  color: isActive ? "#00D49A" : "rgba(255,255,255,0.45)",
                }}
              />
              <span
                className="font-mono uppercase tracking-wider transition-colors duration-500"
                style={{
                  fontSize: 9.5,
                  letterSpacing: "0.10em",
                  color: isActive ? "#00D49A" : "rgba(255,255,255,0.45)",
                  fontWeight: 600,
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight
                style={{
                  width: 12,
                  height: 12,
                  color: i < active ? "rgba(0,212,154,0.6)" : "rgba(255,255,255,0.25)",
                  transition: "color 0.5s",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
