import sqlite3
import subprocess
import threading
import time
from ..config import Config
from . import audit

_started = False
_known = {}

def _ping(ip):
    if not ip:
        return False
    try:
        r = subprocess.run(
            ["ping", "-c", "1", "-W", "1", ip],
            capture_output=True, timeout=3,
        )
        return r.returncode == 0
    except Exception:
        return False

def _check_once():
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        targets = con.execute(
            "SELECT id, ip FROM devices WHERE ip IS NOT NULL"
        ).fetchall()
        for did, ip in targets:
            if _ping(ip):
                con.execute(
                    "UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?",
                    (did,),
                )
        con.commit()
        rows = con.execute(
            """SELECT id, mac, hostname,
                      CASE WHEN (julianday('now') - julianday(last_seen)) * 1440 < 5
                           THEN 1 ELSE 0 END AS is_online
               FROM devices"""
        ).fetchall()
    finally:
        con.close()

    for did, mac, hostname, is_online in rows:
        online = bool(is_online)
        prev = _known.get(did)
        if prev is None:
            _known[did] = online
            continue
        if prev and not online:
            audit.log("device", "device_offline",
                      target=mac, details=hostname or "")
            _known[did] = False
        elif not prev and online:
            audit.log("device", "device_online",
                      target=mac, details=hostname or "")
            _known[did] = True

def start_monitor_thread():
    global _started
    if _started:
        return
    _started = True

    def loop():
        while True:
            try:
                _check_once()
            except Exception:
                pass
            time.sleep(60)

    threading.Thread(target=loop, daemon=True, name="device-monitor").start()