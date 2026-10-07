// weyland-platform-worker/tools/offer-journey.mjs
//
// Live check of the $100 first-submittal offer through the production chain,
// without a payment and without creating anything in Stripe (2026-10-07):
//
//   Stripe-signed checkout.session.completed (payment mode, weyland-first-submittal)
//   -> https://vendyai.com/api/stripe/webhook (checks Stripe's signature, forwards weylandai's events)
//   -> https://weylandai.com/api/webhooks/subscription (weyland-platform-worker)
//   -> weyland_db users / weyland_purchases -> the access block and MeetingX's own product gate.
//
//   node weyland-platform-worker/tools/offer-journey.mjs
//
// Needs STRIPE_WEBHOOK_SECRET in the environment (the signing secret of the Stripe endpoint
// https://vendyai.com/api/stripe/webhook); used to sign, never printed. Two throwaway accounts
// user-sim-offer-<id>-a/b@weylandai.com are made in D1 (no AuthFor identity). The events describe
// made-up checkout sessions / customers / payment intents (..._usersim...). amount_total is null, so
// vendyai posts no settlement entry; vendyai's fee lookup asks Stripe for the made-up session and
// gets a 404 (a read). Every row this run makes (users, weyland_sessions, weyland_purchases,
// processed_webhook_events) and the KV checkout statuses are deleted in finally. Prints a JSON report.
//
// A. A signed-in account buys the offer: granted (30 days, credit 1), the browser signed in, the
//    access block (/api/auth/me, /api/subscription/status, /api/billing/plan), MeetingX opens; the
//    same event again changes nothing; day 23 prompts; day 30 ends it (MeetingX refused, the free
//    tools stay, the account kept); a second offer for the account is refused (409).
// B. A signed-out purchase with an existing account's email: held (nothing granted, the paying
//    browser gets the claim cookie); that account claims it from the paying browser: granted.

