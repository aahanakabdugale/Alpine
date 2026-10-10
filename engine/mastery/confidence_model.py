"""
Confidence-based mastery model with personalized memory retention.

Supports two complementary retention evaluation modes:

1. Static & Simple Half-Life Decay (Baseline / Backward Compatible):
   - normalize_confidence()
   - get_mastery_score()
   - get_mastery_score_with_decay()

2. FSRS-Inspired Two-Component Memory Model (Stability & Retrievability):
   - Memory Stability (S): Number of days for retrievability to fall to 90%.
   - Retrievability (R): Decayed recall probability R(t, S) = exp(-ln(10/9) * t / S).
   - Topic Difficulty (D): Personalized difficulty tracking per topic (1.0 - 5.0).
   - update_memory_state(): Expands stability on successful review (rating >= 3)
     incorporating spacing effect; contracts stability on lapses (rating < 3).
"""

from __future__ import annotations

from datetime import date
import math

from engine.models import ConfidenceRating, MemoryState

# ln(10/9) constant ensures R(S, S) = 0.90
DECAY_RATE_90 = math.log(10.0 / 9.0)


def normalize_confidence(rating: int) -> float:
    """Map a 1-5 confidence rating to a 0-1 mastery score."""
    return (rating - 1) / 4.0


def compute_retrievability(memory_state: MemoryState, today: date) -> float:
    """
    Computes recall probability R(t, S) in [0.0, 1.0].
    At t = 0 days, R = 1.0.
    At t = S days, R = 0.90.
    """
    days_elapsed = max((today - memory_state.last_review).days, 0)
    if memory_state.stability <= 0:
        return 0.0
    exponent = -(DECAY_RATE_90 * days_elapsed) / memory_state.stability
    return max(0.0, min(1.0, math.exp(exponent)))


def update_memory_state(
    current_state: MemoryState | None,
    rating: int,
    review_date: date,
    initial_difficulty: float = 3.0,
) -> MemoryState:
    """
    Calculates updated MemoryState after a study or review check-in.

    - rating >= 3: Success. Stability expands based on topic difficulty, current
      stability, and the spacing effect (lower R at review time gives higher boost).
    - rating < 3: Lapse / Forgotten. Stability collapses and lapse count increments.
    """
    rating_clamped = max(1, min(5, rating))

    if current_state is None:
        # First encounter / initial rating
        diff = max(1.0, min(5.0, initial_difficulty - 0.3 * (rating_clamped - 3)))
        if rating_clamped >= 3:
            # Initial baseline stability based on first score
            init_s_map = {3: 2.0, 4: 4.5, 5: 8.0}
            stability = init_s_map.get(rating_clamped, 3.0)
            reps = 1
            lapses = 0
        else:
            init_s_map = {1: 0.5, 2: 1.0}
            stability = init_s_map.get(rating_clamped, 0.75)
            reps = 0
            lapses = 1

        return MemoryState(
            stability=round(stability, 2),
            difficulty=round(diff, 2),
            reps=reps,
            lapses=lapses,
            last_review=review_date,
        )

    # Subsequent review
    r_current = compute_retrievability(current_state, review_date)

    # Update difficulty
    diff_delta = -0.3 * (rating_clamped - 3)
    new_diff = max(1.0, min(5.0, current_state.difficulty + diff_delta))

    if rating_clamped >= 3:
        # Successful review: Stability expansion
        s_old = current_state.stability
        # Spacing effect: reviewing when R is low provides higher memory consolidation
        spacing_bonus = math.exp(0.5 * (1.0 - r_current))
        stability_factor = 1.0 + 0.4 * (11.0 - new_diff) * (s_old ** (-0.2)) * spacing_bonus
        # Ensure stability increases by at least 15% on pass
        stability_factor = max(1.15, stability_factor)
        new_stability = s_old * stability_factor
        new_reps = current_state.reps + 1
        new_lapses = current_state.lapses
    else:
        # Lapse / forgotten
        new_stability = max(0.5, current_state.stability * 0.25)
        new_reps = current_state.reps
        new_lapses = current_state.lapses + 1

    return MemoryState(
        stability=round(new_stability, 2),
        difficulty=round(new_diff, 2),
        reps=new_reps,
        lapses=new_lapses,
        last_review=review_date,
    )


def get_mastery_score(rating: ConfidenceRating | None) -> float:
    """
    Current mastery score for one schedulable unit, 0-1, no decay.
    No rating yet (never studied / never self-assessed) -> treated as 0.
    """
    if rating is None:
        return 0.0
    return normalize_confidence(rating.rating)


def get_mastery_score_with_decay(
    rating: ConfidenceRating | None,
    today: date,
    half_life_days: int = 14,
) -> float:
    """
    Current mastery score with decay:
    - If rating has an attached MemoryState, uses personalized retrievability R(t, S).
    - Otherwise, falls back to exponential half-life decay.
    """
    if rating is None:
        return 0.0

    base = normalize_confidence(rating.rating)

    if rating.memory_state is not None:
        r = compute_retrievability(rating.memory_state, today)
        return base * r

    days_elapsed = max((today - rating.last_updated).days, 0)
    decay_factor = 0.5 ** (days_elapsed / half_life_days)
    return base * decay_factor


def _latest_rating_per_unit(ratings: list[ConfidenceRating]) -> dict[str, ConfidenceRating]:
    latest: dict[str, ConfidenceRating] = {}
    for r in ratings:
        existing = latest.get(r.unit_id)
        if existing is None or r.last_updated > existing.last_updated:
            latest[r.unit_id] = r
    return latest


def build_mastery_map(ratings: list[ConfidenceRating]) -> dict[str, float]:
    """Convenience: {unit_id: mastery_score}, no decay."""
    return {unit_id: get_mastery_score(r) for unit_id, r in _latest_rating_per_unit(ratings).items()}


def build_mastery_map_with_decay(
    ratings: list[ConfidenceRating],
    today: date,
    half_life_days: int = 14,
) -> dict[str, float]:
    """Convenience: {unit_id: decayed_mastery_score}."""
    return {
        unit_id: get_mastery_score_with_decay(r, today, half_life_days)
        for unit_id, r in _latest_rating_per_unit(ratings).items()
    }
