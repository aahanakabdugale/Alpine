import pytest
from datetime import date
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_active_student
from app.db import models
from app.db.init_db import init_database_if_empty, seed_curriculum, seed_exam_dates, seed_demo_profiles
from app.db.session import Base


@pytest.fixture
def test_db_session():
    """Create an isolated in-memory database for testing init_db and dependencies."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()
    try:
        yield session, test_engine
    finally:
        session.close()


def test_seed_curriculum_and_exam_dates(test_db_session):
    session, _ = test_db_session

    subject_map = seed_curriculum(session)
    assert len(subject_map) > 0
    assert "Software Engineering and Agile Practices" in subject_map
    assert "Advanced Database Technologies" in subject_map

    # Check modules and topics were inserted
    se_subj = subject_map["Software Engineering and Agile Practices"]
    assert len(se_subj.modules) > 0
    first_mod = se_subj.modules[0]
    assert len(first_mod.topics) > 0

    # Seed exam dates
    seed_exam_dates(session, subject_map)
    exam_dates = session.query(models.ExamDate).filter_by(subject_id=se_subj.id).all()
    assert len(exam_dates) >= 2


def test_seed_demo_profiles_generates_schedules(test_db_session):
    session, _ = test_db_session
    subject_map = seed_curriculum(session)
    seed_exam_dates(session, subject_map)

    # Seed demo students
    seed_demo_profiles(session, subject_map)

    # Verify demo students exist
    students = session.query(models.Student).all()
    student_ids = {s.id for s in students}
    assert {"demo-alex", "demo-maya", "demo-sam"}.issubset(student_ids)

    # Verify schedules were generated for Alex
    alex_entries = session.query(models.ScheduleEntry).filter_by(student_id="demo-alex").all()
    assert len(alex_entries) > 0

    # Verify done entry and confidence rating for Alex
    done_entry = next((e for e in alex_entries if e.status == "done"), None)
    assert done_entry is not None
    alex_conf = session.query(models.TopicConfidence).filter_by(student_id="demo-alex").first()
    assert alex_conf is not None
    assert alex_conf.confidence_rating == 5
    assert alex_conf.memory_state is not None
    assert alex_conf.memory_state["stability"] == 8.0


def test_get_active_student_with_header(test_db_session):
    session, _ = test_db_session
    s1 = models.Student(id="s1", display_name="Student 1")
    s2 = models.Student(id="s2", display_name="Student 2")
    session.add_all([s1, s2])
    session.commit()

    # Pass explicit header for s2
    active = get_active_student(x_student_id="s2", db=session)
    assert active.id == "s2"
    assert active.display_name == "Student 2"


def test_get_active_student_fallback_when_header_none(test_db_session):
    session, _ = test_db_session
    s1 = models.Student(id="s1", display_name="First Student")
    s2 = models.Student(id="s2", display_name="Second Student")
    session.add_all([s1, s2])
    session.commit()

    # Pass None as header -> Should fallback to s1
    active = get_active_student(x_student_id=None, db=session)
    assert active.id == "s1"
    assert active.display_name == "First Student"


def test_get_active_student_not_found(test_db_session):
    session, _ = test_db_session
    s1 = models.Student(id="s1", display_name="Student 1")
    session.add(s1)
    session.commit()

    # Non-existent ID -> 404
    with pytest.raises(HTTPException) as exc_info:
        get_active_student(x_student_id="non-existent-id", db=session)
    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail


def test_get_active_student_empty_database(test_db_session):
    session, _ = test_db_session
    # 0 students in database -> 404
    with pytest.raises(HTTPException) as exc_info:
        get_active_student(x_student_id=None, db=session)
    assert exc_info.value.status_code == 404
    assert "No student profiles found" in exc_info.value.detail
