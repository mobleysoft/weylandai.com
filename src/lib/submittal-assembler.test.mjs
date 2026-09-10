import { test } from "node:test";
import assert from "node:assert/strict";
import {
  drawTable,
  truncateText,
  generateCoverPage,
  generateTableOfContents,
  generateHardwareSetPage,
  mergePdfs,
  assembleSubmittalPackage,
  getAssemblyStatus,
} from "./submittal-assembler.js";

// Minimal, real-behavior fake of the pdf-lib surface these functions
// actually call, instead of pulling in the vendored bundle from
// legacy-monolith.js in a unit test. Records draw calls so tests can
// assert on layout decisions (text truncation, page overflow) without
// rendering real PDF bytes.
function makeFakePDFLib() {
  function makeFont(name) {
    return {
      name,
      widthOfTextAtSize(text, size) {
        return text.length * size * 0.5;
      },
    };
  }
  class FakePage {
    constructor() {
      this.ops = [];
      this._size = { width: 612, height: 792 };
    }
    getSize() { return this._size; }
    drawText(text, opts) { this.ops.push({ op: "text", text, ...opts }); }
    drawRectangle(opts) { this.ops.push({ op: "rect", ...opts }); }
    drawLine(opts) { this.ops.push({ op: "line", ...opts }); }
  }
  class FakeDoc {
    constructor() { this.pages = []; }
    addPage(size) { const p = new FakePage(); p._size = { width: size[0], height: size[1] }; this.pages.push(p); return p; }
    async embedFont(font) { return font; }
    async save() { return new TextEncoder().encode(`FAKEPDF:${this.pages.length}pages`); }
    getPageCount() { return this.pages.length; }
    getPageIndices() { return this.pages.map((_, i) => i); }
    async copyPages(srcDoc, indices) { return indices.map(() => new FakePage()); }
  }
  const PDFDocument = {
    async create() { return new FakeDoc(); },
    async load(bytes) {
      const text = new TextDecoder().decode(bytes);
      const match = text.match(/FAKEPDF:(\d+)pages/);
      const count = match ? parseInt(match[1], 10) : 1;
      const doc = new FakeDoc();
      for (let i = 0; i < count; i++) doc.addPage([612, 792]);
      return doc;
    },
  };
  return {
    PDFDocument,
    StandardFonts: { Helvetica: makeFont("Helvetica"), HelveticaBold: makeFont("HelveticaBold") },
    rgb: (r, g, b) => ({ r, g, b }),
  };
}

test("truncateText: returns text unchanged when it fits", () => {
  const font = { widthOfTextAtSize: (t, s) => t.length * s * 0.5 };
  assert.equal(truncateText("short", 1000, font, 10), "short");
});

test("truncateText: truncates with an ellipsis when it doesn't fit", () => {
  const font = { widthOfTextAtSize: (t, s) => t.length * s * 0.5 };
  const result = truncateText("a very long string that will not fit", 20, font, 10);
  assert.ok(result.endsWith("…"));
  assert.ok(result.length < "a very long string that will not fit".length);
});

test("truncateText: empty text becomes an em dash", () => {
  const font = { widthOfTextAtSize: () => 0 };
  assert.equal(truncateText("", 100, font, 10), "—");
});

test("drawTable: draws a header row and one row per data row when space allows", () => {
  const PDFLib = makeFakePDFLib();
  const page = { ops: [], drawText(...a) { this.ops.push(["text", ...a]); }, drawRectangle(...a) { this.ops.push(["rect", ...a]); }, drawLine(...a) { this.ops.push(["line", ...a]); } };
  const result = drawTable(page, {
    headers: ["A", "B"],
    rows: [["1", "2"], ["3", "4"]],
    x: 10, y: 700, colWidths: [50, 50],
    font: PDFLib.StandardFonts.Helvetica, headerFont: PDFLib.StandardFonts.HelveticaBold,
    rgb: PDFLib.rgb,
  });
  assert.equal(result.rowsDrawn, 2);
  assert.ok(result.endY < 700);
});

test("drawTable: stops drawing rows once it runs below minY", () => {
  const PDFLib = makeFakePDFLib();
  const page = { drawText() {}, drawRectangle() {}, drawLine() {} };
  const manyRows = Array.from({ length: 50 }, (_, i) => [`r${i}`, "x"]);
  const result = drawTable(page, {
    headers: ["A", "B"], rows: manyRows, x: 10, y: 100, colWidths: [50, 50],
    font: PDFLib.StandardFonts.Helvetica, headerFont: PDFLib.StandardFonts.HelveticaBold,
    rgb: PDFLib.rgb, rowHeight: 18, minY: 60,
  });
  assert.ok(result.rowsDrawn < manyRows.length);
});

