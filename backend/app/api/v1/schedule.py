"""
backend/app/api/v1/schedule.py

Schedule endpoints: calendar range view, today's dashboard, check-in, and student progress metrics.
"""

from __future__ import annotations

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_active_student
from app.core.clock import get_today
from app.db import models
from app.schemas.schedule import (
    ScheduleEntryOut,
    TodayScheduleResponse,
    ExamCountdownItem,
    CheckInRequest,
    CheckInResponse,
    ProgressResponse,
    ProgressSubjectStats,
    MemoryHealthStats,
)
from app.services.engine_bridge import EngineBridge
from engine.mastery.confidence_model import update_memory_state, compute_retrievability
from engine.models import MemoryState

router = APIRouter(prefix="", tags=["Schedule & Progress"])


def _hydrate_schedule_entries(
    entries: list[models.ScheduleEntry],
    db: Session,
) -> list[ScheduleEntryOut]:
    """Helper to populate topic, subtopic, subject names, and overrun status on schedule entries."""
    if not entries:
        return []

    # Pre-fetch topics, subtopics, modules, subjects for batch mapping
    topics = {t.id: t for t in db.query(models.Topic).all()}
    subtopics = {s.id: s for s in db.query(models.Subtopic).all()}
    modules = {m.id: m for m in db.query(models.Module).all()}
    subjects = {s.id: s for s in db.query(models.Subject).all()}
    end_sem_exams = {
        ed.subject_id: ed.exam_date
        for ed in db.query(models.ExamDate).filter(models.ExamDate.exam_type == "end_sem").all()
    }

    results: list[ScheduleEntryOut] = []
    today = get_today()
    for e in entries:
        sub = subtopics.get(e.subtopic_id) if e.subtopic_id else None
        top = topics.get(e.topic_id) if e.topic_id else None
        mod = modules.get(top.module_id) if top and top.module_id else None
        subj = subjects.get(mod.subject_id) if mod and mod.subject_id else None

        title = sub.name if sub else (top.name if top else "Scheduled Study Task")
        est_hours = sub.est_hours if sub else (top.est_hours if top else 1.0)
        est_diff = top.est_difficulty if top else 3

        subj_id = subj.id if subj else None
        end_sem_date = end_sem_exams.get(subj_id) if subj_id else None
        is_overrun = bool(end_sem_date and e.scheduled_date > end_sem_date)
        is_overdue = bool(e.status == "planned" and e.scheduled_date < today)

        results.append(
            ScheduleEntryOut(
                id=e.id,
                student_id=e.student_id,
                topic_id=e.topic_id,
                subtopic_id=e.subtopic_id,
                scheduled_date=e.scheduled_date,
                status=e.status,
                is_review=e.is_review,
                title=title,
                topic_name=top.name if top else None,
                subtopic_name=sub.name if sub else None,
                subject_id=subj_id,
                subject_name=subj.name if subj else None,
                module_id=mod.id if mod else None,
                module_name=mod.name if mod else None,
                assessment_phase=mod.assessment_phase if mod else None,
                est_hours=est_hours,
                est_difficulty=est_diff,
                is_overrun=is_overrun,
                is_overdue=is_overdue,
            )
        )
    return results


