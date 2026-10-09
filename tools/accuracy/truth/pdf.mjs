// tools/accuracy/truth/pdf.mjs
//
// PDF access for the truth harness (2026-10-09). pdf.js is the copy SubX's server already ships
// (weyland-subx-worker/src/vendor/pdfjs-text.mjs, unpdf 1.8.1 = pdf.js 5), imported read-only, so the
// harness needs no npm install. Two things are read from a page:
//   pageItems(pdf, n)  the text items in viewport space (points, y down, baseline y), as
//                      weyland-shared/plan-read.js takes them;
//   pageRules(pdf, n)  the ruled lines of the page: every stroked straight segment and every thin
//                      filled bar, as horizontals { y, x0, x1 } and verticals { x, y0, y1 } in the
//                      same viewport space. This is the geometry the second reader works from; the
//                      production text-layer reader never looks at it for door schedules.
import { getDocument, Util, OPS } from "../../../weyland-subx-worker/src/vendor/pdfjs-text.mjs";

export { Util, OPS };

export async function openPdf(bytes) {
  return getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
}

export async function pageItems(pdf, pageNumber, { withAnnotations = true } = {}) {
  const page = await pdf.getPage(pageNumber);
  try {
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const m = Util.transform(vp.transform, it.transform);
      const h = Math.hypot(m[2], m[3]);
      // Width in viewport units: pdf.js gives it in text space scaled by the font matrix already.
      const sx = Math.hypot(vp.transform[0], vp.transform[1]);
      items.push({ str: it.str, x: m[4], y: m[5], h, w: (it.width || 0) * sx, rot: Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI) });
    }
    // Text typed onto the sheet as a FreeText annotation (an architect's correction) is part of what
    // the page says: its box becomes one item, baseline at the box's lower edge.
    if (withAnnotations) {
      let anns = [];
      try { anns = (await page.getAnnotations()) || []; } catch (_) { anns = []; }
      const hs = items.map((i) => i.h).sort((a, b) => a - b);
      const em = hs.length ? hs[Math.floor(hs.length / 2)] : 10;
      for (const a of anns) {
        const str = a && a.subtype === "FreeText" && Array.isArray(a.rect) ? String((a.contentsObj && a.contentsObj.str) || a.contents || "").replace(/\s+/g, " ").trim() : "";
        if (!str) continue;
        const T = (x, y) => [x * vp.transform[0] + y * vp.transform[2] + vp.transform[4], x * vp.transform[1] + y * vp.transform[3] + vp.transform[5]];
        const p1 = T(a.rect[0], a.rect[1]), p2 = T(a.rect[2], a.rect[3]);
        const x0 = Math.min(p1[0], p2[0]), x1 = Math.max(p1[0], p2[0]), y0 = Math.min(p1[1], p2[1]), y1 = Math.max(p1[1], p2[1]);
        const h = Math.min(em, Math.max(2, y1 - y0));
        items.push({ str, x: x0 + 1, y: y1 - Math.max(0, (y1 - y0 - h) / 2), h, w: Math.min(x1 - x0, str.length * h * 0.6), rot: 0, annotation: true });
      }
    }
    return { page: pageNumber, width: vp.width, height: vp.height, items };
  } finally { try { page.cleanup(); } catch (_) { /* gone */ } }
}

const STROKE = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
const FILL = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);

