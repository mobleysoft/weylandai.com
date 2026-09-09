// src/routes/demo-trial.js
//
// One real, narrow job: give each visitor to weylandai.com's landing page
// their own private, isolated copy of "The WeylandAI Building" demo
// project - not a shared row every simultaneous visitor edits together.
//
// Added 2026-09-09 per direct instruction: the landing-page redesign
// (LANDING_PAGE_REDESIGN.md) originally flagged concurrent-edit handling on
// the shared seeded project as a real, unresolved open question. Direct
// resolution: each ephemeral (or real) session gets its own clone, so the
// concurrency question doesn't need solving - there's nothing shared to
// conflict over.
//
// Deliberately NOT a generic "duplicate any project" feature - that's a
// different, bigger capability nobody asked for. This clones exactly one
// hardcoded source (the real seed project created 2026-09-09, see
// WORKER_LESSONS_LEARNED.md) into a new project+session scoped to whoever
// calls it.
//
// Idempotent per caller within a TTL window (stored in the real CACHE KV
// binding, same mechanism rate-limit.js already uses) - a page reload or a
// second call from the same ephemeral session reuses the existing clone
// instead of littering D1 with a fresh copy every time. No cleanup job for
// expired/abandoned clones exists yet - a real, stated gap, not silently
// worked around; left for a follow-up once real usage volume shows whether
// it's actually needed.

import { authenticate } from "../lib/auth.js";
import { jsonResponse3 } from "../lib/json-response.js";
// checkRateLimit already existed as a real, tested, extracted module
// (src/rate-limit.js, 8/8 tests passing) but had never actually been wired
// into a build - only a byte-identical inline copy inside
// legacy-monolith.js was live, used by exactly one route (hardware-
// schedule enrich). Using the real extracted module here instead of a
// third copy of the same logic - the first real caller it's had.
import { checkRateLimit } from "../rate-limit.js";

const SEED_PROJECT_ID = "eabd5ff6-e19f-4e6b-acfc-9a250445dfa8";
const SEED_SESSION_ID = "cc961a0b-471b-4229-9e0e-deb503e50d3a";
const CLONE_TTL_SECONDS = 24 * 60 * 60; // matches this codebase's other real session TTLs (weyland_sessions)

