// tools/user-simulation/signin-journey.mjs
//
// Repeatable sign-in journey for weylandai.com, run against REAL production.
// It creates a real throwaway AuthFor identity (password generated per run, never printed) and a
// matching weylandai.com account row, drives a real browser through sign-in, checks every
// observable consequence, then deletes the account rows. Same "user-sim-" naming as the rest of
// this harness, so a row stranded by a crashed run is easy to find.
//
// What "signed in" must mean, every time:
//   1. Sign-in happens inside the homepage (no navigation away and back: no postback).
//   2. The page then shows the signed-in state, names the account, and keeps it across a reload.
//   3. The server agrees: weyland_session cookie valid, /api/auth/me returns this email.
//   4. The SubX app recognises the same user without asking again.
//   5. Signing out also happens in place and really ends both sessions.
//   6. /login is a view of the same page: it signs in in place and continues to its target.
//
// Usage: node tools/user-simulation/signin-journey.mjs   (exit 0 = every check passed)
//   WEYLAND_BASE_URL overrides https://weylandai.com; PLAYWRIGHT_CORE points at playwright-core
//   if it is not installed next to this repo.
// Browser: Chromium with --use-angle=metal (real GPU WebGL). With software WebGL (SwiftShader) the
// homepage's 3D backdrop starves the browser and sign-in stalls for 18-39 s, so the first check is
// "browser has GPU WebGL" and the run stops there when it fails, instead of flaking.
// The signed-in homepage clones the demo project "The WeylandAI Building" for the test user; those
// clones are captured from POST /api/demo/weyland-building/session and deleted with the rows.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { d1Query } from "./lib/throwaway-account.mjs";
import { chromium, LAUNCH_ARGS, gpuRenderer, purgeTestData } from "./lib/journey-kit.mjs";

const BASE = (process.env.WEYLAND_BASE_URL || "https://weylandai.com").replace(/\/$/, "");
const HERE = fileURLToPath(new URL(".", import.meta.url));

const suffix = Date.now().toString(36) + randomBytes(3).toString("hex");
const email = "user-sim-signin-" + suffix + "@weylandai.com";
const password = "Us!" + randomBytes(12).toString("base64url");
const userId = "usersim_signin_" + suffix;
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail).slice(0, 300) }); return !!ok; }

