import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsQueueExtractionRoutes } from "./sessions-queue-extraction.js";

const authOk = async () => ({ user: { userId: "u1", mhsId: "m1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ session = null } = {}) {
  return {
    prepare() {
      return {
        bind: (...args) => ({
          async first() { return session; },
          async run() { return { success: true }; },
        }),
      };
    },
  };
}

const resolveExtractionContractOk = async () => ({ prompt: "extract this" });
const resolveInferenceContractOk = () => ({ model: "claude-opus-4-8", max_tokens: 16000, temperature: 0 });
const callEdgeOk = async () => ({ status: 200, body: { job_id: "j1" } });

function setup({
  authenticate = authOk,
  db,
  uploads,
  resolveExtractionContract = resolveExtractionContractOk,
  resolveInferenceContract = resolveInferenceContractOk,
  callEdge = callEdgeOk,
} = {}) {
  const router = new NativeRouter();
  registerSessionsQueueExtractionRoutes(router, { authenticate, resolveExtractionContract, resolveInferenceContract, callEdge });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; } } } };
}

test("POST /api/sessions/:sessionId/queue-extraction: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/sessions/:sessionId/queue-extraction: 400 when user has no owner identity", async () => {
  const { router, env } = setup({ authenticate: async () => ({ user: { userId: null, mhsId: null } }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/:sessionId/queue-extraction: invalid JSON is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: "not json" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/:sessionId/queue-extraction: missing messages array (no use_session_pdf) is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 400);
});

test("POST /api/sessions/:sessionId/queue-extraction: real happy path with explicit messages array queues a job and stamps pending_job_id", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/sessions/s1/queue-extraction", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.job_id, "j1");
});

test("POST /api/sessions/:sessionId/queue-extraction: use_session_pdf 404s when session not found or not owned", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const req = new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: JSON.stringify({ use_session_pdf: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/queue-extraction: use_session_pdf 404s when the PDF isn't in R2 or KV", async () => {
  const db = makeFakeDb({ session: { file_buffer_key: "k1", user_id: "u1" } });
  const { router, env } = setup({ db, uploads: { async get() { return null; } } });
  const req = new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: JSON.stringify({ use_session_pdf: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/sessions/:sessionId/queue-extraction: real happy path builds messages from the session PDF via use_session_pdf", async () => {
  const db = makeFakeDb({ session: { file_buffer_key: "k1", user_id: "u1", document_type: "door_schedule", tenant_id: "t1", total_pages: 3 } });
  const uploads = { async get() { return { async arrayBuffer() { return new ArrayBuffer(4); } }; } };
  const { router, env } = setup({ db, uploads });
  const req = new Request("https://example.com/api/sessions/s1/queue-extraction", { method: "POST", body: JSON.stringify({ use_session_pdf: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.job_id, "j1");
});
