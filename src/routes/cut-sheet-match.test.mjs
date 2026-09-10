import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetMatchRoutes } from "./cut-sheet-match.js";

function makeFakeDb({ components = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: () => ({
          async first() { return null; },
          async all() {
            if (sql.includes("FROM hardware_components")) return { results: components };
            return { results: [] };
          },
        }),
      };
    },
  };
}

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;

function setup({ authenticate = authOk, requireProductAccess = prodOk, db } = {}) {
  const router = new NativeRouter();
  registerCutSheetMatchRoutes(router, { authenticate, requireProductAccess });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("POST /api/cut-sheets/match: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/match", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/cut-sheets/match: missing model/catalog_number is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/match", { method: "POST", body: JSON.stringify({ manufacturer: "Schlage" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/match: real end-to-end call into matchComponentToCutSheets (no match, real 200)", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/match", { method: "POST", body: JSON.stringify({ manufacturer: "NotReal", model: "NotReal123" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.matched, false);
});

test("POST /api/cut-sheets/batch-match: missing components array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/batch-match", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/batch-match: real batch matching with a real matched/unmatched count and 50-item truncation", async () => {
  const { router, env } = setup();
  const components = Array.from({ length: 60 }, (_, i) => ({ manufacturer: "NotReal", model: `X${i}` }));
  const req = new Request("https://example.com/api/cut-sheets/batch-match", { method: "POST", body: JSON.stringify({ components }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 50);
  assert.equal(body.truncated, true);
  assert.equal(body.matched, 0);
  assert.equal(body.unmatched, 50);
});

test("GET /api/cut-sheets/for-set/:setId: 404 when the set has no components", async () => {
  const { router, env } = setup({ db: makeFakeDb({ components: [] }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/for-set/s1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cut-sheets/for-set/:setId: real happy path returns componentCount/matchedCount even with no matches", async () => {
  const db = makeFakeDb({ components: [{ id: "c1", manufacturer: "NotReal", model: "X1" }, { id: "c2", manufacturer: "NotReal", model: "X2" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/for-set/s1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.componentCount, 2);
  assert.equal(body.matchedCount, 0);
  assert.deepEqual(body.cutSheets, []);
});
