// The demo building (src/lib/demo-building.js, routes/demo-building.js) on a
// real SQLite database with the production tables' own CREATE TABLE text
// (weyland_db, 2026-10-07): the seed's hardware sets come from sheet A9.01's
// rows; a visitor's copy carries the doors, the sets AND their parts, is
// written all-or-nothing, and an incomplete earlier copy is never handed back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { DEMO_SHEET, PART_TYPES, parsePart, splitParts, sheetHardwareSets, seedHardwareStatements, cloneDemoBuilding, SEED_SESSION_ID, SEED_PROJECT_ID } from "../src/lib/demo-building.js";
import { registerDemoBuildingRoutes, networkOf, demoCopyLimit } from "../src/routes/demo-building.js";

const SCHEMA = [
  "CREATE TABLE projects (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, project_type TEXT DEFAULT 'DOORS', status TEXT DEFAULT 'active', client_name TEXT, client_address TEXT, client_contact_name TEXT, client_contact_email TEXT, client_contact_phone TEXT, billing_name TEXT, billing_address TEXT, shipping_address TEXT, ap_contact TEXT, resale_number TEXT, project_address TEXT, dsa_number TEXT, architect TEXT, contractor TEXT, external_project_ref TEXT, metadata TEXT, notes TEXT, metadata_affirmed INTEGER DEFAULT 0, metadata_affirmed_at TEXT, metadata_affirmed_by TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT, created_by TEXT, user_id TEXT, project_number TEXT)",
  "CREATE TABLE hardware_extraction_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, submittal_id TEXT, project_name TEXT NOT NULL, filename TEXT NOT NULL, file_buffer_key TEXT NOT NULL, total_pages INTEGER NOT NULL, pages_processed INTEGER DEFAULT 0, pages_approved INTEGER DEFAULT 0, status TEXT NOT NULL, current_page INTEGER DEFAULT 1, total_sets_extracted INTEGER DEFAULT 0, total_components_extracted INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), completed_at TEXT, version INTEGER DEFAULT 1, door_schedule_extracted INTEGER DEFAULT 0, door_entries_count INTEGER DEFAULT 0, door_schedule_extracted_at TEXT, source_type TEXT DEFAULT 'pdf', detection_status TEXT DEFAULT 'not_started', detection_method TEXT, detection_completed_at TEXT, candidates_count INTEGER DEFAULT 0, text_extraction_viable INTEGER, document_type TEXT DEFAULT 'door_schedule', tenant_id TEXT, industry_id TEXT, project_id TEXT, document_outline TEXT, detected_schedule_pages TEXT, extraction_page_range TEXT, schedule_table_pages TEXT, extraction_route TEXT, extraction_route_affirmed_at TEXT, extraction_route_affirmed_by TEXT, pending_job_id TEXT, pending_job_queued_at TEXT, extraction_completed_at TEXT)",
  "CREATE TABLE door_hardware_matrix (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, door_number TEXT NOT NULL, door_location TEXT, door_type TEXT, hardware_set_number TEXT NOT NULL, source_page INTEGER, source_type TEXT NOT NULL DEFAULT 'extracted', extraction_confidence REAL, verified BOOLEAN DEFAULT 0, verified_at TEXT, verified_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
  "CREATE TABLE door_schedule_entries (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, tenant_id TEXT, page_number INTEGER NOT NULL, mark TEXT NOT NULL, hardware_group TEXT, fire_rating TEXT, width TEXT, height TEXT, width_inches REAL, height_inches REAL, door_type TEXT, door_material TEXT, frame_type TEXT, frame_material TEXT, panic INTEGER DEFAULT 0, thickness TEXT, thickness_inches REAL, door_finish TEXT, stc_rating INTEGER, frame_finish TEXT, head_detail TEXT, jamb_detail TEXT, sill_detail TEXT, notes TEXT, hardware_set_id TEXT, hardware_group_match_score REAL, hardware_group_match_method TEXT, extraction_confidence REAL, field_confidence_json TEXT, low_confidence_fields TEXT, validated INTEGER DEFAULT 0, validated_by TEXT, validated_at TEXT, corrections_json TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), validation_status TEXT DEFAULT 'pending', rejection_reason TEXT, original_values_json TEXT, validation_notes TEXT)",
  "CREATE TABLE hardware_sets (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, submittal_id TEXT, set_number TEXT NOT NULL, set_name TEXT, door_location TEXT, door_count INTEGER, approved_from_page INTEGER NOT NULL, approved_at TEXT NOT NULL, approved_by TEXT NOT NULL, source_page_extraction_id TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), version INTEGER DEFAULT 1, location_id TEXT, affirmed INTEGER DEFAULT 0, affirmed_at TEXT, affirmed_by TEXT, unit_price_override REAL DEFAULT NULL)",
  "CREATE TABLE hardware_components (id TEXT PRIMARY KEY, set_id TEXT NOT NULL, component_type TEXT NOT NULL, dhi_category TEXT, sequence_order INTEGER, manufacturer TEXT, model TEXT, catalog_number TEXT, finish TEXT, quantity INTEGER DEFAULT 1, function_code TEXT, specifications TEXT, ansi_bhma_grade TEXT, fire_rating_minutes INTEGER, ul_listing_number TEXT, ada_compliant BOOLEAN, approved_at TEXT NOT NULL, approved_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), version INTEGER DEFAULT 1, affirmed INTEGER DEFAULT 0, affirmed_at TEXT, affirmed_by TEXT, product_id TEXT, product_variant_id TEXT, product_match_confidence REAL, uom TEXT DEFAULT 'EA', unit_price REAL, price_source TEXT DEFAULT 'manual', net_price REAL, list_price REAL, hardware_set_id TEXT)",
  "CREATE TABLE hardware_page_extractions (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, page_number INTEGER NOT NULL, extracted_data TEXT NOT NULL, status TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT, corrections TEXT, input_tokens INTEGER, output_tokens INTEGER, extraction_time_ms INTEGER, created_at TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')), version INTEGER DEFAULT 1, field_confidence TEXT, overall_confidence REAL, auto_approved BOOLEAN DEFAULT FALSE, affirm_state TEXT, previous_extracted_data TEXT, previous_affirm_state TEXT, extraction_count INTEGER DEFAULT 1, re_extracted_at TEXT)",
];

