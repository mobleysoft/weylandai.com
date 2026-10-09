#!/usr/bin/env node
// Text items of one page in viewport space: x, y (top-left origin, points), h (glyph height), str.
//   node dump_text.mjs <file.pdf> <page> [out.json]
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";
export async function pageItems(doc, pageNo) {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const m = pdfjs.Util.transform(vp.transform, it.transform);
    const h = Math.hypot(m[2], m[3]);
    items.push({ str: it.str, x: m[4], y: m[5], h, w: it.width, rot: Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI) });
  }
  return { width: vp.width, height: vp.height, items };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, p, out] = process.argv.slice(2);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableWorker: true, isEvalSupported: false, verbosity: 0 }).promise;
  const r = await pageItems(doc, +p);
  const s = JSON.stringify(r);
  if (out) fs.writeFileSync(out, s); else process.stdout.write(s);
}
