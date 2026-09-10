import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsListRoutes } from "./sessions-list.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ sessions = [], total = 0, session = null, pages = [], extraction = null } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("SELECT COUNT(*) as total")) return { total };
            if (sql.includes("FROM hardware_page_extractions")) return extraction;
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            return null;
          },
          async all() {
            if (sql.includes("FROM hardware_page_extractions")) return { results: pages };
            return { results: sessions };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db, uploads } = {}) {
  const router = new NativeRouter();
  registerSessionsListRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb(), UPLOADS: uploads || { async get() { return null; } } } };
}

test("GET /api/sessions: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/sessions: real happy path lists sessions with pagination", async () => {
  const db = makeFakeDb({ sessions: [{ id: "s1", project_name: "Proj A", total_pages: 10, pages_processed: 5 }], total: 3 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 3);
  assert.equal(body.sessions[0].sessionId, "s1");
  assert.equal(body.sessions[0].progress, 50);
});

test("GET /api/sessions/:sessionId: 404 when not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId: real happy path returns session with extracted pages and summary", async () => {
  const db = makeFakeDb({
    session: { id: "s1", project_name: "Proj A", total_pages: 2, pages_processed: 1, current_page: 1 },
    pages: [{ id: "p1", page_number: 1, status: "approved", extracted_data: JSON.stringify({ hardware_sets: [{ components: [1, 2] }] }) }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.session.sessionId, "s1");
  assert.equal(body.extractedPages.length, 1);
  assert.equal(body.summary.totalHardwareSets, 1);
  assert.equal(body.summary.totalComponents, 2);
});

test("GET /api/sessions/:sessionId/pages/:pageNumber: invalid page number is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pages/0"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/sessions/:sessionId/pages/:pageNumber: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pages/1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/pages/:pageNumber: 404 when page not yet extracted", async () => {
  const db = makeFakeDb({ session: { id: "s1", total_pages: 5 }, extraction: null });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pages/1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/pages/:pageNumber: real happy path returns parsed extraction with cost estimate", async () => {
  const db = makeFakeDb({
    session: { id: "s1", total_pages: 5 },
    extraction: { id: "e1", page_number: 1, extracted_data: "{}", input_tokens: 1000, output_tokens: 500 },
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pages/1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.performance.costEstimate);
  assert.equal(body.performance.costEstimate.tokens.total, 1500);
});

test("GET /api/sessions/:sessionId/pdf: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pdf"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/pdf: 404 when file_buffer_key missing", async () => {
  const db = makeFakeDb({ session: { id: "s1", file_buffer_key: null } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pdf"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/pdf: real happy path streams the PDF", async () => {
  const db = makeFakeDb({ session: { id: "s1", file_buffer_key: "k1", filename: "doc.pdf" } });
  const uploads = { async get() { return { async arrayBuffer() { return new ArrayBuffer(8); } }; } };
  const { router, env } = setup({ db, uploads });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/pdf"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});
