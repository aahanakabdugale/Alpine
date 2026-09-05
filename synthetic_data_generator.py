"""
Synthetic data generator — Member A deliverable
(Adaptive AI Study Mentor)

Two independent pieces, per PRD §4:

1. estimate_difficulty_hours(...)
   Assigns a starting est_difficulty (1-5) and est_hours to a schedulable
   unit (a topic with no subtopics, or a subtopic) using simple, explainable
   heuristics — no ML, no external API, just rules based on features we
   already know: topic "type", position within its module, and how deep
   the curriculum tree is at that point.

2. generate_synthetic_students(...)
   Produces a batch of fake student profiles (pace, starting ability,
   availability pattern) so Member B can validate the scheduler and
   mastery-update logic before any real student touches the system.

Both functions are pure Python — no DB connection required. Feed them your
real topic/subtopic list (once Member A's data entry is done) to get
plausible starting values, and feed generate_synthetic_students' output to
Member B for scheduler testing.
"""

import random
import uuid
from dataclasses import dataclass, field


# ============================================================
# 1. DIFFICULTY / HOURS ESTIMATION
# ============================================================

# Base hours by topic "type" — tune these to match your actual subjects.
# "concept": mostly theory/reading. "problem_solving": needs practice reps.
# "project": open-ended, takes longest and varies most.
BASE_HOURS_BY_TYPE = {
    "concept": 1.5,
    "problem_solving": 2.5,
    "project": 4.0,
}

BASE_DIFFICULTY_BY_TYPE = {
    "concept": 2,
    "problem_solving": 3,
    "project": 4,
}


def estimate_difficulty_hours(
    topic_type: str,
    order_index: int,
    total_in_module: int,
    credit_weight: float = 1.0,
) -> tuple[int, float]:
    """
    Heuristic estimate of (est_difficulty 1-5, est_hours) for one schedulable unit.

    Rationale (useful for your viva):
    - topic_type sets a baseline (project > problem_solving > concept)
    - position_in_module: later topics in a module are assumed harder,
      since courses are usually sequenced easy -> hard
    - credit_weight scales hours for subjects/modules that carry more
      weight in the overall course

    Args:
        topic_type: one of "concept", "problem_solving", "project"
        order_index: 1-based position of this unit within its module
        total_in_module: how many schedulable units are in this module
        credit_weight: optional multiplier (e.g. subject credit hours / 4)

    Returns:
        (est_difficulty, est_hours)
    """
    if topic_type not in BASE_HOURS_BY_TYPE:
        raise ValueError(f"Unknown topic_type: {topic_type!r}")

    # Position factor: 0.0 (first topic) -> 1.0 (last topic) within the module
    position_factor = 0 if total_in_module <= 1 else (order_index - 1) / (total_in_module - 1)

    base_difficulty = BASE_DIFFICULTY_BY_TYPE[topic_type]
    difficulty = base_difficulty + round(position_factor * 1.5)  # later topics bumped up
    difficulty = max(1, min(5, difficulty))

    base_hours = BASE_HOURS_BY_TYPE[topic_type]
    hours = base_hours * (1 + 0.4 * position_factor) * credit_weight
    hours = round(hours, 2)

    return difficulty, hours


# ============================================================
# 2. SYNTHETIC STUDENT PROFILES
# ============================================================

@dataclass
class SyntheticStudent:
    id: str
    pace_multiplier: float          # <1.0 = faster than average, >1.0 = slower
    starting_ability: float         # 0-1, rough proxy for baseline confidence
    availability: dict[int, float]  # day_of_week (0=Sun..6=Sat) -> hours available


def generate_synthetic_students(
    n: int = 15,
    seed: int | None = 42,
) -> list[SyntheticStudent]:
    """
    Generate n fake student profiles with randomized pace, starting ability,
    and weekly availability, for Member B to test the scheduler/mastery
    logic against before real students exist.

    seed is fixed by default so results are reproducible for your writeup
    ("we validated against N simulated learners") — pass seed=None for
    fresh randomness each run.
    """
    rng = random.Random(seed)
    students = []

    for _ in range(n):
        pace = round(rng.uniform(0.7, 1.4), 2)          # 0.7 = fast, 1.4 = slow
        ability = round(rng.uniform(0.2, 0.9), 2)

        # Randomized weekly availability: each day has a chance of being a
        # study day, with 0-4 hours available on those days.
        availability = {}
        for day in range(7):
            if rng.random() < 0.7:  # ~70% chance this day is a study day
                availability[day] = round(rng.uniform(0.5, 4.0), 1)

        students.append(
            SyntheticStudent(
                id=str(uuid.uuid4()),
                pace_multiplier=pace,
                starting_ability=ability,
                availability=availability,
            )
        )

    return students


def students_to_sql_inserts(students: list[SyntheticStudent]) -> str:
    """
    Convert synthetic students into INSERT statements matching the
    `students` + `availability` tables, so you can seed them directly.
    Note: these are synthetic/test rows only — do not run against a
    Supabase project that also has real auth.users, since students.id
    must equal an auth.users.id in production.
    """
    lines = []
    for s in students:
        lines.append(
            f"insert into students (id, display_name) values "
            f"('{s.id}', 'synthetic_{s.id[:8]}');"
        )
        for day, hours in s.availability.items():
            lines.append(
                f"insert into availability (student_id, day_of_week, hours_available) "
                f"values ('{s.id}', {day}, {hours});"
            )
    return "\n".join(lines)


# ============================================================
# EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    # --- Example: estimating difficulty/hours for a few topics ---
    example_topics = [
        {"name": "Intro to Neural Networks", "type": "concept", "order_index": 1, "total": 5},
        {"name": "Backpropagation Derivation", "type": "concept", "order_index": 3, "total": 5},
        {"name": "Implement a CNN", "type": "project", "order_index": 5, "total": 5},
    ]
    print("--- Difficulty/Hours estimates ---")
    for t in example_topics:
        diff, hours = estimate_difficulty_hours(t["type"], t["order_index"], t["total"])
        print(f"{t['name']:35s} -> difficulty={diff}, hours={hours}")

    # --- Example: generating synthetic students ---
    print("\n--- Synthetic students (first 3) ---")
    fake_students = generate_synthetic_students(n=15)
    for s in fake_students[:3]:
        print(s)

    # --- Write ALL synthetic students' SQL inserts to a file for seeding ---
    output_path = "synthetic_students_seed.sql"
    with open(output_path, "w") as f:
        f.write(students_to_sql_inserts(fake_students))
    print(f"\n--- Wrote {len(fake_students)} students' SQL inserts to {output_path} ---")
    print("Open that file, copy everything in it, paste into Supabase's SQL Editor, and click Run.")