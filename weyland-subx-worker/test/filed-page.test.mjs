// A filed price book whose index is another edition: the packet reads that very
// PDF for the page naming the model instead of listing "page not pinned"
// (2026-10-08; live on Berryessa that was 5 of 11 items).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { modelPattern, bestPageFor, pageNamingInFiledPdf, filedTextKey, scheduleTokens } from "../../weyland-shared/filed-page.js";
import { getDocumentPagePdf } from "../../weyland-shared/cut-sheet-pages.js";
import { citedPagesForSession } from "../src/routes/subx-workspace.js";

test("a model is matched as a token, not inside a price or a longer number", () => {
  const re = modelPattern("4040XP");
  assert.ok(re.test("LCN 4040XP-EDA closer"));
  assert.equal("ORDER 94040XP".match(modelPattern("4040XP")), null);
  assert.equal("LIST $1,992.70".match(modelPattern("9927")), null);
  assert.ok("99 Series 9927-EO exit device".match(modelPattern("9927")));
  assert.ok("PA-AX-99 27 EO".match(modelPattern("99-27")));
  assert.equal(modelPattern("99"), null, "too short to stand for a product");
});

test("the best page is the one naming the model most, never the contents page", () => {
  const pages = [
    { page: 2, text: "TABLE OF CONTENTS\n4040XP ........ 31\n4110 ........ 40" },
    { page: 31, text: "4040XP Series closers. 4040XP REG, 4040XP EDA, 4040XP CUSH" },
    { page: 33, text: "Accessories for 4040XP" },
  ];
  assert.deepEqual(bestPageFor(pages, "4040XP"), { pageNum: 31, mentions: 4 });
});

function fakeEnv(pagesText, extras = {}) {
  const store = new Map();
  const calls = [];
  return {
    calls, store,
    UPLOADS: {
      async get(k) { if (!store.has(k)) return null; const v = store.get(k); return { async json() { return JSON.parse(v); }, async arrayBuffer() { return v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : new TextEncoder().encode(v).buffer; } }; },
      async put(k, v) { store.set(k, typeof v === "string" ? v : new Uint8Array(v)); },
      async head(k) { return store.has(k) ? {} : null; },
    },
    OCR_SERVICE: {
      async fetch(url, init) {
        const start = Number(init.headers["X-Start-Page"]);
        calls.push(start);
        const all = pagesText.map((text, i) => ({ page: i + 1, text, source: "text_layer" }));
        const win = all.slice(start - 1, start - 1 + 2); // two pages per window, to exercise paging
        const end = start - 1 + win.length;
        return new Response(JSON.stringify({ pages: win, hasMore: end < all.length, nextPage: end < all.length ? end + 1 : null }));
      },
    },
    ...extras,
  };
}

test("the filed PDF is read in windows once, cached in R2, and searched", async () => {
  const env = fakeEnv(["cover", "contents", "Von Duprin 99 Series: 9927-EO, 9927-L", "98 Series"]);
  env.store.set("manufacturer-catalogs/vd.pdf", new Uint8Array([1, 2, 3]));
  assert.deepEqual(await pageNamingInFiledPdf(env, "manufacturer-catalogs/vd.pdf", "9927"), { pageNum: 3, mentions: 2 });
  assert.deepEqual(env.calls, [1, 3]);
  assert.ok(env.store.has(filedTextKey("manufacturer-catalogs/vd.pdf")));
  await pageNamingInFiledPdf(env, "manufacturer-catalogs/vd.pdf", "9927");
  assert.deepEqual(env.calls, [1, 3], "the second build reads the cache");
});

