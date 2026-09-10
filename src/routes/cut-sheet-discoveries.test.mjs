import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCutSheetDiscoveriesRoutes } from "./cut-sheet-discoveries.js";

const authOk = async () => ({ user: { userId: "u1", name: "User One" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ discoveries = [], total = 0, discovery = null, tempFile = null } = {}) {
  const handlers = {
    async first() {
      if (sql.includes("SELECT COUNT(*) as total FROM cut_sheet_discoveries")) return { total };
      if (sql.includes("FROM cut_sheet_discoveries")) return discovery;
      return null;
    },
    async all() {
      return { results: discoveries };
    },
    async run() {
      return { success: true };
    },
  };
  let sql = "";
  return {
    prepare(s) {
      sql = s;
      return { bind: (...args) => handlers, ...handlers };
    },
  };
}

const queueForDiscoveryOk = async (component, userId, env2) => ({ id: "q1", status: "queued" });
const getManufacturerDomainsOk = async () => [{ domain: "schlage.com" }];

function setup({ authenticate = authOk, db, queueForDiscovery = queueForDiscoveryOk, getManufacturerDomains = getManufacturerDomainsOk, uploads } = {}) {
  const router = new NativeRouter();
  registerCutSheetDiscoveriesRoutes(router, { authenticate, queueForDiscovery, getManufacturerDomains });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; }, async delete() {} }, OUTPUTS: { async put() {} } } };
}

test("POST /api/cut-sheets/queue: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/queue", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/cut-sheets/queue: real happy path delegates to injected queueForDiscovery", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/queue", { method: "POST", body: JSON.stringify({ manufacturer: "Schlage" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.status, "queued");
});

test("POST /api/cut-sheets/queue/batch: missing components array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/queue/batch", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/queue/batch: real happy path aggregates per-component results", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/queue/batch", {
    method: "POST",
    body: JSON.stringify({ components: [{ id: "c1" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.results.length, 1);
});

test("GET /api/cut-sheets/discoveries: real happy path with pagination fields", async () => {
  const db = makeFakeDb({ discoveries: [{ id: "d1" }], total: 4 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/discoveries"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 4);
});

test("GET /api/cut-sheets/discoveries/pending: real happy path via local getPendingDiscoveries", async () => {
  const db = makeFakeDb({ discoveries: [{ id: "d1" }], total: 1 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/discoveries/pending"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.discoveries.length, 1);
});

test("GET /api/cut-sheets/discoveries/:discoveryId: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ discovery: null }) });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/discoveries/d1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cut-sheets/discoveries/:discoveryId: real happy path parses extracted_metadata JSON", async () => {
  const db = makeFakeDb({ discovery: { id: "d1", extracted_metadata: JSON.stringify({ a: 1 }) } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cut-sheets/discoveries/d1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.discovery.extracted_metadata, { a: 1 });
});

test("POST /api/cut-sheets/discoveries/manual: missing sourceUrl is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cut-sheets/discoveries/manual", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/discoveries/manual: real happy path submits and flags unverified domain", async () => {
  const { router, env } = setup({ getManufacturerDomains: async () => [] });
  const req = new Request("https://example.com/api/cut-sheets/discoveries/manual", {
    method: "POST",
    body: JSON.stringify({ sourceUrl: "https://random-site.com/sheet.pdf", manufacturer: "Schlage" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.domainVerified, false);
  assert.ok(body.warning);
});

test("POST /api/cut-sheets/discoveries/:discoveryId/approve: 400 when discovery not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ discovery: null }) });
  const req = new Request("https://example.com/api/cut-sheets/discoveries/d1/approve", { method: "POST", body: "{}" });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/discoveries/:discoveryId/approve: real happy path approves a pending_review discovery", async () => {
  const db = makeFakeDb({ discovery: { id: "d1", status: "pending_review", file_hash_sha256: "h1" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cut-sheets/discoveries/d1/approve", { method: "POST", body: JSON.stringify({ productId: "p1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.documentId);
});

test("POST /api/cut-sheets/discoveries/:discoveryId/reject: 400 when reason too short", async () => {
  const db = makeFakeDb({ discovery: { id: "d1", status: "pending_review" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cut-sheets/discoveries/d1/reject", { method: "POST", body: JSON.stringify({ reason: "no" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cut-sheets/discoveries/:discoveryId/reject: real happy path rejects", async () => {
  const db = makeFakeDb({ discovery: { id: "d1", status: "pending_review" } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cut-sheets/discoveries/d1/reject", { method: "POST", body: JSON.stringify({ reason: "not relevant" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});
