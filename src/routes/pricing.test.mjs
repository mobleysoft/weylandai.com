import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerPricingRoutes } from "./pricing.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const authCpsOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });

function makeFakeDb({ projects = {}, sessions = [], components = [], aliases = [], variants = [] } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM projects")) return projects[stmt.binds[0]] || null;
          if (sql.includes("FROM hardware_components WHERE id")) return null;
          return null;
        },
        async all() {
          if (sql.includes("FROM hardware_extraction_sessions")) return { results: sessions.map((id) => ({ id })) };
          if (sql.includes("FROM hardware_components")) return { results: components };
          if (sql.includes("FROM manufacturer_aliases")) return { results: aliases };
          if (sql.includes("FROM product_variants")) return { results: variants };
          return { results: [] };
        },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerPricingRoutes(router, { authenticate: authOk, authenticateCps: authCpsOk });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cps/price-check: auth failure short-circuits before touching the database", async () => {
  const router = new NativeRouter();
  registerPricingRoutes(router, { authenticate: authFail, authenticateCps: authCpsOk });
  const res = await router.handle(new Request("https://example.com/api/cps/price-check?model=X"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/price-check: missing model is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cps/price-check"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/cps/price-check: real not-found lookup returns found:false, not an error", async () => {
  const { router, env } = setup({ db: makeFakeDb({ aliases: [], variants: [] }) });
  const res = await router.handle(new Request("https://example.com/api/cps/price-check?manufacturer=UNKNOWN&model=ZZZ"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, false);
});

test("POST /api/cps/enrich-session/:sessionId: no un-priced components short-circuits without an enrich pass", async () => {
  const { router, env } = setup({ db: makeFakeDb({ components: [] }) });
  const res = await router.handle(new Request("https://example.com/api/cps/enrich-session/s1", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(body.enriched, 0);
  assert.equal(body.message, "No un-priced components to enrich");
});

test("POST /api/cps/enrich-project/:projectId: real 404 when project not found for tenant", async () => {
  const { router, env } = setup({ db: makeFakeDb({ projects: {} }) });
  const res = await router.handle(new Request("https://example.com/api/cps/enrich-project/p1", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/cps/enrich-project/:projectId: real no-linked-sessions short-circuit", async () => {
  const db = makeFakeDb({ projects: { p1: { id: "p1", name: "Proj" } }, sessions: [] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/enrich-project/p1", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(body.message, "No linked sessions");
});

test("GET /api/cps/pricing-options: missing model is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cps/pricing-options"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/cps/pricing-options: real empty-options response when nothing matches", async () => {
  const { router, env } = setup({ db: makeFakeDb({ variants: [] }) });
  const res = await router.handle(new Request("https://example.com/api/cps/pricing-options?manufacturer=SCHLAGE&model=L9080"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.totalOptions, 0);
});

test("POST /api/pricing/resolve: real end-to-end delegation to resolveCataloguePrices", async () => {
  const db = makeFakeDb({
    aliases: [{ alias: "SCHLAGE", manufacturer_id: "mfr-schlage" }],
    variants: [{
      variant_id: "v1", product_id: "p1", full_model_number: "L9080 06",
      finish_code: "626", unit_price: 450, list_price: 500, manufacturer_id: "mfr-schlage",
    }],
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/pricing/resolve", {
    method: "POST",
    body: JSON.stringify({ components: [{ manufacturer: "SCHLAGE", model: "L9080 06", finish: "626" }] }),
  });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.priced, 1);
  assert.equal(body.coverage_percent, 100);
});
