-- Human-friendly IDs + a `families` entity (multi-tenant-ready).
--   Family number    : 4 digits (1000–9999) -> families.family_no
--                       shown as <studio_code><no>, e.g. CCD1042 (code is a studio setting).
--   Individual number: 5 digits (10000–99999), ONE shared pool for every person.
--                       profiles.member_no (parents + adults) and students.member_no (dancers)
--                       draw from the same sequence. An adult dancer (a guardian_students link with
--                       relationship='self') is numbered once — on their profile — and their student
--                       record gets NO separate number.
-- Idempotent. Safe to re-run.

-- 1. Sequences -------------------------------------------------------------
create sequence if not exists family_no_seq     start 1000  minvalue 1000  maxvalue 9999  no cycle;
create sequence if not exists individual_no_seq start 10000 minvalue 10000 maxvalue 99999 no cycle;

-- 2. families table (tenant_id is nullable groundwork for multi-tenant) -----
create table if not exists families (
  id                  uuid primary key default uuid_generate_v4(),
  family_no           integer not null default nextval('family_no_seq'),
  name                text,
  primary_guardian_id uuid references profiles(id) on delete set null,
  tenant_id           uuid,
  created_at          timestamptz not null default now()
);
create unique index if not exists families_family_no_key on families (family_no);

-- 3. link columns + the shared individual number ---------------------------
alter table profiles add column if not exists family_id uuid references families(id) on delete set null;
alter table profiles add column if not exists member_no integer;
alter table students add column if not exists family_id uuid references families(id) on delete set null;
alter table students add column if not exists member_no integer;
create unique index if not exists profiles_member_no_key on profiles (member_no);
create unique index if not exists students_member_no_key on students (member_no);

-- 4. Backfill families -----------------------------------------------------
do $$
declare g record; fam uuid;
begin
  -- 4a. One family per "head" guardian (is_primary somewhere, or no dancer links).
  for g in
    select p.id, p.last_name
    from profiles p
    where p.role = 'parent' and p.family_id is null
      and ( exists (select 1 from guardian_students gs where gs.guardian_id = p.id and gs.is_primary)
            or not exists (select 1 from guardian_students gs where gs.guardian_id = p.id) )
  loop
    insert into families (name, primary_guardian_id)
    values (nullif(trim(coalesce(g.last_name,'') || ' Family'), 'Family'), g.id)
    returning id into fam;
    update profiles set family_id = fam where id = g.id;
    update students s set family_id = fam
      from guardian_students gs
      where gs.student_id = s.id and gs.guardian_id = g.id and s.family_id is null;
  end loop;

  -- 4b. Secondary guardians join the family of a dancer they share.
  update profiles p set family_id = sub.family_id
    from ( select gs.guardian_id, s.family_id
           from guardian_students gs join students s on s.id = gs.student_id
           where s.family_id is not null ) sub
    where p.id = sub.guardian_id and p.family_id is null;

  -- 4c. Any dancer still unattached: family from its first guardian (create if needed).
  for g in
    select distinct s.id as student_id, gs.guardian_id
    from students s join guardian_students gs on gs.student_id = s.id
    where s.family_id is null
  loop
    select family_id into fam from profiles where id = g.guardian_id;
    if fam is null then
      insert into families (primary_guardian_id) values (g.guardian_id) returning id into fam;
      update profiles set family_id = fam where id = g.guardian_id;
    end if;
    update students set family_id = fam where id = g.student_id and family_id is null;
  end loop;

  -- 4d. Catch-all: any parent still without a family gets a solo one.
  for g in select id, last_name from profiles where role = 'parent' and family_id is null
  loop
    insert into families (name, primary_guardian_id)
    values (nullif(trim(coalesce(g.last_name,'') || ' Family'),'Family'), g.id) returning id into fam;
    update profiles set family_id = fam where id = g.id;
  end loop;
end $$;

-- 5. Assign individual numbers from the SHARED pool (stable order) ----------
-- Parents + adult dancers (every parent profile).
update profiles set member_no = nextval('individual_no_seq')
  where role = 'parent' and member_no is null
  and id in (select id from profiles where role='parent' and member_no is null order by created_at);

-- Child dancers only (student records NOT linked as an adult 'self').
update students s set member_no = nextval('individual_no_seq')
  where s.member_no is null
  and not exists (select 1 from guardian_students gs where gs.student_id = s.id and gs.relationship = 'self')
  and s.id in (select id from students where member_no is null order by created_at);

-- 6. Auto-assign on new rows ----------------------------------------------
-- 6a. Members (parents + adult dancers) on insert.
create or replace function assign_member_no() returns trigger as $$
begin
  if new.role = 'parent' and new.member_no is null then
    new.member_no := nextval('individual_no_seq');
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists profiles_member_no on profiles;
create trigger profiles_member_no before insert on profiles
  for each row execute function assign_member_no();

-- 6b. Child dancers — numbered when a non-'self' guardian link is created and the
--     dancer has no number yet (adult-self records stay unnumbered).
create or replace function assign_dancer_no() returns trigger as $$
begin
  if new.relationship is distinct from 'self' then
    update students set member_no = nextval('individual_no_seq')
      where id = new.student_id and member_no is null;
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists guardian_students_dancer_no on guardian_students;
create trigger guardian_students_dancer_no after insert on guardian_students
  for each row execute function assign_dancer_no();

-- (families.family_no auto-assigns via its column DEFAULT.)
