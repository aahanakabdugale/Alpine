"""
backend/app/api/v1/curriculum.py

Curriculum explorer endpoints: grouped subjects listing and full syllabus hierarchy tree.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.db import models
from app.schemas.curriculum import (
    SubjectOut,
    SubjectsGrouped,
    SubjectTree,
    ModuleTree,
    TopicTree,
    SubtopicTree,
)

router = APIRouter(prefix="/curriculum", tags=["Curriculum Explorer"])


@router.get("/subjects", response_model=SubjectsGrouped)
def get_grouped_subjects(db: Session = Depends(get_db)):
    """
    Returns all subjects grouped by category ('core', 'electives', 'honors')
    for the student onboarding wizard and course catalogue.
    """
    all_subjects = db.query(models.Subject).order_by(models.Subject.name.asc()).all()

    core = [SubjectOut.model_validate(s) for s in all_subjects if s.category == "core"]
    electives = [SubjectOut.model_validate(s) for s in all_subjects if s.category == "elective"]
    honors = [SubjectOut.model_validate(s) for s in all_subjects if s.category == "honors"]

    return SubjectsGrouped(
        core=core,
        electives=electives,
        honors=honors,
    )


@router.get("/tree", response_model=list[SubjectTree])
def get_curriculum_tree(db: Session = Depends(get_db)):
    """
    Returns the full syllabus hierarchy (Subjects -> Modules -> Topics -> Subtopics)
    with estimated hours, difficulty weights, and prerequisite dependencies.
    """
    # Fetch all dependencies once for fast lookup
    dependencies = db.query(models.TopicDependency).all()
    dep_map: dict[str, list[str]] = {}
    for d in dependencies:
        dep_map.setdefault(d.topic_id, []).append(d.depends_on_topic_id)

    subjects = db.query(models.Subject).order_by(models.Subject.category.asc(), models.Subject.name.asc()).all()
    result_tree: list[SubjectTree] = []

    for s in subjects:
        modules_tree: list[ModuleTree] = []
        sorted_modules = sorted(s.modules, key=lambda m: m.order_index)

        for m in sorted_modules:
            topics_tree: list[TopicTree] = []
            sorted_topics = sorted(m.topics, key=lambda t: t.order_index)

            for t in sorted_topics:
                subtopics_tree = [
                    SubtopicTree(
                        id=st.id,
                        name=st.name,
                        order_index=st.order_index,
                        est_hours=st.est_hours,
                    )
                    for st in sorted(t.subtopics, key=lambda sub: sub.order_index)
                ]

                topics_tree.append(
                    TopicTree(
                        id=t.id,
                        name=t.name,
                        order_index=t.order_index,
                        est_difficulty=t.est_difficulty,
                        est_hours=t.est_hours,
                        depends_on=dep_map.get(t.id, []),
                        subtopics=subtopics_tree,
                    )
                )

            modules_tree.append(
                ModuleTree(
                    id=m.id,
                    name=m.name,
                    order_index=m.order_index,
                    assessment_phase=m.assessment_phase,
                    topics=topics_tree,
                )
            )

        result_tree.append(
            SubjectTree(
                id=s.id,
                name=s.name,
                category=s.category,
                group_name=s.group_name,
                modules=modules_tree,
            )
        )

    return result_tree
