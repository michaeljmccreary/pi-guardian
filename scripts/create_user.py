import argparse, sqlite3, sys, os
from werkzeug.security import generate_password_hash

DB = os.environ.get("DATABASE_PATH", "backend/devices.db")

parser = argparse.ArgumentParser()
parser.add_argument("username")
parser.add_argument("password")
parser.add_argument("--admin", action="store_true")
args = parser.parse_args()

conn = sqlite3.connect(DB)
try:
    conn.execute(
        "INSERT INTO users(username, password_hash, is_admin) VALUES (?, ?, ?)",
        (args.username, generate_password_hash(args.password), 1 if args.admin else 0),
    )
    conn.commit()
    print(f"created {'admin' if args.admin else 'user'}: {args.username}")
except sqlite3.IntegrityError:
    print(f"user '{args.username}' already exists", file=sys.stderr)
    sys.exit(1)
finally:
    conn.close()