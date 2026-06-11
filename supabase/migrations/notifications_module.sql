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
