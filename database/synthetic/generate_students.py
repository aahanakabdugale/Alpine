"""
database/synthetic/generate_students.py

Generates synthetic student profiles, curriculum units, and database seed SQL.
Used by:
  - Member B (engine/tests/test_against_synthetic.py) for population-level scheduler testing.
  - Member A (database seed) for synthetic_students_seed.sql.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
import random
import uuid

# Topic type base parameters (hours, difficulty)
TYPE_DEFAULTS = {
    "concept": (0.5, 1),
    "problem_solving": (0.75, 2),
    "derivation": (1.0, 2),
    "coding": (1.0, 2),
}

ARCHETYPES = [
    "diligent_strong",
    "steady_average",
    "crammer",
    "struggling",
    "minimal_time",
]


def build_units(curriculum: list[dict]) -> list[dict]:
    """
    Transforms raw curriculum JSON data into a flat list of schedulable units.
    Adheres to the PRD unit leaf rule:
      - If topic has subtopics -> each subtopic is its own unit (subtopic_id != None)
      - If topic has no subtopics -> the topic itself is the unit (subtopic_id == None)
    Prerequisites are chained sequentially within each subject.
    """
    all_units: list[dict] = []

    for subject in curriculum:
        subject_name = subject.get("name")
        modules = subject.get("modules", [])
        if not modules:
            continue

        prev_unit_id: str | None = None
        order_index = 0

        for mod_idx, module in enumerate(modules):
            module_name = module.get("name", f"Module {mod_idx + 1}")
            phase = module.get("phase")
            if not phase:
                phase = "UT1" if mod_idx < 3 else "UT2"

            for topic in module.get("topics", []):
                topic_name = topic.get("name")
                topic_type = topic.get("type", "concept")
                base_hours, base_diff = TYPE_DEFAULTS.get(topic_type, (0.75, 2))

                subtopics = topic.get("subtopics", [])
                if subtopics:
                    hours_per_subtopic = max(0.25, round(base_hours / len(subtopics), 2))
                    sub_diff = max(1, base_diff - 1)
                    for subtopic_name in subtopics:
                        unit_id = f"{subject_name}::{module_name}::{topic_name}::{subtopic_name}"
                        unit_dict = {
                            "unit_id": unit_id,
                            "subject_name": subject_name,
                            "module_name": module_name,
                            "topic_name": topic_name,
                            "subtopic_name": subtopic_name,
                            "order_index": order_index,
                            "est_difficulty": sub_diff,
                            "est_hours": hours_per_subtopic,
                            "depends_on": [prev_unit_id] if prev_unit_id else [],
                            "phase": phase,
                        }
                        all_units.append(unit_dict)
                        prev_unit_id = unit_id
                        order_index += 1
                else:
                    unit_id = f"{subject_name}::{module_name}::{topic_name}"
                    unit_dict = {
                        "unit_id": unit_id,
                        "subject_name": subject_name,
                        "module_name": module_name,
                        "topic_name": topic_name,
                        "subtopic_name": None,
                        "order_index": order_index,
                        "est_difficulty": base_diff,
                        "est_hours": base_hours,
                        "depends_on": [prev_unit_id] if prev_unit_id else [],
                        "phase": phase,
                    }
                    all_units.append(unit_dict)
                    prev_unit_id = unit_id
                    order_index += 1

    return all_units


def _generate_availability_for_archetype(archetype: str) -> list[dict]:
    """Generates weekly availability matching archetype capacity."""
    availability = []
    if archetype == "minimal_time":
        # Constrained time: 2-3 days, 0.3 - 0.6 hours per day.
        # Largest single day <= 0.6h, guaranteeing UnschedulableUnitError
        # for units requiring >= 0.75h.
        active_days = set(random.sample(range(7), k=random.randint(2, 3)))
        for dow in range(7):
            if dow in active_days:
                hours = round(random.uniform(0.3, 0.6), 1)
            else:
                hours = 0.0
            availability.append({"day_of_week": dow, "hours_available": hours})

    elif archetype == "diligent_strong":
        # Ample study time: 6-7 days, 3.0 - 4.5 hours per day (20-30h/wk)
        active_days = set(random.sample(range(7), k=random.randint(6, 7)))
        for dow in range(7):
            if dow in active_days:
                hours = round(random.uniform(3.0, 4.5), 1)
            else:
                hours = 0.0
            availability.append({"day_of_week": dow, "hours_available": hours})

    elif archetype == "crammer":
        # Weekends 3.5 - 5.0h, 2 weekdays 2.0 - 2.5h (15-20h/wk)
        weekday_active = set(random.sample(range(5), k=2))
        for dow in range(7):
            if dow in (5, 6):  # Saturday, Sunday
                hours = round(random.uniform(3.5, 5.0), 1)
            elif dow in weekday_active:
                hours = round(random.uniform(2.0, 2.5), 1)
            else:
                hours = 0.0
            availability.append({"day_of_week": dow, "hours_available": hours})

    else:  # steady_average / struggling
        # Regular time: 5-6 days, 2.5 - 3.5 hours per day (14-20h/wk)
        active_days = set(random.sample(range(7), k=random.randint(5, 6)))
        for dow in range(7):
            if dow in active_days:
                hours = round(random.uniform(2.5, 3.5), 1)
            else:
                hours = 0.0
            availability.append({"day_of_week": dow, "hours_available": hours})

    return availability


def _sample_confidence_rating(archetype: str) -> int:
    """Samples confidence rating (1-5) biased by student archetype."""
    if archetype == "diligent_strong":
        return random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.05, 0.15, 0.35, 0.40])[0]
    if archetype == "struggling":
        return random.choices([1, 2, 3, 4, 5], weights=[0.45, 0.30, 0.15, 0.08, 0.02])[0]
    if archetype == "crammer":
        return random.choices([1, 2, 3, 4, 5], weights=[0.30, 0.10, 0.10, 0.20, 0.30])[0]
    if archetype == "minimal_time":
        return random.choices([1, 2, 3, 4, 5], weights=[0.20, 0.25, 0.30, 0.15, 0.10])[0]
    return random.choices([1, 2, 3, 4, 5], weights=[0.10, 0.20, 0.40, 0.20, 0.10])[0]


def generate_profiles(
    count: int,
    curriculum: list[dict],
    semester_start: date,
    today: date,
) -> list[dict]:
    """
    Generates a population of synthetic student profiles.
    Includes availability, enrolled subjects, and topic confidence ratings.
    """
    all_units = build_units(curriculum)
    units_by_subject: dict[str, list[dict]] = {}
    for u in all_units:
        units_by_subject.setdefault(u["subject_name"], []).append(u)

    core_subjects = [
        s["name"] for s in curriculum if s.get("category") == "core" and s.get("modules")
    ]
    elective_subjects = [
        s["name"] for s in curriculum if s.get("category") == "elective" and s.get("modules")
    ]
    honors_subjects = [
        s["name"] for s in curriculum if s.get("category") == "honors" and s.get("modules")
    ]

    archetype_weights = [0.25, 0.25, 0.15, 0.15, 0.20]
    profiles = []

    date_delta_days = max(1, (today - semester_start).days)

    for _ in range(count):
        student_id = str(uuid.uuid4())
        archetype = random.choices(ARCHETYPES, weights=archetype_weights)[0]

        # Enrolls in 2 core subjects, 1 elective, and optionally 1 honors
        student_core = random.sample(core_subjects, k=min(2, len(core_subjects)))
        elective = random.choice(elective_subjects) if elective_subjects else None
        honors = random.choice(honors_subjects) if (random.random() < 0.3 and honors_subjects) else None

        enrolled_subjects = {
            "core": student_core,
            "elective": elective,
            "honors": honors,
        }

        enrolled_set = set(student_core)
        if elective:
            enrolled_set.add(elective)
        if honors:
            enrolled_set.add(honors)

        availability = _generate_availability_for_archetype(archetype)

        confidence_ratings = []
        for subj in enrolled_set:
            for u in units_by_subject.get(subj, []):
                # 80% chance student has rated confidence for a unit
                if random.random() < 0.8:
                    rating = _sample_confidence_rating(archetype)
                    days_ago = random.randint(0, date_delta_days)
                    rating_date = semester_start + timedelta(days=days_ago)
                    confidence_ratings.append((u["unit_id"], rating, rating_date))

        profiles.append({
            "student_id": student_id,
            "archetype": archetype,
            "enrolled_subjects": enrolled_subjects,
            "availability": availability,
            "confidence_ratings": confidence_ratings,
        })

    return profiles


def generate_synthetic_students_sql(profiles: list[dict]) -> str:
    """Generates SQL INSERT statements matching database migrations."""
    statements: list[str] = []
    for profile in profiles:
        sid = profile["student_id"]
        short_id = sid[:8]
        statements.append(
            f"insert into students (id, display_name) values ('{sid}', 'synthetic_{short_id}');"
        )
        for a in profile["availability"]:
            if a["hours_available"] > 0:
                dow = a["day_of_week"]
                hrs = a["hours_available"]
                statements.append(
                    f"insert into availability (student_id, day_of_week, hours_available) values ('{sid}', {dow}, {hrs});"
                )
    return "\n".join(statements) + "\n"


def main():
    project_root = Path(__file__).resolve().parents[2]
    curriculum_dir = project_root / "database" / "seed" / "curriculum"

    combined_curriculum = []
    for fname in ["core_subjects.json", "electives.json", "honors.json"]:
        p = curriculum_dir / fname
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    combined_curriculum.extend(data)
                elif isinstance(data, dict):
                    combined_curriculum.append(data)

    random.seed(42)
    profiles = generate_profiles(
        count=15,
        curriculum=combined_curriculum,
        semester_start=date(2026, 8, 1),
        today=date(2026, 9, 5),
    )

    sql_content = generate_synthetic_students_sql(profiles)

    # Save to database/datasets/synthetic_students_seed.sql
    out_dir = project_root / "database" / "datasets"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "synthetic_students_seed.sql"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"Generated synthetic students SQL at: {out_path}")


if __name__ == "__main__":
    main()
