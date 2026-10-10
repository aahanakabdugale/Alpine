"""
Validation against synthetic student profiles.

Unlike test_baseline_scheduler.py and test_adaptive_scheduler.py (which
check specific mechanical guarantees on small hand-built cases), this
file runs a whole *population* of diverse synthetic students through the
real scheduler and checks that it behaves sensibly in aggregate.

Uses a fixed random seed so results are reproducible across runs.
"""

from __future__ import annotations

import json
import random
from datetime import date
from pathlib import Path

import pytest

from engine.scheduler.baseline import UnschedulableUnitError, build_schedule
from engine.tests.convert import profile_to_plan_request
from database.synthetic.generate_students import build_units, generate_profiles

# ---------------------------------------------------------------------------
# Path & Curriculum Loader Setup
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = PROJECT_ROOT / "database" / "seed"
CURRICULUM_DIR = SEED_DIR / "curriculum"


def load_actual_curriculum() -> list[dict]:
    """Combines all curriculum JSON files (core, electives, honors) into one list."""
    combined = []
    for file_name in ["core_subjects.json", "electives.json", "honors.json"]:
        p = CURRICULUM_DIR / file_name
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    combined.extend(data)
                elif isinstance(data, dict):
                    combined.append(data)
    return combined


def load_actual_exam_dates() -> dict:
    """Loads exam_dates.json from database/seed/."""
    exam_dates_file = SEED_DIR / "exam_dates.json"
    if not exam_dates_file.exists():
        # Fallback check if it was placed inside the curriculum subfolder
        exam_dates_file = CURRICULUM_DIR / "exam_dates.json"

    with open(exam_dates_file, "r", encoding="utf-8") as f:
        return json.load(f)


DEMO_CURRICULUM = load_actual_curriculum()
DEMO_EXAM_DATES = load_actual_exam_dates()

SEMESTER_START = date(2026, 8, 1)
TODAY = date(2026, 9, 5)
POPULATION_SIZE = 25


def _generate_population():
    random.seed(42)  # reproducible across runs
    return generate_profiles(POPULATION_SIZE, DEMO_CURRICULUM, SEMESTER_START, TODAY)


def _ut_deadline_from_raw(unit, exam_dates_raw: dict):
    entry = exam_dates_raw.get(unit.subject_id)
    if not entry:
        return None
    key = "UT1" if unit.assessment_phase.value == "UT1" else "UT2"
    date_str = entry.get(key)
    return date.fromisoformat(date_str) if date_str else None


def _tardiness_days(units, entries, exam_dates_raw):
    """For each scheduled unit with a UT target, how many days late it is (0 if on time)."""
    by_unit = {u.unit_id: u for u in units}
    total_tardy_days = 0
    tardy_count = 0
    for e in entries:
        unit = by_unit[e.unit_id]
        ut_deadline = _ut_deadline_from_raw(unit, exam_dates_raw)
        if ut_deadline is None:
            continue
        late_by = (e.scheduled_date - ut_deadline).days
        if late_by > 0:
            total_tardy_days += late_by
            tardy_count += 1
    return total_tardy_days, tardy_count


@pytest.fixture(scope="module")
def population_schedule_results():
    """Generates synthetic population and schedules them once for all tests in this module."""
    profiles = _generate_population()
    all_units = build_units(DEMO_CURRICULUM)
    results = []
    for profile in profiles:
        request = profile_to_plan_request(profile, all_units, DEMO_EXAM_DATES, TODAY)
        if not request.units:
            continue
        try:
            entries = build_schedule(request)
            results.append({
                "profile": profile,
                "request": request,
                "entries": entries,
                "error": None,
            })
        except UnschedulableUnitError as exc:
            results.append({
                "profile": profile,
                "request": request,
                "entries": None,
                "error": exc,
            })
        except Exception as exc:  # noqa: BLE001
            results.append({
                "profile": profile,
                "request": request,
                "entries": None,
                "error": exc,
            })
    return results


