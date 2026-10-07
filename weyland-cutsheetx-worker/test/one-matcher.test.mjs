// node --test weyland-cutsheetx-worker/test/*.test.mjs
// One matcher, one answer: POST /api/cut-sheets/match (the CutsheetX MATCH form and the homepage's
// TRY A REAL MATCH) gives the same answer for a line as POST /api/cut-sheets/match-batch (the
// homepage paste), whether the paste sends text or fields. Runs the real route handlers and the real
// matcher SQL against an in-memory SQLite database shaped like weyland_db.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { registerCutSheetMatchRoutes, lineFromFields } from "../src/routes/cut-sheet-match.js";
import { sqliteD1 } from "./d1-sqlite.mjs";

export const FIXTURE_SQL = [
  "CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);",
  "CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT,",
  "  product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);",
  "CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT,",
  "  r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER);",
  "CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);",
  "CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text TEXT);",
  "CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text);",
  "CREATE TABLE cut_sheet_misses (id TEXT, manufacturer TEXT, model TEXT, count INTEGER, first_seen TEXT, last_seen TEXT, UNIQUE(manufacturer, model));",
  "INSERT INTO manufacturers VALUES ('schlage','Schlage','schlage'),('lcn','LCN','lcn'),('vd','Von Duprin','von-duprin'),('hager','Hager','hager');",
  "INSERT INTO products VALUES",
  "  ('p-l9080','schlage','L9080','SCHLAGE L9080','doors','L Series','Mortise lock',NULL,0,0),",
  "  ('p-4040xp','lcn','4040XP','LCN 4040XP','doors','4040XP','Closer',NULL,0,0),",
  "  ('p-99','vd','99','Von Duprin 99','doors','98/99','Exit device',NULL,0,0),",
  "  ('p-bb1279','hager','BB1279','Hager BB1279','doors','BB1279','Hinge',NULL,0,0);",
  "INSERT INTO product_documents VALUES",
  "  ('d-4040xp','p-4040xp','cut_sheet','LCN Price Book (LCN 4040XP product listed around pp.6-48 in the edition)',NULL,'manufacturer-catalogs/lcn.pdf','subx-uploads',152,NULL,'2025-01-01',1),",
  "  ('d-99','p-99','cut_sheet','Von Duprin Price Book (99 around p.33)',NULL,'manufacturer-catalogs/vd.pdf','subx-uploads',120,NULL,'2025-01-01',1);",
  "INSERT INTO catalogues VALUES ('cat-l','Schlage L Series Catalog','Schlage','catalogues/schlage-l.pdf','schlage-l.pdf',80),",
  "  ('cat-pb','Schlage Mechanical Price Book','Schlage','','schlage-pb.pdf',300);",
  "INSERT INTO catalogue_pages VALUES ('cat-l',25,'L9080 storeroom function mortise lock'),('cat-l',59,'L9080 trim options'),('cat-pb',161,'L9080 list price');",
  "INSERT INTO catalogue_pages_fts(rowid, text) SELECT rowid, text FROM catalogue_pages;",
].join("\n");

const DB = sqliteD1(FIXTURE_SQL);
const env = { DB, UPLOADS: { async head(key) { return key === "catalogues/schlage-l.pdf" ? { size: 1 } : null; } } };
after(() => DB.database.close());

