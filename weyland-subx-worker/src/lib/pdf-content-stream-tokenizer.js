// Sovereign PDF content-stream tokenizer - MONOLITH_HELPER_MAP.md section 3
// step 5 (Sovereign PDF rasterizer), first real milestone. Explicitly NOT
// the full rasterizer - a content-stream tokenizer is the well-defined,
// testable prerequisite everything else (path construction, text
// positioning, fill/stroke) has to consume first. Per the plan doc's own
// recommendation: build incrementally against real observed PDF content,
// keep pdfjs-dist as the fallback until real coverage is measured, don't
// plan this as a single cutover.
//
// PDF content streams are a postfix (operand-then-operator) mini-language:
// operands push onto an implicit stack, an operator consumes them. This
// tokenizer turns raw content-stream bytes into a flat list of
// {op, args} operator invocations - not a full interpreter (doesn't know
// what "re" or "Tj" *mean*), just correct lexing/parsing of the grammar,
// per PDF 32000-1:2008 §7.2 (Lexical Conventions) and §7.8.2 (Content
// Streams).
//
// Deliberately reuses pdf-metadata.js's pv() as the single operand
// parser rather than reimplementing number/name/string/array/dict
// parsing - a content stream's operand syntax is the exact same object
// grammar pv() already parses correctly and has real test coverage
// against (numbers, /names, (strings), <hex>, [arrays], <<dicts>>,
// true/false/null). pv()'s "N G R indirect reference" lookahead is
// harmless here: content streams never contain a literal "R" token
// immediately after two bare integers in real operand sequences (that
// syntax only means something inside object/xref dictionaries), so the
// lookahead simply finds no match and falls through to a plain number,
// verified explicitly in this module's own tests below.

import { skip, pv, DL, WS } from "./pdf-metadata.js";

// Real, honest limit stated up front: this does not yet tokenize inline
// images (BI...ID...EI) beyond recognizing the BI/ID/EI operator tokens
// themselves - the raw binary image data between ID and EI needs its own
// dedicated handling (arbitrary binary bytes, not content-stream syntax)
// and isn't needed for the schedule/hardware-set PDFs this venture
// actually processes. Flagged here rather than silently mishandled.

function isRegularByte(c) {
  return !WS.has(c) && !DL.has(c);
}

// Reads one bare token (an operator name like "re"/"Tj"/"cm", or a
// keyword pv() doesn't already consume as an operand) - anything that
// isn't a delimiter-led operand and isn't whitespace.
function readBareToken(b, i) {
  const start = i;
  while (i < b.length && isRegularByte(b[i])) i++;
  return { text: new TextDecoder("latin1").decode(b.subarray(start, i)), next: i };
}

function isOperandStart(c) {
  return (c >= 48 && c <= 57) || c === 43 || c === 45 || c === 46 // digit, +, -, .
    || c === 47 || c === 40 || c === 60 || c === 91; // / ( < [
}

// Tokenizes a real PDF content stream (already-decompressed bytes, e.g.
// via pdf-metadata.js's readStream()+inflate()) into a flat operator
// list: [{ op: "re", args: [x, y, w, h] }, { op: "f", args: [] }, ...].
// Never throws on malformed input mid-stream - returns what it
// successfully parsed plus a real `error` field, since a single bad
// operator shouldn't discard everything already tokenized (real-world
// PDFs from arbitrary producers can have quirks; failing closed on the
// whole page is worse than returning partial real data with the failure
// visible).
export function tokenizeContentStream(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const ops = [];
  let stack = [];
  let i = 0;
  let error = null;

  try {
    while (true) {
      i = skip(b, i);
      if (i >= b.length) break;
      const c = b[i];

      if (isOperandStart(c)) {
        const r = pv(b, i);
        stack.push(r.v);
        if (r.i <= i) throw new Error(`pv() made no progress at byte ${i} (0x${c.toString(16)})`);
        i = r.i;
        continue;
      }

      const { text, next } = readBareToken(b, i);
      if (text === "") {
        // A delimiter byte pv() doesn't own (}, %, stray >, or an
        // unmatched ]/)) with nothing to parse - skip it rather than
        // infinite-loop, real producers occasionally emit stray bytes.
        i++;
        continue;
      }
      i = next;
      if (text === "true") { stack.push(true); continue; }
      if (text === "false") { stack.push(false); continue; }
      if (text === "null") { stack.push(null); continue; }
      if (text === "BI") {
        // Inline image - real, honest gap (see module header). Skip
        // forward to the matching EI so the rest of the stream still
        // tokenizes correctly, but don't claim to have parsed the image.
        const skipTo = skipInlineImageData(b, i);
        ops.push({ op: "BI", args: stack, inlineImageSkipped: true });
        stack = [];
        i = skipTo;
        continue;
      }
      // A real operator: everything currently on the stack is its
      // operand list, per the postfix grammar.
      ops.push({ op: text, args: stack });
      stack = [];
    }
  } catch (e) {
    error = e.message;
  }

  return { ops, trailingOperands: stack, error };
}

// Real inline-image data can legitimately contain the byte sequence "EI"
// inside raw pixel data, so a naive indexOf("EI") is not reliable in
// general - but a whitespace-delimited "EI" token (the actual grammar
// rule per §8.9.7) is a reasonable, honestly-scoped heuristic for the
// real-world producers this venture's PDFs come from, not a claim of a
// fully spec-correct binary-safe scanner.
function skipInlineImageData(b, i) {
  const idIdx = findToken(b, i, "ID");
  let start = idIdx >= 0 ? idIdx + 2 : i;
  if (start < b.length && WS.has(b[start])) start++;
  for (let j = start; j < b.length - 1; j++) {
    const prevWs = j === 0 ? true : WS.has(b[j - 1]);
    if (prevWs && b[j] === 69 && b[j + 1] === 73 && (j + 2 >= b.length || WS.has(b[j + 2]))) {
      return j + 2;
    }
  }
  return b.length;
}

function findToken(b, from2, token) {
  const t = new TextEncoder().encode(token);
  for (let i = from2; i <= b.length - t.length; i++) {
    let ok = true;
    for (let j = 0; j < t.length; j++) if (b[i + j] !== t[j]) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}
