import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerTakeoffDataRoutes } from "./takeoff-data.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;

function makeFakeDb({ session = null, project = null, hardwareSets = [], components = [], lineItems = [], settings = null, vendorProfile = null } = {}) {
  return {
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM hardware_extraction_sessions")) return session;
          if (sql.includes("FROM takeoff_settings")) return settings;
          if (sql.includes("FROM vendor_profile")) return vendorProfile;
          if (sql.includes("FROM projects")) return project;
          return null;
        },
        async all() {
          if (sql.includes("FROM hardware_sets")) return { results: hardwareSets };
          if (sql.includes("FROM hardware_components")) return { results: components };
          if (sql.includes("FROM takeoff_line_items")) return { results: lineItems };
          return { results: [] };
        },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerTakeoffDataRoutes(router, { authenticate: authOk, requireProductAccess: prodOk });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/takeoff/session/:sessionId/data: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerTakeoffDataRoutes(router, { authenticate: authFail, requireProductAccess: prodOk });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/data"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /api/takeoff/session/:sessionId/data: 404 when session not found for user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/data"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/takeoff/session/:sessionId/data: real happy path assembles hardwareSets/doors/totals shape", async () => {
  const db = makeFakeDb({
    session: { id: "s1", project_name: "Proj", filename: "f.pdf", created_at: "2026-01-01" },
    hardwareSets: [{ id: "hs1", set_number: "1", door_count: 2, line_total: 100 }],
    components: [{ id: "c1", set_id: "hs1", price_source: "catalog" }],
    lineItems: [
      { id: "li1", category: "door", quantity: 1, unit_price: 50 },
      { id: "li2", category: "service", quantity: 1, unit_price: 25, taxable: 1 },
    ],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/data"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.hardwareSets.length, 1);
  assert.equal(body.hardwareSets[0].components.length, 1);
  assert.equal(body.doors.length, 1);
  assert.equal(body.services.length, 1);
  assert.equal(body.totals.subtotal, 100 + 50 + 25);
});

test("GET /api/takeoff/project/:projectId/data: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerTakeoffDataRoutes(router, { authenticate: authFail, requireProductAccess: prodOk });
  const res = await router.handle(new Request("https://example.com/api/takeoff/project/p1/data"), { DB: null }, {});
  assert.equal(res.status, 401);
});
