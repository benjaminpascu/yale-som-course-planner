# Yale SOM Course Planner — PRD

**Author:** [Your name], incoming Yale SOM student
**Status:** Draft v5 — **live on Vercel** (Milestones 1–6 done). Private link sharing now; wider promo when the owner chooses.
**Last updated:** July 2026

**Agent handoff:** New Cursor chats should read `AGENTS.md` and `docs/PROJECT_STATUS.md` before coding.

---

## 1. Problem

Yale SOM's official course site is hard to navigate. It has no search, no calendar view, and no way to see how a candidate set of courses would fit into your week or how they map to Yale's requirement tags. Students currently plan semesters using a mix of the official site, spreadsheets passed down from older cohorts, and word of mouth.

## 2. Goal

Build a free, student-run web app that lets a SOM student:

1. Search and filter the full course catalog,
2. Drop courses into a weekly calendar to see schedule fit,
3. See in real time how many **units per requirement tag** their selected courses accumulate (students compare totals to their own graduation targets).

The tool **complements** the official site — it does not replace it as the authoritative source for course offerings, registration, or grades.

## 3. Non-goals (explicitly out of scope for v1)

- Registration or bidding (the official system handles this).
- Grade tracking or transcript.
- Professor reviews (consider for v2).
- Mobile app (responsive web is enough).
- Authentication / accounts (use localStorage for saved plans).
- Multi-semester / full MBA degree tracking (designed-for but not built in v1).
- Encoding graduation thresholds or "X out of Y units" in the app (students know their own targets).

## 4. Users

- **Primary:** Yale SOM MBA students (≈350/year), especially during shopping period and pre-registration.
- **Secondary:** A student-government maintainer who uploads each semester's CSV and edits requirement tags in that file's `tags` column.

## 5. Core user stories

1. As a student, I can search and filter all courses for a given semester.
2. As a student, I can click a course in the sidebar to add it to a calendar view of my week.
3. As a student, I can see immediately if a newly added course conflicts with one already in my calendar.
4. As a student, I can see a live tally of **units accumulated per requirement tag** for my selected courses (e.g. "STEM: 5 units").
5. As a student, I can save my current plan and come back to it later (no login required).
6. As a student, I can save multiple named plans and switch between them to compare ("finance-heavy" vs. "marketing-heavy").
7. As a maintainer, I can upload a new courses CSV at the start of each semester without writing code.
8. As a maintainer, I can edit requirement tags by changing the `tags` column in the courses CSV (no custom admin UI in v1).

## 6. Data model

Course rows are sourced from `docs/data-samples/courses_master_fall2026.csv`. That file includes standard SOM export columns, three pre-cleaned scheduling fields (`days_clean`, `start_24h`, `end_24h`), and an inline `tags` column. Session dates and a few other fields are still parsed on import.

There is **no separate tags table or tags CSV**. Requirement tags live on each course row.

### 6.1 `courses` table
Sourced from `courses_master_fall2026.csv`. The CSV upload replaces the contents of this table for the relevant `term_code`.

| Field | Type | Source CSV column | Notes |
|---|---|---|---|
| `course_id` | string | `Course ID` | Primary key. Yale's internal ID (e.g. `15460`). |
| `course_number` | string | `Course Number` | Human-readable code (e.g. `MGMT 7403`). |
| `title` | string | `Course Title` | |
| `description` | text | `Course Description` | |
| `units` | number | `Units` | Half-credits exist (0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 6.0). Sum units for the tag tracker, not course count. |
| `term_code` | string | `TermCode` | e.g. `202503` for a fall term. |
| `session` | string | `Course Session` | `fall`, `fall-1`, `fall-2`, `spring`, `spring-1`, `spring-2`, etc. Critical for conflict detection. |
| `session_start` | date | `Course Session Start date` | Parse from `YYYYMMDD HHMMSS.SSS` format. |
| `session_end` | date | `Course Session End Date` | Same parsing. |
| `category` | string | `Course Category` | e.g. `Finance`, `Marketing`, `Core`. Subject filter only — not requirement tags. |
| `course_type` | string | `Course Type` | Comma-separated values like `elective,MMS AM,MMS TM`. Parse to array. |
| `bid_or_permission` | string | `Bid Or Permission` | `bid`, `permission`, `core`, etc. Surface prominently in UI. |
| `faculty_name` | string | `Faculty 1` | "Last, First" format. |
| `faculty_email` | string | `Faculty 1 Email` | |
| `room` | string | `Room` | |
| `section` | string | `Section` | |
| `syllabus_url` | string | `Syllabus` or `Old Syllabus` | Prefer `Syllabus` if present, fall back to `Old Syllabus`. |
| `meeting_days` | string[] | `days_clean` | Comma-separated day codes from the master file (e.g. `Mo,We`, `Tu`). Split to array on import. Already normalized — no further parsing. |
| `start_time` | string | `start_24h` | Start time in 24-hour `HH:MM` (e.g. `13:00`). Stored as-is. |
| `end_time` | string | `end_24h` | End time in 24-hour `HH:MM` (e.g. `14:20`). Stored as-is. |
| `visible` | boolean | `Visible` | Filter out rows where this isn't 1. |
| `tags` | string[] | `tags` | Semicolon-separated string of tag names in the CSV, e.g. `STEM;GBS Req`. Empty string means no tags. Split on `;` on import. Tag names are user-defined and **not hardcoded in the app** — any tag added to the CSV appears automatically in the UI (filters, pills, requirement tracker). |

