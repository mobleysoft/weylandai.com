import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerTakeoffLineItemsRoutes } from "./takeoff-line-items.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const prodOk = async () => null;

function makeFakeDb({ existingSettings = null, hardwareSet = null, deleteChanges = 1 } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM takeoff_settings")) return existingSettings;
          if (sql.includes("FROM hardware_sets")) return hardwareSet;
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          runs.push({ sql, binds: stmt.binds });
          if (sql.includes("DELETE FROM takeoff_line_items")) return { success: true, changes: deleteChanges };
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

function setup({ db } = {}) {
  const router = new NativeRouter();
  registerTakeoffLineItemsRoutes(router, { authenticate: authOk, requireProductAccess: prodOk });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/takeoff/session/:sessionId/settings: real INSERT when none exists yet", async () => {
  const db = makeFakeDb({ existingSettings: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/takeoff/session/s1/settings", { method: "POST", body: JSON.stringify({ tax_rate: 0.08 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO takeoff_settings")));
});

test("POST /api/takeoff/session/:sessionId/settings: real UPDATE when a row already exists", async () => {
  const db = makeFakeDb({ existingSettings: { id: "set1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/takeoff/session/s1/settings", { method: "POST", body: JSON.stringify({ tax_rate: 0.05 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("UPDATE takeoff_settings")));
});

test("POST /api/takeoff/session/:sessionId/line-items: invalid category is a real 400, no write", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/takeoff/session/s1/line-items", { method: "POST", body: JSON.stringify({ category: "bogus" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
  assert.equal(env.DB.runs.length, 0);
});

test("POST /api/takeoff/session/:sessionId/line-items: real insert for a valid category", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/takeoff/session/s1/line-items", { method: "POST", body: JSON.stringify({ category: "door", quantity: 2 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.id);
  assert.ok(env.DB.runs.some((r) => r.sql.includes("INSERT INTO takeoff_line_items")));
});

test("DELETE /api/takeoff/session/:sessionId/line-items/:itemId: real happy-path delete (changes=1)", async () => {
  const { router, env } = setup({ db: makeFakeDb({ deleteChanges: 1 }) });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/line-items/li1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
});

test("DELETE /api/takeoff/session/:sessionId/line-items/:itemId: real 404 when zero rows match", async () => {
  const { router, env } = setup({ db: makeFakeDb({ deleteChanges: 0 }) });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/line-items/li1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 404);
});

test("PUT /api/takeoff/sets/:setId/price: 404 when the set doesn't exist", async () => {
  const { router, env } = setup({ db: makeFakeDb({ hardwareSet: null }) });
  const req = new Request("https://example.com/api/takeoff/sets/hs1/price", { method: "PUT", body: JSON.stringify({ unit_price_override: 500 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PUT /api/takeoff/sets/:setId/price: 403 when the set belongs to a different user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ hardwareSet: { id: "hs1", set_number: "1", user_id: "someone-else" } }) });
  const req = new Request("https://example.com/api/takeoff/sets/hs1/price", { method: "PUT", body: JSON.stringify({ unit_price_override: 500 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 403);
});

test("PUT /api/takeoff/sets/:setId/price: real price override write for the owning user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ hardwareSet: { id: "hs1", set_number: "1", user_id: "u1" } }) });
  const req = new Request("https://example.com/api/takeoff/sets/hs1/price", { method: "PUT", body: JSON.stringify({ unit_price_override: 500 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  assert.ok(env.DB.runs.some((r) => r.sql.includes("UPDATE hardware_sets SET unit_price_override")));
});

test("PUT /api/takeoff/sets/:setId/price: negative override is a real 400", async () => {
  const { router, env } = setup({ db: makeFakeDb({ hardwareSet: { id: "hs1", set_number: "1", user_id: "u1" } }) });
  const req = new Request("https://example.com/api/takeoff/sets/hs1/price", { method: "PUT", body: JSON.stringify({ unit_price_override: -5 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});
