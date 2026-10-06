import { pdfFixture, PNG, embeddedEnv, withEmbeddedModel } from "../test-support/ocr-fixtures.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractHardwareSchedule,
  storeHardwareExtraction,
  getHardwareGroupForReview,
  updateHardwareGroup,
  queuePageExtractionJob,
  buildExtractionResultFromVision,
  extractWithImageMode,
  extractWithDirectPdfMode,
  extractFromPageImage,
  createExtractionSession,
  getSessionStatus,
  approvePageExtraction,
  resolveConstraints,
  resolveExtractionContract,
  extractDoorScheduleHGSE,
  routeExtraction,
  extractGenericSchedule,
  logConstraintExecution,
  resolveDoorScheduleConstraints,
  extractDoorSchedule,
  persistDoorScheduleResponse,
} from "./hardware-extraction-pipeline.js";

function makeFakeDb({ handlers = {}, runCalls = [] } = {}) {
  function pick(sql) {
    for (const [key, fn] of Object.entries(handlers)) {
      if (sql.includes(key)) return fn;
    }
    return null;
  }
  return {
    prepare(sql) {
      const bound = (...args) => ({
        async first() {
          const fn = pick(sql);
          return fn ? fn("first", args) : null;
        },
        async all() {
          const fn = pick(sql);
          const r = fn ? fn("all", args) : [];
          return { results: r || [] };
        },
        async run() {
          runCalls.push({ sql, args });
          const fn = pick(sql);
          if (fn) fn("run", args);
          return { meta: { changes: 1 } };
        },
      });
      return { bind: bound, ...bound() };
    },
  };
}

const originalFetch = globalThis.fetch;
function withMockFetch(impl, fn) {
  globalThis.fetch = impl;
  return fn().finally(() => { globalThis.fetch = originalFetch; });
}

test("extractHardwareSchedule: single PDF page uses existing OCR and in-ecosystem structuring", async () => {
 const pdf=await pdfFixture();const ocr=[],models=[];
 const result=await withEmbeddedModel({hardware_groups:[{group_number:"1",components:[{component_type:"LOCK",quantity:1,model_number:"L9050"}]}]},()=>extractHardwareSchedule(pdf,embeddedEnv(null,ocr)),models);
 assert.equal(result.hardware_groups.length,1);assert.equal(result.hardware_groups[0].components[0].model_number,"L9050");assert.equal(result.metadata.extraction_mode,"embedded_gofaineat");assert.equal(ocr.length,3);assert.equal(models.length,1);
});

test("storeHardwareExtraction: real happy path inserts a new hardware set and its components", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: { "SELECT approved_from_page": () => null },
    runCalls,
  });
  const extraction = {
    hardware_groups: [{
      group_number: "1A", components: [{ component_type: "LOCK", manufacturer: "Schlage", model: "L9080" }],
    }],
  };
  const result = await storeHardwareExtraction(extraction, { DB: db }, "u1", { sessionId: "s1", pageNumber: 1 });
  assert.equal(result.groups_inserted, 1);
  assert.equal(result.components_inserted, 1);
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT OR REPLACE INTO hardware_sets")));
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT OR REPLACE INTO hardware_components")));
});

test("storeHardwareExtraction: a multi-page merge updates the existing set instead of re-inserting", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: { "SELECT approved_from_page": () => ({ approved_from_page: 1 }) },
    runCalls,
  });
  const extraction = { hardware_groups: [{ group_number: "1A", components: [] }] };
  await storeHardwareExtraction(extraction, { DB: db }, "u1", { sessionId: "s1", pageNumber: 2 });
  assert.ok(runCalls.some((c) => c.sql.includes("UPDATE hardware_sets SET")));
  assert.ok(!runCalls.some((c) => c.sql.includes("INSERT OR REPLACE INTO hardware_sets")));
});

test("getHardwareGroupForReview: real happy path returns the group with its components", async () => {
  const db = makeFakeDb({
    handlers: {
      "FROM hardware_sets": () => ({ id: "hwset_1", set_number: "1A" }),
      "FROM hardware_components": () => [{ id: "c1", component_type: "LOCK" }],
    },
  });
  const result = await getHardwareGroupForReview("1A", { DB: db });
  assert.equal(result.set_number, "1A");
  assert.equal(result.components.length, 1);
});

