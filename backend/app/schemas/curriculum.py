"""
backend/app/schemas/curriculum.py

Pydantic schemas for curriculum explorer and syllabus hierarchy tree.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SubjectOut(BaseModel):
    id: str
    name: str
    category: str
    group_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SubjectsGrouped(BaseModel):
    core: list[SubjectOut]
    electives: list[SubjectOut]
    honors: list[SubjectOut]


class SubtopicTree(BaseModel):
    id: str
    name: str
    order_index: int
    est_hours: float

    model_config = ConfigDict(from_attributes=True)


class TopicTree(BaseModel):
    id: str
    name: str
    order_index: int
    est_difficulty: int
    est_hours: float
    depends_on: list[str] = []
    subtopics: list[SubtopicTree] = []

    model_config = ConfigDict(from_attributes=True)


class ModuleTree(BaseModel):
    id: str
    name: str
    order_index: int
    assessment_phase: str
    topics: list[TopicTree] = []

    model_config = ConfigDict(from_attributes=True)


class SubjectTree(BaseModel):
    id: str
    name: str
    category: str
    group_name: str | None = None
    modules: list[ModuleTree] = []

    model_config = ConfigDict(from_attributes=True)
