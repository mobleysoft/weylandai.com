// The server's text-layer page read (lib/text-layer-read.js), on the corpus PDFs (2026-10-09).
// Rockford's 08 71 00 pages died after 73 s in production waiting on a browser launch; read
// from their text they take well under a second each and give every group.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readPageFromTextLayer } from "../src/lib/text-layer-read.js";

const here = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(here, "..", "..", "tools/corpus/door-schedules");
const rockford = readFileSync(join(CORPUS, "f0e863d88ea688ff.pdf"));

test("Rockford 08 71 00 pages 17-23 read from their text: 14 groups, 110 items, each page under 2 s", async () => {
  let groups = 0, items = 0;
  for (let p = 17; p <= 23; p++) {
    const t = Date.now();
    const r = await readPageFromTextLayer(rockford, p, "hardware_schedule", { alsoTry: "door_schedule" });
    assert.ok(Date.now() - t < 2000, "p" + p + " took " + (Date.now() - t) + " ms");
    assert.equal(r.schedule_type, "hardware_schedule");
    assert.equal(r.source, "text_layer");
    groups += r.result.hardware_groups.length;
    items += r.result.hardware_groups.reduce((n, g) => n + g.components.length, 0);
  }
  assert.equal(groups, 14);
  assert.equal(items, 110);
});

test("Rockford A2.2 (p.29) asked as a door schedule: 65 doors from the text", async () => {
  const r = await readPageFromTextLayer(rockford, 29, "door_schedule", { alsoTry: "hardware_schedule" });
  assert.deepEqual([r.schedule_type, r.result.doors.length, r.result.metadata.extraction_route], ["door_schedule", 65, "text_layer_server"]);
});

test("a page with no text layer is left to the browser and OCR path (null)", async () => {
  assert.equal(await readPageFromTextLayer(rockford, 31, "door_schedule"), null);
});
