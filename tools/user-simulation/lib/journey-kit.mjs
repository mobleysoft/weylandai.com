// tools/user-simulation/lib/journey-kit.mjs
//
// Shared harness for the journey tests in ../journeys/<id>.mjs: one test per journey in
// /Users/johnmobley/plan/evidence/weylandai_journey_map_20261007.json, with the conventions of
// ../signin-journey.mjs. Everything runs against REAL production in a real browser:
//   - Chromium is launched with --use-angle=metal (real GPU WebGL). Software WebGL (SwiftShader)
//     freezes the homepage's 3D backdrop for 18-39 s and makes journeys flaky, so the first check
//     of every journey is "browser has GPU WebGL", and a journey stops right there when it fails
//     instead of producing a flaky result.
//   - Throwaway identities: user-sim-<label>-<run>@weylandai.com and usersim_<label>_<run>; the
//     password is generated per run and never printed (it is scrubbed from every report detail).
//   - Everything a run creates is deleted in finally: users / weyland_sessions / nodes rows, the
//     "The WeylandAI Building" demo clones the homepage creates (session_id / project_id captured
//     from POST /api/demo/weyland-building/session, plus any clone owned by the test user), SubX
//     uploads (D1 rows by session_id, the R2 object and the KV copy), proposals and submittals.
//     The AuthFor identity itself cannot be deleted from here; every report says so.
//   - Exit code 0 only if every check passed; JSON report at ../reports/journey-<id>-latest.json
//     (plus a timestamped copy).
//   - A journey that should stay in place sets a mark on window at the start and checks at the end
//     that the same document is still there (no page hop) and the URL never left weylandai.com.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const playwright = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");
export const chromium = playwright.chromium || (playwright.default && playwright.default.chromium);

