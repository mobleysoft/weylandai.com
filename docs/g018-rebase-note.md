G018 rebase note

Validated at: 2026-10-09 12:44:53 EDT
Original local commit: 04b3a5245a04c640e33d0deab182c60f6cfc8101
Fetched origin/main: 21ccfb264e572154a7f8c3855a4e9711bd7c0362

The original worktree stores its Git metadata under /Users/johnmobley/weylandai.com/.git,
which this session cannot write. Its git fetch origin failed with Operation not permitted.
The rebase was completed in the isolated checkout /private/tmp/g018-rebase.3fDkg6,
on branch g018-rebased. The original checkout was left unchanged. Nothing was pushed.

Conflicts resolved (5 paths):
- weyland-sightx-worker/src/pages/sightx.html: retain the S0 input include and current
  controls version, plus the defect commit's experience version.
- weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs:
  use a distinct combined reader version, 20261009g004-g018.
- weyland-subx-worker/src/pages/subx-app.html: retain the defect workspace changes
  and use the combined reader version.
- weyland-subx-worker/assets/client-ocr/grid-runner.html: restore origin/main intact.
- weyland-subx-worker/assets/client-ocr/schedule-grid-extraction-client.mjs.bin:
  restore origin/main intact.

OCR build fallback required by the task:
No client-ocr-src build step exists in weyland-subx-worker/package.json, the root
package.json, or tracked build files. build.py regenerates the root worker's pages;
src/vendor/build-pdfjs-text.mjs builds a separate server-side PDF.js vendor module.
Neither builds the client OCR assets or grid-runner.html.
All client-ocr assets already present on origin/main, including the automatically
merged schedule-text-layer.mjs.bin, were restored byte-for-byte to origin/main.
No .bin or grid-runner.html output was hand-merged or rebuilt.
The new schedule-workspace.mjs.bin has no origin/main counterpart and was retained
byte-for-byte from the defect commit; it still exactly matches its source and is
required by the new workspace route. It was not merged.

Reader A's source fixes survive with only the defect commit's five added source
lines (hardware-spec references and alternate pricing). The server text-layer
entry point and the S0 shared controls, input, app page and root world page are
identical to origin/main. All seven defect fixes remain in source.
Because of the requested no-build fallback, the served browser text-layer asset
still lacks the new alternate-pricing and hardware-spec-reference fields. Those
browser additions require an asset rebuild before claiming full deployed parity.
The source/server tests below do not establish parity with those retained assets.

Validation:
node --experimental-vm-modules --test --test-concurrency=1 --test-reporter=tap
was run on all six test files touched by the local and upstream changes, plus
the two directly affected reader suites:
- tools/user-simulation/estimator-dom-regression.test.mjs
- tools/user-simulation/sightx-mobile-regression.test.mjs
- weyland-subx-worker/test/estimator-defects.test.mjs
- weyland-subx-worker/test/subx-workspace.test.mjs
- weyland-subx-worker/test/text-layer-harvest.test.mjs
- weyland-subx-worker/test/text-layer-read.test.mjs
- weyland-subx-worker/test/schedule-text-layer.test.mjs
- weyland-subx-worker/test/door-cells.test.mjs
Tests: 61 passed, 0 failed, 0 skipped, 0 cancelled.
node --check: all 30 changed .mjs/.js files since b737fdf passed, 0 failures.
Dependency installation used npm ci with the committed lockfile and lifecycle
scripts disabled; package manifests and lockfiles were not changed.
Validation logs: /private/tmp/g018-rebase-validation/tests.tap and syntax.json.