**No weekly meeting time:** Some rows have empty `days_clean`, `start_24h`, and `end_24h` (PhD seminars, independent studies, etc.). The app must still list these courses and allow adding them to a plan, but must **not** render them on the calendar and must **not** include them in time-based conflict checks.

### 6.2 `plans` (client-side only, v1)
Stored in `localStorage`. A list of named plans, each containing a list of `course_id`s.

## 7. Features

### 7.1 Course browser (sidebar)
- Searchable list of all courses for the selected term.
- Filters:
  - **Session** (`fall` / `fall-1` / `fall-2`, etc.) — primary filter, since students often plan by mini-term.
  - **Day of week** (Mo, Tu, We, Th, Fr).
  - **Time block** (morning / midday / afternoon / evening).
  - **Units** (0.5, 1.0, 1.5, 2.0, etc.).
  - **Bid or permission** (bid required / permission required / open / core).
  - **Category** (Finance, Marketing, Core, etc. — from `Course Category`).
  - **Requirement tag** (options discovered by scanning the `tags` column across the loaded catalog — not a hardcoded list).
- Each course row shows: course number, title, faculty, days/times, units, session, and a clear visual indicator for bid/permission status.
- Clicking a course adds it to the calendar. Click again to remove.
- Conflicting courses (overlapping with anything in the calendar, **session-aware** — see §7.2) appear greyed out with a small "conflict" indicator. Selectable anyway — the student decides.
- Each row links to the syllabus URL when one is available.

### 7.2 Weekly calendar
- Mon–Fri grid, hours from ~8am to ~9pm.
- Each selected course **with** `days_clean` / `start_24h` / `end_24h` renders as a block spanning its meeting times. Courses with no weekly meeting time (see §6.1) stay in the plan and course list but **do not** appear on the grid and are **excluded** from time-overlap conflict checks.
- **Session-aware**: a `fall-1` course and a `fall-2` course at the same time slot **do not conflict** — they run in different halves of the semester. A full-semester `fall` course overlaps with both halves and conflicts with either.
- Conflict logic (timed courses only): two courses conflict if (a) their session date ranges overlap *and* (b) they share at least one meeting day *and* (c) their start–end times overlap.
- Optional "view by session" toggle: show only `fall-1`, only `fall-2`, or both overlaid with visual distinction (e.g. striped pattern for `fall-2`).
- Color-coded by tag, category, or user choice.
- Hovering a block shows full course info including session, units, faculty, room.
- Remove courses from the plan via the catalog or **Your plan** panel (calendar blocks are not clickable).
- **Hover popup:** Must use the portal pattern in §7.6 (not an in-flow `absolute` tooltip).

### 7.3 Tag unit tracker
- Persistent panel showing **accumulated units per requirement tag** for courses in the active plan.
- Updates live as courses are added/removed.
- **Discover tags from data:** scan the `tags` column across the loaded catalog, split each value on `;`, and show **one row per unique tag name** found anywhere in the dataset. Do **not** hardcode tag names in code. If a new tag (e.g. `Leadership`) is added to the CSV, a row appears automatically.
- Tags with **zero** units in the plan still display if they exist in the catalog.
- Example display (exact names depend on the CSV):

  ```
  STEM: 5 units
  GBS Req: 2 units
  ```

- **Sums units, not course count** — a single plan course can contribute 0.5 to 6.0 units toward each tag it carries.
- **Count plan rows only:** sections of the same course share the same tags in the CSV. When summing units, count each **Course ID + Section** the student actually added to their plan (each selected `course_id` once) — not every CSV row for that course number.
- Tooltip on hover: which selected courses contribute to that tag, and how many units each contributes.
- **Hover popup:** Must use the portal pattern in §7.6 (not an in-flow `absolute` tooltip).
- If a course has multiple tags, its units count toward **each** tag it has (no "choose which bucket" UI in v1).
- Optional student-set unit targets may show progress (e.g. `2 / 6 units`); the app does **not** encode official graduation thresholds.
- Visible disclaimer: tags are student-maintained; verify with your advisor.

