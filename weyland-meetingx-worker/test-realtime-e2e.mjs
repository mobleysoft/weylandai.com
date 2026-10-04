#!/usr/bin/env node
// weyland-meetingx-worker/test-realtime-e2e.mjs
//
// Real end-to-end test of MeetingX's real-time room path against PRODUCTION:
//
//   1. Sign in as a real (dedicated, durable) test identity at AuthFor
//      (POST https://authfor.com/api/v1/login; first run registers it via
//      POST /api/v1/register - no mailbox is needed, AuthFor doesn't verify
//      email on register).
//   2. Exchange that AuthFor token for a real weylandai.com session cookie
//      (POST https://weylandai.com/api/auth/session -> weyland_session=...,
//      served by weyland-platform-worker). On the very first run the local
//      `users` row doesn't exist yet, so this falls back to the real signup
//      path (POST /api/auth/authfor-exchange, which auto-provisions a
//      starter/trial row) and retries.
//   3. Pick a fresh room id (same shape meetingx.html generates) and open
//      TWO WebSocket clients, each carrying the real session cookie, to
//      wss://weylandai.com/api/sight/room/<roomId> (served by
//      weyland-meetingx-worker -> SIGHTX_ROOM Durable Object `SightXRoom`,
//      cross-script binding into weylandai-com-worker).
//   4. Assert: both get a `roster`; A sees B's `join`; a `chat` sent by A is
//      received by B (real relay through the DO, not a loopback echo).
//   5. Print PASS/FAIL with the raw frames.
//
// Ephemeral/guest tokens are deliberately NOT accepted for meetingx
// (EPHEMERAL_TRIAL_PRODUCTS in src/lib/auth.js excludes it), so this test
// needs a real signed-in account that is entitled to meetingx. The test
// identity is:
//
//   email:    meetingx-e2e@weylandai.com   (override: MEETINGX_E2E_EMAIL)
//   password: Keychain item WEYLAND_MEETINGX_E2E_PASSWORD, read through
//             estate/bin/secretctl.py's own Keychain class (never the bare
//             `security` CLI, never printed). Override: MEETINGX_E2E_PASSWORD.
//
// One-time entitlement (admin step, NOT done by this script - it has no DB
// access on purpose): the auto-provisioned row is starter/trial with no
// products, so the WebSocket upgrade returns 402 PRODUCT_NOT_ENABLED until
// the test user is granted meetingx, mirroring the existing internal_test
// convention already used by `mobley-virtualuser-test@example.com`:
//
//   npx wrangler d1 execute weyland_db --remote --command \
//     "UPDATE users SET subscription_tier='internal_test', subscription_status='active', \
//      products_enabled='meetingx' WHERE email='meetingx-e2e@weylandai.com'"
//
// Run:  node test-realtime-e2e.mjs            (from weyland-meetingx-worker/)
// Env:  MEETINGX_E2E_ORIGIN (default https://weylandai.com) to point at the
//       standalone *.workers.dev deployment instead; WS_MODULE to point at a
//       specific `ws` package directory.
//
// Exit code 0 on PASS, 1 on FAIL. Never prints tokens, cookies or passwords.

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const ORIGIN = process.env.MEETINGX_E2E_ORIGIN || "https://weylandai.com";
const AUTHFOR = "https://authfor.com";
const EMAIL = process.env.MEETINGX_E2E_EMAIL || "meetingx-e2e@weylandai.com";
const NAME = "MeetingX E2E";
const TIMEOUT_MS = 15000;

// ── ws package resolution (Node's built-in WebSocket can't send a Cookie header) ──
function loadWs() {
  const candidates = [
    process.env.WS_MODULE,
    "/Users/johnmobley/book2film.cc/node_modules/ws",
    "/Users/johnmobley/conseiv.com/node_modules/ws",
    "/Users/johnmobley/glcx-worker/node_modules/ws",
  ].filter(Boolean);
  const require = createRequire(import.meta.url);
  try { return require("ws"); } catch {}
  for (const c of candidates) {
    if (existsSync(c)) {
      try { return createRequire(c + "/package.json")(c); } catch (e) { /* try next */ }
    }
  }
  throw new Error("could not load the `ws` package; set WS_MODULE=/path/to/node_modules/ws");
}
const WebSocket = loadWs();

