#!/usr/bin/env node
// Stage 1 of docs/PDF_TO_TWIN_RULES.md: sheet triage, scale lock, wall
// extraction from VECTOR plan PDFs. Deterministic, no model calls.
//
//   node extract_walls.mjs triage <file.pdf>                 -> per-page sheet type guess, path counts, scale strings
//   node extract_walls.mjs walls  <file.pdf> <page> [out.json] -> walls (centerline + thickness, feet), scale, stats
//
// Uses the same pdf.js the product ships (pdfjs-dist legacy build for Node);
// the browser module can run the identical walk over getOperatorList().
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";

const OPS = pdfjs.OPS;
const NAME = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));

// ---------------------------------------------------------------- matrices
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

// ---------------------------------------------------------------- page walk
async function openPage(file, pageNo) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, disableWorker: true, isEvalSupported: false }).promise;
  const page = await doc.getPage(pageNo);
  return { doc, page };
}

// Collect stroked segments and filled quads in viewport (top-left, points) space.
async function collectGeometry(page) {
  const vp = page.getViewport({ scale: 1 });
  const base = vp.transform;
  const ops = await page.getOperatorList();
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let lineWidth = 1;
  const segments = []; // {x1,y1,x2,y2,w}
  const quads = [];    // {pts:[[x,y]..]} closed filled polygons with 4 corners
  let pending = null;  // subpaths from the last constructPath
  const toView = (x, y) => { const [ux, uy] = apply(ctm, x, y); return apply(base, ux, uy); };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    switch (fn) {
      case OPS.save: stack.push({ ctm, lineWidth }); break;
      case OPS.restore: { const s = stack.pop(); if (s) { ctm = s.ctm; lineWidth = s.lineWidth; } break; }
      case OPS.transform: ctm = mul(ctm, args); break;
      case OPS.setLineWidth: lineWidth = args[0]; break;
      case OPS.constructPath: {
        const [pops, coords] = args;
        const subpaths = [];
        let cur = null, k = 0;
        for (const op of pops) {
          if (op === OPS.moveTo) { cur = { pts: [toView(coords[k], coords[k + 1])], closed: false }; subpaths.push(cur); k += 2; }
          else if (op === OPS.lineTo) { if (!cur) { cur = { pts: [], closed: false }; subpaths.push(cur); } cur.pts.push(toView(coords[k], coords[k + 1])); k += 2; }
          else if (op === OPS.curveTo) { if (cur) cur.pts.push(toView(coords[k + 4], coords[k + 5])); k += 6; }
          else if (op === OPS.curveTo2 || op === OPS.curveTo3) { if (cur) cur.pts.push(toView(coords[k + 2], coords[k + 3])); k += 4; }
          else if (op === OPS.closePath) { if (cur) cur.closed = true; }
          else if (op === OPS.rectangle) {
            const [x, y, w, h] = [coords[k], coords[k + 1], coords[k + 2], coords[k + 3]]; k += 4;
            subpaths.push({ pts: [toView(x, y), toView(x + w, y), toView(x + w, y + h), toView(x, y + h)], closed: true });
            cur = null;
          }
        }
        pending = { subpaths, w: lineWidth * scaleOf(ctm) * scaleOf(base) };
        break;
      }
      case OPS.stroke: case OPS.closeStroke: case OPS.fillStroke: case OPS.eoFillStroke:
      case OPS.closeFillStroke: case OPS.closeEOFillStroke: {
        if (!pending) break;
        for (const sp of pending.subpaths) {
          const pts = sp.closed ? [...sp.pts, sp.pts[0]] : sp.pts;
          for (let j = 1; j < pts.length; j++) segments.push({ x1: pts[j - 1][0], y1: pts[j - 1][1], x2: pts[j][0], y2: pts[j][1], w: pending.w });
        }
        if (fn !== OPS.stroke && fn !== OPS.closeStroke) for (const sp of pending.subpaths) if (sp.pts.length >= 4) quads.push(sp.pts);
        pending = null; break;
      }
      case OPS.fill: case OPS.eoFill: {
        if (!pending) break;
        for (const sp of pending.subpaths) if (sp.pts.length >= 4) quads.push(sp.pts);
        pending = null; break;
      }
      case OPS.endPath: case OPS.clip: case OPS.eoClip: pending = null; break;
      default: break;
    }
  }
  return { vp, segments, quads, opCount: ops.fnArray.length };
}

