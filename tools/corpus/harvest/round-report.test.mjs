// Entirely local fixtures: no HTTP server, harvester, Poppler, npm or corpus PDFs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const scripts = path.dirname(fileURLToPath(import.meta.url));
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (dir, name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const run = (dir, script) => spawnSync(process.execPath, [path.join(scripts, script)], {
  cwd: os.tmpdir(), env: {...process.env, HARVEST_ROOT: dir}, encoding: 'utf8', timeout: 10000,
});
const pass = result => assert.equal(result.status, 0, result.stderr || result.error?.message);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const classes = ['complete', 'pair', 'schedule-only', 'spec-only', 'plan-only', 'none'];
const counts = (complete, plans, none) => Object.fromEntries(classes.map(c => [c, c === 'complete' ? complete : c === 'plan-only' ? plans : c === 'none' ? none : 0]));
const kinds = ['door_schedule', 'hardware_spec', 'floor_plan_architectural', 'plan_other'];

function fixture(t, numbers = [3, 4]) {
  // A quote and spaces exercise the copy/paste preview repair commands.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "g071 fake 'round-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, 'downloads'));
  fs.mkdirSync(path.join(dir, 'previews'));
  const docs = ['A', 'B', 'C'].map((id, i) => {
    const data = Buffer.alloc((i + 1) * 100, ' ');
    data.write('%PDF-1.4\n% Fixture ' + id + '\n');
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const filename = 'downloads/' + sha256.slice(0, 16) + '.pdf';
    fs.writeFileSync(path.join(dir, filename), data);
    return {sha256, filename, bytes: data.length, url: 'https://fixture.invalid/' + id + '.pdf', host: 'fixture.invalid', family: 'fake_portal', retrieved_at: i < 2 ? '2026-10-09T10:01:00Z' : '2026-10-10T10:01:00Z', pages: 1, http_status: 200, outcome: 'downloaded'};
  });
  const triage = docs.map((d, i) => {
    const qualified = kinds.filter(k => i === 2 ? k !== 'plan_other' : i === 1 && k === 'floor_plan_architectural');
    const plan = i > 0;
    const previews = Object.fromEntries(qualified.filter(k => k !== 'hardware_spec').map(k => [k, {path: 'previews/' + d.sha256.slice(0, 16) + '-' + k + '-p1.png', page_index: 0, page_number: 1}]));
    // A real 1x1 PNG. Rendering is intentionally not required by these tests.
    for (const p of Object.values(previews)) fs.writeFileSync(path.join(dir, p.path), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXZkAAAAASUVORK5CYII=', 'base64'));
    return {...d, triage_version: 3, triaged_at: '2026-10-10T12:00:00Z', class: i === 2 ? 'complete' : i === 1 ? 'plan-only' : 'none',
      examined_page_indexes: [0], scanned_page_indexes: [], sampled: false, sampling: 'all pages',
      raster_only: false, font_count: 1, vector_text: true,
      floor_plan_architectural: plan, plan_other: false, floor_plans_in_first_quarter: plan, plan_first_quarter_page_indexes: plan ? [0] : [],
      page_flags: [{page_index: 0, floor_plan_architectural: plan, plan_other: false}],
      qualified_page_indexes: Object.fromEntries(kinds.map(k => [k, qualified.includes(k) ? [0] : []])),
      markers: Object.fromEntries(kinds.map(k => [k, qualified.includes(k) ? [{page_index: 0, qualified: true, content_evidence: {plan_headings: ['FLOOR PLAN'], row_matches: 2, column_header_count: 3}}] : []])),
      previews, errors: []};
  });
  const row = (reason, extras = {}) => ({sha256: null, url: 'https://fixture.invalid/queued.pdf', host: 'fixture.invalid', family: 'fake_portal', retrieved_at: '2026-10-09T10:02:00Z', bytes: 0, pages: null, http_status: null, outcome: 'skipped', reason, ...extras});
  const rows = [row('robots', {family: 'robots', outcome: 'robots', bytes: 7}), ...docs.slice(0, 2),
    row('Round cap: next file cannot fit remaining budget (Content-Length)'),
    // Audit after finished_at must still belong to the earlier round.
    row('Local listing audit', {retrieved_at: '2026-10-09T11:00:00Z', outcome: 'enumerated', bytes: 20}),
    row('robots', {family: 'robots', outcome: 'robots', bytes: 7}), docs[2],
    row('Round cap: next file cannot fit remaining budget (Content-Length)'),
    row('Round cap: not fetched after next file exceeded remaining budget'),
    row('Per-file cap (Content-Length)'), row('SHA256 already in corpus or harvested', {sha256: docs[0].sha256, bytes: 50})];
  fs.writeFileSync(path.join(dir, 'manifest.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const base = {file_cap: 150000000, round_cap: 500, saved_bytes: 300, robots: {}, stopped_at_round_cap: true, next_targets: []};
  write(dir, 'round' + numbers[0] + '.json', {...base, round_number: numbers[0], manifest_start_line: 0, started_at: '2026-10-09T10:00:00Z', finished_at: '2026-10-09T10:03:00Z', received_bytes: 320, remaining: [{url: 'one'}, {url: 'audit-added'}], blockers: ['Earlier blocker']});
  write(dir, 'round.json', {...base, round_number: numbers[1], manifest_start_line: 5, started_at: '2026-10-10T10:00:00Z', finished_at: '2026-10-10T10:03:00Z', round_cap: 400, received_bytes: 350, remaining: [{url: 'one'}], blockers: ['Later blocker A', 'Later blocker B'], from_remaining: {prior_round: numbers[0]}});
  write(dir, 'sources.json', {families: [{family: 'fake_portal', seeds: [docs[0].url]}], enumerators: []});
  write(dir, 'triage.json', triage);
  write(dir, 'round3-baseline.json', {counts: counts(0, 0, 1), sets: [docs[0]]});
  return {dir, docs, triage};
}

// These tracked data files must remain untouched even though both subprocesses
// run from a different cwd and import their scripts from the real clone.
const corpusFiles = ['triage.json', 'round.json', 'manifest.jsonl', 'REPORT-2026-10-09.md', 'round3-summary.json', 'verification.json'];

test('HARVEST_ROOT isolates reporting and verification; two rounds get disjoint classes and byte totals', t => {
  const before = corpusFiles.map(f => digest(path.join(scripts, f)));
  const {dir, docs} = fixture(t);
  pass(run(dir, 'verify.mjs'));
  pass(run(dir, 'report.mjs'));
  const a = read(dir, 'round3-summary.json'), b = read(dir, 'round4-summary.json');
  assert.deepEqual(a.class_counts, counts(0, 1, 1));
  assert.deepEqual(b.class_counts, counts(1, 0, 0));
  assert.equal(a.downloaded, 2);
  assert.equal(b.downloaded, 1);
  assert.deepEqual(a.downloads.map(d => d.sha256), docs.slice(0, 2).map(d => d.sha256));
  for (const [s, expected] of [[a, [320, 300, 500, 1, 2, 1]], [b, [350, 300, 400, 2, 1, 2]]]) {
    assert.deepEqual([s.received_bytes, s.saved_bytes, s.round_cap, s.skipped_at_cap, s.remaining, s.blocker_count], expected);
    assert.equal(s.new_downloads_by_family.fake_portal.bytes, 300);
  }
  assert.equal(a.manifest_end_line, b.manifest_start_line);
  assert.equal(a.started_at, '2026-10-09T10:00:00Z');
  assert.equal(b.finished_at, '2026-10-10T10:03:00Z');
  assert.equal(a.triaged, 2); // All triaged_at values are after BOTH harvests.
  const v = read(dir, 'verification.json');
  assert.equal(v.round_number, 4);
  assert.deepEqual(v.rounds.map(r => r.sha256_verified), [2, 1]);
  assert.equal(v.baseline_sha256_preserved, 1);
  const report = fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8');
  assert.match(report, /## Round 3\n/);
  assert.match(report, /## Round 4\n/);
  assert.match(report, /3 downloaded PDFs; 3 triaged; 600 saved bytes/);
  assert.match(report, /last recorded check for this round/);
  pass(run(dir, 'report-round3.mjs')); // Old entry point also follows N.
  assert.equal((fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8').match(/^## Round 4$/gm) || []).length, 1);
  assert.deepEqual(corpusFiles.map(f => digest(path.join(scripts, f))), before);
});

test('round numbers are arbitrary; no audit or review files required; budgets follow their own round', t => {
  const {dir} = fixture(t, [9, 10]);
  pass(run(dir, 'verify.mjs'));
  pass(run(dir, 'report.mjs'));
  assert.equal(read(dir, 'round10-summary.json').downloaded, 1);
  assert.equal(read(dir, 'verification.json').round_number, 10);
  const earlier = read(dir, 'round9.json');
  earlier.round_cap = 319;
  write(dir, 'round9.json', earlier);
  assert.match(run(dir, 'verify.mjs').stderr, /Round 9.*decimal round budget exceeded/);
});

test('legacy round2 filename supplies number and absent start offset; reserve accounting and duplicate current state', t => {
  const {dir} = fixture(t, [2, 3]);
  const prior = read(dir, 'round2.json');
  delete prior.round_number;
  delete prior.manifest_start_line;
  prior.interruption_reserve_bytes = 10;
  prior.received_bytes += 10;
  write(dir, 'round2.json', prior);
  fs.copyFileSync(path.join(dir, 'round.json'), path.join(dir, 'round3.json'));
  pass(run(dir, 'verify.mjs'));
  pass(run(dir, 'report.mjs'));
  assert.equal(read(dir, 'round2-summary.json').downloaded, 2);
  assert.equal(read(dir, 'round2-summary.json').interruption_reserve_bytes, 10);
  assert.equal((fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8').match(/^## Round 3$/gm) || []).length, 1);
});

test('missing previews list every affected record, page and exact safely quoted pdftoppm command', t => {
  const {dir, triage} = fixture(t);
  for (const r of triage) for (const p of Object.values(r.previews)) fs.unlinkSync(path.join(dir, p.path));
  const result = run(dir, 'verify.mjs');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing 3 preview\(s\)/);
  assert.doesNotMatch(result.stderr, /AssertionError/);
  assert.ok(result.stderr.includes(triage[1].sha256));
  assert.ok(result.stderr.includes(triage[2].sha256));
  assert.match(result.stderr, /page 1 \(index 0\)/);
  const quote = s => "'" + s.replaceAll("'", "'\"'\"'") + "'";
  for (const r of triage) for (const p of Object.values(r.previews)) {
    const prefix = path.resolve(dir, p.path).slice(0, -4);
    assert.ok(result.stderr.includes('pdftoppm -f 1 -l 1 -r 110 -png -singlefile ' + quote(path.resolve(dir, r.filename)) + ' ' + quote(prefix)));
  }
  assert.ok(!fs.existsSync(path.join(dir, 'verification.json')));
});

for (const kind of ['missing', 'changed']) test('earlier non-baseline download ' + kind + ' fails with round and SHA256', t => {
  const {dir, docs} = fixture(t);
  const file = path.join(dir, docs[1].filename);
  if (kind === 'missing') fs.unlinkSync(file);
  else {
    const data = fs.readFileSync(file);
    data[data.length - 1] = 65;
    fs.writeFileSync(file, data);
  }
  const result = run(dir, 'verify.mjs');
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('Round 3: ' + docs[1].sha256));
  assert.match(result.stderr, kind === 'missing' ? /downloaded PDF missing/ : /SHA256 changed/);
});

test('baseline filenames remain mandatory even when all current hashes pass', t => {
  const {dir} = fixture(t);
  const baseline = read(dir, 'round3-baseline.json');
  baseline.sets[0].filename = 'downloads/renamed.pdf';
  write(dir, 'round3-baseline.json', baseline);
  assert.match(run(dir, 'verify.mjs').stderr, /Baseline SHA256\/filename changed/);
});

test('earlier saved-byte and current received-byte mismatches fail', t => {
  const {dir} = fixture(t);
  const earlier = read(dir, 'round3.json');
  earlier.saved_bytes--;
  write(dir, 'round3.json', earlier);
  assert.match(run(dir, 'verify.mjs').stderr, /Round 3.*saved-byte accounting differs/);
  earlier.saved_bytes++;
  write(dir, 'round3.json', earlier);
  const current = read(dir, 'round.json');
  current.received_bytes++;
  write(dir, 'round.json', current);
  assert.match(run(dir, 'verify.mjs').stderr, /Round 4.*transfer accounting differs/);
});

test('missing preserved state and conflicting current/archive state are rejected', t => {
  const {dir} = fixture(t);
  fs.unlinkSync(path.join(dir, 'round3.json'));
  assert.match(run(dir, 'report.mjs').stderr, /Missing prior round/);
  const current = read(dir, 'round.json');
  write(dir, 'round4.json', {...current, saved_bytes: 0});
  assert.match(run(dir, 'verify.mjs').stderr, /Current and archived round 4 disagree/);
});

for (const polluted of [false, true]) test('historical report migration: ' + (polluted ? 'replace cumulative round-3 rewrite' : 'preserve true round-3 snapshot'), t => {
  const {dir} = fixture(t);
  const round2Text = '# Original report\n\nRound 2 historical text stays verbatim.\n';
  const method = 'Architectural and other plans have separate page/set flags. Historical method still true.';
  const table = classes.map(c => '| ' + c + ' | 0 | 0 | ' + (c === 'none' ? polluted ? 3 : 2 : 0) + ' |').join('\n');
  fs.writeFileSync(path.join(dir, 'REPORT-2026-10-09.md'), round2Text + '\n## Round 3 re-triage\n\n' + table + '\n\n' + method + '\n\nFull queue remains in round.json.\n');
  pass(run(dir, 'report.mjs'));
  const report = fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8');
  assert.ok(report.startsWith(round2Text));
  assert.ok(report.includes(method));
  if (polluted) {
    assert.match(report, /former generated totals included later downloads/);
    assert.ok(!report.includes(table));
  } else {
    assert.ok(report.includes(table));
    assert.match(report, /Full queue remains in round3.json/);
  }
  const history = report.split('<!-- harvest-round-report -->')[0];
  pass(run(dir, 'report.mjs'));
  assert.equal(fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8').split('<!-- harvest-round-report -->')[0], history);
});

test('report exposes missing triage and labels an older verification as stale', t => {
  const {dir, triage} = fixture(t);
  pass(run(dir, 'verify.mjs'));
  const v = read(dir, 'verification.json');
  v.round_number--;
  write(dir, 'verification.json', v);
  write(dir, 'triage.json', triage.slice(0, 2));
  pass(run(dir, 'report.mjs'));
  const summary = read(dir, 'round4-summary.json');
  assert.equal(summary.downloaded, 1);
  assert.equal(summary.triaged, 0);
  assert.deepEqual(summary.untriaged, [triage[2].sha256]);
  assert.match(fs.readFileSync(path.join(dir, 'REPORT-2026-10-09.md'), 'utf8'), /does not cover the current round/);
});
