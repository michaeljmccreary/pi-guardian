export default function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-lg border border-slate-800 p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
