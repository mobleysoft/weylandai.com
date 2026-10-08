// Schedule-reading accuracy harness for SubX / TakeOffX (2026-10-08).
//
// Ground truth: tools/corpus/expected/*.json, rows read by eye from rendered page images
// (each file says how it was checked). Nothing in those files came from an extractor.
//
// What it measures, per document, through the same HTTP requests the SubX workspace page
// makes against production:
//   POST /api/hardware-schedule/start                       (upload, as the page's UPLOAD button)
//   POST /api/hardware-schedule/session/:id/find-pages      (where the schedules are; skipped when the
//                                                            server has no such route yet)
//   GET  /api/hardware-schedule/session/:id/page/:n[?type=] (the server read of one page)
//   GET  /api/hardware-schedule/session/:id/doors           (the rows the workspace shows)
// then scores rows found and field accuracy against the expected rows.
//
// Account: a throwaway users + weyland_sessions row written straight into production D1 (the
// same technique as tools/user-simulation/lib/throwaway-account.mjs; no AuthFor identity, no
// email). Everything the run creates is deleted at the end: the account rows, every row that
// points at the run's sessions, the R2 upload and its KV copy.
//
// Usage: node tools/accuracy/schedule_read_accuracy.mjs [--base https://weylandai.com]
//        [--only rockford,berryessa,occ,christina] [--label before]
// Writes schedule_report_<stamp>[_<label>].json and .md next to this file. Needs the Cloudflare
// login wrangler already uses (run with CF_API_KEY unset, like the deploy steps).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const ONLY = args.only ? String(args.only).split(",").map((s) => s.trim()) : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const UPLOADS_BUCKET = "subx-uploads";
const CACHE_KV = "80a77dcf4f5f4e8588c172f2ecef95fb";

const EXPECTED = join(REPO, "tools/corpus/expected");
const CORPUS = join(REPO, "tools/corpus/door-schedules");
const DOCS = [
  { id: "rockford", file: join(CORPUS, "f0e863d88ea688ff.pdf"), upload_type: "door_schedule",
    doors: "rockford-a2.2-door-schedule.json", groups: "rockford-087100-hardware-groups.json" },
  { id: "berryessa", file: join(CORPUS, "dd339f57b51538ed.pdf"), upload_type: "door_schedule",
    doors: "berryessa-a9.2-door-schedules.json", groups: "berryessa-087100-hardware-groups.json" },
  { id: "occ", file: "/Users/johnmobley/pdf/OCCDoorSchedulePg4.pdf", upload_type: "door_schedule",
    doors: "occ-a-801-door-schedule.json" },
  { id: "christina", file: join(CORPUS, "525dc0b72011077a.pdf"), upload_type: "hardware_schedule",
    groups: "christina-chs-hardware-set-01.json" },
];

// ---------------------------------------------------------------- wrangler / D1
async function wrangler(a) {
  const env = { ...process.env };
  delete env.CF_API_KEY;
  return execFileP("npx", ["wrangler", ...a], { cwd: REPO, env, maxBuffer: 64 * 1024 * 1024 });
}
async function d1(statements) {
  const sql = Array.isArray(statements) ? statements.join("\n") : statements;
  const { stdout } = await wrangler(["d1", "execute", "weyland_db", "--remote", "--json", "--command", sql]);
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed : [parsed];
}
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const inList = (xs) => "(" + (xs.length ? xs.map(q).join(",") : "NULL") + ")";

async function createAccount() {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const userId = "usersim_sched_" + suffix;
  const sessionId = "usersim_sess_" + suffix;
  const email = "user-sim-sched-" + suffix + "@weylandai.com";
  const [u, s] = await d1([
    "INSERT INTO users (id, email, name, company, tenant_id, subscription_tier, subscription_status, submittals_used, submittals_limit, products_enabled) VALUES (" +
      [userId, email, "Schedule accuracy harness", "Harness Door & Hardware"].map(q).join(",") + ",'ven_weyland','subconp','active',0,999,'subx,takeoffx,cutsheetx,sightx,propx,huntx,meetingx');",
    "INSERT INTO weyland_sessions (id, user_id, email, expires_at) VALUES (" + [sessionId, userId, email].map(q).join(",") + ", datetime('now','+3 hours'));",
  ]);
  if (!u.success || !s.success) throw new Error("account rows not written");
  return { userId, sessionId, email, cookie: "weyland_session=" + sessionId };
}

