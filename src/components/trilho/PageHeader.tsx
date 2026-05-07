interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-6">
      <div className="min-w-0">
        <h1
          className="text-[22px] sm:text-[28px]"
          style={{
            fontFamily: "var(--font-sans)",
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
        <div className="flex flex-wrap items-center gap-[10px]">{actions}</div>
      )}
    </div>
  );
}