### 7.4 Plan management
- Named plans stored in `localStorage` (see §6.2). No login, no plan file export (CSV/JSON).
- **Working selection:** One **active** plan at a time. The catalog, calendar, and requirements panels all reflect the current course selection. Edits are immediate; **Save plan** writes the current selection to that plan’s stored course list.
- **Plans menu** (header): create a plan, switch the active plan, rename, delete. Confirm when switching plans or adding a new plan while there are unsaved changes.
- **Your plan** panel: courses in the working selection, grouped by session; remove one course or clear all.
- **Create plan:** If you have courses selected (or unsaved edits on the active plan), the new-plan form offers **Save to plan** (name + save current selection). Otherwise **Add** creates an empty named plan and clears the working selection.
- Disclaimer in the plans UI: plans are browser-local; verify requirements with your advisor.

### 7.5 Admin / tag management
- **No custom admin UI in v1.** Maintainers edit `docs/data-samples/courses_master_fall2026.csv` (including the `tags` column), run `npm run import:data` when using Supabase, and manage allowlisted admin emails in Supabase if needed.
- README documents the semester workflow for the next maintainer (CSV edit/upload, handoff).

### 7.6 Hover detail popups (required UI pattern)

Several panels use hover (desktop) or tap (mobile) to show extra detail: **calendar course blocks** (`CalendarCourseBlock.jsx`) and **requirement tag rows** (`TagUnitTracker.jsx` → `RequirementTagItem`). These popups must always render **above all other UI**, including overlapping calendar blocks, the fixed-height requirements strip, and plan panel.

**Do not** implement these as in-flow `absolute` / `position: relative` tooltips with CSS `:hover` alone. Parent sections use `overflow: hidden` or sibling stacking, so in-flow tooltips get **clipped** or paint **behind** other elements.

**Required approach (both locations):**

1. **Portal:** Render the popup with React `createPortal(..., document.body)` so it escapes parent overflow and stacking contexts.
2. **Fixed positioning:** Position with `position: fixed` and coordinates from `anchorRef.current.getBoundingClientRect()`.
3. **Z-index:** Use `z-index: 100` (shared constant `TOOLTIP_Z_INDEX` in `src/lib/portaledTooltip.js`).
4. **Width:** `width: max-content` with a viewport max so the popup sizes to its content. Calendar course popups with a description cap at 18–28rem and balance column heights. After render, clamp `left` so the popup stays on screen (`computePortaledTooltipLeft` / `clampPortaledTooltipLeft` in the same module): default align to the anchor’s left edge; if that overflows the right edge, **right-align to the anchor and expand left** (e.g. Friday columns).
5. **Placement:** Calendar blocks may show above or below the anchor depending on grid position; requirement tags show **above** the row (`bottom: window.innerHeight - rect.top + gap`).
6. **Open / close:** `onMouseEnter` / `onFocus` opens; `onMouseLeave` / `onBlur` schedules close after ~80ms so the user can move the pointer into the popup (scroll, links). Cancel the timer if the pointer re-enters the anchor or popup.
7. **Reposition:** While open, listen for `scroll` (capture) and `resize` and recompute fixed coordinates from the anchor rect.
8. **Mobile:** Calendar uses a bottom sheet (`fixed`, `md:hidden`); requirement hovers are desktop-only (`max-md:hidden` on the portaled popup).

**Reference implementations:**

| Surface | File |
|---|---|
| Shared positioning helpers | `src/lib/portaledTooltip.js` |
| Calendar course block | `src/components/CalendarCourseBlock.jsx` |
| Requirement tag row | `src/components/TagUnitTracker.jsx` (`RequirementTagItem`) |

When adding a new hover detail popup elsewhere, copy this pattern — do not reintroduce `group-hover:block` + `absolute` inside scrollable or layered layout.

## 8. Tech stack

- **Frontend:** React + Vite, deployed on Vercel. Tailwind for styling. Likely a calendar library like FullCalendar or a simple custom grid (decide at calendar milestone).
- **Backend / data:** Supabase (Postgres + Storage + Auth, all free tier). No custom backend code; site reads directly via Supabase's JS client.
- **State:** React state for the active plan; localStorage for saved plans.
- **Repo:** Public GitHub repo, MIT license. README documents setup and handoff.

## 9. Handoff plan