export const BASE = (process.env.WEYLAND_BASE_URL || "https://weylandai.com").replace(/\/$/, "");
export const SITE_HOST = new URL(BASE).host;
export const LAUNCH_ARGS = ["--use-angle=metal"];
const HARNESS_DIR = fileURLToPath(new URL("../", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const REPORTS_DIR = path.join(HARNESS_DIR, "reports");
// Lines the catalogue knows, so a run records no misses.
export const SAMPLE_LINES = ["LCN 4040XP", "Von Duprin 99", "Schlage L9080"];
export const SAMPLE_PDF = "/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf";
export const ALL_PRODUCTS = "subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx";
export const DESKTOP = { viewport: { width: 1280, height: 860 } };
export const PHONE = {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
};
export const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The homepage clones the demo project "The WeylandAI Building" for a visitor with this request.
const CLONE_PATH = /^\/api\/demo\/weyland-building\/session\/?$/;
const pathOf = (u) => { try { return new URL(u).pathname; } catch (e) { return ""; } };

const UPLOADS_BUCKET = "subx-uploads";
const OUTPUTS_BUCKET = "subx-outputs";
const CACHE_KV_NAMESPACE = "80a77dcf4f5f4e8588c172f2ecef95fb"; // CACHE (weyland-subx-worker/wrangler.toml)
const DEMO_SEED_PROJECT = "eabd5ff6-e19f-4e6b-acfc-9a250445dfa8"; // src/routes/demo-trial.js: never deleted

// ---------------------------------------------------------------- D1 / R2 / KV (wrangler)
async function wrangler(args) {
  return execFileP("npx", ["wrangler", ...args], { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });
}

/** Runs one or more SQL statements in production D1 (weyland_db); returns one result per statement. */
export async function d1(statements) {
  const sql = Array.isArray(statements) ? statements.join("\n") : statements;
  const { stdout } = await wrangler(["d1", "execute", "weyland_db", "--remote", "--json", "--command", sql]);
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed : [parsed];
}
export const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const inList = (xs) => "(" + (xs.length ? xs.map(q).join(",") : "NULL") + ")";

function columnsOf(sql) {
  if (!sql) return [];
  const open = sql.indexOf("("), close = sql.lastIndexOf(")");
  const body = open >= 0 && close > open ? sql.slice(open + 1, close) : sql;
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  const out = [];
  for (const p of parts) {
    const m = p.trim().match(/^["[]?([A-Za-z_][A-Za-z0-9_]*)/);
    if (m && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(m[1])) out.push(m[1]);
  }
  return out;
}
let schemaCache = null;
async function schema() {
  if (schemaCache) return schemaCache;
  const [r] = await d1("SELECT name, sql FROM sqlite_master WHERE type='table';");
  const map = {};
  for (const row of r.results || []) if (!/^(sqlite_|_cf_|d1_)/.test(row.name)) map[row.name] = columnsOf(row.sql);
  schemaCache = map;
  return map;
}
const tablesWith = (s, col, except = []) => Object.keys(s).filter((t) => s[t].includes(col) && !except.includes(t)).sort();
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
const isTestEmail = (e) => /^user-sim-[a-z0-9-]+@weylandai\.com$/i.test(String(e || ""));

/**
 * Deletes everything a test run created, and only that. Rows are tied to the run by the
 * throwaway user ids (usersim_*), the run-unique user-sim-* emails (a users row found by such an
 * email is this run's whatever its id, e.g. the UUID authfor-exchange assigns), and the demo-clone
 * / upload session ids this run's own browser received. A captured clone session is deleted only
 * if its row says it is a demo clone (file_buffer_key = demo-clone/<id>) or belongs to a test user.
 */
export async function purgeTestData({ userIds = [], emails = [], cloneSessions = [], uploadSessions = [], packageSessions = [] } = {}) {
  const out = { ok: false, deleted: {}, deletedTotal: 0, r2: [], kv: [], skipped: [], remaining: null };
  const E = [...new Set(emails.filter(isTestEmail).map((e) => e.toLowerCase()))];
  let U = [...new Set(userIds.filter((u) => /^usersim_[A-Za-z0-9_]+$/.test(String(u || ""))))];
  const clones = cloneSessions.filter((c) => c && isUuid(c.session_id));
  const cloneIds = new Set(clones.map((c) => c.session_id));
  const uploadIds = new Set(uploadSessions.filter(isUuid));
  if (!E.length && !U.length && !clones.length && !uploadIds.size) { out.ok = true; out.nothing = true; return out; }

  const [byEmail] = await d1("SELECT id FROM users WHERE lower(email) IN " + inList(E) + ";");
  for (const r of byEmail.results || []) if (/^[A-Za-z0-9_.:-]{6,80}$/.test(String(r.id || ""))) U.push(r.id);
  U = [...new Set(U)];

  const [sess, projs, subs, props] = await d1([
    "SELECT id, user_id, project_id, file_buffer_key FROM hardware_extraction_sessions WHERE user_id IN " + inList(U) + " OR id IN " + inList([...cloneIds, ...uploadIds]) + ";",
    "SELECT id, created_by FROM projects WHERE created_by IN " + inList(U) + ";",
    "SELECT id, input_file_key, output_file_key, file_buffer_key FROM submittals WHERE user_id IN " + inList(U) + ";",
    "SELECT id, r2_key FROM proposals WHERE user_id IN " + inList(U) + ";"
  ]);
  const S = [], P = new Set(), R2 = [], KV = [];
  const ownedKey = (k) => typeof k === "string" && U.some((u) => k.includes(u));
  for (const r of sess.results || []) {
    const ours = U.includes(r.user_id) || (cloneIds.has(r.id) && r.file_buffer_key === "demo-clone/" + r.id);
    if (!ours) { out.skipped.push("session " + r.id + " (not provably this run's)"); continue; }
    S.push(r.id);
    if (r.project_id) P.add(r.project_id);
    if (/^hardware-sessions\//.test(r.file_buffer_key || "") && ownedKey(r.file_buffer_key)) { R2.push([UPLOADS_BUCKET, r.file_buffer_key]); KV.push(r.file_buffer_key); }
  }
  for (const c of clones) if (S.includes(c.session_id) && isUuid(c.project_id)) P.add(c.project_id);
  // A submittal package the SubX workspace built for one of these sessions (lib/submittal-assembler.js).
  for (const sid of packageSessions) if (isUuid(sid) && S.includes(sid)) R2.push([UPLOADS_BUCKET, "submittals/" + sid + "/final_submittal.pdf"]);
  for (const r of projs.results || []) P.add(r.id);
  P.delete(DEMO_SEED_PROJECT);
  const SUB = (subs.results || []).map((r) => r.id);
  for (const r of subs.results || []) {
    for (const k of [r.input_file_key, r.file_buffer_key]) if (k && (ownedKey(k) || SUB.some((s) => k.includes(s)))) R2.push([UPLOADS_BUCKET, k]);
    if (r.output_file_key && (ownedKey(r.output_file_key) || SUB.some((s) => r.output_file_key.includes(s)))) { R2.push([OUTPUTS_BUCKET, r.output_file_key]); R2.push([UPLOADS_BUCKET, r.output_file_key]); }
  }
  for (const r of props.results || []) if (/^proposals\//.test(r.r2_key || "")) R2.push([UPLOADS_BUCKET, r.r2_key]);

  const s = await schema();
  const childOfSets = tablesWith(s, "hardware_set_id", ["door_schedule_entries", "hardware_door_matrix"]);
  const stmts = [];
  if (S.length) {
    for (const t of childOfSets) stmts.push("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE session_id IN " + inList(S) + ");");
    for (const t of tablesWith(s, "session_id")) stmts.push("DELETE FROM " + t + " WHERE session_id IN " + inList(S) + ";");
    stmts.push("DELETE FROM hardware_extraction_sessions WHERE id IN " + inList(S) + ";");
  }
  if (SUB.length) {
    for (const t of childOfSets) stmts.push("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE submittal_id IN " + inList(SUB) + ");");
    for (const t of tablesWith(s, "submittal_id")) stmts.push("DELETE FROM " + t + " WHERE submittal_id IN " + inList(SUB) + ";");
    stmts.push("DELETE FROM submittals WHERE id IN " + inList(SUB) + ";");
  }
  if (P.size) {
    const PL = inList([...P]);
    const unused = " NOT IN (SELECT project_id FROM hardware_extraction_sessions WHERE project_id IS NOT NULL)";
    for (const t of tablesWith(s, "project_id", ["hardware_extraction_sessions"])) stmts.push("DELETE FROM " + t + " WHERE project_id IN " + PL + " AND project_id" + unused + ";");
    stmts.push("DELETE FROM projects WHERE id IN " + PL + " AND id" + unused + ";");
  }
  if (U.length) {
    for (const t of childOfSets) stmts.push("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE user_id IN " + inList(U) + ");");
    for (const t of tablesWith(s, "user_id", ["users"])) stmts.push("DELETE FROM " + t + " WHERE user_id IN " + inList(U) + ";");
  }
  if (E.length) for (const t of tablesWith(s, "email", ["users"])) stmts.push("DELETE FROM " + t + " WHERE lower(email) IN " + inList(E) + ";");
  if (U.length || E.length) stmts.push("DELETE FROM users WHERE id IN " + inList(U) + " OR lower(email) IN " + inList(E) + ";");

  for (let i = 0; i < stmts.length; i += 40) {
    const chunk = stmts.slice(i, i + 40);
    const res = await d1(chunk);
    res.forEach((r, j) => {
      const n = (r.meta && r.meta.changes) || 0;
      if (!n) return;
      const t = chunk[j].match(/^DELETE FROM (\S+)/)[1];
      out.deleted[t] = (out.deleted[t] || 0) + n;
      out.deletedTotal += n;
    });
  }
  for (const [bucket, key] of R2) {
    try { await wrangler(["r2", "object", "delete", bucket + "/" + key, "--remote"]); out.r2.push(bucket + ": deleted"); }
    catch (e) { out.r2.push(bucket + ": error " + String(e.message).slice(0, 80)); }
  }
  for (const key of KV) {
    try { await wrangler(["kv", "key", "delete", key, "--namespace-id", CACHE_KV_NAMESPACE, "--remote"]); out.kv.push("deleted"); }
    catch (e) { out.kv.push("error " + String(e.message).slice(0, 80)); }
  }
  const [u1, w1, h1, p1] = await d1([
    "SELECT COUNT(*) AS n FROM users WHERE id IN " + inList(U) + " OR lower(email) IN " + inList(E) + ";",
    "SELECT COUNT(*) AS n FROM weyland_sessions WHERE user_id IN " + inList(U) + " OR lower(email) IN " + inList(E) + ";",
    "SELECT COUNT(*) AS n FROM hardware_extraction_sessions WHERE id IN " + inList(S) + " OR user_id IN " + inList(U) + ";",
    "SELECT COUNT(*) AS n FROM projects WHERE id IN " + inList([...P]) + " OR created_by IN " + inList(U) + ";"
  ]);
  const n = (r) => ((r.results || [])[0] || {}).n || 0;
  out.remaining = { users: n(u1), weyland_sessions: n(w1), extraction_sessions: n(h1), projects: n(p1) };
  out.sessions = S.length; out.projects = P.size; out.submittals = SUB.length;
  out.ok = Object.values(out.remaining).every((x) => x === 0) && !out.r2.some((x) => /error/.test(x)) && !out.kv.some((x) => /error/.test(x));
  return out;
}

// ---------------------------------------------------------------- browser
export async function gpuRenderer(browser) {
  const page = await browser.newPage();
  try {
    await page.setContent("<canvas id='c' width='8' height='8'></canvas>");
    return await page.evaluate(() => {
      const c = document.getElementById("c");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return { webgl: false };
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return { webgl: true,
        renderer: String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)),
        vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)) };
    });
  } catch (e) {
    return { webgl: false, error: String((e && e.message) || e).slice(0, 200) };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Real pointer press on what a visitor sees: centre the control, make sure nothing covers it, then
 *  click (or tap) there. Falls back to a DOM click and says so when the control is covered. */
export async function press(page, target, { touch = false } = {}) {
  const loc = typeof target === "string" ? page.locator(target).first() : target;
  await loc.waitFor({ state: "attached", timeout: 10000 });
  await loc.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" })).catch(() => {});
  await sleep(350);
  const at = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, w: r.width, hit: !!top && (top === el || el.contains(top)), inView: x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight };
  });
  if (at.hit && at.inView && at.w > 0) {
    if (touch) await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
    return "pointer";
  }
  await loc.evaluate((el) => el.click());
  return "dom";
}

/** Press inside a frame (the overlay's app): Playwright's own actionable click, DOM click if that fails. */
export async function pressIn(frame, selectorOrLocator) {
  const loc = typeof selectorOrLocator === "string" ? frame.locator(selectorOrLocator).first() : selectorOrLocator;
  try { await loc.click({ timeout: 8000 }); return "pointer"; }
  catch (e) { await loc.evaluate((el) => el.click()); return "dom"; }
}

/** Polls innerText of selector until it matches re (and not the optional loading pattern). */
export async function waitText(target, selector, re, ms = 30000, loading = null) {
  const end = Date.now() + ms;
  let t = null;
  while (Date.now() < end) {
    t = await target.evaluate((s) => { const el = document.querySelector(s); return el ? el.innerText.trim() : null; }, selector).catch(() => null);
    if (t != null && re.test(t) && !(loading && loading.test(t))) return t;
    await sleep(400);
  }
  return t;
}

export async function until(fn, ms = 20000, step = 400) {
  const end = Date.now() + ms;
  let v;
  while (Date.now() < end) {
    v = await fn().catch(() => null);
    if (v) return v;
    await sleep(step);
  }
  return v;
}

export async function openHome(page, journey, tag = "") {
  await page.goto(BASE + "/?journey=" + journey.id + (tag ? "-" + tag : "") + "-" + journey.suffix, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => !!window.WeylandShell && !!document.getElementById("wa-account-chip"), null, { timeout: 20000 }).catch(() => {});
  await sleep(600);
}

/** Desktop starts with the dossier lowered over the 3D corridor; Enter raises it (phones start raised). */
export async function raiseDossier(page, { touch = false } = {}) {
  const lowered = () => page.evaluate(() => document.documentElement.classList.contains("folder-lowered"));
  if (!(await lowered())) return "raised";
  if (touch) await press(page, "#envelope-raise", { touch: true }).catch(() => {});
  else await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.documentElement.classList.contains("folder-lowered"), null, { timeout: 6000 }).catch(() => {});
  if (await lowered()) { await page.evaluate(() => { const b = document.getElementById("envelope-raise"); if (b) b.click(); }); await sleep(900); }
  return (await lowered()) ? "still lowered" : "raised";
}

