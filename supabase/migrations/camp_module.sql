-- Camp module
-- Idempotent. Safe to re-run.

-- New camp columns
alter table camps add column if not exists deposit_amount numeric(10,2);
alter table camps add column if not exists registration_open boolean not null default true;
alter table camps add column if not exists what_to_bring text;
alter table camps add column if not exists parent_notes text;

-- Registrations
create table if not exists camp_registrations (
  id uuid primary key default uuid_generate_v4(),
  camp_id uuid not null references camps(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'waitlisted', 'cancelled', 'completed')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit', 'paid', 'refunded', 'waived')),
  amount_paid numeric(10,2) not null default 0,
  waitlist_position integer,
  notes text,
  archived boolean not null default false,
  registered_at timestamptz not null default now(),
  unique(camp_id, student_id)
);
create index if not exists camp_registrations_camp_idx on camp_registrations (camp_id);

-- Attendance (per-day)
create table if not exists camp_attendance (
  id uuid primary key default uuid_generate_v4(),
  camp_id uuid not null references camps(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  attend_date date not null,
  present boolean not null default false,
  checked_in_at timestamptz,
  notes text,
  unique(camp_id, student_id, attend_date)
);
create index if not exists camp_attendance_camp_idx on camp_attendance (camp_id);

-- Itinerary
create table if not exists camp_itinerary (
  id uuid primary key default uuid_generate_v4(),
  camp_id uuid not null references camps(id) on delete cascade,
  day_date date not null,
  start_time time,
  end_time time,
  title text not null,
  location text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists camp_itinerary_camp_idx on camp_itinerary (camp_id);

-- Files
create table if not exists camp_files (
  id uuid primary key default uuid_generate_v4(),
  camp_id uuid not null references camps(id) on delete cascade,
  name text not null,
  category text not null default 'document'
    check (category in ('packing_list', 'schedule', 'waiver', 'music', 'document', 'other')),
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists camp_files_camp_idx on camp_files (camp_id);

-- RLS
alter table camp_registrations enable row level security;
drop policy if exists "admins_all_camp_registrations" on camp_registrations;
create policy "admins_all_camp_registrations" on camp_registrations for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table camp_attendance enable row level security;
drop policy if exists "admins_all_camp_attendance" on camp_attendance;
create policy "admins_all_camp_attendance" on camp_attendance for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table camp_itinerary enable row level security;
drop policy if exists "admins_all_camp_itinerary" on camp_itinerary;
create policy "admins_all_camp_itinerary" on camp_itinerary for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "camp_itinerary_readable" on camp_itinerary;
create policy "camp_itinerary_readable" on camp_itinerary for select using (true);

alter table camp_files enable row level security;
drop policy if exists "admins_all_camp_files" on camp_files;
create policy "admins_all_camp_files" on camp_files for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Storage bucket for camp files
insert into storage.buckets (id, name, public)
values ('camp-files', 'camp-files', false)
on conflict (id) do nothing;

drop policy if exists "admins_all_camp_files_storage" on storage.objects;
create policy "admins_all_camp_files_storage" on storage.objects for all using (
  bucket_id = 'camp-files'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
