// The submittal packet carries the page each product is cited on, never a
// whole price book (2026-10-08), and a bid set that repeats door marks on
// several sheets keeps every door (Berryessa: 001-009 on three schools' sheets).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { citedPagesForSession } from "../src/routes/subx-workspace.js";
import { assembleSubmittalPackage } from "../src/lib/submittal-assembler.js";
import { writeDoorScheduleEntries } from "../src/lib/hardware-extraction-vision-dispatch.js";
import { reviewDoorRows } from "../assets/client-ocr-src/schedule-workspace.mjs";
import { persistBrowserGridResult } from "../src/lib/hardware-extraction-pipeline.js";

test("F2/F3: persistence preserves duplicate scan occurrences and never marks a partial read done", async () => {
  const db = makeDb(), env = { DB: d1(db) };
  db.exec("ALTER TABLE hardware_extraction_sessions ADD COLUMN door_schedule_extracted INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN door_entries_count INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN pages_processed INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN door_schedule_extracted_at TEXT; ALTER TABLE hardware_extraction_sessions ADD COLUMN updated_at TEXT;");
  const row = { door_number: "214", read_from: "ocr_lines", confidence_source: "ocr_words", field_confidence: { mark: .61, hardware_group: .55 }, source_row: 4 };
  const br = { result: { partial: true, doors: [{ ...row, hardware_group: "02" }, { ...row, hardware_group: "05", source_row: 5 }], metadata: { partial: true, expected_marks: ["214", "211"] } } };
  const result = await persistBrowserGridResult(br, "door_schedule", "s1", null, 3, 6, env);
  assert.equal(result.partial, true);
  assert.equal(result.done, false);
  assert.equal(db.prepare("SELECT door_schedule_extracted FROM hardware_extraction_sessions WHERE id = 's1'").get().door_schedule_extracted, 0);
  assert.equal(db.prepare("SELECT pages_processed FROM hardware_extraction_sessions WHERE id = 's1'").get().pages_processed, 0);
  let stored = db.prepare("SELECT * FROM door_schedule_entries WHERE session_id = 's1'").all();
  assert.equal(stored.length, 2);
  assert.deepEqual(stored.map(d => d.hardware_group), ["02", "05"]);
  const doors = stored.map(d => { const fc = JSON.parse(d.field_confidence_json); return { ...d, original_mark: fc.original_mark, read_from: fc.read_from, field_confidence: fc.fields, confidence_source: fc.confidence_source, read_audit: fc.read_audit }; });
  const review = reviewDoorRows(doors);
  assert.deepEqual(review.duplicate_marks, [{ page: 3, mark: "214", count: 2 }]);
  assert.deepEqual(review.missing_expected_marks, [{ page: 3, mark: "211" }]);
  assert.equal(review.below_threshold_fields, 4);
  await persistBrowserGridResult(br, "door_schedule", "s1", null, 3, 6, env);
  stored = db.prepare("SELECT * FROM door_schedule_entries WHERE session_id = 's1'").all();
  assert.equal(stored.length, 2, "replaying a read keeps the same two occurrence keys");
  db.close();
});

test("complete rereads remove obsolete generated occurrences, preserving corrections and other pages", async () => {
  const db = makeDb(), env = { DB: d1(db) };
  db.exec("ALTER TABLE hardware_extraction_sessions ADD COLUMN door_schedule_extracted INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN door_entries_count INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN pages_processed INTEGER DEFAULT 0; ALTER TABLE hardware_extraction_sessions ADD COLUMN door_schedule_extracted_at TEXT; ALTER TABLE hardware_extraction_sessions ADD COLUMN updated_at TEXT;");
  const row = { door_number: "214", hardware_group: "05", read_from: "ocr_lines", source_row: 4, field_confidence: { mark: .99 } };
  const read = (page, doors, partial = false) => writeDoorScheduleEntries("s1", null, page, doors, .99, env, { partial });
  const stored = () => db.prepare("SELECT mark, page_number, hardware_group FROM door_schedule_entries ORDER BY page_number, mark").all().map(r => ({ ...r }));
  await read(3, [{ ...row, hardware_group: "02" }, row]);
  await read(4, [row, row]);
  const otherPage = stored().filter(r => r.page_number === 4);
  await read(3, [row], true);
  assert.equal(stored().filter(r => r.page_number === 3).length, 2, "partial absence cannot remove an old occurrence");
  const complete = await read(3, [row]);
  assert.equal(complete.partial, false);
  assert.deepEqual(stored().filter(r => r.page_number === 3), [{ mark: "214", page_number: 3, hardware_group: "05" }]);
  assert.deepEqual(stored().filter(r => r.page_number === 4), otherPage);
  // Protect both an incoming row with a manual correction and an obsolete corrected occurrence.
  await read(3, [row, row]);
  db.prepare("UPDATE door_schedule_entries SET hardware_group = 'MANUAL', corrections_json = '{}' WHERE page_number = 3").run();
  const corrected = await read(3, [{ ...row, hardware_group: "NEW OCR" }]);
  assert.equal(corrected.entries[0].hardware_group, "MANUAL", "the caller also sees the preserved correction");
  assert.deepEqual(stored().filter(r => r.page_number === 3).map(r => r.hardware_group), ["MANUAL", "MANUAL"]);
  assert.deepEqual(stored().filter(r => r.page_number === 4), otherPage);
  db.close();
});

