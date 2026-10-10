// The SubX / TakeOffX workspace API (src/routes/subx-workspace.js) on a real
// SQLite database (node:sqlite behind a D1-shaped wrapper): every session
// route answers only the account that owns the session, and the takeoff
// counts come from the stored door rows, with an unread size counted as
// unread rather than as a size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { registerSubxWorkspaceRoutes, useOfferCredit } from "../src/routes/subx-workspace.js";
import { fieldDecision, SCHEDULE_EVIDENCE_VERSION } from "../assets/client-ocr-src/schedule-text-layer.mjs";

function d1(db) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
        async first(col) { const r = db.prepare(sql).get(...args); if (r === undefined) return null; return col ? r[col] : { ...r }; },
        async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
        async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
      };
      return stmt;
    },
  };
}

function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT, project_name TEXT, filename TEXT, document_type TEXT, total_pages INTEGER, status TEXT, created_at TEXT, updated_at TEXT, file_buffer_key TEXT, project_id TEXT);
    CREATE TABLE door_schedule_entries (id TEXT, session_id TEXT, mark TEXT, hardware_group TEXT, fire_rating TEXT, width TEXT, width_inches REAL, height_inches REAL, thickness TEXT, thickness_inches REAL, door_type TEXT, door_material TEXT, door_finish TEXT, stc_rating INTEGER, frame_type TEXT, frame_material TEXT, frame_finish TEXT, head_detail TEXT, jamb_detail TEXT, sill_detail TEXT, panic INTEGER, notes TEXT, page_number INTEGER, extraction_confidence REAL, field_confidence_json TEXT, validation_status TEXT, corrections_json TEXT);
    CREATE TABLE hardware_sets (id TEXT PRIMARY KEY, session_id TEXT, set_number TEXT, set_name TEXT, affirmed INTEGER, door_count INTEGER, door_location TEXT, notes TEXT);
    CREATE TABLE hardware_components (id TEXT, set_id TEXT, component_type TEXT, quantity INTEGER, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, sequence_order INTEGER);
    CREATE TABLE hardware_page_extractions (session_id TEXT, page_number INTEGER);
  `);
  const ins = db.prepare("INSERT INTO hardware_extraction_sessions (id, user_id, project_name, filename, document_type, total_pages, status, created_at, file_buffer_key) VALUES (?,?,?,?,?,?,?,?,?)");
  ins.run("sess-a", "user-a", "A's schedule", "a.pdf", "door_schedule", 1, "active", "2026-10-07T08:00:00Z", "hardware-sessions/user-a/x");
  ins.run("sess-a-demo", "user-a", "The WeylandAI Building", null, "hardware_schedule", 3, "active", "2026-10-07T07:00:00Z", "demo-clone/sess-a-demo");
  ins.run("sess-a-empty", "user-a", "Not read yet", "e.pdf", "door_schedule", 1, "active", "2026-10-07T06:00:00Z", "hardware-sessions/user-a/e");
  ins.run("sess-b", "user-b", "B's schedule", "b.pdf", "door_schedule", 1, "active", "2026-10-07T08:00:00Z", "hardware-sessions/user-b/y");
  const door = db.prepare("INSERT INTO door_schedule_entries (session_id, mark, hardware_group, fire_rating, width, width_inches, height_inches, door_type, page_number, field_confidence_json) VALUES (?,?,?,?,?,?,?,?,?,?)");
  const src = (row) => JSON.stringify({ source: { page: 1, table_row: row, rotation: 90 } });
  door.run("sess-a", "131", "02", "20 MIN.", "3'-0\" x 7'-0\"", 36, 84, "A", 1, src(7));
  door.run("sess-a", "133", "03", "NR", "3'-0\" x 7'-0\"", 36, 84, "A", 1, src(8));
  door.run("sess-a", "144B", "10", "NR", "6'-0\" x 7'-0\"", 72, 84, "F", 1, src(11));
  door.run("sess-a", "246", "04", "20 MIN.", "3'-0\" x 711\"", 36, null, "D", 1, src(43));
  return db;
}

const users = {
  a: { userId: "user-a", email: "a@example.com" },
  b: { userId: "user-b", email: "b@example.com" },
  guest: { userId: null, ephemeral: true },
};

function setup() {
  const db = makeDb();
  const objects = new Map([["hardware-sessions/user-a/x", "%PDF-1.7 a"], ["hardware-sessions/user-b/y", "%PDF-1.7 b"]]);
  const env = {
    DB: d1(db),
    UPLOADS: {
      async head(key) { return objects.has(key) ? { size: objects.get(key).length, customMetadata: {} } : null; },
      async get(key) { return objects.has(key) ? { body: objects.get(key), arrayBuffer: async () => new TextEncoder().encode(objects.get(key)).buffer } : null; },
    },
  };
  const router = new NativeRouter();
  const authenticate = async (request) => {
    const who = request.headers.get("x-test-user");
    if (!who) return { error: new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 }) };
    return { user: users[who] };
  };
  registerSubxWorkspaceRoutes(router, { authenticate, requireActiveSubscription: async () => null });
  const call = async (method, path, who, body) => {
    const headers = who ? { "x-test-user": who } : {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await router.handle(new Request("https://weylandai.com" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env, {});
    const type = res.headers.get("Content-Type") || "";
    return { status: res.status, type, data: type.includes("json") ? await res.json() : await res.text() };
  };
  return { call, db, objects };
}

test("sessions: your own only, demo clones marked; a guest is told to sign in, not refused", async () => {
  const { call } = setup();
  const mine = await call("GET", "/api/hardware-schedule/sessions", "a");
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.data.sessions.map((s) => s.id), ["sess-a", "sess-a-demo", "sess-a-empty"]);
  assert.equal(mine.data.sessions.find((s) => s.id === "sess-a").door_count, 4);
  assert.equal(mine.data.sessions.find((s) => s.id === "sess-a-demo").is_demo, true);
  const guest = await call("GET", "/api/hardware-schedule/sessions", "guest");
  assert.equal(guest.status, 200);
  assert.equal(guest.data.signed_in, false);
  assert.deepEqual(guest.data.sessions, []);
  const none = await call("GET", "/api/hardware-schedule/sessions", null);
  assert.equal(none.status, 401);
});

test("every session route refuses another account's session", async () => {
  const { call } = setup();
  for (const [method, path] of [
    ["GET", "/api/hardware-schedule/session/sess-b/doors"],
    ["GET", "/api/hardware-schedule/session/sess-b/source.pdf"],
    ["GET", "/api/hardware-schedule/session/sess-b/submittal-pdf"],
    ["POST", "/api/hardware-schedule/session/sess-b/submittal-pdf"],
  ]) {
    const r = await call(method, path, "a", method === "POST" ? {} : undefined);
    assert.equal(r.status, 403, method + " " + path);
    const g = await call(method, path, "guest", method === "POST" ? {} : undefined);
    assert.equal(g.status, 401, "guest " + method + " " + path);
    assert.equal(g.data.code, "SIGN_IN_REQUIRED");
  }
  const missing = await call("GET", "/api/hardware-schedule/session/nope/doors", "a");
  assert.equal(missing.status, 404);
});

test("doors and takeoff counts come from the stored rows; an unread size is not a size", async () => {
  const { call } = setup();
  const r = await call("GET", "/api/hardware-schedule/session/sess-a/doors", "a");
  assert.equal(r.status, 200);
  assert.equal(r.data.doors.length, 4);
  assert.deepEqual(r.data.doors[0].source, { page: 1, table_row: 7, rotation: 90 });
  assert.equal(r.data.doors[0].field_confidence_json, undefined);
  const t = r.data.takeoff;
  assert.equal(t.doors, 4);
  assert.equal(t.doors_with_size, 3);
  assert.deepEqual(t.by_size, [{ value: "3'-0\" x 7'-0\"", count: 2 }, { value: "6'-0\" x 7'-0\"", count: 1 }]);
  assert.deepEqual(t.by_fire_rating, [{ value: "20 MIN.", count: 2 }, { value: "NR", count: 2 }]);
  assert.deepEqual(t.by_door_type, [{ value: "A", count: 2 }, { value: "D", count: 1 }, { value: "F", count: 1 }]);
  assert.equal(r.data.package, null);
});

test("the uploaded PDF is served to its owner; the demo building has none", async () => {
  const { call } = setup();
  const r = await call("GET", "/api/hardware-schedule/session/sess-a/source.pdf", "a");
  assert.equal(r.status, 200);
  assert.equal(r.type, "application/pdf");
  assert.equal(r.data, "%PDF-1.7 a");
  const demo = await call("GET", "/api/hardware-schedule/session/sess-a-demo/source.pdf", "a");
  assert.equal(demo.status, 404);
});

test("a package is not built from a schedule nobody has read yet", async () => {
  const { call } = setup();
  const r = await call("POST", "/api/hardware-schedule/session/sess-a-empty/submittal-pdf", "a", {});
  assert.equal(r.status, 409);
  assert.equal(r.data.error, "NOTHING_EXTRACTED");
  const none = await call("GET", "/api/hardware-schedule/session/sess-a/submittal-pdf", "a");
  assert.equal(none.status, 404);
});

// Free to try, pay for the output (weyland-shared/output-access.js): your own
// package PDF opens with the $100 offer (inside its window) or a plan; the
// demo building's opens for everyone; a free trial is not a purchase.
test("the package PDF of your own schedule needs the $100 offer or a plan", async () => {
  const { call, db, objects } = setup();
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);
    CREATE TABLE weyland_purchases (checkout_session_id TEXT PRIMARY KEY, kind TEXT, product_id TEXT, status TEXT, user_id TEXT);
    CREATE TABLE weyland_subscriptions (id TEXT, user_id TEXT, status TEXT, tiers TEXT, suite INTEGER);
  `);
  objects.set("submittals/sess-a/final_submittal.pdf", "%PDF-1.7 package");
  objects.set("submittals/sess-a-demo/final_submittal.pdf", "%PDF-1.7 demo package");
  const later = new Date(Date.now() + 20 * 864e5).toISOString(), earlier = new Date(Date.now() - 864e5).toISOString();
  const setUser = (tier, status, ends) => { db.exec("DELETE FROM users"); db.prepare("INSERT INTO users VALUES ('user-a',?,?,?)").run(tier, status, ends); };
  const get = (sess) => call("GET", "/api/hardware-schedule/session/" + sess + "/submittal-pdf", "a");

  // A 14-day free trial (no purchase): the package is shown as built, not handed over.
  setUser("starter", "trial", later);
  let r = await get("sess-a");
  assert.equal(r.status, 402);
  assert.equal(r.data.code, "PAYMENT_REQUIRED");
  assert.match(r.data.message, /\$100 first submittal/);
  // The demo building's package is open to everyone.
  assert.equal((await get("sess-a-demo")).status, 200);
  // The $100 first submittal, inside its 30-day window.
  db.prepare("INSERT INTO weyland_purchases VALUES ('cs_1','offer','weyland-first-submittal','granted','user-a')").run();
  assert.equal((await get("sess-a")).status, 200);
  // ... and after the window: not any more.
  setUser("free", "active", earlier);
  assert.equal((await get("sess-a")).status, 402);
  // A paying suite subscription, or a SubX / TakeoffX seat.
  db.prepare("INSERT INTO weyland_subscriptions VALUES ('sub_1','user-a','active','',1)").run();
  assert.equal((await get("sess-a")).status, 200);
  db.exec("DELETE FROM weyland_subscriptions");
  db.prepare("INSERT INTO weyland_subscriptions VALUES ('sub_2','user-a','active','takeoffx',0)").run();
  assert.equal((await get("sess-a")).status, 200);
  // A PropX seat alone does not carry the SubX package; a lapsed seat carries nothing.
  db.exec("DELETE FROM weyland_subscriptions");
  db.prepare("INSERT INTO weyland_subscriptions VALUES ('sub_3','user-a','active','propx',0),('sub_4','user-a','canceled','subx',0)").run();
  assert.equal((await get("sess-a")).status, 402);
});

