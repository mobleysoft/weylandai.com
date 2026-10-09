-- Additive repair for the existing /api/hardware-schedule/extract workflow.
CREATE TABLE IF NOT EXISTS hardware_extraction_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  submittal_id TEXT,
  project_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_buffer_key TEXT NOT NULL,
  total_sets INTEGER NOT NULL CHECK (total_sets >= 0),
  sets_approved INTEGER NOT NULL DEFAULT 0 CHECK (sets_approved >= 0),
  sets_rejected INTEGER NOT NULL DEFAULT 0 CHECK (sets_rejected >= 0),
  status TEXT NOT NULL CHECK (status IN ('processing', 'pending_review', 'approved', 'rejected', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hardware_extraction_jobs_user_created
  ON hardware_extraction_jobs (user_id, created_at);
