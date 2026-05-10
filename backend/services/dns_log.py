import re
import sqlite3
import subprocess
import threading
from ..config import Config

QUERY_RE = re.compile(r"query\[(?P<qtype>[A-Z0-9]+)\]\s+(?P<domain>\S+)\s+from\s+(?P<ip>\S+)")

def _insert(con, qtype, domain, ip):
    con.execute(
        "INSERT INTO dns_queries (qtype, domain, client_ip) VALUES (?, ?, ?)",
        (qtype, domain, ip),
    )
    con.commit()

def _run():
    con = sqlite3.connect(Config.DATABASE_PATH, check_same_thread=False)
    proc = subprocess.Popen(
        ["journalctl", "-u", "dnsmasq", "-f", "-n", "0", "--no-pager", "-o", "cat"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    try:
        for line in proc.stdout:
            m = QUERY_RE.search(line)
            if not m:
                continue
            try:
                _insert(con, m["qtype"], m["domain"].rstrip("."), m["ip"])
            except sqlite3.Error:
                pass
    finally:
        proc.terminate()
        con.close()

def start_dns_tailer():
    t = threading.Thread(target=_run, name="dns-tailer", daemon=True)
    t.start()
    return t