"""
SQLAlchemy 2.0 Declarative Models for Alpine.
Directly maps the 11 relational tables for curriculum hierarchy,
student profiles, availability, confidence tracking, and schedule entries.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


def gen_uuid() -> str:
    """Generate stringified UUID4 for primary keys."""
    return str(uuid.uuid4())


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    category = Column(
        String,
        CheckConstraint("category IN ('core', 'elective', 'honors')"),
        nullable=False,
    )
    group_name = Column(String, nullable=True)  # 'open_elective', 'honors', or None

    modules = relationship("Module", back_populates="subject", cascade="all, delete-orphan")
    exam_dates = relationship("ExamDate", back_populates="subject", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, default=gen_uuid)
    subject_id = Column(String, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    assessment_phase = Column(
        String,
        CheckConstraint("assessment_phase IN ('UT1', 'UT2')"),
        nullable=False,
    )

    subject = relationship("Subject", back_populates="modules")
    topics = relationship("Topic", back_populates="module", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String, primary_key=True, default=gen_uuid)
    module_id = Column(String, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    est_difficulty = Column(
        Integer,
        CheckConstraint("est_difficulty BETWEEN 1 AND 5"),
        default=3,
        nullable=False,
    )
    est_hours = Column(Float, default=1.0, nullable=False)

    module = relationship("Module", back_populates="topics")
    subtopics = relationship("Subtopic", back_populates="topic", cascade="all, delete-orphan")


class Subtopic(Base):
    __tablename__ = "subtopics"

    id = Column(String, primary_key=True, default=gen_uuid)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False)
    est_hours = Column(Float, default=0.5, nullable=False)

    topic = relationship("Topic", back_populates="subtopics")


class TopicDependency(Base):
    __tablename__ = "topic_dependencies"

    topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)
    depends_on_topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (
        CheckConstraint("topic_id != depends_on_topic_id", name="ck_no_self_dependency"),
    )


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=gen_uuid)
    display_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    enrollments = relationship("StudentSubject", back_populates="student", cascade="all, delete-orphan")
    availability = relationship("Availability", back_populates="student", cascade="all, delete-orphan")
    confidence_ratings = relationship("TopicConfidence", back_populates="student", cascade="all, delete-orphan")
    schedule_entries = relationship("ScheduleEntry", back_populates="student", cascade="all, delete-orphan")


class StudentSubject(Base):
    __tablename__ = "student_subjects"

    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(String, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject")


class Availability(Base):
    __tablename__ = "availability"

    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    day_of_week = Column(
        Integer,
        CheckConstraint("day_of_week BETWEEN 0 AND 6"),
        primary_key=True,
    )  # 0 = Monday ... 6 = Sunday
    hours_available = Column(
        Float,
        CheckConstraint("hours_available >= 0"),
        nullable=False,
    )

    student = relationship("Student", back_populates="availability")


class TopicConfidence(Base):
    __tablename__ = "topic_confidence"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    subtopic_id = Column(String, ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=True)
    confidence_rating = Column(
        Integer,
        CheckConstraint("confidence_rating BETWEEN 1 AND 5"),
        nullable=False,
    )
    memory_state = Column(JSON, nullable=True)  # Serialized MemoryState (S, D, reps, lapses)
    last_updated = Column(Date, default=date.today, nullable=False)

    student = relationship("Student", back_populates="confidence_ratings")
    topic = relationship("Topic")
    subtopic = relationship("Subtopic")

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", "subtopic_id", name="uq_confidence_unit"),
    )


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(String, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    subtopic_id = Column(String, ForeignKey("subtopics.id", ondelete="CASCADE"), nullable=True)
    scheduled_date = Column(Date, nullable=False, index=True)
    status = Column(
        String,
        CheckConstraint("status IN ('planned', 'done', 'skipped')"),
        default="planned",
        nullable=False,
    )
    is_review = Column(Boolean, default=False, nullable=False)

    student = relationship("Student", back_populates="schedule_entries")
    topic = relationship("Topic")
    subtopic = relationship("Subtopic")


class ExamDate(Base):
    __tablename__ = "exam_dates"

    subject_id = Column(String, ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True)
    exam_type = Column(
        String,
        CheckConstraint("exam_type IN ('UT1', 'UT2', 'end_sem')"),
        primary_key=True,
    )
    exam_date = Column(Date, nullable=False)

    subject = relationship("Subject", back_populates="exam_dates")
