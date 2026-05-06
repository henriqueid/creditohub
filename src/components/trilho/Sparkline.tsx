interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, w = 120, h = 36, color = "#00D49A", fill = true }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as [number, number];
  });

  const polyPts = pts.map(p => p.join(",")).join(" ");
  const areaPts = `0,${h} ${polyPts} ${w},${h}`;
  const lastPt = pts[pts.length - 1];

  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      {fill && (
        <polygon points={areaPts} fill={color} opacity="0.12" />
      )}
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}
