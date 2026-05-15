-- Communications module
-- Idempotent. Safe to re-run.

-- Richer targeting on the communications table
alter table communications add column if not exists target_type text not null default 'all_families';
alter table communications add column if not exists target_guardian_id uuid references profiles(id) on delete set null;
alter table communications add column if not exists target_instructor_id uuid references instructors(id) on delete set null;
alter table communications add column if not exists recipient_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'communications_target_type_check') then
    alter table communications add constraint communications_target_type_check
      check (target_type in ('all_families', 'all_staff', 'everyone', 'class', 'family', 'staff_member'));
  end if;
end $$;

create index if not exists communications_target_type_idx on communications (target_type);
create index if not exists communications_comm_type_idx on communications (comm_type);
create index if not exists communication_recipients_comm_idx on communication_recipients (communication_id);

-- communication_recipients RLS (table has RLS enabled but shipped without policies)
drop policy if exists "admins_all_communication_recipients" on communication_recipients;
create policy "admins_all_communication_recipients" on communication_recipients for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "guardians_own_communication_recipients" on communication_recipients;
create policy "guardians_own_communication_recipients" on communication_recipients for select using (
  guardian_id = auth.uid()
);
