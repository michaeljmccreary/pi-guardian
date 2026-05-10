import logging
import time
import uuid
from flask import g, jsonify, request
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)

def install_request_middleware(app):
    @app.before_request
    def attach_request_id():
        g.request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())[:8]
        g.request_started = time.time()

    @app.after_request
    def emit_access_log(resp):
        resp.headers["X-Request-Id"] = g.get("request_id", "-")
        duration_ms = int((time.time() - g.get("request_started", time.time())) * 1000)
        log.info(
            "%s %s %s %dms",
            request.method, request.path, resp.status_code, duration_ms,
            extra={
                "ctx_path": request.path,
                "ctx_method": request.method,
                "ctx_status": resp.status_code,
                "ctx_duration_ms": duration_ms,
            },
        )
        return resp

    @app.errorhandler(Exception)
    def unhandled(e):
        # let Flask handle its own 404/401/etc
        if isinstance(e, HTTPException):
            return e
        log.exception(
            "unhandled exception",
            extra={"ctx_path": request.path, "ctx_method": request.method},
        )
        return jsonify({
            "error": "Internal server error",
            "request_id": g.get("request_id"),
        }), 500