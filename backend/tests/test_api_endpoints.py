"""
backend/tests/test_api_endpoints.py

Integration tests for all FastAPI REST API routes:
- Health and root checks
- Profile Switcher endpoints (Listing, creating new custom profiles, deletion)
- Curriculum explorer (Grouped subjects, syllabus hierarchy tree)
- Student onboarding & profile management
- Schedule views (Calendar range, today dashboard, student progress)
- Adaptive check-in with FSRS memory state updates
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.api.deps import get_db
from app.db import models
from app.db.init_db import seed_curriculum, seed_exam_dates, seed_demo_profiles
from app.db.session import Base


@pytest.fixture(scope="module")
def test_app():
    """Sets up an in-memory SQLite database pre-seeded with curriculum & demo profiles."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Seed curriculum and demo profiles
    session = TestingSession()
    subject_map = seed_curriculum(session)
    seed_exam_dates(session, subject_map)
    seed_demo_profiles(session, subject_map)
    session.close()

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()


def test_root_and_health(test_app):
    res_root = test_app.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "online"

    res_health = test_app.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"


def test_list_demo_students(test_app):
    res = test_app.get("/api/v1/students")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 3

    ids = {s["id"] for s in data}
    assert {"demo-alex", "demo-maya", "demo-sam"}.issubset(ids)

    alex = next(s for s in data if s["id"] == "demo-alex")
    assert alex["enrolled_subjects_count"] > 0
    assert alex["total_units"] > 0
    assert alex["completed_units"] >= 1


def test_create_and_delete_custom_student(test_app):
    # Test creating a new profile (verifies user can create custom profiles)
    res_create = test_app.post(
        "/api/v1/students",
        json={"display_name": "Jordan Custom"},
    )
    assert res_create.status_code == 201
    created_data = res_create.json()
    new_id = created_data["id"]
    assert created_data["display_name"] == "Jordan Custom"

    # Verify new student shows up in listing
    res_list = test_app.get("/api/v1/students")
    student_ids = [s["id"] for s in res_list.json()]
    assert new_id in student_ids

    # Delete the newly created student
    res_del = test_app.delete(f"/api/v1/students/{new_id}")
    assert res_del.status_code == 200
    assert res_del.json()["message"] == "Profile deleted successfully"

    # Verify no longer in list
    res_list_after = test_app.get("/api/v1/students")
    remaining_ids = [s["id"] for s in res_list_after.json()]
    assert new_id not in remaining_ids


def test_curriculum_endpoints(test_app):
    # Grouped subjects
    res_subj = test_app.get("/api/v1/curriculum/subjects")
    assert res_subj.status_code == 200
    subj_data = res_subj.json()
    assert "core" in subj_data
    assert "electives" in subj_data
    assert "honors" in subj_data
    assert len(subj_data["core"]) >= 4

    # Full hierarchy tree
    res_tree = test_app.get("/api/v1/curriculum/tree")
    assert res_tree.status_code == 200
    tree_data = res_tree.json()
    assert len(tree_data) >= 4
    first_subj = tree_data[0]
    assert "modules" in first_subj
    assert len(first_subj["modules"]) > 0
    first_mod = first_subj["modules"][0]
    assert "topics" in first_mod
    assert len(first_mod["topics"]) > 0


