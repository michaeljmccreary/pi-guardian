import sqlite3
import time
import requests
from ..config import Config

API_URL = "https://api.macvendors.com/"
SELECT_SQL = "SELECT id, mac FROM devices WHERE vendor IS NULL"
_cache = {}

def lookup(mac):
    if not mac:
        return None
    oui = mac.lower().replace("-", ":")[:8]
    if oui in _cache:
        return _cache[oui]
    if len(_cache) > 1000:
        _cache.clear()

    headers = {"Accept": "text/plain"}
    if Config.MAC_VENDOR_API:
        headers["Authorisation"] = f"Bearer {Config.MAC_VENDOR_API}"

    try:
        r = requests.get(API_URL + mac, headers=headers, timeout=5)
    except requests.RequestException:
        return None

    if r.status_code == 200:
        vendor = r.text.strip() or None
        _cache[oui] = vendor
        return vendor
    if r.status_code == 404:
        _cache[oui] = None
    return None

def enrich_vendors():
    con = sqlite3.connect(Config.DATABASE_PATH)
    updated = 0
    try:
        cur = con.cursor()
        rows = cur.execute(SELECT_SQL).fetchall()
        for dev_id, mac in rows:
            vendor = lookup(mac)
            if vendor:
                cur.execute("UPDATE devices SET vendor = ? WHERE id = ?", (vendor, dev_id))
                con.commit()
                updated += 1
            time.sleep(1.1) 
    finally:
        con.close()
    return updated