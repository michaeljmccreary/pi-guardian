import sqlite3
import subprocess
from flask import Blueprint, jsonify, abort, request, g
from ..db import get_db
from ..config import Config
from ..auth import login_required, admin_required
from ..services import audit

bp = Blueprint("devices", __name__)

def _iptables(args):
    try:
        r = subprocess.run(["sudo", "-n", "iptables"] + args,
                           capture_output=True, timeout=5)
        return r.returncode, r.stderr.decode().strip()
    except FileNotFoundError:
        return 127, "sudo or iptables not found"
    except Exception as e:
        return 1, str(e)[:200]

def _block_args(mac):
    return ["FORWARD", "-m", "mac", "--mac-source", mac, "-j", "DROP"]

def apply_block(mac):
    code, _ = _iptables(["-C"] + _block_args(mac))
    if code == 0:
        return None
    code, err = _iptables(["-I"] + _block_args(mac))
    return f"iptables: {err}" if code != 0 else None

def remove_block(mac):
    code, _ = _iptables(["-C"] + _block_args(mac))
    if code != 0:
        return None
    code, err = _iptables(["-D"] + _block_args(mac))
    return f"iptables: {err}" if code != 0 else None

def reapply_blocks():
    con = sqlite3.connect(Config.DATABASE_PATH)
    try:
        rows = con.execute("SELECT mac FROM devices WHERE is_blocked=1").fetchall()
    finally:
        con.close()
    for (mac,) in rows:
        apply_block(mac)

@bp.get("/devices")
@login_required
def list_devices():
    rows = get_db().execute(
        """
        SELECT id, mac, ip, hostname, alias, vendor, is_blocked, first_seen, last_seen,
               CASE WHEN (julianday('now') - julianday(last_seen)) * 1440 < 5
                    THEN 1 ELSE 0 END AS is_online
        FROM devices
        ORDER BY is_online DESC, last_seen DESC
        """
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.get("/devices/<int:device_id>")
@login_required
def get_device(device_id):
    db = get_db()
    dev = db.execute("SELECT * FROM devices WHERE id=?", (device_id,)).fetchone()
    if not dev:
        abort(404)
    last_scan = db.execute(
        """SELECT id, started_at, finished_at, status, score
           FROM scans WHERE device_id=? AND status='complete'
           ORDER BY started_at DESC LIMIT 1""",
        (device_id,),
    ).fetchone()
    aliases = db.execute(
        """SELECT hostname, first_seen, last_seen
           FROM device_hostnames WHERE device_id=?
           ORDER BY last_seen DESC""",
        (device_id,),
    ).fetchall()
    top_domains = []
    if dev["ip"]:
        top_domains = db.execute(
            """SELECT domain, COUNT(*) AS count
               FROM dns_queries WHERE client_ip=?
               GROUP BY domain
               ORDER BY count DESC
               LIMIT 10""",
            (dev["ip"],),
        ).fetchall()
    return jsonify({
        "device": dict(dev),
        "last_scan": dict(last_scan) if last_scan else None,
        "aliases": [dict(a) for a in aliases],
        "top_domains": [dict(t) for t in top_domains],
    })

@bp.get("/devices/<int:device_id>/dns")
@login_required
def device_dns(device_id):
    db = get_db()
    dev = db.execute("SELECT ip FROM devices WHERE id=?", (device_id,)).fetchone()
    if not dev or not dev["ip"]:
        return jsonify([])
    rows = db.execute(
        """SELECT id, ts, qtype, domain FROM dns_queries
           WHERE client_ip=? ORDER BY ts DESC LIMIT 100""",
        (dev["ip"],),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.patch("/devices/<int:device_id>")
@admin_required
def update_device(device_id):
    data = request.get_json(silent=True) or {}
    if "alias" not in data:
        return jsonify({"error": "alias required"}), 400
    alias = (data["alias"] or "").strip() or None
    db = get_db()
    row = db.execute("SELECT mac, alias FROM devices WHERE id=?", (device_id,)).fetchone()
    if not row:
        abort(404)
    db.execute("UPDATE devices SET alias=? WHERE id=?", (alias, device_id))
    db.commit()
    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    audit.log("device", "device_renamed", actor=actor, target=row["mac"],
              ip=request.remote_addr,
              details=f"{row['alias'] or ''} -> {alias or ''}")
    return jsonify({"id": device_id, "alias": alias})

@bp.post("/devices/<int:device_id>/block")
@admin_required
def block_device(device_id):
    db = get_db()
    row = db.execute("SELECT mac FROM devices WHERE id=?", (device_id,)).fetchone()
    if not row:
        abort(404)
    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    err = apply_block(row["mac"])
    if err:
        audit.log("device", "device_block_failed", actor=actor, target=row["mac"],
                  severity="error", ip=request.remote_addr, details=err)
        return jsonify({"error": err}), 500
    db.execute("UPDATE devices SET is_blocked=1 WHERE id=?", (device_id,))
    db.commit()
    audit.log("device", "device_blocked", actor=actor, target=row["mac"],
              severity="warning", ip=request.remote_addr)
    return jsonify({"id": device_id, "is_blocked": True})

@bp.post("/devices/<int:device_id>/unblock")
@admin_required
def unblock_device(device_id):
    db = get_db()
    row = db.execute("SELECT mac FROM devices WHERE id=?", (device_id,)).fetchone()
    if not row:
        abort(404)
    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    err = remove_block(row["mac"])
    if err:
        audit.log("device", "device_unblock_failed", actor=actor, target=row["mac"],
                  severity="error", ip=request.remote_addr, details=err)
        return jsonify({"error": err}), 500
    db.execute("UPDATE devices SET is_blocked=0 WHERE id=?", (device_id,))
    db.commit()
    audit.log("device", "device_unblocked", actor=actor, target=row["mac"],
              ip=request.remote_addr)
    return jsonify({"id": device_id, "is_blocked": False})