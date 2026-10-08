// The text-layer schedule reader (assets/client-ocr-src/schedule-text-layer.mjs)
// and the grid client's text-first entry points, checked two ways:
//   - small hand-built pages, one behaviour each;
//   - the real corpus pages the reader was built against (tools/corpus/
//     door-schedules), read through pdf.js exactly as the workspace reads
//     them, with values from tools/corpus/expected (read by eye).
// tools/accuracy/schedule_text_layer_accuracy.mjs scores every expected row;
// these pin the cases that broke before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { textItemsFromContent, readDoorScheduleText, readHardwareGroupsText, splitSizeCell } from "../assets/client-ocr-src/schedule-text-layer.mjs";
import { extractDoorScheduleFromPdf, extractHardwareScheduleFromPdf, findSchedulePages } from "../assets/client-ocr-src/schedule-grid-extraction-client.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const WORKER = join(here, "..");
const CORPUS = join(here, "../../tools/corpus/door-schedules");

// One text item as textItemsFromContent returns it (reading order, y down).
const at = (s, x0, y, size = 10) => ({ s, x0, x1: x0 + 0.55 * size * s.length, y, size });

test("a door schedule's rows and columns come from where its text sits", () => {
  const items = [
    at("DOOR SCHEDULE", 100, 70, 20),
    at("DOOR", 100, 90), at("WIDTH", 160, 98), at("HEIGHT", 220, 98), at("FIRE", 280, 90), at("RATING", 280, 98), at("HARDWARE", 340, 98), at("REMARKS", 420, 98),
    at("NO.", 100, 98),
    at("101", 100, 115), at("3'-0\"", 160, 115), at("7'-0\"", 220, 115), at("90 MIN.", 280, 115), at("01", 340, 115), at("NEW DOOR,", 420, 115),
    at("SEE NOTE 4", 420, 127),
    at("102A", 100, 140), at("3'-6\"", 160, 140), at("7'-0\"", 220, 140), at("02", 340, 140),
    at("103", 100, 155), at("6'-0\"", 160, 155), at("7'-0\"", 220, 155), at("02", 340, 155),
    // A plan note far to the right on the same baseline as row 102A is not a cell.
    at("ROOM 210", 900, 140),
    // Text under the table after a gap is not a row.
    at("GENERAL NOTES", 100, 230),
  ];
  const { rows, tables } = readDoorScheduleText(items);
  assert.equal(tables.length, 1);
  assert.deepEqual(rows.map((r) => r.mark), ["101", "102A", "103"]);
  assert.equal(rows[0].fire_rating, "90 MIN.");
  assert.equal(rows[0].hardware_group, "01");
  assert.equal(rows[0].notes, "NEW DOOR, SEE NOTE 4");
  assert.equal(rows[1].width, "3'-6\"");
  assert.equal(rows[1].fire_rating, undefined);
  assert.ok(!Object.values(rows[1]).includes("ROOM 210"));
});

test("a column of repeated codes is not taken for door marks", () => {
  // Hardware group "2" repeats on every row; the marks are the unique column.
  const items = [at("TAG", 100, 98), at("TYPE", 160, 98), at("GROUP", 220, 98)];
  ["001", "002", "003", "004"].forEach((m, i) => items.push(at(m, 100, 115 + 15 * i), at("A", 160, 115 + 15 * i), at("2", 220, 115 + 15 * i)));
  const { rows } = readDoorScheduleText(items);
  assert.deepEqual(rows.map((r) => [r.mark, r.hardware_group]), [["001", "2"], ["002", "2"], ["003", "2"], ["004", "2"]]);
});

test("a window or storefront schedule is not read as doors", () => {
  const items = [at("STOREFRONT SCHEDULE", 100, 70, 20), at("WINDOW NUMBER", 100, 98), at("TYPE", 200, 98), at("FRAME FINISH", 260, 98)];
  ["126.1.A", "126.A", "128.1.A"].forEach((m, i) => items.push(at(m, 100, 115 + 15 * i), at("SF-IN05", 200, 115 + 15 * i), at("P6", 260, 115 + 15 * i)));
  assert.equal(readDoorScheduleText(items).rows.length, 0);
});

test("a size printed as one cell splits into pair, width, height, thickness", () => {
  assert.deepEqual(splitSizeCell("PR 3'-6\" x 7'-10\" x 1-3/4\""), { pair: true, width: "3'-6\"", height: "7'-10\"", thickness: "1-3/4\"" });
  assert.deepEqual(splitSizeCell("3'-6\" x 7'-10 x 1-3/4\""), { pair: false, width: "3'-6\"", height: "7'-10", thickness: "1-3/4\"" });
  assert.deepEqual(splitSizeCell("36\" X 84\""), { pair: false, width: "36\"", height: "84\"", thickness: null });
});

