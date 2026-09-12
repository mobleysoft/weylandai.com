import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHuntRoutes } from "./hunt.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

const PERMISSIVE_USER_ROW = { subscription_tier: "subconp", subscription_status: "active", products_enabled: "huntx" };

function makeFakeDb({ listRows = [], lastFetch = null } = {}) {
  return {
    prepare(sql) {
      const stmt = {
        async first() {
          if (sql.includes("FROM users")) return PERMISSIVE_USER_ROW;
          if (sql.includes("MAX(fetched_at)")) return lastFetch;
          return null;
        },
        async all() { return { results: listRows }; },
        async run() { return { success: true }; },
      };
      stmt.bind = (...args) => stmt;
      return stmt;
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerHuntRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("POST /api/hunt/refresh: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/hunt/refresh: real happy path fetches both sources and upserts opportunities", async () => {
  globalThis.fetch = async (url) => {
    if (url.includes("data.texas.gov")) {
      return new Response(JSON.stringify([{ project_id: "tx1", project_number: "P1", county: "Travis", highway: "IH-35", bids_will_be_opened_date: "2026-10-01" }]), { status: 200 });
    }
    if (url.includes("data.ca.gov")) {
      return new Response(JSON.stringify({ result: { records: [{ Application_Number: "ca1", District: "SF Unified", Program: "New Construction" }] } }), { status: 200 });
    }
    throw new Error("unexpected fetch: " + url);
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.upserted, 2);
  assert.equal(body.sources, 2);
});

test("POST /api/hunt/refresh: one source failing is captured non-fatally, the other still upserts", async () => {
  globalThis.fetch = async (url) => {
    if (url.includes("data.texas.gov")) throw new Error("txdot down");
    return new Response(JSON.stringify({ result: { records: [{ Application_Number: "ca1", District: "SF Unified" }] } }), { status: 200 });
  };
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/hunt/refresh", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.upserted, 1);
  assert.equal(body.errors.length, 1);
});

test("GET /api/hunt/opportunities: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/hunt/opportunities"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/hunt/opportunities: real happy path lists opportunities with lastFetchedAt", async () => {
  const db = makeFakeDb({ listRows: [{ id: "o1", source: "txdot" }], lastFetch: { t: "2026-09-10T00:00:00Z" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hunt/opportunities?source=txdot&q=highway"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.opportunities.length, 1);
  assert.equal(body.lastFetchedAt, "2026-09-10T00:00:00Z");
});
