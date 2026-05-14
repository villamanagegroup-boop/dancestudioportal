-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ENUMS
create type user_role as enum ('admin', 'instructor', 'parent', 'student');
create type enrollment_status as enum ('active', 'waitlisted', 'dropped', 'completed', 'pending');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'waived');
create type class_level as enum ('beginner', 'intermediate', 'advanced', 'all_levels', 'pre_dance');
create type day_of_week as enum ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
create type invoice_type as enum ('tuition', 'registration', 'costume', 'recital', 'retail', 'other');
create type communication_type as enum ('email', 'sms', 'announcement', 'reminder');

-- PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'parent',
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STUDENTS
create table students (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  gender text,
  photo_url text,
  medical_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table guardian_students (
  id uuid primary key default uuid_generate_v4(),
  guardian_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relationship text default 'parent',
  is_primary boolean default true,
  unique(guardian_id, student_id)
);

-- INSTRUCTORS
create table instructors (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  bio text,
  specialties text[],
  certifications jsonb default '[]',
  background_check_date date,
  background_check_expires date,
  pay_rate numeric(10,2),
  pay_type text default 'hourly',
  active boolean default true,
  created_at timestamptz default now()
);

-- ROOMS
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  capacity integer,
  floor_type text,
  has_mirrors boolean default true,
  has_barres boolean default false,
  notes text,
  active boolean default true
);

-- CLASS CATALOG
create table class_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  style text not null,
  level class_level not null default 'all_levels',
  min_age integer,
  max_age integer,
  description text,
  color text default '#6366f1',
  active boolean default true
);

-- SEASONS
create table seasons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  registration_opens date,
  registration_closes date,
  tuition_due_day integer default 1,
  active boolean default false,
  created_at timestamptz default now()
);

-- CLASSES
create table classes (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references seasons(id) on delete cascade,
  class_type_id uuid not null references class_types(id),
  instructor_id uuid references instructors(id),
  room_id uuid references rooms(id),
  name text not null,
  description text,
  day_of_week day_of_week not null,
  start_time time not null,
  end_time time not null,
  start_date date,
  end_date date,
  registration_start date,
  registration_end date,
  max_students integer default 15,
  monthly_tuition numeric(10,2) not null,
  registration_fee numeric(10,2) default 0,
  billing_type text not null default 'monthly' check (billing_type in ('monthly', 'flat')),
  flat_amount numeric(10,2),
  allow_discounts boolean not null default true,
  age_min integer,
  age_max integer,
  gender text not null default 'any' check (gender in ('any', 'female', 'male', 'non-binary')),
  visible boolean not null default true,
  registration_open boolean not null default true,
  internal_registration_only boolean not null default false,
  notes text,
  stripe_price_id text,
  active boolean default true,
  created_at timestamptz default now()
);

