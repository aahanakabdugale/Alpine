"""
backend/app/api/v1/students.py

Profile switcher endpoints for listing, creating, and deleting student profiles.
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db import models
from app.schemas.student import (
    StudentSummary,
    StudentCreate,
    StudentCreateResponse,
)

router = APIRouter(prefix="/students", tags=["Students / Profile Switcher"])


@router.get("", response_model=list[StudentSummary])
def list_students(db: Session = Depends(get_db)):
    """
    Returns all student profiles stored in SQLite for the Profile Switcher dropdown,
    including enrolled subject count and unit completion statistics.
    """
    students = db.query(models.Student).order_by(models.Student.created_at.asc()).all()
    results = []

    for s in students:
        enrolled_count = len(s.enrollments)
        completed_count = (
            db.query(models.ScheduleEntry)
            .filter(models.ScheduleEntry.student_id == s.id, models.ScheduleEntry.status == "done")
            .count()
        )
        total_count = (
            db.query(models.ScheduleEntry)
            .filter(models.ScheduleEntry.student_id == s.id)
            .count()
        )

        results.append(
            StudentSummary(
                id=s.id,
                display_name=s.display_name,
                enrolled_subjects_count=enrolled_count,
                completed_units=completed_count,
                total_units=total_count,
                created_at=s.created_at,
            )
        )

    return results


@router.post("", response_model=StudentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """
    Creates a new student profile in SQLite and initializes them for onboarding.
    """
    student_id = f"student-{uuid.uuid4().hex[:8]}"
    new_student = models.Student(
        id=student_id,
        display_name=payload.display_name.strip(),
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return StudentCreateResponse(
        id=new_student.id,
        display_name=new_student.display_name,
        message="Profile created successfully. Proceed to onboarding.",
    )


@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    """
    Deletes a student profile and cascades all enrolled subjects, availability,
    confidence ratings, and schedule entries from SQLite.
    """
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile '{student_id}' does not exist.",
        )

    db.delete(student)
    db.commit()

    return {"message": "Profile deleted successfully"}
