// weyland-market-intelligence-worker/src/routes/compx.js
//
// CompX (2026-10-08): public contract awards for building and door work
// (lib/awards.js): who won, how much, from which agency, by what method,
// and the vendor rollup that names the competitors.
//   GET /api/compx/awards?q=&fit=doors|building|all&agency=&vendor=&since=&limit=&format=csv
// Free: the 10 newest awards and the top 5 vendors for any search, so a
// visitor can see what CompX holds. All rows, the full rollup and the CSV
// come with CompX, the suite or the $100 first submittal.

import { jsonResponse3 } from "../lib/json-response.js";
import { authenticate } from "../lib/auth.js";
import { searchAwards } from "../lib/awards.js";
import { outputAccess } from "../../../weyland-shared/output-access.js";

const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function registerCompxRoutes(router) {
  router.get("/api/compx/awards", async (request, env) => {
    // The shared weyland_db holds the accounts; this worker's own DB holds the index.
    const shared = { ...env, DB: env.WEYLAND_DB };
    let paid = false, signedIn = false;
    const { user } = await authenticate(request, shared).catch(() => ({ user: null }));
    if (user && user.userId && !user.ephemeral) {
      signedIn = true;
      paid = (await outputAccess(shared, user.userId, "compx")).paid;
    }
    const u = new URL(request.url);
    const p = Object.fromEntries(["q", "fit", "agency", "vendor", "since", "limit", "format"].map((k) => [k, (u.searchParams.get(k) || "").trim().slice(0, 120)]));
    const r = await searchAwards(env.DB, { ...p, limit: paid ? (p.limit || 500) : 10 });
    if (p.format === "csv") {
      if (!paid) return jsonResponse3({ success: false, code: "PAYMENT_REQUIRED", message: "The CSV comes with CompX, the suite or the $100 first submittal.", upgradeUrl: "/pricing" }, 402);
      const lines = [["awarded_on", "agency", "title", "vendor", "amount", "method", "category", "pin", "trade_fit"].join(",")]
        .concat(r.rows.map((x) => [x.awarded_on, x.agency, x.title, x.vendor, x.amount, x.method, x.category, x.pin, x.trade_fit].map(csvCell).join(",")));
      return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="compx-awards.csv"' } });
    }
    return jsonResponse3({
      success: true, paid, signedIn,
      source: "NYC City Record contract awards (data.cityofnewyork.us), construction and door work since 2021",
      indexedAt: r.indexedAt, count: r.count, total: r.total,
      awards: r.rows, vendors: paid ? r.vendors : r.vendors.slice(0, 5), agencies: paid ? r.agencies : r.agencies.slice(0, 5),
      limited: !paid,
    });
  });
}
