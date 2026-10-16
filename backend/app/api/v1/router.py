"""
backend/app/api/v1/router.py

Aggregation of all API v1 routers.
"""

from fastapi import APIRouter
from app.api.v1 import profiles, students, curriculum, student, schedule, dev

api_router = APIRouter()

api_router.include_router(profiles.router, prefix="/profiles")
api_router.include_router(students.router)
api_router.include_router(curriculum.router)
api_router.include_router(student.router)
api_router.include_router(schedule.router)
api_router.include_router(dev.router)
