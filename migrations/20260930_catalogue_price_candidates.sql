-- Staging/review table for the real, automated price-book extraction
-- pipeline (see .claude/plans/glistening-whistling-fog.md). Rows here
-- are LLM-extracted candidates, never directly trusted - product_variants
-- (the table pricing.js actually serves from) is never written to until
-- a human affirms a row here, mirroring the affirmed/affirmed_by pattern
-- already used for hardware_components and cut_sheet_discoveries'
-- approveDiscovery() gate.

CREATE TABLE catalogue_price_candidates (
  id TEXT PRIMARY KEY,
  catalogue_id TEXT,
  source_url TEXT NOT NULL,
  source_pdf_hash TEXT NOT NULL,
  temp_r2_key TEXT,
  page_number INTEGER,
  manufacturer TEXT,
  trade TEXT NOT NULL DEFAULT 'doors',
  raw_model_text TEXT,
  full_model_number TEXT,
  finish_code TEXT,
  finish_description TEXT,
  list_price DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  price_uom TEXT DEFAULT 'EA',
  extraction_confidence REAL,
  extraction_model TEXT DEFAULT 'qwen3-8b',
  verified_in_source_text INTEGER DEFAULT 0,
  extraction_warnings TEXT,
  affirmed INTEGER DEFAULT 0,
  affirmed_by TEXT,
  affirmed_at TEXT,
  rejected INTEGER DEFAULT 0,
  rejected_reason TEXT,
  product_variant_id TEXT,
  promoted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cpc_catalogue ON catalogue_price_candidates(catalogue_id);
CREATE INDEX idx_cpc_review_queue ON catalogue_price_candidates(affirmed, rejected);
CREATE INDEX idx_cpc_hash ON catalogue_price_candidates(source_pdf_hash);
