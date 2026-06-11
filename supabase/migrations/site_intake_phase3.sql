-- Site intake — Phase 3: convert a submission into a new family + portal invite
--
-- Adds the 'invited' status. When an admin converts an unmatched submission,
-- we create an `account_invites` row (role=parent), email the invite, and mark
-- the intake row 'invited'. The parent's profile + dancer are materialized on
-- accept by the existing /api/account-invites/accept flow (via metadata.dancer).
--
-- Idempotent. Safe to re-run.

-- The status check constraint is defined inline on the table, so Postgres names
-- it `site_intake_status_check`. Drop and re-add to include 'invited'.
alter table site_intake drop constraint if exists site_intake_status_check;
alter table site_intake add constraint site_intake_status_check
  check (status in ('new', 'matched', 'dismissed', 'duplicate', 'invited'));

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('site_intake_phase3.sql') on conflict (filename) do nothing;
