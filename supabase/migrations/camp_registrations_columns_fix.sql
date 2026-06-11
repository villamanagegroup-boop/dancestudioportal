-- Corrective migration: backfill columns missing from camp_registrations.
--
-- The live camp_registrations table was created by an earlier, reduced
-- definition (only id, camp_id, student_id, status, notes). camp_module.sql
-- redefines the full table with `create table if not exists`, which is a no-op
-- when the table already exists — so these columns were never added in prod:
--   payment_status, amount_paid, waitlist_position, archived, registered_at
--
-- Discovered 2026-06-08 while importing the iClassPro camp enrollments.
-- Definitions below match camp_module.sql exactly. Idempotent — safe to re-run.

alter table camp_registrations
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists amount_paid numeric(10,2) not null default 0,
  add column if not exists waitlist_position integer,
  add column if not exists archived boolean not null default false,
  add column if not exists registered_at timestamptz not null default now();

-- Ensure the payment_status check constraint exists (column add above can't
-- carry an inline check idempotently). Table is empty, so no violation risk.
alter table camp_registrations drop constraint if exists camp_registrations_payment_status_check;
alter table camp_registrations add constraint camp_registrations_payment_status_check
  check (payment_status in ('unpaid', 'deposit', 'paid', 'refunded', 'waived'));

-- Ensure the status check constraint matches camp_module.sql too.
alter table camp_registrations drop constraint if exists camp_registrations_status_check;
alter table camp_registrations add constraint camp_registrations_status_check
  check (status in ('registered', 'waitlisted', 'cancelled', 'completed'));

-- Legacy column reconciliation. The pre-existing table carried a guardian_id
-- column (NOT NULL, FK profiles) that camp_module.sql never declared. None of
-- the app's insert paths (admin add, parent self-register) set it, so every
-- portal camp registration would fail the NOT NULL constraint. Make it nullable
-- so the app works; the guardian is always derivable via student -> guardian_students.
alter table camp_registrations alter column guardian_id drop not null;

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('camp_registrations_columns_fix.sql') on conflict (filename) do nothing;
