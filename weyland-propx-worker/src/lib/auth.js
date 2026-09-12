// src/lib/auth.js
//
// The single stable entry point every route imports for auth: authenticate,
// authenticateCps, requireActiveSubscription, requireProductAccess.
// Extracted from weyland.worker.js lines 145344-145559 (HEAD 4095d9e,
// re-verified against the current file for this pass) - the map's
// single highest-fan-in dependency (216 call sites for authenticate()
// alone, ~40 more for requireProductAccess()).
//
// *** Composition, not just relocation. Read this before changing the
// order below. ***
//
// A first pass of this extraction moved authenticate()'s body into one
// file verbatim and called it done. That was wrong: authenticate() is not
// a single clean AuthFor client, it's four different mechanisms tried in
// sequence, two of which are local and bypass AuthFor entirely. Renaming
// the whole thing "auth.js" would have quietly formalized the local paths
// as if they were peers of the real AuthFor delegation, under a reassuring
// generic name. Per direct project-owner correction (2026-09-09), the
// split is now structural, not just a comment:
//
//   1. Local session cookie   -> ./legacy-local-session.js (BYPASSES AuthFor)
//   2. Local JWT (dead code)  -> ./legacy-local-session.js (BYPASSES AuthFor)
//   3. AuthFor delegation     -> ./authfor-client.js        (the real system)
//   4. Signed resource URL    -> ./authfor-client.js        (distinct: resource access, not identity)
//
// authenticate() below tries them in EXACTLY this order - unchanged from
// the original inline logic. That means a request carrying a valid
// weyland_session cookie is accepted WITHOUT AuthFor ever being consulted.
// This is the thing the project owner flagged as needing to be honestly
// visible, not the extraction's place to silently fix. Whether to remove
// path #1 (and #2, already confirmed dead) is a real decision for the
// project owner - see legacy-local-session.js for what's known and unknown
// about whether `weyland_sessions` is still actively written.
//
// None of the four mechanisms' internal logic changed in this extraction -
// only relocated, split into named functions, and composed here instead of
// being one unlabeled sequential block.

import { authenticateLocalSession, authenticateLocalJwt } from "./legacy-local-session.js";
import { authenticateViaAuthFor, checkSignedUrlAccess } from "./authfor-client.js";
import { jsonResponse3 } from "./json-response.js";

export async function authenticate(request2, env2) {
  const url = new URL(request2.url);

  // 1. Local session cookie - BYPASSES AuthFor. See file header.
  const localSessionResult = await authenticateLocalSession(request2, env2);
  if (localSessionResult) return localSessionResult;

  // 2. Local JWT - BYPASSES AuthFor. Self-documented as dead for real
  // traffic in the original code (nothing in this worker signs a local
  // JWT_SECRET token). Kept unremoved; see legacy-local-session.js.
  const localJwtResult = await authenticateLocalJwt(request2, env2);
  if (localJwtResult) return localJwtResult;

  // 3. AuthFor delegation - the real, intended identity provider.
  const authForResult = await authenticateViaAuthFor(request2, env2);
  if (authForResult) return authForResult;

  // 4. Signed resource URL - distinct concern (resource access, not
  // identity), also delegated to authfor-client.js.
  const signedUrlResult = await checkSignedUrlAccess(url, env2);
  if (signedUrlResult) return signedUrlResult;

  return { error: jsonResponse3({ error: "Authentication required — sign in at /" }, 401) };
}

// Constant-time string compare, used only by authenticateCps below to
// check the X-Fleet-Key service header. Not exported - no other call site
// in the codebase (verified: grep for fleetKeyEqual returned exactly the
// one call site inside authenticateCps).
function fleetKeyEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string")
    return false;
  if (provided.length === 0 || expected.length === 0)
    return false;
  const enc = new TextEncoder();
  const a = enc.encode(provided);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++)
    diff |= a[i % a.length] ^ b[i % b.length];
  return diff === 0;
}

