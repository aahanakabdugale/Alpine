-- Migration 0001: Subjects, students, and enrollment
-- Run in order: 0001 -> 0002 -> 0003 -> 0004

create table subjects (
    id            uuid primary key default gen_random_uuid(),
    name          text not null,
    category      text not null check (category in ('core', 'elective', 'honors')),
    group_name    text  -- 'open_elective' or 'honors'; NULL for core subjects
);

-- students.id mirrors auth.users.id from Supabase Auth (no separate password table)
create table students (
    id            uuid primary key,  -- = auth.users.id
    display_name  text,
    created_at    timestamptz not null default now()
);

create table student_subjects (
    student_id    uuid not null references students(id) on delete cascade,
    subject_id    uuid not null references subjects(id) on delete cascade,
    primary key (student_id, subject_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table subjects enable row level security;
create policy "anyone logged in can read subjects"
    on subjects for select
    using (auth.role() = 'authenticated');
-- No insert/update/delete policy -> only the service role (seed_runner.py) can write.

alter table students enable row level security;
create policy "students can view own profile"
    on students for select
    using (id = auth.uid());
create policy "students can update own profile"
    on students for update
    using (id = auth.uid());
-- INSERT into students is handled by a trigger on auth.users sign-up
-- (or the backend using the service role), not directly by the client.

alter table student_subjects enable row level security;
create policy "students can view own enrollments"
    on student_subjects for select
    using (student_id = auth.uid());
create policy "students can enroll themselves"
    on student_subjects for insert
    with check (student_id = auth.uid());
create policy "students can drop their own enrollment"
    on student_subjects for delete
    using (student_id = auth.uid());
