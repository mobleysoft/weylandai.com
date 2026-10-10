import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root} from './common.mjs';

export const classes = ['complete', 'pair', 'schedule-only', 'spec-only', 'plan-only', 'none'];
export const classCounts = sets => Object.fromEntries(classes.map(c => [c, sets.filter(r => r.class === c).length]));
export const readJSON = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));

// The manifest is append-only. Offsets include robots, skips and audits, including
// audits appended after finished_at. triaged_at is deliberately NOT a round key:
// triage runs after harvesting and can reclassify older downloads at any time.
export function loadRounds(all) {
  const rounds = new Map();
  for (const name of fs.readdirSync(root).filter(n => /^round[1-9]\d*\.json$/.test(n))) {
    const number = Number(name.match(/\d+/)[0]);
    const state = readJSON(name);
    assert.ok(state.round_number == null || state.round_number === number, name + ': round_number disagrees with filename');
    rounds.set(number, {number, state, file: name});
  }
  const current = readJSON('round.json');
  // The interrupted/resumed original run was archived as round2.json.
  const number = current.round_number ?? 2;
  assert.ok(Number.isSafeInteger(number) && number > 0, 'round.json: invalid round_number');
  if (rounds.has(number)) assert.deepEqual(current, rounds.get(number).state, 'Current and archived round ' + number + ' disagree');
  rounds.set(number, {number, state: current, file: 'round.json'});
  const ordered = [...rounds.values()].sort((a, b) => a.number - b.number);
  assert.equal(ordered.at(-1).number, number, 'round.json must be the latest round');
  for (const [i, round] of ordered.entries()) {
    if (i) assert.equal(round.number, ordered[i - 1].number + 1, 'Missing preserved round before round ' + round.number);
    if (round.state.from_remaining) assert.ok(rounds.has(round.state.from_remaining.prior_round), 'Missing prior round for ' + round.file);
    round.start = round.state.manifest_start_line ?? (i === 0 ? 0 : NaN);
    assert.ok(Number.isSafeInteger(round.start) && round.start >= 0 && round.start <= all.length, round.file + ': invalid manifest_start_line');
    if (i === 0) assert.equal(round.start, 0, 'Missing round state for the start of the manifest');
    if (i) assert.ok(round.start >= ordered[i - 1].start, round.file + ': manifest offsets go backwards');
    if (i < ordered.length - 1) assert.ok(round.state.finished_at, round.file + ': prior round has not finished');
  }
  return ordered.map((round, i) => {
    const end = ordered[i + 1]?.start ?? all.length;
    const rows = all.slice(round.start, end);
    return {...round, end, rows, downloads: rows.filter(r => r.outcome === 'downloaded')};
  });
}

export function summarizeRound(round, triage, generatedAt) {
  const {state, downloads} = round;
  const byHash = new Map(triage.map(r => [r.sha256, r]));
  const sets = downloads.map(d => byHash.get(d.sha256)).filter(Boolean);
  const remaining = state.remaining || [];
  const atCap = round.rows.filter(r => r.outcome === 'skipped' && r.family !== 'robots' &&
    (/\bround cap\b/i.test(r.reason || '') ||
      (/^Stream cap/i.test(r.reason || '') && state.stopped_at_round_cap && remaining.some(p => p.url === r.url))));
  return {
    schema_version: 1,
    generated_at: generatedAt,
    round_number: round.number,
    state_file: round.file,
    started_at: state.started_at,
    finished_at: state.finished_at ?? null,
    manifest_start_line: round.start,
    manifest_end_line: round.end,
    attribution: 'manifest interval [start, end), downloaded SHA256 joined to current triage.json',
    round_cap: state.round_cap,
    file_cap: state.file_cap,
    received_bytes: state.received_bytes,
    saved_bytes: state.saved_bytes,
    interruption_reserve_bytes: state.interruption_reserve_bytes || 0,
    overflow_chunk_bytes: state.overflow_chunk_bytes || 0,
    downloaded: downloads.length,
    skipped_at_cap: atCap.length,
    remaining: remaining.length,
    blockers: state.blockers || [],
    blocker_count: (state.blockers || []).length,
    triaged: sets.length,
    untriaged: downloads.filter(d => !byHash.has(d.sha256)).map(d => d.sha256),
    class_counts: classCounts(sets),
    architectural_floor_plan_sets: sets.filter(r => r.floor_plan_architectural).length,
    new_downloads_by_family: Object.fromEntries([...new Set(downloads.map(r => r.family))].sort().map(f => {
      const docs = downloads.filter(r => r.family === f);
      return [f, {sets: docs.length, bytes: docs.reduce((n, r) => n + r.bytes, 0)}];
    })),
    downloads: downloads.map(({sha256, filename, bytes}) => ({sha256, filename, bytes})),
  };
}
