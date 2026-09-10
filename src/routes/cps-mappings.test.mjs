import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsMappingsRoutes } from "./cps-mappings.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ mappings = [], total = 0, existingMapping = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("SELECT COUNT(*) as total")) return { total };
            if (sql.includes("FROM product_mappings WHERE mapping_id")) return existingMapping;
            if (sql.includes("SELECT mapping_id, affirmed FROM product_mappings")) return existingMapping;
            if (sql.includes("SELECT mapping_id FROM product_mappings")) return existingMapping;
            return null;
          },
          async all() {
            return { results: mappings };
          },
          async run() {
            return { success: true };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCpsMappingsRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cps/mappings: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/mappings"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/mappings: real happy path with pagination fields", async () => {
  const db = makeFakeDb({ mappings: [{ mapping_id: "m1" }], total: 3 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/mappings?limit=10&offset=0"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 3);
  assert.equal(body.mappings.length, 1);
});

test("POST /api/cps/mappings: missing catalogue_id/model is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/mappings", { method: "POST", body: JSON.stringify({ model: "L9000" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/mappings: real happy path creates a mapping", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/mappings", {
    method: "POST",
    body: JSON.stringify({ catalogue_id: "c1", model: "L9000", confidence: 0.5 }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.mapping_id);
});

test("PUT /api/cps/mappings/:id/affirm: real happy path updates an existing mapping", async () => {
  const db = makeFakeDb({ existingMapping: { mapping_id: "m1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/m1/affirm", { method: "PUT", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.created, false);
});

test("PUT /api/cps/mappings/:id/affirm: missing catalogue_id/model for a new mapping is a real 400", async () => {
  const db = makeFakeDb({ existingMapping: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/m1/affirm", { method: "PUT", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/cps/mappings/:id/affirm: real happy path creates a new affirmed mapping", async () => {
  const db = makeFakeDb({ existingMapping: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/m1/affirm", {
    method: "PUT",
    body: JSON.stringify({ catalogue_id: "c1", model: "L9000" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.created, true);
});

test("PUT /api/cps/mappings/:id/reject: real happy path logs rejection", async () => {
  const db = makeFakeDb({ existingMapping: { mapping_id: "m1", affirmed: 1 } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/m1/reject", { method: "PUT", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.mapping_id, "m1");
  assert.equal(body.persisted, true);
});

test("POST /api/cps/mappings/affirm-batch: missing component_id is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/mappings/affirm-batch", { method: "POST", body: JSON.stringify({ pages: [{}] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/mappings/affirm-batch: empty pages array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/mappings/affirm-batch", { method: "POST", body: JSON.stringify({ component_id: "comp1", pages: [] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/mappings/affirm-batch: more than 30 pages is a real 400", async () => {
  const { router, env } = setup();
  const pages = Array.from({ length: 31 }, (_, i) => ({ catalogueId: "c1", pageNum: i }));
  const req = new Request("https://example.com/api/cps/mappings/affirm-batch", { method: "POST", body: JSON.stringify({ component_id: "comp1", pages }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/mappings/affirm-batch: real happy path affirms new pages and clears the draft", async () => {
  const db = makeFakeDb({ existingMapping: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/affirm-batch", {
    method: "POST",
    body: JSON.stringify({ component_id: "comp1", pages: [{ catalogueId: "c1", pageNum: 1 }, { catalogueId: "c1", pageNum: 2 }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.affirmed, 2);
  assert.equal(body.results.length, 2);
});

test("POST /api/cps/mappings/affirm-batch: real happy path skips pages missing catalogueId/pageNum", async () => {
  const db = makeFakeDb({ existingMapping: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/mappings/affirm-batch", {
    method: "POST",
    body: JSON.stringify({ component_id: "comp1", pages: [{ catalogueId: "c1" }, { catalogueId: "c1", pageNum: 2 }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.affirmed, 1);
  assert.equal(body.errors.length, 1);
});