// CPS-specific auth variant: accepts a service-to-service X-Fleet-Key
// header (used by the fleet import pipeline), falling back to the regular
// authenticate() above for everything else. Only 4 call sites in the
// current bundle (per WORKER_MODULARIZATION_MAP.md §2).
export async function authenticateCps(request2, env2) {
  const provided = request2.headers.get("X-Fleet-Key");
  if (provided && env2.FLEET_API_KEY && fleetKeyEqual(provided, env2.FLEET_API_KEY)) {
    return {
      user: {
        sub: "svc-fleet-import",
        userId: "svc-fleet-import",
        id: "svc-fleet-import",
        email: "fleet@mhs.internal",
        name: "Fleet Service (X-Fleet-Key)",
        role: "service",
        service: true,
        tenants: [],
        tenant_id: "ven_weyland",
        // matches authenticate()'s fleet default
        tenantId: "ven_weyland"
      }
    };
  }
  return authenticate(request2, env2);
}

// Blanket subscription check: active/trialing, and under the submittals
// usage limit. Called directly by some routes and indirectly via
// requireProductAccess below.
export async function requireActiveSubscription(user, env2) {
  // Ephemeral guests have no local `users` row to check subscription/usage
  // against - requireProductAccess above applies the real, separate trial
  // policy (the EPHEMERAL_TRIAL_PRODUCTS allowlist) for routes that call
  // it. For the smaller number of routes that call this function directly
  // without going through requireProductAccess, an ephemeral guest passes
  // here unconditionally - this function's job is "is this a legitimate,
  // currently-usable session", which is true for a live ephemeral session
  // by definition (AuthFor already verified the token is real and
  // unexpired before this is ever reached).
  if (user?.ephemeral) return null;
  if (!user?.userId) {
    return jsonResponse3({
      success: false,
      error: { code: "AUTH_REQUIRED", message: "Authentication required" }
    }, 401);
  }
  const row = await env2.DB.prepare(`
    SELECT subscription_status, subscription_tier, submittals_used, submittals_limit, trial_ends_at
    FROM users WHERE id = ?
  `).bind(user.userId).first();
  if (!row) {
    return jsonResponse3({
      success: false,
      error: { code: "NOT_FOUND", message: "User not found" }
    }, 404);
  }
  const status = row.subscription_status || "trial";
  if (status === "trial" && row.trial_ends_at) {
    if (new Date(row.trial_ends_at) < /* @__PURE__ */ new Date()) {
      return jsonResponse3({
        success: false,
        error: {
          code: "SUBSCRIPTION_EXPIRED",
          message: "Your trial has expired. Please subscribe to continue.",
          subscriptionStatus: "trial_expired"
        },
        upgradeUrl: "/pg-pricing.html"
      }, 402);
    }
  }
  if (!["active", "trial"].includes(status)) {
    return jsonResponse3({
      success: false,
      error: {
        code: "SUBSCRIPTION_INACTIVE",
        message: `Your subscription is ${status}. Please update your payment method.`,
        subscriptionStatus: status
      },
      upgradeUrl: "/pg-pricing.html"
    }, 402);
  }
  const used = row.submittals_used || 0;
  const limit = row.submittals_limit || 10;
  if (used >= limit) {
    return jsonResponse3({
      success: false,
      error: {
        code: "USAGE_LIMIT_REACHED",
        message: `You have used ${used}/${limit} submittals. Please upgrade your plan.`,
        submittalsUsed: used,
        submittalsLimit: limit
      },
      upgradeUrl: "/pg-pricing.html"
    }, 402);
  }
  return null;
}

// Added 2026-09-09: the real, honest scope of AuthFor ephemeral-session
// trial access. Only these four (what was actually asked for) - not every
// product, and not decided per-product by guessing at what's "demo-safe".
// A guest gets FULL functional access to these while their ephemeral
// session is live (AuthFor's own EPHEMERAL_TTL_SECONDS governs that, not
// this code) - there is deliberately NO usage-count limiting in this pass.
// That's a real, stated gap: before this is exposed to real public traffic
// at scale, rate-limiting per ephemeral id needs to exist (see rate-limit.js
// for the existing real limiter this could reuse) - not built here because
// it needs a real per-product decision about what the limit should be, not
// an invented number.
export const EPHEMERAL_TRIAL_PRODUCTS = new Set(["subx", "takeoffx", "cutsheetx", "sightx"]);

