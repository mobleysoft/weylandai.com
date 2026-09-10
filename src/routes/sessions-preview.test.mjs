import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeRouter } from "../lib/router.js";
import { registerSessionsPreviewRoutes } from "./sessions-preview.js";

const authOk = async () => ({ user: { userId: "u1" } });
const authFail = async () => ({ error: new Response("no", { status: 401 }) });

function emptyAll() { return { results: [] }; }

function makeFakeDb({ session = null, pages = [], auditEntries = [], cpsAffirms = [], cutSheetMatches = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind: (...args) => ({
          async first() {
            if (sql.includes("FROM hardware_extraction_sessions")) return session;
            return null;
          },
          async all() {
            if (sql.includes("FROM hardware_page_extractions")) return { results: pages };
            if (sql.includes("FROM affirm_audit_log")) return { results: auditEntries };
            if (sql.includes("FROM affirmation_log")) return { results: cpsAffirms };
            if (sql.includes("FROM session_cut_sheet_matches")) return { results: cutSheetMatches };
            return emptyAll();
          },
        }),
      };
    },
  };
}

function setup({ authenticate = authOk, db } = {}) {
  const router = new NativeRouter();
  registerSessionsPreviewRoutes(router, { authenticate });
  return { router, env: { DB: db || makeFakeDb() } };
}

test("GET /api/sessions/:sessionId/preview: auth failure short-circuits", async () => {
  const { router, env } = setup({ authenticate: authFail });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview"), env, {});
  assert.equal(res.status, 401);
});

test("GET /api/sessions/:sessionId/preview: 404 when session not found", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: null }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview"), env, {});
  assert.equal(res.status, 404);
});

test("GET /api/sessions/:sessionId/preview: 403 when session belongs to another user", async () => {
  const { router, env } = setup({ db: makeFakeDb({ session: { id: "s1", user_id: "other" } }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview"), env, {});
  assert.equal(res.status, 403);
});

test("GET /api/sessions/:sessionId/preview: real happy path compiles groups, components, and affirm summary", async () => {
  const session = { id: "s1", user_id: "u1", project_name: "Test Project", filename: "test.pdf", source_type: "upload", created_at: "2026-01-01", total_pages: 1 };
  const pages = [
    {
      page_number: 1,
      extracted_data: JSON.stringify({
        hardware_groups: [
          { group_number: "1", components: [{ type: "Hinge", manufacturer: "STANLEY", model: "H1", quantity: 3 }] },
        ],
      }),
      affirm_state: JSON.stringify({ groups: [{ affirmed: true, components: [{ affirmed: true }] }] }),
    },
  ];
  const { router, env } = setup({ db: makeFakeDb({ session, pages }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.session_meta.project_name, "Test Project");
  assert.equal(body.groups.length, 1);
  assert.equal(body.groups[0].components.length, 1);
  assert.equal(body.groups[0].components[0].manufacturer, "STANLEY");
  assert.equal(body.affirm_summary.total_groups, 1);
  assert.equal(body.affirm_summary.affirmed_groups, 1);
  assert.equal(body.affirm_summary.all_affirmed, true);
  assert.equal(body.scope, "full");
});

test("GET /api/sessions/:sessionId/preview: group filter narrows scope to a single group", async () => {
  const session = { id: "s1", user_id: "u1", project_name: "Test Project", filename: "test.pdf", source_type: "upload", created_at: "2026-01-01", total_pages: 1 };
  const pages = [
    {
      page_number: 1,
      extracted_data: JSON.stringify({
        hardware_groups: [
          { group_number: "1", components: [] },
          { group_number: "2", components: [] },
        ],
      }),
      affirm_state: JSON.stringify({ groups: [] }),
    },
  ];
  const { router, env } = setup({ db: makeFakeDb({ session, pages }) });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview?group=2"), env, {});
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.groups.length, 1);
  assert.equal(body.groups[0].group_number, "2");
  assert.equal(body.scope, "group");
  assert.equal(body.group_filter, "2");
});

test("GET /api/sessions/:sessionId/preview: a thrown error returns a real 500", async () => {
  const db = {
    prepare(sql) {
      if (sql.includes("FROM hardware_extraction_sessions")) {
        return { bind: () => ({ async first() { return { id: "s1", user_id: "u1" }; } }) };
      }
      throw new Error("db unavailable");
    },
  };
  const { router, env } = setup({ db });
  const res = await router.handle(new Request("https://example.com/api/sessions/s1/preview"), env, {});
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, "Failed to compile preview");
});