test('a saved door sheet keeps pricing fields and asks for Section 08 71 00 before packet assembly', async () => {
  const { call, db } = setup();
  db.prepare('UPDATE door_schedule_entries SET field_confidence_json = ? WHERE session_id = ? AND mark = ?').run(JSON.stringify({ source: { page: 1, table_row: 0 }, pair: false, glazing: 'G2', alternate_pricing: 'YES', hardware_spec_sections: ['08 71 00'] }), 'sess-a', '131');
  const detail = await call('GET', '/api/hardware-schedule/session/sess-a/doors', 'a');
  assert.equal(detail.status, 200);
  const d = detail.data.doors.find(d => d.mark === '131');
  assert.deepEqual([d.pair, d.glazing, d.alternate_pricing], [false, 'G2', 'YES']);
  assert.match(detail.data.hardware_schedule_needed.message, /Section 08 71 00 — Door Hardware/);
  const build = await call('POST', '/api/hardware-schedule/session/sess-a/submittal-pdf', 'a', {});
  assert.equal(build.status, 409);
  assert.equal(build.data.error, 'HARDWARE_SPEC_REQUIRED');
  assert.match(build.data.details, /Section 08 71 00 — Door Hardware/);
});

test("F3: saved OCR rows expose measured confidence, partial status and qualified totals", async () => {
  const { call, db } = setup();
  const fields = { mark: .95, hardware_group: .45, fire_rating: .68, width: .72, height: .98 };
  db.prepare("UPDATE door_schedule_entries SET field_confidence_json = ? WHERE session_id = ? AND mark = ?")
    .run(JSON.stringify({ source: { page: 1, table_row: 7 }, read_from: "ocr_lines", confidence_source: "ocr_words", fields,
      field_evidence: { version: SCHEDULE_EVIDENCE_VERSION, stage: "ocr_lines", partial: true, fields: { width: { ...fieldDecision("3'-0\"", .72, "3'-0\"", .72, 36), image: "never-expose" } } },
      read_audit: { partial: true, expected_marks: ["131", "999"] } }), "sess-a", "131");
  const { data } = await call("GET", "/api/hardware-schedule/session/sess-a/doors", "a");
  const door = data.doors.find(d => d.mark === "131");
  assert.deepEqual(door.field_confidence, fields);
  assert.equal(door.field_evidence.fields.width.original.confidence, .72);
  assert.equal(door.field_evidence.fields.width.chosen.value, 36);
  assert.equal(door.field_evidence.partial, true);
  assert.equal(JSON.stringify(door.field_evidence).includes("never-expose"), false);
  for (const field of ["hardware_group", "fire_rating", "size"]) assert.ok(door.unsure.includes(field));
  assert.equal(data.takeoff.ocr_rows, 1);
  assert.equal(data.takeoff.ocr_fields, 5);
  assert.equal(data.takeoff.below_threshold_fields, 3);
  assert.equal(data.takeoff.doors_with_size, 2);
  assert.match(data.takeoff.qualifier, /Machine-read OCR/);
  assert.match(data.takeoff.qualifier, /Partial read/);
  assert.deepEqual(data.takeoff.missing_expected_marks, [{ page: 1, mark: "999" }]);
});

