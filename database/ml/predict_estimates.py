"""
database/ml/predict_estimates.py
Loads trained artifacts to generate personalized estimates for any schedulable unit.
"""
from pathlib import Path
import joblib
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "database" / "ml" / "artifacts"

HOURS_MODEL = None
DIFF_MODEL = None


def _load_models():
    global HOURS_MODEL, DIFF_MODEL
    if HOURS_MODEL is None or DIFF_MODEL is None:
        hours_path = ARTIFACTS_DIR / "actual_hours_model.joblib"
        diff_path = ARTIFACTS_DIR / "perceived_diff_model.joblib"

        if not hours_path.exists() or not diff_path.exists():
            raise FileNotFoundError(
                f"Model artifacts missing in {ARTIFACTS_DIR}. Run train_models.py first."
            )

        HOURS_MODEL = joblib.load(hours_path)
        DIFF_MODEL = joblib.load(diff_path)


def estimate_unit_for_student(
    student_archetype: str,
    historical_pace_factor: float,
    initial_confidence: int,
    topic_type: str,
    prereq_depth: int,
    curriculum_base_hours: float,
    curriculum_base_diff: int,
) -> tuple[float, int]:
    """
    Inference interface for Member B (scheduler) and Member C (backend).
    Returns: (est_hours: float, est_difficulty: int)
    """
    _load_models()

    row = pd.DataFrame([{
        "student_archetype": student_archetype,
        "historical_pace_factor": historical_pace_factor,
        "initial_confidence": initial_confidence,
        "topic_type": topic_type,
        "prereq_depth": prereq_depth,
        "curriculum_base_hours": curriculum_base_hours,
        "curriculum_base_diff": curriculum_base_diff,
    }])

    # Predict duration (clamp to minimum 0.5h session)
    pred_hours = float(HOURS_MODEL.predict(row)[0])
    est_hours = max(0.5, round(pred_hours, 2))

    # Predict cognitive difficulty (clamp to valid 1-5 domain)
    pred_diff = int(round(float(DIFF_MODEL.predict(row)[0])))
    est_difficulty = max(1, min(5, pred_diff))

    return est_hours, est_difficulty


if __name__ == "__main__":
    # Test case 1: Fast pacer with high confidence on a concept
    h1, d1 = estimate_unit_for_student(
        student_archetype="diligent_strong",
        historical_pace_factor=0.85,
        initial_confidence=5,
        topic_type="concept",
        prereq_depth=0,
        curriculum_base_hours=2.0,
        curriculum_base_diff=2,
    )
    print(f"Diligent Student Concept Topic -> Hours: {h1}h, Difficulty: {d1}/5")

    # Test case 2: Struggling student on a deep derivation topic
    h2, d2 = estimate_unit_for_student(
        student_archetype="struggling",
        historical_pace_factor=1.40,
        initial_confidence=1,
        topic_type="derivation",
        prereq_depth=3,
        curriculum_base_hours=2.0,
        curriculum_base_diff=4,
    )
    print(f"Struggling Student Derivation Topic -> Hours: {h2}h, Difficulty: {d2}/5")