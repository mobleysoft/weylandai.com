import { pdfFixture, embeddedEnv, withEmbeddedModel } from "../test-support/ocr-fixtures.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXTRACTION_PROMPT_TEMPLATE,
  viaApiDirect,
  parseAndValidateExtraction,
  viaSabpClaudeCode,
  viaLocalSubprocess,
  adaptersForEdition,
  dispatchVisionExtraction,
  pdfBufferOrNull,
  generateR2StreamUrl,
  getUnaffirmReason,
} from "./hardware-extraction-vision-dispatch.js";
import { verifyJWT } from "../auth-module.js";

function fakeFetchOnce(impl) {
  const original = global.fetch;
  global.fetch = impl;
  return () => { global.fetch = original; };
}

// A lenient catch-all D1 fake: every query pattern used by
// resolveExtractionContract/resolveConstraints along viaSabpClaudeCode's
// real call path handles empty/null results gracefully (that's how those
// functions are written), so this fake just needs to not throw.
function lenientDb(overrides = {}) {
  const chain = {
    bind: () => chain,
    first: async () => (overrides.first !== undefined ? overrides.first : null),
    all: async () => (overrides.all !== undefined ? overrides.all : { results: [] }),
    run: async () => (overrides.run !== undefined ? overrides.run : { changes: 0 }),
  };
  return { prepare: () => chain };
}

// --- EXTRACTION_PROMPT_TEMPLATE ---

test("EXTRACTION_PROMPT_TEMPLATE: real content includes the JSON output marker parseAndValidateExtraction depends on", () => {
  assert.ok(EXTRACTION_PROMPT_TEMPLATE.includes("---JSON OUTPUT BEGINS BELOW THIS LINE---"));
});

// --- parseAndValidateExtraction ---

test("parseAndValidateExtraction: real happy path parses valid door JSON with high confidence", () => {
  const text = `---JSON OUTPUT BEGINS BELOW THIS LINE---
{"doors":[{"door_number":"101","type":"HM","width_inches":36,"height_inches":84,"thickness_inches":1.75,"material":"HM"}]}`;
  const result = parseAndValidateExtraction(text, { tokenUsage: { input_tokens: 100, output_tokens: 50 } });
  assert.equal(result.doors.length, 1);
  assert.equal(result.doors[0].door_number, "101");
  assert.equal(result.token_usage, 150);
  assert.equal(result.extraction_confidence, 0.95);
  assert.deepEqual(result.validation_warnings, []);
});

test("parseAndValidateExtraction: real behavior rejects a response missing a doors array", () => {
  assert.throws(() => parseAndValidateExtraction('{"notDoors": []}'), /missing "doors" array/);
});

test("parseAndValidateExtraction: real behavior rejects unparseable JSON", () => {
  assert.throws(() => parseAndValidateExtraction("not json at all"), /does not contain valid JSON/);
});

test("parseAndValidateExtraction: real floor-plan-detection guard rejects sequential MARK numbers", () => {
  const doors = [101, 102, 103, 104, 105].map((n) => ({ door_number: String(n) }));
  const text = JSON.stringify({ doors });
  assert.throws(() => parseAndValidateExtraction(text), /Sequential door numbers detected/);
});

test("parseAndValidateExtraction: lettered/gapped MARK numbers do NOT trigger the floor-plan guard", () => {
  const doors = ["G3", "G4", "101", "131", "137A"].map((n) => ({ door_number: n }));
  const text = JSON.stringify({ doors });
  const result = parseAndValidateExtraction(text);
  assert.equal(result.doors.length, 5);
});

test("parseAndValidateExtraction: real validation warnings reduce confidence for an out-of-range width", () => {
  const text = JSON.stringify({ doors: [{ door_number: "G3", width_inches: 200, height_inches: 84, thickness_inches: 1.75 }] });
  const result = parseAndValidateExtraction(text);
  assert.equal(result.validation_warnings.length, 1);
  assert.ok(result.validation_warnings[0].includes("outside typical range"));
  assert.ok(result.extraction_confidence < 0.95);
});

test("parseAndValidateExtraction: a door with no door_number is dropped with a warning, not fatal", () => {
  const text = JSON.stringify({ doors: [{ door_number: "" }, { door_number: "G3", width_inches: 36, height_inches: 84, thickness_inches: 1.75 }] });
  const result = parseAndValidateExtraction(text);
  assert.equal(result.doors.length, 1);
});

// --- viaApiDirect ---

test("viaApiDirect: compatibility export explicitly rejects retired extraction without a request", async () => {
 let calls=0;const restore=fakeFetchOnce(async()=>{calls++;throw Error('no request')});try{await assert.rejects(()=>viaApiDirect('s1',new ArrayBuffer(4),{ANTHROPIC_API_KEY:'present'}),/removed/);assert.equal(calls,0);}finally{restore()}
});

test("viaApiDirect: retired path rejects missing credentials without retries or completion", async () => {
 let calls=0;const restore=fakeFetchOnce(async()=>{calls++;throw Error('no request')});try{await assert.rejects(()=>viaApiDirect('s1',new ArrayBuffer(4),{}),/removed/);assert.equal(calls,0);}finally{restore()}
});

