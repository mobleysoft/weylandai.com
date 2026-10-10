// g069: harvest round N over a fake queue. Unit tests on round-plan.mjs, then harvest.mjs run as a child
// over a temporary round directory (HARVEST_ROOT) whose work-left queue points at a local HTTP server:
// --dry-run lists and writes nothing; a real round 4 keeps robots rules, the round cap, manifest rows and
// round.json state; round 3's refusals are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs, oaWanted, remainingQueue, checkStart, priorFile, ROUND3_CAP, DEFAULT_CAP } from './round-plan.mjs';

const HARVEST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'harvest.mjs');
const oa = (base, name) => ({ url: base + '/bid/' + encodeURIComponent(name), family: 'missouri_oa_fmdc', kind: 'document', depth: 0 });

test('parseArgs: --round3 is --round 3 with the 1 GB cap; a plain run keeps 3 GB; --cap-bytes overrides', () => {
  assert.deepEqual(parseArgs(['--round3']), { round: 3, resume: false, dryRun: false, fromRemaining: false, capBytes: ROUND3_CAP });
  assert.deepEqual(parseArgs(['--round', '3']), parseArgs(['--round3']));
  assert.equal(parseArgs([]).capBytes, DEFAULT_CAP);
  assert.equal(parseArgs([]).round, null);
  const r4 = parseArgs(['--round', '4', '--cap-bytes', '2000000000', '--from-remaining', '--dry-run']);
  assert.deepEqual(r4, { round: 4, resume: false, dryRun: true, fromRemaining: true, capBytes: 2000000000 });
  assert.equal(parseArgs(['--round', '5', '--from-remaining']).capBytes, ROUND3_CAP);
});

test('parseArgs refuses what would reset or blur a round', () => {
  assert.throws(() => parseArgs(['--round3', '--resume']), /do not resume/);
  assert.throws(() => parseArgs(['--round', '4']), /needs --from-remaining/);
  assert.throws(() => parseArgs(['--from-remaining']), /needs --round N/);
  assert.throws(() => parseArgs(['--round', '3', '--from-remaining']), /round2\.json/);
  assert.throws(() => parseArgs(['--round', '2']), /from 3 up/);
  assert.throws(() => parseArgs(['--round', 'four', '--from-remaining']), /whole number/);
  assert.throws(() => parseArgs(['--round', '--from-remaining']), /needs a value/);
  assert.throws(() => parseArgs(['--round', '4', '--from-remaining', '--cap-bytes', '1e9']), /positive whole number/);
  assert.throws(() => parseArgs(['--round3', '--round', '4']), /disagree/);
});

test('remainingQueue keeps Missouri OA plans, specs, bid documents and addenda; drops bid tabs, IFBs, other families and what was downloaded', () => {
  const b = 'https://oa.mo.gov/sites/default/files/bid-opportunities';
  const prior = { round_number: 3, finished_at: 'x', remaining: [
    oa(b, '_C2403-01 Final Bid Plans.pdf'), oa(b, '_C2403-01 Final Bid Specs.pdf'), oa(b, '_C2403-01 Add 1_1.pdf'),
    oa(b, '_C2403-01 IFB.pdf'), oa(b, '_C2403-01 - Bid Tab .pdf'), oa(b, '_C2403-01 Final Bid Plans.pdf'),
    { url: b + '/x%20Plans.pdf', family: 'missouri_um_pdc', kind: 'document' }, oa(b, 'Z9999 Final Bid Docs.pdf'),
  ] };
  const visited = new Set([oa(b, 'Z9999 Final Bid Docs.pdf').url]);
  const q = remainingQueue(prior, visited).map(x => decodeURIComponent(x.url.split('/').pop()));
  assert.deepEqual(q, ['_C2403-01 Final Bid Plans.pdf', '_C2403-01 Final Bid Specs.pdf', '_C2403-01 Add 1_1.pdf']);
  assert.equal(oaWanted({ ...oa(b, 'R2416-01 Bid Tab.pdf') }), false);
});

