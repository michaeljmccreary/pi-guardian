import sqlite3
import threading
import time
from ..config import Config

_cleanup_started = False

def log(category, action, *, severity="info", actor=None,
        target=None, details=None, ip=None):
    try:
        con = sqlite3.connect(Config.DATABASE_PATH)
        con.execute(
            """INSERT INTO audit_logs
               (category, severity, actor, target, action, details, ip)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (category, severity, actor, target, action, details, ip),
        )
        con.commit()
        con.close()
    except Exception:
        pass

def prune_old_logs():
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        con.execute(
            "DELETE FROM audit_logs WHERE timestamp < datetime('now', '-30 days')"
        )
        con.commit()
    finally:
        con.close()

def start_cleanup_thread():
    global _cleanup_started
    if _cleanup_started:
        return
    _cleanup_started = True

    def loop():
        while True:
            try:
                prune_old_logs()
            except Exception:
                pass
            time.sleep(3600)

    threading.Thread(target=loop, daemon=True, name="audit-cleanup").start()