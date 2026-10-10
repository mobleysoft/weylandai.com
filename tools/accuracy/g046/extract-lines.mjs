#!/usr/bin/env node
// g046: freeze a page's text-layer lines (as the production reader sees them) into a test fixture.
//   node tools/accuracy/g046/extract-lines.mjs <pdf> <page> <out.json> [y0 y1]
// y0..y1 (points, y down) keeps only the lines of the schedule's region.
import fs from "node:fs";
import { getDocument, Util } from "../../../weyland-subx-worker/src/vendor/pdfjs-text.mjs";
import * as TL from "../../../weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs";
const [file, pn, out, y0, y1] = process.argv.slice(2);
const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
const tl = await TL.pageTextLines({ Util }, await pdf.getPage(+pn));
const lines = tl.lines.filter((L) => y0 == null || (L.y >= +y0 && L.y <= +y1));
fs.writeFileSync(out, JSON.stringify({ source: file.split("/").pop(), page: +pn, width: tl.width, height: tl.height, lines }) + "\n");
console.log(out, lines.length, "lines", fs.statSync(out).size, "bytes");