// D1-shaped wrapper; batch() is one transaction, as D1's is.
function d1(db, { failOn = null } = {}) {
  const prepare = (sql) => {
    let args = [];
    const stmt = {
      sql,
      bind(...a) { args = a.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v)); return stmt; },
      async first() { const r = db.prepare(sql).get(...args); return r === undefined ? null : { ...r }; },
      async all() { return { results: db.prepare(sql).all(...args).map((r) => ({ ...r })) }; },
      async run() {
        if (failOn && failOn.test(sql)) throw new Error("D1_ERROR: simulated failure");
        const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } };
      },
      exec() { return /^\s*SELECT/i.test(sql) ? stmt.all() : stmt.run(); },
    };
    return stmt;
  };
  return {
    prepare,
    async batch(stmts) {
      db.exec("BEGIN");
      try { const out = []; for (const s of stmts) out.push(await s.exec()); db.exec("COMMIT"); return out; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}

function seededDb({ withSheetSets = true } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const s of SCHEMA) db.exec(s);
  db.prepare("INSERT INTO projects (id, tenant_id, name, project_type, client_name, project_address, architect, created_by) VALUES (?, 'ven_weyland', 'The WeylandAI Building', 'DOORS', 'WeylandAI (internal)', '4400 Bluestem Parkway, Austin, TX', 'WeylandAI Design', 'seedowner')").run(SEED_PROJECT_ID);
  db.prepare("INSERT INTO hardware_extraction_sessions (id, user_id, project_name, filename, file_buffer_key, total_pages, status, created_at) VALUES (?, 'seedowner', 'The WeylandAI Building', 'weyland_building_schedule.pdf', 'hardware-sessions/seedowner/x', 1, 'completed', '2026-09-09T16:29:58Z')").run(SEED_SESSION_ID);
  const verified = { "D-122": 0, "D-207": 0, "D-214B": 0 };
  for (const [door, location, type, set] of DEMO_SHEET.rows) {
    db.prepare("INSERT INTO door_hardware_matrix (id, session_id, door_number, door_location, door_type, hardware_set_number, source_page, source_type, extraction_confidence, verified) VALUES (?, ?, ?, ?, ?, ?, 1, 'extracted', 0.95, ?)")
      .run("m-" + door, SEED_SESSION_ID, door, location, type, set, door in verified ? 0 : 1);
  }
  if (withSheetSets) for (const st of seedHardwareStatements({ now: "2026-10-07T12:00:00Z" })) db.prepare(st.sql).run(...st.args);
  return db;
}

const count = (db, sql, ...a) => db.prepare(sql).get(...a).n;

test("sheet A9.01: 10 doors, 8 hardware sets, 13 listed parts, each named in its set's own words", () => {
  assert.equal(DEMO_SHEET.rows.length, 10);
  const sets = sheetHardwareSets();
  assert.deepEqual(sets.map((s) => s.set_number), ["HW-01", "HW-02", "HW-03", "HW-04", "HW-05", "HW-07", "HW-08", "HW-09"]);
  assert.equal(sets.reduce((n, s) => n + s.components.length, 0), 13);
  assert.deepEqual(sets.find((s) => s.set_number === "HW-07").doors, ["D-118A", "D-310"]);
  for (const s of sets) {
    for (const c of s.components) {
      assert.ok(s.set_name.toLowerCase().includes(c.specifications.toLowerCase()), c.printed + " -> '" + c.specifications + "' is not in '" + s.set_name + "'");
      assert.ok(c.manufacturer && c.model, c.printed);
    }
  }
  assert.equal(Object.keys(PART_TYPES).length, 13);
  const hw01 = sets[0].components.map((c) => [c.component_type, c.manufacturer, c.model]);
  assert.deepEqual(hw01, [["exit_device", "Von Duprin", "98-NL-OP"], ["closer", "LCN", "4040XP-EDA"]]);
});

test("a printed part reads as manufacturer, model and finish", () => {
  assert.deepEqual(parsePart("Schlage ND70PD RHO 626"), { manufacturer: "Schlage", model: "ND70PD RHO", finish: "626", catalog_number: "ND70PD RHO 626" });
  assert.deepEqual(parsePart("Corbin Russwin ML2057 LWA 626"), { manufacturer: "Corbin Russwin", model: "ML2057 LWA", finish: "626", catalog_number: "ML2057 LWA 626" });
  assert.deepEqual(parsePart("Hager 3400 US32D"), { manufacturer: "Hager", model: "3400", finish: "US32D", catalog_number: "3400 US32D" });
  assert.deepEqual(parsePart("Sargent 10-Line 8205 LNL"), { manufacturer: "Sargent", model: "10-Line 8205 LNL", finish: null, catalog_number: "10-Line 8205 LNL" });
  assert.deepEqual(parsePart("LCN 4111"), { manufacturer: "LCN", model: "4111", finish: null, catalog_number: "4111" });
  assert.deepEqual(splitParts("Von Duprin 22-EO · Pemko 303AS"), ["Von Duprin 22-EO", "Pemko 303AS"]);
});

test("a two-way printed set is refused, not silently merged", () => {
  const bad = { ...DEMO_SHEET, rows: [...DEMO_SHEET.rows, ["D-999", "Somewhere", "Hollow Metal", "HW-03", "Privacy lever", "Sargent 10-Line 8205 LNL"]] };
  assert.throws(() => sheetHardwareSets(bad), /HW-03 is printed two ways/);
});

test("seeding twice leaves one set of rows", () => {
  const db = seededDb();
  for (const st of seedHardwareStatements()) db.prepare(st.sql).run(...st.args);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_sets WHERE session_id = ?", SEED_SESSION_ID), 8);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_components"), 13);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_page_extractions"), 1);
});

