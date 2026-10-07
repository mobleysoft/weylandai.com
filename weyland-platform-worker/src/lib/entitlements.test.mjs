// node --test src/lib/entitlements.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  GUEST_PRODUCTS, SUITE_PRODUCTS, TRIAL_MARK, SIGNED_IN_SUBMITTALS_LIMIT,
  newTrialAccount, desiredEntitlements, syncUserEntitlements, sweepEntitlements,
  purchasedFromStripe, describeEntitlements, parseProducts
} from "./entitlements.js";
import { requireProductAccess } from "./auth.js";

const NOW = Date.parse("2026-10-07T06:00:00.000Z");
const DAY = 24 * 3600 * 1000;

// Minimal D1 stand-in for the statements entitlements.js and auth.js issue.
function fakeDb(rows) {
  const users = new Map(rows.map((r) => [r.id, { ...r }]));
  const log = [];
  return {
    users, log,
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...a) { stmt.args = a; return stmt; },
        async first() {
          log.push(sql);
          if (/FROM users WHERE id = \?/.test(sql)) {
            const r = users.get(stmt.args[0]);
            return r ? { ...r } : null;
          }
          throw new Error("unexpected first(): " + sql);
        },
        async all() {
          log.push(sql);
          if (/FROM users/.test(sql)) {
            const [markLike, ...rest] = stmt.args;
            const limit = rest.pop();
            const guestLikes = rest;
            const matches = [...users.values()].filter((r) => {
              const wrapped = "," + (r.products_enabled || "") + ",";
              const like = (pat) => wrapped.includes(pat.replace(/%/g, ""));
              return ["trial", "trial_expired"].includes(r.subscription_status) || like(markLike) || guestLikes.some((g) => !like(g));
            });
            return { results: matches.slice(0, limit).map((r) => ({ ...r })) };
          }
          throw new Error("unexpected all(): " + sql);
        },
        async run() {
          log.push(sql);
          if (/^\s*UPDATE users SET subscription_tier/.test(sql)) {
            const [tier, status, products, limit, updatedAt, id, curTier, curStatus, curProducts] = stmt.args;
            const r = users.get(id);
            if (!r || (r.subscription_tier ?? "") !== curTier || (r.subscription_status ?? "") !== curStatus || (r.products_enabled ?? "") !== curProducts) {
              return { meta: { changes: 0 } };
            }
            Object.assign(r, { subscription_tier: tier, subscription_status: status, products_enabled: products, submittals_limit: limit, updated_at: updatedAt });
            return { meta: { changes: 1 } };
          }
          throw new Error("unexpected run(): " + sql);
        }
      };
      return stmt;
    }
  };
}

test("a new trial carries the whole suite, the trial mark and no low submittal cap", () => {
  const t = newTrialAccount(NOW);
  const products = parseProducts(t.products_enabled);
  assert.equal(t.subscription_tier, "starter");
  assert.equal(t.subscription_status, "trial");
  assert.ok(products.includes(TRIAL_MARK));
  for (const p of [...GUEST_PRODUCTS, "meetingx", "wire", "lienx"]) assert.ok(products.includes(p), p);
  assert.equal(Date.parse(t.trial_ends_at), NOW + 14 * DAY);
  assert.equal(t.submittals_limit, SIGNED_IN_SUBMITTALS_LIMIT);
});

test("SUITE_PRODUCTS covers every catalog tier and the guest set", () => {
  for (const g of GUEST_PRODUCTS) assert.ok(SUITE_PRODUCTS.includes(g));
  assert.ok(SUITE_PRODUCTS.includes("meetingx"));
  assert.ok(!SUITE_PRODUCTS.includes(null));
});

test("an existing trial row created with products_enabled '' gets the suite while the trial is open", () => {
  const row = { id: "u1", subscription_tier: "starter", subscription_status: "trial", products_enabled: "", submittals_limit: 10, trial_ends_at: new Date(NOW + 5 * DAY).toISOString() };
  const d = desiredEntitlements(row, NOW);
  assert.equal(d.reason, "trial-open");
  const products = parseProducts(d.changes.products_enabled);
  assert.ok(products.includes("cutsheetx") && products.includes("meetingx") && products.includes(TRIAL_MARK));
  assert.equal(d.changes.subscription_status, "trial");
  assert.equal(d.changes.submittals_limit, SIGNED_IN_SUBMITTALS_LIMIT);
});

