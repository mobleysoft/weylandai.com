import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerQuotesViewRoutes } from "./quotes-view.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ quote = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM takeoff_quotes")) return quote;
          if (sql.includes("FROM vendor_profile")) return null;
          if (sql.includes("FROM projects")) return null;
          return null;
        },
        async all() { return { results: [] }; },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
    UPLOADS: { async get() { return null; } },
  };
}

test("GET /quote/:quoteId/view: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerQuotesViewRoutes(router, { authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/quote/q1/view"), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("GET /q/:quoteId/:accessToken: does not call authenticate (customer-facing, gated by the token itself)", async () => {
  const router = new NativeRouter();
  let authCalled = false;
  registerQuotesViewRoutes(router, { authenticate: async () => { authCalled = true; return { user: {} }; } });
  const db = makeFakeDb({ quote: null });
  const res = await router.handle(new Request("https://example.com/q/q1/tok1"), { DB: db, UPLOADS: db.UPLOADS }, {});
  assert.equal(authCalled, false);
  assert.equal(res.status, 403);
});

test("GET /q/:quoteId/:accessToken: real not-found-or-expired 403 HTML response", async () => {
  const router = new NativeRouter();
  registerQuotesViewRoutes(router, { authenticate: authOk });
  const db = makeFakeDb({ quote: null });
  const res = await router.handle(new Request("https://example.com/q/q1/badtoken"), { DB: db, UPLOADS: db.UPLOADS }, {});
  assert.equal(res.status, 403);
  const text = await res.text();
  assert.ok(text.includes("not found"));
});

test("GET /q/:quoteId/:accessToken: real first-view marks first_viewed_at/status=viewed", async () => {
  const router = new NativeRouter();
  registerQuotesViewRoutes(router, { authenticate: authOk });
  const db = makeFakeDb({
    quote: {
      id: "q1", tenant_id: "t1", status: "sent", first_viewed_at: null,
      created_at: new Date().toISOString(), settings_snapshot: null, line_item_snapshot: null,
    },
  });
  const res = await router.handle(new Request("https://example.com/q/q1/tok1"), { DB: db, UPLOADS: db.UPLOADS }, {});
  assert.equal(res.status, 200);
  assert.ok(db.runs.some((r) => r.sql.includes("first_viewed_at") && r.sql.includes("status = 'viewed'")));
});
