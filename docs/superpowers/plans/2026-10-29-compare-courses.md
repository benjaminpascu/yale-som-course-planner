# Compare Courses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Compare Courses section where students select courses, define weighted criteria, score courses 1–10, rate professors, see a sortable ranked table, keep notes, and export to Excel.

**Architecture:** Pure logic in four tested modules under `src/lib/` (grouping, scoring, storage, export), a `useCompareStore` hook that owns state + `localStorage`, and UI in `src/components/compare/`. `App.jsx` gains a top-level view switch; `CourseBrowser`/`CourseRow` gain a `compare` mode for the selection step. Planner/calendar behavior is unchanged.

**Tech Stack:** Vite 6, React 19, Tailwind 4, Vitest (new, dev only), ExcelJS (new, loaded on demand).

**Spec:** `docs/superpowers/specs/2026-10-29-compare-courses-design.md`. Read it before starting any task.

## Global Constraints

- No backend, no env vars. All compare data lives in one `localStorage` key: `yale-som-course-planner-compare`, with a `version` field (start at `1`).
- Never delete stored scores/notes/ratings because a course or professor is missing from the catalog. Hide them; keep them in storage.
- No explanatory filler text in the UI. The only helper line is the toolbar's "Saved in this browser only."
- No hover popups in Compare Courses; everything opens on click. Popovers that sit inside the scrolling table render through `createPortal(…, document.body)` with fixed positioning (reuse helpers in `src/lib/portaledTooltip.js`, `TOOLTIP_Z_INDEX`).
- Colors: one 10-step red→green palette constant (`SCORE_COLORS`) used by both the screen and the Excel export. The number in a cell must stay readable on every step.
- ExcelJS must never be in the main bundle: only `await import('exceljs')` inside the export function.
- Layout matches the planner (owner requirement): same header, same left catalog sidebar, same section headers and button styles on the right. Reuse `sectionTheme.js`, `SectionHeader`, and the components named in spec §8.
- Git: per `AGENTS.md`, commit only when the owner has said so. Before Task 1, ask the owner once whether to work on branch `compare-courses` and commit after each task. If not, skip every "Commit" step.
- Run `npm test` and `npm run build` at the end of every task; both must pass.

## Review Focus

