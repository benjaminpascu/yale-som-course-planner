# Shortlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students star course sections and use a ★ button next to the search to see only their starred courses. Your Plan gets calmer: only the semester on screen, flat rows, and a hover popup that opens beside the row.

**Architecture:** Shortlist state lives in `App.jsx` (like plans), backed by a small pure storage module. The course list does the filtering, so no new panel. Your Plan changes are local to `PlanPanel` / `PlanCourseRow` plus a beside-the-row popup helper in `portaledTooltip.js`.

**Tech Stack:** Vite + React + Tailwind v4 (theme colors in `src/index.css`), Vitest.

**Spec:** `docs/specs/shortlist.md` (approved). Visual reference: local branch `spike/shortlist` (throwaway; copy ideas, not code wholesale).

## Global Constraints

- Branch `feature/shortlist`; ship by pull request + Vercel preview, merge only when the user says so.
- Shortlist blue `#2F6FBF` (`--color-short-600`), hover `#275da1` (`--color-short-700`); tints `--color-short-50: #edf3fb`, `--color-short-100: #d3e2f5`.
- Storage key `yale-som-course-planner-shortlist`, shape `{ version: 1, terms: { [termCode]: courseId[] } }`.
- One shortlist per semester, shared by all plans; per section (course ID); never pruned.
- Starring never changes the plan and never makes it "unsaved".
- Minimal on-screen text; tips float and never move layout.
- Every Your Plan change applies in Single plan, Compare plans and the phone Plans tab.
- Version **1.2.0** in `package.json` and the top `UPDATES` entry (a test checks they match).
- Before every push: `npm test` passes, `npm run build` succeeds, browser check of Single plan and Compare plans with no console errors.

## Review Focus

- Starred courses from another school before that school's courses have loaded: the stars must survive (storage never filters by catalog). Test in Task 1.
- **Clear all courses** on a plan with courses in the other semester, or with other-school courses not loaded yet: those must stay. Test in Task 5.
- localStorage blocked or holding garbage: loading gives an empty shortlist, and saving doesn't crash the page. Tests in Task 1.
- ★ on, then switching school or semester: the count and the list follow the new school/semester, and "No shortlisted courses" shows only when that school has none. Browser check in Task 3.
- A Your Plan row near the bottom of the screen or in a narrow window: the popup still fits on screen (falls back to above/below when no side fits). Test in Task 7.

---

### Task 1: Shortlist storage and colors

**Files:**
- Create: `src/lib/shortlistStorage.js`
- Test: `src/lib/shortlistStorage.test.js`
- Modify: `src/index.css` (add the four `--color-short-*` colors next to `--color-save-*`)

**Interfaces:**
- Produces:
  - `SHORTLIST_STORAGE_KEY = 'yale-som-course-planner-shortlist'`
  - `createEmptyShortlistStore(): { version: 1, terms: {} }`
  - `loadShortlistStore(storage = globalThis.localStorage): Store`. Bad JSON, a missing key or a blocked storage → empty store. Keeps only string IDs and drops duplicates.
  - `persistShortlistStore(store, storage = globalThis.localStorage): void`. Swallows storage errors (like `persistSeenHints`).
  - `getShortlist(store, termCode): string[]` (`[]` for an unknown term)
  - `toggleShortlisted(store, termCode, courseId): Store`. Pure: adds the ID if missing (appended), removes it if present, and leaves other terms untouched.

- [ ] **Step 1: Write failing tests** (memory-storage helper as in `onboardingHints.test.js`):
  - `toggleShortlisted` adds then removes: `getShortlist(toggle(toggle(empty,'202701','A'),'202701','A'),'202701')` → `[]`; one toggle → `['A']`.
  - Other terms are untouched: toggling in `'202701'` leaves `terms['202603']` as it was.
  - The input store is not mutated.
  - Load→persist round trip keeps IDs that no catalog knows, e.g. `'GB-12345'` (Review Focus: other-school courses load late).
  - `loadShortlistStore` with `'not json'`, `null`, `{terms: {'202701': ['A', 5, 'A']}}` → empty store / empty store / `['A']`.
  - `persistShortlistStore` with a storage whose `setItem` throws → no throw.
