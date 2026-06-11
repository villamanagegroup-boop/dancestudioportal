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
