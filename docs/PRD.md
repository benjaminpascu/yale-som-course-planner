# Yale SOM Course Planner — PRD

**Author:** [Your name], incoming Yale SOM student
**Status:** Draft v4 — in development (Milestones 1–2 done; Milestone 3 next)
**Last updated:** May 2026

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
- **Secondary:** A student-government maintainer who uploads each semester's CSV and curates requirement tags.

## 5. Core user stories

1. As a student, I can search and filter all courses for a given semester.
2. As a student, I can click a course in the sidebar to add it to a calendar view of my week.
3. As a student, I can see immediately if a newly added course conflicts with one already in my calendar.
4. As a student, I can see a live tally of **units accumulated per requirement tag** for my selected courses (e.g. "Leadership Dist Req: 3 units").
5. As a student, I can save my current plan and come back to it later (no login required).
6. As a student, I can save multiple named plans and switch between them to compare ("finance-heavy" vs. "marketing-heavy").
7. As a maintainer, I can upload a new courses CSV at the start of each semester without writing code.
8. As a maintainer, I can edit requirement tags on courses through Supabase's table editor (no custom admin UI in v1).

## 6. Data model

Course rows are sourced from `docs/data-samples/courses_master_new.csv` (verified against sample exports in `docs/data-samples/`). That file includes standard SOM export columns plus three pre-cleaned scheduling fields derived from Yale's `Daytimes` text. Session dates and a few other fields are still parsed on import.

### 6.1 `courses` table
Sourced from `courses_master_new.csv`. The CSV upload replaces the contents of this table for the relevant `term_code`.

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
| `category` | string | `Course Category` | e.g. `Finance`, `Marketing`, `Core`. Used as seed for tags. |
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

**No weekly meeting time (~111 courses per sample file):** Some rows have empty `days_clean`, `start_24h`, and `end_24h` (PhD seminars, independent studies, etc.). The app must still list these courses and allow adding them to a plan, but must **not** render them on the calendar and must **not** include them in time-based conflict checks.

### 6.2 `tags` table
**Maintained separately from the courses CSV** so that re-uploading the CSV does not wipe tagging work.

| Field | Type | Notes |
|---|---|---|
| `course_number` | string | Foreign key to `courses.course_number` (tags apply at the course level, shared across all sections) |
| `tag_code` | string | Yale's internal code, e.g. `MGLD`, `MGBA` |
| `tag_label` | string | Human-readable label, e.g. "SOM MBA Leadership Dist Req" |

A course can have many tags. Tags persist across CSV re-uploads — only courses whose `course_number` is new need tagging.

**Tag taxonomy is sourced from Yale's own filter dropdown** at `som.yale.edu/elective-core-courses`. Only the 7 "Req."-suffixed codes are actively populated by Yale and used in the planner:

| Code | Requirement |
|---|---|
| `MGAM` | SOM MAM Req |
| `MGBA` | SOM MMS Asset Management Req |
| `MGGB` | SOM MMS Global Business & Society Req |
| `MGGS` | SOM MBA Global Studies Req |
| `MGLD` | SOM MBA Leadership Dist Req |
| `MGMS` | SOM Management Science Req |
| `MGSR` | SOM MMS Systemic Risk Req |

The other dropdown codes (Finance, Marketing, Accounting, etc.) return empty filters in Yale's system — those concepts live in the CSV's `category` field instead and are exposed as filters, not as requirement tags. **Two-layer model:** requirement-tag units come from this `tags` table; subject categories come from `courses.category`.

To refresh per semester: visit each of the 7 filter URLs (one per code), download the CSV, and run the merge script. See `/scripts/build_tags.py` in the repo.

### 6.3 `plans` (client-side only, v1)
Stored in `localStorage`. A list of named plans, each containing a list of `course_id`s.

### 6.4 Tag source — resolved
The tag taxonomy comes from Yale's own filter dropdown (see §6.2). The merge script `scripts/build_tags.py` takes the 7 filtered CSV downloads as input and produces a `course_number → tag` table ready for Supabase import.

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
  - **Requirement tag** (from the maintained tags table).
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
- Click a block to remove the course.

### 7.3 Tag unit tracker
- Persistent panel (top or side) showing **accumulated units per requirement tag** for courses in the active plan.
- Updates live as courses are added/removed.
- Always shows all **seven** Yale requirement tags, even when the count is 0.
- Example display:

  ```
  Leadership Dist Req: 3 units
  Management Science Req: 6 units
  Global Studies Req: 0 units
  Asset Management Req: 4 units
  MAM Req: 0 units
  Global Business & Society Req: 2 units
  Systemic Risk Req: 0 units
  ```

- **Sums units, not course count** — a single course can contribute 0.5 to 6.0 units toward each tag it carries.
- Tooltip on hover: which selected courses contribute to that tag, and how many units each contributes.
- If a course has multiple tags, its units count toward **each** tag it has (no "choose which bucket" UI in v1).
- The app does **not** store graduation thresholds or show progress bars like "3/4 units" — students compare totals to their own targets.
- Visible disclaimer: tags are student-maintained; verify with your advisor.

