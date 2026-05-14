-- ============================================================
-- Studio operations: camps, parties, bookings
-- Run this AFTER schema.sql and BEFORE family_module.sql.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Tables ----------------------------------------------------------

create table if not exists camps (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  max_capacity integer default 20,
  price numeric(10,2) not null,
  age_min integer,
  age_max integer,
  instructor_id uuid references instructors(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists parties (
  id uuid primary key default uuid_generate_v4(),
  contact_name text not null,
  contact_email text,
  contact_phone text,
  event_date date not null,
  start_time time not null,
  end_time time not null,
  guest_count integer,
  package text,
  price numeric(10,2) default 0,
  deposit_paid boolean default false,
  status text not null default 'inquiry',
  notes text,
  room_id uuid references rooms(id) on delete set null,
  guardian_id uuid references profiles(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  booking_type text not null default 'rental',
  price numeric(10,2) default 0,
  status text not null default 'confirmed',
  notes text,
  room_id uuid references rooms(id) on delete set null,
  guardian_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 2. RLS -------------------------------------------------------------

alter table camps    enable row level security;
alter table parties  enable row level security;
alter table bookings enable row level security;

drop policy if exists "camps_active_readable" on camps;
create policy "camps_active_readable" on camps for select using (active = true);

drop policy if exists "admins_all_camps" on camps;
create policy "admins_all_camps" on camps for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "admins_all_parties" on parties;
create policy "admins_all_parties" on parties for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "guardians_own_parties" on parties;
create policy "guardians_own_parties" on parties for select using (guardian_id = auth.uid());

drop policy if exists "admins_all_bookings" on bookings;
create policy "admins_all_bookings" on bookings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "guardians_own_bookings" on bookings;
create policy "guardians_own_bookings" on bookings for select using (guardian_id = auth.uid());
