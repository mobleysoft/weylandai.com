-- 2026-10-07: one row per Stripe subscription that pays for WeylandAI products.
-- Written by the payment webhook (weyland-platform-worker/src/routes/
-- webhooks-subscription.js via src/lib/subscriptions-store.js); the users row's
-- subscription_tier / products_enabled / subscription_status are recomputed from
-- these rows after every applied event (src/lib/entitlements.js
-- desiredFromSubscriptions). last_event_at is the Stripe event time of the last
-- event applied, so an older or replayed event never overwrites a newer state.
-- The Worker also runs these statements (IF NOT EXISTS) before first use.
CREATE TABLE IF NOT EXISTS weyland_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  status TEXT NOT NULL,
  product_ids TEXT NOT NULL DEFAULT '',
  tiers TEXT NOT NULL DEFAULT '',
  suite INTEGER NOT NULL DEFAULT 0,
  seats INTEGER NOT NULL DEFAULT 1,
  last_event_at INTEGER NOT NULL DEFAULT 0,
  last_event_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_weyland_subscriptions_user ON weyland_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_weyland_subscriptions_customer ON weyland_subscriptions(customer_id);
