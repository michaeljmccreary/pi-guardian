import datetime as dt
import logging
from functools import wraps

import jwt
from flask import g, jsonify, request

from .config import Config

log = logging.getLogger(__name__)

def create_token(user_id, is_admin, username):
    # username goes in the token so g.actor can be set from claims
    # without hitting the db on every request.
    payload = {
        "sub": str(user_id),
        "admin": bool(is_admin),
        "username": username,
        "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=Config.JWT_EXPIRES_MIN),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

def _decode():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        return jwt.decode(auth.split(" ", 1)[1], Config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        log.info("token expired",
                 extra={"ctx_ip": request.remote_addr, "ctx_path": request.path})
        return None
    except jwt.PyJWTError as e:
        log.warning("token decode failed",
                    extra={"ctx_ip": request.remote_addr,
                           "ctx_path": request.path,
                           "ctx_reason": str(e)[:80]})
        return None

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = _decode()
        if not claims:
            return jsonify({"error": "unauthorised"}), 401
        try:
            g.user_id = int(claims["sub"])
        except (KeyError, TypeError, ValueError):
            from .services import audit
            audit.log("security", "user_role_missing", severity="critical",
                      ip=request.remote_addr, details="claims missing sub")
            return jsonify({"error": "unauthorised"}), 401
        g.is_admin = claims.get("admin", False)
        g.actor = claims.get("username") or f"user:{g.user_id}"
        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        claims = _decode()
        if not claims:
            return jsonify({"error": "unauthorised"}), 401
        if not claims.get("admin"):
            from .services import audit
            audit.log("security", "rbac_denied", severity="warning",
                      actor=str(claims.get("sub", "")) or None,
                      target=request.path,
                      ip=request.remote_addr,
                      details=f"method={request.method}")
            return jsonify({"error": "forbidden"}), 403
        g.user_id = int(claims["sub"])
        g.is_admin = True
        g.actor = claims.get("username") or f"user:{g.user_id}"
        return fn(*args, **kwargs)
    return wrapper