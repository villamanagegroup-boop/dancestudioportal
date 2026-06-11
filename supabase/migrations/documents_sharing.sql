-- Family documents become two-way: families upload their own, and staff can
-- place documents into a family's portal. `source` distinguishes the two.
-- Idempotent. Safe to re-run.

alter table documents add column if not exists source text not null default 'family';
alter table documents add column if not exists uploaded_by uuid references profiles(id) on delete set null;
alter table documents add column if not exists description text;

do $$ begin
  alter table documents add constraint documents_source_check check (source in ('family', 'studio'));
exception when duplicate_object then null; end $$;

create index if not exists documents_guardian_source on documents (guardian_id, source);
