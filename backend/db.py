import sqlite3
from flask import g
from .config import Config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac TEXT UNIQUE NOT NULL,
    ip TEXT,
    hostname TEXT,
    alias TEXT,
    vendor TEXT,
    is_blocked INTEGER NOT NULL DEFAULT 0,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dns_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_ip TEXT NOT NULL,
    qtype TEXT,
    domain TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    score INTEGER,
    error TEXT,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_scans_device ON scans(device_id, started_at DESC);

CREATE TABLE IF NOT EXISTS scan_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    port INTEGER,
    protocol TEXT,
    service TEXT,
    version TEXT,
    severity TEXT NOT NULL,
    rule_id TEXT,
    cve TEXT,
    description TEXT,
    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_dns_queries_ts ON dns_queries(ts DESC);
CREATE INDEX IF NOT EXISTS idx_dns_queries_client ON dns_queries(client_ip);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON scan_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON scan_findings(severity);

CREATE TABLE IF NOT EXISTS device_hostnames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    hostname TEXT NOT NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE(device_id, hostname)
);
CREATE INDEX IF NOT EXISTS idx_device_hostnames_device ON device_hostnames(device_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    actor TEXT,
    target TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
"""

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(Config.DATABASE_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(_=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db(app):
    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
        cols = {r[1] for r in db.execute("PRAGMA table_info(devices)").fetchall()}
        if "alias" not in cols:
            db.execute("ALTER TABLE devices ADD COLUMN alias TEXT")
        if "is_blocked" not in cols:
            db.execute("ALTER TABLE devices ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0")
        db.commit()