-- Staff permissions module
-- Idempotent. Safe to re-run.

-- Each instructor gets a baseline role plus optional per-permission overrides.
alter table instructors add column if not exists staff_role text not null default 'instructor';
alter table instructors add column if not exists permission_overrides jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_staff_role_check') then
    alter table instructors add constraint instructors_staff_role_check
      check (staff_role in ('owner', 'manager', 'front_desk', 'instructor'));
  end if;
end $$;

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('staff_permissions_module.sql') on conflict (filename) do nothing;
