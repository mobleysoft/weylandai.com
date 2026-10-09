// The five schedule tools on sale, each on a real audit document, live (2026-10-09).
//
// One written PASS or FAIL per tool, against a bar taken from what its pricing card
// (https://weylandai.com/pricing) promises; the card text is quoted in the report.
//
//   SubX       Rockford Bid 26-27 Addendum One (f0e863d88ea688ff.pdf): upload, find the
//              schedule pages, read them, build the submittal packet.
//   CutSheetX  real Rockford hardware items matched through POST /api/cut-sheets/match and
//              pasted through POST /api/cut-sheets/match-batch; plus items that are not in
//              the catalogue, which must come back as stated misses.
//   TakeoffX   the takeoff counts of the Rockford and Berryessa SubX sessions
//              (GET /api/hardware-schedule/session/:id/doors -> takeoff), against
//              tools/corpus/expected/*door-schedule*.json.
//   PropX      a proposal built from the Berryessa session (GET /api/proposals/sources/...,
//              POST /api/proposals/generate, GET /api/proposals/:id/download).
//   SightX     the corridor model for the Berryessa session (POST /api/sightx/model {subx},
//              as sightx-app.html builds it), saved and opened as a shared link
//              (POST/GET/DELETE /api/sightx/models).
//
// Sessions this script creates are deleted at the end (DELETE /api/hardware-schedule/session/:id);
// the shared SightX corridor is deleted too. A generated PropX proposal is stored on the account
// (PropX has no delete route); its id is in the report.
//
// Usage: node tools/accuracy/product_audit_schedule_tools.mjs --token-file <path>
//        [--cookie-file <netscape cookies>] [--only subx,cutsheetx,takeoffx,propx,sightx]
//        [--base https://weylandai.com] [--label x]
// The token is a paying test account's AuthFor bearer token (never printed). Writes
// product_audit_schedule_tools_<stamp>[_label].json and .md next to this file.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const ONLY = args.only ? String(args.only).split(",") : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const H = { Authorization: "Bearer " + TOKEN };
if (args["cookie-file"]) {
  const cookie = readFileSync(String(args["cookie-file"]), "utf8").split("\n").map((l) => l.replace(/^#HttpOnly_/, "").split("\t")).filter((p) => p.length >= 7).map((p) => p[5] + "=" + p[6]).join("; ");
  if (cookie) H.Cookie = cookie;
}
const CORPUS = join(REPO, "tools/corpus/door-schedules"), EXPECTED = join(REPO, "tools/corpus/expected");
const want = (id) => !ONLY || ONLY.includes(id);
const expected = (f) => JSON.parse(readFileSync(join(EXPECTED, f), "utf8"));

const DOCS = {
  rockford: { label: "Rockford Bid 26-27 Addendum One", file: join(CORPUS, "f0e863d88ea688ff.pdf"), doors: "rockford-a2.2-door-schedule.json", groups: "rockford-087100-hardware-groups.json" },
  berryessa: { label: "Berryessa Bid B-09-2023-24", file: join(CORPUS, "dd339f57b51538ed.pdf"), doors: "berryessa-a9.2-door-schedules.json", groups: "berryessa-087100-hardware-groups.json" },
};

// What each card says, as printed on /pricing (2026-10-09).
const CARDS = {
  subx: "Submittal Express. Reads a ruled door or hardware schedule table on the page you name, lists the doors and hardware sets with the page and row each came from, and builds the submittal PDF, attaching the cited document for items our catalogue covers. Full-size CAD sheets and spec-section hardware groups do not read yet.",
  cutsheetx: "Paste product lines as maker and model; CutsheetX matches what our catalogue covers (Allegion's brands plus NGP, BEA, Camden and Dyke) and cites the price-book or catalogue page for each match. Lines pasted as a spec prints them do not parse yet.",
  takeoffx: "Takeoff Express. Counts doors by type, size, fire rating and hardware group from your door schedule page, 18 to 40 seconds a page, with every count traced to its row. It reads schedules, not drawings.",
  propx: "Requires SubX · turns a submittal into a priced, sendable proposal. Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule.",
  sightx: "Spatial Project Intelligence. Builds a 3D corridor from your door schedule (a SubX session or a pasted schedule): each door at its scheduled size, material and fire rating, its hardware set drawn where it mounts, a door-by-door tour, and a link your GC can walk without an account. Doors stand in schedule order, not on your floor plan.",
};
const BARS = {
  subx: "find-pages names the schedule page (A2.2, p.29) and the 08 71 00 group pages (pp.17-23); every page reads; the doors read equal the 65 hand-read marks and each carries its page and row; the 14 hardware groups are read; the packet PDF is built and every item is either cited with a catalogue page or listed as a miss that says why and what is needed.",
  cutsheetx: "each real Rockford item (as maker + model) matches a product of that maker and cites a page or sheet whose document is that maker's and opens (HTTP 200); the same items pasted as lines give the same answers; an item the catalogue does not hold comes back unmatched with a stated reason.",
  takeoffx: "for each session the takeoff's door count and its counts by door type, size, fire rating and hardware group equal the tallies of the hand-read schedule, and every door row carries its page and table row; door pages read within the card's 40 s a page.",
  propx: "from the Berryessa session: the lines come from its doors (door lines total 24 openings, hardware lines total the 24 openings that name a set), generate returns a stored proposal whose PDF downloads (%PDF) and prints every line and its total, line totals and subtotal/tax/grand total are arithmetically consistent, and the proposal is priced: a grand total above $0, and no rate printed as a set's price that covers only some of its items without saying so (lines left at $0 for the estimator are allowed; the workspace says they print at $0).",
  sightx: "the corridor model built from the Berryessa session has 24 doors (the schedule's count, same marks), each at its scheduled size (42 x 94 in) and fire rating (120), each door's hardware set present in the model with items to draw, and the corridor saves to a link that opens without an account.",
};

async function api(path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json().catch(() => null) : null;
  return { ok: r.ok, status: r.status, data, ms: Date.now() - t0, res: r, ct };
}
const postJson = (path, body, extra = {}) => api(path, { method: "POST", headers: { "Content-Type": "application/json", ...(extra.headers || {}) }, body: JSON.stringify(body) });
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const up = (s) => String(s ?? "").toUpperCase().replace(/\s+/g, " ").trim();
const cleanMark = (m) => up(m).replace(/\s*\[P\.\d+\]$/, "");
const fireKey = (v) => { const s = up(v); if (!s || /^(-+|NONE|N\/?A|NR|N\/R)$/.test(s)) return "(none)"; const m = s.match(/^(\d{1,3})\s*(MIN\.?|MINUTES?)?$/); return m ? m[1] : s; };
const ftin = (i) => Math.floor(i / 12) + "'-" + Math.round(i % 12) + '"';
const sizeKey = (w, h) => (w != null && h != null ? ftin(Number(w)) + " x " + ftin(Number(h)) : "(none)");
function tally(rows, fn) { const m = {}; for (const r of rows) { const k = fn(r); m[k] = (m[k] || 0) + 1; } return m; }
function diffTally(got, exp) {
  const out = [];
  for (const k of new Set([...Object.keys(got), ...Object.keys(exp)])) if ((got[k] || 0) !== (exp[k] || 0)) out.push(k + ": read " + (got[k] || 0) + ", schedule " + (exp[k] || 0));
  return out;
}
function pdfText(buf, tag) {
  const f = join(here, ".audit-" + tag + ".pdf");
  writeFileSync(f, buf);
  try { return execFileSync("pdftotext", ["-layout", f, "-"], { maxBuffer: 64 * 1024 * 1024 }).toString(); } catch (_) { return null; } finally { try { rmSync(f); } catch (_) { /* fine */ } }
}

const report = { base: BASE, started_at: new Date().toISOString(), cards: CARDS, bars: BARS, sessions: {}, results: [] };
const sessions = {};

// ---- sessions: upload, find pages, read the schedule pages (door pages and group pages apart) ----
async function openSession(id) {
  const doc = DOCS[id];
  const s = { id, label: doc.label, errors: [] };
  report.sessions[id] = s;
  if (!existsSync(doc.file)) { s.errors.push("PDF not on this machine"); return s; }
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(doc.file)], { type: "application/pdf" }), id + ".pdf");
  fd.append("projectName", "schedule tools audit " + id + " " + new Date().toISOString().slice(0, 16));
  fd.append("document_type", "door_schedule");
  const u = await api("/api/hardware-schedule/start", { method: "POST", body: fd });
  s.upload = { status: u.status, ms: u.ms };
  if (!u.ok || !u.data || !u.data.sessionId) { s.errors.push("upload HTTP " + u.status + " " + JSON.stringify(u.data).slice(0, 200)); return s; }
  s.sid = u.data.sessionId;
  sessions[id] = s;
  const dExp = expected(doc.doors), gExp = expected(doc.groups);
  const fp = await api("/api/hardware-schedule/session/" + s.sid + "/find-pages", { method: "POST" });
  s.find = fp.ok && fp.data ? { status: fp.status, ms: fp.ms, door_schedule_pages: fp.data.door_schedule_pages || [], hardware_pages: fp.data.hardware_pages || [] } : { status: fp.status, ms: fp.ms, error: JSON.stringify(fp.data).slice(0, 200) };
  const rd = await postJson("/api/hardware-schedule/session/" + s.sid + "/read-pages", { pages: dExp.source.pages.map((page) => ({ page, type: "door_schedule" })) });
  s.read_doors = { status: rd.status, ms: rd.ms, pages: dExp.source.pages.length, per_page_s: Math.round(rd.ms / dExp.source.pages.length / 100) / 10, results: ((rd.data && rd.data.results) || []).map((r) => ({ page: r.page, ok: r.ok, type: r.type, doors: r.doors, error: r.error, read_source: r.metadata && r.metadata.read_source, ms: r.ms })) };
  const rg = await postJson("/api/hardware-schedule/session/" + s.sid + "/read-pages", { pages: gExp.source.pages.map((page) => ({ page, type: "hardware_schedule" })) });
  s.read_groups = { status: rg.status, ms: rg.ms, pages: gExp.source.pages.length, results: ((rg.data && rg.data.results) || []).map((r) => ({ page: r.page, ok: r.ok, type: r.type, groups: r.groups, items: r.items, error: r.error })) };
  return s;
}
async function doorsOf(s) {
  const d = await api("/api/hardware-schedule/session/" + s.sid + "/doors");
  return d.ok ? d.data : null;
}

