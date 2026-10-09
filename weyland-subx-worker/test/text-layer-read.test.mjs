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

test("an architect's correction typed as a FreeText annotation is read in its row (Berryessa A9.2 door 002, type B)", async () => {
  const { readFileSync } = await import("node:fs");
  const { readPageFromTextLayer } = await import("../src/lib/text-layer-read.js");
  const b = readFileSync(new URL("../../tools/corpus/door-schedules/dd339f57b51538ed.pdf", import.meta.url));
  for (const page of [286, 288]) {
    const r = await readPageFromTextLayer(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), page, "door_schedule");
    const types = r.result.doors.map((d) => d.door_type);
    assert.ok(types.every((t) => t === "B"), "p" + page + " types " + types.join(","));
  }
});

test("Berryessa's staggered ROOM header retains all 24 audited locations", async () => {
  const bytes = readFileSync(join(CORPUS, "dd339f57b51538ed.pdf"));
  const expected = JSON.parse(readFileSync(join(CORPUS, "../expected/berryessa-a9.2-door-schedules.json")));
  for (const page of [284, 286, 288]) {
    const r = await readPageFromTextLayer(bytes, page, "door_schedule");
    for (const e of expected.doors.filter(d => d.page === page)) {
      const row = r.result.doors.find(d => d.door_number === e.mark);
      assert.ok(row, `p.${page} door ${e.mark}`);
      assert.equal(row.remarks, "Room: " + e.room, `p.${page} door ${e.mark}`);
    }
  }
});

test("a single-item Rockford group learns its columns from the header, not indented notes", async () => {
  const bytes = readFileSync(join(CORPUS, "a03cdcca2934ca5a.pdf"));
  const r = await readPageFromTextLayer(bytes, 17, "hardware_schedule");
  const g = r.result.hardware_groups.find(g => g.group_number === "03");
  assert.equal(g.components.length, 1);
  const c = g.components[0];
  assert.deepEqual([c.description, c.catalog_number, c.finish, c.manufacturer_code], ["CLASSROOM LOCK", "ALX70P6 RHO", "626", "SCH"]);
});
