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

---

3 core screens:

1. Contribution grid (like the GitHub image) — visualizes activity over the year
2. Object manager — create/list trackable things (name, optional description)
3. Daily tick table — for "today", tick an object N times (your "round time 0→x"), pick object via dropdown, or see a grid view

Two tables and one view. No triggers, no audit table, full history preserved — every +15 you ever tapped is still there, with its timestamp.

The three questions, answered

1. Delta, not absolute. +15 is how the UI actually gets used, and it makes append-only natural.
2. One grid with a dropdown filter. "All" sums everything; picking an object colors the grid in that object's hue.
3. Client sends tick_date. Computed from the browser's local date. Postgres current_date is UTC and would misfile your evening entries.

Color

Shade = today's minutes ÷ that object's goal:

Then bucket minutes into color levels:

┌──────────────────┬──────────────┐
│ Minutes that day │ Square color │
├──────────────────┼──────────────┤
│ 0 │ grey (empty) │
├──────────────────┼──────────────┤
│ 1–30 │ light green │
├──────────────────┼──────────────┤
│ 31–60 │ green │
├──────────────────┼──────────────┤
│ 61–120 │ medium green │
├──────────────────┼──────────────┤
│ 120+ │ dark green │
└──────────────────┴──────────────┘

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