- [ ] **Step 2:** `npx vitest run src/lib/shortlistStorage.test.js` → FAIL (module missing).
- [ ] **Step 3:** Implement the module and add the colors.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Commit `feat(shortlist): storage for starred courses`.

### Task 2: Star button in course details and ★ on rows

**Files:**
- Modify: `src/App.jsx` (state + wiring), `src/components/CourseBrowser.jsx` (pass-through), `src/components/CourseRow.jsx`

**Interfaces:**
- Consumes: Task 1 functions.
- Produces:
  - In `App.jsx`: `shortlistStore` state (init `loadShortlistStore()`, persisted on change), `shortlistIds: Set<string>` for `activeTermCode`, `toggleShortlist(courseId)`.
  - `CourseBrowser` new props: `shortlistIds = new Set()`, `onToggleShortlist(courseId)`. Pass them to both `CourseBrowser` instances (computer and phone).
  - `CourseRow` new props: `isShortlisted = false`, `onToggleShortlist()`.

- [ ] **Step 1:** In `CourseRow`, wrap the plan button and a new star button in `div.flex.gap-1.5`. The plan button gets `flex-1` instead of `w-full`. Star button: `w-10 shrink-0`, solid `bg-short-600 border-short-700 hover:bg-short-700`, white glyph `text-lg` (☆ off / ★ on), `aria-pressed={isShortlisted}`, `aria-label` "Add to Shortlist" / "Remove from Shortlist". No `title` tooltip.
- [ ] **Step 2:** Row marker: when `isShortlisted`, show a non-interactive `★` (`text-sm text-short-600`, `aria-label="Shortlisted"`) first in the right rail's tag line. `showRightRail` also turns true for it.
- [ ] **Step 3:** In the browser, star a course, reload: still starred. Switch to Fall: not starred there. Switch plans: unchanged, and the plan is not "unsaved".
- [ ] **Step 4:** `npm test` → PASS. Commit `feat(shortlist): star a course from its details`.

### Task 3: ★ button next to search

**Files:**
- Modify: `src/components/CourseBrowser.jsx`

**Interfaces:**
- Consumes: `shortlistIds` (Task 2).
- Produces: `CatalogSearchBar` new props `shortlistCount: number`, `onlyShortlisted: boolean`, `onToggleShortlisted()`.

- [ ] **Step 1:** In `CourseBrowser`, add `onlyShortlisted` state (default `false`). `shortlistCount` = starred courses among `termCourses` (this school + semester). `filtered` keeps only starred courses when it's on. Reset `page` and close the details when it changes (add it to the existing reset effect's dependencies).
- [ ] **Step 2:** Button between the search box and **Filters**, the same size and style as Filters. Off: white with a `text-short-700` ★ and the count (no number when 0). On: `bg-short-600 text-white`. `aria-pressed`, `aria-label="Show only Shortlisted courses"`. Not counted in the Filters number; Filters → **Clear** leaves it alone.
- [ ] **Step 3:** Empty message: when `onlyShortlisted && shortlistCount === 0` → **"No shortlisted courses"**. Otherwise the existing "No courses found. Try expanding your selection criteria." Use it in both empty-list spots.
- [ ] **Step 4:** Browser check (Review Focus): ★ on → only starred. Switch the school → that school's starred, or "No shortlisted courses". Switch semester → that semester's. ★ + a Monday filter combine. Both views, and phone width.
- [ ] **Step 5:** `npm test` → PASS. Commit `feat(shortlist): ★ button shows only starred courses`.

### Task 4: Tutorial tip

**Files:**
- Modify: `src/lib/onboardingHints.js`, `src/lib/onboardingHints.test.js`, `src/App.jsx`, `src/components/CourseBrowser.jsx`

