from datetime import date, timedelta

from engine.models import (
    AssessmentPhase,
    Availability,
    ConfidenceRating,
    ExamDate,
    ExamType,
    MemoryState,
    PlanRequest,
    SchedulableUnit,
    ScheduleEntry,
)
from engine.scheduler.adaptive import rebuild_schedule


def make_unit(unit_id, subject_id="math", phase=AssessmentPhase.UT1, hours=1.0, depends_on=None, order=0):
    return SchedulableUnit(
        unit_id=unit_id,
        topic_id=unit_id,
        subject_id=subject_id,
        module_id=f"{subject_id}-mod",
        name=unit_id,
        order_index=order,
        est_difficulty=2,
        est_hours=hours,
        depends_on=depends_on or [],
        assessment_phase=phase,
    )


def _base_request(units, confidence, start_date):
    availability = [Availability(day_of_week=i, hours_available=3.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 10, 15)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 12, 1)),
    ]
    return PlanRequest(
        student_id="s1",
        units=units,
        confidence=confidence,
        availability=availability,
        exam_dates=exam_dates,
        start_date=start_date,
    )


def test_done_units_are_preserved_and_excluded_from_resolve():
    units = [make_unit("t1", order=0), make_unit("t2", order=1)]
    req = _base_request(units, [], start_date=date(2026, 9, 1))
    existing = [
        ScheduleEntry(unit_id="t1", scheduled_date=date(2026, 9, 2), status="done"),
        ScheduleEntry(unit_id="t2", scheduled_date=date(2026, 9, 3), status="planned"),
    ]
    result = rebuild_schedule(req, existing, today=date(2026, 9, 10))
    by_id = {e.unit_id: e for e in result}
    assert by_id["t1"].status == "done"
    assert by_id["t1"].scheduled_date == date(2026, 9, 2)  # untouched
    assert by_id["t2"].scheduled_date >= date(2026, 9, 10)  # re-planned from "today" onward


def test_stale_confident_rating_gets_pulled_forward_by_decay():
    # "confident_old": rated 5/5 a month before "today" -> heavily decayed by re-run time
    # "confident_recent": rated 5/5 just before "today" -> barely decayed
    units = [make_unit("stale", order=0), make_unit("fresh", order=1)]
    confidence = [
        ConfidenceRating(unit_id="stale", rating=5, last_updated=date(2026, 8, 1)),
        ConfidenceRating(unit_id="fresh", rating=5, last_updated=date(2026, 8, 29)),
    ]
    req = _base_request(units, confidence, start_date=date(2026, 8, 1))
    existing = [
        ScheduleEntry(unit_id="stale", scheduled_date=date(2026, 8, 5), status="planned"),
        ScheduleEntry(unit_id="fresh", scheduled_date=date(2026, 8, 5), status="planned"),
    ]
    result = rebuild_schedule(req, existing, today=date(2026, 9, 1), half_life_days=14, spawn_reviews=False)
    by_id = {e.unit_id: e.scheduled_date for e in result}
    assert by_id["stale"] <= by_id["fresh"], (
        "the stale-but-once-confident unit has decayed further and should "
        "be prioritized earlier than the recently-rated one"
    )


def test_all_units_done_returns_only_done_entries_when_retention_high():
    units = [make_unit("t1")]
    # Rated 5/5 just 1 day ago -> Retrievability is near 100%, no review needed yet
    mem = MemoryState(stability=8.0, difficulty=2.5, reps=1, lapses=0, last_review=date(2026, 9, 9))
    confidence = [ConfidenceRating(unit_id="t1", rating=5, last_updated=date(2026, 9, 9), memory_state=mem)]
    req = _base_request(units, confidence, start_date=date(2026, 9, 1))
    existing = [ScheduleEntry(unit_id="t1", scheduled_date=date(2026, 9, 2), status="done")]
    result = rebuild_schedule(req, existing, today=date(2026, 9, 10))
    assert len(result) == 1
    assert result[0].status == "done"


def test_decayed_done_unit_spawns_and_schedules_review_session():
    # Unit completed a month ago with short stability -> R decayed below threshold (< 0.75)
    units = [make_unit("t1", hours=1.0)]
    mem = MemoryState(stability=5.0, difficulty=3.0, reps=1, lapses=0, last_review=date(2026, 8, 10))
    confidence = [ConfidenceRating(unit_id="t1", rating=3, last_updated=date(2026, 8, 10), memory_state=mem)]
    req = _base_request(units, confidence, start_date=date(2026, 8, 1))
    existing = [ScheduleEntry(unit_id="t1", scheduled_date=date(2026, 8, 10), status="done")]

    # Rebuilding on Sept 10 (31 days elapsed, R is very low)
    result = rebuild_schedule(req, existing, today=date(2026, 9, 10), spawn_reviews=True)

    # Output should include original done entry PLUS newly spawned review entry
    assert len(result) == 2
    done_entry = next(e for e in result if e.status == "done")
    assert done_entry.unit_id == "t1"

    review_entry = next(e for e in result if e.status == "planned")
    assert "review:t1:rep2" in review_entry.unit_id
    assert review_entry.scheduled_date >= date(2026, 9, 10)
    assert review_entry.is_review is True
