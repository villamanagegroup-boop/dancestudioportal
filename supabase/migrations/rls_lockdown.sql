-- RLS lockdown — close the open public.* rows to the anon/authenticated API.
--
-- Model: the app reads/writes through the SERVICE-ROLE client (which BYPASSES
-- RLS), and the member portals now do too (scoped per-guardian in the query).
-- So enabling RLS with no permissive policy = default-deny for anyone holding
-- only the public anon key, while the app keeps working unchanged.
--
-- We also add an admin-all policy (for any future authenticated-admin access)
-- and PRESERVE the existing self-read policies (profiles, documents,
-- policy_acceptances, instructor_hours, communications, …) — this migration is
-- additive to those.
--
-- profiles is intentionally skipped for the admin-all policy: a policy on
-- profiles that subqueries profiles would recurse. It keeps its self-read
-- policy; admins reach all profiles via the service-role client.
-- Idempotent. Safe to re-run.

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    -- 1. Turn RLS on everywhere (no-op where already on). Default-deny.
    execute format('alter table public.%I enable row level security', t);

    -- 2. Admin-all (skip profiles to avoid policy recursion).
    if t <> 'profiles' then
      execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
      execute format(
        'create policy %I on public.%I for all to authenticated '
        'using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin'')) '
        'with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''admin''))',
        t || '_admin_all', t);
    end if;
  end loop;
end $$;
