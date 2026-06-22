-- Email subscribers / mass-mailing list module
-- ------------------------------------------------------------------
-- The durable "mass email list" behind newsletters and studio-wide blasts.
-- This is the single source of truth for who may receive bulk email and who
-- has opted out. Contacts can exist here WITHOUT a portal account (e.g. the
-- 500+ historical emails on file), so the list is keyed by email address, not
-- profile id. When a contact does match a portal profile we link it and also
-- mirror the opt-out as a tag on the profile (see profiles columns below).
--
-- Suppression rule for every bulk send: only email rows with status='subscribed'.
--   subscribed   — may receive bulk email
--   unsubscribed — opted out via the unsubscribe link (do not email)
--   archived     — manually removed from the list by staff (do not email)
--
-- Unsubscribe is performed server-side (service role) by /api/unsubscribe using
-- an HMAC-signed link, so no public write policy is needed on this table.
--
-- Idempotent. Safe to re-run.

create table if not exists email_subscribers (
  id                 uuid primary key default uuid_generate_v4(),
  email              text not null,
  name               text,
  status             text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed', 'archived')),
  -- where this contact came from: 'seed', 'import', 'website', 'manual', etc.
  source             text,
  -- free-form labels for segmentation (e.g. {'camp','summer-2026'})
  tags               text[] not null default '{}'::text[],
  -- linked portal account, when the email matches a profile
  profile_id         uuid references profiles(id) on delete set null,
  unsubscribe_reason text,
  subscribed_at      timestamptz not null default now(),
  unsubscribed_at    timestamptz,
  last_emailed_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- One row per email address (case-insensitive).
create unique index if not exists email_subscribers_email_unique
  on email_subscribers (lower(email));
create index if not exists email_subscribers_status_idx  on email_subscribers (status);
create index if not exists email_subscribers_profile_idx on email_subscribers (profile_id);

-- Keep updated_at fresh on write.
create or replace function set_email_subscribers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_email_subscribers_updated_at on email_subscribers;
create trigger trg_email_subscribers_updated_at
  before update on email_subscribers
  for each row execute function set_email_subscribers_updated_at();

alter table email_subscribers enable row level security;

-- Staff manage the list from the portal. (Service-role server code bypasses RLS.)
-- Admins manage the list from the portal. (Service-role server code bypasses
-- RLS, so the senders/unsubscribe route are unaffected by this policy.)
-- NB: profiles.role is the user_role enum (admin/parent/instructor); staff
-- roles like owner/manager live on instructors.staff_role, not here.
drop policy if exists "staff_all_email_subscribers" on email_subscribers;
create policy "staff_all_email_subscribers" on email_subscribers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

comment on table email_subscribers is
  'Durable mass-mailing list + opt-out source of truth. Bulk sends email only status=subscribed rows. Unsubscribe writes happen server-side via /api/unsubscribe.';

-- Mirror opt-out onto the profile so it shows as a tag for staff who have an
-- account. Bulk senders should treat email_opt_out=true OR a non-subscribed
-- email_subscribers row as suppressed.
alter table profiles add column if not exists email_opt_out boolean not null default false;
alter table profiles add column if not exists email_opt_out_at timestamptz;

create index if not exists profiles_email_opt_out_idx on profiles (email_opt_out) where email_opt_out;

comment on column profiles.email_opt_out is
  'True when this family/contact unsubscribed from bulk email (mirrored from email_subscribers via /api/unsubscribe). Excluded from newsletters/blasts.';

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('email_subscribers.sql') on conflict (filename) do nothing;