// ---- SubX ----
async function auditSubx() {
  const out = { id: "subx", label: "SubX", doc: DOCS.rockford.label + " (A2.2 p.29; 08 71 00 pp.17-23)", pass: false, checks: {} };
  const s = sessions.rockford;
  if (!s) { out.summary = "the session did not open: " + (report.sessions.rockford ? report.sessions.rockford.errors.join("; ") : "not run"); return out; }
  const dExp = expected(DOCS.rockford.doors), gExp = expected(DOCS.rockford.groups);
  const found = s.find || {};
  const foundDoor = dExp.source.pages.every((p) => (found.door_schedule_pages || []).includes(p));
  const foundHw = gExp.source.pages.filter((p) => (found.hardware_pages || []).includes(p));
  out.checks.find_pages = { door_page_found: foundDoor, hardware_pages_found: foundHw.length + " of " + gExp.source.pages.length, door_schedule_pages: found.door_schedule_pages, hardware_pages: found.hardware_pages, status: found.status };
  const readFails = [...(s.read_doors.results || []), ...(s.read_groups.results || [])].filter((r) => !r.ok);
  out.checks.read = { door_pages_ms: s.read_doors.ms, group_pages_ms: s.read_groups.ms, failed: readFails.map((r) => "p" + r.page + ": " + r.error) };
  const d = await doorsOf(s);
  const rows = (d && d.doors) || [];
  const got = rows.map((r) => cleanMark(r.mark));
  const exp = dExp.doors.map((r) => cleanMark(r.mark));
  const missing = exp.filter((m) => !got.includes(m)), extra = got.filter((m) => !exp.includes(m));
  const traced = rows.filter((r) => r.source && r.source.page != null && r.source.table_row != null).length;
  const groupsRead = (d && d.hardware_sets) || [];
  out.checks.doors = { read: rows.length, schedule: dExp.door_count, missing, extra, with_page_and_row: traced };
  out.checks.groups = { read: groupsRead.length, schedule: gExp.group_count, set_numbers: groupsRead.map((g) => g.set_number) };
  const pk = await postJson("/api/hardware-schedule/session/" + s.sid + "/submittal-pdf", { preparedBy: "Schedule tools audit harness" });
  let packet = null;
  if (pk.ok && pk.data) {
    const cs = pk.data.cut_sheet_matching || {};
    const misses = cs.missing || [];
    packet = { ms: pk.ms, total_pages: pk.data.totalPages, components: cs.components, cited: cs.matched, missed: cs.unmatched, misses_without_why_or_need: misses.filter((m) => !m.reason || !m.need).length, misses: misses.map((m) => [m.manufacturer, m.model].filter(Boolean).join(" ") + " - " + m.reason) };
    const pdf = await fetch(BASE + "/api/hardware-schedule/session/" + s.sid + "/submittal-pdf", { headers: H });
    if (pdf.ok) {
      const buf = Buffer.from(await pdf.arrayBuffer());
      const text = pdfText(buf, "subx");
      packet.pdf = { status: pdf.status, bytes: buf.length, is_pdf: buf.subarray(0, 4).toString() === "%PDF", pages: text ? text.split("\f").length - 1 : null };
    } else packet.pdf = { status: pdf.status };
  } else packet = { status: pk.status, error: JSON.stringify(pk.data).slice(0, 300) };
  out.checks.packet = packet;
  const fails = [];
  if (!foundDoor) fails.push("find-pages did not name the door schedule page " + dExp.source.pages.join(","));
  if (foundHw.length < gExp.source.pages.length) fails.push("find-pages named " + foundHw.length + " of " + gExp.source.pages.length + " group pages");
  if (readFails.length) fails.push(readFails.length + " page(s) failed to read");
  if (rows.length !== dExp.door_count || missing.length || extra.length) fails.push("doors read " + rows.length + " vs " + dExp.door_count + " (missing " + missing.length + ", extra " + extra.length + ")");
  if (traced !== rows.length) fails.push((rows.length - traced) + " door rows without page and row");
  if (groupsRead.length !== gExp.group_count) fails.push("groups read " + groupsRead.length + " vs " + gExp.group_count);
  if (!packet || !packet.pdf || !packet.pdf.is_pdf) fails.push("packet PDF not built");
  else if (packet.cited + packet.missed !== packet.components || packet.misses_without_why_or_need) fails.push("packet items not all accounted for");
  out.fails = fails;
  out.pass = !fails.length;
  out.summary = "pages found: door " + (foundDoor ? "yes" : "no") + ", groups " + foundHw.length + "/" + gExp.source.pages.length + "; doors " + rows.length + "/" + dExp.door_count + " (" + traced + " with page+row); groups " + groupsRead.length + "/" + gExp.group_count + (packet && packet.components != null ? "; packet " + packet.total_pages + " pp, " + packet.cited + " of " + packet.components + " items cited, " + packet.missed + " stated misses, " + Math.round(packet.ms / 1000) + " s" : "; packet failed") + (fails.length ? ". FAIL: " + fails.join("; ") : "");
  return out;
}

