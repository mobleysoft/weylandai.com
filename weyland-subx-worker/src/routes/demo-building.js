// weyland-subx-worker/src/routes/demo-building.js
//
//   POST /api/demo/weyland-building/session
//
// Gives the caller (a guest's AuthFor ephemeral token or an account) their
// own private copy of SubX's demo project "The WeylandAI Building" as a real
// SubX session, and answers { project_id, session_id, reused }. The homepage
// calls it when its SubX chapter comes into view; the copy then opens in the
// SubX workspace, builds a submittal package and prices in PropX.
//
// Moved here from the repo-root monolith (src/routes/demo-trial.js) on
// 2026-10-07, request and answer unchanged (same KV pointer
// demo-clone:<caller>, same 24 h life, same rows; a guest's new copies keep
// the per-network limit, an account's count toward the account - see below),
// so that a copy carries the demo's hardware sets WITH their parts
// (lib/demo-building.js) and is written in one D1 batch. This worker already
// owned the rest of the copy's life: the workspace that opens it and the
// sweep that removes it (lib/demo-clone-sweep.js).
//
// A pointer to a copy that is gone or incomplete (made before 2026-10-07
// without parts, or cut short) is not handed back: a fresh copy replaces it,
// and the sweep removes the old rows when they expire.

import { jsonResponse3 } from "../lib/json-response.js";
import { cloneDemoBuilding, seedShape, copyShape, copyIsComplete, CLONE_TTL_SECONDS } from "../lib/demo-building.js";

export function callerKey(user) {
  return user.ephemeral ? "eph:" + user.id : "user:" + user.userId;
}

// IPv6 visitors rotate addresses inside one /64 (RFC 4941), so the limit is per /64; IPv4 as is.
export function networkOf(rawIp) {
  const ip = rawIp || "unknown";
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") + "::/64" : ip;
}

/** Which limit a new copy counts toward: a guest's network, or an account. */
export function demoCopyLimit(user, rawIp) {
  if (user && !user.ephemeral && user.userId) {
    return { key: "user:" + user.userId, limits: { requests: 5, windowSeconds: 600 }, message: "Too many copies of the demo building were made for this account in the last few minutes. Please try again shortly." };
  }
  return { key: networkOf(rawIp), limits: { requests: 20, windowSeconds: 600 }, message: "Too many copies of the demo building were made from this network in the last few minutes. Please try again shortly." };
}

export function registerDemoBuildingRoutes(router, { authenticate, checkRateLimit }) {
  const handler = async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    if (!user || (!user.ephemeral && !user.userId)) {
      return jsonResponse3({ error: "Sign in, or open the homepage for a guest session, to get your copy of the demo building." }, 401);
    }
    try {
      const cacheKey = "demo-clone:" + callerKey(user);
      const cached = await env2.CACHE.get(cacheKey, "json");
      if (cached && cached.project_id && cached.session_id) {
        const [seed, copy] = await Promise.all([seedShape(env2.DB), copyShape(env2.DB, cached.session_id)]);
        if (copyIsComplete(copy, seed)) {
          return jsonResponse3({ project_id: cached.project_id, session_id: cached.session_id, reused: true });
        }
      }
      // Only a NEW copy (about 45 rows) counts toward a limit: handing back an
      // existing one writes nothing. A guest (an AuthFor ephemeral token, free
      // to mint) is limited per network, as before. An account is limited per
      // account instead: its copy is normally made once a day (the KV pointer),
      // so the limit only stops bursts, and an account's copy (the workspace
      // asks for one when its list is empty) no longer uses up its network's
      // allowance for guests - an office of signed-in users, or a run of the
      // journey tests from one machine, found the demo refused (2026-10-07).
      const limit = demoCopyLimit(user, request2.headers.get("CF-Connecting-IP"));
      const rateCheck = await checkRateLimit(limit.key, "demo-trial-clone", env2, limit.limits);
      if (rateCheck.limited) {
        return jsonResponse3({ error: limit.message, retryAfter: rateCheck.retryAfter }, 429);
      }
      const made = await cloneDemoBuilding(env2, user);
      await env2.CACHE.put(cacheKey, JSON.stringify({ project_id: made.project_id, session_id: made.session_id }), { expirationTtl: CLONE_TTL_SECONDS });
      return jsonResponse3({
        project_id: made.project_id,
        session_id: made.session_id,
        reused: false,
        door_count: made.door_count,
        hardware_sets_created: made.hardware_sets,
        hardware_components: made.hardware_components,
      }, 201);
    } catch (err) {
      console.error("[Demo building] copy failed:", err && err.message);
      return jsonResponse3({ error: "Failed to start trial session: " + ((err && err.message) || err) }, 500);
    }
  };
  router.post("/api/demo/weyland-building/session", handler);
  router.post("/api/demo/weyland-building/session/", handler);
}