test('checkStart: round N is refused once started, and needs round N-1 finished', () => {
  const o = parseArgs(['--round', '4', '--from-remaining']);
  assert.equal(priorFile(4), 'round3.json');
  assert.equal(priorFile(3), 'round2.json');
  assert.throws(() => checkStart(o, { round_number: 4 }, { round_number: 3, finished_at: 'x' }), /already started/);
  assert.throws(() => checkStart(o, { round_number: 3 }, { round_number: 3, finished_at: null }), /has not finished/);
  assert.throws(() => checkStart(o, { round_number: 2 }, { round_number: 2, finished_at: 'x' }), /not round 3/);
  assert.throws(() => checkStart(o, null, null), /No round 3 state/);
  assert.doesNotThrow(() => checkStart(o, { round_number: 3 }, { round_number: 3, finished_at: 'x' }));
  assert.throws(() => checkStart(parseArgs(['--round3']), { round_number: 3 }, null), /Round 3 already started/);
});

// The fake portal: robots.txt disallows /private/; each PDF is a distinct body of a known size.
const pdf = (tag, size) => Buffer.concat([Buffer.from('%PDF-1.4\n% ' + tag + '\n'), Buffer.alloc(size - 12 - tag.length, 32)]);
const BODIES = { 'A Final Bid Plans.pdf': pdf('A', 1000), 'B Final Specs.pdf': pdf('B', 1000), 'C Plans.pdf': pdf('C', 1000), 'F Addendum 1.pdf': pdf('F', 4000), 'G Final Bid Plans.pdf': pdf('G', 1000) };
function portal() {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    if (req.url === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /private/\n'); }
    const name = decodeURIComponent(req.url.split('/').pop());
    const body = BODIES[name];
    if (!body) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': body.length });
    res.end(body);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, hits, base: 'http://127.0.0.1:' + server.address().port })));
}
function fakeRound(base) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g069-round-'));
  const remaining = [oa(base, 'A Final Bid Plans.pdf'), oa(base, 'Z Bid Tab.pdf'), oa(base, 'B Final Specs.pdf'), oa(base, 'Y IFB.pdf'),
    { ...oa(base, 'C Plans.pdf'), url: base + '/private/' + encodeURIComponent('C Plans.pdf') }, oa(base, 'F Addendum 1.pdf'), oa(base, 'G Final Bid Plans.pdf'), oa(base, 'H Final Bid Plans.pdf')];
  const round3 = { started_at: '2026-10-09T09:43:45Z', round_number: 3, round_cap: 1000000000, received_bytes: 999553931, finished_at: '2026-10-09T09:49:52Z', stopped_at_round_cap: true, robots: {}, blockers: [], next_targets: [], remaining };
  fs.writeFileSync(path.join(dir, 'round.json'), JSON.stringify(round3, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify({ families: [], enumerators: [] }));
  // H was downloaded in an earlier round: the visited set keeps it out of round 4.
  fs.writeFileSync(path.join(dir, 'manifest.jsonl'), JSON.stringify({ sha256: 'f'.repeat(64), url: oa(base, 'H Final Bid Plans.pdf').url, family: 'missouri_oa_fmdc', outcome: 'downloaded', bytes: 9 }) + '\n');
  return dir;
}
const run = (dir, args) => new Promise(resolve => execFile(process.execPath, [HARVEST, ...args], { env: { ...process.env, HARVEST_ROOT: dir }, timeout: 60000 }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir).map(n => [n, fs.statSync(path.join(dir, n)).isFile() ? fs.readFileSync(path.join(dir, n), 'utf8') : 'dir']));

