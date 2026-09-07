from pathlib import Path
import numpy as np
import pandas as pd

ARCHETYPES = {
    "diligent_strong": {"pace_mean": 0.85, "pace_std": 0.05, "conf_probs": [0.05, 0.05, 0.15, 0.35, 0.40]},
    "steady_average": {"pace_mean": 1.00, "pace_std": 0.08, "conf_probs": [0.10, 0.20, 0.40, 0.20, 0.10]},
    "crammer": {"pace_mean": 1.15, "pace_std": 0.12, "conf_probs": [0.30, 0.10, 0.10, 0.20, 0.30]},
    "struggling": {"pace_mean": 1.35, "pace_std": 0.15, "conf_probs": [0.45, 0.30, 0.15, 0.08, 0.02]},
}

TYPE_OFFSETS = {"concept": -0.4, "problem_solving": 0.2, "derivation": 0.5, "coding": 0.6}


def generate_synthetic_interaction_dataset(num_samples: int = 5000) -> pd.DataFrame:
    rows = []
    archetype_keys = list(ARCHETYPES.keys())
    archetype_probs = [0.25, 0.40, 0.20, 0.15]

    for _ in range(num_samples):
        # 1. Sample Student Attributes
        archetype = np.random.choice(archetype_keys, p=archetype_probs)
        cfg = ARCHETYPES[archetype]
        pace = np.clip(np.random.normal(cfg["pace_mean"], cfg["pace_std"]), 0.6, 1.8)
        confidence = np.random.choice([1, 2, 3, 4, 5], p=cfg["conf_probs"])

        # 2. Sample Topic Attributes
        topic_type = np.random.choice(["concept", "problem_solving", "derivation", "coding"])
        base_hours = round(np.random.uniform(0.5, 3.0), 1)
        base_diff = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.25, 0.35, 0.2, 0.1])
        prereq_depth = np.random.choice([0, 1, 2, 3, 4], p=[0.4, 0.3, 0.15, 0.1, 0.05])

        # 3. Simulate Target Variables
        hours_noise = np.random.normal(0, 0.15 * base_hours)
        simulated_hours = (
            base_hours * pace
            * (1.0 + 0.12 * (5 - confidence))
            * (1.0 + 0.06 * prereq_depth)
            + hours_noise
        )
        simulated_hours = max(0.25, round(simulated_hours, 2))

        diff_noise = np.random.normal(0, 0.3)
        raw_diff = (
            base_diff
            + TYPE_OFFSETS[topic_type]
            + 0.4 * (3 - confidence)
            + 0.3 * (pace - 1.0)
            + diff_noise
        )
        simulated_diff = int(np.clip(round(raw_diff), 1, 5))

        rows.append({
            "student_archetype": archetype,
            "historical_pace_factor": round(pace, 3),
            "initial_confidence": confidence,
            "topic_type": topic_type,
            "prereq_depth": prereq_depth,
            "curriculum_base_hours": base_hours,
            "curriculum_base_diff": base_diff,
            "actual_hours_taken": simulated_hours,
            "perceived_difficulty": simulated_diff,
        })

    return pd.DataFrame(rows)


def save_dataset_to_folder(
    df: pd.DataFrame,
    relative_target: str = "database/datasets",
    filename: str = "synthetic_interaction_data.csv",
) -> Path:
    # Resolve Alpine root directory from database/seed/seed_runner.py
    project_root = Path(__file__).resolve().parent.parent.parent

    # Create Alpine/database/datasets/
    output_dir = project_root / relative_target
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / filename
    df.to_csv(output_path, index=False)
    print(f"Dataset generated at: {output_path}")
    return output_path


if __name__ == "__main__":
    np.random.seed(42)
    df = generate_synthetic_interaction_dataset(num_samples=5000)
    save_dataset_to_folder(df, relative_target="database/datasets")