"""
backend/app/services/engine_bridge.py

Translation bridge between SQLite ORM models and the pure Python
Alpine Adaptive Engine (engine.models.PlanRequest, build_schedule, rebuild_schedule).
"""

from __future__ import annotations

from datetime import date
from sqlalchemy.orm import Session

from app.db import models
from engine.models import (
    AssessmentPhase,
    Availability as EngineAvailability,
    ConfidenceRating as EngineConfidenceRating,
    ExamDate as EngineExamDate,
    ExamType as EngineExamType,
    MemoryState,
    PlanRequest,
    SchedulableUnit,
    ScheduleEntry as EngineScheduleEntry,
)
from engine.scheduler.adaptive import rebuild_schedule
from engine.scheduler.baseline import build_schedule


class EngineBridge:
    @staticmethod
    def build_plan_request(
        student_id: str,
        db: Session,
        start_date: date,
    ) -> PlanRequest:
        """
        Queries all curriculum, availability, confidence, and exam date rows
        for the student from SQLite and transforms them into an engine PlanRequest.
        """
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise ValueError(f"Student with id '{student_id}' does not exist.")

        enrolled_subject_ids = [e.subject_id for e in student.enrollments]
        if not enrolled_subject_ids:
            return PlanRequest(
                student_id=student_id,
                units=[],
                confidence=[],
                availability=[],
                exam_dates=[],
                start_date=start_date,
            )

        # 1. Query Modules & Topics for enrolled subjects in curriculum order
        modules = (
            db.query(models.Module)
            .filter(models.Module.subject_id.in_(enrolled_subject_ids))
            .order_by(models.Module.order_index.asc())
            .all()
        )

        # Query topic-level dependencies
        dependencies = db.query(models.TopicDependency).all()
        topic_dep_map: dict[str, list[str]] = {}
        for dep in dependencies:
            topic_dep_map.setdefault(dep.topic_id, []).append(dep.depends_on_topic_id)

        # Map to find the leaf unit of each topic (for prerequisite resolution)
        topic_last_leaf_map: dict[str, str] = {}
        units: list[SchedulableUnit] = []

        for mod in modules:
            sorted_topics = sorted(mod.topics, key=lambda t: t.order_index)
            for top in sorted_topics:
                # Prerequisite topic IDs
                prereq_topic_ids = topic_dep_map.get(top.id, [])

                if top.subtopics:
                    sorted_subtopics = sorted(top.subtopics, key=lambda s: s.order_index)
                    prev_sub_unit_id: str | None = None

                    for idx, sub in enumerate(sorted_subtopics):
                        unit_id = f"subtopic:{sub.id}"
                        if idx == 0:
                            # First subtopic depends on the last leaf units of prerequisite topics
                            deps = [
                                topic_last_leaf_map[pt_id]
                                for pt_id in prereq_topic_ids
                                if pt_id in topic_last_leaf_map
                            ]
                        else:
                            # Subsequent subtopics depend on the immediately preceding subtopic
                            deps = [prev_sub_unit_id] if prev_sub_unit_id else []

                        units.append(
                            SchedulableUnit(
                                unit_id=unit_id,
                                topic_id=top.id,
                                subtopic_id=sub.id,
                                subject_id=mod.subject_id,
                                module_id=mod.id,
                                name=sub.name,
                                order_index=sub.order_index,
                                est_difficulty=max(1, top.est_difficulty - 1),
                                est_hours=sub.est_hours,
                                depends_on=deps,
                                assessment_phase=AssessmentPhase(mod.assessment_phase),
                            )
                        )
                        prev_sub_unit_id = unit_id

                    # The last subtopic represents the completion of this topic
                    topic_last_leaf_map[top.id] = f"subtopic:{sorted_subtopics[-1].id}"
                else:
                    unit_id = f"topic:{top.id}"
                    deps = [
                        topic_last_leaf_map[pt_id]
                        for pt_id in prereq_topic_ids
                        if pt_id in topic_last_leaf_map
                    ]
                    units.append(
                        SchedulableUnit(
                            unit_id=unit_id,
                            topic_id=top.id,
                            subtopic_id=None,
                            subject_id=mod.subject_id,
                            module_id=mod.id,
                            name=top.name,
                            order_index=top.order_index,
                            est_difficulty=top.est_difficulty,
                            est_hours=top.est_hours,
                            depends_on=deps,
                            assessment_phase=AssessmentPhase(mod.assessment_phase),
                        )
                    )
                    topic_last_leaf_map[top.id] = unit_id

        # 2. Query Student Topic Confidence Ratings
        confidence_records = (
            db.query(models.TopicConfidence)
            .filter(models.TopicConfidence.student_id == student_id)
            .all()
        )
        engine_confidence: list[EngineConfidenceRating] = []
        for c in confidence_records:
            uid = f"subtopic:{c.subtopic_id}" if c.subtopic_id else f"topic:{c.topic_id}"
            mem = MemoryState(**c.memory_state) if c.memory_state else None
            engine_confidence.append(
                EngineConfidenceRating(
                    unit_id=uid,
                    rating=c.confidence_rating,
                    last_updated=c.last_updated,
                    memory_state=mem,
                )
            )

        # 3. Query Student Weekly Availability
        availability_records = (
            db.query(models.Availability)
            .filter(models.Availability.student_id == student_id)
            .all()
        )
        engine_availability = [
            EngineAvailability(
                day_of_week=a.day_of_week,
                hours_available=a.hours_available,
            )
            for a in availability_records
        ]

        # 4. Query Exam Deadlines for Enrolled Subjects
        exam_records = (
            db.query(models.ExamDate)
            .filter(models.ExamDate.subject_id.in_(enrolled_subject_ids))
            .all()
        )
        engine_exam_dates = [
            EngineExamDate(
                subject_id=e.subject_id,
                exam_type=EngineExamType(e.exam_type),
                exam_date=e.exam_date,
            )
            for e in exam_records
        ]

        return PlanRequest(
            student_id=student_id,
            units=units,
            confidence=engine_confidence,
            availability=engine_availability,
            exam_dates=engine_exam_dates,
            start_date=start_date,
        )

    @staticmethod
    def _parse_unit_keys(unit_id: str) -> tuple[str, str | None, bool]:
        """
        Parses an engine unit_id into (topic_id, subtopic_id, is_review).
        Handles formats like:
          - "topic:<uuid>"
          - "subtopic:<uuid>"
          - "topic:<uuid>::part1"
          - "review:subtopic:<uuid>:rep2"
        """
        is_review = unit_id.startswith("review:")
        clean_id = unit_id
        if is_review:
            # e.g., review:subtopic:123:rep2 -> subtopic:123
            parts = unit_id.split(":")
            if len(parts) >= 3:
                clean_id = f"{parts[1]}:{parts[2]}"

        # Remove slice parts if present (e.g. ::part1)
        if "::part" in clean_id:
            clean_id = clean_id.split("::part")[0]

        if clean_id.startswith("subtopic:"):
            return "", clean_id.replace("subtopic:", ""), is_review
        elif clean_id.startswith("topic:"):
            return clean_id.replace("topic:", ""), None, is_review
        return clean_id, None, is_review

    @staticmethod
    def generate_baseline_schedule(
        student_id: str,
        db: Session,
        start_date: date,
        auto_slice: bool = True,
        max_time_in_seconds: float = 30.0,
    ) -> list[models.ScheduleEntry]:
        """
        Generates baseline plan, writes ScheduleEntry rows into SQLite,
        and returns the created records.
        """
        plan_req = EngineBridge.build_plan_request(student_id, db, start_date)
        if not plan_req.units:
            return []

        # Run CP-SAT baseline solver
        solved_entries = build_schedule(
            plan_req,
            auto_slice=auto_slice,
            max_time_in_seconds=max_time_in_seconds,
        )

        # Clear any existing planned entries for this student
        db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.student_id == student_id,
            models.ScheduleEntry.status == "planned",
        ).delete()

        # Build subtopic -> topic lookup
        subtopics = db.query(models.Subtopic).all()
        sub_to_topic = {s.id: s.topic_id for s in subtopics}

        created_entries: list[models.ScheduleEntry] = []
        for e in solved_entries:
            top_id, sub_id, is_rev = EngineBridge._parse_unit_keys(e.unit_id)
            if sub_id and not top_id:
                top_id = sub_to_topic.get(sub_id, "")

            entry_row = models.ScheduleEntry(
                student_id=student_id,
                topic_id=top_id,
                subtopic_id=sub_id,
                scheduled_date=e.scheduled_date,
                status=e.status,
                is_review=is_rev or getattr(e, "is_review", False),
            )
            db.add(entry_row)
            created_entries.append(entry_row)

        db.commit()
        return created_entries

    @staticmethod
    def recalculate_adaptive_schedule(
        student_id: str,
        db: Session,
        today: date,
        auto_slice: bool = True,
        spawn_reviews: bool = True,
        max_time_in_seconds: float = 12.0,
    ) -> list[models.ScheduleEntry]:
        """
        Runs adaptive re-planning for student, preserving done entries and
        refreshing planned / review dates in SQLite.
        """
        plan_req = EngineBridge.build_plan_request(student_id, db, today)

        # Query existing schedule entries from SQLite
        existing_rows = (
            db.query(models.ScheduleEntry)
            .filter(models.ScheduleEntry.student_id == student_id)
            .all()
        )

        engine_existing = [
            EngineScheduleEntry(
                unit_id=(
                    f"subtopic:{r.subtopic_id}"
                    if r.subtopic_id
                    else f"topic:{r.topic_id}"
                ),
                scheduled_date=r.scheduled_date,
                status=r.status,
                is_review=r.is_review,
            )
            for r in existing_rows
        ]

        updated_engine_entries = rebuild_schedule(
            request=plan_req,
            existing_entries=engine_existing,
            today=today,
            spawn_reviews=spawn_reviews,
            auto_slice=auto_slice,
            max_time_in_seconds=max_time_in_seconds,
        )

        # Delete existing 'planned' rows (to be replaced by freshly solved entries)
        db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.student_id == student_id,
            models.ScheduleEntry.status == "planned",
        ).delete()

        subtopics = db.query(models.Subtopic).all()
        sub_to_topic = {s.id: s.topic_id for s in subtopics}

        # Insert new planned entries
        new_planned_rows: list[models.ScheduleEntry] = []
        for e in updated_engine_entries:
            if e.status != "planned":
                continue  # 'done' entries already exist in DB

            top_id, sub_id, is_rev = EngineBridge._parse_unit_keys(e.unit_id)
            if sub_id and not top_id:
                top_id = sub_to_topic.get(sub_id, "")

            entry_row = models.ScheduleEntry(
                student_id=student_id,
                topic_id=top_id,
                subtopic_id=sub_id,
                scheduled_date=e.scheduled_date,
                status="planned",
                is_review=is_rev or getattr(e, "is_review", False),
            )
            db.add(entry_row)
            new_planned_rows.append(entry_row)

        db.commit()
        return (
            db.query(models.ScheduleEntry)
            .filter(models.ScheduleEntry.student_id == student_id)
            .order_by(models.ScheduleEntry.scheduled_date.asc())
            .all()
        )
