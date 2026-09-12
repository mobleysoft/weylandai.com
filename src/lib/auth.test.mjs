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
import { authenticate, requireProductAccess, requireActiveSubscription } from "./auth.js";

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

test("authenticate(): AuthFor-bridged user gets a real tenantId, not undefined - regression test for a real production 500", async () => {
  // Found 2026-09-09 while seeding a real demo project: this path used to
  // return a user with no tenantId/tenant_id at all, so POST /api/projects
  // (which INSERTs into a NOT NULL tenant_id column) threw a real
  // D1_TYPE_ERROR for every AuthFor-authenticated customer. Confirmed live
  // against production before this fix, then again after.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ email: "no-tenant@example.com", name: "No Tenant Row" }),
  });
  try {
    const envNullTenant = {
      DB: makeFakeDb({
        userByEmail: { id: "user_3", email: "no-tenant@example.com", name: "No Tenant Row", tenant_id: null },
      }),
    };
    const req1 = makeRequest({ bearer: "token-1" });
    const result1 = await authenticate(req1, envNullTenant);
    assert.equal(result1.user.tenantId, "ven_weyland", "falls back to the same default legacy-local-session.js uses");
    assert.equal(result1.user.tenant_id, "ven_weyland");

    const envRealTenant = {
      DB: makeFakeDb({
        userByEmail: { id: "user_4", email: "no-tenant@example.com", name: "Has Tenant", tenant_id: "tenant-abc123" },
      }),
    };
    const req2 = makeRequest({ bearer: "token-2" });
    const result2 = await authenticate(req2, envRealTenant);
    assert.equal(result2.user.tenantId, "tenant-abc123", "uses the real stored tenant_id when one exists, not the fallback");
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

// --- Ephemeral (guest trial) session tests, added 2026-09-09 ---

test("authenticate(): AuthFor /verify rejects the token, but AuthFor /ephemeral/verify accepts it -> real ephemeral guest user, no local DB row needed", async () => {
  const originalFetch = globalThis.fetch;
  const calledUrls = [];
  globalThis.fetch = async (url, opts) => {
    calledUrls.push(url);
    if (url === "https://authfor.com/api/v1/verify") {
      return { ok: false, json: async () => ({}) };
    }
    if (url === "https://authfor.com/api/v1/ephemeral/verify") {
      const body = JSON.parse(opts.body);
      assert.equal(body.token, "real-ephemeral-token");
      return {
        ok: true,
        json: async () => ({ id: "abc123", ventureName: "weylandai.com", displayName: "Guest Visitor", upgraded: false }),
      };
    }
    throw new Error("unexpected fetch to " + url);
  };
  try {
    const env = { DB: makeFakeDb({}) };
    const req = makeRequest({ bearer: "real-ephemeral-token" });
    const result = await authenticate(req, env);
    assert.equal(result.error, undefined);
    assert.equal(result.user.ephemeral, true);
    assert.equal(result.user.userId, null);
    assert.equal(result.user.name, "Guest Visitor");
    assert.deepEqual(calledUrls, ["https://authfor.com/api/v1/verify", "https://authfor.com/api/v1/ephemeral/verify"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authenticate(): neither /verify nor /ephemeral/verify recognize the token -> falls through to 401, not a crash", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
  try {
    const env = { DB: makeFakeDb({}) };
    const req = makeRequest({ bearer: "garbage-token" });
    const result = await authenticate(req, env);
    assert.ok(result.error instanceof Response);
    assert.equal(result.error.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requireProductAccess(): ephemeral guest gets real access to the four named trial products, no local DB lookup", async () => {
  const env = { DB: makeFakeDb({}) }; // no rows configured - would throw/return null if this code path touched the DB at all
  const guest = { ephemeral: true, userId: null };
  for (const slug of ["subx", "takeoffx", "cutsheetx", "sightx"]) {
    const result = await requireProductAccess(guest, env, slug);
    assert.equal(result, null, `expected ${slug} to be trial-accessible`);
  }
});

test("requireProductAccess(): ephemeral guest denied a non-trial product with a real upgrade prompt, not a generic 401", async () => {
  const env = { DB: makeFakeDb({}) };
  const guest = { ephemeral: true, userId: null };
  const result = await requireProductAccess(guest, env, "cps-admin");
  assert.ok(result instanceof Response);
  assert.equal(result.status, 402);
});

// Real trial-entitlement metering, added alongside consenta.cc's
// /api/v1/trials/:token/consume (conglomerate-wide-trial-invite-emails).
// An invited ephemeral session (has an ephemeralToken tied to a real
// consenta.cc entitlement row) is metered; a plain anonymous landing-page
// visitor (no ephemeralToken passed through, or consenta.cc has no row for
// it - NOT_FOUND) keeps today's unmetered access, unchanged.
test("requireProductAccess(): invited ephemeral session with remaining trial payloads is allowed and consumes one", async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl = null;
  globalThis.fetch = async (url, opts) => {
    calledUrl = url;
    assert.equal(url, "https://consenta.cc/api/v1/trials/tok_real/consume");
    assert.equal(JSON.parse(opts.body).amount, 1);
    return { ok: true, json: async () => ({ ok: true, status: "active", remaining: 4 }) };
  };
  try {
    const env = { DB: makeFakeDb({}) };
    const guest = { ephemeral: true, userId: null, ephemeralToken: "tok_real" };
    const result = await requireProductAccess(guest, env, "subx");
    assert.equal(result, null, "must allow access when consenta.cc reports a real remaining payload");
    assert.equal(calledUrl, "https://consenta.cc/api/v1/trials/tok_real/consume");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requireProductAccess(): an anonymous ephemeral session with no tracked entitlement (NOT_FOUND) keeps unmetered access", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, reason: "NOT_FOUND" }) });
  try {
    const env = { DB: makeFakeDb({}) };
    const guest = { ephemeral: true, userId: null, ephemeralToken: "tok_anonymous" };
    const result = await requireProductAccess(guest, env, "subx");
    assert.equal(result, null, "NOT_FOUND must not be treated as a block - it means no invite ever tracked this session");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requireProductAccess(): an invited ephemeral session with an exhausted trial is blocked with a real 402, not silently allowed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, reason: "EXHAUSTED", status: "exhausted", remaining: 0 }) });
  try {
    const env = { DB: makeFakeDb({}) };
    const guest = { ephemeral: true, userId: null, ephemeralToken: "tok_exhausted" };
    const result = await requireProductAccess(guest, env, "subx");
    assert.ok(result instanceof Response);
    assert.equal(result.status, 402);
    const body = await result.json();
    assert.equal(body.error.code, "TRIAL_LIMIT_REACHED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requireProductAccess(): a consenta.cc outage fails OPEN (matches today's existing unmetered ephemeral behavior)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network unreachable"); };
  try {
    const env = { DB: makeFakeDb({}) };
    const guest = { ephemeral: true, userId: null, ephemeralToken: "tok_whatever" };
    const result = await requireProductAccess(guest, env, "subx");
    assert.equal(result, null, "a metering-service outage must not break the existing no-login trial demo");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requireActiveSubscription(): ephemeral guest passes unconditionally (no local row to check)", async () => {
  const env = { DB: makeFakeDb({}) };
  const result = await requireActiveSubscription({ ephemeral: true, userId: null }, env);
  assert.equal(result, null);
});
