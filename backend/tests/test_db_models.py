import pytest
from datetime import date, datetime
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.db import models


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database configured with foreign keys and WAL/memory pragma."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def do_connect(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session, engine
    finally:
        session.close()


def test_sqlite_foreign_keys_enabled(in_memory_db):
    session, engine = in_memory_db
    result = session.execute(text("PRAGMA foreign_keys;")).scalar()
    assert result == 1


def test_all_11_tables_created(in_memory_db):
    session, engine = in_memory_db
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "subjects",
        "modules",
        "topics",
        "subtopics",
        "topic_dependencies",
        "students",
        "student_subjects",
        "availability",
        "topic_confidence",
        "schedule_entries",
        "exam_dates",
    }
    assert expected_tables.issubset(table_names)


def test_subject_hierarchy_creation_and_cascade(in_memory_db):
    session, _ = in_memory_db

    subject = models.Subject(
        id="subj-1",
        name="Software Engineering",
        category="core",
        group_name=None,
    )
    session.add(subject)
    session.flush()

    module = models.Module(
        id="mod-1",
        subject_id="subj-1",
        name="Module 1: Introduction",
        order_index=1,
        assessment_phase="UT1",
    )
    session.add(module)
    session.flush()

    topic = models.Topic(
        id="top-1",
        module_id="mod-1",
        name="Waterfall Model",
        order_index=1,
        est_difficulty=2,
        est_hours=1.5,
    )
    session.add(topic)
    session.flush()

    subtopic = models.Subtopic(
        id="sub-1",
        topic_id="top-1",
        name="Phases of Waterfall",
        order_index=1,
        est_hours=0.5,
    )
    session.add(subtopic)
    session.commit()

    # Query back and verify relationships
    queried_subj = session.query(models.Subject).filter_by(id="subj-1").first()
    assert len(queried_subj.modules) == 1
    assert len(queried_subj.modules[0].topics) == 1
    assert len(queried_subj.modules[0].topics[0].subtopics) == 1
    assert queried_subj.modules[0].topics[0].subtopics[0].name == "Phases of Waterfall"

    # Test cascade delete
    session.delete(queried_subj)
    session.commit()
    assert session.query(models.Module).filter_by(id="mod-1").first() is None
    assert session.query(models.Topic).filter_by(id="top-1").first() is None
    assert session.query(models.Subtopic).filter_by(id="sub-1").first() is None


def test_student_profile_and_schedule_entries(in_memory_db):
    session, _ = in_memory_db

    # Setup curriculum
    subject = models.Subject(id="subj-1", name="Database Systems", category="elective", group_name="open_elective")
    module = models.Module(id="mod-1", subject_id="subj-1", name="M1", order_index=1, assessment_phase="UT1")
    topic = models.Topic(id="top-1", module_id="mod-1", name="Indexing", order_index=1, est_difficulty=3, est_hours=2.0)
    session.add_all([subject, module, topic])
    session.flush()

    # Create Student
    student = models.Student(id="stud-1", display_name="Alex (Diligent Strong)")
    session.add(student)
    session.flush()

    # Enrollment
    enrollment = models.StudentSubject(student_id="stud-1", subject_id="subj-1")
    session.add(enrollment)

    # Availability
    avail = models.Availability(student_id="stud-1", day_of_week=0, hours_available=2.5)
    session.add(avail)

    # Topic Confidence with FSRS MemoryState JSON
    mem_dict = {
        "stability": 7.5,
        "difficulty": 2.8,
        "reps": 1,
        "lapses": 0,
        "last_review": "2026-09-01",
    }
    confidence = models.TopicConfidence(
        id="conf-1",
        student_id="stud-1",
        topic_id="top-1",
        subtopic_id=None,
        confidence_rating=4,
        memory_state=mem_dict,
        last_updated=date(2026, 9, 1),
    )
    session.add(confidence)

    # Schedule Entry
    schedule = models.ScheduleEntry(
        id="sched-1",
        student_id="stud-1",
        topic_id="top-1",
        subtopic_id=None,
        scheduled_date=date(2026, 9, 5),
        status="planned",
        is_review=False,
    )
    session.add(schedule)
    session.commit()

    # Verification
    queried_student = session.query(models.Student).filter_by(id="stud-1").first()
    assert len(queried_student.enrollments) == 1
    assert len(queried_student.availability) == 1
    assert len(queried_student.confidence_ratings) == 1
    assert queried_student.confidence_ratings[0].memory_state["stability"] == 7.5
    assert len(queried_student.schedule_entries) == 1
    assert queried_student.schedule_entries[0].status == "planned"

    # Test cascade delete on Student
    session.delete(queried_student)
    session.commit()
    assert session.query(models.StudentSubject).filter_by(student_id="stud-1").first() is None
    assert session.query(models.Availability).filter_by(student_id="stud-1").first() is None
    assert session.query(models.TopicConfidence).filter_by(student_id="stud-1").first() is None
    assert session.query(models.ScheduleEntry).filter_by(student_id="stud-1").first() is None
