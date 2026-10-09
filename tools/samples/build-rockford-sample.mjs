// Run from the repository root with Node >=22.13 (node:sqlite):
//   node tools/samples/build-rockford-sample.mjs
// Product path: readPageFromTextLayer -> writeDoorScheduleEntries ->
// assembleSubmittalPackage, used by POST
// /api/hardware-schedule/session/:sessionId/submittal-pdf.
// Only Worker storage bindings are fake: DB is in-memory SQLite behind D1's
// API; UPLOADS.get returns the actual local input PDF. No browser, network,
// OCR substitute, hard-coded door rows, or replacement PDF renderer.
// The route requires Section 08 71 00 before building a full submittal. This
// deliberate schedule-only sample calls its assembler directly, with no
// hardware groups/components or cut sheets. The unpaid route currently
// returns 402, so the assembler's explicit sample option supplies the label.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { readPageFromTextLayer } from "../../weyland-subx-worker/src/lib/text-layer-read.js";
import { writeDoorScheduleEntries } from "../../weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js";
import { assembleSubmittalPackage } from "../../weyland-subx-worker/src/lib/submittal-assembler.js";

const require = createRequire(new URL("../../weyland-subx-worker/package.json", import.meta.url));
const PDFLib = require("pdf-lib");
const root = new URL("../../", import.meta.url);
const input = "tools/user-simulation/roles/rockford-A2.2-p29.pdf";
const output = "assets/samples/rockford-schedule-packet.pdf";
const sessionId = "rockford-schedule-sample";
const sourceKey = "local-fixture/rockford-A2.2-p29.pdf";

function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...values) { args = values.map(v => v === undefined ? null : v); return stmt; },
        async first() { return db.prepare(sql).get(...args) || null; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async run() { return { meta: { changes: db.prepare(sql).run(...args).changes } }; },
      };
      return stmt;
    },
    async batch(stmts) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const stmt of stmts) results.push(await stmt.all());
        db.exec("COMMIT");
        return results;
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}

export async function buildRockfordSample() {
  const generatedAt = execFileSync("date", ["-u", "+%Y-%m-%dT%H:%M:%SZ"], { encoding: "utf8" }).trim();
  const sourceBytes = readFileSync(new URL(input, root));
  const read = await readPageFromTextLayer(sourceBytes, 1, "door_schedule");
  assert.equal(read.source, "text_layer");
  assert.equal(read.result.doors.length, 65);
  assert.equal(new Set(read.result.doors.map(d => d.door_number)).size, 65);
  assert.deepEqual(read.result.doors.map(d => d.source_row), Array.from({ length: 65 }, (_, i) => i));

  const db = new DatabaseSync(":memory:");
  try {
    db.exec([
      "CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, project_name TEXT, filename TEXT, file_buffer_key TEXT, total_pages INTEGER, status TEXT, door_schedule_extracted INTEGER DEFAULT 0, door_entries_count INTEGER DEFAULT 0, pages_processed INTEGER DEFAULT 0, door_schedule_extracted_at TEXT, updated_at TEXT)",
      "CREATE TABLE door_schedule_entries (id TEXT, session_id TEXT, tenant_id TEXT, page_number INTEGER, mark TEXT, hardware_group TEXT, fire_rating TEXT, width TEXT, height TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_type TEXT, frame_material TEXT, panic INTEGER, thickness TEXT, thickness_inches REAL, door_finish TEXT, stc_rating INTEGER, frame_finish TEXT, head_detail TEXT, jamb_detail TEXT, sill_detail TEXT, notes TEXT, extraction_confidence REAL, field_confidence_json TEXT, low_confidence_fields TEXT, corrections_json TEXT, created_at TEXT, updated_at TEXT, UNIQUE(session_id, mark))",
      "CREATE TABLE hardware_sets (id TEXT PRIMARY KEY, session_id TEXT, set_number TEXT, set_name TEXT, door_location TEXT, door_count INTEGER, notes TEXT, affirmed INTEGER)",
      "CREATE TABLE hardware_page_extractions (session_id TEXT, page_number INTEGER)",
    ].join(";"));
    db.prepare("INSERT INTO hardware_extraction_sessions (id, project_name, filename, file_buffer_key, total_pages, status) VALUES (?, ?, ?, ?, 1, 'review')")
      .run(sessionId, "Rockford A2.2 (schedule only)", "rockford-A2.2-p29.pdf", sourceKey);
    const env = {
      DB: d1(db),
      UPLOADS: {
        async get(key) {
          assert.equal(key, sourceKey, "Only the actual source sheet may be fetched");
          return { arrayBuffer: async () => sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength) };
        },
      },
    };
    const written = await writeDoorScheduleEntries(sessionId, "local-sample", 1, read.result.doors, read.result.extraction_confidence, env);
    assert.equal(written.entries_count, 65);
    const result = await assembleSubmittalPackage(sessionId, {
      date: generatedAt.slice(0, 10), generatedAt,
      preparedBy: "WeylandAI SubX",
      sample: true, includeDraftSets: false, citedPages: [], saveToR2: false,
    }, env, PDFLib);
    assert.equal(result.success, true, result.errors.join("; "));
    assert.deepEqual(result.errors, []);
    assert.equal(result.doorCount, 65);
    assert.equal(result.hardwareSetCount, 0);
    assert.equal(result.cutSheetCount, 0);
    assert.equal(result.totalPages, 5);
    assert.deepEqual(result.sections.map(s => [s.type, s.pages]), [["cover", 1], ["toc", 1], ["door_schedule", 2], ["schedule", 1]]);
    const doc = await PDFLib.PDFDocument.load(result.pdfBytes, { updateMetadata: false });
    return {
      bytes: result.pdfBytes,
      evidence: {
        generatedAt, input, sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"), output,
        pages: result.totalPages, producer: doc.getProducer(), sections: result.sections,
        doors: written.entries.map(d => ({ mark: d.mark, page: d.page_number, row: JSON.parse(d.field_confidence_json).source.table_row })),
      },
    };
  } finally {
    db.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { bytes, evidence } = await buildRockfordSample();
  writeFileSync(new URL(output, root), bytes);
  console.log(JSON.stringify(evidence, null, 2));
}
