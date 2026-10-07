import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NativeRouter } from "../lib/router.js";
import { registerProposalsRoutes, bytesToBase64 } from "./proposals.js";
import { deriveLines, listSources, loadSource, DEMO_SEED_SESSION_ID, DEMO_SOURCE_ID } from "../lib/proposal-sources.js";
import { generateQuoteHtml } from "../lib/quote-html.js";

const SEED_DOORS = [
  { mark: "D-101", door_type: "Aluminum Storefront", hardware_group: "HW-01", location: "Main Lobby Entry" },
  { mark: "D-118A", door_type: "Hollow Metal", hardware_group: "HW-07", location: "IT / Server Room" },
  { mark: "D-310", door_type: "Hollow Metal", hardware_group: "HW-07", location: "Data Closet" },
  { mark: "D-207", door_type: "Wood, Solid Core", hardware_group: "HW-03", location: "Break Room" },
];

// Fake D1 keyed on the SQL the loaders and routes issue.
function fakeDb({ sessions = [], sessionDoors = {}, sets = {}, comps = {}, submittals = [], inserted = [] } = {}) {
  const db = {
    inserted,
    prepare(sql) {
      const stmt = { args: [] };
      stmt.bind = (...a) => { stmt.args = a; return stmt; };
      stmt.all = async () => {
        if (sql.includes("FROM hardware_extraction_sessions h WHERE h.user_id")) return { results: sessions.filter((s) => s.user_id === stmt.args[0]) };
        if (sql.includes("FROM submittals s WHERE s.user_id")) return { results: submittals.filter((s) => s.user_id === stmt.args[0]) };
        if (sql.includes("FROM door_schedule_entries WHERE session_id")) return { results: (sessionDoors[stmt.args[0]] || {}).dse || [] };
        if (sql.includes("FROM door_hardware_matrix WHERE session_id")) return { results: stmt.args[0] === DEMO_SEED_SESSION_ID ? SEED_DOORS : ((sessionDoors[stmt.args[0]] || {}).dhm || []) };
        if (sql.includes("FROM hardware_sets WHERE session_id")) return { results: sets[stmt.args[0]] || [] };
        if (sql.includes("FROM hardware_components c")) return { results: comps[stmt.args[0]] || [] };
        if (sql.includes("FROM proposals WHERE user_id")) return { results: inserted.filter((r) => r.user_id === stmt.args[0]) };
        return { results: [] };
      };
      stmt.first = async () => {
        if (sql.includes("COUNT(DISTINCT hardware_set_number)")) return { n: 3 };
        if (sql.includes("COUNT(*) AS n FROM door_hardware_matrix")) return { n: SEED_DOORS.length };
        if (sql.includes("FROM hardware_extraction_sessions WHERE id = ? AND user_id = ?")) return sessions.find((s) => s.id === stmt.args[0] && s.user_id === stmt.args[1]) || null;
        if (sql.includes("FROM submittals WHERE id = ? AND user_id = ?")) return submittals.find((s) => s.id === stmt.args[0] && s.user_id === stmt.args[1]) || null;
        if (sql.includes("FROM projects WHERE id")) return { name: "The WeylandAI Building", client_name: "WeylandAI (internal)", project_address: "4400 Bluestem Parkway, Austin, TX" };
        if (sql.includes("FROM vendor_profile")) return null;
        if (sql.includes("MAX(quote_number)")) return { next_number: 41 };
        return null;
      };
      stmt.run = async () => {
        if (sql.includes("INSERT INTO proposals")) inserted.push({ id: stmt.args[0], submittal_id: stmt.args[1], user_id: stmt.args[2], quote_number: stmt.args[18], grand_total: stmt.args[16] });
        return { success: true };
      };
      return stmt;
    },
  };
  return db;
}

const fakePuppeteer = { launch: async () => ({ newPage: async () => ({ setContent: async () => {}, pdf: async () => new TextEncoder().encode("%PDF-1.7 fake") }), close: async () => {} }) };

function setup(user, db, r2 = []) {
  const router = new NativeRouter();
  registerProposalsRoutes(router, {
    authenticate: async () => ({ user }),
    requireProductAccess: async () => null,
    generateQuoteHtml,
    puppeteer: fakePuppeteer,
  });
  const env = { DB: db, UPLOADS: { put: async (k, v) => { r2.push(k); } } };
  return { router, env, r2 };
}

