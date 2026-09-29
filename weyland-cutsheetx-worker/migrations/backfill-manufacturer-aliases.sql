-- Backfill manufacturer_aliases for 16 real manufacturers that have real
-- product_variants pricing data but zero alias coverage, added 2026-09-29.
--
-- resolveCataloguePrices() (src/lib/pricing.js) does:
--   const mfrId = aliasMap[String(c.manufacturer || "").toUpperCase().trim()] || null;
--   if (!mfrId) continue;
-- No alias row means that manufacturer's components can NEVER resolve a
-- price, no matter how good the model-number match would otherwise be -
-- confirmed live: 15 of 40 real manufacturers had alias coverage before
-- this migration, the other 25 didn't (16 of those 25 have real product
-- data; the other 9 are zero-product duplicate manufacturer rows, left
-- alone here - a separate data-hygiene issue, not a pricing blocker).
--
-- SAR/SARGENT/SGT, PEM/PEMKO, TRI/TRIMCO are not new abbreviations - they
-- were already hardcoded in pricing.js's own MFR_CODE_MAP constant (the
-- fallback path's in-memory manufacturer-code table) but had never been
-- synced into this D1 table, which is what the PRIMARY resolveCataloguePrices
-- path actually queries. The other 13 (electrical/plumbing trade, real but
-- small - 1-3 products each per MULTI_TRADE_BID_SUPPORT.md's documented
-- early state) get their own real name and common short form as aliases -
-- no fabricated industry codes, just name variants a real extraction would
-- plausibly produce.
INSERT INTO manufacturer_aliases (alias, manufacturer_id, source, created_at) VALUES
  ('SAR', 'mfr-sargent', 'industry_standard', datetime('now')),
  ('SARGENT', 'mfr-sargent', 'industry_standard', datetime('now')),
  ('SGT', 'mfr-sargent', 'industry_standard', datetime('now')),
  ('PEM', 'mfr-pemko', 'industry_standard', datetime('now')),
  ('PEMKO', 'mfr-pemko', 'industry_standard', datetime('now')),
  ('TRI', 'mfr-trimco', 'industry_standard', datetime('now')),
  ('TRIMCO', 'mfr-trimco', 'industry_standard', datetime('now')),
  ('SQUARE D', 'mfr-squared', 'industry_standard', datetime('now')),
  ('SQUARED', 'mfr-squared', 'industry_standard', datetime('now')),
  ('SCHNEIDER ELECTRIC', 'mfr-squared', 'industry_standard', datetime('now')),
  ('EATON', 'mfr-eaton', 'industry_standard', datetime('now')),
  ('KOHLER', 'mfr-kohler', 'industry_standard', datetime('now')),
  ('SLOAN', 'mfr-sloan', 'industry_standard', datetime('now')),
  ('SLOAN VALVE', 'mfr-sloan', 'industry_standard', datetime('now')),
  ('ZURN', 'mfr-zurn', 'industry_standard', datetime('now')),
  ('WATTS', 'mfr-watts', 'industry_standard', datetime('now')),
  ('LEVITON', 'mfr-leviton', 'industry_standard', datetime('now')),
  ('LUTRON', 'mfr-lutron', 'industry_standard', datetime('now')),
  ('MOEN', 'mfr-moen', 'industry_standard', datetime('now')),
  ('AMERICAN STANDARD', 'mfr-americanstandard', 'industry_standard', datetime('now')),
  ('AMSTD', 'mfr-americanstandard', 'industry_standard', datetime('now')),
  ('BRADLEY', 'mfr-bradley', 'industry_standard', datetime('now')),
  ('AO SMITH', 'mfr-aosmith', 'industry_standard', datetime('now')),
  ('A.O. SMITH', 'mfr-aosmith', 'industry_standard', datetime('now')),
  ('HUBBELL', 'mfr-hubbell', 'industry_standard', datetime('now'));
