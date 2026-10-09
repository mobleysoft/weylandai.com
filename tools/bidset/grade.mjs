// tools/bidset/grade.mjs
//
// The prime contractor's side (2026-10-09; docs/direction-2026-10-08.md): the WeylandAI Building's
// bid set (tools/bidset/make.mjs) goes through SubX by the same requests the workspace makes, and
// the submittal SubX builds is graded on a GC's acceptance checklist against the truth that drew
// the set (tools/bidset/building.mjs). The public sets (tools/accuracy/*) stay the outside check, so
// this is never the only grade.
//
//   POST /api/hardware-schedule/start                       upload
//   POST /api/hardware-schedule/session/:id/find-pages      does SubX find the schedule and 08 71 00 itself?
//   POST /api/hardware-schedule/session/:id/read-pages      read the pages it found (else the truth's pages)
//   GET  /api/hardware-schedule/session/:id/doors           what the workspace shows
//   POST /api/hardware-schedule/session/:id/submittal-pdf   the packet; GET it back and read it
//   DELETE /api/hardware-schedule/session/:id               clean up
//
// The checklist (each line PASS or FAIL with its numbers):
//   1 every opening is in the submittal, with its mark
//   2 each opening carries the right hardware group, size, door type and fire rating
//   3 every group is there with every item as specified (qty, catalog number, finish, maker)
//   4 every item the catalogue holds has its cut-sheet page in the packet
//   5 every item it does not hold is listed as missing with what is needed (or as furnished by others)
//   6 the packet names the project and opens with a table of contents
//
// Usage: node tools/bidset/grade.mjs --token-file <path> [--variant vector|scanned|both] [--base https://weylandai.com]
// Run tools/bidset/make.mjs first. Writes grade_report_<stamp>.{json,md} next to this file.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { PROJECT, GROUPS, OPENINGS } from "./building.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const H = { Authorization: "Bearer " + TOKEN };
const OUT = join(here, "out");
const truthDoors = JSON.parse(readFileSync(join(OUT, "truth-doors.json"), "utf8"));
const truthGroups = JSON.parse(readFileSync(join(OUT, "truth-groups.json"), "utf8"));
const VARIANTS = { vector: join(OUT, "weylandai-building-bidset.pdf"), scanned: join(OUT, "weylandai-building-bidset-scanned.pdf") };
const which = args.variant && args.variant !== "both" ? [String(args.variant)] : ["vector", "scanned"];

async function api(path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const data = (r.headers.get("content-type") || "").includes("json") ? await r.json().catch(() => null) : null;
  return { ok: r.ok, status: r.status, data, ms: Date.now() - t0 };
}
const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const up = (s) => String(s == null ? "" : s).trim().toUpperCase();
const norm = (s) => up(s).replace(/[^A-Z0-9]+/g, "");
const group = (s) => up(s).split(/[^A-Z0-9]+/).filter(Boolean)[0]?.replace(/^0+(?=\d)/, "") || "";
const fire = (s) => up(s).replace(/[^0-9]/g, "");
const MFR = { SEL: ["SELECT"], SCH: ["SCHLAGE"], LCN: ["LCN"], IVE: ["IVES"], VON: ["VON DUPRIN"], ZER: ["ZERO"], GLY: ["GLYNN"], "B/O": ["BY OTHERS", "B/O"] };
const mfrOk = (found, code) => { const f = up(found); return !!f && (f.includes(code) || (MFR[code] || []).some((n) => f.includes(n))); };

