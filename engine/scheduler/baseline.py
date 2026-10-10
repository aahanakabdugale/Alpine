"""
Baseline schedule generator, built on OR-Tools CP-SAT.

Given everything about a student in one PlanRequest (units across all
enrolled subjects, current confidence ratings, weekly availability, and
exam dates), this produces an optimal day for every unit such that:

  - Daily study hours never exceed that day's availability (est_hours knapsack)
  - Daily cognitive strain never exceeds maximum capacity (est_difficulty cap)
  - Subject diversity is encouraged on long study days (cognitive interleaving)
  - A unit is never scheduled before its prerequisites (topic_dependencies)
  - Soft-slack triage prioritizes on-time completion before end-sem without crashing
  - Priority weights scale by weakness/urgency AND unit difficulty
  - Oversized units can be automatically sliced into sequential multi-day sessions
"""

from __future__ import annotations

from datetime import timedelta
import math

from ortools.sat.python import cp_model

from engine.mastery.confidence_model import build_mastery_map
from engine.mastery.dependency_dag import validate_dependency_dag
from engine.models import PlanRequest, SchedulableUnit, ScheduleEntry
from engine.scheduler.deadlines import (
    compute_priority_weight,
    get_end_sem_deadline,
    get_ut_deadline,
)

TARDINESS_PENALTY = 10_000   # Cost per day late past a unit's UT target
HOURS_SCALE = 100           # Fixed-point multiplier for CP-SAT integer capacity
MAX_DAILY_DIFFICULTY_POINTS = 8  # Daily cognitive load threshold
INTERLEAVING_CAP_RATIO = 0.70    # Max single-subject allocation on multi-hour days


class UnschedulableUnitError(Exception):
    """Raised when a unit cannot be scheduled due to availability constraints."""
    pass


def slice_oversized_units(
    units: list[SchedulableUnit],
    max_daily_hours: float,
) -> list[SchedulableUnit]:
    """
    Slices any unit whose est_hours exceeds the student's maximum single-day
    capacity into sequential, prerequisite-chained sub-sessions.
    """
    if max_daily_hours <= 0:
        return units

    sliced_units: list[SchedulableUnit] = []
    final_slice_map: dict[str, str] = {}

    for u in units:
        if u.est_hours <= max_daily_hours + 1e-9:
            sliced_units.append(u)
            final_slice_map[u.unit_id] = u.unit_id
        else:
            k = int(math.ceil(u.est_hours / max_daily_hours))
            slice_hours = max(0.25, round(u.est_hours / k, 2))
            prev_slice_id: str | None = None

            for slice_idx in range(1, k + 1):
                slice_id = f"{u.unit_id}::part{slice_idx}"
                deps = list(u.depends_on) if slice_idx == 1 else [prev_slice_id]

                slice_unit = u.model_copy(
                    update={
                        "unit_id": slice_id,
                        "name": f"{u.name} (Part {slice_idx}/{k})",
                        "est_hours": slice_hours,
                        "depends_on": deps,
                        "parent_unit_id": u.unit_id,
                        "slice_index": slice_idx,
                        "total_slices": k,
                    }
                )
                sliced_units.append(slice_unit)
                prev_slice_id = slice_id

            final_slice_map[u.unit_id] = prev_slice_id

    # Rewire downstream dependencies pointing to parent units to their final slice
    rewired_units: list[SchedulableUnit] = []
    for u in sliced_units:
        new_deps = [final_slice_map.get(dep, dep) for dep in u.depends_on if dep is not None]
        rewired_units.append(u.model_copy(update={"depends_on": new_deps}))

    return rewired_units


def _availability_hours_by_day(availability, start_date, horizon_days) -> list[float]:
    hours_by_dow = {a.day_of_week: a.hours_available for a in availability}
    hours = []
    for i in range(horizon_days):
        d = start_date + timedelta(days=i)
        hours.append(hours_by_dow.get(d.weekday(), 0.0))
    return hours


