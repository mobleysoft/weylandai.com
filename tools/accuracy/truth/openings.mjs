// A schedule row is evidence for an opening, not necessarily another opening.
// Resolve cross-page repeats once, before truth agreement and plan placement.
// Never collapse two rows on the same page (g044), or infer identity from a mark alone.
import { titleBlocks, lines, inTitleRegion } from '../../../weyland-shared/plan-read.js';
import { N, ROW_FIELDS } from './agree.mjs';

export const OPENING_RULE = 'cross-page-inventory-v1';
const text = s => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
const mark = d => N.mark(d.mark);
const fields = [...ROW_FIELDS, 'frame_type', 'pair'];
const value = (d, f) => f === 'fire_rating' ? N.fire(d[f]) : N.text(d[f]);
const differs = (a, b) => fields.filter(f => value(a, f) !== value(b, f));

function pageEvidence(pages) {
  const blocks = titleBlocks(pages);
  return new Map(pages.map((p, i) => {
    const ls = lines(p.items), tb = blocks[i];
    // Damaged/overprinted sheet numbers can defeat titleBlocks. The explicit
    // title-block label SPECIFICATIONS / GENERAL NOTES still identifies an ancillary sheet.
    const ancillary = /\b(?:SPECIFICATIONS|GENERAL NOTES)\b/.test(text(tb.title)) ||
      p.items.some(it => inTitleRegion(p, it) && /^(?:SPECIFICATIONS|GENERAL NOTES)$/.test(text(it.str)));
    const dedicated = /\bDOOR(?: AND FRAME)? SCHEDULE\b/.test(text(tb.title));
    const heading = ls.some(l => /^(?:DOOR(?: AND FRAME)?|HARDWARE|FINISH) SCHEDULE\b/.test(text(l.str)));
    // Explicit scope labels, not arbitrary mentions in notes or references.
    const labels = [tb.title, ...ls.map(l => l.str).filter(s => /^(?:BUILDING|BLDG\.?|LEVEL|FLOOR)\s+[A-Z0-9-]+(?:\s*[-:]?\s*(?:DOOR.*SCHEDULE|PLAN))?$/i.test(s.trim()))];
    const scope = {};
    for (const [key, re] of [
      ['building', /\b(?:BUILDING|BLDG\.?)\s+([A-Z]|\d+[A-Z]?|[A-Z]-\d+|NORTH|SOUTH|EAST|WEST)\b/g],
      ['level', /\b(?:LEVEL|FLOOR)\s+([A-Z]|\d+[A-Z]?|BASEMENT|GROUND|ROOF|MEZZANINE)\b/g],
      ['floor', /\b(FIRST|SECOND|THIRD|FOURTH|BASEMENT|GROUND|\d+(?:ST|ND|RD|TH))\s+FLOOR\b/g],
    ]) {
      const values = [...new Set(labels.flatMap(s => [...text(s).matchAll(re)].map(m => m[1])))].sort();
      if (values.length) scope[key] = values.join(',');
    }
    // "FIRST FLOOR" and "LEVEL 1" are the same scope vocabulary.
    if (scope.floor) {
      const ordinals = { FIRST: '1', SECOND: '2', THIRD: '3', FOURTH: '4' };
      scope.level = scope.floor.split(',').map(v => ordinals[v] || v.replace(/(ST|ND|RD|TH)$/, '')).join(',');
      delete scope.floor;
    }
    // A combined bid set can contain several sites with the very same sheet and
    // door numbers. Read site names/addresses from the title block, including
    // rotated text. An owner/district name alone is not a site identity.
    const titleText = lines(p.items.filter(it => inTitleRegion(p, it))).map(l => text(l.str));
    const sites = titleText.filter(s => /\b(?:SCHOOL|HOSPITAL|LIBRARY|CAMPUS)\s*$/.test(s));
    const addresses = titleText.filter(s => /^\d+\s+.+\b(?:STREET|ST\.?|ROAD|RD\.?|WAY|DRIVE|DR\.?|AVENUE|AVE\.?|LANE|LN\.?|BOULEVARD|BLVD\.?)\b/.test(s));
    if (sites.length) scope.site = [...new Set(sites)].sort().join('; ');
    if (addresses.length) scope.address = [...new Set(addresses)].sort().join('; ');
    return [p.page, { page: p.page, title: tb.title || (ancillary ? 'SPECIFICATIONS / GENERAL NOTES' : null),
      rank: ancillary ? 0 : dedicated ? 3 : heading ? 2 : 1, scope }];
  }));
}
const differentScope = (a, b) => Object.keys(a || {}).some(k => b?.[k] && a[k] !== b[k]);
const rowScope = d => Object.fromEntries(['building', 'level', 'floor'].filter(k => d[k] != null).map(k => [k, text(d[k])]));

/** Resolve each reader independently using the same page-text evidence and rule.
 * No reader supplies the other's fields, rows, or inventory-overlap decision. */
