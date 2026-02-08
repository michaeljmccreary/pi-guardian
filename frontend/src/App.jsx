import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import * as API from "./api";
import Login from "./Login";

// --- 1. CONFIGURATION ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
);

// --- 2. ICONS (Visual Helpers) ---
const IconLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);
const IconBack = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 12H5m7-7-7 7 7 7" />
  </svg>
);
const IconMac = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

// --- 3. PRESENTATIONAL COMPONENTS ---

const Navbar = ({ activeTab, setActiveTab, onSignOut }) => (
  <>
    {/* System Status Bar */}
    <div className="bg-slate-950/80 backdrop-blur-md border-b border-white/5 text-center py-1.5 z-[60] relative">
      <div className="container mx-auto px-4 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-cyan-500/80">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[pulse_2s_infinite]"></span>{" "}
          System Online
        </span>
        <span className="hidden sm:inline opacity-75">
          Pi-Guardian v2.0.0 • Protected
        </span>
        <span className="opacity-75">{new Date().toLocaleDateString()}</span>
      </div>
    </div>

    <nav className="sticky top-0 z-50 mb-8 border-b border-white/5 bg-slate-900/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          <a
            className="flex items-center gap-3 text-2xl font-bold text-white tracking-tight"
            href="#"
          >
            <IconLogo />
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Pi-Guardian
            </span>
          </a>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
              {["devices", "monitor", "settings"].map((tab) => (
                <button
                  key={tab}
                  className={`px-5 py-2 rounded-lg transition-all duration-300 cursor-pointer text-sm font-medium ${activeTab === tab ? "bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={onSignOut}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  </>
);

const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/20 ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="relative z-10 p-6 sm:p-8">{children}</div>
  </div>
);

const OverviewCards = ({ deviceCount, dnsCount, trafficIn, trafficOut }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <GlassCard>
      <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
        Devices seen
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-4xl font-light text-white tracking-tight">
          {deviceCount}
        </div>
        <span className="text-slate-500 text-sm font-medium">on LAN</span>
      </div>
      <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500 w-3/4 opacity-50"></div>
      </div>
    </GlassCard>

    <GlassCard>
      <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
        DNS domains
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-4xl font-light text-white tracking-tight">
          {dnsCount}
        </div>
        <span className="text-slate-500 text-sm font-medium">queried</span>
      </div>
      <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 w-1/2 opacity-50"></div>
      </div>
    </GlassCard>

    <GlassCard>
      <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
        Current traffic
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-slate-500 text-[10px] uppercase mb-1">
            Inbound
          </div>
          <div className="text-xl font-semibold text-white">
            {trafficIn} <span className="text-sm text-slate-500">KB/s</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-[10px] uppercase mb-1">
            Outbound
          </div>
          <div className="text-xl font-semibold text-white">
            {trafficOut} <span className="text-sm text-slate-500">KB/s</span>
          </div>
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500 w-1/3 opacity-50"></div>
        <div className="h-full bg-emerald-500/30 w-1/4"></div>
      </div>
    </GlassCard>
  </div>
);

const DeviceList = ({ devices, onScan, onMonitor }) => {
  // Fetch MAC Vendors
  const [vendors, setVendors] = useState({});

  useEffect(() => {
    devices.forEach(async (device) => {
      if (device.mac_address && !vendors[device.mac_address]) {
        try {
          const data = await API.getMacVendor(device.mac_address);
          setVendors((prev) => ({ ...prev, [device.mac_address]: data }));
        } catch (e) {
          setVendors((prev) => ({ ...prev, [device.mac_address]: "Unknown" }));
        }
      }
    });
  }, [devices]);

  // When user clicks "Scan Network", it trigger a new scan and refresh device list after a short delay
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Scanned Devices</h3>
          <p className="text-slate-400 text-sm">
            Devices discovered on your local network.
          </p>
        </div>
        <button
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-sky-500/20"
          onClick={onScan}
        >
          Scan Network
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500 bg-white/5">
            <tr>
              <th className="px-4 py-3 rounded-l-lg">IP Address</th>
              <th className="px-4 py-3">MAC</th>
              <th className="px-4 py-3">Device Type</th>
              <th className="px-4 py-3">Hostname</th>
              <th className="px-4 py-3 rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {devices.map((d, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{d.IP}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.mac_address}</td>
                <td className="px-4 py-3 text-slate-400">
                  {vendors[d.mac_address] || "Loading..."}
                </td>
                <td className="px-4 py-3">{d.hostname}</td>
                <td className="px-4 py-3">
                  <button
                    className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                    onClick={() => onMonitor(d.IP)}
                  >
                    Monitor
                  </button>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No devices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// When user clicks "Monitor" on a device, it is set it as selected and switch to monitor tab
const TrafficMonitor = ({
  devices,
  selectedDevice,
  onDeviceSelect,
  onBack,
  trafficData,
  dnsData,
  protocolData,
  timeFilter,
  setTimeFilter,
}) => {
  // Chart Config
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#64748b", font: { family: "Inter", size: 10 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#64748b", font: { family: "Inter", size: 10 } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8",
          font: { family: "Inter", size: 11 },
          usePointStyle: true,
          boxWidth: 6,
        },
      },
    },
    elements: { point: { radius: 0, hitRadius: 20, hoverRadius: 4 } },
  };

  // Data Prep
  const trafficChartData = {
    labels: trafficData.map((d) => new Date(d[0] * 1000).toLocaleTimeString()),
    datasets: [
      {
        label: "Download",
        data: trafficData.map((d) => d[1] / 1024),
        borderColor: "#22d3ee",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(34, 211, 238, 0.2)");
          gradient.addColorStop(1, "rgba(34, 211, 238, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: "Upload",
        data: trafficData.map((d) => d[2] / 1024),
        borderColor: "#f472b6",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(244, 114, 182, 0.2)");
          gradient.addColorStop(1, "rgba(244, 114, 182, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // For DNS distribution, it can show a doughnut chart of top queried domains
  const dnsChartData = {
    labels: dnsData.slice(0, 5).map((d) => d.domain),
    datasets: [
      {
        data: dnsData.slice(0, 5).map((d) => d.count),
        backgroundColor: [
          "#22d3ee",
          "#818cf8",
          "#c084fc",
          "#f472b6",
          "#fb7185",
        ],
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  // For protocol distribution, it can show a bar chart of top protocols by bytes
  const protocolChartData = {
    labels: protocolData.map((p) => p.protocol),
    datasets: [
      {
        label: "Bytes",
        data: protocolData.map((p) => p.bytes / 1024 / 1024),
        backgroundColor: [
          "#22d3ee",
          "#818cf8",
          "#c084fc",
          "#f472b6",
          "#fb7185",
        ],
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };

  const peakTraffic = (
    Math.max(...trafficData.map((d) => d[1] + d[2]), 0) / 1024
  ).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <GlassCard className="!p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Back to Devices"
            >
              <IconBack />
            </button>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {selectedDevice
                ? selectedDevice.hostname
                : "Global Network Traffic"}
            </h2>
          </div>
          {selectedDevice ? (
            <div className="flex gap-4 text-xs font-medium text-slate-400 ml-10 uppercase tracking-wider">
              <span className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-md border border-white/5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                {selectedDevice.IP}
              </span>
              <span className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-md border border-white/5 font-mono">
                <IconMac />
                {selectedDevice.mac_address}
              </span>
            </div>
          ) : (
            <p className="text-slate-400 text-sm ml-10">
              Real-time network traffic and DNS analytics for the entire
              network.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          {/* Device Selector */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Source
            </label>
            <div className="relative group">
              <select
                className="appearance-none bg-slate-800/80 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 cursor-pointer min-w-[200px] transition-all hover:bg-slate-800"
                value={selectedDevice ? selectedDevice.IP : "global"}
                onChange={(e) => onDeviceSelect(e.target.value)}
              >
                <option value="global">Global Network</option>
                <optgroup label="Devices">
                  {devices.map((d) => (
                    <option key={d.IP} value={d.IP}>
                      {d.hostname} ({d.IP})
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-white transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Time Filter Controls */}
          <div className="flex bg-slate-950/30 p-1 rounded-xl border border-white/5 w-full md:w-auto">
            {[60, 300, 900].map((t) => (
              <button
                key={t}
                className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeFilter === t ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-white"}`}
                onClick={() => setTimeFilter(t)}
              >
                {t / 60}m
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="!p-5">
          <div className="text-emerald-400 text-[10px] uppercase font-bold tracking-widest mb-1">
            Status
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
            Monitoring Active
          </div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="text-purple-400 text-[10px] uppercase font-bold tracking-widest mb-1">
            Total Domains
          </div>
          <div className="text-lg font-bold text-white">{dnsData.length}</div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="text-cyan-400 text-[10px] uppercase font-bold tracking-widest mb-1">
            Peak Traffic
          </div>
          <div className="text-lg font-bold text-white">
            {peakTraffic}{" "}
            <span className="text-sm text-slate-500 font-medium">KB/s</span>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h5 className="text-white text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-4 bg-cyan-400 rounded-full"></span>
              Network Traffic
            </h5>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> In
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span> Out
              </span>
            </div>
          </div>
          <div className="h-[300px]">
            <Line
              data={trafficChartData}
              options={{
                ...chartOptions,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </GlassCard>
        <GlassCard>
          <h5 className="text-white text-sm font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-400 rounded-full"></span>
            Top DNS Queries
          </h5>
          <div className="h-[200px] flex items-center justify-center relative">
            <Doughnut
              data={dnsChartData}
              options={{
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: { legend: { display: false } },
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {dnsData.length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Domains
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {dnsData.slice(0, 3).map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full`}
                    style={{
                      backgroundColor: ["#22d3ee", "#818cf8", "#c084fc"][i],
                    }}
                  ></span>
                  <span className="text-slate-300 truncate max-w-[120px]">
                    {d.domain}
                  </span>
                </div>
                <span className="text-slate-500 font-mono">{d.count}</span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="lg:col-span-3">
          <h5 className="text-white text-sm font-bold mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-400 rounded-full"></span>
            Protocol Usage (MB)
          </h5>
          <div className="h-[200px]">
            <Bar
              data={protocolChartData}
              options={{
                ...chartOptions,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Data Table */}
      <GlassCard className="p-0 sm:p-0">
        <div className="p-6 border-b border-white/5">
          <h5 className="text-white text-sm font-bold flex items-center gap-2">
            <span className="w-1.5 h-4 bg-slate-400 rounded-full"></span>
            Recent DNS Queries
          </h5>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500 border-b border-white/5 bg-black/20 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Domain</th>
                <th className="px-6 py-3">Count</th>
                <th className="px-6 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dnsData.map((d, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-medium text-white">
                    {d.domain}
                  </td>
                  <td className="px-6 py-3 text-slate-400">{d.count}</td>
                  <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                    {new Date(d.last_seen * 1000).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {dnsData.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// Placeholder for future settings page
const Settings = () => (
  <GlassCard className="max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
    <p className="text-slate-400 text-sm mb-8">
      Configuration options for your Pi-Guardian instance.
    </p>
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-300 mb-2">
          Auto-Scan Interval (seconds)
        </label>
        <input
          type="number"
          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          defaultValue="60"
        />
      </div>
      <button className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] w-full sm:w-auto">
        Save Changes
      </button>
    </div>
  </GlassCard>
);

// --- 4. CONTAINER COMPONENT (LOGIC) ---

function App() {
  // ALL hooks first
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState("devices");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [dnsData, setDnsData] = useState([]);
  const [protocolData, setProtocolData] = useState([]);
  const [timeFilter, setTimeFilter] = useState(60);

  // Effect: Load devices on login
  useEffect(() => {
    if (token) loadDevices();
  }, [token]);

  // Effect: Real-time monitoring
  useEffect(() => {
    if (activeTab !== "monitor" || !token) return;

    const fetchData = async () => {
      try {
        const tData = await API.getTraffic(timeFilter, selectedDevice?.IP);
        setTrafficData(tData);
        const dData = await API.getDomains(selectedDevice?.IP);
        setDnsData(dData);
        const pData = await API.getProtocols(selectedDevice?.IP);
        setProtocolData(pData);
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [activeTab, selectedDevice, timeFilter, token]);

  // Helpers
  const loadDevices = async () => {
    try {
      const data = await API.getDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    }
  };

  // When user clicks "Monitor" on a device,it is set it as selected and switch to monitor tab
  const handleMonitor = (ip) => {
    const device = devices.find((d) => d.IP === ip);
    setSelectedDevice(device);
    setActiveTab("monitor");
    setTrafficData([]);
    setProtocolData([]);
  };

  // When user selects a different device from the dropdown in monitor view
  const handleDeviceSelect = (ip) => {
    if (ip === "global") {
      setSelectedDevice(null);
    } else {
      const device = devices.find((d) => d.IP === ip);
      setSelectedDevice(device);
    }
  };

  // Derived State for Overview
  const lastSample = trafficData[trafficData.length - 1] || [0, 0, 0];
  const trafficInbound = (lastSample[1] / 1024).toFixed(2);
  const trafficOutbound = (lastSample[2] / 1024).toFixed(2);

  // Authentication check
  if (!token) {
    return <Login onLogin={(t) => setToken(t)} />;
  }

  // Dashboard render
  return (
    <div className="min-h-screen pb-12 selection:bg-cyan-500/30">
      {/* Navbar is outside container to be full-width */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={() => setToken(null)}
      />

      <div className="container mx-auto px-4">
        {activeTab !== "monitor" && (
          <OverviewCards
            deviceCount={devices.length}
            dnsCount={dnsData.length}
            trafficIn={trafficInbound}
            trafficOut={trafficOutbound}
          />
        )}

        {activeTab === "devices" && (
          <DeviceList
            devices={devices}
            onScan={loadDevices}
            onMonitor={handleMonitor}
          />
        )}

        {activeTab === "monitor" && (
          <TrafficMonitor
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={handleDeviceSelect}
            onBack={() => {
              setActiveTab("devices");
              setSelectedDevice(null);
            }}
            trafficData={trafficData}
            dnsData={dnsData}
            protocolData={protocolData}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
          />
        )}

        {activeTab === "settings" && <Settings />}
      </div>
    </div>
  );
}

export default App;
