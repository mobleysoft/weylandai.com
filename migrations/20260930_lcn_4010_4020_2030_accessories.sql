-- Real, sourced pricing for 3 more LCN accessory-arm/mount parts, same
-- pattern as the earlier 4110-18/-30/-61 fix (migrations/20260930_lcn_4110_srt_arm_accessories.sql):
-- these components are genuinely absent from the catalogue as single-price
-- SKUs - the catalogue DOES have active real rows for the parent closer
-- families (4010/4020/2030), but only as 3-way bracket-tiered variants
-- ([Powder Coat]/[652 Plated]/[Other Plated]) that this venture's own
-- matcher correctly refuses to guess between (see src/lib/pricing.js's
-- "Tier-differentiated bracket... left unmatchable" test) - confirmed by
-- direct fetch of uslocksupply.com's 4010-18 page, which itself lists a
-- SINGLE price across all 3 real finish options (689 Aluminum, 695 Dark
-- Bronze, 693 Black) for this specific accessory part, matching this
-- session's already-established convention that arm/mount accessories
-- (unlike full closer bodies) are typically single-priced regardless of
-- finish.
INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-lcn-4010-18', 'mfr-lcn', 'SRT Arm Accessories', '4010', '4010-18', 'LCN 4010-18 Drop Plate', 'Drop plate for 4010 series closers, required where top rail is less than 3-3/4"', 'Closers', 'Accessories', 'doors'),
  ('prod-lcn-4020-18', 'mfr-lcn', 'SRT Arm Accessories', '4020', '4020-18', 'LCN 4020-18 Drop Plate', 'Drop plate for 4020 series closers', 'Closers', 'Accessories', 'doors'),
  ('prod-lcn-2030-wms', 'mfr-lcn', 'Mount Accessories', '2030', '2030-WMS', 'LCN 2030-WMS Wall Mount Screw Pack', 'Wall mount screw pack (includes 3034 screws) for 2030 series closers', 'Closers', 'Accessories', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-lcn-4010-18-20260930', 'cat-lcn-4010-18-20260930.citation', 'fcfcf81a8423d43282764c178dd82056793e3b9f92e3a38b036d4f174abb2916', 0, 0, 'lcn', 'LCN 4010-18 Drop Plate real distributor price', datetime('now'), 'system', '', 'https://uslocksupply.com/products/lcn-4010-18-drop-plate-for-the-4011-door-closer', '2026-09-30'),
  ('cat-lcn-4020-18-20260930', 'cat-lcn-4020-18-20260930.citation', 'e6f445721d16f7434bb90d60b6b44191e381f99c1001e6b3d353793c710b1ee3', 0, 0, 'lcn', 'LCN 4020-18 Drop Plate real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/lcn-4020-18-drop-plate/', '2026-09-30'),
  ('cat-lcn-2030-wms-20260930', 'cat-lcn-2030-wms-20260930.citation', '72548e4fd8349f5d9ca77cd9964bb931d7ebe26c7108a4bec066db091e6fba5b', 0, 0, 'lcn', 'LCN 2030-WMS-AL real distributor price', datetime('now'), 'system', '', 'https://www.keylessaccesslocks.com/lcn-2030-wms-al-surface-mount-door-closer-part-2030-series-screw-pk-inc-3034-in-aluminum-finish/', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-lcn-4010-18', 'prod-lcn-4010-18', '', '4010-18', 58.40, 58.40, 'USD', 1, 'Real price, uslocksupply.com, 2026-09-30 (single price across 689/695/693 finishes)', datetime('now'), datetime('now'), 'cat-lcn-4010-18-20260930'),
  ('var-lcn-4020-18', 'prod-lcn-4020-18', '', '4020-18', 94.00, 64.11, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-lcn-4020-18-20260930'),
  ('var-lcn-2030-wms', 'prod-lcn-2030-wms', '', '2030-WMS', 74.00, 74.00, 'USD', 1, 'Real price, keylessaccesslocks.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-lcn-2030-wms-20260930');

-- Left honestly unpriced (real products, no confident single-SKU price
-- found in time budget, or genuinely tier-dependent with a >2x real
-- price spread the schedule doesn't disambiguate):
--   - 4040XP RW/PA: real closer exists, but real tiered prices span
--     $838-$1,623 (Powder Coat/652 Plated/Other Plated) with no
--     distributor page found quoting one flat price the way the smaller
--     accessory parts above did.
--   - 4000T ST-2967 WMS, 9550-18 AS REQUIRED, 9553 REG2/STD2 MS AS REQ,
--     8310-810D/-836T/-806K, SEM7850, 4011 ST-1544: real LCN products,
--     but either zero active catalogue rows for the current price book
--     or no confident single-SKU real-distributor price found before
--     this pass's time budget ran out - genuine follow-up work, not a
--     dead end.
--   - 4111 689: the base "4111" family has many real active sub-models
--     (4111-3071DEL, 4111-HCUSH, 4111-SHCUSH, 4111(6)-3071, etc.) at
--     different real prices - "689" alone (a finish, not a sub-model
--     designator) doesn't identify which one the schedule means.
