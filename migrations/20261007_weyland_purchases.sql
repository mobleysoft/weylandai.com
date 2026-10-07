-- 2026-10-07: one row per completed WeylandAI checkout (weyland-platform-worker).
-- What was bought (kind offer|subscription, product_id), with which email, under which
-- Terms (terms_url, terms_accepted_at), and where it went: status pending (being granted),
-- held (a signed-out purchase whose email belongs to an existing account: granted only when
-- the email is proven or that account signs in on the paying browser) or granted (user_id).
-- The $100 first-submittal offer records its 30 days (access_ends_at) and its credit
-- (credits_total / credits_used). Written by src/routes/webhooks-subscription.js and
-- src/lib/grants.js (src/lib/purchases-store.js). The Worker also runs these statements
-- (IF NOT EXISTS) before first use.
CREATE TABLE IF NOT EXISTS weyland_purchases (
  checkout_session_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  customer_id TEXT,
  subscription_id TEXT,
  payment_intent_id TEXT,
  amount_total INTEGER,
  currency TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  terms_url TEXT,
  terms_accepted_at TEXT,
  purchased_at TEXT NOT NULL,
  granted_at TEXT,
  access_ends_at TEXT,
  credits_total INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  claim_method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
CREATE INDEX IF NOT EXISTS idx_weyland_purchases_user ON weyland_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_weyland_purchases_email ON weyland_purchases(email, status);
