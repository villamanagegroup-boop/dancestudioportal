-- ============================================================
-- Family module: address, opt-ins, tags, custom fields,
-- policies + acceptances, notes, communication log, activity log
-- Run as a single block in the Supabase SQL editor.
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Profile additions ------------------------------------------------

alter table profiles
  add column if not exists address_street    text,
  add column if not exists address_city      text,
  add column if not exists address_state     text,
  add column if not exists address_zip       text,
  add column if not exists secondary_email   text,
  add column if not exists secondary_phone   text,
  add column if not exists email_opt_in      boolean not null default true,
  add column if not exists sms_opt_in        boolean not null default false,
  add column if not exists tags              text[] not null default '{}',
  add column if not exists custom_fields     jsonb  not null default '{}'::jsonb,
  add column if not exists registration_anniversary date;

create index if not exists profiles_tags_gin on profiles using gin (tags);

-- 2. Policies catalog -------------------------------------------------

create table if not exists policies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  body        text,
  required    boolean not null default false,
  active      boolean not null default true,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists policy_acceptances (
  id              uuid primary key default uuid_generate_v4(),
  guardian_id     uuid not null references profiles(id) on delete cascade,
  policy_id       uuid not null references policies(id) on delete cascade,
  policy_version  integer not null,
  accepted_at     timestamptz not null default now(),
  ip_address      text,
  constraint policy_acceptances_unique unique (guardian_id, policy_id, policy_version)
);

create index if not exists policy_acceptances_guardian on policy_acceptances(guardian_id);

-- 3. Family notes -----------------------------------------------------

