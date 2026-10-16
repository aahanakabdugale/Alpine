"""
backend/app/schemas/schedule.py

Pydantic schemas for schedule calendar, today's dashboard, check-in, and progress metrics.
"""

from __future__ import annotations

from datetime import date
from pydantic import BaseModel, ConfigDict, Field


class ScheduleEntryOut(BaseModel):
    id: str
    student_id: str
    topic_id: str
    subtopic_id: str | None = None
    scheduled_date: date
    status: str
    is_review: bool
    title: str = ""
    topic_name: str | None = None
    subtopic_name: str | None = None
    subject_id: str | None = None
    subject_name: str | None = None
    module_id: str | None = None
    module_name: str | None = None
    assessment_phase: str | None = None
    est_hours: float | None = None
    est_difficulty: int | None = None
    is_overrun: bool = False
    is_overdue: bool = False

    model_config = ConfigDict(from_attributes=True)


class ExamCountdownItem(BaseModel):
    subject_id: str
    subject_name: str
    exam_type: str
    exam_date: date
    days_remaining: int


class MemoryHealthStats(BaseModel):
    fresh_count: int = 0
    fading_count: int = 0
    review_count: int = 0


class TodayScheduleResponse(BaseModel):
    date: date
    scheduled_hours: float
    available_hours: float
    tasks: list[ScheduleEntryOut]
    exam_countdowns: list[ExamCountdownItem]
    triage_warning: bool = False
    overrun_units_count: int = 0
    triage_message: str | None = None
    memory_health: MemoryHealthStats = Field(default_factory=MemoryHealthStats)


class CheckInRequest(BaseModel):
    unit_id: str = Field(..., description="Unit identifier (e.g. 'subtopic:<id>' or 'topic:<id>')")
    status: str = Field(default="done", description="Updated status, typically 'done'")
    confidence_rating: int = Field(..., ge=1, le=5, description="FSRS Confidence rating: 1 (Forgot) to 5 (Mastered)")


class CheckInResponse(BaseModel):
    message: str = "Check-in logged and schedule dynamically adapted"
    unit_id: str
    stability_days: float
    retrievability: float
    recalculated_units_count: int


class ProgressSubjectStats(BaseModel):
    subject_id: str
    subject_name: str
    completed_units: int
    total_units: int
    completion_percentage: float


class ProgressResponse(BaseModel):
    overall_completed_units: int
    overall_total_units: int
    overall_completion_percentage: float
    subjects: list[ProgressSubjectStats]
