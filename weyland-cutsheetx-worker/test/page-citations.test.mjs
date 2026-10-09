// node --test weyland-cutsheetx-worker/test/*.test.mjs
// The page, not the book (2026-10-09). The schedule-tools audit of 2026-10-09-07-02 found
// CutsheetX citing "LCN Price Book pp.6-48 ... search this PDF" for LCN 4040XP (the SubX packet
// cites p.41 of the LCN 4000 catalogue), pp.26-198 for Von Duprin 99, "around p.None" for
// Glynn-Johnson 100S, a text-only page ahead of an openable one for Ives 8400, and no match for
// Zero 188SBK (the catalogue spells it 188S-BK). Each case below runs the real route handlers, the
// real matcher SQL and the shared page steps (weyland-shared/page-citations.js) against an
// in-memory SQLite database with real-shaped rows and the filed books' cached text.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../src/lib/router.js";
import { registerCutSheetMatchRoutes } from "../src/routes/cut-sheet-match.js";
import { sqliteD1 } from "./d1-sqlite.mjs";
import { citationFor, sheetTitle, specificPageHint, matchComponentToCutSheets } from "../../weyland-shared/product-database.js";
import { filedSearchModels, citationsFor, newReadBudget, filedPageFor, variantPageFor } from "../../weyland-shared/page-citations.js";
import { variantPagesFor, filedTextKey } from "../../weyland-shared/filed-page.js";

const BOOK = (who, range) => `${who} Price Book (full manufacturer price book; product listed around ${range} in the edition originally catalogued - search this PDF for the exact model, current edition may have shifted pages)`;
const SQL = [
  "CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);",
  "CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT, product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);",
  "CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT, r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER, mime_type TEXT);",
  "CREATE TABLE product_variants (product_id TEXT, full_model_number TEXT, list_price REAL, catalog_page TEXT);",
  "CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);",
  "CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text TEXT, text_content TEXT);",
  "CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text);",
  "CREATE TABLE cut_sheet_misses (id TEXT, manufacturer TEXT, model TEXT, count INTEGER, first_seen TEXT, last_seen TEXT, UNIQUE(manufacturer, model));",
  "INSERT INTO manufacturers VALUES ('lcn','LCN','lcn'),('vd','Von Duprin','von-duprin'),('gj','Glynn-Johnson','glynn-johnson'),('ives','Ives','ives'),('zero','Zero International','zero');",
  "INSERT INTO products VALUES",
  "  ('p-4040xp','lcn','4040XP','LCN 4040XP','doors','4040XP','Closer',NULL,0,0),",
  "  ('p-99','vd','99','Von Duprin 99 Series Rim Exit Device','doors','99','Exit device',NULL,1,1),",
  "  ('p-100','gj','100','GLYNN-JOHNSON 100','doors','1, 2','Overhead stop',NULL,0,0),",
  "  ('p-8400','ives','8400','IVES 8400','doors','8400','Protection plate',NULL,0,0),",
  "  ('p-188sb','zero','188S-B','ZERO 188S-B','doors','Silicone/black/PSA','Gasketing',NULL,0,0);",
  "INSERT INTO product_documents VALUES",
  `  ('d-4040xp','p-4040xp','cut_sheet','${BOOK("LCN", "pp.6-48")}',NULL,'manufacturer-catalogs/lcn.pdf','subx-uploads',152,NULL,'2025-01-01',1,'application/pdf'),`,
  `  ('d-99','p-99','cut_sheet','${BOOK("Von Duprin", "pp.26-198")}',NULL,'manufacturer-catalogs/vd.pdf','subx-uploads',239,NULL,'2025-01-01',1,'application/pdf'),`,
  `  ('d-100','p-100','cut_sheet','${BOOK("Glynn-Johnson", "p.None")}',NULL,'manufacturer-catalogs/gj.pdf','subx-uploads',60,NULL,'2025-01-01',1,'application/pdf'),`,
  `  ('d-188','p-188sb','cut_sheet','${BOOK("Zero", "pp.42-44")}',NULL,'manufacturer-catalogs/zero.pdf','subx-uploads',70,NULL,'2025-01-01',1,'application/pdf');`,
  // Price rows as the books were imported: the page each was read from.
  "INSERT INTO product_variants VALUES ('p-99','99-EO',2085,'26'),('p-99','99-L',2954,'26'),('p-99','99-L-F',3564,'26'),('p-99','9927-EO',3033,'27'),('p-188sb','188S-BK [8'' (2.4 m)]',22.88,'44');",
  "INSERT INTO catalogues VALUES",
  "  ('cat-lcn4000','LCN 4000 Series Surface Mounted Closers Catalog','lcn','catalogues/lcn-4000.pdf','lcn-4000.pdf',60),",
  "  ('cat-lcnpb','LCN Price Book 2025','lcn','','lcn-pb.pdf',152),",
  "  ('cat-ivespb','Ives Price Book 2024','ives','','ives-pb.pdf',240),",
  "  ('cat-ivescat','Ives Architectural Hardware Products Catalog','ives','catalogues/ives-cat.pdf','ives-cat.pdf',260);",
  "INSERT INTO catalogue_pages (catalogue_id, page_num, text) VALUES",
  "  ('cat-lcn4000',3,'Contents 4040XP 41 4041 44'),",
  "  ('cat-lcn4000',41,'4040XP closer: 4040XP REG, 4040XP CUSH, 4040XP EDA'),",
  "  ('cat-lcnpb',46,'4040XP 4040XP 4040XP 4040XP list prices'),",
  "  ('cat-ivespb',93,'8400 8400 8400 protection plate list prices'),",
  "  ('cat-ivescat',131,'8400 protection plate');",
  "UPDATE catalogue_pages SET text_content = text;",
  "INSERT INTO catalogue_pages_fts(rowid, text) SELECT rowid, text FROM catalogue_pages;",
].join("\n");

