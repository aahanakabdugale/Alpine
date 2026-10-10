from datetime import date, timedelta

import pytest

from engine.models import (
    AssessmentPhase,
    Availability,
    ConfidenceRating,
    ExamDate,
    ExamType,
    PlanRequest,
    SchedulableUnit,
)
from engine.scheduler.baseline import UnschedulableUnitError, build_schedule


def make_unit(unit_id, subject_id, phase, hours=1.0, difficulty=2, depends_on=None, order=0):
    return SchedulableUnit(
        unit_id=unit_id,
        topic_id=unit_id,
        subject_id=subject_id,
        module_id=f"{subject_id}-mod",
        name=unit_id,
        order_index=order,
        est_difficulty=difficulty,
        est_hours=hours,
        depends_on=depends_on or [],
        assessment_phase=phase,
    )


def test_low_confidence_gets_scheduled_earlier_than_high_confidence():
    units = [
        make_unit("weak", "math", AssessmentPhase.UT1, order=0),
        make_unit("strong", "math", AssessmentPhase.UT1, order=1),
    ]
    availability = [Availability(day_of_week=i, hours_available=2.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 9, 30)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 12, 1)),
    ]
    confidence = [
        ConfidenceRating(unit_id="weak", rating=1, last_updated=date(2026, 8, 30)),
        ConfidenceRating(unit_id="strong", rating=5, last_updated=date(2026, 8, 30)),
    ]
    req = PlanRequest(
        student_id="s1",
        units=units,
        confidence=confidence,
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )
    result = build_schedule(req)
    by_id = {e.unit_id: e.scheduled_date for e in result}
    assert by_id["weak"] <= by_id["strong"], "weaker topic should be prioritized earlier"


def test_never_exceeds_daily_capacity():
    units = [make_unit(f"t{i}", "math", AssessmentPhase.UT1, hours=1.0, order=i) for i in range(10)]
    availability = [Availability(day_of_week=i, hours_available=2.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 9, 30)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 12, 1)),
    ]
    req = PlanRequest(
        student_id="s1",
        units=units,
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )
    result = build_schedule(req)
    hours_per_day: dict = {}
    hours_lookup = {u.unit_id: u.est_hours for u in units}
    for e in result:
        hours_per_day[e.scheduled_date] = hours_per_day.get(e.scheduled_date, 0) + hours_lookup[e.unit_id]
    for d, total in hours_per_day.items():
        assert total <= 2.0 + 1e-6, f"day {d} exceeds capacity: {total}h"


def test_prerequisites_always_scheduled_before_dependents():
    u1 = make_unit("u1", "math", AssessmentPhase.UT1, order=0)
    u2 = make_unit("u2", "math", AssessmentPhase.UT1, order=1, depends_on=["u1"])
    u3 = make_unit("u3", "math", AssessmentPhase.UT1, order=2, depends_on=["u2"])

    availability = [Availability(day_of_week=i, hours_available=2.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 10, 1)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 12, 1)),
    ]

    req = PlanRequest(
        student_id="s1",
        units=[u1, u2, u3],
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )

    entries = build_schedule(req)
    scheduled_days = {e.unit_id: e.scheduled_date for e in entries}

    for u in req.units:
        for dep_id in u.depends_on:
            if dep_id in scheduled_days and u.unit_id in scheduled_days:
                assert scheduled_days[u.unit_id] >= scheduled_days[dep_id], (
                    f"Unit {u.unit_id} scheduled at {scheduled_days[u.unit_id]} "
                    f"before prerequisite {dep_id} at {scheduled_days[dep_id]}"
                )


def test_never_schedules_past_end_sem():
    units = [make_unit("t1", "math", AssessmentPhase.UT2, order=0)]
    availability = [Availability(day_of_week=i, hours_available=1.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT2, exam_date=date(2026, 11, 1)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 9, 10)),
    ]
    req = PlanRequest(
        student_id="s1",
        units=units,
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )
    result = build_schedule(req)
    assert result[0].scheduled_date <= date(2026, 9, 10)


def test_auto_slice_oversized_unit():
    # Unit requires 2.5h, but student max daily availability is 1.0h
    big_unit = make_unit("big_topic", "math", AssessmentPhase.UT1, hours=2.5, order=0)
    availability = [Availability(day_of_week=i, hours_available=1.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 10, 1)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 11, 1)),
    ]
    req = PlanRequest(
        student_id="s1",
        units=[big_unit],
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )

    # 1. With auto_slice=False, raises UnschedulableUnitError
    with pytest.raises(UnschedulableUnitError):
        build_schedule(req, auto_slice=False)

    # 2. With default auto_slice=True, splits into 3 parts (Part 1, Part 2, Part 3)
    entries = build_schedule(req, auto_slice=True)
    assert len(entries) == 3
    entry_map = {e.unit_id: e.scheduled_date for e in entries}
    assert "big_topic::part1" in entry_map
    assert "big_topic::part2" in entry_map
    assert "big_topic::part3" in entry_map
    # Slices are scheduled in non-decreasing chronological order
    assert entry_map["big_topic::part1"] <= entry_map["big_topic::part2"] <= entry_map["big_topic::part3"]


def test_soft_slack_triage_under_workload_overload():
    # Student has 1h/day for 3 days before end-sem (total 3h), but 5 units of 1h each (total 5h)
    units = [make_unit(f"u{i}", "math", AssessmentPhase.UT1, hours=1.0, difficulty=i + 1, order=i) for i in range(5)]
    availability = [Availability(day_of_week=i, hours_available=1.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="math", exam_type=ExamType.UT1, exam_date=date(2026, 9, 10)),
        ExamDate(subject_id="math", exam_type=ExamType.END_SEM, exam_date=date(2026, 9, 3)),
    ]
    req = PlanRequest(
        student_id="s1",
        units=units,
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=date(2026, 9, 1),
    )

    # Previously this would crash with RuntimeError (INFEASIBLE).
    # With soft-slack triage, solver produces a viable schedule.
    entries = build_schedule(req)
    assert len(entries) == 5
