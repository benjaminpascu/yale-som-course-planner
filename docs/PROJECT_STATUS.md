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

---

## Next up

### Milestone 5 — Tag unit tracker ⏭️

Per PRD §7.3: live units per requirement tag for courses in the active plan (all seven tags, no thresholds).

**Stop after Milestone 5** for user review; do not start Milestone 6 until they reply **approve**.

---

## Not started

| Milestone | Summary |
|-----------|---------|
| 6 | Named plans (localStorage), save/load/duplicate/export JSON, plan UI polish |
| 7 | Beta |
| 8 | Launch |

---

## Open product decisions (defer unless blocking)

- Calendar library: FullCalendar vs custom grid (decide at Milestone 4)
- GitHub + Vercel: not wired yet
- Yale policy email: user handling separately

---

## How to verify the app today

```bash
npm run dev
```

- Header: course count, tag count, data source (Supabase or local)
- Left: search + filters; click a course to add/remove from plan
- Right top: **Your plan** list; below: weekly calendar (timed courses only)
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
