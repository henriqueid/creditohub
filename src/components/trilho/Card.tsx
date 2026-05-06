import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  padding?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, padding = 20, className, style, onClick }: CardProps) {
  return (
    <div
      className={cn("rounded-[16px] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]", className)}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
        padding,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