test("hardware groups printed as spec text: headings, door lists, wrapped cells, struck values", () => {
  const cols = [72, 100, 140, 280, 440, 480];
  const line = (y, cells) => cells.map((c, i) => (c == null ? null : at(c, cols[i], y))).filter(Boolean);
  const items = [
    at("Hardware Group No. 06 CL", 68, 80),
    at("109.1", 72, 94), at("109.2", 150, 94), at("111.1", 228, 94),
    ...line(119, ["QTY", null, "DESCRIPTION", "CATALOG NUMBER", "FINISH", "MFR"]),
    ...line(132, ["1", "EA", "CONTINUOUS HINGE", "SL11 / SL24", "DBZ", "SEL"]),
    ...line(144, [null, null, null, null, "(628)", null]),
    ...line(157, ["1", "EA", "CLOSER, HOLD OPEN", "4040XP H / HEDA - AS", "689", "LCN"]),
    ...line(169, [null, null, null, "REQUIRED", null, null]),
    ...line(182, ["3", "EA", "SILENCER", "SR64", "GRY", "IVE"]),
    at("DOOR NORMALLY CLOSED AND LOCKED BY THE OWNER.", 68, 196),
    at("Hardware Group No. 07", 68, 240),
    ...line(265, ["2", "SET", "GASKETING", "429D-S", "D", "ZER"]),
  ];
  const { hardware_groups: g, door_hardware_matrix } = readHardwareGroupsText(items);
  assert.deepEqual(g.map((x) => x.group_number), ["06 CL", "07"]);
  assert.deepEqual(g[0].assigned_doors, ["109.1", "109.2", "111.1"]);
  assert.equal(door_hardware_matrix.length, 3);
  assert.deepEqual(g[0].components.map((c) => [c.quantity, c.component_type, c.model_number, c.finish, c.manufacturer]), [
    [1, "CONTINUOUS HINGE", "SL11 / SL24", "DBZ", "SEL"],
    [1, "CLOSER, HOLD OPEN", "4040XP H / HEDA - AS REQUIRED", "689", "LCN"],
    [3, "SILENCER", "SR64", "GRY", "IVE"],
  ]);
  assert.deepEqual([g[1].components[0].quantity, g[1].components[0].uom], [2, "SET"]);
});

test("a watermark at 45 degrees is dropped; a sideways sheet reads upright", () => {
  const viewport = { transform: [1, 0, 0, -1, 0, 792] };
  const item = (str, x, y, a = 0) => ({ str, width: 6 * str.length, transform: [10 * Math.cos(a), 10 * Math.sin(a), -10 * Math.sin(a), 10 * Math.cos(a), x, y] });
  const r = textItemsFromContent({ items: [item("101", 72, 700), item("3'-0\"", 120, 700), item("NOT FOR CONSTRUCTION", 200, 400, Math.PI / 4)] }, viewport);
  assert.deepEqual(r.items.map((i) => i.s), ["101", "3'-0\""]);
  assert.equal(r.dropped, 1);
  // Page /Rotate 270 (viewport turns the sheet): text still comes out left to right.
  const turned = textItemsFromContent({ items: [item("A", 100, 100), item("B", 100, 140)] }, { transform: [0, -1, -1, 0, 792, 612] });
  assert.ok(turned.items[0].x0 !== turned.items[1].x0 || turned.items[0].y !== turned.items[1].y);
  assert.equal(turned.items.length, 2);
});

// ---------------------------------------------------------------- corpus

const pdf = (name) => new Uint8Array(readFileSync(join(CORPUS, name))).buffer;
const opts = { pdfjs };

test("Rockford A2.2 (CAD sheet, 42x30): all 65 doors from the text layer", async () => {
  const r = await extractDoorScheduleFromPdf(pdf("f0e863d88ea688ff.pdf"), 29, null, opts);
  assert.equal(r.metadata.extraction_route, "text_layer");
  assert.equal(r.doors.length, 65);
  const d = Object.fromEntries(r.doors.map((x) => [x.door_number, x]));
  assert.deepEqual([d["1J.1"].hardware_group, d["1J.1"].width_inches, d["1J.1"].height_inches, d["1J.1"].door_type, d["1J.1"].fire_rating], ["44 UTY-IT", 36, 94, "F", null]);
  // The only rated door; its rating has no other value in its column.
  assert.equal(d["114.1"].fire_rating, "YES");
  // "51 UTY-CUS -" is one text piece across HARDWARE and GLAZING.
  assert.equal(d["147.1.1"].hardware_group, "51 UTY-CUS");
});