// ---- CutSheetX ----
// Real Rockford 08 71 00 items (maker + model as the group lines name them) and the maker
// words its cited document must carry.
const CS_ITEMS = [
  { manufacturer: "LCN", model: "4040XP", type: "closer", maker: /\bLCN\b/i },
  { manufacturer: "Von Duprin", model: "99", type: "exit device", maker: /von\s*duprin/i },
  { manufacturer: "Ives", model: "8400", type: "kick plate", maker: /\bives\b/i },
  { manufacturer: "Schlage", model: "ND40", type: "lockset", maker: /schlage/i },
  { manufacturer: "Select", model: "SL11", type: "continuous hinge", maker: /select/i },
  { manufacturer: "Zero", model: "188SBK", type: "gasketing", maker: /\bzero\b/i },
  { manufacturer: "Ives", model: "WS406/407CCV", type: "wall stop", maker: /\bives\b/i },
  { manufacturer: "Schlage", model: "ALX53", type: "lockset", maker: /schlage/i },
  { manufacturer: "Glynn-Johnson", model: "100S", type: "overhead stop", maker: /glynn/i },
  { manufacturer: "Von Duprin", model: "EPT10", type: "power transfer", maker: /von\s*duprin/i },
];
const CS_UNKNOWN = [
  { manufacturer: "Acme Doorworks", model: "ZX-4471", why: "a maker the catalogue does not hold" },
  { manufacturer: "LCN", model: "9977QZ", why: "a known maker, a model it does not make" },
];
// "The page": one page, or a run of at most three (a product spread); "pp.6-48" or no page is not.
function pageSpecific(p) {
  const m = String(p ?? "").match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  return !!m && (!m[2] || Number(m[2]) - Number(m[1]) <= 2);
}
const makerOk = (re, ...texts) => texts.some((t) => t && re.test(String(t)));
async function opens(url) {
  if (!url) return { status: null };
  const r = await fetch(new URL(url, BASE), { headers: H });
  const ct = r.headers.get("content-type") || "";
  try { await r.body?.cancel(); } catch (_) { /* fine */ }
  return { status: r.status, type: ct.split(";")[0] };
}
async function auditCutsheetx() {
  const out = { id: "cutsheetx", label: "CutSheetX", doc: "Rockford 08 71 00 items (" + CS_ITEMS.length + " real, " + CS_UNKNOWN.length + " not in catalogue)", pass: false, items: [], unknown: [] };
  for (const it of CS_ITEMS) {
    const r = await postJson("/api/cut-sheets/match", { manufacturer: it.manufacturer, model: it.model, component_type: it.type });
    const d = r.data || {};
    const c = d.citation || null;
    const open = c ? await opens(c.url) : { status: null };
    const rightMaker = !!d.matched && makerOk(it.maker, d.product && d.product.manufacturer) && makerOk(it.maker, c && c.title, d.product && d.product.manufacturer);
    const docMaker = !!c && makerOk(it.maker, c.title);
    const pageOk = !!c && pageSpecific(c.page);
    const row = { item: it.manufacturer + " " + it.model, http: r.status, ms: r.ms, matched: !!d.matched, page_specific: pageOk, product: d.product ? (d.product.manufacturer + " " + d.product.model) : null, matchType: d.matchType || null, citation: c ? { kind: c.kind, title: c.title, page: c.page } : null, citation_opens: open.status, citation_type: open.type || null, right_maker: rightMaker, doc_names_maker: docMaker };
    row.pass = r.ok && row.matched && rightMaker && docMaker && open.status === 200 && pageOk;
    const whys = [];
    if (!r.ok) whys.push("HTTP " + r.status);
    else if (!row.matched) whys.push("no match: " + (d.reasonText || d.reason || "no reason"));
    else {
      if (!rightMaker) whys.push("matched another maker's product");
      if (!c) whys.push("matched but no page or sheet cited");
      else {
        if (!docMaker) whys.push("cited document does not name the maker (" + c.title + ")");
        if (open.status !== 200) whys.push(c.url ? "citation did not open (HTTP " + open.status + ")" : "cited " + c.title + " p." + c.page + " has no PDF on file (no link to open)");
        if (!pageOk) whys.push("cites no specific page (" + (c.page == null ? "page null" : "pp." + c.page) + " of " + c.title.split(" (")[0] + ")");
      }
    }
    if (!row.pass) row.why = whys.join("; ");
    out.items.push(row);
  }
  for (const it of CS_UNKNOWN) {
    const r = await postJson("/api/cut-sheets/match", { manufacturer: it.manufacturer, model: it.model });
    const d = r.data || {};
    const row = { item: it.manufacturer + " " + it.model, kind: it.why, http: r.status, matched: !!d.matched, product: d.product ? d.product.manufacturer + " " + d.product.model : null, reason: d.reason || null, reasonText: d.reasonText || null, need: d.need || null };
    row.pass = r.ok && !row.matched && !!(row.reason || row.reasonText);
    out.unknown.push(row);
  }
  // The same items pasted as lines (the card's "Paste product lines as maker and model").
  const text = [...CS_ITEMS, ...CS_UNKNOWN].map((x) => x.manufacturer + " " + x.model).join("\n");
  const b = await postJson("/api/cut-sheets/match-batch", { text });
  const res = (b.data && b.data.results) || [];
  const pasteRows = [...CS_ITEMS, ...CS_UNKNOWN].map((x) => {
    const want = (x.manufacturer + " " + x.model).toUpperCase();
    const hit = res.find((r) => String(r.raw || "").toUpperCase() === want) || null;
    return { item: x.manufacturer + " " + x.model, found: !!hit, matched: hit ? !!hit.matched : null, citation: hit && hit.citation ? hit.citation.title + " p." + hit.citation.page : null };
  });
  const single = new Map([...out.items, ...out.unknown].map((r) => [r.item, r]));
  const disagree = pasteRows.filter((p) => !p.found || p.matched !== single.get(p.item).matched || (p.matched && single.get(p.item).citation && p.citation !== single.get(p.item).citation.title + " p." + single.get(p.item).citation.page));
  out.paste = { http: b.status, ms: b.ms, lines: res.length, summary: b.data && b.data.summary, skipped: (b.data && b.data.skipped || []).length, disagree };
  const nOk = out.items.filter((r) => r.pass).length, uOk = out.unknown.filter((r) => r.pass).length;
  const fails = [];
  for (const r of out.items.filter((x) => !x.pass)) fails.push(r.item + ": " + r.why);
  for (const r of out.unknown.filter((x) => !x.pass)) fails.push(r.item + " (" + r.kind + "): " + (r.matched ? "answered as a match (" + r.product + ")" : "no reason stated"));
  if (b.status !== 200) fails.push("paste HTTP " + b.status);
  for (const p of disagree) fails.push("paste of " + p.item + " differs from the single match (" + (p.found ? (p.matched ? p.citation : "unmatched") : "line not read") + ")");
  out.fails = fails;
  out.pass = !fails.length;
  out.summary = nOk + " of " + CS_ITEMS.length + " items matched to the right maker with an opening citation; " + uOk + " of " + CS_UNKNOWN.length + " unknown items stated as misses; paste agrees on " + (pasteRows.length - disagree.length) + " of " + pasteRows.length + (fails.length ? ". FAIL: " + fails.join("; ") : "");
  return out;
}

