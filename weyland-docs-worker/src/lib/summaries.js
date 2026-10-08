// weyland-docs-worker/src/lib/summaries.js
// HTML for the summary PDFs the BROWSER binding renders (same look as the
// monolith's generators in src/routes/document-generators.js), with page
// numbers on every flagged line and the new SpecX / DrawX columns.

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STYLE = [
  "body{font-family:Georgia,\"Times New Roman\",serif;color:#111;margin:0;padding:60px 70px;font-size:13px;line-height:1.6}",
  "h1{font-size:20px;margin:0 0 4px}",
  ".sub{color:#666;font-size:11px;margin-bottom:30px}",
  ".row{display:flex;gap:24px;margin-bottom:16px}",
  ".field{flex:1}",
  ".field label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;margin-bottom:2px}",
  ".field div{border-bottom:1px solid #999;padding-bottom:3px;min-height:16px}",
  ".stats{display:flex;gap:24px;margin:26px 0}",
  ".stats .box{flex:1;padding:14px;background:#f6f6f2;border:1px solid #ddd;text-align:center}",
  ".stats .box strong{display:block;font-size:22px}",
  ".stats .box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777}",
  "h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#777}",
  "ul{margin-top:10px;padding-left:20px}",
  "li{padding:4px 0;font-size:12px}",
  "li.flag{color:#a8331f}",
  "li.none{color:#777}",
  ".pg{display:inline-block;min-width:34px;margin-right:8px;font-size:9px;letter-spacing:.06em;color:#555;border:1px solid #ccc;border-radius:3px;padding:0 4px;text-align:center}",
  "table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}",
  "th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#777;border-bottom:2px solid #333;padding:6px 4px}",
  "td{padding:6px 4px;border-bottom:1px solid #eee}",
  "tr.short td{color:#a8331f}",
  "td.none{color:#777}",
  ".heatmap{position:relative;width:100%;border:1px solid #999;background:#fafaf8;margin-top:16px}",
  ".disclaimer{margin-top:40px;padding-top:14px;border-top:1px solid #ccc;font-size:9.5px;color:#777;line-height:1.5}",
].join("\n");

function head(title, product, fields, stats) {
  const rows = [];
  for (let i = 0; i < fields.length; i += 2) {
    const pair = fields.slice(i, i + 2).map((f) => '<div class="field"><label>' + esc(f[0]) + "</label><div>" + esc(f[1]) + "</div></div>").join("");
    rows.push('<div class="row">' + pair + "</div>");
  }
  const boxes = stats.map((s) => '<div class="box"><strong>' + esc(s[0]) + "</strong><span>" + esc(s[1]) + "</span></div>").join("");
  return "<!doctype html><html><head><meta charset=\"utf-8\"><style>" + STYLE + "</style></head><body>" +
    "<h1>" + esc(title) + "</h1>" +
    '<div class="sub">Prepared via WeylandAI / ' + esc(product) + " &middot; " + esc(new Date().toLocaleDateString()) + "</div>" +
    rows.join("") + '<div class="stats">' + boxes + "</div>";
}

const foot = (disclaimer) => '<div class="disclaimer">' + esc(disclaimer) + "</div></body></html>";

/** InspecX, SafetyX, SurvX: flagged lines with page numbers. */
export function listSummaryHtml({ title, product, fields, stats, flagged, none, disclaimer, heading = "Flagged Items" }) {
  const items = flagged.length
    ? flagged.map((f) => '<li class="flag"><span class="pg">p.' + esc(f.page) + "</span>" + esc(f.line) + "</li>").join("")
    : '<li class="none">' + esc(none) + "</li>";
  return head(title, product, fields, stats) + "<h2>" + esc(heading) + "</h2><ul>" + items + "</ul>" + foot(disclaimer);
}