def build_schedule(
    request: PlanRequest,
    horizon_days: int = 90,
    mastery_override: dict[str, float] | None = None,
    max_daily_difficulty: int = MAX_DAILY_DIFFICULTY_POINTS,
    auto_slice: bool = False,
    enable_interleaving: bool = True,
) -> list[ScheduleEntry]:
    # 1. Fast Availability Pre-Check
    largest_single_day = max((a.hours_available for a in request.availability), default=0.0)
    if largest_single_day <= 0.0:
        raise UnschedulableUnitError(
            "Student has 0.0 hours available on all days. Cannot schedule any units."
        )

    # 2. Handle Oversized Units (Auto-Slice or Validate)
    units_to_schedule = request.units
    if auto_slice:
        units_to_schedule = slice_oversized_units(units_to_schedule, largest_single_day)
    else:
        for u in units_to_schedule:
            if u.est_hours > largest_single_day + 1e-9:
                raise UnschedulableUnitError(
                    f"Unit '{u.unit_id}' requires {u.est_hours}h, but this student's "
                    f"largest single available day only offers {largest_single_day}h. "
                    "It can never be scheduled as-is -- either split it into smaller "
                    "subtopics, or the student needs at least one day with more time."
                )

    validate_dependency_dag(units_to_schedule)

    model = cp_model.CpModel()
    units = units_to_schedule
    n = len(units)
    unit_index = {u.unit_id: i for i, u in enumerate(units)}

    mastery = mastery_override if mastery_override is not None else build_mastery_map(request.confidence)
    hours_by_day = _availability_hours_by_day(request.availability, request.start_date, horizon_days)

    day_vars = []
    priority_weights = []
    soft_deadline_days: list[int | None] = []
    end_sem_overrun_terms = []

    for u in units:
        day_var = model.NewIntVar(0, horizon_days - 1, f"day_{u.unit_id}")
        day_vars.append(day_var)

        # Inherit parent unit mastery if unit was sliced
        lookup_id = u.parent_unit_id if u.parent_unit_id else u.unit_id
        ms = mastery.get(lookup_id, mastery.get(u.unit_id, 0.0))

        ut_deadline = get_ut_deadline(u, request.exam_dates)
        end_sem_deadline = get_end_sem_deadline(u, request.exam_dates)

        days_until_ut = (ut_deadline - request.start_date).days if ut_deadline else None
        base_priority = compute_priority_weight(ms, days_until_ut)

        # Scale priority by difficulty:
        difficulty_multiplier = 1.0 + 0.2 * (u.est_difficulty - 1)
        effective_priority = base_priority * difficulty_multiplier
        priority_weights.append(effective_priority)

        soft_deadline_days.append(max(days_until_ut, 0) if days_until_ut is not None else None)

        # Soft Slack Triage for End-Sem:
        if end_sem_deadline:
            hard_cap = min((end_sem_deadline - request.start_date).days, horizon_days - 1)
            overrun = model.NewIntVar(0, horizon_days, f"overrun_{u.unit_id}")
            model.Add(day_var <= max(hard_cap, 0) + overrun)
            # Heavy penalty for missing end-sem, prioritizing higher difficulty units
            end_sem_overrun_terms.append(overrun * (50_000 + 5_000 * u.est_difficulty))

    # 3. Prerequisite Ordering
    for u in units:
        ui = unit_index[u.unit_id]
        for dep_id in u.depends_on:
            if dep_id in unit_index:
                model.Add(day_vars[ui] >= day_vars[unit_index[dep_id]])

    # 4. Decision Matrix: Boolean Indicators (assigned[u, d] == 1 if unit u on day d)
    assigned = {}
    for i, u in enumerate(units):
        for d in range(horizon_days):
            b = model.NewBoolVar(f"assigned_{u.unit_id}_{d}")
            model.Add(day_vars[i] == d).OnlyEnforceIf(b)
            model.Add(day_vars[i] != d).OnlyEnforceIf(b.Not())
            assigned[(i, d)] = b

    # 5. Knapsack Constraints (Hours, Cognitive Load, and Interleaving)
    distinct_subjects = {u.subject_id for u in units}
    has_multi_subjects = len(distinct_subjects) > 1 and enable_interleaving

    for d in range(horizon_days):
        capacity = int(round(hours_by_day[d] * HOURS_SCALE))

        # Constraint A: Daily Study Hours
        model.Add(
            sum(int(round(units[i].est_hours * HOURS_SCALE)) * assigned[(i, d)] for i in range(n))
            <= capacity
        )

        # Constraint B: Daily Cognitive Load (Difficulty Cap)
        if capacity > 0:
            model.Add(
                sum(units[i].est_difficulty * assigned[(i, d)] for i in range(n))
                <= max_daily_difficulty
            )

            # Constraint C: Cognitive Subject Interleaving Cap
            # On days with >= 1.5h, avoid single-subject monopoly if multi-subjects exist
            if has_multi_subjects and capacity >= int(round(1.5 * HOURS_SCALE)):
                max_subj_cap = int(round(INTERLEAVING_CAP_RATIO * capacity))
                for subj in distinct_subjects:
                    subj_indices = [idx for idx, un in enumerate(units) if un.subject_id == subj]
                    if subj_indices:
                        # Allow max_subj_cap or the largest single unit in that subject
                        largest_subj_unit_hours = max(
                            int(round(units[idx].est_hours * HOURS_SCALE)) for idx in subj_indices
                        )
                        eff_cap = max(max_subj_cap, largest_subj_unit_hours)
                        model.Add(
                            sum(int(round(units[idx].est_hours * HOURS_SCALE)) * assigned[(idx, d)] for idx in subj_indices)
                            <= eff_cap
                        )
        else:
            # On zero-hour days, no units should be assigned
            for i in range(n):
                model.Add(assigned[(i, d)] == 0)

    # 6. Soft Deadline Penalties (UT targets)
    tardiness_terms = []
    for i, u in enumerate(units):
        if soft_deadline_days[i] is not None:
            tardy = model.NewIntVar(0, horizon_days, f"tardy_{u.unit_id}")
            model.Add(tardy >= day_vars[i] - soft_deadline_days[i])
            tardiness_terms.append(tardy)

    # 7. Objective: Minimize (Priority-Weighted Day + Tardiness + Overrun)
    objective_terms = [
        (int(priority_weights[i] * 100) + 1) * day_vars[i] for i in range(n)
    ]
    total_penalty = (
        sum(objective_terms)
        + TARDINESS_PENALTY * sum(tardiness_terms)
        + sum(end_sem_overrun_terms)
    )
    model.Minimize(total_penalty)

    # 8. Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 15
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(
            "Scheduler could not find a feasible plan -- this usually means "
            "availability constraints or prerequisite cycles prevented scheduling."
        )

    entries = []
    for i, u in enumerate(units):
        d = solver.Value(day_vars[i])
        entries.append(
            ScheduleEntry(
                unit_id=u.unit_id,
                scheduled_date=request.start_date + timedelta(days=d),
                is_review=u.is_review,
            )
        )
    return entries