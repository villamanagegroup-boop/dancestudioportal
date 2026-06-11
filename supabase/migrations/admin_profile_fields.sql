-- Admin/staff profile fields on profiles — lets an administrator be a real,
-- editable person (photo, title, bio) rather than just a name + role. These are
-- generic profile columns, so any profile (admin, instructor-linked, partner)
-- can carry them; the admin profile page + the self-service Account form in
-- Settings read/write them.
-- Idempotent. Safe to re-run.

alter table profiles
  add column if not exists job_title text,
  add column if not exists bio       text,
  add column if not exists photo_url text;
