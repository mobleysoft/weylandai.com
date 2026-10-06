// weyland-cutsheetx-worker/src/lib/product-coverage.js
//
// Catalogue pages are first-class documents (2026-10-05). A product is
// "covered" when a standalone cut sheet is filed for it OR a page of an
// ingested manufacturer catalogue names its model. 7,792 of 10,508 products
// have a sheet; this measures the rest against the 3,622 catalogue pages
// (catalogue_pages_fts) a batch at a time from the background job, and stores
// one row per product in product_coverage so the coverage endpoint can report
// a real, checked number instead of a guess. Re-checked weekly.

const BATCH_DEFAULT = 250;

async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS product_coverage (product_id TEXT PRIMARY KEY, manufacturer TEXT, base_model TEXT, has_sheet INTEGER NOT NULL DEFAULT 0, catalogue_pages INTEGER NOT NULL DEFAULT 0, first_catalogue_id TEXT, first_page_num INTEGER, checked_at TEXT NOT NULL)"
  ).run();
}

function ftsToken(model) {
  const t = String(model || "").replace(/["'*^]/g, "").trim();
  return t.length >= 3 ? '"' + t + '"' : null;
}

/** Check up to `limit` products that have never been checked or are older than 7 days. */
export async function computeProductCoverageBatch(env, limit = BATCH_DEFAULT) {
  await ensureTable(env);
  const rows = await env.DB.prepare(
    "SELECT p.id, p.base_model, m.name AS manufacturer FROM products p LEFT JOIN manufacturers m ON m.id = p.manufacturer_id " +
    "LEFT JOIN product_coverage c ON c.product_id = p.id " +
    "WHERE c.product_id IS NULL OR c.checked_at < datetime('now', '-7 days') ORDER BY c.checked_at ASC NULLS FIRST LIMIT ?"
  ).bind(limit).all();
  const summary = { checked: 0, withSheet: 0, withCataloguePage: 0, withNeither: 0 };
  const now = new Date().toISOString();
  for (const p of rows.results || []) {
    summary.checked++;
    const sheet = await env.DB.prepare(
      "SELECT 1 FROM product_documents WHERE product_id = ? AND document_type = 'cut_sheet' AND (active = 1 OR active IS NULL) LIMIT 1"
    ).bind(p.id).first();
    let pages = 0, firstCat = null, firstPage = null;
    const token = ftsToken(p.base_model);
    if (token) {
      try {
        const hit = await env.DB.prepare(
          "SELECT COUNT(*) AS n, MIN(c.catalogue_id || ':' || printf('%05d', pg.page_num)) AS first FROM catalogue_pages_fts f " +
          "JOIN catalogue_pages pg ON pg.rowid = f.rowid JOIN catalogues c ON c.catalogue_id = pg.catalogue_id " +
          "WHERE catalogue_pages_fts MATCH ? AND (? IS NULL OR lower(c.manufacturer) = lower(?) OR lower(c.manufacturer) = lower(replace(?, ' ', '-')))"
        ).bind(token, p.manufacturer, p.manufacturer, p.manufacturer).first();
        pages = hit?.n || 0;
        if (hit?.first) { const [cid, pn] = hit.first.split(":"); firstCat = cid; firstPage = parseInt(pn, 10); }
      } catch (e) { /* a bad token is just "no pages" */ }
    }
    const hasSheet = sheet ? 1 : 0;
    if (hasSheet) summary.withSheet++; else if (pages) summary.withCataloguePage++; else summary.withNeither++;
    await env.DB.prepare(
      "INSERT INTO product_coverage (product_id, manufacturer, base_model, has_sheet, catalogue_pages, first_catalogue_id, first_page_num, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(product_id) DO UPDATE SET manufacturer=excluded.manufacturer, base_model=excluded.base_model, has_sheet=excluded.has_sheet, catalogue_pages=excluded.catalogue_pages, first_catalogue_id=excluded.first_catalogue_id, first_page_num=excluded.first_page_num, checked_at=excluded.checked_at"
    ).bind(p.id, p.manufacturer || null, p.base_model, hasSheet, pages, firstCat, firstPage, now).run();
  }
  return summary;
}

/** Aggregate for the coverage endpoint. Honest about how much has been checked so far. */
export async function productCoverageSummary(env) {
  await ensureTable(env);
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM products").first();
  const agg = await env.DB.prepare(
    "SELECT COUNT(*) AS checked, SUM(has_sheet) AS with_sheet, SUM(CASE WHEN has_sheet = 0 AND catalogue_pages > 0 THEN 1 ELSE 0 END) AS catalogue_only, " +
    "SUM(CASE WHEN has_sheet = 0 AND catalogue_pages = 0 THEN 1 ELSE 0 END) AS neither, MAX(checked_at) AS last_checked FROM product_coverage"
  ).first();
  const checked = agg?.checked || 0;
  const covered = (agg?.with_sheet || 0) + (agg?.catalogue_only || 0);
  return {
    products: total?.n || 0,
    checked,
    withSheet: agg?.with_sheet || 0,
    withCataloguePageOnly: agg?.catalogue_only || 0,
    withNeither: agg?.neither || 0,
    coveredPctOfChecked: checked ? Math.round((covered / checked) * 1000) / 10 : null,
    complete: checked >= (total?.n || 0),
    lastChecked: agg?.last_checked || null,
  };
}