test("getHardwareGroupForReview: returns null when the group doesn't exist", async () => {
  const db = makeFakeDb({ handlers: { "FROM hardware_sets": () => null } });
  const result = await getHardwareGroupForReview("missing", { DB: db });
  assert.equal(result, null);
});

test("updateHardwareGroup: real UPDATE of set metadata and its components", async () => {
  const runCalls = [];
  const db = makeFakeDb({ runCalls });
  const result = await updateHardwareGroup("1A", {
    group_name: "Entry", components: [{ id: "c1", component_type: "LOCK", quantity: 1 }],
  }, { DB: db });
  assert.equal(result.success, true);
  assert.ok(runCalls.some((c) => c.sql.includes("UPDATE hardware_sets")));
  assert.ok(runCalls.some((c) => c.sql.includes("UPDATE hardware_components")));
});

test("queuePageExtractionJob: throws when no owner mhs_id can be resolved", async () => {
  await assert.rejects(
    () => queuePageExtractionJob("base64img", {}, { pageNumber: 1 }),
    /no owner mhs_id/
  );
});

test("queuePageExtractionJob: real happy path resolves a contract, queues via callEdge, and records the pending job", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: { "FROM hardware_extraction_sessions s JOIN nodes": () => ({ mhs_id: "mhs1" }) },
    runCalls,
  });
  await withMockFetch(async (url) => ({
    status: 200,
    async text() { return JSON.stringify({ job_id: "job1" }); },
  }), async () => {
    const result = await queuePageExtractionJob("aVZCT1I=", { HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) }, DB: db, FLEET_API_KEY: "fk1" }, { sessionId: "s1", pageNumber: 1 });
    assert.equal(result.job_id, "job1");
    assert.equal(result.owner_id, "mhs1");
    assert.ok(runCalls.some((c) => c.sql.includes("UPDATE hardware_extraction_sessions SET pending_job_id")));
  });
});

test("buildExtractionResultFromVision: real happy path wraps a parsed vision result with page metadata", () => {
  const visionResult = { content: [{ text: JSON.stringify({ hardware_groups: [{ group_number: "1", components: [] }] }) }] };
  const result = buildExtractionResultFromVision(visionResult, 2, 5);
  assert.equal(result.page_number, 2);
  assert.equal(result.total_pages, 5);
  assert.equal(result.metadata.isolation_method, "sabp_bridge_async");
});

test("extractWithImageMode: real renderer PNG enters embedded OCR and retains source page metadata", async () => {
 const renderer=async()=>({imageBuffer:PNG,totalPages:3});const ocr=[];const pdf=await pdfFixture(3);
 const result=await withEmbeddedModel({hardware_groups:[]},()=>extractWithImageMode(pdf,2,embeddedEnv(null,ocr),renderer));
 assert.equal(result.total_pages,3);assert.equal(result.metadata.extraction_mode,"image_render");assert.equal(ocr.length,1);
});

test("extractWithDirectPdfMode: compatibility entry uses the selected PDF page through OCR", async () => {
 const pdf=await pdfFixture(3),ocr=[];const result=await withEmbeddedModel({hardware_groups:[]},()=>extractWithDirectPdfMode(pdf,2,embeddedEnv(null,ocr)));
 assert.equal(result.page_number,2);assert.equal(result.total_pages,3);assert.equal(result.metadata.extraction_mode,"embedded_gofaineat");assert.ok(ocr.every(x=>x.headers.get('X-Page-Number')==='2'));
});

test("extractFromPageImage: a real PNG uses the embedded route with resolved legacy contract", async () => {
 const imgB64=Buffer.from(PNG).toString('base64');const result=await withEmbeddedModel({hardware_groups:[]},()=>extractFromPageImage(imgB64,1,1,embeddedEnv(null)));
 assert.equal(result.page_number,1);assert.deepEqual(result.hardware_groups,[]);
});

