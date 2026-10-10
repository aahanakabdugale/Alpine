"""
Converts synthetic profiles (from synthetic_generator.py) and curriculum
data into the engine's own pydantic models -- this is exactly the
translation Member C's real backend would do from Supabase rows, just
sourced from generated data instead of the database.
"""

from __future__ import annotations

from datetime import date, datetime

from engine.models import (
    AssessmentPhase,
    Availability,
    ConfidenceRating,
    ExamDate,
    ExamType,
    PlanRequest,
    SchedulableUnit,
)


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def units_to_schedulable(all_units: list[dict], enrolled_subject_names: set[str]) -> list[SchedulableUnit]:
    result = []
    for u in all_units:
        if u["subject_name"] not in enrolled_subject_names:
            continue
        result.append(
            SchedulableUnit(
                unit_id=u["unit_id"],
                topic_id=f"{u['subject_name']}::{u['module_name']}::{u['topic_name']}",
                subtopic_id=u["subtopic_name"],
                subject_id=u["subject_name"],
                module_id=f"{u['subject_name']}::{u['module_name']}",
                name=u["subtopic_name"] or u["topic_name"],
                order_index=u["order_index"],
                est_difficulty=u["est_difficulty"],
                est_hours=u["est_hours"],
                depends_on=list(u["depends_on"]),
                assessment_phase=AssessmentPhase(u["phase"]),
            )
        )
    return result


def exam_dates_to_models(exam_dates_raw: dict, enrolled_subject_names: set[str]) -> list[ExamDate]:
    result = []
    for subject_name in enrolled_subject_names:
        entry = exam_dates_raw.get(subject_name)
        if not entry:
            continue
        for exam_type_str, date_str in entry.items():
            result.append(
                ExamDate(
                    subject_id=subject_name,
                    exam_type=ExamType(exam_type_str),
                    exam_date=_parse_date(date_str),
                )
            )
    return result


def profile_to_plan_request(profile: dict, all_units: list[dict], exam_dates_raw: dict, start_date: date) -> PlanRequest:
    enrolled_names = {
        n
        for n in (
            profile["enrolled_subjects"]["core"]
            + [profile["enrolled_subjects"]["elective"], profile["enrolled_subjects"]["honors"]]
        )
        if n
    }

    units = units_to_schedulable(all_units, enrolled_names)
    availability = [Availability(**a) for a in profile["availability"]]
    exam_dates = exam_dates_to_models(exam_dates_raw, enrolled_names)
    confidence = [
        ConfidenceRating(unit_id=uid, rating=rating, last_updated=d)
        for uid, rating, d in profile["confidence_ratings"]
    ]

    return PlanRequest(
        student_id=profile["student_id"],
        units=units,
        confidence=confidence,
        availability=availability,
        exam_dates=exam_dates,
        start_date=start_date,
    )
