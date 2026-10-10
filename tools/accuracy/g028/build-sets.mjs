#!/usr/bin/env node
// g028: SightX on the three best real buildings (tools/accuracy/g020/REPORT.md).
//
//   node tools/accuracy/g028/build-sets.mjs
//
// For each set, the door rows are the schedule rows in tools/accuracy/g020/<sha16>.json
// (harvest_schedule_marks, each with its page; the row text is cut from that page's schedule
// line, from the mark to the next mark on the line, since these sheets print two schedule
// columns side by side). The plan is the same file's harvest_marks_plan (weyland-shared/
// plan-read.js run with those marks). The model is built by the production SightX code
// (modelFromSubx + attachPlan) and written to weyland-sightx-worker/src/data/sets/<sha16>.json,
// served at /api/sightx/sets/<sha16> and opened by /sightx/?set=<sha16>.
//
// The 3D never outruns the data: a door is drawn only for a schedule row; a row whose text has
// no door size (a grid number or a hardware-group digit the harvest regex picked up) is listed
// with that reason and not drawn; a door row with no tag on the selected plans is listed as not
// on the plan.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { modelFromSubx, attachPlan } from "../../../weyland-sightx-worker/src/lib/schedule-model.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const G020 = path.join(HERE, "../g020");
const OUT = path.join(HERE, "../../../weyland-sightx-worker/src/data/sets");
export const SETS = ["7478006f7fd5b43c", "192a16af8f31ae0c", "e3d0cc1bc22fd824", "f97e99f88a931e74", "43a1f0db3f7ff345", "3fd2388877347d09", "4af80165bc367de8", "89236ffa156fbaf5", "977cec6301f40433", "2b7024ad75f57ddf"];

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FTIN = /(\d{1,2})\s*'\s*-?\s*(\d{1,2}(?:\s+\d\/\d)?)\s*"/g;

/** The row-start columns of a schedule page. The lines are text laid out as printed (several schedule
 *  columns side by side), so every row begins at one of a few character columns: the columns where
 *  the page's marks occur most often. */
function rowStarts(r) {
  const at = new Map();
  // A one-character mark (the 1 of 1 3/4", a grid digit) never sets a row-start column.
  for (const raw of r.lines) for (const mark of new Set(r.marks.filter((x) => x.length >= 2))) {
    const re = new RegExp("(^|\\s)" + esc(mark) + "(?=\\s|$)", "g");
    let m; while ((m = re.exec(raw))) { const c = m.index + m[1].length; at.set(c, (at.get(c) || 0) + 1); }
  }
  const cols = [...at.entries()].sort((a, b) => b[1] - a[1]);
  if (!cols.length) return [];
  const top = cols[0][1], keep = [];
  for (const [c, n] of cols) if (n >= Math.max(2, top * 0.5) || (r.marks.length <= 2)) if (!keep.some((k) => Math.abs(k - c) <= 2)) keep.push(c);
  return keep.sort((a, b) => a - b);
}

/** The row a mark came from: the line on its page where the mark begins a row (at a row-start
 *  column), cut at the next row-start column. A mark found only inside another row's text (the "1"
 *  of 1 3/4", a hardware-group digit) begins no row. */
export function rowFor(mark, page, rowsByPage, startsByPage) {
  const r = rowsByPage.get(page);
  if (!r) return null;
  const starts = startsByPage.get(page) || [];
  for (const raw of r.lines) {
    const re = new RegExp("(^|\\s)" + esc(mark) + "(?=\\s|$)", "g");
    let m;
    while ((m = re.exec(raw))) {
      const c = m.index + m[1].length;
      if (!starts.some((k) => Math.abs(k - c) <= 2)) continue;
      const next = starts.find((k) => k > c + 2);
      return { page, text: norm(raw.slice(c, next == null ? undefined : next - 1)).slice(0, 220), line: norm(raw).slice(0, 400) };
    }
  }
  return null;
}

/** Width and height from a row's text: the first two feet-inch values (3' - 0" 6' - 8"). */
export function sizeOf(text) {
  const v = [...String(text || "").matchAll(FTIN)].map((m) => +m[1] * 12 + (String(m[2]).split(/\s+/).reduce((a, p) => a + (p.includes("/") ? +p.split("/")[0] / +p.split("/")[1] : +p), 0)));
  return v.length >= 2 && v[0] >= 18 && v[0] <= 144 && v[1] >= 60 && v[1] <= 168 ? { w: v[0], h: v[1] } : null;
}

// g035: why the plan reader selected no plan sheet (tools/accuracy/g020/REPORT.md, visual checks). Such a set
// stands in schedule order along one schematic corridor, labelled as such; no position is invented.
export const NO_PLAN_REASON = {
  f97e99f88a931e74: "the plan reader reads the A-105/A-106/A-107 title blocks as 'SHEET 23 OF 147' and so on, and classifies none as a floor plan",
  "977cec6301f40433": "the plan reader takes 'CHECKED BY: DESIGNED BY: GW&' as the title of A-101/A-102/A-401 and classifies none as a floor plan",
};

