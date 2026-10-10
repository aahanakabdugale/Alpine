"""
engine/mastery/review_generator.py

Generates lightweight review units for completed schedulable units
whose retrievability has decayed below the target threshold.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from engine.mastery.confidence_model import compute_retrievability, update_memory_state
from engine.models import ConfidenceRating, SchedulableUnit

TARGET_RETENTION_THRESHOLD = 0.75  # 75% retrievability trigger
DEFAULT_REVIEW_HOURS_RATIO = 0.25   # 25% of original session duration
MIN_REVIEW_HOURS = 0.3              # Minimum 18 minutes


def generate_pending_reviews(
    completed_units: list[SchedulableUnit],
    confidence_ratings: list[ConfidenceRating],
    today: date,
    threshold: float = TARGET_RETENTION_THRESHOLD,
    existing_review_parent_ids: Optional[set[str]] = None,
) -> list[SchedulableUnit]:
    """
    Inspects all completed units against their current MemoryState retrievability.
    If R(t, S) < threshold and the unit isn't already queued for review, creates
    a lightweight review SchedulableUnit.
    """
    confidence_map: dict[str, ConfidenceRating] = {}
    for r in confidence_ratings:
        existing = confidence_map.get(r.unit_id)
        if existing is None or r.last_updated > existing.last_updated:
            confidence_map[r.unit_id] = r

    existing_parents = existing_review_parent_ids or set()
    review_units: list[SchedulableUnit] = []

    for u in completed_units:
        # Prevent review units from spawning review-of-reviews directly
        if u.is_review or u.unit_id in existing_parents:
            continue

        rating_entry = confidence_map.get(u.unit_id)
        if rating_entry is None:
            continue

        mem = rating_entry.memory_state
        if mem is None:
            mem = update_memory_state(None, rating_entry.rating, rating_entry.last_updated)

        retrievability = compute_retrievability(mem, today)
        if retrievability < threshold:
            reps = mem.reps
            rev_unit = u.model_copy(
                update={
                    "unit_id": f"review:{u.unit_id}:rep{reps + 1}",
                    "name": f"Review: {u.name}",
                    "est_hours": max(
                        MIN_REVIEW_HOURS,
                        round(u.est_hours * DEFAULT_REVIEW_HOURS_RATIO, 2),
                    ),
                    "est_difficulty": max(1, u.est_difficulty - 1),
                    "is_review": True,
                    "parent_unit_id": u.unit_id,
                    "depends_on": [],  # Prerequisites are already satisfied
                }
            )
            review_units.append(rev_unit)

    return review_units
