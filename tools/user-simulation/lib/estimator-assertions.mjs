// Independent oracles for the Estimator journeys. Expectations are the corpus
// rows read by eye, never the extractor's own output or a demo schedule.
import { readFileSync } from "node:fs";

const fixture = name => JSON.parse(readFileSync(new URL("../../corpus/expected/" + name, import.meta.url), "utf8"));
export const DOORS = fixture("rockford-a2.2-door-schedule.json");
export const HARDWARE = fixture("rockford-087100-hardware-groups.json");
const norm = v => String(v ?? "").toUpperCase().replace(/\s+/g, " ").trim();
export const groupKey = v => norm(v).replace(/^(?:-|—|\(EMPTY\))$/, "").replace(/^0+(?=\d)/, "");
const sameMembers = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

export function firstReadWrites(requests) {
  return requests.filter(r => r.method !== "GET" && (
    /^\/api\/hardware-schedule\//.test(r.path) || /^\/api\/auth\/(?:authfor-exchange|session)\/?$/.test(r.path) ||
    (r.host === "authfor.com" && /\/(?:register|login|magic-link|mfa|reset-request|reset-confirm)(?:\/|$)/.test(r.path))
  ));
}

export function doorEvidence(rows, page) {
  const missing = DOORS.doors.filter(d => !rows.some(r => r.mark === d.mark)).map(d => d.mark);
  const incorrect = DOORS.doors.flatMap(d => {
    const r = rows.find(r => r.mark === d.mark);
    if (!r) return [];
    return groupKey(r.group) !== groupKey(d.hardware_group) || !new RegExp(`^p\\.${page} row ${d.row}(?:\\D|$)`).test(r.source || "") ? [d.mark] : [];
  });
  return { ok: sameMembers(rows.map(r => r.mark), DOORS.doors.map(d => d.mark)) && !incorrect.length,
    expected: DOORS.door_count, rows: rows.length, missing, incorrect };
}

// CSV fields can contain commas, quotes and newlines (including size strings).
export function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && c === ",") { row.push(field); field = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unterminated CSV field");
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers = [], ...values] = rows;
  if (values.some(r => r.length !== headers.length)) throw new Error("CSV row has the wrong number of columns");
  return { headers, rows: values.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]]))) };
}

export function csvEvidence(text) {
  const { headers, rows } = parseCsv(text);
  const required = ["DOOR PAIR", "GLAZING", "ALTERNATE PRICING"];
  const incorrect = DOORS.doors.flatMap(d => {
    const r = rows.find(r => r.Mark === d.mark);
    return !r || r["DOOR PAIR"] !== (d.pair ? "Yes" : "No") || r.GLAZING !== (d.glazing || "") ? [d.mark] : [];
  });
  // Alternate pricing was independently checked against A2.2 for g018;
  // the older corpus oracle explicitly excludes it. Keep blank distinct from No.
  const alternates = Object.fromEntries(["Yes", "No", ""].map(v => [v || "blank", rows.filter(r => r["ALTERNATE PRICING"] === v).length]));
  const spots = { "109.1": "Yes", "119.2": "Yes", "1J.1": "No", "126.1.2": "" };
  const badAlternates = Object.entries(spots).filter(([mark, value]) => rows.find(r => r.Mark === mark)?.["ALTERNATE PRICING"] !== value);
  return { ok: required.every(h => headers.includes(h)) && sameMembers(rows.map(r => r.Mark), DOORS.doors.map(d => d.mark)) && !incorrect.length &&
    alternates.Yes === 18 && alternates.No === 46 && alternates.blank === 1 && !badAlternates.length,
    headers, rows: rows.length, incorrect, alternates, badAlternates };
}

