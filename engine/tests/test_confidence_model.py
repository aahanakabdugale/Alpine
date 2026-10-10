from datetime import date, timedelta
import pytest

from engine.mastery.confidence_model import (
    build_mastery_map,
    compute_retrievability,
    get_mastery_score,
    get_mastery_score_with_decay,
    normalize_confidence,
    update_memory_state,
)
from engine.models import ConfidenceRating, MemoryState


def test_normalize_confidence_bounds():
    assert normalize_confidence(1) == 0.0
    assert normalize_confidence(5) == 1.0
    assert normalize_confidence(3) == 0.5


def test_get_mastery_score_no_rating_yet():
    assert get_mastery_score(None) == 0.0


def test_get_mastery_score_with_rating():
    r = ConfidenceRating(unit_id="topic:1", rating=3, last_updated=date.today())
    assert get_mastery_score(r) == 0.5


def test_build_mastery_map_keeps_latest_rating_per_unit():
    ratings = [
        ConfidenceRating(unit_id="topic:1", rating=2, last_updated=date(2026, 1, 1)),
        ConfidenceRating(unit_id="topic:1", rating=4, last_updated=date(2026, 2, 1)),
        ConfidenceRating(unit_id="topic:2", rating=5, last_updated=date(2026, 1, 15)),
    ]
    result = build_mastery_map(ratings)
    assert result["topic:1"] == normalize_confidence(4)  # the later rating wins
    assert result["topic:2"] == normalize_confidence(5)


def test_compute_retrievability_properties():
    today = date(2026, 9, 10)
    mem = MemoryState(stability=10.0, difficulty=3.0, reps=1, lapses=0, last_review=today)

    # 1. At t=0 days, Retrievability must be 1.0
    assert compute_retrievability(mem, today) == pytest.approx(1.0, abs=1e-3)

    # 2. At t=S (10 days), Retrievability must be 0.90
    assert compute_retrievability(mem, today + timedelta(days=10)) == pytest.approx(0.90, abs=1e-2)

    # 3. Monotonic decay over time
    r_day_5 = compute_retrievability(mem, today + timedelta(days=5))
    r_day_20 = compute_retrievability(mem, today + timedelta(days=20))
    assert 1.0 > r_day_5 > 0.90 > r_day_20 > 0.0


def test_update_memory_state_expansion_and_lapse():
    d0 = date(2026, 9, 1)

    # Initial rating of 5 (Mastered)
    mem1 = update_memory_state(None, rating=5, review_date=d0)
    assert mem1.stability >= 7.0
    assert mem1.difficulty < 3.0
    assert mem1.reps == 1
    assert mem1.lapses == 0

    # Successful review 7 days later
    d1 = d0 + timedelta(days=7)
    mem2 = update_memory_state(mem1, rating=4, review_date=d1)
    assert mem2.stability > mem1.stability
    assert mem2.reps == 2
    assert mem2.lapses == 0

    # Lapse (forgotten, rating=1) 14 days later
    d2 = d1 + timedelta(days=14)
    mem3 = update_memory_state(mem2, rating=1, review_date=d2)
    assert mem3.stability < mem2.stability
    assert mem3.lapses == 1


def test_spacing_effect_gives_higher_stability_gain():
    d0 = date(2026, 9, 1)
    base_state = update_memory_state(None, rating=4, review_date=d0)

    # Early review (after 1 day, high R)
    early_state = update_memory_state(base_state, rating=4, review_date=d0 + timedelta(days=1))
    early_gain = early_state.stability / base_state.stability

    # Spaced review (after 8 days, lower R)
    spaced_state = update_memory_state(base_state, rating=4, review_date=d0 + timedelta(days=8))
    spaced_gain = spaced_state.stability / base_state.stability

    # Memory consolidation bonus: spaced review yields higher expansion factor
    assert spaced_gain > early_gain


def test_get_mastery_score_with_decay_prefers_memory_state():
    today = date(2026, 9, 20)
    d_review = date(2026, 9, 10)
    mem = MemoryState(stability=10.0, difficulty=3.0, reps=1, lapses=0, last_review=d_review)

    rating_with_mem = ConfidenceRating(
        unit_id="u1",
        rating=5,
        last_updated=d_review,
        memory_state=mem,
    )

    score = get_mastery_score_with_decay(rating_with_mem, today)
    # base is 1.0, R at t=10 is 0.90 -> score should be approx 0.90
    assert score == pytest.approx(0.90, abs=1e-2)
