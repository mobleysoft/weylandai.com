# g022 — Estimator journey evidence

**Completion criterion is not met.** Both requested journeys exist; neither has
three green production passes on main. No board update was made.

Validation base: `340bf67338e76e727111838e1cd41a90e0dc2ce9` (fetched `origin/main`,
including g018 `eceb04f`). Changes applied cleanly to an isolated checkout at
`/private/tmp/g022-main-validation`. They are not merged or deployed.

| Executed measurement | Result | Raw evidence |
|---|---|---|
| Assertion and cleanup tests | **11 passed, 0 failed**; negative cases reject the earlier defects; SQLite cleanup preserves another job | [TAP](../tools/user-simulation/evidence/g022-2026-10-09/assertions-and-cleanup.tap) |
| Syntax / whitespace | **7 JavaScript files parse; diff check clean**; per-file SHA-256 recorded | [Validation](../tools/user-simulation/evidence/g022-2026-10-09/validation.json) |
| `upload-without-account-to-first-read`, three passes | **0/3 green**; browser launch failed on each pass | [Matrix](../tools/user-simulation/evidence/g022-2026-10-09/matrix-summary.json), [individual results](../tools/user-simulation/evidence/g022-2026-10-09/matrix-results.jsonl) |
| `schedule-plus-spec-to-packet-with-hardware`, three passes | **0/3 green**; browser launch failed on each pass | Same matrix; [exact command/base/scope](../tools/user-simulation/evidence/g022-2026-10-09/matrix-command.json) |
| Compatible Chromium launch with `--use-angle=metal` | `bootstrap_check_in … Permission denied (1100)`; no page opened | [Full launch error](../tools/user-simulation/evidence/g022-2026-10-09/browser-launch.json) |
| Production workspace, 2026-10-09 17:34:26 UTC | HTTP 200, but neither `guest-save-btn` nor `hardware-needed` present | [HTTP probe with body hashes](../tools/user-simulation/evidence/g022-2026-10-09/live-deployment-probe.json) |
| Production `schedule-workspace.mjs`, same probe | **HTTP 404**, `unknown_asset` | Same probe |

All six per-pass JSON reports and console transcripts are retained beside the
matrix. **Zero functional browser checks were reached.** The passing assertion
tests exercise failure detection with constructed protocol examples and audited
fixture expectations; they are not evidence of a successful customer journey.
The matrix's preexisting truth-tier attachment is unrelated to these journey
results. No accounts, uploads, packets, payments or emails were created by the
failed matrix attempts.

The two new production journeys are:

- [Upload without account to first read](../tools/user-simulation/journeys/upload-without-account-to-first-read.mjs): desktop and touch phone; real homepage upload; all 65 Rockford marks/groups with audited source rows; no account or schedule-write request before the read; busy status cleared; named hardware-spec request; actual CSV download with pair/glazing values and 18 Yes / 46 No / 1 blank alternate-pricing values.
- [Schedule plus spec to packet with hardware](../tools/user-simulation/journeys/schedule-plus-spec-to-packet-with-hardware.mjs): real subscriber sign-in; single-sheet read and `409 HARDWARE_SPEC_REQUIRED`; full Rockford upload through the UI; 65 doors, 14 groups and 110 items with audited per-group counts and hinge models; built packet manifest; PDF rendered in place and downloaded; generated hardware pages checked separately from the TOC/source appendix, plus catalogue-page text, page count and company cover.

The shared cleanup now deletes children linked through `set_id` as well as
`hardware_set_id`, before deleting their groups. The reader writes hardware
components under `set_id`; the earlier cleanup only followed the other column.
The SQLite test covers both relationships and keeps the other customer's rows.

## Mobley's number two: measurement after landing and deployment

The pending condition is three green runs of **both** journeys from main, with
g018's workspace and rebuilt browser assets actually served. Source presence on
main alone does not meet that condition. The existing g018 rebase note documents
the browser-asset rebuild requirement.

From the clean main checkout containing g022, using the Mac's working
Playwright/Chromium installation and existing Wrangler credentials:

```sh
git branch --show-current
git rev-parse HEAD
git status --short
command -v pdftotext
PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs \
  node tools/user-simulation/run-journeys.mjs --passes 3 \
  --only upload-without-account-to-first-read,schedule-plus-spec-to-packet-with-hardware
```

Keep the matrix directory, all six timestamped journey reports and their
artifact folders. Each report identifies its checkout revision, dirty state,
fixture hashes, screenshot/CSV/PDF/text/API evidence, and cleanup outcome. The
packet journey uses a throwaway subscriber and the shared finally cleanup; no
payment is submitted, and its AuthFor identity remains as documented by the
existing harness. The Mac session measures those results and updates the board.
