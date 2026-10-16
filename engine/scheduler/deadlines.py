"""
Deadline resolution and urgency-based priority weighting.

Per the PRD: every module is tagged UT1 or UT2 (which unit test its
content falls under), and every subject has an end-sem date. This module
turns that into two things per unit:

1. A HARD cap: never schedule past the subject's end-sem date.
2. A SOFT target: the matching UT date. Missing it is heavily penalized
   in the scheduler's objective, but doesn't make the whole plan
   infeasible if a student has too much material and too little time --
   it just gets pushed as late as possible while it's still useful before
   end-sem, rather than the solver giving up entirely.
"""

from __future__ import annotations

from datetime import date

from engine.models import ExamDate, ExamType, SchedulableUnit


def get_ut_deadline(unit: SchedulableUnit, exam_dates: list[ExamDate]) -> date | None:
    target_type = ExamType.UT1 if unit.assessment_phase == unit.assessment_phase.UT1 else ExamType.UT2
    for e in exam_dates:
        if e.subject_id == unit.subject_id and e.exam_type == target_type:
            return e.exam_date
    return None


def get_end_sem_deadline(unit: SchedulableUnit, exam_dates: list[ExamDate]) -> date | None:
    for e in exam_dates:
        if e.subject_id == unit.subject_id and e.exam_type == ExamType.END_SEM:
            return e.exam_date
    return None


def compute_priority_weight(
    mastery_score: float,
    days_until_ut_deadline: int | None,
    alpha: float = 0.5,
    beta: float = 0.5,
) -> float:
    """
    Higher weight = should be scheduled sooner.

    - mastery_score: 0 (no confidence yet) .. 1 (fully confident)
    - days_until_ut_deadline: None if no UT date is on file for this unit's
      phase (shouldn't normally happen given the schema, but handled
      defensively rather than crashing)
    - alpha/beta: relative weight of "deadline is close" vs "I'm weak on this".
      Equal by default -- tune later once you see real student data.
    """
    weakness = 1.0 - mastery_score
    if days_until_ut_deadline is None or days_until_ut_deadline < 0:
        urgency = 0.0
    else:
        urgency = 1.0 / (days_until_ut_deadline + 1)
    return alpha * urgency + beta * weakness
