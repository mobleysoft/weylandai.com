import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { loadJob, closeoutModel, citedProductPages, closeoutPdf } from "../src/routes/closex.js";

function d1(db) {
  return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } };
}
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE hardware_extraction_sessions (id TEXT, user_id TEXT, project_name TEXT, filename TEXT);
    CREATE TABLE door_schedule_entries (session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_material TEXT, notes TEXT, page_number INTEGER);
    CREATE TABLE hardware_sets (id TEXT, session_id TEXT, set_number TEXT, set_name TEXT);
    CREATE TABLE hardware_components (set_id TEXT, component_type TEXT, quantity INTEGER, uom TEXT, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, specifications TEXT, sequence_order INTEGER);
    CREATE TABLE catalogues (catalogue_id TEXT, source_filename TEXT, storage_path TEXT, page_count INTEGER);`);
  db.prepare("INSERT INTO hardware_extraction_sessions VALUES ('s1','u1','Majestic Way ES','a92.pdf')").run();
  const d = db.prepare("INSERT INTO door_schedule_entries VALUES ('s1',?,?,?,?,?,NULL,NULL,NULL,?,284)");
  d.run("001", "2", "20 MIN", 42, 94, "ADMIN LOBBY HALL");
  d.run("002", "1", null, 42, 94, "A-POD CLASSROOM A1");
  d.run("003", "9", null, 36, 84, "STORAGE");
  db.prepare("INSERT INTO hardware_sets VALUES ('h1','s1','HW-01','Classroom')").run();
  db.prepare("INSERT INTO hardware_sets VALUES ('h2','s1','02','Pair')").run();
  const c = db.prepare("INSERT INTO hardware_components VALUES (?,?,?,?,?,?,?,?,?,?)");
  c.run("h1", "lockset", 1, "EA", "Schlage", "ND70PD", "ND70PD RHO", "626", JSON.stringify({ description: "CLASSROOM LOCK" }), 1);
  c.run("h1", "hinge", 3, "EA", "Ives", "5BB1", "5BB1 4.5 x 4.5", "652", null, 2);
  c.run("h2", "exit_device", 2, "EA", "Von Duprin", "98-EO", "98-EO", "626", null, 1);
  c.run("h2", "closer", 2, "EA", "LCN", "4040XP", "4040XP", "689", null, 2);
  db.prepare("INSERT INTO catalogues VALUES ('schlage-pb','s.pdf','catalogues/schlage-pb/source.pdf',300)").run();
  return db;
}
async function book(n) { const doc = await PDFDocument.create(); const f = await doc.embedFont(StandardFonts.Helvetica); for (let i = 1; i <= n; i++) doc.addPage([612, 792]).drawText("page " + i, { x: 50, y: 700, size: 12, font: f }); return doc.save(); }

test("the job is read from SubX: sets matched across HW-01 / 1 / 02 / 2, keyed openings found", async () => {
  const env = { DB: d1(makeDb()) };
  assert.equal((await loadJob(env, "s1", "someone-else")).error[0], 403);
  const job = await loadJob(env, "s1", "u1");
  const m = closeoutModel(job, { owner: "Berryessa USD", warranties: { LCN: "30 years" } });
  assert.equal(m.openings.length, 3);
  assert.deepEqual(m.openings.find((o) => o.mark === "002").items.map((i) => i.manufacturer), ["Schlage", "Ives"]);
  assert.deepEqual(m.openings.find((o) => o.mark === "001").items.map((i) => i.manufacturer), ["Von Duprin", "LCN"]);
  assert.deepEqual(m.keyed.map((o) => o.mark), ["001", "002"]);
  assert.deepEqual(m.unassigned, ["003"]);
  assert.deepEqual(m.warranties, [{ manufacturer: "Ives", terms: "" }, { manufacturer: "LCN", terms: "30 years" }, { manufacturer: "Schlage", terms: "" }, { manufacturer: "Von Duprin", terms: "" }]);
  assert.equal(m.products.length, 4);
});

test("the package PDF carries the cited catalogue page of a product, not the book", async () => {
  const objects = new Map([["catalogues/schlage-pb/source.pdf", await book(300)]]);
  const env = { DB: d1(makeDb()), UPLOADS: { async get(k) { const b = objects.get(k); return b ? { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } : null; }, async put(k, v) { objects.set(k, v); }, async head(k) { return objects.has(k) ? {} : null; } } };
  const m = closeoutModel(await loadJob(env, "s1", "u1"), {});
  const fakeMatch = async (c) => c.model === "ND70PD" ? { matched: true, matchType: "exact", cutSheets: [{ pinnedPage: 212, catalogueId: "schlage-pb", title: "Schlage Price Book" }], cataloguePages: [] } : { matched: false };
  const cited = await citedProductPages(env, m.products, fakeMatch);
  assert.equal(cited.pages.length, 1);
  assert.equal(cited.missing.length, 3);
  const pdf = await PDFDocument.load(await closeoutPdf(env, m, cited, PDFDocument));
  const withoutPages = await PDFDocument.load(await closeoutPdf(env, m, { pages: [], missing: cited.missing }, PDFDocument));
  assert.equal(pdf.getPageCount(), withoutPages.getPageCount() + 1);
});

test("SubX's duplicate-mark bookkeeping is not printed as a door's location", () => {
  const job = { session: { project_name: "P" }, sets: new Map(), doors: [{ mark: "001 [p.286]", notes: "CORRIDOR 12; same mark as a door on page 284" }, { mark: "002 [p.286]", notes: "same mark as a door on page 284" }] };
  const m = closeoutModel(job, {});
  assert.deepEqual(m.openings.map((o) => o.location), ["CORRIDOR 12", ""]);
});

test("a catalog number wider than its column wraps inside it", async () => {
  const { wrap } = await import("../src/lib/pdf.js");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = wrap("PA-AX-9927-L-F-2SI-LBR-06-499F", font, 8, 70);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(""), "PA-AX-9927-L-F-2SI-LBR-06-499F");
  assert.ok(lines.every((l) => font.widthOfTextAtSize(l, 8) <= 70));
});

test("a product whose filed price book is another edition's index gets the page from that book's cached text", async () => {
  const { filedTextKey } = await import("../../weyland-shared/filed-page.js");
  const key = "manufacturer-catalogs/vd.pdf";
  const store = new Map([[filedTextKey(key), JSON.stringify([{ page: 41, text: "99 Series parts" }, { page: 42, text: "Less bottom rod 9927-EO-F-LBR" }])]]);
  const env = { UPLOADS: { async get(k) { return store.has(k) ? { async json() { return JSON.parse(store.get(k)); } } : null; } } };
  const match = async () => ({ matched: true, matchType: "base_model", maker: { known: true }, product: { model: "99", base_model: "99" }, cutSheets: [{ r2Key: key, pinnedPage: null, title: "Von Duprin Price Book (2026)" }], cataloguePages: [] });
  const r = await citedProductPages(env, [{ manufacturer: "Von Duprin", model: "PA-AX-9927-EO-F-LBR-499F" }, { manufacturer: "Nobody", model: "X1" }], async (c) => (c.manufacturer === "Nobody" ? { matched: false } : match()));
  assert.deepEqual(r.pages.map((p) => [p.r2Key, p.pageNum, p.title]), [[key, 42, "Von Duprin Price Book"]]);
  assert.deepEqual(r.missing, ["Nobody X1"]);
});
