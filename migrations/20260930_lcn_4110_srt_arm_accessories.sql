-- Real, sourced pricing for 3 LCN 4110-series accessory-arm components
-- found unpriced 2026-09-30 while investigating why LCN closers showed
-- 0% pricing accuracy: these models (4110-18/-30/-61) are real
-- accessory parts (drop plate, cush shoe support, blade stop spacer)
-- for the 4110 SRT (spring/cush) arm option, genuinely absent from the
-- catalogue - not a matching bug like the Ives fix in this same commit
-- series. Each price below was directly fetched (not just search-result
-- snippet) from nationallocksupply.com, a real current LCN distributor;
-- fetching the same 3 pages independently confirmed live regular/sale
-- prices (one differed slightly from an earlier cached search snippet
-- for 4110-61 - $39.00/$26.60 confirmed live vs. a stale $36.00/$25.65
-- snippet - direct fetch is the source of truth here, not the snippet).
-- unit_price uses the real current sale/street price; list_price uses
-- the real regular price, matching this catalogue's existing list vs.
-- unit price convention.

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-lcn-4110-18', 'mfr-lcn', 'SRT Arm Accessories', '4110', '4110-18', 'LCN 4110-18 Drop Plate', 'Drop plate for 4110 series closers, push side mount, top rail less than 5-1/8"', 'Closers', 'Accessories', 'doors'),
  ('prod-lcn-4110-30', 'mfr-lcn', 'SRT Arm Accessories', '4110', '4110-30', 'LCN 4110-30 Cush Shoe Support', 'Anchorage for fifth screw used with CUSH arm, reveal less than 3-1/16"', 'Closers', 'Accessories', 'doors'),
  ('prod-lcn-4110-61', 'mfr-lcn', 'SRT Arm Accessories', '4110', '4110-61', 'LCN 4110-61 Blade Stop Spacer', 'Lowers parallel arm shoe to clear 1/2" blade stop', 'Closers', 'Accessories', 'doors');

-- source_filename/source_hash_sha256/file_size_bytes/page_count/storage_path
-- follow the same honest citation-only convention established in
-- 20260929_plumbing_electrical_real_pricing.sql: these cite a live web
-- page, not a downloaded file.
INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-lcn-4110-18-20260930', 'cat-lcn-4110-18-20260930.citation', '10e672ed3d8dea5a9fb77ee5dfce542c6a91ec68380557a23ca5b55f63a6f72e', 0, 0, 'lcn', 'LCN 4110-18 Drop Plate real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/lcn-4110-18-drop-plate-for-4110-series/', '2026-09-30'),
  ('cat-lcn-4110-30-20260930', 'cat-lcn-4110-30-20260930.citation', '4e8234ee343d66214e0446fc016dd302bb6524aa951c3cb1b5d599bf2f2b86cb', 0, 0, 'lcn', 'LCN 4110-30 Cush Shoe Support real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/lcn-4110-30-cush-shoe-support/', '2026-09-30'),
  ('cat-lcn-4110-61-20260930', 'cat-lcn-4110-61-20260930.citation', 'b3e3b89c5f910a00440041aaaee192b4d4cd8e60799d24b73dd7dd3ac3f01b35', 0, 0, 'lcn', 'LCN 4110-61 Blade Stop Spacer real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/lcn-4110-61-blade-stop-spacer/', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-lcn-4110-18', 'prod-lcn-4110-18', '', '4110-18', 94.00, 64.11, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-lcn-4110-18-20260930'),
  ('var-lcn-4110-30', 'prod-lcn-4110-30', '', '4110-30', 33.00, 22.51, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-lcn-4110-30-20260930'),
  ('var-lcn-4110-61', 'prod-lcn-4110-61', '', '4110-61', 39.00, 26.60, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30 (live fetch; supersedes a stale $36/$25.65 cached search snippet)', datetime('now'), datetime('now'), 'cat-lcn-4110-61-20260930');
