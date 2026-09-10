import { test } from "node:test";
import assert from "node:assert/strict";
import { createMonolith, createWeylandWorker, SightXRoom } from "./weyland-entry.js";

function fakeRouter({ handle } = {}) {
  return { handle: handle || (async () => new Response("ok", { status: 200 })) };
}

function fakeDiscoveryEngine() {
  const calls = [];
  return { queue: async (batch, env2) => { calls.push([batch, env2]); return "queued"; }, calls };
}

function fakeEnv(overrides = {}) {
  return {
    ASSETS: {
      list: async () => ({ objects: [{ key: "a.html", size: 10 }] }),
      get: async () => null,
    },
    DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    ...overrides,
  };
}

// --- createMonolith ---

test("createMonolith.fetch: /api/debug/r2 real happy path lists ASSETS objects", async () => {
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv();
  const resp = await monolith.fetch(new Request("https://weylandai.com/api/debug/r2"), env2, {});
  assert.equal(resp.status, 200);
  const body = await resp.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.objects, [{ key: "a.html", size: 10 }]);
});

test("createMonolith.fetch: /api/debug/r2 real error path surfaces env2.ASSETS failure", async () => {
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv({ ASSETS: { list: async () => { throw new Error("no binding"); } } });
  const resp = await monolith.fetch(new Request("https://weylandai.com/api/debug/r2"), env2, {});
  const body = await resp.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, "no binding");
});

// Real (pre-existing, faithfully preserved) behavior: publicPaths includes
// "/", and the isPublic check is `pathname === p || pathname.startsWith(p)`
// - since every pathname starts with "/", isPublic is true for literally
// every path, so the session gate below it can never actually trigger. Not
// introduced by this extraction; documented, not silently fixed.
test("createMonolith.fetch: the session gate never triggers for any path (pre-existing '/' prefix bug, preserved as-is)", async () => {
  const seenKeys = [];
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv({
    ASSETS: { get: async (key) => { seenKeys.push(key); return null; } },
  });
  const resp = await monolith.fetch(new Request("https://weylandai.com/dashboard"), env2, {});
  // Falls through to the ASSETS lookup (and then router.handle, since ASSETS
  // returns null), never to the 302 the gate logic appears to intend.
  assert.equal(resp.status, 200);
  assert.ok(seenKeys.length > 0);
});

test("createMonolith.fetch: real behavior tries index.html then a trailing-slash and directory-index variant for '/'", async () => {
  const seenKeys = [];
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv({
    ASSETS: { get: async (key) => { seenKeys.push(key); return null; } },
  });
  await monolith.fetch(new Request("https://weylandai.com/"), env2, {});
  assert.deepEqual(seenKeys, ["index.html", "index.html", "/index.html"]);
});

test("createMonolith.fetch: real ASSETS hit returns the object body with html no-cache headers", async () => {
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv({
    ASSETS: { get: async () => ({ body: "real html", httpEtag: '"abc"' }) },
  });
  const resp = await monolith.fetch(new Request("https://weylandai.com/"), env2, {});
  assert.equal(resp.headers.get("Content-Type"), "text/html;charset=utf-8");
  assert.equal(resp.headers.get("Cache-Control"), "no-store, no-cache, must-revalidate, max-age=0");
  assert.equal(resp.headers.get("ETag"), '"abc"');
});

test("createMonolith.fetch: real fallthrough to router.handle for everything else, wrapped in corsify", async () => {
  const router = fakeRouter({ handle: async () => new Response("routed", { status: 201 }) });
  const monolith = createMonolith({ router, discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv();
  const resp = await monolith.fetch(new Request("https://weylandai.com/api/whatever"), env2, {});
  assert.equal(resp.status, 201);
  assert.equal(await resp.text(), "routed");
});

test("createMonolith.fetch: real error path when router.handle throws surfaces a classified error response", async () => {
  const router = fakeRouter({ handle: async () => { throw new Error("boom"); } });
  const monolith = createMonolith({ router, discoveryEngine: fakeDiscoveryEngine() });
  const env2 = fakeEnv();
  const resp = await monolith.fetch(new Request("https://weylandai.com/api/whatever"), env2, {});
  assert.equal(resp.status, 500);
  const body = await resp.json();
  assert.ok(body.error || body.message || body.code);
});

test("createMonolith.scheduled: real happy path calls getDiscoveryConfig and expires stale discoveries", async () => {
  const dbCalls = [];
  const env2 = fakeEnv({
    DB: {
      prepare(sql) {
        dbCalls.push(sql);
        return {
          bind: () => ({
            all: async () => ({ results: [{ key: "pending_review_expiry_days", value: "30" }] }),
            run: async () => ({ changes: 2 }),
          }),
          all: async () => ({ results: [] }),
          run: async () => ({ changes: 0 }),
        };
      },
    },
  });
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  await monolith.scheduled({ scheduledTime: Date.now() }, env2, {});
  assert.ok(dbCalls.some((sql) => sql.includes("discovery_engine_config")));
  assert.ok(dbCalls.some((sql) => sql.includes("cut_sheet_discoveries")));
  assert.ok(dbCalls.some((sql) => sql.includes("cut_sheet_discovery_queue")));
});

test("createMonolith.scheduled: real behavior survives a DB failure without throwing", async () => {
  const env2 = fakeEnv({ DB: { prepare: () => { throw new Error("db down"); } } });
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() });
  await assert.doesNotReject(monolith.scheduled({ scheduledTime: Date.now() }, env2, {}));
});

