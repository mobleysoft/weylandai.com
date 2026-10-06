import { pdfFixture, PNG, embeddedEnv, withEmbeddedModel } from "../test-support/ocr-fixtures.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CircuitBreaker,
  claudeCircuitBreaker,
  callClaudeVision,
  callClaudeVisionWithImage,
  callEmbeddedOcrWithPrompt,
  _callClaudeVisionWithImage_sabp,
  _callClaudeVisionWithImage_localSubprocess,
  _imageSourceForQueue,
  _callClaudeVisionWithImage_apiDirect,
  callClaudeWithPdf,
  resolveInferenceContract,
} from "./hardware-extraction-vision-adapters.js";

function withMockFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return fn().finally(() => { globalThis.fetch = original; });
}

test("CircuitBreaker: starts CLOSED and executes normally", async () => {
  const cb = new CircuitBreaker();
  const result = await cb.execute(async () => "ok");
  assert.equal(result, "ok");
  assert.equal(cb.state, "CLOSED");
});

test("CircuitBreaker: opens after threshold consecutive failures, rejects further calls immediately", async () => {
  const cb = new CircuitBreaker();
  cb.threshold = 2;
  cb.timeout = 100000;
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail1"); }));
  assert.equal(cb.state, "CLOSED");
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail2"); }));
  assert.equal(cb.state, "OPEN");
  await assert.rejects(() => cb.execute(async () => "should not run"), /Circuit breaker is OPEN/);
});

test("CircuitBreaker: transitions to HALF_OPEN and recovers to CLOSED after a success past the timeout", async () => {
  const cb = new CircuitBreaker();
  cb.threshold = 1;
  cb.timeout = 10;
  await assert.rejects(() => cb.execute(async () => { throw new Error("fail"); }));
  assert.equal(cb.state, "OPEN");
  await new Promise((r) => setTimeout(r, 20));
  const result = await cb.execute(async () => "recovered");
  assert.equal(result, "recovered");
  assert.equal(cb.state, "CLOSED");
});

test("claudeCircuitBreaker: is a real shared CircuitBreaker singleton", () => {
  assert.ok(claudeCircuitBreaker instanceof CircuitBreaker);
});

test("resolveInferenceContract: real defaults when no env overrides are set", () => {
  const contract = resolveInferenceContract({});
  assert.equal(contract.model, "claude-opus-4-8");
  assert.equal(contract.max_tokens, 16000);
  assert.equal(contract.temperature, 0);
});

test("resolveInferenceContract: real env overrides applied", () => {
  const contract = resolveInferenceContract({ WEYLAND_INFERENCE_MODEL: "claude-opus-4-9", WEYLAND_MAX_TOKENS: "8000" });
  assert.equal(contract.model, "claude-opus-4-9");
  assert.equal(contract.max_tokens, 8000);
});

test("callClaudeVision: retired route rejects configuration case 0 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeVision(new ArrayBuffer(8),"prompt",{},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeVision: retired route rejects configuration case 1 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeVision(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeVision: retired route rejects configuration case 2 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeVision(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeVision: retired route rejects configuration case 3 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeVision(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeVisionWithImage: no session defaults to embedded OCR, not an external bridge", async () => {
 const ocr=[];const result=await withEmbeddedModel({entries:[{mark:'101'}]},()=>callClaudeVisionWithImage(PNG,'prompt',embeddedEnv(null,ocr),1));assert.equal(result.provider_path,'embedded_gofaineat');assert.equal(ocr.length,1);assert.equal(result.source_page,1);
});

test("callClaudeVisionWithImage: retired stored api_direct fails before OCR or outbound calls", async () => {
 const DB={prepare:()=>({bind:()=>({first:async()=>({extraction_route:'api_direct'})})})};let calls=0;const env=embeddedEnv(DB);env.OCR_SERVICE.fetch=async()=>{calls++;};await withMockFetch(async()=>{calls++;},()=>assert.rejects(()=>callClaudeVisionWithImage(PNG,'prompt',env,1,'s1'),/removed/));assert.equal(calls,0);
});

test("callClaudeVisionWithImage: unknown stored route abstains without provider fallback", async () => {
 const DB={prepare:()=>({bind:()=>({first:async()=>({extraction_route:'totally_unknown'})})})};let calls=0;await withMockFetch(async()=>{calls++;},()=>assert.rejects(()=>callClaudeVisionWithImage(PNG,'prompt',embeddedEnv(DB),1,'s1'),/Unsupported extraction route/));assert.equal(calls,0);
});

test("_imageSourceForQueue: small images are inlined as base64", async () => {
  const smallBase64 = "iVBORshort";
  const source = await _imageSourceForQueue(smallBase64, {});
  assert.equal(source.type, "base64");
  assert.equal(source.media_type, "image/png");
  assert.equal(source.data, smallBase64);
});

