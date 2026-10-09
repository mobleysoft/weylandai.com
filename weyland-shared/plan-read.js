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
//   plan_sheets:   the floor plans, found by their title blocks (sheet A..., title says PLAN)
//   rooms:         { page, sheet, number, name, x, y, corridor } from each plan's room labels
//   tags:          { mark, page, sheet, x, y, room, room_name, room_by, also_on }
//   unmatched_tags: tokens drawn like the matched door tags that no schedule mark names
//   marks_not_on_plan: schedule marks no plan sheet tags
//
// Nothing is guessed silently: each tag says how its room was found (room_by), and a room found
// only as the nearest label is marked unsure.

const SHEET_RE = /^[A-Z]{1,3}-?\d{1,3}(?:[.-]\d{1,3})?[A-Z]?$/;
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
  const drawing = (p) => p.width > p.height * 1.15 || p.width > 1500;
  const regionLines = pages.map((p) => (drawing(p) ? lines(p.items.filter((it) => inTitleRegion(p, it))) : []));
  // Where a sheet title can sit: the title block, or the strip beside it along the bottom.
  const titleLines = pages.map((p) => (drawing(p) ? lines(p.items.filter((it) => it.x > p.width * 0.62 && it.y > p.height * 0.5)) : []));
  // A string on the title blocks of many different sheets (owner, project, address) is not a sheet title;
  // a title repeats only under the same sheet number (one A2.1 per school in a three-school set).
  const sheetOf = regionLines.map((ls) => { const n = ls.filter((l) => SHEET_RE.test(l.str.replace(/\s+/g, "")) && !/^\d/.test(l.str)).sort((a, b) => b.h - a.h)[0]; return n ? n.str.replace(/\s+/g, "") : null; });
  const seen = new Map();
  regionLines.forEach((ls, i) => { for (const l of ls) { const k = norm(l.str); if (!seen.has(k)) seen.set(k, new Set()); seen.get(k).add(sheetOf[i] || "?" + i); } });
  const nSheets = new Set(sheetOf.filter(Boolean)).size;
  const boiler = (s) => { const n = (seen.get(norm(s)) || new Set()).size; return n >= 3 && n >= nSheets * 0.5; };
  return pages.map((p, i) => {
    const ls = regionLines[i];
    const nums = ls.filter((l) => SHEET_RE.test(l.str.replace(/\s+/g, "")) && !/^\d/.test(l.str)).sort((a, b) => (b.h - a.h) || ((b.x + b.y) - (a.x + a.y)));
    const num = nums[0] || null;
    let title = null;
    if (num) {
      const cand = titleLines[i].filter((l) => norm(l.str) !== norm(num.str) && /[A-Z]{3,}/.test(l.str) && !LABEL_WORDS.test(l.str.trim().toUpperCase()) && !/SCALE|\d+\s*\/\s*\d+\s*"|^[\d\/.\-\s#]+$|COPYRIGHT|©/i.test(l.str) && !boiler(l.str) && l.h <= num.h * 1.05);
      cand.sort((a, b) => (Math.round(b.h) - Math.round(a.h)) || ((b.xEnd + b.y) - (a.xEnd + a.y)));
      if (cand.length) {
        const top = cand[0];
        // A title set on two lines: the lines of the same size stacked with it.
        const same = cand.filter((l) => l.rot === top.rot && Math.abs(l.h - top.h) < 0.6 && Math.abs(l.y - top.y) < top.h * 1.7 && l.x < top.xEnd && l.xEnd > top.x).sort((a, b) => a.y - b.y);
        title = same.map((l) => l.str).join(" ").replace(/\s+/g, " ").trim();
      }
    }
    const sheet = num ? num.str.replace(/\s+/g, "") : null;
    const plan = !!(sheet && /^A/i.test(sheet) && title && /\bPLANS?\b/i.test(title) && !NOT_A_PLAN.test(title.toUpperCase()));
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

export function readPlan(pages, doors = [], opts = {}) {
  const tbs = titleBlocks(pages);
  const byPage = new Map(pages.map((p, i) => [p.page, { p, tb: tbs[i] }]));
  const planPages = tbs.filter((t) => t.plan);
  const markOf = new Map();
  // SubX keeps a mark printed on two schedule pages apart as "001 [p.286]"; the plan prints "001".
  const tagOf = (d) => norm(String(d.mark || "").replace(/\s*\[p\.?\s*\d+\]\s*$/i, ""));
  for (const d of doors) { const k = tagOf(d); if (!k) continue; if (!markOf.has(k)) markOf.set(k, []); markOf.get(k).push(d); }
  const rooms = [], tags = [], seenTag = new Map(), sheetsOut = [];
  const scheduleBlock = (page) => (byPage.get(page) || {}).tb;

  for (const t of planPages) {
    const { p } = byPage.get(t.page);
    const ls = lines(p.items);
    const { rooms: rs, used } = roomsOn(p, ls, t);
    const scales = scalesOn(lines(p.items, 4, 1.6));
    sheetsOut.push({ page: t.page, sheet: t.sheet, title: t.title, rooms: rs.length, scales: scales.map((s) => s.text), points_per_foot: [...new Set(scales.map((s) => s.points_per_foot))] });
    for (const r of rs) { r.points_per_foot = scaleAt(scales, r.x, r.y); rooms.push(r); }
    // The schedule pages whose title block matches this sheet's best (one building of several in a set).
    const candPages = [...new Set(doors.map((d) => d.page).filter((x) => x != null))];
    let bestSim = -1, keep = null;
    for (const sp of candPages) { const sb = scheduleBlock(sp); const s = sb ? similarity(t.block, sb.block) : 0; if (s > bestSim + 1e-9) { bestSim = s; keep = new Set([sp]); } else if (Math.abs(s - bestSim) < 1e-9) keep.add(sp); }
    const doorFits = (d) => !keep || d.page == null || keep.has(d.page);
    // Door tags: each single item, and each joined line, equal to a schedule mark.
    const cands = [];
    for (const it of p.items) cands.push({ str: it.str.trim(), x: it.x, y: it.y, h: it.h, w: it.w || 0, it });
    for (const l of ls) if (l.parts.length > 1) cands.push({ str: l.str, x: l.x, y: l.y, h: l.h, w: l.w, line: l });
    const seenHere = new Set();
    for (const c of cands) {
      if (offDrawing(p, c)) continue;
      if (c.line && used.has(c.line)) continue;
      if (!c.line && rs.some((r) => r._line.parts.includes(c.it))) continue;
      const k = norm(c.str);
      const ds = (markOf.get(k) || []).filter(doorFits);
      if (!ds.length) continue;
      const key = k + "@" + t.page;
      if (seenHere.has(key)) continue;
      seenHere.add(key);
      const tag = { mark: ds[0].mark, page: t.page, sheet: t.sheet, x: Math.round(cx(c)), y: Math.round(c.y - c.h / 2), h: c.h, shape: shape(c.str), door_pages: [...new Set(ds.map((d) => d.page))] };
      roomFor(tag, rs, ds[0], ls, p);
      tag.points_per_foot = scaleAt(scales, tag.x, tag.y);
      if (!seenTag.has(k + "|" + tag.door_pages.join(","))) { seenTag.set(k + "|" + tag.door_pages.join(","), tag); tags.push(tag); }
      else {
        const first = seenTag.get(k + "|" + tag.door_pages.join(","));
        // Keep the sheet that also shows the door's room (an enlarged plan beats a key plan without labels).
        const better = !first.room && tag.room;
        if (better) { Object.assign(tag, { also_on: [...(first.also_on || []), first.sheet] }); tags[tags.indexOf(first)] = tag; seenTag.set(k + "|" + tag.door_pages.join(","), tag); }
        else (first.also_on ||= []).includes(t.sheet) || first.also_on.push(t.sheet);
      }
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
      const k = norm(it.str);
      if (!k || allMarks.has(k) || roomNos.has(t.page + ":" + k)) continue;
      if (!styles.has(shape(it.str) + "@" + it.h.toFixed(1))) continue;
      if (rooms.some((r) => r.page === t.page && r._line.parts.includes(it))) continue;
      unmatched.push({ tag: it.str.trim(), page: t.page, sheet: t.sheet, x: Math.round(cx(it)), y: Math.round(it.y) });
    }
  }
  const tagged = new Set(tags.map((g) => tagOf(g) + "|" + g.door_pages.join(",")));
  const notOnPlan = doors.filter((d) => ![...tagged].some((k) => k.startsWith(tagOf(d) + "|") && (d.page == null || k.split("|")[1].split(",").includes(String(d.page))))).map((d) => ({ mark: d.mark, page: d.page }));
  for (const r of rooms) delete r._line;
  for (const g of tags) delete g.shape;
  return {
    sheets: tbs.map(({ page, sheet, title, plan }) => ({ page, sheet, title, plan })),
    plan_sheets: sheetsOut,
    rooms, tags, unmatched_tags: unmatched, marks_not_on_plan: notOnPlan,
    counts: { plan_sheets: sheetsOut.length, rooms: rooms.length, corridors: rooms.filter((r) => r.corridor).length, tags: tags.length, unmatched_tags: unmatched.length, schedule_marks: doors.length, marks_not_on_plan: notOnPlan.length },
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
function roomFor(tag, rs, door, ls, p) {
  const near = (list) => list.slice().sort((a, b) => Math.hypot(a.x - tag.x, a.y - tag.y) - Math.hypot(b.x - tag.x, b.y - tag.y))[0];
  const loc = String(door.location || "").toUpperCase();
  if (loc) {
    const toks = new Set(loc.split(/[^A-Z0-9.]+/).filter(Boolean).map(norm));
    const byNo = rs.filter((r) => toks.has(norm(r.number)));
    if (byNo.length) return set(tag, near(byNo), "schedule_location");
    // "A-POD / CORRIDOR": each part of the location is a room name or an area label on the sheet.
    const parts = loc.split(/\s*[\/,;]\s*|\s+TO\s+/).map((x) => norm(x)).filter((x) => x.length >= 3);
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
