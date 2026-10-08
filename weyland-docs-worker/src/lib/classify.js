// weyland-docs-worker/src/lib/classify.js
//
// Line classifiers and parsers for the six document tools, pure functions over
// the pages the OCR worker returns ([{ page, text, source }]), so the fixture
// tests in test/classify.test.mjs run them against the audit documents.
//
// 2026-10-08: the 7 October field audit ran InspecX, SafetyX and SurvX on real
// public documents and found 0 of 5 deficiencies (FCMAT FIT inspection), 6 of
// 12 flagged lines useful (WA FACE fatality narrative) and 0 of 14 defects
// (NSW condition survey) because the word lists were office words ("not
// compliant", "discrepancy", "encroachment"). The lists below carry the words
// those documents actually use (leaking, broken, not working, out of service,
// cracks, damaged, lifted, fell, not used, died) and every flag carries its
// page number so the page can show it. A line that says there is NO defect
// ("no deficiencies", "no significant cracks") is counted as a clear line, not
// a flag, and FIT form boilerplate (the marks legend) is never flagged.

function compile(sources) {
  return sources.map((s) => new RegExp("\\b(?:" + s + ")\\b", "i"));
}

export const INSPECTION_FAIL_PATTERNS = compile([
  "fail(?:ed|s|ure)?", "deficien\\w*", "not compliant", "non-?compliant", "corrective action", "reject\\w*", "violation", "does not meet",
  "leak(?:s|ing|ed)?", "broken", "not working", "not (?:operational|functioning|functional|operating)", "inoperable", "inoperative",
  "out[- ]of[- ]service", "take (?:it )?out of service", "loose", "missing", "needs? (?:to be )?(?:replaced|repaired|replacement|repair)",
  "to be replaced", "crack(?:s|ed|ing)?", "damaged?", "lifted", "flickering", "burn(?:ed|t) out", "bulbs? (?:is |are )?out", "lights? (?:is |are )?out",
  "malfunction\\w*", "clogged", "torn", "peeling", "mou?ld", "exposed wir\\w+", "trip(?:ping)? hazard", "repair or remove",
]);
export const INSPECTION_PASS_PATTERNS = compile(["pass(?:ed)?", "satisfactory", "compliant", "approved", "meets code", "no deficiencies", "good repair"]);

export const SAFETY_FLAG_PATTERNS = compile([
  "incident", "injur\\w*", "near miss", "hazard\\w*", "unsafe", "violation", "not wearing", "lockout", "citation", "fatal\\w*", "lost time", "reportable",
  "fell", "fall(?:s|ing)?", "died", "death", "not (?:being )?used", "(?:was|were) not (?:used|worn|provided|in place|installed)", "no fall protection",
  "without (?:fall protection|guardrails?|a harness|protection)", "unprotected", "struck by", "caught (?:in|between)", "electrocut\\w*", "amputat\\w*",
  "hospitali[sz]ed", "lost (?:his |her |their )?balance", "trigger height", "failed to", "did not (?:have|use|wear|provide)", "exposed to", "fracture\\w*", "head ?first",
]);
export const SAFETY_CLEAR_PATTERNS = compile(["resolved", "corrected", "no incidents", "compliant", "ppe worn", "safe condition", "no hazards"]);

export const SURVEY_FLAG_PATTERNS = compile([
  "discrepanc\\w*", "conflict\\w*", "encroach\\w*", "easement", "unknown utilit\\w*", "field verify", "not to scale", "unverified", "inconsistent", "overlap\\w*", "unresolved",
  "crack(?:s|ed|ing)?", "damaged?", "lifted", "lifting", "displaced", "subsidence", "settlement", "spall\\w*", "broken", "missing", "graffiti", "poor(?: condition)?",
  "severe\\w*", "significant", "deteriorat\\w*", "defect\\w*", "uneven", "trip(?:ping)? hazard", "ponding", "rust\\w*", "corro\\w+", "stain\\w*", "chipped", "loose", "worn",
  "fail\\w*", "leak\\w*", "exposed", "tree roots?",
]);
export const SURVEY_CLEAR_PATTERNS = compile(["verified", "confirmed", "as shown", "no conflicts", "no discrepancies", "consistent with", "good condition", "reasonable condition"]);

