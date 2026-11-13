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

   **How the brainstorm goes** (the user liked this; repeat it for every feature, even when they describe it in plain words without a slash command): use the `superpowers:brainstorming` skill, with these project rules winning over it:
   - Read the relevant code first, then repeat the idea back in plain words with what you found (how it works today, what it would touch).
   - One question per message, only ones that change what gets built; for each, sketch the options with tradeoffs and say which you'd pick.
   - Show every screen as a small text sketch; use a visual mockup when the look itself is the user's call (colors, button sizes).
   - Cover Single plan, Compare plans and phones in every spec.
   - Small fixes the user spots along the way get fixed and shipped right away (step 5), not folded into the spec.
   - Spec goes to `docs/specs/<feature>.md` (not `docs/superpowers/specs/`), following `docs/specs/shortlist.md`: Why, Goals, Non-goals, Anti-goals, Approaches considered, What the student sees, Data, Release, Left to the builder. Before handing it over, have a fresh subagent read it as the builder; settle what you can and mark those as your calls, then bring only the user's questions.
5. **Test, then ship (user-approved Nov 2026).** Pushing to `main` goes live on Vercel in about a minute, so first check it yourself. **All** of these must pass:
   - `npm test` passes.
   - `npm run build` succeeds.
   - For anything visible: run the app (`dev` in `.claude/launch.json`) and check the change in the browser, with no console errors, in both Single plan and Compare plans views where relevant.

   **Right before every commit and push, update the version and Updates** (the patch notes students see from the **Updates** button in the top bar): add an entry at the top of `UPDATES` in `src/lib/updates.js` and set the same version in `package.json` with `npm version <x.y.z> --no-git-tag-version` (`npm test` fails if they differ). Small fixes going straight to `main` bump the last number (1.0.1 → 1.0.2); a release branch is the middle number (`release/1.2` → 1.2.0, then fixes are 1.2.1, 1.2.2). A release has **one** Updates entry for x.y.0: each feature merged into the release branch adds its lines to that entry. Each change is one or two explicit, plain sentences for students: what changed, where it is, and how to use it. Behind-the-scenes changes (course data refreshes, docs, workflow) get no entry and no new version.

   If a check fails and you can't fix it, **don't commit**; tell the user what's broken. When everything passes, how it ships depends on size:
   - **Small fixes and polish → straight to live.** Commit only the files you changed (clear message in plain words), `git push origin main` without asking, and check that the live site still loads.
   - **New features (anything that went through the spec in step 4) → a release branch, live together** (user-approved Nov 2026). Features for the next middle version collect on **`release/<x.y>`** (e.g. `release/1.2`), made from `main`. Each feature: branch `feature/<short-name>` from the release branch → pull request **into the release branch** → Vercel posts a private preview link on the pull request → send it to the user and wait → merge into the release branch only when the user approves. Smaller issues the user wants in the same launch also go into the release branch the same way. The release branch has its own preview link showing everything together. On launch day, when the user says ship it: one pull request `release/<x.y>` → `main`, merge, check the live site. Small fixes keep going straight to `main` (x.y.z); merge `main` into the open release branch regularly so they aren't lost.

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
| **Updates page** (`/updates`, patch notes; version 1.0.1) | ✅ Live (Nov 2026); every change adds an entry (Workflow step 5) |
| **Courses from across Yale** (School picker; spec `docs/specs/cross-registration.md`; version 1.1.0) | ✅ Live (Nov 2026); daily Yale job; Law reader unfinished |
| **Release 1.2** (`release/1.2`; features collect there, go live together) | In progress |
| **Shortlist** (★ star + ★ button by search; spec `docs/specs/shortlist.md`; part of 1.2.0) | Preview, waiting for approval (issue #11) |
| **Wider promo** | When you choose (not a separate dev milestone) |

Full detail: **`docs/PROJECT_STATUS.md`**.

## Source of truth

| Data | Path |
|------|------|
| Product spec | `docs/PRD.md` |
| **Courses (one file per term)** | `docs/data-samples/courses_master_<term>.csv`, e.g. `fall2026`, `spring2027` (identical columns; new terms appear automatically) |
| Tags | Inline `tags` column on those CSVs (semicolon-separated names), set from Yale's attribute codes (`MGMS` → STEM, `MGGE` → GBS Req). Sections of one course share tags at load time (`harmonizeSectionTags`). |
| **Updating courses** | Automatic: a GitHub job (`.github/workflows/update-courses.yml`) pulls Yale SOM's course feed every 6 hours, adds new semesters and commits changes. Other schools: `.github/workflows/update-yale-courses.yml`, once a day, into `yale_courses_<term>.csv` (needs the `YALE_API_KEY` secret). Details: `docs/updating-course-data.md` |
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
| Other Yale schools: School picker, school labels/order, background load of `yale_courses_*.csv`, daily import | `src/lib/schools.js`, `src/components/SchoolPicker.jsx`, `loadOtherSchoolCourses` in `loadData.js`; `scripts/update-yale-courses.js`, `scripts/lib/yaleImport.js`, `scripts/lib/lawImport.js`; notes in `docs/updating-course-data.md` |
| Parse courses + `hasMeetingTime` + inline tags | `src/lib/parseCourses.js` |
| Category typo aliases only (new CSV values pass through) | `src/lib/categoryDisplay.js` |
| CSV column validation | `src/lib/csvColumns.js` |
| Compare Courses logic (grouping, shortlist, scoring, storage, Excel) | `src/lib/compareGroups.js`, `compareShortlist.js`, `compareScoring.js`, `compareStorage.js`, `compareExport.js` |
| Compare Courses UI | `src/components/compare/` (`CompareView`, `ShortlistStep`, `ScoreStep`, `RatingInput`, `WeightInput`) — visual spec in `docs/design/compare/` |
| Compare Plans (two plans side by side) | `src/lib/comparePlans.js`, `src/components/ComparePlansView.jsx`; state in `App.jsx` |
| Header (nav bar + mode sub bar) | `src/components/NavBar.jsx`, `src/components/SubBar.jsx` |
| Shortlist (stars per semester; ★ button next to search; star button in course details; tip `shortlist`) | `src/lib/shortlistStorage.js`, state in `App.jsx`, `CourseBrowser.jsx` (★ button, filter), `CourseRow.jsx` (star button) |
| Your Plan shows the semester on screen; Clear all clears only that semester | `src/lib/planSemester.js`, `PlanPanel.jsx`; popup beside the row: `besidePlacement` in `src/lib/portaledTooltip.js` |
| Updates page at `/updates` (patch notes + site version; new-update dot) | `src/lib/updates.js`, `src/components/UpdatesPage.jsx`, `UpdatesButton.jsx`; routing in `App.jsx`; `/updates` served by `vercel.json` |
| Old address → new address move (forwards with saved data; keep while old links are around) | `src/lib/domainMove.js`, called from `src/main.jsx` |

## Tech stack

Vite + React + Tailwind. No backend or database (Supabase removed Oct 2026). Saved plans in `localStorage` — `src/lib/planStorage.js`, `src/components/PlansMenu.jsx`.

## Git / deploy

GitHub: `benjaminpascu/yale-som-course-planner`. **Production:** Vercel at `https://somtimes.vercel.app` (renamed SOMtimes Nov 2026; the old `yale-som-course-planner.vercel.app` stays connected to Production, not a Vercel redirect, so `domainMove.js` can carry saved plans over). Storage keys keep the old `yale-som-course-planner-` prefix on purpose. Commit and push yourself once the checks in Workflow step 5 pass (small fixes to `main`; features to a `feature/` branch + pull request into the open `release/<x.y>` branch, which goes to `main` only when the user says ship it); never push code that fails them. Never force-push or rewrite history on `main`.
