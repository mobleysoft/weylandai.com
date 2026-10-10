// Shared PDF page and schedule loading for truth_run and placement_run.
// Defaults preserve both truth readers, candidate selection, OCR and note ordering.
// Placement opts out of reader B and hardware; reader A still follows the same path.
import { pageItems, pageRules } from "./pdf.mjs";
import { readA, readAFromLines } from "./reader_a.mjs";
import { doorPageCandidate } from "./page_candidates.mjs";
import { ocrPage } from "./ocr.mjs";
import { readDoorsB, readHardwareB } from "./reader_b.mjs";

// ---------------------------------------------------------------- page finding
// g051: an electrical panel schedule sheet (a motor schedule, panels by circuit) names a door now and then
// ("OH DOOR OPERATOR") and is not a door schedule page.
const DOOR_PAGE = doorPageCandidate;
const HW_PAGE = (t) => /\b(HARDWARE\s+(GROUP|SET|HEADING)|HDWE?\.?\s*(GROUP|SET)|HW\s*SET|HEADING)\s*(NO\.?|NUMBER|#)?\s*[:.#]?\s*[A-Z]{0,2}\d/i.test(t) || /^\s*SET\s*(NO\.?|#|:)\s*[A-Z]{0,2}\d/im.test(t);
export async function loadPages(pdf) {
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) { const it = await pageItems(pdf, p); pages.push(it); }
  return pages;
}

export async function readSchedules(pdf, pages, { file, ocrMax = 6, ocrDpi = 600, readerB = true, hardware = true } = {}) {
  const textOf = (p) => pages[p - 1].items.map((i) => i.str).join("\n");
  const textPages = pages.filter((p) => p.items.length >= 15).length;
  const rec = {};
  const doorPages = [], hwPages = [];
  for (let p = 1; p <= pdf.numPages; p++) { if (pages[p - 1].items.length < 15) continue; const t = textOf(p); if (DOOR_PAGE(t)) doorPages.push(p); if (hardware && HW_PAGE(t)) hwPages.push(p); }

  // Both readers on every candidate page.
  const doorsA = [], doorsB = [], tableBoxes = {};
  const hwA = [], hwB = [];
  const readerNotes = [];
  // No text layer at all (a scan, a Print-to-PDF bitmap): OCR the pages once, and give both readers the
  // same words; reader A reads them as lines through the production readers, reader B with the rules
  // found in the rendered image.
  if (textPages === 0 && pdf.numPages <= ocrMax) {
    rec.ocr = { requested_dpi: ocrDpi, pipeline: "production ocrRasterPageLines; Poppler renderer; shipped Tesseract", pages: [] };
    for (let p = 1; p <= pdf.numPages; p++) {
      let o;
      try { o = await ocrPage(file, p, { dpi: ocrDpi }); } catch (e) { readerNotes.push("OCR p." + p + ": " + String(e.message).slice(0, 120)); continue; }
      const text = o.items.map((i) => i.str).join("\n"), size = { width: o.width, height: o.height };
      rec.ocr.pages.push({ page: p, dpi: o.dpi, words: o.words.length, rotation: o.rotation, skew_deg: o.skew_deg, rules: { h: o.rules.h.length, v: o.rules.v.length }, ms: o.ms });
      if (DOOR_PAGE(text)) {
        doorPages.push(p);
        const a = await readAFromLines(o.lines, size, "door_schedule", o.words.length);
        for (const d of a.doors || []) doorsA.push({ page: p, ...d });
        const b = readerB ? readDoorsB(o.items, o.rules, size) : { doors: [], tables: [] };
        if (b.tables.length) tableBoxes[p] = b.tables.map((t) => t.bbox);
        for (const d of b.doors) doorsB.push({ page: p, ...d });
      }
      if (hardware && HW_PAGE(text)) {
        hwPages.push(p);
        const a = await readAFromLines(o.lines, size, "hardware_schedule", o.words.length);
        hwA.push({ page: p, groups: a.groups || [] });
        if (readerB) hwB.push({ page: p, groups: readHardwareB(o.items, o.rules, size).groups });
      }
    }
  }
  const ocrDone = !!rec.ocr;
  for (const p of ocrDone ? [] : doorPages) {
    const a = await readA(pdf, p, "door_schedule");
    if (a.error) readerNotes.push("A p." + p + ": " + a.error);
    for (const d of a.doors || []) doorsA.push({ page: p, ...d });
    if (!readerB) continue;
    let rules = null;
    try { rules = await pageRules(pdf, p); } catch (e) { readerNotes.push("B p." + p + " rules: " + String(e.message).slice(0, 100)); }
    const b = rules ? readDoorsB(pages[p - 1].items, rules, pages[p - 1]) : { doors: [], tables: [] };
    if (rules && rules.skipped) readerNotes.push("B p." + p + ": " + rules.skipped + " (not read)");
    if (b.tables.length) tableBoxes[p] = b.tables.map((t) => t.bbox);
    for (const d of b.doors) doorsB.push({ page: p, ...d });
  }
  for (const p of ocrDone ? [] : hwPages) {
    const a = await readA(pdf, p, "hardware_schedule");
    if (a.error) readerNotes.push("A p." + p + ": " + a.error);
    hwA.push({ page: p, groups: a.groups || [] });
    if (!readerB) continue;
    let rules = null;
    const big = Math.max(pages[p - 1].width, pages[p - 1].height) > 1100;
    if (!big) { try { rules = await pageRules(pdf, p); } catch (_) { rules = null; } }
    const b = readHardwareB(pages[p - 1].items, rules, pages[p - 1]);
    hwB.push({ page: p, groups: b.groups });
  }
  return { textPages, doorPages, hwPages, doorsA, doorsB, tableBoxes, hwA, hwB, readerNotes, ocr: rec.ocr };
}
