import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSubscriptionRoutes } from "./subscription.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const errorResponseOk = (code, message) => new Response(JSON.stringify({ error: { code, message } }), { status: code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : 500 });

function makeFakeDb({ row = null } = {}) {
  return {
    prepare() {
      const stmt = {
        async first() { return row; },
        async run() { return { success: true }; },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
}

function setup({ authenticate = authOk, db, vendyai, errorResponse = errorResponseOk } = {}) {
  const router = new NativeRouter();
  registerSubscriptionRoutes(router, { authenticate, errorResponse });
  return { router, env: { DB: db || makeFakeDb(), VENDYAI: vendyai } };
}

test("GET /api/subscription/status: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/subscription/status"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/subscription/status: 404 when user not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const res = await router.handle(new Request("https://example.com/api/subscription/status"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/subscription/status: real happy path returns subscription details", async () => {
  const db = makeFakeDb({ row: { subscription_tier: "starter", subscription_status: "active", submittals_used: 3, submittals_limit: 10, trial_ends_at: null } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/subscription/status"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.subscription.tier, "starter");
  assert.equal(body.subscription.status, "active");
  assert.equal(body.subscription.submittalsUsed, 3);
});

test("GET /api/subscription/status: real behavior flips an expired trial to trial_expired", async () => {
  const pastDate = new Date(Date.now() - 86400000).toISOString();
  const db = makeFakeDb({ row: { subscription_tier: "starter", subscription_status: "trial", trial_ends_at: pastDate, submittals_used: 0, submittals_limit: 10 } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/subscription/status"), env, {});
  const body = await res.json();
  assert.equal(body.subscription.status, "trial_expired");
});

test("POST /api/subscription/portal: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/subscription/portal", { method: "POST" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/subscription/portal: 400 when no stripe_customer_id on file", async () => {
  const { router, env } = setup({ db: makeFakeDb({ row: null }) });
  const res = await router.handle(new Request("https://example.com/api/subscription/portal", { method: "POST" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/subscription/portal: real happy path returns a portal URL via the vendyai service binding", async () => {
  const db = makeFakeDb({ row: { stripe_customer_id: "cus_1" } });
  const vendyai = {
    async fetch(url, init) {
      const body = JSON.parse(init.body);
      assert.equal(body.customer_id, "cus_1");
      return new Response(JSON.stringify({ portal: { url: "https://billing.stripe.com/p1" } }), { status: 200 });
    },
  };
  const { router, env } = setup({ db, vendyai });
  const res = await router.handle(new Request("https://example.com/api/subscription/portal", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.portalUrl, "https://billing.stripe.com/p1");
});

test("POST /api/subscription/portal: 500 when vendyai returns an error", async () => {
  const db = makeFakeDb({ row: { stripe_customer_id: "cus_1" } });
  const vendyai = { async fetch() { return new Response("boom", { status: 500 }); } };
  const { router, env } = setup({ db, vendyai });
  const res = await router.handle(new Request("https://example.com/api/subscription/portal", { method: "POST" }), env, {});
  assert.equal(res.status, 500);
});
