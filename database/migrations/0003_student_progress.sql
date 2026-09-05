-- Migration 0003: Student progress tracking

create table availability (
    student_id      uuid not null references students(id) on delete cascade,
    day_of_week     int not null check (day_of_week between 0 and 6),  -- 0=Sunday
    hours_available numeric(4,2) not null check (hours_available >= 0),
    primary key (student_id, day_of_week)
);

create table topic_confidence (
    id                 uuid primary key default gen_random_uuid(),
    student_id         uuid not null references students(id) on delete cascade,
    topic_id           uuid not null references topics(id) on delete cascade,
    subtopic_id        uuid references subtopics(id) on delete cascade,  -- NULL if topic has no subtopics
    confidence_rating  int not null check (confidence_rating between 1 and 5),
    last_updated       timestamptz not null default now()
);

-- Enforce "one row per schedulable unit" even though subtopic_id can be NULL
-- (a plain composite unique constraint would let NULLs duplicate silently)
create unique index uq_confidence_with_subtopic
    on topic_confidence(student_id, topic_id, subtopic_id)
    where subtopic_id is not null;
create unique index uq_confidence_no_subtopic
    on topic_confidence(student_id, topic_id)
    where subtopic_id is null;

create table schedule_entries (
    id             uuid primary key default gen_random_uuid(),
    student_id     uuid not null references students(id) on delete cascade,
    topic_id       uuid not null references topics(id) on delete cascade,
    subtopic_id    uuid references subtopics(id) on delete cascade,
    scheduled_date date not null,
    status         text not null default 'planned' check (status in ('planned', 'done', 'skipped'))
);

create index idx_schedule_student on schedule_entries(student_id);
create index idx_confidence_student on topic_confidence(student_id);

-- ============================================================
-- ROW LEVEL SECURITY — student-owned data, isolated per student
-- ============================================================

alter table availability enable row level security;
create policy "students can view own availability"
    on availability for select using (student_id = auth.uid());
create policy "students can insert own availability"
    on availability for insert with check (student_id = auth.uid());
create policy "students can update own availability"
    on availability for update using (student_id = auth.uid());
create policy "students can delete own availability"
    on availability for delete using (student_id = auth.uid());

alter table topic_confidence enable row level security;
create policy "students can view own confidence ratings"
    on topic_confidence for select using (student_id = auth.uid());
create policy "students can insert own confidence ratings"
    on topic_confidence for insert with check (student_id = auth.uid());
create policy "students can update own confidence ratings"
    on topic_confidence for update using (student_id = auth.uid());

alter table schedule_entries enable row level security;
create policy "students can view own schedule"
    on schedule_entries for select using (student_id = auth.uid());
create policy "students can insert own schedule entries"
    on schedule_entries for insert with check (student_id = auth.uid());
create policy "students can update own schedule entries"
    on schedule_entries for update using (student_id = auth.uid());
