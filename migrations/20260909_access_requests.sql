-- Request-access queue: the courteous deny path for closed registration plus
-- the trade demand signal. See src/routes/access-requests.js and
-- src/lib/access-request.js (the TRADES vocabulary there and the CHECK
-- constraint here are the same closed set, on purpose - a new bucket is a
-- change in BOTH places).
--
-- Ported 2026-09-09 from the weyland.onamerica.org prototype's migration 058
-- (WO-2026-0831-WEYLAND-WS6-COMMERCE-001 F2/F2b), access-queue part only;
-- that migration's billing columns are not carried here because billing in
-- this codebase routes through vendyai (see PLAN.md).
--
-- ADDITIVE ONLY. IF NOT EXISTS throughout, so re-applying is a no-op.
-- Pre-identity and venture-scoped: venture_code is the hook a later tenant
-- split inherits; nothing here touches the identity provider.

CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT,
  trade TEXT NOT NULL CHECK (trade IN ('doors_glazing', 'plumbing', 'hvac', 'electrical', 'other')),
  trade_other TEXT,
  message TEXT,
  source TEXT,
  venture_code TEXT NOT NULL DEFAULT 'weyland',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'denied')),
  approved_by TEXT,
  approved_at TEXT,
  invited_mhs_id TEXT,
  request_ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_trade ON access_requests(trade);
-- One open request per email per venture (re-submits update, never duplicate).
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_email_venture ON access_requests(email, venture_code);
