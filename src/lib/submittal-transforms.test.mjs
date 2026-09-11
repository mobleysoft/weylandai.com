import { test } from "node:test";
import assert from "node:assert/strict";
import {
  transformDoorEntriesToHardwareSets,
  materializeDseToLineItems,
  generateSubmittalHTML,
} from "./submittal-transforms.js";

// Real-behavior fake D1 - records every prepare()/bind()/run() call and
// answers .all() based on a SQL-substring match the test configures, so
// assertions are against real call sequences/args, not a mocking library.
function makeFakeDB(responses = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              calls.push({ sql, args, op: "all" });
              for (const [needle, result] of Object.entries(responses)) {
                if (sql.includes(needle)) return { results: result };
              }
              return { results: [] };
            },
            async run() {
              calls.push({ sql, args, op: "run" });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

test("transformDoorEntriesToHardwareSets: no entries returns zeroed result, no writes", async () => {
  const db = makeFakeDB({ "FROM door_schedule_entries": [] });
  const result = await transformDoorEntriesToHardwareSets("s1", "u1", { DB: db });
  assert.deepEqual(result, { setsCreated: 0, totalMarks: 0, groups: {} });
  assert.equal(db.calls.filter((c) => c.op === "run").length, 0, "no INSERT/UPDATE when there's nothing to process");
});

test("transformDoorEntriesToHardwareSets: blocks on duplicate marks within a session, writes nothing", async () => {
  const db = makeFakeDB({
    "FROM door_schedule_entries": [
      { mark: "101", hardware_group: "HW-1", fire_rating: null, page_number: 1 },
      { mark: "101", hardware_group: "HW-2", fire_rating: null, page_number: 2 },
    ],
  });
  const result = await transformDoorEntriesToHardwareSets("s1", "u1", { DB: db });
  assert.equal(result.blocked, true);
  assert.equal(result.reason, "duplicate_marks");
  assert.deepEqual(result.duplicates, [["101", 2]]);
  assert.equal(db.calls.filter((c) => c.op === "run").length, 0, "duplicate block happens before any write");
});

test("transformDoorEntriesToHardwareSets: real grouping + a new set gets inserted with real bind args", async () => {
  const db = makeFakeDB({
    "FROM door_schedule_entries": [
      { mark: "101", hardware_group: "HW-1", fire_rating: "90min", page_number: 3 },
      { mark: "102", hardware_group: "HW-1", fire_rating: "90min", page_number: 3 },
    ],
    "SELECT set_number FROM hardware_sets": [], // no pre-existing sets
    "FROM hardware_page_extractions": [], // no pre-existing bridge record
  });
  const result = await transformDoorEntriesToHardwareSets("s1", "u1", { DB: db });
  assert.equal(result.setsCreated, 1);
  assert.equal(result.totalMarks, 2);
  assert.deepEqual(result.groups["HW-1"], { door_count: 2, marks: ["101", "102"] });

  const insertSet = db.calls.find((c) => c.op === "run" && c.sql.includes("INSERT INTO hardware_sets"));
  assert.ok(insertSet, "a real INSERT INTO hardware_sets was issued");
  // bind order: id, sessionId, userId, submittal_id(null), set_number, set_name, door_count, page, approved_at, approved_by, bridge_id, notes, created_at, updated_at
  assert.equal(insertSet.args[1], "s1");
  assert.equal(insertSet.args[2], "u1");
  assert.equal(insertSet.args[4], "HW-1");
  assert.equal(insertSet.args[6], 2); // door_count
  assert.equal(insertSet.args[7], 3); // page
  assert.match(insertSet.args[11], /Marks: 101, 102/);
});

test("transformDoorEntriesToHardwareSets: existing set gets updated, not re-inserted", async () => {
  const db = makeFakeDB({
    "FROM door_schedule_entries": [
      { mark: "201", hardware_group: "HW-9", fire_rating: null, page_number: 1 },
    ],
    "SELECT set_number FROM hardware_sets": [{ set_number: "HW-9" }],
    "FROM hardware_page_extractions": [{ id: "bridge_s1" }], // bridge record already exists
  });
  const result = await transformDoorEntriesToHardwareSets("s1", "u1", { DB: db });
  assert.equal(result.setsCreated, 0, "existing set is updated, not counted as newly created");
  const update = db.calls.find((c) => c.op === "run" && c.sql.includes("UPDATE hardware_sets"));
  assert.ok(update, "a real UPDATE hardware_sets was issued for the existing set");
  const insert = db.calls.find((c) => c.op === "run" && c.sql.includes("INSERT INTO hardware_sets"));
  assert.equal(insert, undefined, "no duplicate INSERT for an already-existing set number");
  const bridgeInsert = db.calls.find((c) => c.op === "run" && c.sql.includes("INSERT INTO hardware_page_extractions"));
  assert.equal(bridgeInsert, undefined, "bridge record already existed, so it's not re-inserted");
});

test("materializeDseToLineItems: no entries returns zeroed result, no writes", async () => {
  const db = makeFakeDB({ "FROM door_schedule_entries": [] });
  const result = await materializeDseToLineItems("s1", { DB: db });
  assert.deepEqual(result, { doorsCreated: 0, framesCreated: 0, totalMarks: 0 });
  assert.equal(db.calls.filter((c) => c.op === "run").length, 0);
});

test("materializeDseToLineItems: real idempotent replay - deletes prior [auto:dse] rows before regenerating", async () => {
  const db = makeFakeDB({
    "FROM door_schedule_entries": [
      { mark: "101", hardware_group: "HW-1", width: 36, height: 84, door_type: "Wood", door_material: "Oak", frame_type: "HM", frame_material: "Steel", fire_rating: "90min", panic: 0, thickness: 1.75 },
    ],
  });
  await materializeDseToLineItems("s1", { DB: db });
  const del = db.calls.find((c) => c.op === "run" && c.sql.includes("DELETE FROM takeoff_line_items"));
  assert.ok(del, "a real DELETE of prior auto-generated rows happens before regenerating");
  assert.match(del.sql, /\[auto:dse\]/);
  assert.equal(del.args[0], "s1");
});

test("materializeDseToLineItems: groups doors and frames separately, real counts and descriptions", async () => {
  const db = makeFakeDB({
    "FROM door_schedule_entries": [
      { mark: "101", hardware_group: "HW-1", width: 36, height: 84, door_type: "Wood", door_material: "Oak", frame_type: "HM", frame_material: "Steel", fire_rating: "90min", panic: 0, thickness: 1.75 },
      { mark: "102", hardware_group: "HW-1", width: 36, height: 84, door_type: "Wood", door_material: "Oak", frame_type: "HM", frame_material: "Steel", fire_rating: "90min", panic: 0, thickness: 1.75 },
      { mark: "201", hardware_group: "HW-2", width: 32, height: 80, door_type: "Metal", door_material: null, frame_type: null, frame_material: null, fire_rating: null, panic: 0, thickness: 1.75 },
    ],
  });
  const result = await materializeDseToLineItems("s1", { DB: db });
  assert.equal(result.totalMarks, 3);
  assert.equal(result.doorsCreated, 2, "two distinct door groups: Wood/Oak/90min and Metal/null");
  assert.equal(result.framesCreated, 1, "only the first group has a real frame_type/frame_material");

  const doorInsert = db.calls.find((c) => c.op === "run" && c.sql.includes("'door'"));
  assert.match(doorInsert.args[3], /Wood Oak|Metal/);
  const frameInsert = db.calls.find((c) => c.op === "run" && c.sql.includes("'frame'"));
  assert.match(frameInsert.args[3], /HM Steel/);
  assert.match(frameInsert.args[8], /Marks: 101, 102/);
});

test("generateSubmittalHTML: real structural output - header, summary, sets, components, certifications, footer", () => {
  const submittal = {
    header: { title: "Door Hardware Submittal", project_name: "123 Main St", generated_at: "2026-09-11T00:00:00Z", session_id: "sess-42" },
    summary: { total_sets: 1, total_components: 2, pages_extracted: 3 },
    hardware_sets: [
      {
        set_number: "HW-1",
        description: "Entry Doors",
        function_type: "Storeroom",
        keying_system: "SKS",
        notes: "Verify with architect",
        components: [
          { type: "Hinge", quantity: 3, manufacturer: "Hager", model: "BB1279", description: "4.5x4.5", finish_code: "US26D", finish_description: "Satin Chrome" },
          { type: "Lockset", quantity: 1, manufacturer: "Schlage", model: null, description: "Mortise lock", finish_code: "", finish_description: "" },
        ],
      },
    ],
    certifications: {
      compliance_statement: "Meets ANSI/BHMA A156 series standards.",
      architect_approval: { label: "Architect Approval" },
      contractor_certification: { label: "Contractor Certification" },
    },
  };
  const html = generateSubmittalHTML(submittal);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /Door Hardware Submittal - 123 Main St/);
  assert.match(html, /1 Hardware Sets \| 2 Components \| 3 Pages Processed/);
  assert.match(html, /HW-1 - Entry Doors/);
  assert.match(html, /Storeroom/);
  assert.match(html, /Verify with architect/);
  assert.match(html, /Hager/);
  assert.match(html, /BB1279/);
  assert.match(html, /TBD/, "a real null model falls back to the TBD placeholder");
  assert.match(html, /Meets ANSI\/BHMA A156 series standards\./);
  assert.match(html, /Architect Approval/);
  assert.match(html, /Session: sess-42/);
});

test("generateSubmittalHTML: handles a set with no notes and empty component list without throwing", () => {
  const submittal = {
    header: { title: "T", project_name: "P", generated_at: "2026-09-11T00:00:00Z", session_id: "s" },
    summary: { total_sets: 1, total_components: 0, pages_extracted: 1 },
    hardware_sets: [{ set_number: "HW-1", components: [] }],
    certifications: {
      compliance_statement: "OK",
      architect_approval: { label: "A" },
      contractor_certification: { label: "C" },
    },
  };
  const html = generateSubmittalHTML(submittal);
  assert.match(html, /HW-1 - Hardware Set/, "falls back to the generic 'Hardware Set' label when description is missing");
  assert.doesNotMatch(html, /<strong>Notes:<\/strong>/, "no Notes line rendered when notes is absent");
});
