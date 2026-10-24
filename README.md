# Yale SOM Course Planner

Student-run web app for browsing Yale SOM courses, building a weekly schedule, and tracking requirement-tag units.

## For humans

1. `npm install && npm run dev` (no database or environment variables needed)
2. See [docs/vercel-setup.md](docs/vercel-setup.md) to deploy on Vercel.

## For Cursor agents (new chat)

**Start here:**

1. [AGENTS.md](AGENTS.md) — workflow, current milestone, key paths  
2. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — what’s done / what’s next  
3. [docs/PRD.md](docs/PRD.md) — full product spec  

Use a **new Cursor agent** (fresh chat) per milestone or focused task — see PRD §12.

## Data files

| File | Role |
|------|------|
| `docs/data-samples/courses_master_fall2026.csv` | Fall 2026 catalog + inline `tags` column (source of truth) |
| `docs/data-samples/courses_master_spring2027.csv` | Spring 2027 catalog, same columns (source of truth) |

The CSVs are bundled into the app at build time. To update courses, edit a CSV and push to `main`; Vercel redeploys.

## License

MIT (planned — see PRD handoff section).
