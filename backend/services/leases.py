from pathlib import Path
import sqlite3
from ..config import Config
from . import audit

LEASES_FILE = Path("/var/lib/misc/dnsmasq.leases")

def parse_leases():
    if not LEASES_FILE.exists():
        return []
    out = []
    for line in LEASES_FILE.read_text().splitlines():
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        _, mac, ip, hostname = parts[0], parts[1].lower(), parts[2], parts[3]
        if hostname == "*":
            hostname = None
        out.append({"mac": mac, "ip": ip, "hostname": hostname})
    return out

def sync_leases():
    leases = parse_leases()
    if not leases:
        return 0
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        cur = con.cursor()
        for d in leases:
            existing = cur.execute(
                "SELECT id, ip FROM devices WHERE mac = ?", (d["mac"],)
            ).fetchone()
            cur.execute(
                """
                INSERT INTO devices (mac, ip, hostname)
                VALUES (?, ?, ?)
                ON CONFLICT(mac) DO UPDATE SET
                    ip = excluded.ip,
                    hostname = COALESCE(excluded.hostname, devices.hostname)
                """,
                (d["mac"], d["ip"], d["hostname"]),
            )
            if not existing:
                audit.log("device", "device_first_seen", target=d["mac"],
                          details=f"ip={d['ip']} hostname={d['hostname'] or ''}")
            elif existing[1] != d["ip"]:
                audit.log("dhcp", "dhcp_lease_changed", target=d["mac"],
                          details=f"{existing[1]} -> {d['ip']}")
            if d["hostname"]:
                row = cur.execute(
                    "SELECT id FROM devices WHERE mac = ?", (d["mac"],)
                ).fetchone()
                if row:
                    cur.execute(
                        """
                        INSERT INTO device_hostnames (device_id, hostname)
                        VALUES (?, ?)
                        ON CONFLICT(device_id, hostname) DO UPDATE SET
                            last_seen = CURRENT_TIMESTAMP
                        """,
                        (row[0], d["hostname"]),
                    )
        con.commit()
        return len(leases)
    finally:
        con.close()