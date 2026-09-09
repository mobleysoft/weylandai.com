// Real, runnable verification for src/routes/document-generators.js - run
// with:
//   node --test src/routes/document-generators.test.mjs
//
// Registers the real routes against a fake router that just records
// handlers, then invokes the real POST /api/lien-waivers/generate handler
// end to end (through authenticate() -> requireProductAccess() ->
// generateLienWaiverHtml() -> renderHtmlToPdf() -> storeDocumentPdf() ->
// D1 insert) against faked Request/env/puppeteer objects. Also exercises
// the returned makeDocumentDownloadRoute() factory the same way
// legacy-monolith.js uses it for GET /api/leads/reports/:id/download.

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerDocumentGeneratorRoutes } from "./document-generators.js";

// Fake router: just records every registration so the test can pull out
// one real handler and call it directly - same NativeRouter surface
// (get/post) the real router exposes.
function makeFakeRouter() {
  const routes = {};
  return {
    routes,
    get(path, handler) {
      routes[`GET ${path}`] = handler;
    },
    post(path, handler) {
      routes[`POST ${path}`] = handler;
    },
    put() {},
    patch() {},
    delete() {},
  };
}

function makeFakeDb(rows) {
  const inserted = [];
  return {
    inserted,
    prepare(sql) {
      return {
        bind(...args) {
          this._binds = args;
          return this;
        },
        async first() {
          if (sql.includes("FROM weyland_sessions")) return rows.session || null;
          if (sql.includes("SELECT subscription_tier, products_enabled")) return rows.productRow || null;
          if (sql.includes("SELECT subscription_status")) return rows.subscriptionRow || null;
          if (sql.includes("SELECT r2_key FROM")) return rows.downloadRow || null;
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO lien_waivers")) inserted.push(this._binds);
          return { success: true };
        },
      };
    },
  };
}

function makeFakePuppeteer() {
  const calls = { launch: 0, pdf: 0 };
  return {
    calls,
    async launch() {
      calls.launch++;
      return {
        async newPage() {
          return {
            async setContent() {},
            async pdf() {
              calls.pdf++;
              return new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
            },
          };
        },
        async close() {},
      };
    },
  };
}

function makeFakeUploads() {
  const stored = new Map();
  return {
    stored,
    async put(key, bytes) {
      stored.set(key, bytes);
    },
    async get(key) {
      const bytes = stored.get(key);
      if (!bytes) return null;
      return { body: bytes };
    },
  };
}

function makeRequest({ cookie, jsonBody, params } = {}) {
  const headers = new Map();
  if (cookie) headers.set("Cookie", cookie);
  return {
    url: "https://weylandai.com/api/lien-waivers/generate",
    headers: { get: (k) => headers.get(k) ?? null },
    params: params || {},
    async json() {
      return jsonBody;
    },
  };
}

test("POST /api/lien-waivers/generate: real end-to-end path through authenticate -> requireProductAccess -> renderHtmlToPdf -> storeDocumentPdf -> D1 insert", async () => {
  const router = makeFakeRouter();
  const puppeteer = makeFakePuppeteer();
  const uploads = makeFakeUploads();
  const { makeDocumentDownloadRoute } = registerDocumentGeneratorRoutes(router, {
    generateQuoteHtml: () => "<html>unused for lien-waivers</html>",
    puppeteer,
  });

  assert.ok(router.routes["POST /api/lien-waivers/generate"], "route was registered");
  assert.ok(router.routes["GET /api/lien-waivers/:id/download"], "download route was registered");

  const db = makeFakeDb({
    session: {
      id: "sess_1",
      user_id: "user_1",
      email: "contractor@example.com",
      expires_at: "2099-01-01",
      player_json: JSON.stringify({ tenants: [{ id: "ven_weyland" }] }),
    },
    subscriptionRow: { subscription_status: "active", submittals_used: 0, submittals_limit: 10 },
    productRow: { subscription_tier: "subconp", products_enabled: "" },
  });
  const env = { DB: db, UPLOADS: uploads };

  const req = makeRequest({
    cookie: "weyland_session=sess_1",
    jsonBody: {
      waiverType: "conditional_progress",
      claimantName: "Acme Doors LLC",
      projectAddress: "123 Main St",
      amount: 5000,
    },
  });

  const handler = router.routes["POST /api/lien-waivers/generate"];
  const response = await handler(req, env);
  const body = await response.json();

  assert.equal(body.success, true, JSON.stringify(body));
  assert.ok(body.waiverId);
  assert.equal(puppeteer.calls.launch, 1, "renderHtmlToPdf launched the browser exactly once");
  assert.equal(puppeteer.calls.pdf, 1, "one PDF was rendered");
  assert.equal(db.inserted.length, 1, "one row was inserted into lien_waivers");
  assert.equal(uploads.stored.size, 1, "the rendered PDF was stored in R2");
});

test("registerDocumentGeneratorRoutes returns makeDocumentDownloadRoute, reusable outside this file's own routes (as legacy-monolith.js does for leads/reports)", async () => {
  const router = makeFakeRouter();
  const { makeDocumentDownloadRoute } = registerDocumentGeneratorRoutes(router, {
    generateQuoteHtml: () => "",
    puppeteer: makeFakePuppeteer(),
  });

  const uploads = makeFakeUploads();
  await uploads.put("lead_reports/rep_1.pdf", new Uint8Array([1, 2, 3]));
  const db = makeFakeDb({
    session: {
      id: "sess_1",
      user_id: "user_1",
      email: "x@example.com",
      expires_at: "2099-01-01",
      player_json: "{}",
    },
    subscriptionRow: { subscription_status: "active", submittals_used: 0, submittals_limit: 10 },
    productRow: { subscription_tier: "subconp", products_enabled: "" },
    downloadRow: { r2_key: "lead_reports/rep_1.pdf" },
  });
  const env = { DB: db, UPLOADS: uploads };

  const leadsDownloadHandler = makeDocumentDownloadRoute("lead_reports", "leadx", "QualifiedLeads");
  const req = makeRequest({ cookie: "weyland_session=sess_1", params: { id: "rep_1" } });
  const response = await leadsDownloadHandler(req, env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
});
