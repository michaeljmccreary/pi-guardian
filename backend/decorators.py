from functools import wraps
from flask import g, request
from .services import audit

# usage: @audited("delete_device", target_arg="device_id")
# writes one audit_logs row per call, and an <action>_error row
# with severity=critical if the route blows up.
def audited(action, *, category="security", severity="info", target_arg=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            target = kwargs.get(target_arg) if target_arg else None
            actor = str(getattr(g, "user_id", "")) or None
            ip = request.remote_addr
            try:
                result = fn(*args, **kwargs)
                status = 200
                if isinstance(result, tuple) and len(result) >= 2:
                    status = result[1]
                audit.log(
                    category, action,
                    severity=severity if status < 400 else "warning",
                    actor=actor,
                    target=str(target) if target is not None else None,
                    ip=ip,
                    details=f"status={status}",
                )
                return result
            except Exception as exc:
                audit.log(
                    category, f"{action}_error",
                    severity="critical",
                    actor=actor,
                    target=str(target) if target is not None else None,
                    ip=ip,
                    details=str(exc)[:200],
                )
                raise
        return wrapper
    return deco