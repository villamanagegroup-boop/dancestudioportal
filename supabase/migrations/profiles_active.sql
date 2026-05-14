-- ============================================================
-- Add an active flag to profiles so family accounts can be archived.
-- Idempotent — safe to re-run.
-- ============================================================

alter table profiles
  add column if not exists active boolean not null default true;
