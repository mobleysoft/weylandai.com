import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSubmittalChatRoutes } from "./submittal-chat.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function setup({ authenticate = authOk, logClaudeAPICall = async () => {} } = {}) {
  const router = new NativeRouter();
  registerSubmittalChatRoutes(router, { authenticate, logClaudeAPICall });
  return { router, env: { ANTHROPIC_API_KEY: "test-key" } };
}

let originalFetch;
test.beforeEach(() => { originalFetch = globalThis.fetch; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

const VALID_SUBMITTAL = {
  header: { project_name: "Test Project", title: "T", generated_at: "2026-01-01" },
  summary: { total_sets: 1, total_components: 1 },
  hardware_sets: [{ set_number: "HW-1", components: [{ type: "Hinge", model: "H1", manufacturer: "Stanley" }] }],
  certifications: { compliance_statement: "ok" },
};

test("POST /api/submittal/validate: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/submittal/validate", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/submittal/validate: 400 when submittal_data missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/submittal/validate", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/submittal/validate: real happy path structurally validates without a reference image", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/submittal/validate", { method: "POST", body: JSON.stringify({ submittal_data: VALID_SUBMITTAL }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.validation.issues.length, 0);
  assert.equal(body.validation.summary, "Submittal structure is valid and complete");
  assert.equal(body.validation.accuracy_score,null);assert.equal(body.validation.reference_comparison.status,"not_requested");
});

test("POST /api/submittal/validate: structural validation flags missing hardware sets", async () => {
  const { router, env } = setup();
  const incomplete = { header: {}, summary: {}, hardware_sets: [], certifications: null };
  const req = new Request("https://example.com/api/submittal/validate", { method: "POST", body: JSON.stringify({ submittal_data: incomplete }) });
  const res = await router.handle(req, env, {});
  const body = await res.json();
  assert.ok(body.validation.issues.includes("No hardware sets found"));
  assert.ok(body.validation.issues.includes("Missing certifications section"));
});

test("POST /api/submittal/validate: reference image never becomes a verified accuracy score", async () => {
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('forbidden')};const {router,env}=setup();const res=await router.handle(new Request('https://example.com/api/submittal/validate',{method:'POST',body:JSON.stringify({submittal_data:VALID_SUBMITTAL,reference_image_base64:'synthetic',reference_description:'test'})}),env,{});const {validation:v}=await res.json();assert.equal(res.status,200);assert.equal(v.structural_score,100);assert.equal(v.accuracy_score,null);assert.equal(v.accuracy_status,'not_verified');assert.equal(v.validation_scope,'structural_only');assert.equal(v.reference_comparison.status,'unavailable');assert.equal(v.reference_comparison.verified,false);assert.equal(calls,0);
});

test("POST /api/submittal/validate: unknown accuracy remains null even if a provider is configured", async () => {
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('bad',{status:500})};const {router,env}=setup();const res=await router.handle(new Request('https://example.com/api/submittal/validate',{method:'POST',body:JSON.stringify({submittal_data:VALID_SUBMITTAL,reference_description:'reference text'})}),env,{});const {validation:v}=await res.json();assert.equal(v.accuracy_score,null);assert.equal(v.overall_score_scope,'structure_and_format_only');assert.equal(v.reference_comparison.verified,false);assert.equal(calls,0);
});

test("POST /api/chat: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/chat", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/chat: 400 when message missing", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/chat", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/chat: valid request reports unsupported assistant without outbound calls", async () => {
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('forbidden')};const {router,env}=setup();const res=await router.handle(new Request('https://example.com/api/chat',{method:'POST',body:JSON.stringify({message:'hello'})}),env,{});assert.equal(res.status,503);assert.equal((await res.json()).error,'assistant unavailable');assert.equal(calls,0);
});

test("POST /api/chat: malformed JSON is rejected without attempting any provider", async () => {
 let calls=0;globalThis.fetch=async()=>{calls++};const {router,env}=setup();const res=await router.handle(new Request('https://example.com/api/chat',{method:'POST',body:'not json'}),env,{});assert.equal(res.status,400);assert.equal(calls,0);
});

test("invalid nested submittal structures return400, and structural penalties never imply negative scores",async()=>{
 const {router,env}=setup();for(const submittal_data of [[],{hardware_sets:{}},{hardware_sets:[null]},{hardware_sets:[{components:'bad'}]}]){const res=await router.handle(new Request('https://example.com/api/submittal/validate',{method:'POST',body:JSON.stringify({submittal_data})}),env,{});assert.equal(res.status,400)}
 const res=await router.handle(new Request('https://example.com/api/submittal/validate',{method:'POST',body:JSON.stringify({submittal_data:{hardware_sets:Array.from({length:30},()=>({}))}})}),env,{});const v=(await res.json()).validation;assert.ok(v.overall_score>=0);assert.equal(v.accuracy_score,null);
});

test("structural validation rejects null and malformed request bodies as400 without calls",async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('forbidden')};const {router,env}=setup();
 for(const body of ['null','[]','broken']){const res=await router.handle(new Request('https://weylandai.com/api/submittal/validate',{method:'POST',body}),env,{});assert.equal(res.status,400)}assert.equal(calls,0);
});