-- STUDIO OPERATIONS (camps, parties, bookings)
create table camps (
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

create table parties (
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

create table bookings (
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

-- ENROLLMENTS
create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  season_id uuid references seasons(id),
  status enrollment_status not null default 'pending',
  enrolled_at timestamptz default now(),
  dropped_at timestamptz,
  waitlist_position integer,
  notes text,
  stripe_subscription_id text,
  unique(student_id, class_id, season_id)
);

-- ATTENDANCE
create table class_sessions (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references classes(id) on delete cascade,
  session_date date not null,
  cancelled boolean default false,
  cancel_reason text,
  makeup_offered boolean default false,
  notes text,
  unique(class_id, session_date)
);

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  present boolean default false,
  is_makeup boolean default false,
  checked_in_at timestamptz,
  notes text,
  unique(session_id, student_id)
);

-- CLASS FILES (costumes, music, documents)
create table class_files (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  category text not null default 'document'
    check (category in ('costume', 'music', 'document', 'other')),
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- CALENDAR EVENTS (meetings, blackouts, placeholders, one-off events)
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_type text not null default 'event'
    check (event_type in ('event', 'meeting', 'blackout', 'placeholder')),
  start_date date not null,
  end_date date,
  all_day boolean not null default false,
  start_time time,
  end_time time,
  room_id uuid references rooms(id) on delete set null,
  color text,
  notes text,
  recurrence text not null default 'none' check (recurrence in ('none', 'weekly')),
  recurrence_end date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- STUDIO HOURS (drives the calendar's visible range)
create table studio_hours (
  day_of_week day_of_week primary key,
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '21:00'
);

-- BILLING
create table payment_methods (
  id uuid primary key default uuid_generate_v4(),
  guardian_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_payment_method_id text,
  last_four text,
  card_brand text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  guardian_id uuid not null references profiles(id),
  student_id uuid references students(id),
  enrollment_id uuid references enrollments(id),
  invoice_type invoice_type not null default 'tuition',
  description text not null,
  amount numeric(10,2) not null,
  due_date date,
  paid_at timestamptz,
  status payment_status not null default 'pending',
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid references invoices(id),
  guardian_id uuid not null references profiles(id),
  amount numeric(10,2) not null,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method_last_four text,
  paid_at timestamptz default now(),
  refunded_at timestamptz,
  refund_amount numeric(10,2),
  notes text
);

-- DOCUMENTS
create table documents (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  guardian_id uuid references profiles(id) on delete cascade,
  title text not null,
  document_type text not null,
  storage_path text,
  signed_at timestamptz,
  expires_at date,
  required boolean default false,
  season_id uuid references seasons(id),
  created_at timestamptz default now()
);

-- COMMUNICATIONS
create table communications (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references profiles(id),
  subject text,
  body text not null,
  comm_type communication_type not null default 'email',
  target_all boolean default false,
  target_class_id uuid references classes(id),
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

create table communication_recipients (
  id uuid primary key default uuid_generate_v4(),
  communication_id uuid not null references communications(id) on delete cascade,
  guardian_id uuid references profiles(id),
  delivered_at timestamptz,
  opened_at timestamptz,
  error text
);

-- RLS
alter table profiles enable row level security;
alter table students enable row level security;
alter table guardian_students enable row level security;
alter table enrollments enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table documents enable row level security;
alter table communications enable row level security;
alter table communication_recipients enable row level security;
alter table attendance enable row level security;
alter table camps enable row level security;
alter table parties enable row level security;
alter table bookings enable row level security;
alter table class_files enable row level security;
create policy "admins_all_class_files" on class_files for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
alter table calendar_events enable row level security;
create policy "admins_all_calendar_events" on calendar_events for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
alter table studio_hours enable row level security;
create policy "admins_all_studio_hours" on studio_hours for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "studio_hours_readable" on studio_hours for select using (true);

-- SEED studio hours
insert into studio_hours (day_of_week, is_open, open_time, close_time) values
  ('monday',    true,  '09:00', '21:00'),
  ('tuesday',   true,  '09:00', '21:00'),
  ('wednesday', true,  '09:00', '21:00'),
  ('thursday',  true,  '09:00', '21:00'),
  ('friday',    true,  '09:00', '21:00'),
  ('saturday',  true,  '09:00', '17:00'),
  ('sunday',    false, '09:00', '17:00')
on conflict (day_of_week) do nothing;

create policy "users_own_profile" on profiles for all using (auth.uid() = id);
create policy "camps_active_readable" on camps for select using (active = true);
create policy "admins_all_camps" on camps for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admins_all_parties" on parties for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "guardians_own_parties" on parties for select using (guardian_id = auth.uid());
create policy "admins_all_bookings" on bookings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "guardians_own_bookings" on bookings for select using (guardian_id = auth.uid());
create policy "admins_all_profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "guardians_own_students" on students for select using (
  exists (select 1 from guardian_students where guardian_id = auth.uid() and student_id = students.id)
);
create policy "admins_all_students" on students for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'instructor'))
);
create policy "guardians_own_enrollments" on enrollments for select using (
  exists (select 1 from guardian_students where guardian_id = auth.uid() and student_id = enrollments.student_id)
);
create policy "admins_all_enrollments" on enrollments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "guardians_own_invoices" on invoices for select using (guardian_id = auth.uid());
create policy "admins_all_invoices" on invoices for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- FUNCTIONS
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger students_updated_at before update on students for each row execute function update_updated_at();

create or replace function promote_waitlist()
returns trigger as $$
declare
  next_waitlisted uuid;
  class_capacity integer;
  current_enrolled integer;
begin
  if old.status = 'active' and new.status in ('dropped', 'completed') then
    select max_students into class_capacity from classes where id = old.class_id;
    select count(*) into current_enrolled from enrollments
      where class_id = old.class_id and status = 'active';
    if current_enrolled < class_capacity then
      select id into next_waitlisted from enrollments
        where class_id = old.class_id and status = 'waitlisted'
        order by waitlist_position asc limit 1;
      if next_waitlisted is not null then
        update enrollments set status = 'active', waitlist_position = null
          where id = next_waitlisted;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger auto_promote_waitlist after update on enrollments for each row execute function promote_waitlist();

-- SEED DATA
insert into rooms (name, capacity, floor_type, has_mirrors, has_barres) values
  ('Studio A', 20, 'sprung hardwood', true, true),
  ('Studio B', 15, 'vinyl', true, false),
  ('Performance Hall', 30, 'sprung hardwood', true, true);

insert into class_types (name, style, level, min_age, max_age, color) values
  ('Tiny Tots Ballet', 'Ballet', 'pre_dance', 2, 4, '#ec4899'),
  ('Ballet Beginner', 'Ballet', 'beginner', 5, 8, '#8b5cf6'),
  ('Ballet Intermediate', 'Ballet', 'intermediate', 9, 12, '#6366f1'),
  ('Hip Hop Beginner', 'Hip Hop', 'beginner', 6, 10, '#f59e0b'),
  ('Hip Hop Intermediate', 'Hip Hop', 'intermediate', 10, 14, '#f97316'),
  ('Jazz Foundation', 'Jazz', 'beginner', 7, 11, '#10b981'),
  ('Contemporary', 'Contemporary', 'intermediate', 13, 18, '#06b6d4'),
  ('Tap Basics', 'Tap', 'beginner', 6, 10, '#84cc16'),
  ('Acro/Tumbling', 'Acrobatics', 'all_levels', 5, 14, '#ef4444');

insert into seasons (name, start_date, end_date, registration_opens, active) values
  ('Fall 2025', '2025-09-08', '2026-05-30', '2025-07-01', true);
