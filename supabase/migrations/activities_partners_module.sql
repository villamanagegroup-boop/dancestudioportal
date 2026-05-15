-- Activities & Partners module
-- Idempotent. Safe to re-run.

-- Events: the parties table now covers parties / recitals / events.
-- Rentals were split out into the bookings table.
alter table parties add column if not exists event_type text not null default 'party';
update parties set event_type = 'event' where event_type = 'rental';
alter table parties drop constraint if exists parties_event_type_check;
alter table parties add constraint parties_event_type_check
  check (event_type in ('party', 'recital', 'event'));

-- Studio partners: other studios, local businesses, vendors, venues
create table if not exists partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  partner_type text not null default 'business'
    check (partner_type in ('studio', 'business', 'vendor', 'venue', 'other')),
  contact_name text,
  email text,
  phone text,
  website text,
  rate_amount numeric(10,2),
  rate_unit text not null default 'flat'
    check (rate_unit in ('flat', 'hour', 'day', 'event', 'month')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Bookings can optionally be tied to a partner
alter table bookings add column if not exists partner_id uuid references partners(id) on delete set null;
create index if not exists bookings_partner_idx on bookings (partner_id);

-- RLS
alter table partners enable row level security;
drop policy if exists "admins_all_partners" on partners;
create policy "admins_all_partners" on partners for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
