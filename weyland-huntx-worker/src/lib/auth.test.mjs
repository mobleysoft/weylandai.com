import { test } from "node:test";
import assert from "node:assert/strict";
import { requireProductAccess } from "./auth.js";

function dbWith(row) {
  return {
    prepare() {
      const stmt = { bind() { return stmt; }, async first() { return row; } };
      return stmt;
    },
  };
}

const future = new Date(Date.now() + 7 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

test("a live trial account gets the guest-trial products (huntx, propx)", async () => {
  const env = { DB: dbWith({ subscription_status: "trial", subscription_tier: "starter", trial_ends_at: future, products_enabled: "", submittals_used: 0, submittals_limit: 10 }) };
  assert.equal(await requireProductAccess({ userId: "u1" }, env, "huntx"), null);
  assert.equal(await requireProductAccess({ userId: "u1" }, env, "propx"), null);
});

test("a live trial account still needs a plan for meetingx (not a guest-trial product)", async () => {
  const env = { DB: dbWith({ subscription_status: "trial", subscription_tier: "starter", trial_ends_at: future, products_enabled: "", submittals_used: 0, submittals_limit: 10 }) };
  const res = await requireProductAccess({ userId: "u1" }, env, "meetingx");
  assert.equal(res.status, 402);
  assert.equal((await res.json()).error.code, "PRODUCT_NOT_ENABLED");
});

test("an expired trial is refused before the product check", async () => {
  const env = { DB: dbWith({ subscription_status: "trial", subscription_tier: "starter", trial_ends_at: past, products_enabled: "", submittals_used: 0, submittals_limit: 10 }) };
  const res = await requireProductAccess({ userId: "u1" }, env, "huntx");
  assert.equal(res.status, 402);
  assert.equal((await res.json()).error.code, "SUBSCRIPTION_EXPIRED");
});

test("an active paid plan without the product is still refused; subconp and products_enabled pass", async () => {
  const base = { subscription_status: "active", trial_ends_at: null, submittals_used: 0, submittals_limit: 10 };
  const res = await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "cutsheetx", products_enabled: "cutsheetx" }) }, "huntx");
  assert.equal(res.status, 402);
  assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "subconp", products_enabled: "" }) }, "meetingx"), null);
  assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "x", products_enabled: "huntx,meetingx" }) }, "meetingx"), null);
});

test("an anonymous guest session gets huntx and propx but not meetingx", async () => {
  const guest = { ephemeral: true, ephemeralToken: null };
  assert.equal(await requireProductAccess(guest, { DB: dbWith(null) }, "huntx"), null);
  const res = await requireProductAccess(guest, { DB: dbWith(null) }, "meetingx");
  assert.equal(res.status, 402);
});
