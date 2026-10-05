// weyland-huntx-worker/src/lib/ingest.js
//
// The only place HuntX talks to the public sources (TxDOT Socrata, CA OPSC
// CKAN). Runs from the Worker's scheduled() cron, never from a request:
// per direct instruction (2026-10-05) Weyland must not need any call
// outside the conglomerate to operate. Visitors read the opportunities
// table in D1 (our store); this job keeps that table fresh in the
// background and records each run in ingest_runs so the page can say when
// the index was last refreshed and whether a source failed.
//
// fetchTxdotOpportunities / fetchCaOpscOpportunities are the byte-identical
// helpers that lived inline in routes/hunt.js (moved, not rewritten).

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

/**
 * Pull both sources and upsert into D1. Returns a summary row that is also
 * written to ingest_runs (created on first use).
 */
export async function ingestSources(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS ingest_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, trigger TEXT, upserted INTEGER DEFAULT 0, sources INTEGER DEFAULT 0, errors TEXT)"
  ).run();
  const started = new Date().toISOString();
  const runId = crypto.randomUUID();
  const results = await Promise.allSettled([fetchTxdotOpportunities(), fetchCaOpscOpportunities()]);
  let upserted = 0;
  const errors = [];
  for (const r of results) {
    if (r.status === "rejected") { errors.push(String(r.reason)); continue; }
    for (const opp of r.value) {
      if (!opp.source_ref) continue;
      await env.DB.prepare(`
        INSERT INTO opportunities (id, source, source_ref, title, agency, location, category, status, key_date, estimated_value, detail_url, raw_data, created_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source, source_ref) DO UPDATE SET
          title=excluded.title, agency=excluded.agency, location=excluded.location, category=excluded.category,
          status=excluded.status, key_date=excluded.key_date, estimated_value=excluded.estimated_value,
          raw_data=excluded.raw_data, fetched_at=excluded.fetched_at
      `).bind(
        crypto.randomUUID(), opp.source, String(opp.source_ref), opp.title, opp.agency, opp.location, opp.category,
        opp.status, opp.key_date, opp.estimated_value, opp.detail_url, JSON.stringify(opp.raw_data), started, started
      ).run();
      upserted++;
    }
  }
  const finished = new Date().toISOString();
  await env.DB.prepare("INSERT INTO ingest_runs (id, started_at, finished_at, trigger, upserted, sources, errors) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, started, finished, "cron", upserted, results.length, errors.length ? JSON.stringify(errors) : null).run();
  return { runId, started, finished, upserted, sources: results.length, errors };
}

/** Last completed ingest, for the page's "index refreshed at" line. */
export async function lastIngest(env) {
  try {
    return await env.DB.prepare("SELECT started_at, finished_at, upserted, errors FROM ingest_runs ORDER BY started_at DESC LIMIT 1").first();
  } catch (e) {
    return null; // table not created yet: first cron has not run
  }
}