export function resolveScheduleOpenings(doorsA, doorsB, pages) {
  const info = pageEvidence(pages);
  const pairKey = (a, b) => [a, b].sort((x, y) => x - y).join('|');
  function inventoryEvidence(rows) {
    const inventories = new Map();
    for (const d of rows) {
      if (!inventories.has(d.page)) inventories.set(d.page, new Set());
      inventories.get(d.page).add(mark(d));
    }
    const pageNumbers = [...inventories.keys()].sort((a, b) => a - b), pairs = [];
    const repeated = new Set();
    for (let i = 0; i < pageNumbers.length; i++) for (const b of pageNumbers.slice(i + 1)) {
      const a = pageNumbers[i], A = inventories.get(a), B = inventories.get(b);
      const shared = [...A].filter(m => m && B.has(m));
      if (!shared.length) continue;
      const scopesDiffer = differentScope(info.get(a)?.scope, info.get(b)?.scope);
      const overlap = shared.length / Math.min(A.size, B.size);
      const same = !scopesDiffer && shared.length >= 2 && overlap >= 0.8;
      if (same) repeated.add(pairKey(a, b));
      pairs.push({ pages: [a, b], shared_marks: shared.length, smaller_inventory: Math.min(A.size, B.size),
        repeated_inventory: same, reason: scopesDiffer ? 'different explicit site/building/floor scope' : same ? 'at least two marks and 80% of the smaller inventory repeat' : 'insufficient inventory overlap; require matching row evidence' });
    }
    return { pairs, repeated };
  }
  function resolve(rows) {
    const { pairs, repeated } = inventoryEvidence(rows);
    // Idempotent for placement callers that already used the shared loader.
    if (rows.some(d => d.opening_id)) return { doors: rows, pairs, rows: rows.reduce((n, d) => n + (d.schedule_rows?.length || 1), 0) };
    const byMark = new Map();
    rows.forEach((d, index) => { const k = mark(d) || `unmarked:${index}`; if (!byMark.has(k)) byMark.set(k, []); byMark.get(k).push({ d, index }); });
    const out = [];
    for (const [m, entries] of byMark) {
      if (new Set(entries.map(e => e.d.page)).size < 2) { out.push(...entries); continue; }
      // Highest-authority sheet supplies the complete row, including blanks.
      // Ties use lower page number, then the original within-page order.
      const sorted = [...entries].sort((a, b) => (info.get(b.d.page)?.rank ?? 1) - (info.get(a.d.page)?.rank ?? 1) || a.d.page - b.d.page || a.index - b.index);
      const groups = [];
      const compatible = (a, b) => {
        if (a.page === b.page || differentScope(info.get(a.page)?.scope, info.get(b.page)?.scope) || differentScope(rowScope(a), rowScope(b))) return false;
        if (repeated.has(pairKey(a.page, b.page))) return true;
        // A lone collision needs equal fields (including room) and an actual size,
        // not two empty rows. A repeated inventory may revise any of these fields.
        return a.width_inches > 0 && a.height_inches > 0 && differs(a, b).length === 0;
      };
      for (const e of sorted) {
        const candidates = groups.filter(g => g.every(s => compatible(s.d, e.d)));
        // Reordered shared marks: prefer equal fields, then schedule order. Never
        // attach two rows from one page to the same opening.
        candidates.sort((a, b) => differs(a[0].d, e.d).length - differs(b[0].d, e.d).length);
        if (candidates.length) candidates[0].push(e); else groups.push([e]);
      }
      const sourceKey = e => `${e.d.page}|${m}|${entries.filter(s => s.d.page === e.d.page && s.index <= e.index).length}`;
      groups.forEach((g, index) => {
        const source = g[0].d;
        out.push({ index: Math.min(...g.map(e => e.index)), d: { ...source,
          opening_id: `${m}|${g.map(e => e.d.page).sort((a, b) => a - b).join(',')}|${index + 1}`,
          source_keys: g.map(sourceKey),
          ...(g.length > 1 ? { schedule_rows: g.map(e => e.d) } : {}),
        } });
      });
    }
    return { doors: out.sort((a, b) => a.index - b.index).map(e => e.d), pairs, rows: rows.length };
  }
  const a = resolve(doorsA), b = resolve(doorsB);
  const audit = r => ({ rows: r.rows, pairs: r.pairs, openings: r.doors.length, collapsed_rows: r.rows - r.doors.length,
    repeated: r.doors.filter(d => d.schedule_rows).map(d => ({ mark: d.mark, page: d.page,
      sources: d.schedule_rows, conflicts: d.schedule_rows.slice(1).map(s => ({ page: s.page, fields: differs(d, s) })).filter(s => s.fields.length) })) });
  return { doorsA: a.doors, doorsB: b.doors, doorResolution: { rule: OPENING_RULE,
    pages: [...new Set([...doorsA, ...doorsB].map(d => d.page))].sort((a, b) => a - b)
      .map(p => info.get(p) || { page: p, rank: 1, scope: {} }), a: audit(a), b: audit(b) } };
}
