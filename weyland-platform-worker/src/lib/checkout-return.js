// weyland-platform-worker/src/lib/checkout-return.js
//
// The page a checkout started from (2026-10-07), recorded in the session's
// metadata (start_path). Only same-site locations are accepted, and the
// origin is always written as https://weylandai.com, never taken from the
// Host header.
//
// Since 2026-10-07 nothing returns from Stripe: hosted Checkout is gone and
// every embedded session is created with redirect_on_completion "never", so
// the success/cancel/return URL builders that lived here were removed with it.

export const SITE_ORIGIN = "https://weylandai.com";
const ALLOWED_ORIGINS = new Set(["https://weylandai.com", "https://www.weylandai.com"]);

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
 * own cancel_url (older pages send one), else the Referer, else "/".
 */
export function startPathFor(request, body = {}) {
  return safeSitePath(body.return_to) || safeSitePath(body.cancel_url) || refererPath(request) || "/";
}
