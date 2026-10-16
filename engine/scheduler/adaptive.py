"""
Adaptive re-scheduling.

Called whenever something changes that should affect the plan: a student
submits a new confidence rating, marks a unit done, or their availability
changes. Rather than a separate algorithm, this wraps the CP-SAT baseline
scheduler (scheduler/baseline.py) with four adaptive adjustments:

1. Units already marked "done" are preserved unchanged in the output.
2. Completed units whose memory retention has decayed below threshold
   automatically trigger lightweight review units to be scheduled before exams.
3. Mastery scores are computed WITH decay using "today" as the reference point.
4. start_date is reset to "today" to re-plan the remaining horizon.
"""

from __future__ import annotations

from datetime import date

from engine.mastery.confidence_model import build_mastery_map_with_decay
from engine.mastery.review_generator import generate_pending_reviews
from engine.models import (
    AssessmentPhase,
    Availability,
    ConfidenceRating,
    ExamDate,
    ExamType,
    PlanRequest,
    SchedulableUnit,
    ScheduleEntry,
)
from engine.scheduler.baseline import build_schedule

DEFAULT_HALF_LIFE_DAYS = 14


def rebuild_schedule(
    request: PlanRequest,
    existing_entries: list[ScheduleEntry],
    today: date,
    half_life_days: int = DEFAULT_HALF_LIFE_DAYS,
    horizon_days: int = 90,
    spawn_reviews: bool = True,
    auto_slice: bool = True,
    max_time_in_seconds: float = 5.0,
) -> list[ScheduleEntry]:
    """
    request: the FULL plan request (all units across all enrolled subjects,
        current confidence ratings, current availability, exam dates).
    existing_entries: the plan as it stood before this re-run.
    today: the date to re-plan from.
    spawn_reviews: if True, dynamically injects review units for decayed topics.
    auto_slice: if True, slices units exceeding daily capacity into sub-sessions.

    Returns the full updated schedule: untouched "done" entries plus a
    freshly solved plan for everything still remaining.
    """
    done_ids = {e.unit_id for e in existing_entries if e.status == "done"}
    done_entries = [e for e in existing_entries if e.unit_id in done_ids]

    remaining_units = [u for u in request.units if u.unit_id not in done_ids]

    # Dynamically generate review units for completed material whose retention decayed
    review_units: list[SchedulableUnit] = []
    if spawn_reviews:
        completed_units = [u for u in request.units if u.unit_id in done_ids and not u.is_review]
        existing_planned_review_parents = {
            e.unit_id.split(":")[1]
            for e in existing_entries
            if getattr(e, "is_review", False) and e.status == "planned" and ":" in e.unit_id
        }
        review_units = generate_pending_reviews(
            completed_units=completed_units,
            confidence_ratings=request.confidence,
            today=today,
            existing_review_parent_ids=existing_planned_review_parents,
        )

    all_units_to_solve = remaining_units + review_units

    if not all_units_to_solve:
        # Everything is done and no reviews are needed
        return done_entries

    mastery_map = build_mastery_map_with_decay(request.confidence, today, half_life_days)

    updated_request = request.model_copy(
        update={"units": all_units_to_solve, "start_date": today}
    )

    new_entries = build_schedule(
        updated_request,
        horizon_days=horizon_days,
        mastery_override=mastery_map,
        auto_slice=auto_slice,
        max_time_in_seconds=max_time_in_seconds,
    )

    return done_entries + new_entries


def student_profile_to_plan_request(profile: dict, start_date: date) -> PlanRequest:
    # 1. Map units
    units = [
        SchedulableUnit(
            unit_id=u["unit_id"],
            topic_id=u.get("topic_uuid") or u["topic_name"],
            subject_id=u.get("subject_uuid") or u["subject_name"],
            module_id=u.get("module_uuid") or u["module_name"],
            name=u["subtopic_name"] or u["topic_name"],
            order_index=u["order_index"],
            est_difficulty=u["est_difficulty"],
            est_hours=u["est_hours"],
            depends_on=u.get("depends_on", []),
            assessment_phase=AssessmentPhase.UT1 if u["phase"] == "UT1" else AssessmentPhase.UT2,
        )
        for u in profile["units"]
    ]

    # 2. Map confidence ratings
    confidence = [
        ConfidenceRating(
            unit_id=c["unit_id"],
            rating=c["rating"],
            last_updated=c.get("last_updated", start_date),
        )
        for c in profile.get("confidence_ratings", [])
    ]

    # 3. Map weekly availability
    availability = [
        Availability(
            day_of_week=a["day_of_week"],  # 0 = Monday, 6 = Sunday
            hours_available=float(a["hours_available"]),
        )
        for a in profile.get("availability", [])
    ]

    # 4. Map exam dates
    exam_dates = [
        ExamDate(
            subject_id=e["subject_id"],
            exam_type=ExamType(e["exam_type"]),
            exam_date=e["exam_date"],
        )
        for e in profile.get("exam_dates", [])
    ]

    return PlanRequest(
        student_id=profile["student_id"],
        units=units,
        confidence=confidence,
        availability=availability,
        exam_dates=exam_dates,
        start_date=start_date,
    )
