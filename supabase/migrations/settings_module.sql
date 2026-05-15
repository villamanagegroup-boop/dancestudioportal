-- Settings module
-- Idempotent. Safe to re-run.

-- Key/value studio settings store: portal preferences, studio profile, finance flags
create table if not exists studio_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tax rates (finance settings)
create table if not exists tax_rates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  rate numeric(6,4) not null default 0,
  region text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Charge categories (finance settings)
create table if not exists charge_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table studio_settings enable row level security;
drop policy if exists "admins_all_studio_settings" on studio_settings;
create policy "admins_all_studio_settings" on studio_settings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- portal preference flags are read by the parent & instructor portals
drop policy if exists "authenticated_read_studio_settings" on studio_settings;
create policy "authenticated_read_studio_settings" on studio_settings for select using (
  auth.uid() is not null
);

alter table tax_rates enable row level security;
drop policy if exists "admins_all_tax_rates" on tax_rates;
create policy "admins_all_tax_rates" on tax_rates for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table charge_categories enable row level security;
drop policy if exists "admins_all_charge_categories" on charge_categories;
create policy "admins_all_charge_categories" on charge_categories for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Seed common charge categories on first run
do $$
begin
  if not exists (select 1 from charge_categories) then
    insert into charge_categories (name, description) values
      ('Tuition', 'Recurring class tuition charges'),
      ('Registration Fee', 'Annual or one-time registration / membership fees'),
      ('Costume', 'Recital and performance costume charges'),
      ('Recital', 'Recital tickets and production fees'),
      ('Retail', 'Pro shop and merchandise sales');
  end if;
end $$;