test("createExtractionSession: real happy path creates a session and returns its id", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: { "FROM tenants": () => ({ industry_id: "ind_doors" }) },
    runCalls,
  });
  const sessionId = await createExtractionSession({
    userId: "u1", projectName: "Proj", filename: "f.pdf", fileBufferKey: "k1", totalPages: 5, tenantId: "ven_weyland",
  }, { DB: db });
  assert.ok(sessionId);
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT INTO hardware_extraction_sessions")));
});

test("getSessionStatus: real happy path returns session with pages and progress percent", async () => {
  const db = makeFakeDb({
    handlers: {
      "FROM hardware_extraction_sessions WHERE id": () => ({ id: "s1", pages_approved: 2, total_pages: 4 }),
      "FROM hardware_page_extractions": () => [{ page_number: 1, status: "approved" }],
    },
  });
  const result = await getSessionStatus("s1", { DB: db });
  assert.equal(result.progress_percent, 50);
  assert.equal(result.pages.length, 1);
});

test("getSessionStatus: returns null for a nonexistent session", async () => {
  const db = makeFakeDb({ handlers: { "FROM hardware_extraction_sessions WHERE id": () => null } });
  const result = await getSessionStatus("missing", { DB: db });
  assert.equal(result, null);
});

test("approvePageExtraction: throws when there's no cached extraction for that page", async () => {
  const db = makeFakeDb({ handlers: { "FROM hardware_page_extractions": () => null } });
  await assert.rejects(
    () => approvePageExtraction("s1", 1, null, "u1", { DB: db }),
    /No cached extraction found/
  );
});

test("approvePageExtraction: real happy path stores the extraction, marks approved, and updates session counters", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: {
      "FROM hardware_page_extractions\n    WHERE session_id": () => ({
        id: "pe1", extracted_data: JSON.stringify({ hardware_groups: [{ group_number: "1", components: [] }] }),
      }),
      "SELECT approved_from_page": () => null,
    },
    runCalls,
  });
  const result = await approvePageExtraction("s1", 1, null, "u1", { DB: db });
  assert.equal(result.groups_inserted, 1);
  assert.ok(runCalls.some((c) => c.sql.includes("SET status = ?")));
  assert.ok(runCalls.some((c) => c.sql.includes("SET pages_approved = pages_approved + 1")));
});

test("resolveConstraints: real happy path merges global+industry+tenant fields with correct scope_chain", async () => {
  const db = makeFakeDb({
    handlers: {
      "scope_level = 'global'": () => [{ field_name: "mark", field_type: "string", sort_order: 1 }],
      "scope_level = 'industry'": () => [],
      "scope_level = 'tenant'": () => [],
    },
  });
  const result = await resolveConstraints({ tenant_id: "ven_weyland", industry_id: "ind_doors" }, { DB: db });
  assert.deepEqual(result.scope_chain, ["global", "industry", "tenant"]);
  assert.equal(result.fields.length, 1);
});

test("resolveExtractionContract: real happy path with no DB falls back to the legacy prompt builder", async () => {
  const result = await resolveExtractionContract({}, { pageNumber: 1, totalPages: 3 });
  assert.ok(result.prompt.length > 0);
  assert.equal(result.constraints, null);
  assert.deepEqual(result.provenance.scope_chain, ["legacy"]);
});

test("resolveExtractionContract: appends operator guidance to the prompt when provided", async () => {
  const result = await resolveExtractionContract({}, { pageNumber: 1, totalPages: 1, operatorNotes: "Check page 2" });
  assert.ok(result.prompt.includes("OPERATOR GUIDANCE"));
  assert.ok(result.prompt.includes("Check page 2"));
});

test("extractDoorScheduleHGSE: selected candidate page uses embedded OCR and persists parsed entries", async () => {
 const runs=[];const db=makeFakeDb({handlers:{"SELECT extraction_route":()=>({extraction_route:"embedded_gofaineat"}),"FROM schedule_region_candidates":()=>({page_number:2})},runCalls:runs});
 const result=await withEmbeddedModel({door_entries:[{mark:"101",fire_rating:"NR"}]},()=>extractDoorScheduleHGSE(PNG,"prompt",{sessionId:"s1",pageNumber:1,candidateId:"c1",tenantId:"ven_weyland",totalPages:3},embeddedEnv(db)));
 assert.equal(result.success,true);assert.equal(result.entries_count,1);assert.ok(runs.some(x=>x.sql.includes('INSERT INTO door_schedule_entries')));
});

