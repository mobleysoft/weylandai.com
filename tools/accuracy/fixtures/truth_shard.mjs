// A real child process for orchestration tests; no PDF readers involved.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const { entries, queueFile } = JSON.parse(readFileSync(value('--truth-shard'), 'utf8'));
const events = value('--events');
const event = kind => appendFileSync(events, JSON.stringify({ kind, pid: process.pid, args, occ: process.env.OCC_PDF }) + '\n');
event('start');
writeFileSync(queueFile, '');
for (const entry of entries) {
  if (entry.fail === 'exit') process.exit(23);
  if (entry.fail === 'signal') process.kill(process.pid, 'SIGTERM');
  if (entry.fail === 'incomplete') break;
  if (entry.fail === 'journal') { appendFileSync(queueFile, '{truncated'); break; }
  await new Promise(resolve => setTimeout(resolve, entry.delay || 10));
  appendFileSync(queueFile, JSON.stringify({ index: entry.index, sha16: entry.sha16,
    queue: entry.queue || [], log: entry.file }) + '\n');
}
event('end');