test("deriveLines: one line per door type and per hardware set, with the openings they cover; no invented prices", () => {
  const lines = deriveLines(SEED_DOORS, []);
  const doors = lines.filter((l) => l.kind === "door");
  const hw = lines.filter((l) => l.kind === "hardware");
  assert.deepEqual(doors.map((l) => [l.description, l.quantity]), [["Door - Aluminum Storefront", 1], ["Door - Hollow Metal", 2], ["Door - Wood, Solid Core", 1]]);
  assert.deepEqual(hw.map((l) => [l.description, l.quantity]), [["Hardware set HW-01", 1], ["Hardware set HW-07", 2], ["Hardware set HW-03", 1]]);
  assert.ok(lines.every((l) => l.unitPrice === 0 && l.priceSource === "enter"));
  assert.match(hw[1].notes, /D-118A, D-310/);
});

test("deriveLines: a hardware set price comes only from the schedule (override, else priced components)", () => {
  const doors = [{ mark: "1", door_type: "HM", hardware_group: "A" }, { mark: "2", door_type: "HM", hardware_group: "B" }];
  const sets = [
    { set_number: "A", unit_price_override: 900, components: [] },
    { set_number: "B", components: [{ component_type: "closer", quantity: 1, unit_price: 300 }, { component_type: "hinge", quantity: 3, list_price: 20 }, { component_type: "lock", quantity: 1 }] },
    { set_number: "C", door_count: 4, components: [] },
  ];
  const hw = deriveLines(doors, sets).filter((l) => l.kind === "hardware");
  const by = Object.fromEntries(hw.map((l) => [l.description, l]));
  assert.equal(by["Hardware set A"].unitPrice, 900);
  assert.equal(by["Hardware set B"].unitPrice, 360);
  assert.match(by["Hardware set B"].priceSource, /2 of 3 components/);
  assert.equal(by["Hardware set C"].quantity, 4);
  assert.equal(by["Hardware set C"].unitPrice, 0);
});

test("sources: a guest gets the demo schedule only; an account sees its own sessions (one demo copy) and submittals", async () => {
  const guest = await listSources(fakeDb(), { ephemeral: true, userId: null });
  assert.equal(guest.hasOwn, false);
  assert.deepEqual(guest.sources.map((s) => [s.kind, s.id]), [["demo", DEMO_SOURCE_ID]]);
  const db = fakeDb({
    sessions: [
      { id: "s-new", user_id: "u1", project_name: "Tower A", filename: "a.pdf", file_buffer_key: "hardware-sessions/u1/x", created_at: "2026-10-07", dse: 12, dhm: 0, sets: 3 },
      { id: "c-2", user_id: "u1", project_name: "The WeylandAI Building", filename: "weyland_building_schedule.pdf", file_buffer_key: "demo-clone/c-2", created_at: "2026-10-06", dse: 10, dhm: 10, sets: 9 },
      { id: "c-1", user_id: "u1", project_name: "The WeylandAI Building", filename: "weyland_building_schedule.pdf", file_buffer_key: "demo-clone/c-1", created_at: "2026-10-05", dse: 10, dhm: 10, sets: 9 },
      { id: "empty", user_id: "u1", project_name: "Nothing", file_buffer_key: "x", created_at: "2026-10-04", dse: 0, dhm: 0, sets: 0 },
    ],
    submittals: [{ id: "sub1", user_id: "u1", project_name: "Old", status: "review", created_at: "2026-09-01", doors: 0 }],
  });
  const acct = await listSources(db, { userId: "u1" });
  assert.equal(acct.hasOwn, true);
  assert.deepEqual(acct.sources.map((s) => s.id), ["s-new", "c-2", "sub1"]);
  assert.equal(acct.sources[1].demo, true);
});

test("loadSource: never reads another account's session; the demo is readable by anyone", async () => {
  const db = fakeDb({ sessions: [{ id: "s1", user_id: "u1", project_name: "Tower A" }] });
  assert.equal(await loadSource(db, { userId: "u2" }, "session", "s1"), null);
  assert.equal(await loadSource(db, { ephemeral: true, userId: null }, "session", "s1"), null);
  const demo = await loadSource(db, { ephemeral: true, userId: null }, "demo", DEMO_SOURCE_ID);
  assert.equal(demo.doors.length, 4);
  assert.equal(demo.project.project_address, "4400 Bluestem Parkway, Austin, TX");
  assert.equal(await loadSource(db, { userId: "u1" }, "demo", "something-else"), null);
});

