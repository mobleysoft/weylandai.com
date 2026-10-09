// weyland-forms-worker/src/routes/pricex.js
//
// PriceX (2026-10-08): list prices from the makers' own price books, and the
// customer's SubX schedule priced at their own multipliers.
//   GET  /api/forms/pricex/lookup?maker=&model=&finish=   one item's list price and its book (free)
//   GET  /api/forms/pricex/multipliers                     the account's multipliers
//   POST /api/forms/pricex/multipliers                     {default, byMaker: {maker: m}}
//   POST /api/forms/pricex/session/:id                     the schedule priced (free on screen)
//   POST /api/forms/pricex/session/:id/csv                 the priced schedule as CSV (PriceX, the suite or the offer)
// A line is priced only from a variant of the product the shared matcher found
// for it (lib/pricing.js says how the variant is chosen); a line with no price
// book on file says so and is left out of the total, never estimated.

import { jsonResponse3 } from "../lib/json-response.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";
import { matchComponentToCutSheets, PACKET_MATCH_TYPES } from "../../../weyland-shared/product-database.js";
import { pickVariant, priceLine, finishCode, variantNumber, variantFinish, lengthFeet, compact } from "../lib/pricing.js";
import { loadJob, setKey } from "./closex.js";
import { filedBookPrice, sizedByDoor } from "../lib/filed-books.js";
import { priceItem, makerKey } from "../lib/price-item.js";
export { priceItem };

