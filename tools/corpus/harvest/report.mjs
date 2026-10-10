import fs from 'node:fs';
import path from 'node:path';
import {root, now, records, writeJSON} from './common.mjs';
import {classes, classCounts, readJSON, loadRounds, summarizeRound} from './round-data.mjs';

const all = records(), triage = readJSON('triage.json'), rounds = loadRounds(all);
const generatedAt = now(), summaries = rounds.map(r => summarizeRound(r, triage, generatedAt));
const docs = all.filter(r => r.outcome === 'downloaded');
const marker = '<!-- harvest-round-report -->';
const reportPath = path.join(root, 'REPORT-2026-10-09.md');
let history = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8').split(marker)[0].trimEnd() : '# Public bid-document harvest';

// Migrate the old generated section once. A genuine historical snapshot stays
// intact; the buggy cumulative rewrite must not remain labelled as round 3.
const legacyStart = history.indexOf('\n## Round 3 re-triage');
if (legacyStart !== -1) {
  const legacy = history.slice(legacyStart);
  const round = rounds.find(r => r.number === 3);
  const throughRound = round ? all.slice(0, round.end).filter(r => r.outcome === 'downloaded').length : null;
  const table = [...legacy.matchAll(/^\| (?:complete|pair|schedule-only|spec-only|plan-only|none) \| \d+ \| \d+ \| (\d+) \|$/gm)];
  history = history.slice(0, legacyStart).trimEnd();
  history += '\n\n## Historical re-triage (round 3)\n\n';
  if (table.length === classes.length && table.reduce((n, m) => n + Number(m[1]), 0) === throughRound) {
    history += 'Archived snapshot through round 3; later totals are in the generated round sections below.\n\n';
    history += legacy.replace(/^\n## Round 3 re-triage\n+/, '').replace('Full queue remains in round.json.', 'Full queue remains in round3.json once round 3 is archived.');
  } else {
    history += 'The former generated totals included later downloads and have been replaced by the scoped round sections below. The original classification snapshot cannot be recovered from a later triage.json. Historical method notes are retained here.\n\n';
    history += legacy.split(/\n\n/).filter(p => /^(Architectural and other plans have separate|For sets over 200 pages, classification examines)/.test(p)).join('\n\n');
  }
}

const lines = [marker, '', '## Round accounting', '',
  'Generated ' + generatedAt + '. All timestamps below are UTC from the recorded clock. Each round is the manifest interval from its start offset up to the next round\'s start (or the current manifest end), joined to triage.json by SHA256. Triage timestamps can fall after harvesting or change during re-triage.', '',
  'Class counts use the current triage classifications of only the PDFs added in that round. Missing triage is reported separately. The historical text above describes its dated snapshot; the cumulative table below describes the current corpus.', '',
  'Received bytes are the charged document/HTML transfer budget; saved bytes are downloaded PDFs. Robots bytes are excluded. Skipped-at-cap counts are manifest records, distinct from the final remaining queue, which can be changed by a later listing audit.'];

for (const [i, round] of rounds.entries()) {
  const s = summaries[i];
  lines.push('', '## Round ' + s.round_number, '',
    'State: ' + s.state_file + '; summary: round' + s.round_number + '-summary.json. Manifest rows [' + s.manifest_start_line + ', ' + s.manifest_end_line + ') (zero-based).', '',
    '- Started: ' + s.started_at + '; finished: ' + (s.finished_at ?? 'not finished') + '.',
    '- Received: ' + s.received_bytes + ' / ' + s.round_cap + ' bytes; saved: ' + s.saved_bytes + ' / ' + s.round_cap + ' bytes. Per-file cap: ' + s.file_cap + ' bytes.',
    '- Downloaded: ' + s.downloaded + '; skipped at cap: ' + s.skipped_at_cap + '; remaining: ' + s.remaining + '; blockers: ' + s.blocker_count + '.',
    '- Triaged: ' + s.triaged + '; untriaged: ' + s.untriaged.length + '; architectural floor-plan sets: ' + s.architectural_floor_plan_sets + '.', '',
    '| Class | Sets added this round |', '|---|---:|');
  for (const c of classes) lines.push('| ' + c + ' | ' + s.class_counts[c] + ' |');
  lines.push('', '| Family | PDFs added | Saved bytes |', '|---|---:|---:|');
  for (const [family, value] of Object.entries(s.new_downloads_by_family)) lines.push('| ' + family + ' | ' + value.sets + ' | ' + value.bytes + ' |');
  if (s.interruption_reserve_bytes) lines.push('', s.interruption_reserve_bytes + ' received bytes are the preserved interruption reserve.');
  if (s.overflow_chunk_bytes) lines.push('', s.overflow_chunk_bytes + ' overflow chunk bytes were discarded, not saved or included in the charged transfer budget.');
  if (s.untriaged.length) lines.push('', 'Untriaged SHA256 keys: ' + s.untriaged.join(', ') + '.');
  if (s.blocker_count) lines.push('', '### Blockers', '', ...s.blockers.map(b => '- ' + b));
  if (round.state.pdc_observations?.length) lines.push('', '### UM PDC observations', '', ...round.state.pdc_observations.map(o => '- ' + o.url + ': ' + o.description));
  if (round.state.oa_listing_audit) {
    const a = round.state.oa_listing_audit;
    lines.push('', '### Final OA listing audit', '', a.reason + ' ' + a.public_pdf_links + ' relevant public PDF links; ' + a.queue_urls_added + ' additional URLs added to the remaining queue. ' + a.bytes + ' HTML bytes charged to this round. Registration text: ' + (a.registration_text || []).join(' | '));
  }
}

lines.push('', '## Cumulative corpus', '', docs.length + ' downloaded PDFs; ' + triage.length + ' triaged; ' + docs.reduce((n, r) => n + r.bytes, 0) + ' saved bytes across all rounds.', '',
  '| Class | Cumulative sets |', '|---|---:|');
const counts = classCounts(triage);
for (const c of classes) lines.push('| ' + c + ' | ' + counts[c] + ' |');
lines.push('', '| Family | Downloaded PDFs | Saved bytes |', '|---|---:|---:|');
for (const family of [...new Set(docs.map(r => r.family))].sort()) {
  const rows = docs.filter(r => r.family === family);
  lines.push('| ' + family + ' | ' + rows.length + ' | ' + rows.reduce((n, r) => n + r.bytes, 0) + ' |');
}

const baselinePath = path.join(root, 'round3-baseline.json');
if (fs.existsSync(baselinePath)) {
  const baseline = readJSON('round3-baseline.json'), keys = new Set(baseline.sets.map(r => r.sha256));
  const existing = triage.filter(r => keys.has(r.sha256)), after = classCounts(existing);
  lines.push('', '### Historical baseline re-triage', '',
    'round3-baseline.json retains the before counts and original SHA256 keys. The current column below contains only those original ' + keys.size + ' sets (' + existing.length + ' currently triaged), not later downloads.', '',
    '| Class | Before re-triage | Current, original sets only |', '|---|---:|---:|');
  for (const c of classes) lines.push('| ' + c + ' | ' + (baseline.counts[c] || 0) + ' | ' + after[c] + ' |');
}
lines.push('', '### Current complete candidates', '', 'These are automated content candidates; previews require visual review. Page indexes are zero-based.');
for (const r of triage.filter(r => r.class === 'complete')) {
  lines.push('', '- ' + r.sha256 + ': ' + r.url);
  for (const k of ['door_schedule', 'hardware_spec', 'floor_plan_architectural']) lines.push('  ' + k + ' indexes: ' + (r.qualified_page_indexes[k] || []).join(', ') + '.');
  for (const [k, p] of Object.entries(r.previews || {})) lines.push('  ' + k + ' preview: ' + p.path + '.');
}
if (fs.existsSync(path.join(root, 'sightx_candidates.json'))) {
  const sight = readJSON('sightx_candidates.json');
  lines.push('', '### Current SightX top ten', '', 'Current ranking and page evidence are in sightx_candidates.json.', '');
  for (const c of sight.candidates.slice(0, 10)) lines.push(c.rank + '. ' + c.sha16 + ' — ' + c.reason);
  lines.push('', '### Current correction of the review top five', '');
  for (const c of sight.review_top_five || []) lines.push('- ' + c.sha16 + ' (current rank ' + c.rank + '): ' + c.correction);
}
const failures = triage.filter(r => r.errors?.length);
if (failures.length) lines.push('', '### Current triage errors', '', ...failures.map(r => '- ' + r.sha256 + ': ' + r.errors.join('; ')));
lines.push('', '## Latest recorded verification', '');
if (fs.existsSync(path.join(root, 'verification.json'))) {
  const v = readJSON('verification.json');
  const matches = v.round_number === rounds.at(-1).number && v.downloaded === docs.length && v.received_bytes === rounds.at(-1).state.received_bytes && v.manifest_lines === all.length;
  lines.push(v.outcome + ' at ' + v.verified_at + '; recorded round: ' + (v.round_number ?? 'unspecified (legacy result)') + '; ' + v.downloaded + ' PDFs; ' + v.triaged + ' triaged. ' + v.checks + '.', '',
    matches ? 'This is the last recorded check for this round and manifest size; reporting does not rerun verification.' : 'This result does not cover the current round and manifest. Run verify.mjs, then report.mjs.');
} else lines.push('No verification.json found. Run verify.mjs, then report.mjs.');

for (const s of summaries) writeJSON('round' + s.round_number + '-summary.json', s);
fs.writeFileSync(reportPath, history.trimEnd() + '\n\n' + lines.join('\n') + '\n');
console.log(JSON.stringify({generated_at: generatedAt, rounds: summaries.map(s => ({round_number: s.round_number, downloaded: s.downloaded, class_counts: s.class_counts})), cumulative_downloaded: docs.length}, null, 2));
