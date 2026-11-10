# SOMtimes

Student-run web app for Yale SOM students: browse courses, build a weekly schedule, and track requirement-tag units. Live at [somtimes.vercel.app](https://somtimes.vercel.app).

## For humans

1. `npm install && npm run dev` (no database or environment variables needed)
2. See [docs/vercel-setup.md](docs/vercel-setup.md) to deploy on Vercel.

## For agents (new chat)

**Start here:**

1. [AGENTS.md](AGENTS.md) — workflow, current state, key paths
2. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — what's done / what's next
3. [docs/PRD.md](docs/PRD.md) — full product spec

Use a fresh agent chat per milestone or focused task — see PRD §12.

## Course data

| File | Role |
|------|------|
| `docs/data-samples/courses_master_<term>.csv` | One catalog per semester (e.g. `fall2026`, `spring2027`), with an inline `tags` column |
| `docs/data-samples/course_overrides.csv` | Manual fixes re-applied on every update (normally empty) |

The CSVs are bundled into the app at build time. They update themselves every 6 hours from Yale SOM's course feed, and new semesters appear on their own — see [docs/updating-course-data.md](docs/updating-course-data.md).

## License

MIT (planned — see PRD handoff section).
