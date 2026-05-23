-- Yale SOM Course Planner — initial schema (Milestone 2)

CREATE TABLE courses (
  course_id TEXT PRIMARY KEY,
  course_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  units NUMERIC NOT NULL DEFAULT 0,
  term_code TEXT NOT NULL,
  session TEXT NOT NULL,
  session_start DATE,
  session_end DATE,
  category TEXT,
  course_type TEXT[] NOT NULL DEFAULT '{}',
  bid_or_permission TEXT,
  faculty_name TEXT,
  faculty_email TEXT,
  room TEXT,
  section TEXT,
  syllabus_url TEXT,
  meeting_days TEXT[] NOT NULL DEFAULT '{}',
  start_time TEXT,
  end_time TEXT,
  visible BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  course_number TEXT NOT NULL,
  tag_code TEXT NOT NULL,
  tag_label TEXT NOT NULL,
  UNIQUE (course_number, tag_code)
);

CREATE INDEX idx_courses_term_code ON courses (term_code);
CREATE INDEX idx_courses_session ON courses (session);
CREATE INDEX idx_courses_course_number ON courses (course_number);
CREATE INDEX idx_tags_course_number ON tags (course_number);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Public read tags"
  ON tags FOR SELECT
  USING (true);
