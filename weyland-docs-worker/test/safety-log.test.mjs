// SafetyX's reading of a flagged line and the account's safety log.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { NativeRouter } from "../src/lib/router.js";
import { hazardOf, outcomeOf, trendsOf } from "../src/lib/safety-hazards.js";
import { classifySafety } from "../src/lib/classify.js";
import { registerSafetyLogRoutes, resetForTests, summary300A, rates, cleanCase, osha300Html } from "../src/routes/safety-log.js";

const WEEK = [
  "WEEKLY SAFETY REPORT - Riverside Commons Phase II",
  "Mon 9/28: Toolbox talk on ladder safety. 14 attendees.",
  "Mon 9/28: Door installer not wearing safety glasses while drilling frame anchors - corrected on the spot.",
  "Tue 9/29: Near miss - unsecured door slab fell from cart in corridor B, no injury.",
  "Tue 9/29: Guardrail missing at level 3 stair opening; fall protection not used by framing crew. Stopped work.",
  "Wed 9/30: Laborer cut left hand on frame edge, first aid only (bandage), returned to work.",
  "Wed 9/30: Housekeeping: debris in corridor 2, resolved by end of day.",
  "Thu 10/01: Electrician installing card reader found energized conductor; lockout/tagout not applied. Work stopped.",
  "Fri 10/02: Hardware installer strained lower back lifting 3070 HM door; sent to clinic, prescribed medication, restricted duty 3 days.",
  "Fri 10/02: All PPE worn on site visit. No hazards observed in area A.",
].join("\n");

test("the word list flags injuries told without the word 'injury' (a cut, a strained back)", () => {
  const r = classifySafety([{ page: 1, text: WEEK }]);
  assert.equal(r.incidentCount, 6);
  assert.ok(r.flagged.some((f) => /cut left hand/.test(f.line)));
  assert.ok(r.flagged.some((f) => /strained lower back/.test(f.line)));
  assert.ok(!r.flagged.some((f) => /No hazards observed/.test(f.line)), "a line that denies a hazard is clear");
});

test("each finding gets its OSHA hazard (a falling object is struck-by, not a fall) and a 1904.7 outcome", () => {
  const lines = WEEK.split("\n");
  const read = (i) => [hazardOf(lines[i]).key, outcomeOf(lines[i])?.outcome || null, outcomeOf(lines[i])?.recordable || null];
  assert.deepEqual(read(2), ["ppe", null, null]);
  assert.deepEqual(read(3), ["struck", "near_miss", "no"]);
  assert.deepEqual(read(4), ["fall", null, null]);
  assert.deepEqual(read(5), ["cuts", "first_aid", "no"]);
  assert.deepEqual(read(7), ["electrical", null, null]);
  assert.deepEqual(read(8), ["lifting", "restricted", "yes"]);
  assert.equal(outcomeOf("Worker fell from 6 ft ladder, fractured wrist, hospitalized overnight").outcome, "severe");
  assert.equal(outcomeOf("Employee died at the scene").recordable, "yes");
  assert.equal(hazardOf("Electrician installing card reader").key, "other", "a trade name alone is not an electrical hazard");
});

test("trends: by hazard, Focus Four share, by month", () => {
  const flagged = classifySafety([{ page: 1, text: WEEK }]).flagged;
  const t = trendsOf([{ id: "r1", project: "Riverside", date: "2026-10-02", flagged }, { id: "r2", project: "Majestic", date: "2026-09-15", flagged: [{ line: "Worker fell from ladder" }] }]);
  assert.equal(t.total, 7);
  assert.equal(t.focusFour, 4); // struck, fall, electrical, fall
  assert.equal(t.hazards[0].key, "fall");
  assert.deepEqual(t.months.map((m) => [m.month, m.total]), [["2026-09", 1], ["2026-10", 6]]);
  assert.equal(t.recordableHints, 1);
  assert.equal(t.nearMisses, 1);
});

test("300A totals, incidence rates and the 180-day cap", () => {
  const cases = [
    { outcome: "days_away", days_away: 12, days_restricted: 5, case_type: "injury" },
    { outcome: "restricted", days_away: 0, days_restricted: 3, case_type: "injury" },
    { outcome: "other", days_away: 0, days_restricted: 0, case_type: "hearing" },
  ];
  const t = summary300A(cases);
  assert.deepEqual([t.G, t.H, t.I, t.J, t.K, t.L, t.M1, t.M5], [0, 1, 1, 1, 12, 8, 2, 1]);
  assert.deepEqual(rates(t, 100000), { trir: 6, dart: 4 });
  assert.equal(rates(t, 0), null);
  assert.equal(cleanCase({ outcome: "days_away", daysAway: 400, description: "x" }).days_away, 180);
  assert.equal(cleanCase({ outcome: "other", daysAway: 4, description: "x" }).days_away, 0, "days away only for a days-away case");
  const html = osha300Html({ year: 2026, establishment: { name: "Bay Door" }, cases: [{ case_no: 1, privacy: 1, employee: "Pat Lee", outcome: "other", case_type: "injury", days_away: 0, days_restricted: 0 }], totals: t, rate: rates(t, 100000) });
  assert.ok(html.includes("Privacy Case") && !html.includes("Pat Lee"), "a privacy case keeps the name off the log");
});

function d1(db) { return { prepare(sql) { let a = []; const st = { bind(...x) { a = x; return st; }, async first() { const r = db.prepare(sql).get(...a); return r ? { ...r } : null; }, async all() { return { results: db.prepare(sql).all(...a).map((r) => ({ ...r })) }; }, async run() { db.prepare(sql).run(...a); return {}; } }; return st; } }; }

