-- ============================================================
-- Class module: editable class settings.
-- Adds description, visibility/registration toggles, eligibility,
-- billing type, registration + class date ranges, and notes.
-- Makes season_id optional so a class can be standalone.
-- Idempotent — safe to re-run.
-- ============================================================

alter table classes
  add column if not exists description                text,
  add column if not exists visible                    boolean not null default true,
  add column if not exists registration_open          boolean not null default true,
  add column if not exists internal_registration_only boolean not null default false,
  add column if not exists age_min                    integer,
  add column if not exists age_max                    integer,
  add column if not exists gender                     text not null default 'any',
  add column if not exists billing_type               text not null default 'monthly',
  add column if not exists flat_amount                numeric(10,2),
  add column if not exists allow_discounts             boolean not null default true,
  add column if not exists registration_start         date,
  add column if not exists registration_end           date,
  add column if not exists start_date                 date,
  add column if not exists end_date                   date,
  add column if not exists notes                      text;

-- Standalone classes have no season
alter table classes alter column season_id drop not null;

-- Constrain the enumerated text columns
alter table classes drop constraint if exists classes_gender_check;
alter table classes add constraint classes_gender_check
  check (gender in ('any', 'female', 'male', 'non-binary'));

alter table classes drop constraint if exists classes_billing_type_check;
alter table classes add constraint classes_billing_type_check
  check (billing_type in ('monthly', 'flat'));

-- ------------------------------------------------------------
-- Phase 2/3: roster, attendance, communications, files
-- ------------------------------------------------------------

-- Standalone classes have no season, so their enrollments can't either
alter table enrollments alter column season_id drop not null;

-- Class files (costumes, music, documents, etc.)
create table if not exists class_files (
  id           uuid primary key default uuid_generate_v4(),
  class_id     uuid not null references classes(id) on delete cascade,
  name         text not null,
  category     text not null default 'document'
                 check (category in ('costume', 'music', 'document', 'other')),
  storage_path text not null,
  size_bytes   bigint,
  mime_type    text,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists class_files_class on class_files(class_id, created_at desc);

alter table class_files enable row level security;
drop policy if exists class_files_admin on class_files;
create policy class_files_admin on class_files for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Private storage bucket for class files
insert into storage.buckets (id, name, public)
values ('class-files', 'class-files', false)
on conflict (id) do nothing;

drop policy if exists "class_files_storage_admin" on storage.objects;
create policy "class_files_storage_admin" on storage.objects for all
  using (
    bucket_id = 'class-files'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    bucket_id = 'class-files'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
