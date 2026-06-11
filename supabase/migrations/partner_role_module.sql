-- ============================================================
-- Partner role: add 'partner' to user_role enum so partners can
-- have portal accounts, link partners → profiles, broaden the
-- account_invites role check. Idempotent — safe to re-run.
--
-- NOTE: enum value additions in Postgres must run outside an
-- explicit transaction in some clients. If your SQL Editor wraps
-- everything in a transaction and the enum step fails, run the
-- `alter type` line alone first, then re-run this file.
-- ============================================================

-- 1. Add 'partner' to user_role enum
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'partner'
  ) then
    alter type user_role add value 'partner';
  end if;
end $$;

-- 2. Link partners → profiles
alter table partners add column if not exists profile_id uuid references profiles(id) on delete set null;
create index if not exists partners_profile_id_idx on partners(profile_id);

-- 3. Update account_invites role check to include 'partner'
alter table account_invites drop constraint if exists account_invites_role_check;
alter table account_invites add constraint account_invites_role_check
  check (role::text in ('parent', 'instructor', 'partner'));

-- 4. RLS: partners can read their own row + their bookings
drop policy if exists "partners_own_row" on partners;
create policy "partners_own_row" on partners for select
  using (profile_id = auth.uid());

drop policy if exists "partners_own_bookings" on bookings;
create policy "partners_own_bookings" on bookings for select
  using (
    partner_id is not null
    and exists (
      select 1 from partners
      where partners.id = bookings.partner_id
        and partners.profile_id = auth.uid()
    )
  );

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('partner_role_module.sql') on conflict (filename) do nothing;
