"""
Shared data models for the adaptive engine.

These are plain pydantic models -- the engine has ZERO dependency on
Postgres/Supabase/FastAPI. Member C's backend is responsible for reading
rows out of the database and constructing these objects before calling
into the engine, then writing the returned ScheduleEntry list back out.
This keeps the engine independently testable (see tests/) and reusable
even if the storage layer changes later.
"""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AssessmentPhase(str, Enum):
    UT1 = "UT1"
    UT2 = "UT2"


class ExamType(str, Enum):
    UT1 = "UT1"
    UT2 = "UT2"
    END_SEM = "end_sem"


class MemoryState(BaseModel):
    stability: float = Field(default=1.0, gt=0)  # Time in days for retrievability to drop to 90%
    difficulty: float = Field(default=3.0, ge=1.0, le=5.0)  # Inherent topic difficulty for student (1.0 - 5.0)
    reps: int = Field(default=0, ge=0)  # Number of successful review repetitions
    lapses: int = Field(default=0, ge=0)  # Number of times forgotten (rating < 3)
    last_review: date


class SchedulableUnit(BaseModel):
    """
    A topic OR a subtopic -- whichever is the leaf-level unit for a given
    topic, per the PRD's fallback rule:
      - topic HAS subtopics  -> each subtopic becomes its own SchedulableUnit
      - topic HAS NO subtopics -> the topic itself is the unit (subtopic_id is None)

    Building this list correctly from the raw DB rows is the one piece of
    "translation" logic Member C's backend needs to do before calling the
    engine -- everything downstream in the engine just deals with a flat
    list of units and doesn't care whether each one came from a topic or
    a subtopic.
    """

    unit_id: str  # stable id, e.g. "subtopic:45" or "topic:12"
    topic_id: str
    subtopic_id: Optional[str] = None
    subject_id: str
    module_id: str
    name: str
    order_index: int
    est_difficulty: int = Field(ge=1, le=5)
    est_hours: float = Field(gt=0)
    depends_on: list[str] = Field(default_factory=list)  # unit_ids of prerequisites
    assessment_phase: AssessmentPhase
    is_review: bool = False
    parent_unit_id: Optional[str] = None
    slice_index: Optional[int] = None
    total_slices: Optional[int] = None


class ConfidenceRating(BaseModel):
    unit_id: str
    rating: int = Field(ge=1, le=5)
    last_updated: date
    memory_state: Optional[MemoryState] = None


class Availability(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0 = Monday ... 6 = Sunday
    hours_available: float = Field(ge=0)


class ExamDate(BaseModel):
    subject_id: str
    exam_type: ExamType
    exam_date: date


class ScheduleEntry(BaseModel):
    unit_id: str
    scheduled_date: date
    status: str = "planned"  # planned | done | skipped
    is_review: bool = False


class PlanRequest(BaseModel):
    """Everything the engine needs in one shot to build/refresh a plan for one student."""

    student_id: str
    units: list[SchedulableUnit]
    confidence: list[ConfidenceRating]
    availability: list[Availability]
    exam_dates: list[ExamDate]
    start_date: date