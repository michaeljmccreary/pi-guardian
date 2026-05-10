import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { copySsh, downloadRdp } from "../utils/rdp";
import { fmt } from "../utils/time";
import Button from "../components/Button";
import Card from "../components/Card";
import { Table, THead, Th, TR, Td } from "../components/Table";
import SeverityBadge from "../components/SeverityBadge";
import ScoreBadge from "../components/ScoreBadge";

export default function DeviceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const sshUser = user?.username || "michael";
  const [device, setDevice] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [aliases, setAliases] = useState([]);
  const [topDomains, setTopDomains] = useState([]);
  const [tab, setTab] = useState("overview");
  const [findings, setFindings] = useState([]);
  const [scans, setScans] = useState([]);
  const [dns, setDns] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasDraft, setAliasDraft] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await api(`/devices/${id}`);
      setDevice(data.device);
      setLastScan(data.last_scan);
      setAliases(data.aliases || []);
      setTopDomains(data.top_domains || []);
      const [scansList, dnsList] = await Promise.all([
        api(`/devices/${id}/scans`),
        api(`/devices/${id}/dns`),
      ]);
      setScans(scansList);
      setDns(dnsList);
      if (data.last_scan?.id) {
        const detail = await api(`/scans/${data.last_scan.id}`);
        setFindings(detail.findings);
      }
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function rescan() {
    setScanning(true);
    try {
      await api(`/devices/${id}/scan`, { method: "POST" });
      setTimeout(() => {
        load();
        setScanning(false);
      }, 8000);
    } catch (e) {
      setErr(e.message);
      setScanning(false);
    }
  }

  async function saveAlias() {
    setBusy(true);
    try {
      await api(`/devices/${id}`, {
        method: "PATCH",
        body: { alias: aliasDraft },
      });
      setEditingAlias(false);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    const action = device.is_blocked ? "unblock" : "block";
    if (!confirm(`${action[0].toUpperCase() + action.slice(1)} this device?`))
      return;
    setBusy(true);
    try {
      await api(`/devices/${id}/${action}`, { method: "POST" });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (err) return <p className="text-red-400">{err}</p>;
  if (!device) return <p className="text-slate-400">Loading…</p>;

  const webUrl = "http://" + device.ip;

  return (
    <div className="space-y-4">
      <Link
        to="/devices"
        className="text-sm text-slate-400 hover:text-blue-400"
      >
        ← Devices
      </Link>
      {device.is_blocked ? (
        <Card className="border-red-700 bg-red-950/30">
          <p className="text-sm text-red-300">
            <span className="font-semibold">Blocked.</span> Forwarded traffic
            from this MAC is being dropped at the firewall.
          </p>
        </Card>
      ) : null}
      <Card className="flex items-start justify-between">
        <div className="flex-1">
          {editingAlias ? (
            <form
              className="flex gap-2 items-center mb-1"
              onSubmit={(e) => {
                e.preventDefault();
                saveAlias();
              }}
            >
              <input
                autoFocus
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                placeholder={device.hostname || "friendly name"}
                className="text-2xl font-semibold bg-slate-900 border border-slate-700 rounded px-2 py-1 flex-1"
              />
              <Button size="sm" type="submit" disabled={busy}>
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setEditingAlias(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              {device.alias || device.hostname || (
                <span className="text-slate-500">unknown</span>
              )}
              <button
                onClick={() => {
                  setAliasDraft(device.alias || "");
                  setEditingAlias(true);
                }}
                className="text-xs text-slate-500 hover:text-blue-400 font-normal"
              >
                ✎ rename
              </button>
            </h1>
          )}
          {device.alias && device.hostname && (
            <p className="text-xs text-slate-500">aka {device.hostname}</p>
          )}
          <p className="font-mono text-slate-400 mt-1">
            {device.ip} · {device.mac} · {device.vendor || "unknown vendor"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            First seen {fmt(device.first_seen)} · last seen{" "}
            {fmt(device.last_seen)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ScoreBadge score={lastScan?.score} />
          <Button onClick={rescan} disabled={scanning}>
            {scanning ? "Scanning…" : "Re-scan"}
          </Button>
          <Button
            size="sm"
            variant={device.is_blocked ? "secondary" : "danger"}
            onClick={toggleBlock}
            disabled={busy}
          >
            {device.is_blocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </Card>

      {aliases.length > 1 && (
        <Card>
          <h2 className="font-medium mb-2">Hostname history</h2>
          <p className="text-xs text-slate-500 mb-3">
            This MAC has been seen under {aliases.length} different hostnames —
            usually means the adapter (e.g. a USB dongle) has been moved between
            machines.
          </p>
          <ul className="text-sm divide-y divide-slate-800">
            {aliases.map((a) => (
              <li key={a.hostname} className="py-2 flex justify-between">
                <span className="font-mono">{a.hostname}</span>
                <span className="text-slate-500 text-xs">
                  first seen {fmt(a.first_seen)} · last seen {fmt(a.last_seen)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex gap-1 border-b border-slate-800">
        {["overview", "ports", "history", "connect"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-blue-500 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h2 className="font-medium mb-3">Top domains</h2>
            {topDomains.length === 0 ? (
              <p className="text-slate-400 text-sm">
                No DNS history for this device yet.
              </p>
            ) : (
              <ul className="text-sm divide-y divide-slate-800">
                {topDomains.map((t) => (
                  <li
                    key={t.domain}
                    className="py-2 flex justify-between font-mono"
                  >
                    <span>{t.domain}</span>
                    <span className="text-slate-500">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-medium mb-3">Recent DNS queries</h2>
            {dns.length === 0 ? (
              <p className="text-slate-400 text-sm">
                No DNS activity recorded yet.
              </p>
            ) : (
              <ul className="text-sm divide-y divide-slate-800">
                {dns.slice(0, 30).map((q) => (
                  <li
                    key={q.id}
                    className="py-2 flex justify-between font-mono"
                  >
                    <span>{q.domain}</span>
                    <span className="text-slate-500">
                      {q.qtype} · {fmt(q.ts)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "ports" &&
        (findings.length === 0 ? (
          <Card>
            <p className="text-slate-400 text-sm">
              {lastScan
                ? "No open ports detected on the latest scan."
                : "Run a scan to see open ports."}
            </p>
          </Card>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Severity</Th>
                <Th>Port</Th>
                <Th>Service</Th>
                <Th>Version</Th>
                <Th>Description</Th>
              </tr>
            </THead>
            <tbody>
              {findings.map((f) => (
                <TR key={f.id}>
                  <Td>
                    <SeverityBadge severity={f.severity} />
                  </Td>
                  <Td className="font-mono">
                    {f.port}/{f.protocol}
                  </Td>
                  <Td>{f.service}</Td>
                  <Td className="text-slate-400">{f.version || "—"}</Td>
                  <Td>{f.description}</Td>
                </TR>
              ))}
            </tbody>
          </Table>
        ))}

      {tab === "history" &&
        (scans.length === 0 ? (
          <Card>
            <p className="text-slate-400 text-sm">No scan history yet.</p>
          </Card>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Started</Th>
                <Th>Finished</Th>
                <Th>Status</Th>
                <Th>Score</Th>
              </tr>
            </THead>
            <tbody>
              {scans.map((s) => (
                <TR key={s.id}>
                  <Td className="font-mono text-xs">{fmt(s.started_at)}</Td>
                  <Td className="font-mono text-xs">{fmt(s.finished_at)}</Td>
                  <Td>{s.status}</Td>
                  <Td>
                    <ScoreBadge score={s.score} />
                  </Td>
                </TR>
              ))}
            </tbody>
          </Table>
        ))}

      {tab === "connect" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <h3 className="font-medium mb-2">SSH</h3>
            <code className="block p-2 bg-slate-900 rounded text-xs mb-3">
              ssh {sshUser}@{device.ip}
            </code>
            <Button onClick={() => copySsh(device.ip, sshUser)}>
              Copy SSH command
            </Button>
          </Card>
          <Card>
            <h3 className="font-medium mb-2">RDP (Windows)</h3>
            <Button onClick={() => downloadRdp(device.ip)}>
              Download .rdp
            </Button>
          </Card>
          <Card>
            <h3 className="font-medium mb-2">Web UI</h3>
            <a
              href={webUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 inline-block"
            >
              Open {webUrl}
            </a>
          </Card>
        </div>
      )}
    </div>
  );
}
