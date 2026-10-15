// weyland-shared/plan-read.js
//
// The floor plan of a bid set, read from its own sheets (S1 amendment, 2026-10-09): "every doc
// set has a building layout to put through SightX, and it's always early in the PDF." Pure
// functions over the text layer: no pdf.js here, so SubX's server (lib/text-layer-read.js) and the
// offline tool (tools/plan-extract) run the same reading.
//
//   pages: [{ page, width, height, items: [{ str, x, y, h, w }] }]   viewport space, points, y down
//   doors: [{ mark, location, page }]                                 the schedule's rows
//
// readPlan(pages, doors) ->
//   sheets:        every page's title block: { page, sheet, title, plan }
//   plan_sheets:   architectural plans, with plan_rule naming the title or drawing evidence
//   rooms:         { page, sheet, number, name, x, y, corridor } from each plan's room labels
//   tags:          { mark, page, sheet, x, y, room, room_name, room_by, also_on }
//   unmatched_tags: tokens drawn like the matched door tags that no schedule mark names
//   marks_not_on_plan: schedule rows no tag of their own covers
//   shared_marks:  marks several rows of one schedule page share, per sheet, with the tag count and
//                  whether each row got its own tag (g044)
//
// Nothing is guessed silently: each tag says how its room was found (room_by), and a room found
// only as the nearest label is marked unsure.

import { buildingScope, comparePlacementScopes } from "./building-scope.js";

const SHEET_RE = /^[A-Z]{1,3}-?\d{1,3}(?:[.-]\d{1,3})?(?:[.-]?[A-Z])?$/;
const LEGACY_SHEET_RE = /^[A-Z]{1,3}-?\d{1,3}(?:[.-]\d{1,3})?[A-Z]?$/;
const ROOM_NO_RE = /^(?:[A-Z]{0,2}-?\d{1,4}(?:\.\d{1,2})?[A-Z]?|[A-Z]{1,2}\d{1,3})$/;
const NOT_A_PLAN = /\b(SITE|ROOF|REFLECTED|CEILING|RCP|DEMO(LITION)?|FURNITURE|FINISH(ES)?|SIGNAGE|FOUNDATION|FRAMING|ELECTRICAL|LIGHTING|POWER|PLUMBING|MECHANICAL|HVAC|FIRE ALARM|SPRINKLER|LIFE SAFETY|EGRESS|CODE|PHASING|PAVING|GRADING|UTILITY|LANDSCAPE|IRRIGATION|STRUCTURAL|SLAB|TECHNOLOGY|DATA|KEY PLAN)\b/;
const CORRIDOR_RE = /\b(CORR(IDOR)?|HALL(WAY)?|VEST(IBULE)?|LOBBY|ENTRY|CIRC(ULATION)?|EXIT\s*PASSAGE(WAY)?)\b/;
const LABEL_WORDS = /^(SHEET( NUMBER| TITLE)?|PROJECT( NUMBER| NO\.?)?|DATE:?|DRAWN( BY)?|CHECKED( BY)?|SCALE:?|REVISIONS?|ISSUE[D]?( FOR)?|NO\.?|DESCRIPTION|JOB( NO\.?)?|COMM(ISSION)?( NO\.?)?)$/;

export const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, "").replace(/[–—]/g, "-");
const cx = (it) => it.x + (it.w || 0) / 2;

/** Items that share a baseline joined into lines (CAD exports split words and jitter y). */
export function lines(items, gap = 1.2, hTol = 0.6) {
  // CAD exports often draw a string twice at the same spot; keep one.
  const seen = new Set();
  const its = items.filter((it) => { if (!it.str || !it.str.trim()) return false; const k = it.str + "@" + Math.round(it.x) + "," + Math.round(it.y); if (seen.has(k)) return false; seen.add(k); return true; });
  // Rows: level items whose baselines agree within a third of their height; rotated items stand alone.
  const level = its.filter((it) => !(it.rot || 0)).sort((a, b) => a.y - b.y);
  const rows = [];
  for (const it of level) {
    const row = rows.length ? rows[rows.length - 1] : null;
    if (row && it.y - row.y <= Math.max(2, Math.max(it.h, row.h) * 0.35)) { row.items.push(it); row.y = it.y; row.h = Math.max(row.h, it.h); } else rows.push({ y: it.y, h: it.h, items: [it] });
  }
  const out = [];
  const start = (it) => ({ str: it.str, x: it.x, y: it.y, h: it.h, w: it.w || 0, rot: it.rot || 0, xEnd: it.x + (it.w || 0), parts: [it] });
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
    let cur = null;
    for (const it of row.items) {
      if (cur && Math.abs(cur.h - it.h) < hTol && it.x - cur.xEnd < Math.max(6, it.h * gap) && it.x - cur.xEnd > -it.h) {
        cur.str += (it.x - cur.xEnd > it.h * 0.2 ? " " : "") + it.str; cur.xEnd = Math.max(cur.xEnd, it.x + (it.w || 0)); cur.w = cur.xEnd - cur.x; cur.parts.push(it);
      } else { cur = start(it); out.push(cur); }
    }
  }
  for (const it of its) if (it.rot || 0) out.push(start(it));
  for (const l of out) l.str = l.str.replace(/\s+/g, " ").trim();
  return out;
}

