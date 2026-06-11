-- ============================================================
-- Add an active flag to profiles so family accounts can be archived.
-- Idempotent — safe to re-run.
-- ============================================================

alter table profiles
  add column if not exists active boolean not null default true;

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('profiles_active.sql') on conflict (filename) do nothing;