1. **Rows jumping while scoring.** If the table re-sorts on every keystroke, the row you're typing in moves away. Expected: order is frozen while focus is inside the table and re-sorts when focus leaves it or the sort changes. Pinned in Task 2 (`orderRowKeys`) and verified in Task 6.
2. **Bad score input** ("0", "11", "7.5", "-3", "abc", "1 0"). Expected: rejected without being saved; the cell reverts on blur. "10" is accepted. Pinned in Task 2 (`parseScoreInput`).
3. **Storage unavailable or full** (Safari private mode, quota exceeded). Expected: no crash; the "Saved in this browser only." line becomes "Couldn't save — export to Excel to keep a copy." in red. Pinned in Task 3.
4. **Two browser tabs open.** Expected: a change in tab B isn't wiped out by tab A's next save; tab A reloads the store on the `storage` event. Verified in Task 5.
5. **Notes with odd text in Excel** (newlines, quotes, emoji, text starting with `=`). Expected: exported verbatim as text, never as a formula. Pinned in Task 4.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/compareGroups.js` | Group sections into compare courses; professor list |
| `src/lib/compareScoring.js` | Score math, weight shares, score parsing, colors, sorting |
| `src/lib/compareStorage.js` | Store shape, defaults, load/persist with backup, pure updaters |
| `src/lib/compareExport.js` | Sheet row builders (pure) + ExcelJS workbook download |
| `src/components/compare/useCompareStore.js` | React state + persistence + cross-tab reload |
| `src/components/compare/CompareView.jsx` | Term, step switch (select / compare), toolbar |
| `src/components/compare/CompareTable.jsx` | Table, headers, sorting, frozen order |
| `src/components/compare/ScoreInput.jsx` | One 1–10 cell |
| `src/components/compare/ProfessorCell.jsx` | Name(s) + rating cell + note popover |
| `src/components/compare/NotePopover.jsx` | Course note editor |
| `src/components/compare/CourseDetailModal.jsx` | Click-to-open course details |
| `src/components/compare/SetupPanel.jsx` | Criteria tab + Professors tab |
| `src/App.jsx`, `src/components/MobileBottomNav.jsx` | View switch, mobile tab |
| `src/components/CourseBrowser.jsx`, `src/components/CourseRow.jsx` | `compare` mode |
| Tests | `src/lib/*.test.js` next to each module |

---

### Task 1: Test setup + course grouping

**Files:**
- Modify: `package.json` (add `vitest` ^3 as devDependency; script `"test": "vitest run"`)
- Create: `src/lib/compareGroups.js`, `src/lib/compareGroups.test.js`

**Interfaces:**
- Produces:
  - `courseGroupKey(course) -> string` — `${courseNumber}|${title.trim().toLowerCase()}|${isEmba ? 'emba' : 'ft'}`; `isEmba` = `course.category.trim() === 'EMBA'`.
  - `buildCourseGroups(courses) -> CourseGroup[]` in first-appearance order, where `CourseGroup = { key, courseNumber, title, isEmba, sections: Course[], professors: string[], units: number, unitVariants: number[], tags: string[], sessions: string[] }`. `title` = first section's raw title; `professors` = unique non-empty `faculty` in section order; `units` = most common (ties → first seen); `tags` = sorted union; `sessions` = unique `session` values in section order. Callers pass one term's courses.
  - `uniqueProfessors(courses) -> string[]` — unique non-empty `faculty`, sorted with `localeCompare`.

- [ ] **Step 1: Install Vitest and add the script**

Run: `npm install -D vitest@^3` then add `"test": "vitest run"` to `scripts`.

- [ ] **Step 2: Write failing tests** in `compareGroups.test.js` using small hand-made section objects (fields: `courseNumber, title, category, faculty, units, tags, session, termCode`):

```js
test('IE trips with one course number become separate groups', () => {
  const g = buildCourseGroups([
    sec({ courseNumber: 'MGT 416', title: 'IE: Japan', faculty: 'A' }),
    sec({ courseNumber: 'MGT 416', title: 'IE: Kenya', faculty: 'B' }),
  ])
  expect(g.map((x) => x.title)).toEqual(['IE: Japan', 'IE: Kenya'])
})
test('EMBA section splits from full-time section with same number and title', () => {
  const g = buildCourseGroups([
    sec({ courseNumber: 'MGT 408', title: 'X', category: 'Core', faculty: 'Nalebuff, Barry' }),
    sec({ courseNumber: 'MGT 408', title: 'X', category: 'EMBA', faculty: 'Cain, Daylian' }),
  ])
  expect(g).toHaveLength(2)
  expect(g[0].professors).toEqual(['Nalebuff, Barry'])
  expect(g[1].isEmba).toBe(true)
})
test('title match is trimmed and case-insensitive', () => {
  expect(courseGroupKey(sec({ title: ' Valuation ' }))).toBe(courseGroupKey(sec({ title: 'valuation' })))
})
test('key excludes term', () => {
  expect(courseGroupKey(sec({ termCode: '202609' }))).toBe(courseGroupKey(sec({ termCode: '202701' })))
})
test('multi-section group: unique professors in order, most common units, unit variants', () => {
  const g = buildCourseGroups([
    sec({ faculty: 'Zimmerman, Seth', units: 3 }), sec({ faculty: 'Zimmerman, Seth', units: 3 }),
    sec({ faculty: 'Seim, Katja', units: 4 }),
  ])[0]
  expect(g.professors).toEqual(['Zimmerman, Seth', 'Seim, Katja'])
  expect(g.units).toBe(3)
  expect(g.unitVariants).toEqual([3, 4])
})
test('uniqueProfessors drops blanks and sorts', () => {
  expect(uniqueProfessors([sec({ faculty: 'B' }), sec({ faculty: '' }), sec({ faculty: 'A' }), sec({ faculty: 'B' })])).toEqual(['A', 'B'])
})
```

- [ ] **Step 3: Run** `npm test` — expected FAIL (module not found).
- [ ] **Step 4: Implement** the three functions in `src/lib/compareGroups.js`.
- [ ] **Step 5: Run** `npm test` — expected PASS. Then a one-off check against real data: a Vitest test that reads both CSVs with `fs.readFileSync` and parses them with `parseCoursesCsv` from `src/lib/parseCourses.js` (it already drops hidden rows) and asserts Spring has 10 groups with `courseNumber === 'MGT 416'`. While there, print near-duplicate professor names (same surname, differing first name) and report them to the owner. Keep the MGT 416 assertion; drop the printing.
- [ ] **Step 6: Commit** — `feat(compare): course grouping + vitest`

---

### Task 2: Scoring, parsing, colors, sorting

**Files:**
- Create: `src/lib/compareScoring.js`, `src/lib/compareScoring.test.js`

**Interfaces:**
- Consumes: `CourseGroup` (Task 1). `Criterion = { id, name, weight, kind: 'manual' | 'professor' }`.
- Produces:
  - `professorValue(professors: string[], ratings: Record<string, {rating?: number}>) -> number | null` — highest rating among rated professors.
  - `computeCourseScore(group, criteria, courseScores: Record<string, number> | undefined, ratings) -> { score: number | null, complete: boolean }` — weighted average over criteria with a value and weight > 0; `score` rounded to 1 decimal; `complete` = every weight>0 criterion has a value.
  - `weightShares(criteria) -> Record<id, number>` — `Math.round(100 * weight / totalWeight)` per criterion (so three equal weights → 33 each); all-zero → all 0.
  - `parseScoreInput(text: string) -> number | null | undefined` — `''`/whitespace → `null` (clear); integer 1–10 → number; anything else → `undefined` (invalid).
  - `SCORE_COLORS: string[10]` — hex fills for 1..10, red→green; `scoreColor(value: number | null) -> string | null` — fill for a value, rounding non-integers (final scores) to nearest, `null` → `null`.
  - `sortRows(rows, sortKey: string, direction: 'asc' | 'desc', getValue: (row, sortKey) => number | string | null) -> rows` — stable; `null`/`''` values last in both directions; strings via `localeCompare`.
  - `orderRowKeys(sortedKeys: string[], frozenKeys: string[] | null) -> string[]` — if `frozenKeys` is null, return `sortedKeys`; else keep `frozenKeys` that are still present, in frozen order, then append new keys in sorted order.

- [ ] **Step 1: Write failing tests**

```js
const C = [
  { id: 'i', name: 'Interesting', weight: 5, kind: 'manual' },
  { id: 'u', name: 'Useful', weight: 5, kind: 'manual' },
  { id: 'p', name: 'Professor', weight: 5, kind: 'professor' },
]
test('spec example: unrated professor is skipped', () => {
  expect(computeCourseScore({ professors: ['X'] }, C, { i: 8, u: 6 }, {})).toEqual({ score: 7, complete: false })
})
test('professor criterion uses highest rating among professors', () => {
  expect(professorValue(['A', 'B', 'C'], { A: { rating: 4 }, B: { rating: 9 } })).toBe(9)
  expect(computeCourseScore({ professors: ['A', 'B'] }, C, { i: 6, u: 6 }, { A: { rating: 4 }, B: { rating: 9 } })).toEqual({ score: 7, complete: true })
})
test('weight 0 criterion ignored; all weights 0 → null', () => {
  const zeroP = C.map((c) => (c.id === 'p' ? { ...c, weight: 0 } : c))
  expect(computeCourseScore({ professors: [] }, zeroP, { i: 8, u: 6 }, {})).toEqual({ score: 7, complete: true })
  expect(computeCourseScore({ professors: [] }, C.map((c) => ({ ...c, weight: 0 })), { i: 8 }, {}).score).toBeNull()
})
test('no values → null', () => {
  expect(computeCourseScore({ professors: [] }, C, undefined, {}).score).toBeNull()
})
test('weights 2/3/5 → shares 20/30/50', () => {
  expect(weightShares([{ ...C[0], weight: 2 }, { ...C[1], weight: 3 }, { ...C[2], weight: 5 }])).toEqual({ i: 20, u: 30, p: 50 })
})
test('parseScoreInput', () => {
  expect(parseScoreInput('10')).toBe(10)
  expect(parseScoreInput('1')).toBe(1)
  expect(parseScoreInput(' ')).toBeNull()
  for (const bad of ['0', '11', '7.5', '-3', 'abc', '1 0']) expect(parseScoreInput(bad)).toBeUndefined()
})
test('scoreColor', () => {
  expect(SCORE_COLORS).toHaveLength(10)
  expect(scoreColor(1)).toBe(SCORE_COLORS[0])
  expect(scoreColor(7.4)).toBe(SCORE_COLORS[6])
  expect(scoreColor(null)).toBeNull()
})
test('sortRows puts empty values last in both directions', () => {
  const rows = [{ k: 'a', v: null }, { k: 'b', v: 3 }, { k: 'c', v: 8 }]
  const get = (r) => r.v
  expect(sortRows(rows, 'v', 'desc', get).map((r) => r.k)).toEqual(['c', 'b', 'a'])
  expect(sortRows(rows, 'v', 'asc', get).map((r) => r.k)).toEqual(['b', 'c', 'a'])
})
test('orderRowKeys keeps frozen order and appends new keys', () => {
  expect(orderRowKeys(['c', 'a', 'b'], null)).toEqual(['c', 'a', 'b'])
  expect(orderRowKeys(['d', 'c', 'a'], ['a', 'b', 'c'])).toEqual(['a', 'c', 'd'])
})
```

- [ ] **Step 2: Run** `npm test` — expected FAIL.
- [ ] **Step 3: Implement** in `src/lib/compareScoring.js`. Choose `SCORE_COLORS` as light tints (dark text readable on all ten), e.g. from Tailwind red-200 through amber-200/yellow-200 to green-300.
- [ ] **Step 4: Run** `npm test` — expected PASS.
- [ ] **Step 5: Commit** — `feat(compare): scoring, parsing, colors, sorting`

---

### Task 3: Storage

**Files:**
- Create: `src/lib/compareStorage.js`, `src/lib/compareStorage.test.js`

**Interfaces:**
- Consumes: `Criterion` (Task 2).
- Produces (all updaters are pure: return a new store, never mutate):
  - `COMPARE_STORAGE_KEY = 'yale-som-course-planner-compare'`
  - `CompareStore = { version: 1, criteria: Criterion[], selected: Record<termCode, string[]>, scores: Record<groupKey, Record<criterionId, number>>, notes: Record<groupKey, string>, professors: Record<name, { rating?: number, note?: string }> }`
  - `createDefaultCompareStore()` — criteria `[{id:'interesting',name:'Interesting',weight:5,kind:'manual'},{id:'useful',name:'Useful',weight:5,kind:'manual'},{id:'professor',name:'Professor',weight:5,kind:'professor'}]`, others empty.
  - `loadCompareStore(storage = window.localStorage) -> { store, recovered: boolean }` — missing key → default, `recovered:false`. Unparseable JSON, non-object, or `version` > 1 → write raw text to `${COMPARE_STORAGE_KEY}-backup-${Date.now()}`, return default, `recovered:true`. Otherwise normalize: drop scores outside integer 1–10, ensure exactly one `professor` criterion (append the default one if missing).
  - `persistCompareStore(store, storage = window.localStorage) -> boolean` — `false` if `setItem` throws.
  - `toggleSelected(store, termCode, key)`, `setScore(store, key, criterionId, value: number | null)` (null removes; empty course entry removed), `setNote(store, key, text)` (empty/whitespace removes), `setProfessorRating(store, name, value | null)`, `setProfessorNote(store, name, text)`.
  - `addCriterion(store, name) -> { store, error?: 'empty' | 'duplicate' }` — trimmed; duplicate = case-insensitive name match; new id from `crypto.randomUUID()`; weight 5; kind `manual`.
  - `renameCriterion(store, id, name) -> { store, error? }` — same validation; professor criterion → unchanged store.
  - `setCriterionWeight(store, id, weight: 0..10)`.
  - `countScoresForCriterion(store, id) -> number`.
  - `deleteCriterion(store, id)` — removes criterion and its scores; professor criterion → unchanged store.

- [ ] **Step 1: Write failing tests** with a fake storage `{ data: {}, getItem(k){…}, setItem(k,v){…} }`:

```js
test('missing key → defaults with three criteria', () => {
  const { store, recovered } = loadCompareStore(fake())
  expect(store.criteria.map((c) => c.name)).toEqual(['Interesting', 'Useful', 'Professor'])
  expect(recovered).toBe(false)
})
test('corrupt JSON is backed up, not lost', () => {
  const s = fake({ [COMPARE_STORAGE_KEY]: '{not json' })
  const { recovered } = loadCompareStore(s)
  expect(recovered).toBe(true)
  const backupKey = Object.keys(s.data).find((k) => k.startsWith(`${COMPARE_STORAGE_KEY}-backup-`))
  expect(s.data[backupKey]).toBe('{not json')
})
test('round-trip keeps scores for courses not in the catalog', () => {
  const s = fake()
  let st = setScore(createDefaultCompareStore(), 'MGT 999|gone|ft', 'interesting', 7)
  persistCompareStore(st, s)
  expect(loadCompareStore(s).store.scores['MGT 999|gone|ft']).toEqual({ interesting: 7 })
})
test('persist returns false when storage throws', () => {
  expect(persistCompareStore(createDefaultCompareStore(), { setItem() { throw new Error('quota') } })).toBe(false)
})
test('toggleSelected is per term and keeps scores', () => {
  let st = setScore(createDefaultCompareStore(), 'k', 'useful', 5)
  st = toggleSelected(st, '202609', 'k')
  expect(st.selected).toEqual({ '202609': ['k'] })
  st = toggleSelected(st, '202609', 'k')
  expect(st.selected['202609']).toEqual([])
  expect(st.scores.k).toEqual({ useful: 5 })
})
test('deleteCriterion removes its scores; count first', () => {
  let st = setScore(setScore(createDefaultCompareStore(), 'a', 'useful', 5), 'b', 'useful', 6)
  expect(countScoresForCriterion(st, 'useful')).toBe(2)
  st = deleteCriterion(st, 'useful')
  expect(st.criteria.some((c) => c.id === 'useful')).toBe(false)
  expect(st.scores.a).toBeUndefined()
})
test('professor criterion cannot be deleted or renamed', () => {
  const st = createDefaultCompareStore()
  expect(deleteCriterion(st, 'professor')).toBe(st)
  expect(renameCriterion(st, 'professor', 'Prof').store).toBe(st)
})
test('addCriterion rejects empty and duplicate names', () => {
  const st = createDefaultCompareStore()
  expect(addCriterion(st, '  ').error).toBe('empty')
  expect(addCriterion(st, 'useful').error).toBe('duplicate')
  expect(addCriterion(st, ' Networking ').store.criteria.at(-1)).toMatchObject({ name: 'Networking', weight: 5, kind: 'manual' })
})
test('normalize drops out-of-range scores and restores missing professor criterion', () => {
  const raw = { version: 1, criteria: [{ id: 'x', name: 'X', weight: 5, kind: 'manual' }], selected: {}, scores: { k: { x: 11, y: 4 } }, notes: {}, professors: {} }
  const { store } = loadCompareStore(fake({ [COMPARE_STORAGE_KEY]: JSON.stringify(raw) }))
  expect(store.scores.k).toEqual({ y: 4 })
  expect(store.criteria.filter((c) => c.kind === 'professor')).toHaveLength(1)
})
```

- [ ] **Step 2: Run** `npm test` — expected FAIL.
- [ ] **Step 3: Implement** `src/lib/compareStorage.js`. Follow the style of `src/lib/planStorage.js`.
- [ ] **Step 4: Run** `npm test` — expected PASS.
- [ ] **Step 5: Commit** — `feat(compare): localStorage store with backup on corruption`

---

### Task 4: Excel export

**Files:**
- Modify: `package.json` (add `exceljs` ^4 as dependency)
- Create: `src/lib/compareExport.js`, `src/lib/compareExport.test.js`

**Interfaces:**
- Consumes: `CourseGroup` (Task 1), `computeCourseScore`, `professorValue`, `weightShares`, `scoreColor` (Task 2), `CompareStore` (Task 3), `formatSessionLabel` (`src/lib/sessionDisplay.js`).
- Produces:
  - `buildRankingSheet({ groups, store }) -> { header: string[], weightsRow: (string|number|null)[], rows: (string|number|null)[][] }` — `groups` = the selected groups for the term. Columns: `Rank, Course number, Title, Professor(s), Session, Units, Requirement tags`, then one per **manual** criterion (criterion name), then `Professor rating`, `Score`, `Note`. `weightsRow`: `'Weight'` in column 1, the criterion's share as a whole-number percent under each criterion column and under `Professor rating`, `null` elsewhere. Rows sorted by score desc (nulls last), Rank 1..n. Professors joined `'; '`, tags `', '`, sessions via `formatSessionLabel` joined `', '`. Missing values → `null`.
  - `buildProfessorsSheet(store) -> { header: ['Professor','Rating','Note'], rows }` — only professors with a rating or note; sorted by rating desc (unrated last), then name; missing rating → `null`, missing note → `''`.
  - `exportFileName(termLabel) -> string` — `'Fall 2026'` → `'compare-courses-fall-2026.xlsx'`.
  - `downloadCompareWorkbook({ groups, store, termLabel }) -> Promise<void>` — `const ExcelJS = (await import('exceljs')).default`; two sheets "Ranking" and "Professors"; bold header; weights row italic; criterion, Professor rating, and Score cells filled with `scoreColor` (ARGB `'FF' + hex`); notes as plain string values; trigger download via `Blob` + temporary `<a download>`.

- [ ] **Step 1: Write failing tests** for the three pure functions:

```js
test('ranking columns, weights row, sort, verbatim notes', () => {
  const { header, weightsRow, rows } = buildRankingSheet({ groups: [gA, gB], store })
  expect(header).toEqual(['Rank', 'Course number', 'Title', 'Professor(s)', 'Session', 'Units', 'Requirement tags', 'Interesting', 'Useful', 'Professor rating', 'Score', 'Note'])
  expect(weightsRow[0]).toBe('Weight')
  expect(weightsRow.slice(7, 10)).toEqual([33, 33, 33])
  expect(rows[0][0]).toBe(1)
  expect(rows[0][10]).toBeGreaterThanOrEqual(rows[1][10] ?? -1)
  expect(rows.find((r) => r[1] === gA.courseNumber)[11]).toBe('=SUM(A1)\nline two "quoted" 🎓')
})
test('professors sheet lists only rated or noted professors', () => {
  expect(buildProfessorsSheet(storeWithProfs).rows).toEqual([['B', 9, ''], ['A', 4, 'great'], ['C', null, 'tbd']])
})
test('file name', () => {
  expect(exportFileName('Spring 2027')).toBe('compare-courses-spring-2027.xlsx')
})
```

Fixtures: two groups and a store built with Task 3 updaters (gA note set to the odd text above).

- [ ] **Step 2: Run** `npm test` — expected FAIL.
- [ ] **Step 3: Install** `npm install exceljs@^4` and **implement** `src/lib/compareExport.js`.
- [ ] **Step 4: Run** `npm test` — PASS. Run `npm run build` — PASS, and the output lists a separate chunk containing exceljs (the main `index-*.js` size grows by no more than a few kB versus before the task).
- [ ] **Step 5: Commit** — `feat(compare): Excel export builders + lazy ExcelJS`

---

### Task 5: Navigation, store hook, course selection

**Files:**
- Create: `src/components/compare/useCompareStore.js`, `src/components/compare/CompareView.jsx`
- Modify: `src/App.jsx`, `src/components/MobileBottomNav.jsx`, `src/components/CourseBrowser.jsx`, `src/components/CourseRow.jsx`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `useCompareStore() -> { store, update(fn: (store) => store), saveFailed: boolean, recovered: boolean }` — initial `loadCompareStore()`; `update` applies `fn`, sets state, calls `persistCompareStore`, sets `saveFailed` from its result. Listens to `window` `storage` events for `COMPARE_STORAGE_KEY` and reloads.
  - `CompareView({ courses, terms, termCode, onTermChange, fallYear, springYear, variant: 'desktop' | 'mobile' })` — calls `useCompareStore`. Desktop renders the planner's two-column grid (`lg:grid-cols-[22rem_minmax(0,1fr)]`, same borders as `App.jsx`): left `CourseBrowser mode="compare"`, right the comparison section. Mobile owns `mobileStep: 'table' | 'add'`.
  - `CourseBrowser` new optional props: `mode = 'plan' | 'compare'`, `compareSelectedKeys: Set<string>`, `onToggleCompareKey(key)`. In `compare` mode: after filtering, keep the first section per `courseGroupKey` (pagination counts groups); skip conflict computation; subtitle reads `… · N selected`.
  - `CourseRow` new optional props: `selectionMode = 'plan' | 'compare'`. In `compare` mode: render a checkbox **outside** the expand `<button>` (sibling at the row's left, not nested), labelled with the course number; no "Add to plan" button, no "In plan"/"Conflict" pills; selected rows use `IN_PLAN_SURFACE`.

- [ ] **Step 1: App view switch.** In `App.jsx` add `const [view, setView] = useState('planner')`. Desktop header (`lg:` only): two page tabs **Planner · Compare courses** under the title block on the left (replacing nothing; white text, active tab underlined/bold, inactive `text-yale-200`). Nothing new is added next to `ContactMenu`. When `view === 'compare'`, render `<CompareView variant="desktop" …/>` in place of the desktop `<main>` grid and hide `PlansMenu`. The planner's state stays mounted in `App` so switching back loses nothing. The term state (`catalogTermCode`) is shared by both views.
- [ ] **Step 2: Mobile tab.** `MobileBottomNav`: add `{ id: 'compare', label: 'Compare' }`, `grid-cols-4`. In `App.jsx`, `mobileTab === 'compare'` renders `CompareView`.
- [ ] **Step 3: `useCompareStore` + `CompareView` layout.** Desktop: left sidebar `CourseBrowser mode="compare"`; right side a placeholder section (filled in Task 6). Ticking on the left updates the right immediately. Mobile: `mobileStep === 'add'` shows `CourseBrowser mode="compare" fullHeight` with a **Done** button pinned above the bottom nav; `'table'` shows the right-side content with an **"+ Add courses"** button. If `recovered`, show once: "Your saved comparison couldn't be read. A backup was kept in this browser." with a Dismiss button.
- [ ] **Step 4: Verify in the browser** (`preview_start`, then snapshots/clicks):
  - Planner view looks and behaves exactly as before (add to plan, calendar, plans menu).
  - Compare view: same two-column frame as the planner; the Plans button is hidden; MGT 416 in Spring shows 10 rows; the tick works from the collapsed row; filters and search work; the subtitle shows "N selected".
  - Switch term: selection is per term.
  - Reload: selection persists.
  - **Two tabs:** tick a course in tab B, then tick a different one in tab A. Both stay ticked after reloading either tab.
  - Mobile preset: the Compare tab exists; "+ Add courses" opens the catalog with ticks; Done returns to the table.
- [ ] **Step 5: Run** `npm test && npm run build` — PASS. **Commit** — `feat(compare): navigation + course selection step`

---

### Task 6: Comparison table

**Files:**
- Create: `src/components/compare/CompareTable.jsx`, `ScoreInput.jsx`, `ProfessorCell.jsx`, `NotePopover.jsx`, `CourseDetailModal.jsx`
- Modify: `src/components/compare/CompareView.jsx`

**Interfaces:**
- Consumes: Tasks 1–3, 5. `CalendarCourseDetail` (`src/components/CalendarCourseBlock.jsx`), `RequirementTag`.
- Produces: `CompareTable({ groups, store, update, onOpenDetails(group) })`; `ScoreInput({ value, onCommit(value|null), ariaLabel, rowIndex, colIndex })`.

- [ ] **Step 1: Right-side section.** `SectionHeader tone="calendar" title="Compare courses"` with **Set up** (opens Task 7 panel; stub for now) and **Export** (wired in Task 8) as children, styled like the "Set targets" button in `TagUnitTracker.jsx`. With no selected courses, show only: "Tick courses on the left to compare them." (mobile: "Add courses to compare them."). Under the table: "Saved in this browser only." (red "Couldn't save — export to Excel to keep a copy." when `saveFailed`).
- [ ] **Step 2: Table.** Columns per spec §5.3: Course (number + title as a button opening `CourseDetailModal`; `RequirementTag` badges; note icon, filled when a note exists, opening `NotePopover`), one column per **manual** criterion, Professor, Score. Score shows one decimal, colored by `scoreColor`; partial (`complete === false`) uses a muted style (e.g. `opacity-60`); null shows "—". On mobile, the table scrolls horizontally with a sticky first column.
- [ ] **Step 3: `ScoreInput`.** A text input styled as a cell (`inputMode="numeric"`, background `scoreColor(value)`). On change: `parseScoreInput` → number → commit; null → commit clear; undefined → show text in red, don't commit; on blur revert to the stored value. Arrow Up/Down move focus to the same column in the previous/next row (`data-row`/`data-col` attributes); Tab works natively.
- [ ] **Step 4: Sorting + frozen order.** Header buttons; default `score` desc; click same header to reverse; arrow only on the active column. Sort keys: `course` (number), each criterion id, `professor` (professorValue), `score`. Use `sortRows` then `orderRowKeys`: capture `frozenKeys` on table `focusin` (if null) and clear on `focusout` when `relatedTarget` is outside the table; clicking a header also clears it.
- [ ] **Step 5: `ProfessorCell`.** Shows the first professor name and "+N" when more, plus a rating cell showing `professorValue`. Click opens a portaled popover listing each of the group's professors with a `ScoreInput` (via `setProfessorRating`) and a one-line note input (`setProfessorNote`). Close on outside click or Escape.
- [ ] **Step 6: `NotePopover`** — a textarea saving on change via `setNote`; portaled; closes on outside click/Escape. **`CourseDetailModal`** — centered dialog (bottom sheet under `md`): `CalendarCourseDetail` for the first section; if multiple sections, a compact list "Section · days time · professor" for each; if `unitVariants.length > 1`, a line listing the variants. Close on Escape/backdrop.
- [ ] **Step 7: Verify in the browser:**
  - Score a row with Tab: the row stays put while typing and re-sorts when you click outside the table.
  - Bad inputs ("0", "11", "abc") show red and revert on blur.
  - A professor rating appears on every course that professor teaches.
  - The note icon fills when a note exists, and the note persists after reload.
  - Header sorting and reversing work, with empties last.
  - Details open for MGT 403 and list its sections.
  - Mobile: the table scrolls with the Course column pinned.
- [ ] **Step 8: Run** `npm test && npm run build` — PASS. **Commit** — `feat(compare): comparison table`

---

### Task 7: Set up panel

**Files:**
- Create: `src/components/compare/SetupPanel.jsx`
- Modify: `src/components/compare/CompareView.jsx`

**Interfaces:**
- Consumes: Task 3 updaters, `weightShares` (Task 2), `uniqueProfessors` (Task 1), `ScoreInput` (Task 6).
- Produces: `SetupPanel({ open, onClose, store, update, allCourses, comparedProfessors: string[] })`.

- [ ] **Step 1: Panel shell.** A right-side drawer like the existing Filters drawer in `CourseBrowser.jsx` (backdrop, Escape closes), with two tabs: **Criteria** and **Professors**.
- [ ] **Step 2: Criteria tab.** One row per criterion: name (inline editable for manual criteria, showing `renameCriterion` errors in place), a 0–10 range slider, and its percent from `weightShares`. A delete button on manual criteria opens `window.confirm(\`Delete '${name}'? This removes ${n} scores.\`)` (or `This removes no scores.` when n is 0). An "Add criterion" input + button showing `addCriterion` errors. The Professor row has no delete button and a non-editable name.
- [ ] **Step 3: Professors tab.** A search box, then `comparedProfessors` (sorted) followed by the rest of `uniqueProfessors(allCourses)`, each with a `ScoreInput` and a note input. The two groups are visually separated by a thin divider, with no heading text.
- [ ] **Step 4: Verify in the browser:**
  - Weights 2/3/5 show 20%/30%/50%.
  - Setting Professor's weight to 0 removes its effect on scores.
  - Deleting a criterion shows the right count and removes its column.
  - Renaming keeps scores.
  - Professor ratings sync both ways with the table cell.
  - Search filters the list.
- [ ] **Step 5: Run** `npm test && npm run build` — PASS. **Commit** — `feat(compare): set up panel`

---

### Task 8: Wire export, final check, docs

**Files:**
- Modify: `src/components/compare/CompareView.jsx`, `docs/PROJECT_STATUS.md`, `AGENTS.md`, `docs/PRD.md`

- [ ] **Step 1: Export button** calls `downloadCompareWorkbook({ groups: selectedGroupsForTerm, store, termLabel })`. The button is disabled with label "Exporting…" while running.
- [ ] **Step 2: Verify the export.** Export in the browser, then open the file with a short Node script using ExcelJS (in the scratchpad, not the repo). Check: two sheets; headers per Task 4; weights row present; a note with a newline and a leading `=` came through as text; fills present on score cells. Confirm in the network panel that the exceljs chunk loads only after clicking Export.
- [ ] **Step 3: Full regression pass in the browser.** Planner: add/remove courses, calendar, conflicts, saved plans, requirement tracker, mobile tabs. Compare: the whole flow on desktop and the mobile preset. The console has no errors.
- [ ] **Step 4: Docs.**
  - `docs/PROJECT_STATUS.md`: a new "Compare Courses" section.
  - `AGENTS.md`: a Current focus row, plus Key code locations rows for `src/lib/compare*.js` and `src/components/compare/`, and the `npm test` command.
  - `docs/PRD.md`: a new §7.7 Compare Courses (short, linking the spec), and a note under §3 that private professor ratings exist.
- [ ] **Step 5: Run** `npm test && npm run build` — PASS. **Commit** — `feat(compare): export button + docs`
