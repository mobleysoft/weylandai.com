import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSightXModelRoutes } from "./sightx-model.js";
import { parseSchedule, modelFromSubx, sampleModel, parseSize, itemType, ratingOf } from "../lib/schedule-model.js";

test("sizes, ratings and hardware kinds are read as the trade writes them", () => {
  assert.deepEqual(parseSize("3070"), { w: 36, h: 84 });
  assert.deepEqual(parseSize(`3'-0" x 7'-0"`), { w: 36, h: 84 });
  assert.deepEqual(parseSize("PR 6080"), { w: 72, h: 96 });
  assert.deepEqual(parseSize("36 x 84"), { w: 36, h: 84 });
  assert.equal(parseSize("HW-1"), null);
  assert.equal(ratingOf("90 MIN"), "90 min");
  assert.equal(ratingOf("1-1/2 HR"), "1.5 hr");
  assert.equal(itemType("LCN 4040XP-EDA"), "closer");
  assert.equal(itemType("Von Duprin 98-NL-OP"), "exit");
  assert.equal(itemType("Securitron M62"), "maglock");
  assert.equal(itemType("Rockwood K1050"), "kick");
  assert.equal(itemType("Schlage ND70PD RHO 626"), "lockset");
});

test("one door per line, with set definitions", () => {
  const m = parseSchedule(`101 HM 3070 HW-1 90 MIN Corridor to Stair 1
102 WD 3070 HW-2 Office 102
103 PR HM 6070 HW-1 Lobby
HW-1: closer, exit device, kick plate
HW-2: lever lockset, 3 hinges, wall stop`);
  assert.equal(m.doors.length, 3);
  const [a, b, c] = m.doors;
  assert.deepEqual([a.mark, a.material, a.width_in, a.height_in, a.set, a.rating, a.size_known], ["101", "hollow metal", 36, 84, "1", "90 min", true]);
  assert.equal(a.location, "Corridor to Stair 1");
  assert.equal(b.material, "wood");
  assert.equal(c.leaves, 2);
  assert.deepEqual(m.sets["1"].map((x) => x.type), ["closer", "exit", "kick"]);
  assert.deepEqual(m.sets["2"].map((x) => x.type), ["lockset", "hinge", "stop"]);
  assert.deepEqual(m.notes, []);
});

test("a table pasted from a spreadsheet, header row first", () => {
  const m = parseSchedule(["Door No.\tLocation\tSize\tDoor Type\tFrame\tFire Rating\tHardware Set",
    "D-122\tStairwell 1\t3'-0\" x 7'-0\"\tHM\tHM\t90 MIN\tHW-02",
    "D-201\tExecutive Suite\t\tWood\tHM\t\tHW-05"].join("\n"));
  assert.equal(m.doors.length, 2);
  assert.deepEqual([m.doors[0].mark, m.doors[0].location, m.doors[0].rating, m.doors[0].set, m.doors[0].frame], ["D-122", "Stairwell 1", "90 min", "02", "HM"]);
  assert.equal(m.doors[1].size_known, false);
  assert.match(m.notes.join(" "), /1 door has no size/);
  assert.match(m.notes.join(" "), /No hardware listed for sets 02, 05/);
});

test("a SubX session becomes the same model, sizes and parts from the read schedule", () => {
  const m = modelFromSubx({
    session: { project_name: "Berryessa ES" },
    doors: [{ mark: "100A", hardware_group: "3", fire_rating: "45 MIN", width_inches: 36, height_inches: 84, door_type: "F", door_material: "WD", frame_material: "HM", panic: null, page_number: 4 }],
    components: [{ set_number: "3", component_type: "CLOSER", quantity: 1, manufacturer: "LCN", model: "4040XP", catalog_number: "4040XP-RW/PA", finish: "689", description: "Closer" }],
  });
  assert.equal(m.project, "Berryessa ES");
  assert.deepEqual([m.doors[0].mark, m.doors[0].material, m.doors[0].rating, m.doors[0].set, m.doors[0].source_page], ["100A", "wood", "45 min", "3", 4]);
  assert.deepEqual(m.sets["3"][0], { type: "closer", qty: 1, label: "Closer · LCN · 4040XP", manufacturer: "LCN", catalog: "4040XP-RW/PA", finish: "689" });
});

test("the sample is SubX's demo sheet, sizes marked as not given", () => {
  const m = sampleModel();
  assert.equal(m.doors.length, 10);
  assert.ok(m.doors.every((d) => !d.size_known));
  assert.deepEqual(m.sets["HW-01"].map((x) => x.type), ["exit", "closer"]);
  assert.deepEqual(m.sets["HW-07"].map((x) => x.type), ["lockset", "maglock"]);
  assert.deepEqual(m.sets["HW-02"].map((x) => x.type), ["exit", "closer"]);
  assert.deepEqual(m.sets["HW-08"].map((x) => x.type), ["lockset", "kick"]);
  assert.deepEqual(m.sets["HW-09"].map((x) => x.type), ["exit", "seal"]);
  assert.equal(m.doors.find((d) => d.mark === "D-101").material, "aluminum");
});