test("a trial that ended without a purchase drops to the free plan with the guest floor", () => {
  const row = { id: "u1", subscription_tier: "starter", subscription_status: "trial", products_enabled: newTrialAccount(NOW - 20 * DAY).products_enabled, submittals_limit: 999, trial_ends_at: new Date(NOW - 6 * DAY).toISOString() };
  const d = desiredEntitlements(row, NOW);
  assert.equal(d.reason, "trial-ended-free");
  assert.equal(d.changes.subscription_tier, "free");
  assert.equal(d.changes.subscription_status, "active");
  assert.deepEqual(parseProducts(d.changes.products_enabled).sort(), [...GUEST_PRODUCTS].sort());
});

test("legacy status trial_expired also becomes the free plan", () => {
  const row = { id: "u1", subscription_tier: "starter", subscription_status: "trial_expired", products_enabled: "", submittals_limit: 10, trial_ends_at: new Date(NOW - DAY).toISOString() };
  const d = desiredEntitlements(row, NOW);
  assert.equal(d.changes.subscription_tier, "free");
  assert.equal(d.changes.subscription_status, "active");
});

test("a purchase during the trial keeps only what Stripe says is paid for once the trial ends", () => {
  const row = { id: "u1", subscription_tier: "standalone", subscription_status: "active", products_enabled: newTrialAccount(NOW - 20 * DAY).products_enabled, submittals_limit: 50, trial_ends_at: new Date(NOW - DAY).toISOString(), stripe_customer_id: "cus_x" };
  const pending = desiredEntitlements(row, NOW);
  assert.equal(pending.needsStripe, true);
  assert.equal(pending.changes, null);
  const d = desiredEntitlements(row, NOW, { tiers: new Set(["meetingx"]), suite: false });
  assert.deepEqual(parseProducts(d.changes.products_enabled).sort(), [...GUEST_PRODUCTS, "meetingx"].sort());
  assert.equal(d.changes.subscription_status, "active");
  assert.equal(d.changes.subscription_tier, "standalone");
});

test("a suite purchase during the trial keeps tier subconp and drops the trial grant", () => {
  const row = { id: "u1", subscription_tier: "subconp", subscription_status: "active", products_enabled: newTrialAccount(NOW - 20 * DAY).products_enabled, submittals_limit: 50, trial_ends_at: new Date(NOW - DAY).toISOString() };
  const d = desiredEntitlements(row, NOW);
  assert.equal(d.reason, "trial-ended-suite");
  assert.equal(d.changes.subscription_tier, "subconp");
  assert.ok(!parseProducts(d.changes.products_enabled).includes(TRIAL_MARK));
});

test("paid and internal accounts keep their products and gain the guest floor", () => {
  const meet = desiredEntitlements({ id: "m", subscription_tier: "internal_test", subscription_status: "active", products_enabled: "meetingx", trial_ends_at: new Date(NOW + 9 * DAY).toISOString() }, NOW);
  assert.deepEqual(parseProducts(meet.changes.products_enabled).sort(), ["meetingx", ...GUEST_PRODUCTS].sort());
  assert.equal(meet.changes.subscription_status, "active");
  const empty = desiredEntitlements({ id: "e", subscription_tier: "internal_test", subscription_status: "active", products_enabled: "" }, NOW);
  assert.deepEqual(parseProducts(empty.changes.products_enabled).sort(), [...GUEST_PRODUCTS].sort());
  const done = desiredEntitlements({ id: "d", subscription_tier: "standalone", subscription_status: "cancelled", products_enabled: [...GUEST_PRODUCTS, "meetingx"].join(",") }, NOW);
  assert.equal(done.changes, null);
});

test("a trial status with no end date only gets the guest floor (it never expires anywhere)", () => {
  const d = desiredEntitlements({ id: "x", subscription_tier: "starter", subscription_status: "trial", products_enabled: "", trial_ends_at: null }, NOW);
  assert.equal(d.reason, "guest-floor");
  assert.ok(!parseProducts(d.changes.products_enabled).includes("meetingx"));
});

test("syncUserEntitlements writes compare-and-set and is idempotent", async () => {
  const db = fakeDb([{ id: "u1", subscription_tier: "starter", subscription_status: "trial", products_enabled: "", submittals_limit: 10, trial_ends_at: new Date(NOW + DAY).toISOString() }]);
  const first = await syncUserEntitlements({ DB: db }, "u1", { nowMs: NOW });
  assert.equal(first.changed, true);
  assert.ok(parseProducts(db.users.get("u1").products_enabled).includes("cutsheetx"));
  const second = await syncUserEntitlements({ DB: db }, "u1", { nowMs: NOW });
  assert.equal(second.changed, false);
});

test("syncUserEntitlements never overwrites a concurrent purchase write", async () => {
  const db = fakeDb([{ id: "u1", subscription_tier: "internal_test", subscription_status: "active", products_enabled: "" }]);
  const staleRow = { ...db.users.get("u1") };
  db.users.get("u1").products_enabled = "meetingx"; // the webhook wrote between our read and our write
  const res = await syncUserEntitlements({ DB: db }, "u1", { nowMs: NOW, row: staleRow });
  assert.equal(res.changed, false);
  assert.equal(res.reason, "lost-race-retry-next-sync");
  assert.equal(db.users.get("u1").products_enabled, "meetingx");
});

