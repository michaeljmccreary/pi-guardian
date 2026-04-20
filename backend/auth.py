import jwt
import datetime as dt
from functools import wraps
from flask import request, jsonify, g
from .config import Config
from .db import get_db

def create_token(user_id: int, is_admin: bool) -> str:
    payload = {
        "sub": str(user_id),
        "admin": bool(is_admin),
        "exp": dt.datetime.utcnow() + dt.timedelta(minutes=Config.JWT_EXPIRES_MIN),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

def _decode():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth.split(" ", 1)[1], Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = _decode()
        if not claims:
            return jsonify({"error": "unauthorized"}), 401
        g.user_id = int(claims["sub"])
        g.is_admin = claims.get("admin", False)
        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = _decode()
        if not claims:
            return jsonify({"error": "unauthorized"}), 401
        if not claims.get("admin"):
            return jsonify({"error": "forbidden"}), 403
        g.user_id = int(claims["sub"])
        g.is_admin = True
        return fn(*args, **kwargs)
    return wrapper