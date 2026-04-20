import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev")
    JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "60"))
    DATABASE_PATH = os.getenv("DATABASE_PATH", "backend/devices.db")
    MACVENDORS_API_KEY = os.getenv("MACVENDORS_API_KEY", "")