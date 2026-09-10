// src/lib/access-request.js
//
// The pure half of the request-access queue: validation against a closed
// trade vocabulary, free-text cleaning, and a per-isolate sliding-window
// rate limiter for the public form.
//
// Ported 2026-09-09 from the weyland.onamerica.org prototype
// (Prototype1/access-request.js, WO-2026-0831-WEYLAND-WS6-COMMERCE-001 F2/F2b:
// "courteous request-access capture on the closed-registration deny path"
// + "the requester's TRADE as structured data ... know where our largest
// trade demand signal stems"). Behaviour is identical to the prototype's; the
// only source change is the private helper's name (cleanRequestText, was
// cleanText) so esbuild does not rename pdf-lib's cleanText across the whole
// bundle. Verified by src/lib/access-request.test.mjs (node --test).
//
// TRADES is the closed vocabulary; migrations/20260909_access_requests.sql
// enforces the same set with a CHECK constraint, so the database and this
// validator cannot drift apart silently - a new bucket is a change in BOTH
// places, on purpose. (Note this is the demand-signal vocabulary for the
// access form, distinct from the `trades` catalog table John introduced for
// multi-trade bid support; the two can be reconciled when the trade selector
// UI lands.)

export const TRADES = ["doors_glazing", "plumbing", "hvac", "electrical", "other"];

export const ACCESS_REQUEST_LIMITS = {
  email: 254,
  name: 120,
  company: 160,
  role: 80,
  trade_other: 80,
  message: 1000,
};

// Pragmatic email shape: one @, no whitespace, a dot in the domain. Delivery
// is proven later by the invite email itself, not by regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, strip control chars and angle brackets (no HTML rides into D1 or an email). */
function cleanRequestText(v, max) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[\x00-\x1f\x7f]/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > max ? "__TOO_LONG__" : s;
}

/**
 * validateAccessRequest(body) -> { ok, errors: {field: reason}, value }
 * value is the normalized row shape for access_requests (email lower-cased).
 */
export function validateAccessRequest(body) {
  const errors = {};
  const value = { email: null, name: null, company: null, role: null, trade: null, trade_other: null, message: null };
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { body: "JSON object required" }, value };
  }

  // email
  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailRaw || emailRaw.length > ACCESS_REQUEST_LIMITS.email || !EMAIL_RE.test(emailRaw)) {
    errors.email = "A valid email address is required";
  } else {
    value.email = emailRaw;
  }

  // trade (closed vocabulary, exact)
  if (typeof body.trade !== "string" || !TRADES.includes(body.trade)) {
    errors.trade = `trade must be one of: ${TRADES.join(", ")}`;
  } else {
    value.trade = body.trade;
  }

  // free-text fields
  for (const f of ["name", "company", "role", "message"]) {
    const c = cleanRequestText(body[f], ACCESS_REQUEST_LIMITS[f]);
    if (c === "__TOO_LONG__") errors[f] = `${f} is limited to ${ACCESS_REQUEST_LIMITS[f]} characters`;
    else value[f] = c;
  }

  // trade_other: only meaningful (and required) when trade === 'other'
  if (value.trade === "other") {
    const c = cleanRequestText(body.trade_other, ACCESS_REQUEST_LIMITS.trade_other);
    if (c === "__TOO_LONG__") errors.trade_other = `trade_other is limited to ${ACCESS_REQUEST_LIMITS.trade_other} characters`;
    else if (!c) errors.trade_other = "Tell us your trade when choosing 'other'";
    else value.trade_other = c;
  } else {
    value.trade_other = null;
  }

  return { ok: Object.keys(errors).length === 0, errors, value };
}

/**
 * Sliding-window counter for the public form (abuse backstop). Per-isolate
 * memory is enough for a backstop; the unique (email, venture) index on
 * access_requests is the real dedup. `limit` hits per `windowMs` per key.
 */
export function makeRateLimiter({ limit = 5, windowMs = 60000, now = () => Date.now() } = {}) {
  const hits = new Map();
  return function allow(key) {
    const t = now();
    const arr = (hits.get(key) || []).filter((ts) => t - ts < windowMs);
    if (arr.length >= limit) { hits.set(key, arr); return false; }
    arr.push(t);
    hits.set(key, arr);
    if (hits.size > 5000) hits.clear(); // bounded memory; a flood resets everyone, never grows unbounded
    return true;
  };
}