test("routeExtraction: an unknown schedule type returns a real failure result, not a throw", async () => {
  const result = await routeExtraction("totally_unknown_type", new ArrayBuffer(8), { sessionId: "s1", pageNumber: 1 }, {});
  assert.equal(result.success, false);
  assert.match(result.error, /Unknown schedule type/);
});

test("routeExtraction: generic fallback uses embedded OCR and preserves its explicit fallback reason", async () => {
 const db=makeFakeDb({handlers:{"SELECT extraction_route":()=>({extraction_route:"embedded_gofaineat"})}});
 const result=await withEmbeddedModel({entries:[{mark:"F1",finish:"PT"}]},()=>routeExtraction("finish_schedule",PNG,{sessionId:"s1",pageNumber:1},embeddedEnv(db)));
 assert.equal(result.fallback_reason,"not_implemented");assert.equal(result.success,true);assert.equal(result.entry_count,1);assert.equal(result.entries[0].mark,"F1");
});

test("extractGenericSchedule: embedded OCR returns actual parsed generic entries", async () => {
 const db=makeFakeDb({handlers:{"SELECT extraction_route":()=>({extraction_route:"embedded_gofaineat"})}});
 const result=await withEmbeddedModel({entries:[{a:1}]},()=>extractGenericSchedule(PNG,{sessionId:"s1",pageNumber:1},embeddedEnv(db)));
 assert.equal(result.success,true);assert.equal(result.entry_count,1);assert.deepEqual(result.entries,[{a:1}]);
});

