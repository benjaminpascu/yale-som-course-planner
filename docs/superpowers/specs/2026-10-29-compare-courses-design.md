# Compare Courses — design

**Date:** 2026-10-29 · **Status:** awaiting owner approval

## 1. Why

The owner used to rank electives in Excel: personal 1–10 scores per course, professor ratings that fed every course they teach, and a weighted average. This feature brings that into the site for any student, without the spreadsheet's complexity.

## 2. Goals

1. A **Compare Courses** section, separate from the calendar and saved plans.
2. **Opt-in selection:** students tick only the courses they want to compare.
3. **Custom criteria** with **weights** (equal by default).
4. **1–10 scores**, colored **red (1) → green (10)**.
5. **Professor ratings**, 1–10, shared across terms. The site never fetches professor information.
6. **Ranked table**, best first; **every column sortable**.
7. **A note per course.**
8. **Export to Excel.**
9. **Click a course** to see its full details.
10. **Requirement-tag badges** (STEM, GBS Req…) for reference only; they don't affect scores.
11. Follows the **Fall / Spring term switcher**.
12. Saved in the browser (`localStorage`).

## 3. Anti-goals

- **Hard to read, cluttered, or unintuitive.** No formulas on screen, no explanatory filler text, minimal buttons. Secondary things open on click.
- **Losing data** (see §7).

## 4. Non-goals

- No link to the calendar or saved plans.
- No scoring by catalog data (STEM, units, session, time).
- No professor lookups, sharing, accounts, or device sync.
- No import of the old Excel workbook.
- No bid-cost data.

## 5. How it works

### 5.1 Navigation and layout

The Compare view keeps the planner's layout and adds no clutter.

- **Desktop header:** two page tabs, **Planner · Compare courses**, under the title on the left of the navy header. Contact stays. The **Plans** button shows only in Planner. Each view keeps its state when switching.
- **Desktop body:** the same two columns as the planner. **Left:** the same course catalog sidebar (term, search, Filters, pagination). **Right:** the comparison table in place of calendar / requirements / plan.
- **Mobile:** a fourth bottom-nav tab, **Compare** (`MobileBottomNav.jsx`), showing the table. An **"+ Add courses"** button opens the catalog in tick mode, with **Done** to return.
- The term switcher applies to both views.

### 5.2 Selecting courses (left sidebar)

- The existing catalog (`CourseBrowser`, `CourseFilters`, `filterCourses.js`), one row per course (§6.1).
- In Compare view a **tick box replaces "Add to plan"**, and the subtitle reads "N selected" instead of "N in plan". Ticking adds the course to the table immediately. The compare selection is separate from the plan.

### 5.3 The comparison table (right side)

Section header "Compare courses" (same style as "Weekly calendar") with **Set up** and **Export** buttons on the right, like "Set targets". Under the table, one quiet line: "Saved in this browser only." With no courses selected, the table area shows a single line: "Tick courses on the left to compare them."

| Column | Content |
|---|---|
| Course | Number + title, requirement-tag badges, note icon (filled when a note exists; click to edit). Click the title for details. |
| One per manual criterion | 1–10 score cell |
| Professor | First professor's name (+N if more) and their 1–10 rating cell. Click to rate (rating + optional note). |
| Score | Weighted score, 0–10, one decimal |

- Score cells and Score use the red → green scale; empty cells are blank.
- **Sorting:** Score descending by default. Click a header to sort, again to reverse. Only the active column shows an arrow. Empty values sort last.
- **Scoring is fast and keyboard-friendly:** click a cell, enter 1–10, move with Tab/arrows. A cell can be cleared.
- **Mobile:** the table scrolls horizontally with the Course column pinned.

### 5.4 Set up panel

One panel, two tabs.

**Criteria**
- Add, rename, delete criteria. Each has a weight slider (0–10, default 5) with its resulting share shown as a percentage ("40%").
- First visit starts with **Interesting**, **Useful**, **Professor** at equal weight.
- **Professor** can't be deleted or renamed; set its weight to 0 to ignore it. Its value comes from professor ratings, not per-course scores.
- Deleting a criterion asks for confirmation with the count: "Delete 'Networking'? This removes 12 scores."
- Criteria and weights are shared across terms.

**Professors**
- Every professor in the loaded catalog (both terms), searchable. Professors of compared courses are listed first.
- Each has a 1–10 rating cell and an optional note. Same data as the inline Professor cell.

