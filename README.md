# commit-life

A minimal habit and activity tracker. Log minutes against the things you care
about, then watch them fill a GitHub-style contribution grid over the last 12
months. Built with React 19, Vite, Tailwind CSS v4, and Supabase

---

## Features

- **Grid** — a year-long contribution calendar. Cells are shaded by minutes
  logged per day, with total minutes, active days, current streak, and longest
  streak. Filter by a single object or view all combined.
- **Today** — one card per active object. Quick-add buttons (+5, +15, +30) or a
  custom amount. Every tap appends a new event; totals update instantly.
- **Objects** — create the things you track (name, description, color). Archive
  keeps an object's full history instead of deleting it.
- **Auth** — email + password sign-in via Supabase, with session persistence
  across refreshes and per-user row-level security.

---

## Tech stack -

| Area     | Choice                     |
| -------- | -------------------------- |
| UI       | React 19                   |
| Build    | Vite                       |
| Styling  | Tailwind CSS v4            |
| Backend  | Supabase (Postgres + Auth) |
| Language | TypeScript                 |

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier is fine)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both are read at startup — the app throws a clear error if either is missing.
Find them in your Supabase dashboard under **Project Settings → API**. Restart
the dev server after changing `.env`.

### 3. Run

```bash
npm run dev
```

Open the printed local URL, click **Need an account? Sign up**, and enter an
email plus a password (6+ characters, Supabase's minimum). You land straight in
the app.

---

## Database schema

The app expects three objects in your Supabase Postgres:

- **`tracker_object`** — one row per tracked thing
  (`id`, `name`, `description`, `hue`, `archived_at`, `created_at`).
- **`tick_event`** — an append-only log; one row per logged amount
  (`object_id`, `tick_date`, `minutes`). Entries are never overwritten.
- **`daily_total`** — a view that sums `tick_event.minutes` per object per day,
  read by both **Today** and **Grid**.

Dates are computed in the browser's local timezone so an evening entry files
under the correct day rather than drifting into UTC's next day.

### Row-level security

Enable RLS on your tables with a policy scoped to authenticated users. Without a
login, the same query returns zero rows even when data exists — that is RLS
doing its job, not an empty table.

**Close the door once you've signed up:** in Supabase, turn off
**Authentication → Providers → Allow new users to sign up**. Until you do,
anyone who finds your URL can create an account and read data.

---

## Scripts

| Command           | What it does                    |
| ----------------- | ------------------------------- |
| `npm run dev`     | Start the Vite dev server       |
| `npm run build`   | Type-check (`tsc -b`) and build |
| `npm run preview` | Preview the production build    |
| `npm run lint`    | Run ESLint                      |

---

## Project structure

```
src/
  App.tsx              App shell, header, and tab navigation
  components/
    Auth.tsx           Sign in / sign up form
    Grid.tsx           Contribution calendar + stats
    Today.tsx          Per-object daily logging
    Objects.tsx        Create / list / archive objects
  lib/
    supabase.ts        Single shared Supabase client
    useSession.ts      Auth session hook
```

---

## Notes

- Your IDE may flag `FormEvent` from the React 19 type definitions. It is not an
  error — `tsc` passes clean and the build works. Safe to ignore.
