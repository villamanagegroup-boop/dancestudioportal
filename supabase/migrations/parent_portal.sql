-- Parent portal
-- Idempotent. Safe to re-run.

-- Storage bucket for family-uploaded documents (waivers, forms)
insert into storage.buckets (id, name, public)
values ('family-documents', 'family-documents', false)
on conflict (id) do nothing;

drop policy if exists "admins_all_family_documents_storage" on storage.objects;
create policy "admins_all_family_documents_storage" on storage.objects for all using (
  bucket_id = 'family-documents'
  and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- documents table: let guardians read their own, admins manage all
alter table documents enable row level security;
drop policy if exists "guardians_own_documents" on documents;
create policy "guardians_own_documents" on documents for select using (guardian_id = auth.uid());
drop policy if exists "admins_all_documents" on documents;
create policy "admins_all_documents" on documents for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- communications: guardians can read studio-wide announcements + their class announcements
alter table communications enable row level security;
drop policy if exists "guardians_read_announcements" on communications;
create policy "guardians_read_announcements" on communications for select using (
  target_all = true
  or exists (
    select 1 from enrollments e
    join guardian_students gs on gs.student_id = e.student_id
    where gs.guardian_id = auth.uid() and e.class_id = communications.target_class_id
  )
);
drop policy if exists "admins_all_communications" on communications;
create policy "admins_all_communications" on communications for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Guardians can read their own dancers' camp registrations + attendance
drop policy if exists "guardians_own_camp_registrations" on camp_registrations;
create policy "guardians_own_camp_registrations" on camp_registrations for select using (
  exists (
    select 1 from guardian_students gs
    where gs.guardian_id = auth.uid() and gs.student_id = camp_registrations.student_id
  )
);

drop policy if exists "guardians_own_attendance" on attendance;
create policy "guardians_own_attendance" on attendance for select using (
  exists (
    select 1 from guardian_students gs
    where gs.guardian_id = auth.uid() and gs.student_id = attendance.student_id
  )
);
