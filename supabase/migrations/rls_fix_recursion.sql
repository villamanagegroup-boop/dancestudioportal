-- Fix: "infinite recursion detected in policy for relation profiles".
--
-- A policy on `profiles` referenced `profiles` (an admin check that subqueries
-- the same table). Postgres then recurses whenever ANY table's policy subqueries
-- profiles for an admin check. We rebuild profiles with self-row-only policies
-- (no subquery, so nothing can recurse). Admins read other people's profiles via
-- the service-role client (the app already does), so no admin policy is needed
-- on profiles itself.
--
-- Other tables' admin policies still subquery profiles — that's fine now, because
-- reading profiles only applies the non-recursive self-read policy.
-- Idempotent. Safe to re-run.

do $$
declare p text;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p);
  end loop;
end $$;

alter table public.profiles enable row level security;

create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
