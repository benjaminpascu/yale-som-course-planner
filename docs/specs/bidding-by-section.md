# Spec: Bidding history by section

GitHub issue: #25 · Status: **approved and built** (Nov 19, 2026) · Version **1.3.2**

The user tried a throwaway prototype locally and chose to ship it as a small update
(1.3.x), straight to `main`. Plan: `docs/specs/bidding-by-section-plan.md`.

## Why

When deciding how many points to bid, a student wants to see how competitive the
course has been across **all** of its sections, not just the one they picked. For
example, in Spring 2025 MGT 525 section 02 went for 129 points in Round 2 while the
other sections were free. Today the course popup only shows the four rounds of one
section, in the narrow left column, and the description scrolls inside the popup,
so there are two scrollbars. This came from the owner's own bidding.

## Goals

- In the course popup, one table with every section's past bids at a glance.
- Your section stands out. Sections offered now but with no history still show up,
  so you know they exist.
- The popup shows the full description and has **at most one scrollbar**.
- Same in Single plan, Compare plans and on phones.

## Non-goals (this version)

- No change to the four squares on Course Catalog rows or their hover box.
- The table is not added to the opened course in the Course Catalog
  (*call, see Questions*).
- No averages, predictions or "you should bid X".
- No other schools (they have no bidding data). No EMBA sections.

## Anti-goals

- Passing off one section's numbers as another's: every number sits under its own
  real section number and semester.
- Nested scrolling, or a cut-off description.
- Extra words on screen beyond the title, the R1 / R2 headers and the disclaimer.

## Approaches considered

1. **Long list, one row per semester and section** (first prototype). Dropped: too
   tall, and it caused the double scroll.
2. **Sections down, semesters across.** Dropped: semester names get cramped in
   narrow column headers.
3. **Chosen: semesters down, sections across**, one column group per section with
   R1 and R2 under it, full width at the bottom of the popup under a divider.
4. **Show another section's history for a new section** (e.g. 02 borrowing 01).
   Dropped by the user: "no info rather than false info".

## What the student sees

### Course popup (hover on the Weekly Calendar or in Your Plan)

```
┌───────────────────────────────────────────────────────────────────┐
│ MGT 532 — Business Ethics                                          │
│ Faculty …              │ Description                               │
│ Units 2 units          │ (full text, never cut)                    │
│ When Mo, We 1:00–2:20  │                                           │
│ Session · Room ·       │                                           │
│ Category · Syllabus    │                                           │
│───────────────────────────────────────────────────────────────────│
│ Bidding history by section                                         │
│                 ┃   01   │    02    │    03    │    04    │         │
│                 ┃ R1  R2 │  R1  R2  │  R1  R2  │  R1  R2  │         │
│ ─────────────── ┃────────────────────────────────────────── │       │
│ Spring 2026     ┃ ■1  ■0 │  –   –   │  ■1 ■250 │  ■1 ■300 │         │
│ Fall 2025       ┃ ■15 ■100│ –   –   │  –   –   │  –   –   │         │
│ Spring 2025     ┃ ■0  ■50│  ■0 ■100 │  –   –   │  –   –   │         │
│ ⚠ Section times and professors may change from year to year.      │
└───────────────────────────────────────────────────────────────────┘
```

**Top half**
- Same facts column as today, but the **Bidding history** block moves out of it.
- The **full description**, with no cut, fade or scrollbar of its own.
- If everything is taller than the space, **the whole popup scrolls** (one scrollbar).
  The popup can grow to **720 px** tall (was 560), as far as the screen allows.
- Scrolling inside the popup doesn't scroll the page behind it.
- A thin divider (`border-gray-100`, like the line between facts and description)
  across the full width, then the table.

**Table**
- Title: **Bidding history by section** (small gray label, like "Description").
- **Rows:** past semesters from the last three years, both seasons, newest first.
  Only semesters where at least one section has a result. For a Spring 2027 course:
  Fall 2026 (once SOM posts it), Spring 2026, Fall 2025, Spring 2025, Fall 2024,
  Spring 2024.
- **Columns:** one group per section, the section number centered over **R1** and
  **R2**. Sections = the ones **offered this semester** (same course number, same
  program) **plus** any that had results in those semesters. Sorted by section number.
- **Your section** (the one you hovered): its whole group has the light green
  "In Plan" tint (`bg-save-50`), and its number is dark green and bold
  (`text-save-900`). No "(this section)" text.
- **Cells:** the colored square (same colors as the catalog squares) + the points,
  centered. No result → gray "–", the same width so columns line up.
