import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerHardwareSchedulePageAffirmRoutes } from "./hardware-schedule-page-affirm.js";

const authOk = async () => ({ user: { userId: "u1", email: "u1@example.com" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function makeFakeDb({ ownedSession = { id: "s1" }, page = null } = {}) {
  const runs = [];
  let currentPage = page;
  return {
    runs,
    prepare(sql) {
      const stmt = {
        binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("FROM hardware_extraction_sessions WHERE id")) return ownedSession;
          if (sql.includes("FROM hardware_page_extractions")) return currentPage;
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          runs.push({ sql, binds: stmt.binds });
          if (sql.includes("INSERT INTO hardware_page_extractions")) {
            currentPage = { id: stmt.binds[0], extracted_data: stmt.binds[3], affirm_state: '{"groups":[]}' };
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

function setup({ db, session = { id: "s1", extraction_page_range: null } } = {}) {
  const router = new NativeRouter();
  registerHardwareSchedulePageAffirmRoutes(router, {
    authenticate: authOk,
    getSessionStatus: async () => session,
    extractFromPageImage: async () => ({}),
    materializeAffirmedGroup: async () => ({}),
    unaffirmMaterializedGroup: async () => ({}),
    pdfBufferOrNull: () => new Uint8Array([1, 2, 3]),
    generateR2StreamUrl: async () => "https://example.com/stream",
    isPageInRange: () => true,
    renderRegionAt600DPI2: async () => ({ imageBase64: "abc", width: 100, height: 100 }),
  });
  return { router, env: { DB: db || makeFakeDb(), CACHE: { async get() { return new ArrayBuffer(8); } } } };
}

test("PATCH .../component/:idx/affirm: auth failure short-circuits", async () => {
  const router = new NativeRouter();
  registerHardwareSchedulePageAffirmRoutes(router, { authenticate: authFail, getSessionStatus: async () => null, extractFromPageImage: async () => {}, materializeAffirmedGroup: async () => {}, unaffirmMaterializedGroup: async () => {}, pdfBufferOrNull: () => null, generateR2StreamUrl: async () => null, isPageInRange: () => true, renderRegionAt600DPI2: async () => ({}) });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/component/0/affirm", { method: "PATCH", body: "{}" }), { DB: null }, {});
  assert.equal(res.status, 401);
});

test("PATCH .../component/:idx/affirm: 404 when the session isn't owned by this user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ ownedSession: null }) });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/component/0/affirm", { method: "PATCH", body: JSON.stringify({ groupIndex: 0, affirmed: true }) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 404);
});

test("PATCH .../component/:idx/affirm: real bootstrap-creates a page row when none exists yet, using provided groupData/componentData", async () => {
  const db = makeFakeDb({ page: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/component/0/affirm", {
    method: "PATCH",
    body: JSON.stringify({ groupIndex: 0, affirmed: true, groupData: { group_number: "1" }, componentData: { type: "hinge", manufacturer: "Schlage" } }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.component.affirmed, true);
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT INTO hardware_page_extractions")));
});

test("PATCH .../component/:idx/affirm: real validation failure blocks affirming an incomplete component", async () => {
  const db = makeFakeDb({ page: null });
  const { router, env } = setup({ db });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/component/0/affirm", {
    method: "PATCH",
    body: JSON.stringify({ groupIndex: 0, affirmed: true, groupData: { group_number: "1" }, componentData: {} }),
  });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.validationErrors.length > 0);
});

test("DELETE .../extraction/:which: 400 when no dual extraction exists", async () => {
  const db = makeFakeDb({ page: { id: "p1", previous_extracted_data: null } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extraction/previous", { method: "DELETE" }), env, {});
  assert.equal(res.status, 400);
});

test("DELETE .../extraction/:which: real happy path promotes the surviving extraction (which=previous keeps current)", async () => {
  const db = makeFakeDb({ page: { id: "p1", extracted_data: "{}", affirm_state: "{}", previous_extracted_data: "{\"x\":1}" } });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extraction/previous", { method: "DELETE" }), env, {});
  const body = await res.json();
  assert.equal(body.deleted, "previous");
  assert.ok(db.runs.some((r) => r.sql.includes("SET previous_extracted_data = NULL")));
});

test("POST .../extract-region: missing bounding_box is a real 400", async () => {
  const { router, env } = setup();
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-region", { method: "POST", body: JSON.stringify({}) });
  const res = await router.handle(req, env, {});
  assert.equal(res.status, 400);
});

test("POST .../extract-region: real page-range skip when outside the extraction range", async () => {
  const { router, env } = setup({ session: { id: "s1", extraction_page_range: JSON.stringify({ ranges: [] }) } });
  const routerWithSkip = new NativeRouter();
  registerHardwareSchedulePageAffirmRoutes(routerWithSkip, {
    authenticate: authOk,
    getSessionStatus: async () => ({ id: "s1", extraction_page_range: JSON.stringify({ ranges: [] }) }),
    extractFromPageImage: async () => ({}),
    materializeAffirmedGroup: async () => ({}),
    unaffirmMaterializedGroup: async () => ({}),
    pdfBufferOrNull: () => new Uint8Array([1]),
    generateR2StreamUrl: async () => null,
    isPageInRange: () => false,
    renderRegionAt600DPI2: async () => ({}),
  });
  const req = new Request("https://example.com/api/hardware-schedule/session/s1/page/1/extract-region", { method: "POST", body: JSON.stringify({ bounding_box: { x_percent: 1, y_percent: 1, width_percent: 1, height_percent: 1 } }) });
  const res = await routerWithSkip.handle(req, env, {});
  const body = await res.json();
  assert.equal(body.status, "skipped");
});

test("POST .../affirm-all: real bulk-affirm skips invalid/flagged components", async () => {
  const db = makeFakeDb({
    page: {
      id: "p1", affirm_state: "{}",
      extracted_data: JSON.stringify({ hardware_groups: [{ group_number: "1", components: [{ type: "hinge", manufacturer: "Schlage" }, { flagged: true, type: "x", manufacturer: "y" }] }] }),
    },
  });
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/hardware-schedule/session/s1/page/1/affirm-all", { method: "POST" }), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.affirmedComponents, 1);
  assert.equal(body.skippedComponents, 1);
  assert.equal(body.affirmedGroups, 0);
});
