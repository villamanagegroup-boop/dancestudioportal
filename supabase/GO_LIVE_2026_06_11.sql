-- ============================================================
-- GO-LIVE bundle 2026-06-11 — run once in the Supabase SQL editor.
-- All blocks are idempotent and ordered (notifications before the
-- signup-notify trigger). Safe to re-run.
-- ============================================================


-- ======================== activity_log_module.sql ========================

-- Unified activity log — one row per meaningful action across the whole portal.
-- Cross-cutting audit trail: logins + create/update/delete by staff, admins, and
-- families. Written via the SERVICE-ROLE client from API routes (lib/activity.ts),
-- so RLS here only gates any future direct authenticated access — the app reads
-- it through the service-role client (RLS bypass).
--
-- This is the unified successor to the per-entity family_activity_log /
-- student_activity_log tables (those stay for their existing per-record trails).
-- Idempotent. Safe to re-run.

create table if not exists activity_log (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid references tenants(id),
  actor_id      uuid references profiles(id) on delete set null,
  actor_role    text,                 -- 'admin' | 'instructor' | 'partner' | 'parent' | null (system/webhook)
  actor_name    text,                 -- denormalized display name; survives profile deletion
  action        text not null,        -- dotted verb, e.g. 'student.updated', 'auth.signed_in'
  target_table  text,                 -- e.g. 'students'
  target_id     uuid,                 -- the affected row, when it has a uuid id
  target_label  text,                 -- human-readable, e.g. 'Jane Doe'
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists activity_log_created_idx on activity_log (created_at desc);
create index if not exists activity_log_actor_idx   on activity_log (actor_id, created_at desc);
create index if not exists activity_log_target_idx  on activity_log (target_table, target_id, created_at desc);
create index if not exists activity_log_tenant_idx  on activity_log (tenant_id, created_at desc);

alter table activity_log enable row level security;
drop policy if exists activity_log_admin_all on activity_log;
create policy activity_log_admin_all on activity_log for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));


-- ======================== notifications_module.sql ========================

-- In-app notifications — studio-facing alerts for events that need attention:
-- new site intake, new registrations, payments, etc. Written via the
-- service-role client from API routes (lib/notify.ts) at the same event points
-- as the activity_log, and surfaced in the admin shell's bell menu.
--
-- Audience model (phase 1): notifications are studio-level and target staff
-- (audience = 'admin'). `recipient_id` optionally narrows to one user. The
-- `read` flag is shared at the studio level — fine for a single front-desk
-- admin; a per-user read table can come later if multiple admins need
-- independent read state.
-- Idempotent. Safe to re-run.

create table if not exists notifications (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid references tenants(id),
  audience      text not null default 'admin',   -- which portal/role should see it
  recipient_id  uuid references profiles(id) on delete cascade,  -- optional: a specific user
  type          text not null,                   -- dotted key, mirrors activity action e.g. 'intake.received'
  title         text not null,
  body          text,
  href          text,                            -- where the bell item navigates
  read          boolean not null default false,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_feed_idx on notifications (audience, read, created_at desc);
create index if not exists notifications_recipient_idx on notifications (recipient_id, created_at desc);
create index if not exists notifications_tenant_idx on notifications (tenant_id, created_at desc);

alter table notifications enable row level security;
drop policy if exists notifications_admin_all on notifications;
create policy notifications_admin_all on notifications for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));


-- ======================== admin_profile_fields.sql ========================

-- Admin/staff profile fields on profiles — lets an administrator be a real,
-- editable person (photo, title, bio) rather than just a name + role. These are
-- generic profile columns, so any profile (admin, instructor-linked, partner)
-- can carry them; the admin profile page + the self-service Account form in
-- Settings read/write them.
-- Idempotent. Safe to re-run.

alter table profiles
  add column if not exists job_title text,
  add column if not exists bio       text,
  add column if not exists photo_url text;


-- ======================== staff_ids.sql ========================

-- Human-friendly staff ID numbers — the staff analog of family IDs.
-- Each instructor/staff record gets a 4-digit staff_no (1000–9999), shown as
-- <studio_code>S<no>, e.g. CCDS1001. The "S" keeps it visually distinct from a
-- family ID (CCD1042). Mirrors families_and_ids.sql.
-- Idempotent. Safe to re-run.

create sequence if not exists staff_no_seq start 1000 minvalue 1000 maxvalue 9999 no cycle;

alter table instructors add column if not exists staff_no integer;
create unique index if not exists instructors_staff_no_key on instructors (staff_no);

-- Backfill existing staff in a stable order.
update instructors set staff_no = nextval('staff_no_seq')
  where staff_no is null
  and id in (select id from instructors where staff_no is null order by created_at);

-- Auto-assign on insert.
create or replace function assign_staff_no() returns trigger as $$
begin
  if new.staff_no is null then
    new.staff_no := nextval('staff_no_seq');
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists instructors_staff_no on instructors;
create trigger instructors_staff_no before insert on instructors
  for each row execute function assign_staff_no();


-- ======================== oauth_user_names.sql ========================

-- Populate first/last name from OAuth metadata (Google) on signup.
-- Password signups send first_name/last_name in metadata; Google OAuth instead
-- sends given_name / family_name / full_name (+ name). Extend handle_new_user()
-- to fall back to those so a Google signup doesn't land with a blank name.
-- Replaces the function the existing on_auth_user_created trigger points to.
-- Idempotent. Safe to re-run.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  fn text;
  ln text;
begin
  fn := coalesce(
    nullif(meta->>'first_name', ''),
    meta->>'given_name',
    nullif(split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1), ''),
    ''
  );
  ln := coalesce(
    nullif(meta->>'last_name', ''),
    meta->>'family_name',
    ''
  );

  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    fn,
    ln,
    coalesce((meta->>'role')::public.user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into applied_migrations (filename) values ('oauth_user_names.sql') on conflict (filename) do nothing;


-- ======================== notify_on_signup.sql ========================

-- Notify admins when a new family self-signs up (email OR Google OAuth).
-- Fires AFTER INSERT on profiles for role='parent' and writes a notifications
-- row, so a new self-signup shows up in the admin bell. This is the visibility
-- guardrail for open sign-up.
--
-- Defensive: guarded by to_regclass so it's a no-op until notifications exists
-- (run notifications_module.sql first), and wrapped in exception handling so a
-- notification failure can NEVER block account creation.
-- Idempotent. Safe to re-run.

create or replace function notify_admin_new_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'parent' and to_regclass('public.notifications') is not null then
    begin
      insert into public.notifications (audience, type, title, body, href, metadata, tenant_id)
      values (
        'admin',
        'account.created',
        'New account',
        coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), new.email),
        '/families/' || new.id,
        jsonb_build_object('profile_id', new.id, 'email', new.email),
        new.tenant_id
      );
    exception when others then
      null; -- never block signup on a notification failure
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_new_account on profiles;
create trigger profiles_notify_new_account
  after insert on profiles
  for each row execute function notify_admin_new_account();

insert into applied_migrations (filename) values ('notify_on_signup.sql') on conflict (filename) do nothing;
