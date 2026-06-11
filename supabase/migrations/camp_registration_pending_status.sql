-- Allow a TENTATIVE (pending) camp registration — created when the owner/admin
-- adds a student to a camp while viewing-as a family. The studio confirms it
-- later (pending -> registered). Enrollments already permit 'pending', so only
-- camp_registrations needs widening.
-- Idempotent. Safe to re-run.

alter table camp_registrations drop constraint if exists camp_registrations_status_check;
alter table camp_registrations
  add constraint camp_registrations_status_check
  check (status in ('pending', 'registered', 'waitlisted', 'cancelled', 'completed'));