// ---------------------------------------------------------------- text + scale
async function collectText(page) {
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = tc.items.filter(it => it.str && it.str.trim()).map(it => {
    const [x, y] = apply(vp.transform, it.transform[4], it.transform[5]);
    return { str: it.str, x, y, h: Math.hypot(it.transform[1], it.transform[3]) || 8, w: it.width || 0 };
  });
  // Join items that share a baseline into lines (CAD exports split words).
  // Bucket by baseline first (CAD exports jitter y by a point or two and
  // emit items out of reading order), then left to right within a line.
  items.sort((a, b) => (Math.round(a.y / 3) - Math.round(b.y / 3)) || (a.x - b.x));
  const lines = [];
  for (const it of items) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) <= Math.max(3, it.h * 0.5) && it.x >= last.x && it.x - last.xEnd < Math.max(12, it.h * 3)) {
      last.text += (it.x - last.xEnd > it.h * 0.25 ? " " : "") + it.str; last.xEnd = it.x + it.w;
    } else lines.push({ text: it.str, x: it.x, y: it.y, xEnd: it.x + it.w, h: it.h });
  }
  return lines;
}

// The "=" is often a separate glyph or missing in CAD text runs ("3/32\" 1'-0\""), so it is optional.
const SCALE_RE = /(\d+(?:\s+\d+)?\/\d+|\d+(?:\.\d+)?)\s*"\s*=?\s*(\d+)\s*'\s*-?\s*(\d+)?\s*"?/;
const METRIC_RE = /\b1\s*:\s*(\d{2,4})\b/;

function parseScale(lines) {
  const found = [];
  for (const ln of lines) {
    // Only lines that announce a scale: the word SCALE or an explicit "=".
    // Dimension strings (9'-3 1/2" 4'-1") otherwise masquerade as scales.
    if (!/SCALE|=/i.test(ln.text)) continue;
    let m = ln.text.match(SCALE_RE);
    if (m) {
      const inch = m[1].includes("/") ? m[1].trim().split(/\s+/).reduce((acc, part) => acc + (part.includes("/") ? Number(part.split("/")[0]) / Number(part.split("/")[1]) : Number(part)), 0) : Number(m[1]);
      const feet = Number(m[2]) + (m[3] ? Number(m[3]) / 12 : 0);
      const ppf = (inch * 72) / feet;
      // Plausible architectural scales: 1/32" = 1' (2.25 pt/ft) .. 3" = 1' (216 pt/ft).
      if (inch > 0 && feet > 0 && ppf >= 2.25 && ppf <= 216) found.push({ text: ln.text.trim(), pointsPerFoot: ppf, x: ln.x, y: ln.y, kind: "imperial", announced: /SCALE/i.test(ln.text) });
      continue;
    }
    m = ln.text.match(METRIC_RE);
    if (m) found.push({ text: ln.text.trim(), pointsPerFoot: (72 * 12 / 1) / Number(m[1]), x: ln.x, y: ln.y, kind: "metric" });
  }
  return found;
}

// ---------------------------------------------------------------- walls
function quadToWall(pts, ppf) {
  // Oriented bounding approximation: use the two longest edges of the polygon.
  const edges = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    edges.push({ a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) });
  }
  edges.sort((p, q) => q.len - p.len);
  const e0 = edges[0], e1 = edges[1];
  if (!e0 || !e1 || e0.len < 1e-3) return null;
  const parallel = Math.abs(Math.sin(e0.ang - e1.ang)) < 0.08;
  if (!parallel) return null;
  // thickness = distance between the two long edges
  const nx = -Math.sin(e0.ang), ny = Math.cos(e0.ang);
  const t = Math.abs((e1.a[0] - e0.a[0]) * nx + (e1.a[1] - e0.a[1]) * ny);
  const thicknessFt = t / ppf, lengthFt = e0.len / ppf;
  if (thicknessFt < 0.25 || thicknessFt > 1.5 || lengthFt < 0.5) return null; // 3" .. 18" thick, >= 6" long
  const cx = (e0.a[0] + e0.b[0] + e1.a[0] + e1.b[0]) / 4, cy = (e0.a[1] + e0.b[1] + e1.a[1] + e1.b[1]) / 4;
  const dx = Math.cos(e0.ang) * e0.len / 2, dy = Math.sin(e0.ang) * e0.len / 2;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy, thickness: thicknessFt, length: lengthFt, source: "fill" };
}

