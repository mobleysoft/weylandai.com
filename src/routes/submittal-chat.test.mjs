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

test("POST /api/submittal/validate: real happy path uses Claude Vision when a reference image is provided", async () => {
  globalThis.fetch = async (url, init) => {
    assert.match(url, /api\.anthropic\.com/);
    const payload = JSON.parse(init.body);
    assert.equal(payload.messages[0].content[0].type, "image");
    return new Response(JSON.stringify({
      content: [{ text: JSON.stringify({ overall_score: 90, issues: [], recommendations: [], summary: "Looks good" }) }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }), { status: 200 });
  };
  const { router, env } = setup();
  const req = new Request("https://example.com/api/submittal/validate", {
    method: "POST",
    body: JSON.stringify({ submittal_data: VALID_SUBMITTAL, reference_image_base64: "data:image/png;base64,AAAA", reference_description: "ref doc" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.validation.overall_score, 90);
  assert.equal(body.validation.summary, "Looks good");
});

test("POST /api/submittal/validate: a Claude API failure during vision validation is captured, not thrown", async () => {
  globalThis.fetch = async () => new Response("server error", { status: 500 });
  const { router, env } = setup();
  const req = new Request("https://example.com/api/submittal/validate", {
    method: "POST",
    body: JSON.stringify({ submittal_data: VALID_SUBMITTAL, reference_image_base64: "data:image/png;base64,AAAA" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.validation.error, "Claude API request failed");
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

test("POST /api/chat: real happy path returns Claude's response text", async () => {
  globalThis.fetch = async (url, init) => {
    assert.match(url, /api\.anthropic\.com/);
    const payload = JSON.parse(init.body);
    assert.equal(payload.messages[0].content, "hello");
    return new Response(JSON.stringify({ content: [{ text: "hi there" }], usage: { input_tokens: 5, output_tokens: 3 } }), { status: 200 });
  };
  const { router, env } = setup();
  const req = new Request("https://example.com/api/chat", { method: "POST", body: JSON.stringify({ message: "hello" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.response, "hi there");
});

test("POST /api/chat: a Claude API failure surfaces as a real 500", async () => {
  globalThis.fetch = async () => new Response("boom", { status: 500 });
  const { router, env } = setup();
  const req = new Request("https://example.com/api/chat", { method: "POST", body: JSON.stringify({ message: "hello" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 500);
});
