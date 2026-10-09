// Submittal packet coverage on the public bid sets (2026-10-09).
//
// For each document: upload it, read its schedule pages, build the submittal packet through
// the same requests the SubX workspace makes, and report every hardware item: cited (with the
// catalogue page it cites) or missed (with why and what would put a page there). Then the
// packet PDF is read back to confirm each cited page is in it. The bar (John's goal of
// 2026-10-09): every item the catalogue holds is cited; every other item is a miss that says
// what is needed.
//
//   POST /api/hardware-schedule/start                          upload
//   POST /api/hardware-schedule/session/:id/read-pages         read the pages the expected rows name
//   POST /api/hardware-schedule/session/:id/submittal-pdf      build the packet (cut_sheet_matching)
//   GET  /api/hardware-schedule/session/:id/submittal-pdf      the packet PDF
//   DELETE /api/hardware-schedule/session/:id                  clean up
//
// Usage: node tools/accuracy/packet_coverage.mjs --token-file <path> [--only rockford,berryessa]
//        [--base https://weylandai.com] [--label x]
// The token is a test account's AuthFor bearer token (never printed). Writes
// packet_report_<stamp>[_label].json and .md next to this file.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter((x) => x.length));
const BASE = String(args.base || "https://weylandai.com").replace(/\/$/, "");
const TOKEN = readFileSync(String(args["token-file"]), "utf8").trim();
const ONLY = args.only ? String(args.only).split(",") : null;
const LABEL = args.label ? "_" + String(args.label).replace(/[^A-Za-z0-9_-]/g, "") : "";
const H = { Authorization: "Bearer " + TOKEN };
const CORPUS = join(REPO, "tools/corpus/door-schedules"), EXPECTED = join(REPO, "tools/corpus/expected");
const DOCS = [
  { id: "rockford", label: "Rockford Bid 26-27 Addendum One", file: join(CORPUS, "f0e863d88ea688ff.pdf"), doors: "rockford-a2.2-door-schedule.json", groups: "rockford-087100-hardware-groups.json" },
  { id: "berryessa", label: "Berryessa Bid B-09-2023-24", file: join(CORPUS, "dd339f57b51538ed.pdf"), doors: "berryessa-a9.2-door-schedules.json", groups: "berryessa-087100-hardware-groups.json" },
].filter((d) => !ONLY || ONLY.includes(d.id));

async function api(path, init = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("json") ? await r.json().catch(() => null) : null;
  return { ok: r.ok, status: r.status, data, ms: Date.now() - t0, res: r };
}

