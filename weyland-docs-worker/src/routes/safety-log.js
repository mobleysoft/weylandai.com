// weyland-docs-worker/src/routes/safety-log.js
//
// SafetyX's log (2026-10-08): what a safety report is FOR, after its lines are
// flagged. Reading a report stays in routes/docs.js; this is the account's
// running record across every report it has read:
//
//   GET    /api/safety-reports/reports            the reports, each flagged line with its
//                                                 hazard (OSHA Focus Four first) and outcome
//   GET    /api/safety-reports/trends             by hazard, month and project
//   GET    /api/safety-reports/actions            corrective actions (?status=open|closed)
//   POST   /api/safety-reports/actions            {reportId?, page?, line?, hazard?, action, owner?, due?}
//   PATCH  /api/safety-reports/actions/:id        {action?, owner?, due?, status?, note?}
//   DELETE /api/safety-reports/actions/:id
//   GET    /api/safety-reports/cases?year=        OSHA 300 log cases + the 300A totals
//   POST   /api/safety-reports/cases              a recordable case (29 CFR 1904.29 columns)
//   PATCH  /api/safety-reports/cases/:id
//   DELETE /api/safety-reports/cases/:id
// Output, paid (shared weyland-shared/output-access.js, tier "safetyx"):
//   GET    /api/safety-reports/actions.csv
//   GET    /api/safety-reports/osha300.csv?year=
//   POST   /api/safety-reports/osha300.pdf        {year, establishment} -> Form 300 + 300A
// Everything else is free for a signed-in account; a guest has no record to keep.

import { jsonResponse3 } from "../lib/json-response.js";
import { readFlag, trendsOf, HAZARD_BY_KEY } from "../lib/safety-hazards.js";
import { outputAccess, paymentRequired } from "../../../weyland-shared/output-access.js";

const OUTCOMES = ["death", "days_away", "restricted", "other"];
const TYPES = ["injury", "skin", "respiratory", "poisoning", "hearing", "other_illness"];
const TYPE_LABEL = { injury: "Injury", skin: "Skin disorder", respiratory: "Respiratory condition", poisoning: "Poisoning", hearing: "Hearing loss", other_illness: "All other illnesses" };