test("the packet cites the filed book's own page where the index was another edition, and cuts it from that file", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT); CREATE TABLE hardware_components (id TEXT, set_id TEXT, component_type TEXT, quantity INTEGER, manufacturer TEXT, model TEXT, catalog_number TEXT, sequence_order INTEGER);");
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','2')").run();
  db.prepare("INSERT INTO hardware_components VALUES ('c1','h1','closer',1,'LCN','4040XP EDA',NULL,1)").run();
  db.prepare("INSERT INTO hardware_components VALUES ('c2','h1','stop',1,'Nobody','XYZ-1',NULL,2)").run();
  const d1 = { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; } }; return st; } };

  const book = await PDFDocument.create();
  const font = await book.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 4; i++) book.addPage([612, 792]).drawText("LCN page " + i, { x: 50, y: 700, size: 12, font });
  const env = fakeEnv(["LCN Price Book 2026", "Contents ...... ...... ...... ...... ...... ......", "4040XP Series: 4040XP REG, 4040XP EDA", "4110"], { DB: d1 });
  env.store.set("manufacturer-catalogs/lcn.pdf", new Uint8Array(await book.save()));

  const match = async (c) => c.manufacturer === "LCN"
    ? { matched: true, matchType: "base_model", maker: { typed: true, known: true, name: "LCN" }, product: { manufacturer: "LCN", model: "4040XP", base_model: "4040XP" }, cutSheets: [{ r2Key: "manufacturer-catalogs/lcn.pdf", pinnedPage: null, catalogueId: "lcn", title: "LCN Price Book (2026)" }], cataloguePages: [] }
    : { matched: false, reasonText: "nothing catalogued" };
  const r = await citedPagesForSession("s1", env, match);
  assert.equal(r.matched, 1);
  assert.equal(r.unmatched, 1);
  assert.deepEqual(r.pages.map((p) => [p.r2Key, p.pageNum, p.kind, p.sets]), [["manufacturer-catalogs/lcn.pdf", 3, "price_book_filed", ["2"]]]);
  assert.ok(!r.missing.some((m) => m.code === "page_not_pinned"));

  const cut = await getDocumentPagePdf(env, PDFDocument, { r2Key: "manufacturer-catalogs/lcn.pdf", pageNum: 3 });
  const one = await PDFDocument.load(cut.bytes);
  assert.equal(one.getPageCount(), 1);
});

test("a product whose catalogue model is too short is searched by the schedule's own number", () => {
  assert.deepEqual(scheduleTokens("PA-AX-9927-EO-F-LBR-499F"), ["9927EO", "9927", "499F"]);
  assert.deepEqual(scheduleTokens("PA-AX-99-L-F-2SI-06"), ["99L"]);
  assert.deepEqual(scheduleTokens("4040XP EDA"), ["4040XPEDA", "4040XP"]);
});

test("a model the catalogue does not list is found in the maker's own filed price book by the schedule's number", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT); CREATE TABLE hardware_components (id TEXT, set_id TEXT, component_type TEXT, quantity INTEGER, manufacturer TEXT, model TEXT, catalog_number TEXT, sequence_order INTEGER);
    CREATE TABLE manufacturers (id INTEGER, name TEXT); CREATE TABLE products (id INTEGER, manufacturer_id INTEGER); CREATE TABLE product_documents (product_id INTEGER, document_type TEXT, active INTEGER, r2_object_key TEXT, document_title TEXT);`);
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1')").run();
  db.prepare("INSERT INTO hardware_components VALUES ('c1','h1','seal',1,'Zero International','188SBK PSA',NULL,1)").run();
  db.prepare("INSERT INTO manufacturers VALUES (7,'Zero International')").run();
  db.prepare("INSERT INTO products VALUES (70,7)").run();
  db.prepare("INSERT INTO product_documents VALUES (70,'cut_sheet',1,'manufacturer-catalogs/zero.pdf','Zero Price Book (2026)')").run();
  const d1 = { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; } }; return st; } };
  const env = fakeEnv(["Zero price book", "Gasketing: 188S, 188SBK self-adhesive, 188SBK PSA"], { DB: d1 });
  env.store.set("manufacturer-catalogs/zero.pdf", new Uint8Array([1]));
  const match = async () => ({ matched: false, reason: "model_not_in_catalogue", maker: { typed: true, known: true, name: "Zero International" }, cutSheets: [], cataloguePages: [] });
  const r = await citedPagesForSession("s1", env, match);
  assert.deepEqual(r.pages.map((p) => [p.r2Key, p.pageNum, p.manufacturer, p.title]), [["manufacturer-catalogs/zero.pdf", 2, "Zero International", "Zero Price Book"]]);
  assert.equal(r.missing.length, 0);
});
