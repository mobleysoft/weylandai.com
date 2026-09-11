// src/lib/sovereign-pdf.js
//
// Step 3 of the vendored-library sovereignty plan (MONOLITH_HELPER_MAP.md
// section 3): a real, spec-compliant PDF *writer* replacing the slice of
// pdf-lib's API that src/lib/submittal-assembler.js actually calls -
// PDFDocument.create/addPage/embedFont(Helvetica|HelveticaBold)/save,
// page.drawText/drawRectangle/drawLine/getSize, font.widthOfTextAtSize,
// and rgb() - confirmed by grep against every real call site in that file
// before writing a line of this, not guessed from pdf-lib's full surface.
//
// Scope, honestly stated: this covers PDFDocument.create()/save() (the
// generation path - cover page, table of contents, hardware schedule
// pages, all built with drawText/drawRectangle/drawLine). It does NOT
// implement PDFDocument.load()/copyPages() (the merge path used by
// mergePdfs() to combine already-produced PDFs, including real cut-sheet
// documents). Reading an arbitrary existing PDF back is a materially
// different, parser-shaped problem - not done here, not silently assumed
// solved. submittal-assembler.js is not yet wired to this module for that
// reason; wiring it requires either finishing the load/copyPages half or
// keeping pdf-lib in the loop for that one function. See
// MONOLITH_HELPER_MAP.md section 3, step 3 for current status.
//
// PDF structure produced: no cross-reference streams, no object streams,
// no compression on any object (content streams are written as plain,
// unfiltered byte streams - fully spec-legal per PDF 1.7 7.4, just larger
// on disk, same "correctness first" tradeoff sovereign-deflate.js made
// for the same reason). A conventional PDF 1.7 file: header, indirect
// objects, a classic xref table, and a trailer with /Root - the same
// shape every PDF reader written since 1993 already knows how to parse.

// Adobe Core 14 AFM metrics for Helvetica / Helvetica-Bold (WinAnsiEncoding
// code points 32-126 and the common Latin-1 extended punctuation pdf-lib
// itself ships as public, non-proprietary data in @pdf-lib/standard-fonts -
// reproduced directly here per the plan's own scoping note that this data
// is "public AFM-derived data, not proprietary - trivial to reproduce
// directly"). Units are 1/1000 em, standard AFM convention.
const HELVETICA_WIDTHS = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278,
  103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833,
  110: 556, 111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278,
  117: 556, 118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334,
  124: 260, 125: 334, 126: 584
};
const HELVETICA_BOLD_WIDTHS = {
  32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584, 62: 584, 63: 611,
  64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 333, 92: 278, 93: 333, 94: 584, 95: 556,
  96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556, 102: 333,
  103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889,
  110: 611, 111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333,
  117: 611, 118: 556, 119: 778, 120: 556, 121: 556, 122: 500, 123: 389,
  124: 280, 125: 389, 126: 584
};

export const StandardFonts = {
  Helvetica: "Helvetica",
  HelveticaBold: "Helvetica-Bold"
};

export function rgb(red, green, blue) {
  return { type: "RGB", red, green, blue };
}

function colorComponents(color) {
  if (!color) return null;
  const clamp = (v) => Math.max(0, Math.min(1, v)).toFixed(4);
  return [clamp(color.red), clamp(color.green), clamp(color.blue)];
}

// PDF literal string: backslash-escape \, (, ) and map each code point to a
// single WinAnsi/Latin-1 byte (code points >= 256 have no single-byte
// representation in this simple Type1 setup - replaced with '?' rather
// than silently corrupting the byte stream or throwing on real project
// names that happen to contain e.g. a smart quote or an em dash).
function pdfLiteralString(text) {
  let out = "";
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    if (code === 0x5c || code === 0x28 || code === 0x29) {
      out += "\\" + ch;
    } else if (code < 256) {
      out += ch;
    } else {
      out += "?";
    }
  }
  return out;
}

class SovereignPDFFont {
  constructor(baseFontName, widths, resourceName) {
    this.name = baseFontName;
    this._widths = widths;
    this.resourceName = resourceName;
  }
  widthOfTextAtSize(text, size) {
    let total = 0;
    for (const ch of String(text)) {
      const code = ch.codePointAt(0);
      const w = this._widths[code] !== undefined ? this._widths[code] : this._widths[32];
      total += w;
    }
    return (total * size) / 1000;
  }
}

