RULES = [
    {
        "id": "telnet-open",
        "match": lambda f: f["port"] == 23 and f["state"] == "open",
        "severity": "critical",
        "description": "Telnet (port 23) is open. Telnet sends credentials in plaintext.",
    },
    {
        "id": "ftp-open",
        "match": lambda f: f["port"] == 21 and f["state"] == "open",
        "severity": "high",
        "description": "FTP (port 21) is open. FTP sends credentials in plaintext.",
    },
    {
        "id": "http-no-https",
        "match": lambda f: f["port"] == 80 and f["state"] == "open",
        "severity": "medium",
        "description": "HTTP (port 80) is open without HTTPS redirect detection.",
    },
    {
        "id": "ssh-old",
        "match": lambda f: f["port"] == 22 and "openssh" in (f.get("version") or "").lower()
                          and any(v in f["version"] for v in ["5.", "6.", "7.0", "7.1", "7.2"]),
        "severity": "high",
        "description": "OpenSSH < 7.3 detected. Multiple known CVEs.",
    },
]

DEDUCT = {"critical": 25, "high": 10, "medium": 3, "low": 1}

def evaluate(findings):
    """Return one hit per open port. Rule matches set severity; everything else is 'info'."""
    hits = []
    score = 100
    for f in findings:
        match = None
        for rule in RULES:
            try:
                if rule["match"](f):
                    match = rule
                    break
            except (KeyError, TypeError):
                continue
        severity = match["severity"] if match else "info"
        service = f.get("service") or "unknown"
        protocol = f.get("protocol") or "tcp"
        hits.append({
            "port": f["port"],
            "protocol": f.get("protocol"),
            "service": f.get("service"),
            "version": f.get("version"),
            "severity": severity,
            "rule_id": match["id"] if match else None,
            "description": match["description"] if match
                           else f"{service} on port {f['port']}/{protocol} is open.",
        })
        if match:
            score -= DEDUCT.get(match["severity"], 0)
    return hits, max(score, 0)
