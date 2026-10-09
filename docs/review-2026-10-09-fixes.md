# G034 — scanned-sheet review fixes, 2026-10-09

Scope: F1–F4 from `review-2026-10-09-landings.md`. Work stayed in this detached worktree. Git was read-only; no commit, deployment, production write or Chromium launch.

| Finding | Fix | Executed Node evidence | What remains |
| --- | --- | --- | --- |
| F1: unbounded detection and table renders | A shared render planner caps rounded canvas dimensions at 36,000,000 pixels, or the caller's lower limit. Whole-sheet, orientation, fallback detection, cropped-table and text-rule renders use it before canvas creation. DPI can fall below 300, down to 18. Pages that cannot fit are refused with page number, point dimensions and pixel limit. Canvas height is cleared before width changes to prevent an oversized intermediate allocation. | The review's 14,400 × 14,400 pt allocation spy makes nine render requests, each ≤36,000,000 pixels. Whole-page and table renders with a 1,000,000-pixel budget both reduce to 50 DPI. A 144,000 × 144,000 pt page is refused with zero canvas allocations. A wide, short page also stays bounded during dimension assignments. | This bounds each render, not aggregate browser memory or the accuracy available at low DPI. Mac browser verification remains. |
| F2: unbounded cell recognition and no cancellation | A shared page budget permits at most 2,000 recognition calls and 60,000 ms elapsed. Orientation, cell reads, dimension retries and legacy row reads share the budget. Rows yield to the event loop; each cell/retry checks the abort signal and limits. Results expose `partial`, reason, counts and elapsed time. Partial scans cannot restart through fallback, become `done:true`, or increment session completion counters. STOP READING passes an AbortSignal; guest, saved and page-read messages disclose incomplete reads. | The review's 1200 × 1200, 12-pixel-grid probe stops at exactly 2,000 calls rather than 9,802. A deterministic clock stops after two 6-ms calls against a 10-ms limit. Timer-triggered abort stops within one 99-cell row; synchronous abort stops after one cell. Retry, PDF-caller, persistence and actual stop-handler tests pass. | Cancellation/time enforcement is cooperative: an active synchronous WASM call finishes before the next check. There is no terminable OCR worker in this change. |
| F3: fabricated confidence and unqualified totals | OCR word confidences survive cell grouping, wrapped rows, dimension retries, parsing and persistence. A field uses the minimum confidence of its contributing words; unread dimensions have zero confidence. Guest and saved rows share the 80% review threshold. Tiles and CSV expose OCR row/field counts, below-threshold counts, confidence availability, duplicate warnings and completeness qualifications. Uncertain/unparsed sizes are excluded from By size. Same-page duplicate occurrences get stable separate persistence keys. | Replaying the committed browser scan through `guestDetail` keeps 47 rows / 46 unique marks, flags both 214 occurrences, marks historical uniform 0.85 stamps as unavailable measurements, and qualifies totals and CSV. Supplying the vector result's expected-mark checklist reports missing 111 and 211. Measured 0.42 hardware and 0.72 fire confidences trigger warnings; real-parser and saved-row tests preserve per-field values. SQLite replay retains both conflicting 214 rows without creating new copies. The app's actual tile renderer is executed in Node. | Historical stamped confidences cannot be recovered; reread the source for measurements. Missing marks can be named only when an explicit expected-mark checklist is supplied (`expectedMarks` / `metadata.expected_marks`); otherwise completeness is explicitly unverified. Expected marks are never fed into recognition. The prior browser accuracy failure is not claimed fixed. |
| F4: sparse vector pages routed to OCR | Any non-whitespace words in the text layer keep both client readers, the server read-pages route and the single-page pipeline on the text path. Raw text presence is independent of orientation/layout filtering. A failed schedule match returns a plain no-schedule answer. The low-header-match scan fallback explicitly requires no text layer; the former skip-text option cannot force vector pages into OCR. | Generated pages with 1, 14, 15, 30 and 59 vector words return text-layer no-schedule results. Both client readers make zero canvas/OCR requests. The actual 30-word read-pages route and single-page pipeline do not launch Browser Rendering or call OCR. An empty text layer remains eligible for OCR. | Pages containing even a small text stamp stay on the text path, as required. No sparse-text exception remains. |