const line = (n, what, pass, numbers) => ({ n, what, pass, numbers });
async function gradeVariant(variant) {
  const file = VARIANTS[variant];
  const e = { variant, file: file.replace(resolve(here, "../..") + "/", ""), checks: [], errors: [] };
  if (!existsSync(file)) { e.errors.push("run tools/bidset/make.mjs first"); return e; }
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(file)], { type: "application/pdf" }), "weylandai-building-" + variant + ".pdf");
  fd.append("projectName", PROJECT.name + " grade " + variant + " " + new Date().toISOString().slice(0, 16));
  fd.append("document_type", "door_schedule");
  const upr = await api("/api/hardware-schedule/start", { method: "POST", body: fd });
  if (!upr.ok) { e.errors.push("upload HTTP " + upr.status); return e; }
  const sid = upr.data.sessionId;
  try {
    // Does SubX find the pages itself?
    const fp = await api("/api/hardware-schedule/session/" + sid + "/find-pages", json({}));
    const fd2 = fp.data || {};
    e.find_pages = { status: fp.status, ms: fp.ms, door: fd2.door_schedule_pages || [], hardware: fd2.hardware_pages || [], expected_door: truthDoors.source.pages, expected_hardware: truthGroups.source.pages };
    e.find_pages.right = truthDoors.source.pages.every((p) => e.find_pages.door.includes(p)) && truthGroups.source.pages.every((p) => e.find_pages.hardware.includes(p));
    const pages = [...truthDoors.source.pages.map((page) => ({ page, type: "door_schedule" })), ...truthGroups.source.pages.map((page) => ({ page, type: "hardware_schedule" }))];
    const rd = await api("/api/hardware-schedule/session/" + sid + "/read-pages", json({ pages }));
    e.read = { status: rd.status, ms: rd.ms, failed: ((rd.data && rd.data.results) || []).filter((r) => !r.ok).map((r) => "p" + r.page + ": " + r.error) };
    const shown = (await api("/api/hardware-schedule/session/" + sid + "/doors")).data || {};
    const doors = shown.doors || [], sets = shown.hardware_sets || [], comps = shown.components || [];

    // 1 and 2: openings
    const byMark = new Map(doors.map((d) => [norm(d.mark), d]));
    const found = truthDoors.doors.filter((t) => byMark.has(norm(t.mark)));
    const wrong = [];
    for (const t of found) {
      const d = byMark.get(norm(t.mark));
      if (group(d.hardware_group) !== group(t.hardware_group)) wrong.push(t.mark + " group " + d.hardware_group + " (spec " + t.hardware_group + ")");
      if (Number(d.width_inches) !== t.width_inches || Number(d.height_inches) !== t.height_inches) wrong.push(t.mark + " size " + d.width_inches + "x" + d.height_inches + " (spec " + t.width_inches + "x" + t.height_inches + ")");
      if (up(d.door_type) !== up(t.door_type)) wrong.push(t.mark + " type " + d.door_type + " (spec " + t.door_type + ")");
      if (fire(d.fire_rating) !== fire(t.fire_rating)) wrong.push(t.mark + " fire " + (d.fire_rating || "none") + " (spec " + (t.fire_rating || "none") + ")");
    }
    e.checks.push(line(1, "every opening is in the submittal, with its mark", found.length === truthDoors.doors.length, found.length + " of " + truthDoors.doors.length + " openings; " + Math.max(0, doors.length - found.length) + " extra rows"));
    e.checks.push(line(2, "each opening's hardware group, size, door type and fire rating are right", found.length > 0 && wrong.length === 0, (found.length * 4 - wrong.length) + " of " + found.length * 4 + " fields right" + (wrong.length ? "; " + wrong.slice(0, 8).join("; ") : "")));

    // 3: groups and items as specified
    let itemsRight = 0, itemsTotal = 0;
    const itemWrong = [];
    for (const g of truthGroups.groups) {
      const s = sets.find((x) => group(x.set_number) === group(g.group));
      const pool = s ? comps.filter((c) => c.set_number === s.set_number) : [];
      for (const it of g.items) {
        itemsTotal++;
        const c = pool.find((x) => norm(x.model || x.catalog_number) === norm(it.catalog)) || pool.find((x) => norm(x.model || x.catalog_number).startsWith(norm(it.catalog).slice(0, 4)));
        if (!c) { itemWrong.push(g.group + " " + it.catalog + " not read"); continue; }
        const ok = Number(c.quantity) === it.qty && norm(c.model || c.catalog_number) === norm(it.catalog) && up(c.finish || "") === up(it.finish || "") && (it.by_others || mfrOk(c.manufacturer, it.mfr));
        if (ok) itemsRight++; else itemWrong.push(g.group + " " + it.catalog + ": read " + [c.quantity, c.model || c.catalog_number, c.finish, c.manufacturer].join(" / "));
      }
    }
    e.checks.push(line(3, "every group is there with every item as specified (qty, catalog number, finish, maker)", itemsRight === itemsTotal, itemsRight + " of " + itemsTotal + " items exact in " + sets.length + " sets read (spec " + truthGroups.groups.length + ")" + (itemWrong.length ? "; " + itemWrong.slice(0, 8).join("; ") : "")));

    // The packet
    const pk = await api("/api/hardware-schedule/session/" + sid + "/submittal-pdf", json({ preparedBy: "WeylandAI grade (sample project)", projectName: PROJECT.name }));
    if (!pk.ok) { e.errors.push("packet HTTP " + pk.status + " " + JSON.stringify(pk.data).slice(0, 200)); return e; }
    const cs = pk.data.cut_sheet_matching || {};
    const cited = (pk.data.sections || []).filter((x) => x.type === "cut_sheet");
    const missing = cs.missing || [], byOthers = cs.by_others || [];
    // 4 and 5: held items cited, others listed. Distinct items by maker + catalog number, as the packet counts them.
    const distinct = new Map();
    for (const g of GROUPS) for (const it of g.items) distinct.set(it.mfr + "|" + norm(it.catalog), it);
    const items = [...distinct.values()];
    // The packet accounts for every distinct item (components = matched + unmatched): an item is
    // cited unless it is listed as missing or as by others. Several items can share one cited page
    // (ALX53 and ALX80 on the ALX sell sheet's functions page), so the pages are not matched by name.
    const missFor = (it) => missing.find((m) => norm(m.model) === norm(it.catalog) && (!m.manufacturer || mfrOk(m.manufacturer, it.mfr) || it.mfr === "B/O"));
    const isOthers = (it) => byOthers.some((b) => norm(b.text) === norm(it.catalog));
    const isCited = (it) => !missFor(it) && !isOthers(it) && cs.matched + cs.unmatched === cs.components;
    const isListed = (it) => (missFor(it) && missFor(it).need) || isOthers(it);
    const held = items.filter((i) => i.held), notHeld = items.filter((i) => !i.held);
    const heldMissed = held.filter((i) => !isCited(i));
    const notListed = notHeld.filter((i) => !isListed(i));
    e.packet = { pages: pk.data.totalPages, ms: pk.ms, components: cs.components, matched: cs.matched, unmatched: cs.unmatched, missing: missing.map((m) => m.model + " - " + m.reason + " / needed: " + m.need), by_others: byOthers.map((b) => b.text) };
    e.checks.push(line(4, "every item the catalogue holds has its cut-sheet page in the packet", heldMissed.length === 0, (held.length - heldMissed.length) + " of " + held.length + " held items cited" + (heldMissed.length ? "; not cited: " + heldMissed.map((i) => i.mfr + " " + i.catalog).join(", ") : "")));
    e.checks.push(line(5, "every item it does not hold is listed as missing with what is needed, or as furnished by others", notListed.length === 0, (notHeld.length - notListed.length) + " of " + notHeld.length + " listed" + (notListed.length ? "; not listed: " + notListed.map((i) => i.mfr + " " + i.catalog).join(", ") : "")));

    // 6: the PDF itself
    const pdf = await fetch(BASE + "/api/hardware-schedule/session/" + sid + "/submittal-pdf", { headers: H });
    let t = "";
    if (pdf.ok) {
      const f = join(OUT, ".grade-" + variant + ".pdf");
      writeFileSync(f, Buffer.from(await pdf.arrayBuffer()));
      try { t = execFileSync("pdftotext", ["-layout", f, "-"], { maxBuffer: 64 << 20 }).toString(); } catch (_) { t = ""; }
      execFileSync("rm", ["-f", f]);
    }
    const head = t.split("\f").slice(0, 3).join("\n").toUpperCase();
    e.checks.push(line(6, "the packet names the project and opens with a table of contents", head.includes(up(PROJECT.name)) && /CONTENTS/.test(head), "project named on its first pages: " + head.includes(up(PROJECT.name)) + "; contents: " + /CONTENTS/.test(head) + "; " + (t.split("\f").length - 1) + " pages read back"));
  } finally {
    const del = await api("/api/hardware-schedule/session/" + sid, { method: "DELETE" });
    e.cleanup = del.ok ? "deleted" : "HTTP " + del.status;
  }
  return e;
}