**Interfaces:**
- Produces:
  - `'shortlist'` in `PLANNER_HINTS` right after `'add-course'`. `nextPlannerHint({ …, detailsOpen = false })`: for `'shortlist'`, if `!detailsOpen` return `null` (holds back later tips). Computer and phone.
  - `CourseBrowser` prop `onDetailsOpenChange(open: boolean)`, called when `expandedCourseId` goes from or to `null`.

- [ ] **Step 1: Failing tests** in `onboardingHints.test.js`:
  - `nextPlannerHint({...base, seen: new Set(['add-course']), detailsOpen: true})` → `'shortlist'`.
  - The same with `detailsOpen: false` → `null`.
  - Returning student: `seen` = every planner hint except `'shortlist'`, `detailsOpen: true` → `'shortlist'`.
  - Update the existing tests that expect a tip after `add-course`: add `'shortlist'` to their `seen` sets.
- [ ] **Step 2:** `npx vitest run src/lib/onboardingHints.test.js` → FAIL.
- [ ] **Step 3:** Implement. In `App.jsx`, keep `desktopDetailsOpen` / `phoneDetailsOpen` from the two `CourseBrowser`s and pass the right one into the computer and phone `nextPlannerHint` calls. Starring any course also marks `'shortlist'` seen (like adding marks `'add-course'`).
- [ ] **Step 4:** Render it in the existing add-course tip spots, with the same `HintBubble` and positions (computer: `absolute top-24 left-[23rem]`, arrow left, catalog spotlighted; phone: the bottom bubble on the Courses tab). Copy is exactly:
  `<b>Star</b> courses you're interested in, so you can always come back to them later. Click <b>★</b> next to the search to see only your starred courses.`
- [ ] **Step 5:** Tests → PASS. Browser: Help → add a course → the star tip appears, one tip at a time, and nothing shifts. Commit `feat(shortlist): tutorial tip`.

### Task 5: Your Plan shows only the semester on screen

**Files:**
- Create: `src/lib/planSemester.js`, `src/lib/planSemester.test.js`
- Modify: `src/components/PlanPanel.jsx`, `src/components/PlanningPanel.jsx`, `src/components/ComparePlansView.jsx`, `src/components/MobilePlansPanel.jsx`, `src/App.jsx` (`clearPlan`, `plansPanelProps`)

**Interfaces:**
- Produces:
  - `coursesInSemester(courses, termCode): Course[]`, using `courseSemester(c) === termCodeToSemester(termCode)` (same rule as `WeeklyCalendar`). A `null` termCode returns all.
  - `clearSemester(selectedIds: Set<string>, courseById: Map<string, Course>, termCode): Set<string>`. Removes only IDs whose course is in that semester. IDs with no loaded course are **kept**.
  - `PlanPanel` new prop `termCode`. Its list, count, units and footer use `coursesInSemester`.

- [ ] **Step 1: Failing tests:** `clearSemester` keeps a Fall ID when clearing Spring, keeps an unknown ID `'GB-999'`, and removes Spring IDs. `coursesInSemester` filters by semester.
- [ ] **Step 2:** `npx vitest run src/lib/planSemester.test.js` → FAIL.
- [ ] **Step 3:** Implement. Pass `termCode` to every `PlanPanel` (PlanningPanel, both in ComparePlansView, MobilePlansPanel via `plansPanelProps.termCode = activeTermCode`). `clearPlan` uses `clearSemester` with `activeTermCode`.
- [ ] **Step 4:** Tests → PASS. Browser: a plan with Fall + Spring courses shows only Spring on Spring. Clear all courses on Spring leaves Fall. Both views. Commit `feat(plan): Your Plan shows the semester on screen`.

### Task 6: Calmer Your Plan look

**Files:**
- Modify: `src/components/PlanPanel.jsx`, `src/components/PlanCourseRow.jsx`