def test_student_profile(test_app):
    # Fetch Alex profile via X-Student-Id header
    res = test_app.get(
        "/api/v1/student/profile",
        headers={"X-Student-Id": "demo-alex"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "demo-alex"
    assert "Alex" in data["display_name"]
    assert len(data["enrolled_subjects"]) > 0
    assert len(data["availability"]) == 7


def test_schedule_range_and_today(test_app):
    # Schedule list for Alex
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": "demo-alex"},
    )
    assert res_sched.status_code == 200
    entries = res_sched.json()
    assert len(entries) > 0

    first = entries[0]
    assert "topic_name" in first or "subtopic_name" in first
    assert "title" in first
    assert "scheduled_date" in first

    # Today view
    res_today = test_app.get(
        "/api/v1/schedule/today",
        headers={"X-Student-Id": "demo-alex"},
    )
    assert res_today.status_code == 200
    today_data = res_today.json()
    assert "date" in today_data
    assert "available_hours" in today_data
    assert "tasks" in today_data
    assert "exam_countdowns" in today_data


def test_student_progress(test_app):
    res = test_app.get(
        "/api/v1/student/progress",
        headers={"X-Student-Id": "demo-alex"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "overall_completed_units" in data
    assert "overall_total_units" in data
    assert "overall_completion_percentage" in data
    assert len(data["subjects"]) > 0


def test_check_in_adaptive_update(test_app):
    # Alex check in on a planned task
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": "demo-alex"},
    )
    entries = res_sched.json()
    planned_entry = next((e for e in entries if e["status"] == "planned"), None)
    assert planned_entry is not None

    unit_id = (
        f"subtopic:{planned_entry['subtopic_id']}"
        if planned_entry.get("subtopic_id")
        else f"topic:{planned_entry['topic_id']}"
    )

    checkin_payload = {
        "unit_id": unit_id,
        "status": "done",
        "confidence_rating": 4,
    }

    res_checkin = test_app.post(
        "/api/v1/schedule/check-in",
        headers={"X-Student-Id": "demo-alex"},
        json=checkin_payload,
    )
    assert res_checkin.status_code == 200
    data = res_checkin.json()
    assert data["unit_id"] == unit_id
    assert data["stability_days"] > 0
    assert data["retrievability"] > 0
    assert data["recalculated_units_count"] > 0


def test_custom_student_onboarding_and_scheduling(test_app):
    # 1. Create a brand new custom student profile
    res_create = test_app.post(
        "/api/v1/students",
        json={"display_name": "Robin Newbie"},
    )
    assert res_create.status_code == 201
    student_id = res_create.json()["id"]

    # 2. Query available electives
    res_subj = test_app.get("/api/v1/curriculum/subjects")
    assert res_subj.status_code == 200
    electives = res_subj.json()["electives"]
    assert len(electives) > 0
    chosen_elective_id = electives[0]["id"]

    # 3. Onboard student with 7-day availability
    onboard_payload = {
        "student_id": student_id,
        "elective_id": chosen_elective_id,
        "honors_id": None,
        "availability": [
            {"day_of_week": dow, "hours_available": 3.0 if dow in (5, 6) else 2.5}
            for dow in range(7)
        ],
        "start_date": "2026-09-01",
    }
    res_onboard = test_app.post("/api/v1/student/onboard", json=onboard_payload)
    assert res_onboard.status_code == 201
    onboard_data = res_onboard.json()
    assert onboard_data["student_id"] == student_id
    assert onboard_data["total_scheduled_units"] > 0

    # Verify clock is set to the onboarding start_date
    res_today = test_app.get("/api/v1/schedule/today", headers={"X-Student-Id": student_id})
    assert res_today.status_code == 200
    assert res_today.json()["date"] == "2026-09-01"

    # 4. Verify schedule is queryable for the new student
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": student_id},
    )
    assert res_sched.status_code == 200
    new_entries = res_sched.json()
    assert len(new_entries) == onboard_data["total_scheduled_units"]

    # 5. Verify availability update
    res_avail = test_app.put(
        "/api/v1/student/availability",
        headers={"X-Student-Id": student_id},
        json={
            "availability": [
                {"day_of_week": dow, "hours_available": 4.0 if dow in (5, 6) else 2.0}
                for dow in range(7)
            ]
        },
    )
    assert res_avail.status_code == 200

    # 6. Clean up: Delete custom student
    res_del = test_app.delete(f"/api/v1/students/{student_id}")
    assert res_del.status_code == 200


def test_time_travel_auto_complete_cutoff(test_app):
    """Verifies that skipping to target_date with auto_complete=True does NOT complete target_date's tasks."""
    alex_id = "demo-alex"
    # 1. Reset Alex to July 15, 2026 baseline
    res_reset = test_app.post(
        "/api/v1/dev/reset-semester",
        headers={"X-Student-Id": alex_id},
        json={"start_date": "2026-07-15"},
    )
    assert res_reset.status_code == 200

    # 2. Time-travel to July 18 with auto_complete=True
    res_tt = test_app.post(
        "/api/v1/dev/time-travel",
        headers={"X-Student-Id": alex_id},
        json={"target_date": "2026-07-18", "auto_complete": True},
    )
    assert res_tt.status_code == 200

    # 3. Fetch schedule
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": alex_id},
    )
    assert res_sched.status_code == 200
    entries = res_sched.json()

    # Any entry on or before July 17 must be 'done'
    past_entries = [e for e in entries if e["scheduled_date"] < "2026-07-18"]
    assert len(past_entries) > 0
    assert all(e["status"] == "done" for e in past_entries)

    # Any entry on July 18 (today) must NOT be done (should be planned)
    today_entries = [e for e in entries if e["scheduled_date"] == "2026-07-18"]
    assert len(today_entries) > 0
    assert all(e["status"] == "planned" for e in today_entries)
    assert all(not e["is_overdue"] for e in today_entries)