const report = { base: BASE, started_at: new Date().toISOString(), documents: [] };
for (const doc of DOCS) {
  const e = { id: doc.id, label: doc.label, errors: [] };
  report.documents.push(e);
  if (!existsSync(doc.file)) { e.errors.push("PDF not on this machine"); continue; }
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(doc.file)], { type: "application/pdf" }), doc.id + ".pdf");
  fd.append("projectName", "packet coverage " + doc.id + " " + new Date().toISOString().slice(0, 16));
  fd.append("document_type", "door_schedule");
  const up = await api("/api/hardware-schedule/start", { method: "POST", body: fd });
  if (!up.ok) { e.errors.push("upload HTTP " + up.status); continue; }
  const sid = up.data.sessionId;
  try {
    const dPages = JSON.parse(readFileSync(join(EXPECTED, doc.doors), "utf8")).source.pages;
    const gPages = JSON.parse(readFileSync(join(EXPECTED, doc.groups), "utf8")).source.pages;
    const pages = [...dPages.map((page) => ({ page, type: "door_schedule" })), ...gPages.map((page) => ({ page, type: "hardware_schedule" }))];
    const rd = await api("/api/hardware-schedule/session/" + sid + "/read-pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages }) });
    e.read = { status: rd.status, ms: rd.ms, failed: ((rd.data && rd.data.results) || []).filter((r) => !r.ok).map((r) => "p" + r.page + ": " + r.error) };
    const pk = await api("/api/hardware-schedule/session/" + sid + "/submittal-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preparedBy: "Packet coverage harness" }) });
    if (!pk.ok) { e.errors.push("packet HTTP " + pk.status + " " + JSON.stringify(pk.data).slice(0, 200)); continue; }
    const cs = pk.data.cut_sheet_matching || {};
    e.packet = { ms: pk.ms, total_pages: pk.data.totalPages, components: cs.components, matched: cs.matched, unmatched: cs.unmatched };
    e.cited = (pk.data.sections || []).filter((s) => s.type === "cut_sheet").map((s) => ({ title: s.title, manufacturer: s.manufacturer, model: s.model, page: s.page, sets: s.sets }));
    e.misses = (cs.missing || []).map((m) => ({ item: [m.qty ? m.qty + " EA" : null, m.component_type, m.model, m.manufacturer ? "(" + m.manufacturer + ")" : null].filter(Boolean).join(" "), sets: m.sets, code: m.code, why: m.reason, needed: m.need }));
    e.misses_without_need = e.misses.filter((m) => !m.needed || !m.why).length;
    e.by_others = (cs.by_others || []).map((x) => ({ item: [x.qty ? x.qty + " EA" : null, x.component_type, x.text].filter(Boolean).join(" "), sets: x.sets }));
    // The packet PDF itself: page count, and each cited page's text present.
    const pdf = await fetch(BASE + "/api/hardware-schedule/session/" + sid + "/submittal-pdf", { headers: H });
    if (pdf.ok) {
      const buf = Buffer.from(await pdf.arrayBuffer());
      const f = join(here, ".packet-" + doc.id + ".pdf");
      writeFileSync(f, buf);
      try {
        const text = execFileSync("pdftotext", ["-layout", f, "-"], { maxBuffer: 64 * 1024 * 1024 }).toString();
        e.pdf = { bytes: buf.length, pages: text.split("\f").length - 1, has_misses_page: /ITEMS WITHOUT A CUT SHEET/.test(text) };
      } catch (_) { e.pdf = { bytes: buf.length }; }
      try { execFileSync("rm", ["-f", f]); } catch (_) { /* fine */ }
    }
  } finally {
    const del = await api("/api/hardware-schedule/session/" + sid, { method: "DELETE" });
    e.cleanup = del.ok ? "deleted" : "HTTP " + del.status;
  }
}
report.finished_at = new Date().toISOString();

const stamp = report.started_at.slice(0, 16).replace(/[:T]/g, "-");
const md = ["# Submittal packet coverage, " + stamp + (LABEL ? " (" + LABEL.slice(1) + ")" : ""), "",
  "Live API " + BASE + ". Each document uploaded, its schedule pages read, and the packet built through the workspace's own requests. Cited = the packet carries a catalogue page for the item; missed = listed in the packet with why and what is needed.", ""];
for (const e of report.documents) {
  md.push("## " + e.label, "");
  if (e.errors.length) md.push("Errors: " + e.errors.join("; "), "");
  if (!e.packet) continue;
  md.push("- Items (distinct maker + catalogue number): " + e.packet.components + "; cited " + e.packet.matched + ", missed " + e.packet.unmatched + (e.misses_without_need ? " (" + e.misses_without_need + " misses say nothing about what is needed)" : " (every miss says why and what is needed)"));
  md.push("- Pages read: " + (e.read.failed.length ? "failed " + e.read.failed.join("; ") : "all") + "; packet " + e.packet.total_pages + " pages, built in " + Math.round(e.packet.ms / 1000) + " s" + (e.pdf ? "; PDF " + Math.round(e.pdf.bytes / 1024) + " KB, " + e.pdf.pages + " pages" + (e.pdf.has_misses_page ? ", with its Items without a cut sheet page" : "") : ""), "");
  md.push("| cited page | maker | model | sets |", "|---|---|---|---|");
  for (const c of e.cited) md.push("| " + c.title + " | " + (c.manufacturer || "") + " | " + (c.model || "") + " | " + (c.sets || []).join(", ") + " |");
  md.push("");
  if (e.by_others && e.by_others.length) md.push("Furnished by others (not hardware-supplier items; listed in the packet as such): " + e.by_others.map((x) => x.item + " [" + (x.sets || []).join(", ") + "]").join("; "), "");
  if (e.misses.length) {
    md.push("| missed item | sets | why | needed |", "|---|---|---|---|");
    for (const m of e.misses) md.push("| " + m.item + " | " + (m.sets || []).join(", ") + " | " + m.why + " | " + m.needed + " |");
    md.push("");
  }
}
writeFileSync(join(here, "packet_report_" + stamp + LABEL + ".json"), JSON.stringify(report, null, 2));
writeFileSync(join(here, "packet_report_" + stamp + LABEL + ".md"), md.join("\n") + "\n");
console.log(md.join("\n"));
