"""
engine/tests/test_exam_focus_and_triage.py

Validates two key scheduling guarantees:
1. Exam Date Exclusivity: On the date of an exam for Subject S, all tasks scheduled on that day
   belong to Subject S only (or the day is kept clear of non-exam subjects).
2. Expired Exam Triage: When Subject 1's exam date has passed, the scheduler focuses on
   completing the upcoming exam for Subject 2 rather than giving priority to Subject 1.
"""

from datetime import date, timedelta
import pytest

from engine.models import (
    PlanRequest,
    SchedulableUnit,
    AssessmentPhase,
    ExamDate,
    ExamType,
    Availability,
)
from engine.scheduler.baseline import build_schedule


def test_exam_day_subject_exclusivity():
    """
    If Subject A has an exam on Day 5 (2026-08-05), only units for Subject A
    may be scheduled on that day. Units for Subject B must not be scheduled on that day.
    """
    start_date = date(2026, 8, 1)
    exam_date = date(2026, 8, 5)

    # 4 units of Subject A, 4 units of Subject B
    units = [
        SchedulableUnit(
            unit_id=f"subtopic:A_{i}",
            topic_id="top_A",
            module_id="mod_A",
            name=f"Unit A {i}",
            order_index=i,
            subject_id="sub_A",
            est_hours=1.5,
            est_difficulty=3,
            assessment_phase=AssessmentPhase.UT1,
        )
        for i in range(4)
    ] + [
        SchedulableUnit(
            unit_id=f"subtopic:B_{i}",
            topic_id="top_B",
            module_id="mod_B",
            name=f"Unit B {i}",
            order_index=i,
            subject_id="sub_B",
            est_hours=1.5,
            est_difficulty=3,
            assessment_phase=AssessmentPhase.UT1,
        )
        for i in range(4)
    ]

    availability = [
        Availability(day_of_week=dow, hours_available=4.0)
        for dow in range(7)
    ]

    exam_dates = [
        ExamDate(
            subject_id="sub_A",
            exam_type=ExamType.UT1,
            exam_date=exam_date,
        ),
        ExamDate(
            subject_id="sub_B",
            exam_type=ExamType.UT1,
            exam_date=date(2026, 8, 15),
        ),
    ]

    request = PlanRequest(
        student_id="test_student",
        units=units,
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=start_date,
    )

    schedule = build_schedule(request, max_time_in_seconds=5.0)

    # Verify: on exam_date, any task scheduled MUST have subject_id == 'sub_A'
    exam_day_entries = [e for e in schedule if e.scheduled_date == exam_date]
    by_unit = {u.unit_id: u for u in units}

    for e in exam_day_entries:
        unit = by_unit[e.unit_id]
        assert unit.subject_id == "sub_A", (
            f"Expected only sub_A tasks on exam date {exam_date}, but got {unit.unit_id} ({unit.subject_id})"
        )


def test_expired_deadline_triage_prioritizes_upcoming_exam():
    """
    If Subject 1's UT1 deadline was 2 days ago (expired), while Subject 2's UT1 deadline
    is 2 days in the future, the scheduler should prioritize Subject 2 units over Subject 1 units.
    """
    start_date = date(2026, 8, 10)

    # Subject 1 UT1 was on Aug 8 (expired)
    # Subject 2 UT1 is on Aug 12 (impending)
    exam_dates = [
        ExamDate(
            subject_id="sub_1",
            exam_type=ExamType.UT1,
            exam_date=date(2026, 8, 8),
        ),
        ExamDate(
            subject_id="sub_2",
            exam_type=ExamType.UT1,
            exam_date=date(2026, 8, 12),
        ),
    ]

    units = [
        SchedulableUnit(
            unit_id=f"subtopic:sub1_{i}",
            topic_id="top_1",
            module_id="mod_1",
            name=f"Sub 1 Unit {i}",
            order_index=i,
            subject_id="sub_1",
            est_hours=2.0,
            est_difficulty=3,
            assessment_phase=AssessmentPhase.UT1,
        )
        for i in range(3)
    ] + [
        SchedulableUnit(
            unit_id=f"subtopic:sub2_{i}",
            topic_id="top_2",
            module_id="mod_2",
            name=f"Sub 2 Unit {i}",
            order_index=i,
            subject_id="sub_2",
            est_hours=2.0,
            est_difficulty=3,
            assessment_phase=AssessmentPhase.UT1,
        )
        for i in range(3)
    ]

    # Limited capacity: 2 hours per day
    availability = [
        Availability(day_of_week=dow, hours_available=2.0)
        for dow in range(7)
    ]

    request = PlanRequest(
        student_id="triage_student",
        units=units,
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=start_date,
    )

    schedule = build_schedule(request, max_time_in_seconds=5.0)
    by_unit = {u.unit_id: u for u in units}

    # Find tasks scheduled on start_date (Aug 10) and next day (Aug 11) - before Sub 2's exam
    pre_sub2_entries = [e for e in schedule if e.scheduled_date <= date(2026, 8, 12)]
    sub2_scheduled_before_deadline = [
        e for e in pre_sub2_entries if by_unit[e.unit_id].subject_id == "sub_2"
    ]

    # Subject 2 must be scheduled before its exam date, not blocked by the expired Subject 1
    assert len(sub2_scheduled_before_deadline) > 0, (
        "Subject 2 should be scheduled before its deadline, not starved by expired Subject 1"
    )
