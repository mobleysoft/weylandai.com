-- 0002_retire_fred_cache_add_price_index_snapshots.sql
--
-- Reverses 0001. Direct correction from John, 2026-09-12, same day 0001
-- shipped: "Depending on competitor API's in any way at all is a non
-- starter for us" - clarified to mean ANY external party's service, even
-- a free, keyless, government one like FRED's fredgraph.csv export. The
-- fred_series_cache architecture (keyless FRED CSV -> weekly D1 refresh)
-- still fundamentally depended on FRED as the data source, so it doesn't
-- meet the real bar even though it solved the original FRED_API_KEY/502
-- symptom. Retired before it ever mattered in practice (deployed only a
-- few minutes, never relied on by a real customer).
DROP TABLE IF EXISTS fred_series_cache;

-- price_index_snapshots: PriceX's real replacement - a fully first-party
-- pricing index computed ONLY from this account's own accumulated
-- door-hardware catalog (weyland_db's products/product_variants tables,
-- real manufacturer catalog data already ingested by weylandai.com's own
-- catalog-extraction pipeline - not fetched from any external API, at
-- read time or refresh time, by this worker or anything it calls). A
-- weekly Cron Trigger (see wrangler.toml) computes and stores one row per
-- real, sufficiently-sampled hardware category per week; PriceX reads the
-- latest snapshot. Once enough weekly snapshots accumulate, this becomes
-- a genuine month-over-month/year-over-year trend computed from OUR OWN
-- growing catalog - literally the "gofaineats that carry information
-- embedded and continuously improve them" John asked for, with zero
-- external dependency at any point, not even a keyless government one.
CREATE TABLE IF NOT EXISTS price_index_snapshots (
  category TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  sample_count INTEGER NOT NULL,
  avg_unit_price REAL NOT NULL,
  min_unit_price REAL NOT NULL,
  max_unit_price REAL NOT NULL,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (category, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_price_index_snapshots_category_date
  ON price_index_snapshots (category, snapshot_date DESC);
