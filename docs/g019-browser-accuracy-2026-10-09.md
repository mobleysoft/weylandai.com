# G019 browser row recovery — 2026-10-09

## Result

The exact shipped browser reader now finds **48 rows / 48 unique expected marks with no extras** on the sideways scanned ARCH D benchmark. The vector and scanned mark sets agree. The scan scores **332/336 fields (98.8%)**, compared with the immediately preceding browser result's 46 matched rows and 308/322 fields. This is a local browser gate; no push or production deployment was performed here.

The change is isolated on `codex/g019-browser-accuracy-20261009`, after the reviewed safety commits `4a8b33db81f3cbfeccc3a85eb3729876b03cc5ae` and `2c9f08a2e395d8cf1121b6b067023c83a9b59927`.

## Cause and fix

- A low-confidence mark read was not retried. The pixels for the missing mark read as `Tir`; another mark read as a duplicate of a different row. Uncertain mark cells now receive at most five additional reads using enlarged and thresholded pixels. An identifier needs agreement from at least two reads, with no tied winner. All reads share the existing page work/time/abort budget. Measured confidence is retained. Letters, punctuation and leading zeroes remain valid; there is no numeric-only whitelist or O/Q substitution.
- Grid cell words lost physical row identity when converted into reader lines. An unread mark row then entered the prior door's continuation branch, combining locations, sizes and hardware values. Grid words now retain `grid_row`; clustering and table parsing preserve that identity. Wrapped text within the same band still joins, and existing vector continuation remains unchanged.
- Unread physical rows stay in the table and expose `unresolved_rows` with a source row/y citation. Such rows make the scan result partial with an explicit review message; they cannot silently become completed pages.
- App, runner and nested text-reader imports now use cache version **`20261009g019r1`**. Every source/served module twin matches byte-for-byte.

Expected marks were used only by the test scorer. They were not passed into OCR or used to generate any output rows. The PDF, model and committed historical browser receipt were preserved.

## Executed verification

- Full worker suite: `/opt/homebrew/bin/node --test` from `weyland-subx-worker` — **115 passed, 0 failed, 0 skipped**, 17.89 seconds.
- DOM suite: `/opt/homebrew/bin/node --experimental-vm-modules --test tools/user-simulation/estimator-dom-regression.test.mjs` — **8 passed, 0 failed**, 0.75 seconds.
- New regressions cover identifier consensus/ties, the shared abort/work budget, unread and invalid marks, row citations, close baselines, wrapped rows, genuine duplicates, and vector behavior.
- A generated ruled schedule goes through the real shipped OCR/model and shared parser. It retains all eight physical rows and reads seven identifiers exactly, including letters, punctuation and leading zeroes. Its remaining ambiguous identifier is explicitly flagged by the actual workspace.
- Existing real Rockford, Berryessa and Christina PDF regressions passed.
- `git diff --check` passed. All source/served module twins match.

Browser command, bounded by a 180-second outer process-group timeout:

```sh
PLAYWRIGHT_CORE=/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/node_modules/playwright-core/index.js /opt/homebrew/bin/node tools/accuracy/scanned_sheet_browser.mjs
```

It completed normally with exit 0, using HeadlessChrome 153.0.8010.12. Vector: 48/48 rows and 336/336 fields in 114 ms. Scan: 48/48 rows and 332/336 fields in 16.33 seconds, 703 recognition calls, 204 DPI, rotation 270°, 0.6° deskew; no partial or unresolved rows.

Fresh receipt: `/private/tmp/claude-501/-Users-johnmobley/36836088-d551-4ec6-b6ef-38f1b69cf0bc/scratchpad/g019-browser-accuracy-codex.json`, dated `2026-10-09T21:35:31.904Z`, SHA256 `484f635c9d8a3eb49b699819fe5fcb5f7807e568517d824cccdb826f592b5018`. The tool's output was copied there, verified, and its edit to the historical tracked receipt was restored before the worker suite.

Measured served-asset SHA256 values:

- Grid reader: `2ccc6c0f0dd59fb73fbbfa124949305ceae34291b6e6c5958d3927e62d10296e`
- Text reader: `543ce13e84979c4cc938224660a3eedd412f987629ae74456d6c386c6bedfdca`

## Limits and landing

Three benchmark width cells remain unread (201, 207, 308); their zero width confidence produces size review warnings. Row 302 still reads hardware group `Q3` instead of `03`, at measured confidence **0.871**, above the 80% warning threshold. That specific hardware field is a remaining error.

The varied generated schedule reads `A07` as `AQ7` at confidence **0.555**. The actual workspace flags its mark for review. The identifier is kept as read; no character substitution guesses the intended code. This change does not establish perfect field accuracy or general scan parity.

The parent should review this scoped commit, integrate it with the safety changes, deploy the SubX worker and verify the served hashes and production journeys. Repeat the row gate on the integrated snapshot; a three-run production/browser receipt remains the next acceptance step.
