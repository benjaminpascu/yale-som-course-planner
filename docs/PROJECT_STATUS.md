# Project status

**Last updated:** May 2026  
**Purpose:** Handoff doc for new Cursor agents/chats. Update this when a milestone is approved.

---

## Completed

### Milestone 1 — Scaffold + course list ✅

- Vite + React + Tailwind in project root
- Loads `docs/data-samples/courses_master_new.csv` (+ tags CSV)
- Basic course list: number, title, faculty, schedule line, units, session
- Amber warning for courses without weekly meeting time

### Milestone 2 — Data layer + Supabase ✅

- Postgres tables: `courses`, `tags` (`supabase/migrations/`)
- `npm run import:data` with column validation
- App reads Supabase when `VITE_SUPABASE_*` in `.env`, else bundled CSVs
- User has Supabase project configured locally

### Data fix — `courses_master_new.csv` ✅

- Replaced unreliable `Timings *` / `Daytimes` columns with `days_clean`, `start_24h`, `end_24h`
- Deleted old `courses_master.csv`
- PRD §6.1 and §7.2 updated
- ~480 courses in DB after import; ~371 with weekly times; ~109 without

---

### Milestone 3 — Course browser ✅

- Search (number, title, faculty, description)
- Filters: session, day, time range, units, bid/permission, category, requirement tag
- Row UI: bid/permission badge, syllabus link, amber no-time warning
- Session labels with full-term footnote

### Milestone 4 — Weekly calendar ✅

- Mon–Fri grid (~8am–9pm); add/remove via catalog click, plan list, or calendar block
- Session-aware conflict detection; conflict badge on list rows
- **Your plan** panel (working list; persisted via Saved plans in Milestone 6)
- Untimed courses in plan but not on grid
- Deferred (optional PRD): “view by session” calendar toggle; FullCalendar vs custom (used custom grid)
- **Layout (May 2026):** Single full-width column on all screen sizes — calendar (placeholder until first course) → requirements → your plan → collapsible search & filters → course catalog. Yale navy/grey section styling.

### Milestone 5 — Tag unit tracker ✅

- **Requirements** panel: all seven Yale requirement tags always shown; sums **units** (not course count)
- Live update as courses are added/removed from the working plan
- Hover tooltip lists contributing courses and units per tag
- Student-maintained disclaimer (§7.3)
- Code: `src/components/TagUnitTracker.jsx`, `src/lib/tagUnitTracker.js`

### Milestone 6 — Named plans + polish ✅ (approved May 2026)

- **Saved plans** bar between Requirements and Your plan: switch plans, save/update, duplicate, download CSV, delete
- Plans stored in browser `localStorage` (`src/lib/planStorage.js`); reload restores last active plan
- Unsaved-changes warning when switching plans or starting a new plan
- Shared disclaimer copy (`src/components/Disclaimer.jsx`) in Requirements + plan save area
- Removed “saving comes later” placeholder in Your plan footer

---

## Live (May 2026)

**Core build milestones (1–6) are done.** The app is hosted on **Vercel**; you share the production link directly (no separate “beta deploy” vs “launch deploy” stage).

| Phase | What you do |
|-------|-------------|
| **Now** | App is live. Send the Vercel URL to friends for real-world use; fix bugs and polish in small follow-up tasks (new Cursor chat per issue is fine). |
| **Later** | Wider promotion (GroupMe, student gov, demo video, etc.) when you choose — not a separate engineering milestone. |

Repo: `benjaminpascu/yale-som-course-planner`. Production env vars (`VITE_SUPABASE_*`) live in Vercel; never commit `.env`.

---

## Open product decisions (defer unless blocking)

- Calendar library: FullCalendar vs custom grid — **resolved** (custom grid at M4)
- Yale policy email: user handling separately

---

## How to verify

**Production:** your Vercel URL (primary for testers).

**Local:**

```bash
npm run dev
```

- Header: academic year (from CSV `TermCode`), course/tag counts, link to [Yale SOM Course List](https://som.yale.edu/elective-core-courses)
- Top → bottom: **Weekly calendar** (empty prompt until you add a course) → **Requirements** (tag units) → **Saved plans** → **Your plan** → **Search & filters** (collapsible) → **Course catalog**
- Click a catalog row to add/remove from plan; selected rows show light blue “In plan” styling
- Rows that would overlap your plan show a red **Conflict** badge (still clickable)
- **Calendar:** session tabs when your plan mixes terms (e.g. Fall 1 + Fall 2); full-term courses show on both mini-term tabs; overlapping courses render side by side
- Most rows: `Mo,We · 13:00–16:00` style times
- Some rows: semester date range + **No time defined — won't show on calendar**

Re-import after CSV changes:

```bash
npm run import:data
```

---

## Changelog (maintainers)

| Date | Change |
|------|--------|
| May 2026 | Initial scaffold; Supabase; `courses_master_new.csv`; no-time warning in list |
| May 2026 | Milestone 3 course browser; Milestone 4 calendar + session-aware conflicts |
| May 2026 | Milestone 5 tag unit tracker; single-column Yale-themed UI; M6 next |
| May 2026 | Milestone 6 named plans + localStorage + CSV export ✅ approved |
| May 2026 | Live on Vercel; private link sharing; promo when ready (no M7/M8 build stages) |
| May 2026 | Calendar: side-by-side overlaps + session view tabs (`calendarLayout.js`, `calendarSessionView.js`) |