test("generateCoverPage: real happy path produces saved bytes", async () => {
  const PDFLib = makeFakePDFLib();
  const bytes = await generateCoverPage({ projectName: "Test Project", contractor: "ACME Co" }, PDFLib);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(new TextDecoder().decode(bytes).includes("1pages"));
});

test("generateTableOfContents: overflows to a new page past the bottom margin", async () => {
  const PDFLib = makeFakePDFLib();
  const sections = Array.from({ length: 40 }, (_, i) => ({ title: `Section ${i}`, pageNumber: i + 3 }));
  const bytes = await generateTableOfContents(sections, PDFLib);
  const decoded = new TextDecoder().decode(bytes);
  const pageCount = parseInt(decoded.match(/FAKEPDF:(\d+)pages/)[1], 10);
  assert.ok(pageCount > 1, "expected TOC to overflow onto additional pages");
});

test("generateHardwareSetPage: real happy path with doors and components produces 2 base pages", async () => {
  const PDFLib = makeFakePDFLib();
  const setData = {
    set: { set_number: "1A", set_name: "Entry Doors", door_count: 2, notes: "keyed alike" },
    components: [
      { quantity: 1, uom: "EA", component_type: "hinge", manufacturer: "Acme", model: "H100", finish: "626" },
      { quantity: 2, uom: "EA", component_type: "lock", manufacturer: "Acme", model: "L200", finish: "us26d" },
    ],
    doors: [
      { mark: "101", width: 36, height: 84, door_type: "wood", frame_material: "HM", fire_rating: "NR", notes: "" },
    ],
  };
  const bytes = await generateHardwareSetPage(setData, {}, PDFLib);
  const decoded = new TextDecoder().decode(bytes);
  assert.ok(decoded.includes("2pages"), "cover set page + keying/compliance page");
});

test("generateHardwareSetPage: BHMA finish lookup resolves a known code to its display name", async () => {
  const PDFLib = makeFakePDFLib();
  const drawnTexts = [];
  const realAddPage = PDFLib.PDFDocument.create;
  PDFLib.PDFDocument.create = async () => {
    const doc = await realAddPage();
    const realAddPageMethod = doc.addPage.bind(doc);
    doc.addPage = (size) => {
      const page = realAddPageMethod(size);
      const realDrawText = page.drawText.bind(page);
      page.drawText = (text, opts) => { drawnTexts.push(text); return realDrawText(text, opts); };
      return page;
    };
    return doc;
  };
  const setData = {
    set: { set_number: "2B" },
    components: [{ quantity: 1, finish: "626" }],
    doors: [],
  };
  await generateHardwareSetPage(setData, {}, PDFLib);
  assert.ok(drawnTexts.some((t) => t.includes("Satin Chromium")), "expected the BHMA code 626 to resolve to its display name");
});

test("mergePdfs: combines multiple documents' page counts", async () => {
  const PDFLib = makeFakePDFLib();
  const doc1 = await PDFLib.PDFDocument.create();
  doc1.addPage([612, 792]);
  const bytes1 = await doc1.save();
  const doc2 = await PDFLib.PDFDocument.create();
  doc2.addPage([612, 792]);
  doc2.addPage([612, 792]);
  const bytes2 = await doc2.save();
  const merged = await mergePdfs([bytes1, bytes2], PDFLib);
  const mergedDoc = await PDFLib.PDFDocument.load(merged);
  assert.equal(mergedDoc.getPageCount(), 3);
});

test("mergePdfs: skips a PDF that fails to load without throwing", async () => {
  const PDFLib = makeFakePDFLib();
  const badBytes = new TextEncoder().encode("not a real pdf at all");
  const realLoad = PDFLib.PDFDocument.load;
  PDFLib.PDFDocument.load = async (bytes) => {
    const text = new TextDecoder().decode(bytes);
    if (!text.startsWith("FAKEPDF:")) throw new Error("bad pdf");
    return realLoad(bytes);
  };
  const merged = await mergePdfs([badBytes], PDFLib);
  assert.ok(merged instanceof Uint8Array);
  const doc = await PDFLib.PDFDocument.load(merged);
  assert.equal(doc.getPageCount(), 0);
});

