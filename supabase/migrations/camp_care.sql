-- Camp before/after care — structured, billable line items.
--
-- Until now, before/after care was only ever recorded as free text in
-- camp_registrations.notes (e.g. "Aftercare added: 6/15 $15..."). That is not
-- queryable, not payable, and never rolls into a camper balance. This table
-- makes care a first-class add-on: one row per care line, priced at the studio
-- rate ($15/hr — mirrors CARE_RATE on the public registration form), tracked
-- paid/unpaid, and summable per registration / per camp.
--
-- A row is either:
--   * per-day      → care_date set, days = 1   (manual entry, backfill)
--   * an aggregate → care_date null, days = N   (website summary: N care days)
-- amount is always hours * rate * days, stored explicitly so historical rows
-- stay stable if the rate ever changes.
--
-- Idempotent. Safe to re-run.

create table if not exists camp_care (
  id              uuid primary key default uuid_generate_v4(),
  registration_id uuid not null references camp_registrations(id) on delete cascade,
  camp_id         uuid not null references camps(id) on delete cascade,
  student_id      uuid not null references students(id) on delete cascade,
  kind            text not null check (kind in ('before', 'after')),
  care_date       date,                                  -- specific day, or null for an aggregate line
  days            integer not null default 1 check (days >= 1),
  hours           numeric(4,2) not null default 1 check (hours > 0),
  rate            numeric(10,2) not null default 15,
  amount          numeric(10,2) not null default 0,      -- hours * rate * days
  care_time       text,                                  -- drop-off (before) / pickup (after), e.g. '4:30'
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

-- One care line per (registration, kind, day). Aggregate rows (care_date null)
-- are exempt — a registration may carry both a backfilled per-day set and a
-- separately-entered aggregate without colliding.
create unique index if not exists camp_care_reg_kind_date_key
  on camp_care (registration_id, kind, care_date)
  where care_date is not null;

-- RLS — mirror camp_registrations: admins do everything.
alter table camp_care enable row level security;
drop policy if exists "admins_all_camp_care" on camp_care;
create policy "admins_all_camp_care" on camp_care for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('camp_care.sql') on conflict (filename) do nothing;
