import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSubmittalsRoutes } from "./submittals.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
// Real shape of an AuthFor ephemeral trial guest (src/lib/authfor-client.js's
// authenticateViaEphemeral): userId is null by design, id is the real stable
// per-guest identifier. requireProductAccess (imported for real, not mocked,
// by submittals.js) treats subx as ephemeral-trial-accessible with no
// ephemeralToken/consenta.cc call needed, so this needs no fetch mocking.
const authEphemeral = async () => ({ user: { ephemeral: true, userId: null, id: "eph_guest123" } });

const PERMISSIVE_USER_ROW = { subscription_tier: "subconp", subscription_status: "active", products_enabled: "subx,propx" };

function makeFakeDb({ submittalRow = null, listRows = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM users"))
              return PERMISSIVE_USER_ROW;
            return submittalRow;
          },
          async all() { return { results: listRows }; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

function makeFakeCache(get = async () => null) {
  return { get, async put() {} };
}

function setup({
  authenticate = authOk,
  db,
  cache,
  uploads,
  logTelemetryEvent = async () => {},
  dispatchVisionExtraction = async () => ({ doors: [], token_usage: {}, extraction_confidence: 0.9 }),
} = {}) {
  const router = new NativeRouter();
  registerSubmittalsRoutes(router, { authenticate, logTelemetryEvent, dispatchVisionExtraction });
  return { router, env: { DB: db || makeFakeDb(), CACHE: cache || makeFakeCache(), UPLOADS: uploads } };
}

function pdfFormRequest() {
  const fd = new FormData();
  fd.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" }), "test.pdf");
  fd.set("projectName", "Test Project");
  return new Request("https://example.com/api/submittals/upload", { method: "POST", body: fd });
}

test("POST /api/submittals/upload: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/submittals/upload: 400 when no file provided", async () => {
  const { router, env } = setup();
  const fd = new FormData();
  const res = await router.handle(new Request("https://example.com/api/submittals/upload", { method: "POST", body: fd }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/submittals/upload: non-PDF files are skipped, not fatal", async () => {
  const { router, env } = setup();
  const fd = new FormData();
  fd.set("file", new Blob([new Uint8Array([1])], { type: "text/plain" }), "test.txt");
  const res = await router.handle(new Request("https://example.com/api/submittals/upload", { method: "POST", body: fd }), env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.results[0].status, "skipped");
});

test("POST /api/submittals/upload: real happy path processes a PDF and reports review status", async () => {
  const { router, env } = setup({
    dispatchVisionExtraction: async () => ({ doors: [{ door_number: "101" }], token_usage: { total: 500 }, extraction_confidence: 0.95 }),
  });
  const res = await router.handle(pdfFormRequest(), env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.totalFiles, 1);
  assert.equal(body.results[0].status, "review");
  assert.equal(body.results[0].doorCount, 1);
});

test("POST /api/submittals/upload: ephemeral trial guest (null userId) succeeds and stores the submittal under their ephemeral id, not null", async () => {
  const boundInsertArgs = [];
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => {
          if (sql.includes("INSERT INTO submittals")) boundInsertArgs.push(args);
          return {
            async first() { return null; },
            async all() { return { results: [] }; },
            async run() { return { success: true }; },
          };
        },
      };
    },
  };
  const { router, env } = setup({ authenticate: authEphemeral, db });
  const res = await router.handle(pdfFormRequest(), env, {});
  // Before the 2026-09-12 fix, binding the null user.userId here 500'd with
  // "D1_ERROR: NOT NULL constraint failed: submittals.user_id" (submittals
  // table schema: user_id TEXT NOT NULL). This must now succeed.
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.results[0].status, "review");
  assert.equal(boundInsertArgs.length, 1);
  const insertedUserId = boundInsertArgs[0][1]; // INSERT INTO submittals (id, user_id, ...)
  assert.equal(insertedUserId, "eph_guest123", "must fall back to user.id, never bind null into the NOT NULL user_id column");
});

