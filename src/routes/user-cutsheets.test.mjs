import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerUserCutsheetsRoutes } from "./user-cutsheets.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ cached = null, record = null, cutsheets = [], total = 0 } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("SELECT COUNT(*) as total")) return { total };
            if (sql.includes("WHERE user_id = ? AND component_hash = ?")) return cached;
            if (sql.includes("SELECT r2_key, mime_type")) return record;
            return null;
          },
          async all() {
            return { results: cutsheets };
          },
          async run() {
            return { success: true };
          },
        }),
      };
    },
  };
}

function makeUploads({ getReturns = null } = {}) {
  return {
    async get() { return getReturns; },
    async put() { return {}; },
  };
}

function setup({ authenticate = authOk, db, uploads } = {}) {
  const router = new NativeRouter();
  registerUserCutsheetsRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || makeUploads() } };
}

test("GET /api/user/cutsheets/check: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/check?model=L9000"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/user/cutsheets/check: missing manufacturer and model is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/check"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/user/cutsheets/check: found:false on cache miss", async () => {
  const { router, env } = setup({ db: makeFakeDb({ cached: null }) });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/check?model=L9000"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, false);
});

test("GET /api/user/cutsheets/check: real happy path on cache hit", async () => {
  const db = makeFakeDb({ cached: { id: "cs1", r2_key: "k1", catalogue_id: "c1", page_start: 1, page_end: 1, manufacturer: "Schlage", model: "L9000" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/check?model=L9000&manufacturer=Schlage"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.found, true);
  assert.equal(body.imageUrl, "/api/user/cutsheets/cs1/image");
});

test("GET /api/user/cutsheets/:id/image: 404 when record not found or not owned", async () => {
  const { router, env } = setup({ db: makeFakeDb({ record: null }) });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/cs1/image"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/user/cutsheets/:id/image: 404 when R2 object missing", async () => {
  const db = makeFakeDb({ record: { r2_key: "k1", mime_type: "image/png" } });
  const { router, env } = setup({ db, uploads: makeUploads({ getReturns: null }) });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/cs1/image"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/user/cutsheets/:id/image: real happy path streams the image", async () => {
  const db = makeFakeDb({ record: { r2_key: "k1", mime_type: "image/png" } });
  const uploads = makeUploads({ getReturns: { async arrayBuffer() { return new ArrayBuffer(4); } } });
  const { router, env } = setup({ db, uploads });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets/cs1/image"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/png");
});

test("POST /api/user/cutsheets: missing manufacturer and model is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/user/cutsheets", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/user/cutsheets: real happy path stores metadata-only when no pngData/cachedPdf", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/user/cutsheets", {
    method: "POST",
    body: JSON.stringify({ manufacturer: "Schlage", model: "L9000" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.componentHash);
});

test("GET /api/user/cutsheets: real happy path lists with pagination fields", async () => {
  const db = makeFakeDb({ cutsheets: [{ id: "cs1" }], total: 1 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/user/cutsheets"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 1);
  assert.equal(body.cutsheets.length, 1);
});
