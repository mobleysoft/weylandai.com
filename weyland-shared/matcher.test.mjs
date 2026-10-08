// node --test weyland-shared/matcher.test.mjs
//
// The shared parser and matcher on the lines the 7 October value audit found wrong
// (plan/weylandai_value_report.md, fixes 2 and 6): a hardware group pasted as printed,
// "Ives 8200" and "Ives 8302" answered with another maker's product, finish codes matched
// as products. Runs the real matcher SQL against an in-memory SQLite shaped like weyland_db.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { parseSpecLines, lineFromComponent } from "./spec-lines.js";
import { resolveMaker, makerIndexFrom, isFinishCode, isFinishOnly } from "./makers.js";
import { matchProductFromDb, matchComponentToCutSheets, citedPagesFor, baseModelCandidates, seriesCandidates } from "./product-database.js";

const database = new DatabaseSync(":memory:");
database.exec(`
  CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);
  CREATE TABLE manufacturer_aliases (alias TEXT PRIMARY KEY, manufacturer_id TEXT, source TEXT);
  CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT, product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);
  CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT, r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER);
  CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);
  CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text_content TEXT, char_count INTEGER);
  CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text_content, content='catalogue_pages', content_rowid='rowid');
  INSERT INTO manufacturers VALUES ('mfr-ives','IVES','ives'),('mfr-sargent','Sargent','sargent'),('mfr-zero','Zero International','zero'),
    ('mfr-schlage','Schlage','schlage'),('mfr-lcn','LCN Closers','lcn'),('mfr-vonduprin','Von Duprin','vonduprin'),('mfr-glynnj','Glynn-Johnson','glynn-johnson'),
    ('mfr-ngp','National Guard Products','ngp'),('mfr_ive','Ives Hardware','ives-hardware');
  INSERT INTO manufacturer_aliases VALUES ('IVE','mfr-ives','t'),('SCH','mfr-schlage','t'),('LCN','mfr-lcn','t'),('VD','mfr-vonduprin','t'),('ZER','mfr-zero','t'),('GLY','mfr-glynnj','t'),('NGP','mfr-ngp','t'),('SAR','mfr-sargent','t');
  INSERT INTO products VALUES
    ('p-sar-8200','mfr-sargent','8200','Sargent 8200 Series Mortise Lock','doors','8200','Locks',NULL,0,0),
    ('p-zer-8302','mfr-zero','8302','ZERO 8302','doors','Neoprene seal',NULL,NULL,0,0),
    ('p-ive-8302-0','mfr-ives','8302-0','Ives 8302-0','doors','General',NULL,NULL,0,0),
    ('p-ive-8400','mfr-ives','8400','IVES 8400 Kick Plate','doors','8400','Architectural Trim',NULL,0,0),
    ('p-ive-ws406','mfr-ives','WS406/407CCV','Ives WS406/407CCV','doors','General',NULL,NULL,0,0),
    ('p-ive-sr64','mfr-ives','SR64','Ives SR64 Door Silencer','doors','Door Silencers','Seals',NULL,0,0),
    ('p-ive-5bb1-a','mfr-ives','5BB1','IVES 5BB1 Standard Weight Ball Bearing Hinge','doors','5BB1','Hinges',NULL,0,0),
    ('p-ive-5bb1-b','mfr-ives','5BB1','Ives 5BB1','doors','General',NULL,NULL,0,0),
    ('p-ive-us32d','mfr-ives','US32D','IVES US32D','doors','General',NULL,NULL,0,0),
    ('p-sch-alx53','mfr-schlage','ALX53','SCHLAGE ALX53','doors','Entrance lock',NULL,NULL,0,0),
    ('p-sch-alx50','mfr-schlage','ALX50','SCHLAGE ALX50','doors','Entrance lock',NULL,NULL,0,0),
    ('p-lcn-4040xp','mfr-lcn','4040XP','LCN 4040XP Extra Heavy Duty Door Closer','doors','4040XP','Closers',NULL,0,0),
    ('p-lcn-4041','mfr-lcn','4041','LCN 4041 Standard Duty Door Closer','doors','4041','Closers',NULL,0,0),
    ('p-vd-99','mfr-vonduprin','99','Von Duprin 99 Series Rim Exit Device','doors','99','Exit Devices',NULL,0,0),
    ('p-vd-98','mfr-vonduprin','98','Von Duprin 98/99 Mortise Exit Device','doors','98','Exit Devices',NULL,0,0),
    ('p-vd-ept10','mfr-vonduprin','EPT10','Von Duprin EPT10 Electric Power Transfer','doors','Power Transfer','Electrified Hardware',NULL,0,0),
    ('p-zer-99','mfr-zero','99','ZERO 99','doors','Silicone, Aluminum',NULL,NULL,0,0),
    ('p-zer-630','mfr-zero','630','ZERO 630 decoy named like a finish','doors','x',NULL,NULL,0,0),
    ('p-gj-100','mfr-glynnj','100','GLYNN-JOHNSON 100','doors','100',NULL,NULL,0,0),
    ('p-ngp-896','mfr-ngp','896','NGP 896 Thermal Break Threshold','doors','896','Thresholds',NULL,0,0),
    ('p-ngp-flood','mfr-ngp','Flood Shield Side, Neoprene','NGP Flood Shield Side, Neoprene','doors','General',NULL,NULL,0,0);
  INSERT INTO product_documents VALUES
    ('d-5bb1','p-ive-5bb1-b','cut_sheet','Ives Price Book (5BB1 around p.None)',NULL,'manufacturer-catalogs/b14117b49c7deb52.pdf','subx-uploads',210,NULL,'2025-01-01',1),
    ('d-ws406','p-ive-ws406','cut_sheet','Ives Price Book (WS406 around p.None)',NULL,'manufacturer-catalogs/b14117b49c7deb52.pdf','subx-uploads',210,NULL,'2025-01-01',1),
    ('d-4040xp','p-lcn-4040xp','cut_sheet','LCN Price Book (full manufacturer price book; product listed around pp.6-48 in the edition originally catalogued)',NULL,'manufacturer-catalogs/1538de17afa634c0.pdf','subx-uploads',152,NULL,'2025-01-01',1);
  INSERT INTO catalogues VALUES
    ('8f1396cefd72a60b','Ives Architectural Hardware Products Catalog','ives','catalogues/ives-cat.pdf','ives-cat.pdf',252),
    ('b14117b49c7deb52','Ives Price Book 2024','ives','cps/catalogues/b14117b49c7deb52.pdf','Ives_Price_Book.pdf',213),
    ('1538de17afa634c0','LCN Price Book 2025','lcn','manufacturer-catalogs/1538de17afa634c0.pdf','LCN_Price_Book_2025.pdf',152),
    ('0abc09bbcb666596','Von Duprin 98-99 Series Catalog','von-duprin','catalogues/vd-9899.pdf','vd-9899.pdf',80),
    ('4016927171a5364c','Glynn-Johnson Price Book 2025','glynn-johnson','cps/catalogues/4016927171a5364c.pdf','GJ.pdf',33);
  INSERT INTO catalogue_pages VALUES
    ('8f1396cefd72a60b',5,'Table of contents Hinges 8400 kick plates 131 Wall stops WS406 148',60),
    ('8f1396cefd72a60b',131,'Protection plates 8400 kick plate 8400 mop plate 8400 armor plate specify 8400 with B-CS screws',90),
    ('8f1396cefd72a60b',148,'Wall stops WS406 WS407 WS406CCV WS407CCV convex',50),
    ('b14117b49c7deb52',82,'Push and pull plates MODEL 8200 push plate 4 x 16 8200 US32D 630 list 8302 pull plate 8302 8302 8302',80),
    ('1538de17afa634c0',47,'Handed 4040XP Series Specify Price Part number 4040XP 4040XP 4040XP',70),
    ('1538de17afa634c0',3,'Contents 4040XP 4010 4020 4110',40),
    ('0abc09bbcb666596',12,'99 series rim exit device 9927 surface vertical rod 9947 concealed vertical rod 9975 mortise',70),
    ('4016927171a5364c',20,'Overhead holders and stops 90 Series 90S 90H 90F list price',60);
  INSERT INTO catalogue_pages_fts(rowid, text_content) SELECT rowid, text_content FROM catalogue_pages;
`);
const d1 = {
  prepare(sql) {
    const statement = database.prepare(sql);
    const bound = (values) => ({
      async first() { return statement.get(...values) || null; },
      async all() { return { results: statement.all(...values) }; },
      async run() { return { success: true }; },
    });
    return { bind: (...values) => bound(values), ...bound([]) };
  },
};
// R2: the Ives catalogue and the Von Duprin catalogue PDFs are on file, the LCN price book
// is on file under the key its re-indexed catalogue row names, the Ives price book is not.
const R2_KEYS = new Set(["catalogues/ives-cat.pdf", "catalogues/vd-9899.pdf", "manufacturer-catalogs/1538de17afa634c0.pdf"]);
const env = { DB: d1, UPLOADS: { async head(key) { return R2_KEYS.has(key) ? { size: 1 } : null; } } };
after(() => database.close());

