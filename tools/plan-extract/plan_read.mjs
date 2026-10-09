#!/usr/bin/env node
// The floor plan of a bid set, read with weyland-shared/plan-read.js (the reader SubX's server runs).
//   node plan_read.mjs <file.pdf> [doors.json] [out.json]
// doors.json: a tools/corpus/expected door schedule ({ doors: [{ mark, room|location, page }] }).
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";
import { pageItems } from "./dump_text.mjs";
import { readPlan } from "../../weyland-shared/plan-read.js";

const [file, doorsFile, out] = process.argv.slice(2);
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableWorker: true, isEvalSupported: false, verbosity: 0 }).promise;
const t0 = Date.now();
const pages = [];
for (let p = 1; p <= doc.numPages; p++) pages.push({ page: p, ...(await pageItems(doc, p)) });
const exp = doorsFile ? JSON.parse(fs.readFileSync(doorsFile, "utf8")) : { doors: [] };
const doors = (exp.doors || []).map((d) => ({ mark: d.mark, location: d.room || d.location || null, page: d.page ?? null }));
const r = readPlan(pages, doors);
r.ms = Date.now() - t0;
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
console.log(JSON.stringify({ counts: r.counts, plan_sheets: r.plan_sheets, ms: r.ms }, null, 1));