// ---- TakeoffX ----
async function auditTakeoffx() {
  const out = { id: "takeoffx", label: "TakeoffX", doc: "Rockford A2.2 (65 doors) and Berryessa A9.2 x3 (24 doors)", pass: false, sessions: [] };
  const fails = [];
  for (const id of ["rockford", "berryessa"]) {
    const s = sessions[id];
    if (!s) { fails.push(id + ": session did not open"); continue; }
    const exp = expected(DOCS[id].doors);
    const d = await doorsOf(s);
    if (!d) { fails.push(id + ": doors not readable"); continue; }
    const t = d.takeoff || {};
    const asMap = (list, keyFn) => { const m = {}; for (const x of list || []) { const k = keyFn(x.value); m[k] = (m[k] || 0) + x.count; } return m; };
    // The takeoff omits empty values; the schedule tallies include them, so the read rows are
    // tallied the same way for the "(none)" bucket.
    const rows = d.doors || [];
    const got = {
      door_type: asMap(t.by_door_type, up),
      size: asMap(t.by_size, (v) => up(v)),
      fire_rating: asMap(t.by_fire_rating, fireKey),
      hardware_group: asMap(t.by_hardware_group, up),
    };
    const none = { door_type: rows.filter((r) => !r.door_type).length, size: rows.filter((r) => r.width_inches == null || r.height_inches == null).length, fire_rating: rows.filter((r) => fireKey(r.fire_rating) === "(none)").length, hardware_group: rows.filter((r) => !r.hardware_group).length };
    for (const k of Object.keys(none)) if (none[k]) got[k]["(none)"] = (got[k]["(none)"] || 0) + none[k];
    const want = {
      door_type: tally(exp.doors, (r) => (r.door_type ? up(r.door_type) : "(none)")),
      size: tally(exp.doors, (r) => up(sizeKey(r.width_inches, r.height_inches))),
      fire_rating: tally(exp.doors, (r) => fireKey(r.fire_rating)),
      hardware_group: tally(exp.doors, (r) => (r.hardware_group ? up(r.hardware_group) : "(none)")),
    };
    const diffs = {};
    for (const k of Object.keys(want)) diffs[k] = diffTally(got[k], want[k]);
    const traced = rows.filter((r) => r.source && r.source.page != null && r.source.table_row != null).length;
    const keyOf = (page, mark) => (id === "berryessa" ? page + ":" : "") + cleanMark(mark);
    const byKey = new Map(rows.map((r) => [keyOf(r.source && r.source.page != null ? r.source.page : r.page_number, r.mark), r]));
    const doorDiffs = [];
    for (const e of exp.doors) {
      const r = byKey.get(keyOf(e.page, e.mark));
      const label = (id === "berryessa" ? "p." + e.page + " " : "") + e.mark;
      if (!r) { doorDiffs.push(label + ": not read"); continue; }
      if (up(r.door_type) !== up(e.door_type)) doorDiffs.push(label + ": door type read " + JSON.stringify(r.door_type) + ", schedule " + JSON.stringify(e.door_type));
      if (sizeKey(r.width_inches, r.height_inches) !== sizeKey(e.width_inches, e.height_inches)) doorDiffs.push(label + ": size read " + sizeKey(r.width_inches, r.height_inches) + ", schedule " + sizeKey(e.width_inches, e.height_inches));
      if (fireKey(r.fire_rating) !== fireKey(e.fire_rating)) doorDiffs.push(label + ": rating read " + JSON.stringify(r.fire_rating) + ", schedule " + JSON.stringify(e.fire_rating));
      if (up(r.hardware_group) !== up(e.hardware_group)) doorDiffs.push(label + ": group read " + JSON.stringify(r.hardware_group) + ", schedule " + JSON.stringify(e.hardware_group));
    }
    const one = { door_diffs: doorDiffs, id, label: DOCS[id].label, session: s.sid, doors: t.doors, schedule_doors: exp.door_count, traced_to_row: traced, read_s_per_page: s.read_doors.per_page_s, read_pages: s.read_doors.results, diffs };
    out.sessions.push(one);
    const f = [];
    if (t.doors !== exp.door_count) f.push("door count " + t.doors + " vs " + exp.door_count);
    for (const k of Object.keys(diffs)) if (diffs[k].length) f.push("by " + k.replace("_", " ") + " differs (" + diffs[k].slice(0, 6).join("; ") + (diffs[k].length > 6 ? "; +" + (diffs[k].length - 6) + " more" : "") + ")");
    if (traced !== rows.length) f.push((rows.length - traced) + " of " + rows.length + " doors not traced to a row");
    if (s.read_doors.per_page_s > 40) f.push("door pages read at " + s.read_doors.per_page_s + " s a page (card: 18 to 40)");
    one.fails = f;
    if (doorDiffs.length) f.push("doors: " + doorDiffs.slice(0, 8).join("; "));
    for (const x of f) fails.push(id + ": " + x);
  }
  out.fails = fails;
  out.pass = !fails.length && out.sessions.length === 2;
  out.summary = out.sessions.map((x) => x.id + " " + x.doors + "/" + x.schedule_doors + " doors, " + Object.values(x.diffs).filter((v) => !v.length).length + " of 4 breakdowns exact, " + x.traced_to_row + " traced to row, " + x.read_s_per_page + " s/page").join("; ") + (fails.length ? ". FAIL: " + fails.join("; ") : "");
  return out;
}

