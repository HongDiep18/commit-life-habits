-- ============================================================
-- commit-life — initial schema
-- Run this once in Supabase: SQL Editor -> New query -> Run
-- ============================================================


-- ------------------------------------------------------------
-- 1. tracker_object — the things you track
-- ------------------------------------------------------------
create table tracker_object (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  hue         int  not null default 145,   -- 0-360, shades derived in CSS
  archived_at timestamptz,                 -- null = active, timestamp = hidden
  created_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. tick_event — every "+15 minutes" you ever tap
--    Append-only: never updated, never deleted.
--    To undo, insert a negative value.
-- ------------------------------------------------------------
create table tick_event (
  id         uuid primary key default gen_random_uuid(),
  object_id  uuid not null references tracker_object(id) on delete cascade,
  tick_date  date not null,                -- sent by the browser, local date
  minutes    int  not null,                -- negative allowed, as undo
  created_at timestamptz not null default now()
);

create index tick_event_lookup on tick_event (object_id, tick_date);


-- ------------------------------------------------------------
-- 3. daily_total — a view, not a table. Stores nothing.
--    security_invoker = on makes the view respect the RLS
--    policies below; without it, it would read past them.
-- ------------------------------------------------------------
create view daily_total with (security_invoker = on) as
  select object_id, tick_date, sum(minutes)::int as minutes
  from tick_event
  group by object_id, tick_date;


-- ------------------------------------------------------------
-- 4. Row Level Security
--    The anon key ships inside the browser and is public, so
--    these policies are what actually protect the data.
--
--    "to authenticated" = anyone logged in. That is only you,
--    PROVIDED you turn off public sign-ups after registering:
--    Authentication -> Sign In / Providers ->
--    "Allow new users to sign up" -> off
-- ------------------------------------------------------------
alter table tracker_object enable row level security;
alter table tick_event     enable row level security;

create policy "logged in only" on tracker_object
  for all to authenticated using (true) with check (true);

create policy "logged in only" on tick_event
  for all to authenticated using (true) with check (true);


-- ------------------------------------------------------------
-- Smoke test — uncomment, run, confirm you get one row back,
-- then delete the row before real use.
-- ------------------------------------------------------------
-- insert into tracker_object (name, description)
--   values ('Reading', 'Books, not Twitter');
-- select * from tracker_object;
