import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareComponentPriceRoutes } from "./hardware-component-price.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ comp = null } = {}) {
  return {
    prepare() {
      const stmt = {
        async first() { return comp; },
        async run() { return { success: true }; },
      };
      stmt.bind = () => stmt;
      return stmt;
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerHardwareComponentPriceRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb({ comp: { id: "c1", set_id: "s1", session_id: "sess1" } }) } };
}

test("PUT /api/hardware-components/:componentId/select-price: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("PUT /api/hardware-components/:componentId/select-price: 400 when unitPrice missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/hardware-components/:componentId/select-price: 400 when unitPrice is negative", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: JSON.stringify({ unitPrice: -5 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("PUT /api/hardware-components/:componentId/select-price: 404 when component not found or not owned", async () => {
  const { router, env } = setup({ db: makeFakeDb({ comp: null }) });
  const req = new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: JSON.stringify({ unitPrice: 10 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PUT /api/hardware-components/:componentId/select-price: real happy path with a product variant marks user_selected", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: JSON.stringify({ unitPrice: 12.5, variantId: "v1" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.unitPrice, 12.5);
  assert.equal(body.priceSource, "user_selected");
  assert.equal(body.variantId, "v1");
});

test("PUT /api/hardware-components/:componentId/select-price: real happy path with no variant marks manual", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-components/c1/select-price", { method: "PUT", body: JSON.stringify({ unitPrice: 8 }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.priceSource, "manual");
  assert.equal(body.variantId, null);
});
