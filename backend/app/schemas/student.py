"""
backend/app/schemas/student.py

Pydantic schemas for student profile switcher, onboarding, and availability.
"""

from __future__ import annotations

from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field


class StudentSummary(BaseModel):
    id: str
    display_name: str
    enrolled_subjects_count: int
    completed_units: int
    total_units: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100, description="Display name for the student")


class StudentCreateResponse(BaseModel):
    id: str
    display_name: str
    message: str = "Profile created successfully. Proceed to onboarding."


class DailyAvailabilityItem(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, ..., 6=Sunday")
    hours_available: float = Field(..., ge=0.0, le=24.0, description="Study hours available on this day")


class StudentOnboardRequest(BaseModel):
    student_id: str | None = Field(default=None, description="Optional student ID; falls back to active student")
    elective_id: str = Field(..., description="Chosen elective subject ID")
    honors_id: str | None = Field(default=None, description="Optional chosen honors subject ID")
    availability: list[DailyAvailabilityItem] = Field(..., min_length=7, max_length=7, description="7-day weekly availability matrix")
    start_date: date = Field(default_factory=date.today, description="Semester or study start date")


class StudentOnboardResponse(BaseModel):
    message: str = "Onboarding complete and study plan generated"
    student_id: str
    total_scheduled_units: int


class StudentAvailabilityUpdate(BaseModel):
    availability: list[DailyAvailabilityItem] = Field(..., min_length=7, max_length=7)


class SubjectMinimal(BaseModel):
    id: str
    name: str
    category: str
    group_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentProfileOut(BaseModel):
    id: str
    display_name: str
    created_at: datetime
    enrolled_subjects: list[SubjectMinimal]
    availability: list[DailyAvailabilityItem]

    model_config = ConfigDict(from_attributes=True)
