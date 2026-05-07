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
      className={cn("rounded-[14px] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(10,21,56,0.08),0_8px_22px_-6px_rgba(10,21,56,0.10)]", className)}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--border-default)",
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
        padding,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
