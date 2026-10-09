Resolved source and served twin; no requested behavior lost in the available validation.

- Hunk 1: retain lastByGridRow/lastUnruled; ruled text keeps main's centroid/0.35h grouping, unruled text keeps g030's minY-span/0.4h grouping.
- Hunk 2: initialize minY/maxY on every line while retaining grid_row and keyed registration; update maxY on joins.
- Hunk 3: location-based mark join first, then validity and continuation-row handling, so recovered marks affect classification without splitting a physical row.
- Retained upward gap-group header expansion, 20h separation, NAME vocabulary, DOOR # end boundary, location-based final mark reconstruction, row words/confidences and unresolved-row handling.
- Integration guard: a detected ruled header cannot widen through an unruled title/side legend; unruled staggered-header expansion is unchanged. This preserves both scan and harvest counts.
- Source/twin: byte-identical, no conflict markers, git diff --check clean; SHA-256 6b226d29812a313d46e0792ceca961b6b1a792e5de747fb0552f24d754a580b5.
- Full node --test with committed bidset fixtures: 131 tests, 125 pass, 6 fail, 0 skipped; identical failures with the 4b8822d reader, no main pass lost and no new failure.
- Fresh ARCH D check with HEAD fixtures: 4/4 tests pass; 48/48 marks, 336/336 fields, 0 extras; OCR 17.840 seconds. Main also scores 48/48 and 336/336; final full-suite scan repeats this score.
- Reader A: R2502 7478006f7fd5b43c = 211; T2507 192a16af8f31ae0c = 46; T2504 e3d0cc1bc22fd824 = 22. Fresh truth_run exit 0, no reader notes.
- OCC: no PDF under tools/corpus or tools/accuracy; 42/42 marks and 245/252 fields were not remeasured.

The same six full-suite failures on main and merged source:
- client-ocr-assets-in-sync: every client-ocr-src module equals its served .bin twin — pre-existing untracked schedule-text-layer-debug.mjs has no served twin.
- estimator-defects.test.mjs — sparse worktree omits tools/user-simulation/lib/estimator-assertions.mjs.
- rockford-sample.test.mjs — sparse worktree omits tools/samples/build-rockford-sample.mjs.
- scanned-sheet-review: committed browser scan is qualified, duplicated 214 is flagged, and unread sizes are excluded — stale 47-row expectation against the committed 48-row receipt.
- scanned-sheet-review: an explicit expected-mark checklist reports missing 111 and 211 — stale expectation; the receipt contains both marks.
- scanned-sheet-review: the actual app tiles and partial summary display qualifications — stale duplicate/missing-mark expectations against the corrected receipt.

Evidence: [comparison](G030-validation/test-comparison.json), [full test log](G030-node-test.log), [fresh scan](G030-validation/arch-d-node-test.log), [main scan](G030-validation/arch-d-main-node-test.log), [truth run](G030-validation/truth-run.log). Fresh per-set JSON records are in G030-validation. Truth runner used --files for the three read-only harvest PDFs and comma-separated --only hashes, as required by its CLI.
Only the two conflicted tracked files have content changes. Git refs were untouched and no staging commands were run; truth records/queue were restored. Four bidset fixtures were materialized byte-for-byte from HEAD. The Mac can stage the resolved files and continue the rebase.