This is a student project that needs to outlive its creator.

- Sign up for Vercel, Supabase, and GitHub using a shared email (e.g. `yalesom.planner@gmail.com`), not a personal Yale account.
- README includes: how to upload a new CSV each semester, how to edit the inline `tags` column, how to add a new admin.
- Tag the v1 release on GitHub so future maintainers have a known-good baseline.
- Mention the project in a handoff doc to the next year's student government tech lead.

## 10. Risks & open questions

- **Yale policy on republishing course data.** Before launch, email someone at SOM (registrar or student gov advisor) to confirm there's no issue. Frame as a student-built complementary tool.
- **CSV format drift.** Verified column names against sample exports in `docs/data-samples/`. If SOM changes its export format, the import will break. Build the importer to validate columns and produce a clear error message rather than fail silently.
- **Requirement tags are inline and data-driven.** Tag names come only from the courses CSV `tags` column. The app must not hardcode tag names; new tags appear when added to the CSV.
- **Subject filters vs requirements.** Subject filtering uses the CSV's `category` field. Requirement filtering and the unit tracker use the inline `tags` column.
- **Tag accuracy.** Wrong tags are worse than no tags — they give students false confidence. Add a visible "tags are student-maintained, verify with your advisor" disclaimer.
- **Session/mini-term complexity.** SOM splits terms into full-semester and mini-sessions (`fall-1`, `fall-2`, etc.). Conflict logic and the calendar view must be session-aware (see §7.2). This is the most likely source of subtle bugs.
- **Two-syllabus-fields edge case.** The CSV has both `Syllabus` and `Old Syllabus` columns. Logic: prefer `Syllabus` when present; fall back to `Old Syllabus`; show no link if both empty.
- **Adoption.** Build a 30-second demo video and post it where SOM students hang out (GroupMe, Slack, whatever the current channels are). Launch right before shopping period when need is highest.

## 11. Milestones

Status detail: `docs/PROJECT_STATUS.md`.

1. **Scaffold + course list:** ✅ Vite + React + Tailwind. Load courses master CSV. Basic course list; amber warning when no weekly meeting time.
2. **Data layer + Supabase:** ✅ Schema, importer, app reads Supabase (or bundled CSV fallback). See `docs/supabase-setup.md`.
3. **Course browser:** ✅ Search + filters (session, day, time, units, bid/permission, category, requirement tag from data).
4. **Calendar:** ✅ Weekly grid + add/remove + **session-aware** conflict detection. Single-column layout: calendar → requirements → plan → collapsible filters → catalog (see `docs/PROJECT_STATUS.md`).
5. **Tag unit tracker:** ✅ Live units per requirement tag for courses in the active plan (tags discovered from CSV; §7.3).
6. **Plans + polish:** ✅ Named plans in `localStorage` (save, switch, rename, delete). Plans menu + Your plan panel. Disclaimer copy surfaced.

**After milestone 6:** App is **deployed on Vercel** and treated as launched. Share the production URL with friends for feedback; fix bugs in follow-up tasks. **Public promotion** (student channels, demo video, shopping-period push) is a separate **marketing** step when ready — not milestones 7–8 in the build plan.

## 12. Development workflow (Cursor)

This project is built in **small increments** with human review between steps.

### New task → new agent

- **Start a new Cursor agent** (fresh chat) for each PRD milestone or distinct task (e.g. “Milestone 3 filters”, “fix import script”). Do not continue unrelated milestones in one long thread.
- The new agent must read **`AGENTS.md`** and **`docs/PROJECT_STATUS.md`** first, then the relevant PRD sections.
- After completing a milestone: summarize changes, give exact test commands (e.g. `npm run dev`), and **stop** until the user replies **approve**.

### Maintainer habits

- Update **`docs/PROJECT_STATUS.md`** when a milestone is approved (mark done, set next).
- Course catalog / tag changes: edit `courses_master_fall2026.csv` (including the `tags` column), run `npm run import:data` if using Supabase, verify in the app / Table Editor.

### Decision points

Present 2–3 options with tradeoffs (e.g. calendar library at Milestone 4); wait for user choice before implementing.

---

## 13. v2 ideas (parking lot)

- Multi-semester tracking with cumulative units per tag across terms.
- Optional graduation thresholds (if maintainers want to encode targets again).
- Student-submitted course ratings and workload estimates.
- Bidding-history data ("this course historically requires X points").
- Yale SSO so plans sync across devices.
- Calendar export to Google Calendar.
- Public sharing of plans via URL (useful for advising conversations).
- "Suggest courses" feature: given tags a student still needs units in, surface qualifying courses.
