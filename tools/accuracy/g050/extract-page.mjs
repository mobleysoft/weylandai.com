// node tools/accuracy/g047/extract-page.mjs <pdf> <page> <x0,y0,x1,y1> <out.json>
// g047/g050: one schedule's text items and ruled lines, cropped to its box (plus a margin), for reader B tests.
import { readFileSync, writeFileSync } from "node:fs";
import { openPdf, pageItems, pageRules } from "../truth/pdf.mjs";
const [f, p, box, out] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(",").map(Number);
const m = 20;
const pdf = await openPdf(readFileSync(f));
const pg = await pageItems(pdf, +p);
const rules = await pageRules(pdf, +p);
const inX = (x) => x >= x0 - m && x <= x1 + m, inY = (y) => y >= y0 - m && y <= y1 + m;
const r2 = (v) => Math.round(v * 100) / 100;
const items = pg.items.filter((it) => inX(it.x) && inY(it.y)).map((it) => ({ str: it.str, x: r2(it.x), y: r2(it.y), w: r2(it.w), h: r2(it.h), ...(it.rot ? { rot: it.rot } : {}) }));
const h = rules.h.filter((s) => inY(s.y) && s.x1 >= x0 - m && s.x0 <= x1 + m).map((s) => ({ y: r2(s.y), x0: r2(s.x0), x1: r2(s.x1) }));
const v = rules.v.filter((s) => inX(s.x) && s.y1 >= y0 - m && s.y0 <= y1 + m).map((s) => ({ x: r2(s.x), y0: r2(s.y0), y1: r2(s.y1) }));
writeFileSync(out, JSON.stringify({ source: f.split("/").pop(), page: +p, box: [x0, y0, x1, y1], width: rules.width, height: rules.height, items, rules: { width: rules.width, height: rules.height, h, v } }) + "\n");
console.log(out, items.length, "items", h.length, "h", v.length, "v");
