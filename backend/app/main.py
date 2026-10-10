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
from app.db.init_db import init_database_if_empty
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Ensures SQLite tables and seed data (curriculum hierarchy and demo student
    profiles) are initialized automatically upon server launch.
    """
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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")


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