// ── secret: read ONE Keychain item via secretctl's own Keychain class ──
function readPassword() {
  if (process.env.MEETINGX_E2E_PASSWORD) return process.env.MEETINGX_E2E_PASSWORD;
  const py = [
    "import sys; sys.path.insert(0, '/Users/johnmobley/estate/bin')",
    "import secretctl; from pathlib import Path",
    "p = secretctl.load_policy(Path('/Users/johnmobley/estate/secret-policy.json'))",
    "v = secretctl.Keychain().get(p.service('WEYLAND_MEETINGX_E2E_PASSWORD'), p.account)",
    "sys.stdout.write(v or '')",
  ].join("\n");
  const out = execFileSync("python3", ["-c", py], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (!out) throw new Error("WEYLAND_MEETINGX_E2E_PASSWORD not found in Keychain (and MEETINGX_E2E_PASSWORD not set)");
  return out;
}

async function postJson(url, body, headers = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text, headers: r.headers };
}

const redact = (obj) => JSON.stringify(obj, (k, v) =>
  (/token|password|session_id|cookie/i.test(k) && typeof v === "string") ? `<redacted len=${v.length}>` : v);

// ── 1. AuthFor sign-in (register on first run) ──
async function authforLogin(password) {
  let r = await postJson(`${AUTHFOR}/api/v1/login`, { email: EMAIL, password });
  console.log(`[authfor] POST /api/v1/login -> ${r.status} ${redact(r.json)}`);
  if (r.status === 401 && r.json?.code === "INVALID_CREDENTIALS") {
    const reg = await postJson(`${AUTHFOR}/api/v1/register`, { email: EMAIL, password, name: NAME });
    console.log(`[authfor] POST /api/v1/register -> ${reg.status} ${redact(reg.json)}`);
    if (reg.status === 200 && reg.json?.token) return reg.json.token;
    throw new Error(`AuthFor login failed and register did not succeed (${reg.status})`);
  }
  if (r.status === 200 && r.json?.token) return r.json.token;
  throw new Error(`AuthFor login failed: ${r.status} ${r.text.slice(0, 200)}`);
}

// ── 2. weylandai.com session cookie ──
async function weylandSession(authforToken) {
  let r = await postJson(`${ORIGIN}/api/auth/session`, { token: authforToken });
  console.log(`[weyland] POST /api/auth/session -> ${r.status} ${redact(r.json)}`);
  if (r.status === 404 && r.json?.error === "no_weyland_account") {
    const ex = await postJson(`${ORIGIN}/api/auth/authfor-exchange`, { authfor_token: authforToken });
    console.log(`[weyland] POST /api/auth/authfor-exchange (provision users row) -> ${ex.status} ${redact(ex.json)}`);
    if (ex.status !== 200) throw new Error(`authfor-exchange failed: ${ex.status} ${ex.text.slice(0, 200)}`);
    r = await postJson(`${ORIGIN}/api/auth/session`, { token: authforToken });
    console.log(`[weyland] POST /api/auth/session (retry) -> ${r.status} ${redact(r.json)}`);
  }
  if (r.status !== 200) throw new Error(`session creation failed: ${r.status} ${r.text.slice(0, 200)}`);
  const setCookie = r.headers.get("set-cookie") || "";
  const m = setCookie.match(/weyland_session=([^;]+)/);
  if (!m) throw new Error("no weyland_session cookie in Set-Cookie");
  const check = await fetch(`${ORIGIN}/api/auth/session/check`, { headers: { Cookie: `weyland_session=${m[1]}` } });
  const cj = await check.json().catch(() => null);
  console.log(`[weyland] GET /api/auth/session/check -> ${check.status} ${JSON.stringify(cj)}`);
  if (!cj?.valid) throw new Error("session cookie did not validate");
  return `weyland_session=${m[1]}`;
}

