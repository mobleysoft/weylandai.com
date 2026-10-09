import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { NativeRouter } from "../src/lib/router.js";
import { registerHardwareScheduleExtractRoutes } from "../src/routes/hardware-schedule-extract.js";
import { extractHardwarePage } from "../src/lib/schedule-input.js";
import { registerHardwareScheduleExtractRoutes as registerMonolithRoutes } from "../../src/routes/hardware-schedule-extract.js";
import { storeHardwareExtraction } from "../src/lib/hardware-extraction-pipeline.js";
import { storeHardwareExtraction as storeMonolithHardware } from "../../src/lib/hardware-extraction-pipeline.js";
import { createEmbeddedHardwareReader } from "../src/lib/embedded-hardware-reader.js";

const corpus = new URL("../../tools/corpus/", import.meta.url);
const book = readFileSync(new URL("door-schedules/f0e863d88ea688ff.pdf", corpus));
const truth = JSON.parse(readFileSync(new URL("expected/rockford-087100-hardware-groups.json", corpus)));
async function fixture(text) {
  const pdf = await PDFDocument.create(), page = pdf.addPage();
  if (text) page.drawText(text);
  return pdf.save();
}
function route(extract = (bytes, env, options) => extractHardwarePage(bytes, options.pageNumber, env), register = registerHardwareScheduleExtractRoutes, store) {
  const router = new NativeRouter(), writes = [], saved = [], statements = [];
  const forbidden = () => assert.fail("no language model or OCR-worker call is allowed");
  const env = {
    OCR_SERVICE: { fetch: forbidden }, QWEN: { fetch: forbidden }, JITAGI: { fetch: forbidden },
    CACHE: { async put(key) { writes.push("cache"); } },
    UPLOADS: { async put(key) { writes.push("r2"); } },
    DB: { prepare(sql) { return { bind(...args) { this.args = args; return this; }, async first() { return null; }, async run() { statements.push({ sql, args: this.args }); writes.push(sql.includes("hardware_extraction_jobs") ? "job" : "row"); return { meta: { changes: 1 } }; } }; } },
  };
  register(router, {
    authenticate: async () => ({ user: { userId: "test-user" } }),
    extractHardwareSchedule: extract,
    storeHardwareExtraction: store || (async result => {
      saved.push(result); writes.push("groups");
      return { sets_inserted: result.hardware_groups.length, components_inserted: result.hardware_groups.reduce((n, g) => n + g.components.length, 0) };
    }),
  });
  return { router, env, writes, saved, statements };
}
async function submit(r, bytes, page) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), "hardware.pdf");
  if (page != null) form.append("page_number", String(page));
  return r.router.handle(new Request("https://example.com/api/hardware-schedule/extract", { method: "POST", body: form }), r.env, {});
}

test("actual sessionless extract endpoint reads the selected Rockford page without model services", async () => {
  const r = route(), response = await submit(r, book, 17), body = await response.json();
  const expected = truth.groups.filter(g => g.page === 17);
  assert.equal(response.status, 201);
  assert.deepEqual(body.extraction.sets.map(g => g.set_number), expected.map(g => g.group));
  assert.equal(body.database.components_inserted, expected.reduce((n, g) => n + g.items.length, 0));
  assert.equal(r.saved[0].page_number, 17);
  assert.equal(r.saved[0].metadata.read_source, "text_layer");
  assert.deepEqual(body.usage, { input_tokens: 0, output_tokens: 0 });
  assert.deepEqual(r.writes, ["cache", "r2", "groups", "job"]);
});

test("real notes and a real blank PDF return actionable outcomes before any persistence", async () => {
  for (const [text, status, code, retryable] of [
    ["GENERAL NOTES ONLY", 422, "NO_HARDWARE_SCHEDULE", false],
    ["", 503, "HARDWARE_BROWSER_UNAVAILABLE", true],
  ]) {
    const r = route(), response = await submit(r, await fixture(text)), body = await response.json();
    assert.equal(response.status, status); assert.equal(body.code, code); assert.equal(body.retryable, retryable);
    assert.deepEqual(r.writes, []); assert.deepEqual(r.saved, []);
  }
});

test("a partial browser outcome cannot create a successful extraction job", async () => {
  const reader = createEmbeddedHardwareReader({ readBrowser: async () => ({ ok: true, result: {
    partial: true, hardware_groups: [{ group_number: "01", components: [] }],
  } }) });
  const r = route((bytes, env) => reader(bytes, 1, 1, { ...env, BROWSER: {} }));
  const response = await submit(r, await fixture("")), body = await response.json();
  assert.equal(response.status, 422); assert.equal(body.code, "PARTIAL_HARDWARE_READ");
  assert.equal(body.partial, true); assert.equal(body.retryable, true);
  assert.deepEqual(r.writes, []); assert.deepEqual(r.saved, []);
});


test("SubX and monolith legacy endpoints persist the selected page with real storage helpers", async () => {
  const expected = truth.groups.filter(g => g.page === 17);
  for (const [register, store] of [[registerHardwareScheduleExtractRoutes, storeHardwareExtraction], [registerMonolithRoutes, storeMonolithHardware]]) {
    const r = route(undefined, register, store), response = await submit(r, book, 17), body = await response.json();
    assert.equal(response.status, 201);
    const sets = r.statements.filter(s => s.sql.includes("INSERT OR REPLACE INTO hardware_sets"));
    assert.equal(sets.length, expected.length);
    assert.ok(sets.every(s => s.args[8] === 17), "source page must remain 17 in approved_from_page");
    assert.equal(body.database.sets_inserted, expected.length);
    assert.equal(body.database.components_inserted, expected.reduce((n, g) => n + g.items.length, 0));
    const blank = route(undefined, register, store), failed = await submit(blank, await fixture("")), failure = await failed.json();
    assert.equal(failed.status, 503); assert.equal(failure.code, "HARDWARE_BROWSER_UNAVAILABLE");
    assert.equal(failure.retryable, true); assert.deepEqual(blank.statements, []);
  }
});
