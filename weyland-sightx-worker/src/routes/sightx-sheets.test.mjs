// g068: the sheet routes over the three placement records built into data/sheets.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { NativeRouter } from "../lib/router.js";
import { registerSightXSheetRoutes } from "./sightx-sheets.js";
import { SHEET_SETS } from "../data/sheets/records.js";

const png = (sha, page) => fs.readFileSync(new URL("../../assets/sheets/" + sha + "-p" + page + ".bin", import.meta.url));
function app() {
  const images = {};
  for (const [sha, rec] of Object.entries(SHEET_SETS)) for (const s of rec.sheets) images[sha + "/" + s.page] = png(sha, s.page);
  const router = new NativeRouter();
  registerSightXSheetRoutes(router, { images });
  return (path) => router.handle(new Request("https://weylandai.com" + path), {}, {});
}

test("T2507, R2502 and T2421 open with every placed tag and their placed-of-total", async () => {
  const get = app();
  const want = { "192a16af8f31ae0c": [49, 49, ["A-100", "A-101", "A-104"]], "7478006f7fd5b43c": [208, 211, ["A-105", "A-106", "A-107", "A-112"]], "15b85ca679307cc1": [33, 33, ["A-100", "A-110"]] };
  for (const [sha, [placed, total, sheets]] of Object.entries(want)) {
    const r = await get("/api/sightx/sheets/" + sha);
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.success, true);
    assert.deepEqual([d.summary.marks_placed, d.summary.marks_total, d.tags.length], [placed, total, placed]);
    assert.deepEqual(d.sheets.map((s) => s.sheet), sheets);
    // every tag sits on one of the set's sheets, inside that sheet's PDF-point box
    for (const t of d.tags) {
      const s = d.sheets.find((x) => x.page === t.page);
      assert.ok(s, t.mark + " on a listed sheet");
      assert.ok(t.x >= 0 && t.x <= s.width && t.y >= 0 && t.y <= s.height, t.mark + " inside " + s.sheet);
      assert.ok(t.schedule_rows.length >= 1, t.mark + " carries its schedule row");
    }
    assert.equal(d.sheets.reduce((n, s) => n + s.tags_placed, 0), placed);
  }
});

test("the card's data is the record's: T2507 131B in 131 EXCERCISE ROOM, 3'-0\" x 7'-0\" HM, schedule p.10; R2502 lists its 3 unplaced marks", async () => {
  const get = app();
  const t = (await (await get("/api/sightx/sheets/192a16af8f31ae0c")).json()).tags.find((x) => x.mark === "131B");
  assert.deepEqual([t.sheet, t.page, t.x, t.y, t.room, t.room_name, t.size, t.material, t.schedule_rows[0].page], ["A-100", 7, 1650, 474, "131", "EXCERCISE ROOM", "3'-0\" x 7'-0\"", "HM", 10]);
  const r = await (await get("/api/sightx/sheets/7478006f7fd5b43c")).json();
  assert.deepEqual(r.summary.unplaced.map((u) => u.mark), ["AD101", "PT101", "102"]);
});

test("sheet images are served as PNG at the page's own path; anything else is 404", async () => {
  const get = app();
  const r = await get("/api/sightx/sheets/192a16af8f31ae0c/p7.png");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "image/png");
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(b.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [3600, 2400]);
  assert.equal((await get("/api/sightx/sheets/192a16af8f31ae0c/p9.png")).status, 404);
  assert.equal((await get("/api/sightx/sheets/192a16af8f31ae0c/p7.jpg")).status, 404);
  assert.equal((await get("/api/sightx/sheets/0000000000000000")).status, 404);
});
