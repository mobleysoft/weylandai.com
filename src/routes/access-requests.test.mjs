// Real, runnable verification for src/routes/access-requests.js - run with:
//   node --test src/routes/access-requests.test.mjs
//
// Registers the real routes against a fake router that just records
// handlers (same NativeRouter surface the real router exposes), then invokes
// each real handler end to end against faked Request/env objects. Operator
// auth and the identity-provider invite are injected dependencies (see the
// module header for why), so the fakes here stand in for exactly those two
// seams and nothing else - the validation, upsert, rollup, approve and deny
// logic under test is the real code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAccessRequestRoutes } from "./access-requests.js";

function makeFakeRouter() {
  const routes = {};
  return {
    routes,
    get(path, handler) { routes[`GET ${path}`] = handler; },
    post(path, handler) { routes[`POST ${path}`] = handler; },
    put() {}, patch() {}, delete() {},
  };
}

// Fake D1: records every prepare/bind/run and answers first()/all() from a
// small script keyed on SQL shape. `throwNoTable` simulates an edition where
// migration 20260909_access_requests.sql has not been applied.
function makeFakeDb({ rows = {}, throwNoTable = false, denyChanges = 1 } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (throwNoTable) throw new Error("D1_ERROR: no such table: access_requests");
          if (sql.includes("SELECT id, status FROM access_requests")) return rows.afterUpsert || null;
          if (sql.includes("FROM access_requests WHERE id = ?")) return rows.byId || null;
          return null;
        },
        async run() {
          if (throwNoTable) throw new Error("D1_ERROR: no such table: access_requests");
          calls.push({ sql, binds: stmt.binds });
          if (sql.includes("SET status = 'denied'")) return { meta: { changes: denyChanges } };
          return { success: true, meta: { changes: 1 } };
        },
        async all() {
          if (throwNoTable) throw new Error("D1_ERROR: no such table: access_requests");
          calls.push({ sql, binds: stmt.binds });
          if (sql.includes("GROUP BY trade ")) return { results: rows.byTrade || [] };
          if (sql.includes("GROUP BY trade_other")) return { results: rows.otherTrades || [] };
          return { results: rows.list || [] };
        },
      };
      return stmt;
    },
  };
}

function makeRequest({ method = "POST", path = "/api/access/request", headers = {}, jsonBody, params } = {}) {
  const h = new Map(Object.entries(headers));
  return {
    method,
    url: `https://weylandai.com${path}`,
    headers: { get: (k) => h.get(k) ?? null },
    params: params || {},
    async json() { if (jsonBody === undefined) throw new Error("no body"); return jsonBody; },
  };
}

const allowAll = () => true;
const denyAll = () => false;
const operatorOk = async () => null;
const operatorDenied = async () => new Response(JSON.stringify({ error: { code: "AUTH_REQUIRED" } }), { status: 401 });

