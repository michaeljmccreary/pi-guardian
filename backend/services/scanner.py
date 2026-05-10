import sqlite3
import subprocess
import threading
import xml.etree.ElementTree as ET
from ..config import Config
from .rules import evaluate
from . import audit

NMAP_CMD = ["nmap", "-sT", "-sV", "-T4", "-p-", "100", "-oX", "-"]

def _parse_xml(xml_text):
    out = []
    if not xml_text.strip():
        return out
    root = ET.fromstring(xml_text)
    for host in root.findall("host"):
        ports = host.find("ports")
        if ports is None:
            continue
        for p in ports.findall("port"):
            state_el = p.find("state")
            if state_el is None or state_el.get("state") != "open":
                continue
            svc = p.find("service")
            out.append({
                "port": int(p.get("portid")),
                "protocol": p.get("protocol"),
                "state": state_el.get("state"),
                "service": svc.get("name") if svc is not None else None,
                "version": (svc.get("product", "") + " " + svc.get("version", "")).strip()
                           if svc is not None else None,
            })
    return out

def _run_nmap(ip):
    proc = subprocess.run(NMAP_CMD + [ip], capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"nmap failed: {proc.stderr.strip()[:200]}")
    return _parse_xml(proc.stdout)

def _scan_device(scan_id, ip):
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        con.execute("UPDATE scans SET status='running' WHERE id=?", (scan_id,))
        con.commit()
        try:
            findings = _run_nmap(ip)
            hits, score = evaluate(findings)
            for h in hits:
                con.execute(
                    """INSERT INTO scan_findings
                       (scan_id, port, protocol, service, version, severity, rule_id, description)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (scan_id, h["port"], h["protocol"], h["service"], h["version"],
                     h["severity"], h["rule_id"], h["description"]),
                )
            con.execute(
                "UPDATE scans SET status='complete', finished_at=CURRENT_TIMESTAMP, score=? WHERE id=?",
                (score, scan_id),
            )
            con.commit()
            audit.log("scan", "scan_complete", target=str(scan_id),
                      details=f"ip={ip} score={score} findings={len(hits)}")
        except subprocess.TimeoutExpired:
            con.execute(
                "UPDATE scans SET status='failed', finished_at=CURRENT_TIMESTAMP, error=? WHERE id=?",
                ("scan exceeded 180s timeout", scan_id),
            )
            con.commit()
            audit.log("scan", "scan_failed", severity="warning",
                      target=str(scan_id), details=f"ip={ip} reason=timeout")
        except Exception as exc:
            con.execute(
                "UPDATE scans SET status='failed', finished_at=CURRENT_TIMESTAMP, error=? WHERE id=?",
                (str(exc)[:200], scan_id),
            )
            con.commit()
            audit.log("scan", "scan_failed", severity="error",
                      target=str(scan_id), details=f"ip={ip} reason={str(exc)[:100]}")
    finally:
        con.close()

def start_device_scan(device_id, ip):
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        cur = con.execute("INSERT INTO scans (device_id, status) VALUES (?, 'pending')", (device_id,))
        scan_id = cur.lastrowid
        con.commit()
    finally:
        con.close()
    threading.Thread(target=_scan_device, args=(scan_id, ip), daemon=True).start()
    return scan_id

def start_network_scan():
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        rows = con.execute("SELECT id, ip FROM devices WHERE ip IS NOT NULL").fetchall()
    finally:
        con.close()
    return [start_device_scan(dev_id, ip) for dev_id, ip in rows]