test("extractGenericSchedule: a real Claude failure returns a real failure result, not a throw", async () => {
  await withMockFetch(async () => ({ ok: false, status: 500, headers: new Headers(), async text() { return "boom"; } }), async () => {
    const result = await extractGenericSchedule(new ArrayBuffer(8), { sessionId: "s1", pageNumber: 1 }, { ANTHROPIC_API_KEY: "sk-1" });
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});

test("logConstraintExecution: real INSERT with a computed prompt hash", async () => {
  const runCalls = [];
  const db = makeFakeDb({ runCalls });
  const id = await logConstraintExecution("s1", 1, { tenant_id: "t1", industry_id: "i1", spec_version: "1.0.0" }, "ih1", "oh1", true, null, 100, { DB: db });
  assert.ok(id.startsWith("exec_"));
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT INTO constraint_executions")));
});

test("resolveDoorScheduleConstraints: real happy path merges global door-schedule fields plus floor fields", async () => {
  const db = makeFakeDb({
    handlers: {
      "scope_level = 'global' AND field_group = 'door_schedule'": () => [{ field_name: "mark", field_type: "string", sort_order: 1 }],
      "scope_level = 'industry' AND industry_id": () => [],
      "scope_level = 'tenant' AND tenant_id": () => [],
    },
  });
  const result = await resolveDoorScheduleConstraints({ tenant_id: "ven_weyland" }, { DB: db });
  assert.equal(result.extraction_type, "door_schedule");
  // real floor fields get added for every DOOR_SCHEDULE_ALLOWED_FIELDS key not already present
  assert.ok(result.fields.some((f) => f.field_name === "fire_rating"));
  assert.ok(result.fields.some((f) => f.field_name === "mark"));
});

test("extractDoorSchedule: embedded OCR resolves constraints and persists draft entries", async () => {
 const runCalls=[];const db=makeFakeDb({handlers:{"scope_level = 'global'":()=>[],"scope_level = 'industry'":()=>[],"scope_level = 'tenant'":()=>[],"SELECT extraction_route":()=>({extraction_route:"embedded_gofaineat"})},runCalls});
 const result=await withEmbeddedModel({door_entries:[{mark:"101",fire_rating:"NR"}]},()=>extractDoorSchedule("s1",PNG,"ven_weyland",1,3,embeddedEnv(db)));
 assert.equal(result.success,true);assert.equal(result.entries_count,1);assert.equal(result.entries[0].mark,"101");assert.ok(runCalls.some(c=>c.sql.includes("INSERT INTO door_schedule_entries")));
});

test("extractDoorSchedule: a Claude failure returns a real failure result with the resolved constraints intact", async () => {
  const db = makeFakeDb({
    handlers: {
      "scope_level = 'global' AND field_group = 'door_schedule'": () => [],
      "scope_level = 'industry' AND industry_id": () => [],
      "scope_level = 'tenant' AND tenant_id": () => [],
    },
  });
  await withMockFetch(async () => ({ ok: false, status: 500, headers: new Headers(), async text() { return "boom"; } }), async () => {
    const result = await extractDoorSchedule("s1", new ArrayBuffer(8), "ven_weyland", 1, 1, { DB: db, ANTHROPIC_API_KEY: "sk-1" });
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});

test("persistDoorScheduleResponse: skips an entry with no mark rather than inserting a broken row", async () => {
  const runCalls = [];
  const db = makeFakeDb({
    handlers: {
      "scope_level = 'global' AND field_group = 'door_schedule'": () => [],
      "scope_level = 'industry' AND industry_id": () => [],
      "scope_level = 'tenant' AND tenant_id": () => [],
    },
    runCalls,
  });
  const apiResponse = { content: [{ text: JSON.stringify({ door_entries: [{ fire_rating: "NR" }] }) }] };
  const result = await persistDoorScheduleResponse("s1", apiResponse, "ven_weyland", 1, 1, { DB: db });
  assert.equal(result.entries_count, 0);
  assert.ok(!runCalls.some((c) => c.sql.includes("INSERT INTO door_schedule_entries")));
});

test("persistDoorScheduleResponse: real happy path with a resolved-constraints pre-fetch skips re-resolving", async () => {
  const runCalls = [];
  const db = makeFakeDb({ runCalls });
  const apiResponse = { content: [{ text: JSON.stringify({ door_entries: [{ mark: "101", fire_rating: "60 MIN" }] }) }] };
  const pre = { resolvedConstraints: { spec_version: "1.0.0", scope_chain: ["global"] }, prompt: "p", startTime: Date.now() };
  const result = await persistDoorScheduleResponse("s1", apiResponse, "ven_weyland", 1, 1, { DB: db }, pre);
  assert.equal(result.success, true);
  assert.equal(result.entries_count, 1);
  assert.ok(runCalls.some((c) => c.sql.includes("INSERT INTO door_schedule_entries")));
  assert.ok(runCalls.some((c) => c.sql.includes("UPDATE hardware_extraction_sessions")));
});

test("hardware PDF extraction rejects implicit multi-page selection and out-of-range pages before provider calls",async()=>{
 const pdf=await pdfFixture(2);let called=0;const env=embeddedEnv(null);env.OCR_SERVICE.fetch=async()=>{called++;throw Error('not expected')};
 await assert.rejects(()=>extractHardwareSchedule(pdf,env),/Select page_number/);await assert.rejects(()=>extractWithDirectPdfMode(pdf,3,env),/out of range/);assert.equal(called,0);
});

test("queued page extraction cannot use an unbound bridge even with an owner", async () => {
 let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('forbidden')};
 try { await assert.rejects(()=>queuePageExtractionJob('AA==',{}, {ownerMhsId:'mhs1',pageNumber:1}),/bridge_not_configured/);assert.equal(calls,0); } finally {globalThis.fetch=original;}
});
test("hardware input rejects invalid PDFs and oversize buffers before calling OCR", async () => {
 let calls=0;const env={OCR_SERVICE:{fetch(){calls++}}};
 await assert.rejects(()=>extractHardwareSchedule(new TextEncoder().encode('not pdf'),env),e=>e.status===400);
 await assert.rejects(()=>extractHardwareSchedule(new ArrayBuffer(50*1024*1024+1),env),e=>e.status===400);assert.equal(calls,0);
});