// A line that denies a problem is a clear line, whatever words it carries.
const NEGATED = /\bno\b[^.;:]{0,30}\b(?:deficien|defect|crack|damage|hazard|incident|issue|problem|leak|concern)|\b(?:free (?:of|from)|(?:is|are) not (?!working|functioning|functional|operational|operating|in service|secure|safe|level|attached)|does not appear|not found|appear safe|in working condition|in good repair)\b/i;
// FIT form boilerplate and headings that would otherwise match.
const EXCLUDED = [
  /D = Deficiency/i, /X = Extreme Deficiency/i, /^Marks:/i, /Deficiencies Noted in Prior Year/i, /^Deficiency\s*$/i, /^Extreme Deficiency\s*$/i,
  // Form instructions and standards text (FIT pages 3-6): how to mark, what the criteria say.
  /\b(?:evaluator|the inspector|for example|should (?:mark|note|be rated|appear)|percent(?:age)?|criteria|Good Repair Standard|underlined statement|marked as|Indicate ['\u201c"]?X|Mark ['\u201c"]?D|in order to|such as)\b/i,
  // Headings and report boilerplate.
  /^[A-Z0-9 &()\/\-:,.']{3,40}:?$/, /was developed to alert|For more information visit|safety resources/i,
];
// FIT rows: a category word with a standalone D or X mark on the same line.
const FIT_CATEGORY = /\b(?:restrooms?|classrooms?|hall(?:way)?s?|playground|electrical|fire|roofs?|windows|doors|gas leaks|mechanical|sewer|interior|overall|structural|hazardous|pest|drinking fountains?|sinks?|library|kitchen|cafeteria|gym|office)\b/i;
const FIT_MARK = /(?:^|\s)(D|X)(?=\s|$)/;

export function splitLines(pages) {
  const out = [];
  for (const p of pages || []) {
    for (const raw of String(p.text || "").split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, " ").trim();
      if (line.length >= 4) out.push({ page: p.page, line });
    }
  }
  return out;
}

function matchedTerms(line, patterns) {
  const terms = [];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) terms.push(m[0].toLowerCase());
  }
  return terms;
}

/**
 * Flags lines by word list, with page numbers. Returns
 * { flagged: [{ page, line, terms, type }], flaggedCount, clearCount, lineCount }.
 */
export function classifyLines(pages, { flag, clear, fitMarks = false }) {
  const flagged = [];
  const seen = new Set();
  let clearCount = 0;
  const lines = splitLines(pages);
  for (const { page, line } of lines) {
    if (EXCLUDED.some((re) => re.test(line))) continue;
    const key = line.toLowerCase();
    if (NEGATED.test(line)) { clearCount++; continue; }
    const terms = matchedTerms(line, flag);
    let type = null;
    if (terms.length) type = "flag";
    else if (fitMarks && FIT_CATEGORY.test(line) && FIT_MARK.test(line) && !/OK = /i.test(line)) { type = "mark"; terms.push("FIT mark " + line.match(FIT_MARK)[1]); }
    if (type) {
      if (seen.has(key)) continue;
      seen.add(key);
      flagged.push({ page, line, terms, type });
    } else if (matchedTerms(line, clear).length) {
      clearCount++;
    }
  }
  return { flagged, flaggedCount: flagged.length, clearCount, lineCount: lines.length };
}

export function classifyInspection(pages) {
  const r = classifyLines(pages, { flag: INSPECTION_FAIL_PATTERNS, clear: INSPECTION_PASS_PATTERNS, fitMarks: true });
  return { passCount: r.clearCount, failCount: r.flaggedCount, flagged: r.flagged, lineCount: r.lineCount };
}
export function classifySafety(pages) {
  const r = classifyLines(pages, { flag: SAFETY_FLAG_PATTERNS, clear: SAFETY_CLEAR_PATTERNS });
  return { incidentCount: r.flaggedCount, clearCount: r.clearCount, flagged: r.flagged, lineCount: r.lineCount };
}
export function classifySurvey(pages) {
  const r = classifyLines(pages, { flag: SURVEY_FLAG_PATTERNS, clear: SURVEY_CLEAR_PATTERNS });
  return { flaggedCount: r.flaggedCount, clearCount: r.clearCount, flagged: r.flagged, lineCount: r.lineCount };
}