export async function setMark(page) {
  return page.evaluate(() => (window.__waJourneyMark = "j-" + Math.random().toString(36).slice(2)));
}
export async function placeState(page, mark) {
  const seen = await page.evaluate(() => window.__waJourneyMark).catch(() => null);
  let host = "";
  try { host = new URL(page.url()).host; } catch (e) { host = ""; }
  return { sameDocument: seen === mark, onSite: host === SITE_HOST, url: page.url().split("#")[0].replace(/cs_(live|test)_[A-Za-z0-9]+/g, "cs_$1_<id>").slice(0, 140) };
}

export async function shellState(page) {
  return page.evaluate(() => {
    const err = document.querySelector("#wa-overlay .wa-error");
    const errShown = !!err && err.offsetParent !== null && err.style.display !== "none";
    return {
      auth: document.documentElement.dataset.weylandAuth || "",
      user: document.documentElement.dataset.weylandUser || "",
      chip: ((document.getElementById("wa-account-chip") || {}).innerText || "").trim(),
      view: window.WeylandShell ? window.WeylandShell.state().view : null,
      overlayOpen: !!document.querySelector("#wa-overlay.is-open"),
      overlayTitle: ((document.querySelector("#wa-overlay.is-open .wa-title") || {}).textContent || "").trim(),
      overlayText: ((document.querySelector("#wa-overlay.is-open .wa-body") || {}).innerText || "").replace(/\s+/g, " ").trim().slice(0, 400),
      error: errShown ? err.textContent.trim() : "",
      path: location.pathname + location.search
    };
  });
}

/**
 * Signs in through the always-visible account control. Waits for signed-in, the no-account view,
 * or a real error. The shell's 25 s "This is taking longer than it should" notice is progress, not
 * an error, so it does not end the wait.
 */
