# Spec: Courses from across Yale (cross-registration)

GitHub issue: #1 · Status: **final draft, waiting for the user's approval** · Nov 2026

## Why

Many SOM students cross-register into other Yale schools. Today they track
those courses by hand outside SOMtimes, so clashes with their SOM courses only
show up late. Goal: a student can find a non-SOM course, add it to a plan, and
see it on the same weekly calendar with correct clashes, and the courses stay
current automatically like SOM's.

## Goals

- Every Yale school with public course listings, including **Law**.
- Pick **one school at a time** in the catalog. The plan and calendar mix schools freely.
- Updates run **once a day**, automatically, with the same "never wipe good data" safety as the SOM job.
- Nothing changes for a student who never touches the School picker.

## Non-goals (this version)

- No credit or unit conversion. Non-SOM courses count **0 units** everywhere, Law included.
- No mixed list (e.g. SOM + Jackson in one catalog list).
- No Subject or Department filter (the search box finds "GLBL", "ECON", etc.).
- No Law Change Log, exam info or bidding data.
- Non-SOM courses are **not** in Rank / Compare Courses (SOM only).
- No phone-specific work beyond keeping the phone layout usable (mobile is deprioritized for launch).

## Anti-goals (would count as failure even if it "works")

- Getting around any bot check or login, or touching anything on Law's site beyond the public course list.
- An update wiping a school's courses because Yale's server returned an empty or partial answer.
- Making SOMtimes slower to open for students who only use SOM.
- The Yale API key appearing anywhere in the site, the repo, or logs.

## What the student sees (approved in a layout test)

A throwaway layout test is on local branch `spike/school-picker` (placeholder
courses in `src/lib/spikeSchools.js`; not for merging; use it as the visual
reference). It gets saved as one local commit on that branch before the build
starts, and the build starts from `main` on `feature/cross-registration`.

**Bar under the header (computer):**
- **Left, above the Course Catalog:** School picker, a dropdown, one school at a time.
  Default **School of Management**. Same height as the Single/Compare switch;
  left edge lines up with the catalog, right edge with the Filters button below it.
  Options, in this order: School of Management, Jackson School of Global Affairs,
  Law School, School of the Environment, School of Public Health, Yale College,
  Graduate School of Arts and Sciences, then any other school that has courses
  that term (Architecture, Art, Divinity, Drama, Medicine, Music, Nursing, …).
  Schools with no courses in the chosen term don't appear.
- **Right, above the calendar:** Single Plan / Compare Plans (left edge lines up
  with the calendar header) and the half-term + Fall / Spring switches (far right), as today.
- Same layout in Single Plan and Compare Plans. The Rank tab's bar is unchanged.

**Course Catalog:** shows only the picked school's courses for the chosen term.
The search box searches only that school.

**Filters panel:**
- SOM: exactly as today.
- Any other school: only **Day of week** and **Time range**. Session, Units,
  Bid or permission, Category and Requirements are hidden.

**Course rows, details and calendar blocks for non-SOM courses:**
- No units shown anywhere (no "(0 units)", no "Units:" line). Approved by the user.
- Title, course number, professors, days and times, room, description, syllabus
  link when Yale has one. **Descriptions are shown**, like SOM's. That's the
  user's decision: they're already public on courses.yale.edu. Yale's API terms
  ask apps to remove "copyrighted Yale information" before showing it outside
  Yale; the user accepts that small risk. Yale's descriptions are HTML, so show
  them as plain text. Law courses link to their official page
  (`https://courses.law.yale.edu/CourseDetailPage?CRN=<crn>&TermCode=<term>`).
- No meeting time → the existing amber "No time defined" note; not on the calendar.

**Plan, calendar, clashes:** courses from any school sit together in the plan
and on the calendar. Clashes are checked across schools. Non-SOM courses are
full-semester: they clash with SOM full-term, half-term 1 and half-term 2
courses that overlap in time.

**Requirements box:** non-SOM courses add 0 units to every line (Semester, Year, tags).
When the plan has a non-SOM course in the semester shown, the grey
"Requirements · Fall 2026" header bar shows text on the right, just left of the
Select Requirements button (small gap), same font size as that button, not
bold, in the site's caution amber (`text-caution`, same as "No time defined";
see issue #5):
a small warning-triangle icon followed by **"Non-SOM courses count as 0 units"**. Hovering it shows:
"Courses from other schools count as 0 units here. Check with the registrar how
they count toward your SOM units." In Compare Plans the shared header shows it
when either plan has one.

**Saved plans:** keep working across updates (stable course IDs, see Data).

## Data

### Source 1: Yale Courses Web Service v3 (every school except Law)

- Endpoint: `https://gw.its.yale.edu/soa-gateway/courses/webservice/v3/index`
- Params: `apikey`, `subjectCode`, `termCode` (exactly this spelling; other
  spellings are silently ignored), `school`, `mode=json`.
