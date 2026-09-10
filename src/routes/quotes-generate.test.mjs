import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerQuotesGenerateRoutes } from "./quotes-generate.js";

const authOk = async () => ({ user: { userId: "u1", tenantId: "t1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });
const prodOk = async () => null;

function makeFakePage() {
  return { async setContent() {}, async pdf() { return new Uint8Array([1, 2, 3]); } };
}
function makeFakePuppeteer() {
  const page = makeFakePage();
  return { async launch() { return { async newPage() { return page; }, async close() {} }; } };
}

function makeFakeDb({ quote = null } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM takeoff_quotes")) return quote;
          if (sql.includes("FROM vendor_profile")) return null;
          if (sql.includes("FROM projects")) return null;
          if (sql.includes("FROM quote_templates")) return null;
          return null;
        },
        async all() { return { results: [] }; },
        async run() { runs.push({ sql, binds: stmt.binds }); return { success: true }; },
      };
      return stmt;
    },
    UPLOADS: {
      async get() { return null; },
      async put() {},
    },
  };
}

function setup({ db, puppeteer } = {}) {
  const router = new NativeRouter();
  registerQuotesGenerateRoutes(router, {
    authenticate: authOk,
    requireProductAccess: prodOk,
    puppeteer: puppeteer || makeFakePuppeteer(),
  });
  const realDb = db || makeFakeDb();
  return { router, env: { DB: realDb, UPLOADS: realDb.UPLOADS, JWT_SECRET: "test-secret" } };
}

test("POST /api/quotes/:quoteId/share: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerQuotesGenerateRoutes(router, { authenticate: authFail, requireProductAccess: prodOk, puppeteer: makeFakePuppeteer() });
  const res = await router.handle(new Request("https://example.com/api/quotes/q1/share", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("POST /api/quotes/:quoteId/share: 404 when quote not found for tenant", async () => {
  const { router, env } = setup({ db: makeFakeDb({ quote: null }) });
  const res = await router.handle(new Request("https://example.com/api/quotes/q1/share", { method: "POST" }), env, {});
  assert.equal(res.status, 404);
});

test("POST /api/quotes/:quoteId/share: already-shared quote returns the existing token, no new write", async () => {
  const db = makeFakeDb({ quote: { id: "q1", tenant_id: "t1", created_at: "2026-01-01", access_token: "existing-tok" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quotes/q1/share", { method: "POST" }), env, {});
  const body = await res.json();
  assert.equal(body.alreadyShared, true);
  assert.equal(body.accessToken, "existing-tok");
  assert.equal(db.runs.some((r) => r.sql.includes("UPDATE takeoff_quotes SET access_token")), false);
});

test("POST /api/quotes/:quoteId/share: real new-token generation and write when none exists", async () => {
  const db = makeFakeDb({ quote: { id: "q1", tenant_id: "t1", created_at: "2026-01-01", access_token: null } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/quotes/q1/share", { method: "POST" }), env, {});
  const body = await res.json();
  assert.ok(body.accessToken);
  assert.ok(db.runs.some((r) => r.sql.includes("UPDATE takeoff_quotes SET access_token")));
});

test("POST /q/:quoteId/:accessToken/accept: 403 when the token doesn't match a real quote", async () => {
  const { router, env } = setup({ db: makeFakeDb({ quote: null }) });
  const res = await router.handle(new Request("https://example.com/q/q1/tok1/accept", { method: "POST", body: JSON.stringify({}) }), env, {});
  assert.equal(res.status, 403);
});

test("POST /q/:quoteId/:accessToken/accept: 409 when already accepted", async () => {
  const { router, env } = setup({ db: makeFakeDb({ quote: { id: "q1", access_token: "tok1", status: "accepted", accepted_at: "x", accepted_by: "y" } }) });
  const res = await router.handle(new Request("https://example.com/q/q1/tok1/accept", { method: "POST", body: JSON.stringify({}) }), env, {});
  assert.equal(res.status, 409);
});

test("POST /q/:quoteId/:accessToken/accept: missing signature is a real 400", async () => {
  const db = makeFakeDb({ quote: { id: "q1", access_token: "tok1", status: "sent", created_at: new Date().toISOString(), settings_snapshot: null } });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/q/q1/tok1/accept", { method: "POST", body: JSON.stringify({ name: "Jane" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /q/:quoteId/:accessToken/accept: real happy path writes accepted status + signature to R2", async () => {
  const db = makeFakeDb({
    quote: {
      id: "q1", tenant_id: "t1", access_token: "tok1", status: "sent",
      created_at: new Date().toISOString(), settings_snapshot: null, line_item_snapshot: null,
      quote_number: "Q-1", subtotal: 100, taxable_amount: 100, tax_rate: 0, tax_amount: 0, grand_total: 100,
    },
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/q/q1/tok1/accept", {
    method: "POST",
    body: JSON.stringify({ name: "Jane Doe", signature_png_base64: Buffer.from("fakepng").toString("base64") }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.status, "accepted");
  assert.ok(db.runs.some((r) => r.sql.includes("SET status = 'accepted'")));
});

test("GET /api/takeoff/quotes/:quoteId/download: 404 when quote not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ quote: null }) });
  const res = await router.handle(new Request("https://example.com/api/takeoff/quotes/q1/download"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/takeoff/quotes/:quoteId/download: real happy path streams the R2 PDF object", async () => {
  const db = makeFakeDb({ quote: { r2_key: "quotes/q1.pdf", quote_number: "Q-1" } });
  db.UPLOADS.get = async () => ({ body: new ReadableStream() });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/takeoff/quotes/q1/download"), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/pdf");
});

test("POST /api/takeoff/session/:sessionId/generate-quote: auth+product-access gated", async () => {
  const router = new NativeRouter();
  registerQuotesGenerateRoutes(router, { authenticate: authFail, requireProductAccess: prodOk, puppeteer: makeFakePuppeteer() });
  const res = await router.handle(new Request("https://example.com/api/takeoff/session/s1/generate-quote", { method: "POST" }), { DB: null }, {});
  assert.equal(res.status, 401);
});
