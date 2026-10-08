// node --test weyland-shared/cut-sheet-matcher.test.mjs
// The one matcher against an in-memory weyland_db, with the shapes the 143 real
// 08 71 00 lines in tools/corpus/expected hit on production (2026-10-08):
// a line that names a maker never gets another maker's product, printed
// spec lines are read maker-last, families match within the maker.
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sqliteD1 } from "../weyland-cutsheetx-worker/test/d1-sqlite.mjs";
import {
  matchComponentToCutSheets, resetManufacturerCache, parsePrintedSpecLine, modelCandidates,
  resolveMakerIds, isByOthers, componentLine,
} from "./cut-sheet-matcher.js";

const DB = sqliteD1([
  "CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);",
  "CREATE TABLE manufacturer_aliases (alias TEXT PRIMARY KEY, manufacturer_id TEXT);",
  "CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT,",
  "  product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);",
  "CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT,",
  "  r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER);",
  "CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);",
  "CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text TEXT);",
  "CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text);",
  "INSERT INTO manufacturers VALUES ('mfr-ives','IVES','ives'),('mfr-sargent','Sargent','sargent'),('mfr-zero','Zero International','zero'),",
  "  ('mfr-schlage','Schlage','schlage'),('mfr-vonduprin','Von Duprin','von-duprin'),('mfr-lcn','LCN Closers','lcn'),('mfr-ngp','National Guard Products','ngp'),",
  "  ('mfr-bea','BEA Inc','bea'),('mfr-gj','Glynn-Johnson','glynn-johnson');",
  "INSERT INTO manufacturer_aliases VALUES ('SCE','mfr-schlage');",
  "INSERT INTO products VALUES",
  "  ('p-sargent-8200','mfr-sargent','8200','Sargent 8200 Series Mortise Lock','doors',NULL,'Lock',NULL,0,0),",
  "  ('p-zero-8302','mfr-zero','8302','ZERO 8302','doors',NULL,'Seal',NULL,0,0),",
  "  ('p-zero-39','mfr-zero','39','ZERO 39','doors',NULL,'Sweep',NULL,0,0),",
  "  ('p-ives-8400','mfr-ives','8400','IVES 8400','doors',NULL,'Kick plate',NULL,0,0),",
  "  ('p-ives-dp1','mfr-ives','DP1','Ives DP1','doors',NULL,'Strike',NULL,0,0),",
  "  ('p-sch-alx53','mfr-schlage','ALX53','SCHLAGE ALX53','doors',NULL,'Lock',NULL,0,0),",
  "  ('p-sch-20057','mfr-schlage','20-057-ICX','Schlage 20-057-ICX','doors',NULL,'Cylinder',NULL,0,0),",
  "  ('p-vd-99','mfr-vonduprin','99','Von Duprin 99 Series','doors',NULL,'Exit device',NULL,0,0),",
  "  ('p-lcn-4040xp','mfr-lcn','4040XP','LCN 4040XP','doors',NULL,'Closer',NULL,0,0),",
  "  ('p-ngp-960','mfr-ngp','960','NGP 960','doors',NULL,'Seal',NULL,0,0),",
  "  ('p-bea-100','mfr-bea','100','BEA 100','doors',NULL,'Operator',NULL,0,0),",
  "  ('p-gj-100','mfr-gj','100','GLYNN-JOHNSON 100','doors',NULL,'Stop',NULL,0,0);",
  "INSERT INTO product_documents VALUES ('d-zero-39','p-zero-39','cut_sheet','Zero Price Book (39 around p.12)',NULL,'manufacturer-catalogs/zero.pdf','subx-uploads',90,NULL,'2025-01-01',1);",
].join("\n"));
const env = { DB, UPLOADS: { async head() { return null; } } };
after(() => DB.database.close());
beforeEach(() => resetManufacturerCache());

const match = (manufacturer, model, modelFull) => matchComponentToCutSheets({ manufacturer, model, modelFull }, env);

test("a line that names a maker never gets another maker's product", async () => {
  // Production, 2026-10-08: each of these came back "high, exact".
  const ives8200 = await match("IVE", "8200", '8200 4" X 16" TKTX SCREWS AT HM DOORS');
  assert.equal(ives8200.matched, false);
  assert.deepEqual([ives8200.otherMaker.manufacturer, ives8200.otherMaker.model], ["Sargent", "8200"]);
  assert.equal((await match("Ives", "8302")).matched, false);
  // A maker the catalogue does not carry: not answered with NGP's 960.
  const rci = await match("RCI", "960MA", "960MA BY SECURITY VENDOR");
  assert.equal(rci.matched, false);
  // DORMA is not BEA.
  assert.equal((await match("DOR", "100", "100 SERIES BY SECURITY VENDOR")).matched, false);
});

