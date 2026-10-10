"""
SQLite Engine and Session configuration for Alpine.
Uses SQLAlchemy 2.0 with Write-Ahead Logging (WAL) and foreign keys enabled.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(engine, "connect")
def configure_sqlite_connection(dbapi_connection, connection_record):
    """
    Configure SQLite connection pragma settings:
    - journal_mode=WAL: Enables Write-Ahead Logging for concurrent reads & writes.
    - foreign_keys=ON: Enforces relational constraints and cascading deletes.
    - synchronous=NORMAL: Safe and fast synchronization mode under WAL.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
