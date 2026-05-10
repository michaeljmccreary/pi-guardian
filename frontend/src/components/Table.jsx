export function Table({ className = "", children }) {
  return (
    <div
      className={`rounded-lg border border-slate-800 overflow-x-auto ${className}`}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-slate-800/60 text-slate-300">{children}</thead>;
}

export function Th({ className = "", children, ...props }) {
  return (
    <th className={`text-left p-3 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TR({ className = "", children, ...props }) {
  return (
    <tr
      className={`border-t border-slate-800 hover:bg-slate-800/30 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({ className = "", children, ...props }) {
  return (
    <td className={`p-3 ${className}`} {...props}>
      {children}
    </td>
  );
}