test("the named maker's own product: exact, then its family", async () => {
  const kick = await match("IVE", "8400", '8400 10" HIGH B-CS TKTX SCREWS AT HM DOORS');
  assert.deepEqual([kick.product.id, kick.confidence, kick.matchType], ["p-ives-8400", "high", "exact"]);
  const sweep = await match("ZER", "39D");
  assert.deepEqual([sweep.product.id, sweep.confidence, sweep.matchType], ["p-zero-39", "medium", "series"]);
  assert.equal(sweep.cutSheets[0].pageHint, "12");
  assert.equal((await match("SCH", "ALX53R-RHO-626", "ALX53R-RHO-626 FSIC")).product.id, "p-sch-alx53");
  assert.equal((await match("SCH", "20-057", "20-057 ICX")).product.id, "p-sch-20057");
  assert.equal((await match("VON", "PA-AX-9927-EO-F-LBR-499F")).product.id, "p-vd-99");
  assert.equal((await match("VON", "QEL-99-EO-CON", "QEL-99-EO-CON 24 VDC")).product.id, "p-vd-99");
  assert.equal((await match("IVE", "DP1/", "DP1/ DP2 (AS REQ'D)")).product.id, "p-ives-dp1");
  // Glynn-Johnson's 100, not BEA's.
  assert.equal((await match("GLY", "100S")).product.id, "p-gj-100");
  assert.equal((await match("LCN", "4040XP", "4040XP REG / 4040XP EDA - AS REQUIRED")).product.id, "p-lcn-4040xp");
});

test("makers resolve by alias, name or industry code, never by substring", async () => {
  const data = { rows: [{ id: "a", name: "BEA Inc", slug: "bea" }, { id: "s", name: "Schlage", slug: "schlage" }, { id: "z", name: "Zero International", slug: "zero" }], aliases: [{ alias: "SCE", manufacturer_id: "s" }] };
  for (const r of data.rows) { r.n = r.name.toLowerCase().replace(/[^a-z0-9]/g, ""); r.s = r.slug; }
  assert.deepEqual([...resolveMakerIds("SCE", data)], ["s"]);
  assert.deepEqual([...resolveMakerIds("SCH", data)], ["s"]);
  assert.deepEqual([...resolveMakerIds("Zero", data)], ["z"]);
  assert.deepEqual([...resolveMakerIds("BEARING", data)], []);
  assert.deepEqual([...resolveMakerIds("PUSH", data)], []);
});

test("furnished-by-others lines are not products", async () => {
  assert.ok(isByOthers("B/O", "BY DIVISION 28"));
  assert.ok(isByOthers(null, "BY SECURITY VENDOR"));
  assert.ok(!isByOthers("IVE", "8400"));
  const r = await match("B/O", "BY", "BY DOOR AND FRAME MANUFACTURER");
  assert.deepEqual([r.matched, r.byOthers], [false, true]);
});

test("printed spec lines are read maker-last", () => {
  const p = (s) => parsePrintedSpecLine(s.split(" "));
  assert.deepEqual(p('1 EA PUSH PLATE 8200 4" X 16" TKTX SCREWS AT HM DOORS 630 IVE'),
    { manufacturer: "IVE", model: "8200", modelFull: '8200 4" X 16" TKTX SCREWS AT HM DOORS', description: "PUSH PLATE", finish: "630", qty: 1, uom: "EA", printed: true });
  assert.equal(p("1 EA SURFACE CLOSER 4040XP EDA 689 LCN").modelFull, "4040XP EDA");
  assert.equal(p("1 SET GASKETING 429D-S D ZER").finish, "D");
  assert.equal(p("1 EA SURFACE CLOSER 4040XP EDA LCN").finish, null);
  // Maker first is not this layout: left to the "Manufacturer Model" reader.
  assert.equal(p("Schlage L9080 626"), null);
  // A stored SubX component (whole catalog cell in model) as a matcher line.
  assert.deepEqual(componentLine({ manufacturer: "IVE", model: '8400 10" HIGH B-CS' }), { manufacturer: "IVE", model: "8400", modelFull: '8400 10" HIGH B-CS' });
});

test("model families never cut a plain number down", () => {
  assert.deepEqual(modelCandidates("8200", "8200").series, []);
  assert.deepEqual(modelCandidates("20-057", "20-057 ICX").series, []);
  assert.ok(modelCandidates("9927-EO-F").series.includes("99"));
});