class SovereignPDFPage {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this._ops = [];
  }
  getSize() {
    return { width: this.width, height: this.height };
  }
  drawText(text, { x = 0, y = 0, size = 12, font, color } = {}) {
    if (!font || !font.resourceName) {
      throw new Error("sovereign-pdf: drawText requires a font from doc.embedFont()");
    }
    const rgbc = colorComponents(color);
    let ops = "";
    if (rgbc) ops += `${rgbc[0]} ${rgbc[1]} ${rgbc[2]} rg\n`;
    ops += `BT /${font.resourceName} ${size} Tf ${x} ${y} Td (${pdfLiteralString(text)}) Tj ET\n`;
    this._ops.push(ops);
  }
  drawRectangle({ x = 0, y = 0, width = 0, height = 0, color, borderColor, borderWidth = 1 } = {}) {
    let ops = "";
    const fillc = colorComponents(color);
    if (fillc) {
      ops += `${fillc[0]} ${fillc[1]} ${fillc[2]} rg\n${x} ${y} ${width} ${height} re f\n`;
    }
    const borderc = colorComponents(borderColor);
    if (borderc) {
      ops += `${borderc[0]} ${borderc[1]} ${borderc[2]} RG\n${borderWidth} w\n${x} ${y} ${width} ${height} re S\n`;
    }
    if (!fillc && !borderc) {
      // pdf-lib defaults to a black fill when neither is given - match it.
      ops += `0 0 0 rg\n${x} ${y} ${width} ${height} re f\n`;
    }
    this._ops.push(ops);
  }
  drawLine({ start, end, thickness = 1, color } = {}) {
    const rgbc = colorComponents(color) || ["0.0000", "0.0000", "0.0000"];
    const ops = `${rgbc[0]} ${rgbc[1]} ${rgbc[2]} RG\n${thickness} w\n${start.x} ${start.y} m ${end.x} ${end.y} l S\n`;
    this._ops.push(ops);
  }
  _content() {
    return this._ops.join("");
  }
}

export class PDFDocument {
  constructor() {
    this.pages = [];
    this._fonts = new Map();
  }

  static async create() {
    return new PDFDocument();
  }

  addPage(size = [612, 792]) {
    const [w, h] = size;
    const page = new SovereignPDFPage(w, h);
    this.pages.push(page);
    return page;
  }

  async embedFont(baseFontName) {
    if (this._fonts.has(baseFontName)) return this._fonts.get(baseFontName);
    const widths = baseFontName === StandardFonts.HelveticaBold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
    const resourceName = `F${this._fonts.size + 1}`;
    const font = new SovereignPDFFont(baseFontName, widths, resourceName);
    this._fonts.set(baseFontName, font);
    return font;
  }

  getPageCount() {
    return this.pages.length;
  }

  // Serializes the whole document to a real PDF 1.7 byte stream: header,
  // one indirect object per font/page/content-stream, a Pages tree, a
  // Catalog, a classic (non-compressed) xref table, and a trailer.
  async save() {
    const enc = new TextEncoder();
    const chunks = [];
    let offset = 0;
    const push = (str) => {
      const bytes = enc.encode(str);
      chunks.push(bytes);
      offset += bytes.length;
    };

    const objOffsets = []; // index = object number - 1

    const beginObj = (num) => {
      objOffsets[num - 1] = offset;
      push(`${num} 0 obj\n`);
    };
    const endObj = () => push("endobj\n");

    push("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");

    const fonts = [...this._fonts.values()];
    const pageCount = this.pages.length;

    // Object numbering: 1 = Catalog, 2 = Pages tree, then for each page i
    // (0-based): (3 + i*2) = Page object, (4 + i*2) = its Content stream.
    // Font objects follow all pages.
    const pageObjNum = (i) => 3 + i * 2;
    const contentObjNum = (i) => 4 + i * 2;
    const fontObjNumBase = 3 + pageCount * 2; // object number of the FIRST font (fonts occupy [fontObjNumBase, fontObjNumBase + fonts.length - 1])
    const totalObjects = fontObjNumBase + fonts.length - 1;

    // 1: Catalog
    beginObj(1);
    push(`<< /Type /Catalog /Pages 2 0 R >>\n`);
    endObj();

    // 2: Pages tree
    beginObj(2);
    const kids = this.pages.map((_, i) => `${pageObjNum(i)} 0 R`).join(" ");
    push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\n`);
    endObj();

    const fontResourceDict = fonts.length
      ? `<< ${fonts.map((f, idx) => `/${f.resourceName} ${fontObjNumBase + idx} 0 R`).join(" ")} >>`
      : "<< >>";

    // Page + content-stream objects
    this.pages.forEach((page, i) => {
      beginObj(pageObjNum(i));
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] ` +
        `/Resources << /Font ${fontResourceDict} >> /Contents ${contentObjNum(i)} 0 R >>\n`
      );
      endObj();

      const content = page._content();
      const contentBytes = enc.encode(content);
      beginObj(contentObjNum(i));
      push(`<< /Length ${contentBytes.length} >>\nstream\n`);
      chunks.push(contentBytes);
      offset += contentBytes.length;
      push(`\nendstream\n`);
      endObj();
    });

    // Font objects
    fonts.forEach((font, i) => {
      beginObj(fontObjNumBase + i);
      push(
        `<< /Type /Font /Subtype /Type1 /BaseFont /${font.name} /Encoding /WinAnsiEncoding >>\n`
      );
      endObj();
    });

    // xref table
    const xrefOffset = offset;
    push(`xref\n0 ${totalObjects + 1}\n`);
    push(`0000000000 65535 f \n`);
    for (let i = 0; i < totalObjects; i++) {
      const off = objOffsets[i];
      push(`${String(off).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  }
}