test("a copy carries the doors, the 8 sets and their 13 parts, each door linked to its set", async () => {
  const db = seededDb();
  const env = { DB: d1(db) };
  const made = await cloneDemoBuilding(env, { userId: "acct1", tenantId: "ven_weyland" }, { now: "2026-10-07T12:30:00Z" });
  assert.equal(made.door_count, 10);
  assert.equal(made.hardware_sets, 8);
  assert.equal(made.hardware_components, 13);
  const s = db.prepare("SELECT * FROM hardware_extraction_sessions WHERE id = ?").get(made.session_id);
  assert.equal(s.user_id, "acct1");
  assert.equal(s.file_buffer_key, "demo-clone/" + made.session_id);
  assert.equal(s.project_id, made.project_id);
  assert.equal(db.prepare("SELECT created_by FROM projects WHERE id = ?").get(made.project_id).created_by, "acct1");
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM door_hardware_matrix WHERE session_id = ?", made.session_id), 10);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM door_schedule_entries WHERE session_id = ? AND hardware_set_id IS NOT NULL", made.session_id), 10);
  // Each door's set id is the set with its own number.
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM door_schedule_entries d JOIN hardware_sets h ON h.id = d.hardware_set_id WHERE d.session_id = ? AND h.set_number = d.hardware_group AND h.session_id = d.session_id", made.session_id), 10);
  const items = db.prepare("SELECT h.set_number, h.set_name, h.door_count, c.component_type, c.manufacturer, c.model, c.finish, c.quantity, c.set_id = c.hardware_set_id AS same FROM hardware_components c JOIN hardware_sets h ON c.set_id = h.id WHERE h.session_id = ? ORDER BY h.set_number, c.sequence_order").all(made.session_id);
  assert.equal(items.length, 13);
  assert.ok(items.every((r) => r.same === 1 && r.quantity === 1));
  assert.deepEqual({ ...items.find((r) => r.set_number === "HW-07" && r.manufacturer === "Securitron") }, { set_number: "HW-07", set_name: "Electrified lever + mag lock", door_count: 2, component_type: "electromagnetic_lock", manufacturer: "Securitron", model: "M62", finish: null, quantity: 1, same: 1 });
  // The seed itself is untouched.
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_components c JOIN hardware_sets h ON c.set_id = h.id WHERE h.session_id = ?", SEED_SESSION_ID), 13);
});

