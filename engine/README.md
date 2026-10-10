# Alpine — Adaptive Engine (`engine/`)

The **Alpine Adaptive Engine** is an intelligent, constraint-driven study scheduling and personalized mastery engine developed as **Member B's deliverable** in the Alpine project.

It converts curriculum graphs, student availability, unit test & end-semester deadlines, and self-reported topic confidence ratings into an optimal, personalized day-by-day study schedule. When a student completes a topic, logs a confidence rating, or changes their availability, the engine dynamically recalculates the remaining study plan using **FSRS-inspired personalized memory retention**, **dynamic review generation**, **automatic topic slicing**, and **multi-objective constraint optimization (Google OR-Tools CP-SAT)**.

---

## 1. Architectural Design & Decoupling

The engine is built with a **strict separation of concerns**:
- **Zero Database / HTTP Dependencies**: The engine has **no dependency** on PostgreSQL, Supabase, FastAPI, or any network services. It runs 100% locally in pure Python.
- **Strict Pydantic Boundary**: Member C's backend is responsible for reading rows from the database, transforming them into the engine's strongly-typed [Pydantic models](models.py), passing them to the engine, and storing the returned `ScheduleEntry` records back into the database.
- **Deterministic & Independently Testable**: The entire engine can be developed, tested, and validated against synthetic learner populations completely offline without needing Supabase or frontend services running.

```
+---------------------------------------------------------------+
|                      Member C: Backend API                    |
|             (FastAPI / Supabase Auth & Postgres DB)           |
+-------------------------------+-------------------------------+
                                |  1. Query DB & construct PlanRequest
                                |  4. Persist ScheduleEntry records
                                v
+---------------------------------------------------------------+
|                      Member B: Adaptive Engine                |
|                                                               |
|   +---------------------+             +-------------------+   |
|   |   mastery/          |             |   scheduler/      |   |
|   |   - dependency_dag  | ----------> |   - deadlines     |   |
|   |   - confidence_model|             |   - baseline      |   |
|   |   - review_generator|             |   - adaptive      |   |
|   +---------------------+             +-------------------+   |
|                                                               |
|        Google OR-Tools CP-SAT Solver & NetworkX Graph         |
+---------------------------------------------------------------+
```

---

## 2. Implemented Modules & Logic

### 2.1 Core Models ([`engine/models.py`](models.py))

Defines typed Pydantic models for inputs, outputs, and memory states:

| Model | Role / Description |
|---|---|
| `AssessmentPhase` | Enum: `UT1` or `UT2`. Defines which unit test cycle a module belongs to. |
| `ExamType` | Enum: `UT1`, `UT2`, `END_SEM`. |
| `MemoryState` | Tracks personalized memory retention: `stability` ($S$ in days to 90% retrievability), `difficulty` ($D \in [1.0, 5.0]$), `reps` (successful reviews), `lapses` (forgotten count), and `last_review` (`date`). |
| `SchedulableUnit` | The atomic study item (subtopic if exists, else topic). Supports `is_review` (flagging spaced repetition sessions), `parent_unit_id`, `slice_index`, and `total_slices` (for auto-sliced sessions). |
| `ConfidenceRating` | Self-reported rating for a unit: `unit_id`, `rating` (1–5), `last_updated`, and optional `memory_state` (`MemoryState`). |
| `Availability` | Weekly time budget: `day_of_week` (0 = Monday ... 6 = Sunday), `hours_available` (`float >= 0`). |
| `ExamDate` | Subject exam schedule: `subject_id`, `exam_type`, `exam_date` (`date`). |
| `ScheduleEntry` | Output of the scheduler: `unit_id`, `scheduled_date` (`date`), `status` (`planned`, `done`, `skipped`), `is_review` (`bool`). |
| `PlanRequest` | Complete bundle for a student: `student_id`, `units`, `confidence`, `availability`, `exam_dates`, `start_date`. |

---

### 2.2 Mastery & Personalized Memory Retention ([`engine/mastery/`](mastery/))

#### A. Prerequisite DAG Validation ([`mastery/dependency_dag.py`](mastery/dependency_dag.py))
- **Logic**: Curriculums form a Directed Acyclic Graph (DAG) of prerequisite constraints. Topics cannot be studied before their prerequisites.
- **Function**: `validate_dependency_dag(units: list[SchedulableUnit]) -> None`
  - Uses `networkx.DiGraph` to model nodes and directed edges.
  - Enforces `nx.is_directed_acyclic_graph(dag)`. Raises `ValueError` listing circular loops if detected.

#### B. FSRS-Inspired Two-Component Memory Model ([`mastery/confidence_model.py`](mastery/confidence_model.py))
- **Logic**: Models personalized memory consolidation and forgetting dynamics:
  1. **Retrievability $R(t, S)$**:
     $$R(t, S) = \exp\left(-\frac{\ln(10/9) \cdot t}{S}\right) \quad (\text{so } R(0) = 1.0, \; R(S) = 0.90)$$
  2. **Personalized Stability Expansion**:
     When a student logs a successful check-in ($\text{rating} \ge 3$):
     $$S_{\text{new}} = S_{\text{old}} \times \left(1 + 0.4 \cdot (11 - D) \cdot S_{\text{old}}^{-0.2} \cdot e^{0.5 \cdot (1 - R)}\right)$$
     Incorporate the **spacing effect**: reviewing material when Retrievability is low provides exponential memory consolidation.
  3. **Lapse Handling**:
     When forgotten ($\text{rating} < 3$): $S_{\text{new}} = \max(0.5, S_{\text{old}} \times 0.25)$, incrementing `lapses`.
  4. **Mastery Score with Decay**:
     Evaluates decayed mastery via `compute_retrievability()` when `MemoryState` is present, with automatic fallback to half-life exponential decay for uninitialized ratings.

