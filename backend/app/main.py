"""
backend/app/main.py

FastAPI application entry point for Alpine Adaptive Study Planner.
Features:
- Automatic startup schema migration & demo seeding in SQLite.
- CORS configuration for local frontend development.
- Clean API routing mounted under /api/v1.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import Base, engine
from app.db.init_db import init_database_if_empty
from app.api.v1.router import api_router
from app.api.v1.profiles import router as profiles_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Ensures SQLite tables and curriculum schema are created and initialized
    automatically upon server launch without demo personas.
    """
    Base.metadata.create_all(bind=engine)
    init_database_if_empty()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Offline-first Local Adaptive Study Planner Backend for Alpine Project.",
    lifespan=lifespan,
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    import traceback
    traceback.print_exc()
    from fastapi.responses import JSONResponse
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
        headers=headers,
    )


# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")
# Also mount profiles directly under /profiles for root fallback compatibility
app.include_router(profiles_router, prefix="/profiles")


@app.get("/", tags=["Health"])
def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "docs_url": "/docs",
        "api_v1_prefix": "/api/v1",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "storage": "sqlite_local",
    }
