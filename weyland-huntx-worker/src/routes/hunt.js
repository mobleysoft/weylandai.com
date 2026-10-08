// weyland-huntx-worker/src/routes/hunt.js
//
// HuntX's API: POST /api/hunt/refresh and GET /api/hunt/opportunities.
// Originally ported verbatim from ../../../src/routes/hunt.js (the
// monolith's copy, still registered there but unreachable: the zone route
// weylandai.com/api/hunt/* sends every request here).
//
// 2026-10-07 contract (what the HuntX page and the homepage chapter read):
//
//   GET /api/hunt/opportunities?q=&source=&limit=&offset=
//     Searches the WHOLE index server side (title, agency, location,
//     category; LIKE, case-insensitive for ASCII). Upcoming key dates first
//     (soonest first), then past ones (most recent first).
//     -> { opportunities: [...up to limit rows], total: <rows matching q/source>,
//          indexed: <rows in the index>, sources: [{source, n}], limit, offset,
//          lastFetchedAt, lastIngest: {started_at, finished_at, upserted, errors} }
//     limit defaults to 100, max 300; offset defaults to 0.
//
//   2026-10-08 additions (a door sub had to read past 671 TxDOT road jobs):
//     fit=doors|building|signal|civil|all (default all for the API; the page
//     asks for building), state=TX, due_within=<days>, min_value=<dollars>.
//     Each row carries trade_fit, trade_fit_why, state and created_at; the
//     reply carries fits: {doors, building, signal, civil} and states: [{state, n}]
//     for the whole index.
//
//   Saved searches (signed-in accounts only; a guest has nowhere to keep one).
//   Searching is free; saving a search needs payment (shared output-access.js):
//     GET    /api/hunt/saved            -> { saved: [{id, name, params, new_count, last_seen_at}] }
//     POST   /api/hunt/saved {name, params} (max 20 per account)
//     POST   /api/hunt/saved/:id/seen   marks every match as seen
//     DELETE /api/hunt/saved/:id
//     new_count is the number of matching notices that entered the index
//     after the search was last opened.
//   Alerts (2026-10-08): each saved search carries two private feed URLs, so
//   new notices reach the sub without opening HuntX:
//     GET /api/hunt/feed/<token>.rss   newest 50 matches (Outlook, Slack, any reader)
//     GET /api/hunt/feed/<token>.ics   upcoming due dates as all-day events
//                                      (Google Calendar / Outlook "subscribe by URL")
//     The token is the secret (32 hex). Deleting the search kills both feeds;
//     each read re-checks the owner's HuntX plan, so a lapsed plan stops them.
//   Email (2026-10-08, via mailguyAI; lib/email-alerts.js):
//     POST /api/hunt/saved/:id/email {on}   a daily digest of new matches for that search
//     GET  /api/hunt/unsubscribe/<token>    one-click stop, linked from every email
//     GET  /api/hunt/saved also says emailAvailable (false until MAILGUY_API_KEY is set).
//
//   POST /api/hunt/refresh
//     Never waits on the public sources (per the 2026-10-05 instruction that
//     nothing a visitor triggers may depend on a call outside the
//     conglomerate). It starts one background pull when the last pull is at
//     least REFRESH_COOLDOWN_SECONDS old (a D1 lease, shared with the hourly
//     request-driven job, so a click and the hourly job never both run),
//     and reports the index as it stands.
//     -> { success, indexed, sources, lastIngest, pull: { started, retryAfterSeconds }, note }
//     There is no top-level "upserted": the count from the last finished
//     pull is lastIngest.upserted (the page used to read data.upserted and
//     printed "undefined opportunities updated").

import { jsonResponse3 } from "../lib/json-response.js";
import { requireProductAccess } from "../lib/auth.js";
import { ingestSources, lastIngest, ensureFitColumns } from "../lib/ingest.js";
import { tradeFit, stateOf, FIT_FILTERS } from "../lib/trade-fit.js";
import { claimJobLease } from "../lib/job-lease.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

export const REFRESH_COOLDOWN_SECONDS = 600;
export const INGEST_JOB = "huntx-ingest";

async function sourceCounts(env2) {
  const r = await env2.DB.prepare("SELECT source, COUNT(*) AS n FROM opportunities GROUP BY source ORDER BY n DESC").all();
  return (r.results || []).map((x) => ({ source: x.source, n: x.n }));
}

const SEARCH_KEYS = ["q", "source", "fit", "state", "due_within", "min_value"];
export const MAX_SAVED_SEARCHES = 20;

