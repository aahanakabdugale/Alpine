"""
backend/app/api/v1/profiles.py

Unified profile management endpoints for listing, creating, and deleting
student profiles with optional direct onboarding schedule generation.
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.clock import get_today, set_simulated_date
from app.db import models
from app.schemas.student import StudentSummary, DailyAvailabilityItem
from app.services.engine_bridge import EngineBridge

router = APIRouter(tags=["Profiles"])


class ProfileCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100, description="Display name for the student")
    elective_id: Optional[str] = Field(default=None, description="Optional chosen elective subject ID")
    honors_id: Optional[str] = Field(default=None, description="Optional chosen honors subject ID")
    availability: Optional[list[DailyAvailabilityItem]] = Field(default=None, description="7-day weekly availability matrix")
    start_date: Optional[date] = Field(default=None, description="Semester or study start date")


class ProfileResponse(BaseModel):
    id: str
    display_name: str
    message: str = "Profile created successfully."
    total_scheduled_units: int = 0


@router.get("", response_model=list[StudentSummary])
def list_profiles(db: Session = Depends(get_db)):
    """
    Returns all learner profiles stored in SQLite for first-run routing checks
    and profile switching.
    """
    students = db.query(models.Student).order_by(models.Student.created_at.desc()).all()
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


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(payload: ProfileCreateRequest, db: Session = Depends(get_db)):
    """
    Creates a new learner profile in SQLite. If availability and subjects are provided,
    it also enrolls the student and generates their initial CP-SAT baseline schedule.
    """
    display_name = payload.display_name.strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name cannot be empty.",
        )

    student_id = f"student-{uuid.uuid4().hex[:8]}"
    new_student = models.Student(
        id=student_id,
        display_name=display_name,
    )
    db.add(new_student)
    db.flush()

    total_units = 0

    # If availability is provided, complete onboarding & schedule generation
    if payload.availability is not None and len(payload.availability) > 0:
        # 1. Enroll in core subjects + chosen elective + optional honors
        core_subjects = db.query(models.Subject).filter(models.Subject.category == "core").all()
        chosen_ids = {s.id for s in core_subjects}

        if payload.elective_id:
            elective = db.query(models.Subject).filter(models.Subject.id == payload.elective_id).first()
            if elective:
                chosen_ids.add(elective.id)

        if payload.honors_id:
            honors = db.query(models.Subject).filter(models.Subject.id == payload.honors_id).first()
            if honors:
                chosen_ids.add(honors.id)

        for s_id in chosen_ids:
            db.add(models.StudentSubject(student_id=student_id, subject_id=s_id))

        # 2. Persist 7-day availability
        for item in payload.availability:
            db.add(
                models.Availability(
                    student_id=student_id,
                    day_of_week=item.day_of_week,
                    hours_available=item.hours_available,
                )
            )
        db.commit()

        # 3. Generate baseline schedule
        schedule_start = payload.start_date or get_today()
        set_simulated_date(schedule_start)
        created_entries = EngineBridge.generate_baseline_schedule(
            student_id=student_id,
            db=db,
            start_date=schedule_start,
        )
        total_units = len(created_entries)
    else:
        db.commit()

    db.refresh(new_student)

    return ProfileResponse(
        id=new_student.id,
        display_name=new_student.display_name,
        message="Profile created and study schedule generated successfully.",
        total_scheduled_units=total_units,
    )


@router.delete("/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db)):
    """
    Deletes a student profile and cascades all enrolled subjects, availability,
    confidence ratings, and schedule entries from SQLite.
    """
    student = db.query(models.Student).filter(models.Student.id == profile_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' does not exist.",
        )

    db.delete(student)
    db.commit()

    return {"message": "Profile deleted successfully"}

