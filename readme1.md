Here's the concrete version of the idea — decisions made, nothing left vague.

The product in one line

A personal heatmap tracker: you define things you care about, log minutes against them each day, and watch a year-long GitHub-style grid fill in.

Three screens

1. Grid (home)

- 53 weeks × 7 days, last 12 months, exactly like your screenshot.
- Dropdown at top: All objects / a specific object.
- Header line: "1,240 minutes across 105 days in the last 12 months."
- Hover a cell → tooltip: date + per-object breakdown.
- Below the grid: current streak, longest streak. Cheap to compute, disproportionately motivating.

2. Objects

- List of what you track. Create / edit / archive (archive, not delete — deleting throws away history).
- Fields: name, description, color, daily goal in minutes.

3. Today

- One row per active object: name, today's total, and quick-add buttons +5 +15 +30 plus a free-text input.
- Every tap is an append, never an overwrite.

Schema (final)

tracker_object
id uuid pk
user_id uuid not null → auth.users(id)
name text not null
description text
hue int not null default 145 -- 0-360, shades derived in CSS
goal_minutes int not null default 30
archived_at timestamptz
created_at timestamptz not null default now()

tick_event -- append-only, this IS the history
id uuid pk
object_id uuid not null → tracker_object(id) on delete cascade
tick_date date not null -- sent by the client, never current_date
minutes int not null -- can be negative, to undo a mistake
created_at timestamptz not null default now()

index on (object_id, tick_date)

daily_total -- a VIEW, not a table
select object_id, tick_date, sum(minutes) as minutes
from tick_event group by 1,2

Two tables and one view. No triggers, no audit table, full history preserved — every +15 you ever tapped is still there, with its timestamp.

The three questions, answered

1. Delta, not absolute. +15 is how the UI actually gets used, and it makes append-only natural.
2. One grid with a dropdown filter. "All" sums everything; picking an object colors the grid in that object's hue.
3. Client sends tick_date. Computed from the browser's local date. Postgres current_date is UTC and would misfile your evening entries.

Color

Shade = today's minutes ÷ that object's goal:

┌───────────┬──────────┐
│ Ratio │ Shade │
├───────────┼──────────┤
│ 0 │ grey │
├───────────┼──────────┤
│ under 50% │ lightest │
├───────────┼──────────┤
│ 50–99% │ light │
├───────────┼──────────┤
│ 100–149% │ mid │
├───────────┼──────────┤
│ 150%+ │ darkest │
└───────────┴──────────┘

So 20 min of meditation (goal 20) and 120 min of reading (goal 120) both show dark green. That's the fix for the fixed-bucket problem.

Build order

1. Vite + React + TS + Tailwind, running locally
2. Supabase project, SQL migration, RLS policies (user_id = auth.uid())
3. Magic-link login
4. Objects screen — proves CRUD works end to end
5. Today screen — proves writes work
6. Grid — the payoff, built last on real data

Roughly 500 lines of application code total. The grid itself is about 60.

Say the word and I'll scaffold it in E:\commit-life — through step 1 with the SQL file ready to paste into Supabase, so you can see it run before wiring up the database.
