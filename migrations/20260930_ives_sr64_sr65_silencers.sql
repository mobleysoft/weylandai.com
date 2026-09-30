-- Real, sourced pricing for Ives SR64/SR65 door silencers, found
-- unpriced 2026-09-30 during a deep pass on Ives' remaining pricing
-- gap. Genuinely absent from product_variants for mfr-ives - not a
-- matching bug. Both prices directly fetched (not just search-result
-- snippet) from nationallocksupply.com product pages; SR64 (metal
-- frame) and SR65 (wood frame) show identical regular/sale pricing on
-- their real, independent pages ($0.58/$0.32 per 100-pack) - confirmed
-- by fetching each page separately, not assumed from one page.
-- Requested finish "GRY" (gray rubber) is not a BHMA finish code, so
-- finish_code is '' per this catalogue's own established convention.

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-ives-sr64', 'mfr-ives', 'Door Silencers', 'SR6', 'SR64', 'Ives SR64 Door Silencer', 'Rubber door silencer for hollow metal frames, gray, 100-pack', 'Seals', 'Silencers', 'doors'),
  ('prod-ives-sr65', 'mfr-ives', 'Door Silencers', 'SR6', 'SR65', 'Ives SR65 Door Silencer', 'Rubber door silencer for wood frames, gray, 100-pack', 'Seals', 'Silencers', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-ives-sr64-20260930', 'cat-ives-sr64-20260930.citation', '9fcf0fc4d460f7a795eaf9a4cf498da9a00de1391f2bbdee9988496e6e330066', 0, 0, 'ives', 'Ives SR64 Door Silencer real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/ives-sr64-door-silencer-hollow-metal-gray/', '2026-09-30'),
  ('cat-ives-sr65-20260930', 'cat-ives-sr65-20260930.citation', '6f6ad77ce2c23c7cf026878cd13f6d2c9576575a19deafaa706056a26f92382a', 0, 0, 'ives', 'Ives SR65 Door Silencer real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/ives-sr65-door-silencer-wood-gray/', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-ives-sr64', 'prod-ives-sr64', '', 'SR64', 0.58, 0.32, 'USD', 1, 'Real price per 100-pack, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-ives-sr64-20260930'),
  ('var-ives-sr65', 'prod-ives-sr65', '', 'SR65', 0.58, 0.32, 'USD', 1, 'Real price per 100-pack, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-ives-sr65-20260930');
