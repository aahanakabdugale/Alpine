from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# Resolve paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = PROJECT_ROOT / "database" / "datasets" / "synthetic_interaction_data.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "database" / "ml" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def build_preprocessor() -> ColumnTransformer:
    cat_cols = ["student_archetype", "topic_type"]
    num_cols = [
        "historical_pace_factor",
        "initial_confidence",
        "prereq_depth",
        "curriculum_base_hours",
        "curriculum_base_diff",
    ]
    return ColumnTransformer([
        ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), cat_cols),
        ("num", "passthrough", num_cols),
    ])


def evaluate(name: str, y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    return {
        "Model": name,
        "MAE": round(mae, 3),
        "MSE": round(mse, 3),
        "RMSE": round(rmse, 3),
        "R2": round(r2, 4),
    }


def run():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    features = [
        "student_archetype",
        "historical_pace_factor",
        "initial_confidence",
        "topic_type",
        "prereq_depth",
        "curriculum_base_hours",
        "curriculum_base_diff",
    ]

    X = df[features]
    y_hours = df["actual_hours_taken"]
    y_diff = df["perceived_difficulty"]

    # 80/20 train-test splits
    X_train_h, X_test_h, yh_train, yh_test = train_test_split(
        X, y_hours, test_size=0.2, random_state=42
    )
    X_train_d, X_test_d, yd_train, yd_test = train_test_split(
        X, y_diff, test_size=0.2, random_state=42
    )

    # 1. Train Target: actual_hours_taken
    print("\n" + "=" * 55 + "\nTarget: actual_hours_taken (Continuous Duration)\n" + "=" * 55)
    prep_h = build_preprocessor()
    lr_h = Pipeline([("prep", prep_h), ("reg", LinearRegression())]).fit(X_train_h, yh_train)
    rf_h = Pipeline([
        ("prep", prep_h),
        ("reg", RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)),
    ]).fit(X_train_h, yh_train)

    res_h = [
        evaluate("Linear Regression", yh_test, lr_h.predict(X_test_h)),
        evaluate("Random Forest", yh_test, rf_h.predict(X_test_h)),
    ]
    print(pd.DataFrame(res_h).to_string(index=False))

    # Save the optimal estimator
    joblib.dump(rf_h, ARTIFACTS_DIR / "actual_hours_model.joblib")
    print("Saved actual_hours_model.joblib")

    # 2. Train Target: perceived_difficulty
    print("\n" + "=" * 55 + "\nTarget: perceived_difficulty (Cognitive Load 1-5)\n" + "=" * 55)
    prep_d = build_preprocessor()
    lr_d = Pipeline([("prep", prep_d), ("reg", LinearRegression())]).fit(X_train_d, yd_train)
    rf_d = Pipeline([
        ("prep", prep_d),
        ("reg", RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)),
    ]).fit(X_train_d, yd_train)

    res_d = [
        evaluate("Linear Regression", yd_test, lr_d.predict(X_test_d)),
        evaluate("Random Forest", yd_test, rf_d.predict(X_test_d)),
    ]
    print(pd.DataFrame(res_d).to_string(index=False))

    # Save the optimal estimator
    joblib.dump(rf_d, ARTIFACTS_DIR / "perceived_diff_model.joblib")
    print("Saved perceived_diff_model.joblib")

    print(f"\nArtifacts successfully written to: {ARTIFACTS_DIR}")


if __name__ == "__main__":
    run()