let ready = false;
export function resetForTests() { ready = false; }
async function ensure(db) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS safety_actions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, report_id TEXT, page INTEGER, line TEXT, hazard TEXT,
    action TEXT NOT NULL, owner TEXT, due TEXT, status TEXT NOT NULL DEFAULT 'open', note TEXT, closed_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS safety_cases (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, year INTEGER NOT NULL, case_no INTEGER NOT NULL,
    employee TEXT, privacy INTEGER NOT NULL DEFAULT 0, job_title TEXT, event_date TEXT, location TEXT, description TEXT,
    outcome TEXT NOT NULL, days_away INTEGER NOT NULL DEFAULT 0, days_restricted INTEGER NOT NULL DEFAULT 0, case_type TEXT NOT NULL,
    report_id TEXT, page INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`).run();
  ready = true;
}

const str = (v, n) => (v == null ? null : String(v).replace(/\s+/g, " ").trim().slice(0, n) || null);
const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : null);
const days = (v) => Math.max(0, Math.min(180, Math.round(Number(v) || 0))); // 1904.7(b)(3)(vii): cap at 180
const parseJson = (s, d) => { try { return JSON.parse(s); } catch (_) { return d; } };

export function cleanCase(b, prior = {}) {
  // A field left out keeps its earlier value (on edit) or is empty.
  const pick = (k, col, f) => (b[k] !== undefined ? f(b[k]) : prior[col] ?? null);
  const outcome = OUTCOMES.includes(b.outcome) ? b.outcome : prior.outcome || "other";
  const caseType = TYPES.includes(b.caseType) ? b.caseType : prior.case_type || "injury";
  const away = pick("daysAway", "days_away", days) || 0, restricted = pick("daysRestricted", "days_restricted", days) || 0;
  return {
    employee: pick("employee", "employee", (v) => str(v, 120)),
    privacy: b.privacy !== undefined ? (b.privacy ? 1 : 0) : prior.privacy || 0,
    job_title: pick("jobTitle", "job_title", (v) => str(v, 120)),
    event_date: pick("eventDate", "event_date", day),
    location: pick("location", "location", (v) => str(v, 160)),
    description: pick("description", "description", (v) => str(v, 600)),
    outcome,
    // Days away only count on a days-away case; a death has neither (1904.7).
    days_away: outcome === "days_away" ? away : 0,
    days_restricted: outcome === "death" ? 0 : restricted,
    case_type: caseType,
  };
}

/** Form 300A totals from the year's cases. */
export function summary300A(cases) {
  const t = { G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0 };
  for (const c of cases) {
    t[{ death: "G", days_away: "H", restricted: "I", other: "J" }[c.outcome] || "J"]++;
    t.K += Number(c.days_away) || 0;
    t.L += Number(c.days_restricted) || 0;
    t["M" + (TYPES.indexOf(c.case_type) + 1 || 1)]++;
  }
  return t;
}
/** Incidence rates (not on Form 300A; BLS method): cases x 200,000 / hours worked. */
export function rates(t, hours) {
  const h = Number(hours) || 0;
  if (h <= 0) return null;
  const r = (n) => Math.round((n * 200000 / h) * 100) / 100;
  return { trir: r(t.G + t.H + t.I + t.J), dart: r(t.H + t.I) };
}

const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
const nameOn300 = (c) => (c.privacy ? "Privacy Case" : c.employee || "");

export function osha300Html({ year, establishment: e = {}, cases, totals, rate }) {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const x = (on) => (on ? "X" : "");
  const rows = cases.map((c) => `<tr><td>${c.case_no}</td><td>${esc(nameOn300(c))}</td><td>${esc(c.job_title)}</td><td>${esc(c.event_date)}</td><td>${esc(c.location)}</td><td class="d">${esc(c.description)}</td>
    <td class="c">${x(c.outcome === "death")}</td><td class="c">${x(c.outcome === "days_away")}</td><td class="c">${x(c.outcome === "restricted")}</td><td class="c">${x(c.outcome === "other")}</td>
    <td class="c">${c.days_away || ""}</td><td class="c">${c.days_restricted || ""}</td>${TYPES.map((t) => `<td class="c">${x(c.case_type === t)}</td>`).join("")}</tr>`).join("");
  const addr = [e.street, [e.city, e.state].filter(Boolean).join(", "), e.zip].filter(Boolean).join(" ");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page{size:Letter landscape;margin:0.4in}body{font-family:Helvetica,Arial,sans-serif;font-size:8.5pt;color:#111}
  h1{font-size:14pt;margin:0}h2{font-size:12pt;margin:0 0 4px}.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:6px}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #555;padding:3px 4px;vertical-align:top}th{background:#eee;font-size:7.5pt}td.c{text-align:center}td.d{width:26%}
  .small{font-size:7.5pt;color:#333}.box{border:1px solid #555;padding:8px;margin-top:8px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.grid div b{display:block;font-size:13pt}
  .page{page-break-after:always}.sig{margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.sig div{border-top:1px solid #111;padding-top:3px;font-size:7.5pt}
  </style></head><body>
  <div class="page"><div class="top"><div><h1>OSHA's Form 300 (Rev. 01/2004) layout: Log of Work-Related Injuries and Illnesses</h1>
  <div class="small">Year ${esc(year)} · ${esc(e.name || "Establishment name")} · ${esc(addr)}</div></div>
  <div class="small">Attention: this form contains information relating to employee health and must be used in a manner that protects the confidentiality of employees to the extent possible while the information is being used for occupational safety and health purposes.</div></div>
  <table><thead><tr><th>(A) Case no.</th><th>(B) Employee's name</th><th>(C) Job title</th><th>(D) Date of injury or onset of illness</th><th>(E) Where the event occurred</th><th>(F) Describe injury or illness, parts of body affected, and object/substance that directly injured or made person ill</th>
  <th>(G) Death</th><th>(H) Days away from work</th><th>(I) Job transfer or restriction</th><th>(J) Other recordable cases</th><th>(K) Away from work (days)</th><th>(L) On job transfer or restriction (days)</th>
  <th>(M1) Injury</th><th>(M2) Skin disorder</th><th>(M3) Respiratory condition</th><th>(M4) Poisoning</th><th>(M5) Hearing loss</th><th>(M6) All other illnesses</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="18" class="c">No recordable cases entered for this year.</td></tr>'}</tbody>
  <tfoot><tr><th colspan="6" style="text-align:right">Page totals</th><th>${totals.G}</th><th>${totals.H}</th><th>${totals.I}</th><th>${totals.J}</th><th>${totals.K}</th><th>${totals.L}</th><th>${totals.M1}</th><th>${totals.M2}</th><th>${totals.M3}</th><th>${totals.M4}</th><th>${totals.M5}</th><th>${totals.M6}</th></tr></tfoot></table>
  <p class="small">Privacy cases (29 CFR 1904.29(b)(7)) show "Privacy Case" in column B; keep the names on a separate confidential list. Prepared with WeylandAI SafetyX in the layout of OSHA Form 300; an equivalent form is acceptable if it has the same information, is as readable and understandable, and is completed with the same instructions (29 CFR 1904.29(b)(4)).</p></div>
  <div><div class="top"><div><h1>OSHA's Form 300A (Rev. 01/2004) layout: Summary of Work-Related Injuries and Illnesses</h1><div class="small">Year ${esc(year)}</div></div>
  <div class="small">Post this summary from February 1 to April 30 of the year following the year covered (29 CFR 1904.32(b)(6)).</div></div>
  <div class="box"><h2>Number of cases</h2><div class="grid"><div><b>${totals.G}</b>(G) Total number of deaths</div><div><b>${totals.H}</b>(H) Total number of cases with days away from work</div><div><b>${totals.I}</b>(I) Total number of cases with job transfer or restriction</div><div><b>${totals.J}</b>(J) Total number of other recordable cases</div></div></div>
  <div class="box"><h2>Number of days</h2><div class="grid"><div><b>${totals.K}</b>(K) Total number of days away from work</div><div><b>${totals.L}</b>(L) Total number of days of job transfer or restriction</div></div></div>
  <div class="box"><h2>Injury and illness types</h2><div class="grid"><div><b>${totals.M1}</b>(M1) Injuries</div><div><b>${totals.M2}</b>(M2) Skin disorders</div><div><b>${totals.M3}</b>(M3) Respiratory conditions</div><div><b>${totals.M4}</b>(M4) Poisonings</div><div><b>${totals.M5}</b>(M5) Hearing loss</div><div><b>${totals.M6}</b>(M6) All other illnesses</div></div></div>
  <div class="box"><h2>Establishment information</h2><div class="grid">
    <div>Establishment name<b style="font-size:10pt">${esc(e.name)}</b></div><div>Street<b style="font-size:10pt">${esc(e.street)}</b></div><div>City, state, ZIP<b style="font-size:10pt">${esc([e.city, e.state].filter(Boolean).join(", "))} ${esc(e.zip)}</b></div><div>Industry description<b style="font-size:10pt">${esc(e.industry)}</b></div>
    <div>NAICS<b style="font-size:10pt">${esc(e.naics)}</b></div><div>Annual average number of employees<b style="font-size:10pt">${esc(e.avgEmployees)}</b></div><div>Total hours worked by all employees last year<b style="font-size:10pt">${esc(e.totalHours)}</b></div>
    <div>Incidence rates (computed, not part of Form 300A)<b style="font-size:10pt">${rate ? `TRIR ${rate.trir} · DART ${rate.dart}` : "enter hours worked"}</b></div></div></div>
  <div class="box small"><b>Sign here.</b> Knowingly falsifying this document may result in a fine. I certify that I have examined this document and that to the best of my knowledge the entries are true, accurate, and complete.
  <div class="sig"><div>Company executive: ${esc(e.executive)}</div><div>Title: ${esc(e.executiveTitle)}</div><div>Phone / date: ${esc(e.phone)}</div></div></div>
  <p class="small">Establishments in construction (NAICS 23) with 20-249 employees, and any establishment with 250 or more, submit the 300A data electronically to OSHA's Injury Tracking Application by March 2 (29 CFR 1904.41).</p></div>
  </body></html>`;
}