import { createHmac, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";

const execFileP = promisify(execFile);
const VENDYAI = process.env.VENDYAI_WEBHOOK_URL || "https://vendyai.com/api/stripe/webhook";
const BASE = process.env.WEYLAND_BASE_URL || "https://weylandai.com";
const WORKER_DIR = new URL("../", import.meta.url).pathname;
const CACHE_NAMESPACE = "80a77dcf4f5f4e8588c172f2ecef95fb";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 WeylandAI-user-sim";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const DAY = 86400e3;
const id = Date.now().toString(36) + randomBytes(3).toString("hex");
const A = { id: "usersim-offer-" + id + "-a", email: "user-sim-offer-" + id + "-a@weylandai.com" };
const B = { id: "usersim-offer-" + id + "-b", email: "user-sim-offer-" + id + "-b@weylandai.com" };
const csA = "cs_live_usersim" + id + "a" + randomBytes(6).toString("hex");
const csB = "cs_live_usersim" + id + "b" + randomBytes(6).toString("hex");
const eventIds = [];
const report = { started_at: new Date().toISOString(), vendyai: VENDYAI, base: BASE, accounts: [A.email, B.email], checks: [] };

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

async function stripeEvent(type, object) {
  const evtId = "evt_usersim" + id + "_" + eventIds.length;
  eventIds.push(evtId);
  return sendEvent({ id: evtId, object: "event", api_version: "2024-11-20.acacia", type, created: Math.floor(Date.now() / 1000), livemode: true, data: { object } });
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

async function api(path, { cookie = null, method = "GET", body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "User-Agent": UA, Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, headers: r.headers };
}

function meetingxUpgrade(cookie, room) {
  return new Promise((resolve) => {
    const u = new URL(BASE + "/api/sight/room/" + room);
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

async function account(acct) {
  await d1("INSERT INTO users (id, email, name, subscription_tier, subscription_status, products_enabled, submittals_limit) VALUES (" +
    [acct.id, acct.email, "User Sim Offer"].map(q).join(", ") + ", 'free', 'active', 'subx,takeoffx,cutsheetx,sightx,huntx,propx', 999)");
  const sid = "usersim-offer-sess-" + randomBytes(12).toString("hex");
  await d1("INSERT INTO weyland_sessions (id, user_id, email, player_json, expires_at) VALUES (" +
    [sid, acct.id, acct.email, "{}", new Date(Date.now() + DAY).toISOString()].map(q).join(", ") + ")");
  acct.cookie = "weyland_session=" + sid;
}

async function row(acct) {
  const r = await d1("SELECT subscription_tier AS tier, subscription_status AS status, products_enabled AS products, trial_ends_at, stripe_customer_id AS customer, email FROM users WHERE id = " + q(acct.id));
  const x = r.results[0] || {};
  x.trial_mark = String(x.products || "").split(",").includes("trial-suite");
  x.meetingx = String(x.products || "").split(",").includes("meetingx");
  delete x.products;
  return x;
}
async function purchase(cs) {
  return (await d1("SELECT status, kind, user_id, credits_total, credits_used, terms_url, terms_accepted_at, access_ends_at, claim_method FROM weyland_purchases WHERE checkout_session_id = " + q(cs))).results[0] || null;
}

const offerSession = (cs, { email, userId = null, customer }) => ({
  id: cs, object: "checkout.session", mode: "payment", status: "complete", payment_status: "paid", livemode: true,
  customer, subscription: null, payment_intent: "pi_usersim" + id + cs.slice(-4), client_reference_id: userId, customer_email: userId ? email : null,
  customer_details: { email, name: "User Sim Offer" }, amount_total: null, currency: "usd",
  metadata: { venture_id: "weylandai", product_id: "weyland-first-submittal", seats: "1", ui: "embedded", start_path: "/",
    terms_url: "https://consenta.cc/policy/weylandai.com/terms", terms_accepted_at: new Date().toISOString() }
});

async function main() {
  if (!SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set (the vendyai Stripe endpoint's signing secret)");
  await account(A);
  await account(B);

  // ── A: the signed-in account buys the offer ──
  const t0 = Date.now();
  const bought = await stripeEvent("checkout.session.completed", offerSession(csA, { email: A.email, userId: A.id, customer: "cus_usersim" + id + "a" }));
  check("A: vendyai accepts the Stripe-signed payment event and delivers it to weylandai", bought.status === 200 && bought.data?.forwarded?.forwarded === true, { status: bought.status, forwarded: bought.data?.forwarded, ledger: bought.data?.mobcoin_ledger });
  const poll = await api("/api/billing/checkout/status/" + csA);
  const m = (poll.headers.get("set-cookie") || "").match(/weyland_session=([^;]+)/);
  check("A: the status poll says active, signed in, with the access end", poll.data?.status === "active" && poll.data?.signed_in === true && !!m && Math.abs(Date.parse(poll.data?.access_ends_at) - (t0 + 30 * DAY)) < 5 * 60e3, poll.data);
  if (m) A.cookie = "weyland_session=" + m[1];
  let r = await row(A);
  check("A: 30 days of every product (trial window, status trial), customer kept", r.status === "trial" && r.trial_mark && Math.abs(Date.parse(r.trial_ends_at) - (t0 + 30 * DAY)) < 5 * 60e3 && r.customer === "cus_usersim" + id + "a", r);
  let p = await purchase(csA);
  check("A: the purchase is recorded: offer, granted, credit 1, Terms stored", p && p.status === "granted" && p.kind === "offer" && p.user_id === A.id && p.credits_total === 1 && p.credits_used === 0 && !!p.terms_url && !!p.terms_accepted_at, p);
  const me = await api("/api/auth/me", { cookie: A.cookie });
  const acc = me.data?.entitlements?.access || {};
  check("A: /api/auth/me access: offer, 30 days left, no prompt yet, credit 1", acc.kind === "offer" && acc.days_left === 30 && acc.prompt_for_plan === false && acc.first_submittal?.credit?.remaining === 1, acc);
  const st = await api("/api/subscription/status", { cookie: A.cookie });
  check("A: /api/subscription/status reports the same access", st.status === 200 && st.data?.access?.kind === "offer" && st.data?.access?.ends_at === acc.ends_at, st.data?.access);
  const plan = await api("/api/billing/plan", { cookie: A.cookie });
  check("A: /api/billing/plan answers with the access and the plans to choose (SubConP first)", plan.status === 200 && plan.data?.access?.kind === "offer" && plan.data?.choices?.[0]?.product_id === "weyland-subconp-seat" && plan.data?.plan?.name, { status: plan.status, plan: plan.data?.plan, first: plan.data?.choices?.[0], stripe_unavailable: plan.data?.stripe_unavailable });
  check("A: MeetingX room opens (101) on the offer", (await meetingxUpgrade(A.cookie, "usersim-offer-" + id)) === 101);

  const again = await sendEvent(bought.event);
  const r2 = await row(A);
  const purchases = (await d1("SELECT COUNT(*) AS n FROM weyland_purchases WHERE user_id = " + q(A.id))).results[0].n;
  check("A: the same event again is applied once (30 days not moved, one purchase)", again.status === 200 && r2.trial_ends_at === r.trial_ends_at && purchases === 1, { status: again.status, purchases });

  const second = await api("/api/billing/checkout/embedded", { cookie: A.cookie, method: "POST", body: { product_id: "weyland-first-submittal", terms_accepted: true } });
  check("A: a second offer for the account is refused (409 offer_used; no Stripe session made)", second.status === 409 && second.data?.detail?.code === "offer_used", second.data);

  // Day 23: 8 days left.
  const day23 = new Date(Date.now() + 8 * DAY - 60e3).toISOString();
  await d1("UPDATE users SET trial_ends_at = " + q(day23) + " WHERE id = " + q(A.id));
  await d1("UPDATE weyland_purchases SET access_ends_at = " + q(day23) + " WHERE checkout_session_id = " + q(csA));
  const me23 = await api("/api/auth/me", { cookie: A.cookie });
  check("A: day 23 (8 days left): prompt_for_plan", me23.data?.entitlements?.access?.prompt_for_plan === true && me23.data?.entitlements?.access?.days_left === 8, me23.data?.entitlements?.access);

  // Day 30: the end.
  const ended = new Date(Date.now() - 60e3).toISOString();
  await d1("UPDATE users SET trial_ends_at = " + q(ended) + " WHERE id = " + q(A.id));
  await d1("UPDATE weyland_purchases SET access_ends_at = " + q(ended) + " WHERE checkout_session_id = " + q(csA));
  check("A: day 30: MeetingX refuses the room by itself (402)", (await meetingxUpgrade(A.cookie, "usersim-offer-" + id + "-end")) === 402);
  const me30 = await api("/api/auth/me", { cookie: A.cookie });
  const a30 = me30.data?.entitlements?.access || {};
  const guest = ["subx", "takeoffx", "cutsheetx", "sightx", "huntx", "propx"];
  r = await row(A);
  check("A: day 30: free tools, account and email kept, the offer reported as ended", r.tier === "free" && r.status === "active" && !r.trial_mark && r.email === A.email && a30.kind === "none" && a30.ended?.kind === "offer" && guest.every((g) => me30.data?.entitlements?.products?.includes(g)) && !me30.data?.entitlements?.products?.includes("meetingx"), { row: r, access: a30 });

  // ── B: a signed-out purchase with an existing account's email ──
  const held = await stripeEvent("checkout.session.completed", offerSession(csB, { email: B.email, customer: "cus_usersim" + id + "b" }));
  check("B: vendyai delivers it", held.status === 200 && held.data?.forwarded?.forwarded === true, { status: held.status, forwarded: held.data?.forwarded });
  const hp = await api("/api/billing/checkout/status/" + csB);
  const claim = (hp.headers.get("set-cookie") || "").match(/weyland_claim=([^;]+)/);
  check("B: held - nothing granted on the email; the paying browser gets the claim, no session", hp.data?.status === "held" && hp.data?.signed_in === false && /\*\*\*@weylandai\.com$/.test(hp.data?.email_hint || "") && !!claim && !/weyland_session=/.test(hp.headers.get("set-cookie") || ""), { body: hp.data, claim: !!claim });
  p = await purchase(csB);
  r = await row(B);
  check("B: the account is untouched while held", p?.status === "held" && !p.user_id && r.status === "active" && !r.trial_mark, { purchase: p, row: r });
  check("B: MeetingX refuses B while held (402)", (await meetingxUpgrade(B.cookie, "usersim-offer-" + id + "-b")) === 402);
  const meB = await api("/api/auth/me", { cookie: B.cookie });
  check("B: B's account view can say a purchase is waiting", meB.data?.entitlements?.access?.held_purchases === 1, meB.data?.entitlements?.access);
  const claimed = await api("/api/billing/claims", { cookie: B.cookie + "; weyland_claim=" + claim?.[1], method: "POST", body: {} });
  check("B: that account claims it from the paying browser: granted", claimed.status === 200 && claimed.data?.claimed?.[0]?.session_id === csB, claimed.data);
  p = await purchase(csB);
  check("B: purchase granted to B by the paying browser, 30 days from the claim", p?.status === "granted" && p.user_id === B.id && p.claim_method === "same_browser" && Math.abs(Date.parse(p.access_ends_at) - (Date.now() + 30 * DAY)) < 5 * 60e3, p);
  check("B: MeetingX opens for B (101)", (await meetingxUpgrade(B.cookie, "usersim-offer-" + id + "-b2")) === 101);
  const after = await api("/api/billing/checkout/status/" + csB);
  check("B: the status poll now says active", after.data?.status === "active", after.data);
}

try {
  await main();
} catch (e) {
  check("run completed", false, { error: e.message });
} finally {
  try {
    const ids = [A.id, B.id].map(q).join(", ");
    await d1("DELETE FROM weyland_sessions WHERE user_id IN (" + ids + ")");
    await d1("DELETE FROM weyland_purchases WHERE checkout_session_id IN (" + [csA, csB].map(q).join(", ") + ") OR user_id IN (" + ids + ")");
    await d1("DELETE FROM processed_webhook_events WHERE event_id LIKE " + q("evt_usersim" + id + "%") + " OR event_id IN (" + ["checkout:" + csA, "checkout:" + csB].map(q).join(", ") + ")");
    await d1("DELETE FROM users WHERE id IN (" + ids + ")");
    const env = { ...process.env };
    delete env.CF_API_KEY;
    for (const cs of [csA, csB]) {
      await execFileP("npx", ["wrangler", "kv", "key", "delete", "--namespace-id", CACHE_NAMESPACE, "--remote", "checkout_status:" + cs], { cwd: WORKER_DIR, env }).catch((e) => console.error("kv delete:", e.message.split("\n")[0]));
    }
    const left = (await d1("SELECT (SELECT COUNT(*) FROM users WHERE id IN (" + ids + ")) AS users, (SELECT COUNT(*) FROM weyland_sessions WHERE user_id IN (" + ids + ")) AS sessions, (SELECT COUNT(*) FROM weyland_purchases WHERE checkout_session_id IN (" + [csA, csB].map(q).join(", ") + ")) AS purchases, (SELECT COUNT(*) FROM processed_webhook_events WHERE event_id LIKE " + q("evt_usersim" + id + "%") + " OR event_id IN (" + ["checkout:" + csA, "checkout:" + csB].map(q).join(", ") + ")) AS dedupe")).results[0];
    check("cleanup: no rows left", left.users === 0 && left.sessions === 0 && left.purchases === 0 && left.dedupe === 0, left);
  } catch (e) {
    check("cleanup", false, { error: e.message });
  }
  report.finished_at = new Date().toISOString();
  report.passed = report.checks.filter((c) => c.ok).length;
  report.total = report.checks.length;
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed === report.total ? 0 : 1;
}