test('--round 4 --from-remaining --dry-run lists the work-left Missouri OA files and fetches and writes nothing', async () => {
  const { server, hits, base } = await portal();
  try {
    const dir = fakeRound(base);
    const before = snapshot(dir);
    const r = await run(dir, ['--round', '4', '--cap-bytes', '5000', '--from-remaining', '--dry-run']);
    assert.equal(r.code, 0, r.stderr);
    const lines = r.stdout.trim().split('\n');
    assert.deepEqual(lines.slice(0, -1).map(l => l.trim().split(' ').slice(2, -1).join(' ')), ['A Final Bid Plans.pdf', 'B Final Specs.pdf', 'C Plans.pdf', 'F Addendum 1.pdf', 'G Final Bid Plans.pdf']);
    assert.match(lines.at(-1), /^dry run: round 4, 5 files queued from round 3's 8 work-left URLs; round cap 5000 bytes, per-file cap 150000000 bytes; nothing fetched, nothing written$/);
    assert.deepEqual(hits, []);
    assert.deepEqual(snapshot(dir), before);
  } finally { server.close(); }
});

test('a real round 4 takes the queue, obeys robots and the round cap, logs every file to the manifest and keeps round.json state', { timeout: 60000 }, async () => {
  const { server, hits, base } = await portal();
  try {
    const dir = fakeRound(base);
    const r = await run(dir, ['--round', '4', '--cap-bytes', '5000', '--from-remaining']);
    assert.equal(r.code, 0, r.stderr);
    // round 3's finished state is preserved as round3.json, unchanged.
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'round3.json'))).received_bytes, 999553931);
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'round.json')));
    assert.equal(state.round_number, 4);
    assert.equal(state.round_cap, 5000);
    assert.equal(state.file_cap, 150000000);
    assert.deepEqual(state.from_remaining, { source: 'round3.json', prior_round: 3, prior_remaining: 8 });
    assert.equal(state.received_bytes, 2000);
    assert.equal(state.saved_bytes, 2000);
    assert.equal(state.stopped_at_round_cap, true);
    assert.equal(state.manifest_start_line, 1);
    assert.ok(state.finished_at);
    assert.deepEqual(state.remaining.map(x => decodeURIComponent(x.url.split('/').pop())), ['F Addendum 1.pdf', 'G Final Bid Plans.pdf']);
    assert.match(state.robots[base].policy, /apply User-agent \* Disallow/);
    // the private file was never requested; F was refused on Content-Length before its body was read.
    assert.deepEqual(hits.filter(h => h !== '/robots.txt').map(h => decodeURIComponent(h)), ['/bid/A Final Bid Plans.pdf', '/bid/B Final Specs.pdf', '/bid/F Addendum 1.pdf']);
    const rows = fs.readFileSync(path.join(dir, 'manifest.jsonl'), 'utf8').trim().split('\n').slice(1).map(JSON.parse);
    const out = rows.map(x => [x.family === 'robots' ? 'robots' : decodeURIComponent(x.url.split('/').pop()), x.outcome, x.reason || x.bytes]);
    assert.deepEqual(out, [
      ['robots', 'robots', 'apply User-agent * Disallow'],
      ['A Final Bid Plans.pdf', 'downloaded', 1000],
      ['B Final Specs.pdf', 'downloaded', 1000],
      ['C Plans.pdf', 'skipped', 'robots.txt Disallow: /private/'],
      ['F Addendum 1.pdf', 'skipped', 'Round cap: next file cannot fit remaining budget (Content-Length)'],
      ['G Final Bid Plans.pdf', 'skipped', 'Round cap: not fetched after next file exceeded remaining budget'],
    ]);
    assert.equal(fs.readdirSync(path.join(dir, 'downloads')).length, 2);
    // a second start of round 4 is refused and leaves its state alone.
    const again = await run(dir, ['--round', '4', '--from-remaining']);
    assert.notEqual(again.code, 0);
    assert.match(again.stderr, /Round 4 already started; do not reset its budget/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'round.json'))).finished_at, state.finished_at);
  } finally { server.close(); }
});

test('round 3 behaviour unchanged: --round3 refuses a started round 3 and a resume; as before, only an empty downloads/ is made', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g069-r3-'));
  fs.writeFileSync(path.join(dir, 'round.json'), JSON.stringify({ round_number: 3, finished_at: 'x', remaining: [] }));
  fs.writeFileSync(path.join(dir, 'sources.json'), JSON.stringify({ families: [], enumerators: [] }));
  const before = snapshot(dir);
  const r = await run(dir, ['--round3']);
  assert.match(r.stderr, /Round 3 already started; do not reset its budget/);
  const r2 = await run(dir, ['--round3', '--resume']);
  assert.match(r2.stderr, /Round 3 is a new capped round; do not resume round 2/);
  assert.deepEqual(snapshot(dir), { ...before, downloads: 'dir' });
  assert.deepEqual(fs.readdirSync(path.join(dir, 'downloads')), []);
});
