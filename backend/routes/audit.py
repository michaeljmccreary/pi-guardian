from flask import Blueprint, jsonify, request
from ..db import get_db
from ..auth import admin_required

bp = Blueprint("audit", __name__)

@bp.get("/audit")
@admin_required
def list_logs():
    args = request.args
    limit = min(int(args.get("limit", 200)), 1000)
    category = args.get("category")
    severity = args.get("severity")
    since = args.get("since") 

    sql = """SELECT id, timestamp, category, severity, actor, target,
                    action, details, ip
             FROM audit_logs WHERE 1=1"""
    params = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    if severity:
        sql += " AND severity = ?"
        params.append(severity)
    if since:
        sql += " AND timestamp >= ?"
        params.append(since)
    sql += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = get_db().execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.get("/audit/categories")
@admin_required
def categories():
    rows = get_db().execute(
        "SELECT DISTINCT category FROM audit_logs ORDER BY category"
    ).fetchall()
    return jsonify([r["category"] for r in rows])