// ---- PropX ----
async function auditPropx() {
  const out = { id: "propx", label: "PropX", doc: DOCS.berryessa.label + " (session read from A9.2 and 08 71 00)", pass: false };
  const s = sessions.berryessa;
  if (!s) { out.summary = "the session did not open"; return out; }
  const exp = expected(DOCS.berryessa.doors);
  // SubX prices the read items in the background after read-pages; give it a moment.
  await sleep(15000);
  const src = await api("/api/proposals/sources/session/" + encodeURIComponent(s.sid));
  if (!src.ok || !src.data) { out.summary = "sources HTTP " + src.status; out.fails = [out.summary]; return out; }
  const lines = src.data.lines || [];
  const sum = (k) => lines.filter((l) => l.kind === k).reduce((n, l) => n + (Number(l.quantity) || 0), 0);
  out.lines = lines.map((l) => ({ kind: l.kind, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, priceSource: l.priceSource }));
  out.source_doors = (src.data.doors || []).length;
  const body = { source: { kind: "session", id: s.sid }, lineItems: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, material: l.material, size: l.size, fireRating: l.fireRating, notes: l.notes })), clientName: "Audit Harness GC", projectAddress: "Berryessa Union School District, San Jose, CA", validityDays: 30, taxRate: 0.0925, rfpReference: "B-09-2023-24" };
  const g = await postJson("/api/proposals/generate", body);
  const d = g.data || {};
  out.generate = { http: g.status, ms: g.ms, paid: d.paid, stored: d.stored, proposalId: d.proposalId || null, quoteNumber: d.quoteNumber ?? null, doorCount: d.doorCount, lineItemCount: d.lineItemCount, subtotal: d.subtotal, taxAmount: d.taxAmount, grandTotal: d.grandTotal, error: g.ok ? null : JSON.stringify(d).slice(0, 300) };
  const cents = (n) => Math.round(n * 100) / 100;
  const subtotal = cents(lines.reduce((n, l) => n + cents((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)), 0));
  const consistent = g.ok && cents(d.subtotal) === subtotal && cents(d.taxAmount) === cents(subtotal * 0.0925) && cents(d.grandTotal) === cents(d.subtotal + d.taxAmount);
  const priced = lines.filter((l) => Number(l.unitPrice) > 0).length;
  out.arith = { expected_subtotal: subtotal, consistent, lines_priced: priced + " of " + lines.length };
  let pdf = null;
  if (d.downloadUrl || d.pdfBase64) {
    let buf;
    if (d.pdfBase64) buf = Buffer.from(d.pdfBase64, "base64");
    else { const r = await fetch(BASE + d.downloadUrl, { headers: H }); pdf = { http: r.status }; buf = r.ok ? Buffer.from(await r.arrayBuffer()) : null; }
    if (buf) {
      const text = pdfText(buf, "propx") || "";
      const money = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      pdf = Object.assign(pdf || {}, { bytes: buf.length, is_pdf: buf.subarray(0, 4).toString() === "%PDF", pages: text.split("\f").length - 1, prints_grand_total: text.includes(money(d.grandTotal)), prints_client: text.includes("Audit Harness GC"), lines_printed: lines.filter((l) => text.includes("$" + money(cents((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))))).length, partial_note_printed: /\bof \d+ components\b|not (all|every)[^.]*priced|unpriced|partial/i.test(text), has_signature_block: /signature|accepted by|authorized/i.test(text), has_terms: /terms|valid|exclusion/i.test(text) });
    }
  }
  out.pdf = pdf;
  const fails = [];
  if (out.source_doors !== exp.door_count) fails.push("the source has " + out.source_doors + " doors, schedule " + exp.door_count);
  if (sum("door") !== exp.door_count) fails.push("door lines total " + sum("door") + " openings, schedule " + exp.door_count);
  const withSet = exp.doors.filter((x) => x.hardware_group).length;
  if (sum("hardware") !== withSet) fails.push("hardware lines total " + sum("hardware") + " openings, schedule " + withSet);
  if (!g.ok || d.paid === false) fails.push("generate " + (g.ok ? "returned no PDF (payment required)" : "HTTP " + g.status));
  if (g.ok && d.doorCount !== exp.door_count) fails.push("proposal doorCount " + d.doorCount);
  if (!consistent) fails.push("totals not consistent (subtotal " + d.subtotal + " vs lines " + subtotal + ")");
  if (!pdf || !pdf.is_pdf) fails.push("no proposal PDF");
  else if (!pdf.prints_grand_total) fails.push("the PDF does not print the grand total " + d.grandTotal);
  if (pdf && pdf.is_pdf && pdf.lines_printed !== lines.length) fails.push("the PDF prints " + pdf.lines_printed + " of " + lines.length + " line amounts");
  // A set priced from some of its components is printed as the set's rate; the reader must be told.
  const partial = lines.filter((l) => /(\d+) of (\d+) components/.test(String(l.priceSource || "")));
  out.arith.partial_set_prices = partial.map((l) => l.description + " $" + l.unitPrice + " (" + l.priceSource + ")");
  if (partial.length && !(pdf && pdf.partial_note_printed)) fails.push(partial.map((l) => l.description + " is printed at $" + l.unitPrice + " an opening, which prices " + String(l.priceSource).replace(/ priced on the schedule$/, "") + "; the PDF does not say the rest are unpriced").join("; "));
  const zero = lines.filter((l) => !(Number(l.unitPrice) > 0));
  out.arith.zero_lines = zero.map((l) => l.description + " x" + l.quantity);
  if (!(Number(d.grandTotal) > 0)) fails.push("not priced: every line came at $0 (" + priced + " of " + lines.length + " lines priced), grand total $" + d.grandTotal);
  out.fails = fails;
  out.pass = !fails.length;
  out.summary = lines.length + " lines (door " + sum("door") + ", frame " + sum("frame") + ", hardware " + sum("hardware") + " openings), " + priced + " priced; subtotal $" + d.subtotal + ", tax $" + d.taxAmount + ", total $" + d.grandTotal + (pdf && pdf.is_pdf ? "; PDF " + Math.round(pdf.bytes / 1024) + " KB, " + pdf.pages + " pp" : "") + ", " + Math.round(g.ms / 1000) + " s" + (fails.length ? ". FAIL: " + fails.join("; ") : "");
  return out;
}

