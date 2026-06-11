-- Profiles RLS: let an authenticated user read their own profile row.
--
-- Why: profiles had RLS enabled but NO select policy, so RLS-bound (SSR) reads
-- returned nothing. That misclassified admins/owners as parents in
-- getPortalViewer (role defaulted to 'parent' -> locked out of portals), and it
-- silently broke every `exists (select 1 from profiles where id = auth.uid()
-- and role = 'admin')` admin-check used in other tables' policies (the subquery
-- couldn't see the caller's own row). A self-read policy fixes both.
--
-- Scope is deliberately minimal — SELECT of one's OWN row only:
--   * No admin "read all profiles" policy: it would recurse (a profiles policy
--     that queries profiles) and isn't needed — admin tooling uses the
--     service-role client, which bypasses RLS entirely.
--   * No self-UPDATE policy: that would let a user rewrite their own `role`
--     column and self-escalate to admin. All profile writes go through the
--     service-role client.
--
-- Idempotent. Safe to re-run.

alter table profiles enable row level security;

drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select
  using (id = auth.uid());
