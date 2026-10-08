// src/lib/submittal-assembler.js
//
// MONOLITH_HELPER_MAP.md's Cluster C: submittal PDF package assembly.
// Extracted from legacy-monolith.js's own `// submittal-assembler.js`
// esbuild module-boundary comment (~line 138633) - proof this existed
// as a separate source file before being flattened into the bundle.
// Self-contained: the only external dependency is the vendored pdf-lib
// bundle, passed in by callers as the PDFLib parameter (same pattern
// already used by routes/sessions-assemble.js and
// routes/athena-integration.js, both of which inject
// assembleSubmittalPackage/getAssemblyStatus as deps).
//
// BHMA_FINISH_LOOKUP was attributed to Cluster B (CPS manufacturer
// matching) in the original cataloguing pass's line-range estimate,
// but both of its real call sites are inside generateHardwareSetPage
// in this same cluster - moved here instead, where it's actually used.
//
// esbuild's cosmetic __name(...) calls dropped, same as every other
// extraction in this effort.
//
// Sovereignty step 3 (2026-09-11, MONOLITH_HELPER_MAP.md section 3):
// generateCoverPage/generateTableOfContents/generateHardwareSetPage now
// build their own PDF bytes via sovereign-pdf.js instead of the pdf-lib
// bundle injected as the PDFLib parameter - real interop-tested (pdf-lib
// itself, and independently pypdf, both read sovereign-pdf.js's output
// correctly). mergePdfs()/assembleSubmittalPackage's final load() still
// use the real, injected PDFLib (pdf-lib) - correctly so, since cut
// sheets are genuinely fetched from arbitrary third-party manufacturer
// URLs (see cutSheetPdfs in assembleSubmittalPackage), not just
// known-producer output; that's a real arbitrary-PDF-reading problem
// pdf-lib is still needed for, comparable in difficulty to section 3's
// step 5 (the rasterizer), not this step's scope. The PDFLib parameter
// is kept on these 3 functions' signatures for call-site compatibility
// even though they no longer read it internally.

import { getCataloguePagePdf } from "../../../weyland-shared/cut-sheet-pages.js";
import { PDFDocument as SovereignPDFDocument, StandardFonts as SovereignStandardFonts, rgb as sovereignRgb } from "./sovereign-pdf.js";

