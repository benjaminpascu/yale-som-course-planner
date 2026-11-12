# Spec: Updates (patch notes)

Status: **approved** · Nov 2026

## Why

Students come back to SOMtimes and can't tell what changed. An **Updates**
list in the top bar shows each version with explicit notes, starting after
the 1.0.0 launch.

## What students see

- An **Updates** button in the navy top bar, right after **Help**, same style
  (icon only on phones, like Help).
- An orange dot on the button when this browser hasn't seen the newest version.
  Visiting the Updates page clears it; the next version brings it back.
  Remembered in `localStorage` (`yale-som-course-planner-updates-seen`).
- Clicking opens its own page at **`/updates`** (e.g. `somtimes.vercel.app/updates`),
  in the same tab. The top bar stays; the planner is hidden underneath (not reset),
  and **← Back** or the browser's Back button returns to it. The address can be
  shared or opened directly (`vercel.json` serves the app there).
- The page: "← Back", the title "Updates" with the current version on the right
  (e.g. "v1.0.1"), then one card per version, newest first: number and date,
  then one bullet per change.
- 1.0.0 shows as "1.0.0 · Launch" with no bullets.

## Wording

One or two explicit, plain sentences per change, written for students: what
changed, where it is on screen, and how to use it. Not commit-message shorthand.

## Version rules

- Small fixes pushed straight to `main` bump the last number: 1.0.1, 1.0.2, …
  After 1.1 ships, they become 1.1.1, 1.1.2, …
- New features that go through a spec and a preview link bump the middle
  number: 1.1, 1.2, … (e.g. courses from across Yale).
- Behind-the-scenes changes (course data refreshes, docs, workflow) get no
  entry and no new version.
- The newest entry in `src/lib/updates.js` is the site's version;
  `package.json` must match (a test checks it).

## Workflow

Right before every commit and push, the agent bumps the version and adds the
Updates entry (`AGENTS.md` step 5, `/next`).

## Out of scope

Links from an update to the feature, screenshots, and Updates in the tutorial tips.
