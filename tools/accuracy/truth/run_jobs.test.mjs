import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseJobs, splitShards, mergeQueue, summaryLine, runShards } from './run_jobs.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const runner = join(repo, 'tools/accuracy/truth_run.mjs');
const fixture = join(repo, 'tools/accuracy/fixtures/truth_shard.mjs');
const temp = t => {
  const dir = mkdtempSync(join(tmpdir(), 'truth-jobs-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const entry = (index, bytes = 1, rest = {}) => ({ index, file: `/pdf/${index}.pdf`, sha16: `sha${index}`, bytes, ...rest });
const line = sha16 => JSON.stringify({ sha16, reason: 'disputed' });

test('jobs defaults to 1 and rejects missing, fractional, nonfinite and unsafe counts', () => {
  assert.equal(parseJobs([]), 1);
  assert.equal(parseJobs(['--jobs', '4']), 4);
  for (const value of [undefined, '0', '-1', '1.5', 'NaN', 'Infinity', '2x', '9007199254740992', '--out']) {
    assert.throws(() => parseJobs(['--jobs', value]), /positive integer/);
  }
});

test('shards balance stable size groups, preserve serial order and leave the inputs unchanged', () => {
  const entries = [entry(0, 1), entry(1, 8), entry(2, 4), entry(3, 8), entry(4, 3), entry(5, 2)];
  const before = structuredClone(entries);
  const shards = splitShards(entries, 3);
  assert.deepEqual(shards.map(s => s.map(e => e.index)), [[0, 1], [3], [2, 4, 5]]);
  assert.deepEqual(splitShards(entries, 3), shards);
  assert.deepEqual(entries, before);
  assert.deepEqual(splitShards(entries, 1), [entries]);
});

test('empty, one-file, excess jobs, zero bytes and duplicate content never create empty workers or racing records', () => {
  assert.deepEqual(splitShards([], 4), []);
  assert.deepEqual(splitShards([entry(0)], 4), [[entry(0)]]);
  assert.equal(splitShards([entry(0, 0), entry(1, 0)], 99).length, 2);
  const duplicate = entry(2, 2, { sha16: 'sha0' });
  const shards = splitShards([entry(0), entry(1), duplicate], 4);
  assert.equal(shards.length, 2);
  assert.deepEqual(shards[0].map(e => e.index), [0, 2]);
  assert.deepEqual(shards[1].map(e => e.index), [1]);
});

test('queue merge keeps untouched bytes, drops replaced and invalid lines, and uses serial PDF/row order', () => {
  const kept = ' { "sha16": "kept", "unaltered": true } ';
  const before = `${line('a')}\n${kept}\n\nnot-json\nnull\n${line('zero')}\n${line('failed')}\n`;
  const a1 = JSON.stringify({ sha16: 'a', row: 1 }), a2 = JSON.stringify({ sha16: 'a', row: 2 });
  const b = line('b');
  const merged = mergeQueue(before, [
    { index: 3, sha16: 'a', queue: [a2] },
    { index: 2, sha16: 'zero', queue: [] },
    { index: 1, sha16: 'b', queue: [b] },
    { index: 4, sha16: null, queue: [] },
    { index: 0, sha16: 'a', queue: [a1] },
  ]);
  assert.equal(merged.text, `${kept}\n${line('failed')}\n${a1}\n${b}\n${a2}\n`);
  assert.equal(merged.done.size, 3);
  assert.equal(merged.keptCount, 2);
  assert.equal(merged.runCount, 3);
  assert.equal(merged.totalCount, 5);
  assert.equal(mergeQueue('', []).text, '\n');
});

test('summary is exactly the serial summary, including zero counts', () => {
  assert.equal(summaryLine(17, 279, 275), 'truth records: 17 queue lines: 279 (275 from this run)');
  assert.equal(summaryLine(0, 0, 0), 'truth records: 0 queue lines: 0 (0 from this run)');
});

test('real processes stay within N, inherit options/environment and merge in serial order after out-of-order completion', async t => {
  const out = temp(t), events = join(out, 'events.jsonl'), logs = [], errors = [];
  const previousOcc = process.env.OCC_PDF;
  process.env.OCC_PDF = '/private fixture/OCC.pdf';
  t.after(() => { if (previousOcc === undefined) delete process.env.OCC_PDF; else process.env.OCC_PDF = previousOcc; });
  const argv = ['--events', events, '--jobs', '2', '--dir', '/input folder', '--only', 'a,b', '--key-sets', '/keys.json',
    '--non-harvest', '--out', out, '--max-pages', '7', '--ocr-max-pages', '2', '--ocr-dpi', '300'];
  writeFileSync(join(out, 'queue.jsonl'), line('keep') + '\n');
  const entries = [entry(0, 10, { delay: 150, queue: [line('sha0')] }), entry(1, 9), entry(2, 1, { queue: [line('sha2')] })];
  const result = await runShards({ entries, jobs: 2, out, script: fixture, argv, log: s => logs.push(s), error: s => errors.push(s) });
  assert.equal(result.errors, 0);
  assert.deepEqual(errors, []);
  assert.equal(readFileSync(join(out, 'queue.jsonl'), 'utf8'), [line('keep'), line('sha0'), line('sha2'), ''].join('\n'));
  assert.deepEqual(logs, [...entries.map(e => e.file), 'truth records: 3 queue lines: 3 (2 from this run)']);
  const lifecycle = readFileSync(events, 'utf8').trim().split('\n').map(JSON.parse);
  let active = 0, max = 0;
  for (const e of lifecycle) { active += e.kind === 'start' ? 1 : -1; max = Math.max(max, active); }
  assert.equal(max, 2);
  assert.equal(active, 0);
  assert.equal(new Set(lifecycle.map(e => e.pid)).size, 2);
  for (const e of lifecycle) {
    assert.deepEqual(e.args.slice(0, argv.length), argv);
    assert.equal(e.occ, '/private fixture/OCC.pdf');
  }
  assert.ok(!readdirSync(out).some(f => f.startsWith('.truth-shards-')));
});

for (const fail of ['exit', 'signal', 'incomplete', 'journal']) {
  test(`a ${fail} shard retains completed work, reports the unfinished PDF and preserves its old queue`, async t => {
    const out = temp(t), logs = [], errors = [];
    // Shard 2 completes PDF 0 before failing on PDF 2; shard 1 completes PDF 1.
    const entries = [entry(0, 9, { queue: [line('sha0')] }), entry(1, 10), entry(2, 1, { fail })];
    writeFileSync(join(out, 'queue.jsonl'), line('sha2') + '\n' + line('sha1') + '\n');
    const result = await runShards({ entries, jobs: 2, out, script: fixture,
      argv: ['--events', join(out, 'events.jsonl')], log: s => logs.push(s), error: s => errors.push(s) });
    assert.equal(result.errors, 1);
    assert.equal(result.done.size, 2);
    assert.equal(readFileSync(join(out, 'queue.jsonl'), 'utf8'), line('sha2') + '\n' + line('sha0') + '\n');
    assert.match(errors.join('\n'), /truth shard failed: .*shard-2\.json/);
    assert.match(errors.join('\n'), /PDFs not completed: \/pdf\/2\.pdf/);
    if (fail === 'exit') assert.match(errors.join('\n'), /exit 23/);
    if (fail === 'signal') assert.match(errors.join('\n'), /SIGTERM/);
    assert.match(logs.at(-1), /^truth records: 2 queue lines: 2 \(1 from this run\)$/);
    assert.ok(readdirSync(out).some(f => f.startsWith('.truth-shards-')));
  });
}

const cli = args => spawnSync(process.execPath, [runner, ...args], { cwd: repo, encoding: 'utf8', timeout: 60_000 });
const normalized = file => {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  delete r.ms;
  delete r.generated_at;
  return JSON.stringify(r, null, 1) + '\n';
};

test('CLI --dir metadata, duplicate content, queue replacement, summary and file logs match serial bytes/order', t => {
  const root = temp(t), input = join(root, 'input'), one = join(root, 'one'), four = join(root, 'four');
  for (const dir of [input, one, four]) mkdirSync(dir);
  const pdfs = ['525dc0b72011077a', 'dd339f57b51538ed'];
  copyFileSync(join(repo, `tools/corpus/door-schedules/${pdfs[0]}.pdf`), join(input, 'a.pdf'));
  copyFileSync(join(repo, `tools/corpus/door-schedules/${pdfs[1]}.pdf`), join(input, 'b.pdf'));
  copyFileSync(join(input, 'a.pdf'), join(input, 'c.pdf'));
  writeFileSync(join(input, 'manifest.json'), JSON.stringify({ documents: ['a', 'b', 'c'].map(name => ({
    filename: name + '.pdf', family: name, source_label: 'Label ' + name, source_url: 'local:' + name,
  })) }));
  const oldQueue = ` {"sha16":"untouched"} \n${line(pdfs[0])}\n${line(pdfs[1])}\n`;
  for (const out of [one, four]) writeFileSync(join(out, 'queue.jsonl'), oldQueue);
  // No jobs flag exercises the default path; the two actual readers run on these small PDFs.
  const serial = cli(['--dir', input, '--out', one]);
  const parallel = cli(['--dir', input, '--out', four, '--jobs', '4']);
  assert.equal(serial.status, 0, serial.stderr);
  assert.equal(parallel.status, 0, parallel.stderr);
  assert.deepEqual(readdirSync(four).sort(), readdirSync(one).sort());
  for (const name of readdirSync(one)) {
    if (name === 'queue.jsonl') assert.equal(readFileSync(join(one, name), 'utf8'), readFileSync(join(four, name), 'utf8'));
    else assert.equal(normalized(join(one, name)), normalized(join(four, name)));
  }
  const a = JSON.parse(readFileSync(join(four, pdfs[0] + '.json'), 'utf8'));
  assert.equal(a.file, 'c.pdf');
  assert.equal(a.family, 'c');
  assert.equal(a.label, 'Label c');
  assert.equal(a.source_url, 'local:c');
  const visible = output => output.split('\n').filter(l => l.includes(' ... ') || l.startsWith('truth records:'))
    .map(l => l.replace(/\| \d+s /, '| <time> '));
  assert.deepEqual(visible(parallel.stdout), visible(serial.stdout));
});

test('CLI --files failure is nonzero, names the file, keeps old queue and reports totals once', t => {
  const out = temp(t), good = join(repo, 'tools/corpus/door-schedules/525dc0b72011077a.pdf');
  const missing = join(out, 'missing.pdf');
  writeFileSync(join(out, 'queue.jsonl'), line('untouched') + '\n');
  const r = cli(['--files', `${good},${missing}`, '--jobs', '4', '--max-pages', '0', '--out', out]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /truth shard failed:/);
  assert.ok(r.stderr.includes(missing));
  assert.match(r.stdout, /missing .*missing.pdf/);
  assert.equal(r.stdout.split('\n').filter(l => l.startsWith('truth records:')).length, 1);
  assert.match(r.stdout, /truth records: 1 queue lines: 1 \(0 from this run\)/);
  assert.equal(readFileSync(join(out, 'queue.jsonl'), 'utf8'), line('untouched') + '\n');
});

test('CLI --key-sets, --non-harvest and --only preserve selection, expected hashes and missing-request failures', t => {
  const out = temp(t), keys = join(out, 'keys.json');
  const shas = ['525dc0b72011077a', 'dd339f57b51538ed'];
  writeFileSync(keys, JSON.stringify(shas));
  const result = cli(['--key-sets', keys, '--non-harvest', '--only', shas.join(','), '--jobs', '4', '--max-pages', '0', '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /truth records: 2 queue lines: 0 \(0 from this run\)/);
  for (const sha of shas) {
    const r = JSON.parse(readFileSync(join(out, sha + '.json'), 'utf8'));
    const expected = JSON.parse(readFileSync(join(repo, 'tools/corpus/harvest/truth', sha + '.json'), 'utf8'));
    for (const field of ['sha16', 'file', 'family', 'source', 'label', 'source_url']) assert.equal(r[field], expected[field]);
    assert.equal(r.error, 'more than 0 pages; rerun with --max-pages');
  }
  const missing = '0000000000000000';
  const files = shas.map(sha => join(repo, `tools/corpus/door-schedules/${sha}.pdf`));
  const failed = cli(['--files', files.join(','), '--only', [...shas, missing].join(','), '--jobs', '4', '--max-pages', '0', '--out', out]);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Requested records not regenerated: 0000000000000000/);
});

test('CLI --only one PDF, excess jobs and an empty --dir take the serial path', t => {
  const out = temp(t), empty = join(out, 'empty');
  mkdirSync(empty);
  const r = cli(['--dir', empty, '--out', out, '--jobs', '4']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), summaryLine(0, 0, 0));
  const sha = '525dc0b72011077a';
  const single = cli(['--dir', join(repo, 'tools/corpus/door-schedules'), '--only', sha, '--out', out, '--jobs', '4', '--max-pages', '0']);
  assert.equal(single.status, 0, single.stderr);
  assert.match(single.stdout, /truth records: 1 queue lines: 0 \(0 from this run\)/);
  assert.ok(!readdirSync(out).some(f => f.startsWith('.truth-shards-')));
});

test('CLI --key-sets with a harvest --dir still rejects a changed PDF hash in a child', t => {
  const out = temp(t), input = join(out, 'input'), keys = join(out, 'keys.json');
  mkdirSync(input);
  const harvest = '7478006f7fd5b43c', repoSha = '525dc0b72011077a';
  const record = JSON.parse(readFileSync(join(repo, 'tools/corpus/harvest/truth', harvest + '.json'), 'utf8'));
  const wrongPdf = join(input, basename(record.file));
  copyFileSync(join(repo, 'tools/corpus/door-schedules/dd339f57b51538ed.pdf'), wrongPdf);
  writeFileSync(keys, JSON.stringify([harvest, repoSha]));
  writeFileSync(join(out, 'queue.jsonl'), line(harvest) + '\n');
  const r = cli(['--key-sets', keys, '--dir', input, '--jobs', '4', '--max-pages', '0', '--out', out]);
  assert.equal(r.status, 1, r.stderr);
  assert.ok(r.stdout.includes(`PDF hash changed: expected ${harvest}`));
  assert.ok(r.stdout.includes(wrongPdf));
  assert.match(r.stderr, /truth shard failed:/);
  assert.ok(r.stderr.includes(`Requested records not regenerated: ${harvest}`));
  assert.match(r.stdout, /truth records: 1 queue lines: 1 \(0 from this run\)/);
  assert.equal(readFileSync(join(out, 'queue.jsonl'), 'utf8'), line(harvest) + '\n');
});
