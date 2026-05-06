interface Column {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  mono?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface DataTableProps {
  cols: Column[];
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DataTable({ cols, rows, onRowClick }: DataTableProps) {
  const gridCols = cols.map(c => c.width ?? "1fr").join(" ");

  return (
    <div
      className="bg-white rounded-[16px] overflow-hidden"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          padding: "14px 20px",
          background: "var(--cinza-soft)",
          borderBottom: "1px solid var(--border-default)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--text-mute)",
          fontWeight: 500,
        }}
      >
        {cols.map((col) => (
          <div key={col.key} style={{ textAlign: col.align ?? "left" }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          onClick={() => onRowClick?.(row)}
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            padding: "14px 20px",
            borderBottom: ri < rows.length - 1 ? "1px solid var(--hairline)" : "none",
            fontSize: 13,
            color: "var(--text)",
            alignItems: "center",
            cursor: onRowClick ? "pointer" : undefined,
          }}
          className={onRowClick ? "hover:bg-[#F4F5F1] transition-colors" : undefined}
        >
          {cols.map((col) => (
            <div
              key={col.key}
              style={{
                textAlign: col.align ?? "left",
                fontFamily: col.mono ? "var(--font-mono)" : "var(--font-sans)",
                fontSize: col.mono ? 12 : 13,
              }}
            >
              {col.render
                ? col.render(row[col.key], row)
                : (row[col.key] as React.ReactNode)}
            </div>
          ))}
        </div>
      ))}

      {rows.length === 0 && (
        <div
          className="py-10 text-center"
          style={{ fontSize: 13, color: "var(--text-faint)" }}
        >
          Nenhum registro encontrado
        </div>
      )}
    </div>
  );
}
