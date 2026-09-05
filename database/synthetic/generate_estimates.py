"""
generate_estimates.py — Member A

Heuristic est_difficulty / est_hours assignment for a schedulable unit
(a topic with no subtopics, or a subtopic), per PRD §4 point 1.

No ML, no external API — just simple, explainable rules based on features
we already know: topic "type" and position within its module. Imported by
seed_runner.py while loading curriculum JSON, so every topic/subtopic gets
a starting estimate at seed time.
"""

# Base hours by topic "type" — tune these to match your actual subjects.
# "concept": mostly theory/reading. "problem_solving": needs practice reps.
# "project": open-ended, takes longest and varies most.
BASE_HOURS_BY_TYPE = {
    "concept": 1.5,
    "problem_solving": 2.5,
    "project": 4.0,
}

BASE_DIFFICULTY_BY_TYPE = {
    "concept": 2,
    "problem_solving": 3,
    "project": 4,
}


def estimate_difficulty_hours(
    topic_type: str,
    order_index: int,
    total_in_module: int,
    credit_weight: float = 1.0,
) -> tuple[int, float]:
    """
    Heuristic estimate of (est_difficulty 1-5, est_hours) for one schedulable unit.

    Rationale (useful for your viva):
    - topic_type sets a baseline (project > problem_solving > concept)
    - position_in_module: later topics in a module are assumed harder,
      since courses are usually sequenced easy -> hard
    - credit_weight scales hours for subjects/modules that carry more
      weight in the overall course

    Args:
        topic_type: one of "concept", "problem_solving", "project"
        order_index: 1-based position of this unit within its module
        total_in_module: how many schedulable units are in this module
        credit_weight: optional multiplier (e.g. subject credit hours / 4)

    Returns:
        (est_difficulty, est_hours)
    """
    if topic_type not in BASE_HOURS_BY_TYPE:
        raise ValueError(f"Unknown topic_type: {topic_type!r}")

    # Position factor: 0.0 (first topic) -> 1.0 (last topic) within the module
    position_factor = 0 if total_in_module <= 1 else (order_index - 1) / (total_in_module - 1)

    base_difficulty = BASE_DIFFICULTY_BY_TYPE[topic_type]
    difficulty = base_difficulty + round(position_factor * 1.5)  # later topics bumped up
    difficulty = max(1, min(5, difficulty))

    base_hours = BASE_HOURS_BY_TYPE[topic_type]
    hours = base_hours * (1 + 0.4 * position_factor) * credit_weight
    hours = round(hours, 2)

    return difficulty, hours


if __name__ == "__main__":
    # Quick sanity check
    examples = [
        ("Intro to Neural Networks", "concept", 1, 5),
        ("Backpropagation Derivation", "concept", 3, 5),
        ("Implement a CNN", "project", 5, 5),
    ]
    for name, t_type, idx, total in examples:
        diff, hours = estimate_difficulty_hours(t_type, idx, total)
        print(f"{name:35s} -> difficulty={diff}, hours={hours}")
