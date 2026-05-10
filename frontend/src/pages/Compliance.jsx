import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { fmt } from "../utils/time";
import Button from "../components/Button";
import Card from "../components/Card";
import { Table, THead, Th, TR, Td } from "../components/Table";
import ScoreGauge from "../components/ScoreGauge";
import ScoreBadge from "../components/ScoreBadge";
import SeverityBadge from "../components/SeverityBadge";

export default function Compliance() {
  const [data, setData] = useState({
    network_score: null,
    devices: [],
    recent_findings: [],
  });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const d = await api("/compliance");
      setData(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  async function scanAll() {
    setScanning(true);
    try {
      await api("/scans/all", { method: "POST" });
      setTimeout(() => {
        load();
        setScanning(false);
      }, 12000);
    } catch (e) {
      setErr(e.message);
      setScanning(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading…</p>;

  const scored = data.devices.filter((d) => d.score !== null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Network Compliance</h1>
        <Button onClick={scanAll} disabled={scanning}>
          {scanning ? "Scanning…" : "Scan All Devices"}
        </Button>
      </div>
      {err && <p className="text-red-400">{err}</p>}

      <Card className="p-6 flex items-center gap-8">
        <ScoreGauge score={data.network_score} />
        <div>
          <p className="text-3xl font-semibold mt-1">
            {data.network_score !== null
              ? `${data.network_score} / 100`
              : "No data"}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {scored} of {data.devices.length} devices scanned
          </p>
        </div>
      </Card>

      <div>
        <h2 className="font-medium mb-2">Per-device scores</h2>
        <Table>
          <THead>
            <tr>
              <Th>Device</Th>
              <Th>IP</Th>
              <Th>Score</Th>
              <Th>Critical</Th>
              <Th>High</Th>
              <Th>Last scan</Th>
            </tr>
          </THead>
          <tbody>
            {data.devices.map((d) => (
              <TR key={d.id}>
                <Td>
                  <Link to={`/devices/${d.id}`} className="hover:text-blue-400">
                    {d.hostname || (
                      <span className="text-slate-500">unknown</span>
                    )}
                  </Link>
                </Td>
                <Td className="font-mono">{d.ip}</Td>
                <Td>
                  <ScoreBadge score={d.score} />
                </Td>
                <Td className="text-red-400">{d.critical ?? 0}</Td>
                <Td className="text-orange-400">{d.high ?? 0}</Td>
                <Td className="text-slate-400">{fmt(d.last_scan_at)}</Td>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>

      <Card className="p-0">
        <h2 className="font-medium p-4 border-b border-slate-800">
          Recent High &amp; Critical findings
        </h2>
        {data.recent_findings.length === 0 ? (
          <p className="p-4 text-slate-400 text-sm">
            No high-severity findings yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {data.recent_findings.slice(0, 20).map((f) => (
              <li
                key={f.id}
                className="p-3 flex items-center gap-3 hover:bg-slate-800/30"
              >
                <SeverityBadge severity={f.severity} />
                <Link
                  to={`/devices/${f.device_id}`}
                  className="font-medium hover:text-blue-400"
                >
                  {f.hostname || f.ip}
                </Link>
                <span className="font-mono text-slate-400">port {f.port}</span>
                <span className="text-slate-300">· {f.description}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {fmt(f.finished_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
