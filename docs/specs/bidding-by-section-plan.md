# Bidding history by section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small bidding table in the course popup with a full-width "Bidding history by section" table, show the full description, and keep the popup at least as wide as the table.

**Architecture:** Pure helpers in `src/lib/biddingHistory.js` build the grid; a section index built once in `App.jsx` reaches the popup through a React context; the popup placement helpers in `src/lib/portaledTooltip.js` take a `minWidth` measured from the rendered table.

**Tech Stack:** Vite, React, Tailwind, Vitest.

**Spec:** `docs/specs/bidding-by-section.md` (approved Nov 19, 2026). Visual reference: local branch `try/bid-details` (throwaway; its uncommitted changes are the starting point and are cleaned up here).

## Global Constraints

- Version **1.3.2**, straight to `main` after `npm test`, `npm run build` and a browser check in Single plan and Compare plans.
- Title copy: "Bidding history by section". Disclaimer copy (shared `BIDDING_DISCLAIMER`): "Section times and professors may change from year to year."
- Your section: `bg-save-50`, header `font-semibold text-save-900`, no "(this section)". Lines vertical only: `border-black/10` between sections and closing the last one, `border-black/5` between R1 and R2.
- Rows: last three years (`recentTermsFor`), both seasons, newest first, only semesters with a result.
- EMBA course → "Bidding history · No bidding history". EMBA sections never columns in a full-time table.
- Popup `LARGE_TOOLTIP_MAX_HEIGHT_PX` = 720; only the popup scrolls (`overflow-y-auto overscroll-contain`).

## Review Focus

- A section offered now with no results in any semester (MGT 822 G1) → a column of "–" (Task 1 test).
- An EMBA course with full-time results under the same number (MGT 822 E1) → no table (Task 1 test).
- A destination-matched trip (MGT 416) → one column under this section's number (Task 1 test).
- A narrow Your Plan popup in Compare plans with 4+ sections → popup moves above/below at table width, no sideways scroll (Task 3 test on `besidePlacement`).
- Results older than three years (Spring 2023) → never a row (Task 1 test).

---

### Task 1: Grid helpers

**Files:** Modify `src/lib/biddingHistory.js`, `src/lib/compareGroups.js` (export `isEmbaSection`); Test `src/lib/biddingHistory.test.js`

**Interfaces — Produces:**
- `getBiddingGrid(course, history, currentSections: string[]) → { sections: string[], thisSection: string, rows: { term, cells: Record<section, { round1, round2 }> }[] }` (EMBA course → `rows: []`)
- `buildSectionIndex(courses) → Map<string, string[]>` and `sectionsFor(index, course) → string[]`, keyed by term + course number + EMBA or not.

- [ ] Tests: MGT 822 (`['01','G1']` + history for 01) → `sections ['01','G1']`, no G1 cells; EMBA course → `rows []`; MGT 416 trip → one column `thisSection`; Spring 2023 row absent; `buildSectionIndex` keeps EMBA apart. Run `npx vitest run src/lib/biddingHistory.test.js` → fail, implement, pass.

### Task 2: Popup table + full description

**Files:** Modify `src/components/BiddingHistory.jsx` (`BiddingHistoryGrid`, `CourseSectionsContext`; remove `BiddingHistoryDetail`, the prototype's `useCurrentSections` and `RoundsTable`'s `compact` mode), `src/components/CalendarCourseBlock.jsx` (full description in normal flow, divider + grid under the two columns; drop `descriptionLines`), `src/App.jsx` (provide the index), `src/lib/portaledTooltip.js` (drop the line counts, `DESCRIPTION_CHROME_PX`, `--tooltip-desc-max`).

- [ ] Grid has `data-bidding-table` on the `<table>`. Build passes; browser check MGT 822 and MGT 532.

### Task 3: Popup at least as wide as the table

**Files:** Modify `src/lib/portaledTooltip.js` (`besidePlacement(..., { minWidth })` returns null when room < max(288, minWidth); `calendarCourseTooltipStyle(..., { minWidth })` widens to `min(minWidth, innerWidth − 32)`), `src/components/PlanCourseRow.jsx`, `src/components/CalendarCourseBlock.jsx` (measure `[data-bidding-table]`.scrollWidth + 34 in a layout effect after open; store `minWidth`; refresh style when it grows). Test `src/lib/portaledTooltip.test.js`.

- [ ] Tests: `besidePlacement` with room 400 and `minWidth` 450 → null; with `minWidth` 300 → width 400. Run, fail, implement, pass.

### Task 4: Ship

- [ ] `npm test`, `npm run build`, browser: Single plan + Compare plans (narrow popup), phone sheet; no console errors.
- [ ] Docs: `docs/specs/bidding-history.md` (popup + disclaimer), `AGENTS.md`, `docs/PROJECT_STATUS.md`, spec status → built.
- [ ] `src/lib/updates.js` 1.3.2 entry + `npm version 1.3.2 --no-git-tag-version`; commit, push `main`, check live; GitHub issue for the record; delete `try/bid-details`.
