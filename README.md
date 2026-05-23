# Yale SOM Course Planner

Student-run web app for browsing Yale SOM courses, building a weekly schedule, and tracking requirement-tag units.

## For humans

1. Copy `.env.example` → `.env` and add Supabase keys (optional for local-only dev).
2. `npm install && npm run dev`
3. See [docs/supabase-setup.md](docs/supabase-setup.md) for database setup.
4. See [docs/vercel-setup.md](docs/vercel-setup.md) to deploy on Vercel.

## For Cursor agents (new chat)

**Start here:**

1. [AGENTS.md](AGENTS.md) — workflow, current milestone, key paths  
2. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — what’s done / what’s next  
3. [docs/PRD.md](docs/PRD.md) — full product spec  

Use a **new Cursor agent** (fresh chat) per milestone or focused task — see PRD §12.

## Data files

| File | Role |
|------|------|
| `docs/data-samples/courses_master_new.csv` | Course catalog (source of truth) |
| `docs/data-samples/course_tags.csv` | Requirement tag mappings |

## License

MIT (planned — see PRD handoff section).
