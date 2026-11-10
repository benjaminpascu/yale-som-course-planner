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

**Finished semesters**: the day after a semester's last class, the site hides
it from the semester switcher and the job stops updating its file. The file
stays, so students' saved plans keep those courses.

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