// ---- SpecX: CSI MasterFormat sections actually present in the book ---------
// A section is present when the book carries its "SECTION dd dd dd" header
// line or its "dd dd dd - n" page footers. A number that only appears inside a
// sentence ("See Section 01 30 00 - Administrative Requirements") or in the
// table of contents is a reference, reported separately, never as a section.
// The 7 October audit counted 21 such references listed as sections.
const SECTION_HEADER = /^SECTION\s+(\d{2})\s?(\d{2})\s?(\d{2})(?:[.\-](\d{2}))?\s*(?:[-–—:]\s*)?(.*)$/i;
const SECTION_FOOTER = /^(\d{2}) (\d{2}) (\d{2})(?:[.\-]\d{2})?\s*-\s*\d{1,3}\s*$/;
const TOC_LINE = /^(\d{2}) (\d{2}) (\d{2})(?:[.\-]\d{2})?\s{2,}([A-Za-z][^\n]{3,90})$/;
const REFERENCE = /\b(\d{2}) (\d{2}) (\d{2})\b/g;
const TITLE_LINE = /^[A-Z][A-Z0-9 ,&/'()\-]{3,90}$/;
export const CSI_SHORT_SECTION_WORD_THRESHOLD = 30;

export function parseSpecSections(pages) {
  const byNumber = new Map();
  const entry = (n) => { if (!byNumber.has(n)) byNumber.set(n, { number: n, headerPages: [], footerPages: [], title: "", tocTitle: "", referencedOn: new Set() }); return byNumber.get(n); };
  const headers = []; // { number, page, lineIndex }
  const pageLines = [];
  for (const p of pages || []) {
    const lines = String(p.text || "").split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
    pageLines.push({ page: p.page, lines });
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim();
      let m = s.match(SECTION_HEADER);
      if (m) {
        const n = m[1] + " " + m[2] + " " + m[3];
        const e = entry(n);
        e.headerPages.push(p.page);
        let title = (m[5] || "").trim();
        if (!title) { for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) { const t = lines[j].trim(); if (t && TITLE_LINE.test(t) && !/^SECTION/i.test(t)) { title = t; break; } } }
        if (title && !e.title) e.title = title.replace(/\s+/g, " ").slice(0, 80);
        headers.push({ number: n, page: p.page, lineIndex: i });
        continue;
      }
      m = s.match(SECTION_FOOTER);
      if (m) { entry(m[1] + " " + m[2] + " " + m[3]).footerPages.push(p.page); continue; }
      m = s.match(TOC_LINE);
      if (m) { const e = entry(m[1] + " " + m[2] + " " + m[3]); if (!e.tocTitle) e.tocTitle = m[4].replace(/\.{2,}.*$/, "").replace(/\s+/g, " ").trim().slice(0, 80); continue; }
      for (const r of s.matchAll(REFERENCE)) entry(r[1] + " " + r[2] + " " + r[3]).referencedOn.add(p.page);
    }
  }
  // Word counts: from a header to the next header, in page order.
  const wordsOf = (text) => (text.match(/\S+/g) || []).length;
  const wordCounts = new Map();
  for (let k = 0; k < headers.length; k++) {
    const h = headers[k];
    const next = headers[k + 1];
    let words = 0;
    for (const pl of pageLines) {
      if (pl.page < h.page) continue;
      if (next && pl.page > next.page) break;
      const from = pl.page === h.page ? h.lineIndex + 1 : 0;
      const to = next && pl.page === next.page ? next.lineIndex : pl.lines.length;
      words += wordsOf(pl.lines.slice(from, to).join(" "));
    }
    wordCounts.set(h.number, (wordCounts.get(h.number) || 0) + words);
  }
  const sections = [];
  const referencedAbsent = [];
  for (const e of [...byNumber.values()].sort((a, b) => a.number.localeCompare(b.number))) {
    const present = e.headerPages.length > 0 || e.footerPages.length > 0;
    if (!present) { if (e.referencedOn.size || e.tocTitle) referencedAbsent.push({ number: e.number, title: e.tocTitle || "", referencedOn: [...e.referencedOn].sort((a, b) => a - b) }); continue; }
    const pagesSeen = [...new Set([...e.headerPages, ...e.footerPages])].sort((a, b) => a - b);
    const wordCount = wordCounts.get(e.number) || 0;
    sections.push({ number: e.number, title: e.title || e.tocTitle || "", page: pagesSeen[0], pages: pagesSeen.length, wordCount, short: e.headerPages.length > 0 && wordCount < CSI_SHORT_SECTION_WORD_THRESHOLD });
  }
  return { sections, referencedAbsent };
}