// The filed books' text as SubX's packet build caches it in R2 (filed-page.js filedTextKey):
// Von Duprin prints 99 as a grid ("[98/99] . EO"), Zero prints 188S-BK, Glynn-Johnson prints the
// 100 series as 101S, 102S ... under a "100" size column.
const TEXT = {
  "manufacturer-catalogs/vd.pdf": [{ page: 2, text: "Contents ........ ........ ........ ........ ........ ........" }, { page: 26, text: "98/99 SERIES Rim devices\n[98/99] .  EO . [ ] . [ ] $2,284 $2,057\n[98/99] .  L . F . [ ] $3,337" }, { page: 27, text: "[98/99]27 . EO . [ ] $3,033" }],
  "manufacturer-catalogs/zero.pdf": [{ page: 42, text: "Thresholds 65A" }, { page: 44, text: "188S-BK Silicone/black/PSA $22.88\n188S-BR Silicone/brown/PSA" }],
  "manufacturer-catalogs/gj.pdf": [{ page: 5, text: "Overhead holders and stops 70/79 90 100 410 450" }, { page: 20, text: "100 SERIES CONCEALED OVERHEAD DOOR HOLDERS/STOPS\nSTOP-ONLY 101S, 102S 100 1, 2 $614\n103S, 104S 100 3, 4 $614\n105S, 106S 100 5, 6 $614" }, { page: 23, text: "100 SERIES CHANNEL ASSEMBLY & PARTS 104F/S" }],
};
const ON_FILE = new Set(["catalogues/lcn-4000.pdf", "catalogues/ives-cat.pdf"]);
const UPLOADS = {
  async head(key) { return ON_FILE.has(key) ? { size: 1 } : null; },
  async get(key) {
    for (const [r2Key, pages] of Object.entries(TEXT)) if (key === filedTextKey(r2Key)) return { async json() { return pages; } };
    return null;
  },
  async put() {},
};
const DB = sqliteD1(SQL);
const env = { DB, UPLOADS };
after(() => DB.database.close());

const router = new NativeRouter();
registerCutSheetMatchRoutes(router, { authenticate: async () => ({ user: { ephemeral: true, id: "eph_test" } }), requireProductAccess: async () => null });
async function post(path, body) {
  const r = await router.handle(new Request("https://weylandai.com" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), env, { waitUntil() {} });
  return { status: r.status, data: await r.json() };
}
const match = (manufacturer, model) => post("/api/cut-sheets/match", { manufacturer, model });
// The audit's bar: one page or a run of at most three, a URL that opens.
const specific = (page) => { const m = String(page ?? "").match(/^(\d+)(?:-(\d+))?$/); return !!m && (!m[2] || Number(m[2]) - Number(m[1]) <= 2); };