async function schemaTablesWith(column, except = []) {
  const [r] = await d1("SELECT name, sql FROM sqlite_master WHERE type='table';");
  const out = [];
  for (const t of r.results || []) {
    if (except.includes(t.name)) continue;
    const cols = String(t.sql || "").replace(/^[^(]*\(/s, "").split(/,(?![^()]*\))/).map((c) => c.trim().split(/\s+/)[0].replace(/["`\[\]]/g, "").toLowerCase());
    if (cols.includes(column)) out.push(t.name);
  }
  return out;
}

async function purge(acct, sessions) {
  const out = { deleted: {}, r2: [], kv: [], remaining: null };
  const S = sessions.map((s) => s.id);
  const stmts = [];
  if (S.length) {
    const childOfSets = (await schemaTablesWith("hardware_set_id", ["door_schedule_entries", "hardware_door_matrix"]));
    for (const t of childOfSets) stmts.push("DELETE FROM " + t + " WHERE hardware_set_id IN (SELECT id FROM hardware_sets WHERE session_id IN " + inList(S) + ");");
    stmts.push("DELETE FROM hardware_components WHERE set_id IN (SELECT id FROM hardware_sets WHERE session_id IN " + inList(S) + ");");
    for (const t of await schemaTablesWith("session_id")) stmts.push("DELETE FROM " + t + " WHERE session_id IN " + inList(S) + ";");
    stmts.push("DELETE FROM hardware_extraction_sessions WHERE id IN " + inList(S) + ";");
  }
  for (const t of await schemaTablesWith("user_id", ["users"])) stmts.push("DELETE FROM " + t + " WHERE user_id = " + q(acct.userId) + ";");
  stmts.push("DELETE FROM users WHERE id = " + q(acct.userId) + ";");
  for (let i = 0; i < stmts.length; i += 40) {
    const chunk = stmts.slice(i, i + 40);
    const res = await d1(chunk);
    res.forEach((r, j) => { const n = (r.meta && r.meta.changes) || 0; if (n) { const t = chunk[j].match(/^DELETE FROM (\S+)/)[1]; out.deleted[t] = (out.deleted[t] || 0) + n; } });
  }
  for (const s of sessions) {
    if (!s.key || !s.key.startsWith("hardware-sessions/" + acct.userId + "/")) continue;
    try { await wrangler(["r2", "object", "delete", UPLOADS_BUCKET + "/" + s.key, "--remote"]); out.r2.push("deleted"); } catch (e) { out.r2.push("error " + String(e.message).slice(0, 80)); }
    try { await wrangler(["kv", "key", "delete", s.key, "--namespace-id", CACHE_KV, "--remote"]); out.kv.push("deleted"); } catch (e) { out.kv.push("error " + String(e.message).slice(0, 80)); }
  }
  const [u, w, h] = await d1([
    "SELECT COUNT(*) AS n FROM users WHERE id = " + q(acct.userId) + ";",
    "SELECT COUNT(*) AS n FROM weyland_sessions WHERE user_id = " + q(acct.userId) + ";",
    "SELECT COUNT(*) AS n FROM hardware_extraction_sessions WHERE id IN " + inList(S) + " OR user_id = " + q(acct.userId) + ";",
  ]);
  const n = (r) => ((r.results || [])[0] || {}).n || 0;
  out.remaining = { users: n(u), weyland_sessions: n(w), extraction_sessions: n(h) };
  out.ok = Object.values(out.remaining).every((x) => x === 0) && !out.r2.some((x) => /error/.test(x)) && !out.kv.some((x) => /error/.test(x));
  return out;
}

// ---------------------------------------------------------------- HTTP, as the page makes it
async function api(acct, path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { Cookie: acct.cookie, ...(init.headers || {}) } });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) { data = { raw: text.slice(0, 300) }; }
  return { ok: r.ok, status: r.status, data, ms: Date.now() - t0 };
}
async function upload(acct, doc) {
  const bytes = readFileSync(doc.file);
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type: "application/pdf" }), doc.file.split("/").pop());
  fd.append("projectName", "accuracy " + doc.id + " " + new Date().toISOString().slice(0, 16));
  fd.append("document_type", doc.upload_type);
  const r = await api(acct, "/api/hardware-schedule/start", { method: "POST", body: fd });
  if (!r.ok) throw new Error("upload " + doc.id + " failed: HTTP " + r.status + " " + JSON.stringify(r.data).slice(0, 200));
  return { id: r.data.sessionId, totalPages: r.data.totalPages, ms: r.ms, key: null, detected: r.data.detectedSchedulePages || null };
}