// --- viaSabpClaudeCode ---

test("viaSabpClaudeCode: real behavior returns no_mhs_id_for_session_owner when the session owner has none", async () => {
  const db = lenientDb({ first: { mhs_id: null } });
  const result = await viaSabpClaudeCode("s1", new ArrayBuffer(4), { HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) }, DB: db });
  assert.deepEqual(result, { sync: true, error: "no_mhs_id_for_session_owner" });
});

test("viaSabpClaudeCode: real happy path queues a job via callEdge and updates the session", async () => {
  const dbCalls = [];
  const db = {
    prepare(sql) {
      dbCalls.push(sql);
      const chain = {
        bind: () => chain,
        first: async () => sql.includes("hardware_extraction_sessions")
          ? { mhs_id: "mhs1", document_type: "door_schedule", tenant_id: "ven_x", total_pages: 3 }
          : null,
        all: async () => ({ results: [] }),
        run: async () => ({ changes: 1 }),
      };
      return chain;
    },
  };
  const restore = fakeFetchOnce(async (url) => {
    if (url.includes("/ai/v1/jobs/queue")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ job_id: "job1" }) };
    }
    return { ok: true, status: 200, text: async () => "{}" };
  });
  try {
    const result = await viaSabpClaudeCode("s1", new ArrayBuffer(4), { HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) }, DB: db, HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) } });
    assert.equal(result.sync, false);
    assert.equal(result.job_id, "job1");
    assert.ok(dbCalls.some((sql) => sql.includes("UPDATE hardware_extraction_sessions")));
  } finally {
    restore();
  }
});

test("viaSabpClaudeCode: real behavior surfaces a queue_failed result without throwing", async () => {
  const db = {
    prepare(sql) {
      const chain = {
        bind: () => chain,
        first: async () => sql.includes("hardware_extraction_sessions")
          ? { mhs_id: "mhs1", document_type: "hardware_schedule", tenant_id: "ven_x", total_pages: 1 }
          : null,
        all: async () => ({ results: [] }),
        run: async () => ({ changes: 0 }),
      };
      return chain;
    },
  };
  const restore = fakeFetchOnce(async () => ({ ok: false, status: 500, text: async () => JSON.stringify({ error: "down" }) }));
  try {
    const result = await viaSabpClaudeCode("s1", new ArrayBuffer(4), { HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) }, DB: db });
    assert.equal(result.sync, true);
    assert.equal(result.error, "queue_failed");
  } finally {
    restore();
  }
});

// --- viaLocalSubprocess ---

test("viaLocalSubprocess: real happy path parses the sidecar's response shape", async () => {
  const restore = fakeFetchOnce(async (url, opts) => {
    assert.ok(url.endsWith("/extract"));
    return {
      ok: true,
      json: async () => ({
        success: true,
        result: { content: [{ text: '---JSON OUTPUT BEGINS BELOW THIS LINE---\n{"doors":[{"door_number":"5"}]}' }] },
      }),
    };
  });
  try {
    const result = await viaLocalSubprocess("s1", new ArrayBuffer(4), {});
    assert.equal(result.sync, true);
    assert.equal(result.doors[0].door_number, "5");
  } finally {
    restore();
  }
});

test("viaLocalSubprocess: real behavior reports sidecar_unreachable on a non-ok response", async () => {
  const restore = fakeFetchOnce(async () => ({ ok: false, status: 502 }));
  try {
    const result = await viaLocalSubprocess("s1", new ArrayBuffer(4), {});
    assert.equal(result.error, "sidecar_unreachable");
    assert.equal(result.http_status, 502);
  } finally {
    restore();
  }
});

test("viaLocalSubprocess: real behavior reports sidecar_error when success:false", async () => {
  const restore = fakeFetchOnce(async () => ({ ok: true, json: async () => ({ success: false, error: "model timeout" }) }));
  try {
    const result = await viaLocalSubprocess("s1", new ArrayBuffer(4), {});
    assert.equal(result.error, "sidecar_error");
    assert.equal(result.detail, "model timeout");
  } finally {
    restore();
  }
});

// --- adaptersForEdition ---

test("adaptersForEdition: real routing for the local edition wires the subprocess adapter", () => {
  const adapters = adaptersForEdition({ WEYLAND_EDITION: "local" });
  assert.equal(adapters.api_direct, undefined);
  assert.equal(adapters.claude_code_subprocess, viaLocalSubprocess);
  assert.equal(adapters.claude_code_local, undefined);
});

test("adaptersForEdition: real routing for a non-local edition wires the sabp adapter", () => {
  const adapters = adaptersForEdition({ WEYLAND_EDITION: "production", HASCOM_EDGE: {fetch(){}} });
  assert.equal(adapters.claude_code_local, viaSabpClaudeCode);
  assert.equal(adapters.claude_code_subprocess, undefined);
});

// --- dispatchVisionExtraction ---

