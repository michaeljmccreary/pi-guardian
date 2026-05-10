import json
import logging
import logging.handlers
import sys
from pathlib import Path
from flask import g, has_request_context

class JsonFormatter(logging.Formatter):
    def format(self, record):
        out = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            out["request_id"] = record.request_id
        if hasattr(record, "actor"):
            out["actor"] = record.actor
        if record.exc_info:
            out["exc"] = self.formatException(record.exc_info)
        for k, v in record.__dict__.items():
            if k.startswith("ctx_"):
                out[k[4:]] = v
        return json.dumps(out)

class RequestContextFilter(logging.Filter):
    def filter(self, record):
        if has_request_context():
            record.request_id = getattr(g, "request_id", "-")
            record.actor = getattr(g, "actor", "-")
        else:
            record.request_id = "-"
            record.actor = "-"
        return True

def configure_logging(log_dir="/var/log/pi-guardian"):
    Path(log_dir).mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    if root.handlers:
        return

    fh = logging.handlers.RotatingFileHandler(
        f"{log_dir}/app.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    fh.setFormatter(JsonFormatter())
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(JsonFormatter())

    ctx = RequestContextFilter()
    fh.addFilter(ctx)
    sh.addFilter(ctx)
    root.addHandler(fh)
    root.addHandler(sh)

    # quiet the noisy third party loggers
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)