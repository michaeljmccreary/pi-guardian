# just an initial page for testing concepts and ideas
# will re-vamp when I get basic version of some functionality working

import os
import re
import sqlite3
import subprocess
import threading
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, render_template
# For traffic monitring
import time 
import threading
from collections import deque
# For scapy to read network traffic
from collections import defaultdict
from scapy.all import rdpcap, IP, TCP, UDP, sniff, DNS, DNSQR
import time
# for API call to identify devices by MAC address
import requests


TRAFFIC_WINDOW_SECONDS = 60  # seconds
# each entry is (timestamp, bytes_sent, bytes_recv)
traffic_samples = deque(maxlen=TRAFFIC_WINDOW_SECONDS)

# Test device IP for traffic monitoring
MOINTORED_IP = "10.10.10.10"  

# domain -> stats
domain_stats = defaultdict(lambda: {
    "count": 0,
    "last_seen": 0,
    "last_qtype": None,
})


APP_HOST = "0.0.0.0"
APP_PORT = 8080
DB_PATH = os.path.join(os.path.dirname(__file__), "devices.db")

app = Flask(__name__)

# Initialize database
def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db_conn() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS devices (
                IP TEXT PRIMARY KEY,
                mac_address TEXT,
                hostname TEXT,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

def update_device(ip, mac_address, hostname):
    with db_conn() as conn:
        conn.execute('''
            INSERT INTO devices (IP, mac_address, hostname, last_seen)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(IP) DO UPDATE SET
                mac_address=excluded.mac_address,
                hostname=excluded.hostname,
                last_seen=excluded.last_seen
        ''', (ip, mac_address, hostname, datetime.now()))
        conn.commit()

def get_devices():
    with db_conn() as conn:
        cursor = conn.execute('SELECT * FROM devices')
        return [dict(row) for row in cursor.fetchall()]


# simeple LAN device discovery using arp -a

ARP_IP_RE = re.compile(r"(\d{1,3}(?:\.\d{1,3}){3})")
ARP_MAC_RE = re.compile(r"([0-9a-fA-F]{2}(?:(?:[:\-])[0-9a-fA-F]{2}){5})")

# reads the arp table
# only reads devices the device has communicated with recently
def scan_arp_table():
    try:
        out = subprocess.check_output(["arp", "-a"]).decode()
        devices = []
        for line in out.splitlines():
            ip_match = ARP_IP_RE.search(line)
            mac_match = ARP_MAC_RE.search(line)
            if ip_match and mac_match:
                ip = ip_match.group(1)
                mac = mac_match.group(1)
                hostname = line.split()[0]
                devices.append((ip, mac, hostname))
        return devices
    except Exception as e:
        print(f"Error scanning ARP table: {e}")
        return []

# Device port scanning using nmap
def scan_device_thread(ip, job_id):
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["message"] = "Scanning 1-65535..."

        # Full TCP scan all ports:
        cmd = ["nmap", "-p-", "-T4", "--open", ip]
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)

        open_ports = []
        for line in out.splitlines():
            if "/tcp" in line and " open " in line:
                port = line.split("/")[0].strip()
                if port.isdigit():
                    open_ports.append(int(port))

        open_ports = sorted(set(open_ports))
        jobs[job_id]["status"] = "done"
        jobs[job_id]["open_ports"] = open_ports
        jobs[job_id]["raw"] = out
        jobs[job_id]["message"] = "Finished"

    except subprocess.CalledProcessError as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["message"] = "nmap failed"
        jobs[job_id]["raw"] = e.output

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["message"] = str(e)


# Traffic monitoring thread
# I gave my test device a static IP of 10.10.10.10
# The test device is connected to the Pi via eth0
# The Pi is forwarding traffic from eth0 to wlan0 so the test device has internet access
def traffic_monitor_thread(ip="10.10.10.10", iface="eth0"):
    prev_bytes_sent = 0
    prev_bytes_recv = 0

    while True:
        try:
            with open(f"/sys/class/net/{iface}/statistics/tx_bytes", "r") as f:
                bytes_sent = int(f.read().strip())
            with open(f"/sys/class/net/{iface}/statistics/rx_bytes", "r") as f:
                bytes_recv = int(f.read().strip())

            timestamp = time.time()
            traffic_samples.append((timestamp, bytes_sent - prev_bytes_sent, bytes_recv - prev_bytes_recv))

            prev_bytes_sent = bytes_sent
            prev_bytes_recv = bytes_recv

            time.sleep(1)
        except Exception as e:
            print(f"Error in traffic monitor: {e}")
            time.sleep(5)

# sniffs traffic on eth0 and extracts the DNS queries
def dns_sniffer():
    def process_packet(packet):
        # only care about packets involving the test device
        if not packet.haslayer(IP):
            return

        ip = packet[IP]
        if ip.src != MOINTORED_IP and ip.dst != MOINTORED_IP:
            return

        # DNS query (qr == 0)
        if packet.haslayer(DNS) and packet[DNS].qr == 0:
            dns_layer = packet[DNS]
            if not dns_layer.qd:
                return

            query_name = dns_layer.qd.qname.decode(errors="ignore").rstrip('.')
            qtype = dns_layer.qd.qtype
            timestamp = time.time()

            stats = domain_stats[query_name]
            stats["count"] += 1
            stats["last_seen"] = timestamp
            stats["last_qtype"] = qtype

    sniff(
        iface="eth0",
        filter="udp port 53",
        prn=process_packet,
        store=0
    )

jobs = {}

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/devices")
def get_devices_api():
    devices = scan_arp_table()
    for ip, mac, hostname in devices:
        update_device(ip, mac, hostname)
    return jsonify(get_devices())

@app.get("/api/scan")
def scan_api():
    devices = scan_arp_table()
    for ip, mac, hostname in devices:
        update_device(ip, mac, hostname)
    return jsonify(get_devices())

@app.post("/api/scan_device")
def scan_device_api():
    data = request.get_json()
    ip = data.get("ip")

    if not ip:
        return jsonify({"error": "Missing IP"}), 400

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "ip": ip
    }

    threading.Thread(
        target=scan_device_thread,
        args=(ip, job_id),
        daemon=True
    ).start()

    return jsonify({"job_id": job_id})

@app.get("/api/scan_status/<job_id>")
def scan_status(job_id):
    return jsonify(jobs.get(job_id, {"status": "not_found"}))


@app.get("/api/traffic")
def traffic_api():
    return jsonify(list(traffic_samples))

@app.get("/api/dns_stats")
def dns_stats_api():
    result = []
    for domain, stats in domain_stats.items():
        entry = {
            "domain": domain,
            "count": stats["count"],
            "last_seen": stats["last_seen"],
            "last_qtype": stats["last_qtype"],
        }
        result.append(entry)
    return jsonify(result)

@app.get("/api/mac_vendor")
def mac_vendor():
    mac = request.args.get("mac")
    if not mac:
        return jsonify({"vendor": "Unknown"})
    try:
        resp = requests.get(f"https://api.macvendors.com/{mac}", timeout=5)
        if resp.status_code == 200:
            return jsonify({"vendor": resp.text})
        return jsonify({"vendor": "Unknown"})
    except:
        return jsonify({"vendor": "Unknown"})

if __name__ == "__main__":
    init_db()
    threading.Thread(target=traffic_monitor_thread, daemon=True).start()
    threading.Thread(target=dns_sniffer, daemon=True).start()
    app.run(host=APP_HOST, port=APP_PORT)