// weyland-huntx-worker/src/lib/ingest.js
//
// The only place HuntX talks to the public sources (TxDOT Socrata, CA OPSC
// CKAN, Illinois CDB Socrata, NYC City Record Socrata). Runs in the background (ctx.waitUntil from the request-driven lease in
// index.js, or from REFRESH FROM SOURCES), never inside a visitor's request:
// per direct instruction (2026-10-05) Weyland must not need any call
// outside the conglomerate to operate. Visitors read the opportunities
// table in D1 (our store); this job keeps that table fresh in the
// background and records each run in ingest_runs so the page can say when
// the index was last refreshed and whether a source failed.
//
// fetchTxdotOpportunities / fetchCaOpscOpportunities are the byte-identical
// helpers that lived inline in routes/hunt.js (moved, not rewritten).

import { tradeFit, stateOf } from "./trade-fit.js";

export async function fetchTxdotOpportunities() {
  const url = "https://data.texas.gov/resource/qh8x-rm8r.json?" + new URLSearchParams({
    "$select": "project_number,county,highway,district_division,project_classification,bids_will_be_opened_date,sealed_engineer_s_estimate,proposal_status,project_id",
    "$group": "project_number,county,highway,district_division,project_classification,bids_will_be_opened_date,sealed_engineer_s_estimate,proposal_status,project_id",
    "$where": "bids_will_be_opened_date > '" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + "'",
    "$order": "bids_will_be_opened_date ASC",
    "$limit": "150"
  });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`TxDOT fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({
    source: "txdot",
    source_ref: r.project_id || r.project_number,
    title: `${r.project_classification || "Construction Letting"} — ${r.highway || r.county || ""}`,
    agency: "Texas Department of Transportation",
    location: [r.county, "TX"].filter(Boolean).join(", "),
    category: r.project_classification || null,
    status: r.proposal_status || null,
    key_date: r.bids_will_be_opened_date || null,
    estimated_value: r.sealed_engineer_s_estimate ? parseFloat(r.sealed_engineer_s_estimate) : null,
    detail_url: "https://www.txdot.gov/business/letting-bids.html",
    raw_data: r
  }));
}
export async function fetchCaOpscOpportunities() {
  const sql = `SELECT "District", "School_Name", "Program", "Status", "Last_SAB_Date", "County", "Application_Number", "State_Share_of_Funding" FROM "8080bb19-a63b-47e3-82d3-7451d119e27f" WHERE "Status"='Funds Released' ORDER BY "Last_SAB_Date" DESC LIMIT 150`;
  const url = "https://data.ca.gov/api/3/action/datastore_search_sql?sql=" + encodeURIComponent(sql);
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`CA OPSC fetch failed: ${res.status}`);
  const data = await res.json();
  const rows = data.result?.records || [];
  return rows.map((r) => ({
    source: "ca_opsc",
    source_ref: r.Application_Number,
    title: `${r.Program || "School Construction"} — ${r.School_Name || r.District || ""}`,
    agency: r.District || null,
    location: [r.County, "CA"].filter(Boolean).join(", "),
    category: r.Program || null,
    status: r.Status || null,
    key_date: r.Last_SAB_Date || null,
    estimated_value: r.State_Share_of_Funding || null,
    detail_url: "https://www.dgs.ca.gov/OPSC",
    raw_data: r
  }));
}


// Illinois Capital Development Board "Future Solicitations" (Socrata,
// illinois-edp.data.socrata.com/6rb8-ntpm): every row is a public building
// construction project with an estimated bid date, a cost band and the
// architect of record. Added 2026-10-05.
export async function fetchIllinoisCdbOpportunities() {
  const url = "https://illinois-edp.data.socrata.com/resource/6rb8-ntpm.json?" + new URLSearchParams({
    "$where": "estimated_bid_date >= '" + new Date().toISOString().slice(0, 10) + "'",
    "$order": "estimated_bid_date ASC",
    "$limit": "200"
  });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Illinois CDB fetch failed: " + res.status);
  const rows = await res.json();
  return rows.map((r) => {
    const parts = String(r.location_name || "").split(" - ");
    return {
      source: "il_cdb",
      source_ref: r.project_number,
      title: (r.description || "State Construction Project") + " \u2014 " + (parts[0] || ""),
      agency: "Illinois Capital Development Board",
      location: [parts.length >= 2 ? parts[parts.length - 2] : null, "IL"].filter(Boolean).join(", "),
      category: "Public Building Construction",
      status: "Future Solicitation",
      key_date: r.estimated_bid_date || null,
      estimated_value: parseCostBand(r.approximate_cost),
      detail_url: "https://cdb.illinois.gov/business/procurement.html",
      raw_data: r
    };
  });
}

// "Less than $6,000,000" -> 6000000 (upper bound of the band); null when unparseable.
function parseCostBand(text) {
  const m = String(text || "").replace(/,/g, "").match(/\$?(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// NYC City Record Online (Socrata, data.cityofnewyork.us/dg92-zbpx): the
// city's official procurement notices. Kept to open construction
// solicitations with a due date still ahead. Added 2026-10-05.
export async function fetchNycCityRecordOpportunities() {
  const today = new Date().toISOString().slice(0, 10);
  const url = "https://data.cityofnewyork.us/resource/dg92-zbpx.json?" + new URLSearchParams({
    "$select": "request_id,pin,start_date,due_date,agency_name,type_of_notice_description,short_title,category_description,selection_method_description,additional_description_1",
    "$where": "section_name='Procurement' AND type_of_notice_description='Solicitation' AND category_description like 'Construction%' AND due_date >= '" + today + "T00:00:00'",
    "$order": "due_date ASC",
    "$limit": "200"
  });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("NYC City Record fetch failed: " + res.status);
  const rows = await res.json();
  return rows.map((r) => ({
    source: "nyc_cityrecord",
    source_ref: r.request_id,
    title: r.short_title || "Construction Solicitation",
    agency: r.agency_name ? "NYC " + r.agency_name : "City of New York",
    location: "New York, NY",
    category: r.category_description || "Construction/Construction Services",
    status: r.selection_method_description || "Solicitation",
    key_date: r.due_date || null,
    estimated_value: null,
    detail_url: "https://a856-cityrecord.nyc.gov/RequestDetail/" + encodeURIComponent(r.request_id || ""),
    raw_data: Object.assign({}, r, { additional_description_1: String(r.additional_description_1 || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200) })
  }));
}

// "$1M - $4M" -> 4000000, "$250K - $500K" -> 500000 (the band's upper end);
// null when there is no money in it.
export function parseMoneyBand(text) {
  const nums = [...String(text || "").replace(/,/g, "").matchAll(/\$?\s*(\d+(?:\.\d+)?)\s*([MK])?/gi)]
    .map((m) => parseFloat(m[1]) * (/m/i.test(m[2] || "") ? 1e6 : /k/i.test(m[2] || "") ? 1e3 : 1))
    .filter((n) => n > 0);
  return nums.length ? Math.max(...nums) : null;
}

// Los Angeles Regional Alliance Marketplace for Procurement (Socrata,
// data.lacity.org/hf3r-utnq): open construction bids from the City, LAUSD,
// the county and the region's agencies. Added 2026-10-08.
export async function fetchLaRampOpportunities() {
  const today = new Date().toISOString().slice(0, 10);
  const url = "https://data.lacity.org/resource/hf3r-utnq.json?" + new URLSearchParams({
    "$where": "category = 'Construction' AND closedate >= '" + today + "'",
    "$order": "closedate ASC",
    "$limit": "200"
  });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("LA RAMP fetch failed: " + res.status);
  const rows = await res.json();
  return rows.map((r) => ({
    source: "la_ramp",
    source_ref: r.rampid,
    title: String(r.title || "Construction Bid").replace(/\s+/g, " ").trim(),
    agency: r.department || "Los Angeles region",
    location: "Los Angeles, CA",
    category: r.type && r.type !== "None" ? "Construction - " + r.type : "Construction",
    status: r.stagename || "Open",
    key_date: r.closedate || null,
    estimated_value: null,
    detail_url: (r.url && r.url.url) || "https://www.rampla.org/",
    raw_data: r
  }));
}

// Delaware Marketplace open bids (Socrata, data.delaware.gov/2hnj-zwix):
// bids coded UNSPSC 72 (building and facility construction and maintenance
// services) or 30 (structures and building components). Added 2026-10-08.
export async function fetchDelawareOpportunities() {
  const today = new Date().toISOString().slice(0, 10);
  const url = "https://data.delaware.gov/resource/2hnj-zwix.json?" + new URLSearchParams({
    "$where": "deadlinedate >= '" + today + "' AND (unspsc like '72%' OR unspsc like '%;72%' OR unspsc like '30%' OR unspsc like '%;30%')",
    "$order": "deadlinedate ASC",
    "$limit": "200"
  });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Delaware fetch failed: " + res.status);
  const rows = await res.json();
  return rows.map((r) => ({
    source: "de_mmp",
    source_ref: r.contractnumber,
    title: String(r.contracttitle || "State Bid").replace(/\s+/g, " ").trim(),
    agency: "State of Delaware (" + (r.agencycode || "agency") + ")",
    location: "Delaware, DE",
    category: /(^|;)72(12|11)/.test(r.unspsc || "") ? "Building construction" : /(^|;)7214/.test(r.unspsc || "") ? "Heavy construction" : "Construction and facility services",
    status: "Open",
    key_date: r.deadlinedate || null,
    estimated_value: null,
    detail_url: (r.bidurl && r.bidurl.url) || "https://mmp.delaware.gov/",
    raw_data: r
  }));
}

// NYC School Construction Authority upcoming contracts (Socrata,
// data.cityofnewyork.us/tsak-vtv3): school projects in scope or design,
// before they are bid - doors, accessibility, interiors, exterior work.
// Leads to watch, with the budget band. Added 2026-10-08.
export async function fetchNycScaUpcoming() {
  const url = "https://data.cityofnewyork.us/resource/tsak-vtv3.json?" + new URLSearchParams({ "$limit": "800" });
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("NYC SCA fetch failed: " + res.status);
  const rows = await res.json();
  return rows.filter((r) => r.upcoming_project_design_number).map((r) => ({
    source: "nyc_sca",
    source_ref: r.upcoming_project_design_number,
    title: [r.upcoming_project_description, r.upcoming_project_name].filter(Boolean).join(" \u2014 "),
    agency: "NYC School Construction Authority",
    location: [r.upcoming_project_borough_ ? r.upcoming_project_borough_.charAt(0) + r.upcoming_project_borough_.slice(1).toLowerCase() : null, "NY"].filter(Boolean).join(", "),
    category: r.upcoming_project_category || "School capital project",
    status: r.upcoming_project_status_ ? "Upcoming (" + r.upcoming_project_status_ + ")" : "Upcoming",
    key_date: null,
    estimated_value: parseMoneyBand(r.upcoming_project_design_completion_date),
    detail_url: "https://www.nycsca.org/Procurement",
    raw_data: r
  }));
}

/**
 * Pull every source and upsert into D1. Returns a summary row that is also
 * written to ingest_runs (created on first use).
 *
 * trigger: "traffic" (the request-driven hourly lease in index.js),
 * "refresh" (REFRESH FROM SOURCES) or "cron" (scheduled(), if crons ever
 * fire on this account). 2026-10-07: upserts go to D1 in batches
 * (env.DB.batch, UPSERT_BATCH statements per round trip) instead of one
 * awaited statement per row. A full run used to take 12-29 s of sequential
 * round trips inside ctx.waitUntil, and the 2026-10-07 04:28Z run was cut
 * off part-way (txdot and ca_opsc rows written, no ingest_runs row, il_cdb
 * and nyc_cityrecord untouched).
 */
export const UPSERT_BATCH = 50;
const UPSERT_SQL = `
        INSERT INTO opportunities (id, source, source_ref, title, agency, location, category, status, key_date, estimated_value, detail_url, raw_data, created_at, fetched_at, trade_fit, trade_fit_why, state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_ref) DO UPDATE SET
          title=excluded.title, agency=excluded.agency, location=excluded.location, category=excluded.category,
          status=excluded.status, key_date=excluded.key_date, estimated_value=excluded.estimated_value,
          raw_data=excluded.raw_data, fetched_at=excluded.fetched_at,
          trade_fit=excluded.trade_fit, trade_fit_why=excluded.trade_fit_why, state=excluded.state
      `;

export async function ingestSources(env, trigger = "cron") {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS ingest_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, trigger TEXT, upserted INTEGER DEFAULT 0, sources INTEGER DEFAULT 0, errors TEXT)"
  ).run();
  const started = new Date().toISOString();
  const runId = crypto.randomUUID();
  await ensureFitColumns(env);
  const results = await Promise.allSettled([fetchTxdotOpportunities(), fetchCaOpscOpportunities(), fetchIllinoisCdbOpportunities(), fetchNycCityRecordOpportunities(), fetchLaRampOpportunities(), fetchDelawareOpportunities(), fetchNycScaUpcoming()]);
  let upserted = 0;
  const errors = [];
  for (const r of results) {
    if (r.status === "rejected") { errors.push(String(r.reason)); continue; }
    const stmts = [];
    for (const opp of r.value) {
      if (!opp.source_ref) continue;
      const fit = tradeFit(opp);
      stmts.push(env.DB.prepare(UPSERT_SQL).bind(
        crypto.randomUUID(), opp.source, String(opp.source_ref), opp.title, opp.agency, opp.location, opp.category,
        opp.status, opp.key_date, opp.estimated_value, opp.detail_url, JSON.stringify(opp.raw_data), started, started,
        fit.fit, fit.why, stateOf(opp.location)
      ));
    }
    for (let i = 0; i < stmts.length; i += UPSERT_BATCH) {
      const chunk = stmts.slice(i, i + UPSERT_BATCH);
      try {
        if (typeof env.DB.batch === "function") await env.DB.batch(chunk);
        else for (const st of chunk) await st.run();
        upserted += chunk.length;
      } catch (e) {
        errors.push("upsert batch failed: " + ((e && e.message) || e));
      }
    }
  }
  const finished = new Date().toISOString();
  await env.DB.prepare("INSERT INTO ingest_runs (id, started_at, finished_at, trigger, upserted, sources, errors) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, started, finished, trigger, upserted, results.length, errors.length ? JSON.stringify(errors) : null).run();
  return { runId, started, finished, trigger, upserted, sources: results.length, errors };
}

// The trade fit columns (lib/trade-fit.js), added 2026-10-08. ALTER TABLE
// ADD COLUMN fails once the column exists; that failure is the "already
// there" answer. Rows written before have NULL and are classified on read
// (routes/hunt.js backfillFit).
let fitColumnsReady = false;
export async function ensureFitColumns(env) {
  if (fitColumnsReady) return;
  for (const col of ["trade_fit TEXT", "trade_fit_why TEXT", "state TEXT", "trade_fit_v INTEGER"]) {
    try { await env.DB.prepare("ALTER TABLE opportunities ADD COLUMN " + col).run(); } catch (_) { /* exists */ }
  }
  fitColumnsReady = true;
}
export function resetFitColumnsForTests() { fitColumnsReady = false; }

/** Last completed ingest, for the page's "index refreshed at" line. */
export async function lastIngest(env) {
  try {
    return await env.DB.prepare("SELECT started_at, finished_at, upserted, errors FROM ingest_runs ORDER BY started_at DESC LIMIT 1").first();
  } catch (e) {
    return null; // table not created yet: first cron has not run
  }
}
