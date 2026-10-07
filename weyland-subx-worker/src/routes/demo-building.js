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
// demo-clone:<caller>, same 24 h life, same per-network limit, same rows),
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
      // Only a NEW copy (about 45 rows) counts toward the per-network limit:
      // handing back an existing one writes nothing.
      const rateCheck = await checkRateLimit(networkOf(request2.headers.get("CF-Connecting-IP")), "demo-trial-clone", env2, { requests: 20, windowSeconds: 600 });
      if (rateCheck.limited) {
        return jsonResponse3({ error: "Too many trial session requests from this network. Please try again shortly.", retryAfter: rateCheck.retryAfter }, 429);
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