async function registerAuthFor() {
  const r = await fetch("https://authfor.com/api/v1/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name: "User Simulation (sign-in journey)" }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.token) throw new Error("AuthFor register failed: " + r.status + " " + JSON.stringify(d).slice(0, 200));
}

async function createWeylandAccount() {
  const sql = "INSERT INTO users (id, email, name, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled) VALUES ('" + userId + "','" + email + "','User Simulation Harness (signin-journey)','ven_weyland','subconp','active',0,999,'subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx');";
  const r = await d1Query(sql);
  if (!r.success) throw new Error("users insert failed");
}

// Demo clones the homepage creates for this run (session_id -> project_id), deleted in cleanup().
const clones = new Map();
const pendingClones = new Set();
const inflightClones = new Set();
const isClone = (req) => req.method() === "POST" && /\/api\/demo\/weyland-building\/session\/?$/.test(new URL(req.url()).pathname);
function watchClones(context) {
  context.on("request", (req) => { if (isClone(req)) inflightClones.add(req); });
  context.on("requestfinished", (req) => inflightClones.delete(req));
  context.on("requestfailed", (req) => inflightClones.delete(req));
  context.on("response", (r) => {
    if (!isClone(r.request()) || r.status() >= 300) return;
    const p = r.json().then((j) => { if (j && j.session_id) clones.set(j.session_id, j.project_id || null); }).catch(() => {});
    pendingClones.add(p); p.finally(() => pendingClones.delete(p));
  });
}
// Before a reload or closing a context: let clone requests in flight answer, so their ids are read
// (a dropped request can still create the clone on the server).
async function settleClones() {
  const end = Date.now() + 20000;
  while (inflightClones.size && Date.now() < end) await new Promise((r) => setTimeout(r, 250));
  if (pendingClones.size) await Promise.race([Promise.allSettled([...pendingClones]), new Promise((r) => setTimeout(r, 4000))]);
}

async function cleanup() {
  try {
    const res = await purgeTestData({ userIds: [userId], emails: [email], cloneSessions: [...clones.entries()].map(([s, p]) => ({ session_id: s, project_id: p })) });
    return { ok: res.ok, detail: "clones=" + clones.size + " rows=" + res.deletedTotal + " remaining=" + JSON.stringify(res.remaining) };
  } catch (e) {
    return { ok: false, detail: "error: " + e.message };
  }
}

async function serverView(context) {
  const cookies = await context.cookies(BASE);
  const sess = cookies.find((c) => c.name === "weyland_session");
  const page = await context.newPage();
  await page.goto(BASE + "/api/auth/session/check");
  const check1 = await page.evaluate(() => document.body.innerText);
  await page.close();
  let valid = false;
  try { valid = JSON.parse(check1).valid === true; } catch (e) { valid = false; }
  return { cookie: !!sess, valid };
}

let browser;
const startedAt = new Date().toISOString();
try {
  browser = await chromium.launch({ args: LAUNCH_ARGS });
  const gpu = await gpuRenderer(browser);
  const gpuOk = !!(gpu && gpu.renderer) && !/swiftshader/i.test(gpu.renderer);
  check("browser has GPU WebGL", gpuOk, (gpu && (gpu.renderer || gpu.error)) || "no WebGL context");
  if (!gpuOk) throw new Error("stopped: no GPU WebGL in this browser; software WebGL starves the homepage backdrop and the journey would flake. Run on a Mac with a GPU (Chromium --use-angle=metal).");
  await registerAuthFor();
  await createWeylandAccount();

  // ---- Journey A: sign in on the homepage, in place ----
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  watchClones(ctx);
  const page = await ctx.newPage();
  let navigations = 0;
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigations += 1; });
  await page.goto(BASE + "/?signin-journey=" + suffix, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const navAfterLoad = navigations;
  // "No postback" means the document is never replaced: a mark set now must survive every step.
  const markDoc = () => page.evaluate(() => (window.__waDocMark = "doc-" + Math.random().toString(36).slice(2)));
  let docMark = await markDoc();
  const sameDoc = async () => (await page.evaluate(() => window.__waDocMark).catch(() => null)) === docMark;

  // The homepage's own Sign In buttons sit on the 3D dossier and can be tiny or covered; the
  // shell's account control is the one entry point that is always visible and clickable.
  const chip = page.locator("#wa-account-chip");
  check("account control is visible", await chip.isVisible().catch(() => false));
  const ctaOpens = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll(".js-upgrade-cta")).find((x) => /sign in/i.test(x.textContent));
    if (!el) return "no sign-in button found";
    el.click();
    const ok = !!document.querySelector("#wa-overlay.is-open #weyland-signin-email");
    if (window.WeylandShell) window.WeylandShell.close();
    return ok ? "overlay" : "no overlay";
  });
  check("homepage Sign In buttons open the sign-in overlay", ctaOpens === "overlay", ctaOpens);
  await chip.click();
  await page.waitForTimeout(400);
  const formShown = await page.locator("#weyland-signin-email").isVisible().catch(() => false);
  check("sign-in form opens inside the page (no navigation)", formShown && await sameDoc(), "url=" + page.url());
  if (formShown) {
    await page.fill("#weyland-signin-email", email);
    if (await page.locator("#weyland-signin-use-password").isVisible()) await page.locator("#weyland-signin-use-password").click();
    await page.fill("#weyland-signin-password", password);
    const before = await page.evaluate(() => ({ e: document.getElementById("weyland-signin-email").value.length, p: document.getElementById("weyland-signin-password").value.length }));
    check("homepage form holds both values right before submit", before.e > 0 && before.p > 0, JSON.stringify(before));
    await page.click("#weyland-signin-submit");
    await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in", null, { timeout: 45000 }).catch(() => {});
  }
  const st = await page.evaluate(() => ({ auth: document.documentElement.dataset.weylandAuth || "", user: document.documentElement.dataset.weylandUser || "", label: (document.querySelector(".wn-signin") || {}).textContent || "" }));
  check("no postback during sign-in", await sameDoc(), "document replaced=" + !(await sameDoc()));
  check("page shows the signed-in state", st.auth === "signed-in", JSON.stringify(st));
  check("page names the signed-in account", st.user.toLowerCase() === email, st.user);
  const sv = await serverView(ctx);
  check("server session cookie set and valid", sv.cookie && sv.valid, JSON.stringify(sv));
  const me = await page.evaluate(async () => { const t = localStorage.getItem("_authfor_token"); const r = await fetch("/api/auth/me", { headers: t ? { Authorization: "Bearer " + t } : {} }); return { status: r.status, email: ((await r.json().catch(() => ({}))).user || {}).email || null }; });
  check("/api/auth/me returns this account", me.status === 200 && String(me.email).toLowerCase() === email, JSON.stringify(me));

  const markBeforeReload = await sameDoc();
  check("still the same document after sign-in", markBeforeReload);
  await settleClones();
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.weylandAuth === "signed-in", null, { timeout: 15000 }).catch(() => {});
  check("signed-in state survives a reload", await page.evaluate(() => document.documentElement.dataset.weylandAuth) === "signed-in");
  docMark = await markDoc(); // the reload replaced the document on purpose; mark the new one

  await page.evaluate(() => window.WeylandShell.open("app", { path: "/subx-app" }));
  const frame = page.frameLocator("#wa-overlay iframe");
  await page.waitForTimeout(3000);
  const inOverlay = await page.evaluate(() => { const f = document.querySelector("#wa-overlay iframe"); try { return { path: f.contentWindow.location.pathname, token: !!f.contentWindow.localStorage.getItem("_authfor_token") }; } catch (e) { return { error: String(e) }; } });
  check("SubX opens inside the overlay, signed in, without leaving the page", inOverlay.path === "/subx-app" && inOverlay.token && await sameDoc(), JSON.stringify(inOverlay));
  await page.evaluate(() => window.WeylandShell.close());
  const app = await ctx.newPage();
  await app.goto(BASE + "/subx-app", { waitUntil: "load" });
  await app.waitForTimeout(2500);
  const appState = await app.evaluate(() => ({ url: location.pathname, token: !!localStorage.getItem("_authfor_token"), text: document.body.innerText.slice(0, 4000) }));
  check("SubX visited directly also recognises the user", appState.url === "/subx-app" && appState.token && !/CHECKING IDENTITY|SIGN IN OR CREATE AN ACCOUNT/i.test(appState.text), "path=" + appState.url);
  await app.close();

  const outMark = await page.evaluate(() => (window.__waOutMark = "out-" + Math.random().toString(36).slice(2)));
  const signedOut = await page.evaluate(async () => { if (!window.WeylandSignIn) return false; await window.WeylandSignIn.signOut(); return document.documentElement.dataset.weylandAuth; });
  const outSame = (await page.evaluate(() => window.__waOutMark).catch(() => null)) === outMark;
  check("sign-out happens in place", signedOut === "signed-out" && outSame, "state=" + signedOut + " sameDocument=" + outSame);
  const sv2 = await serverView(ctx);
  check("sign-out ends the server session", !sv2.valid, JSON.stringify(sv2));
  check("sign-out clears the AuthFor token", !(await page.evaluate(() => localStorage.getItem("_authfor_token"))));
  await settleClones();
  await ctx.close();

  // ---- Journey B: the /login deep link used by product pages ----
  const ctx2 = await browser.newContext();
  watchClones(ctx2);
  const p2 = await ctx2.newPage();
  const apiLog = [];
  p2.on("response", async (r) => {
    const u = r.url();
    if (!/\/api\/auth\/|authfor\.com\/api\/v1\//.test(u)) return;
    let extra = "";
    if (r.status() >= 400) {
      const body = await r.text().catch(() => "");
      let sent = {};
      try { sent = JSON.parse(r.request().postData() || "{}"); } catch (e) { sent = {}; }
      extra = " body=" + body.slice(0, 120) + " sent_email=" + (sent.email ? "yes" : "no") + " sent_password=" + (sent.password ? "yes(" + String(sent.password).length + ")" : "no");
    }
    apiLog.push(r.request().method() + " " + u.replace(/^https:\/\/[^/]+/, "") + " " + r.status() + extra);
  });
  let renders = 0;
  await p2.exposeFunction("__waRender", () => { renders += 1; });
  await p2.addInitScript(() => { new MutationObserver(() => { const f = document.getElementById("weyland-signin-email"); if (f && !f.__seen) { f.__seen = true; window.__waRender && window.__waRender(); } }).observe(document, { childList: true, subtree: true }); });
  await p2.goto(BASE + "/login?redirect=/subx-app", { waitUntil: "load" });
  await p2.waitForSelector("#weyland-signin-email", { timeout: 15000 }).catch(() => {});
  check("/login opens the same in-page sign-in (no separate page)", await p2.locator("#weyland-signin-email").isVisible().catch(() => false));
  await p2.fill("#weyland-signin-email", email);
  if (await p2.locator("#weyland-signin-use-password").isVisible()) await p2.locator("#weyland-signin-use-password").click();
  await p2.fill("#weyland-signin-password", password);
  const before = await p2.evaluate(() => ({ e: document.getElementById("weyland-signin-email").value.length, p: document.getElementById("weyland-signin-password").value.length }));
  check("/login form holds both values right before submit", before.e > 0 && before.p > 0, JSON.stringify(before));
  await p2.click("#weyland-signin-submit");
  // Wait for the sign-in to finish or fail for real. The shell shows "This is taking longer than it
  // should. You can wait, or close and try again." after 25 s while the attempt is still running;
  // that notice is progress, not an outcome, so it does not end the wait.
  await p2.waitForFunction(() => {
    if (document.documentElement.dataset.weylandAuth === "signed-in") return true;
    const err = document.querySelector("#wa-overlay .wa-error");
    const t = err && err.offsetParent !== null && err.style.display !== "none" ? err.textContent.trim() : "";
    return !!t && !/taking longer than it should/i.test(t);
  }, null, { timeout: 90000 }).catch(() => {});
  // After sign-in the shell continues to the redirect target in the overlay. The address is the
  // homepage carrying the open app as its fragment (/#/subx-app, so a reload comes back to it inside
  // the shell); the app's own /subx-app would load the standalone page on a reload.
  await p2.waitForFunction(() => location.pathname === "/" && /^#\/subx-app([?#]|$)/.test(location.hash) && window.WeylandShell && window.WeylandShell.state().view === "app", null, { timeout: 10000 }).catch(() => {});
  await p2.waitForTimeout(1500);
  const b = await p2.evaluate(() => ({ path: location.pathname, hash: location.hash, view: window.WeylandShell ? window.WeylandShell.state().view : null,
    error: ((document.querySelector("#wa-overlay .wa-error") || {}).textContent || "").trim(), auth: document.documentElement.dataset.weylandAuth }));
  check("/login continues to its target inside the overlay", b.path === "/" && /^#\/subx-app([?#]|$)/.test(b.hash) && b.view === "app", JSON.stringify(b) + " sign-in form renders=" + renders + " api=" + apiLog.join(" | "));
  const sv3 = await serverView(ctx2);
  check("/login sign-in also creates the server session", sv3.cookie && sv3.valid, JSON.stringify(sv3));
  await settleClones();
  await ctx2.close();
} catch (e) {
  check("journey ran to completion", false, e.message);
} finally {
  await settleClones();
  if (browser) await browser.close().catch(() => {});
  const cleaned = await cleanup();
  check("test account rows and demo clones deleted", cleaned.ok, cleaned.detail);
}

const failed = checks.filter((c) => !c.ok);
const report = { journey: "signin", base: BASE, started_at: startedAt, finished_at: new Date().toISOString(), passed: checks.length - failed.length, failed: failed.length, checks };
await mkdir(path.join(HERE, "reports"), { recursive: true });
const stamp = startedAt.replace(/[:.]/g, "-");
await writeFile(path.join(HERE, "reports", "signin-journey-" + stamp + ".json"), JSON.stringify(report, null, 2));
await writeFile(path.join(HERE, "reports", "signin-journey-latest.json"), JSON.stringify(report, null, 2));
for (const c of checks) console.log((c.ok ? "PASS " : "FAIL ") + c.name + (c.ok || !c.detail ? "" : "  [" + c.detail + "]"));
console.log(report.passed + " passed, " + report.failed + " failed");
process.exit(failed.length ? 1 : 0);
