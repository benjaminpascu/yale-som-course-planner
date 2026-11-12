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

How it stays gentle and safe:

- Yale answers one school + subject at a time, and often answers **"no
  courses" for a while before the real list** (sometimes every third answer,
  sometimes after 4–5 empty ones). So each question is asked up to 6 times in
  a row before "no courses" is believed.
- `docs/data-samples/yale_subject_pairs.json` remembers which school/subject
  pairs have courses (in either semester). Those are re-asked every 2 days
  (half each day); all other pairs are re-checked once every 28 days (a slice
  each day). Roughly 2,000 requests a day. `--known` asks every known pair now
  (catch-up); `--full` asks every pair (~2,500 per semester, over an hour).
- A pair that comes back empty keeps its old courses until it has been empty
  7 days in a row. A semester that would shrink by more than half, or Yale
  errors on most questions, keeps the old file and fails the job (GitHub
  emails the repo owner).
- Cancelled sections are left out. A course listed under several subjects
  with one CRN appears once, under its main listing. Course IDs are
  `<termCode>-<crn>`, so saved plans survive updates.
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
