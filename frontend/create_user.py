import sqlite3
from werkzeug.security import generate_password_hash


# Script to create an admin user in the database
# Run this once before starting the application when a new user needs to be created
conn = sqlite3.connect("devices.db")
conn.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
''')

# 
conn.execute(
    "INSERT OR IGNORE INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)",
    # I have redacted the password for security reasons
    ("admin", generate_password_hash("REDACTED"), 1)
)
# 
conn.commit()
conn.close()
print("Admin user created.")