function setup({ requireOperator = operatorOk, invite, rateLimiter = allowAll, db } = {}) {
  const router = makeFakeRouter();
  registerAccessRequestRoutes(router, {
    requireOperator,
    invite: invite || (async () => ({ ok: true, status: 200, data: { ok: true, mhs_id: "MHS-00099", email_sent: true } })),
    rateLimiter,
    hashIp: async (ip) => `hash(${ip})`,
    ventureCode: "weyland",
  });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("registers the five access-queue routes", () => {
  const { router } = setup();
  assert.deepEqual(Object.keys(router.routes).sort(), [
    "GET /api/access/requests", "GET /api/access/rollup",
    "POST /api/access/request", "POST /api/access/requests/:id/approve", "POST /api/access/requests/:id/deny",
  ]);
});

test("public request: valid body is upserted with the normalized values and answered with the stored id/status", async () => {
  const db = makeFakeDb({ rows: { afterUpsert: { id: "areq_1", status: "requested" } } });
  const { router, env } = setup({ db });
  const res = await router.routes["POST /api/access/request"](
    makeRequest({ headers: { "CF-Connecting-IP": "203.0.113.9" }, jsonBody: { email: "Ron@Example.com", name: "Ron", trade: "doors_glazing", source: "landing" } }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true); assert.equal(body.id, "areq_1"); assert.equal(body.status, "requested");
  const insert = db.calls.find((c) => c.sql.includes("INSERT INTO access_requests"));
  assert.ok(insert, "upsert statement ran");
  assert.ok(insert.sql.includes("ON CONFLICT(email, venture_code) DO UPDATE"), "re-submits update, never duplicate");
  assert.match(insert.binds[0], /^areq_/);
  assert.equal(insert.binds[1], "ron@example.com");
  assert.equal(insert.binds[5], "doors_glazing");
  assert.equal(insert.binds[8], "landing");
  assert.equal(insert.binds[9], "weyland");
  assert.equal(insert.binds[10], "hash(203.0.113.9)");
});

test("public request: already-approved address gets the sign-in message", async () => {
  const db = makeFakeDb({ rows: { afterUpsert: { id: "areq_2", status: "approved" } } });
  const { router, env } = setup({ db });
  const res = await router.routes["POST /api/access/request"](makeRequest({ jsonBody: { email: "a@b.co", trade: "hvac" } }), env);
  assert.equal((await res.json()).message, "You already have access — sign in with your email.");
});

test("public request: validation failure is 400 with per-field errors and writes nothing", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const res = await router.routes["POST /api/access/request"](makeRequest({ jsonBody: { email: "nope", trade: "roofing" } }), env);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(body.error.fields.email && body.error.fields.trade);
  assert.equal(db.calls.length, 0);
});

test("public request: rate limiter refusal is 429 and writes nothing", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db, rateLimiter: denyAll });
  const res = await router.routes["POST /api/access/request"](makeRequest({ jsonBody: { email: "a@b.co", trade: "hvac" } }), env);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).error.code, "RATE_LIMITED");
  assert.equal(db.calls.length, 0);
});

test("public request: missing table (migration not applied) is 503, never 500", async () => {
  const { router, env } = setup({ db: makeFakeDb({ throwNoTable: true }) });
  const res = await router.routes["POST /api/access/request"](makeRequest({ jsonBody: { email: "a@b.co", trade: "hvac" } }), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error.code, "ACCESS_QUEUE_NOT_PROVISIONED");
});

test("operator list: the injected operator gate's response is returned as-is when it denies", async () => {
  const { router, env } = setup({ requireOperator: operatorDenied });
  const res = await router.routes["GET /api/access/requests"](makeRequest({ method: "GET", path: "/api/access/requests" }), env);
  assert.equal(res.status, 401);
});

test("operator list: status and email filters become bound predicates, scoped to the venture", async () => {
  const db = makeFakeDb({ rows: { list: [{ id: "areq_1" }] } });
  const { router, env } = setup({ db });
  const res = await router.routes["GET /api/access/requests"](makeRequest({ method: "GET", path: "/api/access/requests?status=requested&email=A@B.co" }), env);
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).requests, [{ id: "areq_1" }]);
  const sel = db.calls[0];
  assert.ok(sel.sql.includes("venture_code = ?") && sel.sql.includes("status = ?") && sel.sql.includes("email = ?"));
  assert.deepEqual(sel.binds, ["weyland", "requested", "a@b.co"]);
});

test("rollup: demand by trade plus the free-text 'other' trades, with a total", async () => {
  const db = makeFakeDb({ rows: { byTrade: [{ trade: "doors_glazing", count: 3 }, { trade: "other", count: 1 }], otherTrades: [{ trade_other: "Glazing subs", count: 1 }] } });
  const { router, env } = setup({ db });
  const res = await router.routes["GET /api/access/rollup"](makeRequest({ method: "GET", path: "/api/access/rollup" }), env);
  const body = await res.json();
  assert.equal(body.venture, "weyland"); assert.equal(body.total, 4);
  assert.equal(body.by_trade.length, 2); assert.deepEqual(body.other_trades, [{ trade_other: "Glazing subs", count: 1 }]);
});

