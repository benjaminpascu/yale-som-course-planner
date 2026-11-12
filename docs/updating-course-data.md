# Updating course data

**Short version: you don't.** Courses update themselves from Yale SOM's own
course feed every 6 hours, including brand-new semesters.

## How it works

A GitHub job (`.github/workflows/update-courses.yml`) runs 4 times a day:

1. It asks Yale's feed (`https://som.yale.edu/courses/session-items/<TermCode>`,
   public, no login; found via Prof. Kyle Jensen's `yale-som-course-search`
   script) for:
   - every semester on the site whose last class hasn't happened yet, and
   - the next two semesters after the newest one, to catch new ones as soon
     as Yale posts them.
2. It rebuilds each `docs/data-samples/courses_master_<term>.csv` and applies
   `course_overrides.csv`.
3. If anything changed, it runs the tests and the build, then commits to
   `main` ("chore(courses): update from Yale — …"). Vercel republishes the site.

**TermCode**: `YYYY01` = spring, `YYYY03` = fall (e.g. 202701 = Spring 2027).

**Past semesters**: the site hides a semester from the switcher once the next
semester's classes start (e.g. Fall 2026 when Spring 2027 begins in January),
or the day after its own last class if that comes first. The job keeps
updating a semester until its last class is over (some EMBA courses run into
the next term), then leaves its file alone. The file stays, so students'
saved plans keep those courses.

**New semesters**: a new file (e.g. `courses_master_fall2027.csv`) is created
and shows up on the site without any code change.

## Safety checks

The job keeps the current file (and the site keeps working) when:

- Yale's site can't be reached or answers with an error,
- the list is empty, or contains another term's courses,
- a semester suddenly has fewer than half as many courses as before.

When that happens the job is marked failed and GitHub emails the repo owner.
Usually it fixes itself on the next run. If it keeps failing, open the failed
run (GitHub → Actions → Update courses) and read the "Fetch courses from Yale"
step.

GitHub pauses scheduled jobs after 60 days with no repository activity; the
job's last step resets that clock on every run.

## Run it now

- **On GitHub**: Actions tab → **Update courses** → **Run workflow**.
- **On your computer**:

  ```bash
  npm run update-courses -- --check
  ```

  shows what would change without writing anything. Without `--check` it
  writes the files; then `npm test`, commit and push.

## How Yale's feed becomes the course file

- Every column is copied from the feed (`courseTitle` → `Course Title`, etc.).
  `Course Type` uses commas between types, as before.
- **Leaves out courses Yale marks hidden** (`visible` ≠ 1), e.g. most GNAM
  courses and the Global Network Week trips. To show a hidden course anyway,
  that would need a code change in `buildCourseRows`.
- Builds `days_clean`, `start_24h`, `end_24h` from `daysTimes`
  (e.g. `T  Th 1:00 PM-2:20 PM` → `Tu,Th`, `13:00`, `14:20`). A time it can't
  read (e.g. Saturday `S 7:30 AM-9:00 AM`) shows as "No time defined".
- Sets `tags` from Yale's course attribute codes: `MGMS` → `STEM`,
  `MGGE` → `GBS Req` (both: `STEM;GBS Req`). More requirement tags: add a line
  to `TAG_ATTRIBUTES` in `scripts/lib/courseImport.js`.

Code: `scripts/update-courses.js`, `scripts/lib/courseImport.js` (tests next to it).

## Manual fixes that survive updates

If Yale's feed is wrong where the SOM site is right, don't edit the course
file (the next update would undo it). Add a line to
`docs/data-samples/course_overrides.csv`:

```
TermCode,Course ID,Column,Value,Note
202701,21645,Room,EVANS 4230,MGMT 7305 room from the SOM site
```

- **Course ID**: the section's ID from the course file
- **Column**: exact column name (e.g. `Room`, `days_clean`, `start_24h`, `tags`)

The update log says when a fix is no longer needed (Yale caught up) or its
course is gone, so you can delete that line.

## Things to know

- **Compare Courses data** is keyed on course number + EMBA category (plus
  title when one number covers several courses, e.g. MGT 416 trips). If Yale
  renumbers a course, students' Compare notes for it start fresh.
- **Course category typos** in Yale's data (e.g. `MMG GBS`) are merged for
  display in `src/lib/categoryDisplay.js`.

## Courses from the rest of Yale (cross-registration)