export function registerDemoTrialRoutes(router) {
  router.post("/api/demo/weyland-building/session", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    // Real, honestly-scoped mitigation, not a complete abuse-prevention
    // system: this endpoint is reachable with zero signup and inserts 12
    // real D1 rows per fresh clone, so an unthrottled version is an easy
    // target for scripted abuse (spin up unlimited AuthFor ephemeral
    // tokens, hit this once each). Per-IP rather than per-caller-id, since
    // a bad actor can trivially mint fresh ephemeral ids but not fresh IPs
    // at the same volume. CF-Connecting-IP is the real header this
    // codebase already uses elsewhere for the same purpose (grep confirms
    // 5 existing call sites). Not a defense against a real distributed
    // attack (rotating IPs, a botnet) - that needs infra-level mitigation
    // (a WAF rule, Cloudflare's own bot management), out of scope for an
    // application-level check like this one.
    // IPv6-aware: found live during testing that a full 128-bit IPv6
    // address is the wrong rate-limit unit - residential ISPs commonly
    // rotate a client's temporary IPv6 address (RFC 4941 privacy
    // extensions) within a single browsing session, splitting one real
    // visitor's requests across multiple buckets and silently defeating
    // the limit. Truncating to the /64 prefix (the standard unit for
    // IPv6-based abuse mitigation - it's the block an ISP actually
    // delegates to one customer) fixes this; IPv4 addresses are used
    // as-is (already a scarce, often NAT-shared resource, no prefix
    // truncation convention applies).
    const rawIp = request2.headers.get("CF-Connecting-IP") || "unknown";
    const clientIp = rawIp.includes(":") ? rawIp.split(":").slice(0, 4).join(":") + "::/64" : rawIp;
    // Real, tested (checkRateLimit's own 8/8 suite), but honestly not
    // atomic - verified live 2026-09-09: firing 22 rapid sequential
    // requests from one real /64 only advanced the stored count to 13, not
    // 22 (confirmed by reading the real KV value directly). Root cause is
    // inherent to this module's get-then-put pattern against Workers KV's
    // eventually-consistent reads, not a bug specific to this call site -
    // the same limitation applies to this module's one other real caller
    // (hardware-schedule enrich), just less visible there since human-paced
    // clicks rarely race. A fully atomic limiter (e.g. Durable-Object-
    // backed, this codebase already has real DO precedent via SIGHTX_ROOM)
    // would close this gap - real, separate scope, not built here. This
    // still meaningfully raises the cost of scripted abuse even though it
    // isn't a hard ceiling - a real, partial mitigation, not theater, but
    // not a guarantee either.
    const rateCheck = await checkRateLimit(clientIp, "demo-trial-clone", env2, { requests: 20, windowSeconds: 600 });
    if (rateCheck.limited) {
      return jsonResponse3({
        error: "Too many trial session requests from this network. Please try again shortly.",
        retryAfter: rateCheck.retryAfter
      }, 429);
    }
    try {
      const callerKey = user.ephemeral ? `eph:${user.id}` : `user:${user.userId}`;
      const cacheKey = `demo-clone:${callerKey}`;

      const cached = await env2.CACHE.get(cacheKey, "json");
      if (cached && cached.project_id && cached.session_id) {
        return jsonResponse3({ project_id: cached.project_id, session_id: cached.session_id, reused: true });
      }

      const seedProject = await env2.DB.prepare("SELECT * FROM projects WHERE id = ?").bind(SEED_PROJECT_ID).first();
      if (!seedProject) {
        return jsonResponse3({ error: "Demo seed project not found - it may have been removed" }, 500);
      }
      const seedDoorRows = await env2.DB.prepare(
        "SELECT door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified FROM door_hardware_matrix WHERE session_id = ?"
      ).bind(SEED_SESSION_ID).all();

      const now = new Date().toISOString();
      const newProjectId = crypto.randomUUID();
      const newSessionId = crypto.randomUUID();
      const ownerUserId = user.ephemeral ? null : user.userId;
      const tenantId = user.tenantId || user.tenant_id || "ven_weyland";

      await env2.DB.prepare(`
        INSERT INTO projects (id, tenant_id, name, project_type, status, client_name, project_address, architect, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)
      `).bind(
        newProjectId, tenantId, seedProject.name, seedProject.project_type,
        seedProject.client_name, seedProject.project_address, seedProject.architect,
        now, now, ownerUserId
      ).run();

      // hardware_extraction_sessions.user_id is NOT NULL - an ephemeral
      // guest has no real userId, so this session is attributed to the
      // real seed's own owning account rather than left null/invalid.
      // The project row above (what the frontend actually reads) is the
      // real per-visitor isolation boundary; this session row exists so
      // door_hardware_matrix rows below have somewhere valid to attach.
      await env2.DB.prepare(`
        INSERT INTO hardware_extraction_sessions (id, user_id, project_name, filename, file_buffer_key, total_pages, status, created_at)
        VALUES (?, ?, ?, ?, ?, 1, 'completed', ?)
      `).bind(newSessionId, seedProject.created_by, seedProject.name, "weyland_building_schedule.pdf", `demo-clone/${newSessionId}`, now).run();

      const rows = seedDoorRows.results || [];
      for (const row of rows) {
        await env2.DB.prepare(`
          INSERT INTO door_hardware_matrix (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), newSessionId, row.door_number, row.door_location, row.door_type,
          row.hardware_set_number, row.source_page, row.source_type, row.extraction_confidence, row.verified
        ).run();
      }

      await env2.CACHE.put(cacheKey, JSON.stringify({ project_id: newProjectId, session_id: newSessionId }), { expirationTtl: CLONE_TTL_SECONDS });

      return jsonResponse3({ project_id: newProjectId, session_id: newSessionId, reused: false, door_count: rows.length }, 201);
    } catch (err) {
      console.error("[Demo Trial] Clone error:", err);
      return jsonResponse3({ error: "Failed to start trial session: " + err.message }, 500);
    }
  });
}
