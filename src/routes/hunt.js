import { jsonResponse3 } from "../lib/json-response.js";
import { requireProductAccess } from "../lib/auth.js";

/**
 * Route bodies below are unmodified from the original bundle except:
 * esbuild's cosmetic `__name(...)` calls stripped (function .name is
 * already correct - see src/README.md for why other extracted modules
 * do the same). fetchTxdotOpportunities/fetchCaOpscOpportunities had
 * their only call site inside /api/hunt/refresh below, so they're
 * inlined here as local private helpers.
 *
 * @param {object} router
 * @param {{ authenticate: Function }} deps
 */
export function registerHuntRoutes(router, { authenticate }) {
  async function fetchTxdotOpportunities() {
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
  async function fetchCaOpscOpportunities() {
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
  router.post("/api/hunt/refresh", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4)
      return error4;
    {
      const _prodErr = await requireProductAccess(user, env2, "huntx");
      if (_prodErr) return _prodErr;
    }
    try {
      const results = await Promise.allSettled([fetchTxdotOpportunities(), fetchCaOpscOpportunities()]);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let upserted = 0;
      const errors = [];
      for (const r of results) {
        if (r.status === "rejected") {
          errors.push(String(r.reason));
          continue;
        }
        for (const opp of r.value) {
          if (!opp.source_ref) continue;
          const id = crypto.randomUUID();
          await env2.DB.prepare(`
            INSERT INTO opportunities (id, source, source_ref, title, agency, location, category, status, key_date, estimated_value, detail_url, raw_data, fetched_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source, source_ref) DO UPDATE SET
              title=excluded.title, agency=excluded.agency, location=excluded.location, category=excluded.category,
              status=excluded.status, key_date=excluded.key_date, estimated_value=excluded.estimated_value,
              raw_data=excluded.raw_data, fetched_at=excluded.fetched_at
          `).bind(
            id, opp.source, String(opp.source_ref), opp.title, opp.agency, opp.location, opp.category,
            opp.status, opp.key_date, opp.estimated_value, opp.detail_url, JSON.stringify(opp.raw_data), now, now
          ).run();
          upserted++;
        }
      }
      return jsonResponse3({ success: true, upserted, sources: results.length, errors: errors.length ? errors : void 0 });
    } catch (error5) {
      console.error("[HuntX Refresh] Error:", error5);
      return jsonResponse3({ error: "Failed to refresh opportunities", details: error5.message }, 500);
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
      const source = url.searchParams.get("source");
      const q = url.searchParams.get("q");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 300);
      let where = "WHERE 1=1";
      const params = [];
      if (source) { where += " AND source = ?"; params.push(source); }
      if (q) { where += " AND (title LIKE ? OR agency LIKE ? OR location LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      const result = await env2.DB.prepare(
        `SELECT id, source, title, agency, location, category, status, key_date, estimated_value, detail_url, fetched_at
         FROM opportunities ${where} ORDER BY key_date ASC LIMIT ?`
      ).bind(...params, limit).all();
      const lastFetch = await env2.DB.prepare("SELECT MAX(fetched_at) as t FROM opportunities").first();
      return jsonResponse3({ opportunities: result.results || [], lastFetchedAt: lastFetch?.t || null });
    } catch (error5) {
      console.error("[HuntX List] Error:", error5);
      return jsonResponse3({ error: "Failed to list opportunities", details: error5.message }, 500);
    }
  });
}