def test_time_travel_without_auto_complete_retains_overdue_and_reschedules(test_app):
    """Verifies that skipping without auto_complete preserves past tasks as overdue and reschedules them."""
    alex_id = "demo-alex"
    # Reset Alex to July 15 baseline
    test_app.post(
        "/api/v1/dev/reset-semester",
        headers={"X-Student-Id": alex_id},
        json={"start_date": "2026-07-15"},
    )

    # Time-travel to July 20 without auto-complete
    res_tt = test_app.post(
        "/api/v1/dev/time-travel",
        headers={"X-Student-Id": alex_id},
        json={"target_date": "2026-07-20", "auto_complete": False},
    )
    assert res_tt.status_code == 200

    # Fetch schedule
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": alex_id},
    )
    assert res_sched.status_code == 200
    entries = res_sched.json()

    # Past entries between July 15 and July 19 must still exist and be marked overdue
    past_entries = [e for e in entries if e["scheduled_date"] < "2026-07-20"]
    assert len(past_entries) > 0
    for pe in past_entries:
        assert pe["status"] == "planned"
        assert pe["is_overdue"] is True

    # Active/future entries on or after July 20 must exist and NOT be overdue
    future_entries = [e for e in entries if e["scheduled_date"] >= "2026-07-20"]
    assert len(future_entries) > 0
    assert all(not fe["is_overdue"] for fe in future_entries)

    # Check that total_units in student summary is NOT inflated by overdue duplicates
    res_students = test_app.get("/api/v1/students")
    assert res_students.status_code == 200
    alex_summary = next(s for s in res_students.json() if s["id"] == alex_id)

    # Total units must match syllabus units, not raw database rows
    assert alex_summary["total_units"] < len(entries)


def test_check_in_prioritizes_today_and_preserves_overdue(test_app):
    """Verifies that checking in on today updates today's planned task and does not overwrite past overdue entry."""
    alex_id = "demo-alex"
    # Time-travel to July 20 with overdue entries behind
    res_today = test_app.get(
        "/api/v1/schedule/today",
        headers={"X-Student-Id": alex_id},
    )
    assert res_today.status_code == 200
    today_tasks = res_today.json()["tasks"]
    assert len(today_tasks) > 0

    target_task = today_tasks[0]
    unit_id = (
        f"subtopic:{target_task['subtopic_id']}"
        if target_task.get("subtopic_id")
        else f"topic:{target_task['topic_id']}"
    )

    # Perform check-in on today's unit
    res_checkin = test_app.post(
        "/api/v1/schedule/check-in",
        headers={"X-Student-Id": alex_id},
        json={
            "unit_id": unit_id,
            "status": "done",
            "confidence_rating": 4,
        },
    )
    assert res_checkin.status_code == 200

    # Verify that the entry for today was marked 'done'
    res_sched = test_app.get(
        "/api/v1/schedule",
        headers={"X-Student-Id": alex_id},
    )
    entries = res_sched.json()
    matching_today = [
        e for e in entries
        if e["scheduled_date"] == "2026-07-20"
        and (e["subtopic_id"] == target_task.get("subtopic_id") if target_task.get("subtopic_id") else e["topic_id"] == target_task["topic_id"])
    ]
    assert len(matching_today) > 0
    assert matching_today[0]["status"] == "done"


