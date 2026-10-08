// A SubX packet carries the cut sheet pages of the products its hardware sets
// name (2026-10-08): components are matched as printed (maker code, model
// from the catalog cell) by the shared matcher, the citation is a catalogue
// page that names the model (or the page a price-book row gives), and the
// packet embeds just those pages. Value audit, before: 0 of 23 cut sheets.
// Runs the real persistence and assembler on node:sqlite with an in-memory R2.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { persistExactCutSheetMatches } from "../src/routes/subx-workspace.js";
import { assembleSubmittalPackage } from "../src/lib/submittal-assembler.js";
import { resetManufacturerCache } from "../../weyland-shared/cut-sheet-matcher.js";

function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
        async first(col) { const r = db.prepare(sql).get(...args); if (r === undefined) return null; return col ? r[col] : { ...r }; },
        async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
        async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
      };
      return stmt;
    },
  };
}

// A PDF whose page n says "page n", so a test can see which pages were copied.
async function numberedPdf(pages, label) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([612, 792]).drawText(`${label} page ${i}`, { x: 72, y: 700, size: 12, font });
  return doc.save();
}

function r2(objects) {
  return {
    async get(key) { const b = objects.get(key); return b ? { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), size: b.length } : null; },
    async head(key) { return objects.has(key) ? { size: objects.get(key).length } : null; },
    async put(key, bytes) { objects.set(key, new Uint8Array(bytes)); },
  };
}

test("the packet carries the cited catalogue page, not a price book; other makers' models stay out", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT, project_name TEXT, filename TEXT, document_type TEXT, total_pages INTEGER, status TEXT, file_buffer_key TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width TEXT, height TEXT, width_inches REAL, height_inches REAL, thickness TEXT, thickness_inches REAL, door_type TEXT, door_material TEXT, door_finish TEXT, frame_type TEXT, frame_material TEXT, frame_finish TEXT, notes TEXT, page_number INTEGER, field_confidence_json TEXT);
    CREATE TABLE hardware_sets (id TEXT PRIMARY KEY, session_id TEXT, set_number TEXT, set_name TEXT, door_location TEXT, door_count INTEGER, notes TEXT, affirmed INTEGER);
    CREATE TABLE hardware_components (id TEXT, set_id TEXT, component_type TEXT, quantity INTEGER, manufacturer TEXT, model TEXT, finish TEXT, ansi_bhma_grade TEXT, fire_rating_minutes INTEGER, ul_listing_number TEXT, ada_compliant INTEGER, uom TEXT, sequence_order INTEGER, catalog_number TEXT, specifications TEXT);
    CREATE TABLE hardware_page_extractions (session_id TEXT, page_number INTEGER);
    CREATE TABLE session_cut_sheet_matches (id TEXT PRIMARY KEY, session_id TEXT, cut_sheet_id TEXT, matched_manufacturer TEXT, matched_model TEXT, match_type TEXT, confidence REAL, status TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE manufacturers (id TEXT PRIMARY KEY, name TEXT, slug TEXT);
    CREATE TABLE products (id TEXT PRIMARY KEY, manufacturer_id TEXT, base_model TEXT, display_name TEXT, trade TEXT, product_series TEXT, category_level_1 TEXT, ansi_grade TEXT, fire_rated INTEGER, ada_compliant INTEGER);
    CREATE TABLE product_documents (id TEXT PRIMARY KEY, product_id TEXT, document_type TEXT, document_title TEXT, document_url TEXT, r2_object_key TEXT, r2_bucket TEXT, page_count INTEGER, version TEXT, published_date TEXT, active INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT PRIMARY KEY, title TEXT, manufacturer TEXT, storage_path TEXT, source_filename TEXT, page_count INTEGER);
    CREATE TABLE catalogue_pages (catalogue_id TEXT, page_num INTEGER, text TEXT);
    CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text);
    INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Rockford addendum','rockford.pdf','hardware_schedule',30,'active',NULL);
    INSERT INTO hardware_sets VALUES ('set-02','s1','02 RR-M',NULL,NULL,6,NULL,0);
    INSERT INTO hardware_components (id,set_id,component_type,quantity,manufacturer,model,finish,uom,sequence_order) VALUES
      ('c1','set-02','KICK PLATE',1,'IVE','8400 10" HIGH B-CS TKTX SCREWS AT HM DOORS','630','EA',1),
      ('c2','set-02','PUSH PLATE',1,'IVE','8200 4" X 16" TKTX SCREWS AT HM DOORS','630','EA',2),
      ('c3','set-02','DOOR SWEEP',1,'ZER','39D','D','EA',3),
      ('c4','set-02','CREDENTIAL READER',1,'B/O','BY DIVISION 28',NULL,'EA',4);
    INSERT INTO manufacturers VALUES ('mfr-ives','IVES','ives'),('mfr-sargent','Sargent','sargent'),('mfr-zero','Zero International','zero');
    INSERT INTO products VALUES ('p-ives-8400','mfr-ives','8400','IVES 8400','doors',NULL,'Kick plate',NULL,0,0),
      ('p-sargent-8200','mfr-sargent','8200','Sargent 8200 Series Mortise Lock','doors',NULL,'Lock',NULL,0,0),
      ('p-zero-39','mfr-zero','39','ZERO 39','doors',NULL,'Sweep',NULL,0,0);
    INSERT INTO product_documents VALUES ('d-zero-39','p-zero-39','cut_sheet','Zero Price Book (39 around p.12)',NULL,'manufacturer-catalogs/zero.pdf','subx-uploads',40,NULL,'2025-01-01',1);
    INSERT INTO catalogues VALUES ('cat-ives-pp','Ives Protection Plates Catalog','IVES','catalogues/ives-pp.pdf','ives-pp.pdf',30);
    INSERT INTO catalogue_pages VALUES ('cat-ives-pp',7,'8400 kick plate protection plates');
    INSERT INTO catalogue_pages_fts(rowid, text) SELECT rowid, text FROM catalogue_pages;
  `);
  const objects = new Map([
    ["catalogues/ives-pp.pdf", await numberedPdf(30, "Ives PP")],
    ["manufacturer-catalogs/zero.pdf", await numberedPdf(40, "Zero book")],
  ]);
  resetManufacturerCache();
  const env = { DB: d1(db), UPLOADS: r2(objects), OUTPUTS: r2(objects) };

  const summary = await persistExactCutSheetMatches("s1", env);
  assert.equal(summary.matched, 2);
  assert.equal(summary.by_others, 1);
  assert.deepEqual(summary.missing.map((m) => [m.manufacturer, m.reason, m.other_maker]), [["IVE", "other_maker_only", "Sargent 8200"]]);

  const result = await assembleSubmittalPackage("s1", { includeDraftSets: true }, env, { PDFDocument, StandardFonts, rgb });
  assert.equal(result.success, true, result.errors.join("; "));
  const sheets = result.sections.filter((s) => s.type === "cut_sheet");
  assert.deepEqual(sheets.map((s) => [s.manufacturer, s.model, s.title, s.pages]), [
    ["IVES", "8400", "Ives Protection Plates Catalog, p. 7", 1],
    ["Zero International", "39", "Zero Price Book, p. 12", 1],
  ]);
  // 30- and 40-page sources, one page each in the packet.
  assert.ok(result.totalPages < 15, "packet has " + result.totalPages + " pages");
});
