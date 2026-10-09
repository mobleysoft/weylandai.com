// tools/accuracy/truth/oracles.mjs
//
// Five self-consistency oracles over one bid set (2026-10-09; docs/direction-2026-10-08.md,
// "Truth at scale"). A bid set is built to be cross-checked; these checks need no label:
//   a marks_on_plan     every schedule mark appears as a door tag on a floor plan
//                       (weyland-shared/plan-read.js readPlan, the reader SubX's server runs)
//   b sets_exist        every hardware set named on the schedule exists in 08 71 00
//   c set_door_lists    each set's own door list ("Doors: 101, 102A") names exactly the schedule's
//                       doors carrying that set
//   d types_in_legend   every door type and frame type on the schedule is drawn in a DOOR TYPES /
//                       FRAME TYPES legend (a token equal to the type near the legend's title,
//                       outside the schedule table)
//   e sizes_and_marks   every row's width and height parse to a door size, and its mark has the
//                       shape most of the sheet's marks have (digits -> 9, letters -> A, runs collapsed)
// Each returns { applicable, reason?, total, pass, fail, examples }. They run over reader A's rows
// (the product's read): a failure is a defect in the product's reading or in the document.
import { readPlan } from "../../../weyland-shared/plan-read.js";
import { N, UP } from "./agree.mjs";

const out = (total, fails, examples, extra = {}) => ({ applicable: true, total, pass: total - fails, fail: fails, pass_rate: total ? +((total - fails) / total).toFixed(4) : null, examples: examples.slice(0, 12), ...extra });
const na = (reason) => ({ applicable: false, reason });
const EMPTY_SET = /^(-+|—|N\/?A|NONE|EXIST(ING)?\.?|\(E\)|BY OTHERS|B\/O|NIC|EXISTING TO REMAIN|TBD)$/;

export function oracleMarksOnPlan(doors, pages, cls) {
  if (!doors.length) return na("no door schedule rows");
  const plan = readPlan(pages, doors.map((d) => ({ mark: d.mark, location: d.location || null, page: d.page })));
  if (!plan.counts.plan_sheets) return { ...na("no floor plan sheet found in this PDF (title blocks)"), plan_counts: plan.counts };
  const miss = plan.marks_not_on_plan;
  return out(doors.length, miss.length, miss.map((m) => "mark " + m.mark + " (schedule p." + m.page + ") not tagged on any plan"), { plan_sheets: plan.plan_sheets.map((s) => s.sheet + " p." + s.page), plan_counts: plan.counts });
}

export function oracleSetsExist(doors, groups) {
  if (!doors.length) return na("no door schedule rows");
  if (!groups.length) return na("no hardware sets read in this PDF");
  const named = new Map();
  for (const d of doors) { const v = UP(d.hardware_group); if (!v || EMPTY_SET.test(v)) continue; const k = N.set(v); if (k && !named.has(k)) named.set(k, v); }
  if (!named.size) return na("the schedule rows name no hardware set");
  const have = new Set(groups.map((g) => N.set(g.set)));
  const miss = [...named].filter(([k]) => !have.has(k));
  return out(named.size, miss.length, miss.map(([k, v]) => "schedule set " + v + " not in 08 71 00 (sets read: " + [...have].slice(0, 12).join(", ") + ")"));
}

export function oracleSetDoorLists(doors, groups) {
  if (!doors.length) return na("no door schedule rows");
  const withLists = groups.filter((g) => g.doors && g.doors.length);
  if (!withLists.length) return na("no hardware set prints its own door list");
  const fails = [];
  for (const g of withLists) {
    const k = N.set(g.set);
    const sched = [...new Set(doors.filter((d) => N.set(d.hardware_group) === k).map((d) => N.mark(d.mark)))].sort();
    const own = [...new Set(g.doors.map(N.mark))].sort();
    if (sched.join(",") !== own.join(",")) {
      const missing = own.filter((m) => !sched.includes(m)), extra = sched.filter((m) => !own.includes(m));
      fails.push("set " + g.set + ": list names " + own.length + ", schedule carries " + sched.length + (missing.length ? "; listed but not on schedule with this set: " + missing.slice(0, 6).join(" ") : "") + (extra.length ? "; on schedule but not listed: " + extra.slice(0, 6).join(" ") : ""));
    }
  }
  return out(withLists.length, fails.length, fails);
}

