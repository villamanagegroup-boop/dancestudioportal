-- ============================================================
-- Calendar module: generic calendar events + studio hours.
-- calendar_events covers meetings, blackouts, placeholders, and
-- one-off events/workshops that aren't tied to a class/camp page.
-- studio_hours drives the calendar's visible time range.
-- Idempotent — safe to re-run.
-- ============================================================

-- Generic calendar events ---------------------------------------------

create table if not exists calendar_events (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  event_type  text not null default 'event'
                check (event_type in ('event', 'meeting', 'blackout', 'placeholder')),
  start_date  date not null,
  end_date    date,
  all_day     boolean not null default false,
  start_time  time,
  end_time    time,
  room_id     uuid references rooms(id) on delete set null,
  color       text,
  notes       text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists calendar_events_dates on calendar_events(start_date, end_date);

alter table calendar_events enable row level security;
drop policy if exists calendar_events_admin on calendar_events;
create policy calendar_events_admin on calendar_events for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Studio hours --------------------------------------------------------

create table if not exists studio_hours (
  day_of_week day_of_week primary key,
  is_open     boolean not null default true,
  open_time   time not null default '09:00',
  close_time  time not null default '21:00'
);

insert into studio_hours (day_of_week, is_open, open_time, close_time) values
  ('monday',    true,  '09:00', '21:00'),
  ('tuesday',   true,  '09:00', '21:00'),
  ('wednesday', true,  '09:00', '21:00'),
  ('thursday',  true,  '09:00', '21:00'),
  ('friday',    true,  '09:00', '21:00'),
  ('saturday',  true,  '09:00', '17:00'),
  ('sunday',    false, '09:00', '17:00')
on conflict (day_of_week) do nothing;

alter table studio_hours enable row level security;
drop policy if exists studio_hours_admin on studio_hours;
create policy studio_hours_admin on studio_hours for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists studio_hours_readable on studio_hours;
create policy studio_hours_readable on studio_hours for select using (true);
