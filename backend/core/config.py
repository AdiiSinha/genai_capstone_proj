import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GENAI_API_KEY: str = os.getenv("GENAI_API_KEY", "")
    GENAI_BASE_URL: str = os.getenv("GENAI_BASE_URL", "").rstrip("/")
    GENAI_MODEL: str = os.getenv("GENAI_MODEL", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    HR_EMAIL: str = os.getenv("HR_EMAIL", "nehacrazy@outlook.com")
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

settings = Settings()
