interface SectionTitleProps {
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div
      className="flex justify-between items-baseline pb-[10px] mb-[14px]"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div
        className="text-[14px] font-medium"
        style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
      >
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