test("_imageSourceForQueue: large images upload to R2 and return a signed URL", async () => {
  const bigBase64 = "iVBOR" + "A".repeat(1_200_003); // total length a multiple of 4 for valid base64
  const puts = [];
  const env = {
    UPLOADS: { async put(key, bytes, opts) { puts.push({ key, opts }); } },
    JWT_SECRET: "secret",
    APP_URL: "https://weylandai.com",
  };
  const source = await _imageSourceForQueue(bigBase64, env);
  assert.equal(source.type, "url");
  assert.ok(source.url.startsWith("https://weylandai.com/api/internal/r2-stream?token="));
  assert.equal(puts.length, 1);
});

test("_callClaudeVisionWithImage_sabp: real happy path queues then polls to completion", async () => {
  const calls = [];
  await withMockFetch(async (url, init) => {
    calls.push(url);
    if (String(url).includes("/jobs/queue")) {
      return { status: 200, async text() { return JSON.stringify({ job_id: "job1" }); } };
    }
    return { status: 200, async text() {
      return JSON.stringify({ status: "completed", result: { content: [{ text: "extracted" }], model: "claude-code-local", usage: { input_tokens: 5, output_tokens: 5 } } });
    } };
  }, async () => {
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => originalSetTimeout(fn, ms > 100 ? 1 : ms, ...args);
    try {
      const env = { FLEET_API_KEY: "fk1", HASCOM_EDGE: { fetch: (request, init) => globalThis.fetch(request.url || request, init) } };
      const result = await _callClaudeVisionWithImage_sabp(new ArrayBuffer(8), "prompt", env, 1, "s1", "mhs1");
      assert.equal(result.content[0].text, "extracted");
      assert.equal(result.provider_path, "claude_code_local");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

test("_callClaudeVisionWithImage_sabp: throws when no owner mhs_id can be resolved", async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ async first() { return null; } }) }) } };
  await assert.rejects(
    () => _callClaudeVisionWithImage_sabp(new ArrayBuffer(8), "prompt", env, 1, "s1", null),
    /no mhs_id for session/
  );
});

test("_callClaudeVisionWithImage_localSubprocess: real happy path against the local sidecar", async () => {
  await withMockFetch(async (url, init) => {
    assert.ok(String(url).endsWith("/extract"));
    return { ok: true, async json() { return { success: true, result: { content: [{ text: "sidecar result" }] } }; } };
  }, async () => {
    const result = await _callClaudeVisionWithImage_localSubprocess(new ArrayBuffer(8), "prompt", {}, 1);
    assert.equal(result.content[0].text, "sidecar result");
    assert.equal(result.provider_path, "claude_code_subprocess");
  });
});

test("_callClaudeVisionWithImage_localSubprocess: throws when the sidecar is unreachable", async () => {
  await withMockFetch(async () => ({ ok: false, status: 503 }), async () => {
    await assert.rejects(
      () => _callClaudeVisionWithImage_localSubprocess(new ArrayBuffer(8), "prompt", {}, 1),
      /Local sidecar unreachable/
    );
  });
});

test("_callClaudeVisionWithImage_apiDirect: retired route rejects configuration case 4 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>_callClaudeVisionWithImage_apiDirect(new ArrayBuffer(8),"prompt",{},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("_callClaudeVisionWithImage_apiDirect: retired route rejects configuration case 5 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>_callClaudeVisionWithImage_apiDirect(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeWithPdf: retired route rejects configuration case 6 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeWithPdf(new ArrayBuffer(8),"prompt",{},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeWithPdf: retired route rejects configuration case 7 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeWithPdf(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("callClaudeWithPdf: retired route rejects configuration case 8 without fetch or retries", async () => {
 let attempts=0;await withMockFetch(async()=>{attempts++;throw Error('must not call')},async()=>{await assert.rejects(()=>callClaudeWithPdf(new ArrayBuffer(8),"prompt",{ANTHROPIC_API_KEY:"test-present",QWEN_BRIDGE_CLIENT_ID:"test",QWEN_BRIDGE_CLIENT_SECRET:"test"},1),err=>{assert.match(err.message,/removed/);assert.equal(err.retryable,false);return true;});});assert.equal(attempts,0);
});

test("embedded image extraction reports missing/empty/failed OCR without model calls",async()=>{
 let calls=0;await withMockFetch(async()=>{calls++;throw Error('no model')},async()=>{
  await assert.rejects(()=>callEmbeddedOcrWithPrompt(PNG,'prompt',{},1),/OCR_SERVICE/);
  for(const response of [new Response('bad',{status:500}),Response.json({pages:[{text:''}]})])await assert.rejects(()=>callEmbeddedOcrWithPrompt(PNG,'prompt',{OCR_SERVICE:{fetch:async()=>response}},1),/OCR/);
 });assert.equal(calls,0);
});

test("SABP image adapter requires a real binding before any upload or request", async () => {
 let calls=0;await withMockFetch(async()=>{calls++;throw Error('forbidden')},async()=>{
  await assert.rejects(()=>_callClaudeVisionWithImage_sabp(new ArrayBuffer(4),'p',{UPLOADS:{put(){calls++}}},1,'s1','mhs1'),/bridge_not_configured/);assert.equal(calls,0);
 });
});