let ready = false;
export function resetForTests() { ready = false; }
async function ensureTable(env) {
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS forms_price_multipliers (
    user_id TEXT NOT NULL, maker TEXT NOT NULL, multiplier REAL NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, maker))`).run();
  ready = true;
}

const okMult = (m) => Number.isFinite(Number(m)) && Number(m) > 0 && Number(m) <= 2;
/** The account's multipliers: { default, byMaker: { "lcn": 0.42 } }. */
async function loadMultipliers(env, userId) {
  const rows = (await env.DB.prepare("SELECT maker, multiplier FROM forms_price_multipliers WHERE user_id = ?").bind(userId).all()).results || [];
  const out = { default: 1, byMaker: {} };
  for (const r of rows) { if (r.maker === "") out.default = Number(r.multiplier); else out.byMaker[r.maker] = Number(r.multiplier); }
  return out;
}

function cleanMultipliers(b) {
  const out = { default: okMult(b && b.default) ? Number(b.default) : 1, byMaker: {} };
  for (const [k, v] of Object.entries((b && b.byMaker) || {}).slice(0, 100)) if (makerKey(k) && okMult(v)) out.byMaker[makerKey(k).slice(0, 80)] = Number(v);
  return out;
}

const r2 = (n) => Math.round(n * 100) / 100;

/** The schedule priced: one line per set item, quantity times the openings using the set. */
export async function priceSchedule(env, job, mult, match = matchComponentToCutSheets) {
  const caches = { match: new Map(), variants: new Map() };
  const openingsBySet = new Map(), doorsBySet = new Map();
  for (const d of job.doors) {
    const k = setKey(d.hardware_group);
    if (!k) continue;
    openingsBySet.set(k, (openingsBySet.get(k) || 0) + 1);
    if (!doorsBySet.has(k)) doorsBySet.set(k, []);
    doorsBySet.get(k).push(d);
  }
  const noDoors = job.doors.length === 0;
  const lines = [];
  let total = 0, listTotal = 0, unpriced = 0, notes = 0;
  for (const [k, set] of job.sets) {
    const openings = noDoors ? 1 : (openingsBySet.get(k) || 0);
    for (const it of set.items) {
      const number = it.catalog || it.model;
      // An item sized from the door (an LDW plate, a seal sold by length) is priced once per
      // door size in the set.
      const byDoor = (withHeight) => {
        const sizes = new Map();
        for (const d of doorsBySet.get(k) || []) {
          const w = Number(d.width_inches) > 0 ? Number(d.width_inches) : null, h = Number(d.height_inches) > 0 ? Number(d.height_inches) : null;
          const door = w && (!withHeight || h) ? { width: w, height: withHeight ? h : null } : null;
          const key = door ? door.width + "x" + door.height : "none";
          if (!sizes.has(key)) sizes.set(key, { door, openings: 0 });
          sizes.get(key).openings++;
        }
        return [...sizes.values()];
      };
      // A schedule note in the item column ("VERIFY PERMANENT CORE WITH DISTRICT"): no maker,
      // no catalogue number, only words. It is listed, not counted as an unpriced item.
      if (!it.manufacturer && !/\d/.test(number || "") && String(number || "").trim().split(/\s+/).length >= 3) {
        notes++;
        lines.push({ set: set.number, openings, item: it.description, maker: "", number, finish: it.finish, qtyPerOpening: Number(it.qty) || 1, qty: 0, priced: false, scheduleNote: true, reason: "A note on the schedule, not an item to price." });
        continue;
      }
      let groups = [];
      if (sizedByDoor({ maker: it.manufacturer, model: number }) && !noDoors) groups = byDoor(false);
      else {
        const first = await priceItem(env, { maker: it.manufacturer, model: number, finish: it.finish, door: null }, match, caches);
        if (first.needsDoor && !noDoors) groups = byDoor(true);
        if (!groups.length) groups = [{ door: null, openings, p: first }];
      }
      if (!groups.length) groups = [{ door: null, openings }];
      for (const g of groups) {
      const p = g.p || await priceItem(env, { maker: it.manufacturer, model: number, finish: it.finish, door: g.door }, match, caches);
      const qty = (Number(it.qty) || 1) * g.openings;
      const line = { set: set.number, openings: g.openings, item: it.description, maker: it.manufacturer, number, finish: it.finish, qtyPerOpening: Number(it.qty) || 1, qty, ...(g.door ? { doorWidth: g.door.width, ...(g.door.height ? { doorHeight: g.door.height } : {}) } : {}) };
      if (!p.priced) { unpriced++; lines.push({ ...line, priced: false, reason: p.reason }); continue; }
      const m = mult.byMaker[makerKey(p.product.manufacturer)] ?? mult.byMaker[makerKey(it.manufacturer)] ?? mult.default;
      const pl = priceLine({ qty, list: p.variant.list, multiplier: m });
      if (qty > 0) { total += pl.extended; listTotal += r2(pl.list * qty); }
      lines.push({ ...line, priced: true, pricedAs: p.variant.number, pricedFinish: p.variant.finish, basis: p.basis, book: p.book.name, effective: p.variant.effective, ...pl, extended: qty > 0 ? pl.extended : 0, note: [p.note, g.openings === 0 ? "no opening in the door schedule uses this set" : null].filter(Boolean).join("; ") || null });
      }
    }
  }
  return {
    lines,
    totals: { net: r2(total), list: r2(listTotal), pricedLines: lines.length - unpriced - notes, unpricedLines: unpriced, noteLines: notes, exactLines: lines.filter((l) => l.basis === "exact").length },
    basisNote: noDoors ? "No door schedule was read, so each set is priced for one opening." : null,
  };
}

const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function pricedCsv(project, result, mult) {
  const head = ["Set", "Openings", "Item", "Manufacturer", "Catalogue no. (schedule)", "Finish", "Qty per opening", "Qty", "Priced as", "Price finish", "Basis", "Price book", "Effective", "List", "Multiplier", "Net each", "Extended", "Note"];
  const rows = result.lines.map((l) => l.priced
    ? [l.set, l.openings, l.item, l.maker, l.number, l.finish, l.qtyPerOpening, l.qty, l.pricedAs, l.pricedFinish, l.basis, l.book, l.effective || "", l.list.toFixed(2), l.multiplier, l.net.toFixed(2), l.extended.toFixed(2), l.note]
    : [l.set, l.openings, l.item, l.maker, l.number, l.finish, l.qtyPerOpening, l.qty, "", "", l.scheduleNote ? "schedule note" : "not priced", "", "", "", "", "", "", l.reason]);
  const out = [["Project", project], ["Default multiplier", mult.default], [], head, ...rows, [],
    ["", "", "", "", "", "", "", "", "", "", "", "", "Total of priced lines (list)", result.totals.list.toFixed(2), "", "", result.totals.net.toFixed(2), `${result.totals.unpricedLines} line(s) not priced and not in the total`]];
  if (result.basisNote) out.push([result.basisNote]);
  return out.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function registerPricexRoutes(router, { authenticate, match = matchComponentToCutSheets }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to price your SubX sessions." }, 401) };
    await ensureTable(env);
    return { userId: String(user.userId) };
  }
  async function body(request) { try { return await request.json(); } catch (_) { return {}; } }

  router.get("/api/forms/pricex/lookup", async (request, env) => {
    const q = new URL(request.url).searchParams;
    const model = String(q.get("model") || "").trim().slice(0, 120);
    if (!model) return jsonResponse3({ success: false, message: "Enter a catalogue number." }, 400);
    const p = await priceItem(env, { maker: String(q.get("maker") || "").trim().slice(0, 80), model, finish: String(q.get("finish") || "").trim().slice(0, 20) }, match);
    return jsonResponse3({ success: true, finish: finishCode(q.get("finish")), ...p });
  });

  router.get("/api/forms/pricex/multipliers", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    return jsonResponse3({ success: true, ...(await loadMultipliers(env, a.userId)) });
  });

  router.post("/api/forms/pricex/multipliers", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const m = cleanMultipliers(await body(request));
    const now = new Date().toISOString();
    await env.DB.prepare("DELETE FROM forms_price_multipliers WHERE user_id = ?").bind(a.userId).run();
    for (const [maker, v] of [["", m.default], ...Object.entries(m.byMaker)]) {
      await env.DB.prepare("INSERT INTO forms_price_multipliers (user_id, maker, multiplier, updated_at) VALUES (?, ?, ?, ?)").bind(a.userId, maker, v, now).run();
    }
    return jsonResponse3({ success: true, ...m });
  });

  async function priced(request, env, a) {
    const j = await loadJob(env, request.params.id, a.userId);
    if (j.error) return { error: jsonResponse3({ success: false, message: j.error[1] }, j.error[0]) };
    const b = await body(request);
    const mult = b && (b.default != null || b.byMaker) ? cleanMultipliers(b) : await loadMultipliers(env, a.userId);
    return { j, mult, result: await priceSchedule(env, j, mult, match) };
  }

  router.post("/api/forms/pricex/session/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const r = await priced(request, env, a); if (r.error) return r.error;
    return jsonResponse3({ success: true, project: r.j.session.project_name || r.j.session.filename, multipliers: r.mult, ...r.result });
  });

  router.post("/api/forms/pricex/session/:id/csv", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    if (!(await outputAccess(env, a.userId, "pricex")).paid) return jsonResponse3(paymentRequired("The priced schedule export"), 402);
    const r = await priced(request, env, a); if (r.error) return r.error;
    const project = r.j.session.project_name || r.j.session.filename || "SubX session";
    return new Response(pricedCsv(project, r.result, r.mult), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${project.replace(/[^A-Za-z0-9 ._-]/g, "").slice(0, 60) || "priced"} - priced.csv"` } });
  });
}