### 5.5 Scoring

- Final score = weighted average over the criteria **that have a value** for the course, ignoring weight-0 criteria.
  - Example: weights Interesting 5, Useful 5, Professor 5; course has Interesting 8, Useful 6, professor unrated → (8×5 + 6×5) / 10 = **7.0**.
- A partly scored course shows its score in a muted color. A course with no values shows "—".
- If a course has several professors (after §6.1 grouping), the Professor value is the **highest** rating among them.

### 5.6 Course details

Click the course title: same content as the calendar's detail view (`CalendarCourseDetail`; `CourseDetailSheet` on mobile), including session, schedule, room, units, syllabus link. For multi-section courses, list each section's days/time/professor. Click only, no hover.

### 5.7 Export to Excel

- **ExcelJS**, loaded only when Export is clicked (dynamic `import()`), never in the main bundle.
- File: `compare-courses-fall-2026.xlsx` (term in the name).
- **Sheet "Ranking"** (current term, sorted by score): Rank, Course number, Title, Professor(s), Session, Units, Requirement tags, one column per criterion, Professor rating, Score, Note. Weights in a header row.
- **Sheet "Professors":** Professor, Rating, Note.
- Same red → green fills as on screen; numbers stored as numbers.

## 6. Data

### 6.1 What a "course" is

Catalog rows are **sections**. A compare "course" groups sections with the same:

1. course number,
2. title (trimmed, case-insensitive),
3. program: EMBA sections (Course Category `EMBA`) separate from full-time.

Key example: `MGT 525|valuation|ft`. The key **excludes the term**, so scores and notes carry over when a course runs in both Fall and Spring; selection stays per term.

Test cases from the data (checked 2026-10-29):
- MGT 416 (Spring): ten "IE: …" trips → ten rows.
- MGT 699: full-time "Colloquium in Healthcare Leadership" and EMBA "Management Colloquium" → two rows.
- MGT 408 / 413 / 423: EMBA E1 section with a different professor → separate EMBA row.
- 32 course numbers appear in both terms.
- Units differing within a group: show the most common, list variants in details.

**Professor duplicates:** professors are identified by name text. "Pinker, Edi" and "Pinker, Edieal" (MGT 879) would appear twice. Fix spellings in the CSV, not in code. The builder lists any near-duplicates found.

### 6.2 Storage

One new `localStorage` key, `yale-som-course-planner-compare`, with a `version` field:

- `criteria`: `[{ id, name, weight, kind: 'manual' | 'professor' }]`
- `selected`: `{ [termCode]: courseKey[] }`
- `scores`: `{ [courseKey]: { [criterionId]: 1..10 } }`
- `notes`: `{ [courseKey]: string }`
- `professors`: `{ [name]: { rating?, note? } }`

Criterion IDs are generated, so renaming never loses scores.

## 7. No data loss

- Save on every change; no Save button.
- Never delete stored data because the catalog changed. Missing courses/professors are hidden; their data returns if they reappear.
- Unticking a course keeps its scores and note.
- Deleting a criterion is the only destructive action, and it confirms.
- If stored data can't be read, copy it to a backup key before starting fresh, and tell the student.

## 8. Fit with the codebase

- Vite + React + Tailwind; no backend.
- Reuse `CourseBrowser`/`CourseFilters`/`filterCourses.js`, `RequirementTag`, `formatSessionLabel`, `formatCourseUnits`, `CalendarCourseDetail`/`CourseDetailSheet`, `getCatalogTerms`, Yale section styling (`sectionTheme.js`, `SectionHeader`).
- Planner and calendar behavior unchanged. Compare code lives in its own files (e.g. `src/lib/compareStorage.js`, `src/lib/compareScoring.js`, `src/components/compare/`).
- When done, update `docs/PROJECT_STATUS.md`, `AGENTS.md` (Current focus, Key code locations), and `docs/PRD.md` (new feature section; note that private professor ratings now exist despite the "professor reviews" non-goal).

## 9. Left to the builder

- Layout, spacing, exact red → green palette (number always readable, accessible contrast).
- The score-entry control, within §5.3's speed and keyboard requirements.
- Exact styling of the header page tabs, within §5.1.
- Whether to add a small test setup for scoring and storage logic (none exists today).
