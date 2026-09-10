import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerVendorProfileRoutes } from "./vendor-profile.js";

function makeFakeDb({ profile = null } = {}) {
  const runs = [];
  let currentProfile = profile;
  return {
    runs,
    setProfile(p) { currentProfile = p; },
    prepare(sql) {
      const stmt = {
        sql, binds: [],
        bind(...args) { stmt.binds = args; return stmt; },
        async first() {
          if (sql.includes("SELECT * FROM vendor_profile")) return currentProfile;
          return null;
        },
        async run() {
          runs.push({ sql, binds: stmt.binds });
          if (sql.includes("INSERT")) {
            currentProfile = currentProfile || { id: "vp_t1", tenant_id: "t1", affirmed: 0 };
          }
          if (sql.includes("UPDATE vendor_profile SET affirmed")) {
            currentProfile = { ...currentProfile, affirmed: 1, affirmed_at: stmt.binds[0], affirmed_by: stmt.binds[1] };
          }
          if (sql.startsWith("\n        UPDATE vendor_profile SET\n")) {
            currentProfile = { ...currentProfile, company_name: stmt.binds[0], affirmed: stmt.binds[8] };
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

function makeRequest(method, path, jsonBody) {
  return new Request(`https://example.com${path}`, {
    method,
    body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
  });
}

const authOk = async () => ({ user: { tenantId: "t1", userId: "u1" } });
const authNoTenant = async () => ({ user: { tenantId: null, userId: "u1" } });
const authFail = async () => ({ error: new Response("nope", { status: 401 }) });

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerVendorProfileRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(makeRequest("GET", "/api/vendor-profile"), env, {});
  assert.equal(res.status, 401);
});

test("GET: no tenant on user is a real 400", async () => {
  const { router, env } = setup({ authenticate: authNoTenant });
  const res = await router.handle(makeRequest("GET", "/api/vendor-profile"), env, {});
  assert.equal(res.status, 400);
});

test("GET: creates a real profile row on first access when none exists", async () => {
  const db = makeFakeDb({ profile: null });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("GET", "/api/vendor-profile"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(db.runs.some((r) => r.sql.includes("INSERT OR IGNORE")));
});

test("PUT: updating a gated field on an already-affirmed profile resets affirmed status", async () => {
  const db = makeFakeDb({ profile: { id: "vp_t1", tenant_id: "t1", company_name: "Old Co", affirmed: 1 } });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("PUT", "/api/vendor-profile", { company_name: "New Co" }), env, {});
  assert.equal(res.status, 200);
  const updateCall = db.runs.find((r) => r.sql.includes("UPDATE vendor_profile SET\n"));
  assert.equal(updateCall.binds[8], 0); // affirmed reset to 0
});

test("POST /affirm: 404 when no profile exists yet", async () => {
  const db = makeFakeDb({ profile: null });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("POST", "/api/vendor-profile/affirm"), env, {});
  assert.equal(res.status, 404);
});

test("POST /affirm: 400 when company_name is missing", async () => {
  const db = makeFakeDb({ profile: { id: "vp_t1", tenant_id: "t1", company_name: null, affirmed: 0 } });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("POST", "/api/vendor-profile/affirm"), env, {});
  assert.equal(res.status, 400);
});

test("POST /affirm: real happy path sets affirmed=1 with a real timestamp and user", async () => {
  const db = makeFakeDb({ profile: { id: "vp_t1", tenant_id: "t1", company_name: "Real Co", affirmed: 0 } });
  const { router, env } = setup({ db });
  const res = await router.handle(makeRequest("POST", "/api/vendor-profile/affirm"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.affirmed, true);
  assert.equal(body.affirmedBy, "u1");
});
