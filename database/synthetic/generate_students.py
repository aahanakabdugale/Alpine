"""
generate_students.py — Member A

Generates synthetic student profiles (pace, starting ability, weekly
availability) so Member B can validate the scheduler/mastery logic
before any real student touches the system, per PRD §4 point 2.

Run directly to write synthetic_students_seed.sql (SQL insert statements
you paste into Supabase's SQL Editor), or import generate_synthetic_students()
from seed_runner.py if you want to fold it into one combined seed run.
"""

import random
import uuid
from dataclasses import dataclass


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
    and weekly availability.

    seed is fixed by default so results are reproducible for your writeup
    ("we validated against N simulated learners") — pass seed=None for
    fresh randomness each run.
    """
    rng = random.Random(seed)
    students = []

    for _ in range(n):
        pace = round(rng.uniform(0.7, 1.4), 2)          # 0.7 = fast, 1.4 = slow
        ability = round(rng.uniform(0.2, 0.9), 2)

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
    `students` + `availability` tables. Synthetic/test rows only — do not
    run against a Supabase project that also has real auth.users, since
    students.id must equal an auth.users.id in production.
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


if __name__ == "__main__":
    students = generate_synthetic_students(n=15)
    output_path = "synthetic_students_seed.sql"
    with open(output_path, "w") as f:
        f.write(students_to_sql_inserts(students))
    print(f"Wrote {len(students)} students' SQL inserts to {output_path}")
