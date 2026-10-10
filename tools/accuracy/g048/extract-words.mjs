#!/usr/bin/env node
// g048: freeze a page's words (before line grouping) as pageTextLines builds them, for a test that
// runs clusterLines itself.   node tools/accuracy/g048/extract-words.mjs <pdf> <page> <out.json>
import fs from "node:fs";
import { getDocument, Util } from "../../../weyland-subx-worker/src/vendor/pdfjs-text.mjs";
import * as TL from "../../../weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs";
const [file, pn, out] = process.argv.slice(2);
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
const page = await doc.getPage(+pn);
const content = await page.getTextContent();
const vp = page.getViewport({ scale: 1, rotation: page.rotate || 0 });
const words = TL.itemsToWords(content.items, (t) => Util.transform(vp.transform, t));
const tl = await TL.pageTextLines({ Util }, page);
if (tl.rotation !== 0) throw new Error("page reads rotated; this extractor keeps rotation 0 only");
fs.writeFileSync(out, JSON.stringify({ source: file.split("/").pop(), page: +pn, width: vp.width, height: vp.height, words }) + "\n");
console.log(out, words.length, "words", fs.statSync(out).size, "bytes");