// ---- SightX ----
async function auditSightx() {
  const out = { id: "sightx", label: "SightX", doc: DOCS.berryessa.label + " (session, 24 doors on 3 sheets)", pass: false };
  const s = sessions.berryessa;
  if (!s) { out.summary = "the session did not open"; return out; }
  const exp = expected(DOCS.berryessa.doors);
  const d = await doorsOf(s);
  const m = await postJson("/api/sightx/model", { subx: { session: d.session, doors: d.doors, components: d.components } }, { headers: {} });
  const model = (m.data && m.data.model) || { doors: [], sets: {} };
  const doors = model.doors || [];
  const expMarks = exp.doors.map((x) => x.page + ":" + cleanMark(x.mark)).sort();
  const gotMarks = doors.map((x) => x.source_page + ":" + cleanMark(x.mark)).sort();
  const sameMarks = JSON.stringify(expMarks) === JSON.stringify(gotMarks);
  const sized = doors.filter((x) => x.size_known && x.width_in === 42 && x.height_in === 94).length;
  const rated = doors.filter((x) => fireKey(x.rating) === "120").length;
  const setKeys = Object.keys(model.sets || {});
  const withHw = doors.filter((x) => x.set && model.sets[x.set] && model.sets[x.set].length).length;
  out.model = { http: m.status, ms: m.ms, doors: doors.length, schedule_doors: exp.door_count, same_marks: sameMarks, sized_42x94: sized, rated_120: rated, sets_in_model: setKeys, door_sets: [...new Set(doors.map((x) => x.set))], doors_with_hardware_drawn: withHw, notes: model.notes };
  // The link a GC walks: save, open without auth, delete.
  const sv = await postJson("/api/sightx/models", { name: "schedule tools audit " + new Date().toISOString().slice(0, 16), model });
  let link = { save_http: sv.status };
  if (sv.ok && sv.data && sv.data.id) {
    const r = await fetch(BASE + "/api/sightx/models/" + encodeURIComponent(sv.data.id));
    const j = await r.json().catch(() => null);
    link = { ...link, url: sv.data.url, open_without_account_http: r.status, doors_in_link: j && j.model ? j.model.doors.length : null };
    const del = await api("/api/sightx/models/" + encodeURIComponent(sv.data.id), { method: "DELETE" });
    link.cleanup = del.ok ? "deleted" : "HTTP " + del.status;
  } else link.error = JSON.stringify(sv.data).slice(0, 200);
  out.link = link;
  const fails = [];
  if (doors.length !== exp.door_count) fails.push("doors " + doors.length + " vs schedule " + exp.door_count);
  if (!sameMarks) fails.push("door marks differ from the schedule's");
  if (sized !== exp.door_count) fails.push(sized + " of " + exp.door_count + " doors at the scheduled 42 x 94 in");
  if (rated !== exp.door_count) fails.push(rated + " of " + exp.door_count + " doors carry the 120 rating");
  if (withHw !== exp.door_count) fails.push(withHw + " of " + exp.door_count + " doors have their hardware set in the model: the doors name sets " + out.model.door_sets.join(", ") + " and the model keys the read groups as " + (setKeys.join(", ") || "none") + " (keys compared as printed, so \"2\" never finds \"02\"); no hardware is drawn on any door");
  if (link.open_without_account_http !== 200 || link.doors_in_link !== doors.length) fails.push("shared link " + (link.open_without_account_http ? "opened HTTP " + link.open_without_account_http + " with " + link.doors_in_link + " doors" : "not saved (HTTP " + link.save_http + ")"));
  out.fails = fails;
  out.pass = !fails.length;
  out.summary = doors.length + "/" + exp.door_count + " doors" + (sameMarks ? " (same marks)" : "") + ", " + sized + " at 42x94, " + rated + " rated 120, " + withHw + " with hardware drawn; shared link " + (link.open_without_account_http === 200 ? "opens with " + link.doors_in_link + " doors" : "failed") + (fails.length ? ". FAIL: " + fails.join("; ") : "");
  return out;
}