// ---- DrawX: sheet numbers from title blocks -------------------------------
// PDFium returns a sheet's text in content-stream order, not reading order,
// so the title block is a cluster of lines around "SHEET TITLE" / "DRAWN BY"
// with the sheet number split into fragments ("DRAWN BY: ##Name## 1LS", ".1";
// "", "0.1" for A0.1). The number is read from those fragments and, when they
// are incomplete, resolved against the cover sheet's index (a run of sheet
// numbers followed by a run of titles, or "number title" lines) by title, by
// suffix, or by position. A page with no title block gets no number: the 7
// October audit found DrawX inventing G48, O45 and TZ0 from drawing callouts,
// so a callout ("3/A5.1", "SEE SHEET G1.3") is never taken as the sheet.
// Chief Architect sets glue the block into one line ("... DRAWN BY: S.H.
// DATE: JUNE 2024 SHEET NUMBER ..."), with a plain number before DRAWN BY.
const SHEET_TOKEN = /^(?=.*\d)[0-9]?[A-Z]{1,3}-?[0-9]{0,3}(?:[.\-][0-9A-Z]{1,2})?$/;
const INDEX_LINE = /^((?=\S*\d)[0-9]?[A-Z]{1,3}-?[0-9]{0,3}(?:[.\-][0-9A-Z]{1,2})?)\s+([A-Z][A-Z0-9 ,&/'()\-]{3,90})$/;
const INDEX_HEADING = /SHEET INDEX|DRAWING INDEX|INDEX OF (?:DRAWINGS|SHEETS)|LIST OF DRAWINGS?|SHEET LIST/i;
const COLUMN_HEADER = /^(?:id|no\.?|number|sheet(?: no\.?| number| name| title)?|title|description|name)$/i;
const TITLE_TEXT = /^[A-Z][A-Z0-9 ,&/'()\-.]{2,90}$/;
const NOT_A_TITLE = /^(?:MARK DATE DESCRIPTION|SHEET TITLE|DRAWN BY|CHECKED BY|SCALE|DATE|PROJECT (?:NO|NUMBER|DATE)|REVISIONS?|NOT TO SCALE)\b/i;
const FRAGMENT = /^[0-9A-Z]{0,4}(?:[.\-][0-9A-Z]{0,2})?$/;

function cleanLine(raw) { return raw.replace(/\s+/g, " ").replace(/^[_\-\s]+|[_\-\s]+$/g, "").trim(); }

function readIndex(pages) {
  const entries = new Map();
  const order = [];
  const add = (number, title) => { if (!entries.has(number)) { entries.set(number, title || ""); order.push(number); } else if (title && !entries.get(number)) entries.set(number, title); };
  for (const p of pages || []) {
    const text = String(p.text || "");
    if (!INDEX_HEADING.test(text)) continue;
    const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
    for (const l of lines) { const m = l.match(INDEX_LINE); if (m) add(m[1], m[2].replace(/\s+/g, " ").trim()); }
    let i = 0;
    while (i < lines.length) {
      if (!SHEET_TOKEN.test(lines[i])) { i++; continue; }
      let j = i; const toks = [];
      while (j < lines.length && SHEET_TOKEN.test(lines[j])) { toks.push(lines[j]); j++; }
      if (toks.length >= 3) {
        let k = j; while (k < lines.length && COLUMN_HEADER.test(lines[k])) k++;
        const titles = [];
        while (k < lines.length && titles.length < toks.length && TITLE_TEXT.test(lines[k]) && !SHEET_TOKEN.test(lines[k]) && !COLUMN_HEADER.test(lines[k])) { titles.push(lines[k]); k++; }
        toks.forEach((t, idx) => add(t, titles.length === toks.length ? titles[idx] : ""));
      }
      i = j;
    }
  }
  return { entries, order };
}

function titleBlock(lines) {
  let a = lines.findIndex((l) => /^DRAWN BY\b/i.test(l));
  if (a < 0) a = lines.findIndex((l) => /^SHEET TITLE$/i.test(l));
  if (a < 0) return null;
  let title = "";
  for (let i = a - 1; i >= Math.max(0, a - 5); i--) {
    const l = lines[i];
    if (!l || NOT_A_TITLE.test(l) || !TITLE_TEXT.test(l) || SHEET_TOKEN.test(l) || /^\d+$/.test(l)) continue;
    title = l; break;
  }
  const pieces = [];
  const after = lines[a].replace(/^DRAWN BY:?\s*(?:#+\w*#+|[A-Z.]{1,6})?\s*/i, "").trim();
  if (after && FRAGMENT.test(after)) pieces.push(after);
  for (let i = a + 1; i < Math.min(lines.length, a + 5); i++) {
    const l = lines[i];
    if (l === "" || FRAGMENT.test(l)) { pieces.push(l); continue; }
    break;
  }
  return { title, fragment: pieces.join(""), anchorAt: a };
}

function normTitle(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }

function resolveWithIndex(index, fragment, title, pageNo, pageCount) {
  const numbers = index.order;
  if (!numbers.length) return null;
  if (fragment && numbers.includes(fragment)) return { number: fragment, how: "title-block" };
  const suffix = (fragment || "").replace(/^\./, "");
  if (title) {
    const t = normTitle(title);
    const byTitle = numbers.filter((n) => { const it = normTitle(index.entries.get(n)); return it && (it === t || t.includes(it) || it.includes(t)); });
    if (byTitle.length === 1) return { number: byTitle[0], how: "index-title" };
    if (byTitle.length > 1 && suffix) { const bySuffix = byTitle.filter((n) => n.endsWith(suffix)); if (bySuffix.length === 1) return { number: bySuffix[0], how: "index-title" }; }
    if (byTitle.length > 1 && numbers.length === pageCount && byTitle.includes(numbers[pageNo - 1])) return { number: numbers[pageNo - 1], how: "index-order" };
  }
  if (suffix.length >= 2) {
    const bySuffix = numbers.filter((n) => n.endsWith(suffix));
    if (bySuffix.length === 1) return { number: bySuffix[0], how: "index-suffix" };
    if (bySuffix.length > 1 && numbers.length === pageCount && bySuffix.includes(numbers[pageNo - 1])) return { number: numbers[pageNo - 1], how: "index-order" };
  }
  if (numbers.length === pageCount && (fragment || title)) return { number: numbers[pageNo - 1], how: "index-order" };
  return null;
}

export function parseSheetIndex(pages) {
  const index = readIndex(pages);
  const pageCount = (pages || []).length;
  const sheets = [];
  const seen = new Set();
  for (const p of pages || []) {
    const lines = String(p.text || "").split(/\r?\n/).map(cleanLine);
    const nonEmpty = lines.filter(Boolean);
    const block = titleBlock(lines);
    let number = null; let how = null; let title = block ? block.title : "";
    if (block) {
      if (block.fragment && SHEET_TOKEN.test(block.fragment)) { number = block.fragment; how = "title-block"; }
      else { const r = resolveWithIndex(index, block.fragment, block.title, p.page, pageCount); if (r) { number = r.number; how = r.how; } }
    }
    if (!number) {
      const glued = nonEmpty.find((l) => /SHEET NUMBER/i.test(l) && /DRAWN BY/i.test(l));
      if (glued) { const head = glued.split(/DRAWN BY/i)[0]; const m = head.match(/(?:^|\s)(\d{1,2})(?=\s)/); if (m && Number(m[1]) <= pageCount) { number = m[1]; how = "sheet-number-label"; } }
    }
    if (number && index.entries.get(number)) title = index.entries.get(number);
    if (number && seen.has(number)) { number = null; how = null; }
    if (number) seen.add(number);
    sheets.push({ page: p.page, number, title: (title || "").slice(0, 80), how });
  }
  const found = new Set(sheets.map((s) => s.number).filter(Boolean));
  const listedNotFound = index.order.filter((n) => !found.has(n)).map((n) => ({ number: n, title: index.entries.get(n) || "" }));
  return {
    sheets,
    indexEntries: index.order.map((number) => ({ number, title: index.entries.get(number) || "" })),
    listedNotFound,
    pagesWithoutNumber: sheets.filter((s) => !s.number).map((s) => s.page),
  };
}
