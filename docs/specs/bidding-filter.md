# Spec: Bidding filter

GitHub issue: #26 · Status: **approved and built** (Nov 19, 2026) · Version **1.3.2** (same day as Bidding history by section, so it shares that entry)

Small feature (user decision): a short spec, then straight to `main`, like 1.3.2.
Plan: `docs/specs/bidding-filter-plan.md`.

## Why

Some students want to find **popular** courses, and a high past bidding price is a
good sign of that. Today they have to open courses one by one and read the squares.
A filter lets them say "show me courses that usually cost at least X points".

## Goals

- Find courses whose past bids were at least a number of points, in Round 1 and/or
  Round 2.
- Use the same numbers the course's four squares show, so the filter never
  disagrees with the row.
- Fit the existing Filters panel, with no new panel or sort.

## Non-goals

- No sorting (user decision).
- No "at most" (finding free courses). Maybe later.
- No other schools (no bidding data).

## Anti-goals

- One wild year deciding everything: averaging smooths out a single 500-point Round 2.
- A filter that shows a course as "at least 50" when the squares show less.

## Approaches considered

1. **Price chips** (Free / 50+ / 100+ / 150+, colored like the squares, using the
   highest square). Dropped: Round 2 is often much higher than Round 1 (higher in
   163 of 421 recent sections; 72 sections at 150+ in Round 2 vs 13 in Round 1),
   so "highest" made a quarter of the catalog look like 150+.
2. **One switch for the round, then chips.** Dropped: an extra control.
3. **Chosen (user's idea): two number boxes, "Round 1 at least" and "Round 2 at
   least", each against the average of the past years with data.**
4. **Pick the minimum from a list** (Any, 10+, 25+ …). Dropped by the user for typing
   a number with a gray 0 placeholder.

## What the student sees

### Filters panel (right column, under Bid or Permission)

```
BIDDING · average of past years
Round 1 at least     Round 2 at least
[ 0           ]      [ 0           ]     ← gray placeholder, empty box
```

- A new box **BIDDING** in the right-hand column, under **Bid or Permission**
  (where the screenshot has empty space), with the small gray note "average of past
  years" next to or under the title.
- Two number boxes side by side, labeled like **Time Range**'s Begin / End:
  **Round 1 at least** and **Round 2 at least**. Each is empty with a gray **0**
  placeholder. Whole numbers only: a text box with the number keypad on phones that
  drops anything that isn't a digit ("2x00" → 200). *Builder's call.*
- **Empty or 0 = no filter** for that round (everything shows, including courses
  without past results).
- **1 or more:** only sections whose **average** for that round is at least the
  number. Sections with no result for that round are hidden.
- **Both filled:** a section must meet both, like Begin + End (user agreed). Inside
  other boxes, ticks still mean "any of these" (GBS or STEM), as today.
- Each filled box counts in the **Filters** number, and **Clear** empties them.
- Combines with search, other filters, ★ and Conflicts, like every filter.

### Which numbers are averaged

- **Per section**, from the same rounds the course's four squares show
  (`getBiddingRounds`): the same season of the last two years, or the other season
  if the course moved (1.3.1).
- Round 1 average = the average of the Round 1 squares **that have a number**
  (gray squares are skipped). Same for Round 2. Example: Round 1 squares 0 and 120 →
  average 60, so it shows for "at least 50" but not "at least 100". Squares 300 and
  gray → 300.
- EMBA sections and new courses have no squares, so they hide once a box is filled.

### Single plan, Compare plans, phones

- It's part of the Course Catalog's Filters, which is the same in Single plan and
  Compare plans, and on the phone's Courses tab.
- **Other schools:** the Bidding box isn't shown (their Filters already differ:
  Day, Time and Department).

## Data

- No new data: `docs/data-samples/bidding_history.csv`, already loaded in the
  background for the squares.
- `createEmptyFilters()` gains `minRound1` and `minRound2` (empty = `''`).
- A pure helper in `src/lib/biddingHistory.js`, with Vitest tests:
  `averageRounds(rounds) → { round1: number|null, round2: number|null }` from
  `getBiddingRounds` output; and the filter check in `src/lib/filterCourses.js` (or
  next to `filterByConflicts`), with tests for: empty/0 = no filter, average skips
  gray squares, both boxes must hold, no history hidden when set.

## Release

- Shipped as **1.3.3**, then merged into the **1.3.2** Updates entry (user rule: same day = one entry and version). Line:
  "**Filters → Bidding**: type a number in Round 1 at least or Round 2 at least to
  see only courses whose past bids averaged at least that many points, for example
  to find popular courses."
- Straight to `main` after tests, build and a browser check (Single plan, Compare
  plans, phone). Update `AGENTS.md`, `docs/PROJECT_STATUS.md`, and add a line to
  `docs/specs/bidding-history.md`.

## Left to the builder

- Making sure the filter doesn't hide everything while the bidding file is still
  loading at startup (filters start empty, so it rarely matters).
- Exact spacing and the note's placement within the box.
