interface MarkProps {
  size?: number;
  color?: string;
  accent?: string;
}

export function Mark({ size = 22, color = "#FAFAF7", accent = "#00D49A" }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block", flexShrink: 0 }}>
      <rect x="6" y="20" width="52" height="6" rx="3" fill={color} />
      <rect x="6" y="38" width="52" height="6" rx="3" fill={color} />
      <circle cx="46" cy="32" r="7" fill={accent} />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  color?: string;
  accent?: string;
  variant?: "full" | "mark";
}

export function Logo({ size = 15, color = "#FAFAF7", accent = "#00D49A", variant = "full" }: LogoProps) {
  if (variant === "mark") return <Mark size={size + 4} color={color} accent={accent} />;
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <Mark size={size + 4} color={color} accent={accent} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: size,
          color,
          letterSpacing: "-0.03em",
        }}
      >
        Trilho<span style={{ color: accent }}>.</span>
      </span>
    </span>
  );
}
