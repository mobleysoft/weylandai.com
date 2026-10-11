# g076: parallel truth runs

Implemented and measured locally on 2026-10-11 against `origin/main`
`0d07db79e62246b3e81463dc2919ebf147d2c8b7`, with Node v20.20.2 on arm64.
No dependencies, network access, reader/finder/scoring/comparison changes, or
regenerated committed truth records are part of this change.

## Design

`node tools/accuracy/truth_run.mjs --jobs N` defaults to 1. The default and
explicit `--jobs 1` use the existing serial processing path. Missing, zero,
negative, fractional, nonnumeric, and unsafe integer job counts are rejected.
Zero or one selected PDF also uses the serial path.

For multiple selected PDFs, the parent hashes one input at a time and retains
only its path, size, hash, original list index, metadata, and expected hash.
It filters `--only` before allocating workers. Descending byte size determines
assignment to the lightest shard; ties use original input index and then shard
number. Each shard processes its inputs in their original order. Inputs with
the same SHA16 stay in one shard, preserving the serial last-writer behavior
when different filenames refer to identical content. There are at most N
children (fewer when there are fewer distinct input hashes).

Each child is a separate Node process running `truth_run.mjs` itself. An internal
`--truth-shard` JSON manifest supplies the input snapshot; all original arguments
are passed through, including `--dir`, `--files`, `--only`, `--key-sets`,
`--non-harvest`, `--out`, and page/OCR options. The environment, including
`OCC_PDF`, and Node execution options are inherited. The child retains the usual
expected-hash validation and writes records directly into the shared output
directory using the unchanged JSON serialization.

Children never read or write the shared `queue.jsonl`. Each writes a private
JSONL journal under `OUT/.truth-shards-*/` after every completed PDF, including
its original index, record SHA16, serialized queue lines, and status log. A
PDF with zero disagreements still has a completion entry. Missing files,
per-file errors, and skips also have status entries.

After all children exit, the parent orders entries by original index. It keeps
old queue lines for hashes that were not successfully regenerated, preserving
their bytes and order; as before, invalid old JSON lines are discarded. It then
appends this run's lines in serial PDF and disagreement order, with the same
trailing newline, including for an empty queue. Status logs are replayed in
serial order after the children finish; child diagnostic output is also replayed.
The parent prints exactly one aggregate summary, counting distinct regenerated
hashes and all queue lines:

```text
truth records: 17 queue lines: 279 (279 from this run)
```

A nonzero child exit, signal, missing/incomplete journal, or malformed journal
makes the parent exit nonzero. Diagnostics name the shard manifest and unfinished
PDF paths (or all assigned paths for a shard that finished but reported errors).
Complete journal entries preceding a crash remain usable; unfinished hashes
retain their old queue entries. Failed shard manifests, journals, and diagnostics
remain available for inspection. Successful runs remove the temporary directory.
Requested hashes not regenerated still produce the existing explicit error.

## Tests and measured evidence

```sh
node --test tools/accuracy/truth/run_jobs.test.mjs
```

15 tests pass, 0 fail, 0 skipped. They cover deterministic splitting, duplicate
content and empty inputs, queue retention/order/counts, exact summary text,
separate processes and the concurrency cap, argument/environment forwarding,
nonzero exits, signal death, incomplete and truncated journals, and real CLI
runs for directory metadata, duplicate last-writer behavior, files, key sets,
non-harvest scope, `--only`, missing requests, and expected-hash mismatches.
The CLI equivalence test runs both actual readers on repository PDFs.

The timed corpus comparison selected all **17 available recorded non-harvest
PDFs**, including the six-page scanned Building with full default OCR. OCC
`fb3e0a8137da6cdf` was excluded explicitly and `OCC_PDF` was unset. The existing
`--non-harvest` missing-OCC check is preserved; the measurement uses `--only`
to express this exclusion. No other PDF was skipped or excluded.

Runs were sequential, with no concurrent test/benchmark process. Elapsed times
come from Node's monotonic `performance.now()` around child spawn through exit;
UTC start and finish timestamps come from the system clock.

| Run | Start UTC | Finish UTC | Elapsed | Exit |
| --- | --- | --- | ---: | ---: |
| Unmodified runner, default serial | 04:22:02.424 | 04:23:06.077 | 63.642 s | 0 |
| New runner, `--jobs 1` | 04:24:20.523 | 04:25:24.317 | 63.788 s | 0 |
| New runner, `--jobs 4` | 04:27:31.676 | 04:28:29.791 | 58.114 s | 0 |

