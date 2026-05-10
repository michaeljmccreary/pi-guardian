from flask import Blueprint, jsonify, request, g
from werkzeug.security import generate_password_hash
from ..db import get_db
from ..auth import admin_required
from ..services import audit

bp = Blueprint("users", __name__)

@bp.get("/users")
@admin_required
def list_users():
    rows = get_db().execute(
        """SELECT u.id, u.username, u.is_admin, u.created_at,
                  (SELECT MAX(timestamp) FROM audit_logs
                   WHERE category='auth' AND action='login_success'
                     AND actor = u.username) AS last_login
           FROM users u
           ORDER BY u.id"""
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@bp.post("/users")
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    is_admin = bool(data.get("is_admin"))

    if not username or len(password) < 8:
        return jsonify({"error": "username required and password must be 8+ chars"}), 400

    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        return jsonify({"error": "username already exists"}), 409

    db.execute(
        "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
        (username, generate_password_hash(password), int(is_admin)),
    )
    db.commit()

    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    audit.log("user", "user_created", actor=actor, target=username,
              ip=request.remote_addr, details=f"is_admin={is_admin}")
    return jsonify({"created": username, "is_admin": is_admin}), 201

@bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    if user_id == g.user_id:
        return jsonify({"error": "cannot delete your own account"}), 400
    db = get_db()
    row = db.execute("SELECT username, is_admin FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        return jsonify({"error": "user not found"}), 404

    if row["is_admin"]:
        admins = db.execute("SELECT COUNT(*) FROM users WHERE is_admin=1").fetchone()[0]
        if admins <= 1:
            return jsonify({"error": "cannot delete the last admin"}), 400

    db.execute("DELETE FROM users WHERE id=?", (user_id,))
    db.commit()

    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    audit.log("user", "user_deleted", actor=actor, target=row["username"],
              ip=request.remote_addr)
    return jsonify({"deleted": row["username"]})

@bp.patch("/users/<int:user_id>/role")
@admin_required
def update_role(user_id):
    data = request.get_json(silent=True) or {}
    if "is_admin" not in data:
        return jsonify({"error": "is_admin required"}), 400
    make_admin = bool(data["is_admin"])

    if user_id == g.user_id:
        return jsonify({"error": "cannot change your own role"}), 400

    db = get_db()
    row = db.execute("SELECT username, is_admin FROM users WHERE id=?", (user_id,)).fetchone()
    if not row:
        return jsonify({"error": "user not found"}), 404

    if row["is_admin"] and not make_admin:
        admins = db.execute("SELECT COUNT(*) FROM users WHERE is_admin=1").fetchone()[0]
        if admins <= 1:
            return jsonify({"error": "cannot demote the last admin"}), 400

    db.execute("UPDATE users SET is_admin=? WHERE id=?", (int(make_admin), user_id))
    db.commit()

    actor = db.execute("SELECT username FROM users WHERE id=?", (g.user_id,)).fetchone()["username"]
    audit.log("user", "user_promoted" if make_admin else "user_demoted",
              actor=actor, target=row["username"], ip=request.remote_addr)

    return jsonify({"username": row["username"], "is_admin": make_admin})
