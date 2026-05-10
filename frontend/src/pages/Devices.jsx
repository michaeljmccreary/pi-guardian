import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { copySsh, downloadRdp } from "../utils/rdp";
import { fmt } from "../utils/time";
import Button from "../components/Button";
import { Table, THead, Th, TR, Td } from "../components/Table";
import ScoreBadge from "../components/ScoreBadge";

export default function Devices() {
  const { user } = useAuth();
  const sshUser = user?.username || "michael";
  const [devices, setDevices] = useState([]);
  const [compliance, setCompliance] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scanningAll, setScanningAll] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const [devs, comp] = await Promise.all([
        api("/devices"),
        api("/compliance").catch(() => ({ devices: [] })),
      ]);
      setDevices(devs || []);
      const map = {};
      (comp.devices || []).forEach((d) => {
        map[d.id] = d;
      });
      setCompliance(map);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1800);
  }

  async function scan(deviceId) {
    try {
      await api(`/devices/${deviceId}/scan`, { method: "POST" });
      flash("Scan started");
      setTimeout(load, 8000);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function scanAll() {
    setScanningAll(true);
    try {
      await api("/scans/all", { method: "POST" });
      setTimeout(() => {
        load();
        setScanningAll(false);
      }, 12000);
    } catch (e) {
      setErr(e.message);
      setScanningAll(false);
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? devices.filter((d) =>
        [d.hostname, d.alias, d.ip, d.mac, d.vendor].some(
          (v) => v && v.toLowerCase().includes(q),
        ),
      )
    : devices;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Devices</h1>
        <div className="flex gap-2">
          <Button onClick={scanAll} disabled={scanningAll}>
            {scanningAll ? "Scanning…" : "Scan All"}
          </Button>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>
      {err && <p className="text-red-400">{err}</p>}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-700 px-4 py-2 rounded shadow-lg text-sm">
          {toast}
        </div>
      )}
      <input
        type="text"
        placeholder="Search hostname, alias, IP, MAC, vendor…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm text-sm px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-slate-500"
      />
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">
          {devices.length === 0 ? "No devices yet." : "No matches."}
        </p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Hostname</Th>
              <Th>IP</Th>
              <Th>MAC</Th>
              <Th>Vendor</Th>
              <Th>Score</Th>
              <Th>Last seen</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <tbody>
            {filtered.map((d) => {
              const c = compliance[d.id];
              return (
                <TR key={d.id} className={d.is_blocked ? "opacity-60" : ""}>
                  <Td className="font-medium">
                    <Link
                      to={`/devices/${d.id}`}
                      className="hover:text-blue-400"
                    >
                      {d.alias || d.hostname || (
                        <span className="text-slate-500">unknown</span>
                      )}
                    </Link>
                    {d.alias && d.hostname && (
                      <span className="ml-2 text-xs text-slate-500">
                        aka {d.hostname}
                      </span>
                    )}
                    {d.is_blocked ? (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-300">
                        blocked
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-mono">{d.ip}</Td>
                  <Td className="font-mono text-slate-400">{d.mac}</Td>
                  <Td>
                    {d.vendor || <span className="text-slate-500">—</span>}
                  </Td>
                  <Td>
                    <ScoreBadge score={c?.score} />
                  </Td>
                  <Td className="text-slate-400">{fmt(d.last_seen)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" onClick={() => scan(d.id)}>
                        Scan
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          copySsh(d.ip, sshUser);
                          flash(`SSH copied for ${d.ip}`);
                        }}
                      >
                        SSH
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadRdp(d.ip)}
                      >
                        RDP
                      </Button>
                    </div>
                  </Td>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
