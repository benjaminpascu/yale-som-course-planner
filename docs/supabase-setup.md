# Supabase setup (Milestone 2)

Use this once per project (or when handing off to a new maintainer).

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) (use the shared student-gov email from the PRD if you have one).
2. **New project** → pick a name and database password → wait for provisioning.

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Run `supabase/migrations/002_api_grants.sql` if needed (permission errors on import).
4. Run `supabase/migrations/003_inline_course_tags.sql` (adds `courses.tags`, drops the old separate `tags` table).
5. Confirm **Table Editor** shows `courses` with a `tags` column.

## 3. API keys

1. **Project Settings → API**
2. Copy **Project URL** and **anon public** key (for the web app).
3. Copy **service_role** key (for import script only — never put this in the frontend).

## 4. Local environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 5. Import sample data

```bash
npm run import:data
```

You should see a count for ~227 Fall 2026 courses (from `courses_master_fall2026.csv`). Tags are stored on each course row.

## 6. Run the app against Supabase

```bash
npm run dev
```

Open http://localhost:5173. The header should say **Data source: Supabase** (not “Local sample CSVs”).

## Semester workflow (later)

1. Export a new courses CSV from SOM for the term (include a `tags` column: semicolon-separated names, or empty).
2. Replace `docs/data-samples/courses_master_fall2026.csv` (or point the import script at the new file).
3. Re-run `npm run import:data` (this replaces the courses table, including tags).
4. No separate tags table — edit tags only in the CSV (or the `tags` column in Table Editor if needed).