// ── 3/4. two WebSocket clients to the same room ──
function openClient(label, roomId, cookie) {
  const url = `${ORIGIN.replace(/^http/, "ws")}/api/sight/room/${encodeURIComponent(roomId)}`;
  const frames = [];
  const ws = new WebSocket(url, { headers: { Cookie: cookie } });
  const waiters = [];
  const flush = () => { for (const w of waiters.slice()) if (w.pred()) { waiters.splice(waiters.indexOf(w), 1); w.resolve(); } };
  ws.on("message", (data) => {
    const text = data.toString();
    frames.push(text);
    console.log(`[${label}] <- ${text}`);
    flush();
  });
  ws.on("unexpected-response", (_req, res) => {
    let body = "";
    res.on("data", (c) => (body += c));
    res.on("end", () => {
      console.log(`[${label}] upgrade rejected: HTTP ${res.statusCode} ${body.slice(0, 300)}`);
      ws.emit("error", new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
    });
  });
  const opened = new Promise((resolve, reject) => {
    ws.once("open", () => { console.log(`[${label}] open ${url}`); resolve(); });
    ws.once("error", reject);
    setTimeout(() => reject(new Error(`[${label}] open timeout`)), TIMEOUT_MS);
  });
  const waitFor = (pred, what) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[${label}] timed out waiting for ${what}; frames so far: ${JSON.stringify(frames)}`)), TIMEOUT_MS);
    const p = () => frames.some((f) => { try { return pred(JSON.parse(f)); } catch { return false; } });
    const w = { pred: p, resolve: () => { clearTimeout(t); resolve(); } };
    waiters.push(w);
    flush();
  });
  return { ws, frames, opened, waitFor, label };
}

async function main() {
  const t0 = Date.now();
  console.log(`MeetingX real-time e2e against ${ORIGIN} as ${EMAIL}`);
  const password = readPassword();
  const authforToken = await authforLogin(password);
  const cookie = await weylandSession(authforToken);

  const roomId = randomUUID().replace(/-/g, "").slice(0, 10);
  console.log(`[room] id=${roomId} (fresh; created implicitly by the first idFromName()+upgrade, same as the page)`);

  const A = openClient("A", roomId, cookie);
  await A.opened;
  await A.waitFor((m) => m.type === "roster" && m.users.length === 1, "A roster with 1 participant");
  const rosterA = JSON.parse(A.frames.find((f) => JSON.parse(f).type === "roster"));

  const B = openClient("B", roomId, cookie);
  await B.opened;
  await B.waitFor((m) => m.type === "roster" && m.users.length === 2, "B roster with 2 participants");
  await A.waitFor((m) => m.type === "join", "A to see B join");

  const marker = `e2e-${roomId}-${Date.now()}`;
  const outbound = JSON.stringify({ type: "chat", text: marker });
  console.log(`[A] -> ${outbound}`);
  A.ws.send(outbound);
  await B.waitFor((m) => m.type === "chat" && m.text === marker, "B to receive A's chat");
  const chatB = JSON.parse(B.frames.find((f) => { const m = JSON.parse(f); return m.type === "chat" && m.text === marker; }));

  // Assertions
  const checks = [
    ["A got roster with itself", rosterA.you && rosterA.users.some((u) => u.userId === rosterA.you)],
    ["B got 2-participant roster", B.frames.some((f) => { const m = JSON.parse(f); return m.type === "roster" && m.users.length === 2; })],
    ["A saw B join", A.frames.some((f) => JSON.parse(f).type === "join")],
    ["B received A's chat (relay, not echo)", chatB && chatB.user?.userId === rosterA.you && chatB.text === marker],
    ["chat sender is the signed-in test identity", chatB && (chatB.user?.name === NAME || chatB.user?.name === EMAIL)],
  ];

  // Leave: close A, B should see `leave`.
  A.ws.close(1000, "done");
  await B.waitFor((m) => m.type === "leave" && m.userId === rosterA.you, "B to see A leave");
  checks.push(["B saw A leave", true]);
  B.ws.close(1000, "done");

  let ok = true;
  console.log("\nAssertions:");
  for (const [name, pass] of checks) { console.log(`  ${pass ? "ok  " : "FAIL"} ${name}`); if (!pass) ok = false; }
  console.log(`\n${ok ? "PASS" : "FAIL"}: MeetingX real-time room path (${ORIGIN}, room ${roomId}, ${Date.now() - t0}ms)`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(`\nFAIL: ${e.message}`);
  process.exit(1);
});
