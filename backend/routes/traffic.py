import time
from flask import Blueprint, jsonify, request
from ..db import get_db
from ..auth import login_required

bp = Blueprint("traffic", __name__)

# in-memory previous sample for bandwidth-rate calculation
_bw = {"ts": 0.0, "samples": {}}

def _read_iface(iface):
    try:
        with open("/proc/net/dev") as f:
            for line in f:
                line = line.lstrip()
                if line.startswith(iface + ":"):
                    parts = line.split()
                    # parts[1]=rx_bytes, parts[9]=tx_bytes
                    return {"rx_bytes": int(parts[1]), "tx_bytes": int(parts[9])}
    except Exception:
        pass
    return None

@bp.get("/traffic")
@login_required
def list_traffic():
    limit = min(int(request.args.get("limit", 200)), 1000)
    rows = get_db().execute(
        """
        SELECT q.id, q.ts, q.client_ip, q.qtype, q.domain,
               d.hostname, d.mac
        FROM dns_queries q
        LEFT JOIN devices d ON d.ip = q.client_ip
        ORDER BY q.ts DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.get("/traffic/stats")
@login_required
def traffic_stats():
    now = time.time()
    out = {}
    for iface in ("eth0", "wlan0"):
        cur = _read_iface(iface)
        if not cur:
            continue
        prev = _bw["samples"].get(iface)
        dt = now - _bw["ts"]
        rx_bps = tx_bps = 0
        if prev and dt > 0.5:
            rx_bps = max(0, (cur["rx_bytes"] - prev["rx_bytes"]) / dt)
            tx_bps = max(0, (cur["tx_bytes"] - prev["tx_bytes"]) / dt)
        out[iface] = {**cur, "rx_bps": round(rx_bps), "tx_bps": round(tx_bps)}
    if now - _bw["ts"] > 0.5:
        _bw["samples"] = {k: {"rx_bytes": v["rx_bytes"], "tx_bytes": v["tx_bytes"]}
                          for k, v in out.items()}
        _bw["ts"] = now
    return jsonify({"interfaces": out})
