"""
backend/app/api/v1/student.py

Student onboarding, profile details, and availability configuration endpoints.
"""

from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_active_student
from app.core.clock import get_today, set_simulated_date
from app.db import models
from app.schemas.student import (
    StudentOnboardRequest,
    StudentOnboardResponse,
    StudentProfileOut,
    StudentAvailabilityUpdate,
    SubjectMinimal,
    DailyAvailabilityItem,
)
from app.services.engine_bridge import EngineBridge

router = APIRouter(prefix="/student", tags=["Student Onboarding & Profile"])


@router.post("/onboard", response_model=StudentOnboardResponse, status_code=status.HTTP_201_CREATED)
def onboard_student(
    payload: StudentOnboardRequest,
    db: Session = Depends(get_db),
):
    """
    Completes onboarding for a student profile:
    1. Enrolls in all core subjects + chosen elective + optional honors.
    2. Persists the 7-day availability matrix into SQLite.
    3. Runs the CP-SAT baseline solver to generate the initial study plan.
    """
    student_id = payload.student_id
    if not student_id:
        # Fallback to the first available student or raise
        student = db.query(models.Student).order_by(models.Student.created_at.desc()).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No student profile found to onboard. Please create a student first.",
            )
        student_id = student.id
    else:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student profile '{student_id}' does not exist.",
            )

    # 1. Fetch core subjects + selected elective & honors
    core_subjects = db.query(models.Subject).filter(models.Subject.category == "core").all()
    chosen_ids = {s.id for s in core_subjects}

    if payload.elective_id:
        elective = db.query(models.Subject).filter(models.Subject.id == payload.elective_id).first()
        if not elective:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Elective subject '{payload.elective_id}' not found.",
            )
        chosen_ids.add(elective.id)

    if payload.honors_id:
        honors = db.query(models.Subject).filter(models.Subject.id == payload.honors_id).first()
        if not honors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Honors subject '{payload.honors_id}' not found.",
            )
        chosen_ids.add(honors.id)

    # Clear existing enrollments and re-enroll cleanly
    db.query(models.StudentSubject).filter(models.StudentSubject.student_id == student_id).delete()
    for s_id in chosen_ids:
        db.add(models.StudentSubject(student_id=student_id, subject_id=s_id))

    # 2. Persist 7-day availability
    db.query(models.Availability).filter(models.Availability.student_id == student_id).delete()
    for item in payload.availability:
        db.add(
            models.Availability(
                student_id=student_id,
                day_of_week=item.day_of_week,
                hours_available=item.hours_available,
            )
        )
    db.commit()

    # 3. Generate baseline schedule via EngineBridge
    created_entries = EngineBridge.generate_baseline_schedule(
        student_id=student_id,
        db=db,
        start_date=payload.start_date,
        auto_slice=True,
        max_time_in_seconds=8.0,
    )

    # 4. Synchronize simulated clock to the onboarding start date
    set_simulated_date(payload.start_date)

    return StudentOnboardResponse(
        message="Onboarding complete and study plan generated",
        student_id=student_id,
        total_scheduled_units=len(created_entries),
    )


@router.get("/profile", response_model=StudentProfileOut)
def get_student_profile(
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Returns active student profile info, currently enrolled subjects,
    and weekly availability configuration.
    """
    enrolled_subjects = [
        SubjectMinimal.model_validate(e.subject) for e in student.enrollments if e.subject
    ]
    availability_list = [
        DailyAvailabilityItem(
            day_of_week=a.day_of_week,
            hours_available=a.hours_available,
        )
        for a in sorted(student.availability, key=lambda x: x.day_of_week)
    ]

    return StudentProfileOut(
        id=student.id,
        display_name=student.display_name,
        created_at=student.created_at,
        enrolled_subjects=enrolled_subjects,
        availability=availability_list,
    )


@router.put("/availability")
def update_student_availability(
    payload: StudentAvailabilityUpdate,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Updates student's weekly availability and triggers adaptive schedule recalculation
    via the solver, preserving completed milestones.
    """
    # Replace availability entries
    db.query(models.Availability).filter(models.Availability.student_id == student.id).delete()
    for item in payload.availability:
        db.add(
            models.Availability(
                student_id=student.id,
                day_of_week=item.day_of_week,
                hours_available=item.hours_available,
            )
        )
    db.commit()

    # Recalculate schedule starting from today
    recalculated_entries = EngineBridge.recalculate_adaptive_schedule(
        student_id=student.id,
        db=db,
        today=get_today(),
        auto_slice=True,
    )

    return {
        "message": "Availability updated and schedule re-planned successfully",
        "student_id": student.id,
        "total_active_entries": len(recalculated_entries),
    }
