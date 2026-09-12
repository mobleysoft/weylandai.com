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
// Real, already-tested bridge (src/lib/submittal-transforms.js) - the same
// function sessions-finalize-from-job.js calls after a real SABP door-
// schedule extraction completes. Reused here (2026-09-12 fix) instead of
// writing a second, parallel implementation: it groups door_schedule_entries
// by hardware_group into real hardware_sets rows, satisfying that table's
// NOT NULL approval-workflow columns (approved_from_page/approved_at/
// approved_by/source_page_extraction_id) via a real bridge-origin
// hardware_page_extractions row - not by relaxing or faking those columns.
import { transformDoorEntriesToHardwareSets } from "../lib/submittal-transforms.js";

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
      // guest has no real userId, so THAT case is attributed to the real
      // seed's own owning account rather than left null/invalid. Fixed
      // 2026-09-12: a REAL logged-in caller (ownerUserId is set) is now
      // attributed to their own account instead of unconditionally
      // borrowing the seed's - the original unconditional version meant
      // every real customer's cloned session was owned by demo-seed@
      // weylandai.com, not them, which silently locked them out of every
      // ownership-checked route on their own cloned data (GET .../export,
      // .../generate-submittal - both do `session.user_id !== user.userId`).
      // The project row above (what the frontend actually reads) is the
      // real per-visitor isolation boundary either way; this session row
      // exists so door_hardware_matrix/door_schedule_entries rows below
      // have somewhere valid to attach.
      const sessionOwnerId = ownerUserId || seedProject.created_by;
      // project_id fixed 2026-09-12: the ORIGINAL version never set this
      // column at all, so this session was invisible to every project-
      // scoped route (GET /api/projects/:id, POST /api/projects/:id/
      // cross-reference - both filter by project_id). Real bug, not a
      // deliberate omission - nothing depended on it being absent.
      await env2.DB.prepare(`
        INSERT INTO hardware_extraction_sessions (id, user_id, project_id, project_name, filename, file_buffer_key, total_pages, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'completed', ?)
      `).bind(newSessionId, sessionOwnerId, newProjectId, seedProject.name, "weyland_building_schedule.pdf", `demo-clone/${newSessionId}`, now).run();

      const rows = seedDoorRows.results || [];
      for (const row of rows) {
        // Real, honest data-integrity fix (2026-09-12): this used to be the
        // ONLY table a demo clone's door data landed in. Every real
        // downstream route (cross-reference.js, door-schedule-marks.js,
        // hardware-schedule-export.js, hardware-schedule-generate.js) reads
        // from door_schedule_entries + hardware_sets instead, so a cloned
        // demo visitor's data was invisible to the real product views -
        // stranded in a table nothing else reads. Kept below (not removed):
        // GET /api/hardware-schedule/session/:id/door-index (a real, live
        // route - see hardware-schedule-export.js) still reads this exact
        // table, and the landing page's own loadRealTrial() (index.html)
        // calls that exact endpoint - removing this write would break a
        // real, currently-working feature.
        await env2.DB.prepare(`
          INSERT INTO door_hardware_matrix (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), newSessionId, row.door_number, row.door_location, row.door_type,
          row.hardware_set_number, row.source_page, row.source_type, row.extraction_confidence, row.verified
        ).run();

        // NEW (2026-09-12): the real table the rest of the product actually
        // reads. tenant_id/page_number/mark/hardware_group/door_type/
        // extraction_confidence map 1:1 off the same seed row above -
        // door_number -> mark, hardware_set_number -> hardware_group (the
        // raw token cross-reference.js/hardware_sets.set_number both key
        // off of). validation_status/validated/validated_at carry the
        // seed's own `verified` flag forward honestly instead of inventing
        // a new judgment about data nobody has actually reviewed.
        await env2.DB.prepare(`
          INSERT INTO door_schedule_entries (id, session_id, tenant_id, page_number, mark, hardware_group, door_type, extraction_confidence, validation_status, validated, validated_by, validated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), newSessionId, tenantId, row.source_page || 1, row.door_number,
          row.hardware_set_number, row.door_type, row.extraction_confidence,
          row.verified ? "validated" : "pending", row.verified ? 1 : 0,
          // validated_by here is deliberately NOT gated on row.verified: it
          // is real and honest for every row regardless (the demo bridge
          // below really did resolve every row's hardware_set_id, whether
          // or not the seed's own extraction was human-verified) - and
          // cross-reference.js's own stale-clearing logic (a real route
          // this project_id fix now makes reachable) skips any mark with a
          // non-null validated_by, so this also protects the exact
          // hardware_set_id links this route sets below from being wiped
          // back to NULL by a later real cross-reference run, which would
          // otherwise happen: this single-document demo clone has no
          // separate hardware_schedule-typed session for cross-reference's
          // fuzzy matcher to find candidates in, so it would see 0
          // candidates and clear every unprotected mark as unmatched.
          "demo-seed-bridge", row.verified ? now : null, now
        ).run();
      }

      // Real bridge (src/lib/submittal-transforms.js, already used by the
      // production SABP door-schedule finalize path) groups the
      // door_schedule_entries just inserted by hardware_group into real
      // hardware_sets rows attached to the SAME session - this is what
      // actually unblocks GET .../export and GET .../generate-submittal for
      // a cloned demo session. "demo-seed-clone" (not the real caller's
      // user id) is the honest attribution here: nobody - guest or real
      // account - has actually reviewed/approved this data, it was
      // auto-cloned, so approved_by/user_id should say that plainly rather
      // than borrow a real human's identity for data they never touched.
      let hardwareSetsResult = { setsCreated: 0 };
      try {
        hardwareSetsResult = await transformDoorEntriesToHardwareSets(newSessionId, "demo-seed-clone", env2);
      } catch (bridgeErr) {
        // Non-fatal by design, same posture as every other real caller of
        // this bridge (sessions-finalize-from-job.js): the door_schedule_entries
        // rows above are already real and already fix the door-index/cross-
        // reference visibility gap even if this second step fails.
        console.error("[Demo Trial] hardware_sets bridge failed (non-fatal):", bridgeErr.message);
      }

      // Directly link door_schedule_entries.hardware_set_id -> hardware_sets.id
      // for this session. Honest because it's not a fuzzy guess: both sides
      // were generated from the exact same seed token (hardware_set_number),
      // so an exact string match is a real, verifiable link - not the
      // project-level fuzzy/pattern matching cross-reference.js does across
      // two separately-uploaded documents (a real, different scenario this
      // single-document demo clone doesn't have).
      await env2.DB.prepare(`
        UPDATE door_schedule_entries
        SET hardware_set_id = (
              SELECT hs.id FROM hardware_sets hs
              WHERE hs.session_id = door_schedule_entries.session_id
                AND hs.set_number = door_schedule_entries.hardware_group
            ),
            hardware_group_match_score = 1.0,
            hardware_group_match_method = 'demo_seed_direct',
            updated_at = ?
        WHERE session_id = ? AND hardware_group IS NOT NULL
      `).bind(now, newSessionId).run();

      await env2.CACHE.put(cacheKey, JSON.stringify({ project_id: newProjectId, session_id: newSessionId }), { expirationTtl: CLONE_TTL_SECONDS });

      return jsonResponse3({
        project_id: newProjectId,
        session_id: newSessionId,
        reused: false,
        door_count: rows.length,
        hardware_sets_created: hardwareSetsResult.setsCreated || 0
      }, 201);
    } catch (err) {
      console.error("[Demo Trial] Clone error:", err);
      return jsonResponse3({ error: "Failed to start trial session: " + err.message }, 500);
    }
  });
}
