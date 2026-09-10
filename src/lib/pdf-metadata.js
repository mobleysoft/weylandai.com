export function skip(b, i) {
  while (i < b.length) {
    if (WS.has(b[i])) {
      i++;
      continue;
    }
    if (b[i] === 37) {
      while (i < b.length && b[i] !== 10 && b[i] !== 13)
        i++;
      continue;
    }
    break;
  }
  return i;
}
export function findStr(b, s, from2, backward) {
  const t = new TextEncoder().encode(s);
  if (backward) {
    for (let i = Math.min(from2, b.length - t.length); i >= 0; i--) {
      let ok = true;
      for (let j = 0; j < t.length; j++) {
        if (b[i + j] !== t[j]) {
          ok = false;
          break;
        }
      }
      if (ok)
        return i;
    }
    return -1;
  }
  for (let i = from2; i <= b.length - t.length; i++) {
    let ok = true;
    for (let j = 0; j < t.length; j++) {
      if (b[i + j] !== t[j]) {
        ok = false;
        break;
      }
    }
    if (ok)
      return i;
  }
  return -1;
}
export function decodeStr(raw) {
  if (!(raw instanceof Uint8Array))
    return String(raw || "");
  if (raw.length >= 2 && raw[0] === 254 && raw[1] === 255)
    return new TextDecoder("utf-16be").decode(raw.subarray(2));
  if (raw.length >= 3 && raw[0] === 239 && raw[1] === 187 && raw[2] === 191)
    return new TextDecoder("utf-8").decode(raw.subarray(3));
  return new TextDecoder("latin1").decode(raw);
}
export async function inflate(data) {
  for (const fmt of ["deflate", "deflate-raw"]) {
    try {
      const ds = new DecompressionStream(fmt);
      const w = ds.writable.getWriter();
      w.write(data);
      w.close();
      const r = ds.readable.getReader();
      const chunks = [];
      let total = 0;
      while (true) {
        const { done, value } = await r.read();
        if (done)
          break;
        chunks.push(value);
        total += value.length;
      }
      const out = new Uint8Array(total);
      let off2 = 0;
      for (const c of chunks) {
        out.set(c, off2);
        off2 += c.length;
      }
      return out;
    } catch (_) {
    }
  }
  return null;
}
export function unpredict(data, columns) {
  const rowLen = columns + 1;
  const rows = Math.floor(data.length / rowLen);
  if (rows === 0)
    return data;
  const out = new Uint8Array(rows * columns);
  for (let r = 0; r < rows; r++) {
    const ptype = data[r * rowLen];
    for (let c = 0; c < columns; c++) {
      const raw = data[r * rowLen + 1 + c];
      const left = c > 0 ? out[r * columns + c - 1] : 0;
      const up = r > 0 ? out[(r - 1) * columns + c] : 0;
      switch (ptype) {
        case 0:
          out[r * columns + c] = raw;
          break;
        case 1:
          out[r * columns + c] = raw + left & 255;
          break;
        case 2:
          out[r * columns + c] = raw + up & 255;
          break;
        case 3:
          out[r * columns + c] = raw + (left + up >> 1) & 255;
          break;
        default:
          out[r * columns + c] = raw;
      }
    }
  }
  return out;
}
export function pv(b, i) {
  i = skip(b, i);
  if (i >= b.length)
    return { v: null, i };
  const c = b[i];
  if (c === 60 && i + 1 < b.length && b[i + 1] === 60)
    return pvDict(b, i + 2);
  if (c === 60)
    return pvHex(b, i + 1);
  if (c === 91)
    return pvArr(b, i + 1);
  if (c === 40)
    return pvLitStr(b, i + 1);
  if (c === 47)
    return pvName(b, i + 1);
  if (c >= 48 && c <= 57 || c === 45 || c === 43 || c === 46)
    return pvNumRef(b, i);
  if (c === 116 && b[i + 1] === 114 && b[i + 2] === 117 && b[i + 3] === 101)
    return { v: true, i: i + 4 };
  if (c === 102 && b[i + 1] === 97 && b[i + 2] === 108 && b[i + 3] === 115 && b[i + 4] === 101)
    return { v: false, i: i + 5 };
  if (c === 110 && b[i + 1] === 117 && b[i + 2] === 108 && b[i + 3] === 108)
    return { v: null, i: i + 4 };
  return { v: null, i: i + 1 };
}
export function pvDict(b, i) {
  const d = {};
  while (i < b.length) {
    i = skip(b, i);
    if (i >= b.length)
      break;
    if (b[i] === 62 && i + 1 < b.length && b[i + 1] === 62)
      return { v: d, i: i + 2 };
    if (b[i] !== 47) {
      i++;
      continue;
    }
    const k = pvName(b, i + 1);
    i = k.i;
    const val = pv(b, i);
    d[k.v] = val.v;
    i = val.i;
  }
  return { v: d, i };
}
export function pvArr(b, i) {
  const a = [];
  while (i < b.length) {
    i = skip(b, i);
    if (i >= b.length)
      break;
    if (b[i] === 93)
      return { v: a, i: i + 1 };
    const r = pv(b, i);
    a.push(r.v);
    i = r.i;
  }
  return { v: a, i };
}
export function pvName(b, i) {
  let n = "";
  while (i < b.length) {
    const c = b[i];
    if (WS.has(c) || DL.has(c))
      break;
    if (c === 35 && i + 2 < b.length) {
      n += String.fromCharCode(parseInt(String.fromCharCode(b[i + 1], b[i + 2]), 16));
      i += 3;
    } else {
      n += String.fromCharCode(c);
      i++;
    }
  }
  return { v: n, i };
}
export function pvLitStr(b, i) {
  const out = [];
  let depth = 1;
  while (i < b.length && depth > 0) {
    const c = b[i];
    if (c === 40) {
      depth++;
      out.push(c);
      i++;
    } else if (c === 41) {
      depth--;
      if (depth > 0)
        out.push(c);
      i++;
    } else if (c === 92) {
      i++;
      if (i >= b.length)
        break;
      const e = b[i];
      if (e === 110) {
        out.push(10);
        i++;
      } else if (e === 114) {
        out.push(13);
        i++;
      } else if (e === 116) {
        out.push(9);
        i++;
      } else if (e === 98) {
        out.push(8);
        i++;
      } else if (e === 102) {
        out.push(12);
        i++;
      } else if (e >= 48 && e <= 55) {
        let oct = String.fromCharCode(e);
        i++;
        if (i < b.length && b[i] >= 48 && b[i] <= 55) {
          oct += String.fromCharCode(b[i]);
          i++;
        }
        if (i < b.length && b[i] >= 48 && b[i] <= 55) {
          oct += String.fromCharCode(b[i]);
          i++;
        }
        out.push(parseInt(oct, 8));
      } else {
        out.push(e);
        i++;
      }
    } else {
      out.push(c);
      i++;
    }
  }
  return { v: new Uint8Array(out), i };
}
export function pvHex(b, i) {
  let hex = "";
  while (i < b.length && b[i] !== 62) {
    if (!WS.has(b[i]))
      hex += String.fromCharCode(b[i]);
    i++;
  }
  if (hex.length % 2 !== 0)
    hex += "0";
  const out = new Uint8Array(hex.length / 2);
  for (let j = 0; j < out.length; j++)
    out[j] = parseInt(hex.substr(j * 2, 2), 16);
  return { v: out, i: i + 1 };
}
export function pvNumRef(b, i) {
  let s = "";
  const start = i;
  while (i < b.length) {
    const c = b[i];
    if (c >= 48 && c <= 57 || c === 45 || c === 43 || c === 46) {
      s += String.fromCharCode(c);
      i++;
    } else
      break;
  }
  const num = s.includes(".") ? parseFloat(s) : parseInt(s, 10);
  const saved = i;
  const ws1 = skip(b, i);
  let gen = "";
  let gi = ws1;
  while (gi < b.length && b[gi] >= 48 && b[gi] <= 57) {
    gen += String.fromCharCode(b[gi]);
    gi++;
  }
  if (gen.length > 0) {
    const ws2 = skip(b, gi);
    if (ws2 < b.length && b[ws2] === 82) {
      const after = ws2 + 1;
      if (after >= b.length || WS.has(b[after]) || DL.has(b[after])) {
        return { v: { _ref: true, num, gen: parseInt(gen, 10) }, i: after };
      }
    }
  }
  return { v: num, i: saved };
}
export function readObjAt(b, off2) {
  let i = off2;
  while (i < b.length && b[i] >= 48 && b[i] <= 57)
    i++;
  i = skip(b, i);
  while (i < b.length && b[i] >= 48 && b[i] <= 57)
    i++;
  i = skip(b, i);
  if (b[i] === 111)
    i += 3;
  i = skip(b, i);
  return pv(b, i);
}
export function readStream(b, afterDict, dict, xref) {
  let i = skip(b, afterDict);
  if (i + 6 > b.length || b[i] !== 115 || b[i + 1] !== 116 || b[i + 2] !== 114 || b[i + 3] !== 101 || b[i + 4] !== 97 || b[i + 5] !== 109)
    return null;
  i += 6;
  if (b[i] === 13)
    i++;
  if (b[i] === 10)
    i++;
  let len = dict.Length;
  if (len && len._ref && xref) {
    const entry = xref.get(len.num);
    if (entry && entry.type === 1) {
      const r = readObjAt(b, entry.offset);
      if (typeof r.v === "number")
        len = r.v;
    }
  }
  if (typeof len === "number" && len > 0)
    return b.subarray(i, i + len);
  const end = findStr(b, "endstream", i, false);
  if (end === -1)
    return null;
  let e = end;
  while (e > i && (b[e - 1] === 10 || b[e - 1] === 13))
    e--;
  return b.subarray(i, e);
}
export function findStartXref(b) {
  const searchFrom = Math.max(0, b.length - 1024);
  const pos = findStr(b, "startxref", b.length - 1, true);
  if (pos === -1)
    return -1;
  let i = pos + 9;
  i = skip(b, i);
  let num = "";
  while (i < b.length && b[i] >= 48 && b[i] <= 57) {
    num += String.fromCharCode(b[i]);
    i++;
  }
  return parseInt(num, 10) || -1;
}
export function parseClassicXref(b, off2) {
  const entries = /* @__PURE__ */ new Map();
  let i = off2 + 4;
  i = skip(b, i);
  while (i < b.length) {
    i = skip(b, i);
    if (b[i] === 116)
      break;
    let startStr = "";
    while (i < b.length && b[i] >= 48 && b[i] <= 57) {
      startStr += String.fromCharCode(b[i]);
      i++;
    }
    i = skip(b, i);
    let countStr = "";
    while (i < b.length && b[i] >= 48 && b[i] <= 57) {
      countStr += String.fromCharCode(b[i]);
      i++;
    }
    i = skip(b, i);
    const startObj = parseInt(startStr, 10);
    const count3 = parseInt(countStr, 10);
    for (let n = 0; n < count3; n++) {
      const offsetStr = new TextDecoder("latin1").decode(b.subarray(i, i + 10));
      const genStr = new TextDecoder("latin1").decode(b.subarray(i + 11, i + 16));
      const flag3 = String.fromCharCode(b[i + 17]);
      i += 20;
      if (flag3 === "n") {
        entries.set(startObj + n, { type: 1, offset: parseInt(offsetStr, 10), gen: parseInt(genStr, 10) });
      }
    }
  }
  const tPos = findStr(b, "trailer", off2, false);
  let trailer = {};
  if (tPos !== -1) {
    let ti = tPos + 7;
    ti = skip(b, ti);
    const r = pv(b, ti);
    trailer = r.v || {};
  }
  return { entries, trailer };
}
export async function parseXrefStream(b, off2) {
  const { v: dict, i: afterDict } = readObjAt(b, off2);
  if (!dict || dict.Type !== "XRef")
    return null;
  const streamData = readStream(b, afterDict, dict, null);
  if (!streamData)
    return null;
  let data = await inflate(streamData);
  if (!data)
    return null;
  const dp = dict.DecodeParms || dict.DP;
  if (dp && dp.Predictor && dp.Predictor >= 10) {
    const columns = dp.Columns || (dict.W ? dict.W.reduce((a, b2) => a + b2, 0) : 0);
    if (columns > 0)
      data = unpredict(data, columns);
  }
  const W = dict.W || [1, 2, 1];
  const size = dict.Size || 0;
  const index = dict.Index || [0, size];
  const entries = /* @__PURE__ */ new Map();
  const rowLen = W[0] + W[1] + W[2];
  let dataPos = 0;
  for (let s = 0; s < index.length; s += 2) {
    const startObj = index[s];
    const count3 = index[s + 1];
    for (let n = 0; n < count3; n++) {
      if (dataPos + rowLen > data.length)
        break;
      let type = 0, f2 = 0, f3 = 0;
      let p = dataPos;
      for (let w = 0; w < W[0]; w++) {
        type = type << 8 | data[p++];
      }
      for (let w = 0; w < W[1]; w++) {
        f2 = f2 << 8 | data[p++];
      }
      for (let w = 0; w < W[2]; w++) {
        f3 = f3 << 8 | data[p++];
      }
      if (W[0] === 0)
        type = 1;
      if (type === 1) {
        entries.set(startObj + n, { type: 1, offset: f2, gen: f3 });
      } else if (type === 2) {
        entries.set(startObj + n, { type: 2, stmNum: f2, idx: f3 });
      }
      dataPos += rowLen;
    }
  }
  const trailer = { ...dict };
  return { entries, trailer };
}
export async function buildXrefMap(b) {
  const startOff = findStartXref(b);
  if (startOff < 0)
    return null;
  const allEntries = /* @__PURE__ */ new Map();
  let trailer = {};
  let off2 = startOff;
  for (let depth = 0; depth < 10 && off2 >= 0; depth++) {
    let result;
    const peek = skip(b, off2);
    if (b[peek] === 120) {
      result = parseClassicXref(b, peek);
    } else {
      result = await parseXrefStream(b, off2);
    }
    if (!result)
      break;
    for (const [num, entry] of result.entries) {
      if (!allEntries.has(num))
        allEntries.set(num, entry);
    }
    if (depth === 0)
      trailer = result.trailer;
    const prev = result.trailer?.Prev;
    off2 = typeof prev === "number" && prev >= 0 ? prev : -1;
  }
  return { xref: allEntries, trailer };
}
export async function resolve(val, b, xref) {
  if (!val || !val._ref)
    return val;
  return await resolveRef(val.num, b, xref);
}
export async function resolveRef(num, b, xref) {
  const entry = xref.get(num);
  if (!entry)
    return null;
  if (entry.type === 1) {
    const { v } = readObjAt(b, entry.offset);
    return v;
  }
  if (entry.type === 2) {
    return await readFromObjStm(b, xref, entry.stmNum, entry.idx);
  }
  return null;
}
export async function readFromObjStm(b, xref, stmNum, idx) {
  const stmEntry = xref.get(stmNum);
  if (!stmEntry || stmEntry.type !== 1)
    return null;
  const { v: stmDict, i: afterDict } = readObjAt(b, stmEntry.offset);
  if (!stmDict || stmDict.Type !== "ObjStm")
    return null;
  const streamData = readStream(b, afterDict, stmDict, xref);
  if (!streamData)
    return null;
  const inflated = await inflate(streamData);
  if (!inflated)
    return null;
  const n = stmDict.N || 0;
  const first2 = stmDict.First || 0;
  if (idx >= n)
    return null;
  const hdr = new TextDecoder("latin1").decode(inflated.subarray(0, first2));
  const parts = hdr.trim().split(/\s+/).map(Number);
  const objOff = first2 + parts[idx * 2 + 1];
  const { v } = pv(inflated, objOff);
  return v;
}
export async function getPageCount(b, xref, trailer) {
  const catalog = await resolve(trailer.Root, b, xref);
  if (!catalog)
    return 1;
  const pages = await resolve(catalog.Pages, b, xref);
  if (!pages)
    return 1;
  return typeof pages.Count === "number" ? pages.Count : 1;
}
export async function buildPageList(b, xref, pagesRef) {
  const pages = [];
  async function walk(ref) {
    const node = await resolve(ref, b, xref);
    if (!node)
      return;
    if (node.Type === "Page") {
      pages.push(ref);
    } else if (node.Type === "Pages" && Array.isArray(node.Kids)) {
      for (const kidRef of node.Kids) {
        await walk(kidRef);
      }
    }
  }
  await walk(pagesRef);
  return pages;
}
export function refMatch(a, b) {
  return a && b && a._ref && b._ref && a.num === b.num && a.gen === b.gen;
}
export async function getBookmarks(b, xref, catalog, pageList) {
  if (!catalog.Outlines)
    return null;
  const outlines = await resolve(catalog.Outlines, b, xref);
  if (!outlines || !outlines.First)
    return null;
  console.log(`[pdf-metadata] pageList has ${pageList.length} entries for ref matching`);
  const MAX_DEPTH2 = 6;
  const MAX_ENTRIES = 500;
  const results = [];
  let resolvedCount = 0;
  async function walkItems(ref, level) {
    if (results.length >= MAX_ENTRIES || level > MAX_DEPTH2)
      return;
    let current = ref;
    while (current && results.length < MAX_ENTRIES) {
      const item = await resolve(current, b, xref);
      if (!item)
        break;
      const title2 = item.Title ? decodeStr(item.Title) : "";
      let pageNumber = null;
      let dest = item.Dest;
      if (!dest && item.A) {
        let action = item.A;
        if (action._ref)
          action = await resolve(action, b, xref);
        if (action && action.S === "GoTo" && action.D) {
          dest = action.D;
        }
      }
      if (dest && Array.isArray(dest) && dest[0]) {
        const pageRef = dest[0];
        if (pageRef && pageRef._ref) {
          for (let p = 0; p < pageList.length; p++) {
            if (refMatch(pageRef, pageList[p])) {
              pageNumber = p + 1;
              break;
            }
          }
        }
      }
      if (pageNumber !== null)
        resolvedCount++;
      results.push({ level, title: title2.trim(), page: pageNumber });
      if (item.First && level < MAX_DEPTH2) {
        await walkItems(item.First, level + 1);
      }
      current = item.Next || null;
    }
  }
  await walkItems(outlines.First, 0);
  console.log(`[pdf-metadata] Bookmarks: ${results.length} total, ${resolvedCount} with page numbers`);
  if (results.length > 0 && resolvedCount === 0) {
    const first2 = await resolve(outlines.First, b, xref);
    if (first2) {
      const hasD = !!first2.Dest;
      const hasA = !!first2.A;
      const destType = first2.Dest ? Array.isArray(first2.Dest) ? "array" : typeof first2.Dest : "none";
      console.log(`[pdf-metadata] First bookmark: Dest=${hasD}(${destType}), A=${hasA}`);
      if (first2.A) {
        let action = first2.A;
        if (action._ref)
          action = await resolve(action, b, xref);
        console.log(`[pdf-metadata] First action: S=${action?.S}, D=${Array.isArray(action?.D) ? "array[" + action.D.length + "]" : typeof action?.D}`);
      }
    }
  }
  return results.length > 0 ? results : null;
}
export async function checkPageText(b, xref, pageRef) {
  const page = await resolve(pageRef, b, xref);
  if (!page || !page.Contents)
    return 0;
  let contents = page.Contents;
  if (!Array.isArray(contents))
    contents = [contents];
  let count3 = 0;
  for (const ref of contents) {
    const entry = ref._ref ? xref.get(ref.num) : null;
    if (!entry || entry.type !== 1)
      continue;
    const { v: stmDict, i: afterDict } = readObjAt(b, entry.offset);
    if (!stmDict)
      continue;
    let streamData = readStream(b, afterDict, stmDict, xref);
    if (!streamData)
      continue;
    const filter2 = stmDict.Filter;
    if (filter2 === "FlateDecode" || Array.isArray(filter2) && filter2.includes("FlateDecode")) {
      const inflated = await inflate(streamData);
      if (inflated)
        streamData = inflated;
      else
        continue;
    }
    const text = new TextDecoder("latin1").decode(streamData);
    for (const op of TEXT_OPS) {
      const re = new RegExp("(?:^|\\s)" + op.replace(/['"]/g, "\\$&") + "(?:\\s|$)", "g");
      const matches = text.match(re);
      if (matches)
        count3 += matches.length;
    }
  }
  return count3;
}
export async function extractPdfBookmarks(pdfBuffer) {
  try {
    const b = new Uint8Array(pdfBuffer);
    const result = await buildXrefMap(b);
    if (!result) {
      console.warn("[pdf-metadata] Could not parse xref \u2014 falling back to 1 page");
      return { bookmarks: null, numPages: 1 };
    }
    const { xref, trailer } = result;
    const numPages = await getPageCount(b, xref, trailer);
    console.log(`[pdf-metadata] numPages: ${numPages}`);
    const catalog = await resolve(trailer.Root, b, xref);
    if (!catalog)
      return { bookmarks: null, numPages };
    let bookmarks = null;
    if (catalog.Outlines) {
      const pageList = await buildPageList(b, xref, catalog.Pages);
      bookmarks = await getBookmarks(b, xref, catalog, pageList);
      if (bookmarks) {
        console.log(`[pdf-metadata] Extracted ${bookmarks.length} bookmark entries`);
      }
    }
    return { bookmarks, numPages };
  } catch (error4) {
    console.error(`[pdf-metadata] extractPdfBookmarks failed: ${error4.message}`);
    return { bookmarks: null, numPages: 1 };
  }
}
export async function detectTextLayer(pdfBuffer) {
  const startTime = Date.now();
  try {
    const b = new Uint8Array(pdfBuffer);
    const result = await buildXrefMap(b);
    if (!result) {
      return {
        hasTextLayer: false,
        textItemCount: 0,
        route: "vision-primary",
        sampledPages: 0,
        avgItemsPerPage: 0,
        totalPages: 0,
        detectionTimeMs: Date.now() - startTime,
        error: "xref parse failed"
      };
    }
    const { xref, trailer } = result;
    const numPages = await getPageCount(b, xref, trailer);
    const catalog = await resolve(trailer.Root, b, xref);
    if (!catalog)
      throw new Error("No catalog");
    const pageList = await buildPageList(b, xref, catalog.Pages);
    const pagesToSample = Math.min(3, pageList.length);
    let totalOps = 0;
    for (let p = 0; p < pagesToSample; p++) {
      const count3 = await checkPageText(b, xref, pageList[p]);
      totalOps += count3;
      console.log(`[pdf-metadata] Page ${p + 1}: ${count3} text operators`);
    }
    const hasTextLayer = totalOps >= 50;
    const avgItemsPerPage = pagesToSample > 0 ? Math.round(totalOps / pagesToSample) : 0;
    const route = hasTextLayer ? "text-extractable" : "vision-primary";
    const elapsed = Date.now() - startTime;
    console.log(`[pdf-metadata] Text detection: ${route} (${totalOps} ops, ${elapsed}ms)`);
    return {
      hasTextLayer,
      textItemCount: totalOps,
      route,
      sampledPages: pagesToSample,
      avgItemsPerPage,
      totalPages: numPages,
      detectionTimeMs: elapsed
    };
  } catch (error4) {
    console.error(`[pdf-metadata] detectTextLayer failed: ${error4.message}`);
    return {
      hasTextLayer: false,
      textItemCount: 0,
      route: "vision-primary",
      sampledPages: 0,
      avgItemsPerPage: 0,
      totalPages: 0,
      detectionTimeMs: Date.now() - startTime,
      error: error4.message
    };
  }
}
export var WS = /* @__PURE__ */ new Set([0, 9, 10, 12, 13, 32]);
export var DL = /* @__PURE__ */ new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);
export var TEXT_OPS = ["BT", "Tj", "TJ", "Tf", "'", '"'];
