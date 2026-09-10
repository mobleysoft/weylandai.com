// src/routes/hunt-leads.js
//
// LeadX: save/read lead-qualification criteria, score the live HuntX
// opportunity feed against it, and generate a downloadable PDF report of
// qualified leads.
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// 154318-154429: scoreOpportunity, generateLeadReportHtml, and the 4
// routes). renderHtmlToPdf/storeDocumentPdf/makeDocumentDownloadRoute
// are real nested closures inside registerDocumentGeneratorRoutes
// (document-generators.js) that close over its own `puppeteer`
// parameter - they only exist via that function's return value, not as
// standalone exports (confirmed the hard way: a first attempt to
// `export` makeDocumentDownloadRoute directly from that file was a real
// syntax error, since it's nested, not top-level - caught by
// `node --check` before it shipped, reverted). All three are injected
// dependencies here for that reason.

import { jsonResponse3 } from "../lib/json-response.js";

function scoreOpportunity(opp, criteria) {
  const minValue = Number(criteria.min_value) || 0;
  const keywords = (criteria.keywords || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  const locations = (criteria.locations || "").split(",").map((l) => l.trim().toLowerCase()).filter(Boolean);
  let score = 0;
  const reasons = [];
  if (minValue <= 0 || (opp.estimated_value != null && Number(opp.estimated_value) >= minValue)) {
    score++;
    if (minValue > 0) reasons.push(`Value $${Number(opp.estimated_value).toLocaleString()} meets $${minValue.toLocaleString()} minimum`);
  }
  const haystack = `${opp.title || ""} ${opp.category || ""}`.toLowerCase();
  if (!keywords.length || keywords.some((k) => haystack.includes(k))) {
    score++;
    if (keywords.length) reasons.push("Matches keyword: " + keywords.find((k) => haystack.includes(k)));
  }
  const locHaystack = (opp.location || "").toLowerCase();
  if (!locations.length || locations.some((l) => locHaystack.includes(l))) {
    score++;
    if (locations.length) reasons.push("Matches location: " + locations.find((l) => locHaystack.includes(l)));
  }
  return { score, qualified: score >= 2, reasons };
}

function generateLeadReportHtml(d) {
  const rows = d.qualified.length
    ? d.qualified.map((o) => `<tr><td>${o.title || ""}</td><td>${o.location || ""}</td><td>${o.estimated_value ? "$" + Number(o.estimated_value).toLocaleString() : "&mdash;"}</td><td>${o.key_date || ""}</td><td>${o.score}/3</td></tr>`).join("")
    : `<tr><td colspan="5" class="none">No opportunities in the current HuntX data met your criteria.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#666;font-size:11px;margin-bottom:30px}
    .stats{display:flex;gap:24px;margin:26px 0}
    .stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}
    .stats .box strong{display:block;font-size:22px}
    .stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
    th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:2px solid #333;padding:6px 4px}
    td{padding:6px 4px;border-bottom:1px solid #eee}
    td.none{color:#777}
    .disclaimer{margin-top:40px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}
  </style></head><body>
    <h1>Qualified Leads Report</h1>
    <div class="sub">Prepared via WeylandAI / LeadX &middot; ${new Date().toLocaleDateString()}</div>
    <div class="stats">
      <div class="box"><strong>${d.totalScanned}</strong><span>Opportunities Scanned</span></div>
      <div class="box"><strong>${d.qualified.length}</strong><span>Qualified Leads</span></div>
    </div>
    <table><thead><tr><th>Title</th><th>Location</th><th>Est. Value</th><th>Key Date</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="disclaimer">Qualification is scored against your saved criteria (minimum value, keywords, locations) on a 0-3 scale - not a judgment of project quality or win probability. Source data is the same live HuntX feed (TXDOT + CA OPSC open data).</div>
  </body></html>`;
}

export function registerHuntLeadsRoutes(router, { authenticate, requireProductAccess, renderHtmlToPdf, storeDocumentPdf, makeDocumentDownloadRoute }) {
  router.post("/api/leads/criteria", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    const _prodErr = await requireProductAccess(user, env2, "leadx");
    if (_prodErr) return _prodErr;
    try {
      const body = await request2.json();
      const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
      const now = new Date().toISOString();
      const existing = await env2.DB.prepare("SELECT id FROM lead_criteria WHERE user_id = ?").bind(user.userId).first();
      if (existing) {
        await env2.DB.prepare("UPDATE lead_criteria SET min_value=?, keywords=?, locations=?, updated_at=? WHERE user_id=?")
          .bind(Number(body.minValue) || 0, body.keywords || "", body.locations || "", now, user.userId).run();
      } else {
        await env2.DB.prepare("INSERT INTO lead_criteria (id, user_id, tenant_id, min_value, keywords, locations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), user.userId, tenantId, Number(body.minValue) || 0, body.keywords || "", body.locations || "", now, now).run();
      }
      return jsonResponse3({ success: true });
    } catch (error5) {
      console.error("[LeadX Criteria] Error:", error5);
      return jsonResponse3({ error: "Failed to save criteria", details: error5.message }, 500);
    }
  });

  router.get("/api/leads/criteria", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    const _prodErr = await requireProductAccess(user, env2, "leadx");
    if (_prodErr) return _prodErr;
    const row = await env2.DB.prepare("SELECT min_value, keywords, locations FROM lead_criteria WHERE user_id = ?").bind(user.userId).first();
    return jsonResponse3({ criteria: row || { min_value: 0, keywords: "", locations: "" } });
  });

  router.post("/api/leads/qualify", async (request2, env2) => {
    const { error: error4, user } = await authenticate(request2, env2);
    if (error4) return error4;
    const _prodErr = await requireProductAccess(user, env2, "leadx");
    if (_prodErr) return _prodErr;
    try {
      const criteriaRow = await env2.DB.prepare("SELECT min_value, keywords, locations FROM lead_criteria WHERE user_id = ?").bind(user.userId).first();
      const criteria = criteriaRow || { min_value: 0, keywords: "", locations: "" };
      const oppsResult = await env2.DB.prepare(
        "SELECT id, title, agency, location, category, status, key_date, estimated_value FROM opportunities ORDER BY key_date ASC LIMIT 300"
      ).all();
      const opportunities = oppsResult.results || [];
      const scored = opportunities.map((o) => ({ ...o, ...scoreOpportunity(o, criteria) }));
      const qualified = scored.filter((o) => o.qualified).sort((a, b) => b.score - a.score);
      const tenantId = user.tenantId || user.tenant_id || "ven_weyland";
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const pdfBytes = await renderHtmlToPdf(env2, generateLeadReportHtml({ qualified, totalScanned: opportunities.length }));
      const r2Key = `lead-reports/${user.userId}/${id}.pdf`;
      await storeDocumentPdf(env2, r2Key, pdfBytes, { userId: user.userId, tenantId, generatedAt: now });
      await env2.DB.prepare(`
        INSERT INTO lead_reports (id, user_id, tenant_id, qualified_count, total_scanned, report_json, r2_key, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      `).bind(id, user.userId, tenantId, qualified.length, opportunities.length, JSON.stringify(qualified), r2Key, now, now).run();
      return jsonResponse3({ success: true, reportId: id, totalScanned: opportunities.length, qualifiedCount: qualified.length, downloadUrl: `/api/leads/reports/${id}/download` });
    } catch (error5) {
      console.error("[LeadX Qualify] Error:", error5);
      return jsonResponse3({ error: "Failed to qualify leads", details: error5.message }, 500);
    }
  });

  router.get("/api/leads/reports/:id/download", makeDocumentDownloadRoute("lead_reports", "leadx", "QualifiedLeads"));
}

export { scoreOpportunity };
