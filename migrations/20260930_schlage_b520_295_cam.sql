-- Real, sourced pricing for Schlage B520-295 (Corbin Russwin DL4000 Cam
-- for Classic Conventional Mortise Cylinders), found unpriced 2026-09-30
-- during deeper SKU research on the SCH/ZER/LCN doors-trade gap. Genuinely
-- absent from the catalogue, not a matching bug. Price directly fetched
-- (not search-snippet) from bandhdepot.com - a real current distributor
-- page fetch corrected a lower $11.98 figure from an absupply.net search
-- snippet; the direct fetch ($14.00 sale / $19.40 MSRP) is authoritative
-- per this venture's "actually fetched and confirmed" standard.

INSERT INTO products (id, manufacturer_id, product_series, product_family, base_model, display_name, description, category_level_1, category_level_2, trade) VALUES
  ('prod-schlage-b520-295', 'mfr-schlage', 'B520 Cylinder Accessories', 'B520', 'B520-295', 'Schlage B520-295 Cam', 'Corbin Russwin DL4000 Cam for Classic Conventional Mortise Cylinders', 'Cores & Cylinders', 'Cylinder Accessories', 'doors');

INSERT INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, source_url, price_effective_date) VALUES
  ('cat-schlage-b520-295-20260930', 'cat-schlage-b520-295-20260930.citation', 'e730b7c68c1dc9912b4ef45338ccf7d5d7d620f59279becb70efb10ffeeecaef', 0, 0, 'schlage', 'Schlage B520-295 Cam real distributor price', datetime('now'), 'system', '', 'https://bandhdepot.com/b520-295-schlage-lock-cylinder-parts-and-accessories/', '2026-09-30');

INSERT INTO product_variants (id, product_id, finish_code, full_model_number, list_price, unit_price, currency, active, notes, created_at, updated_at, source_catalogue_id) VALUES
  ('var-schlage-b520-295', 'prod-schlage-b520-295', '', 'B520-295', 19.40, 14.00, 'USD', 1, 'Real price, bandhdepot.com, 2026-09-30 (direct fetch; supersedes a lower $11.98 cached search snippet from absupply.net)', datetime('now'), datetime('now'), 'cat-schlage-b520-295-20260930');