test("g052: a size corrected to a pair (PR ...) is saved as a pair, and back to one door without it", async () => {
  const { call, db } = setup();
  // The columns a correction writes (production's table has them).
  for (const c of ["validated INTEGER", "validated_by TEXT", "validated_at TEXT", "updated_at TEXT"]) db.exec("ALTER TABLE door_schedule_entries ADD COLUMN " + c);
  db.exec("UPDATE door_schedule_entries SET id = 'door-' || mark WHERE session_id = 'sess-a'");
  const r = await call("PATCH", "/api/hardware-schedule/session/sess-a/doors/door-144B", "a", { size: "PR 3' - 0\" x 7' - 0\"" });
  assert.equal(r.status, 200);
  assert.equal(r.data.changed.pair, true);
  const row = db.prepare("SELECT width_inches, field_confidence_json, corrections_json FROM door_schedule_entries WHERE id = 'door-144B'").get();
  assert.equal(row.width_inches, 36);
  assert.equal(JSON.parse(row.field_confidence_json).pair, true);
  assert.deepEqual(JSON.parse(row.field_confidence_json).source, { page: 1, table_row: 11, rotation: 90 }, "the source citation is kept");
  assert.equal(JSON.parse(row.corrections_json).before.pair, null);
  const doors = await call("GET", "/api/hardware-schedule/session/sess-a/doors", "a");
  const d = doors.data.doors.find((x) => x.mark === "144B");
  assert.equal(d.pair, true);
  assert.equal(d.corrected, true);
  const back = await call("PATCH", "/api/hardware-schedule/session/sess-a/doors/door-144B", "a", { size: "3' - 0\" x 7' - 0\"" });
  assert.equal(back.data.changed.pair, false);
  assert.equal(JSON.parse(db.prepare("SELECT field_confidence_json FROM door_schedule_entries WHERE id = 'door-144B'").get().field_confidence_json).pair, false);
  const other = await call("PATCH", "/api/hardware-schedule/session/sess-a/doors/door-131", "a", { notes: "checked" });
  assert.equal(other.data.changed.pair, undefined, "a correction without a size leaves the pair alone");
});

