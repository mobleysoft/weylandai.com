// weyland-platform-worker/src/lib/checkout-return.js
//
// Where a checkout sends the visitor back to (2026-10-07). The hosted path
// used to send every buyer to /subscribe?checkout=... (the $2,000 SubConP
// page) whatever was being bought; now success, cancel and the embedded
// return all point at the page the visitor started from. Only same-site
// locations are accepted (an off-site URL would turn a real customer's
// post-payment redirect into an open redirect), and the origin is always
// written as https://weylandai.com, never taken from the Host header.

export const SITE_ORIGIN = "https://weylandai.com";
const ALLOWED_ORIGINS = new Set(["https://weylandai.com", "https://www.weylandai.com"]);
export const SESSION_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

/** "/path?query#hash" on this site, or null. Absolute URLs must be weylandai.com. */
export function safeSitePath(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 1000 || /[\u0000-\u001f\\]/.test(raw)) return null;
  let u;
  try {
    if (raw.startsWith("/")) {
      if (raw.startsWith("//")) return null;
      u = new URL(raw, SITE_ORIGIN);
    } else {
      u = new URL(raw);
    }
  } catch {
    return null;
  }
  if (!ALLOWED_ORIGINS.has(u.origin)) return null;
  // A stale result from an earlier round trip never rides along.
  u.searchParams.delete("checkout");
  u.searchParams.delete("session_id");
  return u.pathname + u.search + u.hash;
}

export function refererPath(request) {
  const ref = request.headers.get("Referer");
  return ref ? safeSitePath(ref) : null;
}

/**
 * The page the visitor started from: an explicit return_to, else the page's
 * own cancel_url (the homepage sends one), else the Referer, else "/".
 */
export function startPathFor(request, body = {}) {
  return safeSitePath(body.return_to) || safeSitePath(body.cancel_url) || refererPath(request) || "/";
}

/** Absolute site URL for `path` with `params` added to the query (before any #hash). */
export function siteUrlWith(path, params) {
  const u = new URL(safeSitePath(path) || "/", SITE_ORIGIN);
  const marks = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === SESSION_PLACEHOLDER) {
      const mark = "SESSIONIDMARK" + marks.length;
      marks.push(mark);
      u.searchParams.set(k, mark);
    } else {
      u.searchParams.set(k, String(v));
    }
  }
  // Stripe substitutes the literal {CHECKOUT_SESSION_ID}; URLSearchParams would encode the braces.
  let out = SITE_ORIGIN + u.pathname + u.search + u.hash;
  for (const mark of marks) out = out.replace(mark, SESSION_PLACEHOLDER);
  return out;
}

// Pages served by this worker that finish a returning checkout themselves:
// /pricing and /news load /api/billing/embedded-checkout.js (its resume()
// waits for provisioning, which sets the session cookie), /subscribe has its
// own success view. The homepage cannot yet: "/" with a query string is
// answered by the monolith's catch-all (the exact "/" route is left as it is)
// and index.html does not read ?checkout=success - so a purchase started there
// keeps the old success view (/subscribe), which signs the buyer in, while
// Back (cancel) returns to the homepage.
const FINISHES_RETURN = /^\/(pricing|news|wire|subscribe)\/?(?:[?#]|$)/i;

export function finishesCheckoutReturn(path) {
  return FINISHES_RETURN.test(path || "");
}

/** success_url / cancel_url for the hosted (redirect) checkout. */
export function hostedReturnUrls(request, body = {}) {
  const start = startPathFor(request, body);
  const successStart = safeSitePath(body.success_url) || start;
  const successPath = finishesCheckoutReturn(successStart) ? successStart : "/subscribe";
  return {
    start,
    success_url: siteUrlWith(successPath, { checkout: "success", session_id: SESSION_PLACEHOLDER }),
    cancel_url: siteUrlWith(start, { checkout: "cancelled" })
  };
}

/** return_url for embedded checkout (used only by redirect-based payment methods). */
export function embeddedReturnUrl(request, body = {}) {
  const start = safeSitePath(body.return_to) || refererPath(request) || "/";
  return { start, return_url: siteUrlWith(start, { checkout: "return", session_id: SESSION_PLACEHOLDER }) };
}
