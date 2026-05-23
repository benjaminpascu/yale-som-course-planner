# Deploy to Vercel

One-time setup. After this, every push to `main` on GitHub redeploys automatically.

## What you need

- GitHub repo: `benjaminpascu/yale-som-course-planner` (already pushed)
- A [Vercel](https://vercel.com) account (sign in with GitHub)
- Supabase **Project URL** and **anon public** key (same as local `.env` — see [supabase-setup.md](./supabase-setup.md))

You do **not** put `SUPABASE_SERVICE_ROLE_KEY` on Vercel (import script only, runs on your laptop).

---

## 1. Import the project

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → choose `benjaminpascu/yale-som-course-planner`.
3. On **Configure Project**, Vercel should detect **Vite** with:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install` (default)

Leave these as-is unless Vercel shows something different.

4. **Do not click Deploy yet** — add environment variables first (step 2).

---

## 2. Environment variables

Still on the import screen (or later: Project → **Settings** → **Environment Variables**):

| Name | Value | Environments |
|------|--------|----------------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` from Supabase → Settings → API | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | **anon public** key from the same page | Production, Preview, Development |

Copy from your local `.env` if you already run the app against Supabase locally.

**Important:** Names must match exactly (including `VITE_` prefix). Vite only exposes variables that start with `VITE_`.

---

## 3. Deploy

1. Click **Deploy**.
2. Wait ~1–2 minutes. Open the `.vercel.app` URL Vercel gives you.

If the first deploy ran **without** env vars, add them in Settings → Environment Variables, then **Deployments** → ⋮ on latest → **Redeploy**.

---

## 4. Smoke test

On the live URL:

- Page loads without a red error screen
- Course catalog shows hundreds of courses (not empty)
- Add a course → appears in **Your plan** and on the calendar (if timed)
- **Saved plans** → save a name → refresh → plan still there

If the catalog is empty or errors mention Supabase, check env vars and redeploy.

**Without Supabase env vars:** the app still builds and uses bundled CSVs from the repo (~480 courses). Supabase is recommended so you can refresh data via `npm run import:data` without redeploying.

---

## 5. Share the link

- Production URL: `https://your-project.vercel.app` (or a custom domain under **Settings → Domains**)
- Send that URL to friends; no `npm run dev` needed on their side

---

## Updating the live site

1. Push to `main` on GitHub (or merge a PR).
2. Vercel rebuilds automatically.

Course data changes:

1. Update CSV locally → `npm run import:data` (uses service role key on your machine).
2. No Vercel redeploy needed for data-only updates (data lives in Supabase).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Vercel | Open the failed deployment log; usually a missing dependency or build error. Run `npm run build` locally first. |
| Blank catalog / Supabase error | Add or fix `VITE_SUPABASE_*` env vars; redeploy. |
| Old UI after push | Hard refresh (Cmd+Shift+R) or check Vercel deployment finished. |
| RLS / permission errors | Run `supabase/migrations/002_api_grants.sql` in Supabase SQL Editor. |

---

## Optional: deploy from terminal

If you prefer CLI (after `npm i -g vercel` and `vercel login`):

```bash
cd "/Users/benjaminpascu/Documents/Cursor/Course planner"
vercel --prod
```

Link the project to the same Git repo when prompted, or use the dashboard import above (easier for first time).