@router.get("/schedule", response_model=list[ScheduleEntryOut])
def get_schedule(
    start_date: date | None = Query(default=None, description="Filter from this scheduled date"),
    end_date: date | None = Query(default=None, description="Filter to this scheduled date"),
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Returns planned, completed, and review entries for the active student profile,
    optionally filtered by a date window.
    """
    query = (
        db.query(models.ScheduleEntry)
        .filter(models.ScheduleEntry.student_id == student.id)
    )

    if start_date:
        query = query.filter(models.ScheduleEntry.scheduled_date >= start_date)
    if end_date:
        query = query.filter(models.ScheduleEntry.scheduled_date <= end_date)

    entries = query.order_by(models.ScheduleEntry.scheduled_date.asc()).all()
    return _hydrate_schedule_entries(entries, db)


EXAM_BUFFER_DAYS = 3  # Days before exam to enforce review-only for that subject


@router.get("/schedule/today", response_model=TodayScheduleResponse)
def get_today_schedule(
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Returns today's scheduled tasks, target study hours, available capacity,
    and upcoming exam countdowns for the active student profile.

    Exam-day rules:
    - On the day of an exam: only show tasks for that exam's subject
      (uncompleted topics first, then reviews).
    - Within EXAM_BUFFER_DAYS before an exam: only show review/uncompleted
      tasks for that subject on the buffer day (the solver already handles
      new learning exclusion via CP-SAT constraints; this endpoint reflects it).
    """
    today = get_today()

    enrolled_subject_ids = [e.subject_id for e in student.enrollments]

    # ── Determine exam-day and buffer subjects ────────────────────────────────
    upcoming_exams = (
        db.query(models.ExamDate)
        .filter(
            models.ExamDate.subject_id.in_(enrolled_subject_ids),
            models.ExamDate.exam_date >= today,
            models.ExamDate.exam_date <= today + timedelta(days=EXAM_BUFFER_DAYS),
        )
        .all()
    )

    # Subjects with exam exactly today → exclusive filter
    exam_subjects_today = {e.subject_id for e in upcoming_exams if e.exam_date == today}
    # Subjects in buffer window (exam in 1-3 days) → review-only preference
    buffer_subjects = {e.subject_id for e in upcoming_exams if e.exam_date > today}

    # ── Fetch today's scheduled entries ──────────────────────────────────────
    today_entries_query = (
        db.query(models.ScheduleEntry)
        .filter(
            models.ScheduleEntry.student_id == student.id,
            models.ScheduleEntry.scheduled_date == today,
        )
    )

    if exam_subjects_today:
        # On exam day: only tasks belonging to exam subject(s)
        # Resolve topic IDs for those subjects
        exam_topic_ids = (
            db.query(models.Topic.id)
            .join(models.Module, models.Topic.module_id == models.Module.id)
            .filter(models.Module.subject_id.in_(exam_subjects_today))
            .all()
        )
        exam_topic_id_set = {row[0] for row in exam_topic_ids}
        today_entries = today_entries_query.filter(
            models.ScheduleEntry.topic_id.in_(exam_topic_id_set)
        ).all()

        # If the solver didn't place any of this subject's tasks today,
        # synthesize review entries from done topics of that subject
        if not today_entries:
            done_entries_for_subject = (
                db.query(models.ScheduleEntry)
                .filter(
                    models.ScheduleEntry.student_id == student.id,
                    models.ScheduleEntry.status == "done",
                    models.ScheduleEntry.topic_id.in_(exam_topic_id_set),
                    models.ScheduleEntry.is_review == False,  # noqa: E712 - original learning entries only
                )
                .order_by(models.ScheduleEntry.scheduled_date.desc())
                .limit(5)
                .all()
            )
            # Return done entries styled as virtual review reminder
            # (mark is_review=True for hydration display)
            for entry in done_entries_for_subject:
                entry.is_review = True
            today_entries = done_entries_for_subject
    else:
        today_entries = today_entries_query.all()

    tasks = _hydrate_schedule_entries(today_entries, db)
    scheduled_hours = sum(t.est_hours or 0.0 for t in tasks)

    # ── If buffer subjects exist, annotate tasks to flag review priority ─────
    # The CP-SAT solver already avoids placing new learning in buffer window,
    # so today_entries will already be reviews for buffer subjects if properly scheduled.
    # We surface this as metadata via is_exam_buffer flag (future enhancement).

    # ── Student available hours for today (day-of-week) ──────────────────────
    dow = today.weekday()
    avail_row = (
        db.query(models.Availability)
        .filter(models.Availability.student_id == student.id, models.Availability.day_of_week == dow)
        .first()
    )
    available_hours = avail_row.hours_available if avail_row else 0.0

    # ── Exam countdowns for enrolled subjects ────────────────────────────────
    exam_rows = (
        db.query(models.ExamDate)
        .filter(
            models.ExamDate.subject_id.in_(enrolled_subject_ids),
            models.ExamDate.exam_date >= today,
        )
        .order_by(models.ExamDate.exam_date.asc())
        .all()
    )

    subjects_map = {s.id: s.name for s in db.query(models.Subject).all()}
    countdowns = [
        ExamCountdownItem(
            subject_id=e.subject_id,
            subject_name=subjects_map.get(e.subject_id, "Unknown Subject"),
            exam_type=e.exam_type,
            exam_date=e.exam_date,
            days_remaining=(e.exam_date - today).days,
        )
        for e in exam_rows
    ]

    # ── Academic Triage: count planned entries past end-sem ──────────────────
    all_planned = (
        db.query(models.ScheduleEntry)
        .filter(
            models.ScheduleEntry.student_id == student.id,
            models.ScheduleEntry.status == "planned",
        )
        .all()
    )
    hydrated_planned = _hydrate_schedule_entries(all_planned, db)
    overrun_count = sum(1 for p in hydrated_planned if p.is_overrun)
    triage_warning = overrun_count > 0
    triage_message = (
        f"Academic Triage Alert: {overrun_count} syllabus units cannot be completed before "
        "your End-Semester exams at your current pace. Please increase your weekly study availability."
        if triage_warning
        else None
    )

    # ── FSRS Memory Health ───────────────────────────────────────────────────
    confidence_records = (
        db.query(models.TopicConfidence)
        .filter(models.TopicConfidence.student_id == student.id)
        .all()
    )
    fresh_c = 0
    fading_c = 0
    review_c = 0
    for c in confidence_records:
        if c.memory_state:
            try:
                mem = MemoryState(**c.memory_state)
                r = compute_retrievability(mem, today)
                if r >= 0.85:
                    fresh_c += 1
                elif r >= 0.70:
                    fading_c += 1
                else:
                    review_c += 1
            except Exception:
                fresh_c += 1
        else:
            days_elapsed = max((today - c.last_updated).days, 0)
            if days_elapsed <= 3:
                fresh_c += 1
            elif days_elapsed <= 10:
                fading_c += 1
            else:
                review_c += 1

    memory_health = MemoryHealthStats(
        fresh_count=fresh_c,
        fading_count=fading_c,
        review_count=review_c,
    )

    return TodayScheduleResponse(
        date=today,
        scheduled_hours=scheduled_hours,
        available_hours=available_hours,
        tasks=tasks,
        exam_countdowns=countdowns,
        triage_warning=triage_warning,
        overrun_units_count=overrun_count,
        triage_message=triage_message,
        memory_health=memory_health,
    )


@router.post("/schedule/check-in", response_model=CheckInResponse)
def schedule_check_in(
    payload: CheckInRequest,
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Records topic completion and FSRS confidence rating:
    1. Updates or creates TopicConfidence with stability and retrievability.
    2. Marks corresponding ScheduleEntry as 'done'.
    3. Triggers adaptive solver re-calculation, spawning review sessions if needed.
    """
    today = get_today()
    top_id, sub_id, _ = EngineBridge._parse_unit_keys(payload.unit_id)

    # Resolve parent topic_id if only subtopic_id is present
    if sub_id and not top_id:
        sub_row = db.query(models.Subtopic).filter(models.Subtopic.id == sub_id).first()
        if sub_row:
            top_id = sub_row.topic_id

    # 1. Query existing confidence record
    conf_query = db.query(models.TopicConfidence).filter(
        models.TopicConfidence.student_id == student.id,
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

    # Calculate updated FSRS memory state
    new_mem = update_memory_state(
        current_state=current_mem,
        rating=payload.confidence_rating,
        review_date=today,
    )
    retrievability = compute_retrievability(new_mem, today)

    mem_dict = {
        "stability": new_mem.stability,
        "difficulty": new_mem.difficulty,
        "reps": new_mem.reps,
        "lapses": new_mem.lapses,
        "last_review": str(new_mem.last_review),
    }

    if conf_record:
        conf_record.confidence_rating = payload.confidence_rating
        conf_record.memory_state = mem_dict
        conf_record.last_updated = today
    else:
        conf_record = models.TopicConfidence(
            student_id=student.id,
            topic_id=top_id,
            subtopic_id=sub_id,
            confidence_rating=payload.confidence_rating,
            memory_state=mem_dict,
            last_updated=today,
        )
        db.add(conf_record)

    # 2. Mark matching schedule entry as 'done'
    entry_query = db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.student_id == student.id,
        models.ScheduleEntry.topic_id == top_id,
    )
    if sub_id:
        entry_query = entry_query.filter(models.ScheduleEntry.subtopic_id == sub_id)
    else:
        entry_query = entry_query.filter(models.ScheduleEntry.subtopic_id.is_(None))

    # Prioritize today's planned entry, then upcoming planned entry, then overdue planned entry
    matching_entry = (
        entry_query.filter(
            models.ScheduleEntry.status == "planned",
            models.ScheduleEntry.scheduled_date == today,
        ).first()
    )
    if not matching_entry:
        matching_entry = (
            entry_query.filter(
                models.ScheduleEntry.status == "planned",
                models.ScheduleEntry.scheduled_date >= today,
            )
            .order_by(models.ScheduleEntry.scheduled_date.asc())
            .first()
        )
    if not matching_entry:
        matching_entry = (
            entry_query.filter(models.ScheduleEntry.status == "planned")
            .order_by(models.ScheduleEntry.scheduled_date.desc())
            .first()
        )
    if matching_entry:
        matching_entry.status = "done"

    db.commit()

    # 3. Recalculate adaptive schedule
    recalculated_entries = EngineBridge.recalculate_adaptive_schedule(
        student_id=student.id,
        db=db,
        today=today,
        auto_slice=True,
        spawn_reviews=True,
    )

    return CheckInResponse(
        message="Check-in logged and schedule dynamically adapted",
        unit_id=payload.unit_id,
        stability_days=new_mem.stability,
        retrievability=round(retrievability, 3),
        recalculated_units_count=len(recalculated_entries),
    )


@router.get("/student/progress", response_model=ProgressResponse)
def get_student_progress(
    student: models.Student = Depends(get_active_student),
    db: Session = Depends(get_db),
):
    """
    Returns overall syllabus progress and breakdown per enrolled subject.
    """
    enrolled_subject_ids = [e.subject_id for e in student.enrollments]
    all_entries = (
        db.query(models.ScheduleEntry)
        .filter(models.ScheduleEntry.student_id == student.id)
        .all()
    )

    topics = {t.id: t for t in db.query(models.Topic).all()}
    modules = {m.id: m for m in db.query(models.Module).all()}
    subjects = {
        s.id: s.name for s in db.query(models.Subject).filter(models.Subject.id.in_(enrolled_subject_ids)).all()
    }

    # Calculate distinct curriculum units per subject
    modules_by_subject: dict[str, list[models.Module]] = {s_id: [] for s_id in enrolled_subject_ids}
    for m in db.query(models.Module).filter(models.Module.subject_id.in_(enrolled_subject_ids)).all():
        modules_by_subject[m.subject_id].append(m)

    subject_total_units: dict[str, set[str]] = {s_id: set() for s_id in enrolled_subject_ids}
    for s_id, mods in modules_by_subject.items():
        for mod in mods:
            for top in mod.topics:
                if top.subtopics:
                    for sub in top.subtopics:
                        subject_total_units[s_id].add(f"subtopic:{sub.id}")
                else:
                    subject_total_units[s_id].add(f"topic:{top.id}")

    subject_completed_units: dict[str, set[str]] = {s_id: set() for s_id in enrolled_subject_ids}
    for e in all_entries:
        if e.status != "done":
            continue
        top = topics.get(e.topic_id)
        if not top:
            continue
        mod = modules.get(top.module_id)
        if not mod:
            continue
        s_id = mod.subject_id
        if s_id in subject_completed_units:
            unit_key = f"subtopic:{e.subtopic_id}" if e.subtopic_id else f"topic:{e.topic_id}"
            subject_completed_units[s_id].add(unit_key)

    subject_stats = []
    overall_total = 0
    overall_completed = 0
    for s_id in enrolled_subject_ids:
        tot = len(subject_total_units.get(s_id, set()))
        cmp = len(subject_completed_units.get(s_id, set()))
        overall_total += tot
        overall_completed += cmp
        pct = round((cmp / tot * 100.0) if tot > 0 else 0.0, 1)
        subject_stats.append(
            ProgressSubjectStats(
                subject_id=s_id,
                subject_name=subjects.get(s_id, "Unknown Subject"),
                completed_units=cmp,
                total_units=tot,
                completion_percentage=pct,
            )
        )

    overall_pct = round((overall_completed / overall_total * 100.0) if overall_total > 0 else 0.0, 1)

    return ProgressResponse(
        overall_completed_units=overall_completed,
        overall_total_units=overall_total,
        overall_completion_percentage=overall_pct,
        subjects=subject_stats,
    )
