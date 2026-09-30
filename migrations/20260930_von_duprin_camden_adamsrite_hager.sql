-- Real, sourced pricing for remaining doors-trade manufacturer-code gaps
-- found 2026-09-30 during deeper SKU research (John: "Deeper sku research
-- until we have 100% coverage as near as possible"). Covers Von Duprin
-- power/transfer accessories, a Camden switch whose only catalogue price
-- was a correctly-retired 2017 stale list (a NEW current price, not a
-- reactivation of the retired row), and two brand-new manufacturers
-- (Adams Rite, Hager) that had zero rows in this catalogue at all - not
-- a matching bug, the real manufacturer_aliases/manufacturers/products
-- rows genuinely didn't exist yet.
--
-- Von Duprin PS904/PS902: the real schedule rows specify additional
-- relay-board/fire-alarm-relay/battery-backup options
-- ("900-4RL-FA 900-BBK", "900-4R-FA") beyond the base unit cited here -
-- base-unit price only, real option surcharges not included (same
-- honesty convention as this session's Hubbell "price varies by color"
-- and A.O. Smith "smallest/most common variant" notes).
-- Hager BB1279/BB1168: the real schedule rows don't specify a hinge size
-- (just "BB1279"/"BB1168") - 4-1/2"x4-1/2" is cited as the overwhelmingly
-- standard commercial-door size for these lines (confirmed as a distinct
-- real SKU, not invented), not a guess at an arbitrary size.

INSERT INTO manufacturers (id, name, slug, trade) VALUES
  ('mfr-adamsrite', 'Adams Rite Manufacturing', 'adamsrite', 'doors'),
  ('mfr-hager', 'Hager Companies', 'hager', 'doors');

INSERT INTO manufacturer_aliases (alias, manufacturer_id) VALUES
  ('ADA', 'mfr-adamsrite'),
  ('Hager', 'mfr-hager'),
  ('HAGER', 'mfr-hager');

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-von-ept10', 'mfr-vonduprin', 'Power Transfer', 'EPT', 'EPT10', 'Von Duprin EPT10 Electric Power Transfer', 'Electric power transfer, ten 24-gauge wires', 'Electrified Hardware', 'Power Transfer', 'doors'),
  ('prod-von-ps914', 'mfr-vonduprin', 'Power Supplies', 'PS900', 'PS914', 'Von Duprin PS914 Base Power Supply', '4A w/16A inrush @ 12/24 VDC field selectable', 'Electrified Hardware', 'Power Supply', 'doors'),
  ('prod-von-ps904', 'mfr-vonduprin', 'Power Supplies', 'PS900', 'PS904', 'Von Duprin/Schlage PS904 Base Power Supply', '4A @ 12/24 VDC field selectable - base unit; real schedule specifies additional 4RL-FA relay/fire-alarm and BBK battery-backup options not priced here', 'Electrified Hardware', 'Power Supply', 'doors'),
  ('prod-von-ps902', 'mfr-vonduprin', 'Power Supplies', 'PS900', 'PS902', 'Von Duprin/Schlage PS902 Base Power Supply', '2A @ 12/24 VDC field selectable - base unit; real schedule specifies an additional 4R-FA relay/fire-alarm option not priced here', 'Electrified Hardware', 'Power Supply', 'doors'),
  ('prod-adamsrite-ms1850s', 'mfr-adamsrite', 'MS Deadlocks', 'MS1850', 'MS1850S', 'Adams Rite MS1850S MS Deadlock', 'Hook bolt deadlock, flat faceplate, 1-1/2" backset', 'Locks', 'Mortise Deadlock', 'doors'),
  ('prod-hager-bb1279', 'mfr-hager', 'Full Mortise Hinges', 'BB1279', 'BB1279', 'Hager BB1279 Ball Bearing Hinge', 'Full mortise, standard weight, 5-knuckle, 4-1/2"x4-1/2" (real schedule row does not specify a size; this is the standard commercial-door size)', 'Hinges', 'Ball Bearing Hinge', 'doors'),
  ('prod-hager-bb1168', 'mfr-hager', 'Full Mortise Hinges', 'BB1168', 'BB1168', 'Hager BB1168 Ball Bearing Hinge', 'Full mortise, heavy weight, 5-knuckle, 4-1/2"x4-1/2" (real schedule row does not specify a size; this is the standard commercial-door size)', 'Hinges', 'Ball Bearing Hinge', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-von-ept10-20260930', 'cat-von-ept10-20260930.citation', 'e8daf138377496ffab2028d62affc770ce5eedcfbc6007f2d9affad9968fa07d', 0, 0, 'vonduprin', 'Von Duprin EPT10 real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/von-duprin-ept10-electric-power-transfer-ten-24-gauge-wires/', '2026-09-30'),
  ('cat-von-ps914-20260930', 'cat-von-ps914-20260930.citation', '41f646b3c753cb5263c7d5b983f7a94d9496fd77e199f3e3f8d2708b9e855257', 0, 0, 'vonduprin', 'Von Duprin PS914 real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/von-duprin-ps914-base-power-supply-4a-w-16a-inrush-12-24-vdc-field-selectable/', '2026-09-30'),
  ('cat-von-ps904-20260930', 'cat-von-ps904-20260930.citation', '30c7688854423e9e85c5f446bf5a2dcb040a9f1739d423b7ccb23e72fb735ced', 0, 0, 'vonduprin', 'Von Duprin/Schlage PS904 real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/von-duprin-schlage-ps904-base-power-supply-4a-12-24-vdc-field-selectable/', '2026-09-30'),
  ('cat-von-ps902-20260930', 'cat-von-ps902-20260930.citation', '4b830d1730f981d2213d8860dea6348cbb3fe381cd5fa3d263429e5fb6e34038', 0, 0, 'vonduprin', 'Von Duprin/Schlage PS902 real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/von-duprin-schlage-ps902-base-power-supply-2a-12-24-vdc-field-selectable/', '2026-09-30'),
  ('cat-cam332-42-20260930', 'cat-cam332-42-20260930.citation', 'c7a83e57e4c7afe4edc4b8526e3edfcda3303bf93657fbe3e1ccee444aab1b0d', 0, 0, 'camden', 'Camden CM-332-42 real current distributor price (supersedes a correctly-retired 2017 list price)', datetime('now'), 'system', '', 'https://www.surveillance-video.com/security-cm-332-42.html', '2026-09-30'),
  ('cat-adamsrite-ms1850s-20260930', 'cat-adamsrite-ms1850s-20260930.citation', '9d9ebb7d45598610d80f316e96087131b993c17a7b4522d3fbf6bc99dae1661c', 0, 0, 'adamsrite', 'Adams Rite MS1850S-410-628 real distributor list price', datetime('now'), 'system', '', 'https://accesshardware.com/product/ms1850s-410-628/', '2026-09-30'),
  ('cat-hager-bb1279-20260930', 'cat-hager-bb1279-20260930.citation', '49c8cca0f7c622b60baccbceb54974bc8bedfb52fda9be72587789b4346ae685', 0, 0, 'hager', 'Hager BB1279 4-1/2x4-1/2 real distributor price', datetime('now'), 'system', '', 'https://nationallocksupply.com/hager-bb1279-4-1-2x4-1-2-full-mortise-ball-bearing-hinge-standard-weight-5-knuckle/', '2026-09-30'),
  ('cat-hager-bb1168-20260930', 'cat-hager-bb1168-20260930.citation', 'eabcc04a01e0e24a753125222edcec76dc0be72c01e999cff5ba961c91326f7d', 0, 0, 'hager', 'Hager BB1168 4-1/2x4-1/2 real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/hager-bb1168-4-12-x-4-12-ball-bearing-heavy-weight-hinge', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-von-ept10', 'prod-von-ept10', '', 'EPT10', 848.00, 549.50, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-von-ept10-20260930'),
  ('var-von-ps914', 'prod-von-ps914', '', 'PS914', 1238.00, 940.97, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-von-ps914-20260930'),
  ('var-von-ps904', 'prod-von-ps904', '', 'PS904', 816.00, 528.81, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30 (base unit; real schedule specifies 4RL-FA/BBK options not priced here)', datetime('now'), datetime('now'), 'cat-von-ps904-20260930'),
  ('var-von-ps902', 'prod-von-ps902', '', 'PS902', 432.00, 279.96, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30 (base unit; real schedule specifies a 4R-FA option not priced here)', datetime('now'), datetime('now'), 'cat-von-ps902-20260930'),
  ('var-cam332-42-current', 'prod-cam-cm332', '', 'CM-332-42', 185.42, 185.42, 'USD', 1, 'Real current price, surveillance-video.com, 2026-09-30 (the catalogue''s only other CM-332 row is a correctly-retired 2017 stale list price - this is a new, separate current-price row, not a reactivation)', datetime('now'), datetime('now'), 'cat-cam332-42-20260930'),
  ('var-adamsrite-ms1850s-628', 'prod-adamsrite-ms1850s', '628', 'MS1850S-410-628', 92.00, 92.00, 'USD', 1, 'Real price, accesshardware.com, 2026-09-30 (exact 628 finish match)', datetime('now'), datetime('now'), 'cat-adamsrite-ms1850s-20260930'),
  ('var-hager-bb1279-45', 'prod-hager-bb1279', '', 'BB1279 4-1/2X4-1/2', 23.76, 12.22, 'USD', 1, 'Real price, nationallocksupply.com, 2026-09-30 (finish not broken out on source page; 4-1/2x4-1/2 size confirmed)', datetime('now'), datetime('now'), 'cat-hager-bb1279-20260930'),
  ('var-hager-bb1168-45', 'prod-hager-bb1168', '', 'BB1168 4-1/2X4-1/2', 70.56, 35.28, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30 (finish not broken out on source page; 4-1/2x4-1/2 size confirmed)', datetime('now'), datetime('now'), 'cat-hager-bb1168-20260930');