const KNOWN = ["IVES", "ives", "Sargent", "Zero International", "zero", "Schlage", "LCN Closers", "lcn", "Von Duprin", "vonduprin", "Glynn-Johnson", "glynn-johnson", "National Guard Products", "ngp"];
const GROUP06 = [
  "Hardware Group No. 06 CL",
  " 109.1         109.2         111.1         113.1         128.1.1       129.1",
  " 131.1         133.1         138.1.1       141.1         142.1         143.1",
  " 173.1         174.1         175.1         176.1         177.1         178.1",
  "QTY          DESCRIPTION               CATALOG NUMBER                 FINISH   MFR",
  "1   EA       CONTINUOUS HINGE          SL11 / SL24                    628      SEL",
  "1   EA       ENTRANCE LOCK             ALX53R-RHO-626 FSIC            626      SCH",
  "1   EA       CLOSER, HOLD OPEN         4040XP H / HEDA - AS           689      LCN",
  "                                       REQUIRED",
  "1     EA     KICK PLATE                8400 10\" HIGH B-CS             630      IVE",
  "                                       TKTX SCREWS AT HM DOORS",
  "1     EA     WALL STOP                 WS406/407CCV                   630      IVE",
  "3     EA     SILENCER                  SR64                           GRY      IVE",
].join("\n");