// Plural only: a schedule's own header cell says DOOR TYPE / FRAME TYPE.
const LEGEND_TITLE = /^(?:DOOR|FRAME|DOOR\s*(?:AND|&)\s*FRAME|DOOR\s*\/\s*FRAME|OPENING)\s+(?:TYPES|ELEVATIONS)(?:\s*(?:AND|&)\s*(?:FRAME\s+)?(?:TYPES|ELEVATIONS))?$/;
const typeValues = (doors, f) => {
  const vals = new Map();
  for (const d of doors) {
    for (const part of String(d[f] || "").split(/\s*[\/,]\s*/)) {
      const v = UP(part).replace(/\s+/g, " ");
      if (!v || EMPTY_SET.test(v) || /^EXIST|^\(E\)|^NEW$|^SEE /.test(v) || v.length > 8) continue;
      if (!vals.has(v)) vals.set(v, []);
      vals.get(v).push(d.mark);
    }
  }
  return vals;
};
export function oracleTypesInLegend(doors, pages, tableBoxes) {
  if (!doors.length) return na("no door schedule rows");
  const inTable = (page, it) => (tableBoxes[page] || []).some((b) => it.x >= b[0] - 2 && it.x <= b[2] + 2 && it.y >= b[1] - 2 && it.y <= b[3] + 2);
  const titles = [];
  for (const p of pages) for (const it of p.items) { if (inTable(p.page, it)) continue; const t = UP(it.str).replace(/\s+/g, " ").replace(/[.:]$/, ""); if (LEGEND_TITLE.test(t)) titles.push({ page: p.page, p, it, door: /DOOR|OPENING/.test(t), frame: /FRAME/.test(t) }); }
  if (!titles.length) return na("no DOOR TYPES / FRAME TYPES legend title in this PDF");
  const tokensNear = (kind) => {
    const set = new Set();
    for (const t of titles) {
      if (kind === "door" ? !t.door : !t.frame) continue;
      const W = t.p.width, H = t.p.height;
      for (const it of t.p.items) {
        if (Math.abs(it.x - t.it.x) > 0.3 * W || Math.abs(it.y - t.it.y) > 0.3 * H || inTable(t.page, it)) continue;
        const s = UP(it.str).replace(/\s+/g, " ").trim();
        set.add(s);
        const m = s.match(/^(?:DOOR |FRAME )?TYPE\s*[:#-]?\s*(\S+)$/) || s.match(/^(\S+)\s+TYPE$/) || s.match(/^(\S{1,4})\s*[-–=:]\s+\S/);
        if (m) set.add(m[1]);
      }
    }
    return set;
  };
  const checks = [];
  for (const [kind, field] of [["door", "door_type"], ["frame", "frame_type"]]) {
    const vals = typeValues(doors, field);
    if (!vals.size) continue;
    if (!titles.some((t) => (kind === "door" ? t.door : t.frame))) { checks.push({ kind, skipped: "no " + kind.toUpperCase() + " TYPES legend title" }); continue; }
    const near = tokensNear(kind);
    for (const [v, marks] of vals) checks.push({ kind, value: v, ok: near.has(v), marks: marks.length });
  }
  const scored = checks.filter((c) => !c.skipped);
  if (!scored.length) return { ...na("schedule types present, but no legend title for them"), skipped: checks.filter((c) => c.skipped).map((c) => c.skipped) };
  const fails = scored.filter((c) => !c.ok);
  return out(scored.length, fails.length, fails.map((c) => c.kind + " type " + c.value + " (" + c.marks + " rows) not found near the " + c.kind + " types legend"), { legend_titles: titles.map((t) => t.it.str + " p." + t.page), skipped: checks.filter((c) => c.skipped).map((c) => c.skipped), note: "weak for numeric types: a detail number near the legend can pass a numeric frame type" });
}

export const markShape = (m) => N.mark(m).replace(/[0-9]+/g, "9").replace(/[A-Z]+/g, "A");
export function oracleSizesAndMarks(doors) {
  if (!doors.length) return na("no door schedule rows");
  const shapes = new Map();
  for (const d of doors) { const s = d.page + "|" + markShape(d.mark); shapes.set(s, (shapes.get(s) || 0) + 1); }
  const perPage = new Map();
  for (const d of doors) perPage.set(d.page, (perPage.get(d.page) || 0) + 1);
  const fails = [];
  let sizeFails = 0, markFails = 0;
  for (const d of doors) {
    const w = d.width_inches, h = d.height_inches;
    const sizeOk = w != null && h != null && w >= 12 && w <= 192 && h >= 60 && h <= 240;
    const n = shapes.get(d.page + "|" + markShape(d.mark)), of = perPage.get(d.page);
    const markOk = n >= 2 || of < 4 || n / of >= 0.05;
    if (!sizeOk) sizeFails++;
    if (!markOk) markFails++;
    if (!sizeOk || !markOk) fails.push("mark " + d.mark + " p." + d.page + (sizeOk ? "" : ": size " + JSON.stringify(d.size) + " -> " + w + " x " + h) + (markOk ? "" : ": shape " + markShape(d.mark) + " is used by " + n + " of " + of + " marks on the sheet"));
  }
  return out(doors.length, fails.length, fails, { size_fail: sizeFails, mark_fail: markFails });
}

/** Which oracles apply to a triage class. */
export const ORACLES_FOR = {
  complete: ["a", "b", "c", "d", "e"],
  pair: ["b", "c", "d", "e"],
  "schedule-only": ["a", "d", "e"],
  "spec-only": [],
  "plan-only": [],
  none: [],
};
