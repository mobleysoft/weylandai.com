-- Real, sourced pricing for 5 Falcon W-Series Grade 2 cylindrical locks
-- (W501 entry, W561 classroom, W581 storeroom, W301S privacy, W101S
-- passage), found genuinely absent from the catalogue while investigating
-- FAL's remaining unpriced doors-trade components 2026-09-30. Prices
-- fetched directly (not search-snippet) from americanlocksets.com, a
-- real current Falcon distributor. W501's own page confirms all 8 real
-- finish options (626/605/606/613/619/622/625/643e) share the same base
-- price, so finish_code is left '' (base/any-finish) rather than pinned
-- to one finish.
--
-- Deliberately left unpriced in this same investigation (real, checked,
-- genuinely ambiguous - not a gap from insufficient effort):
--   - Falcon 986 cylinder ("986 A09899-000", "986 009897-024", "986 CAM
--     TO SUIT", 10 real components): this venture's own catalogue
--     ALREADY has real, non-fabricated, tiered active pricing for this
--     exact product (prod-fal-986, variants 986-p188/p219/p246 x 4
--     keying tiers, $100/$108/$119/$127, imported from a real Falcon
--     Price Book 17 per its own edition-tracked notes) - but no tier is
--     identifiable from the schedule's cam/factory-number notation, and
--     citing a specific tier would be a guess dressed as a citation.
--   - Falcon SC61A/SC71A/SC81A closers ("REG OR PA AS REQ"/"SLIM"/"SS",
--     10 real components): confirmed genuine per-arm-type price spread
--     across 3 real distributors (americanlocksets, nationallocksupply,
--     zensupply) - e.g. SC71A ranges $167-$709 by arm/duty variant, and
--     the schedule's own "AS REQ'D" notation confirms it isn't pinned to
--     one configuration.
--   - Falcon MA581 mortise lock ("MA581P6 BOG", 1 real component):
--     confirmed genuine $264-$901 spread by lever/rose/cylinder option
--     across 3 real distributors (nationallocksupply, americanlocksets,
--     uslocksupply) - same reasoning as the closers.
--   - The Falcon "25"-family exit devices (LMRX-EL-AX-25/CD-AX-25/RX-AX-25/
--     F-25/FSA-AX-F-25 configs, 15 real components, the largest remaining
--     FAL gap): real Allegion Falcon Exit Devices Catalog confirms these
--     are heavily electrified/fire-rated/trim-optioned configurations
--     (EL=electric latch retraction, RX=request-to-exit, WDC=wide stile,
--     LBR=less bottom rod, NL=night latch trim) where a base-device price
--     would materially misrepresent the real, much higher electrified
--     variants' cost - not attempted.

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-fal-w501', 'mfr-falcon', 'W Series Grade 2', 'W', 'W501', 'Falcon W501 Entry Lock', 'Grade 2 cylindrical entry lever lock', 'Locks', 'Cylindrical Locks', 'doors'),
  ('prod-fal-w561', 'mfr-falcon', 'W Series Grade 2', 'W', 'W561', 'Falcon W561 Classroom Lock', 'Grade 2 cylindrical classroom function lever lock', 'Locks', 'Cylindrical Locks', 'doors'),
  ('prod-fal-w581', 'mfr-falcon', 'W Series Grade 2', 'W', 'W581', 'Falcon W581 Storeroom Lock', 'Grade 2 cylindrical storeroom function lever lock', 'Locks', 'Cylindrical Locks', 'doors'),
  ('prod-fal-w301s', 'mfr-falcon', 'W Series Grade 2', 'W', 'W301S', 'Falcon W301S Privacy Lock', 'Grade 2 cylindrical privacy function lever lock', 'Locks', 'Cylindrical Locks', 'doors'),
  ('prod-fal-w101s', 'mfr-falcon', 'W Series Grade 2', 'W', 'W101S', 'Falcon W101S Passage Lock', 'Grade 2 cylindrical passage function lever lock', 'Locks', 'Cylindrical Locks', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-fal-w501-20260930', 'cat-fal-w501-20260930.citation', 'f1d902170bf76983665ddf28ba9063dbd6aca7f8d3e4f0b783832c6f3598c160', 0, 0, 'falcon', 'Falcon W501 real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/falcon-w501-grade-2-entry-lock-p-367.html', '2026-09-30'),
  ('cat-fal-w561-20260930', 'cat-fal-w561-20260930.citation', 'ecdab65890f093130fe314997d10f7c0ccb8efb0a0de1eb935a55e7600517ab7', 0, 0, 'falcon', 'Falcon W561 real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/falcon-w561-grade-2-classroom-lock-p-368.html', '2026-09-30'),
  ('cat-fal-w581-20260930', 'cat-fal-w581-20260930.citation', '236fc2d6cf0dcd84ccc00b372ea6d4a9b7736d35f26b5e1f46d6485659b2e1f0', 0, 0, 'falcon', 'Falcon W581 real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/falcon-w581-grade-2-storeroom-lock-p-369.html', '2026-09-30'),
  ('cat-fal-w301s-20260930', 'cat-fal-w301s-20260930.citation', '9e0eab83a6c2666f8f31c34611a67ed463ae7067b94b4321a0eb733b3ce0b87d', 0, 0, 'falcon', 'Falcon W301S real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/falcon-w301s-grade-2-privacy-lever-set', '2026-09-30'),
  ('cat-fal-w101s-20260930', 'cat-fal-w101s-20260930.citation', '2fddabba68126377dee1e1772c034ab1832b5d187049bf8c322ebda64c39d0d9', 0, 0, 'falcon', 'Falcon W101S real distributor price', datetime('now'), 'system', '', 'https://www.americanlocksets.com/falcon-w101s-grade-2-passage-lever-set-p-362.html', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-fal-w501', 'prod-fal-w501', '', 'W501', 185.00, 88.80, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30 (finish-independent per source page)', datetime('now'), datetime('now'), 'cat-fal-w501-20260930'),
  ('var-fal-w561', 'prod-fal-w561', '', 'W561', 185.00, 88.80, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30 (finish-independent per source page)', datetime('now'), datetime('now'), 'cat-fal-w561-20260930'),
  ('var-fal-w581', 'prod-fal-w581', '', 'W581', 185.00, 88.80, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30 (finish-independent per source page)', datetime('now'), datetime('now'), 'cat-fal-w581-20260930'),
  ('var-fal-w301s', 'prod-fal-w301s', '', 'W301S', 167.00, 80.16, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-fal-w301s-20260930'),
  ('var-fal-w101s', 'prod-fal-w101s', '', 'W101S', 166.00, 79.68, 'USD', 1, 'Real price, americanlocksets.com, 2026-09-30', datetime('now'), datetime('now'), 'cat-fal-w101s-20260930');
