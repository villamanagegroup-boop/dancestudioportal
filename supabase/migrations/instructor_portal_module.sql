-- Instructor portal module
-- Idempotent. Safe to re-run.

-- Hours log for instructors (manual entry; later: clock-in/clock-out)
create table if not exists instructor_hours (
  id uuid primary key default uuid_generate_v4(),
  instructor_id uuid not null references instructors(id) on delete cascade,
  worked_on date not null,
  hours numeric(5,2) not null,
  notes text,
  approved_at timestamptz,
  approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructor_hours_range_check') then
    alter table instructor_hours add constraint instructor_hours_range_check
      check (hours >= 0 and hours <= 24);
  end if;
end $$;

create index if not exists instructor_hours_instructor_idx
  on instructor_hours (instructor_id, worked_on desc);

-- RLS
alter table instructor_hours enable row level security;

drop policy if exists "admins_all_instructor_hours" on instructor_hours;
create policy "admins_all_instructor_hours" on instructor_hours for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- An instructor can read/insert/delete their own hours (matched via instructors.profile_id)
drop policy if exists "instructors_read_own_hours" on instructor_hours;
create policy "instructors_read_own_hours" on instructor_hours for select using (
  exists (select 1 from instructors i where i.id = instructor_id and i.profile_id = auth.uid())
);

drop policy if exists "instructors_insert_own_hours" on instructor_hours;
create policy "instructors_insert_own_hours" on instructor_hours for insert with check (
  exists (select 1 from instructors i where i.id = instructor_id and i.profile_id = auth.uid())
);

drop policy if exists "instructors_delete_own_unapproved" on instructor_hours;
create policy "instructors_delete_own_unapproved" on instructor_hours for delete using (
  approved_at is null
  and exists (select 1 from instructors i where i.id = instructor_id and i.profile_id = auth.uid())
);
