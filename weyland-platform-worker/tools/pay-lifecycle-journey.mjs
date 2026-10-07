// weyland-platform-worker/tools/pay-lifecycle-journey.mjs
//
// Live check of the payment lifecycle through the production chain, without a
// payment and without creating anything in Stripe (2026-10-07):
//
//   Stripe-signed event -> https://vendyai.com/api/stripe/webhook (vendyai-com-worker
//   checks Stripe's signature, forwards events of venture weylandai)
//   -> https://weylandai.com/api/webhooks/subscription (weyland-platform-worker)
//   -> weyland_db users / weyland_subscriptions -> MeetingX's own product gate.
//
//   node weyland-platform-worker/tools/pay-lifecycle-journey.mjs
//
// Needs STRIPE_WEBHOOK_SECRET in the environment: the signing secret of the
// Stripe endpoint https://vendyai.com/api/stripe/webhook (vendyai holds the same
// value). It is used to sign and never printed. The events describe a made-up
// subscription (sub_usersim..., cus_usersim...) for a throwaway account
// user-sim-pay-<id>@weylandai.com created here in D1 (no AuthFor identity: the
// purchase is made "signed in", client_reference_id = that account). amount_total
// is null, so vendyai posts no settlement entry. vendyai's fee lookup asks Stripe
// for the made-up checkout session and gets a 404 (a read). Every row this run
// makes (users, weyland_sessions, weyland_subscriptions, processed_webhook_events)
// and the KV checkout status are deleted in finally. Prints a JSON report.
//
// Steps: purchase (MeetingX seat) -> the same event again -> renewal payment fails
// (past_due) -> card fixed (active) -> renewal paid (new usage period) ->
// invoice.payment_failed -> cancelled -> a late older event. After each: the users
// row, the subscription row, /api/auth/me and MeetingX's room upgrade (101 or 402).

import { createHmac, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";

import { WEYLAND_PRODUCTS } from "../src/lib/stripe-billing.js";

const execFileP = promisify(execFile);
const VENDYAI = process.env.VENDYAI_WEBHOOK_URL || "https://vendyai.com/api/stripe/webhook";
const BASE = process.env.WEYLAND_BASE_URL || "https://weylandai.com";
const WORKER_DIR = new URL("../", import.meta.url).pathname;
const CACHE_NAMESPACE = "80a77dcf4f5f4e8588c172f2ecef95fb";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 WeylandAI-user-sim";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const id = Date.now().toString(36) + randomBytes(3).toString("hex");
const email = "user-sim-pay-" + id + "@weylandai.com";
const userId = "usersim-pay-" + id;
const sub = "sub_usersim" + id;
const customer = "cus_usersim" + id;
const checkoutId = "cs_live_usersim" + id + randomBytes(6).toString("hex");
const price = WEYLAND_PRODUCTS["weyland-meetingx-seat"].priceId;
const eventIds = [];
const report = { started_at: new Date().toISOString(), vendyai: VENDYAI, base: BASE, email, checks: [] };

function check(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail });
  console.error((ok ? "PASS " : "FAIL ") + name + (detail !== undefined ? "  " + JSON.stringify(detail).slice(0, 400) : ""));
}

async function d1(sql) {
  const env = { ...process.env };
  delete env.CF_API_KEY;
  const { stdout } = await execFileP("npx", ["wrangler", "d1", "execute", "weyland_db", "--remote", "--json", "--command", sql], { cwd: WORKER_DIR, env, maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(stdout)[0];
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

async function stripeEvent(type, object, created) {
  const evtId = "evt_usersim" + id + "_" + eventIds.length;
  eventIds.push(evtId);
  return sendEvent({ id: evtId, object: "event", api_version: "2024-11-20.acacia", type, created, livemode: true, data: { object } });
}
async function sendEvent(event) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000).toString();
  const v1 = createHmac("sha256", SECRET).update(t + "." + body).digest("hex");
  const r = await fetch(VENDYAI, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=" + t + ",v1=" + v1, "User-Agent": UA }, body });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, event };
}

let cookie = null;
async function api(path) {
  const r = await fetch(BASE + path, { headers: { "User-Agent": UA, Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) } });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, headers: r.headers };
}

