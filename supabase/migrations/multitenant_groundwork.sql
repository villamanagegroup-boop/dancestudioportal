-- Multi-tenant groundwork (additive, non-breaking).
-- Introduces a `tenants` table, seeds the current studio, and adds a nullable
-- `tenant_id` to every table, backfilled to that one tenant. Nothing is enforced
-- yet — this is the hook so future tenant scoping is a backfill, not a rewrite.
-- Idempotent. Safe to re-run.

create table if not exists tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique,
  code        text,            -- family-ID prefix shown to families, e.g. CCD
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed the existing studio as tenant #1 (only if none exists).
insert into tenants (name, slug, code)
select 'Capital Core Dance Studio', 'capital-core', 'CCD'
where not exists (select 1 from tenants);

-- Add tenant_id to every public table and backfill to the default tenant.
do $$
declare t text; default_tenant uuid;
begin
  select id into default_tenant from tenants order by created_at limit 1;
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('tenants', 'applied_migrations')
  loop
    execute format('alter table public.%I add column if not exists tenant_id uuid references tenants(id)', t);
    execute format('update public.%I set tenant_id = %L where tenant_id is null', t, default_tenant);
  end loop;
end $$;

-- Helpful indexes on the busiest lookups.
create index if not exists profiles_tenant_idx  on profiles  (tenant_id);
create index if not exists students_tenant_idx  on students  (tenant_id);
create index if not exists families_tenant_idx  on families  (tenant_id);