test("a guest's copy is attributed to the seed owner; nothing is written when the batch fails", async () => {
  const db = seededDb();
  const guest = await cloneDemoBuilding({ DB: d1(db) }, { ephemeral: true, id: "eph_g1", userId: null });
  assert.equal(db.prepare("SELECT user_id FROM hardware_extraction_sessions WHERE id = ?").get(guest.session_id).user_id, "seedowner");
  const before = count(db, "SELECT COUNT(*) AS n FROM door_schedule_entries");
  await assert.rejects(cloneDemoBuilding({ DB: d1(db, { failOn: /INSERT INTO door_schedule_entries/ }) }, { userId: "acct2" }), /simulated failure/);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM door_schedule_entries"), before);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_extraction_sessions"), 2); // the seed and the guest copy
});

test("a seed without sets still gives a copy one set per door group (no parts), as before", async () => {
  const db = seededDb({ withSheetSets: false });
  const made = await cloneDemoBuilding({ DB: d1(db) }, { userId: "acct3" });
  assert.equal(made.hardware_sets, 8);
  assert.equal(made.hardware_components, 0);
  assert.equal(db.prepare("SELECT status FROM hardware_page_extractions WHERE session_id = ?").get(made.session_id).status, "bridge_generated");
});

function kv() {
  const m = new Map();
  return { m, async get(k, type) { const v = m.get(k); return v == null ? null : type === "json" ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); } };
}

async function call(router, env, token) {
  const req = new Request("https://weylandai.com/api/demo/weyland-building/session", { method: "POST", headers: { Authorization: "Bearer " + token, "CF-Connecting-IP": "203.0.113.9" } });
  const res = await router.handle(req, env, { waitUntil() {} });
  return { status: res.status, body: await res.json() };
}

