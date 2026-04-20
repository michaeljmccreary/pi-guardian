from flask import Blueprint, jsonify
from ..db import get_db
from ..auth import login_required

bp = Blueprint("devices", __name__)

@bp.get("/devices")
@login_required
def list_devices():
    rows = get_db().execute(
        "SELECT id, mac, ip, hostname, vendor, first_seen, last_seen FROM devices ORDER BY last_seen DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])