- [ ] **Step 1:** Remove the "Unsaved changes to *plan*. Save when you're done editing." line. Keep the `planEmptyHint` line when no plan is open.
- [ ] **Step 2:** Flat rows. Each session's `<ul>` is one block: `overflow-hidden rounded-md border border-save-100`. Rows are `border-b last:border-b-0 border-save-100 bg-save-50` with no `rounded`, `shadow` or ring. Remove the list's `border-l-2` rule. Keep the same padding as today.
- [ ] **Step 3:** Session headings: `formatSessionLabel(group.session)` with no year options.
- [ ] **Step 4:** Browser check in Single plan, Compare plans and at phone width; no console errors. Commit `feat(plan): calmer Your Plan rows`.

### Task 7: Hover popup opens beside the row

**Files:**
- Modify: `src/lib/portaledTooltip.js`, `src/components/PlanCourseRow.jsx`
- Test: `src/lib/portaledTooltip.test.js` (create)

**Interfaces:**
- Produces: `besidePlacement(rowRect, viewport, { hasDescription }): Style | null`, where `viewport = { width, height, bottomInset }`. Pure, so it can be tested. It picks the side with more room. It returns `null` when that room is under `CALENDAR_TOOLTIP_MIN_WIDTH`. Width is `min(LARGE_TOOLTIP_MAX_WIDTH, room)`. It hangs down from `rowRect.top` unless there's more room growing up from `rowRect.bottom`; `maxHeight` is capped by `LARGE_TOOLTIP_MAX_HEIGHT_PX`. It sets `--tooltip-desc-max` when `hasDescription`.

- [ ] **Step 1: Failing tests:**
  - A row in the left half → `left === rect.right + 8`.
  - A row in the right half → `left + width === rect.left - 8`.
  - A narrow viewport where neither side has 288px → `null`.
  - A row near the bottom → `bottom` set, no `top`, and `maxHeight` ≤ the room above (Review Focus).
- [ ] **Step 2:** `npx vitest run src/lib/portaledTooltip.test.js` → FAIL.
- [ ] **Step 3:** Implement. In `PlanCourseRow`, use `besidePlacement(li.getBoundingClientRect(), {width: innerWidth, height: innerHeight, bottomInset: getViewportBottomInsetPx()}, …)` on the row's `<li>`, with a fallback to today's `calendarCourseTooltipStyle`. Skip the left clamp in the layout effect when it's placed beside.
- [ ] **Step 4:** Tests → PASS. Browser: hover a plan row, move the mouse up to the row above, and the next popup opens (no blocking). Both views. Commit `fix(plan): course popup opens beside the row`.

### Task 8: Release on a preview link

**Files:**
- Modify: `src/lib/updates.js`, `package.json` / `package-lock.json`, `AGENTS.md`, `docs/PROJECT_STATUS.md`

- [ ] **Step 1:** Top `UPDATES` entry `{ version: '1.2.0', date: <today>, changes: [...] }` in plain words for students:
  - "**Shortlist**: open a course and click the blue ☆ next to Add to Plan to star it. Click ★ next to the search to see only your starred courses, so you can always come back to them. Each semester has its own shortlist."
  - "**Your Plan** now shows only the semester you're looking at, with a cleaner list. Hovering a course opens its details to the side, so you can move straight to the next course."
- [ ] **Step 2:** `npm version 1.2.0 --no-git-tag-version`.
- [ ] **Step 3:** `AGENTS.md`: a Current focus row "Shortlist (spec `docs/specs/shortlist.md`; version 1.2.0) — preview" and a Key code locations row for `shortlistStorage.js`, `planSemester.js`, and the ★ button in `CourseBrowser.jsx`. `docs/PROJECT_STATUS.md`: the same status.
- [ ] **Step 4:** `npm test` (all pass), `npm run build` (succeeds), and a full browser pass of every spec section in Single plan and Compare plans, no console errors.
- [ ] **Step 5:** Commit, `git push`, then `gh pr create` titled "Shortlist" whose body says `Closes #11`, summarizes the change and ends with the attribution line. Get the Vercel preview link from the pull request and send it to the user. Don't merge.