Validation on the final application changes:

- From `weyland-subx-worker`: `PATH=/opt/homebrew/bin:$PATH node --test` — **98 tests passed, 0 failed, 0 skipped**, Node v26.3.0, 17.96 seconds. Default shell Node v20 lacks the suite's `node:sqlite` prerequisite.
- `PATH=/opt/homebrew/bin:$PATH node --experimental-vm-modules --test tools/user-simulation/estimator-dom-regression.test.mjs` — **6 passed, 0 failed**. The DOM stand-in now exposes the native AbortController used by the app.
- Production OCR with Poppler pixels: **48/48 rows**, **330/336 scored fields**, 204 DPI, rotation 270°, 0.6° deskew; 17.47 seconds. This is Node/Poppler evidence, not browser parity.
- Every source/served `.mjs` twin is identical; drift checks pass. App, runner and nested reader imports use cache version `20261009g034`.
- `git diff --check` passes. Initial development runs caught unsynchronized asset twins and the DOM stand-in's missing AbortController; both were corrected before the final passing runs.

Mac handoff: commit/deploy as appropriate, then run `node tools/accuracy/scanned_sheet_browser.mjs`. The committed `tools/accuracy/g019-browser.json` was left unchanged; its earlier failed accuracy measurement remains evidence until replaced by the Mac's fresh run. F5/F6 and general OCR accuracy improvements were outside this task.

## Codex integration followup, 2026-10-09

The original d067 changes above were preserved. This followup uses branch `codex/d067-integration-20261009`, based on `6d8e2af2acbb9f7b27af8b2221d4bcca9d1b6fb7`. The parent reviewed the integration diff and authorized a scoped implementation checkpoint. No push or deployment was performed.