export function hardwareEvidence(detail) {
  const sets = detail?.hardware_sets || [], components = detail?.components || [];
  const mismatches = HARDWARE.groups.flatMap(g => {
    const set = sets.find(s => groupKey(s.set_number) === groupKey(g.group));
    const items = components.filter(c => groupKey(c.set_number) === groupKey(g.group));
    const first = g.items[0];
    const hasHinge = items.some(c => norm(c.model || c.catalog_number) === norm(first.catalog) && Number(c.quantity) === first.qty);
    return !set || Number(set.components) !== g.items.length || items.length !== g.items.length || !hasHinge ? [{ group: g.group, expected: g.items.length, items: items.length, hasHinge }] : [];
  });
  return { ok: sameMembers(sets.map(s => groupKey(s.set_number)), HARDWARE.groups.map(g => groupKey(g.group))) &&
    components.length === HARDWARE.groups.reduce((n, g) => n + g.items.length, 0) && !mismatches.length && !detail?.hardware_schedule_needed,
    groups: sets.length, items: components.length, mismatches, hardware_schedule_needed: detail?.hardware_schedule_needed };
}

export function packetEvidence(packet) {
  const sections = packet?.sections || [], groups = sections.filter(s => s.type === "hardware_set");
  const names = groups.map(s => groupKey(s.title.replace(/^Hardware Group\s+/i, "")));
  const mismatches = HARDWARE.groups.filter(g => !groups.some(s => groupKey(s.title.replace(/^Hardware Group\s+/i, "")) === groupKey(g.group) && s.components === g.items.length)).map(g => g.group);
  const cs = packet?.cut_sheet_matching || {};
  const cuts = sections.filter(s => s.type === "cut_sheet");
  const missing = cs.missing || [];
  return { ok: packet?.success === true && packet.paid === true && packet.doors === DOORS.door_count && packet.hardware_sets === HARDWARE.group_count &&
    sameMembers(names, HARDWARE.groups.map(g => groupKey(g.group))) && !mismatches.length &&
    sections.some(s => s.type === "door_schedule" && s.doors === DOORS.door_count) && sections.some(s => s.type === "schedule" && s.pages >= 8) &&
    cuts.length > 0 && packet.cut_sheets === cuts.length && cs.matched > 0 && cs.components === cs.matched + cs.unmatched &&
    missing.every(m => m.reason && m.need) && (!(cs.unmatched > 0) || missing.length > 0) &&
    (!missing.length || sections.some(s => s.type === "cut_sheet_misses")) &&
    packet.totalPages === sections.reduce((n, s) => n + s.pages, 0) && !(packet.warnings || []).length,
    pages: packet?.totalPages, groups: groups.length, mismatches, cutSheets: cuts.length, matched: cs.matched, unmatched: cs.unmatched, warnings: packet?.warnings || [] };
}

export function packetTextEvidence(text, packet, company) {
  const pages = text.split("\f");
  if (!pages.at(-1).trim()) pages.pop();
  let offset = 0;
  const hardware = [], cuts = [], misses = [];
  for (const section of packet.sections || []) {
    const body = pages.slice(offset, offset + section.pages).join("\n");
    if (section.type === "hardware_set") {
      const group = HARDWARE.groups.find(g => groupKey(section.title.replace(/^Hardware Group\s+/i, "")) === groupKey(g.group));
      // Look in each generated group sheet, not the TOC or uploaded spec appendix.
      hardware.push({ title: section.title, startPage: offset + 1, ok: !!group && norm(body).includes(norm(section.title)) &&
        /Model\/Series/.test(body) && norm(body).includes(norm(group.items[0].catalog)) });
    }
    if (section.type === "cut_sheet") cuts.push({ startPage: offset + 1, textCharacters: body.trim().length });
    if (section.type === "cut_sheet_misses") misses.push(/ITEMS WITHOUT A CUT SHEET/i.test(body));
    offset += section.pages;
  }
  return { ok: packetEvidence(packet).ok && pages.length === packet.totalPages && norm(pages[0]).includes(norm(company)) &&
    hardware.length === HARDWARE.group_count && hardware.every(g => g.ok) && cuts.length > 0 && cuts.every(c => c.textCharacters > 80) && misses.every(Boolean),
    pages: pages.length, hardware, cuts, misses };
}
