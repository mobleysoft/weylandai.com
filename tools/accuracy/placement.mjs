// Pure placement records and reporting. Coordinates are PDF viewport points, y down.
import { readPlan } from "../../weyland-shared/plan-read.js";

export const DEFAULT_TIERS = ["agreed", "exact", "audited", "oracle-checked"];
export const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const byPosition = (a, b) => a.page - b.page || a.y - b.y || a.x - b.x || compareText(a.mark || a.number || "", b.mark || b.number || "");

// Sort every object's keys, preserving array order (including schedule-row provenance).
export function stableJSON(value) {
  const sorted = (v) => Array.isArray(v) ? v.map(sorted) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v;
  return JSON.stringify(sorted(value), null, 2) + "\n";
}

export function buildPlacement(truth, pages, doors) {
  const plan = readPlan(pages, doors);
  const pageOf = new Map(pages.map((p) => [p.page, p]));
  const sheets = plan.plan_sheets.map((s) => ({
    page: s.page, sheet: s.sheet, title: s.title,
    width: pageOf.get(s.page).width, height: pageOf.get(s.page).height,
    scales: [...s.scales],
    // Keep all announced scales: multiple drawings can have different scales.
    points_per_foot: s.points_per_foot.length ? [...s.points_per_foot].sort((a, b) => a - b) : null,
  })).sort((a, b) => a.page - b.page || compareText(a.sheet, b.sheet));
  const rooms = plan.rooms.map(({ number, name, sheet, page, x, y, points_per_foot }) =>
    ({ number, name, sheet, page, x, y, points_per_foot: points_per_foot ?? null })).sort(byPosition);
  const tags = plan.tags.map((tag) => {
    // readPlan retains the actual row identities in _rows. A mark-only lookup would give
    // two shared-mark openings the same card, or cross buildings with repeated marks.
    const schedule_rows = tag._rows.map((row) => ({ ...row }));
    const { page: schedulePage, y: scheduleY, ...card } = schedule_rows[0];
    return {
      ...card, ...tag, schedule_rows,
      room: tag.room ?? null, room_name: tag.room_name ?? null,
      matched_by: tag.matched_by ?? "exact",
      also_on: [...(tag.also_on || [])].sort(compareText),
      points_per_foot: tag.points_per_foot ?? null,
    };
  }).sort(byPosition);
  const unplaced = plan.marks_not_on_plan.map((m) => ({
    ...m, reason: "mark " + m.mark + " (schedule p." + m.page + ") not tagged on any plan",
  })).sort((a, b) => a.page - b.page || compareText(a.mark, b.mark));
  // Count covered schedule rows, just as the oracle does: one tag may cover repeated
  // schedule pages, whereas shared marks on one page require separate positions.
  const marks_total = doors.length, marks_placed = marks_total - unplaced.length;
  return {
    set: { sha16: truth.sha16, label: truth.label ?? null, source_url: truth.source_url ?? null,
      page_count: pages.length, tier: truth.tier, rows_total: truth.rows_total },
    sheets, rooms, tags,
    summary: { marks_total, marks_placed, placed_rate: marks_total ? marks_placed / marks_total : null,
      sheets_with_scale: sheets.filter((s) => s.points_per_foot !== null).length,
      sheets_total: sheets.length, rooms_total: rooms.length, unplaced },
  };
}

export function sightXReady(record) {
  return record.summary.placed_rate >= 0.9 && record.summary.sheets_with_scale > 0
    && record.tags.some((tag) => tag.room != null && String(tag.room).trim() !== "");
}

export function sortPlacements(records) {
  return [...records].sort((a, b) => (b.summary.placed_rate ?? -1) - (a.summary.placed_rate ?? -1)
    || b.summary.marks_total - a.summary.marks_total || compareText(a.set.sha16, b.set.sha16));
}

export function placementTotals(records) {
  return { sets: records.length, ready: records.filter(sightXReady).length,
    marks_placed: records.reduce((n, r) => n + r.summary.marks_placed, 0),
    marks_total: records.reduce((n, r) => n + r.summary.marks_total, 0) };
}

const cell = (v) => String(v ?? "—").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
export function placementTable(records) {
  return [
    "| sha16 | label | tier | marks placed/total | placed_rate | sheets with scale/sheets | rooms | SightX-ready |",
    "|---|---|---|---:|---:|---:|---:|---|",
    ...sortPlacements(records).map((r) => {
      const s = r.summary;
      return `| ${r.set.sha16} | ${cell(r.set.label)} | ${r.set.tier} | ${s.marks_placed}/${s.marks_total} | ${s.placed_rate === null ? "—" : (s.placed_rate * 100).toFixed(2) + "%"} | ${s.sheets_with_scale}/${s.sheets_total} | ${s.rooms_total} | ${sightXReady(r) ? "yes" : "no"} |`;
    }),
  ].join("\n");
}

export function placementRegressions(records, committed) {
  const current = new Map(records.map((r) => [r.set.sha16, r]));
  return committed.flatMap((before) => {
    const after = current.get(before.set.sha16);
    if (!after) return [`${before.set.sha16}: committed placement missing from this run`];
    return after.summary.marks_placed < before.summary.marks_placed
      ? [`${before.set.sha16}: marks_placed ${before.summary.marks_placed} -> ${after.summary.marks_placed}`] : [];
  });
}
