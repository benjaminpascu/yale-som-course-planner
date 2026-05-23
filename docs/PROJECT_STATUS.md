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
- **Your plan** panel (working list only — no save/load until Milestone 6)
- Untimed courses in plan but not on grid
- Deferred (optional PRD): “view by session” calendar toggle; FullCalendar vs custom (used custom grid)
- **Layout (May 2026):** Single full-width column on all screen sizes — calendar (placeholder until first course) → requirements → your plan → collapsible search & filters → course catalog. Yale navy/grey section styling.

### Milestone 5 — Tag unit tracker ✅

- **Requirements** panel: all seven Yale requirement tags always shown; sums **units** (not course count)
- Live update as courses are added/removed from the working plan
- Hover tooltip lists contributing courses and units per tag
- Student-maintained disclaimer (§7.3)
- Code: `src/components/TagUnitTracker.jsx`, `src/lib/tagUnitTracker.js`

---

## Next up (pending your approval)

### Milestone 6 — Named plans + polish 🧪

Implemented (May 2026):

- **Saved plans** bar between Requirements and Your plan: switch plans, save/update, duplicate, download CSV, delete
- Plans stored in browser `localStorage` (`src/lib/planStorage.js`); reload restores last active plan
- Unsaved-changes warning when switching plans or starting a new plan
- Shared disclaimer copy (`src/components/Disclaimer.jsx`) in Requirements + plan save area
- Removed “saving comes later” placeholder in Your plan footer

Reply **`approve`** in chat when this looks good; then we move to Milestone 7 (beta).

---

## Not started

| Milestone | Summary |
|-----------|---------|
| 7 | Beta |
| 8 | Launch |

---

## Open product decisions (defer unless blocking)

- Calendar library: FullCalendar vs custom grid — **resolved** (custom grid at M4)
- Vercel deploy: not wired yet (GitHub repo exists)
- Yale policy email: user handling separately

---

## How to verify the app today

```bash
npm run dev
```

- Header: academic year (from CSV `TermCode`), course/tag counts, link to [Yale SOM Course List](https://som.yale.edu/elective-core-courses)
- Top → bottom: **Weekly calendar** (empty prompt until you add a course) → **Requirements** (tag units) → **Your plan** → **Search & filters** (collapsible) → **Course catalog**
- Click a catalog row to add/remove from plan; selected rows show light blue “In plan” styling
- Rows that would overlap your plan show a red **Conflict** badge (still clickable)
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
| May 2026 | Milestone 6 named plans + localStorage + CSV export (pending approve) |
