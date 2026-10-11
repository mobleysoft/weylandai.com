// Complete original PDF text items, including the adjacent type drawings and
// their NOTE caption. Keep the whole page: cropping away that caption hid g058.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPageFromDoc } from '../src/lib/text-layer-read.js';

const marks = ['101A', '102A', '103A', '104A', '104B', '105A', '106A', '107A',
  '110A', '110B', '111A', '112A', '113A', '114A', '114B', '115A', '116A',
  '117A', '118A', '118B', '119A', '119B', '119C', '120A', '121A', '122A'];

async function read(n, mutate = f => f) {
  const f = mutate(JSON.parse(readFileSync(new URL(`./fixtures/g070/9dffef61b825368d-${n}.json`, import.meta.url))));
  const page = { rotate: f.rotate, getTextContent: async () => ({ items: f.items }),
    getAnnotations: async () => f.annotations, cleanup() {},
    getViewport: ({ rotation = 0 }) => {
      assert.equal(rotation, 0);
      return { width: f.width, height: f.height, transform: f.viewport };
    } };
  return (await readPageFromDoc({ numPages: n, getPage: async () => page }, n, 'door_schedule')).result;
}

test('Fayette p14: a NOTE beside the schedule does not discard its 26 numbered rows', async () => {
  const r = await read(14);
  assert.equal(r.metadata.tables.length, 1);
  assert.deepEqual(r.doors.map(d => d.door_number), marks);
  assert.ok(r.doors.slice(0, -1).every(d => d.width_inches === 36 && d.height_inches === 84));
  // The existing C.O. continuation contaminates 122A's height; recovery of
  // numbered rows is not a claim that every size field is correct.
  assert.equal(r.doors.at(-1).door_number, '122A');
  assert.equal(r.doors.at(-1).height_inches, null);
});

test('Fayette p5: retains the 27 numbered rows including 119D', async () => {
  const r = await read(5);
  assert.deepEqual(r.doors.map(d => d.door_number), [...marks.slice(0, 23), '119D', ...marks.slice(23)]);
  assert.equal(r.metadata.tables.length, 1);
});

test('Fayette p14: plural NOTES beside the table has the same spatial boundary', async () => {
  const r = await read(14, f => {
    for (const item of f.items) item.str = item.str.replace(/^NOTE: SOME ITEMS/, 'NOTES: SOME ITEMS');
    return f;
  });
  assert.deepEqual(r.doors.map(d => d.door_number), marks);
});