test("an ended trial with a purchase but no Stripe customer is left alone (not stripped)", async () => {
  const products = newTrialAccount(NOW - 20 * DAY).products_enabled;
  const db = fakeDb([{ id: "u1", subscription_tier: "standalone", subscription_status: "active", products_enabled: products, trial_ends_at: new Date(NOW - DAY).toISOString(), stripe_customer_id: null }]);
  const res = await syncUserEntitlements({ DB: db }, "u1", { nowMs: NOW });
  assert.equal(res.changed, false);
  assert.equal(db.users.get("u1").products_enabled, products);
});

test("purchasedFromStripe maps live subscription prices to product tiers", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/v1\/subscriptions\?customer=cus_1&status=all&limit=100$/);
    return new Response(JSON.stringify({ data: [
      { status: "active", items: { data: [{ price: { id: "price_1UAwDiLWTxUJi5AV3zx4ZMgp" } }] } },
      { status: "canceled", items: { data: [{ price: { id: "price_1UAqxkLWTxUJi5AVk2l5N4Cg" } }] } },
      { status: "trialing", items: { data: [{ price: { id: "price_1UAh7DLWTxUJi5AVaNKljKc7" } }] } }
    ] }), { status: 200 });
  };
  try {
    const p = await purchasedFromStripe({ STRIPE_SECRET_KEY: "sk_test_x" }, "cus_1");
    assert.deepEqual([...p.tiers], ["meetingx"]);
    assert.equal(p.suite, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("sweepEntitlements fixes every row that needs it and leaves correct rows alone", async () => {
  const db = fakeDb([
    { id: "trial-old", subscription_tier: "starter", subscription_status: "trial", products_enabled: "", submittals_limit: 10, trial_ends_at: new Date(NOW - DAY).toISOString() },
    { id: "trial-new", subscription_tier: "starter", subscription_status: "trial", products_enabled: "", submittals_limit: 10, trial_ends_at: new Date(NOW + DAY).toISOString() },
    { id: "fixture", subscription_tier: "internal_test", subscription_status: "active", products_enabled: "" },
    { id: "fine", subscription_tier: "subconp", subscription_status: "active", products_enabled: GUEST_PRODUCTS.join(",") }
  ]);
  const r = await sweepEntitlements({ DB: db }, { nowMs: NOW });
  assert.equal(r.scanned, 3);
  assert.equal(r.changed, 3);
  assert.equal(db.users.get("trial-old").subscription_tier, "free");
  assert.ok(parseProducts(db.users.get("trial-new").products_enabled).includes("meetingx"));
  assert.ok(parseProducts(db.users.get("fixture").products_enabled).includes("cutsheetx"));
});

test("describeEntitlements reports the trial, the suite and the guest floor", () => {
  const t = newTrialAccount(NOW);
  const e = describeEntitlements({ subscription_tier: "starter", subscription_status: "trial", ...t }, NOW);
  assert.equal(e.plan, "trial");
  assert.equal(e.trial.active, true);
  assert.ok(e.products.includes("meetingx"));
  const free = describeEntitlements({ subscription_tier: "free", subscription_status: "active", products_enabled: GUEST_PRODUCTS.join(","), trial_ends_at: new Date(NOW - DAY).toISOString() }, NOW);
  assert.equal(free.plan, "free");
  assert.equal(free.trial.active, false);
  assert.ok(!free.products.includes("meetingx"));
  assert.ok(free.products.includes("cutsheetx"));
});

test("reference requireProductAccess: guest-level products pass for any signed-in account, others still gate", async () => {
  const db = fakeDb([{ id: "c1", subscription_tier: "standalone", subscription_status: "cancelled", products_enabled: "", submittals_used: 0, submittals_limit: 10 }]);
  db.prepare = ((orig) => (sql) => {
    if (/SELECT subscription_status, subscription_tier, submittals_used/.test(sql) || /SELECT subscription_tier, products_enabled FROM users/.test(sql)) {
      const s = { args: [], bind(...a) { s.args = a; return s; }, async first() { return { ...db.users.get(s.args[0]) }; } };
      return s;
    }
    return orig.call(db, sql);
  })(db.prepare);
  const user = { userId: "c1" };
  assert.equal(await requireProductAccess(user, { DB: db }, "cutsheetx"), null);
  const denied = await requireProductAccess(user, { DB: db }, "meetingx");
  assert.equal(denied.status, 402);
});
