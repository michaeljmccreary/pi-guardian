export default function ScoreGauge({ score, size = 140 }) {
  const dim = { width: size, height: size };
  if (score === null || score === undefined) {
    return (
      <div
        className="flex items-center justify-center text-slate-500"
        style={dim}
      >
        No data
      </div>
    );
  }
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const colour = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#1e293b"
        strokeWidth="10"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colour}
        strokeWidth="10"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        fill="#f1f5f9"
        fontSize="28"
        fontWeight="600"
      >
        {score}
      </text>
    </svg>
  );
}
