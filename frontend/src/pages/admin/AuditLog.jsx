import { useEffect, useState } from "react";
import { api } from "../../api";
import { relativeTime } from "../../utils/time";
import Button from "../../components/Button";
import Pill from "../../components/Pill";
import { Table, THead, Th, TR, Td } from "../../components/Table";

const severityTone = { info: "slate", warning: "yellow", error: "red" };
const categoryTone = {
  auth: "blue",
  user: "purple",
  device: "emerald",
  dhcp: "cyan",
  scan: "orange",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (severity) params.set("severity", severity);
      params.set("limit", "500");
      const data = await api(`/audit?${params.toString()}`);
      setLogs(data || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [category, severity]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? logs.filter((l) =>
        [l.action, l.actor, l.target, l.details, l.ip].some(
          (v) => v && v.toLowerCase().includes(q),
        ),
      )
    : logs;

  function downloadCsv() {
    const cols = [
      "timestamp",
      "category",
      "severity",
      "action",
      "actor",
      "target",
      "details",
      "ip",
    ];
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((l) => cols.map((k) => esc(l[k])).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <span className="text-xs text-slate-500">
          Records older than 30 days are deleted automatically.
        </span>
      </div>

      <div className="flex gap-2 items-center">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm px-2 py-1 rounded bg-slate-800 border border-slate-700"
        >
          <option value="">All categories</option>
          <option value="auth">Auth</option>
          <option value="user">User</option>
          <option value="device">Device</option>
          <option value="dhcp">DHCP</option>
          <option value="scan">Scan</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="text-sm px-2 py-1 rounded bg-slate-800 border border-slate-700"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <input
          type="text"
          placeholder="Search action, actor, target…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm px-2 py-1 rounded bg-slate-800 border border-slate-700 flex-1 max-w-xs"
        />
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
        <Button variant="secondary" onClick={downloadCsv}>
          Download CSV
        </Button>
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {logs.length}
        </span>
      </div>

      {error && <p className="text-red-400 text-sm">Error: {error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">No matching log entries.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th className="w-32">When</Th>
              <Th className="w-24">Category</Th>
              <Th className="w-24">Severity</Th>
              <Th>Action</Th>
              <Th>Actor</Th>
              <Th>Target</Th>
              <Th>Details</Th>
              <Th className="w-32">Source IP</Th>
            </tr>
          </THead>
          <tbody>
            {filtered.map((l) => (
              <TR key={l.id}>
                <Td className="text-slate-400" title={l.timestamp}>
                  {relativeTime(l.timestamp)}
                </Td>
                <Td>
                  <Pill tone={categoryTone[l.category] || "slate"}>
                    {l.category}
                  </Pill>
                </Td>
                <Td>
                  <Pill tone={severityTone[l.severity] || "slate"}>
                    {l.severity}
                  </Pill>
                </Td>
                <Td className="font-mono text-xs">{l.action}</Td>
                <Td>{l.actor || <span className="text-slate-600">—</span>}</Td>
                <Td className="font-mono text-xs text-slate-400">
                  {l.target || <span className="text-slate-600">—</span>}
                </Td>
                <Td className="text-slate-400 text-xs">{l.details || ""}</Td>
                <Td className="font-mono text-xs text-slate-400">
                  {l.ip || ""}
                </Td>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
