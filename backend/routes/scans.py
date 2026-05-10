from flask import Blueprint, jsonify, abort
from ..db import get_db
from ..auth import login_required, admin_required
from ..services.scanner import start_device_scan, start_network_scan

bp = Blueprint("scans", __name__)

@bp.post("/devices/<int:device_id>/scan")
@admin_required
def scan_device(device_id):
    row = get_db().execute("SELECT id, ip FROM devices WHERE id=?", (device_id,)).fetchone()
    if not row:
        abort(404)
    if not row["ip"]:
        return jsonify({"error": "device has no IP"}), 400
    scan_id = start_device_scan(row["id"], row["ip"])
    return jsonify({"scan_id": scan_id, "status": "pending"}), 202

@bp.post("/scans/all")
@admin_required
def scan_all():
    scan_ids = start_network_scan()
    return jsonify({"scan_ids": scan_ids, "count": len(scan_ids)}), 202

@bp.get("/devices/<int:device_id>/scans")
@login_required
def list_scans(device_id):
    rows = get_db().execute(
        """SELECT id, started_at, finished_at, status, score, error
           FROM scans WHERE device_id=? ORDER BY started_at DESC LIMIT 50""",
        (device_id,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.get("/scans/<int:scan_id>")
@login_required
def get_scan(scan_id):
    db = get_db()
    scan = db.execute("SELECT * FROM scans WHERE id=?", (scan_id,)).fetchone()
    if not scan:
        abort(404)
    findings = db.execute(
        """SELECT id, port, protocol, service, version, severity, rule_id, cve, description
           FROM scan_findings WHERE scan_id=? ORDER BY
           CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1
                         WHEN 'medium' THEN 2 WHEN 'low' THEN 3
                         WHEN 'info' THEN 4 ELSE 5 END, port""",
        (scan_id,),
    ).fetchall()
    return jsonify({"scan": dict(scan), "findings": [dict(r) for r in findings]})

@bp.get("/compliance")
@login_required
def compliance_summary():
    db = get_db()
    devices = db.execute("""
        SELECT d.id, d.hostname, d.ip, d.mac, d.vendor,
               s.id AS last_scan_id, s.score, s.finished_at AS last_scan_at,
               s.status AS last_scan_status,
               (SELECT COUNT(*) FROM scan_findings WHERE scan_id=s.id AND severity='critical') AS critical,
               (SELECT COUNT(*) FROM scan_findings WHERE scan_id=s.id AND severity='high') AS high
        FROM devices d
        LEFT JOIN scans s ON s.id = (
            SELECT id FROM scans WHERE device_id=d.id AND status='complete'
            ORDER BY started_at DESC LIMIT 1
        )
        ORDER BY s.score ASC, d.id
    """).fetchall()
    devices = [dict(r) for r in devices]
    scored = [d["score"] for d in devices if d["score"] is not None]
    network_score = round(sum(scored) / len(scored)) if scored else None
    findings = db.execute("""
        SELECT f.id, f.severity, f.port, f.service, f.description, f.rule_id,
               s.finished_at, d.hostname, d.ip, d.id AS device_id
        FROM scan_findings f
        JOIN scans s ON s.id = f.scan_id
        JOIN devices d ON d.id = s.device_id
        WHERE f.severity IN ('critical', 'high')
        ORDER BY s.finished_at DESC LIMIT 50
    """).fetchall()
    return jsonify({
        "network_score": network_score,
        "devices": devices,
        "recent_findings": [dict(r) for r in findings],
    })
