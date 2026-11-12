# Cross-registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SOM students can pick another Yale school in the catalog, add its courses to a plan, and see them on the calendar with clashes; the data refreshes daily.

**Architecture:** A daily Node script pulls Yale's Courses Web Service v3 (all schools but SOM/Law) and Law's public course list into `docs/data-samples/yale_courses_<term>.csv` (SOM columns + `School` + `Course Page`). The app keeps loading SOM CSVs at start and loads the Yale files in the background (separate chunk). A School picker in the sub bar picks which school the catalog shows.

**Tech Stack:** Node 22 scripts (fetch, papaparse), Vitest, React 19 + Vite + Tailwind, GitHub Actions.

**Spec:** `docs/specs/cross-registration.md`

## Global Constraints

- Never push to `main`; work on `feature/cross-registration`, PR + Vercel preview. Version **1.1.0** with an Updates entry.
- API key only from env `YALE_API_KEY` (GitHub secret / `.env.local`); never printed, logged, or bundled.
- Non-SOM courses: units 0, no units shown, session = full term (`fall` / `spring`), no tags/category/bid.
- Warning text exactly: "Non-SOM courses count as 0 units"; hover: "Courses from other schools count as 0 units here. Check with the registrar how they count toward your SOM units." `text-caution`, `text-xs font-medium`, triangle icon, left of Select Requirements.
- Picker order: School of Management, Jackson School of Global Affairs, Law School, School of the Environment, School of Public Health, Yale College, Graduate School of Arts and Sciences, then other schools alphabetically; only schools with courses in the shown term.
- Daily job; keep last good data on empty/half-size/wrong-term answers; ≈1,500 Yale requests/day max.
- Law: read-only public course list; if it needs anything more, ship without Law.

## Review Focus

- Yale's flaky empty answers must never delete a school's or subject's courses (keep previous rows for that pair).
- Saved plans with non-SOM courses must survive page load before the Yale files arrive (no ID pruning while loading).
- Meeting patterns like `"TTh 4.10-6.00p"`, `"MW 11.35-12.50"`, `"1 HTBA"`, several patterns per section → correct 24h times or "No time defined".
- SOM-only users: initial load no heavier than today (Yale data in a separate chunk).
- Switching school or term must not leave a SOM-only filter silently hiding everything.

---

### Task 1: Yale import library (pure functions, tested)

**Files:** Create `scripts/lib/yaleImport.js`, `scripts/lib/yaleImport.test.js`

**Produces:**
- `YALE_SCHOOLS: { code, label }[]` (AC, AT, DI, DR, FS, GB, GS, MD, MU, NR, PA, PH, YC with labels; LW label "Law School").
- `parseMeetingPatterns(patterns: string[]) → { days_clean, start_24h, end_24h }` (Yale day letters M T W Th F Sa Su → Mo Tu We Th Fr Sa Su; "h.mm-h.mm[p]"; hours 1–6 pm, 7 pm when `p` or end ≥ start, 8–11 am, 12 noon; patterns with identical times merge days; otherwise first timed pattern wins; none → empty strings).
- `htmlToText(html) → string`.
- `buildYaleRows(sections, schoolCode) → { rows, problems }` (rows use `OUTPUT_COLUMNS` + `School`, `Course Page`; `Course ID` = `<termCode>-<crn>`; `Course Number` = `<subjectCode> <courseNumber>`; skip status C/B/D; Units "0"; Visible "1"; Course Session = `fall`/`spring` from term).
- `YALE_COLUMNS` = `[...OUTPUT_COLUMNS, 'School', 'Course Page']`; `yaleFileName(termCode)` / `termCodeFromYaleFileName(name)`.

- [ ] Tests: pattern cases above (`"MW 2.35-3.50"`→Mo,We 14:35–15:50; `"TTh 4.10-6.00p"`→Tu,Th 16:10–18:00; `"MW 11.35-12.50"`→11:35–12:50; `"M 9.25-11.20"`; `"Th 7.00-8.55p"`→19:00–20:55; `["TTh 9.00-10.15","1 HTBA"]`→Tu,Th; `["1 HTBA"]`→empty), cancelled skipped, ID format, HTML stripped.
- [ ] Implement; `npm test` passes; commit.

### Task 2: Yale fetcher + daily script

**Files:** Create `scripts/update-yale-courses.js`; state `docs/data-samples/yale_subject_pairs.json`; `package.json` script `update-yale-courses`.

- Terms: same open/upcoming terms as SOM files (`termsToUpdate` over SOM files).
- Per term: subjects via SubjectsAPIv2; known pairs (from state) asked daily with up to 4 tries; unknown pairs swept 1/7 per day (by day of week) with 2 tries. Empty after tries → keep old rows of that pair. ~1 s between requests.
- Merge per pair → rows; within a school, drop a cross-listed secondary when its primary is present.
- Safety: unreachable / all-empty / < 50% previous / wrong term → keep file, exit 1. `--check`, `--summary-file`, `--force` like SOM script. Key from `process.env.YALE_API_KEY` (or `.env.local`).
- [ ] Run locally with `--check` on one term (limited subjects) to confirm; commit.

### Task 3: Law reader

**Files:** Create `scripts/lib/lawImport.js` (+ test of row mapping), used by `update-yale-courses.js` for school `LW`.
- [ ] Capture the page's own course-list request in a browser; reproduce it read-only; map to rows (`Course Page` = Law detail URL). If it needs more than the public list → skip Law, note it, continue.

### Task 4: Workflow + probe

**Files:** Create `.github/workflows/update-yale-courses.yml` (daily cron, dispatch, same commit/test/build/keepalive steps as `update-courses.yml`, env `YALE_API_KEY: ${{ secrets.YALE_API_KEY }}`); temporary `.github/workflows/probe-sources.yml` on push to `feature/cross-registration` (one Yale + one Law request, prints counts only). Remove the probe before merge.

### Task 5: App

**Files:** Create `src/lib/schools.js` (labels, order, `isSomCourse`), `src/components/SchoolPicker.jsx`; modify `src/lib/loadData.js` (`loadOtherSchoolCourses()` via non-eager glob), `src/lib/parseCourses.js` (`school`, `coursePageUrl`), `src/App.jsx` (picker state, background load, hydration waits for Yale data when the saved plan has `<term>-<crn>` IDs), `CourseBrowser.jsx`/`CourseFilters.jsx` (`somFilters`), `CourseRow.jsx`/`CalendarCourseBlock.jsx`/`courseDisplay.js` (hide units), `TagUnitTracker.jsx` (warning), `ComparePlansView.jsx` (header gets both plans), Rank catalog SOM-only, phone: picker at top of Courses tab.
- [ ] Tests: `schools.test.js` (order, labels), `loadData`/parse test for `School` column; existing tests pass.

### Task 6: Ship to preview

- [ ] Version 1.1.0 + Updates entry; docs (`docs/updating-course-data.md`, `AGENTS.md`, `PROJECT_STATUS.md`); `npm test`, `npm run build`, browser check both views; push branch; PR "Closes #1"; do not merge.