test("POST /api/submittals/upload: an async (queued) dispatch reports queued status", async () => {
  const { router, env } = setup({
    dispatchVisionExtraction: async () => ({ sync: false, job_id: "j1" }),
  });
  const res = await router.handle(pdfFormRequest(), env, {});
  const body = await res.json();
  assert.equal(body.results[0].status, "queued");
  assert.equal(body.results[0].job_id, "j1");
});

test("GET /api/submittals: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/submittals"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/submittals: real happy path lists the user's submittals", async () => {
  const { router, env } = setup({ db: makeFakeDb({ listRows: [{ id: "s1" }] }) });
  const res = await router.handle(new Request("https://example.com/api/submittals"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.submittals.length, 1);
});

test("GET /api/submittals: ephemeral trial guest's list query keys off their ephemeral id, not their null userId", async () => {
  const boundListArgs = [];
  const db = {
    prepare(sql) {
      return {
        bind: (...args) => {
          if (sql.includes("FROM submittals")) boundListArgs.push(args);
          return {
            async first() { return PERMISSIVE_USER_ROW; },
            async all() { return { results: [{ id: "s1" }] }; },
            async run() { return { success: true }; },
          };
        },
      };
    },
  };
  const { router, env } = setup({ authenticate: authEphemeral, db });
  const res = await router.handle(new Request("https://example.com/api/submittals"), env, {});
  assert.equal(res.status, 200);
  // Before the fix this bound `null` (user.userId), which never matches any
  // row in SQL ("WHERE user_id = NULL" is always false) - an ephemeral
  // guest's own uploads would silently vanish from their own list even once
  // the upload itself stopped 500ing.
  assert.equal(boundListArgs[0][0], "eph_guest123");
});

test("POST /api/submittals/:id/retry: 404 when submittal not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ submittalRow: null }) });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1/retry", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/submittals/:id/retry: 400 when submittal isn't in failed status", async () => {
  const { router, env } = setup({ db: makeFakeDb({ submittalRow: { id: "s1", status: "review" } }) });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1/retry", { method: "POST" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/submittals/:id/retry: 404 when file isn't in KV or R2 storage", async () => {
  const { router, env } = setup({
    db: makeFakeDb({ submittalRow: { id: "s1", status: "failed", file_buffer_key: "k1" } }),
    cache: makeFakeCache(async () => null),
  });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1/retry", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/submittals/:id/retry: real happy path re-dispatches vision extraction", async () => {
  const { router, env } = setup({
    db: makeFakeDb({ submittalRow: { id: "s1", status: "failed", file_buffer_key: "k1", retry_count: 0, max_retry_attempts: 3 } }),
    cache: makeFakeCache(async () => new ArrayBuffer(4)),
    dispatchVisionExtraction: async () => ({ doors: [{ door_number: "101" }], extraction_confidence: 0.9 }),
  });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1/retry", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "review");
  assert.equal(body.doorCount, 1);
});

test("GET /api/submittals/:id: 404 when submittal not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ submittalRow: null }) });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/submittals/:id: real happy path returns the submittal with parsed doors", async () => {
  const db = {
    prepare(sql) {
      return {
        bind: () => ({
          async first() {
            if (sql.includes("FROM users"))
              return PERMISSIVE_USER_ROW;
            return { id: "s1", extracted_data: JSON.stringify({ foo: "bar" }) };
          },
          async all() { return { results: [{ door_number: "101", door_notes_refs: JSON.stringify(["a"]), glazing_notes_refs: null }] }; },
        }),
      };
    },
  };
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/submittals/s1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.submittal.extractedData, { foo: "bar" });
  assert.deepEqual(body.submittal.doors[0].door_notes_refs, ["a"]);
  assert.deepEqual(body.submittal.doors[0].glazing_notes_refs, []);
});
