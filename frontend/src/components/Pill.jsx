const TONES = {
  slate: "bg-slate-800 text-slate-300 border-slate-700",
  blue: "bg-blue-900/40 text-blue-200 border-blue-700",
  purple: "bg-purple-900/40 text-purple-200 border-purple-700",
  emerald: "bg-emerald-900/40 text-emerald-200 border-emerald-700",
  cyan: "bg-cyan-900/40 text-cyan-200 border-cyan-700",
  orange: "bg-orange-900/40 text-orange-200 border-orange-700",
  yellow: "bg-yellow-900/40 text-yellow-200 border-yellow-700",
  red: "bg-red-900/60 text-red-200 border-red-700",
};

export default function Pill({ tone = "slate", className = "", children }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase border ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
