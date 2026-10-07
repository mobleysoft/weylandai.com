import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHuntRoutes, REFRESH_COOLDOWN_SECONDS } from "./hunt.js";
import { ingestSources, UPSERT_BATCH } from "../lib/ingest.js";
import { readFileSync } from "node:fs";
import { renderNav, fillHuntxPage } from "../pages/huntx-nav.js";
const renderHuntxPage = (embedded) => fillHuntxPage(readFileSync(new URL("../pages/huntx.html", import.meta.url), "utf8"), embedded);

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

const PERMISSIVE_USER_ROW = { subscription_tier: "subconp", subscription_status: "active", products_enabled: "huntx" };

// A small fake D1: records every statement, answers the queries the routes make.
function makeFakeDb({ listRows = [], total = 0, indexed = 0, lastFetch = null, sources = [], lastRun = null, leaseFree = true, leaseRanAt = null } = {}) {
  const log = [];
  const batches = [];
  const db = {
    log,
    batches,
    prepare(sql) {
      const stmt = { sql, args: [] };
      stmt.bind = (...args) => { stmt.args = args; return stmt; };
      stmt.first = async () => {
        log.push({ op: "first", sql, args: stmt.args });
        if (sql.includes("FROM users")) return PERMISSIVE_USER_ROW;
        if (sql.includes("MAX(fetched_at)")) return lastFetch;
        if (sql.includes("FROM ingest_runs")) return lastRun;
        if (sql.includes("FROM job_runs")) return leaseRanAt ? { ran_at: leaseRanAt } : null;
        if (sql.includes("COUNT(*)") && sql.includes("WHERE")) return { n: total };
        if (sql.includes("COUNT(*)")) return { n: indexed };
        return null;
      };
      stmt.all = async () => {
        log.push({ op: "all", sql, args: stmt.args });
        if (sql.includes("GROUP BY source")) return { results: sources };
        return { results: listRows };
      };
      stmt.run = async () => {
        log.push({ op: "run", sql, args: stmt.args });
        if (sql.includes("INSERT OR IGNORE INTO job_runs")) return { meta: { changes: 0 } };
        if (sql.includes("UPDATE job_runs")) return { meta: { changes: leaseFree ? 1 : 0 } };
        return { success: true, meta: { changes: 1 } };
      };
      return stmt;
    },
    async batch(stmts) { batches.push(stmts.length); return stmts.map(() => ({ success: true })); },
  };
  return db;
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerHuntRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

function fakeCtx() {
  const pending = [];
  return { pending, waitUntil(p) { pending.push(p); } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

function fakeSources({ txdotDown = false } = {}) {
  globalThis.fetch = async (url) => {
    url = String(url);
    if (url.includes("data.texas.gov")) {
      if (txdotDown) throw new Error("txdot down");
      return new Response(JSON.stringify([{ project_id: "tx1", project_number: "P1", county: "Travis", highway: "IH-35", bids_will_be_opened_date: "2026-10-01" }]), { status: 200 });
    }
    if (url.includes("data.ca.gov")) {
      return new Response(JSON.stringify({ result: { records: [{ Application_Number: "ca1", District: "SF Unified", Program: "New Construction" }] } }), { status: 200 });
    }
    if (url.includes("illinois-edp")) {
      return new Response(JSON.stringify([{ project_number: "il1", description: "Roof", location_name: "Springfield - Capitol" }]), { status: 200 });
    }
    if (url.includes("cityofnewyork")) {
      return new Response(JSON.stringify([{ request_id: "ny1", short_title: "Bridge repair", agency_name: "DOT" }]), { status: 200 });
    }
    throw new Error("unexpected fetch: " + url);
  };
}

test("POST /api/hunt/refresh: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, fakeCtx());
  assert.equal(res.status, 401);
});

test("POST /api/hunt/refresh: starts one background pull when the lease is free and reports the index (lastIngest.upserted, no top-level upserted)", async () => {
  fakeSources();
  const lastRun = { started_at: "2026-10-07T02:27:55Z", finished_at: "2026-10-07T02:28:07Z", upserted: 440, errors: null };
  const db = makeFakeDb({ indexed: 826, sources: [{ source: "txdot", n: 517 }], lastRun, leaseFree: true });
  const { router, env } = setup({ db });
  const ctx = fakeCtx();
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, ctx);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.indexed, 826);
  assert.equal(body.upserted, undefined);
  assert.equal(body.lastIngest.upserted, 440);
  assert.deepEqual(body.pull, { started: true, retryAfterSeconds: 0 });
  assert.deepEqual(body.sources, [{ source: "txdot", n: 517 }]);
  assert.equal(ctx.pending.length, 1, "exactly one background ingest");
  const summary = await ctx.pending[0];
  assert.equal(summary.trigger, "refresh");
  assert.equal(summary.upserted, 4);
});

