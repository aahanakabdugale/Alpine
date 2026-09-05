# database/ — Member A (Data & Content Layer)

Everything here is self-contained: you can set up and populate the full
database without FastAPI, React, or anything from `engine/`/`backend/`
running. That's what lets Member B and Member C build against real data
without waiting on each other.

## Setup order

1. Create a Supabase project (free tier).
2. In Supabase's SQL Editor, run the four migrations **in order**:
   - `migrations/0001_subjects_and_enrollment.sql`
   - `migrations/0002_curriculum_hierarchy.sql`
   - `migrations/0003_student_progress.sql`
   - `migrations/0004_exam_dates.sql`

   Each file also enables Row Level Security and sets policies for its
   own tables right after creating them — so security is never a
   separate afterthought step.

3. Generate the curriculum seed SQL:
   ```
   python database/seed/seed_runner.py
   ```
   This reads `seed/curriculum/core_subjects.json`, `electives.json`,
   `honors.json`, and `seed/exam_dates.json`, computes `est_difficulty`/
   `est_hours` for every topic via `synthetic/generate_estimates.py`, and
   writes `seed/curriculum_seed.sql`. Copy that file's contents into
   Supabase's SQL Editor and run it.

4. Generate synthetic test students:
   ```
   python database/synthetic/generate_students.py
   ```
   Writes `synthetic/synthetic_students_seed.sql` — paste that into
   Supabase's SQL Editor too. These are fake students Member B can
   validate the scheduler/mastery logic against before real students
   exist (per PRD §4 point 2).

## Why the seed data is JSON, not hand-written SQL

`seed/curriculum/*.json` holds the actual digitized syllabus content —
subject name, category, modules (with UT1/UT2 tagging), topics, and
subtopics where they exist. Keeping this as data (not SQL) means:
- Editing/correcting content doesn't require touching any code.
- `seed_runner.py` is the only place that knows how to turn content into
  valid SQL (UUID generation, dependency chaining, difficulty/hours
  estimation) — so that logic lives in exactly one place.
- It's easy to see at a glance what's populated and what's still
  missing (e.g. `Multidisciplinary Minor` currently has `"modules": []`
  because its syllabus content hasn't been provided yet).

## Known gaps (as of this seed)

- **Multidisciplinary Minor** — no syllabus content available yet.
  Subject row exists, modules list is empty.
- **Embedded Systems and RTOS** — has full curriculum content but no
  `exam_dates`, since its exam date wasn't in the timetable shared so
  far. `seed_runner.py` will print a warning naming it every time you
  regenerate the seed, so it won't get silently forgotten.

## Design notes for your viva

- **assessment_phase**: modules 1-3 of every subject → UT1, modules 4-6
  → UT2. This is a fixed convention for this project, not something
  derived per-subject from actual content weight.
- **topic_dependencies**: topics are chained in syllabus order within
  each subject (topic N depends on the topic directly before it, across
  module boundaries too). This is a simplifying assumption — the real
  syllabus doesn't spell out fine-grained prerequisites — that encodes
  "study this in the order the syllabus presents it." Member B can
  layer richer dependency data on top later if needed.
- **RLS pattern**: student-owned tables (`students`, `student_subjects`,
  `availability`, `topic_confidence`, `schedule_entries`) restrict rows
  to `student_id = auth.uid()`. Shared curriculum/reference tables
  (`subjects`, `modules`, `topics`, `subtopics`, `topic_dependencies`,
  `baseline_schedules`, `exam_dates`) are read-only for any
  authenticated user — only the service role (used when running seed
  scripts) can write to them.
