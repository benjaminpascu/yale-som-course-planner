# Supabase setup (Milestone 2)

Use this once per project (or when handing off to a new maintainer).

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) (use the shared student-gov email from the PRD if you have one).
2. **New project** → pick a name and database password → wait for provisioning.

## 2. Run the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run it.
3. Confirm **Table Editor** shows `courses` and `tags`.

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

You should see counts for ~482 courses and 172 tags (from `courses_master_new.csv`).

## 6. Run the app against Supabase

```bash
npm run dev
```

Open http://localhost:5173. The header should say **Data source: Supabase** (not “Local sample CSVs”).

## Semester workflow (later)

1. Export a new courses CSV from SOM for the term.
2. Replace or add rows in `docs/data-samples/` (or point the import script at the new file).
3. Refresh tags with `scripts/build_tags.py` if needed, then re-run `npm run import:data`.
4. Tags edited in Supabase Table Editor are preserved unless you overwrite those rows via import.