// g045: a set read the production way (tools/accuracy/g045/production-set.mjs: reader A's rows with
// their printed text, and readPlan with the g041/g044 rules) replaces the harvest marks for that set.
const G045 = path.join(HERE, "../g045");
const productionOf = (sha16) => { const f = path.join(G045, sha16 + ".production.json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };

export function buildSet(sha16) {
  const d = JSON.parse(fs.readFileSync(path.join(G020, sha16 + ".json"), "utf8"));
  const prod = productionOf(sha16);
  const rowsByPage = new Map(d.harvest_schedule_rows.map((r) => [r.page, r]));
  const startsByPage = new Map(d.harvest_schedule_rows.map((r) => [r.page, rowStarts(r)]));
  const rows = prod
    ? prod.rows.map((r, i) => { const size = sizeOf(r.text); return { i, mark: r.mark, page: r.page, text: r.text, door_row: !!size, size, reason: size ? null : "the row has no door width and height in its printed text" }; })
    : d.harvest_schedule_marks.map((m, i) => {
    const row = rowFor(m.mark, m.page, rowsByPage, startsByPage);
    const size = row ? sizeOf(row.text) : null;
    return { i, mark: m.mark, page: m.page, text: row ? row.text : null, door_row: !!size, size, reason: !row ? "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" : !size ? "the row has no door width and height: not a door row (a grid number or a hardware-group digit the harvest regex picked up)" : null };
  });
  const doorRows = rows.filter((r) => r.door_row);
  const project = decodeURIComponent(String(d.source_url || sha16).split("/").pop()).replace(/\.pdf$/i, "");
  const model = modelFromSubx({
    session: { project_name: project },
    doors: doorRows.map((r) => ({ mark: r.mark, page_number: r.page, width_inches: r.size.w, height_inches: r.size.h, notes: null })),
    components: [],
  });
  const plan = prod ? prod.plan : d.harvest_marks_plan;
  attachPlan(model, { found: !!(plan.tags && plan.tags.length), ...plan });
  // Each door carries the schedule row it came from.
  model.doors.forEach((door, k) => { const r = doorRows[k]; door.row = { page: r.page, text: r.text, index: r.i }; door.location = door.plan && door.plan.room_name ? null : door.location; });
  model.source = "harvested-set";
  model.set = {
    sha16, project, source_url: d.source_url, pdf_sha256: d.sha256,
    rows: rows.length, door_rows: doorRows.length, not_door_rows: rows.filter((r) => !r.door_row).map((r) => ({ mark: r.mark, page: r.page, text: r.text, reason: r.reason })),
    doors_on_plan: model.doors.filter((x) => x.plan).length,
    plan_sheets: (plan.plan_sheets || []).map((s) => ({ sheet: s.sheet, page: s.page, title: s.title })),
    ...(plan.plan_sheets && plan.plan_sheets.length ? {} : { no_plan_reason: NO_PLAN_REASON[sha16] || "the plan reader selected no floor-plan sheet" }),
    input: prod ? "tools/accuracy/g045/" + sha16 + ".production.json (reader A's rows and readPlan, as SubX reads the set)" : "tools/accuracy/g020/" + sha16 + ".json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)",
    ...((plan.shared_marks || []).length ? { shared_marks: plan.shared_marks } : {}),
  };
  model.notes = [
    prod ? "Real harvested bid set " + project + ": the door rows are the rows SubX's reader reads from the set's own schedule pages; sizes come from each row's printed text; no hardware sets were read."
      : "Real harvested bid set " + project + ": the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read.",
    ...(model.set.no_plan_reason ? ["No floor plan: " + model.set.no_plan_reason + ". The doors stand in schedule order along one schematic corridor; no plan position is claimed."] : []),
    ...model.notes,
  ];
  return model;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.mkdirSync(OUT, { recursive: true });
  const summary = [];
  for (const s of SETS) {
    const m = buildSet(s);
    fs.writeFileSync(path.join(OUT, s + ".json"), JSON.stringify(m));
    summary.push({ sha16: s, project: m.set.project, rows: m.set.rows, door_rows: m.set.door_rows, not_door_rows: m.set.not_door_rows.length, doors_drawn_on_plan: m.set.doors_on_plan, not_on_plan: m.layout.not_on_plan || [], plan: m.layout.buildings ? m.layout.buildings.map((b) => b.sheet + " p." + b.page) : [] });
  }
  // The worker imports one module (JSON imports differ between wrangler and Node's test runner).
  fs.writeFileSync(path.join(OUT, "index.js"), "// Generated by tools/accuracy/g028/build-sets.mjs: do not edit by hand.\n// The ten harvested real sets SightX opens at /sightx/?set=<sha16> (g028 three, g035 seven more).\nexport const SETS = {\n" +
    SETS.map((s) => "  " + JSON.stringify(s) + ": " + fs.readFileSync(path.join(OUT, s + ".json"), "utf8") + ",").join("\n") + "\n};\n");
  for (const s of SETS) fs.rmSync(path.join(OUT, s + ".json"));
  fs.writeFileSync(path.join(HERE, "sets-summary.json"), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary.map((x) => ({ ...x, not_on_plan: x.not_on_plan.length })), null, 1));
}
