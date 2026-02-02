import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api' // Proxied by Vite to Flask
});

// --- MOCK DATA CONFIG ---
const USE_MOCK = false; // Set to true to use mock data for testing

const mockDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const mockDevices = [
    { IP: '192.168.1.1', mac_address: '00:11:22:33:44:55', hostname: 'gateway' },
    { IP: '192.168.1.10', mac_address: 'aa:bb:cc:dd:ee:ff', hostname: 'desktop-pc' },
    { IP: '192.168.1.15', mac_address: '12:34:56:78:90:ab', hostname: 'iphone-x' },
    { IP: '192.168.1.20', mac_address: 'de:ad:be:ef:fe:ed', hostname: 'smart-tv' },
];

export const getDevices = async () => {
    if (USE_MOCK) {
        await mockDelay(500);
        return mockDevices;
    }
    const res = await api.get('/devices');
    return res.data;
};

export const startScan = async (ip) => {
    if (USE_MOCK) {
        await mockDelay(300);
        return { jobId: 'mock-job-' + Date.now() };
    }
    const res = await api.post('/scan_device', { ip: ip });
    return res.data;
};

export const getScanStatus = async (jobId) => {
    if (USE_MOCK) {
        return { status: 'done', open_ports: [22, 80, 443], message: 'Finished (Mock)' };
    }
    const res = await api.get(`/scan_status/${jobId}`);
    return res.data;
};

export const getTraffic = async (window = 60, ip = null) => {
    if (USE_MOCK) {
        // Generate sine wave traffic
        const now = Date.now() / 1000;
        const data = [];
        for (let i = window; i > 0; i--) {
            const t = now - i;
            const download = 50000 + Math.sin(t * 0.1) * 20000 + Math.random() * 10000;
            const upload = 10000 + Math.sin(t * 0.1 + 2) * 5000 + Math.random() * 2000;
            data.push([t, download, upload]);
        }
        return data;
    }
    const res = await api.get('/traffic', { params: { window, ip } });
    return res.data;
};

export const getDomains = async (ip = null) => {
    if (USE_MOCK) {
        return [
            { domain: 'google.com', count: 150, last_seen: Date.now() / 1000, category: 'Search', type: 'A', status: 'NOERROR' },
            { domain: 'youtube.com', count: 85, last_seen: Date.now() / 1000 - 5, category: 'Streaming', type: 'A', status: 'NOERROR' },
            { domain: 'netflix.com', count: 42, last_seen: Date.now() / 1000 - 20, category: 'Streaming', type: 'AAAA', status: 'NOERROR' },
            { domain: 'facebook.com', count: 30, last_seen: Date.now() / 1000 - 60, category: 'Social', type: 'A', status: 'NOERROR' },
            { domain: 'api.weather.gov', count: 12, last_seen: Date.now() / 1000 - 120, category: 'Utility', type: 'CNAME', status: 'NOERROR' },
            { domain: 'doubleclick.net', count: 128, last_seen: Date.now() / 1000 - 2, category: 'Ads', type: 'A', status: 'BLOCKED' },
            { domain: 'analytics.google.com', count: 64, last_seen: Date.now() / 1000 - 15, category: 'Analytics', type: 'A', status: 'BLOCKED' },
            { domain: 'fonts.googleapis.com', count: 45, last_seen: Date.now() / 1000 - 30, category: 'CDN', type: 'A', status: 'NOERROR' },
            { domain: 'github.com', count: 28, last_seen: Date.now() / 1000 - 45, category: 'Development', type: 'A', status: 'NOERROR' },
            { domain: 'microsoft.com', count: 22, last_seen: Date.now() / 1000 - 90, category: 'Tech', type: 'A', status: 'NOERROR' },
        ];
    }
    const res = await api.get('/dns_stats', { params: { ip } });
    return res.data;
};

export const getProtocols = async (ip = null) => {
    if (USE_MOCK) {
        return [
            { protocol: 'HTTPS', bytes: 1500000 },
            { protocol: 'HTTP', bytes: 450000 },
            { protocol: 'QUIC', bytes: 850000 },
            { protocol: 'DNS', bytes: 50000 },
            { protocol: 'SSH', bytes: 12000 },
        ];
    }
    const res = await api.get('/protocols', { params: { ip } });
    return res.data;
};

export const getMacVendor = async (mac) => {
    const res = await api.get('/mac_vendor', { params: { mac } });
    return res.data.vendor;
};