// MeetingX gates the room WebSocket upgrade with its own requireProductAccess("meetingx").
function meetingxUpgrade() {
  return new Promise((resolve) => {
    const u = new URL(BASE + "/api/sight/room/usersim-pay-" + id);
    const req = https.request({
      host: u.host, path: u.pathname, method: "GET",
      headers: { "User-Agent": UA, Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": randomBytes(16).toString("base64"), Cookie: cookie || "" }
    });
    const done = (v) => { try { req.destroy(); } catch {} resolve(v); };
    req.on("upgrade", (res, socket) => { socket.destroy(); done(res.statusCode); });
    req.on("response", (res) => { res.resume(); done(res.statusCode); });
    req.on("error", (e) => done("error:" + e.message));
    req.setTimeout(15000, () => done("timeout"));
    req.end();
  });
}

async function state() {
  const r = await d1(
    "SELECT u.subscription_tier AS tier, u.subscription_status AS status, u.products_enabled AS products, u.submittals_used AS used, u.submittals_limit AS lim, " +
    "(SELECT status FROM weyland_subscriptions WHERE subscription_id = " + q(sub) + ") AS sub_status, " +
    "(SELECT COUNT(*) FROM weyland_sessions WHERE user_id = " + q(userId) + ") AS sessions, " +
    "(SELECT COUNT(*) FROM processed_webhook_events WHERE event_id LIKE " + q("evt_usersim" + id + "%") + " OR event_id = " + q("checkout:" + checkoutId) + ") AS dedupe_rows " +
    "FROM users u WHERE u.id = " + q(userId));
  const row = r.results[0] || {};
  row.meetingx = String(row.products || "").split(",").includes("meetingx");
  delete row.products;
  return row;
}

const subscriptionObject = (status) => ({
  id: sub, object: "subscription", customer, status, cancel_at_period_end: false, livemode: true,
  metadata: { venture_id: "weylandai", product_id: "weyland-meetingx-seat", seats: "1", user_id: userId },
  items: { object: "list", data: [{ id: "si_usersim" + id, object: "subscription_item", quantity: 1, price: { id: price, object: "price" } }] }
});
const invoiceObject = (status, billingReason) => ({
  id: "in_usersim" + id + "_" + eventIds.length, object: "invoice", customer, status, billing_reason: billingReason, livemode: true,
  subscription: sub, subscription_details: { metadata: { venture_id: "weylandai", product_id: "weyland-meetingx-seat", seats: "1" } },
  lines: { object: "list", data: [{ id: "il_usersim" + id, object: "line_item", type: "subscription", subscription: sub, quantity: 1, price: { id: price }, metadata: { venture_id: "weylandai" } }] }
});

async function main() {
  if (!SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set (the vendyai Stripe endpoint's signing secret)");
  await d1("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit) VALUES (" +
    [userId, email, "User Sim Payments"].map(q).join(", ") + ", 'free', 'active', 'subx,takeoffx,cutsheetx,sightx,huntx,propx', 999)");
  const t0 = Math.floor(Date.now() / 1000);

  // 1. Purchase: the completed embedded checkout of a signed-in account.
  const session = {
    id: checkoutId, object: "checkout.session", mode: "subscription", status: "complete", payment_status: "paid", livemode: true,
    customer, subscription: sub, client_reference_id: userId, customer_email: email,
    customer_details: { email, name: "User Sim Payments" }, amount_total: null, currency: "usd",
    metadata: { venture_id: "weylandai", product_id: "weyland-meetingx-seat", seats: "1", ui: "embedded", start_path: "/" }
  };
  const bought = await stripeEvent("checkout.session.completed", session, t0);
  check("purchase: vendyai accepts the Stripe-signed event and delivers it to weylandai", bought.status === 200 && bought.data?.forwarded?.forwarded === true, { status: bought.status, forwarded: bought.data?.forwarded, ledger: bought.data?.mobcoin_ledger });
  const poll = await api("/api/billing/checkout/status/" + checkoutId);
  const m = (poll.headers.get("set-cookie") || "").match(/weyland_session=([^;]+)/);
  cookie = m ? "weyland_session=" + m[1] : null;
  check("purchase: the checkout status poll signs the buying account in", poll.data?.status === "active" && poll.data?.signed_in === true && !!cookie, poll.data);
  let s = await state();
  check("purchase: account standalone/active with MeetingX, subscription active", s.tier === "standalone" && s.status === "active" && s.meetingx && s.sub_status === "active" && s.lim >= 999, s);
  check("purchase: MeetingX room opens (101)", (await meetingxUpgrade()) === 101);
  const me = await api("/api/auth/me");
  check("purchase: /api/auth/me reports the plan", me.status === 200 && me.data?.entitlements?.plan === "standalone" && me.data?.entitlements?.products?.includes("meetingx"), me.data?.entitlements);

  // 2. Stripe delivers the same event again.
  const again = await sendEvent(bought.event);
  const s2 = await state();
  check("redelivery: delivered, applied once (one session, same row)", again.status === 200 && s2.sessions === 1 && s2.tier === "standalone" && s2.dedupe_rows === 2, { status: again.status, ...s2 });

  // 3. Renewal payment fails.
  await stripeEvent("customer.subscription.updated", subscriptionObject("past_due"), t0 + 10);
  s = await state();
  check("payment failing: past_due, MeetingX withdrawn, guest floor kept", s.status === "past_due" && !s.meetingx && s.sub_status === "past_due", s);
  check("payment failing: MeetingX room refused (402)", (await meetingxUpgrade()) === 402);
  const me2 = await api("/api/auth/me");
  check("payment failing: /api/auth/me says so", me2.data?.entitlements?.payment_failing === true && !me2.data?.entitlements?.products?.includes("meetingx"), me2.data?.entitlements);

  // 4. Card fixed, Stripe's retry succeeds.
  await stripeEvent("customer.subscription.updated", subscriptionObject("active"), t0 + 20);
  s = await state();
  check("recovered: active with MeetingX again", s.status === "active" && s.meetingx && s.tier === "standalone", s);
  check("recovered: MeetingX room opens (101)", (await meetingxUpgrade()) === 101);

  // 5. A renewal is paid: a new usage period.
  await d1("UPDATE users SET submittals_used = 5 WHERE id = " + q(userId));
  const renewal = await stripeEvent("invoice.paid", invoiceObject("paid", "subscription_cycle"), t0 + 30);
  s = await state();
  check("renewal: delivered; usage counter back to 0, still active", renewal.data?.forwarded?.forwarded === true && s.used === 0 && s.status === "active" && s.meetingx, s);

  // 6. invoice.payment_failed on its own.
  await stripeEvent("invoice.payment_failed", invoiceObject("open", "subscription_cycle"), t0 + 40);
  s = await state();
  check("invoice.payment_failed: past_due, MeetingX withdrawn", s.status === "past_due" && !s.meetingx, s);

  // 7. Cancelled.
  await stripeEvent("customer.subscription.deleted", subscriptionObject("canceled"), t0 + 50);
  s = await state();
  check("cancelled: free plan, active, guest floor only, subscription canceled", s.tier === "free" && s.status === "active" && !s.meetingx && s.sub_status === "canceled", s);
  check("cancelled: MeetingX room refused (402)", (await meetingxUpgrade()) === 402);
  const me3 = await api("/api/auth/me");
  const guest = ["subx", "takeoffx", "cutsheetx", "sightx", "huntx", "propx"];
  check("cancelled: /api/auth/me lists the guest products only", me3.status === 200 && guest.every((g) => me3.data?.entitlements?.products?.includes(g)) && !me3.data?.entitlements?.products?.includes("meetingx"), me3.data?.entitlements);

  // 8. A late event from before the cancellation.
  await stripeEvent("customer.subscription.updated", subscriptionObject("active"), t0 + 45);
  s = await state();
  check("late older event: changes nothing", s.tier === "free" && !s.meetingx && s.sub_status === "canceled", s);
}

try {
  await main();
} catch (e) {
  check("run completed", false, { error: e.message });
} finally {
  try {
    await d1("DELETE FROM weyland_sessions WHERE user_id = " + q(userId));
    await d1("DELETE FROM weyland_subscriptions WHERE subscription_id = " + q(sub) + " OR user_id = " + q(userId));
    // Since 2026-10-07 every completed checkout is recorded in weyland_purchases too.
    await d1("DELETE FROM weyland_purchases WHERE checkout_session_id = " + q(checkoutId) + " OR user_id = " + q(userId));
    await d1("DELETE FROM processed_webhook_events WHERE event_id LIKE " + q("evt_usersim" + id + "%") + " OR event_id = " + q("checkout:" + checkoutId));
    await d1("DELETE FROM users WHERE id = " + q(userId));
    const env = { ...process.env };
    delete env.CF_API_KEY;
    await execFileP("npx", ["wrangler", "kv", "key", "delete", "--namespace-id", CACHE_NAMESPACE, "--remote", "checkout_status:" + checkoutId], { cwd: WORKER_DIR, env }).catch((e) => console.error("kv delete:", e.message.split("\n")[0]));
    const left = (await d1("SELECT (SELECT COUNT(*) FROM users WHERE id = " + q(userId) + ") AS users, (SELECT COUNT(*) FROM weyland_sessions WHERE user_id = " + q(userId) + ") AS sessions, (SELECT COUNT(*) FROM weyland_subscriptions WHERE subscription_id = " + q(sub) + ") AS subscriptions, (SELECT COUNT(*) FROM weyland_purchases WHERE checkout_session_id = " + q(checkoutId) + ") AS purchases, (SELECT COUNT(*) FROM processed_webhook_events WHERE event_id LIKE " + q("evt_usersim" + id + "%") + " OR event_id = " + q("checkout:" + checkoutId) + ") AS dedupe")).results[0];
    check("cleanup: no rows left", left.users === 0 && left.sessions === 0 && left.subscriptions === 0 && left.purchases === 0 && left.dedupe === 0, left);
  } catch (e) {
    check("cleanup", false, { error: e.message });
  }
  report.finished_at = new Date().toISOString();
  report.passed = report.checks.filter((c) => c.ok).length;
  report.total = report.checks.length;
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed === report.total ? 0 : 1;
}
