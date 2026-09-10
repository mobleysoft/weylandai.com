import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsSearchRoutes } from "./cps-search.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ trigramResults = [], ftsResults = [], throwNoTable = false } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async all() {
            if (throwNoTable) throw new Error("no such table: catalogue_trigram_fts");
            if (sql.includes("catalogue_trigram_fts")) return { results: trigramResults };
            if (sql.includes("catalogue_pages_fts")) return { results: ftsResults };
            return { results: [] };
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerCpsSearchRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/cps/search: auth failure short-circuits (external call)", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/search?q=hinge"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/search: internal Weyland-Discovery header bypasses auth", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(
    new Request("https://example.com/api/cps/search?q=hinge", { headers: { "X-Internal-API": "Weyland-Discovery" } }),
    env,
    {}
  );
  assert.equal(res.status, 200);
});

test("GET /api/cps/search: query too short is a real 400", async () => {
  const { router, env } = setup();
  const res = await router.handle(new Request("https://example.com/api/cps/search?q=a"), env, {});
  assert.equal(res.status, 400);
});

test("GET /api/cps/search: real happy path prefers trigram results when present", async () => {
  const db = makeFakeDb({ trigramResults: [{ catalogue_id: "c1", page_num: 1, excerpt: "hinge spec" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/search?q=hinge"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.searchMethod, "trigram");
  assert.equal(body.count, 1);
});

test("GET /api/cps/search: falls back to fts5_expanded when trigram has no results", async () => {
  const db = makeFakeDb({ trigramResults: [], ftsResults: [{ catalogue_id: "c1", page_num: 2, excerpt: "match" }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/search?q=hinge"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.searchMethod, "fts5_expanded");
  assert.equal(body.count, 1);
});

test("GET /api/cps/search: real graceful fallback when FTS tables don't exist yet", async () => {
  const db = makeFakeDb({ throwNoTable: true });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/search?q=hinge"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 0);
  assert.ok(body.warning.includes("not yet available"));
});

test("POST /api/cps/search-component: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/search-component", { method: "POST", body: "{}" }), env, {});
  assert.equal(res.status, 401);
});

test("POST /api/cps/search-component: missing/short model is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/cps/search-component", { method: "POST", body: JSON.stringify({ model: "x" }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST /api/cps/search-component: real happy path with no matching pages returns empty results and echoed searchTerms", async () => {
  const { router, env } = setup({ db: makeFakeDb({ trigramResults: [] }) });
  const req = new Request("https://example.com/api/cps/search-component", {
    method: "POST",
    body: JSON.stringify({ model: "L9000", manufacturer: "Schlage" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 0);
  assert.equal(body.results.length, 0);
  assert.ok(body.searchTerms.some((t) => t.field === "model"));
});

test("POST /api/cps/search-component: real happy path scores and ranks matching pages", async () => {
  const db = makeFakeDb({
    trigramResults: [
      { catalogue_id: "c1", page_num: 1, text_content: "L9000 Schlage exit device", catalogue_manufacturer: "Schlage", catalogue_name: "Cat A" },
      { catalogue_id: "c2", page_num: 2, text_content: "unrelated content here", catalogue_manufacturer: "Other", catalogue_name: "Cat B" },
    ],
  });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/cps/search-component", {
    method: "POST",
    body: JSON.stringify({ model: "L9000", manufacturer: "Schlage" }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.searchMethod, "multi_field_scoring");
  assert.equal(body.results[0].catalogue_id, "c1");
  assert.ok(body.results[0].score > 0);
  assert.equal(body.totalMatches, 2);
});