def test_no_exceptions_across_diverse_population(population_schedule_results):
    """
    Every synthetic student should either get a valid schedule, or a
    specific UnschedulableUnitError naming the exact unit/hours mismatch.
    """
    unexpected_failures = [
        (r["profile"]["archetype"], r["profile"]["student_id"], str(r["error"]))
        for r in population_schedule_results
        if r["error"] is not None and not isinstance(r["error"], UnschedulableUnitError)
    ]
    known_unschedulable = sum(
        1 for r in population_schedule_results if isinstance(r["error"], UnschedulableUnitError)
    )

    assert not unexpected_failures, (
        f"Scheduler raised an UNEXPECTED error on {len(unexpected_failures)} synthetic "
        f"students (separate from the {known_unschedulable} expected UnschedulableUnitError "
        f"cases): {unexpected_failures[:3]}"
    )


def test_never_schedules_past_end_sem_across_population(population_schedule_results):
    end_sem_by_subject = {
        subj: date.fromisoformat(dates["end_sem"])
        for subj, dates in DEMO_EXAM_DATES.items()
        if isinstance(dates, dict) and "end_sem" in dates
    }

    for r in population_schedule_results:
        if r["entries"] is None:
            continue
        units_by_id = {u.unit_id: u for u in r["request"].units}
        for e in r["entries"]:
            subject = units_by_id[e.unit_id].subject_id
            if subject in end_sem_by_subject:
                assert e.scheduled_date <= end_sem_by_subject[subject], (
                    f"{r['profile']['archetype']} student {r['profile']['student_id']}: "
                    f"unit {e.unit_id} scheduled at {e.scheduled_date}, "
                    f"past end-sem {end_sem_by_subject[subject]}"
                )


def test_dependency_ordering_holds_across_population(population_schedule_results):
    for r in population_schedule_results:
        if r["entries"] is None:
            continue
        date_by_unit = {e.unit_id: e.scheduled_date for e in r["entries"]}
        for u in r["request"].units:
            for dep_id in u.depends_on:
                if dep_id in date_by_unit and u.unit_id in date_by_unit:
                    assert date_by_unit[u.unit_id] >= date_by_unit[dep_id], (
                        f"{r['profile']['archetype']}: {u.unit_id} scheduled before its "
                        f"dependency {dep_id}"
                    )


def test_minimal_time_archetype_hits_unschedulable_limitation_more_than_diligent_strong(population_schedule_results):
    outcomes = {"minimal_time": [], "diligent_strong": []}
    for r in population_schedule_results:
        archetype = r["profile"]["archetype"]
        if archetype not in outcomes:
            continue
        outcomes[archetype].append(isinstance(r["error"], UnschedulableUnitError))

    if not outcomes["minimal_time"] or not outcomes["diligent_strong"]:
        pytest.skip("Not enough synthetic students of both archetypes in this random sample")

    minimal_time_rate = sum(outcomes["minimal_time"]) / len(outcomes["minimal_time"])
    diligent_strong_rate = sum(outcomes["diligent_strong"]) / len(outcomes["diligent_strong"])

    assert minimal_time_rate >= diligent_strong_rate, (
        f"minimal_time hit rate ({minimal_time_rate:.0%}) should be >= "
        f"diligent_strong's ({diligent_strong_rate:.0%}) -- got the opposite"
    )


def test_unschedulable_unit_raises_specific_clear_error():
    from datetime import date as _date
    from engine.models import (
        AssessmentPhase,
        Availability,
        ExamDate,
        ExamType,
        PlanRequest,
        SchedulableUnit,
    )

    oversized_unit = SchedulableUnit(
        unit_id="too_big",
        topic_id="too_big",
        subject_id="X",
        module_id="X-m",
        name="too_big",
        order_index=0,
        est_difficulty=3,
        est_hours=3.0,
        depends_on=[],
        assessment_phase=AssessmentPhase.UT1,
    )
    availability = [Availability(day_of_week=i, hours_available=1.0) for i in range(7)]
    exam_dates = [
        ExamDate(subject_id="X", exam_type=ExamType.UT1, exam_date=_date(2026, 10, 1)),
        ExamDate(subject_id="X", exam_type=ExamType.END_SEM, exam_date=_date(2026, 12, 1)),
    ]
    request = PlanRequest(
        student_id="s1",
        units=[oversized_unit],
        confidence=[],
        availability=availability,
        exam_dates=exam_dates,
        start_date=_date(2026, 9, 1),
    )
    with pytest.raises(UnschedulableUnitError, match="too_big.*3.0h.*1.0h"):
        build_schedule(request)