export async function signIn(page, acct, { touch = false, timeout = 75000 } = {}) {
  const t0 = Date.now();
  if (!(await page.locator("#weyland-signin-email").isVisible().catch(() => false))) {
    await press(page, "#wa-account-chip", { touch });
    await page.waitForSelector("#weyland-signin-email", { state: "visible", timeout: 10000 }).catch(() => {});
  }
  await page.fill("#weyland-signin-email", acct.email);
  await page.fill("#weyland-signin-password", acct.password);
  await press(page, "#weyland-signin-submit", { touch });
  await waitSignInOutcome(page, timeout);
  return { ...(await shellState(page)), seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

export async function waitSignInOutcome(page, timeout = 75000) {
  await page.waitForFunction(() => {
    const s = document.documentElement.dataset.weylandAuth;
    if (s === "signed-in" || s === "no-account") return true;
    if (window.WeylandShell && window.WeylandShell.state().view === "no-account") return true;
    const err = document.querySelector("#wa-overlay .wa-error");
    const t = err && err.offsetParent !== null && err.style.display !== "none" ? err.textContent.trim() : "";
    return !!t && !/taking longer than it should/i.test(t);
  }, null, { timeout }).catch(() => {});
}

export async function overlayFrame(page, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const h = await page.$("#wa-overlay.is-open iframe").catch(() => null);
    const f = h ? await h.contentFrame().catch(() => null) : null;
    if (f) {
      await f.waitForLoadState("load", { timeout: Math.max(500, end - Date.now()) }).catch(() => {});
      return f;
    }
    await sleep(250);
  }
  return null;
}

export async function openApp(page, appPath, ms = 25000) {
  await page.evaluate((p) => window.WeylandShell.open("app", { path: p }), appPath);
  return overlayFrame(page, ms);
}

export async function frameInfo(frame) {
  if (!frame) return null;
  const url = frame.url();
  if (/^chrome-error:/.test(url)) return { url, chromeError: true, ids: [], text: "" };
  try {
    return await frame.evaluate(() => {
      const text = document.body ? document.body.innerText : "";
      let jsonError = null;
      try { const t = text.trim(); if (t.charAt(0) === "{") { const j = JSON.parse(t); jsonError = j.error || j.message ? String(j.error || j.message) : null; } } catch (e) { jsonError = null; }
      return { url: location.href, path: location.pathname, search: location.search, title: document.title, text: text.slice(0, 4000),
        ids: Array.from(document.querySelectorAll("[id]")).map((e) => e.id).filter((i) => /^[A-Za-z][\w-]*$/.test(i)),
        jsonError, nestedShell: !!document.getElementById("wa-account-chip") };
    });
  } catch (e) {
    return { url, evalError: String((e && e.message) || e).slice(0, 160), ids: [], text: "" };
  }
}

/**
 * Looks for the payment form after a buy button was pressed. "embedded": a stripe.com frame shown
 * inside the weylandai.com page (top document or the overlay), at least 250x200 px and in view.
 * "top-level": the whole page went to checkout.stripe.com (a page hop). Stops as soon as the
 * product and the price are on screen; never touches the form.
 */
export async function findPaymentForm(page, { product, price }, ms = 45000) {
  const end = Date.now() + ms;
  let last = { where: "none" };
  while (Date.now() < end) {
    let topHost = "";
    try { topHost = new URL(page.url()).host; } catch (e) { topHost = ""; }
    if (/(^|\.)stripe\.com$/.test(topHost)) {
      const text = await page.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
      last = { where: "top-level", host: topHost, product: product.test(text), price: price.test(text), text: text.replace(/\s+/g, " ").slice(0, 300) };
      if (last.product && last.price) return last;
    } else {
      const vp = page.viewportSize() || { width: 1280, height: 860 };
      let visible = false, texts = [], hosts = [];
      for (const f of page.frames()) {
        if (f === page.mainFrame()) continue;
        let host = "";
        try { host = new URL(f.url()).host; } catch (e) { continue; }
        if (!/(^|\.)stripe\.com$/.test(host)) continue;
        hosts.push(host);
        const el = await f.frameElement().catch(() => null);
        const box = el ? await el.boundingBox().catch(() => null) : null;
        if (box && box.width >= 250 && box.height >= 200 && box.y < vp.height && box.y + box.height > 0 && box.x < vp.width && box.x + box.width > 0) visible = true;
        texts.push(await f.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => ""));
      }
      if (hosts.length) {
        const text = texts.join("\n");
        last = { where: "embedded", hosts: [...new Set(hosts)], visible, product: product.test(text), price: price.test(text), text: text.replace(/\s+/g, " ").slice(0, 300) };
        if (visible && last.product && last.price) return last;
      }
    }
    await sleep(1000);
  }
  return last;
}

export async function pasteSchedule(page, lines = SAMPLE_LINES, { touch = false, ms = 45000 } = {}) {
  await page.evaluate(() => { const t = document.getElementById("hs-text"); if (t) t.scrollIntoView({ block: "center" }); });
  await page.fill("#hs-text", lines.join("\n"));
  const t0 = Date.now();
  await press(page, "#hs-run", { touch });
  const text = await waitText(page, "#hs-results", /lines matched|include|failed|error|plan|denied|unauthor/i, ms, /^Matching every line/i);
  const seconds = Math.round((Date.now() - t0) / 100) / 10;
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll("#hs-results tbody tr")).map((tr) => {
    const td = tr.querySelectorAll("td");
    const a = td[3] ? td[3].querySelector("a") : null;
    return { spec: (td[0] || {}).innerText || "", product: (td[1] || {}).innerText || "", confidence: (td[2] || {}).innerText || "", citation: (td[3] || {}).innerText || "", href: a ? a.getAttribute("href") : null };
  })).catch(() => []);
  const m = String(text || "").match(/(\d+)\s+of\s+(\d+)\s+lines matched/i);
  return { first: String(text || "").split("\n")[0].slice(0, 200), seconds, matched: m ? +m[1] : null, total: m ? +m[2] : null, rows };
}

/** In-page document viewers: the shell overlay, or a visible iframe / embed / object showing a PDF or
 *  page render, or a visible canvas inside a pdf / viewer container. */
export async function inPageViewer(page) {
  return page.evaluate(() => {
    const big = (el) => { const r = el.getBoundingClientRect(); return r.width > 200 && r.height > 200 && r.bottom > 0 && r.top < innerHeight; };
    const frames = Array.from(document.querySelectorAll("iframe, embed, object")).filter((el) => big(el) && /^blob:|\/pdf|\/render|\.pdf/i.test(el.getAttribute("src") || el.getAttribute("data") || ""));
    const canvases = Array.from(document.querySelectorAll("[id*=pdf] canvas, [class*=pdf] canvas, [id*=viewer] canvas, [class*=viewer] canvas")).filter(big);
    return { overlayOpen: !!document.querySelector("#wa-overlay.is-open"), viewers: frames.length + canvases.length };
  });
}

/**
 * The shell's in-page document view (WeylandShell.open("pdf")): cited price-book pages, catalogue
 * pages and cut sheets drawn by the self-hosted pdf.js inside the page. Reports the document, the
 * page drawn (data-wa-page), the "Page N of M" label and any status or error text it shows.
 */