test("routes: sample, paste, SubX, and an unreadable paste", async () => {
  const router = new NativeRouter();
  registerSightXModelRoutes(router);
  const call = (path, body) => router.handle(new Request("https://weylandai.com" + path, body ? { method: "POST", body: JSON.stringify(body) } : {}), {}, {});
  assert.equal((await (await call("/api/sightx/sample")).json()).model.doors.length, 10);
  const p = await (await call("/api/sightx/model", { text: "101 HM 3070 HW-1" })).json();
  assert.equal(p.model.doors[0].mark, "101");
  const s = await (await call("/api/sightx/model", { subx: { doors: [{ mark: "1" }], components: [] } })).json();
  assert.equal(s.model.doors[0].mark, "1");
  assert.equal((await call("/api/sightx/model", { text: "hello world" })).status, 422);
  assert.equal((await call("/api/sightx/model", {})).status, 400);
});

test("page: /sightx is the schedule app; the homepage backdrop keeps the world page", async () => {
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../pages/sightx-app.html", import.meta.url), "utf8");
  assert.ok(app.includes("/api/sightx/model") && app.includes("/api/hardware-schedule/session/") && app.includes("/api/sightx/sample"));
  assert.ok(!/CHRONO|PRECONDENSATE|SEED VESSEL|FILMLINE|MobCorp/i.test(app), "no off-topic content in the product page");
  const index = readFileSync(new URL("../index.js", import.meta.url), "utf8");
  assert.match(index, /searchParams\.get\("embed"\) === "bg"/);
});

test("a SubX session whose doors name set 2 draws group 02's hardware (Berryessa)", () => {
  const m = modelFromSubx({ doors: [{ mark: "001", hardware_group: "2", width_inches: 42, height_inches: 94 }], components: [{ set_number: "02", component_type: "exit_device", description: "EXIT DEVICE", manufacturer: "Von Duprin", model: "99" }] });
  assert.equal(m.doors[0].set, "2");
  assert.equal((m.sets["2"] || []).length, 1);
});

// S1 (2026-10-09): a SubX session laid out on its floor plan.
import { attachPlan as attachPlanS1, modelFromSubx as fromSubxS1 } from "../lib/schedule-model.js";
test("attachPlan: each tagged door at its tag, in its room, in feet; untagged doors listed; no plan says schematic", () => {
  const m = fromSubxS1({ session: { project_name: "Rockford" }, doors: [
    { mark: "131.1", page_number: 29, hardware_group: "6 CL", width_inches: 36, height_inches: 94 },
    { mark: "126.1.2", page_number: 29, hardware_group: "6 CL" },
  ] });
  const plan = { found: true, plan_sheets: [{ page: 26, sheet: "A1.1", title: "1ST FLOOR PLAN", scales: ["SCALE: 3/32\" 1'-0\""], points_per_foot: [6.75] }],
    rooms: [{ page: 26, sheet: "A1.1", number: "131", name: "FLEX RM", x: 1260, y: 990, corridor: false, points_per_foot: 6.75 }, { page: 26, sheet: "A1.1", number: "126", name: "CORR", x: 1100, y: 900, corridor: true, points_per_foot: 6.75 }],
    tags: [{ mark: "131.1", page: 26, sheet: "A1.1", x: 1316, y: 1128, h: 10.5, door_pages: [29], room: "131", room_name: "FLEX RM", room_by: "tag_number", points_per_foot: 6.75 }],
    unmatched_tags: [] };
  const out = attachPlanS1(JSON.parse(JSON.stringify(m)), plan);
  assert.equal(out.layout.source, "plan");
  const d = out.doors.find((x) => x.mark === "131.1");
  assert.equal(d.plan.room, "131");
  assert.equal(d.plan.room_name, "FLEX RM");
  assert.equal(d.plan.sheet, "A1.1");
  assert.equal(d.plan.x, Math.round((1316 - 1100) / 6.75 * 100) / 100, "feet from the building's west edge at 3/32\"");
  assert.deepEqual(out.layout.not_on_plan, ["126.1.2"]);
  assert.match(out.layout.note, /126\.1\.2/);
  assert.equal(out.layout.buildings[0].to_scale, true);
  const none = attachPlanS1(JSON.parse(JSON.stringify(m)), { found: false, reason: "no plan sheet." });
  assert.equal(none.layout.source, "schematic");
  assert.match(none.layout.note, /^Schematic layout from the schedule/);
});

