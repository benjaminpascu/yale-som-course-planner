---
name: next
description: List what's open (GitHub issues, preview links waiting to ship), ask the user what to prioritize, and start it the project's way — spec first for features, then build, test and ship. Use when the user types /next or asks "what's next?". Optional argument: an issue number to start directly (e.g. /next 3).
---

# /next — start the next item

The user is a non-technical student. Keep it short and in plain words.

## 1. Get up to speed

Read `AGENTS.md` (the workflow there is the rulebook) and `docs/PROJECT_STATUS.md`.

## 2. Find what's open

```bash
gh pr list --state open --json number,title,headRefName,url
gh issue list --state open --limit 50 --json number,title,labels,url
ls docs/specs 2>/dev/null
```

If an issue number was passed (e.g. `/next 3`), skip to step 4 with that issue.

## 3. Ask what to prioritize

The user decides the priority; don't pick for them.

Show a short list of what's open, one line each (number + title), grouped:

- **Waiting for "ship it"**: open pull requests from `feature/` branches, with their preview link.
- **Bugs** (label `bug`).
- **Started**: roadmap items with a spec in `docs/specs/`.
- **Roadmap**: other open issues.

Then ask **what they want to prioritize** (AskUserQuestion; the open items as options, and they can type something new instead). Don't start until they choose. If nothing is open, say so and ask what they'd like to work on.

## 4. Do it the project's way

Follow the `AGENTS.md` workflow for the chosen item:

- **New feature / roadmap item**: brainstorm the full spec with the user first (step 4), save it to `docs/specs/<feature>.md`, comment the link on the issue, and wait for approval before writing code. Then build, test, and ship on a `feature/` branch with a pull request and a preview link (step 5), and wait for "ship it".
- **Bug / small fix**: fix it, run the checks (step 5), and push straight to `main`.

Write `Closes #<number>` in the commit message or pull request so the issue closes when it goes live. After it's live, update `docs/PROJECT_STATUS.md` (and the Current focus table in `AGENTS.md` for features).
