from pathlib import Path
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseModel):
    PROJECT_NAME: str = "Alpine Adaptive Study Mentor"
    API_V1_PREFIX: str = "/api/v1"
    SQLITE_DB_PATH: Path = PROJECT_ROOT / "alpine.db"
    DATABASE_URL: str = f"sqlite:///{PROJECT_ROOT / 'alpine.db'}"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