/** The search a URL or a saved search names, cleaned. */
export function pickSearch(get) {
  const out = {};
  for (const k of SEARCH_KEYS) {
    const v = String(get(k) ?? "").trim().slice(0, 120);
    if (v) out[k] = v;
  }
  if (out.fit && !(out.fit in FIT_FILTERS)) delete out.fit;
  if (out.state) out.state = out.state.toUpperCase().slice(0, 2);
  return out;
}

/** WHERE clause and binds for a search. source stays first in the binds. */
export function searchWhere(p, today) {
  let where = "WHERE 1=1";
  const params = [];
  if (p.source) { where += " AND source = ?"; params.push(p.source); }
  if (p.q) {
    where += " AND (title LIKE ? OR agency LIKE ? OR location LIKE ? OR category LIKE ?)";
    params.push(`%${p.q}%`, `%${p.q}%`, `%${p.q}%`, `%${p.q}%`);
  }
  const fits = p.fit ? FIT_FILTERS[p.fit] : null;
  if (fits) { where += ` AND trade_fit IN (${fits.map(() => "?").join(",")})`; params.push(...fits); }
  if (p.state) { where += " AND state = ?"; params.push(p.state); }
  const days = parseInt(p.due_within, 10);
  if (Number.isFinite(days) && days > 0) {
    const until = new Date(Date.parse(today) + Math.min(days, 3650) * 86400000).toISOString().slice(0, 10);
    where += " AND key_date >= ? AND key_date <= ?";
    params.push(today, until);
  }
  const min = Number(p.min_value);
  if (Number.isFinite(min) && min > 0) { where += " AND estimated_value >= ?"; params.push(min); }
  return { where, params };
}

// Rows written before trade fit existed get classified on read, 500 at a time.
export async function backfillFit(env2) {
  await ensureFitColumns(env2);
  let r;
  try {
    r = await env2.DB.prepare("SELECT id, source, title, category, location, raw_data FROM opportunities WHERE trade_fit IS NULL LIMIT 500").all();
  } catch (_) { return 0; }
  const rows = r?.results || [];
  if (!rows.length) return 0;
  const stmt = env2.DB.prepare("UPDATE opportunities SET trade_fit = ?, trade_fit_why = ?, state = ? WHERE id = ?");
  const updates = rows.map((o) => { const f = tradeFit(o); return stmt.bind(f.fit, f.why, stateOf(o.location), o.id); });
  for (let i = 0; i < updates.length; i += 50) await env2.DB.batch(updates.slice(i, i + 50));
  return rows.length;
}

async function fitCounts(env2) {
  const out = { doors: 0, building: 0, signal: 0, civil: 0 };
  try {
    const r = await env2.DB.prepare("SELECT trade_fit AS fit, COUNT(*) AS n FROM opportunities GROUP BY trade_fit").all();
    for (const x of r?.results || []) if (x.fit in out) out[x.fit] = x.n;
  } catch (_) { /* older table */ }
  return out;
}

async function stateCounts(env2) {
  try {
    const r = await env2.DB.prepare("SELECT state, COUNT(*) AS n FROM opportunities WHERE state IS NOT NULL GROUP BY state ORDER BY n DESC").all();
    return (r?.results || []).map((x) => ({ state: x.state, n: x.n }));
  } catch (_) { return []; }
}

let savedTableReady = false;
async function ensureSavedTable(env2) {
  if (savedTableReady) return;
  await env2.DB.prepare(`CREATE TABLE IF NOT EXISTS huntx_saved_searches (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, params TEXT NOT NULL,
    last_seen_at TEXT NOT NULL, created_at TEXT NOT NULL)`).run();
  for (const col of ["feed_token TEXT", "email_alerts INTEGER DEFAULT 0", "last_emailed_at TEXT", "unsub_token TEXT"]) {
    try { await env2.DB.prepare("ALTER TABLE huntx_saved_searches ADD COLUMN " + col).run(); } catch (_) { /* already there */ }
  }
  savedTableReady = true;
}
export function resetSavedTableForTests() { savedTableReady = false; }

function feedToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const FEED_FILE = /^([0-9a-f]{32})\.(rss|ics)$/;
const SITE = "https://weylandai.com";
const xml = (v) => String(v ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
function summaryLine(o) {
  return [o.agency, o.location, o.key_date && `due ${o.key_date}`, o.estimated_value && `est. $${Math.round(o.estimated_value).toLocaleString("en-US")}`, o.trade_fit && `fit: ${o.trade_fit}`].filter(Boolean).join(" · ");
}
export function rssFeed(name, rows, now) {
  const items = rows.map((o) => `<item><title>${xml(o.title)}</title><link>${xml(o.detail_url || SITE + "/huntx")}</link><guid isPermaLink="false">huntx-${xml(o.id)}</guid><pubDate>${new Date(o.created_at || now).toUTCString()}</pubDate><description>${xml(summaryLine(o))}</description></item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml("HuntX: " + name)}</title><link>${SITE}/huntx</link><description>${xml("New public bid notices matching your saved HuntX search \"" + name + "\".")}</description><lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}
const icsText = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 folding: lines over 75 octets continue on a line starting with a space. */
function fold(line) {
  const out = [];
  let cur = "", n = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
export function icsFeed(name, rows, now) {
  const stamp = new Date(now).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const day = (d) => d.replace(/-/g, "");
  const next = (d) => new Date(Date.parse(d + "T00:00:00Z") + 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//WeylandAI//HuntX//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText("HuntX: " + name)}`];
  for (const o of rows) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(o.key_date || "")) continue;
    const d = o.key_date.slice(0, 10);
    lines.push("BEGIN:VEVENT", `UID:huntx-${o.id}@weylandai.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(d)}`, `DTEND;VALUE=DATE:${next(d)}`,
      `SUMMARY:${icsText("Bid due: " + o.title)}`, `DESCRIPTION:${icsText(summaryLine(o) + (o.detail_url ? "\n" + o.detail_url : ""))}`, ...(o.detail_url ? [`URL:${icsText(o.detail_url)}`] : []), "TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
function feedUrls(token) {
  return token ? { feed_url: `${SITE}/api/hunt/feed/${token}.rss`, calendar_url: `${SITE}/api/hunt/feed/${token}.ics` } : {};
}

async function lastLeaseAt(env2) {
  try {
    const row = await env2.DB.prepare("SELECT ran_at FROM job_runs WHERE job = ?").bind(INGEST_JOB).first();
    return row && row.ran_at ? row.ran_at : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerHuntRoutes(router, { authenticate }) {
  router.post("/api/hunt/refresh", async (request2, env2, ctx) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      let started = false;
      let retryAfterSeconds = 0;
      const canRunInBackground = ctx && typeof ctx.waitUntil === "function";
      if (canRunInBackground && await claimJobLease(env2.DB, INGEST_JOB, REFRESH_COOLDOWN_SECONDS, "weyland-huntx-worker")) {
        ctx.waitUntil(ingestSources(env2, "refresh").catch((e) => console.error("[HuntX Ingest] refresh run failed:", e)));
        started = true;
      } else {
        const at = await lastLeaseAt(env2);
        if (at) retryAfterSeconds = Math.max(0, Math.ceil((Date.parse(at) + REFRESH_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
      }
      const count = await env2.DB.prepare("SELECT COUNT(*) as n FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({
        success: true,
        indexed: count?.n || 0,
        sources: await sourceCounts(env2),
        lastIngest: last || null,
        pull: { started, retryAfterSeconds },
        note: started
          ? "a pull from the public sources started in the background; lastIngest changes when it finishes"
          : "a pull ran recently; the index is what you are reading"
      });
    } catch (error5) {
      console.error("[HuntX Refresh] Error:", error5);
      return jsonResponse3({ error: "Failed to read the opportunity index", details: error5.message }, 500);
    }
  });

  router.get("/api/hunt/opportunities", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      const url = new URL(request2.url);
      const search = pickSearch((k) => url.searchParams.get(k));
      const limitIn = parseInt(url.searchParams.get("limit") || "100", 10);
      const limit = Math.min(Math.max(Number.isFinite(limitIn) ? limitIn : 100, 1), 300);
      const offsetIn = parseInt(url.searchParams.get("offset") || "0", 10);
      const offset = Math.min(Math.max(Number.isFinite(offsetIn) ? offsetIn : 0, 0), 100000);
      await backfillFit(env2);
      const today = new Date().toISOString().slice(0, 10);
      const { where, params } = searchWhere(search, today);
      const result = await env2.DB.prepare(
        `SELECT id, source, title, agency, location, category, status, key_date, estimated_value, detail_url, fetched_at,
                trade_fit, trade_fit_why, state, created_at
         FROM opportunities ${where}
         ORDER BY CASE WHEN key_date >= ? THEN 0 ELSE 1 END,
                  CASE WHEN key_date >= ? THEN key_date END ASC,
                  key_date DESC
         LIMIT ? OFFSET ?`
      ).bind(...params, today, today, limit, offset).all();
      const totalRow = await env2.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where}`).bind(...params).first();
      const indexedRow = Object.keys(search).length ? await env2.DB.prepare("SELECT COUNT(*) AS n FROM opportunities").first() : totalRow;
      const lastFetch = await env2.DB.prepare("SELECT MAX(fetched_at) as t FROM opportunities").first();
      const last = await lastIngest(env2);
      return jsonResponse3({
        opportunities: result.results || [],
        total: totalRow?.n || 0,
        indexed: indexedRow?.n || 0,
        sources: await sourceCounts(env2),
        fits: await fitCounts(env2),
        states: await stateCounts(env2),
        limit,
        offset,
        lastFetchedAt: lastFetch?.t || null,
        lastIngest: last || null
      });
    } catch (error5) {
      console.error("[HuntX List] Error:", error5);
      return jsonResponse3({ error: "Failed to list opportunities", details: error5.message }, 500);
    }
  });

  // Saved searches. A guest session has no account to keep them on.
  async function signedIn(request2, env2) {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return { error: error4 };
    if (!user?.userId || user.ephemeral) {
      return { error: jsonResponse3({ success: false, error: "SIGN_IN_REQUIRED", message: "Sign in to save a search and see what's new in it." }, 401) };
    }
    await ensureSavedTable(env2);
    return { userId: String(user.userId) };
  }

  router.get("/api/hunt/saved", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const r = await env2.DB.prepare("SELECT id, name, params, last_seen_at, created_at, feed_token, email_alerts FROM huntx_saved_searches WHERE user_id = ? ORDER BY created_at").bind(a.userId).all();
    const today = new Date().toISOString().slice(0, 10);
    const saved = [];
    for (const s of r?.results || []) {
      let params = {};
      try { params = JSON.parse(s.params) || {}; } catch (_) { params = {}; }
      const { where, params: binds } = searchWhere(params, today);
      const row = await env2.DB.prepare(`SELECT COUNT(*) AS n FROM opportunities ${where} AND created_at > ?`).bind(...binds, s.last_seen_at).first();
      let token = s.feed_token;
      if (!token) { token = feedToken(); await env2.DB.prepare("UPDATE huntx_saved_searches SET feed_token = ? WHERE id = ?").bind(token, s.id).run(); }
      saved.push({ id: s.id, name: s.name, params, last_seen_at: s.last_seen_at, new_count: row?.n || 0, email_alerts: !!s.email_alerts, ...feedUrls(token) });
    }
    return jsonResponse3({ success: true, saved, emailAvailable: !!env2.MAILGUY_API_KEY });
  });

  router.post("/api/hunt/saved", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    let body = {};
    try { body = await request2.json(); } catch (_) { body = {}; }
    // Searching is free; keeping a search and counting what's new in it is
    // what HuntX's plan (or the $100 first submittal) pays for.
    if (!(await outputAccess(env2, a.userId, "huntx")).paid) {
      return jsonResponse3(paymentRequired("Saving searches and counting new notices in them"), 402);
    }
    const params = pickSearch((k) => body?.params?.[k]);
    const name = String(body?.name || "").trim().slice(0, 80) || "Saved search";
    const n = await env2.DB.prepare("SELECT COUNT(*) AS n FROM huntx_saved_searches WHERE user_id = ?").bind(a.userId).first();
    if ((n?.n || 0) >= MAX_SAVED_SEARCHES) {
      return jsonResponse3({ success: false, error: "TOO_MANY", message: `Up to ${MAX_SAVED_SEARCHES} saved searches; delete one first.` }, 400);
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const token = feedToken();
    await env2.DB.prepare("INSERT INTO huntx_saved_searches (id, user_id, name, params, last_seen_at, created_at, feed_token) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, a.userId, name, JSON.stringify(params), now, now, token).run();
    return jsonResponse3({ success: true, saved: { id, name, params, last_seen_at: now, new_count: 0, ...feedUrls(token) } });
  });

  router.post("/api/hunt/saved/:id/seen", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const id = request2.params?.id || new URL(request2.url).pathname.split("/")[4];
    await env2.DB.prepare("UPDATE huntx_saved_searches SET last_seen_at = ? WHERE id = ? AND user_id = ?").bind(new Date().toISOString(), id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.delete("/api/hunt/saved/:id", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const id = request2.params?.id || new URL(request2.url).pathname.split("/")[4];
    await env2.DB.prepare("DELETE FROM huntx_saved_searches WHERE id = ? AND user_id = ?").bind(id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.get("/api/hunt/feed/:file", async (request2, env2) => {
    const file = request2.params?.file || new URL(request2.url).pathname.split("/").pop();
    const m = FEED_FILE.exec(String(file || ""));
    const plain = (msg, status) => new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    if (!m) return plain("Not a HuntX feed.", 404);
    await ensureSavedTable(env2);
    const s = await env2.DB.prepare("SELECT id, user_id, name, params FROM huntx_saved_searches WHERE feed_token = ?").bind(m[1]).first();
    if (!s) return plain("This HuntX feed was removed with its saved search.", 404);
    if (!(await outputAccess(env2, s.user_id, "huntx")).paid) return plain("This HuntX feed is paused: the account's HuntX plan is not active. Renew at https://weylandai.com/pricing.", 402);
    let params = {};
    try { params = JSON.parse(s.params) || {}; } catch (_) { params = {}; }
    const now = new Date().toISOString(), today = now.slice(0, 10);
    const { where, params: binds } = searchWhere(params, today);
    const cols = "id, title, agency, location, key_date, estimated_value, detail_url, trade_fit, created_at";
    if (m[2] === "rss") {
      const rows = (await env2.DB.prepare(`SELECT ${cols} FROM opportunities ${where} ORDER BY created_at DESC LIMIT 50`).bind(...binds).all()).results || [];
      return new Response(rssFeed(s.name, rows, now), { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "private, max-age=900" } });
    }
    const rows = (await env2.DB.prepare(`SELECT ${cols} FROM opportunities ${where} AND key_date >= ? ORDER BY key_date ASC LIMIT 300`).bind(...binds, today).all()).results || [];
    return new Response(icsFeed(s.name, rows, now), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900", "Content-Disposition": `inline; filename="huntx-${m[1].slice(0, 8)}.ics"` } });
  });

  router.post("/api/hunt/saved/:id/email", async (request2, env2) => {
    const a = await signedIn(request2, env2);
    if (a.error) return a.error;
    const id = request2.params?.id || new URL(request2.url).pathname.split("/")[4];
    const body = await request2.json().catch(() => ({}));
    const on = !!body.on;
    if (on && !env2.MAILGUY_API_KEY) return jsonResponse3({ success: false, error: "EMAIL_UNAVAILABLE", message: "Email alerts are not switched on for HuntX yet. The RSS and calendar links deliver new notices meanwhile." }, 503);
    if (on && !(await outputAccess(env2, a.userId, "huntx")).paid) return jsonResponse3(paymentRequired("Email alerts for a saved search"), 402);
    const row = await env2.DB.prepare("SELECT id, unsub_token FROM huntx_saved_searches WHERE id = ? AND user_id = ?").bind(id, a.userId).first();
    if (!row) return jsonResponse3({ success: false, message: "Not found." }, 404);
    // Alerts start from now: the first digest holds what arrives after this.
    await env2.DB.prepare("UPDATE huntx_saved_searches SET email_alerts = ?, unsub_token = ?, last_emailed_at = CASE WHEN ? THEN ? ELSE last_emailed_at END WHERE id = ? AND user_id = ?")
      .bind(on ? 1 : 0, row.unsub_token || feedToken(), on ? 1 : 0, new Date().toISOString(), id, a.userId).run();
    return jsonResponse3({ success: true, email_alerts: on });
  });

  router.get("/api/hunt/unsubscribe/:token", async (request2, env2) => {
    const token = request2.params?.token || new URL(request2.url).pathname.split("/").pop();
    await ensureSavedTable(env2);
    const page = (msg) => new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HuntX email alerts</title></head><body style="font-family:Helvetica,Arial,sans-serif;background:#090a0d;color:#edf0f1;display:grid;place-items:center;min-height:100vh;margin:0"><div style="max-width:460px;padding:24px;text-align:center"><p style="font:700 12px monospace;letter-spacing:.12em;color:#ffd400">WEYLANDAI HUNTX</p><h1 style="font-size:22px">${msg}</h1><p><a href="/huntx" style="color:#66d4ff">Open HuntX</a></p></div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    if (!/^[0-9a-f]{32}$/.test(String(token || ""))) return page("That unsubscribe link is not valid.");
    const row = await env2.DB.prepare("SELECT id, name FROM huntx_saved_searches WHERE unsub_token = ?").bind(token).first();
    if (!row) return page("That saved search no longer exists, so it sends no email.");
    await env2.DB.prepare("UPDATE huntx_saved_searches SET email_alerts = 0 WHERE id = ?").bind(row.id).run();
    return page("Email alerts for “" + String(row.name).replace(/[<>&"]/g, "") + "” are off.");
  });
}