var BHMA_FINISH_LOOKUP = {
  "600": "Primed for Painting",
  "605": "Bright Brass",
  "606": "Satin Brass",
  "609": "Satin Bronze",
  "612": "Satin Bronze",
  "613": "Oil-Rubbed Bronze",
  "619": "Flat Black",
  "625": "Bright Chromium",
  "626": "Satin Chromium",
  "629": "Bright Stainless Steel",
  "630": "Satin Stainless Steel",
  "643e": "Aged Bronze",
  "689": "Aluminum Painted",
  "695": "Dark Oxidized Satin Bronze",
  "710": "Satin Nickel"
};
export function drawTable(page, opts) {
  const {
    headers,
    rows,
    x,
    y,
    colWidths,
    font,
    headerFont,
    fontSize = 9,
    headerFontSize = 9,
    rgb: rgb2,
    rowHeight = 18,
    headerRowHeight = 22,
    minY = 60
  } = opts;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  let curY = y;
  page.drawRectangle({
    x,
    y: curY - headerRowHeight,
    width: tableWidth,
    height: headerRowHeight,
    color: rgb2(0.2, 0.4, 0.6)
  });
  let colX = x;
  for (let c = 0; c < headers.length; c++) {
    const text = truncateText(headers[c], colWidths[c] - 6, headerFont, headerFontSize);
    page.drawText(text, {
      x: colX + 3,
      y: curY - headerRowHeight + 6,
      size: headerFontSize,
      font: headerFont,
      color: rgb2(1, 1, 1)
    });
    colX += colWidths[c];
  }
  curY -= headerRowHeight;
  let rowsDrawn = 0;
  for (const row of rows) {
    if (curY - rowHeight < minY)
      break;
    if (rowsDrawn % 2 === 1) {
      page.drawRectangle({
        x,
        y: curY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        color: rgb2(0.95, 0.96, 0.98)
      });
    }
    colX = x;
    for (let c = 0; c < row.length; c++) {
      const cellText = truncateText(String(row[c] ?? "\u2014"), colWidths[c] - 6, font, fontSize);
      page.drawText(cellText, {
        x: colX + 3,
        y: curY - rowHeight + 5,
        size: fontSize,
        font,
        color: rgb2(0.1, 0.1, 0.1)
      });
      colX += colWidths[c];
    }
    page.drawLine({
      start: { x, y: curY - rowHeight },
      end: { x: x + tableWidth, y: curY - rowHeight },
      thickness: 0.5,
      color: rgb2(0.85, 0.85, 0.85)
    });
    curY -= rowHeight;
    rowsDrawn++;
  }
  return { endY: curY, rowsDrawn };
}
export function truncateText(text, maxWidth, font, fontSize) {
  if (!text)
    return "\u2014";
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth)
    return text;
  while (text.length > 1 && font.widthOfTextAtSize(text + "\u2026", fontSize) > maxWidth) {
    text = text.slice(0, -1);
  }
  return text + "\u2026";
}
export async function generateCoverPage(options, PDFLib) {
  const PDFDocument3 = SovereignPDFDocument, StandardFonts2 = SovereignStandardFonts, rgb2 = sovereignRgb;
  const doc = await PDFDocument3.create();
  const page = doc.addPage([612, 792]);
  const helveticaBold = await doc.embedFont(StandardFonts2.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts2.Helvetica);
  const { width, height } = page.getSize();
  const centerX = width / 2;
  page.drawText("HARDWARE SCHEDULE", {
    x: centerX - helveticaBold.widthOfTextAtSize("HARDWARE SCHEDULE", 28) / 2,
    y: height - 180,
    size: 28,
    font: helveticaBold,
    color: rgb2(0.1, 0.1, 0.1)
  });
  page.drawText("SUBMITTAL", {
    x: centerX - helveticaBold.widthOfTextAtSize("SUBMITTAL", 28) / 2,
    y: height - 220,
    size: 28,
    font: helveticaBold,
    color: rgb2(0.1, 0.1, 0.1)
  });
  page.drawLine({
    start: { x: 100, y: height - 260 },
    end: { x: width - 100, y: height - 260 },
    thickness: 2,
    color: rgb2(0.2, 0.4, 0.6)
  });
  const infoStartY = height - 320;
  const lineHeight = 28;
  const infoLines = [
    { label: "PROJECT:", value: options.projectName || "Untitled Project" },
    { label: "DATE:", value: options.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0] },
    { label: "PREPARED BY:", value: options.preparedBy || "Weyland by Weyland" }
  ];
  if (options.preparedFor) {
    infoLines.push({ label: "PREPARED FOR:", value: options.preparedFor });
  }
  if (options.contractor) {
    infoLines.push({ label: "GENERAL CONTRACTOR:", value: options.contractor });
  }
  if (options.architect) {
    infoLines.push({ label: "ARCHITECT:", value: options.architect });
  }
  if (options.dsaNumber) {
    infoLines.push({ label: "DSA No.:", value: options.dsaNumber });
  }
  infoLines.forEach((line, idx) => {
    const y = infoStartY - idx * lineHeight;
    page.drawText(line.label, {
      x: 100,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb2(0.3, 0.3, 0.3)
    });
    page.drawText(line.value, {
      x: 250,
      y,
      size: 12,
      font: helvetica,
      color: rgb2(0.1, 0.1, 0.1)
    });
  });
  page.drawText("Generated by WeylandAI SubX", {
    x: centerX - helvetica.widthOfTextAtSize("Generated by WeylandAI SubX", 10) / 2,
    y: 80,
    size: 10,
    font: helvetica,
    color: rgb2(0.5, 0.5, 0.5)
  });
  page.drawText("weylandai.com", {
    x: centerX - helvetica.widthOfTextAtSize("weylandai.com", 10) / 2,
    y: 65,
    size: 10,
    font: helvetica,
    color: rgb2(0.4, 0.5, 0.6)
  });
  return await doc.save();
}
export async function generateTableOfContents(sections, PDFLib) {
  const PDFDocument3 = SovereignPDFDocument, StandardFonts2 = SovereignStandardFonts, rgb2 = sovereignRgb;
  const doc = await PDFDocument3.create();
  let page = doc.addPage([612, 792]);
  const helveticaBold = await doc.embedFont(StandardFonts2.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts2.Helvetica);
  const { width, height } = page.getSize();
  let currentY = height - 80;
  const lineHeight = 24;
  const marginBottom = 80;
  const contentStartY = height - 140;
  page.drawText("TABLE OF CONTENTS", {
    x: 72,
    y: currentY,
    size: 18,
    font: helveticaBold,
    color: rgb2(0.1, 0.1, 0.1)
  });
  currentY = contentStartY;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (currentY < marginBottom) {
      page = doc.addPage([612, 792]);
      currentY = height - 80;
      page.drawText("TABLE OF CONTENTS (continued)", {
        x: 72,
        y: currentY,
        size: 14,
        font: helveticaBold,
        color: rgb2(0.3, 0.3, 0.3)
      });
      currentY = contentStartY;
    }
    const numText = `${i + 1}.`;
    page.drawText(numText, {
      x: 72,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: rgb2(0.2, 0.2, 0.2)
    });
    const titleMaxWidth = 350;
    let title2 = section.title || "Untitled Section";
    if (helvetica.widthOfTextAtSize(title2, 11) > titleMaxWidth) {
      while (helvetica.widthOfTextAtSize(title2 + "...", 11) > titleMaxWidth && title2.length > 0) {
        title2 = title2.slice(0, -1);
      }
      title2 += "...";
    }
    page.drawText(title2, {
      x: 100,
      y: currentY,
      size: 11,
      font: helvetica,
      color: rgb2(0.1, 0.1, 0.1)
    });
    const titleEndX = 100 + helvetica.widthOfTextAtSize(title2, 11) + 10;
    const pageNumX = width - 72 - helvetica.widthOfTextAtSize(String(section.pageNumber), 11);
    const dotSpacing = 8;
    for (let dotX = titleEndX; dotX < pageNumX - 10; dotX += dotSpacing) {
      page.drawText(".", {
        x: dotX,
        y: currentY,
        size: 11,
        font: helvetica,
        color: rgb2(0.6, 0.6, 0.6)
      });
    }
    page.drawText(String(section.pageNumber), {
      x: pageNumX,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: rgb2(0.2, 0.2, 0.2)
    });
    if (section.type === "cut_sheet") {
      page.drawText("[CUT SHEET]", {
        x: width - 72,
        y: currentY - 12,
        size: 7,
        font: helvetica,
        color: rgb2(0.5, 0.5, 0.5)
      });
    }
    currentY -= lineHeight;
  }
  return await doc.save();
}
export async function generateHardwareSetPage(setData, options, PDFLib) {
  const PDFDocument3 = SovereignPDFDocument, StandardFonts2 = SovereignStandardFonts, rgb2 = sovereignRgb;
  const doc = await PDFDocument3.create();
  const helveticaBold = await doc.embedFont(StandardFonts2.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts2.Helvetica);
  const pageW = 612, pageH = 792;
  const margin = 72;
  const contentWidth = pageW - margin * 2;
  const set = setData.set;
  const components = setData.components || [];
  const doors = setData.doors || [];
  const isAffirmed = set.affirmed === 1;
  let page = doc.addPage([pageW, pageH]);
  let curY = pageH - 50;
  const titleText = `Hardware Submittal Sheet \u2014 Set ${set.set_number}`;
  page.drawText(titleText, {
    x: pageW / 2 - helveticaBold.widthOfTextAtSize(titleText, 16) / 2,
    y: curY,
    size: 16,
    font: helveticaBold,
    color: rgb2(0.2, 0.4, 0.6)
  });
  curY -= 20;
  const badgeText = isAffirmed ? "AFFIRMED" : "PENDING REVIEW";
  const badgeColor = isAffirmed ? rgb2(0.13, 0.55, 0.13) : rgb2(0.8, 0.5, 0);
  const badgeW = helveticaBold.widthOfTextAtSize(badgeText, 8);
  page.drawRectangle({
    x: pageW / 2 - (badgeW + 12) / 2,
    y: curY - 4,
    width: badgeW + 12,
    height: 14,
    color: badgeColor
  });
  page.drawText(badgeText, {
    x: pageW / 2 - badgeW / 2,
    y: curY,
    size: 8,
    font: helveticaBold,
    color: rgb2(1, 1, 1)
  });
  curY -= 24;
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: pageW - margin, y: curY },
    thickness: 1.5,
    color: rgb2(0.2, 0.4, 0.6)
  });
  curY -= 18;
  const metaFields = [
    ["Project:", setData.projectName || "Hardware Submittal Package"],
    ["DSA No.:", setData.dsaNumber || "\u2014"],
    ["Prepared For:", setData.preparedFor || "\u2014"],
    ["Set #:", set.set_number],
    ["Set Name:", set.set_name || "\u2014"],
    ["Door Count:", set.door_count != null ? String(set.door_count) : String(doors.length || "\u2014")]
  ];
  const finishCounts = {};
  for (const c of components) {
    if (c.finish) {
      const f = c.finish.toLowerCase().trim();
      finishCounts[f] = (finishCounts[f] || 0) + 1;
    }
  }
  const dominantFinish = Object.entries(finishCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (dominantFinish) {
    const displayFinish = BHMA_FINISH_LOOKUP[dominantFinish] || dominantFinish.toUpperCase();
    metaFields.push(["Primary Finish:", `${displayFinish} (${dominantFinish.toUpperCase()})`]);
  }
  for (const [label, value] of metaFields) {
    page.drawText(label, {
      x: margin,
      y: curY,
      size: 10,
      font: helveticaBold,
      color: rgb2(0.3, 0.3, 0.3)
    });
    page.drawText(value, {
      x: margin + 90,
      y: curY,
      size: 10,
      font: helvetica,
      color: rgb2(0.1, 0.1, 0.1)
    });
    curY -= 16;
  }
  curY -= 8;
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: pageW - margin, y: curY },
    thickness: 0.5,
    color: rgb2(0.8, 0.8, 0.8)
  });
  curY -= 16;
  const doorsTitle = `Doors Using Set ${set.set_number} (${doors.length} door${doors.length !== 1 ? "s" : ""})`;
  page.drawText(doorsTitle, {
    x: margin,
    y: curY,
    size: 11,
    font: helveticaBold,
    color: rgb2(0.2, 0.4, 0.6)
  });
  curY -= 18;
  if (doors.length === 0) {
    page.drawText("No door entries linked to this set", {
      x: margin + 8,
      y: curY,
      size: 9,
      font: helvetica,
      color: rgb2(0.5, 0.5, 0.5)
    });
    curY -= 20;
  } else {
    const doorColWidths = [65, 90, 75, 75, 70, 93];
    const doorRows = doors.map((d) => [
      d.mark,
      d.width && d.height ? `${d.width} x ${d.height}` : "\u2014",
      d.door_type,
      d.frame_material,
      d.fire_rating,
      d.notes
    ]);
    const doorResult = drawTable(page, {
      headers: ["Door No.", "Size", "Type", "Frame", "Fire Rating", "Remarks"],
      rows: doorRows,
      x: margin,
      y: curY,
      colWidths: doorColWidths,
      font: helvetica,
      headerFont: helveticaBold,
      rgb: rgb2,
      minY: 60
    });
    curY = doorResult.endY;
    let remainingDoors = doorRows.slice(doorResult.rowsDrawn);
    while (remainingDoors.length > 0) {
      page = doc.addPage([pageW, pageH]);
      curY = pageH - 50;
      const contDoorTitle = `Set ${set.set_number} Doors (continued)`;
      page.drawText(contDoorTitle, {
        x: margin,
        y: curY,
        size: 11,
        font: helveticaBold,
        color: rgb2(0.2, 0.4, 0.6)
      });
      curY -= 18;
      const overflowDoorResult = drawTable(page, {
        headers: ["Door No.", "Size", "Type", "Frame", "Fire Rating", "Remarks"],
        rows: remainingDoors,
        x: margin,
        y: curY,
        colWidths: doorColWidths,
        font: helvetica,
        headerFont: helveticaBold,
        rgb: rgb2,
        minY: 60
      });
      curY = overflowDoorResult.endY;
      remainingDoors = remainingDoors.slice(overflowDoorResult.rowsDrawn);
    }
  }
  curY -= 12;
  const compTitle = `Hardware Set ${set.set_number} Components (${components.length} item${components.length !== 1 ? "s" : ""})`;
  page.drawText(compTitle, {
    x: margin,
    y: curY,
    size: 11,
    font: helveticaBold,
    color: rgb2(0.2, 0.4, 0.6)
  });
  curY -= 18;
  if (components.length === 0) {
    page.drawText("No components in this set", {
      x: margin + 8,
      y: curY,
      size: 9,
      font: helvetica,
      color: rgb2(0.5, 0.5, 0.5)
    });
    curY -= 20;
  } else {
    const compColWidths = [35, 145, 80, 120, 88];
    const compRows = components.map((c) => [
      `${c.quantity || 1} ${c.uom || "EA"}`,
      c.component_type ? c.component_type.replace(/_/g, " ") : "\u2014",
      c.manufacturer,
      c.model,
      c.finish ? BHMA_FINISH_LOOKUP[c.finish.toLowerCase()] || c.finish : "\u2014"
    ]);
    const compResult = drawTable(page, {
      headers: ["Qty", "Description", "Mfr", "Model/Series", "Finish"],
      rows: compRows,
      x: margin,
      y: curY,
      colWidths: compColWidths,
      font: helvetica,
      headerFont: helveticaBold,
      rgb: rgb2,
      minY: 60
    });
    curY = compResult.endY;
    let remaining = compRows.slice(compResult.rowsDrawn);
    while (remaining.length > 0) {
      page = doc.addPage([pageW, pageH]);
      curY = pageH - 50;
      const contTitle = `Set ${set.set_number} Components (continued)`;
      page.drawText(contTitle, {
        x: margin,
        y: curY,
        size: 11,
        font: helveticaBold,
        color: rgb2(0.2, 0.4, 0.6)
      });
      curY -= 18;
      const overflowResult = drawTable(page, {
        headers: ["Qty", "Description", "Mfr", "Model/Series", "Finish"],
        rows: remaining,
        x: margin,
        y: curY,
        colWidths: compColWidths,
        font: helvetica,
        headerFont: helveticaBold,
        rgb: rgb2,
        minY: 60
      });
      curY = overflowResult.endY;
      remaining = remaining.slice(overflowResult.rowsDrawn);
    }
  }
  const footerText = setData.preparedBy ? `Generated by ${setData.preparedBy}` : "Generated by Weyland Hardware Submittal System";
  page.drawText(footerText, {
    x: pageW / 2 - helvetica.widthOfTextAtSize(footerText, 8) / 2,
    y: 40,
    size: 8,
    font: helvetica,
    color: rgb2(0.6, 0.6, 0.6)
  });
  page = doc.addPage([pageW, pageH]);
  curY = pageH - 60;
  const pageBTitle = `Set ${set.set_number} \u2014 Keying & Compliance`;
  page.drawText(pageBTitle, {
    x: margin,
    y: curY,
    size: 14,
    font: helveticaBold,
    color: rgb2(0.2, 0.4, 0.6)
  });
  curY -= 30;
  page.drawText("Keying Information", {
    x: margin,
    y: curY,
    size: 12,
    font: helveticaBold,
    color: rgb2(0.1, 0.1, 0.1)
  });
  curY -= 20;
  const keyingInfo = set.notes || null;
  if (keyingInfo) {
    const keyingLines = keyingInfo.split("\n");
    for (const line of keyingLines) {
      page.drawText(line.substring(0, 80), {
        x: margin + 12,
        y: curY,
        size: 10,
        font: helvetica,
        color: rgb2(0.15, 0.15, 0.15)
      });
      curY -= 16;
    }
  } else {
    page.drawText("Keying information not specified \u2014 see project keying schedule", {
      x: margin + 12,
      y: curY,
      size: 10,
      font: helvetica,
      color: rgb2(0.5, 0.5, 0.5)
    });
    curY -= 16;
  }
  curY -= 16;
  page.drawText("Certifications & Compliance", {
    x: margin,
    y: curY,
    size: 12,
    font: helveticaBold,
    color: rgb2(0.1, 0.1, 0.1)
  });
  curY -= 20;
  const certifications = /* @__PURE__ */ new Set();
  let hasFireRating = false;
  let maxFireRating = 0;
  for (const c of components) {
    if (c.ansi_bhma_grade)
      certifications.add(`ANSI/BHMA ${c.ansi_bhma_grade}`);
    if (c.ada_compliant)
      certifications.add("ADA Compliant (ANSI A117.1)");
    if (c.ul_listing_number)
      certifications.add(`UL Listed (${c.ul_listing_number})`);
    if (c.fire_rating_minutes && c.fire_rating_minutes > 0) {
      hasFireRating = true;
      if (c.fire_rating_minutes > maxFireRating)
        maxFireRating = c.fire_rating_minutes;
    }
  }
  for (const d of doors) {
    if (d.fire_rating && d.fire_rating !== "NR" && d.fire_rating !== "N/R") {
      hasFireRating = true;
    }
  }
  if (hasFireRating) {
    const ratingText = maxFireRating > 0 ? `${maxFireRating} min` : "See schedule";
    certifications.add(`UL10C Fire Rated (${ratingText})`);
  }
  if (certifications.size === 0) {
    page.drawText("No compliance data available", {
      x: margin + 12,
      y: curY,
      size: 10,
      font: helvetica,
      color: rgb2(0.5, 0.5, 0.5)
    });
    curY -= 16;
  } else {
    for (const cert of certifications) {
      page.drawText(`\u2022  ${cert}`, {
        x: margin + 12,
        y: curY,
        size: 10,
        font: helvetica,
        color: rgb2(0.15, 0.15, 0.15)
      });
      curY -= 16;
    }
  }
  page.drawText(footerText, {
    x: pageW / 2 - helvetica.widthOfTextAtSize(footerText, 8) / 2,
    y: 40,
    size: 8,
    font: helvetica,
    color: rgb2(0.6, 0.6, 0.6)
  });
  return await doc.save();
}
export async function mergePdfs(pdfBytes, PDFLib) {
  const { PDFDocument: PDFDocument3 } = PDFLib;
  const mergedDoc = await PDFDocument3.create();
  for (const bytes of pdfBytes) {
    try {
      const pdf = await PDFDocument3.load(bytes, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    } catch (e) {
      console.warn(`[Assembler] Failed to merge a PDF: ${e.message}`);
    }
  }
  return await mergedDoc.save();
}
// 36 -> 3'-0", 95 -> 7'-11", 94.5 -> 7'-10 1/2"; 1.75 -> 1 3/4".
function sixteenthsText(x) {
  const e = Math.round(x * 16);
  if (e <= 0 || e >= 16) return "";
  let n = e, d = 16;
  while (n % 2 === 0) { n /= 2; d /= 2; }
  return n + "/" + d;
}
export function inchesText(x) {
  const whole = Math.floor(x + 1e-9), f = sixteenthsText(x - whole);
  return (whole ? String(whole) : "") + (whole && f ? " " : "") + f + '"';
}
export function feetInchesText(x) {
  const ft = Math.floor((x + 1e-9) / 12), rest = x - ft * 12;
  const whole = Math.floor(rest + 1e-9), f = sixteenthsText(rest - whole);
  return ft + "'-" + whole + (f ? " " + f : "") + '"';
}
// generateDoorSchedulePages (2026-10-07): the extracted door rows as their
// own submittal section - one row per door with every column the schedule
// carries and the place it was read from (page and table row), so each line
// in the package traces back to the uploaded sheet. Landscape Letter, as
// many pages as the rows need.
export async function generateDoorSchedulePages(doorRows, info = {}) {
  const PDFDocument3 = SovereignPDFDocument, StandardFonts2 = SovereignStandardFonts, rgb2 = sovereignRgb;
  const doc = await PDFDocument3.create();
  const helveticaBold = await doc.embedFont(StandardFonts2.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts2.Helvetica);
  const pageW = 792, pageH = 612, margin = 36;
  const headers = ["Mark", "HW group", "Size (W x H)", "Thick.", "Fire rating", "Door type / matl / fin", "Frame type / matl / fin", "Notes", "Source"];
  const colWidths = [50, 46, 92, 38, 54, 92, 104, 186, 58];
  const join = (...v) => v.map((x) => (x == null || x === "" ? "-" : String(x))).join(" / ");
  const rows = doorRows.map((d) => {
    let src = d.page_number ? "p." + d.page_number : "-";
    try {
      const fc = d.field_confidence_json ? JSON.parse(d.field_confidence_json) : null;
      if (fc && fc.source && fc.source.table_row != null) src += " row " + fc.source.table_row;
    } catch (_) { /* not a source trace */ }
    // Sizes as read into numbers; a value the reader could not read with
    // certainty keeps its text as read, marked (?).
    const size = d.width_inches != null && d.height_inches != null
      ? feetInchesText(d.width_inches) + " x " + feetInchesText(d.height_inches)
      : (d.width ? d.width + " (?)" : "(?)");
    const thickness = d.thickness_inches != null ? inchesText(d.thickness_inches) : (d.thickness ? d.thickness + " (?)" : "-");
    return [
      d.mark,
      d.hardware_group || "-",
      size,
      thickness,
      d.fire_rating || "-",
      join(d.door_type, d.door_material, d.door_finish),
      join(d.frame_type, d.frame_material, d.frame_finish),
      d.notes || "",
      src,
    ];
  });
  const title = "Door Schedule (extracted)";
  const sub = (info.projectName || "Project") + " - " + rows.length + " door" + (rows.length === 1 ? "" : "s") + (info.filename ? " read from " + info.filename : "");
  const note = "Machine-read from the uploaded schedule; values stay drafts until reviewed. (?) = not read with certainty, check it on the sheet. Source = page and table row on the uploaded sheet (appended at the end of this package).";
  let start = 0;
  let pageNo = 0;
  do {
    const page = doc.addPage([pageW, pageH]);
    pageNo++;
    page.drawText(title + (pageNo > 1 ? " (continued)" : ""), { x: margin, y: pageH - 44, size: 15, font: helveticaBold, color: rgb2(0.2, 0.4, 0.6) });
    page.drawText(truncateText(sub, pageW - margin * 2, helvetica, 9), { x: margin, y: pageH - 60, size: 9, font: helvetica, color: rgb2(0.25, 0.25, 0.25) });
    page.drawText(truncateText(note, pageW - margin * 2, helvetica, 7.5), { x: margin, y: pageH - 73, size: 7.5, font: helvetica, color: rgb2(0.45, 0.45, 0.45) });
    const res = drawTable(page, {
      headers, rows: rows.slice(start), x: margin, y: pageH - 84, colWidths,
      font: helvetica, headerFont: helveticaBold, fontSize: 7.5, headerFontSize: 7.5,
      rgb: rgb2, rowHeight: 13, headerRowHeight: 17, minY: 46,
    });
    page.drawText("Page " + pageNo, { x: pageW - margin - 40, y: 26, size: 7.5, font: helvetica, color: rgb2(0.55, 0.55, 0.55) });
    if (rows.length === 0) {
      page.drawText("No door rows have been extracted for this session yet.", { x: margin, y: pageH - 120, size: 10, font: helvetica, color: rgb2(0.4, 0.4, 0.4) });
      break;
    }
    if (res.rowsDrawn === 0) break;
    start += res.rowsDrawn;
  } while (start < rows.length);
  return { bytes: await doc.save(), pages: doc.getPageCount() };
}

// R2 bucket for a product_documents row: 'product-docs' lives in
// subx-outputs (env.OUTPUTS); everything else ('subx-uploads', NULL) in
// subx-uploads (env.UPLOADS) - same resolution cut-sheet-documents.js uses.
function cutSheetBucket(env2, r2Bucket) {
  if (r2Bucket === "product-docs" || r2Bucket === "OUTPUTS" || r2Bucket === "subx-outputs") return env2.OUTPUTS || env2.UPLOADS;
  return env2.UPLOADS;
}

export async function assembleSubmittalPackage(sessionId, options, env2, PDFLib) {
  console.log(`[Assembler] Starting assembly for session ${sessionId}`);
  const result = {
    success: false,
    sessionId,
    sections: [],
    errors: [],
    totalPages: 0,
    pdfBytes: null
  };
  try {
    const session = await env2.DB.prepare(`
      SELECT project_name, filename, file_buffer_key, total_pages, status
      FROM hardware_extraction_sessions
      WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      result.errors.push("Session not found");
      return result;
    }
    const projectName = options.projectName || session.project_name;
    console.log("[Assembler] Generating cover page...");
    const coverBytes = await generateCoverPage({
      projectName,
      date: options.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      preparedBy: options.preparedBy || "WeylandAI SubX",
      preparedFor: options.preparedFor,
      contractor: options.contractor,
      architect: options.architect,
      dsaNumber: options.dsaNumber
    }, PDFLib);
    result.sections.push({ type: "cover", title: "Cover Page", pages: 1 });

    // 2026-10-07: door rows extracted from a door schedule are a section of
    // their own (before this, a door-schedule-only session produced a
    // package with no door data in it at all - the rows only appeared
    // inside affirmed hardware-set pages).
    const doorRowsResult = await env2.DB.prepare(`
      SELECT mark, hardware_group, fire_rating, width, width_inches, height_inches,
             thickness, thickness_inches, door_type, door_material, door_finish,
             frame_type, frame_material, frame_finish, notes, page_number, field_confidence_json
      FROM door_schedule_entries
      WHERE session_id = ?
      ORDER BY page_number ASC, rowid ASC
    `).bind(sessionId).all();
    const doorRows = doorRowsResult.results || [];
    let doorSection = null;
    if (doorRows.length > 0) {
      doorSection = await generateDoorSchedulePages(doorRows, { projectName, filename: session.filename });
    }

    const cutSheets = Array.isArray(options.citedPages) ? { results: [] } : await env2.DB.prepare(`
      SELECT
        pd.id, pd.document_title, pd.document_url, pd.r2_object_key, pd.r2_bucket, pd.page_count,
        m.name as manufacturer_name
      FROM session_cut_sheet_matches scm
      JOIN product_documents pd ON scm.cut_sheet_id = pd.id
      JOIN products p ON pd.product_id = p.id
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE scm.session_id = ?
      ORDER BY scm.created_at
    `).bind(sessionId).all();
    const tocSections = [
      { title: "Cover Page", pageNumber: 1, type: "cover" },
      { title: "Table of Contents", pageNumber: 2, type: "toc" }
    ];
    let currentPage = 3;
    if (doorSection) {
      tocSections.push({ title: `Door Schedule (extracted) - ${doorRows.length} doors`, pageNumber: currentPage, type: "door_schedule" });
      currentPage += doorSection.pages;
      result.sections.push({ type: "door_schedule", title: "Door Schedule (extracted)", pages: doorSection.pages, doors: doorRows.length });
    }
    // Affirmed sets always; unaffirmed (draft) sets too when the caller asks
    // (the SubX workspace does: a fresh extraction is a draft, and the set
    // page itself is badged PENDING REVIEW).
    const hardwareSetsResult = await env2.DB.prepare(`
      SELECT id, set_number, set_name, door_location, door_count, notes, affirmed
      FROM hardware_sets
      WHERE session_id = ? AND (affirmed = 1 OR ? = 1)
      ORDER BY set_number ASC
    `).bind(sessionId, options.includeDraftSets ? 1 : 0).all();
    const hardwareSets = hardwareSetsResult.results || [];
    console.log(`[Assembler] Found ${hardwareSets.length} hardware sets for assembly`);
    const hardwareSetPdfs = [];
    for (const set of hardwareSets) {
      const componentsResult = await env2.DB.prepare(`
        SELECT component_type, quantity, manufacturer, model, finish,
               ansi_bhma_grade, fire_rating_minutes, ul_listing_number, ada_compliant,
               uom, sequence_order, catalog_number, specifications
        FROM hardware_components
        WHERE set_id = ?
        ORDER BY sequence_order ASC
      `).bind(set.id).all();
      const components = componentsResult.results || [];
      const doorsResult = await env2.DB.prepare(`
        SELECT mark, width, height, door_type, frame_material, fire_rating
        FROM door_schedule_entries
        WHERE session_id = ? AND hardware_group = ?
        ORDER BY mark ASC
      `).bind(sessionId, set.set_number).all();
      const doors = doorsResult.results || [];
      const setData = {
        set,
        components,
        doors,
        projectName,
        dsaNumber: options.dsaNumber || null,
        preparedFor: options.preparedFor || null,
        preparedBy: options.preparedBy || null
      };
      try {
        const setBytes = await generateHardwareSetPage(setData, {}, PDFLib);
        hardwareSetPdfs.push(setBytes);
        const setDoc = await PDFLib.PDFDocument.load(setBytes);
        const setPageCount = setDoc.getPageCount();
        tocSections.push({
          title: `Hardware Set ${set.set_number}${set.set_name ? " — " + set.set_name : ""}${set.affirmed === 1 ? "" : " (pending review)"}`,
          pageNumber: currentPage,
          type: "hardware_set"
        });
        currentPage += setPageCount;
        result.sections.push({
          type: "hardware_set",
          title: `Hardware Set ${set.set_number}`,
          pages: setPageCount,
          components: components.length,
          doors: doors.length,
          affirmed: set.affirmed === 1
        });
        console.log(`[Assembler] Generated set ${set.set_number}: ${setPageCount} pages (${components.length} components, ${doors.length} doors)`);
      } catch (setErr) {
        console.warn(`[Assembler] Failed to generate set ${set.set_number}: ${setErr.message}`);
        result.errors.push(`Hardware Set ${set.set_number}: ${setErr.message}`);
      }
    }
    const cutSheetPdfs = [];
    // 2026-10-08: the packet carries the page each product is cited on
    // (options.citedPages, from the shared matcher's citedPagesFor), never a
    // whole price book: one matched Schlage lever put the 400-page price book
    // into the package. Callers without cited pages get the old filed
    // documents, but only short ones (a cut sheet, not a book).
    const MAX_WHOLE_DOC_PAGES = 6;
    if (Array.isArray(options.citedPages)) {
      const loaded = new Map();
      for (const cp of options.citedPages) {
        const got = await getCataloguePagePdf(env2, PDFLib.PDFDocument, { catalogueId: cp.catalogueId, pageNum: cp.pageNum }, loaded);
        const label = `${[cp.manufacturer, cp.model].filter(Boolean).join(" ")}: ${cp.title || "catalogue"}, page ${cp.pageNum}`;
        if (got.bytes) {
          tocSections.push({ title: label, pageNumber: currentPage, type: "cut_sheet" });
          currentPage += 1;
          cutSheetPdfs.push(got.bytes);
          result.sections.push({ type: "cut_sheet", title: label, manufacturer: cp.manufacturer || null, model: cp.model || null, catalogue_id: cp.catalogueId, page: cp.pageNum, sets: cp.sets || [], pages: 1 });
        } else {
          result.errors.push(`No page on file for ${label} (${got.reason})`);
        }
      }
    }
    for (const cs of Array.isArray(options.citedPages) ? [] : (cutSheets.results || [])) {
      if ((cs.page_count || 1) > MAX_WHOLE_DOC_PAGES) {
        result.errors.push(`${cs.document_title} is ${cs.page_count} pages; not attached whole (attach the cited page instead)`);
        continue;
      }
      let csBytes = null;
      if (cs.r2_object_key) {
        try {
          const bucket = cutSheetBucket(env2, cs.r2_bucket);
          const csObj = bucket ? await bucket.get(cs.r2_object_key) : null;
          if (csObj) csBytes = new Uint8Array(await csObj.arrayBuffer());
        } catch (e) {
          console.warn(`[Assembler] R2 fetch failed for ${cs.document_title}: ${e.message}`);
        }
      }
      if (!csBytes && cs.document_url && options.fetchRemoteCutSheets) {
        try {
          const response = await fetch(cs.document_url, { headers: { "Accept": "application/pdf", "User-Agent": "WeylandAI-SubX-Assembler/1.0" } });
          if (response.ok && (response.headers.get("content-type") || "").includes("pdf")) {
            csBytes = new Uint8Array(await response.arrayBuffer());
          }
        } catch (e) {
          console.warn(`[Assembler] URL fetch error for ${cs.document_title}: ${e.message}`);
        }
      }
      if (csBytes && csBytes.length > 0) {
        const pages = cs.page_count || 1;
        tocSections.push({ title: `${cs.manufacturer_name}: ${cs.document_title}`, pageNumber: currentPage, type: "cut_sheet" });
        currentPage += pages;
        cutSheetPdfs.push(csBytes);
        result.sections.push({ type: "cut_sheet", title: cs.document_title, manufacturer: cs.manufacturer_name, pages });
      } else {
        result.errors.push(`Could not fetch ${cs.document_title} (no stored copy)`);
      }
    }
    // Source appendix: the pages of the uploaded PDF that rows were read from
    // (every door row cites one of them), not the whole upload - a 537-page
    // project manual with one hardware page read made a 542-page package.
    let scheduleBytes = null;
    if (session.file_buffer_key && !String(session.file_buffer_key).startsWith("demo-clone/")) {
      try {
        const scheduleObj = await env2.UPLOADS.get(session.file_buffer_key);
        if (scheduleObj) {
          scheduleBytes = new Uint8Array(await scheduleObj.arrayBuffer());
          const readPages = await env2.DB.prepare(`
            SELECT page_number FROM hardware_page_extractions WHERE session_id = ?
            UNION SELECT page_number FROM door_schedule_entries WHERE session_id = ?
          `).bind(sessionId, sessionId).all();
          const wanted = [...new Set((readPages.results || []).map((r) => parseInt(r.page_number, 10)).filter((n) => n >= 1))].sort((a, b) => a - b);
          let pageLabel = `${session.total_pages} page${session.total_pages === 1 ? "" : "s"}`;
          let pageCount = session.total_pages || 1;
          if (wanted.length && wanted.length < (session.total_pages || 0)) {
            const src = await PDFLib.PDFDocument.load(scheduleBytes, { ignoreEncryption: true });
            const indices = wanted.filter((n) => n <= src.getPageCount()).map((n) => n - 1);
            if (indices.length) {
              const sub = await PDFLib.PDFDocument.create();
              const copied = await sub.copyPages(src, indices);
              copied.forEach((p) => sub.addPage(p));
              scheduleBytes = await sub.save();
              pageCount = indices.length;
              pageLabel = `page${indices.length === 1 ? "" : "s"} ${indices.map((i) => i + 1).join(", ")} of ${session.total_pages}`;
            }
          }
          tocSections.push({ title: `Source: ${session.filename || "uploaded schedule"} (${pageLabel})`, pageNumber: currentPage, type: "schedule" });
          currentPage += pageCount;
          result.sections.push({ type: "schedule", title: "Uploaded schedule (source)", pages: pageCount });
        }
      } catch (e) {
        result.errors.push(`Failed to fetch schedule PDF: ${e.message}`);
      }
    }
    console.log("[Assembler] Generating table of contents...");
    const tocBytes = await generateTableOfContents(tocSections, PDFLib);
    result.sections.splice(1, 0, { type: "toc", title: "Table of Contents", pages: 1 });
    console.log("[Assembler] Merging all PDFs...");
    const pdfParts = [coverBytes, tocBytes];
    if (doorSection) pdfParts.push(doorSection.bytes);
    pdfParts.push(...hardwareSetPdfs);
    pdfParts.push(...cutSheetPdfs);
    if (scheduleBytes) pdfParts.push(scheduleBytes);
    const finalPdf = await mergePdfs(pdfParts, PDFLib);
    const { PDFDocument: PDFDocument3 } = PDFLib;
    const finalDoc = await PDFDocument3.load(finalPdf);
    result.totalPages = finalDoc.getPageCount();
    result.pdfBytes = finalPdf;
    result.doorCount = doorRows.length;
    result.hardwareSetCount = hardwareSets.length;
    result.cutSheetCount = cutSheetPdfs.length;
    result.success = true;
    console.log(`[Assembler] Assembly complete: ${result.totalPages} pages, ${result.sections.length} sections`);
    if (options.saveToR2 !== false) {
      const outputKey = `submittals/${sessionId}/final_submittal.pdf`;
      await env2.UPLOADS.put(outputKey, finalPdf, {
        httpMetadata: { contentType: "application/pdf" },
        customMetadata: {
          sessionId,
          assembledAt: (/* @__PURE__ */ new Date()).toISOString(),
          totalPages: String(result.totalPages),
          doors: String(doorRows.length),
          hardwareSets: String(hardwareSets.length),
          cutSheets: String(cutSheetPdfs.length)
        }
      });
      result.r2Key = outputKey;
      console.log(`[Assembler] Saved to R2: ${outputKey}`);
    }
    return result;
  } catch (error4) {
    console.error(`[Assembler] Assembly failed: ${error4.message}`);
    result.errors.push(error4.message);
    return result;
  }
}
export async function getAssemblyStatus(sessionId, env2) {
  try {
    const outputKey = `submittals/${sessionId}/final_submittal.pdf`;
    const existing = await env2.UPLOADS.head(outputKey);
    if (existing) {
      return {
        status: "assembled",
        r2Key: outputKey,
        assembledAt: existing.customMetadata?.assembledAt,
        totalPages: parseInt(existing.customMetadata?.totalPages) || 0,
        fileSize: existing.size
      };
    }
    const session = await env2.DB.prepare(`
      SELECT status, total_pages, total_components_extracted
      FROM hardware_extraction_sessions WHERE id = ?
    `).bind(sessionId).first();
    if (!session) {
      return { status: "not_found" };
    }
    const matches = await env2.DB.prepare(`
      SELECT COUNT(*) as count FROM session_cut_sheet_matches WHERE session_id = ?
    `).bind(sessionId).first();
    return {
      status: "pending",
      sessionStatus: session.status,
      totalPages: session.total_pages,
      componentsExtracted: session.total_components_extracted,
      cutSheetsMatched: matches?.count || 0
    };
  } catch (e) {
    return { status: "error", error: e.message };
  }
}