const router = new NativeRouter();
registerCutSheetMatchRoutes(router, {
  authenticate: async () => ({ user: { ephemeral: true, id: "eph_test" } }),
  requireProductAccess: async () => null,
});
async function post(path, body) {
  const req = new Request("https://weylandai.com" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const r = await router.handle(req, env, { waitUntil() {} });
  return { status: r.status, data: await r.json() };
}
const answer = (x) => ({ matched: !!x.matched, product: x.product ? x.product.id : null, confidence: x.confidence ?? null, matchType: x.matchType ?? null, citation: x.citation || null });

const LINES = [
  { manufacturer: "Schlage", model: "L9080", paste: "Schlage L9080" },
  { manufacturer: "", model: "Schlage L9080", paste: "Schlage L9080" },
  { manufacturer: "Schlage", model: "Schlage L9080", paste: "Schlage L9080" },
  { manufacturer: "LCN", model: "4040XP", paste: "LCN 4040XP" },
  { manufacturer: "Von Duprin", model: "99", paste: "Von Duprin 99" },
  { manufacturer: "Von Duprin", model: "99 EO", paste: "Von Duprin 99 EO" },
  { manufacturer: "Hager", model: "BB1279 4.5 x 4.5 US26D", paste: "Hager BB1279 4.5 x 4.5 US26D" },
  { manufacturer: "", model: "4040XP", paste: "4040XP" },
  { manufacturer: "Acme", model: "ZZ-404", paste: "Acme ZZ-404" },
];

for (const f of LINES) {
  test("one answer for " + JSON.stringify(f.paste) + " from /match, /match-batch text and /match-batch lines", async () => {
    const single = await post("/api/cut-sheets/match", { manufacturer: f.manufacturer || undefined, model: f.model });
    const pasted = await post("/api/cut-sheets/match-batch", { text: f.paste });
    const fields = await post("/api/cut-sheets/match-batch", { lines: [{ manufacturer: f.manufacturer || undefined, model: f.model }] });
    assert.equal(single.status, 200);
    assert.equal(pasted.status, 200);
    assert.equal(fields.status, 200);
    assert.deepEqual(answer(single.data), answer(pasted.data.results[0]));
    assert.deepEqual(answer(fields.data.results[0]), answer(pasted.data.results[0]));
  });
}

test("Schlage L9080 is a match, cited by its catalogue page, on the single-line route", async () => {
  const { status, data } = await post("/api/cut-sheets/match", { manufacturer: "Schlage", model: "L9080" });
  assert.equal(status, 200);
  assert.equal(data.matched, true);
  assert.equal(data.product.name, "SCHLAGE L9080");
  assert.deepEqual(data.cutSheets, []);
  assert.equal(data.citation.kind, "catalogue_page");
  assert.equal(data.citation.title, "Schlage L Series Catalog");
  assert.equal(data.citation.page, "25");
  assert.match(data.citation.url, /^\/api\/cps\/catalogues\/cat-l\/pages\/25\/render/);
  assert.equal(data.cataloguePage.pageNum, 25);
});

test("/match keeps every key it returned before", async () => {
  const { data } = await post("/api/cut-sheets/match", { manufacturer: "LCN", model: "4040XP", component_type: "closer" });
  for (const k of ["matched", "component", "product", "cutSheets", "cataloguePages", "confidence", "matchType"]) assert.ok(k in data, k);
  assert.deepEqual(data.component, { manufacturer: "LCN", model: "4040XP", component_type: "closer" });
  assert.equal(data.product.series, "4040XP");
  assert.equal(data.cutSheets[0].id, "d-4040xp");
  assert.equal(data.cutSheets[0].pageHint, "6-48");
  assert.match(data.cutSheets[0].pageUrl, /^\/api\/cut-sheets\/sheet\/d-4040xp\/pdf/);
  assert.equal(data.citation.kind, "cut_sheet");
});

test("an unmatched line is recorded as a miss with the parsed manufacturer and model", async () => {
  const { data } = await post("/api/cut-sheets/match", { manufacturer: "Acme", model: "ZZ-404 626" });
  assert.equal(data.matched, false);
  assert.equal(data.citation, null);
  const row = DB.database.prepare("SELECT manufacturer, model FROM cut_sheet_misses WHERE manufacturer = 'acme' AND model = 'zz-404'").get();
  assert.ok(row, "miss recorded as acme / zz-404");
});

test("a numeric model (JSON number) is read as text", async () => {
  const { status, data } = await post("/api/cut-sheets/match", { manufacturer: "Von Duprin", model: 99 });
  assert.equal(status, 200);
  assert.equal(data.product.id, "p-99");
});

test("missing model and catalog_number is still a 400", async () => {
  const { status } = await post("/api/cut-sheets/match", { manufacturer: "Schlage" });
  assert.equal(status, 400);
});

test("lineFromFields keeps the visitor's split for a maker the catalogue does not list", () => {
  const long = lineFromFields({ manufacturer: "Acme Door Hardware Co Inc", model: "ZZ-404" }, ["Schlage"]);
  assert.equal(long.manufacturer, "Acme Door Hardware Co Inc");
  assert.equal(long.model, "ZZ-404");
  assert.equal(lineFromFields({ manufacturer: "Schlage", model: "L9080, 626" }, ["Schlage"]).model, "L9080");
  assert.equal(lineFromFields({ model: "  " }, []), null);
});