test("a hardware group pasted as printed: heading, door list and header skipped, six item lines read", () => {
  const { lines, skipped } = parseSpecLines(GROUP06, KNOWN);
  assert.deepEqual(skipped.map((s) => s.reason), ["heading", "doors", "doors", "doors", "header"]);
  const items = lines.filter((l) => l.kind === "spec");
  assert.deepEqual(items.map((l) => [l.manufacturer, l.model, l.finish, l.qty]), [
    ["Select Hinges", "SL11", "628", 1],
    ["Schlage", "ALX53R-RHO-626", "626", 1],
    ["LCN", "4040XP", "689", 1],
    ["Ives", "8400", "630", 1],
    ["Ives", "WS406/407CCV", "630", 1],
    ["Ives", "SR64", "GRY", 3],
  ]);
  assert.equal(items[2].description, "CLOSER, HOLD OPEN");
  assert.equal(items[2].modelFull, "4040XP H / HEDA - AS");
  assert.equal(items[3].modelFull, "8400 10\" HIGH B-CS");
  // The wrapped tails are tried as models and marked tentative; the route lists them as wrapped.
  const tails = lines.filter((l) => l.tentative).map((l) => l.raw);
  assert.deepEqual(tails, ["REQUIRED", "TKTX SCREWS AT HM DOORS"]);
});