Four jobs took 8.9% less elapsed time (1.10x speedup) on this small selection.
The scanned Building alone took 53.814 s at one job and 53.664 s at four jobs;
its six pages remain serial within one PDF, limiting the available speedup.
This does not establish a speedup for the full harvest. The Mac must measure
the full 891-PDF harvest at one and four jobs before merging. OCC and full-harvest
timings were not run here; peak RSS was not measured.

All three runs produced 17 records and the same 279-line, 66,134-byte queue.
The original/default run versus new `--jobs 1`, and new `--jobs 1` versus
`--jobs 4`, each have **zero non-timing byte differences**. The only differing
record fields are the existing top-level `ms`, top-level `generated_at`
(generation timestamp), and `ocr.pages[*].ms` (page OCR duration). These same
field paths differ between the two serial runs. No timing fields were removed
from generated records themselves.

The comparison checked record filenames and recursively checked differing
field paths, then removed only timing property lines from copies before a
byte diff, preserving all remaining whitespace, property order, and array order.
`queue.jsonl` was compared without any normalization. Its SHA-256 is:

```text
0a5569e26adddd88db1cda3ad68ed9397adbc48002b8ffc368a54ded79c5534b
```

Actual diff results (local artifacts are under `tmp/g076/`):

```text
diff -ru tmp/g076/original tmp/g076/jobs1
  exit 1: timing fields only (39 changed values in 17 records)
diff -ru tmp/g076/original-normalized tmp/g076/jobs1-normalized
  exit 0: no output
diff -ru tmp/g076/jobs1 tmp/g076/jobs4
  exit 1: timing fields only (40 changed values in 17 records)
diff -ru tmp/g076/jobs1-normalized tmp/g076/jobs4-normalized
  exit 0: no output
cmp tmp/g076/jobs1/queue.jsonl tmp/g076/jobs4/queue.jsonl
  exit 0: no output
```

Reproduce the selection and measured pair in fresh output directories:

```sh
node --input-type=module <<'NODE'
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { isNonHarvest } from './tools/accuracy/truth/inputs.mjs';
const dir = 'tools/corpus/harvest/truth';
const shas = readdirSync(dir).filter(f => /^[a-f0-9]{16}\.json$/.test(f))
  .map(f => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  .filter(isNonHarvest).filter(r => r.sha16 !== 'fb3e0a8137da6cdf')
  .map(r => r.sha16);
const env = { ...process.env };
delete env.OCC_PDF;
for (const jobs of [1, 4]) {
  const out = `tmp/g076-repeat/jobs${jobs}`;
  mkdirSync(out, { recursive: true });
  const started = new Date().toISOString(), start = performance.now();
  const run = spawnSync(process.execPath, ['tools/accuracy/truth_run.mjs',
    '--non-harvest', '--only', shas.join(','), '--jobs', String(jobs), '--out', out],
    { env, encoding: 'utf8' });
  const result = { jobs, started, finished: new Date().toISOString(),
    elapsed_ms: performance.now() - start, exit: run.status };
  writeFileSync(`${out}.log`, (run.stdout || '') + (run.stderr || ''));
  writeFileSync(`${out}-timing.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(result);
  if (run.status !== 0) process.exit(1);
}
for (const jobs of [1, 4]) {
  const input = `tmp/g076-repeat/jobs${jobs}`, out = `${input}-normalized`;
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(input)) {
    const raw = readFileSync(`${input}/${f}`, 'utf8');
    writeFileSync(`${out}/${f}`, f === 'queue.jsonl' ? raw
      : raw.replace(/^\s*"(?:ms|generated_at)":.*\n/gm, ''));
  }
}
NODE
cmp tmp/g076-repeat/jobs1/queue.jsonl tmp/g076-repeat/jobs4/queue.jsonl
diff -ru tmp/g076-repeat/jobs1-normalized tmp/g076-repeat/jobs4-normalized
```

## Mac landing recipe change

In the Mobley kernel's `etc/land/weylandai.json`, update **both `measure` and
`records`**. For every truth-run invocation in those commands, make this exact
command-prefix replacement, retaining its existing environment assignments,
selection arguments, `--dir`, `--out`, and other command tokens:

```diff
-node tools/accuracy/truth_run.mjs
+node tools/accuracy/truth_run.mjs --jobs 4
```

This applies to the harvest measurement on the merged tree and regeneration
on new main, and to any additional non-harvest/key-set truth-run invocations
in those two recipe commands. Comparison commands are unchanged. The recipe
is outside this clone and was not edited here. Measure the full harvest at
`--jobs 1` and `--jobs 4`, and compare normalized records and the unmodified
queue before adopting the recipe change.
