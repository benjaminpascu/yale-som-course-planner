---
description: 
alwaysApply: true
---

# Agent handoff — Yale SOM Course Planner

**Read this file first** when starting a **new agent** on this project.

## Workflow (required)

Per `docs/PRD.md` §12:

1. **One milestone or focused task = one new agent** (fresh chat). Do not continue unrelated work in a long, stale thread.
2. Read **`docs/PROJECT_STATUS.md`** for what is done and what is next.
3. Read **`docs/PRD.md`** for product requirements (especially §6 data model and §11 milestones).
4. **Brainstorm the full spec before any code** for a new feature (e.g. the GitHub issues labeled `roadmap`). Work through it with the user: what it does, where it appears on screen, the data it needs, edge cases, and what's out of scope. Save the agreed spec to `docs/specs/<feature>.md`, link it from the GitHub issue, and start building only after the user approves it. Small bug fixes and polish skip this step.
5. **Test, then ship (user-approved Nov 2026).** Pushing to `main` goes live on Vercel in about a minute, so first check it yourself. **All** of these must pass:
   - `npm test` passes.
   - `npm run build` succeeds.
   - For anything visible: run the app (`dev` in `.claude/launch.json`) and check the change in the browser, with no console errors, in both Single plan and Compare plans views where relevant.

   **Right before every commit and push, update the version and Updates** (the patch notes students see from the **Updates** button in the top bar): add an entry at the top of `UPDATES` in `src/lib/updates.js` and set the same version in `package.json` with `npm version <x.y.z> --no-git-tag-version` (`npm test` fails if they differ). Small fixes going straight to `main` bump the last number (1.0.1 → 1.0.2); new features through the spec bump the middle number (1.0.x → 1.1, then fixes are 1.1.1, 1.1.2). Each change is one or two explicit, plain sentences for students: what changed, where it is, and how to use it. Behind-the-scenes changes (course data refreshes, docs, workflow) get no entry and no new version.

   If a check fails and you can't fix it, **don't commit**; tell the user what's broken. When everything passes, how it ships depends on size:
   - **Small fixes and polish → straight to live.** Commit only the files you changed (clear message in plain words), `git push origin main` without asking, and check that the live site still loads.
   - **New features (anything that went through the spec in step 4) → test branch first.** Commit to a branch `feature/<short-name>`, push it, and open a pull request. Vercel builds a private preview link for it (posted on the pull request). Send the user that link and wait. Merge to `main` only when the user says to ship it, then check the live site.

   If something breaks after going live, undo it right away with `git revert` + push, then tell the user.
6. Work **one milestone at a time**. When finished: summarize what changed, say whether it's live or waiting on a preview link, give the user exact steps to try it, then **stop** and wait for the user before the next milestone.
7. At decision points (e.g. calendar library), present 2–3 options with tradeoffs; do not choose silently.

The user is a non-technical student. Explain clearly; ask explicitly when a product decision is needed.

## Current focus

| Item | Status |
|------|--------|
| Milestone 1 — Scaffold + course list | ✅ Done |
| Milestone 2 — Data layer | ✅ Done (Supabase removed Oct 2026; CSV only) |
| Milestone 3 — Search + filters | ✅ Done |
| Milestone 4 — Calendar + conflicts | ✅ Done |
| Milestone 5 — Tag unit tracker | ✅ Done |
| Milestones 1–6 — Core product | ✅ Done |
| **Fall 2026 data + inline tags** | ✅ Catalog + dynamic tags from CSV `tags` column |
| **Spring 2027 data + term selector** | ✅ Live (Oct 2026) |
| **Live** | ✅ Vercel; share link privately; fix issues as feedback comes in |
| **Compare Courses + two-bar header** | ✅ Live (Nov 2026) |
| **Compare Plans** (two plans side by side; tabs renamed Plan / Rank) | ✅ Built (Nov 2026) |
| **Rank hidden for launch** | Only links ending in `?rank` show the Rank tab (`RANK_UNLOCKED` in `App.jsx`) |
| **Automatic course updates** | ✅ Every 6 hours from Yale SOM's feed (Nov 2026); new semesters appear, finished ones hide |
| **Wider promo** | When you choose (not a separate dev milestone) |

Full detail: **`docs/PROJECT_STATUS.md`**.

## Source of truth

| Data | Path |
|------|------|
| Product spec | `docs/PRD.md` |
| **Courses (one file per term)** | `docs/data-samples/courses_master_<term>.csv`, e.g. `fall2026`, `spring2027` (identical columns; new terms appear automatically) |
| Tags | Inline `tags` column on those CSVs (semicolon-separated names), set from Yale's attribute codes (`MGMS` → STEM, `MGGE` → GBS Req). Sections of one course share tags at load time (`harmonizeSectionTags`). |
| **Updating courses** | Automatic: a GitHub job (`.github/workflows/update-courses.yml`) pulls Yale SOM's course feed every 6 hours, adds new semesters and commits changes. Details: `docs/updating-course-data.md` |
| Manual data fixes that survive updates | `docs/data-samples/course_overrides.csv` |
| Vercel deploy steps | `docs/vercel-setup.md` |

