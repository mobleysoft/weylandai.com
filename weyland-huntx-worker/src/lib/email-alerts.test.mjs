// HuntX email digests through mailguyAI (2026-10-08).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { runEmailDigests, digestEmail } from "./email-alerts.js";
import { NativeRouter } from "./router.js";
import { registerHuntRoutes, resetSavedTableForTests } from "../routes/hunt.js";

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x.map((v) => (v === undefined ? null : v)); return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return { meta: { changes: 1 } }; } }; return st; } }; }

function setup() {
  resetSavedTableForTests();
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE users (id TEXT, email TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);
    CREATE TABLE opportunities (id TEXT, source TEXT, title TEXT, agency TEXT, location TEXT, category TEXT, key_date TEXT, estimated_value REAL, detail_url TEXT, trade_fit TEXT, state TEXT, created_at TEXT);
    CREATE TABLE huntx_saved_searches (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, params TEXT NOT NULL, last_seen_at TEXT NOT NULL, created_at TEXT NOT NULL, feed_token TEXT, email_alerts INTEGER DEFAULT 0, last_emailed_at TEXT, unsub_token TEXT);`);
  db.prepare("INSERT INTO users VALUES ('u1','pat@example.com','subconp','active',NULL)").run();
  db.prepare("INSERT INTO users VALUES ('u2','lapsed@example.com','free','canceled',NULL)").run();
  const o = db.prepare("INSERT INTO opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
  o.run("o1", "nyc_sca", "Door hardware replacement, PS 12", "NYC SCA", "Bronx, NY", "Construction", "2099-11-03", 250000, "https://example.org/1", "doors", "NY", "2026-10-08T05:00:00Z");
  o.run("o2", "nyc_sca", "Hollow metal frames, IS 44", "NYC SCA", "Queens, NY", "Construction", "2099-11-10", null, null, "doors", "NY", "2026-10-08T06:00:00Z");
  o.run("o3", "txdot", "US 59 overlay", "TxDOT", "Houston, TX", "Highway", "2099-11-01", 9000000, null, "civil", "TX", "2026-10-08T06:30:00Z");
  o.run("o0", "nyc_sca", "Old door job", "NYC SCA", "Bronx, NY", "Construction", "2099-10-30", 1, null, "doors", "NY", "2026-10-06T00:00:00Z");
  const s = db.prepare("INSERT INTO huntx_saved_searches (id, user_id, name, params, last_seen_at, created_at, email_alerts, last_emailed_at, unsub_token) VALUES (?,?,?,?,?,?,?,?,?)");
  s.run("s1", "u1", "Doors NY", JSON.stringify({ fit: "doors", state: "NY" }), "2026-10-01", "2026-10-01", 1, "2026-10-07T00:00:00Z", "a".repeat(32));
  s.run("s2", "u2", "Lapsed", JSON.stringify({}), "2026-10-01", "2026-10-01", 1, null, "b".repeat(32));
  s.run("s3", "u1", "Off", JSON.stringify({}), "2026-10-01", "2026-10-01", 0, null, "c".repeat(32));
  return { db, env: { DB: d1(db), MAILGUY_API_KEY: "test-key" } };
}

test("a digest goes to the owner with only the search's new notices; lapsed plans and searches with alerts off get nothing", async () => {
  const { db, env } = setup();
  const sent = [];
  const fetchImpl = async (url, init) => { sent.push({ url, auth: init.headers.Authorization, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ success: true, id: "m1" })); };
  const r = await runEmailDigests(env, { now: new Date("2026-10-08T12:00:00Z"), fetchImpl });
  assert.deepEqual([r.checked, r.sent, r.skipped, r.errors.length], [2, 1, 1, 0]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://mailguyai.com/api/v1/send");
  assert.equal(sent[0].auth, "Bearer test-key");
  assert.equal(sent[0].body.to, "pat@example.com");
  assert.equal(sent[0].body.subject, 'HuntX: 2 new notices for "Doors NY"');
  assert.match(sent[0].body.html, /Door hardware replacement, PS 12/);
  assert.doesNotMatch(sent[0].body.html, /US 59 overlay|Old door job/);
  assert.match(sent[0].body.text, /https:\/\/weylandai\.com\/api\/hunt\/unsubscribe\/a{32}/);
  assert.equal(db.prepare("SELECT last_emailed_at FROM huntx_saved_searches WHERE id='s1'").get().last_emailed_at, "2026-10-08T12:00:00.000Z");
  const again = await runEmailDigests(env, { now: new Date("2026-10-08T13:00:00Z"), fetchImpl });
  assert.equal(again.sent, 0, "at most one email a day per search");
});

test("without a mailguyAI key nothing runs, and a failed send does not mark the search emailed", async () => {
  const { db, env } = setup();
  assert.equal((await runEmailDigests({ ...env, MAILGUY_API_KEY: "" })).off, "MAILGUY_API_KEY is not set");
  const r = await runEmailDigests(env, { now: new Date("2026-10-08T12:00:00Z"), fetchImpl: async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) });
  assert.equal(r.errors.length, 1);
  assert.equal(db.prepare("SELECT last_emailed_at FROM huntx_saved_searches WHERE id='s1'").get().last_emailed_at, "2026-10-07T00:00:00Z");
});

test("routes: alerts toggle per search; the unsubscribe link turns them off without signing in", async () => {
  const { db, env } = setup();
  const r = new NativeRouter();
  registerHuntRoutes(r, { authenticate: async () => ({ user: { userId: "u1" } }) });
  const call = (m, path, body) => r.handle(new Request("https://weylandai.com" + path, { method: m, body: body ? JSON.stringify(body) : undefined }), env, {});
  const on = await (await call("POST", "/api/hunt/saved/s3/email", { on: true })).json();
  assert.equal(on.email_alerts, true);
  assert.equal(db.prepare("SELECT email_alerts FROM huntx_saved_searches WHERE id='s3'").get().email_alerts, 1);
  const list = await (await call("GET", "/api/hunt/saved")).json();
  assert.equal(list.emailAvailable, true);
  assert.equal(list.saved.find((x) => x.id === "s3").email_alerts, true);
  const page = await call("GET", "/api/hunt/unsubscribe/" + "c".repeat(32));
  assert.match(await page.text(), /Email alerts for “Off” are off/);
  assert.equal(db.prepare("SELECT email_alerts FROM huntx_saved_searches WHERE id='s3'").get().email_alerts, 0);
  assert.equal((await call("POST", "/api/hunt/saved/s3/email", { on: true }).then((x) => x)).status, 200);
  assert.equal((await r.handle(new Request("https://weylandai.com/api/hunt/saved/s3/email", { method: "POST", body: JSON.stringify({ on: true }) }), { ...env, MAILGUY_API_KEY: "" }, {})).status, 503);
});

test("the digest lists at most 25 and says how many more", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ title: "Job " + i }));
  const m = digestEmail({ name: "All", rows, total: 30, unsubscribeUrl: "https://x/u" });
  assert.equal((m.html.match(/Job \d+/g) || []).length, 25);
  assert.match(m.html, /5 more in HuntX/);
});

test("a sample goes now to the account's own address with the latest matches, once per 10 minutes, paid plans only", async () => {
  const { sendSample } = await import("./email-alerts.js");
  const { db, env } = setup();
  db.exec("ALTER TABLE huntx_saved_searches ADD COLUMN last_sample_at TEXT");
  const sent = [];
  const fetchImpl = async (_url, init) => { sent.push(JSON.parse(init.body)); return new Response(JSON.stringify({ success: true })); };
  const now = new Date("2026-10-09T12:00:00Z");
  const r = await sendSample(env, "u1", "s1", { now, fetchImpl });
  assert.deepEqual([r.sent, r.to, r.notices], [true, "pat@example.com", 3], "every open NY door notice, old or new");
  assert.equal(sent[0].subject, 'HuntX sample: the latest 3 notices for "Doors NY"');
  assert.match(sent[0].html, /A sample you asked for/);
  assert.doesNotMatch(sent[0].html, /US 59 overlay/);
  assert.equal((await sendSample(env, "u1", "s1", { now: new Date(now.getTime() + 5 * 60000), fetchImpl })).error[0], 429);
  assert.equal((await sendSample(env, "u1", "s1", { now: new Date(now.getTime() + 11 * 60000), fetchImpl })).sent, true);
  assert.equal((await sendSample(env, "u2", "s2", { now, fetchImpl })).error[0], 402, "a lapsed plan gets no email");
  assert.equal((await sendSample(env, "u2", "s1", { now, fetchImpl })).error[0], 402);
  db.prepare("UPDATE users SET subscription_status='active', subscription_tier='subconp' WHERE id='u2'").run();
  assert.equal((await sendSample(env, "u2", "s1", { now, fetchImpl })).error[0], 404, "another account's search");
  assert.equal((await sendSample({ ...env, MAILGUY_API_KEY: "" }, "u1", "s1", { now, fetchImpl })).error[0], 503);
  const failed = await sendSample(env, "u1", "s3", { now, fetchImpl: async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) });
  assert.deepEqual([failed.error[0], failed.error[1]], [502, "SEND_FAILED"]);
});
