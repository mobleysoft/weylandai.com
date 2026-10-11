import { readFileSync } from 'node:fs';
import { pageItems } from '../../truth/pdf.mjs';
import { readA } from '../../truth/reader_a.mjs';
import { readDoorsB } from '../../truth/reader_b.mjs';

// Original text/annotation content with viewport transforms; no reader output
// stored in fixtures. Both readers recover their rows independently on each run.
export async function readFixture(names) {
  const files = names.map(name => JSON.parse(readFileSync(new URL(`${name}.json`, import.meta.url))));
  const pdf = { numPages: Math.max(...files.map(f => f.page)), getPage: async n => {
    const f = files.find(f => f.page === n);
    return { rotate: f.rotate, getTextContent: async () => ({ items: f.items }),
      getAnnotations: async () => f.annotations, cleanup() {},
      getViewport: () => ({ width: f.width, height: f.height, transform: f.viewport }) };
  } };
  const pages = Array.from({ length: pdf.numPages }, (_, i) => ({ page: i + 1, width: 2592, height: 1728, items: [] }));
  const A = [], B = [];
  for (const f of files) {
    const p = pages[f.page - 1] = await pageItems(pdf, f.page);
    A.push(...(await readA(pdf, f.page, 'door_schedule')).doors.map(d => ({ page: f.page, ...d })));
    B.push(...readDoorsB(p.items, f.rules, p).doors.map(d => ({ page: f.page, ...d })));
  }
  return { pdf, pages, A, B };
}