/** Straight horizontal and vertical rules of a page, merged where collinear and touching. */
export async function pageRules(pdf, pageNumber, { maxOps = 400000 } = {}) {
  const page = await pdf.getPage(pageNumber);
  try {
    const vp = page.getViewport({ scale: 1 });
    const ol = await page.getOperatorList();
    if (ol.fnArray.length > maxOps) return { width: vp.width, height: vp.height, h: [], v: [], skipped: "operator list of " + ol.fnArray.length };
    const H = [], V = [];
    const stack = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const tol = 0.6;
    const push = (ax, ay, bx, by) => {
      const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
      if (dy <= tol && dx > 3) H.push({ y: (ay + by) / 2, x0: Math.min(ax, bx), x1: Math.max(ax, bx) });
      else if (dx <= tol && dy > 3) V.push({ x: (ax + bx) / 2, y0: Math.min(ay, by), y1: Math.max(ay, by) });
    };
    for (let i = 0; i < ol.fnArray.length; i++) {
      const f = ol.fnArray[i], a = ol.argsArray[i];
      if (f === OPS.save) stack.push(ctm);
      else if (f === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (f === OPS.transform) ctm = Util.transform(ctm, a);
      else if (f === OPS.paintFormXObjectBegin) { stack.push(ctm); if (Array.isArray(a[0]) || (a[0] && a[0].length === 6)) ctm = Util.transform(ctm, Array.from(a[0])); }
      else if (f === OPS.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (f === OPS.constructPath && a) {
        const paint = a[0];
        const data = a[1] && a[1][0];
        if (!data || !(STROKE.has(paint) || FILL.has(paint))) continue;
        const m = Util.transform(vp.transform, ctm);
        const T = (x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
        // Walk the path: subpaths of moveTo/lineTo; a curve breaks the straight run.
        const pts = []; // subpaths of device points
        let cur = null;
        for (let k = 0; k < data.length;) {
          const op = data[k];
          if (op === 0) { cur = [T(data[k + 1], data[k + 2])]; pts.push(cur); k += 3; }
          else if (op === 1) { const p = T(data[k + 1], data[k + 2]); if (cur) cur.push(p); else { cur = [p]; pts.push(cur); } k += 3; }
          else if (op === 2) { const p = T(data[k + 5], data[k + 6]); cur = [p]; pts.push(cur); k += 7; }
          else if (op === 3) { const p = T(data[k + 3], data[k + 4]); cur = [p]; pts.push(cur); k += 5; }
          else if (op === 4) { if (cur && cur.length > 2) cur.push(cur[0]); k += 1; }
          else break;
        }
        if (STROKE.has(paint)) {
          for (const sp of pts) for (let j = 1; j < sp.length; j++) push(sp[j - 1][0], sp[j - 1][1], sp[j][0], sp[j][1]);
        } else {
          // A filled shape is a rule only when it is a thin bar.
          for (const sp of pts) {
            if (sp.length < 3) continue;
            const xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            if (y1 - y0 <= 2.5 && x1 - x0 > 3 * (y1 - y0) && x1 - x0 > 3) H.push({ y: (y0 + y1) / 2, x0, x1 });
            else if (x1 - x0 <= 2.5 && y1 - y0 > 3 * (x1 - x0) && y1 - y0 > 3) V.push({ x: (x0 + x1) / 2, y0, y1 });
          }
        }
      }
    }
    return { width: vp.width, height: vp.height, h: mergeH(H), v: mergeV(V), ops: ol.fnArray.length };
  } finally { try { page.cleanup(); } catch (_) { /* gone */ } }
}

function mergeH(list, tolY = 0.8, gap = 3) {
  list.sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const out = [];
  for (const s of list) {
    let o = null;
    for (let k = out.length - 1; k >= 0 && out[k].y >= s.y - 3 * tolY; k--) { const r = out[k]; if (Math.abs(r.y - s.y) <= tolY && s.x0 <= r.x1 + gap && s.x1 >= r.x0 - gap) { o = r; break; } }
    if (o) { o.x0 = Math.min(o.x0, s.x0); o.x1 = Math.max(o.x1, s.x1); } else out.push({ ...s });
  }
  return out;
}
function mergeV(list, tolX = 0.8, gap = 3) {
  list.sort((a, b) => a.x - b.x || a.y0 - b.y0);
  const out = [];
  for (const s of list) {
    let o = null;
    for (let k = out.length - 1; k >= 0 && out[k].x >= s.x - 3 * tolX; k--) { const r = out[k]; if (Math.abs(r.x - s.x) <= tolX && s.y0 <= r.y1 + gap && s.y1 >= r.y0 - gap) { o = r; break; } }
    if (o) { o.y0 = Math.min(o.y0, s.y0); o.y1 = Math.max(o.y1, s.y1); } else out.push({ ...s });
  }
  return out;
}
