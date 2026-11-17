# Spec: Non-SOM Units

Status: **approved and built** (Nov 16, 2026) · Version **1.3.0** · Branch `feature/non-som-units` → `release/1.3`

## Why

Student feedback: courses from other Yale schools counted 0 units in
Requirements, so their Semester and Year Totals were wrong. How a course
converts depends on the school (a student said Yale College courses count as 2
for them; the registrar says Law units convert 1 to 1, see
`docs/registrar-rules.md`), and Yale's course feed has no credit numbers for
other schools. So each student sets the number themselves.

## Goals

- A student says how many SOM units one course from another school counts:
  one number for all schools, and an optional number per school.
- Those numbers add to the **Semester Total** and **Year Total** in Requirements.
- Easy to find exactly when it matters, and easy to change later.
- Same in Single plan and Compare plans.

## Non-goals (this version)

- No per-course number (every course from a school counts the same; e.g. a
  half-credit Yale College course still counts the school's full number).
- Non-SOM courses still add nothing to requirement tags (STEM, GBS Req, …): they
  have no tags.
- Units are still not shown on non-SOM course rows, details or calendar blocks.
- Your Plan and saved-plan summaries still count non-SOM courses as 0.
- Not part of plan Export / Import.

## Anti-goals

- Hiding it inside Select Requirements: that window picks which lines show and
  their targets; this one changes what a course is worth. Different jobs.
- A setting nobody understands (an unlabeled "By school" dropdown was tried and dropped).
- Guessing a conversion for the student.

## Approaches considered

1. **Per course** (a units box on each non-SOM course in Your Plan). Dropped by
   the user: hidden in the plan, not where students think about units.
2. **Inside Select Requirements**, "Each course counts" / "All schools" plus a
   "By school" dropdown (built and tried on localhost). Dropped: it isn't a
   requirement, and nobody would know what "By school" does.
3. **Chosen: its own Non-SOM Units button and window in the Requirements bar**,
   listing only the schools in the plan.

## What the student sees

Requirements bar, only when the plan on screen has a course from another school
(any semester, since Year Total counts it too):

```
Requirements · Spring 2027    [⚠ Non-SOM Units]  [Select Requirements]   ← amber while one counts 0
Requirements · Spring 2027    [Non-SOM Units]    [Select Requirements]   ← normal once all count more
```

The amber button replaces the old "Non-SOM courses count as 0 units" note. Its
hover: "Courses from other schools count as 0 units until you set how many they
count for you."

Clicking it opens a small window:

```
┌ Non-SOM Units ────────────────────────┐
│ How many SOM units one course from    │
│ each school counts for you. Check     │
│ with the registrar.                   │
│ All schools                [ 0 ] units│
│   Yale College             [ 2 ] units│
│   Jackson School of…       [ 0 ] units│   ← blank box shows All schools in grey
│                        Cancel   Save  │
└───────────────────────────────────────┘
```

- One line per school in the plan on screen (Compare plans: both plans), in
  School picker order.
- A blank school box uses the All schools number. Zero is allowed. Numbers for
  schools not listed are kept.
- Shared by every plan, like Select Requirements (saved in this browser).
- Phones: same button and window (mobile is deprioritized; it just needs to work).

## Data

Saved with the requirement settings (`yale-som-course-planner-requirements` in
localStorage) as `nonSom: { units, bySchool: { <school code>: units } }`.
`countedUnits` / `withNonSomUnits` in `src/lib/requirementSettings.js` apply it
before the Totals are added up. UI: `NonSomUnitsModal.jsx`, button in
`TagUnitTracker.jsx`.

## Release

Part of **1.3.0** on `release/1.3`; goes live with the release when the user says ship it.

## Left to the builder

Nothing open.
