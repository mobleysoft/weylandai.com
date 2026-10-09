// Recover unchanged HEAD dependencies omitted by the sparse checkout. Git is
// read-only; never overwrite an existing worktree file or change the index.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
const files = [
  'tools/accuracy/truth/pdf.mjs', 'tools/accuracy/truth/reader_a.mjs',
  'tools/accuracy/truth/ocr.mjs', 'tools/accuracy/truth/agree.mjs',
  'tools/bidset/out/truth-doors.json', 'tools/bidset/out/weylandai-building-bidset.pdf',
  'tools/bidset/out/weylandai-building-bidset-scanned.pdf',
];
for (const path of files) {
  const bytes = execFileSync('git', ['show', 'HEAD:' + path], { maxBuffer: 128 * 1024 * 1024 });
  if (existsSync(path)) {
    if (!readFileSync(path).equals(bytes)) throw new Error('Existing file differs: ' + path);
  } else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); }
  console.log('Unchanged HEAD test dependency: ' + path);
}
