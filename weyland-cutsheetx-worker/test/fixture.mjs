// The weyland_db tables the matcher and the citation routes read, with a few real-shaped rows:
// Schlage L9080 has no filed cut sheet but two catalogue pages that name it (one with its PDF in
// storage), LCN 4040XP and Von Duprin 99 have price-book cut sheets, Hager BB1279 has neither.
export const FIXTURE_SQL = [
  "CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);",
  "CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT,",
  "  product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);",
  "CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT,",
  "  r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER);",
  "CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);",
  "CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text TEXT);",
  "CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text);",
  "CREATE TABLE cut_sheet_misses (id TEXT, manufacturer TEXT, model TEXT, count INTEGER, first_seen TEXT, last_seen TEXT, UNIQUE(manufacturer, model));",
  "INSERT INTO manufacturers VALUES ('schlage','Schlage','schlage'),('lcn','LCN','lcn'),('vd','Von Duprin','von-duprin'),('hager','Hager','hager');",
  "INSERT INTO products VALUES",
  "  ('p-l9080','schlage','L9080','SCHLAGE L9080','doors','L Series','Mortise lock',NULL,0,0),",
  "  ('p-4040xp','lcn','4040XP','LCN 4040XP','doors','4040XP','Closer',NULL,0,0),",
  "  ('p-99','vd','99','Von Duprin 99','doors','98/99','Exit device',NULL,0,0),",
  "  ('p-bb1279','hager','BB1279','Hager BB1279','doors','BB1279','Hinge',NULL,0,0);",
  "INSERT INTO product_documents VALUES",
  "  ('d-4040xp','p-4040xp','cut_sheet','LCN Price Book (LCN 4040XP product listed around pp.6-48 in the edition)',NULL,'manufacturer-catalogs/lcn.pdf','subx-uploads',152,NULL,'2025-01-01',1),",
  "  ('d-99','p-99','cut_sheet','Von Duprin Price Book (99 around p.33)',NULL,'manufacturer-catalogs/vd.pdf','subx-uploads',120,NULL,'2025-01-01',1);",
  "INSERT INTO catalogues VALUES ('cat-l','Schlage L Series Catalog','Schlage','catalogues/schlage-l.pdf','schlage-l.pdf',80),",
  "  ('cat-pb','Schlage Mechanical Price Book','Schlage','','schlage-pb.pdf',300);",
  "INSERT INTO catalogue_pages VALUES ('cat-l',25,'L9080 storeroom function mortise lock'),('cat-l',59,'L9080 trim options'),('cat-pb',161,'L9080 list price');",
  "INSERT INTO catalogue_pages_fts(rowid, text) SELECT rowid, text FROM catalogue_pages;",
  "ALTER TABLE product_documents ADD COLUMN mime_type TEXT;",
].join("\n");
