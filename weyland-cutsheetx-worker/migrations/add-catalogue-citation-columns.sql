-- Added 2026-09-29: catalogues had no way to record WHERE a price book
-- actually came from or WHEN it's effective - only source_filename/
-- storage_path (local artifact info) and ingested_at (when WE processed
-- it, not when the manufacturer published it). This is the real, direct
-- cause of "no citation to originating page in the catalog": the column
-- to hold one never existed, so no ingestion path could have populated it
-- even if it wanted to. Confirmed by reading every INSERT INTO catalogues
-- call site in this codebase before adding these - none reference a URL.
--
-- Not backfilled for existing rows: no source URL or true effective date
-- exists anywhere else in this schema to recover them from for the
-- 28 catalogues already ingested (checked - source_filename/storage_path
-- are the only provenance fields on those rows). Fabricating a plausible-
-- looking URL or date would be worse than an honest NULL. Going forward,
-- every new catalogue ingestion (src/routes/cps-catalogues.js) now
-- accepts and stores both.
ALTER TABLE catalogues ADD COLUMN source_url TEXT;
ALTER TABLE catalogues ADD COLUMN price_effective_date TEXT;
