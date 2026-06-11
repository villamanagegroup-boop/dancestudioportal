-- Site intake module
-- Captures form submissions from the public marketing site
-- (capitalcoredance.com) so an admin can match them to existing families,
-- convert them into real portal records (camp registrations, parties,
-- enrollments), or dismiss them.
--
-- Populated by Supabase Database Webhooks on the site's Supabase project
-- (ftoevxwdtznxzioljahd) that POST every INSERT on the form tables to
-- `${NEXT_PUBLIC_APP_URL}/api/intake/from-site`. See README for setup.
--
-- Idempotent. Safe to re-run.

create table if not exists site_intake (
  id                  uuid primary key default uuid_generate_v4(),
  -- friendly slug: 'contact' | 'birthday' | 'camp' | 'summer_class' |
  -- 'recital_order' | 'recital_shirt' | 'spirit_week' | 'adult_series'
  source_form         text not null,
  -- the public-site table name the row came from
  source_table        text not null,
  -- id from the public-site row, when one exists
  source_row_id       uuid,
  -- the full inserted row, verbatim, for admin review
  payload             jsonb not null default '{}'::jsonb,
  submitter_email     text,
  submitter_name      text,
  status              text not null default 'new'
    check (status in ('new', 'matched', 'dismissed', 'duplicate')),
  linked_profile_id   uuid references profiles(id) on delete set null,
  linked_student_ids  uuid[] not null default '{}'::uuid[],
  admin_notes         text,
  processed_at        timestamptz,
  processed_by        uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists site_intake_status_idx       on site_intake (status, created_at desc);
create index if not exists site_intake_email_idx        on site_intake (submitter_email);
create index if not exists site_intake_source_lookup_idx on site_intake (source_table, source_row_id);

-- Prevent duplicate ingests if Supabase retries a webhook delivery.
create unique index if not exists site_intake_source_unique
  on site_intake (source_table, source_row_id)
  where source_row_id is not null;

alter table site_intake enable row level security;

drop policy if exists "admins_all_site_intake" on site_intake;
create policy "admins_all_site_intake" on site_intake for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

comment on table site_intake is
  'Form submissions from capitalcoredance.com. Ingested via Supabase DB webhook → /api/intake/from-site. Admin matches each row to an existing family or converts it into a real record.';

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('site_intake_module.sql') on conflict (filename) do nothing;
