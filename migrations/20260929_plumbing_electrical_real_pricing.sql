-- Real, sourced pricing for the plumbing/electrical catalog seeded
-- 2026-09-09 (see MULTI_TRADE_BID_SUPPORT.md and
-- 20260909_plumbing_electrical_catalog_seed.sql), added 2026-09-29.
--
-- That seed created 23 real products across 13 manufacturers but zero
-- product_variants - no price existed for any of them. Every price below
-- was independently found via a real live web search + fetch against a
-- real current distributor/manufacturer page (Ferguson/Home Depot/
-- Lowe's/Grainger-class sources), not estimated from memory. One
-- `catalogues` row per real source page records the citation
-- (source_url, ingested_at) per this venture's own "cited data, not
-- fabricated" standard; each variant's source_catalogue_id points back
-- to it.
--
-- Real data-quality corrections found in the process, applied here:
--   - prod-zurn-z1231 was mis-described as a "Floor Drain." Real product
--     data (pacificplumbing.com) shows Z1231 is actually a concealed-arm
--     wall-lavatory carrier system - corrected below. No price found for
--     it either (config-dependent), so it gets no variant row.
--   - prod-moen-8801 ("M-Power 8801") does not appear in Moen's current
--     M-Power lineup search results (current models: CA8301/CA8302/8553/
--     8554/8559) - likely discontinued/renumbered. Left as-is (not
--     guessing a replacement model number); flagged here so a real
--     follow-up can pick the correct current model.
--
-- Genuinely NOT_FOUND after real searching (no variant row - an honest
-- absence, not a gap to force a number into):
--   - American Standard Cadet 3: two real distributor pages (Ace
--     Hardware, Lowe's) returned HTTP 403 on fetch; only unverified
--     search-snippet prices were available, which don't meet this
--     venture's "actually fetched and confirmed" bar.
--   - Square D I-Line, Eaton Pow-R-Line: real config-dependent panelboard
--     lines - no single SKU price exists to cite honestly.
--   - Bradley Verge: genuinely quote-only across every real distributor
--     checked (confirmed "Call for Quote" on 3 separate real sites).
--   - Lutron Maestro MA-600: confirmed via direct fetch of a real
--     distributor page ("Not for Sale. Reference Only") - discontinued.

UPDATE products
SET display_name = 'Zurn Z1231 Concealed-Arm Wall Lavatory Carrier',
    description = 'Concealed-arm carrier system for wall-hung lavatories - corrected 2026-09-29 from an inaccurate "floor drain" description; no config-independent price found.',
    category_level_1 = 'Fixtures',
    category_level_2 = 'Carriers',
    category_level_3 = 'Lavatory Carrier'
WHERE manufacturer_id = 'mfr-zurn' AND base_model = 'Z1231';

-- source_filename/source_hash_sha256/file_size_bytes/page_count/storage_path
-- are all NOT NULL columns designed for a real uploaded PDF. These rows
-- cite a live web page, not a downloaded file - source_filename is a
-- synthetic '<id>.citation' marker, source_hash_sha256 is a real sha256
-- of the source_url itself (not a file hash), and file_size_bytes/
-- page_count are honestly 0. storage_path is '' (empty string, not NULL
-- - the column forbids NULL) since there is no file in R2 for these.
INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-koh-k3999-20260929', 'cat-koh-k3999-20260929.citation', '808f80749d7ef796328ba22317ce59221744efe22481295b4a34397b1877ac9f', 0, 0, 'kohler', 'Kohler K-3999-0 real distributor price', datetime('now'), 'system', '', 'https://www.guillens.com/buy/product/3999-0/422807', '2026-09-30'),
  ('cat-koh-k2032-20260929', 'cat-koh-k2032-20260929.citation', '1626e9f4834b330931f331dbe30cffab882f3bbc3c1a1cca11c2c3855af03ea9', 0, 0, 'kohler', 'Kohler K-2032 real distributor price', datetime('now'), 'system', '', 'https://shopkohlernj.com/products/2032', '2026-09-30'),
  ('cat-sloan-r111-20260929', 'cat-sloan-r111-20260929.citation', '12a1ae364f27860a8a92a189924b19b23e3f463877e160e8644961cdc448378e', 0, 0, 'sloan', 'Sloan Royal 111 real distributor price', datetime('now'), 'system', '', 'https://www.sloanplumbingparts.com/sloan-royal-111-yo-flushometer', '2026-09-29'),
  ('cat-sloan-reg111-20260929', 'cat-sloan-reg111-20260929.citation', '9b16354a49ecabd856d9e7437a6244d8e2264ca4a0ede35be039720a27641533', 0, 0, 'sloan', 'Sloan Regal 111 real distributor price', datetime('now'), 'system', '', 'https://www.standardplumbing.com/products/regal-111-xl-flushometer-3080053/229434/', '2026-09-29'),
  ('cat-zurn-z6000-20260929', 'cat-zurn-z6000-20260929.citation', 'e56acb66ac20f637bcef6a3216af8b6c2c98ca35d220076cc776f6a3deaee015', 0, 0, 'zurn', 'Zurn Z6000 real distributor price', datetime('now'), 'system', '', 'https://www.homedepot.com/p/Zurn-Manual-Flush-Valve-Z6000-Aquaflush-Exposed-Closet-Flush-Valve-Cast-Wall-Flange-1-6-GPF-Sweat-Solder-Kit-Z6000-WS1-YB-YC/204385761', '2026-09-29'),
  ('cat-watts-909-20260929', 'cat-watts-909-20260929.citation', 'f5b0d6fcd1b8ef9a67c5f3c1c00d3dff8008d86a6722d97750edbad6c8fba5d9', 0, 0, 'watts', 'Watts 909 real distributor price', datetime('now'), 'system', '', 'https://www.statesupply.com/wc1510', '2026-09-29'),
  ('cat-watts-n55-20260929', 'cat-watts-n55-20260929.citation', '99cee3e5bf243f8039065e1eb42d623de459b5c569f1af3b6a928933a919e9fb', 0, 0, 'watts', 'Watts N55 real distributor price', datetime('now'), 'system', '', 'https://www.zoro.com/k/watts-pressure-reducing-valve/', '2026-09-29'),
  ('cat-aosmith-bth-20260929', 'cat-aosmith-bth-20260929.citation', '2cfaee003139a73448e38afb77b30668943b6726766a4e7a42ce7777c4377aaf', 0, 0, 'aosmith', 'A.O. Smith BTH-199 real distributor price', datetime('now'), 'system', '', 'https://www.commercialwaterheatersales.com/8-990-phone-price-a-o-smith-bth-199-water-heater-100-gallon-commercial-gas-199-000-btu/', '2026-09-29'),
  ('cat-sqd-qo120-20260929', 'cat-sqd-qo120-20260929.citation', '7d66d47f253ec7de3a038dee88bde0fd56ebcfef918597c9da7cbb8e44018ba9', 0, 0, 'squared', 'Square D QO120 real distributor price', datetime('now'), 'system', '', 'https://www.lowes.com/pd/Square-D-QO-20-Amp-1-Pole-Standard-Trip-Circuit-Breaker/3129461', '2026-09-29'),
  ('cat-sqd-hom120-20260929', 'cat-sqd-hom120-20260929.citation', 'f961ea73db958e71a5a6263751838e070970e4c2dc16902b84c5388e3ab6ab84', 0, 0, 'squared', 'Square D HOM120 real distributor price', datetime('now'), 'system', '', 'https://www.homedepot.com/p/Square-D-Homeline-20-Amp-Single-Pole-Circuit-Breaker-HOM120CP-HOM120CP/100045009', '2026-09-29'),
  ('cat-eaton-br120-20260929', 'cat-eaton-br120-20260929.citation', 'bb9f469bf21c67267eea031d5c9762d3177fc468e55cb58f2ffc7c9b16ab5b32', 0, 0, 'eaton', 'Eaton BR120 real distributor price', datetime('now'), 'system', '', 'https://superbreakers.com/products/cutler-hammer-br120-20-amp', '2026-09-29'),
  ('cat-eaton-ch150-20260929', 'cat-eaton-ch150-20260929.citation', 'c954337c41e65e19bef400b0cd857efc8e5999e40cf61c843e083847f87318f3', 0, 0, 'eaton', 'Eaton CH150 real distributor price', datetime('now'), 'system', '', 'https://www.simplybreakers.com/products/eaton-50-amp-circuit-breaker-ch150', '2026-09-29'),
  ('cat-lev-5325-20260929', 'cat-lev-5325-20260929.citation', '4dd01575c0f32965471d797a9ebeeb786c836b584c79fcc723599fefff12bd38', 0, 0, 'leviton', 'Leviton Decora 5325 real distributor price', datetime('now'), 'system', '', 'https://www.kyleswitchplates.com/15a-decora-outlet-receptacles-leviton-5325/', '2026-09-29'),
  ('cat-lev-gfnt1-20260929', 'cat-lev-gfnt1-20260929.citation', 'eaf2bf6ac786b281501f5605535f1b9fa5d836501708e4daeed0619985bf29ec', 0, 0, 'leviton', 'Leviton GFNT1 real distributor price', datetime('now'), 'system', '', 'https://www.homedepot.com/p/Leviton-15-Amp-Self-Test-SmartlockPro-Slim-Duplex-GFCI-Outlet-White-GFNT1-KW-R12-GFNT1-0KW/206001533', '2026-09-29'),
  ('cat-hub-hbl8300-20260929', 'cat-hub-hbl8300-20260929.citation', '8a69dc8934bf0c1eaee68a30fa7757af055cceb810d84eed9f8683db5855ec21', 0, 0, 'hubbell', 'Hubbell HBL8300-I real distributor price', datetime('now'), 'system', '', 'https://www.cooper-electric.com/product/detail/35084/hubbell-wiring-device-hbl8300i', '2026-09-29'),
  ('cat-lutron-pd6wcl-20260929', 'cat-lutron-pd6wcl-20260929.citation', 'c00706413f16f9c175797f2a785f2b3d366eab4fa00d8a05502faa63913b20de', 0, 0, 'lutron', 'Lutron Caseta PD-6WCL real distributor price', datetime('now'), 'system', '', 'https://www.bulbs.com/product/PD-6WCL-WH', '2026-09-29');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-koh-k3999-0', 'prod-koh-k3999', '', 'K-3999-0', 343.43, 343.43, 'USD', 1, 'Real price, guillens.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-koh-k3999-20260929'),
  ('var-koh-k2032', 'prod-koh-k2032', '', 'K-2032', 115.35, 115.35, 'USD', 1, 'Real price, shopkohlernj.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-koh-k2032-20260929'),
  ('var-sloan-royal111-yo', 'prod-sloan-royal111', '', 'Royal 111-YO', 228.91, 228.91, 'USD', 1, 'Real price, sloanplumbingparts.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-sloan-r111-20260929'),
  ('var-sloan-regal111-xl', 'prod-sloan-regal111', '', 'Regal 111-XL', 180.97, 180.97, 'USD', 1, 'Real price, standardplumbing.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-sloan-reg111-20260929'),
  ('var-zurn-z6000-ws1', 'prod-zurn-z6000', '', 'Z6000-WS1-YB-YC', 164.01, 164.01, 'USD', 1, 'Real price, Home Depot, 2026-09-29', datetime('now'), datetime('now'), 'cat-zurn-z6000-20260929'),
  ('var-watts-lf909', 'prod-watts-909', '', 'LF909', 2595.00, 2595.00, 'USD', 1, 'Real price, statesupply.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-watts-909-20260929'),
  ('var-watts-lfn55', 'prod-watts-n55', '', 'LFN55BM1-U', 201.01, 201.01, 'USD', 1, 'Real price, zoro.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-watts-n55-20260929'),
  ('var-aosmith-bth199', 'prod-aosmith-bth', '', 'BTH-199', 8990.00, 8990.00, 'USD', 1, 'Real price, commercialwaterheatersales.com, 2026-09-29 (smallest/most common real BTH variant, 100 gal / 199,000 BTU)', datetime('now'), datetime('now'), 'cat-aosmith-bth-20260929'),
  ('var-sqd-qo120', 'prod-sqd-qo120', '', 'QO120', 16.98, 16.98, 'USD', 1, 'Real price, Lowe''s, 2026-09-29', datetime('now'), datetime('now'), 'cat-sqd-qo120-20260929'),
  ('var-sqd-hom120', 'prod-sqd-hom120', '', 'HOM120CP', 7.26, 7.26, 'USD', 1, 'Real price, Home Depot, 2026-09-29', datetime('now'), datetime('now'), 'cat-sqd-hom120-20260929'),
  ('var-eaton-br120', 'prod-eaton-br120', '', 'BR120', 7.75, 7.75, 'USD', 1, 'Real price, superbreakers.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-eaton-br120-20260929'),
  ('var-eaton-ch150', 'prod-eaton-ch150', '', 'CH150', 33.99, 33.99, 'USD', 1, 'Real price, simplybreakers.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-eaton-ch150-20260929'),
  ('var-lev-5325', 'prod-lev-decora5325', '', '5325', 5.50, 5.50, 'USD', 1, 'Real price, kyleswitchplates.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-lev-5325-20260929'),
  ('var-lev-gfnt1', 'prod-lev-gfnt1', '', 'GFNT1-KW', 18.98, 18.98, 'USD', 1, 'Real price, Home Depot, 2026-09-29', datetime('now'), datetime('now'), 'cat-lev-gfnt1-20260929'),
  ('var-hub-hbl8300i', 'prod-hub-hospitalgrade', '', 'HBL8300-I', 23.44, 23.44, 'USD', 1, 'Real price, cooper-electric.com, 2026-09-29 (ivory variant, lowest confirmed real price; price varies by color)', datetime('now'), datetime('now'), 'cat-hub-hbl8300-20260929'),
  ('var-lutron-pd6wcl', 'prod-lutron-caseta', '', 'PD-6WCL-WH', 64.95, 64.95, 'USD', 1, 'Real price, bulbs.com, 2026-09-29', datetime('now'), datetime('now'), 'cat-lutron-pd6wcl-20260929');