test("dispatchVisionExtraction: stored embedded route uses real OCR contract and local structuring", async () => {
 const db=lenientDb({first:{extraction_route:'embedded_gofaineat',total_pages:1}});const pdf=await pdfFixture(),ocr=[];const env=embeddedEnv(db,ocr);
 const result=await withEmbeddedModel({doors:[{door_number:'G3',width_inches:36,height_inches:84,thickness_inches:1.75}]},()=>dispatchVisionExtraction('s1',pdf,env,{pageNumber:1}));assert.equal(result.doors[0].door_number,'G3');assert.equal(result.extraction_route,'embedded_gofaineat');assert.equal(ocr.length,3);
});

test("dispatchVisionExtraction: completion is written only after supported non-error extraction", async () => {
 const updates=[];let route='embedded_gofaineat';const db={prepare(sql){return {bind(){return this},async first(){return {extraction_route:route,total_pages:1}},async run(){updates.push(sql);return {changes:1}}}}};
 const pdf=await pdfFixture();await withEmbeddedModel({doors:[{door_number:'G3'}]},()=>dispatchVisionExtraction('s1',pdf,embeddedEnv(db),{pageNumber:1}));assert.equal(updates.length,1);
 for(route of ['api_direct','unknown']){const result=await dispatchVisionExtraction('s1',pdf,{DB:db});assert.ok(result.error);assert.equal(updates.length,1)}
 const failed=await dispatchVisionExtraction('s1',pdf,{DB:{prepare:()=>({bind(){return this},first:async()=>({extraction_route:'embedded_gofaineat'})})}});assert.equal(failed.error,'ocr_service_not_configured');assert.equal(updates.length,1);
});

// --- pdfBufferOrNull ---

test("pdfBufferOrNull: real magic-byte check accepts a real %PDF- buffer", () => {
  const buf = new TextEncoder().encode("%PDF-1.7\n...").buffer;
  assert.equal(pdfBufferOrNull(buf, "k1"), buf);
});

test("pdfBufferOrNull: real behavior rejects a non-PDF buffer instead of trusting a stale cache", () => {
  const buf = new TextEncoder().encode("not a pdf").buffer;
  assert.equal(pdfBufferOrNull(buf, "k1"), null);
});

test("pdfBufferOrNull: null input returns null without throwing", () => {
  assert.equal(pdfBufferOrNull(null, "k1"), null);
});

// --- generateR2StreamUrl ---

test("generateR2StreamUrl: real round-trip - the embedded JWT is genuinely verifiable", async () => {
  const env2 = { JWT_SECRET: "test-secret-key-1234567890", APP_URL: "https://weylandai.com" };
  const url = await generateR2StreamUrl("temp/abc.pdf", env2);
  assert.ok(url.startsWith("https://weylandai.com/api/internal/r2-stream?token="));
  const token = decodeURIComponent(url.split("token=")[1]);
  const payload = await verifyJWT(token, env2.JWT_SECRET);
  assert.equal(payload.key, "temp/abc.pdf");
});

test("generateR2StreamUrl: falls back to the real default APP_URL when unset", async () => {
  const url = await generateR2StreamUrl("k", { JWT_SECRET: "s" });
  assert.ok(url.startsWith("https://weyland.onamerica.org/"));
});

// --- getUnaffirmReason ---

test("getUnaffirmReason: real group-type reasons", () => {
  assert.equal(getUnaffirmReason({}, "group"), "Missing group number");
  assert.equal(getUnaffirmReason({ group_number: "1" }, "group"), "Not yet reviewed");
});

test("getUnaffirmReason: real component-type reasons, checked in priority order", () => {
  assert.equal(getUnaffirmReason({}, "component"), "Missing component type");
  assert.equal(getUnaffirmReason({ type: "hinge" }, "component"), "Missing manufacturer");
  assert.equal(getUnaffirmReason({ type: "hinge", manufacturer: "Ives", flagged: true }, "component"), "Flagged for review");
  assert.equal(getUnaffirmReason({ type: "hinge", manufacturer: "Ives" }, "component"), "Not yet reviewed");
});

test("getUnaffirmReason: an unknown type returns a real, honest 'Unknown', not a crash", () => {
  assert.equal(getUnaffirmReason({}, "something_else"), "Unknown");
});

test("production adapter list exposes no unbound bridge or retired API",()=>{const a=adaptersForEdition({});assert.equal(a.claude_code_local,undefined);assert.equal(a.api_direct,undefined);assert.equal(typeof a.embedded_gofaineat,'function')});

// An owner identity alone cannot authorize an unbound, cross-account bridge.
test("viaSabpClaudeCode: missing service binding makes zero outbound calls", async () => {
 let calls=0;const restore=fakeFetchOnce(async()=>{calls++;throw Error('network forbidden')});
 try { const result=await viaSabpClaudeCode('s1',new ArrayBuffer(4),{DB:lenientDb({first:{mhs_id:'mhs1'}})});assert.equal(result.error,'bridge_not_configured');assert.equal(calls,0); } finally {restore();}
});