test("generate: a guest prices the demo schedule and gets the PDF inline; nothing stored", async () => {
  const db = fakeDb();
  const { router, env, r2 } = setup({ ephemeral: true, userId: null, id: "eph_1", ephemeralToken: "t" }, db);
  const res = await router.handle(new Request("https://weylandai.com/api/proposals/generate", { method: "POST", body: JSON.stringify({ source: { kind: "demo", id: DEMO_SOURCE_ID }, lineItems: [{ description: "Door - Hollow Metal", quantity: 2, unitPrice: 485 }], taxRate: 0.0825 }) }), env, {});
  const d = await res.json();
  assert.equal(res.status, 200, JSON.stringify(d));
  assert.equal(d.stored, false);
  assert.equal(d.quoteNumber, "PREVIEW");
  assert.equal(d.subtotal, 970);
  assert.ok(Math.abs(d.grandTotal - 1050.025) < 1e-9);
  assert.equal(Buffer.from(d.pdfBase64, "base64").toString().slice(0, 4), "%PDF");
  assert.equal(r2.length, 0);
  assert.equal(db.inserted.length, 0);
});

test("generate: an account prices its own session; stored with a quote number; another account gets 404", async () => {
  const db = fakeDb({ sessions: [{ id: "s1", user_id: "u1", project_name: "Tower A", project_id: "p1" }], sessionDoors: { s1: { dse: [{ mark: "101", door_type: "HM", hardware_group: "1" }] } } });
  const { router, env, r2 } = setup({ userId: "u1", tenantId: "ven_weyland" }, db);
  const res = await router.handle(new Request("https://weylandai.com/api/proposals/generate", { method: "POST", body: JSON.stringify({ source: { kind: "session", id: "s1" } }) }), env, {});
  const d = await res.json();
  assert.equal(res.status, 200, JSON.stringify(d));
  assert.equal(d.stored, true);
  assert.equal(d.quoteNumber, 41);
  assert.equal(d.lineItemCount, 2);
  assert.equal(d.doorCount, 1);
  assert.match(d.downloadUrl, /^\/api\/proposals\/.+\/download$/);
  assert.deepEqual(r2.map((k) => k.split("/").slice(0, 2).join("/")), ["proposals/s1"]);
  assert.equal(db.inserted[0].submittal_id, "s1");
  const other = setup({ userId: "u2" }, db);
  const res2 = await other.router.handle(new Request("https://weylandai.com/api/proposals/generate", { method: "POST", body: JSON.stringify({ source: { kind: "session", id: "s1" } }) }), other.env, {});
  assert.equal(res2.status, 404);
});

test("generate: legacy { submittalId } still works and still 404s for a submittal the caller does not own", async () => {
  const db = fakeDb({ submittals: [{ id: "sub1", user_id: "u1", project_name: "Old" }] });
  const { router, env } = setup({ userId: "u2" }, db);
  const res = await router.handle(new Request("https://weylandai.com/api/proposals/generate", { method: "POST", body: JSON.stringify({ submittalId: "sub1" }) }), env, {});
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "Submittal not found");
});

test("sources routes answer JSON; mine lists only the caller's proposals", async () => {
  const inserted = [{ id: "p1", user_id: "u1", quote_number: 7, grand_total: 10 }, { id: "p2", user_id: "u9", quote_number: 8, grand_total: 20 }];
  const db = fakeDb({ inserted });
  const { router, env } = setup({ userId: "u1" }, db);
  const s = await (await router.handle(new Request("https://weylandai.com/api/proposals/sources"), env, {})).json();
  assert.equal(s.session, "account");
  assert.equal(s.sources[0].kind, "demo");
  const one = await router.handle(new Request("https://weylandai.com/api/proposals/sources/demo/" + DEMO_SOURCE_ID), env, {});
  assert.equal(one.status, 200);
  assert.equal((await one.json()).lines.length, 6);
  const mine = await (await router.handle(new Request("https://weylandai.com/api/proposals/mine"), env, {})).json();
  assert.deepEqual(mine.proposals.map((p) => p.id), ["p1"]);
});

test("bytesToBase64 round-trips", () => {
  const u8 = new Uint8Array(70000).map((_, i) => i % 251);
  assert.deepEqual(new Uint8Array(Buffer.from(bytesToBase64(u8), "base64")), u8);
});

test("page: no dead end to 'Create one in SubX first'; sources come from /api/proposals/sources", () => {
  const html = readFileSync(new URL("../pages/propx-app.html", import.meta.url), "utf8");
  assert.ok(!/Create one in/.test(html));
  assert.ok(html.includes('api("/api/proposals/sources")'));
  assert.ok(html.includes("window.WeylandPage.openApp(\"/subx-app\")"));
});
