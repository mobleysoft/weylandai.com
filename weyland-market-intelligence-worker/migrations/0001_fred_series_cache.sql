-- fred_series_cache: local D1 cache of FRED (Federal Reserve Bank of St.
-- Louis) economic series data, populated from the free, keyless
-- fredgraph.csv export endpoint (https://fred.stlouisfed.org/graph/fredgraph.csv?id=<series>),
-- NOT the keyed api.stlouisfed.org JSON API. This exists specifically so
-- PriceX (/api/pricex/materials) and MarketX (/api/marketx/trends) never
-- need a live per-request external call or a FRED_API_KEY secret - see
-- src/routes/market-intelligence.js and the scheduled() handler in
-- src/index.js for the refresh side of this.
--
-- PPI/construction/housing series here are published monthly by BLS/FRED,
-- so a request-time live call was never buying real freshness anyway -
-- this table plus a weekly Cron Trigger refresh is strictly as fresh as
-- the data actually gets.
CREATE TABLE IF NOT EXISTS fred_series_cache (
  series_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (series_id, date)
);

CREATE INDEX IF NOT EXISTS idx_fred_series_cache_series_date
  ON fred_series_cache (series_id, date DESC);
