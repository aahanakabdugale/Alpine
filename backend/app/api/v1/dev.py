"""
backend/app/api/v1/dev.py

DevTools & Demonstration simulation API router.
Enables:
- In-memory time-traveling across the academic semester.
- Skipping days with realistic FSRS auto-completion (4-Good, 5-Easy, 3-Hard).
- Simulating student slacking (missed study sessions) to trigger adaptive recovery.
- Instant semester reset to July/August baseline.
- Real-time status reporting for demo controls.
"""

from __future__ import annotations

import random
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_active_student
from app.core.clock import get_today, set_simulated_date, reset_clock, is_simulated
from app.db import models
from app.services.engine_bridge import EngineBridge
from engine.mastery.confidence_model import update_memory_state, compute_retrievability
from engine.models import MemoryState

router = APIRouter(prefix="/dev", tags=["DevTools & Demonstration"])


class TimeTravelRequest(BaseModel):
    target_date: date = Field(..., description="Target simulated date (YYYY-MM-DD)")
    auto_complete: bool = Field(default=True, description="Mark skipped days' scheduled units as achieved")


class SkipDaysRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=180, description="Number of days to skip forward")
    auto_complete: bool = Field(default=True, description="Mark skipped days' scheduled units as achieved")


class SimulateSlackRequest(BaseModel):
    days: int = Field(default=14, ge=1, le=90, description="Days student neglected study (without check-ins)")


class ResetSemesterRequest(BaseModel):
    start_date: date = Field(default=date(2026, 7, 15), description="Semester start date to reset to")


def _assign_realistic_completion(
    entry: models.ScheduleEntry,
    student_id: str,
    db: Session,
    completion_date: date,
):
    """
    Marks a ScheduleEntry as done and generates a realistic FSRS confidence state
    (mostly 4 - Good, occasional 5 - Easy, occasional 3 - Hard).
    """
    entry.status = "done"

    # Weighted realistic distribution: 65% rating 4, 20% rating 5, 15% rating 3
    rating_roll = random.random()
    if rating_roll < 0.65:
        rating = 4
    elif rating_roll < 0.85:
        rating = 5
    else:
        rating = 3

    # Resolve parent topic_id
    top_id = entry.topic_id
    sub_id = entry.subtopic_id
    if sub_id and not top_id:
        sub_row = db.query(models.Subtopic).filter(models.Subtopic.id == sub_id).first()
        if sub_row:
            top_id = sub_row.topic_id

    # Check existing confidence record
    conf_query = db.query(models.TopicConfidence).filter(
        models.TopicConfidence.student_id == student_id,
        models.TopicConfidence.topic_id == top_id,
    )
    if sub_id:
        conf_query = conf_query.filter(models.TopicConfidence.subtopic_id == sub_id)
    else:
        conf_query = conf_query.filter(models.TopicConfidence.subtopic_id.is_(None))

    conf_record = conf_query.first()
    current_mem: MemoryState | None = None
    if conf_record and conf_record.memory_state:
        current_mem = MemoryState(**conf_record.memory_state)

    new_mem = update_memory_state(
        current_state=current_mem,
        rating=rating,
        review_date=completion_date,
    )

    mem_dict = {
        "stability": new_mem.stability,
        "difficulty": new_mem.difficulty,
        "reps": new_mem.reps,
        "lapses": new_mem.lapses,
        "last_review": str(new_mem.last_review),
    }

    if conf_record:
        conf_record.confidence_rating = rating
        conf_record.memory_state = mem_dict
        conf_record.last_updated = completion_date
    else:
        conf_record = models.TopicConfidence(
            student_id=student_id,
            topic_id=top_id,
            subtopic_id=sub_id,
            confidence_rating=rating,
            memory_state=mem_dict,
            last_updated=completion_date,
        )
        db.add(conf_record)


