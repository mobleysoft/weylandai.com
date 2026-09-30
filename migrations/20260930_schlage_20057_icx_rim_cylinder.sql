-- Real, sourced pricing for Schlage 20-057-ICX FSIC rim cylinder, found
-- unpriced 2026-09-30 while investigating why SCH (Schlage) showed 0%
-- pricing accuracy on several real components. Genuinely absent from
-- the catalogue, not a matching bug. Price fetched directly (not just a
-- search snippet) from nationallocksupply.com, a real current
-- distributor - the same standard already used for the LCN parts.
--
-- "20-740 (LEVEL 9G)" (15 real components, the largest SCH gap) was
-- investigated but left unpriced: it's a real Schlage Primus FSIC core,
-- but Primus cores are sold under many distinct keying-level/keyway
-- SKUs (20-740-XP, 20-740-CP-1001, 20-740-C145, 20-740-XP-LVL9-D145,
-- etc.) at meaningfully different real prices, and the two distributor
-- pages that would confirm a Level-9-specific price (Neobits,
-- absupply.net) block automated fetches - no single number could be
-- confidently cited without guessing a keyway. Left as an honest
-- NOT_FOUND per this repo's own convention (see
-- 20260929_plumbing_electrical_real_pricing.sql's file header).

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-sch-20-057-icx', 'mfr-schlage', 'Primus FSIC', '20-057', '20-057-ICX', 'Schlage 20-057-ICX FSIC Rim Cylinder', 'Full-size interchangeable-core rim cylinder, ICC keyway', 'Cylinders', 'Rim Cylinders', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-sch-20-057-icx-20260930', 'cat-sch-20-057-icx-20260930.citation', 'f742b56fd1c8979ce3cfb9e3b691e5e8adc89b8ace33435c086aedc3b8469850', 0, 0, 'schlage', 'Schlage 20-057-ICX FSIC Rim Cylinder real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/schlage-20-057-fsic-rim-housing-and-core/', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-sch-20-057-icx', 'prod-sch-20-057-icx', '', '20-057-ICX', 227.00, 137.90, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-sch-20-057-icx-20260930');
