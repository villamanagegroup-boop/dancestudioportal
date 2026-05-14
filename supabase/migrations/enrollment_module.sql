-- Enrollment module
-- Idempotent. Safe to re-run.

-- Archive support: archived enrollments keep their status + history
-- but are hidden from default views.
alter table enrollments add column if not exists archived boolean not null default false;
create index if not exists enrollments_archived_idx on enrollments (archived);