### Scheduling columns (courses CSV)

Use only: `days_clean`, `start_24h`, `end_24h` → app fields `meetingDays`, `startTime`, `endTime`.

- **`hasMeetingTime(course)`** in `src/lib/parseCourses.js` — true when all three are present.
- Courses with **no** weekly time: list normally, show amber **“No time defined — won't show on calendar”**, and **exclude** from calendar rendering and time-conflict checks (see PRD §6.1, §7.2).
- **`tags`** on each course: parse the CSV `tags` column by splitting on `;`. Do not hardcode tag names; discover unique tags from loaded courses.
- **Compare Courses data is filed per course under course number + program (EMBA or not)**, plus the title only when one number covers several courses (e.g. the MGT 416 trips). Fixing a title typo keeps students' Compare data; changing a course number, the EMBA category, or the title of a multi-course number starts that course fresh for them. Professor ratings are filed by professor name, so fix spelling duplicates (e.g. "Pinker, Edi" / "Pinker, Edieal") in the CSV.

## Commands

```bash
cd ~/Developer/course-planner
npm install
npm run dev              # http://localhost:5173 (or next free port)
npm run build
npm test                 # Vitest: compare grouping, shortlist, scoring, storage, export, course import
npm run update-courses   # pull the latest courses from Yale now (add -- --check to preview)
```

No database or environment variables. Course data is the CSVs in `docs/data-samples/`, bundled at build time and kept current by the 6-hourly GitHub job (`docs/updating-course-data.md`). Don't hand-edit the term CSVs — the next update overwrites them; use `course_overrides.csv` for fixes.

## Key code locations

| Area | Path |
|------|------|
| App shell / plan state | `src/App.jsx` |
| Planning stack (calendar → requirements → plan) | `src/components/PlanningPanel.jsx` |
| Course browser + filters | `src/components/CourseBrowser.jsx` |
| Weekly calendar | `src/components/WeeklyCalendar.jsx` |
| Requirement tag units | `src/components/TagUnitTracker.jsx`, `src/lib/tagUnitTracker.js` |
| Saved plans UI + localStorage | `src/components/PlansMenu.jsx`, `src/components/SavedPlansPanel.jsx`, `src/lib/planStorage.js` |
| Export / Import plans (JSON file, Plans menu) | `src/lib/planTransfer.js`, `PlansMenu.jsx`; `handleImportPlans` in `App.jsx` |
| Section colors / in-plan highlight | `src/lib/sectionTheme.js` |
| Fall/spring years + which terms show (finished terms hidden) | `src/lib/academicYear.js`, `App.jsx` |
| Session- and term-aware conflicts | `src/lib/scheduleConflicts.js` |
| Term selector (Fall / Spring) | `TermSwitch` in `src/components/SubBar.jsx` (top right of the sub bar, both modes); term list from `getCatalogTerms` in `academicYear.js` |
| Load data (every `courses_master_*.csv`, bundled; no code change for a new term) | `src/lib/loadData.js` |
| Parse courses + `hasMeetingTime` + inline tags | `src/lib/parseCourses.js` |
| Category typo aliases only (new CSV values pass through) | `src/lib/categoryDisplay.js` |
| CSV column validation | `src/lib/csvColumns.js` |
| Compare Courses logic (grouping, shortlist, scoring, storage, Excel) | `src/lib/compareGroups.js`, `compareShortlist.js`, `compareScoring.js`, `compareStorage.js`, `compareExport.js` |
| Compare Courses UI | `src/components/compare/` (`CompareView`, `ShortlistStep`, `ScoreStep`, `RatingInput`, `WeightInput`) — visual spec in `docs/design/compare/` |
| Compare Plans (two plans side by side) | `src/lib/comparePlans.js`, `src/components/ComparePlansView.jsx`; state in `App.jsx` |
| Header (nav bar + mode sub bar) | `src/components/NavBar.jsx`, `src/components/SubBar.jsx` |
| Updates (patch notes + site version; new-update dot) | `src/lib/updates.js`, `src/components/UpdatesMenu.jsx` |
| Old address → new address move (forwards with saved data; keep while old links are around) | `src/lib/domainMove.js`, called from `src/main.jsx` |

## Tech stack

Vite + React + Tailwind. No backend or database (Supabase removed Oct 2026). Saved plans in `localStorage` — `src/lib/planStorage.js`, `src/components/PlansMenu.jsx`.

## Git / deploy

GitHub: `benjaminpascu/yale-som-course-planner`. **Production:** Vercel at `https://somtimes.vercel.app` (renamed SOMtimes Nov 2026; the old `yale-som-course-planner.vercel.app` stays connected to Production, not a Vercel redirect, so `domainMove.js` can carry saved plans over). Storage keys keep the old `yale-som-course-planner-` prefix on purpose. Commit and push yourself once the checks in Workflow step 5 pass (small fixes to `main`, new features to a `feature/` branch + pull request until the user says ship it); never push code that fails them. Never force-push or rewrite history on `main`.
