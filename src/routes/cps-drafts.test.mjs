import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsDraftsRoutes } from "./cps-drafts.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ draft = null, drafts = [], changes = 1 } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("SELECT id, component_id, selected_pages, preview_state")) return draft;
            return null;
          },
          async all() {
            return { results: drafts };
          },
          async run() {
            return { success: true, meta: { changes } };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCpsDraftsRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("PUT /api/cps/drafts: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts", { method: "PUT", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("PUT /api/cps/drafts: missing component_id is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/drafts", { method: "PUT", body: JSON.stringify({ selected_pages: [1] }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/cps/drafts: non-array selected_pages is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/drafts", { method: "PUT", body: JSON.stringify({ component_id: "c1", selected_pages: "nope" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/cps/drafts: real happy path upserts and returns page_count", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/drafts", {
    method: "PUT",
    body: JSON.stringify({ component_id: "c1", selected_pages: [1, 2, 3] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.page_count, 3);
});

test("GET /api/cps/drafts/:componentId: found: false when no draft exists", async () => {
  const { router, env } = setup({ db: makeFakeDb({ draft: null }) });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts/c1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, false);
});

test("GET /api/cps/drafts/:componentId: expired draft is deleted and reported as expired", async () => {
  const db = makeFakeDb({ draft: { id: "d1", expires_at: "2020-01-01T00:00:00.000Z", selected_pages: "[]" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts/c1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, false);
  assert.equal(body.reason, "expired");
});

test("GET /api/cps/drafts/:componentId: real happy path returns a live draft", async () => {
  const future = new Date(Date.now() + 100000).toISOString();
  const db = makeFakeDb({ draft: { id: "d1", component_id: "c1", selected_pages: "[1,2]", updated_at: "now", expires_at: future } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts/c1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, true);
  assert.equal(body.id, "d1");
});

test("DELETE /api/cps/drafts/:componentId: real happy path reports deleted:true on changes>0", async () => {
  const { router, env } = setup({ db: makeFakeDb({ changes: 1 }) });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts/c1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.deleted, true);
});

test("DELETE /api/cps/drafts/:componentId: deleted:false when nothing matched", async () => {
  const { router, env } = setup({ db: makeFakeDb({ changes: 0 }) });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts/c1", { method: "DELETE" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.deleted, false);
});

test("GET /api/cps/drafts: real happy path lists drafts with computed page_count", async () => {
  const db = makeFakeDb({ drafts: [{ id: "d1", component_id: "c1", selected_pages: "[1,2,3]", updated_at: "now", expires_at: null }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/drafts"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 1);
  assert.equal(body.drafts[0].page_count, 3);
});
