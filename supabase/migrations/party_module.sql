-- Party & events module
-- Idempotent. Safe to re-run.

-- New party columns: payment tracking
alter table parties add column if not exists deposit_amount numeric(10,2);
alter table parties add column if not exists amount_paid numeric(10,2) not null default 0;

-- Event type: separates parties / recitals / rentals on the events dashboard
alter table parties add column if not exists event_type text not null default 'party';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'parties_event_type_check') then
    alter table parties add constraint parties_event_type_check
      check (event_type in ('party', 'recital', 'rental'));
  end if;
end $$;

-- Planning checklist
create table if not exists party_tasks (
  id uuid primary key default uuid_generate_v4(),
  party_id uuid not null references parties(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists party_tasks_party_idx on party_tasks (party_id);

-- Files (contracts, invoices, floor plans)
create table if not exists party_files (
  id uuid primary key default uuid_generate_v4(),
  party_id uuid not null references parties(id) on delete cascade,
  name text not null,
  category text not null default 'document'
    check (category in ('contract', 'invoice', 'agreement', 'floor_plan', 'document', 'other')),
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists party_files_party_idx on party_files (party_id);

-- RLS
alter table party_tasks enable row level security;
drop policy if exists "admins_all_party_tasks" on party_tasks;
create policy "admins_all_party_tasks" on party_tasks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table party_files enable row level security;
drop policy if exists "admins_all_party_files" on party_files;
create policy "admins_all_party_files" on party_files for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Storage bucket for party files
insert into storage.buckets (id, name, public)
values ('party-files', 'party-files', false)
on conflict (id) do nothing;

drop policy if exists "admins_all_party_files_storage" on storage.objects;
create policy "admins_all_party_files_storage" on storage.objects for all using (
  bucket_id = 'party-files'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
