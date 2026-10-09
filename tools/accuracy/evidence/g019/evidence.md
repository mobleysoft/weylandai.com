# g019 measured evidence

Local production-code measurement; browser/live measurement and deployment remain pending.

```sh
node tools/accuracy/truth_run.mjs --files tools/bidset/out/weylandai-building-bidset-scanned.pdf
```

Exit code: 0. Raw output: [truth-scanned.txt](truth-scanned.txt).

```text
exact | class pair | A {"d":48,"i":50} B {"d":48,"i":50} | agree 0.602 (59/98) | oracles sets_exist 10/11, set_door_lists 8/10, sizes_and_marks 43/48 | 54s 
truth records: 1 queue lines: 4339 (54 from this run)
```

| Measurement | Scan | Vector |
|---|---:|---:|
| Expected marks found | 48/48 | 48/48 |
| Extra doors | 0 | 0 |
| Scored fields right | 330/336 | 336/336 |
| Rows with every scored field right | 42/48 | 48/48 |

Scan SHA-256: `e0abc0ac15f561efbeabc5aee99e847425fc0d2f827dda9e626d8b781971067c`. No text layer on any of its six pages. Schedule page 3 is ARCH D, turned 270°, deskewed 0.6°, read at 204 DPI under the 36 MP cap. Page 3: 19869 ms; full file: 54123 ms. Previous committed scan record: 0 doors (2026-10-09T09:50:19.544Z).

Production now routes full-size pages without text to the shared OCR pass before the older straight-grid detector. The native command calls that same orientation, deskew, cell recognition, dimension rereading, and line-formation implementation. It substitutes Poppler for the browser's pdf.js renderer. Source and shipped .bin assets match; the workspace, runner, and text-reader cache URLs are updated. Expected rows are used only to score results.

Remaining scan field discrepancies (these are not a perfect-fields pass):

| Door | Field | Expected | Read |
|---|---|---|---|
| 205 | width_inches | 36 | unread |
| 208 | height_inches | 84 | unread |
| 212 | height_inches | 84 | unread |
| 302 | hardware_group | 03 | Q3 |
| 311 | width_inches | 36 | unread |
| 312 | width_inches | 36 | unread |

[Machine-readable evidence and asset hashes](evidence.json). Full records: [scan](../../../corpus/harvest/truth/e0abc0ac15f561ef.json), [vector](../../../corpus/harvest/truth/4847b09e633103f7.json). The second reader found 48 scan doors; it found 0 vector doors in this environment, so vector agreement is not claimed.

Validation:

- [OCR and cell regression: 11/11](ocr-tests.tap), including exact equality of scan, vector, and truth mark lists and zero extras.
- [Corpus and workspace regression: 13/13](regressions.tap), using Node 22.23.2.
- [Final asset/wiring checks: 3/3](wiring-tests.tap). Browser test server also served the runner and reader modules byte-for-byte.
- Existing `text-layer-read.test.mjs` Rockford hardware count test fails: 114 items versus expected 110. Repeating with the unchanged HEAD parser also returns 114.

Mac browser checks:

```sh
node tools/accuracy/scanned_sheet_browser.mjs
node tools/user-simulation/journeys/subx-scanned-sheet.mjs
```

The first command checks both complete PDFs through the shipped browser runner, confirms no text in the scan, and writes `tools/accuracy/g019-browser.json`. Use `--manual` to open its printed local URL in an existing browser, or `PLAYWRIGHT_CORE` / `CHROMIUM_PATH` for an installed test browser. The journey uses real SubX upload → page 3 → READ IT IN THIS BROWSER → save, compares all 48 displayed marks and page/row citations, records field scores, and cleans up its test uploads/account data with the existing Journey kit. The journey runner discovers it automatically.

Neither browser check was executed here. Chromium launch failed at the sandbox's MachPortRendezvousServer check (permission denied 1100). Computer Use rejected opening Safari because this session is not approved to control it. No deployment or board update was performed.

## Mac browser measurement, 2026-10-09 18:05Z (shipped runner in Chromium, tools/accuracy/scanned_sheet_browser.mjs)

| Path on the scanned sheet (page 3, turned 270 degrees) | Rows | Fields | Extra rows | Time |
|---|---:|---:|---:|---:|
| Browser path on main before this landing (b5c9a57): extractDoorScheduleFromPdf in Chromium | 0 of 48 | 0 | 0 | 11.1 s |
| Browser path after this landing (same call through grid-runner.html) | 46 of 48 | 308 of 322 | 1 | 15.9 s |
| Node path after this landing (truth_run, Poppler render) | 48 of 48 | 330 of 336 | 0 | 54 s |
| Vector twin, browser path after this landing | 48 of 48 | 336 of 336 | 0 | 0.1 s |

The browser check's own pass bar (48 of 48, no extras) is not met yet: two rows and one extra row separate the pdf.js
raster from the Poppler raster. Landed because the browser path went from nothing to 46 rows; goal g019 stays open
for the last two rows. Report: tools/accuracy/g019-browser.json.