#### C. Dynamic Review Unit Generator ([`mastery/review_generator.py`](mastery/review_generator.py))
- **Logic**: Solves the "Done-Exclusion Blindspot". When a student completes a topic, the engine monitors its retrievability over time.
- **Function**: `generate_pending_reviews(completed_units, confidence_ratings, today, threshold=0.75)`:
  - If $R(t, S) < 0.75$, automatically spawns a lightweight review unit (`est_hours` = 25% of original, min 0.3h, difficulty reduced by 1 point).
  - The review unit is scheduled prior to exam deadlines to ensure long-term retention.

---

### 2.3 Scheduler & Optimization ([`engine/scheduler/`](scheduler/))

#### A. Deadline Resolution & Urgency ([`scheduler/deadlines.py`](scheduler/deadlines.py))
- **Logic**: Resolves UT1/UT2 soft targets and End-Semester hard deadlines, balancing urgency with mastery weakness:
  $$\text{priority} = \alpha \cdot \frac{1}{\max(\text{days\_until\_ut}, 0) + 1} + \beta \cdot (1.0 - \text{mastery\_score})$$

#### B. Baseline Constraint Scheduler ([`scheduler/baseline.py`](scheduler/baseline.py))
- **Logic**: Built on **Google OR-Tools CP-SAT**. Solves a multi-objective multi-knapsack problem with precedence constraints over a time horizon.
- **Key Enhancements**:
  1. **Automatic Topic Slicing (`slice_oversized_units`)**: When a topic's duration exceeds the student's maximum single-day availability, it automatically slices the unit into sequential parts ($\text{Part 1} \to \text{Part 2}$) with strict chronological order, eliminating `UnschedulableUnitError`.
  2. **Cognitive Subject Interleaving**: On multi-hour study days ($\ge 1.5\text{h}$), limits any single subject to $\le 70\%$ of available hours, enforcing daily variety.
  3. **Soft Slack Triage for End-Sem**: Introduces soft overrun variables penalized heavily in the objective ($50,000 \cdot overrun_u$), guaranteeing solver feasibility even when student availability is overloaded.
  4. **Daily Cognitive Load Cap**: Caps daily difficulty points ($\le 8$).
  5. **Tardiness Minimization**: Penalizes scheduling past UT exam dates ($10,000 \cdot tardy_u$).

#### C. Adaptive Re-scheduler ([`scheduler/adaptive.py`](scheduler/adaptive.py))
- **Logic**: Invoked on student check-in, rating updates, or availability changes:
  1. Preserves completed units (`status == "done"`) at their fixed past dates.
  2. Invokes `generate_pending_reviews()` to dynamically inject review units for decayed topics.
  3. Decays retrievability relative to `today`.
  4. Re-optimizes remaining units + review units into the future calendar horizon.

---

## 3. Function Signatures: Inputs & Outputs

### 3.1 `build_schedule`
```python
def build_schedule(
    request: PlanRequest,
    horizon_days: int = 90,
    mastery_override: dict[str, float] | None = None,
    max_daily_difficulty: int = 8,
    auto_slice: bool = False,
    enable_interleaving: bool = True,
) -> list[ScheduleEntry]
```
- **Inputs**:
  - `request`: `PlanRequest` with units, confidence ratings, availability, exam dates, start date.
  - `auto_slice`: If `True`, automatically slices oversized units across multiple days. If `False`, strictly validates single-day capacity.
  - `enable_interleaving`: If `True`, enforces multi-subject cognitive interleaving on large study days.
- **Outputs**:
  - List of `ScheduleEntry` records with assigned dates and review flags.

### 3.2 `rebuild_schedule`
```python
def rebuild_schedule(
    request: PlanRequest,
    existing_entries: list[ScheduleEntry],
    today: date,
    half_life_days: int = 14,
    horizon_days: int = 90,
    spawn_reviews: bool = True,
    auto_slice: bool = True,
) -> list[ScheduleEntry]
```
- **Inputs**:
  - `request`: Current `PlanRequest`.
  - `existing_entries`: Prior schedule entries.
  - `today`: Current date.
  - `spawn_reviews`: If `True`, dynamically generates and schedules review units when $R < 0.75$.
  - `auto_slice`: If `True`, automatically slices oversized units.
- **Outputs**:
  - Combined list: Preserved completed entries + freshly optimized plan for remaining units and reviews.

---

## 4. Setup & Running Locally

### 4.1 Prerequisites & Installation
- Python 3.12+
```powershell
# Windows PowerShell
python -m venv engine/.venv
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\engine\.venv\Scripts\Activate.ps1
pip install -r engine/requirements.txt
```

### 4.2 Running Tests
```bash
# Run unit & memory retention tests
pytest engine/tests/test_confidence_model.py engine/tests/test_baseline_scheduler.py engine/tests/test_against_adaptive.py -v

# Run full population synthetic test suite
pytest engine/tests/test_against_synthetic.py -v
```