test("approve: requires approved_by, 404s an unknown id, and is idempotent on an already-approved row", async () => {
  const { router, env } = setup({ db: makeFakeDb({ rows: { byId: null } }) });
  const approve = router.routes["POST /api/access/requests/:id/approve"];
  const noBy = await approve(makeRequest({ path: "/api/access/requests/areq_9/approve", jsonBody: {} }), env);
  assert.equal(noBy.status, 400);
  const notFound = await approve(makeRequest({ path: "/api/access/requests/areq_9/approve", jsonBody: { approved_by: "ron" } }), env);
  assert.equal(notFound.status, 404);
  const { router: r2, env: e2 } = setup({ db: makeFakeDb({ rows: { byId: { id: "areq_1", status: "approved", invited_mhs_id: "MHS-00007" } } }) });
  const already = await r2.routes["POST /api/access/requests/:id/approve"](makeRequest({ path: "/api/access/requests/areq_1/approve", jsonBody: { approved_by: "ron" } }), e2);
  assert.deepEqual(await already.json(), { ok: true, already: true, status: "approved", id: "areq_1", invited_mhs_id: "MHS-00007" });
});

test("approve: happy path calls the injected invite with the row's identity and records the approval", async () => {
  const seen = [];
  const invite = async (env, args) => { seen.push(args); return { ok: true, status: 200, data: { ok: true, mhs_id: "MHS-00042", email_sent: true } }; };
  const db = makeFakeDb({ rows: { byId: { id: "areq_1", email: "a@b.co", name: "Ann", status: "requested" } } });
  const { router, env } = setup({ db, invite });
  const res = await router.routes["POST /api/access/requests/:id/approve"](
    makeRequest({ path: "/api/access/requests/areq_1/approve", headers: { "X-Operator-Token": "tok" }, jsonBody: { approved_by: "ron", role: "member" } }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "approved"); assert.equal(body.invite.mhs_id, "MHS-00042");
  assert.deepEqual(seen, [{ email: "a@b.co", name: "Ann", role: "member", operatorToken: "tok" }]);
  const upd = db.calls.find((c) => c.sql.includes("SET status = 'approved'"));
  assert.deepEqual(upd.binds, ["ron", "MHS-00042", "areq_1"]);
});

test("approve: a missing operator token is 400 and an invite failure is 502 with no status change", async () => {
  const db = makeFakeDb({ rows: { byId: { id: "areq_1", email: "a@b.co", status: "requested" } } });
  const { router, env } = setup({ db, invite: async () => ({ ok: false, status: 403, data: { error: "not an admin" } }) });
  const approve = router.routes["POST /api/access/requests/:id/approve"];
  const noTok = await approve(makeRequest({ path: "/api/access/requests/areq_1/approve", jsonBody: { approved_by: "ron" } }), env);
  assert.equal(noTok.status, 400);
  const failed = await approve(makeRequest({ path: "/api/access/requests/areq_1/approve", headers: { "X-Operator-Token": "tok" }, jsonBody: { approved_by: "ron" } }), env);
  assert.equal(failed.status, 502);
  assert.equal((await failed.json()).error.code, "INVITE_FAILED");
  assert.equal(db.calls.filter((c) => c.sql.includes("SET status")).length, 0);
});

test("deny: records the denial, 404s when nothing matched", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const ok = await router.routes["POST /api/access/requests/:id/deny"](makeRequest({ path: "/api/access/requests/areq_1/deny", jsonBody: { approved_by: "ron" } }), env);
  assert.deepEqual(await ok.json(), { ok: true, status: "denied", id: "areq_1" });
  assert.deepEqual(db.calls[0].binds, ["ron", "areq_1", "weyland"]);
  const { router: r2, env: e2 } = setup({ db: makeFakeDb({ denyChanges: 0 }) });
  const missing = await r2.routes["POST /api/access/requests/:id/deny"](makeRequest({ path: "/api/access/requests/areq_x/deny", jsonBody: { approved_by: "ron" } }), e2);
  assert.equal(missing.status, 404);
});
