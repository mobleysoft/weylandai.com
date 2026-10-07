// weyland-platform-worker/tools/trial-journey.mjs
//
// Live check for the free-trial entitlements (journey free-trial-first-use):
// a brand-new START MY FREE 14-DAY TRIAL account must be able to do at least
// what a guest can, get the whole suite until trial_ends_at, and fall back to
// the free plan (guest products) when the trial ends.
//
//   node weyland-platform-worker/tools/trial-journey.mjs
//
// Creates a throwaway AuthFor identity user-sim-trial-<id>@weylandai.com
// (password generated per run, never printed; AuthFor identities cannot be
// deleted from here), signs it up through POST /api/auth/authfor-exchange
// exactly as the shell's START MY FREE 14-DAY TRIAL button does, calls the
// product APIs a trial user reaches from the homepage, then moves
// trial_ends_at into the past and checks again. The users / weyland_sessions /
// nodes rows are deleted in finally. Prints a JSON report.

import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import https from "node:https";

const execFileP = promisify(execFile);
const BASE = process.env.WEYLAND_BASE_URL || "https://weylandai.com";
const WORKER_DIR = new URL("../", import.meta.url).pathname;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 WeylandAI-user-sim";
const id = Date.now().toString(36) + randomBytes(3).toString("hex");
const email = "user-sim-trial-" + id + "@weylandai.com";
const password = "Us!" + randomBytes(12).toString("base64url");
const report = { started_at: new Date().toISOString(), base: BASE, email, checks: [] };

function check(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail });
  console.error((ok ? "PASS " : "FAIL ") + name + (detail !== undefined ? "  " + JSON.stringify(detail).slice(0, 300) : ""));
}