- Stopping between selected pages now reports a partial read in both the guest and signed-in browser fallback paths. Already-read rows remain visible, controls recover, and skipped pages cannot produce a successful completion status.
- Hardware page completion counts exclude partial extractions, whether signaled at the top level, in metadata or by `done:false`. Partial rows and reread history remain saved; completing a reread counts the page once.
- Complete door-schedule rereads remove obsolete generated duplicate occurrence keys for the incoming marks. Partial rereads retain them. Manual corrections and other pages are protected. Upserts, cleanup and the resulting persisted rows use one D1 batch, so a failed write rolls back the replacement. [Cloudflare documents D1 batch transaction behavior](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Regression evidence exercises the real app handlers and real SQLite persistence, including failure halfway through duplicate replacement. The Rockford sample builder is also a real caller of the changed writer. The first full test run caught its older offline D1 shim lacking `batch()` and the production `corrections_json` column. Adding transactional batch support and that column fixed the adapter; no sample PDF was regenerated.

Validation after the integration fixes:

- From `weyland-subx-worker`: `/opt/homebrew/bin/node --test` — **101 passed, 0 failed, 0 skipped**, 18.17 seconds.
- From checkout root: `/opt/homebrew/bin/node --experimental-vm-modules --test tools/user-simulation/estimator-dom-regression.test.mjs` — **8 passed, 0 failed**, 0.48 seconds.
- Focused SQLite suites `packet-cited-pages.test.mjs` and `partial-hardware-persistence.test.mjs` — **11 passed, 0 failed**.
- Source/served module twins remained synchronized. The integration changes did not edit those modules. `git diff --check` passed.

These results establish the safety and integration gate. They do not establish g019 browser recognition accuracy; that requires the fresh shipped-browser measurement below.

### Fresh browser accuracy measurement

Ran the exact shipped local runner on macOS with HeadlessChrome 153.0.8010.12:

```sh
PLAYWRIGHT_CORE=/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/node_modules/playwright-core/index.js /opt/homebrew/bin/node tools/accuracy/scanned_sheet_browser.mjs
```

An outer 180-second process-group timeout bounded the run; it completed normally in about 17 seconds and exited 1 because accuracy failed. The refreshed receipt is `tools/accuracy/g019-browser.json`, dated `2026-10-09T21:24:12.125Z`. The prior receipt is preserved outside the checkout at `/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/g019-browser-before-codex-20261009T212355Z.json`.

| Variant | Actual rows / unique marks | Expected rows matched | Scored fields | Extras | Result |
| --- | --- | --- | --- | --- | --- |
| Vector | 48 / 48 | 48 / 48 | 336 / 336 | 0 | Pass |
| Scanned | 47 / 46 | 46 / 48 | 308 / 322 | 1 duplicate | Fail |

The scan still misses **111** and **211**, and reads **214** twice. It completed 693 recognition calls in 16.20 seconds, within the configured limits, with `partial:false`. The safety fixes therefore do not solve the recognition gap. **g019 remains open.** Expected marks were used only for scoring, not supplied to recognition.

### Path ownership for landing review

All paths below belong to this checkout's combined d067 change. The original d067 final `git status` in `~/.local/state/mobley/dispatch/d067.log` identifies 18 tracked changes and four untracked additions. No unrelated checkout changes were incorporated.

**New changes introduced by the integration followup:**

- `tools/accuracy/g019-browser.json` — refreshed real-browser measurement.
- `tools/samples/build-rockford-sample.mjs` — offline D1 adapter compatibility.
- `weyland-subx-worker/src/lib/hardware-extraction-single-page.js` — partial hardware completion count.
- `weyland-subx-worker/test/estimator-defects.test.mjs` — existing fixture gains D1 batch support.
- `weyland-subx-worker/test/partial-hardware-persistence.test.mjs` — new SQLite regression suite, untracked.

**Original d067 paths further changed by the integration followup:**

- `tools/user-simulation/estimator-dom-regression.test.mjs`
- `weyland-subx-worker/src/lib/hardware-extraction-vision-dispatch.js`
- `weyland-subx-worker/src/pages/subx-app.html`
- `weyland-subx-worker/src/routes/hardware-schedule-page-extract.js`
- `weyland-subx-worker/test/packet-cited-pages.test.mjs`
- `docs/review-2026-10-09-fixes.md` — original untracked report, extended with this handoff.

**Original d067 paths preserved without further integration edits:**

- `weyland-subx-worker/assets/client-ocr-src/schedule-grid-extraction-client.mjs`
- `weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs`
- `weyland-subx-worker/assets/client-ocr-src/schedule-workspace.mjs`
- `weyland-subx-worker/assets/client-ocr/grid-runner.html`
- `weyland-subx-worker/assets/client-ocr/schedule-grid-extraction-client.mjs.bin`
- `weyland-subx-worker/assets/client-ocr/schedule-text-layer.mjs.bin`
- `weyland-subx-worker/assets/client-ocr/schedule-workspace.mjs.bin`
- `weyland-subx-worker/src/lib/browser-grid-extraction.js`
- `weyland-subx-worker/src/lib/hardware-extraction-pipeline.js`
- `weyland-subx-worker/src/lib/text-layer-read.js`
- `weyland-subx-worker/src/routes/subx-workspace.js`
- `weyland-subx-worker/test/scanned-sheet.test.mjs`
- `weyland-subx-worker/test/subx-workspace.test.mjs`
- `weyland-subx-worker/test/scanned-sheet-guards.test.mjs` — original untracked suite.
- `weyland-subx-worker/test/scanned-sheet-review.test.mjs` — original untracked suite.
- `weyland-subx-worker/test/sparse-vector-routing.test.mjs` — original untracked suite.

Final scope before checkpoint: **22 tracked modified paths and five untracked paths**. The authorized scoped checkpoint contains the 21 tracked implementation/test paths, four new test suites and this report. The refreshed browser JSON remains uncommitted evidence for the parent. The separate real-set reader checkout `wt-g030` was not changed.
