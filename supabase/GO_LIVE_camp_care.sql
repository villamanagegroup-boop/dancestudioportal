-- ============================================================
-- GO-LIVE bundle — Camp before/after care tracking.
-- Run once in the Supabase SQL editor. Idempotent; safe to re-run.
--
-- Contents:
--   1. camp_care table + indexes + RLS  (= supabase/migrations/camp_care.sql)
--   2. Backfill: Alex Van Deusen's 3 aftercare days (6/15–6/17, $15/day, DUE)
--      that were previously only in his registration notes.
-- ============================================================

-- 1. ---------------------------------------------------------- camp_care table
create table if not exists camp_care (
  id              uuid primary key default uuid_generate_v4(),
  registration_id uuid not null references camp_registrations(id) on delete cascade,
  camp_id         uuid not null references camps(id) on delete cascade,
  student_id      uuid not null references students(id) on delete cascade,
  kind            text not null check (kind in ('before', 'after')),
  care_date       date,
  days            integer not null default 1 check (days >= 1),
  hours           numeric(4,2) not null default 1 check (hours > 0),
  rate            numeric(10,2) not null default 15,
  amount          numeric(10,2) not null default 0,
  care_time       text,
  paid            boolean not null default false,
  paid_at         timestamptz,
  source          text not null default 'manual' check (source in ('manual', 'website', 'backfill')),
  notes           text,
  created_at      timestamptz not null default now(),
  tenant_id       uuid
);

create index if not exists camp_care_registration_idx on camp_care (registration_id);
create index if not exists camp_care_camp_idx on camp_care (camp_id);
create index if not exists camp_care_student_idx on camp_care (student_id);
create unique index if not exists camp_care_reg_kind_date_key
  on camp_care (registration_id, kind, care_date)
  where care_date is not null;

alter table camp_care enable row level security;
drop policy if exists "admins_all_camp_care" on camp_care;
create policy "admins_all_camp_care" on camp_care for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

insert into applied_migrations (filename) values ('camp_care.sql') on conflict (filename) do nothing;

-- 2. ------------------------------------------------- Backfill: Alex Van Deusen
-- Registration acb181e3 · Rainbow Remix (camp 9f9eca78) · student 47121bcb.
-- 3 aftercare days @ $15 (1 hr each), unpaid. care_time null (exact pickup
-- unknown; $15 = 1 hr past the 3:45 PM after-care start).
insert into camp_care
  (registration_id, camp_id, student_id, kind, care_date, days, hours, rate, amount, paid, source, notes)
values
  ('acb181e3-a325-492b-92ce-8d3f921aef9d', '9f9eca78-5a34-45cc-8a5f-4eb8d498b01b', '47121bcb-6315-4921-a617-241e3700c92d', 'after', '2026-06-15', 1, 1, 15, 15, false, 'backfill', 'Migrated from registration notes 2026-06-14'),
  ('acb181e3-a325-492b-92ce-8d3f921aef9d', '9f9eca78-5a34-45cc-8a5f-4eb8d498b01b', '47121bcb-6315-4921-a617-241e3700c92d', 'after', '2026-06-16', 1, 1, 15, 15, false, 'backfill', 'Migrated from registration notes 2026-06-14'),
  ('acb181e3-a325-492b-92ce-8d3f921aef9d', '9f9eca78-5a34-45cc-8a5f-4eb8d498b01b', '47121bcb-6315-4921-a617-241e3700c92d', 'after', '2026-06-17', 1, 1, 15, 15, false, 'backfill', 'Migrated from registration notes 2026-06-14')
on conflict (registration_id, kind, care_date) where care_date is not null do nothing;

-- Replace the inline "$45 DUE" sentence in Alex's notes with a pointer (the
-- amount now lives in camp_care, so we don't want it double-counted by eye).
update camp_registrations
set notes = replace(
  notes,
  ' · Aftercare added 2026-06-14: 6/15 $15.00, 6/16 $15.00, 6/17 $15.00 — $45.00 DUE (unpaid).',
  ' · Aftercare ($45, 3 days) now tracked in the Care tab.'
)
where id = 'acb181e3-a325-492b-92ce-8d3f921aef9d';
