import { test } from "node:test";
import assert from "node:assert/strict";
import { requireProductAccess } from "./auth.js";

// requireProductAccess reads the users row (SELECT id ... for the guest-floor rule, then the
// subscription row); this fake answers every query with the same row.
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

test("any signed-in account keeps the guest products (huntx, propx), whatever its plan or status", async () => {
  const rows = [
    { id: "u1", subscription_status: "trial", subscription_tier: "starter", trial_ends_at: future, products_enabled: "", submittals_used: 0, submittals_limit: 10 },
    { id: "u1", subscription_status: "trial", subscription_tier: "starter", trial_ends_at: past, products_enabled: "", submittals_used: 0, submittals_limit: 10 },
    { id: "u1", subscription_status: "canceled", subscription_tier: "cutsheetx", trial_ends_at: null, products_enabled: "cutsheetx", submittals_used: 50, submittals_limit: 10 },
  ];
  for (const row of rows) {
    assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith(row) }, "huntx"), null, JSON.stringify(row));
    assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith(row) }, "propx"), null, JSON.stringify(row));
  }
});

test("meetingx (not a guest product) still needs the plan: subconp or products_enabled", async () => {
  const base = { id: "u1", subscription_status: "active", trial_ends_at: null, submittals_used: 0, submittals_limit: 10 };
  const res = await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "starter", products_enabled: "huntx" }) }, "meetingx");
  assert.equal(res.status, 402);
  assert.equal((await res.json()).error.code, "PRODUCT_NOT_ENABLED");
  assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "subconp", products_enabled: "" }) }, "meetingx"), null);
  assert.equal(await requireProductAccess({ userId: "u1" }, { DB: dbWith({ ...base, subscription_tier: "x", products_enabled: "huntx,meetingx" }) }, "meetingx"), null);
});

test("an expired trial is refused for products beyond the guest set", async () => {
  const res = await requireProductAccess({ userId: "u1" }, { DB: dbWith({ id: "u1", subscription_status: "trial", subscription_tier: "starter", trial_ends_at: past, products_enabled: "meetingx", submittals_used: 0, submittals_limit: 10 }) }, "meetingx");
  assert.equal(res.status, 402);
  assert.equal((await res.json()).error.code, "SUBSCRIPTION_EXPIRED");
});

test("an anonymous guest session gets huntx and propx but not meetingx", async () => {
  const guest = { ephemeral: true, ephemeralToken: null };
  assert.equal(await requireProductAccess(guest, { DB: dbWith(null) }, "huntx"), null);
  const res = await requireProductAccess(guest, { DB: dbWith(null) }, "meetingx");
  assert.equal(res.status, 402);
});

test("a user id with no users row gets no guest-floor pass", async () => {
  const res = await requireProductAccess({ userId: "ghost" }, { DB: dbWith(null) }, "huntx");
  assert.equal(res.status, 404);
});
