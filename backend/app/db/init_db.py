"""
backend/app/db/init_db.py

Automatic database initialization and demo profile seeding on startup.
Populates curriculum hierarchy from JSON seeds, loads exam dates, and
pre-seeds realistic demo students (Alex, Maya, Sam) with generated study plans.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import models
from app.db.session import Base, SessionLocal, engine
from app.services.engine_bridge import EngineBridge

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CURRICULUM_DIR = PROJECT_ROOT / "database" / "seed" / "curriculum"

TYPE_DEFAULTS = {
    "concept": (0.5, 1),
    "problem_solving": (0.75, 2),
    "derivation": (1.0, 2),
    "coding": (1.0, 2),
}


def _load_json(file_path: Path):
    if not file_path.exists():
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_curriculum(db: Session) -> dict[str, models.Subject]:
    """Ingests core, elective, and honors subjects from JSON into SQLite."""
    subject_map: dict[str, models.Subject] = {}

    curriculum_files = [
        CURRICULUM_DIR / "core_subjects.json",
        CURRICULUM_DIR / "electives.json",
        CURRICULUM_DIR / "honors.json",
    ]

    for file_path in curriculum_files:
        data = _load_json(file_path)
        if not data:
            continue

        subjects_data = data if isinstance(data, list) else [data]

        for s_data in subjects_data:
            subject_name = s_data["name"]
            subject = models.Subject(
                name=subject_name,
                category=s_data.get("category", "core"),
                group_name=s_data.get("group_name"),
            )
            db.add(subject)
            db.flush()
            subject_map[subject_name] = subject

            prev_topic_id: str | None = None
            modules_data = s_data.get("modules", [])

            for mod_idx, m_data in enumerate(modules_data):
                module_name = m_data.get("name", f"Module {mod_idx + 1}")
                phase = m_data.get("phase")
                if not phase:
                    phase = "UT1" if mod_idx < 3 else "UT2"

                module = models.Module(
                    subject_id=subject.id,
                    name=module_name,
                    order_index=mod_idx + 1,
                    assessment_phase=phase,
                )
                db.add(module)
                db.flush()

                for top_idx, t_data in enumerate(m_data.get("topics", [])):
                    topic_name = t_data["name"]
                    topic_type = t_data.get("type", "concept")
                    base_hours, base_diff = TYPE_DEFAULTS.get(topic_type, (0.75, 2))

                    topic = models.Topic(
                        module_id=module.id,
                        name=topic_name,
                        order_index=top_idx + 1,
                        est_difficulty=base_diff,
                        est_hours=base_hours,
                    )
                    db.add(topic)
                    db.flush()

                    # Sequential prerequisite chaining within each subject
                    if prev_topic_id is not None:
                        dep = models.TopicDependency(
                            topic_id=topic.id,
                            depends_on_topic_id=prev_topic_id,
                        )
                        db.add(dep)
                    prev_topic_id = topic.id

                    # Subtopics
                    subtopics = t_data.get("subtopics", [])
                    if subtopics:
                        hours_per_sub = max(0.25, round(base_hours / len(subtopics), 2))
                        for sub_idx, sub_name in enumerate(subtopics):
                            subtopic = models.Subtopic(
                                topic_id=topic.id,
                                name=sub_name,
                                order_index=sub_idx + 1,
                                est_hours=hours_per_sub,
                            )
                            db.add(subtopic)

    db.commit()
    return subject_map


def seed_exam_dates(db: Session, subject_map: dict[str, models.Subject]):
    """Ingests exam deadlines from exam_dates.json."""
    exam_file = CURRICULUM_DIR / "exam_dates.json"
    data = _load_json(exam_file)
    if not data or not isinstance(data, dict):
        return

    for subject_name, dates in data.items():
        subject = subject_map.get(subject_name)
        if not subject:
            continue

        for exam_type, date_str in dates.items():
            if not date_str:
                continue
            exam_date = models.ExamDate(
                subject_id=subject.id,
                exam_type=exam_type,
                exam_date=date.fromisoformat(date_str),
            )
            db.add(exam_date)

    db.commit()


def seed_demo_profiles(db: Session, subject_map: dict[str, models.Subject]):
    """Creates realistic demo student profiles with generated schedules."""
    # Group available subjects
    core_subjects = [s for s in subject_map.values() if s.category == "core"]
    adt_elective = subject_map.get("Advanced Database Technologies")
    cs_elective = subject_map.get("Cyber Security")
    math_honors = subject_map.get("Mathematics for AI & ML")
    eth_honors = subject_map.get("Ethical Hacking")

    start_date = date(2026, 9, 1)

    def _enroll_unique(student_id: str, subjects_to_enroll: list[models.Subject | None]):
        seen_ids = set()
        for subj in subjects_to_enroll:
            if subj and subj.id not in seen_ids:
                db.add(models.StudentSubject(student_id=student_id, subject_id=subj.id))
                seen_ids.add(subj.id)

    # -------------------------------------------------------------------------
    # 1. Profile 1: Alex (Diligent Strong)
    # -------------------------------------------------------------------------
    alex = models.Student(id="demo-alex", display_name="Alex (Diligent Strong)")
    db.add(alex)
    db.flush()

    _enroll_unique(alex.id, core_subjects + [adt_elective, math_honors])

    # Alex availability: 3.0h Mon-Fri, 4.0h Sat-Sun
    for dow in range(7):
        hours = 4.0 if dow in (5, 6) else 3.0
        db.add(models.Availability(student_id=alex.id, day_of_week=dow, hours_available=hours))
    db.commit()

    EngineBridge.generate_baseline_schedule(alex.id, db, start_date)

    # Simulate completed topic with high retention
    first_entry = (
        db.query(models.ScheduleEntry)
        .filter(models.ScheduleEntry.student_id == alex.id)
        .order_by(models.ScheduleEntry.scheduled_date.asc())
        .first()
    )
    if first_entry:
        first_entry.status = "done"
        db.add(
            models.TopicConfidence(
                student_id=alex.id,
                topic_id=first_entry.topic_id,
                subtopic_id=first_entry.subtopic_id,
                confidence_rating=5,
                memory_state={
                    "stability": 8.0,
                    "difficulty": 2.4,
                    "reps": 1,
                    "lapses": 0,
                    "last_review": str(start_date),
                },
                last_updated=start_date,
            )
        )
        db.commit()

    # -------------------------------------------------------------------------
    # 2. Profile 2: Maya (Steady Average)
    # -------------------------------------------------------------------------
    maya = models.Student(id="demo-maya", display_name="Maya (Steady Average)")
    db.add(maya)
    db.flush()

    _enroll_unique(maya.id, core_subjects + [cs_elective, eth_honors])

    # Maya availability: 2.0h Mon-Fri, 3.0h Sat-Sun
    for dow in range(7):
        hours = 3.0 if dow in (5, 6) else 2.0
        db.add(models.Availability(student_id=maya.id, day_of_week=dow, hours_available=hours))
    db.commit()

    EngineBridge.generate_baseline_schedule(maya.id, db, start_date)

    # -------------------------------------------------------------------------
    # 3. Profile 3: Sam (Crammer)
    # -------------------------------------------------------------------------
    sam = models.Student(id="demo-sam", display_name="Sam (Crammer)")
    db.add(sam)
    db.flush()

    _enroll_unique(sam.id, core_subjects + [adt_elective])

    # Sam availability: Low on weekdays (0.5h - 1.0h), heavy on weekends (4.0h)
    for dow in range(7):
        hours = 4.0 if dow in (5, 6) else (1.0 if dow == 4 else 0.5)
        db.add(models.Availability(student_id=sam.id, day_of_week=dow, hours_available=hours))
    db.commit()

    EngineBridge.generate_baseline_schedule(sam.id, db, start_date)


def init_database_if_empty(session: Session | None = None) -> bool:
    """
    Checks if SQLite database is initialized. If empty, creates tables and seeds
    curriculum and demo student profiles. Returns True if seeded, False if already present.
    """
    Base.metadata.create_all(bind=engine)
    db = session or SessionLocal()
    close_when_done = session is None

    try:
        # Check if subjects already exist
        if db.query(models.Subject).count() > 0:
            return False

        print("[INFO] Initializing SQLite database from curriculum seeds...")
        subject_map = seed_curriculum(db)
        seed_exam_dates(db, subject_map)
        print("[INFO] Seeding demo student profiles (Alex, Maya, Sam)...")
        seed_demo_profiles(db, subject_map)
        print("[SUCCESS] Database successfully initialized with curriculum and demo profiles.")
        return True
    finally:
        if close_when_done:
            db.close()


if __name__ == "__main__":
    init_database_if_empty()
