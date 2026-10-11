// A schedule row is evidence for an opening, not necessarily another opening.
// Resolve cross-page repeats once, before truth agreement and plan placement.
// Never collapse two rows on the same page (g044), or infer identity from a mark alone.
import { titleBlocks, lines, inTitleRegion } from '../../../weyland-shared/plan-read.js';
import { buildingScope, compareBuildingScopes, buildingScopeKey } from '../../../weyland-shared/building-scope.js';
import { N, ROW_FIELDS } from './agree.mjs';

export const OPENING_RULE = 'cross-page-inventory-scope-v2';
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
    return [p.page, { page: p.page, title: tb.title || (ancillary ? 'SPECIFICATIONS / GENERAL NOTES' : null),
      rank: ancillary ? 0 : dedicated ? 3 : heading ? 2 : 1, ...buildingScope(p, tb, ls) }];
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
      const scopeComparison = compareBuildingScopes(info.get(a), info.get(b));
      const overlap = shared.length / Math.min(A.size, B.size);
      const same = scopeComparison.agrees && shared.length >= 2 && overlap >= 0.8;
      if (same) repeated.add(pairKey(a, b));
      pairs.push({ pages: [a, b], shared_marks: shared.length, smaller_inventory: Math.min(A.size, B.size),
        scope_comparison: scopeComparison, repeated_inventory: same, reason: !scopeComparison.agrees ? 'building scopes do not agree' : same ? 'at least two marks and 80% of the smaller inventory repeat' : 'insufficient inventory overlap; require matching row evidence' });
    }
    return { pairs, repeated };
  }
  function resolve(inputRows) {
    // Re-resolve source evidence, including mixed raw/resolved callers and old rules.
    const rows = inputRows.flatMap(d => d.schedule_rows || [d]);
    const { pairs, repeated } = inventoryEvidence(rows);
    // Keep within-page occurrence aliases stable when a caller already resolved
    // reordered shared-mark rows. Recheck if the rule or scope evidence changed.
    if (inputRows.every(d => d.opening_rule === OPENING_RULE
      && d.opening_scope_id === buildingScopeKey(info.get(d.page))
      && d.schedule_rows.every(s => compareBuildingScopes(info.get(d.page), info.get(s.page)).agrees))) {
      return { doors: inputRows, pairs, rows: rows.length };
    }
    const byMark = new Map();
    rows.forEach((d, index) => { const k = mark(d) || `unmarked:${index}`; if (!byMark.has(k)) byMark.set(k, []); byMark.get(k).push({ d, index }); });
    const out = [];
    for (const [m, entries] of byMark) {
      // Highest-authority sheet supplies the complete row, including blanks.
      // Ties use lower page number, then the original within-page order.
      const sorted = [...entries].sort((a, b) => (info.get(b.d.page)?.rank ?? 1) - (info.get(a.d.page)?.rank ?? 1) || a.d.page - b.d.page || a.index - b.index);
      const groups = [];
      const compatible = (a, b) => {
        if (a.page === b.page || !compareBuildingScopes(info.get(a.page), info.get(b.page)).agrees || differentScope(rowScope(a), rowScope(b))) return false;
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
          opening_rule: OPENING_RULE, opening_scope: info.get(source.page)?.scope || {},
          opening_scope_id: buildingScopeKey(info.get(source.page)),
          opening_id: `${buildingScopeKey(info.get(source.page))}|${m}|${g.map(e => e.d.page).sort((a, b) => a - b).join(',')}|${index + 1}`,
          source_keys: g.map(sourceKey),
          schedule_rows: g.map(e => e.d),
        } });
      });
    }
    return { doors: out.sort((a, b) => a.index - b.index).map(e => e.d), pairs, rows: rows.length };
  }
  const a = resolve(doorsA), b = resolve(doorsB);
  const audit = r => ({ rows: r.rows, pairs: r.pairs, openings: r.doors.length, collapsed_rows: r.rows - r.doors.length,
    repeated: r.doors.filter(d => d.schedule_rows.length > 1).map(d => ({ mark: d.mark, page: d.page, opening_id: d.opening_id, scope: d.opening_scope,
      sources: d.schedule_rows, conflicts: d.schedule_rows.slice(1).map(s => ({ page: s.page, fields: differs(d, s) })).filter(s => s.fields.length) })) });
  return { doorsA: a.doors, doorsB: b.doors, doorResolution: { rule: OPENING_RULE,
    pages: [...new Set([...doorsA, ...doorsB].flatMap(d => d.schedule_rows || [d]).map(d => d.page))].sort((a, b) => a - b)
      .map(p => info.get(p) || { page: p, rank: 1, scope: {} }), a: audit(a), b: audit(b) } };
}