### 7.4 Plan management
- "Save plan" button → prompts for a name, stores in localStorage.
- Dropdown to switch between saved plans.
- "Duplicate plan" to fork a scenario.
- "Export" button → downloads the plan as **JSON** for sharing or backup (no PDF in v1).

### 7.5 Admin / tag management
- **No custom admin UI in v1.** Maintainers use Supabase's built-in table editor to upload CSV data, edit tags, and manage allowlisted admin emails.
- README documents the semester workflow for the next maintainer (CSV upload, tag refresh via `build_tags.py`, handoff).

## 8. Tech stack

- **Frontend:** React + Vite, deployed on Vercel. Tailwind for styling. Likely a calendar library like FullCalendar or a simple custom grid (decide at calendar milestone).
- **Backend / data:** Supabase (Postgres + Storage + Auth, all free tier). No custom backend code; site reads directly via Supabase's JS client.
- **State:** React state for the active plan; localStorage for saved plans.
- **Repo:** Public GitHub repo, MIT license. README documents setup and handoff.

## 9. Handoff plan

This is a student project that needs to outlive its creator.

- Sign up for Vercel, Supabase, and GitHub using a shared email (e.g. `yalesom.planner@gmail.com`), not a personal Yale account.
- README includes: how to upload a new CSV each semester, how to edit tags, how to add a new admin.
- Tag the v1 release on GitHub so future maintainers have a known-good baseline.
- Mention the project in a handoff doc to the next year's student government tech lead.

## 10. Risks & open questions

- **Yale policy on republishing course data.** Before launch, email someone at SOM (registrar or student gov advisor) to confirm there's no issue. Frame as a student-built complementary tool.
- **CSV format drift.** Verified column names against sample exports in `docs/data-samples/`. If SOM changes its export format, the import will break. Build the importer to validate columns and produce a clear error message rather than fail silently.
- **Requirement tag source — resolved.** Yale's filter dropdown exposes 7 active requirement tags (codes like `MGLD`, `MGBA`). A one-time URL sweep per semester gives the full mapping. See §6.2.
- **Subject filters vs requirements.** The dropdown also contains ~20 subject-category codes (Finance, Marketing, etc.) that return empty in Yale's own system. These are not part of our tag taxonomy. Subject filtering uses the CSV's `category` field instead.
- **Tag accuracy.** Wrong tags are worse than no tags — they give students false confidence. Add a visible "tags are student-maintained, verify with your advisor" disclaimer.
- **Session/mini-term complexity.** SOM splits terms into full-semester and mini-sessions (`fall-1`, `fall-2`, etc.). Conflict logic and the calendar view must be session-aware (see §7.2). This is the most likely source of subtle bugs.
- **Two-syllabus-fields edge case.** The CSV has both `Syllabus` and `Old Syllabus` columns. Logic: prefer `Syllabus` when present; fall back to `Old Syllabus`; show no link if both empty.
- **Adoption.** Build a 30-second demo video and post it where SOM students hang out (GroupMe, Slack, whatever the current channels are). Launch right before shopping period when need is highest.

## 11. Milestones

Status detail: `docs/PROJECT_STATUS.md`.

1. **Scaffold + course list:** ✅ Vite + React + Tailwind. Load `courses_master_new.csv`. Basic course list; amber warning when no weekly meeting time.
2. **Data layer + Supabase:** ✅ Schema, importer, app reads Supabase (or bundled CSV fallback). See `docs/supabase-setup.md`.
3. **Course browser:** ⏭️ **Next.** Search + filters (session, day, time, units, bid/permission, category, requirement tag).
4. **Calendar:** Weekly grid + add/remove + **session-aware** conflict detection.
5. **Tag unit tracker:** Units per tag for selected courses (all seven tags, no thresholds).
6. **Plans + polish:** Save/load/duplicate/export JSON. Bid/permission indicators. Disclaimer copy.
7. **Beta:** Internal test with 5–10 SOM friends. Fix what breaks.
8. **Launch:** Public release via student gov channels.

## 12. Development workflow (Cursor)

This project is built in **small increments** with human review between steps.

### New task → new agent

- **Start a new Cursor agent** (fresh chat) for each PRD milestone or distinct task (e.g. “Milestone 3 filters”, “fix import script”). Do not continue unrelated milestones in one long thread.
- The new agent must read **`AGENTS.md`** and **`docs/PROJECT_STATUS.md`** first, then the relevant PRD sections.
- After completing a milestone: summarize changes, give exact test commands (e.g. `npm run dev`), and **stop** until the user replies **approve**.

### Maintainer habits

- Update **`docs/PROJECT_STATUS.md`** when a milestone is approved (mark done, set next).
- Course catalog changes: edit `courses_master_new.csv`, run `npm run import:data`, verify in Supabase Table Editor.
- Tag changes: edit `course_tags.csv` or Supabase `tags` table; re-import or edit in Table Editor per `docs/supabase-setup.md`.

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
