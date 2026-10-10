// weyland-platform-worker/src/lib/purchases-store.js
//
// One row per completed WeylandAI checkout (2026-10-07): what was bought, with
// which email, under which Terms, and which account it went to. Two reasons it
// exists beside weyland_subscriptions:
//
//   1. The $100 first-submittal offer is a one-time payment, not a
//      subscription: its row is where the 30 days it bought and the
//      first-submittal credit are recorded (access_ends_at, credits_*).
//   2. Purchase-claim protection. A signed-out purchase whose email belongs to
//      an existing account is not granted to that account on the email alone:
//      the row is kept with status 'held' until the email is proven (a code
//      sign-in, AuthFor email_verified) or that account signs in on the browser
//      that paid (lib/claims.js). A held subscription's weyland_subscriptions
//      row is kept under the placeholder user id HELD_USER_PREFIX + the
//      checkout session id, so its cancellations and failed payments are still
//      recorded while it waits.
//
// No outbound call: D1 only.

export const PURCHASES_DDL = [
  `CREATE TABLE IF NOT EXISTS weyland_purchases (
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
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  "CREATE INDEX IF NOT EXISTS idx_weyland_purchases_user ON weyland_purchases(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_weyland_purchases_email ON weyland_purchases(email, status)"
];

export const HELD_USER_PREFIX = "held:";
export const PURCHASE_KINDS = Object.freeze({ OFFER: "offer", SUBSCRIPTION: "subscription" });

const ensured = new WeakSet();
export async function ensurePurchasesTable(db) {
  if (!db || ensured.has(db)) return;
  for (const sql of PURCHASES_DDL) await db.prepare(sql).run();
  // g056: paid_at (an on-account invoice paid later) on a table made before the column existed.
  try { await db.prepare("ALTER TABLE weyland_purchases ADD COLUMN paid_at TEXT").run(); } catch (_) { /* already there */ }
  ensured.add(db);
}

/** g056: an on-account purchase's invoice was paid (the payment webhook's invoice.paid). Returns the
 *  row when this call stamped it, null when there is no such purchase or it was already stamped. */
export async function markInvoicePaid(db, invoiceId, paidAtIso) {
  if (!/^in_/.test(String(invoiceId || ""))) return null;
  await ensurePurchasesTable(db);
  const res = await db.prepare("UPDATE weyland_purchases SET paid_at = ?, updated_at = ? WHERE checkout_session_id = ? AND paid_at IS NULL")
    .bind(paidAtIso, new Date().toISOString(), invoiceId).run();
  return res?.meta?.changes ? getPurchase(db, invoiceId) : null;
}

export async function getPurchase(db, sessionId) {
  if (!sessionId) return null;
  await ensurePurchasesTable(db);
  return db.prepare("SELECT * FROM weyland_purchases WHERE checkout_session_id = ?").bind(String(sessionId)).first();
}

const COLUMNS = [
  "checkout_session_id", "kind", "product_id", "status", "user_id", "email", "customer_id", "subscription_id",
  "payment_intent_id", "amount_total", "currency", "quantity", "terms_url", "terms_accepted_at", "purchased_at",
  "granted_at", "access_ends_at", "credits_total", "credits_used", "claim_method"
];

/**
 * Record a purchase once (the checkout session id is the key; a redelivered
 * event finds the row it already wrote). Returns { inserted, row }.
 */
export async function recordPurchase(db, row) {
  await ensurePurchasesTable(db);
  // NOT NULL columns get their value here: an explicit NULL would make
  // INSERT OR IGNORE drop the whole row instead of using the column default.
  const filled = { quantity: 1, credits_total: 0, credits_used: 0, ...row };
  for (const k of ["quantity", "credits_total", "credits_used"]) if (filled[k] === null || filled[k] === undefined) filled[k] = k === "quantity" ? 1 : 0;
  for (const k of ["checkout_session_id", "kind", "product_id", "status", "purchased_at"]) {
    if (filled[k] === null || filled[k] === undefined || filled[k] === "") throw new Error("purchase row without " + k);
  }
  const values = COLUMNS.map((c) => (filled[c] === undefined ? null : filled[c]));
  const now = new Date().toISOString();
  const res = await db.prepare(
    `INSERT OR IGNORE INTO weyland_purchases (${COLUMNS.join(", ")}, created_at, updated_at)
     VALUES (${COLUMNS.map(() => "?").join(", ")}, ?, ?)`
  ).bind(...values, now, now).run();
  const stored = await getPurchase(db, row.checkout_session_id);
  return { inserted: !!(res?.meta?.changes), row: stored };
}

/**
 * held -> granted, once (compare-and-set on the status read). Returns true when
 * this call made the change.
 */
export async function markGranted(db, sessionId, { userId, grantedAt, accessEndsAt = null, claimMethod, creditsTotal = null, from = "held" }) {
  const res = await db.prepare(
    `UPDATE weyland_purchases SET status = 'granted', user_id = ?, granted_at = ?, access_ends_at = COALESCE(?, access_ends_at),
       claim_method = ?, credits_total = COALESCE(?, credits_total), updated_at = ?
     WHERE checkout_session_id = ? AND status = ?`
  ).bind(userId, grantedAt, accessEndsAt, claimMethod, creditsTotal, new Date().toISOString(), sessionId, from).run();
  return !!(res?.meta?.changes);
}

export async function heldPurchasesForEmail(db, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  await ensurePurchasesTable(db);
  const res = await db.prepare("SELECT * FROM weyland_purchases WHERE email = ? AND status = 'held' ORDER BY purchased_at").bind(e).all();
  return res?.results || [];
}

export async function purchasesForUser(db, userId) {
  if (!userId) return [];
  await ensurePurchasesTable(db);
  const res = await db.prepare("SELECT * FROM weyland_purchases WHERE user_id = ? ORDER BY COALESCE(granted_at, purchased_at) DESC").bind(userId).all();
  return res?.results || [];
}

/** The account's most recent granted first-submittal purchase, or null. */
export function latestOffer(purchases) {
  const offers = (purchases || []).filter((p) => p.kind === PURCHASE_KINDS.OFFER && p.status === "granted");
  offers.sort((a, b) => String(b.granted_at || "").localeCompare(String(a.granted_at || "")));
  return offers[0] || null;
}

/** "jm***@gmail.com": enough for the buyer to recognise the address, not to learn it. */
export function maskEmail(email) {
  const e = String(email || "");
  const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const local = e.slice(0, at);
  const keep = local.length <= 2 ? 1 : 2;
  return local.slice(0, keep) + "***" + e.slice(at);
}
