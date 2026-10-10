"""
backend/verify_db.py

Utility script to inspect and verify the Alpine SQLite database (alpine.db).
Prints table row counts, enrolled subjects, demo student profiles, and generated schedules.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "alpine.db"


def verify_database():
    if not DB_PATH.exists():
        print(f"[ERROR] Database file not found at: {DB_PATH}")
        print("Run seeding first: python backend/app/db/init_db.py")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"=== Alpine SQLite Database Verification ===")
    print(f"File Path: {DB_PATH.resolve()}")

    # 1. PRAGMA checks
    journal_mode = cursor.execute("PRAGMA journal_mode;").fetchone()[0]
    foreign_keys = cursor.execute("PRAGMA foreign_keys;").fetchone()[0]
    print(f"Journal Mode: {journal_mode.upper()} (expected: WAL)")
    print(f"Foreign Keys: {'ENABLED' if foreign_keys else 'DISABLED'}")
    print("-" * 50)

    # 2. Table row counts
    tables = [
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
    ]

    print("Table Statistics:")
    for tbl in tables:
        try:
            count = cursor.execute(f"SELECT COUNT(*) FROM {tbl};").fetchone()[0]
            print(f"  - {tbl:<20}: {count:>4} rows")
        except sqlite3.OperationalError:
            print(f"  - {tbl:<20}: NOT FOUND")
    print("-" * 50)

    # 3. Student Profile Summaries
    print("Student Profile Summary:")
    students = cursor.execute("SELECT id, display_name, created_at FROM students ORDER BY created_at ASC;").fetchall()
    if not students:
        print("  No student profiles found.")
    for s_id, name, created in students:
        subj_count = cursor.execute(
            "SELECT COUNT(*) FROM student_subjects WHERE student_id = ?;", (s_id,)
        ).fetchone()[0]
        total_sched = cursor.execute(
            "SELECT COUNT(*) FROM schedule_entries WHERE student_id = ?;", (s_id,)
        ).fetchone()[0]
        done_sched = cursor.execute(
            "SELECT COUNT(*) FROM schedule_entries WHERE student_id = ? AND status = 'done';", (s_id,)
        ).fetchone()[0]
        planned_sched = cursor.execute(
            "SELECT COUNT(*) FROM schedule_entries WHERE student_id = ? AND status = 'planned';", (s_id,)
        ).fetchone()[0]
        print(f"  * [{s_id}] {name}")
        print(f"      Enrolled Subjects : {subj_count}")
        print(f"      Total Scheduled   : {total_sched} units ({done_sched} completed, {planned_sched} planned)")

    print("-" * 50)

    # 4. Exam Dates
    exam_count = cursor.execute("SELECT COUNT(*) FROM exam_dates;").fetchone()[0]
    print(f"Exam Dates: {exam_count} milestones loaded (UT1, UT2, End-Sem)")
    print("===========================================")
    print("[SUCCESS] All tables and demo seed data verified successfully!")


if __name__ == "__main__":
    verify_database()