function pairStrokesToWalls(segments, ppf) {
  // Axis-aligned stroked wall faces: pair parallel segments at wall thickness.
  const H = [], V = [];
  for (const s of segments) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
    if (len / ppf < 0.5) continue;
    if (Math.abs(dy) <= 0.02 * Math.abs(dx)) H.push({ c: (s.y1 + s.y2) / 2, a: Math.min(s.x1, s.x2), b: Math.max(s.x1, s.x2) });
    else if (Math.abs(dx) <= 0.02 * Math.abs(dy)) V.push({ c: (s.x1 + s.x2) / 2, a: Math.min(s.y1, s.y2), b: Math.max(s.y1, s.y2) });
  }
  const minT = 0.25 * ppf, maxT = 1.5 * ppf, minOverlap = 1.0 * ppf;
  const walls = [];
  const pair = (arr, horizontal) => {
    arr.sort((p, q) => p.c - q.c);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length && arr[j].c - arr[i].c <= maxT; j++) {
        const t = arr[j].c - arr[i].c;
        if (t < minT) continue;
        const a = Math.max(arr[i].a, arr[j].a), b = Math.min(arr[i].b, arr[j].b);
        if (b - a < minOverlap) continue;
        const c = (arr[i].c + arr[j].c) / 2;
        walls.push(horizontal
          ? { x1: a, y1: c, x2: b, y2: c, thickness: t / ppf, length: (b - a) / ppf, source: "stroke-pair" }
          : { x1: c, y1: a, x2: c, y2: b, thickness: t / ppf, length: (b - a) / ppf, source: "stroke-pair" });
      }
    }
  };
  pair(H, true); pair(V, false);
  return walls;
}

function mergeCollinear(walls, ppf) {
  // Merge walls that are collinear (same axis line within 1") and touch/overlap.
  const tol = ppf / 12;
  const out = [];
  const byAxis = { h: [], v: [], o: [] };
  for (const w of walls) {
    if (Math.abs(w.y1 - w.y2) < tol) byAxis.h.push(w); else if (Math.abs(w.x1 - w.x2) < tol) byAxis.v.push(w); else byAxis.o.push(w);
  }
  for (const key of ["h", "v"]) {
    const horiz = key === "h";
    const arr = byAxis[key].map(w => ({ c: horiz ? w.y1 : w.x1, a: Math.min(horiz ? w.x1 : w.y1, horiz ? w.x2 : w.y2), b: Math.max(horiz ? w.x1 : w.y1, horiz ? w.x2 : w.y2), t: w.thickness, n: 1 }));
    arr.sort((p, q) => (p.c - q.c) || (p.a - q.a));
    const merged = [];
    for (const s of arr) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.c - s.c) < tol && s.a <= last.b + tol * 2 && Math.abs(last.t - s.t) < 0.2) {
        last.b = Math.max(last.b, s.b); last.c = (last.c * last.n + s.c) / (last.n + 1); last.t = (last.t * last.n + s.t) / (last.n + 1); last.n += 1;
      } else merged.push({ ...s });
    }
    for (const m of merged) out.push(horiz
      ? { x1: m.a, y1: m.c, x2: m.b, y2: m.c, thickness: m.t, length: (m.b - m.a) / ppf, pieces: m.n }
      : { x1: m.c, y1: m.a, x2: m.c, y2: m.b, thickness: m.t, length: (m.b - m.a) / ppf, pieces: m.n });
  }
  for (const w of byAxis.o) out.push({ ...w, pieces: 1 });
  return out;
}

// Closure check (rule 1): every wall endpoint should meet another wall within one thickness.
function closureStats(walls, ppf) {
  let ends = 0, open = 0;
  const pts = [];
  for (const w of walls) { pts.push([w.x1, w.y1, w.thickness], [w.x2, w.y2, w.thickness]); }
  for (let i = 0; i < pts.length; i++) {
    ends++;
    const [x, y, t] = pts[i];
    const r = Math.max(t, 0.5) * ppf;
    let met = false;
    for (const w of walls) {
      // distance from point to wall segment
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L2 = dx * dx + dy * dy || 1;
      let u = ((x - w.x1) * dx + (y - w.y1) * dy) / L2; u = Math.max(0, Math.min(1, u));
      const px = w.x1 + u * dx, py = w.y1 + u * dy;
      const d = Math.hypot(px - x, py - y);
      if (d < 1e-6) continue; // its own endpoint
      if (d <= r) { met = true; break; }
    }
    if (!met) open++;
  }
  return { endpoints: ends, open, closedFraction: ends ? (ends - open) / ends : 0 };
}

