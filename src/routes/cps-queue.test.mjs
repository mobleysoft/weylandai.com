import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerCpsQueueRoutes } from "./cps-queue.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ queue = [], total = 0, extraction = null } = {}) {
  const handlers = {
    async first() {
      if (sql.includes("SELECT COUNT(*) as total")) return { total };
      if (sql.includes("FROM extraction_cache")) return extraction;
      return null;
    },
    async all() {
      return { results: queue };
    },
  };
  let sql = "";
  return {
    prepare(s) {
      sql = s;
      return { bind: (...args) => handlers, ...handlers };
    },
  };
}

function setup({ authenticate = authOk, db, cache } = {}) {
  const router = new NativeRouter();
  registerCpsQueueRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb(), CACHE: cache } };
}

test("GET /api/cps/queue: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/cps/queue"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/cps/queue: real happy path with pagination fields", async () => {
  const db = makeFakeDb({ queue: [{ queue_id: "q1" }], total: 2 });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/cps/queue?limit=10&offset=0"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 2);
  assert.equal(body.queue.length, 1);
});

test("GET /api/cps/extractions/:catalogueId/:cacheKey: real happy path returns cached data from KV when present", async () => {
  const cache = { async get() { return { pages: 3 }; } };
  const { router, env } = setup({ cache });
  const res = await router.handle(new Request("https://example.com/api/cps/extractions/c1/k1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, "cache");
  assert.deepEqual(body.data, { pages: 3 });
});

test("GET /api/cps/extractions/:catalogueId/:cacheKey: falls back to D1 when KV misses", async () => {
  const cache = { async get() { return null; } };
  const db = makeFakeDb({ extraction: { output_path: "p1", pages: "1", format: "pdf", dpi: 72, created_at: "now" } });
  const { router, env } = setup({ db, cache });
  const res = await router.handle(new Request("https://example.com/api/cps/extractions/c1/k1"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, "database");
  assert.equal(body.output_path, "p1");
});

test("GET /api/cps/extractions/:catalogueId/:cacheKey: 404 when neither KV nor D1 has it", async () => {
  const cache = { async get() { return null; } };
  const db = makeFakeDb({ extraction: null });
  const { router, env } = setup({ db, cache });
  const res = await router.handle(new Request("https://example.com/api/cps/extractions/c1/k1"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/cps/extractions/:catalogueId/:cacheKey: works when env.CACHE is undefined (optional chaining)", async () => {
  const db = makeFakeDb({ extraction: { output_path: "p1", pages: "1", format: "pdf", dpi: 72, created_at: "now" } });
  const { router, env } = setup({ db, cache: undefined });
  const res = await router.handle(new Request("https://example.com/api/cps/extractions/c1/k1"), env, {});
  assert.equal(res.status, 200);
});
