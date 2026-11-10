# Project status

**Last updated:** October 2026  
**Purpose:** Handoff doc for new Cursor agents/chats. Update this when a milestone is approved.

---

## Completed

### Milestone 1 — Scaffold + course list ✅

- Vite + React + Tailwind in project root
- Loads courses master CSV (+ inline tags)
- Basic course list: number, title, faculty, schedule line, units, session
- Amber warning for courses without weekly meeting time

### Milestone 2 — Data layer + Supabase ✅

- Postgres `courses` table (`supabase/migrations/`; tags are a column on `courses` as of migration `003`)
- `npm run import:data` with column validation
- App reads Supabase when `VITE_SUPABASE_*` in `.env`, else bundled CSV
- User has Supabase project configured locally
- **Removed Oct 2026** — the app now reads only the bundled CSVs (see Spring 2027 section)

### Data fix — scheduling columns ✅

- Replaced unreliable `Timings *` / `Daytimes` columns with `days_clean`, `start_24h`, `end_24h`
- Deleted old `courses_master.csv`

### Fall 2026 catalog + inline tags ✅ (July 2026)

- Single source: `docs/data-samples/courses_master_fall2026.csv` (227 courses)
- `tags` column: semicolon-separated names (e.g. `STEM`, `GBS Req`, `STEM;GBS Req`)
- Removed separate `course_tags.csv` / app join on tags table
- Requirement tracker + filters discover tag names from data (no hardcoded tag list)

### Spring 2027 catalog + term selector ✅ (Oct 2026, live)

- Second file: `docs/data-samples/courses_master_spring2027.csv` (217 rows, 216 visible, TermCode `202701`); same columns as fall
- App + import script load both files into one list (416 visible courses)
- **Term** switch (Fall 2026 / Spring 2027) at the top of the course catalog; filter options follow the selected term
- Conflicts: different terms never conflict; spring-1/spring-2 behave like fall-1/fall-2; session dates outside the term year are ignored (MGT 640 typo)
- Sections of the same course share requirement tags at load time (Yale tagged only some sections, e.g. only G1 with `GBS Req`)
- Category typo aliases: `MMG GBS` → `MMS GBS`, `Business and the Law` → `Business & the Law`
- Oct 2026: Supabase project host stopped resolving (paused free project), which took the live catalog down. Supabase was removed entirely: no database, no env vars, no import script. Course data = the CSVs, bundled at build time; push to `main` to update.

---

### Milestone 3 — Course browser ✅

- Search (number, title, faculty, description)
- Filters: session, day, time range, units, bid/permission, category, requirement tag (from data)
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

- **Requirements** panel: one row per unique tag found in the catalog; sums **units** (not course count)
- Live update as courses are added/removed from the working plan
- Hover tooltip lists contributing courses and units per tag
- Optional student-set unit targets (“Set targets”)
- Student-maintained disclaimer (§7.3)
- Code: `src/components/TagUnitTracker.jsx`, `src/lib/tagUnitTracker.js`

### Milestone 6 — Named plans + polish ✅ (approved May 2026)

- **Plans menu** in header (`PlansMenu` + `SavedPlansPanel`): create, switch active plan, save, rename, delete
- **Your plan** panel (`PlanPanel`): working course list, remove, clear all, save when dirty
- Plans stored in browser `localStorage` (`src/lib/planStorage.js`); reload restores last active plan
- Unsaved-changes warning when switching plans or adding a plan while dirty
- Shared disclaimer copy (`src/components/Disclaimer.jsx`) in plans UI + requirements
- No plan CSV/JSON export (simpler v1)

---

## Live (May 2026)

**Core build milestones (1–6) are done.** The app is hosted on **Vercel**; you share the production link directly (no separate “beta deploy” vs “launch deploy” stage).

| Phase | What you do |
|-------|-------------|
| **Now** | App is live. Send the Vercel URL to friends for real-world use; fix bugs and polish in small follow-up tasks (new Cursor chat per issue is fine). |
| **Later** | Wider promotion (GroupMe, student gov, demo video, etc.) when you choose — not a separate engineering milestone. |

Repo: `benjaminpascu/yale-som-course-planner`. No environment variables needed.

---

### Mobile layout — bottom navigation ✅ (May 2026)

**Goal:** Same features as desktop; only layout changes below the `lg` breakpoint.

| Tab | Content |
|-----|---------|
| **Calendar** | Weekly calendar → **Requirements** at bottom |
| **Courses** | Search, filters, catalog |
| **Plans** | Saved plans + **Your plan** |

Desktop (`lg+`): unchanged — catalog sidebar + planning stack; **Plans** in header menu. Code: `MobileBottomNav.jsx`, `MobilePlansPanel.jsx`, `App.jsx`.

---

### Compare Plans (Nov 2026)

