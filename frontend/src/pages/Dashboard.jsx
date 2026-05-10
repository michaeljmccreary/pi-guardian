import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Card from "../components/Card";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [traffic, setTraffic] = useState([]);
  const [score, setScore] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, t, c] = await Promise.all([
          api("/devices"),
          api("/traffic?limit=20"),
          api("/compliance").catch(() => ({})),
        ]);
        setDevices(d || []);
        setTraffic(t || []);
        setScore(c?.network_score ?? null);
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const uniqueDomains = new Set(traffic.map((q) => q.domain)).size;
  const onlineCount = devices.filter((d) => d.is_online).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat
          label="Devices online"
          value={onlineCount}
          sub={`of ${devices.length} known`}
        />
        <Stat label="Recent DNS queries" value={traffic.length} />
        <Stat label="Unique domains" value={uniqueDomains} />
        <Stat
          label="Network score"
          value={score === null ? "—" : score}
          to="/compliance"
        />
      </div>
      <Card>
        <h2 className="font-medium mb-3">Latest queries</h2>
        {traffic.length === 0 ? (
          <p className="text-slate-400 text-sm">No queries yet.</p>
        ) : (
          <ul className="text-sm divide-y divide-slate-800">
            {traffic.slice(0, 10).map((q) => (
              <li key={q.id} className="py-2 flex justify-between">
                <span className="font-mono">{q.domain}</span>
                <span className="text-slate-500">
                  {q.hostname || q.client_ip}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, to }) {
  const card = (
    <Card
      className={`h-full ${to ? "hover:border-blue-500 cursor-pointer" : ""}`}
    >
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}