test("failed replacement rolls back every row and leaves old duplicate occurrences intact", async () => {
  const db = makeDb(), env = { DB: d1(db) };
  const row = { door_number: "214", hardware_group: "05", read_from: "ocr_lines", source_row: 4, field_confidence: { mark: .99 } };
  await writeDoorScheduleEntries("s1", null, 3, [{ ...row, hardware_group: "02" }, row], .99, env, { partial: true });
  const before = db.prepare("SELECT * FROM door_schedule_entries ORDER BY mark").all();
  db.exec("CREATE TRIGGER reject_test_group BEFORE INSERT ON door_schedule_entries WHEN NEW.hardware_group = 'FAIL' BEGIN SELECT RAISE(ABORT, 'test write failure'); END;");
  const result = await writeDoorScheduleEntries("s1", null, 3, [{ ...row, hardware_group: "REPLACED" }, { ...row, door_number: "215", hardware_group: "FAIL" }], .99, env);
  assert.equal(result.success, false);
  assert.deepEqual(db.prepare("SELECT * FROM door_schedule_entries ORDER BY mark").all(), before);
  db.close();
});

function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
        async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : { ...r }; },
        async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
        async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
      };
      return stmt;
    },
    async batch(stmts) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const s of stmts) results.push(await s.all());
        db.exec("COMMIT");
        return results;
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}