export async function pdfView(page) {
  return page.evaluate(() => {
    const w = document.querySelector("#wa-overlay.is-open .wa-pdf");
    if (!w) return { open: false };
    const c = w.querySelector("canvas.wa-pdf-canvas, iframe.wa-pdf-native");
    const r = c ? c.getBoundingClientRect() : null;
    return {
      open: true,
      doc: (w.getAttribute("data-wa-doc") || "").replace(/[?#].*$/, ""),
      page: Number(w.getAttribute("data-wa-page") || 0) || null,
      label: ((w.querySelector(".wa-pdf-page") || {}).textContent || "").trim(),
      status: ((w.querySelector(".wa-pdf-status") || {}).textContent || "").trim().slice(0, 200),
      drawn: !!r && r.width > 100 && r.height > 100,
      native: !!w.querySelector("iframe.wa-pdf-native"),
      title: ((document.querySelector("#wa-overlay .wa-title") || {}).textContent || "").trim().slice(0, 120)
    };
  }).catch(() => ({ open: false }));
}
const PDF_VIEW_FAILED = /could not|needs a session|failed/i;

/** The page a citation link points at ("#page=N"), 1 when it names none (a one-page render). */
export function citedPage(href) {
  const m = /#page=(\d+)/.exec(String(href || ""));
  return m ? Number(m[1]) : 1;
}

/**
 * After pressing a document link: waits for the document request (apiRe) and for it to be shown
 * somewhere (a new tab, a download, the shell's document view or another in-page viewer), then
 * reports where. ok = the request answered 200 or 206 (pdf.js reads big books by range) with a PDF.
 * New tabs are closed.
 */
export async function documentOutcome(journey, page, { since, apiRe, popupsBefore, downloadsBefore }) {
  await until(async () => journey.responses(since, apiRe).length > 0 || page.__popups.length > popupsBefore || (await pdfView(page)).open, 60000, 500);
  await until(async () => {
    if (page.__popups.length > popupsBefore || page.__downloads.length > downloadsBefore) return true;
    const v = await pdfView(page);
    if (v.open) return v.drawn || PDF_VIEW_FAILED.test(v.status || "");
    return (await inPageViewer(page)).viewers > 0;
  }, 60000, 500);
  await sleep(1500);
  const api = journey.responses(since, apiRe).map((e) => e.status + " " + e.ct);
  const tabs = page.__popups.slice(popupsBefore);
  let tabUrl = null, tabText = "";
  if (tabs[0]) {
    await tabs[0].waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    tabUrl = tabs[0].url() || "(about:blank)";
    tabText = await tabs[0].evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
  }
  const viewer = await inPageViewer(page);
  const pdf = await pdfView(page);
  for (const t of tabs) await t.close().catch(() => {});
  const ok = api.some((x) => /^20[06] application\/pdf/.test(x));
  const refused = api.some((x) => /^[45]\d\d/.test(x)) || /authentication required|"error"/i.test(tabText) || (pdf.open && PDF_VIEW_FAILED.test(pdf.status || ""));
  return { ok, refused, api: [...new Set(api)].slice(0, 6), newTab: tabs.length > 0, tabUrl: tabUrl ? tabUrl.slice(0, 90) : null, tabText: tabText.replace(/\s+/g, " ").slice(0, 160),
    downloads: page.__downloads.slice(downloadsBefore).map((n) => String(n).slice(-40)), inPage: viewer, pdf };
}

/**
 * Closes whatever the shell overlay shows, the way a visitor would: "close" (the Close button),
 * "escape", "brand" (the WeylandAI brand) or "back" (browser Back). Returns the state after.
 */
export async function closeOverlay(page, how = "close", { touch = false } = {}) {
  if (how === "escape") await page.keyboard.press("Escape");
  else if (how === "back") await page.goBack({ timeout: 10000 }).catch(() => {});
  else await press(page, how === "brand" ? "#wa-overlay .wa-brand" : "#wa-overlay .wa-close", { touch }).catch(() => {});
  await until(() => page.evaluate(() => !document.querySelector("#wa-overlay.is-open")), 6000, 250);
  return page.evaluate(() => ({ overlayOpen: !!document.querySelector("#wa-overlay.is-open"), url: location.pathname + location.search + location.hash }));
}

export async function serverSession(page) {
  return page.evaluate(async () => {
    const r = await fetch("/api/auth/session/check", { credentials: "same-origin" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    const t = localStorage.getItem("_authfor_token");
    const m = await fetch("/api/auth/me", { headers: t ? { Authorization: "Bearer " + t } : {} }).catch(() => null);
    const md = m ? await m.json().catch(() => ({})) : {};
    return { valid: d.valid === true, me: m ? m.status : 0, email: ((md.user || {}).email || "").toLowerCase(), token: !!t };
  });
}

/** Opens the account card from the account control; returns the overlay state. */
export async function openAccountCard(page, { touch = false } = {}) {
  await press(page, "#wa-account-chip", { touch });
  await page.waitForFunction(() => window.WeylandShell && ["account", "no-account"].includes(window.WeylandShell.state().view), null, { timeout: 10000 }).catch(() => {});
  await sleep(400);
  return shellState(page);
}

/**
 * The SubX workspace (/subx-app, rebuilt 2026-10-07 in 6d31174) as the visitor sees it, in the
 * overlay frame or a page: #app (upload, "Your schedules", one schedule, the submittal package) or
 * #signin-card when it needs a sign-in.
 */
export async function subxWorkspace(target, ms = 20000) {
  await until(() => target.evaluate(() => {
    const shown = (el) => !!el && !el.classList.contains("hide") && el.getBoundingClientRect().height > 0;
    const list = document.getElementById("sessions-list");
    return shown(document.getElementById("signin-card")) || (shown(document.getElementById("app")) && !!list && !/Loading/i.test(list.innerText));
  }), ms, 500);
  return target.evaluate(() => {
    const shown = (el) => !!el && !el.classList.contains("hide") && el.getBoundingClientRect().height > 0;
    return {
      path: location.pathname, search: location.search,
      appVisible: shown(document.getElementById("app")),
      loginVisible: shown(document.getElementById("signin-card")),
      accountToken: !!localStorage.getItem("_authfor_token"),
      sessions: ((document.getElementById("sessions-list") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 300),
      clientExtraction: !!document.getElementById("client-extract-btn")
    };
  }).catch((e) => ({ error: String(e.message || e).slice(0, 120) }));
}

/** The schedule open in the workspace: its door rows (mark + source), takeoff tiles, steps, sets. */
export async function workspaceDetail(target) {
  return target.evaluate(() => {
    const txt = (el) => (el ? el.innerText.replace(/\s+/g, " ").trim() : "");
    const rows = Array.from(document.querySelectorAll("#doors-wrap tbody tr")).map((tr) => {
      const td = tr.querySelectorAll("td");
      return { mark: txt(td[0]), group: txt(td[1]), size: txt(td[2]), source: txt(td[td.length - 1]) };
    });
    const sets = Array.from(document.querySelectorAll("#sets-wrap tbody tr")).map((tr) => {
      const td = tr.querySelectorAll("td");
      return { set: txt(td[0]), name: txt(td[1]), items: txt(td[2]), status: txt(td[3]) };
    });
    const tiles = Array.from(document.querySelectorAll("#takeoff .stat")).map((s) => ({ label: txt(s.querySelector("span")), value: txt(s.querySelector("b")) }));
    const step = (id) => { const el = document.getElementById(id); return el ? (el.classList.contains("done") ? "done" : el.classList.contains("now") ? "now" : "") : null; };
    return {
      title: txt(document.getElementById("sd-title")), sub: txt(document.getElementById("sd-sub")),
      doorNote: txt(document.querySelector("#doors-wrap p")), rows, sets, tiles,
      counts: txt(document.querySelector("#takeoff .counts")).slice(0, 300),
      steps: { upload: step("st-upload"), read: step("st-read"), review: step("st-review"), pdf: step("st-pdf") },
      actions: Array.from(document.querySelectorAll("#list-actions button")).map((b) => txt(b))
    };
  }).catch((e) => ({ error: String(e.message || e).slice(0, 120), rows: [], sets: [], tiles: [] }));
}

/**
 * In the SubX workspace (frame or page): upload a PDF (UPLOAD AND READ PAGE 1 uploads it, opens it
 * and reads page 1 on the server), fall back to READ IT IN THIS BROWSER when the server read found
 * nothing, then read the door rows. Returns what each step showed.
 */
export async function workspaceUploadAndExtract(target, { project, pdf = SAMPLE_PDF, docType = "door_schedule" }) {
  const out = { upload: null, tries: [], doors: 0, rows: [], listed: false };
  await target.fill("#f-project", project);
  await target.selectOption("#f-doctype", docType).catch(() => {});
  await target.setInputFiles("#f-file", pdf);
  out.preview = ((await waitText(target, "#rasterize-status", /preview|failed|error/i, 60000, /^Drawing/i)) || "").slice(0, 160);
  const t0 = Date.now();
  await pressIn(target, "#upload-btn");
  out.upload = ((await waitText(target, "#upload-result", /^Uploaded|failed|error|choose|sign in/i, 120000, /^Uploading/i)) || "").slice(0, 300);
  if (!/^Uploaded/i.test(out.upload)) return out;
  out.listed = !!(await until(() => target.evaluate((p) => Array.from(document.querySelectorAll("#sessions-list tr[data-id]")).some((tr) => tr.innerText.includes(p)), project), 30000, 500));
  // The workspace opens the new schedule and reads page 1 by itself.
  const r1 = (await waitText(target, "#extract-result", /^Page \d+:|could not be read|error|failed/i, 300000, /^Reading page/i)) || "";
  out.tries.push({ route: "server (read on upload)", seconds: Math.round((Date.now() - t0) / 1000), result: r1.slice(0, 240) });
  if (!/^Page \d+: [1-9]\d* (door|hardware set)/i.test(r1) && (await target.locator("#client-extract-btn").count())) {
    const t1 = Date.now();
    await pressIn(target, "#client-extract-btn");
    const r2 = (await waitText(target, "#extract-result", /read in this browser and saved|No .* table was found|failed|error|could not/i, 300000)) || "";
    out.tries.push({ route: "in this browser", seconds: Math.round((Date.now() - t1) / 1000), result: r2.slice(0, 240) });
  }
  // After a read the page reloads the schedule; the table fills once that answers ("No rows read
  // yet" is already there before the read, so it is not an answer).
  const readSome = out.tries.some((t) => /^Page \d+: [1-9]\d* (door|hardware set)|[1-9]\d* (doors|hardware sets) read in this browser/i.test(t.result));
  await until(() => target.evaluate(() => document.querySelectorAll("#doors-wrap tbody tr, #sets-wrap tbody tr").length > 0), readSome ? 45000 : 3000, 500);
  const d = await workspaceDetail(target);
  out.detail = { title: d.title, sub: d.sub, doorNote: d.doorNote, tiles: d.tiles, steps: d.steps, actions: d.actions, counts: d.counts };
  out.rows = d.rows;
  out.doors = d.rows.length;
  return out;
}

/**
 * BUILD THE SUBMITTAL PDF on the open schedule: waits for the result, the PDF shown in the page's
 * own viewer and the DOWNLOAD PDF link. Never leaves the page.
 */
export async function buildSubmittalPackage(target) {
  const t0 = Date.now();
  await pressIn(target, "#package-btn");
  const result = (await waitText(target, "#package-result", /^Built:|could not be built|error|failed/i, 300000, /^Building the package/i)) || "";
  // Shown in the page: drawn page by page with pdf.js into #package-pages (82aea46), or (before
  // that) a blob in the #package-viewer iframe.
  const viewer = await until(() => target.evaluate(() => {
    const pages = document.getElementById("package-pages");
    if (pages && !pages.classList.contains("hide")) {
      const holders = pages.querySelectorAll(".pdf-page");
      const drawn = Array.from(pages.querySelectorAll(".pdf-page[data-rendered] canvas")).filter((c) => { const r = c.getBoundingClientRect(); return r.width > 200 && r.height > 200; });
      return drawn.length ? { kind: "pages drawn in the page", pages: holders.length, drawn: drawn.length, meta: ((pages.querySelector(".pdf-meta") || {}).innerText || "").trim().slice(0, 120) } : null;
    }
    const v = document.getElementById("package-viewer");
    if (!v || v.classList.contains("hide")) return null;
    const r = v.getBoundingClientRect();
    return r.width > 200 && r.height > 200 ? { kind: "iframe", src: (v.getAttribute("src") || "").slice(0, 5), w: Math.round(r.width), h: Math.round(r.height) } : null;
  }), 60000, 500);
  const download = await target.evaluate(() => {
    const a = document.getElementById("package-download");
    return a && !a.classList.contains("hide") ? { href: (a.getAttribute("href") || "").slice(0, 5), file: a.getAttribute("download") } : null;
  }).catch(() => null);
  const pages = Number((/^Built:\s*(\d+)\s+pages/i.exec(result) || [])[1] || 0);
  return { result: result.slice(0, 400), pages, seconds: Math.round((Date.now() - t0) / 1000), viewer, download };
}

/** Elements wider than the viewport (or poking past its right edge) on a phone. */
export async function overflowing(page, selector) {
  return page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((el) => {
    const r = el.getBoundingClientRect();
    return { sel, right: Math.round(r.right), width: Math.round(r.width), text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40) };
  }).filter((x) => x.width > 0 && x.right > innerWidth + 1), selector);
}

// ---------------------------------------------------------------- the journey
export class Journey {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.suffix = Date.now().toString(36) + randomBytes(3).toString("hex");
    this.startedAt = new Date().toISOString();
    this.checks = [];
    this.notes = {};
    this.secrets = [];
    this.accounts = [];
    this.clones = new Map();
    this.uploads = new Set();
    this.packages = new Set();
    this.apiLog = [];
    this.pending = new Set();
    this.cloneRequests = new Set();
    this.abortedClones = [];
    this.browser = null;
    this.renderer = null;
    this.cleanupResult = null;
  }

  scrub(v) {
    let t = String(v);
    for (const s of this.secrets) if (s) t = t.split(s).join("<secret>");
    return t.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>").replace(/cs_(live|test)_[A-Za-z0-9]+/g, "cs_$1_<id>")
      .replace(/"(token|access_token|refresh_token|authfor_token|session_token|mfa_token|password)"\s*:\s*"[^"]*"/g, '"$1":"<redacted>"');
  }

  check(name, ok, detail) {
    const d = detail == null ? "" : typeof detail === "string" ? detail : JSON.stringify(detail);
    this.checks.push({ name, ok: !!ok, detail: this.scrub(d).slice(0, 500) });
    return !!ok;
  }

  note(key, value) {
    this.notes[key] = JSON.parse(this.scrub(JSON.stringify(value === undefined ? null : value)));
  }

  async checkInPlace(page, mark, name = "stayed in place: same document, still on weylandai.com") {
    const st = await placeState(page, mark);
    return this.check(name, st.sameDocument && st.onSite, st);
  }

  async launch() {
    this.browser = await chromium.launch({ args: LAUNCH_ARGS });
    const r = await gpuRenderer(this.browser);
    this.renderer = r;
    const renderer = (r && r.renderer) || "";
    const ok = !!renderer && !/swiftshader/i.test(renderer);
    this.check("browser has GPU WebGL", ok, renderer || (r && r.error) || "no WebGL context");
    if (!ok) throw new Error("stopped: this browser has no GPU WebGL (" + (renderer || "none") + "). Software WebGL freezes the homepage 3D backdrop for 18-39 s, so every later step would flake. Run on a Mac with a GPU (Chromium --use-angle=metal).");
    return this.browser;
  }

  async context(kind = "desktop", extra = {}) {
    const ctx = await this.browser.newContext({ ...(kind === "phone" ? PHONE : DESKTOP), ...extra });
    ctx.setDefaultTimeout(30000);
    ctx.on("response", (r) => this._onResponse(r));
    // A demo clone requested just before a context closes would still be created on the server,
    // with nobody left to read its id. Clone requests in flight are tracked, and closing a context
    // (or the browser, in run()) first waits for them to answer so their ids are captured.
    ctx.on("request", (req) => { if (req.method() === "POST" && CLONE_PATH.test(pathOf(req.url()))) this.cloneRequests.add(req); });
    ctx.on("requestfinished", (req) => this.cloneRequests.delete(req));
    ctx.on("requestfailed", (req) => {
      // A clone request the browser gave up on (e.g. the page navigated away) may still have been
      // carried out on the server, with no id to delete it by: the report says so.
      if (this.cloneRequests.delete(req)) this.abortedClones.push({ at: new Date().toISOString(), error: String((req.failure() || {}).errorText || "") });
    });
    const close = ctx.close.bind(ctx);
    ctx.close = async (...args) => { await this.settleClones(); return close(...args); };
    return ctx;
  }

  /** Waits (up to 20 s) for demo-clone requests still in flight and for their ids to be read. */
  async settleClones(ms = 20000) {
    const end = Date.now() + ms;
    while (this.cloneRequests.size && Date.now() < end) await sleep(250);
    if (this.pending.size) await Promise.race([Promise.allSettled([...this.pending]), sleep(4000)]);
  }

  /** A page that records the new tabs it opens and the files it downloads. (Headless Chromium has no
   *  PDF viewer: a PDF opened in a new tab shows up as a popup plus a download.) */
  async page(ctx) {
    const p = await ctx.newPage();
    p.__popups = [];
    p.__downloads = [];
    p.on("popup", (pp) => { p.__popups.push(pp); pp.on("download", (d) => p.__downloads.push(d.suggestedFilename())); });
    p.on("download", (d) => p.__downloads.push(d.suggestedFilename()));
    // Leaving a document cancels its requests in the browser, not on the server: a navigation or
    // reload the test makes first waits for demo-clone requests in flight, so their ids are read.
    const goto = p.goto.bind(p), reload = p.reload.bind(p);
    p.goto = async (...args) => { await this.settleClones(); return goto(...args); };
    p.reload = async (...args) => { await this.settleClones(); return reload(...args); };
    return p;
  }

  _track(promise) {
    this.pending.add(promise);
    promise.finally(() => this.pending.delete(promise));
  }

  _onResponse(r) {
    let u;
    try { u = new URL(r.url()); } catch (e) { return; }
    if (u.host !== SITE_HOST && u.host !== "authfor.com") return;
    if (!/^\/api\//.test(u.pathname)) return;
    const m = r.request().method();
    const entry = { at: Date.now(), m, host: u.host === SITE_HOST ? "" : u.host, path: u.pathname.slice(0, 140), status: r.status(), ct: String(r.headers()["content-type"] || "").split(";")[0] };
    this.apiLog.push(entry);
    if (this.apiLog.length > 1000) this.apiLog.shift();
    if (u.host !== SITE_HOST || m !== "POST") return;
    if (CLONE_PATH.test(u.pathname) && r.status() < 300) {
      this._track(r.json().then((j) => { if (j && j.session_id) this.clones.set(j.session_id, j.project_id || null); }).catch(() => {}));
    }
    if (/^\/api\/hardware-schedule\/start\/?$/.test(u.pathname)) {
      this._track(r.json().then((j) => { const sid = j && (j.sessionId || j.session_id || (j.session && j.session.id)); if (sid) this.uploads.add(sid); }).catch(() => {}));
    }
    const pkg = /^\/api\/hardware-schedule\/session\/([^/]+)\/submittal-pdf\/?$/.exec(u.pathname);
    if (pkg && r.status() < 300) this.packages.add(decodeURIComponent(pkg[1]));
  }

  /** API responses since t0 whose path matches re. */
  responses(since, re) {
    return this.apiLog.filter((e) => e.at >= since && re.test(e.path));
  }

  /**
   * A throwaway account: a real AuthFor identity (password generated here, never printed) and,
   * unless usersRow is false, a weylandai.com users row (default: the full SubConP suite).
   */
  async account(label, { tier = "subconp", status = "active", products = ALL_PRODUCTS, trialDays = 0, usersRow = true } = {}) {
    const acct = this.identity(label);
    const { email, password } = acct;
    const userId = usersRow ? "usersim_" + acct.label.replace(/-/g, "_") + "_" + this.suffix : null;
    acct.userId = userId;
    acct.usersRow = usersRow;
    const r = await fetch("https://authfor.com/api/v1/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: "User Simulation (" + this.id + ")" })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.token) throw new Error("AuthFor register failed: " + r.status + " " + this.scrub(JSON.stringify(d)).slice(0, 160));
    if (usersRow) {
      const trial = trialDays > 0 ? "datetime('now','+" + Math.round(trialDays) + " days')" : "NULL";
      const [res] = await d1("INSERT INTO users (id, email, name, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled, trial_ends_at) VALUES (" +
        [userId, email, "User Simulation Harness (" + this.id + ")", "ven_weyland", tier, status].map(q).join(",") + ",0,999," + q(products) + "," + trial + ");");
      if (!res || !res.success) throw new Error("users insert failed");
    }
    return acct;
  }

  /** Email + generated password for this run, registered nowhere yet (a journey that creates the
   *  account through the page uses this). Its rows are deleted in cleanup by the email. */
  identity(label) {
    const clean = String(label).toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const email = "user-sim-" + clean + "-" + this.suffix + "@weylandai.com";
    const password = "Us!" + randomBytes(12).toString("base64url");
    this.secrets.push(password);
    const acct = { label: clean, email, password, userId: null, usersRow: false };
    this.accounts.push(acct);
    return acct;
  }

  /** An address for this run that is never registered anywhere (nothing can be mailed to it). */
  unregisteredEmail(label) {
    return "user-sim-" + label + "-" + this.suffix + "@weylandai.com";
  }

  async cleanup() {
    if (this.abortedClones.length) this.note("demo_clone_requests_aborted", { count: this.abortedClones.length, requests: this.abortedClones, meaning: "the browser dropped these clone requests (the page left); if the server still made a clone, it is a guest-owned 'The WeylandAI Building' copy created at about that time, left to the demo-clone sweep" });
    const nothing = !this.accounts.length && !this.clones.size && !this.uploads.size;
    if (nothing) { this.cleanupResult = { nothing: true }; return; }
    let res;
    try {
      res = await purgeTestData({
        userIds: this.accounts.map((a) => a.userId).filter(Boolean),
        emails: this.accounts.map((a) => a.email),
        cloneSessions: [...this.clones.entries()].map(([s, p]) => ({ session_id: s, project_id: p })),
        uploadSessions: [...this.uploads],
        packageSessions: [...this.packages]
      });
    } catch (e) {
      res = { ok: false, error: String((e && e.message) || e).slice(0, 300) };
    }
    this.cleanupResult = res;
    this.check("test data deleted (account rows, demo clones, uploads)", res.ok,
      { clonesCaptured: this.clones.size, uploadsCaptured: this.uploads.size, packagesBuilt: this.packages.size, deletedRows: res.deletedTotal, r2: res.r2, kv: res.kv, remaining: res.remaining, skipped: res.skipped, error: res.error });
  }

  async writeReport() {
    const failed = this.checks.filter((c) => !c.ok);
    const apiErrors = this.apiLog.filter((e) => e.status >= 400).slice(-40).map((e) => e.m + " " + (e.host ? e.host : "") + e.path + " " + e.status);
    const report = {
      journey: this.id, title: this.title, base: BASE, started_at: this.startedAt, finished_at: new Date().toISOString(),
      passed: this.checks.length - failed.length, failed: failed.length, checks: this.checks, notes: this.notes,
      browser: { launch_args: LAUNCH_ARGS, webgl: this.renderer }, api_errors: apiErrors, cleanup: this.cleanupResult,
      side_effects: this.accounts.length ? "AuthFor identities created by this run stay at AuthFor (they cannot be deleted from here): " + this.accounts.map((a) => a.email).join(", ") : "no AuthFor identity created"
    };
    await mkdir(REPORTS_DIR, { recursive: true });
    const stamp = this.startedAt.replace(/[:.]/g, "-");
    const body = this.scrub(JSON.stringify(report, null, 2));
    await writeFile(path.join(REPORTS_DIR, "journey-" + this.id + "-" + stamp + ".json"), body);
    await writeFile(path.join(REPORTS_DIR, "journey-" + this.id + "-latest.json"), body);
    for (const c of this.checks) console.log((c.ok ? "PASS " : "FAIL ") + c.name + (c.ok || !c.detail ? "" : "  [" + c.detail + "]"));
    console.log(report.passed + " passed, " + report.failed + " failed");
    return report;
  }

  /** Runs the journey body, then always: close the browser, delete test data, write the report, exit. */
  async run(body) {
    try {
      await body(this);
    } catch (e) {
      this.check("journey ran to completion", false, (e && e.message) || String(e));
    } finally {
      await this.settleClones();
      if (this.browser) await this.browser.close().catch(() => {});
      await this.cleanup();
    }
    await this.writeReport();
    process.exit(this.checks.some((c) => !c.ok) ? 1 : 0);
  }
}
