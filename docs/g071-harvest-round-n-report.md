# g071 — harvest reporting and verification follow round N

Work started 2026-10-10 09:22:22 EDT (13:22:22 UTC). Validation completed by 09:29:35 EDT (13:29:35 UTC), from the session clock. Work is in the supplied detached clone at `0e4be87da94e32a420aed2f60153fc57dee69bcd`. No network, npm packages, harvester execution or canonical corpus access was used.

## Behavior

`report.mjs` discovers preserved `round<N>.json` files and current `round.json`, orders them numerically and writes one generated section and `round<N>-summary.json` per round. It no longer delegates to a cumulative round-3 writer when the historical baseline exists. The old `report-round3.mjs` entry point now runs the same round-N report.

Membership comes from each round's `manifest_start_line` through the next round's start, joined to triage by downloaded SHA256. This is more reliable than `triaged_at`: triage normally runs after `finished_at`, and re-triage changes timestamps for earlier sets. The legacy unnumbered `round2.json` is inferred from its filename and starts at offset zero. Post-harvest audit rows stay with their round even when their timestamps are after its finish. Missing intermediate states, backwards offsets and conflicting current/archive states are rejected.

Each summary contains start/finish times, cap and file limit, charged received bytes, saved bytes, interruption reserve and discarded overflow bytes, downloads, skipped-at-cap records, remaining queue count, blocker list/count, classes for that round's added PDFs, architectural-plan count, missing triage keys, family counts/bytes, and the added SHA256/filename/byte inventory. Class counts reflect current triage, explicitly labelled as such. A separate report table shows the cumulative corpus. Skips at the cap and remaining queue counts are distinct; audits can change the latter. Per-file-only rejects do not count as round-cap skips.

Historical round-2 text remains. A historical round-3 snapshot with a class-table total matching the downloads through round 3 remains under a historical heading. If the old buggy writer replaced that snapshot with later cumulative totals, those totals are removed; true method notes are retained, and preserved state files supply the round's observations and listing audit. Generated round sections are replaced, not duplicated, on subsequent runs.

`verify.mjs` checks every round's own limits and byte accounting. It checks every downloaded file against its manifest size and SHA256, including earlier additions outside the baseline, and reports the owning round on a missing or changed PDF. The historical `round3-baseline.json` SHA256/filename check remains mandatory. The triage schema version is still 3; that is independent of the harvest round. Corpus-specific review checks apply when those records are present; numbered rounds do not require historical audit/review files by name. Verification results record the current round and each round's hash-check count. Reported verification is explicitly the last recorded check, with older results marked as outside the current scope.

Missing previews now yield all missing record IDs, preview kinds, one-based pages, zero-based indexes and absolute paths, followed by exact shell-quoted commands:

```sh
mkdir -p '/absolute/root/previews' && pdftoppm -f N -l N -r 110 -png -singlefile '/absolute/root/downloads/hash.pdf' '/absolute/root/previews/hash-kind-pN'
```

No rendering or triage changes happen inside verification. It exits 1 and does not write a success result until previews exist. The commands correctly quote spaces and apostrophes in `HARVEST_ROOT` and remove the `.png` suffix from the output prefix.

## Fake-round report

The local test creates two fake rounds, three PDF-signature fixture files with real SHA256 values, complete fake triage records and three tiny PNG previews. It runs report and verify as Node subprocesses with `HARVEST_ROOT` pointing at the fixture, from a different working directory. No HTTP server or Poppler is involved. Fixture timestamps below are deliberately synthetic input, not the work-session clock. Every record's triage timestamp is after both harvest windows.

| Field | Fake round 3 | Fake round 4 |
|---|---:|---:|
| Started (UTC, fixture) | 2026-10-09T10:00:00Z | 2026-10-10T10:00:00Z |
| Finished (UTC, fixture) | 2026-10-09T10:03:00Z | 2026-10-10T10:03:00Z |
| Manifest interval | [0, 5) | [5, 11) |
| Received bytes / cap | 320 / 500 | 350 / 400 |
| Saved bytes / cap | 300 / 500 | 300 / 400 |
| Downloaded | 2 | 1 |
| Skipped at round cap | 1 | 2 |
| Remaining | 2 | 1 |
| Blockers | 1 | 2 |
| Architectural floor-plan sets | 1 | 1 |

