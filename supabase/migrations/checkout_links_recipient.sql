-- Add recipient fields to checkout_links so emailable links (e.g. tuition
-- statements) know who to send to and whether they've already been sent.
-- Idempotent. Run after checkout_module.sql.
alter table checkout_links add column if not exists recipient_email text;
alter table checkout_links add column if not exists recipient_name  text;
alter table checkout_links add column if not exists email_sent_at   timestamptz;

create index if not exists checkout_links_recipient_idx
  on checkout_links (recipient_email) where recipient_email is not null;

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('checkout_links_recipient.sql') on conflict (filename) do nothing;
