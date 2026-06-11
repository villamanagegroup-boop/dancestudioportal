-- Checkout module
-- Branded, standalone checkout: public shareable payment links + staff-operated
-- payments. Supports custom amounts and ad-hoc line items, plus optional
-- lightweight contact capture (kept separate from families/students).
-- Idempotent. Safe to re-run.

create extension if not exists "uuid-ossp";

-- Reusable / shareable payment links (public URL is /pay/<slug>)
create table if not exists checkout_links (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  -- ordered array of { label, amount, qty }
  line_items jsonb not null default '[]'::jsonb,
  -- fixed total in dollars; null when the payer names their own amount
  amount numeric(10,2),
  allow_custom_amount boolean not null default false,
  min_amount numeric(10,2),
  -- optional preset buttons for custom-amount links, e.g. [25, 50, 100]
  suggested_amounts jsonb not null default '[]'::jsonb,
  collect_contact boolean not null default true,
  require_contact boolean not null default false,
  thank_you_message text,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists checkout_links_active_idx on checkout_links(active);

-- Lightweight contacts captured at checkout (NOT tied to families/students)
create table if not exists checkout_contacts (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text,
  phone text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive de-dupe on email (only when an email is provided)
create unique index if not exists checkout_contacts_email_key
  on checkout_contacts (lower(email)) where email is not null;

-- Completed payments taken through checkout
create table if not exists checkout_payments (
  id uuid primary key default uuid_generate_v4(),
  link_id uuid references checkout_links(id) on delete set null,
  contact_id uuid references checkout_contacts(id) on delete set null,
  description text,
  line_items jsonb not null default '[]'::jsonb,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  provider text not null default 'paypal',
  paypal_order_id text,
  paypal_capture_id text,
  -- 'public' (paid via shared link) or 'staff' (taken by staff)
  source text not null default 'public',
  taken_by uuid references profiles(id) on delete set null,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists checkout_payments_link_idx on checkout_payments(link_id);
create index if not exists checkout_payments_created_idx on checkout_payments(created_at desc);

-- RLS: management is admin-only. All public traffic (reading active links,
-- recording payments/contacts) flows through server-side service-role code,
-- never the anon client, so no public policies are needed here.
alter table checkout_links enable row level security;
drop policy if exists "admins_all_checkout_links" on checkout_links;
create policy "admins_all_checkout_links" on checkout_links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table checkout_contacts enable row level security;
drop policy if exists "admins_all_checkout_contacts" on checkout_contacts;
create policy "admins_all_checkout_contacts" on checkout_contacts for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

alter table checkout_payments enable row level security;
drop policy if exists "admins_all_checkout_payments" on checkout_payments;
create policy "admins_all_checkout_payments" on checkout_payments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Record this migration as applied (requires migration_tracking.sql).
insert into applied_migrations (filename) values ('checkout_module.sql') on conflict (filename) do nothing;
