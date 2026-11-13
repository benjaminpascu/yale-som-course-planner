# Spec: Shortlist

GitHub issue: none yet (opened when this spec is approved) · Status: **approved** (Nov 13, 2026) · Nov 2026 · Version **1.2.0**

A throwaway prototype is on local branch `spike/shortlist` (not for merging;
use it as the visual reference). The build starts from `main` on
`feature/shortlist`.

## Why

With courses from every Yale school in the catalog, picking courses has become
overwhelming. Students want a quick first pass before building a plan: go
through the list and mark "I'm interested". After that, they put together the
actual plan from that shorter list. The old Rank page (hidden) is too much work
for this. Starring a course should take one click.

## Goals

- One click to star a course section from its details, and one click to unstar it.
- One click to see only your starred courses, and one click back to the full list.
- **One shortlist per semester**, shared by all plans. The Fall / Spring switch
  decides which semester's shortlist is shown. Plans never change it.
- Works for courses from every school.
- Works the same in Single plan, Compare plans and on phones.

## Non-goals (this version)

- No ranking, scores, notes or "maybe". A course is either starred or not.
- No separate shortlist panel, column, tray or page.
- No starring from a course row. Starring happens in the course details.
- No link to the hidden Rank tab's "Interested" decisions.
- The shortlist is not included when you export or import plans.

## Anti-goals (would count as failure even if it "works")

- A second place that repeats what the course list already does.
- Clutter: new bars, panels, switches or always-visible text beyond what's below.
- Starring changing the plan, or making a plan "unsaved".

## Approaches considered

1. **Shortlist column inside Your Plan** (built in the prototype, in several
   versions: shortlist left of the plan, then a gray "palette" tray right of it
   that folds into a vertical strip). Dropped: it was clunky. It added a second
   place for something the course list already does, plus more scrolling areas
   and toggles, and only appeared when the calendar was closed.
2. **Plan | Shortlist switch in the Your Plan bar.** Dropped for the same reason,
   and it hid the plan.
3. **Shortlisted as one checkbox inside Filters.** Right idea, wrong place:
   buried, so nobody would use it as their working list.
4. **Chosen: a ★ button next to search.** The shortlist is simply the course list
   filtered to starred courses: the same rows and the same Add to Plan, just fewer
   of them, with the calendar still open. Visible, with a count, one click each way.

## Colors

- **Shortlist blue: `#2F6FBF`** (medium blue). It isn't used anywhere else on the site.
  Blue means shortlisted, and green (`save-800`) means in your plan. Add theme
  colors (e.g. `--color-short-600` `#2f6fbf`, `--color-short-700` `#275da1` for
  hover; the prototype also has light tints `short-50` / `short-100`).

## What the student sees

### 1. Star button in course details

When a course is opened in the course list, the bottom button row becomes:

```
[                Add to Plan                ][☆]
```