Courses from every other Yale school (Jackson, Environment, Public Health,
Yale College, Graduate School, Architecture, Art, Divinity, Drama, Medicine,
Music, Nursing, Physician Associate) are in
`docs/data-samples/yale_courses_<term>.csv`: the SOM columns plus `School`
(Yale's school code, e.g. `GB` = Jackson) and `Course Page`. The app loads them
in the background, so SOM-only use stays as fast as before. Spec:
`docs/specs/cross-registration.md`.

**Updates itself once a day** (`.github/workflows/update-yale-courses.yml`,
`npm run update-yale-courses`, add `-- --check` to preview). It uses Yale's
official **Courses Web Service v3** with the API key from the Yale API Portal
app "SOMtimes course import": GitHub secret `YALE_API_KEY` (and `.env.local`
on a computer, never committed). Only the open semesters that SOM has files for
are updated.

How it works and stays safe:

- **Only one of Yale's servers has data.** Yale's gateway spreads requests over
  several servers; in Nov 2026 two of three always answered "no courses". Each
  answer sets a cookie (`_212f6`) naming its server, so each run first finds a
  server that answers a question known to have courses (ECON in Yale College),
  then sends that cookie with every request. Every 100 questions it re-checks
  that server; if it stops answering, the run finds another and re-asks that
  batch. So an empty answer can be trusted, and each question is asked once.
  (Issue #8: tell Yale's API team.)
- `docs/data-samples/yale_subject_pairs.json` remembers which school/department
  pairs have courses. Those are asked every day; all others once a week (a
  slice each day). About 1,000–1,500 requests a day. `--known` asks every known
  pair now; `--full` asks every pair (about 5,000 requests, 20 minutes);
  `--raw DIR` also saves Yale's raw answers for checking.
- A semester that would shrink by more than half, or Yale errors on most
  questions, keeps the old file and fails the job (GitHub emails the repo
  owner). Cancelled, not-offered and moved sections are left out.
- **Cross-listings:** Yale gives every listing of a shared class its own CRN
  (sometimes with different section numbers, sometimes naming only some of its
  sister listings). Listings are one class when they share the school, meeting
  times, instructors and a course number (directly or through a chain). Each
  class appears once under its main number; the others go in `Cross Listings`
  ("Also listed as" in the app; search and the Department filter use them).
  Course IDs are `<termCode>-<main number>-<section>` (e.g.
  `202603-AFST3360-01`), so saved plans survive updates.
- **Descriptions:** When the Courses Web Service leaves a description blank,
  the importer looks up Yale Course Search by term and CRN. Each daily run
  checks up to 80 sections per open term, starting with sections that have
  never been checked and giving visible gaps priority. A successful Course
  Search description is preferred and refreshed every 30 days. It stays in
  `docs/data-samples/yale_course_search_descriptions.json` if a request fails.
  For remaining blanks, the importer keeps the last published text or looks
  up the course number and cross-listings in Yale's Bulletin. Bulletin
  lookups use the existing monthly cache.
- **Course Search health check:** Each run rechecks a known description when
  available, reports valid detail responses and counts fresh descriptions.
  A valid blank is counted separately from a failed request. GitHub Actions
  warns about partial failures or descriptions that disappeared from the
  source. If none of the attempted sections get a valid detail response,
  the job reports a failure after saving and testing any valid catalog
  updates. Open the `Fetch courses from Yale` step for details.
- Department names for the Department filter: `docs/data-samples/yale_subjects.json`.
- Times: Yale writes `MW 2.35-3.50` (no am/pm: 8–11 morning, 12 noon, 1–6
  afternoon) and `Th 7.00-8.55p` (evening). Several meeting patterns with the
  same time are combined; otherwise the first timed one is used.
- Units are always 0 (no SOM units for other schools).

**Law School** isn't in Yale's API (only 2–3 Law courses per term). Its courses
would come from Law's public course list at courses.law.yale.edu
(`scripts/lib/lawImport.js`), read-only, the list anyone sees without logging
in. That reader isn't finished: it needs the exact request the Law page sends
for its course list (copy it from a browser's developer tools → Network →
`DataActionGetCoursesPerTerm` → Payload). Until then Law doesn't appear in the
School picker.

Code: `scripts/update-yale-courses.js`, `scripts/lib/yaleImport.js` (tests next
to it), `src/lib/schools.js`, `src/components/SchoolPicker.jsx`.