// The title block: the right edge of the sheet, lower half (a vertical strip or a box in the corner).
export function inTitleRegion(p, it) { return it.x > p.width * 0.86 && it.y > p.height * 0.5; }
// What tags and room labels never come from: rotated text and the sheet's outer edge strip. (The
// drawing itself often runs into the title-block corner: Rockford A1.1's door 119.1 is at 0.89 W.)
function offDrawing(p, it) { return !!(it.rot || 0) || it.x > p.width * 0.95; }

/** The sheet number and title each page's title block prints. boiler: strings repeated on most sheets. */
export function titleBlocks(pages) {
  const legacy = readTitleBlocks(pages, true);
  const extended = readTitleBlocks(pages, false);
  const multiline = readTitleBlocks(pages, false, true);
  // New evidence may add plans, but never remove or rename either previous rule's plans.
  return extended.map((tb, i) => legacy[i].plan
    ? { ...legacy[i], plan_rule: 'legacy' }
    : tb.plan ? { ...tb, plan_rule: 'extended-title' }
      : { ...multiline[i], plan_rule: multiline[i].plan ? 'multiline-title' : null });
}

// Grow a title through adjacent, aligned lines, not a fixed distance from its label.
// Keep the whole stack so a qualifier on its first/last line cannot disappear.
function titleStack(anchor, ls) {
  if (anchor.rot) return [anchor];
  const aligned = ls.filter(l => !l.rot && Math.abs(l.h - anchor.h) < 0.6
    && l.x < anchor.xEnd && l.xEnd > anchor.x).sort((a, b) => a.y - b.y);
  let first = aligned.indexOf(anchor), last = first;
  while (first > 0 && aligned[first].y - aligned[first - 1].y < anchor.h * 1.7) first--;
  while (last + 1 < aligned.length && aligned[last + 1].y - aligned[last].y < anchor.h * 1.7) last++;
  return aligned.slice(first, last + 1);
}

