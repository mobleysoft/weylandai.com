-- Real bug fixed 2026-10-02: extractDoorScheduleViaEmbeddedGofaineat's
-- INSERT uses ON CONFLICT(session_id, mark) DO UPDATE, but no UNIQUE
-- constraint/index on (session_id, mark) ever existed on this table - every
-- real insert attempt failed silently (caught per-row, incrementing nothing)
-- with "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE
-- constraint". Never surfaced before because every prior real extraction
-- attempt failed earlier in the pipeline (Qwen-bridge-unreachable, Worker
-- memory limit, Worker CPU time limit) before ever reaching this write -
-- this is the first time real parsed door rows made it this far. Confirmed
-- live: 15 real parsed entries, 0 inserted, before this fix.
CREATE UNIQUE INDEX IF NOT EXISTS idx_door_schedule_entries_session_mark
  ON door_schedule_entries(session_id, mark);