function makeFakeEnv({ session = null, hardwareSets = [], cutSheets = [], components = [], doors = [], uploadsPut = async () => {}, uploadsHead = async () => null } = {}) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind: (...args) => ({
            async first() {
              if (sql.includes("FROM hardware_extraction_sessions")) return session;
              return null;
            },
            async all() {
              if (sql.includes("FROM session_cut_sheet_matches")) return { results: cutSheets };
              if (sql.includes("FROM hardware_sets")) return { results: hardwareSets };
              if (sql.includes("FROM hardware_components")) return { results: components };
              if (sql.includes("FROM door_schedule_entries")) return { results: doors };
              return { results: [] };
            },
            async run() { return {}; },
          }),
        };
      },
    },
    UPLOADS: {
      async get() { return null; },
      async head(key) { return uploadsHead(key); },
      async put(key, bytes, opts) { return uploadsPut(key, bytes, opts); },
    },
  };
}

test("assembleSubmittalPackage: real error when session not found", async () => {
  const PDFLib = makeFakePDFLib();
  const env = makeFakeEnv({ session: null });
  const result = await assembleSubmittalPackage("s1", {}, env, PDFLib);
  assert.equal(result.success, false);
  assert.ok(result.errors.includes("Session not found"));
});

test("assembleSubmittalPackage: real happy path with no hardware sets or cut sheets assembles cover+toc", async () => {
  const PDFLib = makeFakePDFLib();
  const env = makeFakeEnv({ session: { project_name: "Proj", total_pages: 0 } });
  const result = await assembleSubmittalPackage("s1", { saveToR2: false }, env, PDFLib);
  assert.equal(result.success, true);
  assert.equal(result.totalPages, 2); // cover + toc
  assert.ok(result.sections.some((s) => s.type === "cover"));
  assert.ok(result.sections.some((s) => s.type === "toc"));
});

test("assembleSubmittalPackage: saves to R2 by default and records the key", async () => {
  const PDFLib = makeFakePDFLib();
  const puts = [];
  const env = makeFakeEnv({
    session: { project_name: "Proj", total_pages: 0 },
    uploadsPut: async (key, bytes, opts) => { puts.push({ key, opts }); },
  });
  const result = await assembleSubmittalPackage("s1", {}, env, PDFLib);
  assert.equal(result.r2Key, "submittals/s1/final_submittal.pdf");
  assert.equal(puts.length, 1);
});

test("assembleSubmittalPackage: an affirmed hardware set contributes a section and TOC entry", async () => {
  const PDFLib = makeFakePDFLib();
  const env = makeFakeEnv({
    session: { project_name: "Proj", total_pages: 0 },
    hardwareSets: [{ id: "hs1", set_number: "1A", set_name: "Doors", door_count: 1, affirmed: 1 }],
    components: [{ quantity: 1, component_type: "hinge", manufacturer: "Acme", model: "H1" }],
    doors: [{ mark: "101", width: 36, height: 84 }],
  });
  const result = await assembleSubmittalPackage("s1", { saveToR2: false }, env, PDFLib);
  assert.equal(result.success, true);
  assert.ok(result.sections.some((s) => s.type === "hardware_set" && s.title === "Hardware Set 1A"));
});

test("getAssemblyStatus: real 'assembled' status when the R2 object already exists", async () => {
  const env = makeFakeEnv({
    uploadsHead: async () => ({ customMetadata: { assembledAt: "2026-01-01", totalPages: "5" }, size: 12345 }),
  });
  const status = await getAssemblyStatus("s1", env);
  assert.equal(status.status, "assembled");
  assert.equal(status.totalPages, 5);
  assert.equal(status.fileSize, 12345);
});

test("getAssemblyStatus: 'not_found' when no R2 object and no session row", async () => {
  const env = makeFakeEnv({ session: null });
  const status = await getAssemblyStatus("s1", env);
  assert.equal(status.status, "not_found");
});

test("getAssemblyStatus: real 'pending' status with session progress when not yet assembled", async () => {
  const env = makeFakeEnv({ session: { status: "extracting", total_pages: 10, total_components_extracted: 4 } });
  const status = await getAssemblyStatus("s1", env);
  assert.equal(status.status, "pending");
  assert.equal(status.sessionStatus, "extracting");
  assert.equal(status.totalPages, 10);
});

test("getAssemblyStatus: real error branch when the DB throws", async () => {
  const env = { UPLOADS: { async head() { throw new Error("r2 down"); } } };
  const status = await getAssemblyStatus("s1", env);
  assert.equal(status.status, "error");
  assert.match(status.error, /r2 down/);
});