// ---------------------------------------------------------------- scoring
const up = (s) => String(s == null ? "" : s).trim().toUpperCase();
const normMark = (s) => up(s).replace(/\s*\[P\.\d+\]\s*$/, "").replace(/\s+/g, "");
const normGroup = (s) => up(s).replace(/[\s_]+/g, " ").replace(/^0+(?=\d)/, "").trim();
const normFire = (s) => up(s).replace(/[.,;:\s]+/g, "").replace(/MINUTES?$|MINS?$/, "MIN");
const normText = (s) => up(s).replace(/[^A-Z0-9]+/g, " ").trim();
const normCat = (s) => up(s).replace(/[^A-Z0-9]+/g, "");
const same = (a, b) => (a == null || a === "") && (b == null || b === "") ? true : a != null && b != null && String(a) === String(b);
function editDistance(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

const DOOR_FIELDS = ["mark", "hardware_group", "width_inches", "height_inches", "fire_rating", "door_type"];
function scoreDoors(expectedDoc, found) {
  // Berryessa repeats tag numbers on each sheet: rows are matched within their page.
  const byPage = new Map();
  for (const d of found) { const p = (d.source && d.source.page) || d.page_number; if (!byPage.has(p)) byPage.set(p, []); byPage.get(p).push({ ...d, _used: false }); }
  const perField = Object.fromEntries(DOOR_FIELDS.map((f) => [f, { right: 0, wrong: 0 }]));
  const rows = [];
  let matched = 0;
  for (const e of expectedDoc.doors) {
    const page = e.page || expectedDoc.source.pages[0];
    const pool = byPage.get(page) || [];
    let f = pool.find((x) => !x._used && normMark(x.mark) === normMark(e.mark));
    let markRight = !!f;
    if (!f) {
      const near = pool.filter((x) => !x._used && editDistance(normMark(x.mark), normMark(e.mark)) <= 1 && normMark(x.mark).length >= 2);
      if (near.length === 1) { f = near[0]; markRight = false; }
    }
    if (!f) { rows.push({ mark: e.mark, page, found: false }); continue; }
    f._used = true;
    matched++;
    const checks = {
      mark: markRight,
      hardware_group: normGroup(f.hardware_group) === normGroup(e.hardware_group),
      width_inches: same(f.width_inches, e.width_inches),
      height_inches: same(f.height_inches, e.height_inches),
      fire_rating: normFire(f.fire_rating) === normFire(e.fire_rating),
      door_type: up(f.door_type) === up(e.door_type),
    };
    for (const k of DOOR_FIELDS) perField[k][checks[k] ? "right" : "wrong"]++;
    rows.push({ mark: e.mark, page, found: true, wrong: DOOR_FIELDS.filter((k) => !checks[k]).map((k) => k + ": expected " + JSON.stringify(e[k] ?? null) + ", read " + JSON.stringify(f[k] ?? null)) });
  }
  const extra = [...byPage.values()].flat().filter((x) => !x._used).map((x) => ({ page: x.page_number, mark: x.mark }));
  const fieldsTotal = matched * DOOR_FIELDS.length;
  const fieldsRight = Object.values(perField).reduce((n, f) => n + f.right, 0);
  return {
    expected_rows: expectedDoc.doors.length, rows_found: matched, rows_found_pct: +(100 * matched / expectedDoc.doors.length).toFixed(1),
    extra_rows: extra.length, extra_sample: extra.slice(0, 10),
    field_accuracy_pct: fieldsTotal ? +(100 * fieldsRight / fieldsTotal).toFixed(1) : null, per_field: perField,
    rows,
  };
}

const ITEM_FIELDS = ["qty", "description", "catalog", "finish", "mfr"];
const MFR_NAMES = { SEL: ["SELECT", "SEL"], SCH: ["SCHLAGE", "SCH"], LCN: ["LCN"], IVE: ["IVES", "IVE"], VON: ["VON DUPRIN", "VON"], VD: ["VON DUPRIN", "VD"], ZER: ["ZERO", "ZER"], GLY: ["GLYNN", "GLY"], NGP: ["NATIONAL GUARD", "NGP"], TRM: ["TRIMCO", "TRM"], DOR: ["DORMA", "DOR"], RCI: ["RCI"], "B/O": ["BY OTHERS", "B/O"] };
function mfrMatch(found, expected) {
  if (!expected) return !found;
  const f = up(found);
  if (!f) return false;
  const names = MFR_NAMES[expected] || [expected];
  return names.some((n) => f.includes(n)) || f === expected;
}
function itemSimilarity(e, c) {
  const cat = normCat(c.model || c.catalog_number || "");
  const ecat = normCat(e.catalog || "");
  const efirst = normCat(String(e.catalog || "").split(/[\s\/(]/)[0]);
  let s = 0;
  if (ecat && cat === ecat) s += 3;
  else if (efirst && efirst.length >= 3 && (cat.startsWith(efirst) || cat.includes(efirst))) s += 1.5;
  const desc = normText(c.description || c.component_type || "");
  if (desc && desc === normText(e.description)) s += 1;
  else if (desc && normText(e.description).includes(desc.split(" ")[0]) && desc.length > 3) s += 0.4;
  if (same(c.quantity, e.qty)) s += 0.3;
  if (up(c.finish) === up(e.finish)) s += 0.3;
  return s;
}
function scoreGroups(expectedDoc, sets, comps, foundDoors) {
  const setsPool = sets.map((s) => ({ ...s, _used: false }));
  const perField = Object.fromEntries(ITEM_FIELDS.map((f) => [f, { right: 0, wrong: 0 }]));
  const groups = [];
  let groupsFound = 0, itemsExpected = 0, itemsFound = 0, linkRight = 0, linkExpected = 0;
  for (const g of expectedDoc.groups) {
    // A set is the expected group when its number is the group id, or starts with it followed by
    // a separator (a heading read whole: "01-CARD READER EXTERIOR ..." is group 01).
    const gid = normGroup(g.group);
    let s = setsPool.find((x) => !x._used && normGroup(x.set_number) === gid);
    if (!s) s = setsPool.find((x) => !x._used && new RegExp("^" + gid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Z0-9]|$)").test(normGroup(x.set_number)));
    if (!s) s = setsPool.find((x) => !x._used && normGroup(x.set_number).split(/[^A-Z0-9]+/)[0] === gid.split(/[^A-Z0-9]+/)[0]);
    const scored = g.items.filter((it) => !it.catalog_uncertain);
    itemsExpected += scored.length;
    if (!s) { groups.push({ group: g.group, found: false, items_expected: scored.length }); continue; }
    s._used = true;
    groupsFound++;
    const pool = comps.filter((c) => c.set_number === s.set_number).map((c) => ({ ...c, _used: false }));
    const itemRows = [];
    for (const e of scored) {
      let best = null, bestS = 0;
      for (const c of pool) { if (c._used) continue; const sim = itemSimilarity(e, c); if (sim > bestS) { bestS = sim; best = c; } }
      if (!best || bestS < 1) { itemRows.push({ item: e.description + " " + (e.catalog || ""), found: false }); continue; }
      best._used = true;
      itemsFound++;
      const sup = e.superseded || {};
      const checks = {
        qty: same(best.quantity, e.qty) || (sup.qty != null && same(best.quantity, sup.qty)),
        description: normText(best.description || best.component_type) === normText(e.description) || (sup.description && normText(best.description || best.component_type) === normText(sup.description)) || normText(best.description || "") === normText(e.description + " (" + (sup.description || "") + ")"),
        catalog: normCat(best.model || best.catalog_number) === normCat(e.catalog) || (sup.catalog && normCat(best.model || best.catalog_number) === normCat(sup.catalog)),
        finish: up(best.finish) === up(e.finish) || (sup.finish && up(best.finish) === up(sup.finish)),
        mfr: mfrMatch(best.manufacturer, e.mfr),
      };
      for (const k of ITEM_FIELDS) perField[k][checks[k] ? "right" : "wrong"]++;
      itemRows.push({ item: e.description + " " + (e.catalog || ""), found: true, wrong: ITEM_FIELDS.filter((k) => !checks[k]).map((k) => k + ": expected " + JSON.stringify(e[k] ?? null) + ", read " + JSON.stringify(k === "qty" ? best.quantity : k === "description" ? (best.description || best.component_type) : k === "catalog" ? (best.model || best.catalog_number) : k === "mfr" ? best.manufacturer : best[k])) });
    }
    const extraItems = pool.filter((c) => !c._used).length;
    // Linking: the doors the door schedule gives this group vs the doors found carrying it.
    let link = null;
    if (g.doors && g.doors.length && foundDoors && foundDoors.length) {
      const have = new Set(foundDoors.filter((d) => normGroup(d.hardware_group) === normGroup(g.group) || normGroup(d.hardware_group) === normGroup(s.set_number)).map((d) => normMark(d.mark)));
      const hit = g.doors.filter((m) => have.has(normMark(m))).length;
      linkExpected += g.doors.length; linkRight += hit;
      link = { expected_doors: g.doors.length, linked: hit, set_door_count: s.door_count ?? null };
    }
    groups.push({ group: g.group, found: true, read_as: s.set_number, items_expected: scored.length, items_found: itemRows.filter((r) => r.found).length, extra_items: extraItems, link, items: itemRows });
  }
  const fieldsTotal = itemsFound * ITEM_FIELDS.length;
  const fieldsRight = Object.values(perField).reduce((n, f) => n + f.right, 0);
  return {
    expected_groups: expectedDoc.groups.length, groups_found: groupsFound, extra_groups: setsPool.filter((x) => !x._used).map((x) => x.set_number),
    expected_items: itemsExpected, items_found: itemsFound, items_found_pct: itemsExpected ? +(100 * itemsFound / itemsExpected).toFixed(1) : null,
    field_accuracy_pct: fieldsTotal ? +(100 * fieldsRight / fieldsTotal).toFixed(1) : null, per_field: perField,
    doors_linked: linkExpected ? { expected: linkExpected, linked: linkRight, pct: +(100 * linkRight / linkExpected).toFixed(1) } : null,
    groups,
  };
}

// ---------------------------------------------------------------- run
const started = new Date();
const docs = DOCS.filter((d) => !ONLY || ONLY.includes(d.id));
const report = { base: BASE, started_at: started.toISOString(), documents: [] };
const acct = await createAccount();
const sessions = [];
try {
  for (const doc of docs) {
    const entry = { id: doc.id, file: doc.file, reads: [], errors: [] };
    report.documents.push(entry);
    const expDoors = doc.doors ? JSON.parse(readFileSync(join(EXPECTED, doc.doors), "utf8")) : null;
    const expGroups = doc.groups ? JSON.parse(readFileSync(join(EXPECTED, doc.groups), "utf8")) : null;
    let s;
    try { s = await upload(acct, doc); } catch (e) { entry.errors.push(String(e.message)); continue; }
    sessions.push(s);
    entry.session = s.id; entry.total_pages = s.totalPages; entry.upload_ms = s.ms;
    // Where are the schedules? (the route exists only once the reader finds pages itself)
    const fp = await api(acct, "/api/hardware-schedule/session/" + s.id + "/find-pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const wantDoorPages = expDoors ? expDoors.source.pages : [];
    const wantHwPages = expGroups ? expGroups.source.pages : [];
    if (fp.status === 404 || fp.status === 405) {
      entry.find_pages = { available: false };
    } else {
      const d = fp.data || {};
      entry.find_pages = { available: fp.ok, status: fp.status, ms: fp.ms, door_schedule_pages: d.door_schedule_pages || null, hardware_pages: d.hardware_pages || null,
        door_pages_expected: wantDoorPages, hardware_pages_expected: wantHwPages,
        door_pages_right: wantDoorPages.length ? wantDoorPages.every((p) => (d.door_schedule_pages || []).includes(p)) : null,
        hardware_pages_right: wantHwPages.length ? wantHwPages.every((p) => (d.hardware_pages || []).includes(p)) : null,
        error: fp.ok ? null : JSON.stringify(d).slice(0, 200) };
    }
    const reads = [...wantDoorPages.map((p) => ({ page: p, type: "door_schedule" })), ...wantHwPages.map((p) => ({ page: p, type: "hardware_schedule" }))];
    // One runner session for the whole list (POST read-pages); page by page when the server
    // has no such route yet.
    const batch = await api(acct, "/api/hardware-schedule/session/" + s.id + "/read-pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: reads }) });
    if (batch.status !== 404 && batch.status !== 405) {
      entry.read_route = "read-pages";
      const results = (batch.data && batch.data.results) || [];
      for (const rd of reads) {
        const r = results.find((x) => x.page === rd.page);
        entry.reads.push({ page: rd.page, type: rd.type, status: batch.ok ? (r && r.ok ? 200 : 422) : batch.status, ms: r ? r.ms : batch.ms, ok: !!(batch.ok && r && r.ok),
          found: r && r.ok ? (r.type === "door_schedule" ? r.doors + " doors" : r.groups + " groups") : null, route: r && r.metadata ? r.metadata.extraction_mode : null,
          error: batch.ok ? (r ? r.error || null : "no result for this page") : JSON.stringify(batch.data).slice(0, 200) });
        process.stdout.write(doc.id + " p" + rd.page + " " + (r && r.ok ? "ok" : "fail") + " " + (r ? r.ms : batch.ms) + "ms\n");
      }
      entry.batch_ms = batch.ms;
    } else for (const rd of reads) {
      const r = await api(acct, "/api/hardware-schedule/session/" + s.id + "/page/" + rd.page + "?type=" + rd.type);
      const d = r.data || {};
      const inner = d.data || {};
      entry.reads.push({ page: rd.page, type: rd.type, status: r.status, ms: r.ms, ok: r.ok,
        found: r.ok ? (inner.schedule_type === "door_schedule" || Array.isArray(inner.entries) && !inner.hardware_groups ? (inner.entry_count ?? (inner.entries || []).length) + " doors" : (inner.hardware_groups || []).length + " groups") : null,
        route: inner.extraction_route || (inner.metadata && inner.metadata.extraction_route) || null,
        error: r.ok ? null : (d.error && (d.error.message || d.error)) + (d.detail ? " - " + d.detail : d.details ? " - " + d.details : "") });
      process.stdout.write(doc.id + " p" + rd.page + " " + r.status + " " + r.ms + "ms\n");
    }
    const rows = await api(acct, "/api/hardware-schedule/session/" + s.id + "/doors");
    if (!rows.ok) { entry.errors.push("doors route " + rows.status); continue; }
    const found = rows.data || {};
    try { const [k] = await d1("SELECT file_buffer_key FROM hardware_extraction_sessions WHERE id = " + q(s.id) + ";"); s.key = ((k.results || [])[0] || {}).file_buffer_key || null; } catch (_) { /* purge falls back to prefix */ }
    entry.found = { doors: (found.doors || []).map((d) => ({ page: (d.source && d.source.page) || d.page_number, row: d.source && d.source.table_row, mark: d.mark, hardware_group: d.hardware_group, width: d.width, width_inches: d.width_inches, height_inches: d.height_inches, fire_rating: d.fire_rating, door_type: d.door_type })), hardware_sets: found.hardware_sets || [], components: found.components || [] };
    if (expDoors) entry.doors = scoreDoors(expDoors, found.doors || []);
    if (expGroups) entry.hardware = scoreGroups(expGroups, found.hardware_sets || [], found.components || [], found.doors || []);
  }
} finally {
  report.cleanup = await purge(acct, sessions).catch((e) => ({ ok: false, error: String(e.message).slice(0, 300) }));
}
report.finished_at = new Date().toISOString();

const stamp = started.toISOString().slice(0, 16).replace(/[:T]/g, "-");
writeFileSync(join(here, "schedule_report_" + stamp + LABEL + ".json"), JSON.stringify(report, null, 1));
const pct = (x) => (x == null ? "n/a" : x + "%");
const md = ["# Schedule reading accuracy, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "", "Live API " + BASE + ". Ground truth: tools/corpus/expected (read by eye). Rows found = expected rows whose mark was read on the right page (a mark one character off still counts as found, with the mark field wrong). Field accuracy = right fields over the found rows' fields (doors: mark, hardware group, width, height, fire rating, door type; items: qty, description, catalog, finish, maker).", "",
  "| document | what | expected | found | rows found | field accuracy | extra | notes |", "|---|---|---|---|---|---|---|---|"];
for (const e of report.documents) {
  const reads = e.reads.map((r) => "p" + r.page + " " + (r.ok ? r.found : "HTTP " + r.status) + " " + Math.round(r.ms / 1000) + "s").join("; ");
  if (e.doors) md.push("| " + e.id + " | doors | " + e.doors.expected_rows + " | " + e.doors.rows_found + " | " + pct(e.doors.rows_found_pct) + " | " + pct(e.doors.field_accuracy_pct) + " | " + e.doors.extra_rows + " | " + reads + " |");
  if (e.hardware) md.push("| " + e.id + " | hardware items | " + e.hardware.expected_items + " (" + e.hardware.expected_groups + " groups) | " + e.hardware.items_found + " (" + e.hardware.groups_found + " groups) | " + pct(e.hardware.items_found_pct) + " | " + pct(e.hardware.field_accuracy_pct) + " | " + e.hardware.extra_groups.length + " groups | " + (e.hardware.doors_linked ? "doors linked " + e.hardware.doors_linked.linked + "/" + e.hardware.doors_linked.expected : "") + " |");
  if (!e.doors && !e.hardware) md.push("| " + e.id + " | - | | | | | | " + (e.errors.join("; ") || reads) + " |");
}
md.push("", "## Per field", "");
for (const e of report.documents) {
  if (e.doors) md.push("- " + e.id + " doors: " + Object.entries(e.doors.per_field).map(([k, v]) => k + " " + v.right + "/" + (v.right + v.wrong)).join(", "));
  if (e.hardware) md.push("- " + e.id + " items: " + Object.entries(e.hardware.per_field).map(([k, v]) => k + " " + v.right + "/" + (v.right + v.wrong)).join(", "));
  if (e.find_pages) md.push("- " + e.id + " find-pages: " + (e.find_pages.available ? "door " + JSON.stringify(e.find_pages.door_schedule_pages) + " (expected " + JSON.stringify(e.find_pages.door_pages_expected) + "), hardware " + JSON.stringify(e.find_pages.hardware_pages) + " (expected " + JSON.stringify(e.find_pages.hardware_pages_expected) + "), " + Math.round((e.find_pages.ms || 0) / 1000) + " s" : "route not available"));
  for (const r of e.reads) if (!r.ok) md.push("- " + e.id + " p" + r.page + ": HTTP " + r.status + " " + r.error);
}
md.push("", "## Wrong fields (first 40 per document)", "");
for (const e of report.documents) {
  const wrong = [];
  if (e.doors) for (const r of e.doors.rows) { if (!r.found) wrong.push(r.mark + " (p" + r.page + "): not found"); else for (const w of r.wrong) wrong.push(r.mark + ": " + w); }
  if (e.hardware) for (const g of e.hardware.groups) { if (!g.found) wrong.push("group " + g.group + ": not found"); else for (const it of g.items) { if (!it.found) wrong.push(g.group + " / " + it.item + ": not found"); else for (const w of it.wrong) wrong.push(g.group + " / " + it.item + ": " + w); } }
  if (wrong.length) md.push("- " + e.id + ": " + wrong.length + " wrong", ...wrong.slice(0, 40).map((w) => "  - " + w.replace(/\|/g, "/")));
}
md.push("", "Cleanup: " + JSON.stringify(report.cleanup).slice(0, 400), "");
writeFileSync(join(here, "schedule_report_" + stamp + LABEL + ".md"), md.join("\n"));
console.log(md.slice(0, 12).join("\n"));
console.log("cleanup", JSON.stringify(report.cleanup).slice(0, 300));