@router.get("/status")
def get_dev_status(
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """Returns current simulated clock status, student metrics, and overrun triage state."""
    current_today = get_today()
    real_today = date.today()

    all_entries = (
        db.query(models.ScheduleEntry)
        .filter(models.ScheduleEntry.student_id == student.id)
        .all()
    )

    total_count = len(all_entries)
    done_count = sum(1 for e in all_entries if e.status == "done")
    planned_count = sum(1 for e in all_entries if e.status == "planned")

    end_sem_exams = {
        ed.subject_id: ed.exam_date
        for ed in db.query(models.ExamDate).filter(models.ExamDate.exam_type == "end_sem").all()
    }
    topics_map = {t.id: t.module_id for t in db.query(models.Topic).all()}
    modules_map = {m.id: m.subject_id for m in db.query(models.Module).all()}

    overrun_count = 0
    for e in all_entries:
        if e.status == "planned":
            m_id = topics_map.get(e.topic_id)
            s_id = modules_map.get(m_id) if m_id else None
            end_date = end_sem_exams.get(s_id) if s_id else None
            if end_date and e.scheduled_date > end_date:
                overrun_count += 1

    return {
        "simulated_date": str(current_today),
        "real_date": str(real_today),
        "is_simulated": is_simulated(),
        "student_id": student.id,
        "student_name": student.display_name,
        "total_units": total_count,
        "completed_units": done_count,
        "planned_units": planned_count,
        "overrun_units_count": overrun_count,
        "triage_warning": overrun_count > 0,
    }


@router.post("/time-travel")
def time_travel(
    payload: TimeTravelRequest,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Sets simulated clock to target_date.
    If auto_complete is True, marks all planned units up to target_date as completed with
    realistic FSRS confidence, then recalculates remaining horizon from target_date.
    """
    old_date = get_today()
    target_date = payload.target_date
    set_simulated_date(target_date)

    auto_completed_count = 0
    if payload.auto_complete and target_date >= old_date:
        # Find all planned entries scheduled on or before target_date
        skipped_entries = (
            db.query(models.ScheduleEntry)
            .filter(
                models.ScheduleEntry.student_id == student.id,
                models.ScheduleEntry.status == "planned",
                models.ScheduleEntry.scheduled_date <= target_date,
            )
            .order_by(models.ScheduleEntry.scheduled_date.asc())
            .all()
        )

        for entry in skipped_entries:
            _assign_realistic_completion(entry, student.id, db, entry.scheduled_date)
            auto_completed_count += 1

        db.commit()

    # Recalculate adaptive schedule from target_date
    try:
        recalculated = EngineBridge.recalculate_adaptive_schedule(
            student_id=student.id,
            db=db,
            today=target_date,
            auto_slice=True,
            spawn_reviews=True,
        )
    except Exception as e:
        recalculated = []

    return {
        "message": f"Time traveled from {old_date} to {target_date}",
        "simulated_date": str(target_date),
        "auto_completed_units": auto_completed_count,
        "recalculated_units": len(recalculated),
    }


@router.post("/skip-days")
def skip_days(
    payload: SkipDaysRequest,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """Skips forward N days from current simulated date."""
    target_date = get_today() + timedelta(days=payload.days)
    return time_travel(
        TimeTravelRequest(target_date=target_date, auto_complete=payload.auto_complete),
        student=student,
        db=db,
    )


@router.post("/simulate-slacking")
def simulate_slacking(
    payload: SimulateSlackRequest,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Simulates a student neglecting study for N days:
    Advances date by N days WITHOUT completing any tasks, then recalculates
    the adaptive schedule to demonstrate catch-up and triage.
    """
    old_date = get_today()
    new_date = old_date + timedelta(days=payload.days)
    set_simulated_date(new_date)

    # Re-calculate adaptive schedule starting from new_date
    recalculated = EngineBridge.recalculate_adaptive_schedule(
        student_id=student.id,
        db=db,
        today=new_date,
        auto_slice=True,
        spawn_reviews=True,
    )

    return {
        "message": f"Simulated {payload.days} days of missed study. Clock moved to {new_date}.",
        "simulated_date": str(new_date),
        "days_slacked": payload.days,
        "recalculated_units": len(recalculated),
    }


@router.post("/reset-semester")
def reset_semester(
    payload: ResetSemesterRequest,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Resets the active student's study plan back to a fresh baseline starting on start_date
    (e.g., July 15, 2026), clearing historical check-in and confidence records.
    """
    start_date = payload.start_date
    set_simulated_date(start_date)

    # 1. Clear student check-ins and confidence ratings
    db.query(models.TopicConfidence).filter(
        models.TopicConfidence.student_id == student.id
    ).delete()

    # 2. Clear all schedule entries
    db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.student_id == student.id
    ).delete()
    db.commit()

    # 3. Regenerate baseline schedule starting on start_date
    created_entries = EngineBridge.generate_baseline_schedule(
        student_id=student.id,
        db=db,
        start_date=start_date,
        auto_slice=True,
    )

    return {
        "message": f"Semester reset successfully to {start_date}.",
        "simulated_date": str(start_date),
        "baseline_units_scheduled": len(created_entries),
    }


@router.post("/restore-real-clock")
def restore_real_clock(
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """Restores the system clock back to real host date."""
    real_today = reset_clock()
    recalculated = EngineBridge.recalculate_adaptive_schedule(
        student_id=student.id,
        db=db,
        today=real_today,
        auto_slice=True,
        spawn_reviews=True,
    )
    return {
        "message": f"Reverted to real system clock ({real_today}).",
        "current_date": str(real_today),
        "recalculated_units": len(recalculated),
    }
