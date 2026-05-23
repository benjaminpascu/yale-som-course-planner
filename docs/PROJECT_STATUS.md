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

## Next up

### Milestone 3 — Course browser ⏭️

Per PRD §7.1:

- Searchable course list
- Filters: session, day of week, time block, units, bid/permission, category, requirement tag
- Row UI: bid/permission indicator, syllabus link when available
- (Calendar add/remove comes in Milestone 4)

**Stop after Milestone 3** for user review; do not start Milestone 4 until they reply **approve**.

---

## Not started

| Milestone | Summary |
|-----------|---------|
| 4 | Weekly calendar + session-aware conflicts |
| 5 | Tag unit tracker (7 tags, no thresholds) |
| 6 | Plans (localStorage), export JSON, polish |
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