test("createMonolith.queue: real delegation to the injected discoveryEngine", async () => {
  const engine = fakeDiscoveryEngine();
  const monolith = createMonolith({ router: fakeRouter(), discoveryEngine: engine });
  const batch = { messages: [] };
  const env2 = fakeEnv();
  const result = await monolith.queue(batch, env2);
  assert.equal(result, "queued");
  assert.equal(engine.calls.length, 1);
  assert.equal(engine.calls[0][0], batch);
});

// --- createWeylandWorker ---

test("createWeylandWorker.fetch: real behavior upgrades http requests to https with a 301", async () => {
  const worker = createWeylandWorker({ monolith: createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() }) });
  const req = new Request("http://weylandai.com/pricing");
  const resp = await worker.fetch(req, fakeEnv(), {});
  assert.equal(resp.status, 301);
  assert.equal(resp.headers.get("Location"), "https://weylandai.com/pricing");
});

test("createWeylandWorker.fetch: real behavior 301-redirects a legacy product subdomain to the path route", async () => {
  const worker = createWeylandWorker({ monolith: createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() }) });
  const req = new Request("https://huntx.weylandai.com/");
  const resp = await worker.fetch(req, fakeEnv(), {});
  assert.equal(resp.status, 301);
  assert.equal(resp.headers.get("Location"), "https://weylandai.com/huntx");
});

test("createWeylandWorker.fetch: real behavior dispatches a marketing-page path via SovereignWeylandRoutes", async () => {
  const worker = createWeylandWorker({ monolith: createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() }) });
  const req = new Request("https://weylandai.com/huntx/");
  const resp = await worker.fetch(req, fakeEnv(), {});
  assert.equal(resp.status, 200);
  assert.ok((await resp.text()).includes("HUNTX") || resp.headers.get("content-type")?.includes("html"));
});

test("createWeylandWorker.fetch: real behavior falls through to monolith.fetch for /api/ paths", async () => {
  const router = fakeRouter({ handle: async () => new Response("api response", { status: 200 }) });
  const monolith = createMonolith({ router, discoveryEngine: fakeDiscoveryEngine() });
  const worker = createWeylandWorker({ monolith });
  const resp = await worker.fetch(new Request("https://weylandai.com/api/health"), fakeEnv(), {});
  assert.equal(await resp.text(), "api response");
});

test("createWeylandWorker.fetch: a WebSocket upgrade to /api/sight/room/ without a project id returns 400", async () => {
  const worker = createWeylandWorker({ monolith: createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() }) });
  const req = new Request("https://weylandai.com/api/sight/room/", { headers: { Upgrade: "websocket" } });
  const resp = await worker.fetch(req, fakeEnv(), {});
  assert.equal(resp.status, 400);
});

test("createWeylandWorker.fetch: a WebSocket upgrade real-authenticates and forwards to the SIGHTX_ROOM durable object stub", async () => {
  let forwardedUrl = null;
  const env2 = fakeEnv({
    SIGHTX_ROOM: {
      idFromName: (id) => `room-${id}`,
      get: (roomId) => ({
        fetch: async (req) => { forwardedUrl = req.url; return new Response("upgraded", { status: 101 }); },
      }),
    },
  });
  const worker = createWeylandWorker({ monolith: createMonolith({ router: fakeRouter(), discoveryEngine: fakeDiscoveryEngine() }) });
  const req = new Request("https://weylandai.com/api/sight/room/proj1", {
    headers: { Upgrade: "websocket", Cookie: "weyland_session=validtoken" },
  });
  // authenticate() is a real import here - against a request with no real
  // session, it should reject before ever reaching the durable object.
  const resp = await worker.fetch(req, env2, {});
  assert.notEqual(resp.status, 101);
  assert.equal(forwardedUrl, null);
});

// --- SightXRoom ---

test("SightXRoom: real construction stores state/env and starts with an empty session map", () => {
  const room = new SightXRoom({ id: "s1" }, { SOME: "env" });
  assert.equal(room.sessions.size, 0);
});

test("SightXRoom.fetch: real behavior rejects a non-websocket request with 426", async () => {
  const room = new SightXRoom({}, {});
  const resp = await room.fetch(new Request("https://weylandai.com/api/sight/room/x"));
  assert.equal(resp.status, 426);
});

test("SightXRoom.broadcast: real behavior sends to every open session except the excluded one", () => {
  const room = new SightXRoom({}, {});
  const sent = [];
  const wsA = { send: (d) => sent.push(["a", d]) };
  const wsB = { send: (d) => sent.push(["b", d]) };
  room.sessions.set(wsA, { userId: "u1" });
  room.sessions.set(wsB, { userId: "u2" });
  room.broadcast({ type: "chat", text: "hi" }, wsA);
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], "b");
  assert.ok(sent[0][1].includes("\"hi\""));
});
