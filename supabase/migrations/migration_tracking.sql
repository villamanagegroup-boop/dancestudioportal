-- Migration tracking ledger.
-- RUN THIS FIRST (before any other migration). It creates the table that every
-- migration's trailing `insert into applied_migrations (...)` line writes to.
--
-- Going forward: end every new migration file with
--   insert into applied_migrations (filename) values ('your_file.sql') on conflict (filename) do nothing;
-- Then `select * from applied_migrations order by applied_at;` is your run history,
-- and supabase/check_migrations.sql cross-checks names against the files on disk.
--
-- Idempotent. Safe to re-run.

create table if not exists applied_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

-- Backfill: all migrations below were already applied by hand before tracking
-- existed (confirmed 2026-06-08). Marked applied so the ledger reflects reality.
insert into applied_migrations (filename) values
  ('account_invites_module.sql'),
  ('activities_partners_module.sql'),
  ('admin_documents_module.sql'),
  ('calendar_module.sql'),
  ('camp_module.sql'),
  ('checkout_links_recipient.sql'),
  ('checkout_module.sql'),
  ('class_module.sql'),
  ('communications_module.sql'),
  ('enrollment_module.sql'),
  ('extra_roles_module.sql'),
  ('family_module.sql'),
  ('fix_handle_new_user.sql'),
  ('instructor_portal_module.sql'),
  ('parent_portal.sql'),
  ('partner_role_module.sql'),
  ('party_module.sql'),
  ('paypal_vault_module.sql'),
  ('profiles_active.sql'),
  ('settings_module.sql'),
  ('site_intake_module.sql'),
  ('site_intake_phase3.sql'),
  ('staff_permissions_module.sql'),
  ('students_dob_optional.sql'),
  ('studio_operations.sql'),
  ('tuition_links_may2026.sql'),
  ('migration_tracking.sql')
on conflict (filename) do nothing;
