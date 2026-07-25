-- Inline requirement tags on courses; drop separate tags table (July 2026).

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "Public read tags" ON tags;

DROP TABLE IF EXISTS tags;
