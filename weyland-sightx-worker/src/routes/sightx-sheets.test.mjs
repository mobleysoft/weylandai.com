// g068/g074: the sheet routes. The public set is the WeylandAI Building only; a SubX upload's openings come
// from what the page sends (doors + readPlan's plan); no harvested set is served.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { NativeRouter } from "../lib/router.js";
import { registerSightXSheetRoutes } from "./sightx-sheets.js";
import { SHEET_SETS } from "../data/sheets/records.js";
import { openingsFromSession, openingsCsv, ftin } from "../lib/openings.js";

const BUILDING = "4847b09e633103f7";
const PDF = fs.readFileSync(new URL("../../assets/building/" + BUILDING + ".pdf.bin", import.meta.url));
const TRUTH = JSON.parse(fs.readFileSync(new URL("../../../tools/bidset/out/truth-doors.json", import.meta.url), "utf8"));
function app() {
  const router = new NativeRouter();
  registerSightXSheetRoutes(router, { pdfs: { [BUILDING]: PDF } });
  return (path, init) => router.handle(new Request("https://weylandai.com" + path, init), {}, {});
}

test("only the WeylandAI Building is in the public bundle; harvested sets are not served", async () => {
  assert.deepEqual(Object.keys(SHEET_SETS), [BUILDING]);
  assert.deepEqual(fs.readdirSync(new URL("../../assets/building/", import.meta.url)), [BUILDING + ".pdf.bin"]);
  assert.equal(fs.existsSync(new URL("../../assets/sheets/", import.meta.url)), false);
  const get = app();
  for (const sha of ["192a16af8f31ae0c", "7478006f7fd5b43c", "15b85ca679307cc1"]) {
    assert.equal((await get("/api/sightx/sheets/" + sha)).status, 404);
    assert.equal((await get("/api/sightx/sheets/" + sha + "/set.pdf")).status, 404);
  }
});

test("the Building opens with 48 of 48 placed on A-101, every tag inside the sheet, each card matching the drawn schedule", async () => {
  const d = await (await app()("/api/sightx/sheets/" + BUILDING)).json();
  assert.equal(d.success, true);
  assert.deepEqual([d.summary.placed, d.summary.total, d.openings.length], [48, 48, 48]);
  assert.deepEqual(d.sheets.map((s) => [s.sheet, s.page, s.width, s.height]), [["A-101", 2, 2592, 1728]]);
  const truth = new Map(TRUTH.doors.map((t) => [t.mark, t]));
  for (const o of d.openings) {
    assert.ok(o.tag && o.tag.x >= 0 && o.tag.x <= 2592 && o.tag.y >= 0 && o.tag.y <= 1728, o.mark);
    const t = truth.get(o.mark);
    assert.ok(t, o.mark + " is a schedule mark");
    assert.deepEqual([o.room, o.width_inches, o.height_inches, o.hardware_group, o.schedule.page], [t.room, t.width_inches, t.height_inches, t.hardware_group, 3], o.mark);
  }
  assert.equal(d.csv.split("\r\n")[0], "mark,room,size,width_in,height_in,pair,hardware_group,fire_rating,door_type,frame_type,schedule_page,schedule_row,plan_sheet,plan_page,tag_x_pt,tag_y_pt,placed");
  assert.equal(d.csv.trim().split("\r\n").length, 49);
});

test("the Building's own PDF is served, byte for byte", async () => {
  const r = await app()("/api/sightx/sheets/" + BUILDING + "/set.pdf");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/pdf");
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(crypto.createHash("sha256").update(b).digest("hex").slice(0, 16), BUILDING);
  assert.equal((await app()("/api/sightx/sheets/" + BUILDING + "/p2.png")).status, 404);
});

test("a SubX upload: one opening per door row, tags joined by mark in order, leftovers unplaced, CSV escaped", async () => {
  const doors = [
    { mark: "101", notes: "Room: OFFICE, \"A\"", width_inches: 36, height_inches: 84, hardware_group: "02", page_number: 3, source: { page: 3, table_row: 1 }, pair: false },
    { mark: "102A", notes: null, width_inches: 72, height_inches: 84, hardware_group: "01", page_number: 3, source: { page: 3, table_row: 2 }, pair: true },
    { mark: "102A", width_inches: 72, height_inches: 84, hardware_group: "01", page_number: 3, source: { page: 3, table_row: 3 } },
    { mark: "001 [p.4]", width_inches: 30, height_inches: 80, page_number: 4, source: { page: 4, table_row: 1 } },
    { mark: "103", width_inches: 36, height_inches: 84, page_number: 3 },
  ];
  const plan = { plan_sheets: [{ page: 2, sheet: "A-101", title: "FLOOR PLAN" }], tags: [
    { mark: "102A", page: 2, sheet: "A-101", x: 500, y: 300, h: 11, room_name: "LOBBY" },
    { mark: "101", page: 2, sheet: "A-101", x: 400.123, y: 200, h: 11 },
    { mark: "001 [p.4]", page: 2, sheet: "A-101", x: 10, y: 20, h: 9 },
  ] };
  const r = await app()("/api/sightx/openings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doors, plan }) });
  const d = await r.json();
  assert.equal(d.success, true);
  assert.deepEqual(d.summary, { total: 5, placed: 3, unplaced: ["102A", "103"] });
  assert.deepEqual(d.openings.map((o) => [o.mark, o.tag && o.tag.x, o.schedule.row, o.size]), [["101", 400.12, 1, "3'-0\" x 7'-0\""], ["102A", 500, 2, "6'-0\" x 7'-0\""], ["102A", null, 3, "6'-0\" x 7'-0\""], ["001 [p.4]", 10, 1, "2'-6\" x 6'-8\""], ["103", null, null, "3'-0\" x 7'-0\""]]);
  assert.equal(d.openings[0].room, "OFFICE, \"A\"");
  const lines = d.csv.trim().split("\r\n");
  assert.equal(lines[1], `101,"OFFICE, ""A""","3'-0"" x 7'-0""",36,84,no,02,,,,3,1,A-101,2,400.12,200,yes`);
  assert.equal(lines[2].split(",")[5], "yes");
  assert.equal(lines[5].endsWith(",no"), true);
  assert.equal(ftin(80), "6'-8\"");
  assert.equal((await app()("/api/sightx/openings", { method: "POST", body: "{}" })).status, 400);
  assert.equal(openingsCsv(openingsFromSession([], null).openings).trim().split("\r\n").length, 1);
});