- **Add to Plan** (green, unchanged; **Remove from Plan** when it's in the plan)
  takes the rest of the width. The star button sits on its right, **about
  square** (roughly 40 × 30 px), so the green button is clearly the main one.
- Star button: **solid shortlist blue** with a **white star** and no text. The
  star is fairly large (about 18 px) and sits close to the edges without crowding them.
  Not starred = outline ☆. Starred = filled ★. Click toggles.
- **Starring saves one section**, the exact row you opened. Other sections of the
  same course aren't starred.
- No hover tooltip; the tutorial tip explains it.

### 2. Star on course rows

A small blue ★ on a course row when that section is starred, with the row's other
labels (top right, next to requirement tags / **In Plan** / **Conflict**). It's a
marker only; clicking the row works as today.

### 3. ★ button next to search

```
[ Number, title, faculty…     ] [★ 6] [Filters]
```

- Between the search box and **Filters**, the same height and style as Filters,
  with a blue ★ and the number of starred courses **in the school and semester on
  screen** (no number when there are none).
- Click → the course list shows only starred courses. The button fills blue
  while it's on. Click again → back to the full list.
- **Per school:** it shows the starred courses of the school you've picked. To see
  starred courses from another school, switch the School picker (the ★ stays on).
  This keeps it working like every other filter, so changing the school always
  visibly does something. (User decision. A later idea, not in this version: ★
  counts next to each school in the School picker.)
- With ★ on and **no starred courses in this school**, the list says **"No
  shortlisted courses"** instead of the usual "No courses found. Try expanding
  your selection criteria.", so it doesn't look like a filter problem. If there are
  starred courses but search or Filters hide them, the usual message stays.
- It combines with search and Filters (e.g. ★ + Monday).
- It isn't counted in the Filters number, and Filters → Clear doesn't turn it off.
- Same in Single plan, Compare plans and on phones. In Compare plans, Add to Plan
  adds to the side you're editing, as today.

### 4. Your Plan (one list, as before, with these improvements)

The shortlist doesn't appear in Your Plan. Your Plan stays one wide list, with
these changes everywhere it appears (Single plan, Compare plans, phone Plans tab):

- **Only the semester on screen**, like the calendar and Requirements. Plans
  stay global (user decision): a plan can still hold courses from both semesters,
  and the other semester's courses appear when you switch to it. The count, units
  and footer count the semester on screen. *Call:* **Clear all courses** clears
  only the semester on screen, so it never removes courses you can't see.
- **No "Unsaved changes to *plan*. Save when you're done editing." line.** The
  top bar already shows **unsaved** next to **Save Plan**. The "Pick or save a
  plan…" hint when no plan is open stays.
- **Flat rows:** each session's courses sit in one lightly tinted green block with
  thin dividers between rows. No per-row card, shadow or ring, and no vertical
  rule to the left of the list.
- **Session headings without the year** ("SPRING FULL TERM", not "… (2027)").
- **The course hover popup opens beside the row** (left or right, whichever has
  more room), not above or below. Before, a popup above a row covered the rows
  above it, so moving the mouse up landed on the popup instead of the next course.
  It falls back to above/below only when neither side has room.
- Known and accepted: the rows are very wide on a computer. That's a separate
  design question, not part of the shortlist.

### 5. Tutorial tip

- One new tip, `shortlist`, with this wording (user-approved direction: explicit
  about why):
  > **Star** courses you're interested in, so you can always come back to them
  > later. Click **★** next to the search to see only your starred courses.
- It points at the star button while a course's details are open. In
  `PLANNER_HINTS` it goes **right after `add-course`** and **holds back** later
  tips until a course's details are open (in practice it shows right after that
  tip). Whether details are open lives in `CourseBrowser.jsx` and needs to be
  passed up to `App.jsx`.
- Students who have already seen every tip also get this one, once.
- It follows the existing tip rules: one at a time, floats without moving
  anything, dismissed once, comes back with **Help**. Computer and phone.

## Data

- Saved in this browser's `localStorage` under `yale-som-course-planner-shortlist`:
  `{ version: 1, terms: { [termCode]: courseId[] } }`, the same course IDs that
  saved plans use (per section, including other-school IDs).
- Starring saves immediately and never marks a plan "unsaved".
- A starred ID missing from the loaded catalog is **kept, not shown** (other
  schools' courses load in the background). Never pruned.
- Pure functions for star, unstar, is-starred and list-for-term, with Vitest
  tests, following `planStorage.js`.

## Already shipped while specifying (not part of this build)

- 1.1.1: the site opens on the upcoming semester (Spring 2027 now).
- An empty plan's calendar opens and closes like a normal one, with a hint.
- The duplicate Save Plan button inside Your Plan was removed.
- An empty Your Plan says just "No courses yet".

## Release

- New feature → version **1.2.0** (`package.json` + top entry in
  `src/lib/updates.js`). Example: "**Shortlist**: open a course and click the blue
  ☆ next to Add to Plan to star it. Click ★ next to the search to see only your
  starred courses. Your Plan now shows only the semester you're looking at."
- Branch `feature/shortlist` → pull request → Vercel preview link → the user
  approves → merge.
- Update `AGENTS.md` (Current focus + Key code locations) and `docs/PROJECT_STATUS.md`.

## Left to the builder

- Hover/tint shades of the shortlist blue and the star glyph or icon.
- The tip's exact position, within the tip rules.
- Component structure and where shortlist state lives (`App.jsx`, like plans).
