import { useEffect, useState } from "react";
import { api } from "../api";
import { fmt } from "../utils/time";
import Card from "../components/Card";
import { Table, THead, Th, TR, Td } from "../components/Table";

function humanBytes(n) {
  if (!n || n < 1024) return `${Math.round(n || 0)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function BwCard({ label, help, bytes, bps }) {
  return (
    <Card>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{humanBytes(bytes)}</div>
      <div className="text-xs text-slate-500 mt-1">
        Now: {humanBytes(bps)}/s
      </div>
      {help && (
        <div className="text-[11px] text-slate-400 mt-2 leading-snug">
          {help}
        </div>
      )}
    </Card>
  );
}

export default function Traffic() {
  const [queries, setQueries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await api("/traffic?limit=200");
      setQueries(data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const s = await api("/traffic/stats");
      setStats(s);
    } catch {}
  }

  useEffect(() => {
    load();
    loadStats();
    const id1 = setInterval(load, 5000);
    const id2 = setInterval(loadStats, 3000);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, []);

  const eth0 = stats?.interfaces?.eth0;
  const wlan0 = stats?.interfaces?.wlan0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Traffic</h1>
        <span className="text-xs text-slate-500">
          {queries.length} DNS rows · auto-refresh 5s
        </span>
      </div>
      {(eth0 || wlan0) && (
        <>
          <h2 className="text-lg font-medium text-slate-300">
            Bandwidth
            <span className="text-xs font-normal text-slate-500 ml-2">
              totals since the Pi last booted
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BwCard
              label="↓ To the devices"
              help="Data the Pi has delivered down to the LAN"
              bytes={eth0?.tx_bytes}
              bps={eth0?.tx_bps}
            />
            <BwCard
              label="↑ From the devices"
              help="Data the devices have sent up through the Pi"
              bytes={eth0?.rx_bytes}
              bps={eth0?.rx_bps}
            />
            <BwCard
              label="↓ Internet in"
              help="Total inbound traffic to the Pi over Wi‑Fi (includes the Pi's own activity, not just forwarded traffic)."
              bytes={wlan0?.rx_bytes}
              bps={wlan0?.rx_bps}
            />
            <BwCard
              label="↑ Internet out"
              help="Total outbound traffic from the Pi over Wi‑Fi (includes the Pi's own activity)."
              bytes={wlan0?.tx_bytes}
              bps={wlan0?.tx_bps}
            />
          </div>
        </>
      )}
      <h2 className="text-lg font-medium text-slate-300 pt-2">DNS queries</h2>
      {err && <p className="text-red-400">{err}</p>}
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : queries.length === 0 ? (
        <p className="text-slate-400">No queries yet.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Time</Th>
              <Th>Client</Th>
              <Th>Type</Th>
              <Th>Domain</Th>
            </tr>
          </THead>
          <tbody>
            {queries.map((q) => (
              <TR key={q.id}>
                <Td className="text-slate-400 font-mono text-xs">
                  {fmt(q.ts)}
                </Td>
                <Td className="font-mono">
                  <div>{q.hostname || q.client_ip}</div>
                  {q.hostname && (
                    <div className="text-xs text-slate-500">{q.client_ip}</div>
                  )}
                </Td>
                <Td>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-xs">
                    {q.qtype}
                  </span>
                </Td>
                <Td className="font-mono">{q.domain}</Td>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
