// Process orchestration only: readers, scoring and record serialization stay in truth_run.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export function parseJobs(argv) {
  const i = argv.indexOf('--jobs');
  if (i < 0) return 1;
  const value = argv[i + 1];
  if (!/^[1-9]\d*$/.test(value || '') || !Number.isSafeInteger(Number(value))) {
    throw new Error('--jobs must be a positive integer');
  }
  return Number(value);
}

// Largest byte groups first; ties use the original index, then the lowest shard number.
// Identical content stays in one process, so the last serial occurrence still owns its record.
// Within each shard, preserve serial order (including repeated paths/content).
export function splitShards(entries, jobs) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.sha16 || entry.file;
    if (!groups.has(key)) groups.set(key, { entries: [], bytes: 0, index: entry.index });
    const group = groups.get(key);
    group.entries.push(entry);
    group.bytes += entry.bytes || 0;
  }
  const shards = Array.from({ length: Math.min(jobs, groups.size) }, () => ({ entries: [], bytes: 0 }));
  const ordered = [...groups.values()].sort((a, b) => b.bytes - a.bytes || a.index - b.index);
  for (const group of ordered) {
    // Fill empty shards even when every input is empty or missing.
    const target = shards.find(s => !s.entries.length) || shards.reduce((a, b) => b.bytes < a.bytes ? b : a);
    target.entries.push(...group.entries);
    target.bytes += group.bytes;
  }
  return shards.map(s => s.entries.sort((a, b) => a.index - b.index));
}

export function mergeQueue(previous, results) {
  const ordered = [...results].sort((a, b) => a.index - b.index);
  const done = new Set(ordered.filter(r => r.sha16).map(r => r.sha16));
  const kept = previous.split('\n').filter(Boolean).filter(line => {
    try { return !done.has(JSON.parse(line).sha16); } catch { return false; }
  });
  const added = ordered.flatMap(r => r.queue || []);
  return { text: kept.concat(added).join('\n') + '\n', done,
    keptCount: kept.length, runCount: added.length, totalCount: kept.length + added.length };
}

export function summaryLine(records, total, added) {
  return `truth records: ${records} queue lines: ${total} (${added} from this run)`;
}

// Each completed PDF is journaled immediately. Even if a later PDF kills the process,
// completed queue entries survive and the remaining filenames can be reported precisely.
export async function runShards({ entries, jobs, out, script, argv, log = console.log, error = console.error }) {
  const work = mkdtempSync(join(out, '.truth-shards-'));
  const shards = splitShards(entries, jobs).map((items, i) => {
    const manifest = join(work, `shard-${i + 1}.json`);
    const queueFile = join(work, `shard-${i + 1}.jsonl`);
    const logFile = join(work, `shard-${i + 1}.log`);
    writeFileSync(manifest, JSON.stringify({ entries: items, queueFile }));
    return { items, manifest, queueFile, logFile };
  });
  const statuses = await Promise.all(shards.map(shard => new Promise(resolve => {
    const fd = openSync(shard.logFile, 'w');
    const child = spawn(process.execPath, [...process.execArgv, script, ...argv, '--truth-shard', shard.manifest],
      { stdio: ['ignore', fd, fd] });
    closeSync(fd);
    let spawnError;
    child.on('error', e => { spawnError = e.message; });
    child.on('close', (code, signal) => resolve({ code, signal, spawnError }));
  })));
  const results = [];
  let errors = 0;
  for (const [i, shard] of shards.entries()) {
    const status = statuses[i];
    const completed = new Set();
    let journalError;
    try {
      for (const line of readFileSync(shard.queueFile, 'utf8').split('\n').filter(Boolean)) {
        const r = JSON.parse(line);
        if (!shard.items.some(e => e.index === r.index) || completed.has(r.index) ||
            !Array.isArray(r.queue) || r.queue.some(q => typeof q !== 'string') || typeof r.log !== 'string') {
          throw new Error('invalid PDF result');
        }
        completed.add(r.index);
        results.push(r);
      }
    } catch (e) { journalError = e.message; }
    const unfinished = shard.items.filter(e => !completed.has(e.index));
    if (status.code !== 0 || journalError || unfinished.length) {
      errors++;
      error(`truth shard failed: ${shard.manifest} (${status.spawnError || status.signal || `exit ${status.code}`}${journalError ? `; ${journalError}` : ''})`);
      error(`PDFs ${unfinished.length ? 'not completed' : 'assigned'}: ${(unfinished.length ? unfinished : shard.items).map(e => e.file).join(', ')}`);
    }
    const diagnostics = readFileSync(shard.logFile, 'utf8');
    if (diagnostics) error(diagnostics.trimEnd());
  }
  for (const r of [...results].sort((a, b) => a.index - b.index)) log(r.log);
  const queueFile = join(out, 'queue.jsonl');
  const merged = mergeQueue(existsSync(queueFile) ? readFileSync(queueFile, 'utf8') : '', results);
  writeFileSync(queueFile, merged.text);
  log(summaryLine(merged.done.size, merged.totalCount, merged.runCount));
  // Keep failed shards' manifests, journals and diagnostics available for inspection.
  if (!errors) rmSync(work, { recursive: true, force: true });
  return { ...merged, errors };
}