const report = { base: BASE, project: PROJECT.name, at: new Date().toISOString(), variants: [] };
for (const v of which) report.variants.push(await gradeVariant(v));
const stamp = report.at.slice(0, 16).replace(/[:T]/g, "-");
const md = ["# The WeylandAI Building, graded as a GC would, " + stamp, "", PROJECT.stamp + ". The bid set drawn by tools/bidset/make.mjs from tools/bidset/building.mjs (" + OPENINGS.length + " openings, " + GROUPS.length + " hardware groups), sent through SubX by the workspace's own requests on " + BASE + ", and the submittal it builds checked against the model.", ""];
for (const e of report.variants) {
  md.push("## " + e.variant + " (" + e.file + ")", "");
  if (e.errors.length) md.push("Errors: " + e.errors.join("; "), "");
  if (e.find_pages) md.push("- SubX found the pages itself: " + e.find_pages.right + " (door " + JSON.stringify(e.find_pages.door) + ", hardware " + JSON.stringify(e.find_pages.hardware) + "; the set has them on " + JSON.stringify(e.find_pages.expected_door) + " and " + JSON.stringify(e.find_pages.expected_hardware) + ")");
  if (e.read) md.push("- Pages read: " + (e.read.failed.length ? "failed " + e.read.failed.join("; ") : "all") + ", " + Math.round(e.read.ms / 1000) + " s");
  if (e.packet) md.push("- Packet: " + e.packet.pages + " pages in " + Math.round(e.packet.ms / 1000) + " s; " + e.packet.matched + " of " + e.packet.components + " items cited; missing: " + (e.packet.missing.join("; ") || "none") + "; by others: " + (e.packet.by_others.join("; ") || "none"));
  md.push("", "| # | GC check | result | numbers |", "|---|---|---|---|", ...e.checks.map((c) => "| " + c.n + " | " + c.what + " | " + (c.pass ? "PASS" : "FAIL") + " | " + String(c.numbers).replace(/\|/g, "/") + " |"), "");
}
writeFileSync(join(here, "grade_report_" + stamp + ".json"), JSON.stringify(report, null, 2));
writeFileSync(join(here, "grade_report_" + stamp + ".md"), md.join("\n"));
console.log(md.join("\n"));