test("LCN 4040XP cites the LCN 4000 catalogue's page, as the SubX packet does, not pp.6-48 of the price book", async () => {
  const { data } = await match("LCN", "4040XP");
  assert.equal(data.matched, true);
  assert.deepEqual([data.citation.kind, data.citation.title, data.citation.page], ["catalogue_page", "LCN 4000 Series Surface Mounted Closers Catalog", "41"]);
  assert.match(data.citation.url, /^\/api\/cps\/catalogues\/cat-lcn4000\/pages\/41\/render/);
  // The price book's text-only page is listed after it, with no link; the contents page never.
  assert.deepEqual(data.citations.map((c) => [c.title, c.page, !!c.url]), [["LCN 4000 Series Surface Mounted Closers Catalog", "41", true], ["LCN Price Book 2025", "46", false]]);
  assert.ok(!data.citations.some((c) => c.page === "3"));
});

test("Von Duprin 99 cites the price book's page where the 99 is priced, confirmed in the filed PDF", async () => {
  const { data } = await match("Von Duprin", "99");
  assert.equal(data.product.id, "p-99");
  assert.deepEqual([data.citation.kind, data.citation.title, data.citation.page, data.citation.how], ["price_book", "Von Duprin Price Book", "26", "price_row"]);
  assert.equal(data.citation.url, "/api/cut-sheets/sheet/d-99/pdf#page=26");
  assert.ok(data.citations.every((c) => specific(c.page)), "pp.26-198 is never a citation");
});

