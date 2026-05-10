const SIZES = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1",
  lg: "text-sm px-4 py-2",
};

const VARIANTS = {
  primary: "bg-blue-700 hover:bg-blue-600",
  secondary: "bg-slate-800 hover:bg-slate-700",
  danger:
    "bg-red-900/40 hover:bg-red-900/70 text-red-200 border border-red-800",
  success: "bg-emerald-600 hover:bg-emerald-500",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const cls = `rounded disabled:opacity-50 transition ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
  return <button className={cls} {...props} />;
}