function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT, project_name TEXT, filename TEXT, file_buffer_key TEXT, total_pages INTEGER, status TEXT);
    CREATE TABLE door_schedule_entries (id TEXT, session_id TEXT, tenant_id TEXT, page_number INTEGER, mark TEXT, hardware_group TEXT, fire_rating TEXT, width TEXT, height TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_type TEXT, frame_material TEXT, panic INTEGER, thickness TEXT, thickness_inches REAL, door_finish TEXT, stc_rating INTEGER, frame_finish TEXT, head_detail TEXT, jamb_detail TEXT, sill_detail TEXT, notes TEXT, extraction_confidence REAL, field_confidence_json TEXT, low_confidence_fields TEXT, corrections_json TEXT, created_at TEXT, updated_at TEXT, UNIQUE(session_id, mark));
    CREATE TABLE hardware_sets (id TEXT PRIMARY KEY, session_id TEXT, set_number TEXT, set_name TEXT, door_location TEXT, door_count INTEGER, notes TEXT, affirmed INTEGER);
    CREATE TABLE hardware_components (id TEXT, set_id TEXT, component_type TEXT, quantity INTEGER, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, ansi_bhma_grade TEXT, fire_rating_minutes INTEGER, ul_listing_number TEXT, ada_compliant INTEGER, uom TEXT, sequence_order INTEGER, specifications TEXT);
    CREATE TABLE hardware_page_extractions (session_id TEXT, page_number INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT, source_filename TEXT, storage_path TEXT, page_count INTEGER);
  `);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Test School','t.pdf','demo-clone/s1',1,'active')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','1','Classroom',NULL,2,NULL,0)").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','2','Office',NULL,1,NULL,0)").run();
  const c = db.prepare("INSERT INTO hardware_components (id, set_id, component_type, quantity, manufacturer, model, sequence_order) VALUES (?,?,?,?,?,?,?)");
  c.run("c1", "h1", "lockset", 1, "Schlage", "ND70PD", 1);
  c.run("c2", "h1", "closer", 1, "LCN", "4040XP", 2);
  c.run("c3", "h2", "lockset", 1, "Schlage", "ND70PD", 1);
  c.run("c4", "h2", "stop", 1, "Nobody", "XYZ-1", 2);
  db.prepare("INSERT INTO catalogues VALUES ('schlage-pb','schlage.pdf','catalogues/schlage-pb/source.pdf',300)").run();
  return db;
}

// The matcher's answers, as weyland-shared/product-database.js shapes them.
const fakeMatch = async (c) => {
  if (c.model === "ND70PD") return { matched: true, matchType: "exact", product: { manufacturer: "Schlage", model: "ND70PD" }, cutSheets: [{ pinnedPage: 212, catalogueId: "schlage-pb", title: "Schlage Price Book (2024)" }], cataloguePages: [] };
  if (c.model === "4040XP") return { matched: true, matchType: "category", product: { manufacturer: "LCN", model: "4041" }, cutSheets: [], cataloguePages: [] };
  return { matched: false, reasonText: "no product by that maker" };
};

async function priceBook(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([612, 792]).drawText("Schlage price book page " + i, { x: 50, y: 700, size: 14, font });
  return doc.save();
}

test("cited pages: one page per product, sets merged, guesses and misses left out", async () => {
  const db = makeDb();
  const r = await citedPagesForSession("s1", { DB: d1(db) }, fakeMatch);
  assert.equal(r.components, 3);
  assert.equal(r.matched, 1);
  assert.deepEqual(r.pages, [{ catalogueId: "schlage-pb", pageNum: 212, title: "Schlage Price Book", kind: "price_book", manufacturer: "Schlage", model: "ND70PD", sets: ["1", "2"] }]);
  assert.deepEqual(r.missing.map((m) => m.model), ["4040XP", "XYZ-1"]);
});

test("the packet embeds the cited page of a 300-page price book, not the book", async () => {
  const db = makeDb();
  const objects = new Map([["catalogues/schlage-pb/source.pdf", await priceBook(300)]]);
  const UPLOADS = {
    async get(k) { const b = objects.get(k); return b ? { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } : null; },
    async put(k, v) { objects.set(k, v); },
    async head(k) { return objects.has(k) ? { size: objects.get(k).length } : null; },
  };
  const env = { DB: d1(db), UPLOADS };
  const { pages, missing } = await citedPagesForSession("s1", env, fakeMatch);
  const res = await assembleSubmittalPackage("s1", { includeDraftSets: true, citedPages: pages, cutSheetMisses: missing, saveToR2: false }, env, { PDFDocument, StandardFonts, rgb });
  assert.equal(res.success, true, res.errors.join("; "));
  const cut = res.sections.filter((s) => s.type === "cut_sheet");
  assert.equal(cut.length, 1);
  assert.equal(res.cutSheetCount, 1, "the missing-item disclosure is not another cut sheet");
  assert.equal(res.sections.find(s => s.type === "cut_sheet_misses").items, 2);
  assert.equal(cut[0].page, 212);
  assert.ok(res.totalPages < 20, `packet is ${res.totalPages} pages`);
  const out = await PDFDocument.load(res.pdfBytes);
  assert.equal(out.getPageCount(), res.totalPages);
  assert.ok(objects.has("catalogues/schlage-pb/pages/page_212.pdf"), "the cut page is cached for the citation route");
});

test("every item without a page is listed in the packet with why and what is needed", async () => {
  const db = makeDb();
  const env = { DB: d1(db), UPLOADS: { async get() { return null; }, async put() {}, async head() { return null; } } };
  const r = await citedPagesForSession("s1", env, fakeMatch);
  // The guess (LCN 4040XP answered with a category) and the unknown maker, each with a reason and a need.
  assert.deepEqual(r.missing.map((m) => [m.model, m.code, m.qty]), [["4040XP", "match_not_firm", 1], ["XYZ-1", "not_catalogued", 1]]);
  assert.match(r.missing[0].reason, /not firm enough for a submittal/);
  assert.equal(r.missing[0].need, "the full catalogue number");
  assert.equal(r.missing[1].reason, "no product by that maker");
  assert.equal(r.missing[1].need, "the maker's name and catalogue number");
  const res = await assembleSubmittalPackage("s1", { includeDraftSets: true, citedPages: [], cutSheetMisses: r.missing, saveToR2: false }, env, { PDFDocument, StandardFonts, rgb });
  assert.equal(res.success, true, res.errors.join("; "));
  const misses = res.sections.find((s) => s.type === "cut_sheet_misses");
  assert.deepEqual({ pages: misses.pages, items: misses.items }, { pages: 1, items: 2 });
  assert.equal(res.sections.filter((s) => s.type === "cut_sheet").length, 0);
  assert.equal(res.cutSheetCount, 0);
  const out = await PDFDocument.load(res.pdfBytes);
  assert.equal(out.getPageCount(), res.totalPages);
  // Nothing to list, nothing added.
  const none = await assembleSubmittalPackage("s1", { includeDraftSets: true, citedPages: [], cutSheetMisses: [], saveToR2: false }, env, { PDFDocument, StandardFonts, rgb });
  assert.equal(none.sections.some((s) => s.type === "cut_sheet_misses"), false);
  assert.equal(none.cutSheetCount, 0);
});

test("repeated marks across sheets keep every door; re-reading a sheet adds none", async () => {
  const db = makeDb();
  const env = { DB: d1(db) };
  const sheet = (marks) => marks.map((m) => ({ door_number: m, hardware_group: "2", width_inches: 42, height_inches: 94 }));
  await writeDoorScheduleEntries("s1", "t", 284, sheet(["001", "002", "003", "004", "005", "006", "007", "008", "009"]), 0.95, env);
  await writeDoorScheduleEntries("s1", "t", 286, sheet(["001", "002", "003", "004", "005", "006", "008"]), 0.95, env);
  await writeDoorScheduleEntries("s1", "t", 288, sheet(["001", "002", "003", "004", "005", "006", "007", "008"]), 0.95, env);
  const n = () => db.prepare("SELECT COUNT(*) AS n FROM door_schedule_entries WHERE session_id = 's1'").get().n;
  assert.equal(n(), 24);
  await writeDoorScheduleEntries("s1", "t", 286, sheet(["001", "002"]), 0.95, env);
  assert.equal(n(), 24);
  const p286 = db.prepare("SELECT mark FROM door_schedule_entries WHERE page_number = 286 ORDER BY mark").all().map((r) => r.mark);
  assert.equal(p286[0], "001 [p.286]");
});

test("a line another trade furnishes is listed as by others, not as a miss (Rockford BY DIVISION 28)", async () => {
  const db = makeDb();
  const c = db.prepare("INSERT INTO hardware_components (id, set_id, component_type, quantity, manufacturer, model, sequence_order) VALUES (?,?,?,?,?,?,?)");
  c.run("c5", "h1", "card_reader", 2, "By others", "BY DIVISION 28", 3);
  c.run("c6", "h2", "seal", 1, null, "BY DOOR AND FRAME MANUFACTURER", 3);
  const r = await citedPagesForSession("s1", { DB: d1(db) }, fakeMatch);
  assert.equal(r.components, 3);
  assert.deepEqual(r.by_others.map((x) => [x.text, x.qty]), [["BY DIVISION 28", 2], ["BY DOOR AND FRAME MANUFACTURER", 1]]);
  assert.deepEqual(r.missing.map((m) => m.model), ["4040XP", "XYZ-1"]);
});

test("a maker's spec sheet for the one product is cited at page 1 when its number is not in the sheet's text (Select SL57)", async () => {
  const db = makeDb();
  db.prepare("INSERT INTO hardware_components (id, set_id, component_type, quantity, manufacturer, model, sequence_order) VALUES ('c7','h1','hinge',1,'Select Hinges','SL57 FULL SURFACE',3)").run();
  const key = "catalog-corpus/sl57.pdf";
  const UPLOADS = { async get(k) { return k.startsWith("cut-sheet-text/") ? { json: async () => [{ page: 1, text: "CONTINUOUS GEARED HINGE drawing" }, { page: 2, text: "templates" }] } : null; }, async put() {} };
  const match = async (c) => c.model.startsWith("SL57")
    ? { matched: true, matchType: "base_model", maker: { known: true, name: "Select Hinges" }, product: { manufacturer: "Select Hinges", model: "SL57" }, cutSheets: [{ r2Key: key, title: "Select Hinges SL57 spec sheet (p.1)" }], cataloguePages: [] }
    : fakeMatch(c);
  const r = await citedPagesForSession("s1", { DB: d1(db), UPLOADS }, match);
  const sl = r.pages.find((p) => p.r2Key === key);
  assert.ok(sl, "SL57 cited");
  assert.equal(sl.pageNum, 1);
  assert.equal(sl.title, "Select Hinges SL57 spec sheet");
});

test("a sell sheet that prints only the function code is cited at the page its title names (Schlage ALX80, p.4)", async () => {
  const db = makeDb();
  db.prepare("INSERT INTO hardware_components (id, set_id, component_type, quantity, manufacturer, model, sequence_order) VALUES ('c8','h1','lock',1,'Schlage','ALX80R-RHO-626 FSIC',3)").run();
  const key = "catalog-corpus/alx.pdf";
  const UPLOADS = { async get(k) { return k.startsWith("cut-sheet-text/") ? { json: async () => [{ page: 1, text: "ALX Series" }, { page: 4, text: "Keyed 50 Entrance/office; 53 Entrance; 80 Storeroom" }] } : null; }, async put() {} };
  const match = async (c) => c.model.startsWith("ALX80")
    ? { matched: true, matchType: "base_model", maker: { known: true, name: "Schlage" }, product: { manufacturer: "Schlage", model: "ALX80" }, cutSheets: [{ r2Key: key, title: "Schlage ALX Series sell sheet 113320 (p.4)" }], cataloguePages: [] }
    : fakeMatch(c);
  const r = await citedPagesForSession("s1", { DB: d1(db), UPLOADS }, match);
  const alx = r.pages.find((p) => p.r2Key === key);
  assert.equal(alx && alx.pageNum, 4);
});
