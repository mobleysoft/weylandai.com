// Building identity shared by schedule resolution and plan placement. All evidence
// is page text, never a project/hash lookup. Callers supply joined viewport lines.
const text = s => String(s ?? '').toUpperCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const clean = s => text(s).replace(/[.,:;]+$/g, '').trim();
const unique = xs => [...new Set(xs)].sort();

export function buildingScope(p, tb, ls) {
  // Project identity can sit above the sheet-title box in a vertical title strip.
  // Exclude the upper consultant/contact block, whose address is not the site.
  const title = ls.filter(l => l.x > p.width * 0.86 && l.y > p.height * 0.35);
  const scope = {}, evidence = [];
  const add = (field, value, line, source = 'title_block') => {
    value = clean(value);
    if (!value) return;
    (scope[field] ||= []).push(value);
    evidence.push({ field, value, text: line.str, x: line.x, y: line.y, source });
  };
  // A sheet number is not itself a building. Its alphabetic family/variant is
  // distinguishing evidence: A-101 and A-102 agree; A-101.A is a different family.
  const sheet = text(tb.sheet);
  const sm = /^([A-Z]{1,3})-?\d{1,3}(?:[.-]\d{1,3})?(?:[.-]?([A-Z]+))?$/.exec(sheet);
  const sheet_family = sm ? sm[1] + (sm[2] ? '.' + sm[2] : '') : null;
  for (const l of title) {
    const s = text(l.str);
    // A facility name may be stacked over several same-size, aligned lines.
    // Preserve the whole name, not just a generic last line such as SHELTER.
    if (/\b(?:SCHOOL|HOSPITAL|LIBRARY|CAMPUS|STATE PARK|SHELTER|HEADQUARTERS|COMMUNITY CENTER)$/.test(s)) {
      const name = [l];
      let top = l;
      while (true) {
        const above = title.filter(v => v.rot === top.rot && Math.abs(v.h - top.h) < 0.6
          && top.y - v.y > top.h * 0.5 && top.y - v.y < top.h * 1.7
          && v.x < top.x + top.w && v.x + v.w > top.x && /^[A-Z][A-Z &'-]*$/.test(text(v.str)))
          .sort((a, b) => b.y - a.y)[0];
        if (!above) break;
        name.unshift(above); top = above;
      }
      add('facility_name', name.map(v => v.str).join(' '), { ...l, str: name.map(v => v.str).join(' ') });
    }
    // Names are explicit title-block lines, including rotated school names.
    // Retain multi-line facility names (e.g. CAMPGROUND SHOWER / HOUSE REPLACEMENTS).
    if (/\b(?:SCHOOL|HOSPITAL|LIBRARY|CAMPUS|STATE PARK)\s*$/.test(s)) add('site', s, l);
    if (/\b(?:(?:SHOWER|PUMP|POWER|GATE|BOAT|CLUB)(?: HOUSE)?|HEADQUARTERS|FIRE STATION|COMMUNITY CENTER)\b/.test(s) || /^HOUSE\b/.test(s)) add('facility_name', s.replace(/\s*&$/, ''), l);
    const address = /^\d+\s+(?:.+\b(?:STREET|ST\.?|ROAD|RD\.?|WAY|DRIVE|DR\.?|AVENUE|AVE\.?|LANE|LN\.?|BOULEVARD|BLVD\.?)\b|(?:SR|US|STATE ROUTE|HIGHWAY|HWY)\s+\d+\b)/.exec(s);
    // Above the lower title box, accept an address only beside the project name;
    // an unrelated consultant's contact block must not establish site identity.
    const nearName = evidence.some(e => e.field === 'facility_name' && e.y < l.y
      && l.y - e.y < l.h * 4 && Math.abs(e.x - l.x) < l.h * 4);
    if (address && (l.y > p.height * 0.5 || nearName)) add('address', s, l);
  }
  // Explicit labels can also occur at a drawing/schedule heading. Do not turn
  // prose references ("SEE BUILDING B") or room names into the sheet's scope.
  const labels = [...new Set([...title, ...ls.filter(l => /^(?:BUILDING|BLDG\.?|LOOP|LEVEL|FLOOR|ASSET|SITE|FACILITY)(?:\s|:)/i.test(l.str.trim()))])];
  for (const l of labels) {
    const s = text(l.str), source = title.includes(l) ? 'title_block' : 'sheet_label';
    let m = /^(?:BUILDING|BLDG\.?)\s+(?:NAME\s*[:#]\s*)?([A-Z0-9][A-Z0-9 -]*?)(?:\s+(?:DOOR.*SCHEDULE|FLOOR PLAN|PLAN))?$/.exec(s);
    if (m && !/\b(?:IS|SHALL|TO|OF|THE|AND)\b/.test(m[1])) add('building', m[1], l, source);
    m = /^LOOP\s*#?\s*([A-Z0-9-]+)(?:\s+(?:SHOWER HOUSE|DOOR.*SCHEDULE|FLOOR PLAN|PLAN))?$/.exec(s);
    if (m) add('building', 'LOOP ' + m[1], l, source);
    m = /^(LEVEL|FLOOR)\s+([A-Z]|\d+[A-Z]?|BASEMENT|GROUND|ROOF|MEZZANINE)\b/.exec(s);
    if (m) add('level', m[2], l, source);
    m = /^FACILITY(?: NAME)?\s*:\s*(.+)$/.exec(s);
    if (m) add('facility_name', m[1], l, source);
    // Number labels and values often occupy separate, widely spaced text items.
    // Keep all overprinted/stacked values; overlapping values are not permission
    // to discard one or to match any member of two different value sets.
    m = /^(ASSET|SITE|FACILITY)\s*(?:NUMBER|NO\.?|#+)\s*:?\s*([A-Z0-9-]*)$/.exec(s);
    if (!m) continue;
    const field = m[1].toLowerCase() + '_number';
    if (m[2]) add(field, m[2], l, source);
    for (const v of ls) {
      if (!/^[A-Z0-9]*\d[A-Z0-9-]*$/.test(text(v.str))) continue;
      // Stop at the next numbered label: its values belong to that field.
      if (ls.some(next => /^(?:ASSET|SITE|FACILITY)\s*(?:NUMBER|NO\.?|#+)/i.test(next.str)
        && Math.abs(next.x - l.x) < l.h && next.y > l.y + l.h * 0.5 && next.y <= v.y + v.h * 0.4)) continue;
      if (v.rot !== l.rot || v.x < l.x + l.w * 0.7 || v.x > l.x + Math.max(l.w * 2.5, l.h * 15)) continue;
      if (Math.abs(v.y - l.y) <= l.h * 0.4 || (v.y > l.y && v.y - l.y < l.h * 1.25 && Math.abs(v.h - l.h) < 1)) add(field, v.str, v, source);
    }
  }
  const floor = /\b(FIRST|SECOND|THIRD|FOURTH|BASEMENT|GROUND|\d+(?:ST|ND|RD|TH))\s+FLOOR\b/.exec(text(tb.title));
  if (floor) {
    const ordinals = { FIRST: '1', SECOND: '2', THIRD: '3', FOURTH: '4' };
    add('level', ordinals[floor[1]] || floor[1].replace(/(ST|ND|RD|TH)$/, ''), { str: tb.title, x: null, y: null }, 'sheet_title');
  }
  return { scope: Object.fromEntries(Object.keys(scope).sort().map(k => [k, unique(scope[k]).join('; ')])),
    sheet: tb.sheet || null, sheet_family, scope_evidence: evidence };
}

/** Agreement is affirmative: missing evidence on one side cannot bridge scopes.
 * Placement can use partial evidence, but never override an explicit conflict. */
export function compareBuildingScopes(a = {}, b = {}) {
  const A = a.scope || {}, B = b.scope || {};
  const matched = Object.keys(A).filter(k => k !== 'level' && A[k] && A[k] === B[k]);
  const differences = unique([...Object.keys(A), ...Object.keys(B)]).filter(k => A[k] !== B[k])
    .map(field => ({ field, a: A[field] ?? null, b: B[field] ?? null, kind: A[field] && B[field] ? 'conflict' : 'missing' }));
  if (a.sheet_family && b.sheet_family && a.sheet_family !== b.sheet_family) differences.push({ field: 'sheet_family', a: a.sheet_family, b: b.sheet_family, kind: 'conflict' });
  return { agrees: matched.length > 0 && differences.length === 0,
    conflicts: differences.some(d => d.kind === 'conflict'), matched, differences };
}

export const buildingScopeKey = info => JSON.stringify([info?.scope || {}, info?.sheet_family || null]);
