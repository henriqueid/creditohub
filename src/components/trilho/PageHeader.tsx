interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 28,
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            className="mt-[6px]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-mute)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-[10px]">{actions}</div>
      )}
    </div>
  );
}
