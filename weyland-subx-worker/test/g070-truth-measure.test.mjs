import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isNonHarvest, readKeySets, recordedInputs } from '../../tools/accuracy/truth/inputs.mjs';

function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), 'g070-measure-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const put = (file, data) => {
    const path = join(repo, file);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data));
    return path;
  };
  const record = (sha16, file, source) => ({ sha16, file, source, tier: 'agreed',
    readers: { a: { doors: 1 }, b: { doors: 1 } }, agreement: { doors: { agreed: 1 } } });
  const harvest = record('1111111111111111', '1111111111111111.pdf', 'harvest');
  const corpus = record('2222222222222222', 'tools/corpus/plan-sets/schedule.pdf', 'corpus/plan-sets');
  const bidset = record('3333333333333333', 'tools/bidset/out/building.pdf', 'bidset');
  for (const r of [harvest, corpus, bidset]) put(`tools/corpus/harvest/truth/${r.sha16}.json`, r);
  put('downloads/' + harvest.file, 'pdf');
  put(corpus.file, 'pdf'); put(bidset.file, 'pdf');
  return { repo, put, harvest, corpus, bidset };
}

test('record selection resolves repo PDFs by SHA without --dir and covers all non-harvest records', t => {
  const { repo, corpus, bidset, harvest } = fixture(t);
  assert.deepEqual(recordedInputs({ repo, shas: [corpus.sha16] }).map(x => x.file), [join(repo, corpus.file)]);
  assert.deepEqual(recordedInputs({ repo, nonHarvest: true }).map(x => x.record.sha16), [corpus.sha16, bidset.sha16]);
  assert.deepEqual(recordedInputs({ repo, harvestDir: join(repo, 'downloads'), shas: [harvest.sha16, bidset.sha16] }).map(x => x.file),
    [join(repo, 'downloads', harvest.file), join(repo, bidset.file)]);
  assert.equal(isNonHarvest({ ...harvest, file: 'tools/corpus/harvest/downloads/a.pdf' }), false);
  assert.equal(isNonHarvest({ ...harvest, file: corpus.file }), true);
  assert.throws(() => recordedInputs({ repo, shas: ['4444444444444444'] }), /No truth record/);
  assert.throws(() => recordedInputs({ repo, shas: [harvest.sha16] }), /Missing PDF/);
});

test('key lists validate unique SHA16s and missing OCC must be supplied explicitly', t => {
  const { repo, put, corpus, bidset } = fixture(t);
  const list = put('keys.json', { sets: [{ name: 'Corpus', sha16: corpus.sha16 }, { name: 'Building', sha16: bidset.sha16 }] });
  assert.deepEqual(readKeySets(list), [corpus.sha16, bidset.sha16]);
  put('keys.json', [corpus.sha16, corpus.sha16]);
  assert.throws(() => readKeySets(list), /unique SHA16/);
  const occ = { sha16: '4444444444444444', file: 'occ-a-801-pg4.pdf', source: 'files' };
  put(`tools/corpus/harvest/truth/${occ.sha16}.json`, occ);
  assert.throws(() => recordedInputs({ repo, nonHarvest: true }), /set OCC_PDF/);
  const occPdf = put('private/occ.pdf', 'pdf');
  assert.equal(recordedInputs({ repo, shas: [occ.sha16], occPdf })[0].file, occPdf);
});

const compareScript = fileURLToPath(new URL('../../tools/accuracy/truth/compare_runs.mjs', import.meta.url));
const compare = (...args) => spawnSync(process.execPath, [compareScript, ...args], { encoding: 'utf8' });

test('compare fails on missing non-harvest coverage, even with --allow; a complete comparison passes', t => {
  const { repo, put, corpus, harvest } = fixture(t);
  for (const r of [corpus, harvest]) put(`before/${r.sha16}.json`, r);
  put(`after/${harvest.sha16}.json`, harvest);
  const args = [join(repo, 'before'), join(repo, 'after')];
  const missing = compare(...args, '--allow', corpus.sha16);
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /MISSING: 2222222222222222/);
  put(`after/${corpus.sha16}.json`, corpus);
  assert.equal(compare(...args).status, 0);
  put(`after/${corpus.sha16}.json`, { ...corpus, agreement: { doors: { agreed: 0 } } });
  assert.equal(compare(...args).status, 1);
});

test('scoped comparison still requires every selected key and compares non-harvest losses', t => {
  const { repo, put, corpus, harvest } = fixture(t);
  for (const r of [corpus, harvest]) put(`before/${r.sha16}.json`, r);
  put(`after/${corpus.sha16}.json`, corpus);
  const args = [join(repo, 'before'), join(repo, 'after')];
  assert.equal(compare(...args, '--non-harvest').status, 0);
  const keyFile = put('keys.json', [harvest.sha16, corpus.sha16]);
  assert.equal(compare(...args, '--key-sets', keyFile).status, 1);
  put('keys.json', [corpus.sha16]);
  assert.equal(compare(...args, '--key-sets', keyFile).status, 0);
  put(`after/${corpus.sha16}.json`, { ...corpus, agreement: { doors: { agreed: 0 } } });
  assert.equal(compare(...args, '--non-harvest').status, 1);
});

test('unchanged door counts cannot hide a loss of audited field calibration', t => {
  const { repo, put, corpus } = fixture(t);
  const score = { rows_found: 1, rows_fully_right: 1, fields_right: 7 };
  const calibration = { expected: 'audit.json', kind: 'doors', reader_a: score, reader_b: score, agreed: score, fields: { agreed: { right: 7, total: 7 } } };
  const record = { ...corpus, tier: 'audited', calibration: [calibration] };
  put(`before/${corpus.sha16}.json`, record);
  put(`after/${corpus.sha16}.json`, record);
  const args = [join(repo, 'before'), join(repo, 'after')];
  assert.equal(compare(...args).status, 0);
  put(`after/${corpus.sha16}.json`, { ...record, calibration: [{ ...calibration, reader_a: { ...score, fields_right: 6 } }] });
  const loss = compare(...args);
  assert.equal(loss.status, 1);
  assert.match(loss.stdout, /CALIBRATION: .*reader_a.fields_right/);
  put(`after/${corpus.sha16}.json`, { ...record, calibration: [] });
  assert.equal(compare(...args).status, 1);
});