function readTitleBlocks(pages, legacy, multiline = false) {
  const sheetRE = legacy ? LEGACY_SHEET_RE : SHEET_RE;
  const drawing = (p) => p.width > p.height * 1.15 || p.width > 1500;
  const regionLines = pages.map((p) => (drawing(p) ? lines(p.items.filter((it) => inTitleRegion(p, it))) : []));
  // Where a sheet title can sit: the title block, or the strip beside it along the bottom.
  const titleLines = pages.map((p) => (drawing(p) ? lines(p.items.filter((it) => it.x > p.width * 0.62 && it.y > p.height * 0.5)) : []));
  // A string on the title blocks of many different sheets (owner, project, address) is not a sheet title;
  // a title repeats only under the same sheet number (one A2.1 per school in a three-school set).
  const sheetOf = regionLines.map((ls) => { const n = ls.filter((l) => sheetRE.test(l.str.replace(/\s+/g, "")) && !/^\d/.test(l.str)).sort((a, b) => b.h - a.h)[0]; return n ? n.str.replace(/\s+/g, "") : null; });
  const seen = new Map();
  regionLines.forEach((ls, i) => { for (const l of ls) { const k = norm(l.str); if (!seen.has(k)) seen.set(k, new Set()); seen.get(k).add(sheetOf[i] || "?" + i); } });
  const nSheets = new Set(sheetOf.filter(Boolean)).size;
  const boiler = (s) => { const n = (seen.get(norm(s)) || new Set()).size; return n >= 3 && n >= nSheets * 0.5; };
  return pages.map((p, i) => {
    const ls = regionLines[i];
    const nums = ls.filter((l) => sheetRE.test(l.str.replace(/\s+/g, "")) && !/^\d/.test(l.str)).sort((a, b) => (b.h - a.h) || ((b.x + b.y) - (a.x + a.y)));
    const num = nums[0] || null;
    let title = null;
    if (num) {
      const cand = titleLines[i].filter((l) => norm(l.str) !== norm(num.str) && /[A-Z]{3,}/.test(l.str) && !LABEL_WORDS.test(legacy ? l.str.trim().toUpperCase() : l.str.trim().toUpperCase().replace(/:$/, "")) && !/SCALE|\d+\s*\/\s*\d+\s*"|^[\d\/.\-\s#]+$|COPYRIGHT|©/i.test(l.str) && !boiler(l.str) && l.h <= num.h * 1.05);
      cand.sort((a, b) => (Math.round(b.h) - Math.round(a.h)) || ((b.xEnd + b.y) - (a.xEnd + a.y)));
      if (cand.length) {
        const top = cand[0];
        // A title set on two lines: the lines of the same size stacked with it.
        const same = multiline ? titleStack(top, cand) : cand.filter((l) => l.rot === top.rot && Math.abs(l.h - top.h) < 0.6 && Math.abs(l.y - top.y) < top.h * 1.7 && l.x < top.xEnd && l.xEnd > top.x).sort((a, b) => a.y - b.y);
        title = same.map((l) => l.str).join(" ").replace(/\s+/g, " ").trim();
      }
    }
    // A labelled title is stronger evidence than a large nearby drawing caption.
    const label = ls.find(l => /^SHEET TITLE:?$/i.test(l.str) && !l.rot);
    if (label && !legacy) {
      const below = ls.filter(l => !l.rot && l.y > label.y && l.y - label.y < label.h * 4
        && Math.abs(l.x - label.x) < label.h * 2 && !LABEL_WORDS.test(l.str.toUpperCase().replace(/:$/, "")))
        .sort((a, b) => a.y - b.y);
      if (below.length) {
        const stack = multiline ? titleStack(below[0], ls.filter(l => l.y > label.y
          && !sheetRE.test(norm(l.str)) && !LABEL_WORDS.test(l.str.toUpperCase().replace(/:$/, "")))) : below;
        title = stack.map(l => l.str).join(" ");
      }
    }
    const sheet = num ? num.str.replace(/\s+/g, "") : null;
    const plan = !!(sheet && /^A/i.test(sheet) && title && /\bPLANS?\b/i.test(title)
      && (!multiline || !/\b(?:DETAILS?|SCHEDULES?)\b/i.test(title)) && (legacy
      ? !NOT_A_PLAN.test(title.toUpperCase())
      : title.toUpperCase().split(/\s*&\s*/).some(part => /\bPLANS?\b/.test(part) && !NOT_A_PLAN.test(part))));
    return { page: p.page, sheet, title, plan, block: ls.map((l) => norm(l.str)).filter((s) => !boiler(s)) };
  });
}

// Announced scales on a sheet ("SCALE: 3/32" 1'-0"", "1/8" = 1'-0"").
const SCALE_RE = /(\d+(?:\s+\d+)?\/\d+|\d+(?:\.\d+)?)\s*"\s*=?\s*(\d+)\s*'\s*-?\s*(\d+)?\s*"?/;
export function scalesOn(ls) {
  const out = [];
  for (const l of ls) {
    if (!/SCALE|=/i.test(l.str)) continue;
    const m = l.str.match(SCALE_RE);
    if (!m) continue;
    const inch = m[1].includes("/") ? m[1].trim().split(/\s+/).reduce((a, part) => a + (part.includes("/") ? Number(part.split("/")[0]) / Number(part.split("/")[1]) : Number(part)), 0) : Number(m[1]);
    const feet = Number(m[2]) + (m[3] ? Number(m[3]) / 12 : 0);
    const ppf = (inch * 72) / feet;
    if (inch > 0 && feet > 0 && ppf >= 2.25 && ppf <= 216) out.push({ text: l.str.trim(), points_per_foot: Math.round(ppf * 1000) / 1000, x: l.x, y: l.y });
  }
  return out;
}

/** Room labels: a name line set directly above a room number. */
export function roomsOn(p, ls, tb) {
  const region = (l) => !offDrawing(p, l);
  const nums = ls.filter((l) => region(l) && ROOM_NO_RE.test(l.str.replace(/\s+/g, "")));
  const names = ls.filter((l) => region(l) && /[A-Z]{2,}/.test(l.str) && l.str.length <= 34 && !/^[\d.\s-]+$/.test(l.str) && !/[:;]$|\bNOTE|\bSEE\b|\bREFER\b|\bTYP(ICAL)?\b|\bSIM\b|\bALIGN\b|\bEQ\b/i.test(l.str));
  const rooms = [];
  const used = new Set();
  for (const n of nums) {
    let best = null, bestD = Infinity;
    for (const nm of names) {
      const dy = n.y - nm.y;
      if (dy <= 0 || dy > Math.max(nm.h, n.h) * 2.4) continue;
      const dx = Math.abs(cx(n) - cx(nm));
      if (dx > Math.max(nm.w / 2, n.h * 3)) continue;
      if (nm.h < n.h * 0.7 || nm.h > n.h * 2.2) continue;
      const d = dy + dx * 0.5;
      if (d < bestD) { bestD = d; best = nm; }
    }
    if (!best) continue;
    // A name on two lines (OPEN / COURT): the line just above, centred over it.
    let name = best.str;
    const above = names.find((nm) => nm !== best && best.y - nm.y > 0 && best.y - nm.y < best.h * 1.6 && Math.abs(cx(nm) - cx(best)) < best.h * 3 && Math.abs(nm.h - best.h) < 0.6);
    if (above) name = above.str + " " + name;
    const number = n.str.replace(/\s+/g, "");
    used.add(n);
    rooms.push({ page: p.page, sheet: tb.sheet, number, name, x: Math.round(cx(n)), y: Math.round(best.y + (n.y - best.y) / 2), h: n.h, corridor: CORRIDOR_RE.test(name.toUpperCase()), _line: n });
  }
  return { rooms, used };
}

const shape = (s) => norm(s).replace(/\d/g, "9").replace(/[A-Z]/g, "A");
const words = (s) => norm(String(s || "").replace(/[^A-Za-z0-9]+/g, " ")).length ? String(s || "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean) : [];

function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.max(A.size, B.size);
}

const sourceRows = d => d.schedule_rows?.length ? d.schedule_rows : [d];

function tagCandidates(p, ls) {
  const cands = p.items.map(it => ({ str: it.str.trim(), x: it.x, y: it.y, h: it.h, w: it.w || 0, it }));
  for (const l of ls) if (l.parts.length > 1) cands.push({ str: l.str, x: l.x, y: l.y, h: l.h, w: l.w, line: l });
  return cands;
}

function scheduleCellTest(cands, markOf, page) {
  // Baseline AND a repeated mark column: a real tag can share a table row's y.
  const cells = cands.filter(c => (markOf.get(norm(c.str)) || []).flatMap(sourceRows)
    .some(d => d.page === page && Number.isFinite(d.y) && Math.abs(c.y - d.y) < Math.max(3, c.h)));
  return c => cells.includes(c) && cells.some(other =>
    Math.abs(other.y - c.y) > Math.max(other.h, c.h) && Math.abs(other.x - c.x) < Math.max(other.h, c.h));
}

// A caption has an announced scale directly below it. Include all view types as
// boundaries, so a plan beside elevations does not license tags in the elevations.
// Read the scale text here even at site scales too small for room travel distances.
function drawingViews(p, ls) {
  const body = ls.filter(l => !offDrawing(p, l) && !inTitleRegion(p, l));
  const scales = body.filter(l => SCALE_RE.test(l.str));
  const text = body.filter(l => !scales.includes(l));
  const seen = new Set();
  const captions = text.filter(l => /\b(?:PLANS?|ELEVATIONS?|ELEV\.?|SECTIONS?|DETAILS?|BUILDING)\b/i.test(l.str))
    .flatMap(anchor => {
      const stack = titleStack(anchor, text), l = stack[0], last = stack[stack.length - 1];
      if (seen.has(l)) return [];
      seen.add(l);
      const str = stack.map(s => s.str).join(' ');
      if (/\b(?:NOTES?|SEE|REFER|SCHEDULES?)\b|[:;]/i.test(str) || str.length > 160) return [];
      const scale = scales.filter(s => s.y > last.y && s.y - last.y < l.h * 3
        && s.x >= l.x - l.h * 2 && s.x <= Math.max(...stack.map(s => s.xEnd)) + l.h * 2)
        .sort((a, b) => (a.y - b.y) || (Math.abs(a.x - l.x) - Math.abs(b.x - l.x)))[0];
      return scale ? [{ ...l, str, scale }] : [];
    });
  return captions.map(c => {
    const left = Math.max(0, c.x - c.h * 3);
    const right = Math.min(p.width * 0.9, ...captions.filter(other => other.x > c.x + c.h * 3
      && Math.abs(other.y - c.y) < Math.max(other.h, c.h) * 3).map(other => other.x - other.h * 3));
    const top = Math.max(0, ...captions.filter(other => other.scale.y < c.y - c.h * 3
      && other.x >= left && other.x < right).map(other => other.scale.y));
    return { caption: c.str.toUpperCase(), left, right, top, bottom: c.y - c.h, scale: c.scale };
  });
}

const insideView = (c, v) => cx(c) >= v.left && cx(c) < v.right && c.y > v.top && c.y < v.bottom;
const nonPlanView = s => NOT_A_PLAN.test(s) || /\b(?:ELEVATIONS?|ELEV|SECTIONS?|DETAILS?|SCHEDULES?)\b/.test(s);

function drawingPlanEvidence(p, tb, markOf) {
  if (!/^A/i.test(tb.sheet || '')) return null;
  const title = (tb.title || '').toUpperCase();
  // Site/details sheets can contain a floor-plan drawing. Keep explicit non-floor
  // disciplines, phasing and key-plan readings as vetoes, even if a caption says FLOOR PLAN.
  if (NOT_A_PLAN.test(title.replace(/\b(?:SITE|DEMO(?:LITION)?)\b/g, ''))
    || /\bKEY\s*PLAN\b/.test(title)
    || (/\bDEMO(?:LITION)?\b/.test(title) && !/\bCONSTRUCTION\b/.test(title))) return null;
  const ls = lines(p.items), views = drawingViews(p, ls);
  const { rooms, used } = roomsOn(p, ls, tb);
  const cands = tagCandidates(p, ls), inSchedule = scheduleCellTest(cands, markOf, p.page);
  const tags = cands.filter(c => markOf.has(norm(c.str)) && !offDrawing(p, c.it || c.line)
    && !inTitleRegion(p, c) && !inSchedule(c)
    && !(c.line ? used.has(c.line) : rooms.some(r => r._line.parts.includes(c.it))));
  const floor = views.filter(v => /\bFLOOR PLANS?\b|\bENLARGED\b.*\bPLANS?\b/.test(v.caption) && !nonPlanView(v.caption));
  if (floor.length) return { rule: 'drawing-title', views: floor };
  const site = views.filter(v => /\bSITE\b.*\bPLANS?\b/.test(v.caption)
    && !nonPlanView(v.caption.replace(/\b(?:KEY\s+)?SITE\b/g, ''))
    && tags.some(c => insideView(c, v)));
  if (site.length && !/\b(?:DETAILS?|SCHEDULES?)\b/.test(title)) return { rule: 'site-plan-tags', views: site };
  // A building view without "PLAN" needs two different room numbers, each with
  // a separate schedule-matching tag nearby. Room numbers alone never qualify.
  const roomBacked = views.filter(v => /\bBUILDING\b/.test(v.caption) && !nonPlanView(v.caption)
    && new Set(tags.filter(c => insideView(c, v) && rooms.some(r => insideView(r, v)
      && norm(r.number) === norm(c.str) && Math.hypot(r.x - cx(c), r.y - c.y) < Math.max(r.h, c.h) * 25))
      .map(c => norm(c.str))).size >= 2);
  return roomBacked.length ? { rule: 'room-backed-tags', views: roomBacked } : null;
}

export function readPlan(pages, doors = [], opts = {}) {
  const tbs = titleBlocks(pages);
  const scopes = new Map(pages.map((p, i) => [p.page, buildingScope(p, tbs[i], lines(p.items))]));
  const byPage = new Map(pages.map((p, i) => [p.page, { p, tb: tbs[i] }]));
  const planPages = tbs.filter((t) => t.plan);
  const drawingRegions = new Map();
  const markOf = new Map();
  // SubX keeps a mark printed on two schedule pages apart as "001 [p.286]"; the plan prints "001".
  const tagOf = (d) => norm(String(d.mark || "").replace(/\s*\[p\.?\s*\d+\]\s*$/i, ""));
  for (const d of doors) {
    for (const k of new Set([d, ...sourceRows(d)].map(tagOf).filter(Boolean))) {
      if (!markOf.has(k)) markOf.set(k, []);
      markOf.get(k).push(d);
    }
  }
  for (const t of tbs.filter(t => !t.plan)) {
    const evidence = drawingPlanEvidence(byPage.get(t.page).p, t, markOf);
    if (!evidence) continue;
    t.plan = true; t.plan_rule = evidence.rule;
    drawingRegions.set(t.page, evidence.views);
    planPages.push(t);
  }
  const rooms = [], tags = [], seenTag = new Map(), sheetsOut = [];
  const paired = new Set(); // g041: the items of stacked tags, which are not unmatched tags
  const shared = []; // g044: marks several schedule rows share, per sheet
  const scheduleBlock = (page) => (byPage.get(page) || {}).tb;

  for (const t of planPages) {
    const { p } = byPage.get(t.page);
    const views = drawingRegions.get(t.page);
    const inPlan = c => !views || (!offDrawing(p, c.it || c.line || c) && !inTitleRegion(p, c) && views.some(v => insideView(c, v)));
    const ls = lines(p.items).filter(inPlan);
    const { rooms: rs, used } = roomsOn(p, ls, t);
    const scales = scalesOn(views ? [...new Set(views.map(v => v.scale))] : lines(p.items, 4, 1.6));
    const sheetOut = { page: t.page, sheet: t.sheet, title: t.title, plan_rule: t.plan_rule, rooms: rs.length, scales: scales.map((s) => s.text), points_per_foot: [...new Set(scales.map((s) => s.points_per_foot))] };
    sheetsOut.push(sheetOut);
    for (const r of rs) { r.points_per_foot = scaleAt(scales, r.x, r.y); rooms.push(r); }
    // Prefer affirmative building evidence, the strongest first (most matched title-block fields), then the previous
    // title-block similarity. g082: R2502-01's rebid kept its admin restroom schedule (facility name only) for the dorm
    // plans while the dorm door schedule also matched site and facility numbers, and placed 5 of 211 tags. A sheet's
    // own page matches every field it prints, so the strongest pool never drops a plan's own schedule.
    // If every page conflicts, fall back across ALL schedule pages. There must
    // never be an empty keep set (or a second scope veto) that rejects every door.
    const candidates = [...new Set(doors.flatMap(sourceRows).map(d => d.page).filter(x => x != null))]
      .map(page => ({ page, ...comparePlacementScopes(scopes.get(t.page), scopes.get(page)) }));
    const compatible = candidates.filter(c => !c.conflicts.length);
    const affirmative = compatible.filter(c => c.matched.length);
    const strongest = Math.max(0, ...affirmative.map(c => c.matched.length));
    const strongPool = affirmative.filter(c => c.matched.length === strongest);
    const pool = affirmative.length ? strongPool : compatible.length ? compatible : candidates;
    const candPages = pool.map(c => c.page);
    let bestSim = -1, keep = null;
    for (const sp of candPages) { const sb = scheduleBlock(sp); const s = sb ? similarity(t.block, sb.block) : 0; if (s > bestSim + 1e-9) { bestSim = s; keep = new Set([sp]); } else if (Math.abs(s - bestSim) < 1e-9) keep.add(sp); }
    sheetOut.schedule_selection = {
      rule: !compatible.length && candidates.length ? 'similarity-fallback-no-compatible-schedule'
        : affirmative.length ? (strongPool.length < affirmative.length ? 'strongest-building-scope-then-similarity' : 'building-scope-then-similarity')
          : compatible.length < candidates.length ? 'scope-compatible-then-similarity' : 'similarity',
      candidates, kept_pages: keep ? [...keep] : null,
    };
    const doorFits = d => !keep || sourceRows(d).some(r => r.page == null || keep.has(r.page));
    // Door tags: each single item, and each joined line, equal to a schedule mark.
    const cands = tagCandidates(p, ls).filter(inPlan);
    // On mixed plan/schedule sheets, source baselines plus a repeated mark
    // column locate table cells. Baseline alone could hide a real tag elsewhere
    // on the same horizontal line. Require at least two distinct table rows.
    const inSchedule = scheduleCellTest(cands, markOf, t.page);
    // Each tag covers the schedule rows it stands for (tag._rows), so a row is "on the plan" only when
    // a tag of its own covers it (g044).
    const place = (key, rowsHere, c, extra = null) => {
      const tag = { mark: rowsHere[0].mark || sourceRows(rowsHere[0])[0].mark, page: t.page, sheet: t.sheet, x: Math.round(cx(c)), y: Math.round(c.y - c.h / 2), h: c.h, shape: shape(c.str), door_pages: [...new Set(rowsHere.flatMap(sourceRows).map((d) => d.page))], ...(extra || {}) };
      Object.defineProperty(tag, "_rows", { value: rowsHere, enumerable: false });
      roomFor(tag, rs, rowsHere[0], ls, p);
      tag.points_per_foot = scaleAt(scales, tag.x, tag.y);
      if (!seenTag.has(key)) { seenTag.set(key, tag); tags.push(tag); }
      else {
        const first = seenTag.get(key);
        // Keep the sheet that also shows the door's room (an enlarged plan beats a key plan without labels).
        const better = !first.room && tag.room;
        if (better) { Object.assign(tag, { also_on: [...(first.also_on || []), first.sheet] }); tags[tags.indexOf(first)] = tag; seenTag.set(key, tag); }
        else (first.also_on ||= []).includes(t.sheet) || first.also_on.push(t.sheet);
      }
    };
    // Every tag position on this sheet for each mark: exact tags first.
    const found = new Map();
    const add = (k, c, extra = null) => {
      const list = found.get(k) || [];
      // The same tag drawn twice at one spot (bold text, a line and its item) is one position.
      if (list.some((f) => Math.abs(cx(f.c) - cx(c)) < Math.max(f.c.h, c.h) && Math.abs(f.c.y - c.y) < Math.max(f.c.h, c.h))) return;
      list.push({ c, extra }); found.set(k, list);
    };
    for (const c of cands) {
      if (offDrawing(p, c)) continue;
      if (c.line && used.has(c.line)) continue;
      if (!c.line && rs.some((r) => r._line.parts.includes(c.it))) continue;
      const k = norm(c.str);
      const ds = markOf.get(k) || [];
      // A schedule row printed on the plan sheet is evidence, not a drawn tag.
      if (!inSchedule(c) && ds.some(doorFits)) add(k, c);
    }
    // g041: suffixed marks drawn as a stacked tag. Some sets number doors by room and letter
    // (schedule 113A, 113B) and draw the tag as the room number with the letter set directly above
    // or below it, two text items on two baselines. A mark with no exact tag on this sheet is
    // placed on such a pair: the number item, and one lone letter item centred on it within 1.2
    // text heights across and 2.4 down or up, at 0.6 to 1.6 times its height. An exact tag always
    // wins, each item serves one tag, and the tag says how it was matched (matched_by). A mark
    // several rows share (g044) collects up to that many pairs, closest pairs first.
    const lone = p.items.filter((it) => /^[A-Z]$/i.test(it.str.trim()) && !offDrawing(p, it) && inPlan(it));
    for (const [k, all] of markOf) {
      if (found.has(k)) continue;
      const m = /^(.*\d)-?([A-Z])$/.exec(k);
      if (!m) continue;
      const ds = all.filter(doorFits);
      if (!ds.length) continue;
      const [, base, letter] = m;
      const pairs = [];
      for (const it of p.items) {
        if (norm(it.str) !== base || offDrawing(p, it) || !inPlan(it)) continue;
        for (const l of lone) {
          if (l.str.trim().toUpperCase() !== letter) continue;
          const dx = Math.abs(cx(l) - cx(it)), dy = Math.abs(l.y - it.y), hr = l.h / it.h;
          if (dx > 1.2 * it.h || dy < 0.5 * it.h || dy > 2.4 * it.h || hr < 0.6 || hr > 1.6) continue;
          pairs.push({ it, l, score: dx + dy });
        }
      }
      pairs.sort((a, b) => a.score - b.score);
      let taken = 0;
      for (const pr of pairs) {
        if (taken >= ds.length) break;
        if (paired.has(pr.l) || paired.has(pr.it)) continue;
        paired.add(pr.l); paired.add(pr.it); taken++;
        const top = Math.min(pr.it.y - pr.it.h, pr.l.y - pr.l.h), bottom = Math.max(pr.it.y, pr.l.y);
        add(k, { str: k, x: Math.min(pr.it.x, pr.l.x), y: bottom, h: bottom - top, w: Math.max(pr.it.x + (pr.it.w || 0), pr.l.x + (pr.l.w || 0)) - Math.min(pr.it.x, pr.l.x) },
          { matched_by: "stacked: " + base + " with " + letter });
      }
    }
    // Assign rows to positions. One row per mark (or the same door on two schedule pages): the
    // first position, as before. k rows of one schedule page sharing a mark (g044, T2507's two 132A
    // openings): k positions on the sheet give each row its own tag, rows in schedule order to tags
    // in reading order, flagged "shared mark, order assumed"; any other count places none of them
    // on this sheet and reports it (never one shared position, never an invented one).
    for (const [k, list] of found) {
      const ds = (markOf.get(k) || []).filter(doorFits);
      if (!ds.length) continue;
      const perPage = new Map();
      for (const d of ds) perPage.set(d.page, (perPage.get(d.page) || 0) + 1);
      if (Math.max(...perPage.values()) < 2 && !ds.some(d => d.opening_id)) { place(k + "|" + [...new Set(ds.map((d) => d.page))].join(","), ds, list[0].c, list[0].extra); continue; }
      if (ds.length === 1) { place(ds[0].opening_id || k, ds, list[0].c, list[0].extra); continue; }
      const rows = [...ds].sort((a, b) => doors.indexOf(a) - doors.indexOf(b));
      if (list.length !== rows.length) {
        shared.push({ mark: rows[0].mark, sheet: t.sheet, page: t.page, rows: rows.length, tags: list.length, placed: false,
          note: "shared mark: " + rows.length + " rows, " + list.length + " tag" + (list.length === 1 ? "" : "s") + " on this sheet; not placed here" });
        continue;
      }
      const spots = [...list].sort((a, b) => (Math.abs(a.c.y - b.c.y) > Math.max(a.c.h, b.c.h) ? a.c.y - b.c.y : cx(a.c) - cx(b.c)));
      rows.forEach((d, i) => place(k + "|row" + doors.indexOf(d), [d], spots[i].c,
        { ...(spots[i].extra || {}), shared_mark: { rows: rows.length, tags: list.length, order: "assumed" }, note: "shared mark, order assumed" }));
      shared.push({ mark: rows[0].mark, sheet: t.sheet, page: t.page, rows: rows.length, tags: list.length, placed: true, note: "shared mark, order assumed" });
    }
  }

  // Tokens drawn like the matched tags (same text size and shape) that no schedule mark names.
  const styles = new Set(tags.map((g) => g.shape + "@" + g.h.toFixed(1)));
  const unmatched = [];
  const allMarks = new Set(markOf.keys());
  const roomNos = new Set(rooms.map((r) => r.page + ":" + norm(r.number)));
  for (const t of planPages) {
    const { p } = byPage.get(t.page);
    for (const it of p.items) {
      if (offDrawing(p, it)) continue;
      if (drawingRegions.has(t.page) && (inTitleRegion(p, it) || !drawingRegions.get(t.page).some(v => insideView(it, v)))) continue;
      const k = norm(it.str);
      if (!k || allMarks.has(k) || roomNos.has(t.page + ":" + k) || paired.has(it)) continue;
      if (!styles.has(shape(it.str) + "@" + it.h.toFixed(1))) continue;
      if (rooms.some((r) => r.page === t.page && r._line.parts.includes(it))) continue;
      unmatched.push({ tag: it.str.trim(), page: t.page, sheet: t.sheet, x: Math.round(cx(it)), y: Math.round(it.y) });
    }
  }
  const placedRows = new Set(tags.flatMap((g) => g._rows || []));
  const notOnPlan = doors.filter((d) => !placedRows.has(d)).map((d) => ({ mark: d.mark || sourceRows(d)[0].mark, page: d.page ?? sourceRows(d)[0].page }));
  for (const r of rooms) delete r._line;
  for (const g of tags) delete g.shape;
  return {
    sheets: tbs.map(({ page, sheet, title, plan, plan_rule }) => ({ page, sheet, title, plan, plan_rule })),
    plan_sheets: sheetsOut,
    rooms, tags, unmatched_tags: unmatched, marks_not_on_plan: notOnPlan, shared_marks: shared,
    counts: { plan_sheets: sheetsOut.length, rooms: rooms.length, corridors: rooms.filter((r) => r.corridor).length, tags: tags.length, unmatched_tags: unmatched.length, schedule_marks: doors.length, marks_not_on_plan: notOnPlan.length, shared_marks: shared.length },
  };
}

// The scale of the drawing a point is in: the sheet's one scale, or (several drawings on one sheet)
// the scale printed nearest below it, where a drawing's title and scale sit. null when none is printed.
function scaleAt(scales, x, y) {
  if (!scales.length) return null;
  const ppf = [...new Set(scales.map((s) => s.points_per_foot))];
  if (ppf.length === 1) return ppf[0];
  const below = scales.filter((s) => s.y > y);
  const pool = below.length ? below : scales;
  return pool.slice().sort((a, b) => Math.hypot(a.x - x, (a.y - y) * 0.5) - Math.hypot(b.x - x, (b.y - y) * 0.5))[0].points_per_foot;
}

// The room a door tag opens into, and how that was found:
//   "schedule_location": the schedule's location names a room on this sheet (by number, else by name);
//   "tag_number":        the mark is numbered after a room on this sheet (131.1 -> room 131);
//   "nearest_label":     only the nearest room label (unsure).
// An explicit schedule room number without a matching label stays unresolved; lower-authority
// names, tag prefixes and proximity must not silently assign a different room.
function roomFor(tag, rs, door, ls, p) {
  const near = (list) => list.slice().sort((a, b) => Math.hypot(a.x - tag.x, a.y - tag.y) - Math.hypot(b.x - tag.x, b.y - tag.y))[0];
  const loc = String(door.location || "").toUpperCase().replace(/[–—]/g, "-");
  if (loc) {
    const toks = new Set(loc.split(/[^A-Z0-9.]+/).filter(Boolean).map(norm));
    // Keep an identifier's prefix and decimal intact (R-101 is not room 101), while a
    // hyphen between a number and a word still separates locations: CELL A101-CELL D102.
    const numbers = s => (s.toUpperCase().replace(/[–—]/g, "-").match(/(?:[A-Z]{1,2}-)?[A-Z0-9]+(?:\.[A-Z0-9]+)*/g) || []).filter(x => ROOM_NO_RE.test(x));
    const roomNos = new Set(numbers(loc));
    const byNo = rs.filter((r) => roomNos.has(norm(r.number)));
    if (byNo.length) return set(tag, near(byNo), "schedule_location");
    const parts = loc.split(/\s*[\/,;]\s*|\s+TO\s+/).map((x) => norm(x)).filter((x) => x.length >= 3);
    if (roomNos.size) {
      // Complete printed names can themselves contain numerals, e.g. RESIDENT ROOM 1.
      // Partial name matches are insufficient: STORAGE 336B must not mean STORAGE 334B.
      const exactNames = rs.filter(r => parts.includes(norm(r.name)));
      const namedNumbers = new Set(exactNames.flatMap(r => numbers(r.name)));
      if (exactNames.length && [...roomNos].every(n => namedNumbers.has(n))) return set(tag, near(exactNames), "schedule_location");
      tag.room = null; tag.room_name = null; tag.room_by = null;
      return;
    }
    // "A-POD / CORRIDOR": each part of the location is a room name or an area label on the sheet.
    const named = [];
    for (const r of rs) if (parts.includes(norm(r.name)) || parts.some((x) => norm(r.name).endsWith(x) && x.length >= 4)) named.push(r);
    for (const l of ls || []) {
      if (offDrawing(p, l) || !parts.includes(norm(l.str))) continue;
      if (rs.some((r) => norm(r.name) === norm(l.str) && Math.hypot(r.x - cx(l), r.y - l.y) < l.h * 3)) continue;
      named.push({ number: null, name: l.str, x: Math.round(cx(l)), y: Math.round(l.y) });
    }
    if (named.length) return set(tag, near(named), "schedule_location");
    const byWords = rs.filter((r) => { const w = words(r.name); return w.length && w.every((x) => toks.has(x)); });
    if (byWords.length) return set(tag, near(byWords), "schedule_location");
  }
  // Numbered after a room: 131.1 -> 131, 128.1.1 -> 128.1, 146A -> 146 (the longest prefix that is a room here).
  let k = norm(tag.mark);
  while (true) {
    const m = k.match(/^(.+?)(?:[.-]\d{1,2}|[A-Z])$/);
    if (!m) break;
    k = m[1];
    const rm = rs.filter((r) => norm(r.number) === k);
    if (rm.length) return set(tag, near(rm), "tag_number");
  }
  let best = null, bd = Infinity;
  for (const r of rs) { const d = Math.hypot(r.x - tag.x, r.y - tag.y); if (d < bd) { bd = d; best = r; } }
  if (best && bd < tag.h * 25) return set(tag, best, "nearest_label", true);
  tag.room = null; tag.room_name = null; tag.room_by = null;
}
function set(tag, r, by, unsure = false) { tag.room = r.number; tag.room_name = r.name; tag.room_by = by; if (unsure) tag.unsure = true; }