/** SpecX: sections present in the book, references apart. */
export function specIndexHtml({ projectName, specDate, pageCount, sections, referencedAbsent }) {
  const rows = sections.length
    ? sections.map((s) => '<tr class="' + (s.short ? "short" : "") + '"><td>' + esc(s.number) + "</td><td>" + esc(s.title) + "</td><td>" + esc(s.page) + "</td><td>" + esc(s.wordCount) + "</td><td>" + (s.short ? "SHORT - REVIEW" : "") + "</td></tr>").join("")
    : '<tr><td colspan="5" class="none">No CSI-numbered section headers (SECTION DD SS SS, or DD SS SS - n page footers) were found in this document.</td></tr>';
  const refs = referencedAbsent.length
    ? "<h2>Referenced but not in this book (" + referencedAbsent.length + ")</h2><p style=\"font-size:11px;color:#555\">" + esc(referencedAbsent.map((r) => r.number + (r.title ? " " + r.title : "")).join("; ")) + "</p>"
    : "";
  return head("Spec Section Index", "SpecX", [["Project", projectName], ["Spec Date", specDate]], [[pageCount, "Pages Read"], [sections.length, "Sections Present"], [sections.filter((s) => s.short).length, "Short Sections"]]) +
    "<table><thead><tr><th>Section #</th><th>Title</th><th>Page</th><th>Words</th><th>Flag</th></tr></thead><tbody>" + rows + "</tbody></table>" + refs +
    foot("Sections are those whose SECTION header or page footers appear in the document's text (the PDF's own text layer, or OCR where a page has none). Numbers that only appear inside sentences or in the table of contents are listed as references, not sections. Short sections are flagged by word count only. This is a section index, not a code-compliance check.");
}

/** DrawX: one row per page with the sheet number read from its title block. */
export function drawingIndexHtml({ projectName, drawingSetDate, pageCount, sheets, listedNotFound, pagesWithoutNumber }) {
  const numbered = sheets.filter((s) => s.number);
  const rows = numbered.length
    ? sheets.map((s) => "<tr><td>" + esc(s.page) + "</td><td>" + (s.number ? esc(s.number) : '<span class="none">no sheet number read</span>') + "</td><td>" + esc(s.title || "") + "</td><td>" + esc(s.how === "title-block" ? "title block" : s.how === "index-title" ? "index (title)" : s.how === "index-suffix" ? "index (number)" : s.how === "index-order" ? "index (order)" : s.how === "sheet-number-label" ? "SHEET NUMBER label" : "") + "</td></tr>").join("")
    : '<tr><td colspan="4" class="none">No sheet number was read from any title block. The index needs the sheet number printed in the title block (A-101, M-1.1, 1LS.1 styles) or a cover-sheet index.</td></tr>';
  const notes = [];
  if (pagesWithoutNumber.length) notes.push("Pages without a sheet number: " + pagesWithoutNumber.join(", ") + ".");
  if (listedNotFound.length) notes.push("Listed in the cover-sheet index but not found on any page: " + listedNotFound.map((l) => l.number).join(", ") + ".");
  return head("Drawing Set Sheet Index", "DrawX", [["Project", projectName], ["Drawing Set Date", drawingSetDate]], [[pageCount, "Pages Read"], [numbered.length, "Sheets Indexed"], [pagesWithoutNumber.length, "Pages Without a Number"]]) +
    "<table><thead><tr><th>Page</th><th>Sheet #</th><th>Title</th><th>Read from</th></tr></thead><tbody>" + rows + "</tbody></table>" +
    (notes.length ? "<p style=\"font-size:11px;color:#555\">" + esc(notes.join(" ")) + "</p>" : "") +
    foot("Sheet numbers are read from each page's title block text (the PDF's own text layer, or OCR where a page has none) and, where the title block is fragmented, resolved against the cover-sheet index by title, number or order. A page whose title block cannot be read gets no number rather than a guess from drawing callouts. This is a sheet index, not drawing content analysis.");
}

/** AsBuiltX: the coarse pixel-difference heatmap, as before. */
export function asBuiltDiffHtml(d) {
  const cellW = 100 / d.gridCols;
  const cellH = 100 / d.gridRows;
  const cells = d.cellDiffs.map((row, gy) => row.map((v, gx) => {
    const alpha = Math.min(1, v * 3);
    return '<div style="position:absolute;left:' + (gx * cellW).toFixed(3) + "%;top:" + (gy * cellH).toFixed(3) + "%;width:" + cellW.toFixed(3) + "%;height:" + cellH.toFixed(3) + "%;background:rgba(168,51,31," + alpha.toFixed(3) + ')"></div>';
  }).join("")).join("");
  return head("As-Built vs. Original Diff", "AsBuiltX", [["Project", d.projectName], ["Sheet", d.sheetLabel]], [[d.overallDiffPercent + "%", "Overall Pixel Difference"], [d.gridCols + "x" + d.gridRows, "Grid Resolution"]]) +
    '<div class="heatmap" style="aspect-ratio:' + Number(d.width || 4) + "/" + Number(d.height || 3) + '">' + cells + "</div>" +
    foot("This heatmap shows raw pixel-level differences between the two uploaded page renders (each rendered on its own under a 2-megapixel budget), in a " + d.gridCols + "x" + d.gridRows + " grid - darker cells differ more. It is not markup or redline recognition and does not understand what changed. Scan misalignment, scale differences and print-quality noise also show up here.");
}