test("g052: a package built on the first submittal uses its one packet credit, and no more", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE weyland_purchases (checkout_session_id TEXT PRIMARY KEY, kind TEXT, status TEXT, user_id TEXT, granted_at TEXT, credits_total INTEGER, credits_used INTEGER, updated_at TEXT)");
  db.prepare("INSERT INTO weyland_purchases VALUES ('in_1','offer','granted','user-a','2026-10-10T03:44:51Z',1,0,NULL), ('cs_2','offer','held','user-a',NULL,1,0,NULL)").run();
  const env = { DB: d1(db) };
  assert.equal(await useOfferCredit(env, "user-a"), true);
  assert.equal(await useOfferCredit(env, "user-a"), false, "the one credit is used once");
  assert.deepEqual(db.prepare("SELECT checkout_session_id AS id, credits_used AS used FROM weyland_purchases ORDER BY id").all().map((r) => ({ ...r })), [{ id: "cs_2", used: 0 }, { id: "in_1", used: 1 }]);
  assert.equal(await useOfferCredit(env, "user-b"), false, "no offer, nothing used");
  assert.equal(await useOfferCredit({ DB: { prepare() { throw new Error("down"); } } }, "user-a"), false, "never throws");
});

// g056 (docs/review-2026-10-10-on-account.md, the credit finding): the $100 first submittal is every
// product for 30 days; the packet credit is the card's count, not a gate (the Mac's reading (a)).
import { outputAccess } from "../../weyland-shared/output-access.js";

