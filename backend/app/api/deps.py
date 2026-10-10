"""
backend/app/api/deps.py

FastAPI dependency providers:
- Database session provider (get_db)
- Profile Switcher Identity dependency (get_active_student)
"""

from __future__ import annotations

from typing import Generator, Optional
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models
from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Provides a transactional SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_active_student(
    x_student_id: Optional[str] = Header(default=None, alias="X-Student-Id"),
    db: Session = Depends(get_db),
) -> models.Student:
    """
    Resolves the currently active student profile from the X-Student-Id header.
    If the header is omitted, gracefully falls back to the first available student
    in the database to ensure smooth onboarding / first-load experiences.
    """
    if x_student_id:
        student = db.query(models.Student).filter(models.Student.id == x_student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student profile '{x_student_id}' not found.",
            )
        return student

    # Fallback to the first available student in the database
    first_student = (
        db.query(models.Student)
        .order_by(models.Student.created_at.asc())
        .first()
    )
    if not first_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student profiles found. Please create a profile first.",
        )
    return first_student


def get_active_student_id(
    student: models.Student = Depends(get_active_student),
) -> str:
    """Returns the ID of the currently active student profile."""
    return student.id