- **Lines:** vertical only, see-through gray so they look the same on white and on
  green (`black/10` between sections, `black/5` between R1 and R2), plus one closing
  the last section on the right. One line under the R1 / R2 header. No lines
  between rows.
- Table is only as wide as it needs to be (not stretched across the popup).
  Semester names left-aligned, gray-700, normal weight. Measured: about 330 px for
  2 sections, 575 px for 4, 700 px for 5.
- **The popup is at least as wide as the table** (user decision, Nov 19, 2026), so
  the table never needs its own scrollbar on a computer. It keeps its usual 640 px
  and grows past it only when the table needs it (e.g. Fall 2026 MGT 887, 5
  sections), up to the screen width. Where a popup that wide doesn't fit beside a
  Your Plan row (mostly Compare plans), it opens above or below the row, as the
  existing fallback does.
- **Disclaimer** under the table as the amber heads-up flag (`CautionFlag`, ⚠):
  "Section times and professors may change from year to year." It wraps onto a second line when narrow.
- **No history at all** (SOM course, no section has results): one gray line,
  "Bidding history · No bidding history", in place of the table.
- **Courses from other schools:** no divider and no table.

**Special cases**
- **Trips that share a course number** (MGT 416 International Experience, and MGT
  600 Global Network Weeks if they come back): section numbers are really
  destinations, matched by name (as today). The table shows **one column: this
  destination**, under this section's number.
- **EMBA sections** (category "EMBA", e.g. MGT 822 E1) are never columns in a
  full-time course's table. **An EMBA course itself shows "Bidding history · No
  bidding history"**, like its catalog squares today: SOM's bidding file only has
  full-time results (plain section numbers), so showing them for an EMBA section
  would be someone else's numbers. *Call (builder check, Nov 19, 2026).*
- **Example, MGT 822:** Spring 2027 offers 01 and G1 (MMS GBS); only 01 has past
  results. Columns: **01** (green) and **G1** (all "–").

### Single plan, Compare plans, phones

- **Single plan and Compare plans:** the same popups (calendar blocks and Your Plan
  rows), so both get this.
- **Phones:** tapping a course opens the bottom sheet, which shows the same
  content. The sheet already scrolls as a whole. If the table is wider than the
  screen (4+ sections), **the table scrolls sideways on its own** while the
  semester names stay put. *Call:* mobile is low priority for launch, and this
  keeps it readable without shrinking the text.

### What stays the same

- The four squares on catalog rows and their hover box. Only the disclaimer
  sentence changes there too (shared text): "Section times and professors may
  change from year to year."
- The cross-semester fallback for the squares (1.3.1).

## Data

- Past results: `docs/data-samples/bidding_history.csv` (unchanged import).
- New pure helpers in `src/lib/biddingHistory.js`, with Vitest tests:
  - `recentTermsFor(termCode)` (exists since 1.3.1): the six semesters before.
  - `getAllSectionsHistory(course, history)`: every section with a result in those
    semesters; destination-matched trips only list their own destination.
  - `getBiddingGrid(course, history, currentSections)` → `{ sections, thisSection,
    rows: [{ term, cells: { [section]: { round1, round2 } } }] }`.
- **This semester's sections:** the courses already loaded in `App.jsx`, filtered to
  the same term, course number and program (EMBA or not). The prototype re-loads
  the CSVs inside `BiddingHistory.jsx`; the build should pass them down or build one
  shared index instead.

## Release

- Small feature (user decision, Nov 19, 2026) → version **1.3.2** (`package.json` +
  its own entry at the top of `src/lib/updates.js`, like 1.2.1 and 1.3.1). Draft:
  "Hover a course on your Weekly Calendar or in Your Plan to see the past Round 1
  and 2 points of every section side by side, with your section in green. The
  popup now also shows the full course description."
- Straight to `main` once tests, build and a browser check (Single plan, Compare
  plans) pass, like other small updates. No release branch or preview link.
- Update `docs/specs/bidding-history.md` (the popup part and the disclaimer),
  `AGENTS.md` (Key code locations) and `docs/PROJECT_STATUS.md`.

## Left to the builder

- How the current sections reach the popup (props, a small context, or an index
  built once in `App.jsx`).
- Re-placing the popup once the bidding file finishes loading, so a popup opening
  above its course doesn't grow off screen.
- Removing what the cut description needed (`descriptionLines`,
  `CALENDAR_DESCRIPTION_LINE_COUNT`, `LARGE_DESCRIPTION_LINE_COUNT`,
  `DESCRIPTION_CHROME_PX`, `--tooltip-desc-max`) if nothing else uses it.
- Exact paddings, within the look above.
