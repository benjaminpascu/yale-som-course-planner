# Updating course data from the SOM website

Use this whenever Yale adds, drops or changes courses. One command rebuilds a
term's course file (`docs/data-samples/courses_master_<term>.csv`) from three
downloads.

**Short version for an AI agent:** "Follow `docs/updating-course-data.md`."
The three CSVs are in `course-import/`. Run `npm run update-courses -- --check`,
show the user the report, and run `npm run update-courses` once they agree.

## 1. Download the three files

On the SOM elective courses page (som.yale.edu/elective-core-courses), pick
**one semester only**, then use the page's CSV download three times:

| File | Filter on the page | File name must… |
|------|--------------------|-----------------|
| Full course list | No requirement filter | …not contain "stem" or "gbs" (Yale's `courseslist-….csv` name is fine) |
| STEM list | STEM requirement only | …contain **stem** (e.g. `STEM Req.csv`) |
| GBS list | GBS requirement only | …contain **gbs** (e.g. `GBS Req.csv`) |

Fall and spring are separate runs: do one semester, then the other.

## 2. Put them in `course-import/`

The folder is at the top of the project. Delete the old files there first, so
it holds **exactly three** `.csv` files. (These raw files are not saved to
GitHub.)

## 3. Preview the changes

```bash
npm run update-courses -- --check
```

This writes nothing. It works out the semester from the files and prints:

- **New courses** and **Removed courses** (by section)
- **Changed courses** — room, time, professor, units, tags, etc.; descriptions show as "description updated"
- **Manual fixes applied** (see step 6)
- **Problems to look at** — e.g. a meeting time it couldn't read (that section shows as "No time defined")

If a removed or changed list looks wrong (say, half the courses vanished), a
file was probably downloaded with the wrong filter or semester. The script
stops on its own if the new list is less than half the size of the old one.

## 4. Write the file

```bash
npm run update-courses
```

## 5. Check and publish

```bash
npm test
```

```bash
npm run dev
```

Open the app, switch to the semester you updated, and spot-check a new course.
Then commit and push to `main`; Vercel redeploys.

## 6. Manual fixes that survive updates

Sometimes Yale's export is wrong or blank where the website is right (e.g. a
missing room). Don't edit the course file directly: the
next update would undo it. Add a line to
`docs/data-samples/course_overrides.csv` instead:

```
TermCode,Course ID,Column,Value,Note
202701,21645,Room,EVANS 4230,MGMT 7305 room from the SOM site
```

- **TermCode**: `YYYY01` = spring, `YYYY03` = fall (e.g. 202701 = Spring 2027)
- **Course ID**: the section's ID from the course file
- **Column**: exact column name (e.g. `Room`, `days_clean`, `start_24h`, `tags`)

The report tells you when a fix is no longer needed (Yale caught up) or its
course is gone, so you can delete that line.

## What the script does

- Copies every column from the full list, in the same order, keeping Yale's order of rows.
- **Shows every course**: sets `Visible` to `1` even when Yale's export says `0` (it hides some courses the SOM site lists, like GNAM courses). The report names the ones Yale had hidden.
- Builds `days_clean`, `start_24h`, `end_24h` from Yale's `Daytimes` (e.g. `T  Th 1:00 PM-2:20 PM` → `Tu,Th`, `13:00`, `14:20`), falling back to the `Timings` columns.
- Sets `tags`: `STEM` if the section's Course ID is in the STEM file, `GBS Req` if it's in the GBS file, both as `STEM;GBS Req`.
- Applies `course_overrides.csv`.
- Writes the file in the same CSV style as before, so git shows only real changes.

Code: `scripts/update-courses.js`, `scripts/lib/courseImport.js` (tests next to it).

## Things to know

- **A new semester** (e.g. Fall 2027) gets a new file, `courses_master_fall2027.csv`. The script warns that the app doesn't load it yet; adding it to `src/lib/loadData.js` is a small code change to ask an agent for.
- **More requirement lists** (beyond STEM and GBS) need one line added to `TAG_LISTS` in `scripts/lib/courseImport.js`.
- **Compare Courses data** is keyed on course number + EMBA category (plus title when one number covers several courses, e.g. MGT 416 trips). If Yale renumbers a course, students' Compare notes for it start fresh.
