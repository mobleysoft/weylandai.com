-- migrations/cut-sheet-misses.sql (2026-10-04)
--
-- Two small aggregate tables for CutSheetX coverage tracking, applied to
-- the shared weyland_db with:
--   npx wrangler d1 execute weyland_db --remote --file=migrations/cut-sheet-misses.sql
--
-- Additive only: CREATE ... IF NOT EXISTS, no DROP/ALTER/DELETE.
--
-- cut_sheet_misses holds ONLY lowercased+trimmed (manufacturer, model)
-- pairs that failed to match, with a hit counter - no user ids, no IPs,
-- no raw pasted text (see src/lib/cut-sheet-misses.js recordMisses).
-- The UNIQUE(manufacturer, model) constraint is what the upsert's
-- ON CONFLICT clause targets.

CREATE TABLE IF NOT EXISTS cut_sheet_misses (
  id TEXT PRIMARY KEY,
  manufacturer TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (manufacturer, model)
);

CREATE INDEX IF NOT EXISTS idx_cut_sheet_misses_count ON cut_sheet_misses (count DESC);

-- Free-text manufacturer requests from POST /api/cut-sheets/request-manufacturer.
-- note is capped at 200 chars by the route; no requester identity stored.
CREATE TABLE IF NOT EXISTS cut_sheet_manufacturer_requests (
  id TEXT PRIMARY KEY,
  manufacturer TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cut_sheet_mfr_requests_mfr ON cut_sheet_manufacturer_requests (manufacturer);