// ---------------------------------------------------------------- modes
async function triage(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, disableWorker: true, isEvalSupported: false }).promise;
  const rows = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const lines = await collectText(page);
    const text = lines.map(l => l.text).join("\n");
    const ops = await page.getOperatorList();
    const paths = ops.fnArray.filter(f => f === OPS.constructPath).length;
    const scale = parseScale(lines);
    const type = /DOOR SCHEDULE/i.test(text) ? "schedule" : /FLOOR PLAN|LIFE SAFETY PLAN|REFLECTED CEILING/i.test(text) ? "plan" : /ELEVATION/i.test(text) ? "elevation" : /SECTION|DETAIL/i.test(text) ? "section/detail" : "other";
    const sheet = (text.match(/\b([A-Z]{1,2}-?\d{1,3}(?:\.\d{1,2})?)\b(?=\s*$)/m) || [])[1] || null;
    rows.push({ page: p, type, sheet, paths, hardware: /HARDWARE (SET|GROUP)/i.test(text), scales: scale.slice(0, 3).map(s => s.text) });
  }
  console.log(JSON.stringify({ file, pages: doc.numPages, rows }, null, 1));
}

async function walls(file, pageNo, out) {
  const { page } = await openPage(file, pageNo);
  const geo = await collectGeometry(page);
  const lines = await collectText(page);
  const scales = parseScale(lines);
  // Scale lock: prefer the most common imperial scale on the sheet.
  const tally = {};
  for (const s of scales) tally[s.pointsPerFoot.toFixed(3)] = (tally[s.pointsPerFoot.toFixed(3)] || 0) + 1;
  const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const ppf = best ? Number(best[0]) : null;
  const result = { file, page: pageNo, viewport: { width: geo.vp.width, height: geo.vp.height }, ops: geo.opCount,
    segments: geo.segments.length, filledPolygons: geo.quads.length, scaleCandidates: scales.map(s => ({ text: s.text, pointsPerFoot: +s.pointsPerFoot.toFixed(3) })), pointsPerFoot: ppf };
  if (!ppf) { result.error = "no scale string found on this sheet (rule: scale lock failed; do not draw)"; console.log(JSON.stringify(result, null, 1)); return; }
  const fromFill = geo.quads.map(q => quadToWall(q, ppf)).filter(Boolean);
  const fromStroke = pairStrokesToWalls(geo.segments, ppf);
  const merged = mergeCollinear([...fromFill, ...fromStroke], ppf);
  const closure = closureStats(merged, ppf);
  const thick = {};
  for (const w of merged) { const k = (Math.round(w.thickness * 12 * 8) / 8).toFixed(3); thick[k] = (thick[k] || 0) + 1; }
  Object.assign(result, {
    walls: merged.length, wallsFromFill: fromFill.length, wallsFromStrokePairs: fromStroke.length,
    totalWallLengthFt: +merged.reduce((a, w) => a + w.length, 0).toFixed(1),
    thicknessHistogramInches: Object.fromEntries(Object.entries(thick).sort((a, b) => b[1] - a[1]).slice(0, 8)),
    closure,
  });
  const payload = { ...result, wallList: merged.map(w => ({
    x1: +(w.x1 / ppf).toFixed(3), y1: +(w.y1 / ppf).toFixed(3), x2: +(w.x2 / ppf).toFixed(3), y2: +(w.y2 / ppf).toFixed(3),
    thickness: +w.thickness.toFixed(3), length: +w.length.toFixed(2), px: [w.x1, w.y1, w.x2, w.y2].map(v => +v.toFixed(1)) })) };
  if (out) fs.writeFileSync(out, JSON.stringify(payload));
  console.log(JSON.stringify(result, null, 1));
}

async function text(file, pageNo, grep) {
  const { page } = await openPage(file, pageNo);
  const lines = await collectText(page);
  const re = grep ? new RegExp(grep, "i") : null;
  for (const ln of lines) if (!re || re.test(ln.text)) console.log(JSON.stringify({ x: +ln.x.toFixed(1), y: +ln.y.toFixed(1), h: +ln.h.toFixed(1), text: ln.text }));
}

const [mode, file, pageArg, outArg] = process.argv.slice(2);
if (mode === "triage" && file) await triage(file);
else if (mode === "text" && file && pageArg) await text(file, Number(pageArg), outArg);
else if (mode === "walls" && file && pageArg) await walls(file, Number(pageArg), outArg);
else { console.error("usage: extract_walls.mjs triage <pdf> | text <pdf> <page> [regex] | walls <pdf> <page> [out.json]"); process.exit(2); }
