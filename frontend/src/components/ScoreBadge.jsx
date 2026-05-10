export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span className="text-slate-500">—</span>;
  }
  const colour =
    score >= 80
      ? "text-green-400"
      : score >= 60
        ? "text-yellow-400"
        : "text-red-400";
  return <span className={`font-semibold ${colour}`}>{score}</span>;
}
