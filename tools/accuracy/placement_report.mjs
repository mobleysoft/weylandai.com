#!/usr/bin/env node
// One row per placement record; highest placed_rate, then most marks, then sha16.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sortPlacements, placementTable, placementTotals } from "./placement.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, "../corpus/harvest/placement");
const records = sortPlacements(readdirSync(dir).filter((f) => /^[0-9a-f]{16}\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8"))));
const date = new Date().toISOString().slice(0, 10);
const t = placementTotals(records);
const total = `Sets: ${t.sets}; SightX-ready: ${t.ready}; marks placed: ${t.marks_placed}/${t.marks_total}.`;
const out = join(here, "placement_report_" + date + ".md");
writeFileSync(out, `# Placement report, ${date}\n\n${total}\n\nSightX-ready: placed_rate >= 0.9, at least one sheet with an announced scale, and at least one tag with a room number. Counts follow schedule rows, including repeated marks. Sorted by placed_rate descending, then marks_total descending, then sha16.\n\n${placementTable(records)}\n`);
console.log(total + "\n\n" + placementTable(records.slice(0, 20)) + "\n\nWrote " + out);
