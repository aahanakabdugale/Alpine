-- Migration 0002: Curriculum hierarchy
-- Same shape for core, elective, and honors subjects.

create table modules (
    id                 uuid primary key default gen_random_uuid(),
    subject_id         uuid not null references subjects(id) on delete cascade,
    name               text not null,
    order_index        int not null,
    assessment_phase   text not null check (assessment_phase in ('UT1', 'UT2'))
);

create table topics (
    id             uuid primary key default gen_random_uuid(),
    module_id      uuid not null references modules(id) on delete cascade,
    name           text not null,
    order_index    int not null,
    est_difficulty int check (est_difficulty between 1 and 5),
    est_hours      numeric(5,2)
);

create table subtopics (
    id           uuid primary key default gen_random_uuid(),
    topic_id     uuid not null references topics(id) on delete cascade,
    name         text not null,
    order_index  int not null,
    est_hours    numeric(5,2)
);

create table topic_dependencies (
    topic_id             uuid not null references topics(id) on delete cascade,
    depends_on_topic_id  uuid not null references topics(id) on delete cascade,
    primary key (topic_id, depends_on_topic_id),
    check (topic_id <> depends_on_topic_id)
);

create index idx_modules_subject on modules(subject_id);
create index idx_topics_module on topics(module_id);
create index idx_subtopics_topic on subtopics(topic_id);

-- ============================================================
-- ROW LEVEL SECURITY — shared reference data, read-only for everyone,
-- writable only by the service role (seed_runner.py).
-- ============================================================

alter table modules enable row level security;
create policy "anyone logged in can read modules"
    on modules for select
    using (auth.role() = 'authenticated');

alter table topics enable row level security;
create policy "anyone logged in can read topics"
    on topics for select
    using (auth.role() = 'authenticated');

alter table subtopics enable row level security;
create policy "anyone logged in can read subtopics"
    on subtopics for select
    using (auth.role() = 'authenticated');

alter table topic_dependencies enable row level security;
create policy "anyone logged in can read dependencies"
    on topic_dependencies for select
    using (auth.role() = 'authenticated');