test("Von Duprin PA-AX-99-L-F-2SI-06: the PA-AX- prefix and the tail do not stop the page of 99-L-F", async () => {
  const { data } = await match("Von Duprin", "PA-AX-99-L-F-2SI-06");
  assert.equal(data.product.id, "p-99");
  assert.deepEqual([data.citation.page, data.citation.number], ["26", "99-L-F"]);
  assert.match(data.citation.url, /^\/api\/cut-sheets\/sheet\/d-99\/pdf#page=26$/);
});

test("Glynn-Johnson 100S cites a page of the filed book, and never prints \"around p.None\"", async () => {
  const { data } = await match("Glynn-Johnson", "100S");
  assert.equal(data.product.id, "p-100");
  assert.deepEqual([data.citation.title, data.citation.page, data.citation.how], ["Glynn-Johnson Price Book", "20", "filed_pdf"]);
  assert.equal(data.citation.url, "/api/cut-sheets/sheet/d-100/pdf#page=20");
  assert.doesNotMatch(JSON.stringify(data), /p\.\s*None/);
});

test("Ives 8400: the catalogue page that opens comes first, the price book's text-only page after", async () => {
  const { data } = await match("Ives", "8400");
  assert.deepEqual([data.citation.title, data.citation.page, data.citation.pdfAvailable], ["Ives Architectural Hardware Products Catalog", "131", true]);
  assert.deepEqual(data.citations.map((c) => [c.page, c.pdfAvailable]), [["131", true], ["93", false]]);
});

test("Zero 188SBK, as Rockford and Berryessa print it, matches 188S-B and cites the page that prints 188S-BK", async () => {
  for (const model of ["188SBK", "188S-BK", "188SBK PSA"]) {
    const { data } = await match("Zero", model);
    assert.equal(data.matched, true, model);
    assert.equal(data.product.id, "p-188sb", model);
    assert.deepEqual([data.citation.title, data.citation.page, data.citation.url], ["Zero Price Book", "44", "/api/cut-sheets/sheet/d-188/pdf#page=44"], model);
  }
});

test("CloseX's lines as the job prints them (model and tail in one field) reach the same product and page", async () => {
  // weyland-forms-worker/src/routes/closex.js calls the matcher with { manufacturer, model } only.
  const zero = await matchComponentToCutSheets({ manufacturer: "Zero International", model: "188SBK PSA" }, env, { pagesWhenUnpinned: true });
  assert.equal(zero.product.id, "p-188sb");
  const vd = await matchComponentToCutSheets({ manufacturer: "Von Duprin", model: "PA-AX-99-L-F-2SI-06" }, env, { pagesWhenUnpinned: true });
  assert.equal(vd.product.id, "p-99");
  const budget = newReadBudget(10000);
  assert.deepEqual((await filedPageFor(env, zero, budget, "188SBK PSA"))?.pageNum, 44);
  assert.deepEqual((await variantPageFor(env, vd, "PA-AX-99-L-F-2SI-06", budget))?.pageNum, 26);
});

test("a known maker's model that is nowhere in its catalogue or books is still a stated miss", async () => {
  const { data } = await match("LCN", "9977QZ");
  assert.equal(data.matched, false);
  assert.equal(data.reason, "model_not_in_catalogue");
  assert.equal(data.citation, null);
});

test("the paste gives every line the same citation as the single match", async () => {
  const lines = [["LCN", "4040XP"], ["Von Duprin", "99"], ["Glynn-Johnson", "100S"], ["Ives", "8400"], ["Zero", "188SBK"], ["Zero", "188SBK PSA"], ["Von Duprin", "PA-AX-99-L-F-2SI-06"], ["LCN", "9977QZ"]];
  const pasted = await post("/api/cut-sheets/match-batch", { text: lines.map((l) => l.join(" ")).join("\n") });
  assert.equal(pasted.status, 200);
  assert.equal(pasted.data.results.length, lines.length);
  for (const [i, [mfr, model]] of lines.entries()) {
    const one = (await match(mfr, model)).data;
    const p = pasted.data.results[i];
    assert.equal(p.matched, one.matched, mfr + " " + model);
    assert.deepEqual(p.citation, one.citation, mfr + " " + model);
  }
  for (const r of pasted.data.results.filter((x) => x.matched)) assert.ok(r.citation && specific(r.citation.page) && r.citation.url, r.raw);
});

test("citation rules: a run over three pages is a book, p.None never prints, a page without a PDF goes last", () => {
  assert.equal(specificPageHint(BOOK("LCN", "pp.6-48")), null);
  assert.equal(specificPageHint(BOOK("Zero", "pp.42-44")).hint, "42-44");
  assert.equal(specificPageHint(BOOK("Glynn-Johnson", "p.None")), null);
  assert.equal(sheetTitle(BOOK("Glynn-Johnson", "p.None")), "Glynn-Johnson Price Book (full manufacturer price book; no page is filed for this product)");
  assert.equal(sheetTitle(BOOK("LCN", "pp.6-48")), BOOK("LCN", "pp.6-48"));
  const r = {
    matched: true,
    cutSheets: [{ id: "d", title: BOOK("LCN", "pp.6-48"), pageHint: "6-48", pageUrl: "/api/cut-sheets/sheet/d/pdf#page=6" }],
    cataloguePages: [{ catalogueId: "pb", title: "Price Book", pageNum: 93, pageUrl: null, pdfAvailable: false }, { catalogueId: "c", title: "Catalog", pageNum: 131, pageUrl: "/api/cps/catalogues/c/pages/131/render", pdfAvailable: true }],
  };
  assert.deepEqual([citationFor(r).title, citationFor(r).page], ["Catalog", "131"]);
  assert.equal(citationFor({ matched: true, cutSheets: [r.cutSheets[0]], cataloguePages: [] }), null, "pp.6-48 alone is not a citation");
});

test("the filed book is searched for the schedule's own, more specific number first", () => {
  assert.deepEqual(filedSearchModels({ model: "100" }, "100S"), ["100S", "100"]);
  assert.deepEqual(filedSearchModels({ model: "188S-B" }, "188SBK PSA"), ["188SBK", "188S-B", "188SBKPSA"]);
  assert.deepEqual(filedSearchModels({ model: "4040XP" }, "4040XP EDA"), ["4040XP", "4040XPEDA"]);
  assert.deepEqual(filedSearchModels({ model: "99" }, "PA-AX-99-L-F-2SI-06"), ["99", "99L"]);
});

test("a product named by itself is cited from the first page that prices it, never another series' page", async () => {
  const v = await variantPagesFor(env, { productId: "p-99", productModel: "99", scheduleModel: "99" });
  assert.deepEqual([...new Set(v.map((x) => x.pageNum))], [26], "9927-EO's p.27 is another product's page");
  assert.deepEqual(await variantPagesFor(env, { productId: "p-99", scheduleModel: "99" }), [], "without the product's model, nothing");
});

test("concurrent lookups in one request share one read of a book", async () => {
  let reads = 0;
  const slow = { DB, UPLOADS: { ...UPLOADS, async get(key) { reads++; await new Promise((r) => setTimeout(r, 5)); return UPLOADS.get(key); } } };
  const budget = newReadBudget(10000);
  const m = { matched: true, matchType: "exact", maker: { known: true, typed: "Zero", name: "Zero International" }, product: { id: "p-188sb", model: "188S-B" }, cutSheets: [{ id: "d-188", r2Key: "manufacturer-catalogs/vd-other.pdf", title: BOOK("Zero", "pp.42-44") }], cataloguePages: [] };
  TEXT["manufacturer-catalogs/vd-other.pdf"] = TEXT["manufacturer-catalogs/zero.pdf"];
  const out = await Promise.all([1, 2, 3, 4].map(() => citationsFor(slow, m, { budget, scheduleModel: "188SBK" })));
  assert.ok(out.every((c) => c[0].page === "44"));
  assert.equal(reads, 1);
});
