// weyland-market-intelligence-worker/src/routes/marketx.js
//
// MarketX (2026-10-09): the door hardware market in six metros, from the
// commercial and multifamily building permits each city publishes (lib/permits.js).
//   GET /api/marketx/metros                          every metro: last 12 months of door-likely work
//   GET /api/marketx/metro/:metro?months=&scope=&use=&kind=&min=&q=
//        the metro's market: value and projects against the prior period, by month,
//        by use and kind, the largest and newest projects, the contractors and owners
//        building them, and the open public bids in the state (HuntX's index)
//   GET /api/marketx/metro/:metro/projects.csv      every project for the filters
//   GET /api/marketx/metro/:metro/companies.csv     contractors and owners ranked by permitted value
// Free: the totals, the months, the use mix, and the top 5 of each list. The full lists
// and the CSVs come with MarketX, the suite or the $100 first submittal.

import { jsonResponse3 } from "../lib/json-response.js";
import { authenticate } from "../lib/auth.js";
import { outputAccess } from "../../../weyland-shared/output-access.js";
import { CITIES, USES, metroList, metroSummary, openBids, useLabel } from "../lib/permits.js";

const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (head, rows) => [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const FREE = 5, PAID = 200, CSV_ROWS = 5000;

async function access(request, env) {
  const shared = { ...env, DB: env.WEYLAND_DB };
  const { user } = await authenticate(request, shared).catch(() => ({ user: null }));
  if (!user || !user.userId || user.ephemeral) return { signedIn: false, paid: false };
  return { signedIn: true, paid: (await outputAccess(shared, user.userId, "marketx")).paid };
}

function params(u) {
  const g = (k) => (u.searchParams.get(k) || "").trim().slice(0, 120);
  return { months: g("months"), scope: g("scope") === "all" ? "all" : "likely", use: g("use"), kind: g("kind"), min: g("min"), q: g("q") };
}

export function registerMarketxRoutes(router) {
  const metros = async (request, env) => jsonResponse3({
    success: true,
    source: "Each city's open-data building permits, commercial and multifamily work of $250,000 or more, read into WeylandAI's own index",
    metros: await metroList(env.DB),
    uses: USES.map((x) => ({ key: x.key, label: x.label, doorHeavy: x.doorHeavy })),
  });
  router.get("/api/marketx/metros", metros);
  // The old trend route (retired 2026-09-12 for lack of first-party data) answers with the metros.
  router.get("/api/marketx/trends", metros);

  router.get("/api/marketx/metro/:metro", async (request, env) => {
    const metro = request.params.metro;
    if (!CITIES[metro]) return jsonResponse3({ success: false, message: "MarketX covers " + Object.values(CITIES).map((c) => c.name).join(", ") + "." }, 404);
    const a = await access(request, env);
    const p = params(new URL(request.url));
    const r = await metroSummary(env.DB, metro, { ...p, limit: a.paid ? PAID : FREE });
    const bids = await openBids(env.WEYLAND_DB, r.state, r.today, a.paid ? 25 : 3);
    return jsonResponse3({ success: true, paid: a.paid, signedIn: a.signedIn, limited: !a.paid, ...r, bids });
  });

  router.get("/api/marketx/metro/:metro/:file", async (request, env) => {
    const metro = request.params.metro, file = request.params.file;
    if (!CITIES[metro] || !["projects.csv", "companies.csv"].includes(file)) return jsonResponse3({ success: false, message: "Not found." }, 404);
    const a = await access(request, env);
    if (!a.paid) return jsonResponse3({ success: false, code: "PAYMENT_REQUIRED", message: "The CSV comes with MarketX, the suite or the $100 first submittal.", upgradeUrl: "/pricing" }, 402);
    const p = params(new URL(request.url));
    const r = await metroSummary(env.DB, metro, { ...p, limit: CSV_ROWS });
    const name = `marketx-${metro}-${r.months}mo-${file}`;
    const body = file === "projects.csv"
      ? csv(["issued", "permit", "kind", "use", "door scope", "value", "address", "owner", "contractor", "applicant", "sqft", "units", "description", "link"],
        r.largest.map((x) => [x.issued, x.permit_no, x.kind, useLabel(x.use), x.scope, x.valuation, x.address, x.owner, x.contractor, x.applicant, x.sqft, x.units, x.description, x.url]))
      : csv(["role", "name", "projects", "permitted value", "latest permit"],
        [...r.contractors.map((x) => ["contractor", x.name, x.projects, x.value, x.latest]), ...r.owners.map((x) => ["owner", x.name, x.projects, x.value, x.latest])]);
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
  });
}