test("Rockford 08 71 00 p21: an addendum's struck values are not read", async () => {
  const r = await extractHardwareScheduleFromPdf(pdf("f0e863d88ea688ff.pdf"), 21, null, opts);
  assert.equal(r.metadata.extraction_route, "text_layer");
  const [g] = r.hardware_groups;
  assert.equal(g.group_number, "32 EXD");
  assert.deepEqual(g.assigned_doors, ["126.1.1", "152.1.1"]);
  assert.equal(g.components.length, 12);
  const sweep = g.components.find((c) => c.component_type === "DOOR SWEEP");
  assert.deepEqual([sweep.model_number, sweep.finish, sweep.manufacturer], ["39D", "D", "ZER"]);
  assert.equal(g.components.find((c) => c.model_number === "4040XP REG / 4040XP EDA - AS REQUIRED").component_type, "SURFACE CLOSER");
});

test("Berryessa A9.2 (printed sideways): sizes printed as one cell", async () => {
  const r = await extractDoorScheduleFromPdf(pdf("dd339f57b51538ed.pdf"), 284, null, opts);
  assert.equal(r.metadata.extraction_route, "text_layer");
  assert.equal(r.doors.length, 9);
  const d = Object.fromEntries(r.doors.map((x) => [x.door_number, x]));
  assert.deepEqual([d["001"].width_inches, d["001"].height_inches, d["001"].thickness_inches, d["001"].fire_rating, d["001"].hardware_group], [42, 94, 1.75, "120", "2"]);
  // 7'-10 printed without its inch mark.
  assert.equal(d["002"].height_inches, 94);
});

test("Berryessa 08 71 00: groups with no column header line", async () => {
  const r = await extractHardwareScheduleFromPdf(pdf("dd339f57b51538ed.pdf"), 282, null, opts);
  assert.deepEqual(r.hardware_groups.map((g) => [g.group_number, g.components.length]), [["01", 7], ["02", 9]]);
  const core = r.hardware_groups[0].components[3];
  assert.deepEqual([core.component_type, core.model_number, core.finish, core.manufacturer], ["INTERCHANGEABLE CORE", "VERIFY PERMANENT CORE WITH DISTRICT", "626", null]);
});

test("Christina set 01 (ruled, watermarked): 24 items, one printed without a quantity", async () => {
  const r = await extractHardwareScheduleFromPdf(pdf("525dc0b72011077a.pdf"), 219, null, opts);
  const [g] = r.hardware_groups;
  assert.deepEqual([g.group_number, g.group_name, g.assigned_doors], ["01", "CARD READER EXTERIOR BULLET RESTANT ALD & ALF", ["100B"]]);
  assert.equal(g.components.length, 24);
  const relay = g.components.find((c) => c.component_type === "RELAY MODULE");
  assert.deepEqual([relay.quantity, relay.model_number], [null, "ALTRONTICS RB1224 BY SECURITY VENDOR"]);
  assert.equal(g.components.find((c) => /^AUTO DOOR/.test(c.component_type)).model_number, "DORMA 100 SERIES BY SECURITY VENDOR");
});

test("findSchedulePages: the schedule pages of a whole bid set, with no page number given", async () => {
  const rockford = await findSchedulePages(pdf("f0e863d88ea688ff.pdf"), null, opts);
  assert.deepEqual(rockford.found.map((f) => [f.page, f.type]), [
    [17, "hardware_schedule"], [18, "hardware_schedule"], [19, "hardware_schedule"], [20, "hardware_schedule"],
    [21, "hardware_schedule"], [22, "hardware_schedule"], [23, "hardware_schedule"], [29, "door_schedule"],
  ]);
  assert.equal(rockford.found.at(-1).result.doors.length, 65);
  // A 537-page project manual: the five hardware pages, nothing else.
  const christina = await findSchedulePages(pdf("525dc0b72011077a.pdf"), null, opts);
  assert.deepEqual(christina.found.map((f) => f.page), [219, 220, 221, 222, 223]);
});

test("the served copies are the sources (the asset route serves the .bin files)", () => {
  for (const name of ["schedule-grid-extraction-client.mjs", "schedule-text-layer.mjs"]) {
    assert.ok(readFileSync(join(WORKER, "assets/client-ocr", name + ".bin")).equals(readFileSync(join(WORKER, "assets/client-ocr-src", name))), name + ".bin is stale: copy assets/client-ocr-src/" + name + " over it");
  }
});
