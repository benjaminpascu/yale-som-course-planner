# Agent handoff — Yale SOM Course Planner

**Read this file first** when starting a new Cursor chat or a **new agent** on this project.

## Workflow (required)

Per `docs/PRD.md` §12:

1. **One milestone or focused task = one new Cursor agent** (fresh chat). Do not continue unrelated work in a long, stale thread.
2. Read **`docs/PROJECT_STATUS.md`** for what is done and what is next.
3. Read **`docs/PRD.md`** for product requirements (especially §6 data model and §11 milestones).
4. Work **one milestone at a time**. When finished: summarize changes, give exact test steps, then **stop** and wait for the user to approve before the next milestone.
5. At decision points (e.g. calendar library), present 2–3 options with tradeoffs; do not choose silently.

The user is a non-technical student. Explain clearly; ask explicitly when a product decision is needed.

## Current focus

| Item | Status |
|------|--------|
| Milestone 1 — Scaffold + course list | ✅ Done |
| Milestone 2 — Supabase + import | ✅ Done |
| Course data fix (`courses_master_new.csv`) | ✅ Done |
| Milestone 3 — Search + filters | ⏭️ **Next** (after user approves) |
| Milestones 4–8 | Not started |

Full detail: **`docs/PROJECT_STATUS.md`**.

## Source of truth

| Data | Path |
|------|------|
| Product spec | `docs/PRD.md` |
| **Courses (only file)** | `docs/data-samples/courses_master_new.csv` |
| Tags | `docs/data-samples/course_tags.csv` |
| Tag merge script (reference) | `scripts/build_tags.py` — do not modify unless asked |
| Supabase schema | `supabase/migrations/001_initial_schema.sql`, `002_api_grants.sql` |
| Supabase setup steps | `docs/supabase-setup.md` |

**Do not use** `courses_master.csv` — it was removed; timing columns were unreliable.

### Scheduling columns (courses CSV)

Use only: `days_clean`, `start_24h`, `end_24h` → app fields `meetingDays`, `startTime`, `endTime`.

- **`hasMeetingTime(course)`** in `src/lib/parseCourses.js` — true when all three are present.
- ~111 courses have **no** weekly time: list normally, show amber **“No time defined — won't show on calendar”**, and **exclude** from calendar rendering and time-conflict checks (see PRD §6.1, §7.2).

## Commands

```bash
cd "/Users/benjaminpascu/Documents/Cursor/Course planner"
npm install
npm run dev              # http://localhost:5173 (or next free port)
npm run import:data      # load CSV → Supabase (needs .env)
npm run build
```

`.env` is gitignored. Copy from `.env.example` (Supabase URL, publishable key, secret key).

## Key code locations

| Area | Path |
|------|------|
| App shell / course list | `src/App.jsx` |
| Load data (Supabase or bundled CSV) | `src/lib/loadData.js` |
| Parse courses + `hasMeetingTime` | `src/lib/parseCourses.js` |
| Parse tags | `src/lib/parseTags.js` |
| CSV column validation | `src/lib/csvColumns.js` |
| Supabase import CLI | `scripts/import_courses.js` |

## Tech stack

Vite + React + Tailwind + Supabase (`@supabase/supabase-js`). No custom backend. Plans in `localStorage` (not built yet).

## Git / deploy

GitHub and Vercel are not set up yet. Do not commit `.env`. Only create git commits when the user asks.
