# Deploy to Vercel

One-time setup. After this, every push to `main` on GitHub redeploys automatically.

## What you need

- GitHub repo: `benjaminpascu/yale-som-course-planner` (already pushed)
- A [Vercel](https://vercel.com) account (sign in with GitHub)

No database and no environment variables: course data is the CSVs in `docs/data-samples/`, bundled into the build.

---

## 1. Import the project

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → choose `benjaminpascu/yale-som-course-planner`.
3. On **Configure Project**, Vercel should detect **Vite** with:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install` (default)

Leave these as-is unless Vercel shows something different.

---

## 2. Deploy

1. Click **Deploy**.
2. Wait ~1–2 minutes. Open the `.vercel.app` URL Vercel gives you.

---

## 3. Smoke test

On the live URL:

- Page loads without a red error screen
- Course catalog shows hundreds of courses (not empty)
- Add a course → appears in **Your plan** and on the calendar (if timed)
- **Saved plans** → save a name → refresh → plan still there

---

## 4. Share the link

- Production URL: `https://your-project.vercel.app` (or a custom domain under **Settings → Domains**)
- Send that URL to friends; no `npm run dev` needed on their side

---

## Updating the live site

1. Push to `main` on GitHub (or merge a PR).
2. Vercel rebuilds automatically.

Course data changes: edit the CSV in `docs/data-samples/`, commit, and push — same as a code change.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Vercel | Open the failed deployment log; usually a missing dependency or build error. Run `npm run build` locally first. |
| Blank catalog / "Could not load data" | A CSV is missing a required column (see `src/lib/csvColumns.js`); the error names it. Fix the CSV and push. |
| Old UI after push | Hard refresh (Cmd+Shift+R) or check Vercel deployment finished. |

---

## Optional: deploy from terminal

If you prefer CLI (after `npm i -g vercel` and `vercel login`):

```bash
cd "/Users/benjaminpascu/Documents/Cursor/Course planner"
vercel --prod
```

Link the project to the same Git repo when prompted, or use the dashboard import above (easier for first time).