- **Single plan | Compare plans** switch (navy, like Fall / Spring) on the left of the Plan sub bar (computer only; Compare needs two saved plans). Course list stays left; two plans side by side, each with its own calendar, Requirements and Your plan.
- Fixed spots in both views: the Plan menu sits at the right of the Weekly calendar bar (one per half when comparing); Fall 1 / Fall 2 and Fall / Spring switches sit at the right of the sub bar (phones keep the half-term tabs on the calendar).
- The open plan is the side being edited (green "Plan:" button; grey on the other side); "Add to plan", remove and Save apply there. The other side shows its saved courses; clicking anywhere on it opens that plan (usual unsaved-changes warning).
- One full-width Requirements bar with one Set targets (targets are shared); calendar ↔ Your plan opens on both sides together.
- Nav tabs renamed: **Plan** (was Planner) and **Rank** (was Compare; Compare Courses code keeps its names).
- Code: `src/lib/comparePlans.js` (+ tests), `src/components/ComparePlansView.jsx`, `App.jsx`.

### Compare Courses ✅ (live Nov 2026)

Visual spec: `docs/design/compare/` (screenshots + `.dc.html` mockups).

- **Header:** global navy bar (title, Planner | Compare, contact pill) + white sub bar per mode (Planner: plans menu; Compare: step tabs + term switch). Phones switch modes in the bottom nav.
- **Step 1 Shortlist:** one course at a time (sections grouped by number + title, EMBA separate), in a random order shuffled once per term and saved. Not interested / Maybe / Interested via buttons, ← ↓ → keys, or swipe on phones; Undo (also Cmd/Ctrl+Z); progress column on desktop whose counts open a Review panel to search past decisions and move courses between Interested / Maybe / Not interested ("Review" link on phones).
- **Step 2 Score and rank:** Interested and Maybe courses rated 1–10 per criterion (default Interesting 0.35, Useful 0.45, Professor 0.20; weights are decimals that add to 1, "Fix weights" rescales). Weighted score over rated criteria; the Professor rating is shared by every course (and term) with the same professor or teaching team; expandable rows (description, syllabus, growing note box, move/remove); Ranking card; Excel export (ExcelJS, loaded on click) with Shortlist + Criteria sheets.
- Saved per term in `localStorage` key `yale-som-course-planner-compare` (version 2); unreadable data is backed up, never overwritten.
- Tests: `npm test` (Vitest) — grouping, shortlist, scoring, storage, export.

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

- Header: navy nav bar (title, Planner | Compare, contact pill — the pop-up credits the [Yale SOM Course List](https://som.yale.edu/elective-core-courses)) + white sub bar (plans menu in Planner)
- **Desktop:** catalog sidebar (left) + stack (right): calendar → requirements → your plan. **Plans** via header menu.
- **Mobile:** bottom tabs — Calendar / Courses / Plans / Compare (see mobile section above).
- **Compare** (header tab): step 1 Shortlist (one course at a time), step 2 Score and rank (ratings, weights, ranking, Excel export).
- Click a catalog row to add/remove from plan; selected rows show light blue “In plan” styling
- Rows that would overlap your plan show a red **Conflict** badge (still clickable)
- **Calendar:** session tabs when your plan mixes terms (e.g. Fall 1 + Fall 2); full-term courses show on both mini-term tabs; overlapping courses render side by side
- Most rows: `Mo,We · 13:00–16:00` style times
- Some rows: semester date range + **No time defined — won't show on calendar**

After CSV changes: check locally with `npm run dev`, then push to `main` (Vercel redeploys).

---

## Changelog (maintainers)

| Date | Change |
|------|--------|
| May 2026 | Initial scaffold; Supabase; `courses_master_new.csv`; no-time warning in list |
| May 2026 | Milestone 3 course browser; Milestone 4 calendar + session-aware conflicts |
| May 2026 | Milestone 5 tag unit tracker; single-column Yale-themed UI; M6 next |
| May 2026 | Milestone 6 named plans + localStorage ✅ approved |
| May 2026 | Mobile bottom-nav layout agreed (Calendar / Courses / Plans); PRD plans §7.4 aligned to shipped UI |
| May 2026 | Live on Vercel; private link sharing; promo when ready (no M7/M8 build stages) |
| May 2026 | Calendar: side-by-side overlaps + session view tabs (`calendarLayout.js`, `calendarSessionView.js`) |
| July 2026 | Fall 2026 CSV; inline `tags` column; removed separate tags CSV/table; dynamic requirement UI |
| Oct 2026 | Spring 2027 CSV; combined catalog; term selector; term-aware conflicts; section tag harmonizing |
| Oct 2026 | Removed Supabase (paused project broke live); app reads bundled CSVs only |
| Oct 2026 | Two-bar header; Compare Courses (Shortlist + Score and rank, per-term saving, Excel export); Vitest added |
| Nov 2026 | Compare Courses live: review panel for past decisions, shared professor ratings, final review fixes; merged to `main` |
| Nov 2026 | Compare Plans (two plans side by side); nav tabs renamed Plan / Rank |
