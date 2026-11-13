# Spec: Bidding history

GitHub issue: #2 · Status: **agreed in chat, first draft built** (Nov 13, 2026) · Version **1.2.0**

## Why

Bidding is the biggest source of stress in course planning. Students want to know, at
a glance, whether a section has been hard to get into, so they can spend points
wisely and plan backups. SOM publishes past clearing prices in an Excel file, but
nobody opens it while planning.

## Goals

- See how competitive a section was **at a glance**, without reading anything.
- Exact numbers one hover away.
- Data stays current with almost no work, and the student is told when it can't.

## Non-goals (this version)

- No averages across sections, no predictions, no "you should bid X points".
- Not shown on the collapsed course row, in Your Plan or on the calendar.
- Rounds 3+ are not shown.
- Courses from other Yale schools (no bidding data).

## Anti-goals

- Text clutter: labels, legends or explanations on screen beyond the squares.
- A false sense of certainty: mixing sections together, or guessing which section
  last year "matches" this one.

## Approaches considered

1. **Match a section to last year's by time slot / professor.** Dropped (user
   decision): it assumes those are the only factors. Competitiveness also depends on
   other courses (e.g. a popular course moving out of the same slot), so we'd be
   guessing at causes.
2. **Average sections of the same course.** Dropped: a Friday section draws fewer
   bids than a Tuesday one; averaging hides exactly what students need.
3. **Chosen: match by course number + section number only**, and say so in a
   disclaimer in the hover box.

## What the student sees

### Squares (on every course row, bottom right; user change Nov 13, 2026)

```
› MGT 556 — Big Data & Customer Analytics (4 units)        [STEM]
  Spring full term · Mo,We · 10:05–11:25                  [In Plan]
                                                           ■ ■ ■ ■
```

- On the course row itself, so students see it without opening the course: pinned
  in the bottom-right corner, on the time line, under the requirement tags (and under
  In Plan / Conflict when shown). Pinned rather than in the tag column so titles keep
  their full width (checked: no row gets taller, nothing overlaps).
- Four small squares, in this order: **Round 1 and Round 2 of the same season last
  year, then Round 1 and Round 2 of the year before.** A Spring 2027 course shows
  Spring 2026 R1, Spring 2026 R2, Spring 2025 R1, Spring 2025 R2. A Fall 2026 course
  shows Fall 2025 and Fall 2024.
- No labels, no legend.
- Shown only for SOM sections with **at least one past result** (user decision, Nov
  13, 2026). Blank = no bidding history; a gray square = no result for that round.
  New bid courses show nothing.
- Same in Single plan and Compare plans (it's part of the course list). On phones,
  tapping the squares opens and closes the box (same as requirement tags) without
  opening the course.

### Colors (fixed bands, same for every course and year)

| Cleared at | Square |
|---|---|
| No data | light gray |
| 0 points | palest yellow-orange |
| 1–99 | light orange |
| 100–299 | medium orange |
| 300–499 | strong orange |
| 500+ | dark orange |

### Hover box (a small table that mirrors the squares)

```
Bidding history
               Round 1      Round 2
─────────────────────────────────────
Spring 2026    ■ 0 pts      ■ 143 pts
Spring 2025    ■ 10 pts     ■ No data
─────────────────────────────────────
Based on past results for this section. Sections can
change from year to year, so keep that in mind.
```

- One row per semester, one column per round, thin lines between rows, a small
  color square next to each number.

### Course popups (Weekly Calendar and Your Plan; user request Nov 13, 2026)

The hover popup for a course on the calendar or in Your Plan shows **Bidding history
(points)** in its left facts column, under Category: the same table in a compact
form ("R1" / "R2" headers, numbers without "pts", "–" for no data, colored squares)
plus the disclaimer in small text. SOM courses without past results show
"Bidding history: No bidding history" in the same spot (user request); other
schools' courses show nothing there.

## Data

- Source: SOM's public file `Auction-Bidding-History.xlsx` (one tab per semester,
  e.g. "Spring 2026"; `Course` = "MGT 525-01 Competitive Strategy"; `Round 1`,
  `Round 2` = clearing price in points; blank / "N/A" = no result). The page that
  lists it (`som.yale.edu/myportal/course-bidding-and-enrollment-history`) needs a
  Yale login, but the file link itself doesn't.
- Saved link: `docs/data-samples/bidding_history_source.json`.
- Imported to `docs/data-samples/bidding_history.csv`
  (`term,course_number,section,round_1,round_2,title`; all tabs, rounds 1–2; `title` only for numbers that cover several courses), bundled
  with the site and loaded in the background like other schools' courses.
- Rows whose `Course` isn't "SUBJ 123-01 …" (e.g. old `GNWAIM` codes) are skipped.
  Tabs are imported as named (two old tabs say "2000"; they're never shown).

### Keeping it current (`.github/workflows/update-bidding-history.yml`)

Runs on the 1st of every month (and by hand from the Actions tab):

1. **Guess:** try `som.yale.edu/sites/default/files/<this month or last month>/Auction-Bidding-History.xlsx`.
   If found and different from the saved link, use it and save the new link.
2. **Download** the saved link; if the data changed, test, build and commit.
3. **Broken link:** if the saved link no longer downloads, open a GitHub issue
   assigned to the owner and mentioning them ("Bidding history link is broken…",
   with the portal address), and mark the run failed (GitHub emails failed runs).
   Not repeated while that issue is open.
4. **Missing semester:** if a semester has started (Spring: Jan 20; Fall: Sep 1)
   but the file has no tab for it, open one issue for that semester ("SOM hasn't
   posted … results yet"). Never repeated for the same semester.

The site keeps the last good data meanwhile. Fixing a broken link = paste the new
link into `bidding_history_source.json` (or give it to an agent).

## Release

- Version **1.2.0** (shared release entry in `src/lib/updates.js`).
- Branch `feature/bidding-history` → pull request into `release/1.2` → preview link
  → the user approves → merge. Goes live with the rest of 1.2.
- The update job only starts running once it's on `main` (scheduled jobs run from
  the default branch).

### Exception: trips that share a course number (user decision, Nov 13, 2026)

The **MGT 416 International Experience** trips share one course number, and section
numbers move between countries each year (Spring 2026 section 02 = India, Spring
2025 section 02 = Spain). Where one course number covers different titles in a
past semester, the import keeps those titles (`title` column) and the site matches
by **destination** (the part after the colon: "IE: India" ↔ "International
Experience: India") instead of section. A new destination shows gray squares.

## Left to the builder

- Exact hex shades of the bands; square size and spacing.
- Hover box layout details within the requirements-box style.