try {
  if (want("subx") || want("takeoffx")) await openSession("rockford");
  if (want("takeoffx") || want("propx") || want("sightx")) await openSession("berryessa");
  if (want("subx")) report.results.push(await auditSubx());
  if (want("cutsheetx")) report.results.push(await auditCutsheetx());
  if (want("takeoffx")) report.results.push(await auditTakeoffx());
  if (want("propx")) report.results.push(await auditPropx());
  if (want("sightx")) report.results.push(await auditSightx());
} catch (e) {
  report.error = String(e && e.stack || e);
} finally {
  for (const s of Object.values(sessions)) {
    const del = await api("/api/hardware-schedule/session/" + s.sid, { method: "DELETE" });
    s.cleanup = del.ok ? "deleted" : "HTTP " + del.status;
  }
}
report.finished_at = new Date().toISOString();

const stamp = report.started_at.slice(0, 16).replace(/[:T]/g, "-");
const esc = (t) => String(t ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const md = ["# The five schedule tools on their audit documents, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "",
  "Live API " + BASE + ", as a paying test account. Pass = the bar below, taken from each tool's pricing card. Script: tools/accuracy/product_audit_schedule_tools.mjs.", "",
  "| tool | document | result | numbers |", "|---|---|---|---|"];
for (const r of report.results) md.push("| " + r.label + " | " + esc(r.doc) + " | " + (r.pass ? "PASS" : "FAIL") + " | " + esc(r.summary) + " |");
if (report.error) md.push("", "Harness error: " + report.error.split("\n")[0]);
md.push("");
for (const r of report.results) {
  md.push("## " + r.label + ": " + (r.pass ? "PASS" : "FAIL"), "", "Card: \"" + CARDS[r.id] + "\"", "", "Bar: " + BARS[r.id], "");
  if (r.fails && r.fails.length) { md.push("Why it fails:", ""); for (const f of r.fails) md.push("- " + f); md.push(""); }
  if (r.id === "cutsheetx") {
    md.push("| item | matched | product | cited | opens | result |", "|---|---|---|---|---|---|");
    for (const x of r.items) md.push("| " + esc(x.item) + " | " + x.matched + " | " + esc(x.product) + " | " + esc(x.citation ? x.citation.kind + ": " + x.citation.title + " p." + x.citation.page : "") + " | " + (x.citation_opens ?? "") + " | " + (x.pass ? "PASS" : "FAIL: " + esc(x.why)) + " |");
    for (const x of r.unknown) md.push("| " + esc(x.item) + " (" + x.kind + ") | " + x.matched + " | " + esc(x.product) + " | " + esc(x.reasonText || x.reason) + " | | " + (x.pass ? "PASS (stated miss)" : "FAIL") + " |");
    md.push("", "Paste of the same " + (CS_ITEMS.length + CS_UNKNOWN.length) + " lines: HTTP " + r.paste.http + ", " + r.paste.lines + " lines read, " + r.paste.disagree.length + " disagree with the single match.", "");
  }
  if (r.id === "takeoffx") for (const x of r.sessions) {
    md.push("- " + x.label + ": " + x.doors + " doors (schedule " + x.schedule_doors + "), " + x.traced_to_row + " traced to page and row, door pages " + x.read_s_per_page + " s a page" + (x.read_pages || []).map((p) => " [p" + p.page + " " + (p.ok ? p.doors + " doors via " + p.read_source : "failed") + "]").join(""));
    for (const [k, v] of Object.entries(x.diffs)) md.push("  - by " + k.replace("_", " ") + ": " + (v.length ? v.join("; ") : "exact"));
    if (x.door_diffs && x.door_diffs.length) md.push("  - doors that differ from the schedule: " + x.door_diffs.join("; "));
  }
  if (r.id === "takeoffx") md.push("");
  if (r.id === "propx") {
    md.push("| line | qty | unit price | price source |", "|---|---|---|---|");
    for (const l of r.lines || []) md.push("| " + esc(l.description) + " | " + l.quantity + " | " + l.unitPrice + " | " + esc(l.priceSource) + " |");
    md.push("", "Generate: " + esc(JSON.stringify(r.generate)), "", "PDF: " + esc(JSON.stringify(r.pdf)), "");
  }
  if (r.id === "sightx") md.push("Model: " + esc(JSON.stringify(r.model)), "", "Link: " + esc(JSON.stringify(r.link)), "");
  if (r.id === "subx") md.push("Checks: " + esc(JSON.stringify(r.checks)), "");
}
md.push("Sessions created and deleted: " + Object.values(report.sessions).map((s) => s.id + " " + (s.sid || "-") + " " + (s.cleanup || (s.errors || []).join("; "))).join("; "));
writeFileSync(join(here, "product_audit_schedule_tools_" + stamp + LABEL + ".json"), JSON.stringify(report, null, 2));
writeFileSync(join(here, "product_audit_schedule_tools_" + stamp + LABEL + ".md"), md.join("\n") + "\n");
console.log(md.join("\n"));
