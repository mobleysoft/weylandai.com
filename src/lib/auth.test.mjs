// Real, runnable verification for src/lib/auth.js - run with:
//   node --test src/lib/auth.test.mjs
//
// Covers the paths the Phase 2a extraction report claims are covered:
// the local session-cookie path (mechanism #1, legacy-local-session.js),
// the real AuthFor Bearer-token path (mechanism #3, authfor-client.js),
// the missing-credentials 401 path, and requireProductAccess's
// subscription-tier gating. Not a mock of behavior - these call the real
// authenticate()/requireProductAccess() functions against faked Request
// and env.DB objects, the same way src/auth-module.test.mjs verifies
// authenticateRequest().

import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticate, requireProductAccess } from "./auth.js";

// Minimal fake D1 database: dispatches on a substring of the SQL text,
// same style as a hand-rolled stand-in - real enough to exercise
// authenticate()'s real query shape without a real D1 binding.
function makeFakeDb(rows) {
  return {
    prepare(sql) {
      return {
        _sql: sql,
        _binds: [],
        bind(...args) {
          this._binds = args;
          return this;
        },
        async first() {
          if (sql.includes("FROM weyland_sessions")) {
            return rows.session && rows.session.id === this._binds[0] ? rows.session : null;
          }
          if (sql.includes("FROM users WHERE email")) {
            return rows.userByEmail && rows.userByEmail.email === this._binds[0] ? rows.userByEmail : null;
          }
          if (sql.includes("SELECT subscription_tier, products_enabled")) {
            return rows.productRow || null;
          }
          if (sql.includes("SELECT subscription_status")) {
            return rows.subscriptionRow || null;
          }
          return null;
        },
        async run() {
          return { success: true };
        },
      };
    },
  };
}

function makeRequest({ cookie, bearer, url = "https://weylandai.com/api/whatever" } = {}) {
  const headers = new Map();
  if (cookie) headers.set("Cookie", cookie);
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  return {
    url,
    headers: { get: (k) => headers.get(k) ?? null },
  };
}

test("authenticate(): local session cookie path (mechanism #1) - bypasses AuthFor entirely", async () => {
  const env = {
    DB: makeFakeDb({
      session: {
        id: "sess_abc",
        user_id: "user_1",
        email: "person@example.com",
        expires_at: "2099-01-01",
        player_json: JSON.stringify({ name: "Person One", tenants: [{ id: "ven_weyland" }] }),
      },
    }),
  };
  const req = makeRequest({ cookie: "weyland_session=sess_abc; other=1" });
  const result = await authenticate(req, env);
  assert.equal(result.error, undefined);
  assert.equal(result.user.userId, "user_1");
  assert.equal(result.user.email, "person@example.com");
  assert.equal(result.user.tenantId, "ven_weyland");
});

test("authenticate(): expired/unknown session cookie falls through to 401 (no AuthFor call, no Bearer token present)", async () => {
  const env = { DB: makeFakeDb({}) };
  const req = makeRequest({ cookie: "weyland_session=nonexistent" });
  const result = await authenticate(req, env);
  assert.equal(result.user, undefined);
  assert.ok(result.error instanceof Response);
  assert.equal(result.error.status, 401);
});

test("authenticate(): real AuthFor Bearer-token path (mechanism #3) verifies against authfor.com then bridges by email", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://authfor.com/api/v1/verify");
    return {
      ok: true,
      json: async () => ({ email: "bridged@example.com", name: "Bridged User" }),
    };
  };
  try {
    const env = {
      DB: makeFakeDb({
        userByEmail: { id: "user_2", email: "bridged@example.com", name: "Bridged User" },
      }),
    };
    const req = makeRequest({ bearer: "real-authfor-token" });
    const result = await authenticate(req, env);
    assert.equal(result.error, undefined);
    assert.equal(result.user.userId, "user_2");
    assert.equal(result.user.email, "bridged@example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authenticate(): AuthFor verifies identity but no local account exists yet -> explicit 404, not a silent fall-through", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ email: "nobody-yet@example.com" }),
  });
  try {
    const env = { DB: makeFakeDb({}) };
    const req = makeRequest({ bearer: "verified-but-unregistered" });
    const result = await authenticate(req, env);
    assert.ok(result.error instanceof Response);
    assert.equal(result.error.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authenticate(): no cookie, no bearer, no signed-url params -> 401 Authentication required", async () => {
  const env = { DB: makeFakeDb({}) };
  const req = makeRequest({});
  const result = await authenticate(req, env);
  assert.ok(result.error instanceof Response);
  assert.equal(result.error.status, 401);
});

test("requireProductAccess(): subconp tier always passes regardless of productSlug", async () => {
  const env = {
    DB: makeFakeDb({
      subscriptionRow: { subscription_status: "active", submittals_used: 0, submittals_limit: 10 },
      productRow: { subscription_tier: "subconp", products_enabled: "" },
    }),
  };
  const result = await requireProductAccess({ userId: "user_1" }, env, "asbuiltx");
  assert.equal(result, null);
});

test("requireProductAccess(): standalone product not enabled -> 402 PRODUCT_NOT_ENABLED", async () => {
  const env = {
    DB: makeFakeDb({
      subscriptionRow: { subscription_status: "active", submittals_used: 0, submittals_limit: 10 },
      productRow: { subscription_tier: "standard", products_enabled: "takeoffx,cutsheetx" },
    }),
  };
  const result = await requireProductAccess({ userId: "user_1" }, env, "lienx");
  assert.ok(result instanceof Response);
  assert.equal(result.status, 402);
  const body = await result.json();
  assert.equal(body.error.code, "PRODUCT_NOT_ENABLED");
});
