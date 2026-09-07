"""
database/ml/validate_on_new_data.py
Evaluates saved model artifacts on a freshly sampled dataset with distinct seed,
computes 80/20 train/test evaluation metrics, and renders diagnostic plots.
"""

from pathlib import Path
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "database" / "ml" / "artifacts"

# ---------------------------------------------------------------------------
# 1. Generate a New, Independent Dataset (Seed 999 with shifted variance)
# ---------------------------------------------------------------------------
def generate_fresh_test_dataset(num_samples: int = 1500) -> pd.DataFrame:
    np.random.seed(999)  # Completely separate seed
    archetypes = ["diligent_strong", "steady_average", "crammer", "struggling"]
    topic_types = ["concept", "problem_solving", "derivation", "coding"]
    type_offsets = {"concept": -0.4, "problem_solving": 0.2, "derivation": 0.5, "coding": 0.6}

    rows = []
    for _ in range(num_samples):
        archetype = np.random.choice(archetypes, p=[0.20, 0.45, 0.20, 0.15])
        
        # Shifted pace parameters to test generalizability
        if archetype == "diligent_strong":
            pace = np.clip(np.random.normal(0.82, 0.06), 0.6, 1.8)
            conf = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.05, 0.20, 0.35, 0.35])
        elif archetype == "steady_average":
            pace = np.clip(np.random.normal(1.02, 0.09), 0.6, 1.8)
            conf = np.random.choice([1, 2, 3, 4, 5], p=[0.10, 0.20, 0.40, 0.20, 0.10])
        elif archetype == "crammer":
            pace = np.clip(np.random.normal(1.18, 0.14), 0.6, 1.8)
            conf = np.random.choice([1, 2, 3, 4, 5], p=[0.30, 0.15, 0.15, 0.20, 0.20])
        else:
            pace = np.clip(np.random.normal(1.38, 0.18), 0.6, 1.8)
            conf = np.random.choice([1, 2, 3, 4, 5], p=[0.40, 0.30, 0.15, 0.10, 0.05])

        topic_type = np.random.choice(topic_types)
        base_hours = round(np.random.uniform(0.5, 3.5), 1)
        base_diff = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.2, 0.4, 0.2, 0.1])
        prereq_depth = np.random.choice([0, 1, 2, 3, 4], p=[0.35, 0.35, 0.15, 0.1, 0.05])

        hours_noise = np.random.normal(0, 0.18 * base_hours)
        simulated_hours = (
            base_hours * pace
            * (1.0 + 0.12 * (5 - conf))
            * (1.0 + 0.06 * prereq_depth)
            + hours_noise
        )
        simulated_hours = max(0.25, round(simulated_hours, 2))

        diff_noise = np.random.normal(0, 0.35)
        raw_diff = (
            base_diff
            + type_offsets[topic_type]
            + 0.4 * (3 - conf)
            + 0.3 * (pace - 1.0)
            + diff_noise
        )
        simulated_diff = int(np.clip(round(raw_diff), 1, 5))

        rows.append({
            "student_archetype": archetype,
            "historical_pace_factor": round(pace, 3),
            "initial_confidence": conf,
            "topic_type": topic_type,
            "prereq_depth": prereq_depth,
            "curriculum_base_hours": base_hours,
            "curriculum_base_diff": base_diff,
            "actual_hours_taken": simulated_hours,
            "perceived_difficulty": simulated_diff,
        })

    return pd.DataFrame(rows)

# ---------------------------------------------------------------------------
# 2. Evaluation Helper
# ---------------------------------------------------------------------------
def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    return {"MAE": round(mae, 3), "MSE": round(mse, 3), "RMSE": round(rmse, 3), "R2": round(r2, 4)}

