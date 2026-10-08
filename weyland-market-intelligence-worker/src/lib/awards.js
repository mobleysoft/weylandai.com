// weyland-market-intelligence-worker/src/lib/awards.js
//
// CompX's awards index (2026-10-08): who won public building and door work,
// for how much, from which agency. CompX used to search TxDOT highway bid
// tabulations by vendor name: civil work no door hardware sub bids. NYC's
// City Record publishes every contract award (vendor, amount, agency,
// selection method); the construction and door awards since 2021 (about
// 2,800, 180 of them door work) are pulled into this worker's own D1 once a
// day by the request-driven job lease, so a search never waits on the city's
// API. Each award carries the same trade fit HuntX gives a notice.

import { tradeFit } from "../../../weyland-huntx-worker/src/lib/trade-fit.js";

const NYC = "https://data.cityofnewyork.us/resource/dg92-zbpx.json";
const SINCE = "2021-01-01";
const WHERE = `type_of_notice_description='Award' AND start_date >= '${SINCE}' AND (category_description like '%Construction%' OR upper(short_title) like '%DOOR%' OR upper(short_title) like '%HARDWARE%' OR upper(short_title) like '%LOCK%' OR upper(short_title) like '%FRAME%' OR upper(short_title) like '%STOREFRONT%' OR upper(short_title) like '%ENTRANCE%')`;

let ready = false;
export function resetAwardsForTests() { ready = false; }
export async function ensureAwards(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS awards (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, agency TEXT, title TEXT, vendor TEXT, vendor_address TEXT,
    amount REAL, method TEXT, category TEXT, awarded_on TEXT, pin TEXT, trade_fit TEXT, fetched_at TEXT NOT NULL)`).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_awards_date ON awards(awarded_on)").run();
  ready = true;
}

export function awardRow(r, now) {
  const fit = tradeFit({ source: "nyc_cityrecord", title: r.short_title, category: r.category_description, raw_data: { additional_description_1: r.additional_description_1 } });
  return {
    id: "nyc:" + (r.request_id || r.pin || r.short_title),
    source: "nyc_cityrecord",
    agency: r.agency_name || null,
    title: (r.short_title || "").slice(0, 300),
    vendor: (r.vendor_name || "").trim() || null,
    vendor_address: r.vendor_address || null,
    amount: r.contract_amount != null && r.contract_amount !== "" ? Number(r.contract_amount) : null,
    method: r.selection_method_description || null,
    category: r.category_description || null,
    awarded_on: r.start_date ? String(r.start_date).slice(0, 10) : null,
    pin: r.pin || null,
    trade_fit: fit.fit,
    fetched_at: now,
  };
}

/** Pull the awards into D1. fetchImpl is injectable for tests. */
export async function ingestAwards(db, fetchImpl = fetch) {
  await ensureAwards(db);
  const now = new Date().toISOString();
  let offset = 0, upserted = 0;
  for (let page = 0; page < 10; page++) {
    const url = `${NYC}?${new URLSearchParams({ $where: WHERE, $order: "start_date DESC", $limit: "1000", $offset: String(offset) })}`;
    const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("NYC City Record " + res.status);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) break;
    const stmts = rows.map((r) => awardRow(r, now)).map((a) => db.prepare(
      `INSERT INTO awards (id, source, agency, title, vendor, vendor_address, amount, method, category, awarded_on, pin, trade_fit, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET agency=excluded.agency, title=excluded.title, vendor=excluded.vendor, amount=excluded.amount,
         method=excluded.method, category=excluded.category, awarded_on=excluded.awarded_on, trade_fit=excluded.trade_fit, fetched_at=excluded.fetched_at`
    ).bind(a.id, a.source, a.agency, a.title, a.vendor, a.vendor_address, a.amount, a.method, a.category, a.awarded_on, a.pin, a.trade_fit, a.fetched_at));
    for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
    upserted += rows.length;
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return { upserted, at: now };
}

const FITS = { doors: ["doors"], building: ["doors", "building"], all: null };

/** Search the index: awards + a vendor rollup (the competitors). */
export async function searchAwards(db, p) {
  await ensureAwards(db);
  let where = "WHERE 1=1";
  const binds = [];
  const fits = FITS[p.fit] === undefined ? FITS.building : FITS[p.fit];
  if (fits) { where += ` AND trade_fit IN (${fits.map(() => "?").join(",")})`; binds.push(...fits); }
  if (p.q) { where += " AND (title LIKE ? OR vendor LIKE ? OR agency LIKE ?)"; binds.push(`%${p.q}%`, `%${p.q}%`, `%${p.q}%`); }
  if (p.agency) { where += " AND agency = ?"; binds.push(p.agency); }
  if (p.vendor) { where += " AND vendor = ?"; binds.push(p.vendor); }
  if (p.since) { where += " AND awarded_on >= ?"; binds.push(p.since); }
  const limit = Math.min(Math.max(Number(p.limit) || 50, 1), 2000);
  const rows = (await db.prepare(`SELECT agency, title, vendor, amount, method, category, awarded_on, pin, trade_fit FROM awards ${where} ORDER BY awarded_on DESC LIMIT ?`).bind(...binds, limit).all()).results || [];
  const totals = await db.prepare(`SELECT COUNT(*) AS n, SUM(amount) AS total, MAX(fetched_at) AS fetched FROM awards ${where}`).bind(...binds).first();
  const vendors = (await db.prepare(
    `SELECT vendor, COUNT(*) AS awards, SUM(amount) AS total, MAX(awarded_on) AS last_award, COUNT(DISTINCT agency) AS agencies
     FROM awards ${where} AND vendor IS NOT NULL GROUP BY vendor ORDER BY total DESC LIMIT 50`
  ).bind(...binds).all()).results || [];
  const agencies = (await db.prepare(`SELECT agency, COUNT(*) AS awards, SUM(amount) AS total FROM awards ${where} GROUP BY agency ORDER BY total DESC LIMIT 30`).bind(...binds).all()).results || [];
  return { count: totals?.n || 0, total: totals?.total || 0, indexedAt: totals?.fetched || null, rows, vendors, agencies };
}