export function registerSafetyLogRoutes(router, { authenticate, puppeteer }) {
  async function who(request, env) {
    const { error, user } = await authenticate(request, env);
    if (error) return { error };
    if (!user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to keep a safety log." }, 401) };
    await ensure(env.DB);
    return { userId: String(user.userId) };
  }
  async function paid(env, userId, what) {
    return (await outputAccess(env, userId, "safetyx")).paid ? null : jsonResponse3(paymentRequired(what), 402);
  }
  async function reportsOf(env, userId, limit = 200) {
    let rows = [];
    try {
      rows = (await env.DB.prepare("SELECT id, project_name, report_type, report_date, reported_by, flagged_items, incident_count, page_count, created_at FROM safety_reports WHERE user_id = ? ORDER BY COALESCE(report_date, created_at) DESC LIMIT ?").bind(userId, limit).all()).results || [];
    } catch (_) { rows = []; }
    return rows.map((r) => ({ id: r.id, project: r.project_name, type: r.report_type, date: r.report_date || String(r.created_at || "").slice(0, 10), reportedBy: r.reported_by, pages: r.page_count, createdAt: r.created_at, flagged: (parseJson(r.flagged_items, []) || []).map(readFlag) }));
  }
  async function casesOf(env, userId, year) {
    return (await env.DB.prepare("SELECT * FROM safety_cases WHERE user_id = ? AND year = ? ORDER BY case_no").bind(userId, year).all()).results || [];
  }
  const yearOf = (u) => { const y = Number(new URL(u).searchParams.get("year")); return y >= 2000 && y <= 2100 ? y : new Date().getUTCFullYear(); };

  router.get("/api/safety-reports/reports", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const reports = await reportsOf(env, a.userId);
    const actions = (await env.DB.prepare("SELECT id, report_id, page, line, status FROM safety_actions WHERE user_id = ?").bind(a.userId).all()).results || [];
    const key = (r, p, l) => `${r}|${p}|${l}`;
    const byLine = new Map(actions.map((x) => [key(x.report_id, x.page, x.line), { id: x.id, status: x.status }]));
    for (const r of reports) for (const f of r.flagged) f.action = byLine.get(key(r.id, f.page, f.line)) || null;
    return jsonResponse3({ success: true, reports });
  });

  router.get("/api/safety-reports/trends", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const t = trendsOf(await reportsOf(env, a.userId, 500));
    const today = new Date().toISOString().slice(0, 10);
    const open = await env.DB.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN due IS NOT NULL AND due < ? THEN 1 ELSE 0 END) AS overdue FROM safety_actions WHERE user_id = ? AND status = 'open'").bind(today, a.userId).first();
    const year = new Date().getUTCFullYear();
    const cases = await casesOf(env, a.userId, year);
    return jsonResponse3({ success: true, ...t, openActions: open?.n || 0, overdueActions: open?.overdue || 0, casesThisYear: cases.length });
  });

  router.get("/api/safety-reports/actions", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const status = new URL(request.url).searchParams.get("status");
    const rows = (await env.DB.prepare(`SELECT * FROM safety_actions WHERE user_id = ?${status === "open" || status === "closed" ? " AND status = ?" : ""} ORDER BY status DESC, COALESCE(due, '9999') ASC, created_at DESC LIMIT 500`)
      .bind(...[a.userId, ...(status === "open" || status === "closed" ? [status] : [])]).all()).results || [];
    return jsonResponse3({ success: true, actions: rows.map((r) => ({ ...r, hazardLabel: HAZARD_BY_KEY[r.hazard]?.label || null })) });
  });

  router.post("/api/safety-reports/actions", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const b = await request.json().catch(() => ({}));
    const action = str(b.action, 500);
    if (!action) return jsonResponse3({ success: false, message: "Say what will be done." }, 400);
    const hazard = HAZARD_BY_KEY[b.hazard] ? b.hazard : (b.line ? readFlag({ line: b.line }).hazard.key : "other");
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO safety_actions (id, user_id, report_id, page, line, hazard, action, owner, due, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)")
      .bind(id, a.userId, str(b.reportId, 60), Number(b.page) || null, str(b.line, 600), hazard, action, str(b.owner, 120), day(b.due), now, now).run();
    return jsonResponse3({ success: true, id });
  });

  router.patch("/api/safety-reports/actions/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const row = await env.DB.prepare("SELECT * FROM safety_actions WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).first();
    if (!row) return jsonResponse3({ success: false, message: "Not found." }, 404);
    const b = await request.json().catch(() => ({}));
    const status = b.status === "closed" || b.status === "open" ? b.status : row.status;
    const now = new Date().toISOString();
    await env.DB.prepare("UPDATE safety_actions SET action = ?, owner = ?, due = ?, status = ?, note = ?, closed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(b.action !== undefined ? str(b.action, 500) || row.action : row.action, b.owner !== undefined ? str(b.owner, 120) : row.owner, b.due !== undefined ? day(b.due) : row.due, status,
        b.note !== undefined ? str(b.note, 500) : row.note, status === "closed" ? row.closed_at || now : null, now, row.id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.delete("/api/safety-reports/actions/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await env.DB.prepare("DELETE FROM safety_actions WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.get("/api/safety-reports/actions.csv", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const no = await paid(env, a.userId, "The corrective action log export"); if (no) return no;
    const rows = (await env.DB.prepare("SELECT * FROM safety_actions WHERE user_id = ? ORDER BY created_at").bind(a.userId).all()).results || [];
    const body = csv([["Opened", "Hazard", "Finding (report line)", "Page", "Corrective action", "Owner", "Due", "Status", "Closed", "Note"],
      ...rows.map((r) => [r.created_at.slice(0, 10), HAZARD_BY_KEY[r.hazard]?.label || "", r.line, r.page, r.action, r.owner, r.due, r.status, (r.closed_at || "").slice(0, 10), r.note])]);
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="SafetyX-corrective-actions.csv"' } });
  });

  router.get("/api/safety-reports/cases", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const year = yearOf(request.url);
    const cases = await casesOf(env, a.userId, year);
    return jsonResponse3({ success: true, year, cases, totals: summary300A(cases) });
  });

  router.post("/api/safety-reports/cases", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const b = await request.json().catch(() => ({}));
    const c = cleanCase(b);
    if (!c.description) return jsonResponse3({ success: false, message: "Describe the injury or illness (column F)." }, 400);
    const year = Number((c.event_date || "").slice(0, 4)) || new Date().getUTCFullYear();
    const last = await env.DB.prepare("SELECT MAX(case_no) AS n FROM safety_cases WHERE user_id = ? AND year = ?").bind(a.userId, year).first();
    const id = crypto.randomUUID(), now = new Date().toISOString(), caseNo = (last?.n || 0) + 1;
    await env.DB.prepare("INSERT INTO safety_cases (id, user_id, year, case_no, employee, privacy, job_title, event_date, location, description, outcome, days_away, days_restricted, case_type, report_id, page, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, a.userId, year, caseNo, c.employee, c.privacy, c.job_title, c.event_date, c.location, c.description, c.outcome, c.days_away, c.days_restricted, c.case_type, str(b.reportId, 60), Number(b.page) || null, now, now).run();
    return jsonResponse3({ success: true, id, caseNo, year });
  });

  router.patch("/api/safety-reports/cases/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const row = await env.DB.prepare("SELECT * FROM safety_cases WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).first();
    if (!row) return jsonResponse3({ success: false, message: "Not found." }, 404);
    const c = cleanCase(await request.json().catch(() => ({})), row);
    await env.DB.prepare("UPDATE safety_cases SET employee = ?, privacy = ?, job_title = ?, event_date = ?, location = ?, description = ?, outcome = ?, days_away = ?, days_restricted = ?, case_type = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(c.employee, c.privacy, c.job_title, c.event_date, c.location, c.description, c.outcome, c.days_away, c.days_restricted, c.case_type, new Date().toISOString(), row.id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.delete("/api/safety-reports/cases/:id", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    await env.DB.prepare("DELETE FROM safety_cases WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).run();
    return jsonResponse3({ success: true });
  });

  router.get("/api/safety-reports/osha300.csv", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const no = await paid(env, a.userId, "The OSHA 300 log export"); if (no) return no;
    const year = yearOf(request.url);
    const cases = await casesOf(env, a.userId, year);
    const body = csv([["(A) Case no.", "(B) Employee's name", "(C) Job title", "(D) Date", "(E) Where", "(F) Description", "(G) Death", "(H) Days away", "(I) Job transfer or restriction", "(J) Other recordable", "(K) Days away", "(L) Days restricted", "(M) Type"],
      ...cases.map((c) => [c.case_no, nameOn300(c), c.job_title, c.event_date, c.location, c.description, c.outcome === "death" ? "X" : "", c.outcome === "days_away" ? "X" : "", c.outcome === "restricted" ? "X" : "", c.outcome === "other" ? "X" : "", c.days_away, c.days_restricted, TYPE_LABEL[c.case_type]])]);
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="OSHA-300-${year}.csv"` } });
  });

  router.post("/api/safety-reports/osha300.pdf", async (request, env) => {
    const a = await who(request, env); if (a.error) return a.error;
    const no = await paid(env, a.userId, "Downloading the OSHA 300 and 300A forms"); if (no) return no;
    const b = await request.json().catch(() => ({}));
    const year = Number(b.year) >= 2000 && Number(b.year) <= 2100 ? Number(b.year) : new Date().getUTCFullYear();
    const e = {};
    for (const k of ["name", "street", "city", "state", "zip", "industry", "naics", "avgEmployees", "totalHours", "executive", "executiveTitle", "phone"]) e[k] = str(b.establishment?.[k], 160) || "";
    const cases = await casesOf(env, a.userId, year);
    const totals = summary300A(cases);
    const html = osha300Html({ year, establishment: e, cases, totals, rate: rates(totals, String(e.totalHours).replace(/[,\s]/g, "")) });
    const browser = await puppeteer.launch(env.BROWSER);
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({ format: "Letter", landscape: true, printBackground: true, margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" } });
      return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="OSHA-300-300A-${year}.pdf"` } });
    } finally {
      await browser.close();
    }
  });
}