test("the group's six items against the catalogue: the right maker's product or an honest miss, never another maker's", async () => {
  const { lines } = parseSpecLines(GROUP06, KNOWN);
  const items = lines.filter((l) => l.kind === "spec");
  const answers = [];
  for (const l of items) answers.push(await matchComponentToCutSheets(l, env));
  // Select Hinges: a real maker the catalogue lacks.
  assert.equal(answers[0].matched, false);
  assert.equal(answers[0].reason, "maker_not_in_catalogue");
  assert.match(answers[0].reasonText, /Select Hinges is not in the catalogue/);
  // Schlage ALX53R-RHO-626 FSIC -> the base model ALX53, Schlage's.
  assert.equal(answers[1].matched, true);
  assert.equal(answers[1].product.id, "p-sch-alx53");
  assert.equal(answers[1].matchType, "base_model");
  // LCN 4040XP H / HEDA: exact on the model token, with the price book pinned to p.47 (its text
  // was indexed from the file in R2), not the contents page.
  assert.equal(answers[2].product.id, "p-lcn-4040xp");
  assert.equal(answers[2].matchType, "exact");
  assert.equal(answers[2].cutSheets[0].pinnedPage, 47);
  assert.equal(answers[2].cutSheets[0].pageHint, "47");
  assert.match(answers[2].cutSheets[0].pageUrl, /#page=47$/);
  // Ives 8400: no filed sheet; the catalogue's product page (131) before its contents page (5).
  assert.equal(answers[3].product.id, "p-ive-8400");
  assert.equal(answers[3].cataloguePages[0].pageNum, 131);
  assert.equal(answers[3].cataloguePages[0].pdfAvailable, true);
  assert.equal(answers[4].product.id, "p-ive-ws406");
  assert.equal(answers[5].product.id, "p-ive-sr64");
  for (const a of answers) if (a.matched) assert.equal(a.product.manufacturer === "IVES" || a.product.manufacturer === "LCN Closers" || a.product.manufacturer === "Schlage", true);
});

test("a named maker never gets another maker's product as high, exact", async () => {
  const ives8200 = await matchComponentToCutSheets({ manufacturer: "Ives", model: "8200" }, env);
  assert.notEqual(ives8200.product && ives8200.product.id, "p-sar-8200");
  // Ives' own price book names 8200: a catalogue-page answer, medium, not a Sargent lock.
  assert.equal(ives8200.matched, true);
  assert.equal(ives8200.matchType, "catalogue_page");
  assert.equal(ives8200.confidence, "medium");
  assert.equal(ives8200.product.manufacturer, "IVES");
  assert.equal(ives8200.cataloguePages[0].pageNum, 82);
  assert.equal(ives8200.cataloguePages[0].pdfAvailable, false);
  const ives8302 = await matchComponentToCutSheets({ manufacturer: "Ives", model: "8302" }, env);
  assert.equal(ives8302.product.id, "p-ive-8302-0", "the Ives variant, not the Zero seal");
  assert.equal(ives8302.matchType, "variant");
  // The maker's code at the end of a spec line resolves the same way.
  const byCode = await matchComponentToCutSheets(parseSpecLines("1 EA PULL PLATE 8302 10\" 4\" X 16\" 630 IVE", KNOWN).lines[0], env);
  assert.equal(byCode.product.id, "p-ive-8302-0");
  // Sargent's own 8200 is still Sargent's, exact.
  const sargent = await matchProductFromDb({ manufacturer: "Sargent", model: "8200" }, env);
  assert.equal(sargent.product.id, "p-sar-8200");
  assert.equal(sargent.matchType, "exact");
  // A maker in the catalogue whose model is not: a miss that says so.
  const gly = await matchComponentToCutSheets({ manufacturer: "Glynn-Johnson", model: "90S" }, env);
  assert.equal(gly.matchType, "catalogue_page");
  assert.equal(gly.cataloguePages[0].catalogueId, "4016927171a5364c");
  const zero = await matchComponentToCutSheets({ manufacturer: "Zero International", model: "188SBK" }, env);
  assert.equal(zero.matched, false);
  assert.equal(zero.reason, "model_not_in_catalogue");
});

test("a finish code is never a product", async () => {
  assert.equal(isFinishCode("626"), true);
  assert.equal(isFinishCode("US26D"), true);
  assert.equal(isFinishCode("630"), true);
  assert.equal(isFinishCode("GRY"), true);
  assert.equal(isFinishCode("4040XP"), false);
  assert.equal(isFinishOnly("689/630"), true);
  assert.equal(await matchProductFromDb({ model: "630" }, env), null, "a bare finish matches nothing, not the Zero 630 decoy");
  assert.equal(await matchProductFromDb({ manufacturer: "Glynn-Johnson", model: "630" }, env), null);
  const miss = await matchComponentToCutSheets({ model: "US26D" }, env);
  assert.equal(miss.reason, "finish_code");
  // A maker's catalogue really listing a finish-named row still answers for that maker (the harness's IVES US32D).
  const named = await matchProductFromDb({ manufacturer: "IVES", model: "US32D" }, env);
  assert.equal(named.product.id, "p-ive-us32d");
});

test("spec-style models fall back to the base model, a variant or the series, under the maker", async () => {
  assert.deepEqual(baseModelCandidates("ALX53R-RHO-626"), ["ALX53R", "ALX53"]);
  assert.deepEqual(baseModelCandidates("4041XP"), ["4041X", "4041"]);
  assert.deepEqual(baseModelCandidates("896ADJ"), ["896AD", "896A", "896"]);
  assert.deepEqual(seriesCandidates("RX-QEL98L-NL-03"), ["98"]);
  assert.deepEqual(seriesCandidates("9927"), ["992", "99"]);
  const lcn = await matchProductFromDb({ manufacturer: "LCN", model: "4041XP", modelFull: "4041XP SPR CNS 4041XP-30 & 61" }, env);
  assert.equal(lcn.product.id, "p-lcn-4041");
  assert.equal(lcn.matchType, "base_model");
  const eda = await matchProductFromDb({ manufacturer: "LCN", model: "4040XP", modelFull: "4040XP EDA" }, env);
  assert.equal(eda.product.id, "p-lcn-4040xp");
  assert.equal(eda.matchType, "exact");
  const vd = await matchProductFromDb({ manufacturer: "Von Duprin", model: "9927" }, env);
  assert.equal(vd.product.id, "p-vd-99");
  assert.equal(vd.matchType, "series");
  const qel = await matchProductFromDb({ manufacturer: "VD", model: "RX-QEL98L-NL-03" }, env);
  assert.equal(qel.product.id, "p-vd-98");
  const ept = await matchProductFromDb({ manufacturer: "VD", model: "EPT-10" }, env);
  assert.equal(ept && ept.product.id, "p-vd-ept10", "EPT-10 is the catalogue's EPT10");
  const ngp = await matchProductFromDb({ manufacturer: "NGP", model: "896ADJ", modelFull: "896ADJ SIA SSMS/EA" }, env);
  assert.equal(ngp.product.id, "p-ngp-896");
  // A catalogue model with commas, typed with its maker.
  const flood = await matchProductFromDb(parseSpecLines("National Guard Products Flood Shield Side, Neoprene", KNOWN).lines[0], env);
  assert.equal(flood.product.id, "p-ngp-flood");
  // Of two rows for the same model, the one with a cut sheet filed.
  const hinge = await matchProductFromDb({ manufacturer: "Ives", model: "5BB1" }, env);
  assert.equal(hinge.product.id, "p-ive-5bb1-b");
});

test("maker resolution: codes, names, slugs, aliases and real makers the catalogue lacks", () => {
  const index = makerIndexFrom([{ id: "mfr-ives", name: "IVES", slug: "ives" }, { id: "mfr-glynnj", name: "Glynn-Johnson", slug: "glynn-johnson" }, { id: "mfr-vd", name: "Von Duprin", slug: "vonduprin" }], [["IVE", "mfr-ives"]]);
  assert.deepEqual(resolveMaker(index, "IVE").ids, ["mfr-ives"]);
  assert.equal(resolveMaker(index, "Glynn Johnson").known, true);
  assert.equal(resolveMaker(index, "VON DUPRIN").known, true);
  const sel = resolveMaker(index, "SEL");
  assert.equal(sel.known, false);
  assert.equal(sel.realMaker, true);
  assert.equal(sel.name, "Select Hinges");
  const word = resolveMaker(index, "Royal");
  assert.equal(word.known, false);
  assert.equal(word.realMaker, false);
  assert.equal(resolveMaker(index, "").typed, null);
});

test("a stored hardware component is read like a printed line, and the packet gets only pages on file", async () => {
  const line = lineFromComponent({ quantity: 1, component_type: "closer", manufacturer: "LCN", model: "4040XP H / HEDA - AS", catalog_number: "4040XP H / HEDA - AS", finish: "689" }, KNOWN);
  assert.equal(line.manufacturer, "LCN");
  assert.equal(line.model, "4040XP");
  const r = await matchComponentToCutSheets(line, env);
  assert.deepEqual(citedPagesFor(r), [{ kind: "price_book", catalogueId: "1538de17afa634c0", pageNum: 47, title: "LCN Price Book" }]);
  const ives = await matchComponentToCutSheets(lineFromComponent({ quantity: 1, component_type: "kick plate", manufacturer: "IVE", catalog_number: "8400 10\" HIGH B-CS", finish: "630" }, KNOWN), env);
  assert.deepEqual(citedPagesFor(ives), [{ kind: "catalogue", catalogueId: "8f1396cefd72a60b", pageNum: 131, title: "Ives Architectural Hardware Products Catalog" }]);
  // The Ives price book's PDF on file is another edition than its index: no page is pinned, nothing embedded from it.
  const ws = await matchComponentToCutSheets({ manufacturer: "Ives", model: "WS406/407CCV" }, env);
  assert.equal(ws.cutSheets[0].pinnedPage, null);
  assert.deepEqual(citedPagesFor(ws), [{ kind: "catalogue", catalogueId: "8f1396cefd72a60b", pageNum: 148, title: "Ives Architectural Hardware Products Catalog" }]);
  const noModel = lineFromComponent({ quantity: 1, component_type: "cylinder", manufacturer: "SCH", catalog_number: "MORTISE TYPE W/ CORE (KEYED TO EXISTING SYSTEM)", finish: "626S" }, KNOWN);
  assert.equal(noModel.noModel, true);
  const nm = await matchComponentToCutSheets(noModel, env);
  assert.equal(nm.reason, "no_model");
});
