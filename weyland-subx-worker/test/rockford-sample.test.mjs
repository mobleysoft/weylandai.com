import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { buildRockfordSample } from "../../tools/samples/build-rockford-sample.mjs";
import { openTextLayerDoc } from "../src/lib/text-layer-read.js";

test("the real Rockford sample labels all five pages and traces all 65 door rows", async () => {
  const { bytes, evidence } = await buildRockfordSample();
  const metadata = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(metadata.getProducer(), "WeylandAI SubX (sovereign-pdf + pdf-lib)");
  const doc = await openTextLayerDoc(bytes);
  try {
    assert.equal(doc.numPages, 5);
    const texts = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const items = (await page.getTextContent()).items;
      const text = items.map(i => i.str).join(" ");
      assert.match(text, /SAMPLE - SCHEDULE ONLY - NOT FOR CONSTRUCTION/, "page " + p);
      const label = items.find(i => i.str === "SAMPLE - SCHEDULE ONLY - NOT FOR CONSTRUCTION");
      const crop = metadata.getPage(p - 1).getCropBox();
      assert.ok(label.transform[4] >= crop.x && label.transform[4] + label.width <= crop.x + crop.width, "label inside horizontal crop, page " + p);
      assert.ok(label.transform[5] >= crop.y && label.transform[5] + label.height <= crop.y + crop.height, "label inside vertical crop, page " + p);
      texts.push(text);
    }
    assert.match(texts[0], /Rockford A2.2 \(schedule only\)/);
    assert.match(texts[1], /Door Schedule \(extracted\) - 65 doors/);
    const schedule = texts.slice(2, 4).join(" ");
    for (const door of evidence.doors) {
      // Split into the actual table rows so a mark cannot pass because it
      // appears in another row's notes or in the original source appendix.
      const rows = schedule.split(/p\.1 row (\d+)/);
      const traceAt = rows.findIndex((v, i) => i % 2 === 1 && v === String(door.row));
      assert.ok(traceAt > 0, door.mark + " source row " + door.row);
      assert.ok(rows[traceAt - 1].split(/\s+/).includes(door.mark), door.mark + " next to its source trace");
    }
    assert.equal((schedule.match(/p\.1 row \d+/g) || []).length, 65);
    assert.match(texts[4], /DOOR SCHEDULE/);
  } finally {
    await doc.destroy?.();
  }
});