test("POST /api/hunt/refresh: a pull inside the cooldown is not started again and says when the next can start", async () => {
  const ranAt = new Date(Date.now() - 60 * 1000).toISOString();
  const db = makeFakeDb({ indexed: 826, leaseFree: false, leaseRanAt: ranAt });
  const { router, env } = setup({ db });
  const ctx = fakeCtx();
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, ctx);
  const body = await res.json();
  assert.equal(body.pull.started, false);
  assert.ok(body.pull.retryAfterSeconds > REFRESH_COOLDOWN_SECONDS - 120 && body.pull.retryAfterSeconds <= REFRESH_COOLDOWN_SECONDS, String(body.pull.retryAfterSeconds));
  assert.equal(ctx.pending.length, 0);
});

test("ingestSources: upserts in D1 batches, records the trigger, keeps a failed source non-fatal", async () => {
  fakeSources({ txdotDown: true });
  const db = makeFakeDb();
  const r = await ingestSources({ DB: db }, "traffic");
  assert.equal(r.upserted, 3);
  assert.equal(r.errors.length, 1);
  assert.equal(r.trigger, "traffic");
  assert.ok(db.batches.length >= 1 && db.batches.every((n) => n <= UPSERT_BATCH));
  const runRow = db.log.find((x) => x.sql.includes("INSERT INTO ingest_runs"));
  assert.equal(runRow.args[3], "traffic");
});

test("GET /api/hunt/opportunities: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/hunt/opportunities"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/hunt/opportunities: searches the whole index server side and returns total, indexed, sources, paging", async () => {
  const db = makeFakeDb({ listRows: [{ id: "o1", source: "txdot" }], total: 52, indexed: 826, lastFetch: { t: "2026-09-10T00:00:00Z" }, sources: [{ source: "txdot", n: 517 }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hunt/opportunities?source=txdot&q=Bridge&limit=50&offset=100"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.opportunities.length, 1);
  assert.equal(body.total, 52);
  assert.equal(body.indexed, 826);
  assert.equal(body.limit, 50);
  assert.equal(body.offset, 100);
  assert.equal(body.lastFetchedAt, "2026-09-10T00:00:00Z");
  const list = db.log.find((x) => x.op === "all" && x.sql.includes("FROM opportunities") && x.sql.includes("LIMIT"));
  assert.deepEqual(list.args.slice(0, 5), ["txdot", "%Bridge%", "%Bridge%", "%Bridge%", "%Bridge%"]);
  assert.deepEqual(list.args.slice(-2), [50, 100]);
});

test("GET /api/hunt/opportunities: limit is clamped to 1..300", async () => {
  const db = makeFakeDb();
  const { router, env } = setup({ db });
  const body = await (await router.handle(new Request("https://example.com/api/hunt/opportunities?limit=5000"), env, {})).json();
  assert.equal(body.limit, 300);
});

test("page: overlay nav lists only products the shell opens in place; standalone keeps the full nav", () => {
  const embedded = renderNav("huntx", true);
  assert.ok(embedded.includes('href="/propx-app"') && embedded.includes('href="/meetingx"') && embedded.includes('href="/pricing"'));
  assert.ok(!embedded.includes("/venturedeck/") && !embedded.includes("HUNTX"));
  const standalone = renderNav("huntx", false);
  assert.ok(standalone.includes("/venturedeck/") && standalone.includes('href="/subx-app"'));
  const html = renderHuntxPage(true);
  assert.ok(html.includes('id="hx-refresh-btn"') && !html.includes("<!--HUNTX_NAV-->"));
  assert.ok(!/data\.upserted/.test(html), "the page must not read a top-level upserted");
});
