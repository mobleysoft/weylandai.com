-- "SCE" is a door-schedule manufacturer code that was never aliased -
-- every real model under it (653-04 keyswitches, 679-05HM door contacts,
-- CO-200 offline locks, NDEBP6D wireless locks) turned out to be a real
-- Schlage Electronics product, confirmed via WebSearch on each exact
-- model number (not guessed) - likely "Schlage Commercial Electronics"
-- internal schedule shorthand, not a separate manufacturer.
INSERT INTO manufacturer_aliases (alias, manufacturer_id) VALUES ('SCE', 'mfr-schlage');

-- 679-05HM/WD: real Schlage Electronics magnetic door position switch
-- for hollow metal doors, single confirmed SKU (no real config variance
-- found for this specific part). Price directly fetched (not snippet)
-- from nationallocksupply.com.
INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-schlage-679-05hm', 'mfr-schlage', 'Electronics', '679', '679-05HM', 'Schlage Electronics 679-05HM Door Position Switch', 'Concealed SPDT magnetic door position switch for hollow metal doors', 'Access Control', 'Door Contacts', 'doors');

-- NDEBP6D: real Schlage ENGAGE wireless cylindrical lock. trudoor.com's
-- product page lists one price applicable across its RHO/ATH/LAT/SPA
-- lever and 643e/619 finish options (confirmed by direct fetch, not a
-- per-lever/per-finish price split), matching this component's real
-- requested lever (RHO) and finish (643E/619).
INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-schlage-ndebp6d', 'mfr-schlage', 'ENGAGE Wireless', 'NDEBP', 'NDEBP6D', 'Schlage NDEBP6D Wireless Cylindrical Lock', 'Mobile-enabled ENGAGE wireless cylindrical lock, battery operated', 'Access Control', 'Wireless Locks', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-schlage-679-05hm-20260930', 'cat-schlage-679-05hm-20260930.citation', '5f39a47468d8f9aa7cfc2273b917ceae2a7a8690ee88365f8edfc186927d8614', 0, 0, 'schlage', 'Schlage Electronics 679-05HM real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/schlage-electronics-679-05hm-magnetic-door-position-switch-concealed-spdt-for-hollow-metal-doors/', '2026-09-30'),
  ('cat-schlage-ndebp6d-20260930', 'cat-schlage-ndebp6d-20260930.citation', 'd0464940f7938dc341a4c3a26554cd49bca29cbcbb170d988df83c02e3bfd4d7', 0, 0, 'schlage', 'Schlage NDEBP6D real distributor price', datetime('now'), 'system', '', 'https://www.trudoor.com/products/schlage-ndebp-mobile-enabled-wireless-cylindrical-lock', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-schlage-679-05hm', 'prod-schlage-679-05hm', 'BLK', '679-05HM', 153.00, 99.14, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-schlage-679-05hm-20260930'),
  ('var-schlage-ndebp6d', 'prod-schlage-ndebp6d', '', 'NDEBP6D', 922.71, 922.71, 'USD', 1, 'Real price, trudoor.com, 2026-09-30 (page price applies across RHO/ATH/LAT/SPA lever and 643e/619 finish options)', datetime('now'), datetime('now'), 'cat-schlage-ndebp6d-20260930');

-- Left honestly unpriced, real products confirmed but genuinely
-- config-dependent with no single SKU match:
--   - 653-04 L2 12/24 VDC (Schlage keyswitch): real distributor pages
--     confirmed 653-04-L2-NS at $379.00 and plain 653-04-NS at $235.00,
--     plus separate SF-613/SF-626/CYL plate-finish variants at other
--     prices - the schedule's "653-04 L2" doesn't specify narrow-stile
--     vs standard or plate finish, and those real prices differ by more
--     than plate cosmetics would explain.
--   - CO-200-MD-40-KP-RHO-J (Schlage CO-200 offline lock): confirmed
--     real Schlage product line, but real distributor pricing spans
--     $1,324-$1,773 across prox/keypad/privacy configurations and no
--     distributor page matched this exact keypad-only mortise-deadbolt
--     configuration string.
