"""
backend/manage_profiles.py

CLI tool to list and manually delete profiles from the Alpine SQLite database.

Usage:
    python backend/manage_profiles.py list
    python backend/manage_profiles.py delete <student_id>
    python backend/manage_profiles.py clean-custom
"""

import sys
import os

# Add root directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.db.session import SessionLocal
from app.db import models


def list_profiles():
    db = SessionLocal()
    students = db.query(models.Student).order_by(models.Student.created_at.desc()).all()
    print(f"\n{'ID':<38} | {'Type':<6} | {'Units':<8} | {'Name'}")
    print("-" * 80)
    for s in students:
        is_demo = s.id.startswith("demo-")
        ptype = "DEMO" if is_demo else "CUSTOM"
        units_count = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.student_id == s.id).count()
        print(f"{s.id:<38} | {ptype:<6} | {units_count:<8} | {s.display_name}")
    print("-" * 80)
    print(f"Total profiles: {len(students)}\n")
    db.close()


def delete_profile(student_id: str):
    if student_id.startswith("demo-"):
        print(f"Error: '{student_id}' is a built-in demo profile (Alex, Maya, Sam) and cannot be deleted.")
        return False

    db = SessionLocal()
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        print(f"Error: Profile with ID '{student_id}' was not found in database.")
        db.close()
        return False

    name = student.display_name
    db.delete(student)
    db.commit()
    db.close()
    print(f"Success: Deleted profile '{name}' ({student_id}) and all cascading schedule/confidence records.")
    return True


def clean_custom_profiles():
    db = SessionLocal()
    custom_students = db.query(models.Student).filter(~models.Student.id.startswith("demo-")).all()
    if not custom_students:
        print("No custom profiles found to delete. Only demo profiles remain.")
        db.close()
        return

    print(f"Found {len(custom_students)} custom profile(s) to remove:")
    for s in custom_students:
        print(f"  - Deleting {s.display_name} ({s.id})")
        db.delete(s)
    db.commit()
    db.close()
    print("Done! All custom profiles removed. Demo profiles (Alex, Maya, Sam) are intact.\n")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        return

    cmd = sys.argv[1].lower()
    if cmd == "list":
        list_profiles()
    elif cmd == "delete":
        if len(sys.argv) < 3:
            print("Usage: python backend/manage_profiles.py delete <student_id>")
            return
        delete_profile(sys.argv[2])
    elif cmd in ("clean", "clean-custom"):
        clean_custom_profiles()
    else:
        print(f"Unknown command: '{cmd}'. Available commands: list, delete, clean-custom")


if __name__ == "__main__":
    main()
