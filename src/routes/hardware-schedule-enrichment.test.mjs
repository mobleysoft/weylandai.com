import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareScheduleEnrichmentRoutes } from "./hardware-schedule-enrichment.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const rateLimitOk = async () => ({ limited: false, remaining: 9 });
const noopEnrich = (c) => c;
const noopReason = () => "Not yet reviewed";

function makeFakeDb({ session = null, components = [], pendingPages = [], pages = [] } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM hardware_extraction_sessions")) return session;
          return null;
        },
        async all() {
          if (sql.includes("FROM hardware_components")) return { results: components };
          if (sql.includes("FROM hardware_page_extractions hpe")) return { results: pendingPages };
          if (sql.includes("FROM hardware_page_extractions") && sql.includes("affirm_state")) return { results: pages };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

function setup({ db, checkRateLimit, enrichComponent, storeHardwareExtraction } = {}) {
  const router = new NativeRouter();
  registerHardwareScheduleEnrichmentRoutes(router, {
    authenticate: authOk,
    checkRateLimit: checkRateLimit || rateLimitOk,
    enrichComponent: enrichComponent || noopEnrich,
    getUnaffirmReason: noopReason,
    storeHardwareExtraction: storeHardwareExtraction || (async () => ({ groups_inserted: 0, components_inserted: 0 })),
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST .../enrich: auth failure short-circuits before rate-limit or DB", async () => {
  const router = new NativeRouter();
  let rateLimitCalled = false;
  registerHardwareScheduleEnrichmentRoutes(router, {
    authenticate: authFail,
    checkRateLimit: async () => { rateLimitCalled = true; return { limited: false }; },
    enrichComponent: noopEnrich, getUnaffirmReason: noopReason, storeHardwareExtraction: async () => ({}),
  });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/enrich", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
  assert.equal(rateLimitCalled, false);
});

test("POST .../enrich: real 429 when rate limited (real pre-existing bug: jsonResponse3 only takes (data, status) - the route's 3rd headers arg, incl. Retry-After, is silently dropped, same as in production today; not fixed here since that'd be an unrelated behavior change)", async () => {
  const { router, env } = setup({ checkRateLimit: async () => ({ limited: true, retryAfter: 42 }) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/enrich", { method: "POST" }), env, {});
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), null);
  const body = await res.json();
  assert.equal(body.retryAfter, 42);
});

test("POST .../enrich: 403 when the session belongs to a different user", async () => {
  const db = makeFakeDb({ session: { id: "s1", user_id: "someone-else" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/enrich", { method: "POST" }), env, {});
  assert.equal(res.status, 403);
});

test("POST .../enrich: real happy path writes enriched fields via COALESCE for matched components", async () => {
  const db = makeFakeDb({
    session: { id: "s1", user_id: "u1" },
    components: [{ id: "c1", set_number: "1", component_type: "hinge" }],
  });
  const enrichAlways = (c) => ({ ...c, _enriched: true, component_description: "Real Hinge", compliance: "ANSI", _matched_product: "X", _enrichment_confidence: 0.9 });
  const { router, env } = setup({ db, enrichComponent: enrichAlways });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/enrich", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(body.enriched, 1);
  assert.equal(body.enrichment_rate, 100);
  assert.ok(db.runs.some((r) => r.sql.includes("UPDATE hardware_components")));
});

test("POST .../backfill: real per-page processing delegates to storeHardwareExtraction and marks pages approved", async () => {
  const db = makeFakeDb({
    pendingPages: [{ id: "p1", session_id: "s1", page_number: 1, extracted_data: JSON.stringify({ hardware_groups: [{ group_number: "1", components: [] }] }), user_id: "u1" }],
  });
  let storeCalled = 0;
  const { router, env } = setup({ db, storeHardwareExtraction: async () => { storeCalled++; return { groups_inserted: 2, components_inserted: 5 }; } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/backfill", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(storeCalled, 1);
  assert.equal(body.total_sets_inserted, 2);
  assert.equal(body.total_components_inserted, 5);
  assert.ok(db.runs.some((r) => r.sql.includes("SET status = 'approved'")));
});

test("POST .../backfill: a page with zero hardware_groups is skipped, not delegated to storeHardwareExtraction", async () => {
  const db = makeFakeDb({
    pendingPages: [{ id: "p1", session_id: "s1", page_number: 1, extracted_data: JSON.stringify({ hardware_groups: [] }), user_id: "u1" }],
  });
  let storeCalled = 0;
  const { router, env } = setup({ db, storeHardwareExtraction: async () => { storeCalled++; return {}; } });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/backfill", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(storeCalled, 0);
  assert.equal(body.results[0].status, "skipped");
});

test("GET .../affirm-status: real summary counts groups/components and flags unaffirmed items", async () => {
  const db = makeFakeDb({
    pages: [{
      id: "p1", page_number: 1,
      extracted_data: JSON.stringify({ hardware_groups: [{ id: "g1", group_number: "1", components: [{ type: "hinge" }] }] }),
      affirm_state: JSON.stringify({ groups: [{ id: "g1", affirmed: true, components: [{ index: 0, affirmed: false }] }] }),
    }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/affirm-status"), env, {});
  const body = await res.json();
  assert.equal(body.summary.totalGroups, 1);
  assert.equal(body.summary.affirmedGroups, 1);
  assert.equal(body.summary.totalComponents, 1);
  assert.equal(body.summary.affirmedComponents, 0);
  assert.equal(body.summary.allAffirmed, false);
  assert.equal(body.unaffirmedItems.length, 1);
  assert.equal(body.unaffirmedItems[0].type, "component");
});