create table if not exists family_notes (
  id           uuid primary key default uuid_generate_v4(),
  guardian_id  uuid not null references profiles(id) on delete cascade,
  author_id    uuid references profiles(id) on delete set null,
  body         text not null,
  pinned       boolean not null default false,
  kind         text not null default 'note' check (kind in ('note','announcement')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table family_notes add column if not exists kind text not null default 'note';
alter table family_notes drop constraint if exists family_notes_kind_check;
alter table family_notes add constraint family_notes_kind_check check (kind in ('note','announcement'));

create index if not exists family_notes_guardian on family_notes(guardian_id, created_at desc);

-- 3b. Student notes (parallel to family_notes) -----------------------

create table if not exists student_notes (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references students(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null,
  pinned      boolean not null default false,
  kind        text not null default 'note' check (kind in ('note','announcement')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists student_notes_student on student_notes(student_id, created_at desc);

alter table student_notes enable row level security;
drop policy if exists student_notes_admin on student_notes;
create policy student_notes_admin on student_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop trigger if exists student_notes_updated_at on student_notes;
create trigger student_notes_updated_at before update on student_notes
  for each row execute function update_updated_at();

-- 4. 1:1 communication log -------------------------------------------

create table if not exists family_communication_log (
  id            uuid primary key default uuid_generate_v4(),
  guardian_id   uuid not null references profiles(id) on delete cascade,
  staff_id      uuid references profiles(id) on delete set null,
  direction     text not null check (direction in ('inbound','outbound')),
  channel       text not null check (channel in ('email','sms','phone','in_person','note')),
  subject       text,
  body          text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists family_comm_log_guardian on family_communication_log(guardian_id, occurred_at desc);

-- 5. Activity / audit log --------------------------------------------

create table if not exists family_activity_log (
  id           uuid primary key default uuid_generate_v4(),
  guardian_id  uuid not null references profiles(id) on delete cascade,
  actor_id     uuid references profiles(id) on delete set null,
  action       text not null,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists family_activity_guardian on family_activity_log(guardian_id, created_at desc);

-- 6. updated_at triggers ---------------------------------------------

drop trigger if exists policies_updated_at on policies;
create trigger policies_updated_at before update on policies
  for each row execute function update_updated_at();

drop trigger if exists family_notes_updated_at on family_notes;
create trigger family_notes_updated_at before update on family_notes
  for each row execute function update_updated_at();

-- 7. RLS --------------------------------------------------------------

alter table policies                  enable row level security;
alter table policy_acceptances        enable row level security;
alter table family_notes              enable row level security;
alter table family_communication_log  enable row level security;
alter table family_activity_log       enable row level security;

drop policy if exists policies_admins_all on policies;
create policy policies_admins_all on policies for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists policies_active_readable on policies;
create policy policies_active_readable on policies for select using (active = true);

drop policy if exists policy_acceptances_self on policy_acceptances;
create policy policy_acceptances_self on policy_acceptances for select using (guardian_id = auth.uid());

drop policy if exists policy_acceptances_admin on policy_acceptances;
create policy policy_acceptances_admin on policy_acceptances for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists family_notes_admin on family_notes;
create policy family_notes_admin on family_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists family_comm_log_admin on family_communication_log;
create policy family_comm_log_admin on family_communication_log for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists family_activity_admin on family_activity_log;
create policy family_activity_admin on family_activity_log for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 7b. Camp registrations (link guardian + student to a camp) ---------

create table if not exists camp_registrations (
  id            uuid primary key default uuid_generate_v4(),
  guardian_id   uuid not null references profiles(id) on delete cascade,
  student_id    uuid references students(id) on delete set null,
  camp_id       uuid not null references camps(id) on delete cascade,
  status        text not null default 'active',
  paid_at       timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (guardian_id, student_id, camp_id)
);

create index if not exists camp_reg_guardian on camp_registrations(guardian_id);
create index if not exists camp_reg_camp on camp_registrations(camp_id);

alter table camp_registrations enable row level security;
drop policy if exists camp_reg_admin on camp_registrations;
create policy camp_reg_admin on camp_registrations for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists camp_reg_guardian_self on camp_registrations;
create policy camp_reg_guardian_self on camp_registrations for select using (guardian_id = auth.uid());

-- 7c. Link parties + bookings to a guardian when applicable ----------

alter table parties  add column if not exists guardian_id uuid references profiles(id) on delete set null;
alter table bookings add column if not exists guardian_id uuid references profiles(id) on delete set null;
alter table parties  add column if not exists student_id uuid references students(id) on delete set null;

create index if not exists parties_guardian on parties(guardian_id);
create index if not exists bookings_guardian on bookings(guardian_id);
create index if not exists parties_student on parties(student_id);

-- 7d. Student profile expansion --------------------------------------

alter table students
  add column if not exists grade text,
  add column if not exists association_id text,
  add column if not exists registration_anniversary date,
  add column if not exists anniversary_fee_override numeric(10,2),
  add column if not exists roll_sheet_comment text,
  add column if not exists flag_alert text,
  add column if not exists allergies text,
  add column if not exists medications text,
  add column if not exists medical_conditions text,
  add column if not exists doctor_name text,
  add column if not exists doctor_phone text,
  add column if not exists insurance_provider text,
  add column if not exists insurance_policy_number text,
  add column if not exists shoe_size text,
  add column if not exists shirt_size text,
  add column if not exists membership_tier text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create index if not exists students_tags_gin on students using gin (tags);

-- 7e. Student notes visibility ---------------------------------------

alter table student_notes
  add column if not exists visibility text not null default 'admin';
alter table student_notes drop constraint if exists student_notes_visibility_check;
alter table student_notes add constraint student_notes_visibility_check check (visibility in ('admin','parent'));

-- 7f. Student appointments -------------------------------------------

create table if not exists student_appointments (
  id                uuid primary key default uuid_generate_v4(),
  student_id        uuid not null references students(id) on delete cascade,
  guardian_id       uuid references profiles(id) on delete set null,
  appointment_type  text not null,
  title             text,
  scheduled_at      timestamptz not null,
  duration_minutes  integer,
  location          text,
  instructor_id     uuid references instructors(id) on delete set null,
  notes             text,
  status            text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  created_at        timestamptz not null default now()
);

create index if not exists appointments_student on student_appointments(student_id, scheduled_at desc);
create index if not exists appointments_guardian on student_appointments(guardian_id);
create index if not exists appointments_instructor on student_appointments(instructor_id);

alter table student_appointments enable row level security;
drop policy if exists appointments_admin on student_appointments;
create policy appointments_admin on student_appointments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists appointments_self on student_appointments;
create policy appointments_self on student_appointments for select using (
  guardian_id = auth.uid()
  or exists (select 1 from guardian_students where guardian_id = auth.uid() and student_id = student_appointments.student_id)
);

-- 7g. Per-student policy acceptances ---------------------------------

create table if not exists student_policy_acceptances (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  policy_id       uuid not null references policies(id) on delete cascade,
  policy_version  integer not null,
  accepted_at     timestamptz not null default now(),
  accepted_by     uuid references profiles(id) on delete set null,
  constraint student_policy_acceptances_unique unique (student_id, policy_id, policy_version)
);

create index if not exists student_policy_student on student_policy_acceptances(student_id);

alter table student_policy_acceptances enable row level security;
drop policy if exists student_policy_admin on student_policy_acceptances;
create policy student_policy_admin on student_policy_acceptances for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 7h. Memberships ----------------------------------------------------

create table if not exists student_memberships (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references students(id) on delete cascade,
  tier        text not null,
  starts_on   date not null,
  ends_on     date,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists memberships_student on student_memberships(student_id, starts_on desc);

alter table student_memberships enable row level security;
drop policy if exists memberships_admin on student_memberships;
create policy memberships_admin on student_memberships for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 7i. Student activity log -------------------------------------------

create table if not exists student_activity_log (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references students(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  action      text not null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists student_activity_student on student_activity_log(student_id, created_at desc);

alter table student_activity_log enable row level security;
drop policy if exists student_activity_admin on student_activity_log;
create policy student_activity_admin on student_activity_log for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 8. Seed default policies -------------------------------------------

insert into policies (name, body, required, version)
values
  ('Studio Code of Conduct', 'Families agree to studio etiquette, attendance, and dress code expectations.', true, 1),
  ('Photo / Media Release', 'Permission to use student photos and video for studio promotional material.', false, 1),
  ('Tuition & Refund Policy', 'Monthly tuition is due on the 1st. No refunds after the second class of a session.', true, 1),
  ('Liability Waiver',        'Acknowledgement of physical risk inherent to dance instruction.', true, 1)
on conflict do nothing;
