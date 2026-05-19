-- ============================================================
-- Instructor invites: tokenized signup links emailed by admins
-- so instructors can self-create their portal account without
-- admins typing passwords. Idempotent — safe to re-run.
-- ============================================================

create table if not exists instructor_invites (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null,
  first_name   text not null,
  last_name    text not null,
  token        text not null unique,
  invited_by   uuid references profiles(id) on delete set null,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  used_by      uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists instructor_invites_token on instructor_invites(token);
create index if not exists instructor_invites_email on instructor_invites(email);

alter table instructor_invites enable row level security;

drop policy if exists "admins_all_invites" on instructor_invites;
create policy "admins_all_invites" on instructor_invites for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