test("routes: findings with hazards, actions open and close, cases numbered per year, exports need payment", async () => {
  resetForTests();
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE safety_reports (id TEXT, user_id TEXT, tenant_id TEXT, project_name TEXT, report_type TEXT, report_date TEXT, reported_by TEXT, raw_text TEXT, incident_count INTEGER, clear_count INTEGER, flagged_items TEXT, page_count INTEGER, r2_key TEXT, status TEXT, created_at TEXT, updated_at TEXT); CREATE TABLE users (id TEXT, subscription_tier TEXT, subscription_status TEXT, trial_ends_at TEXT);");
  const flagged = classifySafety([{ page: 1, text: WEEK }]).flagged;
  db.prepare("INSERT INTO safety_reports (id, user_id, project_name, report_type, report_date, flagged_items, page_count, created_at) VALUES (?,?,?,?,?,?,?,?)").run("r1", "u1", "Riverside Commons", "Weekly", "2026-10-02", JSON.stringify(flagged), 1, "2026-10-02T12:00:00Z");
  db.prepare("INSERT INTO safety_reports (id, user_id, project_name, flagged_items, created_at) VALUES ('r9','u2','Other','[]','2026-10-01')").run();
  db.prepare("INSERT INTO users VALUES ('u1','free','trialing',NULL)").run();
  const env = { DB: d1(db) };
  const r = new NativeRouter();
  registerSafetyLogRoutes(r, { authenticate: async (req) => ({ user: req.headers.get("x-guest") ? { ephemeral: true } : { userId: "u1" } }), puppeteer: null });
  const call = (m, path, body, h = {}) => r.handle(new Request("https://weylandai.com" + path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined }), env, {});
  const json = async (res) => res.json();

  assert.equal((await call("GET", "/api/safety-reports/reports", null, { "x-guest": "1" })).status, 401);
  const rep = await json(await call("GET", "/api/safety-reports/reports"));
  assert.equal(rep.reports.length, 1, "only the account's own reports");
  const strain = rep.reports[0].flagged.find((f) => /strained/.test(f.line));
  assert.equal(strain.hazard.key, "lifting");
  assert.equal(strain.outcome.recordable, "yes");

  const made = await json(await call("POST", "/api/safety-reports/actions", { reportId: "r1", page: 1, line: strain.line, action: "Two-person lift for HM doors over 100 lb; review at Monday toolbox talk", owner: "R. Alvarez", due: "2026-10-09" }));
  assert.ok(made.success);
  const again = await json(await call("GET", "/api/safety-reports/reports"));
  assert.equal(again.reports[0].flagged.find((f) => /strained/.test(f.line)).action.status, "open");
  await call("PATCH", "/api/safety-reports/actions/" + made.id, { status: "closed", note: "Done 10/5" });
  const closed = await json(await call("GET", "/api/safety-reports/actions?status=closed"));
  assert.equal(closed.actions.length, 1);
  assert.equal(closed.actions[0].hazardLabel, "Lifting and material handling");
  assert.ok(closed.actions[0].closed_at);

  const c1 = await json(await call("POST", "/api/safety-reports/cases", { employee: "Pat Lee", jobTitle: "Hardware installer", eventDate: "2026-10-02", location: "Riverside Commons, corridor B", description: "Lower back strain lifting a 3070 HM door", outcome: "restricted", daysRestricted: 3 }));
  const c2 = await json(await call("POST", "/api/safety-reports/cases", { employee: "Sam Ortiz", eventDate: "2026-11-12", description: "Laceration, left hand, sutures", outcome: "other" }));
  assert.deepEqual([c1.caseNo, c2.caseNo, c1.year], [1, 2, 2026], JSON.stringify(c2));
  const log = await json(await call("GET", "/api/safety-reports/cases?year=2026"));
  assert.deepEqual([log.totals.I, log.totals.J, log.totals.L], [1, 1, 3]);
  const tr = await json(await call("GET", "/api/safety-reports/trends"));
  assert.equal(tr.total, 6);
  assert.equal(tr.openActions, 0);

  const csv = await call("GET", "/api/safety-reports/osha300.csv?year=2026");
  assert.equal(csv.status, 402, "a trial account reads and logs for free; the export is paid");
  assert.equal((await call("POST", "/api/safety-reports/osha300.pdf", { year: 2026 })).status, 402);
  db.prepare("UPDATE users SET subscription_tier = 'subconp', subscription_status = 'active' WHERE id = 'u1'").run();
  const paid = await call("GET", "/api/safety-reports/osha300.csv?year=2026");
  assert.equal(paid.status, 200);
  const text = await paid.text();
  assert.match(text, /Pat Lee/);
  assert.match(text, /Lower back strain/);
  const acts = await call("GET", "/api/safety-reports/actions.csv");
  assert.match(await acts.text(), /Two-person lift/);
});

test("InspecX flags NFPA 80 fire-door deficiencies (painted-over label, gap exceeding 1/8 in., propped open, does not latch)", async () => {
  const { classifyInspection } = await import("../src/lib/classify.js");
  const text = ["Door 101: Closer leaking oil, does not latch.", "Door 102: Pass - self-closing and positive latching.", "Door 105: Fire label painted over; gap at meeting stile exceeds 1/8 in.", "Door 106: No deficiencies noted.", "Door 107: Door propped open with wedge at time of inspection."].join("\n");
  const r = classifyInspection([{ page: 1, text }]);
  assert.deepEqual(r.flagged.map((f) => f.line.slice(0, 8)), ["Door 101", "Door 105", "Door 107"]);
});
