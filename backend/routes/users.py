from flask import Blueprint, jsonify
from ..db import get_db
from ..auth import admin_required

bp = Blueprint("users", __name__)

@bp.get("/users")
@admin_required
def list_users():
    rows = get_db().execute(
        "SELECT id, username, is_admin, created_at FROM users ORDER BY id"
    ).fetchall()
    return jsonify([dict(r) for r in rows])
