import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsCataloguesRoutes } from "./cps-catalogues.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ catalogues = [], total = 0, catalogue = null, pages = [], mappingStats = [], batchResults = [] } = {}) {
  const handlers = {
    async first() {
      if (sql.includes("SELECT COUNT(*) as total FROM catalogues")) return { total };
      if (sql.includes("SELECT catalogue_id FROM catalogues WHERE catalogue_id")) return catalogue;
      if (sql.includes("SELECT * FROM catalogues WHERE catalogue_id")) return catalogue;
      return null;
    },
    async all() {
      if (sql.includes("WHERE 1=1")) return { results: catalogues };
      if (sql.includes("FROM catalogue_pages")) return { results: pages };
      if (sql.includes("FROM product_mappings")) return { results: mappingStats };
      return { results: catalogues };
    },
    async run() {
      return { success: true };
    },
  };
  let sql = "";
  return {
    prepare(s) {
      sql = s;
      return { bind: (...args) => handlers, ...handlers };
    },
    async batch() {
      return batchResults;
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCpsCataloguesRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cps/catalogues: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/catalogues: real happy path with pagination fields", async () => {
  const db = makeFakeDb({ catalogues: [{ catalogue_id: "c1" }], total: 5 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues?limit=10&offset=0"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 5);
  assert.equal(body.catalogues.length, 1);
});

test("GET /api/cps/catalogues/:id: 404 when catalogue not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ catalogue: null }) });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cps/catalogues/:id: real happy path returns pages and mapping_stats", async () => {
  const db = makeFakeDb({
    catalogue: { catalogue_id: "c1", manufacturer: "Schlage" },
    pages: [{ page_num: 1 }],
    mappingStats: [{ status: "affirmed", count: 3 }],
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/catalogues/c1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.manufacturer, "Schlage");
  assert.equal(body.pages.length, 1);
  assert.equal(body.mapping_stats[0].count, 3);
});

test("POST /api/cps/catalogues: missing manufacturer/title is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/catalogues", { method: "POST", body: JSON.stringify({ title: "X" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/catalogues: real happy path creates a catalogue with a derived id", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/catalogues", {
    method: "POST",
    body: JSON.stringify({ manufacturer: "Schlage", title: "L Series", source_hash: "abcdef0123456789abcdef" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.catalogue_id, "abcdef0123456789");
});

test("POST /api/cps/catalogues/:id/pages: missing pages array is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/catalogues/c1/pages", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/catalogues/:id/pages: 404 when catalogue not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ catalogue: null }) });
  const req = new Request("https://example.com/api/cps/catalogues/c1/pages", {
    method: "POST",
    body: JSON.stringify({ pages: [{ page_num: 1 }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("POST /api/cps/catalogues/:id/pages: real happy path counts inserted vs skipped via batch meta.changes", async () => {
  const db = makeFakeDb({
    catalogue: { catalogue_id: "c1" },
    batchResults: [{ meta: { changes: 1 } }, { meta: { changes: 0 } }],
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/catalogues/c1/pages", {
    method: "POST",
    body: JSON.stringify({ pages: [{ page_num: 1, text_content: "a" }, { page_num: 2, text_content: "b" }] }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.inserted, 1);
  assert.equal(body.skipped, 1);
  assert.equal(body.total, 2);
});