# ---------------------------------------------------------------------------
# 3. Main Validation Runner
# ---------------------------------------------------------------------------
def main():
    # Load trained models
    hours_model = joblib.load(ARTIFACTS_DIR / "actual_hours_model.joblib")
    diff_model = joblib.load(ARTIFACTS_DIR / "perceived_diff_model.joblib")

    # Generate fresh dataset
    df_new = generate_fresh_test_dataset(num_samples=2000)
    
    features = [
        "student_archetype",
        "historical_pace_factor",
        "initial_confidence",
        "topic_type",
        "prereq_depth",
        "curriculum_base_hours",
        "curriculum_base_diff",
    ]
    
    X = df_new[features]
    y_hours = df_new["actual_hours_taken"]
    y_diff = df_new["perceived_difficulty"]

    # 80% Train, 20% Test split
    X_train, X_test, y_hours_train, y_hours_test = train_test_split(
        X, y_hours, test_size=0.20, random_state=42
    )
    _, _, y_diff_train, y_diff_test = train_test_split(
        X, y_diff, test_size=0.20, random_state=42
    )

    # Evaluate on the 20% test slice of the new dataset
    pred_hours_test = hours_model.predict(X_test)
    pred_diff_test = diff_model.predict(X_test)

    metrics_hours = compute_metrics(y_hours_test, pred_hours_test)
    metrics_diff = compute_metrics(y_diff_test, pred_diff_test)

    print("\n" + "=" * 60)
    print("VALIDATION RESULTS ON 20% UNSEEN TEST SLICE (NEW DATASET)")
    print("=" * 60)
    print("Target: actual_hours_taken")
    print(pd.DataFrame([metrics_hours]).to_string(index=False))
    print("-" * 60)
    print("Target: perceived_difficulty")
    print(pd.DataFrame([metrics_diff]).to_string(index=False))
    print("=" * 60 + "\n")

    # -----------------------------------------------------------------------
    # 4. Visualization Plots
    # -----------------------------------------------------------------------
    fig, axes = plt.subplots(2, 2, figsize=(13, 10))

    # Plot 1: Parity Plot for Hours (Actual vs. Predicted)
    axes[0, 0].scatter(y_hours_test, pred_hours_test, alpha=0.35, color="#1f77b4", edgecolors="none")
    min_h, max_h = y_hours_test.min(), y_hours_test.max()
    axes[0, 0].plot([min_h, max_h], [min_h, max_h], "r--", lw=2, label="Ideal Fit (y=x)")
    axes[0, 0].set_title(f"Study Hours: Actual vs Predicted (R² = {metrics_hours['R2']})", fontsize=12)
    axes[0, 0].set_xlabel("Actual Hours Taken")
    axes[0, 0].set_ylabel("Predicted Hours")
    axes[0, 0].grid(True, linestyle="--", alpha=0.6)
    axes[0, 0].legend()

    # Plot 2: Residual Plot for Hours
    residuals_h = y_hours_test - pred_hours_test
    axes[0, 1].scatter(pred_hours_test, residuals_h, alpha=0.35, color="#ff7f0e", edgecolors="none")
    axes[0, 1].axhline(0, color="black", linestyle="--", lw=1.5)
    axes[0, 1].set_title("Study Hours: Residuals (Error Distribution)", fontsize=12)
    axes[0, 1].set_xlabel("Predicted Hours")
    axes[0, 1].set_ylabel("Residual (Actual - Predicted)")
    axes[0, 1].grid(True, linestyle="--", alpha=0.6)

    # Plot 3: Parity Plot for Difficulty
    axes[1, 0].scatter(y_diff_test, pred_diff_test, alpha=0.25, color="#2ca02c", edgecolors="none")
    axes[1, 0].plot([1, 5], [1, 5], "r--", lw=2, label="Ideal Fit")
    axes[1, 0].set_title(f"Difficulty: Actual vs Predicted (R² = {metrics_diff['R2']})", fontsize=12)
    axes[1, 0].set_xlabel("Actual Perceived Difficulty (1-5)")
    axes[1, 0].set_ylabel("Predicted Difficulty (Continuous)")
    axes[1, 0].grid(True, linestyle="--", alpha=0.6)
    axes[1, 0].legend()

    # Plot 4: Difficulty Prediction Rounded vs Actual Confusion Heatmap
    pred_diff_rounded = np.clip(np.round(pred_diff_test), 1, 5).astype(int)
    cm = pd.crosstab(
        pd.Series(y_diff_test.values, name="Actual"),
        pd.Series(pred_diff_rounded, name="Predicted")
    )
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", ax=axes[1, 1], cbar=False)
    axes[1, 1].set_title("Cognitive Difficulty: Actual vs Predicted Matrix", fontsize=12)

    plt.tight_layout()
    plot_save_path = PROJECT_ROOT / "database" / "ml" / "validation_plots.png"
    plt.savefig(plot_save_path, dpi=300)
    print(f"Diagnostic graphs saved to: {plot_save_path}")
    plt.show()

if __name__ == "__main__":
    main()