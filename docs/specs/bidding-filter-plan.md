# Bidding filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filters → Bidding: "Round 1 at least" / "Round 2 at least" number boxes that keep SOM sections whose average past points (the four squares' rounds) meet the minimum.

**Architecture:** Pure helpers (`averageRounds` in `biddingHistory.js`, `filterByBidding` + filter state in `filterCourses.js`); `CourseBrowser.jsx` applies it with the shared bidding history (exported `useBiddingHistory`) only for SOM; `CourseFilters.jsx` renders a `BiddingMinimums` box under Bid or permission.

**Tech Stack:** Vite, React, Tailwind, Vitest.

**Spec:** `docs/specs/bidding-filter.md` (approved Nov 19, 2026).

## Global Constraints

- Version **1.3.3**, straight to `main` after `npm test`, `npm run build`, browser check (Single plan, Compare plans, phone).
- Copy: legend "Bidding", hint "Average of past years", labels "Round 1 at least" / "Round 2 at least", placeholder "0".
- Empty or 0 = no filter; ≥ 1 hides sections with no number for that round; both boxes must hold.

## Review Focus

- Bidding minimum set, then switch to another school → that school's list is not emptied (Task 2: only applied when `somFilters`).
- Bidding file not loaded yet → nothing hidden (Task 2).
- Typing "05", "-3", "1.5" → digits only, 5 / 3 / 15 (Task 2 input sanitizes to digits).
- Clear all filters empties both boxes; each filled box counts once in the Filters number (Task 1 test on `hasActiveFilters` / `countBiddingFilters`).
- A section with one gray square → averages only the number it has (Task 1 test).

---

### Task 1: Averages and filter logic

**Files:** `src/lib/biddingHistory.js`, `src/lib/filterCourses.js`; tests in `src/lib/biddingHistory.test.js`, `src/lib/filterCourses.test.js`.

**Produces:** `averageRounds(rounds) → { round1: number|null, round2: number|null }`; `minPoints(value: string) → number` (0 when empty/invalid); `filterByBidding(courses, { minRound1, minRound2 }, history) → courses`; `createEmptyFilters()` gains `minRound1: ''`, `minRound2: ''`; `hasActiveFilters` and the Filters count include them.

- [ ] Tests: averages skip null; 0/empty = no filter; min 50 with averages 60 / 40; both boxes must hold; no history hidden once set; filter state counts. Run, fail, implement, pass.

### Task 2: Bidding box + wiring

**Files:** `src/components/CourseFilters.jsx`, `src/components/CourseBrowser.jsx`, `src/components/BiddingHistory.jsx` (export `useBiddingHistory`).

- [ ] Number inputs (type number, min 0, inputMode numeric, digits only) styled like Time Range's fields, under Bid or permission; apply `filterByBidding` after `filterCourses` when `somFilters` and the history has loaded; count each filled box; Clear resets.

### Task 3: Ship

- [ ] Checks + browser; docs (`AGENTS.md`, `docs/PROJECT_STATUS.md`, `docs/specs/bidding-history.md`, spec status); Updates 1.3.3 + `npm version 1.3.3 --no-git-tag-version`; issue, commit, push, check live.
