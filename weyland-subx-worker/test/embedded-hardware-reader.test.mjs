import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { createEmbeddedHardwareReader, readEmbeddedHardwarePage } from "../src/lib/embedded-hardware-reader.js";
import { readPageFromTextLayer } from "../src/lib/text-layer-read.js";

const corpus = new URL("../../tools/corpus/", import.meta.url);
const rockford = readFileSync(new URL("door-schedules/f0e863d88ea688ff.pdf", corpus));
const rockfordPages = (await PDFDocument.load(rockford)).getPageCount();
const truth = JSON.parse(readFileSync(new URL("expected/rockford-087100-hardware-groups.json", corpus)));
const forbidden = () => assert.fail("sessionless reader must not call a model or write to storage");
const noServices = { DB: { prepare: forbidden }, CACHE: { get: forbidden, put: forbidden, delete: forbidden },
  OCR_SERVICE: { fetch: forbidden }, QWEN: { fetch: forbidden }, JITAGI: { fetch: forbidden } };
const typed = (code, status, retryable) => error => {
  assert.equal(error.name, "EmbeddedHardwareReadError");
  assert.equal(error.code, code); assert.equal(error.status, status); assert.equal(error.retryable, retryable);
  return true;
};
async function pageFixture(text = "") {
  const pdf = await PDFDocument.create(), page = pdf.addPage();
  if (text) page.drawText(text);
  return pdf.save();
}

test("real Rockford hardware reads work without browser/OCR/model/storage bindings and preserve measured cells", async () => {
  const before = await readPageFromTextLayer(rockford, 17, "hardware_schedule");
  const original = structuredClone(before);
  const read = createEmbeddedHardwareReader({ readText: async () => before, readBrowser: forbidden });
  const result = await read(rockford, 17, rockfordPages, noServices);
  assert.deepEqual(before, original, "compatibility parser cannot mutate the original reader output");
  assert.equal(result.page_number, 17); assert.equal(result.total_pages, rockfordPages);
  assert.equal(result.metadata.read_source, "text_layer");
  assert.equal(result.metadata.extraction_route, "text_layer_server");
  assert.deepEqual(result.usage, { input_tokens: 0, output_tokens: 0 });
  assert.ok(Number.isFinite(result.extraction_time_ms)); assert.ok(Number.isFinite(result.total_time_ms));
  const expected = truth.groups.filter(g => g.page === 17);
  assert.equal(result.hardware_groups.length, expected.length);
  for (const e of expected) {
    const g = result.hardware_groups.find(g => g.group_number === e.group);
    assert.ok(g); assert.equal(g.set_number, e.group); assert.deepEqual(g.assigned_doors, e.doors);
    assert.equal(g.components.length, e.items.length);
    for (const item of e.items) {
      const c = g.components.find(c => c.catalog_number === item.catalog);
      assert.ok(c, item.catalog); assert.equal(c.description, item.description);
      assert.equal(c.quantity_printed, item.qty); assert.equal(c.finish, item.finish);
      assert.equal(c.manufacturer_code, item.mfr); assert.equal(c.read_from, "text_layer");
      const raw = before.result.hardware_groups.find(x => x.group_number === e.group).components.find(x => x.catalog_number === item.catalog);
      assert.deepEqual(c.field_confidence, raw.field_confidence);
      assert.deepEqual(c.field_evidence, raw.field_evidence);
    }
  }
});

test("production defaults read all real Rockford pages without model services", async () => {
  let groups = 0, items = 0;
  for (let page = 17; page <= 23; page++) {
    const result = await readEmbeddedHardwarePage(rockford, page, rockfordPages, noServices);
    groups += result.hardware_groups.length;
    items += result.hardware_groups.reduce((n, g) => n + g.components.length, 0);
  }
  assert.equal(groups, 14); assert.equal(items, 110);
});

test("real text notes are terminal no-schedule results and never launch OCR", async () => {
  const bytes = await pageFixture("GENERAL NOTES: review the architectural sheets.");
  const read = createEmbeddedHardwareReader({ readBrowser: forbidden });
  await assert.rejects(read(bytes, 1, 1, { ...noServices, BROWSER: {} }), typed("NO_HARDWARE_SCHEDULE", 422, false));
});

test("a real blank PDF requires a browser, with no OCR-worker or Qwen fallback", async () => {
  await assert.rejects(readEmbeddedHardwarePage(await pageFixture(), 1, 1, noServices), typed("HARDWARE_BROWSER_UNAVAILABLE", 503, true));
});

test("partial browser reads are rejected before a caller can treat them as complete", async () => {
  const bytes = await pageFixture();
  const observedGroups = (await readPageFromTextLayer(rockford, 17, "hardware_schedule")).result.hardware_groups;
  for (const result of [{ partial: true }, { metadata: { partial: true } }, { done: false }]) {
    let calls = 0;
    const read = createEmbeddedHardwareReader({ readBrowser: async (_env, input, page, type) => {
      calls++; assert.equal(input, bytes); assert.equal(page, 1); assert.equal(type, "hardware_schedule");
      return { ok: true, result: { ...result, hardware_groups: observedGroups } };
    } });
    await assert.rejects(read(bytes, 1, 1, { ...noServices, BROWSER: {} }), error => {
      typed("PARTIAL_HARDWARE_READ", 422, true)(error); assert.equal(error.partial, true);
      assert.equal(error.groups_seen, observedGroups.length); return true;
    });
    assert.equal(calls, 1);
  }
});

test("failed, empty and oversized browser outcomes retain typed failures and omit raw PDF diagnostics", async () => {
  const bytes = await pageFixture();
  const cases = [
    [{ ok: false, error: "browser_launch_failed", detail: "PRIVATE PDF CONTENT" }, "HARDWARE_BROWSER_READ_FAILED", 503, true],
    [{ ok: false, error: "pdf_too_large_for_browser_runner" }, "HARDWARE_BROWSER_READ_FAILED", 422, false],
    [{ ok: true, empty: true, result: { hardware_groups: [] } }, "NO_HARDWARE_SCHEDULE", 422, false],
  ];
  for (const [answer, code, status, retryable] of cases) {
    const read = createEmbeddedHardwareReader({ readBrowser: async () => answer });
    await assert.rejects(read(bytes, 1, 1, { ...noServices, BROWSER: {} }), error => {
      typed(code, status, retryable)(error); assert.doesNotMatch(JSON.stringify(error) + error.message, /PRIVATE PDF CONTENT/); return true;
    });
  }
  const read = createEmbeddedHardwareReader({ readBrowser: async () => { throw new Error("PRIVATE PDF CONTENT"); } });
  await assert.rejects(read(bytes, 1, 1, { ...noServices, BROWSER: {} }), error => {
    typed("HARDWARE_BROWSER_READ_FAILED", 503, true)(error); assert.doesNotMatch(error.message, /PRIVATE PDF CONTENT/); return true;
  });
});

test("invalid input and unreadable real bytes fail before browser or persistence", async () => {
  const read = createEmbeddedHardwareReader({ readBrowser: forbidden });
  await assert.rejects(read(rockford, 0, rockfordPages, noServices), typed("INVALID_HARDWARE_PAGE", 400, false));
  await assert.rejects(read(new Uint8Array([1, 2, 3]), 1, 1, noServices), typed("HARDWARE_TEXT_READ_FAILED", 422, false));
});