- Without `school` it returns Yale College only. School codes (from
  CourseTable's public code, confirmed for GB, FS, PH, MG, LW, GS):
  YC Yale College · AC Architecture · AT Art · GS Graduate School · DI Divinity ·
  DR Drama · FS Environment · GB Jackson · LW Law · MD Medicine · MG SOM ·
  MU Music · NR Nursing · PA Physician Associate · PH Public Health · SU Summer.
  **Skip MG** (SOM keeps its own feed) and **LW** (Law comes from Source 2).
  Skip SU.
- Subject list: `https://gw.its.yale.edu/soa-gateway/course/webservice/v2/subjects?termCode=…`
  (~190 subjects; the `school` param does not narrow it).
- Key: the user's Yale API Portal app "SOMtimes course import" (Client ID).
  Stored as GitHub secret **`YALE_API_KEY`** and locally in `.env.local`
  (git-ignored). Never in the site bundle or logs.
- Useful fields: `subjectNumber`, `courseTitle`, `description` (HTML),
  `instructorList`, `meetingPattern` (e.g. `"MW 2.35-3.50"`, `"TTh 4.10-6.00p"`,
  `"1 HTBA"`), `meetingPatternLocation`, `syllabusLink`, `schoolCode`, `crn`,
  `termCode`, `sectionStatus` / `cSectionStatus`, `primXLst` / `scndXLst`.
  `meetingStartTimeList` / `meetingEndTimeList` were empty in samples.
- **No credits field.**
- **Flaky:** the same request often returns `[]` (about 2 in 3 times in testing).
  Retry with a short pause; treat a persistent empty answer as "unknown", never as "no courses".
- Yale's terms of use: no rule against storing data; Yale may block "excessive use".
  Keep daily request volume modest and spaced out. The portal showed no per-app
  limit for this app. As built: known school/subject pairs every 2 days, all
  others every 28 days, about 2,000 requests a day (Yale often answers "no courses"
  several times before the real list, so up to 6 requests per question; see
  docs/updating-course-data.md).
- **Why not use this API for Law:** it only has 2–3 Law courses per term (the
  same 2–3 that courses.yale.edu shows). Law's real catalog lives on Law's own site.
- **Network (unverified):** all tests ran from the user's computer. First build
  step (my call): run a tiny probe of both sources from a GitHub Actions run to
  confirm they answer from outside Yale. If either only works from Yale's
  network, stop and bring it back to the user before building further.

### Source 2: Law School public course list

- Site: `https://courses.law.yale.edu/`, an OutSystems app. The front page lists
  every course publicly, no login: title, course number + section, days and
  times, units, professors, enrollment type, description. Same term codes as
  Yale (e.g. `202701`). Each course has a public page by CRN (link above).
- Data comes from the app's own JSON calls (e.g.
  `screenservices/YLSCourses/MainFlow/Courses/DataActionGetCoursesPerTerm`),
  which work anonymously. A test call succeeded but returned an empty list
  because the term wasn't set yet.
- Approach (approved by the user): **read-only**, the public course list only,
  **once a day**, slowly. Copy the exact request the page makes (watch it in a
  browser's network tab) instead of guessing. The app stamps requests with
  version tokens that change whenever Law republishes. Read the current tokens
  from the site's public `moduleservices/moduleinfo` and script files on each run
  so small updates heal themselves.
- If the Law read fails or looks wrong, keep the last good Law file and fail the
  job (GitHub emails the owner), like the SOM job does.
- **Launch does not wait for Law** (user's decision). Build Law as part of this
  feature. If reading it turns out to need anything beyond the public course
  list (e.g. getting around a security check), launch the other schools without
  Law, leave Law out of the School picker, and come back to the user. Law must
  stay easy to add later: same file format, same picker, only the reader missing.
- Yale's Bulletin (catalog.yale.edu) lists Law courses without times. Not used.

### Storage and update job

- My call, open to the builder: one CSV per term for non-SOM courses next to
  the SOM files (e.g. `docs/data-samples/yale_courses_<term>.csv`), with the SOM
  columns plus a `school` column, so `parseCourses` is reused. SOM files and
  their 6-hourly job stay as they are.
- **Course IDs must be stable and never collide with SOM IDs**, e.g.
  `<termCode>-<crn>`, so saved plans survive updates.
- Hide cancelled sections. Same terms as SOM (running and upcoming ones; a
  finished term's file is left alone, like SOM's).
- Daily GitHub job (new workflow or a daily step in the existing one), with the
  same safety checks as `update-courses`: keep the old file if a school comes back
  empty or under half its previous size, if the answer is for another term, or
  if the site can't be reached. Tests + build must pass before committing.
- The SOM job's "keep the schedule from being paused" trick applies here too.

## Left to the builder

- Converting `meetingPattern` to `days_clean` / `start_24h` / `end_24h` (Yale
  writes afternoon times without "pm", e.g. `2.35-3.50`, and sometimes adds `p`).
  Sections with several patterns, and `HTBA`.
- Which school/subject pairs to ask about each day without "excessive use"
  (e.g. remember which pairs had courses, re-check all pairs weekly).
- How to handle a course listed twice through cross-listing between schools.
- Loading other schools' data only when picked (so SOM-only use stays as fast as now).
- Exact CSV name/columns, and how the existing term logic (`getCatalogTerms`,
  half-term switch) ignores non-SOM files where needed.
- Phone layout: keep it usable (e.g. the picker at the top of the Courses tab), nothing more.
- Docs: update `docs/updating-course-data.md`, `AGENTS.md`, `docs/PROJECT_STATUS.md`.

## Done when

A student picks Jackson (or Law, Environment, …), finds a course, adds it, sees
it on the calendar next to their SOM courses with correct clashes, and the data
refreshes daily on its own. Ships on `feature/cross-registration` with a
preview link; goes live when the user says "ship it".
