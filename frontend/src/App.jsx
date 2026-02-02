import { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import * as API from './api'

// --- 1. CONFIGURATION ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement)

// --- 2. ICONS (Visual Helpers) ---
const IconLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
)
const IconBack = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
)
const IconMac = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
)

// --- 3. PRESENTATIONAL COMPONENTS ---

const Navbar = ({ activeTab, setActiveTab }) => (
  <nav className="sticky top-0 z-50 mb-8 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
    <div className="container mx-auto px-4">
      <div className="flex h-16 items-center justify-between">
        <a className="flex items-center gap-2 text-xl font-bold text-white" href="#">
          <IconLogo />
          Pi-Guardian
        </a>
        <div className="flex gap-2">
          {['devices', 'monitor', 'settings'].map(tab => (
             <button 
               key={tab}
               className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${activeTab === tab ? 'bg-sky-500/10 text-sky-400 font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
               onClick={() => setActiveTab(tab)}
             >
               {tab.charAt(0).toUpperCase() + tab.slice(1)}
             </button>
          ))}
        </div>
      </div>
    </div>
  </nav>
)

const OverviewCards = ({ deviceCount, dnsCount, trafficIn, trafficOut }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
      <div className="text-slate-400 text-sm font-medium mb-1">Devices seen</div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-semibold text-white">{deviceCount}</div>
        <span className="text-slate-500 text-sm">on your LAN</span>
      </div>
    </div>
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
      <div className="text-slate-400 text-sm font-medium mb-1">DNS domains</div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-semibold text-white">{dnsCount}</div>
        <span className="text-slate-500 text-sm">queried recently</span>
      </div>
    </div>
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
      <div className="text-slate-400 text-sm font-medium mb-1">Current traffic</div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-slate-500 text-xs">Inbound</div>
          <div className="font-semibold text-white">{trafficIn} KB/s</div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-xs">Outbound</div>
          <div className="font-semibold text-white">{trafficOut} KB/s</div>
        </div>
      </div>
    </div>
  </div>
)

const DeviceList = ({ devices, onScan, onMonitor }) => {
    // Fetch MAC Vendors
    const [vendors, setVendors] = useState({});

    useEffect(() => {
        devices.forEach(async (device) => {
            if (device.mac_address && !vendors[device.mac_address]) {
                try {
                    const data = await API.getMacVendor(device.mac_address);
                    setVendors(prev => ({ ...prev, [device.mac_address]: data }));
                } catch (e) {
                    setVendors(prev => ({ ...prev, [device.mac_address]: 'Unknown' }));
                }
            }
        });
    }, [devices]);

    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">Scanned Devices</h3>
                    <p className="text-slate-400 text-sm">Devices discovered on your local network.</p>
                </div>
                <button className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-sky-500/20" onClick={onScan}>Scan Network</button>
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
                                    {vendors[d.mac_address] || 'Loading...'}
                                </td>
                                <td className="px-4 py-3">{d.hostname}</td>
                                <td className="px-4 py-3">
                                    <button className="text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors" onClick={() => onMonitor(d.IP)}>Monitor</button>
                                </td>
                            </tr>
                        ))}
                        {devices.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No devices found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TrafficMonitor = ({ devices, selectedDevice, onDeviceSelect, onBack, trafficData, dnsData, timeFilter, setTimeFilter }) => {
    // Chart Config
    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } },
        plugins: { legend: { labels: { color: '#f8fafc' } } }
    };
    
    // Data Prep
    const trafficChartData = {
        labels: trafficData.map(d => new Date(d[0] * 1000).toLocaleTimeString()),
        datasets: [
            { label: 'In (KB/s)', data: trafficData.map(d => d[1] / 1024), borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.1)', fill: true, tension: 0.4 },
            { label: 'Out (KB/s)', data: trafficData.map(d => d[2] / 1024), borderColor: '#f472b6', backgroundColor: 'rgba(244, 114, 182, 0.1)', fill: true, tension: 0.4 }
        ]
    };
    
    const dnsChartData = {
        labels: dnsData.slice(0,5).map(d => d.domain),
        datasets: [{ data: dnsData.slice(0,5).map(d => d.count), backgroundColor: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'], borderWidth: 0 }]
    };

    const peakTraffic = (Math.max(...trafficData.map(d => d[1] + d[2]), 0) / 1024).toFixed(2);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors" title="Back to Devices">
                            <IconBack />
                        </button>
                        <h2 className="text-2xl font-bold text-white">{selectedDevice ? selectedDevice.hostname : 'Global Network Traffic'}</h2>
                    </div>
                    {selectedDevice ? (
                        <div className="flex gap-4 text-sm text-slate-400 ml-9">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                {selectedDevice.IP}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono">
                                <IconMac />
                                {selectedDevice.mac_address}
                            </span>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm ml-9">Real-time network traffic and DNS analytics for the entire network.</p>
                    )}
                </div>
                
                <div className="flex flex-col items-end gap-3">
                     {/* Device Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">Source:</label>
                        <select 
                            className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                            value={selectedDevice ? selectedDevice.IP : 'global'}
                            onChange={(e) => onDeviceSelect(e.target.value)}
                        >
                            <option value="global">Global Network</option>
                            <optgroup label="Devices">
                                {devices.map(d => (
                                    <option key={d.IP} value={d.IP}>{d.hostname} ({d.IP})</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Time Filter Controls */}
                    <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5">
                        {[60, 300, 900].map(t => (
                            <button key={t} 
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeFilter === t ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`} 
                                onClick={() => setTimeFilter(t)}>
                                {t/60}m
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4">
                    <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Status</div>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Monitoring Active
                    </div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4">
                    <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Total Domains</div>
                    <div className="text-lg font-bold text-white">{dnsData.length}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-4">
                    <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Peak Traffic</div>
                    <div className="text-lg font-bold text-white">{peakTraffic} KB/s</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
                    <h5 className="text-slate-400 text-sm font-medium mb-4">Network Traffic</h5>
                    <div className="h-[300px]"><Line data={trafficChartData} options={chartOptions} /></div>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
                    <h5 className="text-slate-400 text-sm font-medium mb-4">Top DNS Queries</h5>
                    <div className="h-[200px] flex items-center justify-center"><Doughnut data={dnsChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6">
                <h5 className="text-slate-400 text-sm font-medium mb-4">Recent DNS Queries</h5>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs uppercase text-slate-500 border-b border-white/5"><tr><th className="px-4 py-2">Domain</th><th className="px-4 py-2">Count</th><th className="px-4 py-2">Last Seen</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {dnsData.map((d, i) => (
                                <tr key={i} className="hover:bg-white/5">
                                    <td className="px-4 py-2 font-medium text-white">{d.domain}</td>
                                    <td className="px-4 py-2">{d.count}</td>
                                    <td className="px-4 py-2 text-slate-500">{new Date(d.last_seen * 1000).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                            {dnsData.length === 0 && <tr><td colSpan="3" className="px-4 py-4 text-center text-slate-500">No data...</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const Settings = () => (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 text-white max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Settings</h2>
        <p className="text-slate-400 text-sm mb-6">Configuration options (Mock)</p>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Auto-Scan Interval</label>
                <input type="number" className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500" defaultValue="60" />
            </div>
            <button className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors font-medium shadow-lg shadow-sky-500/20">Save Changes</button>
        </div>
    </div>
)

// --- 4. CONTAINER COMPONENT (LOGIC) ---

function App() {
  // State
  const [activeTab, setActiveTab] = useState('devices')
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [trafficData, setTrafficData] = useState([])
  const [dnsData, setDnsData] = useState([])
  const [timeFilter, setTimeFilter] = useState(60)

  // Effect: Initial Load
  useEffect(() => {
    loadDevices();
  }, [])

  // Effect: Polling
  useEffect(() => {
    if (activeTab !== 'monitor') return;
    
    const fetchData = async () => {
        try {
            const tData = await API.getTraffic(timeFilter, selectedDevice?.IP);
            setTrafficData(tData);
            const dData = await API.getDomains(selectedDevice?.IP);
            setDnsData(dData);
        } catch(e) { console.error(e); }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [activeTab, selectedDevice, timeFilter])

  // Helpers
  const loadDevices = async () => {
      try {
          const data = await API.getDevices();
          setDevices(data);
      } catch(e) { console.error(e); }
  }

  const handleMonitor = (ip) => {
      const device = devices.find(d => d.IP === ip);
      setSelectedDevice(device);
      setActiveTab('monitor');
      setTrafficData([]);
  }

  const handleDeviceSelect = (ip) => {
    if (ip === 'global') {
        setSelectedDevice(null);
    } else {
        const device = devices.find(d => d.IP === ip);
        setSelectedDevice(device);
    }
  }

  // Derived State for Overview
  const lastSample = trafficData[trafficData.length - 1] || [0, 0, 0];
  const trafficInbound = (lastSample[1] / 1024).toFixed(2);
  const trafficOutbound = (lastSample[2] / 1024).toFixed(2);

  // Render
  return (
    <div className="min-h-screen pb-12">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="container mx-auto px-4">
        {activeTab !== 'monitor' && (
            <OverviewCards 
                deviceCount={devices.length} 
                dnsCount={dnsData.length}
                trafficIn={trafficInbound}
                trafficOut={trafficOutbound}
            />
        )}

        {activeTab === 'devices' && (
            <DeviceList 
                devices={devices} 
                onScan={loadDevices}
                onMonitor={handleMonitor}
            />
        )}

        {activeTab === 'monitor' && (
            <TrafficMonitor 
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                onBack={() => {
                    setActiveTab('devices');
                    setSelectedDevice(null);
                }}
                trafficData={trafficData}
                dnsData={dnsData}
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
            />
        )}

        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  )
}

export default App