test("rebuilding the same package does not consume a second credit", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE weyland_purchases (checkout_session_id TEXT PRIMARY KEY, kind TEXT, status TEXT, user_id TEXT, granted_at TEXT, credits_total INTEGER, credits_used INTEGER, updated_at TEXT)");
  db.prepare("INSERT INTO weyland_purchases VALUES ('in_1','offer','granted','user-a','2026-10-10T03:44:51Z',1,0,NULL)").run();
  const env = { DB: d1(db) };
  assert.equal(await useOfferCredit(env, "user-a"), true, "the first build uses the credit");
  for (let i = 0; i < 3; i++) assert.equal(await useOfferCredit(env, "user-a"), false, "a rebuild uses none");
  assert.equal(db.prepare("SELECT credits_used AS n FROM weyland_purchases").get().n, 1);
});

test("building a package past the credit inside the 30 days is still the offer (every product until day 30), not a denial", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);
    CREATE TABLE weyland_purchases (checkout_session_id TEXT PRIMARY KEY, kind TEXT, product_id TEXT, status TEXT, user_id TEXT, credits_total INTEGER, credits_used INTEGER);
    CREATE TABLE weyland_subscriptions (id TEXT, user_id TEXT, status TEXT, tiers TEXT, suite INTEGER);
  `);
  db.prepare("INSERT INTO users VALUES ('user-a','starter','trial',?)").run(new Date(Date.now() + 20 * 864e5).toISOString());
  db.prepare("INSERT INTO weyland_purchases VALUES ('in_1','offer','weyland-first-submittal','granted','user-a',1,1)").run();
  const inside = await outputAccess({ DB: d1(db) }, "user-a", "subx");
  assert.deepEqual([inside.paid, inside.via], [true, "offer"], "credit used up, window open: still paid output");
  db.prepare("UPDATE users SET trial_ends_at = ?").run(new Date(Date.now() - 864e5).toISOString());
  assert.equal((await outputAccess({ DB: d1(db) }, "user-a", "subx")).paid, false, "day 30 ends it, as sold");
});