The report contains `## Round 3` and `## Round 4`, with this class distribution in their respective tables, and a separate `## Cumulative corpus` table:

| Class | Added in round 3 | Added in round 4 | Cumulative |
|---|---:|---:|---:|
| complete | 0 | 1 | 1 |
| pair | 0 | 0 | 0 |
| schedule-only | 0 | 0 | 0 |
| spec-only | 0 | 0 | 0 |
| plan-only | 1 | 0 | 1 |
| none | 1 | 0 | 1 |

The cumulative text reads `3 downloaded PDFs; 3 triaged; 600 saved bytes across all rounds.` Each fake family table has 300 saved bytes; round 3 has two additions and round 4 has one. `round3-summary.json` contains only the first two downloads, and `round4-summary.json` contains only the third. The earlier audit adds 20 received bytes after finish; the later duplicate transfer adds 50 received bytes without adding a PDF. Robots bytes do not consume either budget. Verification reports current round 4, three PDFs checked, one preserved baseline key and per-round hash counts `[2, 1]`.

## Validation

All passed on Node v20.20.2:

```sh
node --test tools/corpus/harvest/round-report.test.mjs
node --test --test-name-pattern='^(parseArgs|remainingQueue|checkStart)' tools/corpus/harvest/round-plan.test.mjs
node tools/corpus/harvest/check-plans.mjs
node tools/corpus/harvest/check-row-shapes.mjs
```

The new suite has 12 passing tests: two-round attribution/accounting, arbitrary rounds 9/10, legacy round-2 offset and interruption reserve, duplicate current/archive handling, missing-preview commands, missing/changed earlier non-baseline files, baseline filename preservation, byte-accounting failures, missing/conflicting states, preservation of a true historical report, correction of a polluted one, and missing-triage/stale-verification reporting. It hashes the clone's tracked corpus data before and after the subprocesses to confirm `HARVEST_ROOT` isolation. Four pure round-plan tests passed; the three tests that invoke the harvester were deliberately skipped. Plan and schedule checks passed.

A read-only metadata check of the clone (without running report or verify against it) found 459 PDFs in the round-2 manifest interval and 139 in round 3. Round 3's own saved bytes are 998,371,271. Its additions currently classify as complete 0, pair 0, schedule-only 12, spec-only 11, plan-only 23, none 93. This confirms that the earlier cumulative 598-set total is not used as round 3's additions. No generated corpus data file was changed.

## Changed files

- `tools/corpus/harvest/round-data.mjs`: shared round discovery, manifest boundaries and summary calculation.
- `tools/corpus/harvest/report.mjs`: round sections/summaries, historical migration, cumulative tables and scoped verification display.
- `tools/corpus/harvest/report-round3.mjs`: compatibility entry point to round-N reporting.
- `tools/corpus/harvest/verify.mjs`: all-round integrity/accounting and actionable missing-preview diagnostics.
- `tools/corpus/harvest/round-report.test.mjs`: offline fixture regression tests.
- `tools/corpus/harvest/README.md`: root handling, summary semantics, history migration, verification and test usage.
- `docs/g071-harvest-round-n-report.md`: this report.

All data paths continue to use `common.mjs`'s `HARVEST_ROOT`. That behavior was already present in the other harvest scripts, so they did not need changes.

## Limits and handoff

The actual Mac round-4 corpus was not read, regenerated, hashed or verified here. The reported 293 additions, 891 cumulative PDFs and preview recovery remain for the Mac to validate with the same `HARVEST_ROOT`, using `verify.mjs` then `report.mjs` after any missing previews are rendered. This clone only contains the older metadata. If the previous report already overwrote round-3 historical classifications, their exact prior values cannot be reconstructed from current triage; the report says so instead of inventing them.

No PR or commit was made. The session marks `.git` read-only, so changes remain in the working tree; the delivery also includes `g071.patch` against local `origin/main` and `report.md` in the requested sibling `scratchpad/g071/` directory. Pre-existing untracked `tmp/` content was left alone. The patch excludes all corpus data and includes the three new source/document files without staging them.