// Closes the gap the comment above documents, added alongside the
// conglomerate-wide trial-invite-emails capability
// (mascom/flagged_next_steps_backlog.json id
// conglomerate-wide-trial-invite-emails): consenta.cc's real
// /api/v1/trials/:token/consume endpoint (co-located there with the real
// consent-capture flow this same feature already wired into AuthFor's
// ephemeral-invite claim - see consenta.cc/worker.js's /claim route and
// this repo's index.html ephemeralToken(), which now honors an incoming
// ?trial_token=). ONLY an ephemeral session that was actually invited
// with a real trial_limit (a row exists on consenta.cc for this exact
// token) gets metered - a plain anonymous landing-page visitor (no
// invite, no row) gets today's unchanged unmetered behavior, and a
// consenta.cc outage fails OPEN to the same unmetered behavior rather
// than breaking the existing no-login landing demo.
async function checkEphemeralTrialEntitlement(ephemeralToken2, productSlug) {
  if (!ephemeralToken2) return { limited: false };
  try {
    const resp = await fetch(`https://consenta.cc/api/v1/trials/${encodeURIComponent(ephemeralToken2)}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1 })
    });
    const result = await resp.json().catch(() => null);
    if (!result || result.reason === "NOT_FOUND") return { limited: false };
    if (result.ok) return { limited: false };
    return { limited: true, reason: result.reason };
  } catch (e) {
    console.log("[requireProductAccess] consenta.cc trial-entitlement check failed, failing open:", e?.message);
    return { limited: false };
  }
}

// Per-product entitlement (TakeoffX, CutsheetX, ...) layered on top of the
// blanket subscription check above. 'subconp' tier (the full suite) always
// passes; a standalone purchase adds its product slug to
// users.products_enabled (comma-separated) via the checkout webhook.
// ~40 call sites across every product vertical (map §2).
export async function requireProductAccess(user, env2, productSlug) {
  if (user?.ephemeral) {
    if (!EPHEMERAL_TRIAL_PRODUCTS.has(productSlug)) {
      return jsonResponse3({
        success: false,
        error: {
          code: "EPHEMERAL_PRODUCT_NOT_AVAILABLE",
          message: `Trying ${productSlug} requires a real account - see /pricing, or /login to create one.`
        },
        upgradeUrl: "/pricing"
      }, 402);
    }
    const trialCheck = await checkEphemeralTrialEntitlement(user.ephemeralToken, productSlug);
    if (trialCheck.limited) {
      return jsonResponse3({
        success: false,
        error: {
          code: "TRIAL_LIMIT_REACHED",
          message: trialCheck.reason === "NOT_ACTIVATED"
            ? "Your trial hasn't been claimed yet - use the claim link from your invite email."
            : `Your invited trial limit has been reached. Subscribe to keep using ${productSlug}.`
        },
        upgradeUrl: "/pricing"
      }, 402);
    }
    return null;
  }
  const subError = await requireActiveSubscription(user, env2);
  if (subError) return subError;
  const row = await env2.DB.prepare(
    "SELECT subscription_tier, products_enabled FROM users WHERE id = ?"
  ).bind(user.userId).first();
  if (!row) {
    return jsonResponse3({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }, 404);
  }
  if (row.subscription_tier === "subconp") return null;
  const enabled = (row.products_enabled || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (enabled.includes(productSlug)) return null;
  return jsonResponse3({
    success: false,
    error: {
      code: "PRODUCT_NOT_ENABLED",
      message: `Your plan doesn't include ${productSlug}. See /pricing to add it.`
    },
    upgradeUrl: "/pricing"
  }, 402);
}