test("the route hands back a complete copy, and replaces one that is gone or has no parts", async () => {
  const db = seededDb();
  const env = { DB: d1(db), CACHE: kv() };
  const users = { tA: { userId: "acctA", tenantId: "ven_weyland" }, tG: { ephemeral: true, id: "eph_G", userId: null } };
  let limited = 0;
  const limitCalls = [];
  const router = new NativeRouter();
  registerDemoBuildingRoutes(router, {
    authenticate: async (request) => { const t = (request.headers.get("Authorization") || "").replace(/^Bearer /, ""); return users[t] ? { user: users[t] } : { error: new Response("{}", { status: 401 }) }; },
    checkRateLimit: async (key, op, _env, limits) => { limited++; limitCalls.push([key, op, limits.requests, limits.windowSeconds]); return { limited: false }; },
  });
  const a1 = await call(router, env, "tA");
  assert.equal(a1.status, 201);
  assert.equal(a1.body.reused, false);
  assert.equal(a1.body.hardware_components, 13);
  const a2 = await call(router, env, "tA");
  assert.deepEqual([a2.status, a2.body.reused, a2.body.session_id], [200, true, a1.body.session_id]);
  assert.equal(limited, 1, "handing back a copy does not count toward the limit");
  // A copy made before this change (sets without parts): replaced.
  db.prepare("DELETE FROM hardware_components WHERE set_id IN (SELECT id FROM hardware_sets WHERE session_id = ?)").run(a1.body.session_id);
  const a3 = await call(router, env, "tA");
  assert.equal(a3.status, 201);
  assert.notEqual(a3.body.session_id, a1.body.session_id);
  // A copy that is gone (swept, or deleted by a test): replaced.
  db.prepare("DELETE FROM hardware_extraction_sessions WHERE id = ?").run(a3.body.session_id);
  const a4 = await call(router, env, "tA");
  assert.equal(a4.status, 201);
  // Guests get their own pointer.
  const g1 = await call(router, env, "tG");
  assert.equal(g1.status, 201);
  assert.ok(env.CACHE.m.has("demo-clone:eph:eph_G") && env.CACHE.m.has("demo-clone:user:acctA"));
  assert.equal((await call(router, env, "nobody")).status, 401);
  // The account's new copies counted toward the account; the guest's toward its network.
  assert.deepEqual(limitCalls.map((c) => c[0] + " " + c[2]), ["user:acctA 5", "user:acctA 5", "user:acctA 5", "203.0.113.9 20"]);
  assert.ok(limitCalls.every((c) => c[1] === "demo-trial-clone" && c[3] === 600));
});

test("a limited caller gets 429 with the wait, and nothing is written", async () => {
  const db = seededDb();
  const env = { DB: d1(db), CACHE: kv() };
  const router = new NativeRouter();
  registerDemoBuildingRoutes(router, {
    authenticate: async () => ({ user: { userId: "acctL", tenantId: "ven_weyland" } }),
    checkRateLimit: async () => ({ limited: true, retryAfter: 321 }),
  });
  const before = count(db, "SELECT COUNT(*) AS n FROM hardware_extraction_sessions");
  const r = await call(router, env, "any");
  assert.equal(r.status, 429);
  assert.equal(r.body.retryAfter, 321);
  assert.match(r.body.error, /for this account/);
  assert.equal(count(db, "SELECT COUNT(*) AS n FROM hardware_extraction_sessions"), before);
  assert.equal(env.CACHE.m.size, 0);
});

test("a guest's new copy counts toward its network (IPv6 by /64), an account's toward the account", () => {
  const g = demoCopyLimit({ ephemeral: true, id: "eph_1", userId: null }, "2001:db8:1:2:aaaa:bbbb:cccc:dddd");
  assert.deepEqual([g.key, g.limits.requests, g.limits.windowSeconds], ["2001:db8:1:2::/64", 20, 600]);
  assert.match(g.message, /from this network/);
  const a = demoCopyLimit({ userId: "acct9" }, "203.0.113.9");
  assert.deepEqual([a.key, a.limits.requests, a.limits.windowSeconds], ["user:acct9", 5, 600]);
  assert.match(a.message, /for this account/);
});

test("the network limit counts an IPv6 visitor by /64", () => {
  assert.equal(networkOf("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2::/64");
  assert.equal(networkOf("203.0.113.9"), "203.0.113.9");
  assert.equal(networkOf(null), "unknown");
});