// g028: the three harvested real sets, served for /sightx/?set=<sha16>.
import { SETS as G028_SETS } from "../data/sets/index.js";
test("g028 sets: every door comes from a schedule row; every row is a door or listed with its reason", () => {
  for (const [sha, m] of Object.entries(G028_SETS)) {
    assert.equal(m.set.sha16, sha);
    // A room-and-letter mark (T2507: 132A) is printed as the room number, then the letter in its own column.
    const rowOf = (d) => { if (d.row.text.startsWith(d.mark)) return true; const m = /^(\d+)([A-Z])$/.exec(d.mark); return !!m && d.row.text.startsWith(m[1] + " ") && d.row.text.split(" ").includes(m[2]); };
    assert.ok(m.doors.length > 0 && m.doors.every((d) => d.row && d.row.text && rowOf(d)), sha + ": each door carries the row it came from");
    assert.equal(m.doors.length + m.set.not_door_rows.length, m.set.rows, sha + ": rows = door rows + rows that are not doors");
    assert.ok(m.set.not_door_rows.every((r) => r.reason), sha + ": a row that is not a door says why");
    // g035: a set with no readable plan says why and claims no tag; one with a plan places its doors on it.
    if (m.set.no_plan_reason) {
      assert.equal(m.layout.source, "schematic", sha);
      assert.equal(m.doors.filter((d) => d.plan).length, 0, sha + ": no tag claimed without a plan");
      assert.ok(m.notes.some((n) => n.includes(m.set.no_plan_reason)), sha + ": the notes say why");
    } else {
      assert.equal(m.layout.source, "plan", sha);
      assert.ok(m.set.doors_on_plan > 0, sha);
    }
  }
  assert.equal(Object.keys(G028_SETS).length, 10, "g035: all ten harvested sets");
  // g045: T2507 is read the production way (reader A, 49 rows) and placed with the g044 shared-mark rule.
  const t2507 = G028_SETS["192a16af8f31ae0c"];
  assert.equal(t2507.doors.length, 49);
  assert.equal(t2507.doors.filter((d) => d.plan).length, 49);
  const shared = t2507.doors.filter((d) => d.plan && d.plan.shared_mark);
  assert.deepEqual(shared.map((d) => d.mark), ["132A", "132A"]);
  assert.ok(shared.every((d) => d.plan.note === "shared mark, order assumed"));
  assert.notDeepEqual([shared[0].plan.x, shared[0].plan.z], [shared[1].plan.x, shared[1].plan.z]);
  assert.deepEqual(t2507.set.shared_marks.map((x) => [x.mark, x.rows, x.tags, x.placed]), [["132A", 2, 2, true]]);
  assert.equal(G028_SETS["7478006f7fd5b43c"].doors.length, 152, "R2502: no 120-door cap");
  assert.deepEqual(Object.values(G028_SETS).filter((m) => m.set.no_plan_reason).map((m) => m.set.sha16).sort(), ["977cec6301f40433", "f97e99f88a931e74"]);
});
test("g028 route: GET /api/sightx/sets/:sha16 answers the set and 404s an unknown one", async () => {
  const router = new NativeRouter();
  registerSightXModelRoutes(router);
  const ok = await router.handle(new Request("https://x/api/sightx/sets/e3d0cc1bc22fd824"), {}, {});
  const body = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(body.model.set.sha16, "e3d0cc1bc22fd824");
  const no = await router.handle(new Request("https://x/api/sightx/sets/0000000000000000"), {}, {});
  assert.equal(no.status, 404);
});

// g044: two schedule rows share mark 132A and the plan tags it twice (readPlan's shared_mark): each
// door stands at its own tag, flagged; a row with no tag left stays off the plan.
import { modelFromSubx as g044Model, attachPlan as g044Attach } from "../lib/schedule-model.js";
test("g044: rows sharing a mark take their own tags in order, never one position for two doors", () => {
  const shared = { rows: 2, tags: 2, order: "assumed" };
  const tag = (mark, x, y, extra = {}) => ({ mark, page: 7, sheet: "A-100", x, y, h: 8, door_pages: [10], points_per_foot: 9, room: "132", ...extra });
  const plan = { found: true, plan_sheets: [{ page: 7, sheet: "A-100", title: "FIRST FLOOR PLAN" }], rooms: [],
    tags: [tag("132A", 1259, 555, { shared_mark: shared, note: "shared mark, order assumed" }), tag("132A", 1223, 967, { shared_mark: shared, note: "shared mark, order assumed" }), tag("132B", 1300, 700)] };
  const doors = ["132A", "132A", "132B"].map((mark) => ({ mark, page_number: 10, width_inches: 36, height_inches: 84 }));
  const m = g044Model({ session: { project_name: "T2507" }, doors, components: [] });
  g044Attach(m, plan);
  const [a1, a2, b] = m.doors;
  assert.ok(a1.plan && a2.plan && b.plan);
  assert.notDeepEqual([a1.plan.x, a1.plan.z], [a2.plan.x, a2.plan.z], "two 132A doors, two positions");
  assert.equal(a1.plan.note, "shared mark, order assumed");
  assert.equal(b.plan.note, undefined);
  const three = g044Model({ session: { project_name: "T2507" }, doors: [...doors, { mark: "132A", page_number: 10 }], components: [] });
  g044Attach(three, plan);
  assert.equal(three.doors.filter((d) => d.mark === "132A" && d.plan).length, 2, "a third 132A row gets no invented position");
});
