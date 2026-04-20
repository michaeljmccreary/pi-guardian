from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash
from ..db import get_db
from ..auth import create_token, login_required

bp = Blueprint("auth", __name__)

@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "missing credentials"}), 400

    row = get_db().execute(
        "SELECT id, password_hash, is_admin FROM users WHERE username = ?",
        (username,),
    ).fetchone()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_token(row["id"], bool(row["is_admin"]))
    return jsonify({"token": token, "is_admin": bool(row["is_admin"])})

@bp.get("/me")
@login_required
def me():
    row = get_db().execute(
        "SELECT id, username, is_admin FROM users WHERE id = ?", (g.user_id,)
    ).fetchone()
    return jsonify({"id": row["id"], "username": row["username"], "is_admin": bool(row["is_admin"])})