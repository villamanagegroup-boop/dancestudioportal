-- Human-friendly staff ID numbers — the staff analog of family IDs.
-- Each instructor/staff record gets a 4-digit staff_no (1000–9999), shown as
-- <studio_code>S<no>, e.g. CCDS1001. The "S" keeps it visually distinct from a
-- family ID (CCD1042). Mirrors families_and_ids.sql.
-- Idempotent. Safe to re-run.

create sequence if not exists staff_no_seq start 1000 minvalue 1000 maxvalue 9999 no cycle;

alter table instructors add column if not exists staff_no integer;
create unique index if not exists instructors_staff_no_key on instructors (staff_no);

-- Backfill existing staff in a stable order.
update instructors set staff_no = nextval('staff_no_seq')
  where staff_no is null
  and id in (select id from instructors where staff_no is null order by created_at);

-- Auto-assign on insert.
create or replace function assign_staff_no() returns trigger as $$
begin
  if new.staff_no is null then
    new.staff_no := nextval('staff_no_seq');
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists instructors_staff_no on instructors;
create trigger instructors_staff_no before insert on instructors
  for each row execute function assign_staff_no();
