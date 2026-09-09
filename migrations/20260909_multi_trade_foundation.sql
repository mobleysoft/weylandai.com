-- Multi-trade bid support: shared foundation.
-- See MULTI_TRADE_BID_SUPPORT.md for the design this implements.
--
-- Real finding this migration acts on: `products`/`manufacturers` are already
-- structurally trade-agnostic (category_level_1/2/3, manufacturer_id, no
-- door-specific columns) -- they don't need to be replaced, just tagged.
-- Every existing row is door hardware in practice (verified: all 27
-- manufacturers, all 42 categorized products are door/hardware brands), so
-- backfilling trade='doors' is a correct, lossless default, not a guess.

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned')),
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO trades (id, slug, display_name, status) VALUES
  ('trade-doors', 'doors', 'Doors & Hardware', 'active'),
  ('trade-plumbing', 'plumbing', 'Plumbing', 'active'),
  ('trade-electrical', 'electrical', 'Electrical', 'active');

ALTER TABLE manufacturers ADD COLUMN trade TEXT NOT NULL DEFAULT 'doors';
ALTER TABLE products ADD COLUMN trade TEXT NOT NULL DEFAULT 'doors';

CREATE INDEX IF NOT EXISTS idx_manufacturers_trade ON manufacturers(trade);
CREATE INDEX IF NOT EXISTS idx_products_trade ON products(trade);

-- Generalized schedule tables for new trades to build against. Doors keeps
-- its existing door_entries/door_schedule_entries/door_hardware_matrix
-- tables as-is (reference implementation, no regression) -- these are for
-- plumbing/electrical (and any future trade) going forward, per the
-- "sit alongside, don't migrate doors" option chosen in
-- MULTI_TRADE_BID_SUPPORT.md.

CREATE TABLE IF NOT EXISTS schedule_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id TEXT,
  trade TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  mark TEXT NOT NULL,
  entry_type TEXT,
  spec_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  extraction_confidence REAL,
  validated INTEGER DEFAULT 0,
  validated_by TEXT,
  validated_at TEXT,
  validation_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_session ON schedule_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_trade ON schedule_entries(trade);

CREATE TABLE IF NOT EXISTS schedule_line_item_matches (
  id TEXT PRIMARY KEY,
  schedule_entry_id TEXT NOT NULL,
  product_id TEXT,
  match_confidence REAL,
  match_type TEXT,
  verified BOOLEAN DEFAULT 0,
  verified_at TEXT,
  verified_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_entry_id) REFERENCES schedule_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_line_item_matches_entry ON schedule_line_item_matches(schedule_entry_id);
