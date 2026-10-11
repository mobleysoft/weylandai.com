// recordedInputs: repo PDFs resolve, a harvest record resolves under the harvest directory, a record whose PDF lives
// outside the repository is skipped by name unless its environment variable points at it, a missing repo PDF throws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recordedInputs, isNonHarvest } from './inputs.mjs';

function repoWith(records) {
  const repo = mkdtempSync(join(tmpdir(), 'truth-inputs-'));
  mkdirSync(join(repo, 'tools/corpus/harvest/truth'), { recursive: true });
  mkdirSync(join(repo, 'tools/corpus/plan-sets'), { recursive: true });
  mkdirSync(join(repo, 'tools/corpus/harvest/downloads'), { recursive: true });
  for (const r of records) writeFileSync(join(repo, 'tools/corpus/harvest/truth', r.sha16 + '.json'), JSON.stringify(r));
  return repo;
}

const plan = { sha16: 'a000000000000001', file: 'tools/corpus/plan-sets/fayette.pdf' };
const occ = { sha16: 'a000000000000002', file: 'occ-a-801-pg4.pdf', source: 'files' };
const harvest = { sha16: 'a000000000000003', file: 'x.pdf', source: 'harvest' };

test('non-harvest selection skips the outside-repository PDF by name and keeps the repo PDF', () => {
  const repo = repoWith([plan, occ, harvest]);
  writeFileSync(join(repo, plan.file), 'pdf');
  const lines = [];
  const log = console.log; console.log = (...a) => lines.push(a.join(' '));
  try {
    const got = recordedInputs({ repo, nonHarvest: true });
    assert.deepEqual(got.map(g => g.record.sha16), [plan.sha16]);
    assert.ok(lines.some(l => l.startsWith('skipped ' + occ.sha16)), lines.join('|'));
  } finally { console.log = log; }
});

test('the outside-repository PDF joins the run when its environment variable names it', () => {
  const repo = repoWith([plan, occ]);
  writeFileSync(join(repo, plan.file), 'pdf');
  const occPdf = join(repo, 'occ.pdf'); writeFileSync(occPdf, 'pdf');
  const got = recordedInputs({ repo, nonHarvest: true, occPdf });
  assert.deepEqual(got.map(g => g.record.sha16).sort(), [plan.sha16, occ.sha16]);
});

test('a missing repository PDF is an error, never a skip', () => {
  const repo = repoWith([plan]);
  assert.throws(() => recordedInputs({ repo, nonHarvest: true }), /Missing PDF for a000000000000001/);
});

test('harvest records resolve under the harvest directory and are not non-harvest', () => {
  const repo = repoWith([harvest]);
  writeFileSync(join(repo, 'tools/corpus/harvest/downloads/x.pdf'), 'pdf');
  assert.equal(isNonHarvest(harvest), false);
  const got = recordedInputs({ repo, shas: [harvest.sha16] });
  assert.equal(got[0].file, join(repo, 'tools/corpus/harvest/downloads/x.pdf'));
});
