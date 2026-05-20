-- ============================================================
-- Soft additional roles: lets an account hold roles beyond its
-- primary profiles.role (e.g. an admin who is ALSO a parent).
-- instructor/partner already have their own linking tables; this
-- covers 'parent' (which has no dedicated table) and is future-proof
-- for other soft roles. Idempotent.
-- ============================================================

alter table profiles
  add column if not exists extra_roles text[] not null default '{}';

create index if not exists profiles_extra_roles_gin on profiles using gin (extra_roles);
