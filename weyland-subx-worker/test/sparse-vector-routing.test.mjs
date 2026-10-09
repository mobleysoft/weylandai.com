import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readPageFromTextLayer } from "../src/lib/text-layer-read.js";
import { runEmbeddedGofaineatExtraction } from "../src/lib/hardware-extraction-pipeline.js";
import { registerHardwareSchedulePageExtractRoutes } from "../src/routes/hardware-schedule-page-extract.js";
import { NativeRouter } from "../src/lib/router.js";

async function notes(words) {
  const doc = await PDFDocument.create(), page = doc.addPage([2592, 1728]);
  for (let i = 0; i < words; i++) page.drawText("GENERAL", { x: 100, y: 1600 - i * 20, size: 12 });
  return doc.save();
}
function envFor(bytes) {
  return {
    BROWSER: { fetch() { assert.fail("vector notes must never launch the browser"); } },
    OCR_SERVICE: { fetch() { assert.fail("vector notes must never call OCR"); } },
    DB: { prepare() { return { bind() { return this; }, async first() { return { id: "s", user_id: "u", total_pages: 1, file_buffer_key: "notes" }; } }; } },
    CACHE: { async get() { return bytes; } },
  };
}
test("F4: review's 30-word vector reproduction stays on the server text path and returns plain no-schedule", async () => {
  for (const count of [1, 14, 15, 30, 59]) {
    const bytes = await notes(count);
    const text = await readPageFromTextLayer(bytes, 1, "door_schedule");
    assert.equal(text.source, "text_layer");
    assert.equal(text.empty, true);
    assert.equal(text.result.metadata.text_words, count);
    const result = await runEmbeddedGofaineatExtraction("door_schedule", "s", null, bytes, null, 1, 1, envFor(bytes));
    assert.equal(result.error, "no_schedule_table_found");
    assert.match(result.detail, /Its text was read as printed/);
    assert.equal(result.metadata.read_source, "text_layer");
  }
});
test("F4: actual read-pages route does not send the 30-word vector page to Browser Rendering", async () => {
  const bytes = await notes(30), env = envFor(bytes), router = new NativeRouter();
  registerHardwareSchedulePageExtractRoutes(router, { authenticate: async () => ({ user: { userId: "u" } }) });
  const response = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s/read-pages", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages: [{ page: 1, type: "door_schedule" }] }),
  }), env, {});
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.results[0].code, "no_schedule_table_found");
  assert.match(result.results[0].error, /Its text was read as printed/);
});
test("F4: an empty text layer remains eligible for OCR", async () => {
  assert.equal(await readPageFromTextLayer(await notes(0), 1, "door_schedule"), null);
});
