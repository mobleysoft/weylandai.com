import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsRecentRoutes } from "./sessions-recent.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ sessions = [] } = {}) {
  return {
    prepare() {
      return { bind: () => ({ async all() { return { results: sessions }; } }) };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerSessionsRecentRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/sessions/recent: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/recent"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/sessions/recent: real happy path computes progress_percent per session", async () => {
  const db = makeFakeDb({ sessions: [{ id: "s1", total_pages: 4, pages_processed: 2 }, { id: "s2", total_pages: 0, pages_processed: 0 }] });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/recent"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 2);
  assert.equal(body.sessions[0].progress_percent, 50);
  assert.equal(body.sessions[1].progress_percent, 0);
});

test("GET /api/sessions/recent: real happy path handles an empty result set", async () => {
  const { router, env } = setup({ db: makeFakeDb({ sessions: [] }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/recent"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 0);
  assert.deepEqual(body.sessions, []);
});
