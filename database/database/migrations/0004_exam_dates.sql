-- Migration 0004: Baseline schedules and exam dates

create table baseline_schedules (
    id               uuid primary key default gen_random_uuid(),
    subject_id       uuid not null references subjects(id) on delete cascade,
    topic_id         uuid not null references topics(id) on delete cascade,
    subtopic_id      uuid references subtopics(id) on delete cascade,
    suggested_order  int not null
);

create unique index uq_baseline_with_subtopic
    on baseline_schedules(subject_id, topic_id, subtopic_id)
    where subtopic_id is not null;
create unique index uq_baseline_no_subtopic
    on baseline_schedules(subject_id, topic_id)
    where subtopic_id is null;

create table exam_dates (
    subject_id   uuid not null references subjects(id) on delete cascade,
    exam_type    text not null check (exam_type in ('UT1', 'UT2', 'end_sem')),
    exam_date    date not null,
    primary key (subject_id, exam_type)
);

-- ============================================================
-- ROW LEVEL SECURITY — shared reference data, read-only for everyone
-- ============================================================

alter table baseline_schedules enable row level security;
create policy "anyone logged in can read baseline schedules"
    on baseline_schedules for select
    using (auth.role() = 'authenticated');

alter table exam_dates enable row level security;
create policy "anyone logged in can read exam dates"
    on exam_dates for select
    using (auth.role() = 'authenticated');