async function d1(sql) {
  const env = { ...process.env };
  delete env.CF_API_KEY;
  const { stdout } = await execFileP("npx", ["wrangler", "d1", "execute", "weyland_db", "--remote", "--json", "--command", sql], { cwd: WORKER_DIR, env, maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(stdout)[0];
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

let token = null;
let cookie = null;
async function api(path, { method = "GET", body } = {}) {
  const headers = { "User-Agent": UA, "Accept": "application/json" };
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = "Bearer " + token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text, headers: r.headers };
}

// MeetingX gates the room WebSocket upgrade with requireProductAccess("meetingx").
function wsUpgradeStatus(path) {
  return new Promise((resolve) => {
    const u = new URL(BASE + path);
    const req = https.request({
      host: u.host, path: u.pathname + u.search, method: "GET",
      headers: {
        "User-Agent": UA, Connection: "Upgrade", Upgrade: "websocket",
        "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
        Cookie: cookie || "", Authorization: token ? "Bearer " + token : ""
      }
    });
    const done = (v) => { try { req.destroy(); } catch {} resolve(v); };
    req.on("upgrade", (res, socket) => { socket.destroy(); done(res.statusCode); });
    req.on("response", (res) => { res.resume(); done(res.statusCode); });
    req.on("error", (e) => done("error:" + e.message));
    req.setTimeout(15000, () => done("timeout"));
    req.end();
  });
}

async function productChecks(phase, expectMeeting) {
  const lines = "LCN 4040XP\nVon Duprin 99\nSchlage L9080";
  const batch = await api("/api/cut-sheets/match-batch", { method: "POST", body: { text: lines } });
  const matched = Array.isArray(batch.data?.results) ? batch.data.results.filter((r) => r && (r.matched || r.cutSheet)).length : null;
  check(phase + ": paste (POST /api/cut-sheets/match-batch) is not refused", batch.status === 200, { status: batch.status, matched, error: batch.data?.error });
  const one = await api("/api/cut-sheets/match", { method: "POST", body: { manufacturer: "LCN", model: "4040XP" } });
  check(phase + ": CutsheetX match (POST /api/cut-sheets/match)", one.status === 200, { status: one.status, error: one.data?.error });
  const prop = await api("/api/proposals/demo", { method: "POST", body: {} });
  check(phase + ": PropX GENERATE (POST /api/proposals/demo)", prop.status === 200, { status: prop.status, error: prop.data?.error });
  const hunt = await api("/api/hunt/opportunities?limit=5");
  check(phase + ": HuntX (GET /api/hunt/opportunities)", hunt.status === 200, { status: hunt.status, error: hunt.data?.error });
  const ws = await wsUpgradeStatus("/api/sight/room/usersim-trial-" + id);
  check(phase + ": MeetingX room upgrade " + (expectMeeting ? "allowed (suite)" : "refused (not a guest product)"), expectMeeting ? ws === 101 : ws === 402, { status: ws });
}

let userId = null;
try {
  const reg = await fetch("https://authfor.com/api/v1/register", { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA }, body: JSON.stringify({ email, password, name: "User Simulation (trial journey)" }) });
  const regData = await reg.json().catch(() => ({}));
  if (!reg.ok || !regData.token) throw new Error("AuthFor register failed: " + reg.status + " " + JSON.stringify(regData).slice(0, 160));
  token = regData.token;

  // START MY FREE 14-DAY TRIAL
  const ex = await api("/api/auth/authfor-exchange", { method: "POST", body: { authfor_token: token } });
  const setCookie = ex.headers.get("set-cookie") || "";
  const m = setCookie.match(/weyland_session=([^;]+)/);
  cookie = m ? "weyland_session=" + m[1] : null;
  userId = ex.data?.user?.id || null;
  check("authfor-exchange creates the trial and signs in", ex.status === 200 && !!cookie && !!userId, { status: ex.status, tier: ex.data?.user?.subscriptionTier, status_field: ex.data?.user?.subscriptionStatus });

  const row = (await d1("SELECT subscription_tier, subscription_status, products_enabled, submittals_limit, trial_ends_at FROM users WHERE id = " + q(userId))).results[0];
  const products = String(row?.products_enabled || "").split(",");
  check("trial row carries the whole suite + trial mark", row && row.subscription_status === "trial" && ["cutsheetx", "subx", "propx", "huntx", "meetingx", "trial-suite"].every((p) => products.includes(p)), { tier: row?.subscription_tier, status: row?.subscription_status, products: products.length, limit: row?.submittals_limit, trial_ends_at: row?.trial_ends_at });

  const me = await api("/api/auth/me");
  check("/api/auth/me reports the trial", me.status === 200 && me.data?.entitlements?.plan === "trial" && me.data?.entitlements?.trial?.active === true, { status: me.status, entitlements: me.data?.entitlements && { plan: me.data.entitlements.plan, trial: me.data.entitlements.trial, products: me.data.entitlements.products.length } });

  await productChecks("trial", true);

  // The trial ends.
  await d1("UPDATE users SET trial_ends_at = " + q(new Date(Date.now() - 60000).toISOString()) + " WHERE id = " + q(userId));
  const me2 = await api("/api/auth/me");
  const row2 = (await d1("SELECT subscription_tier, subscription_status, products_enabled FROM users WHERE id = " + q(userId))).results[0];
  check("an ended trial becomes the free plan (not trial_expired)", me2.status === 200 && row2?.subscription_tier === "free" && row2?.subscription_status === "active" && me2.data?.entitlements?.plan === "free", { status: me2.status, tier: row2?.subscription_tier, st: row2?.subscription_status, products: row2?.products_enabled });

  await productChecks("after trial", false);
} catch (e) {
  check("journey ran to the end", false, { error: e.message });
} finally {
  const cleanup = {};
  try {
    if (userId) {
      await d1("DELETE FROM weyland_sessions WHERE user_id = " + q(userId));
      await d1("DELETE FROM nodes WHERE email = " + q(email));
      await d1("DELETE FROM users WHERE id = " + q(userId));
    }
    const left = (await d1("SELECT (SELECT COUNT(*) FROM users WHERE email = " + q(email) + ") AS users, (SELECT COUNT(*) FROM weyland_sessions WHERE email = " + q(email) + ") AS sessions")).results[0];
    cleanup.rows_left = left;
  } catch (e) {
    cleanup.error = e.message;
  }
  report.cleanup = cleanup;
  report.finished_at = new Date().toISOString();
  report.passed = report.checks.filter((c) => c.ok).length;
  report.failed = report.checks.filter((c) => !c.ok).length;
  console.log(JSON.stringify(report, null, 2));
}
