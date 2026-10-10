# g046: reader A on real bid sets it read as 0 rows, and two red tests on main

Cloud session, 2026-10-10. The harvest PDFs were read from R2 (weyland-fixtures, harvest/<sha16>.pdf, read-only pair). Reader A is the production text-layer reader, `weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs` (the served copy `assets/client-ocr/schedule-text-layer.mjs.bin` is byte-identical).

## Why three sets read 0 rows: hand counts from the rendered sheets

| set | page | door schedule on the sheet | hand count | reader A before | after | cause |
|---|---|---|---:|---:|---:|---|
| T2502 `3fd2388877347d09` | 13 (A-700) | DOOR SCHEDULE: 001-004, OH01-OH04, SE01 | 9 | 0 | **9** | the title search took in "HARDWARE SET 1 -" printed beside the table, so the table read as a hardware table and was dropped |
| T2423 `977cec6301f40433` | 10 (A-601) | Door and Frame Schedule: 112 A, 114 B, 114 C | 3 | 0 | **3** | the "Door Number" header spans two sub-columns, number and letter; the mark column held only the letter |
| C2419 `4af80165bc367de8` | 7 (A601) | DOOR SCHEDULE: 104A, 104B, 116B, 123A | 4 | 0 | 0 | the column headers are printed rotated 90°, so no header line forms: **not fixed here** |

The other seven sets are unchanged, with the same marks page for page (`rows-before.json` and `rows-after.json`, from `node tools/accuracy/g046/rows.mjs <pdf dir> <out.json>` with main's reader and with this branch's):

| set | rows | rows with width and height |
|---|---:|---:|
| R2502 | 211 | 210 |
| R2502 rebid | 210 | 210 |
| T2507 | 46 (49 on the sheet; g043) | **0** |
| O2604 | 7 | 7 |
| T2504 | 22 | 13 |
| T2147 | 15 | **0** |
| T2331 | 8 | 4 |
| T2502 (new) | 9 | 5 (the 4 overhead and pair rows print W X H in one cell; see below) |
| T2423 (new) | 3 | 3 |

## The fixes (schedule-text-layer.mjs)
1. **Title over the labels' own span:** the table title is looked for first over the span of the header's label words. If none is found there, the search falls back to the widened header extent.
2. **Split "Door Number" header:** when the mark cell is a lone letter and the unnamed column just to its left holds a 1-4 digit number, the mark is number + letter. It is written back into the row so the door record carries it.
3. **First-row gap:** before the row pitch is known, the gap to the next line is measured in the larger of the header's and that line's text size, capped at twice the header's. A 10 pt header over 13 pt rows on a 32 px pitch put the first row past 3.2 header heights on this container's OCR build but not on the Mac's.

## Tests
- **`weyland-subx-worker/test/real-set-schedules.test.mjs` (new): 2 of 2.**
  - Fixtures are the full pages' text-layer lines, from `node tools/accuracy/g046/extract-lines.mjs <pdf> <page> <out>`.
  - Both tests fail on main's reader. A cropped fixture let the T2502 bug hide, because the page-wide text height changed, so the fixtures are whole pages.
- **`scanned-sheet-review.test.mjs`: F2 updated, 7 of 7.**
  - Main's 8ce822a gave each browser read its own abort controller, which is a correct fix; the test still looked for the old source text.
  - It now checks the new contract: `beginBrowserRead()` returns the controller, all three reads take `var ctl = beginBrowserRead()` and pass `signal: ctl.signal`, and none reads `state.readAbort.signal`.
  - Putting one read back on the old lookup fails it.
- **weyland-subx-worker `node --test`: 180 of 181.**
  - The remaining failure is `generated-mark-scan.test.mjs`. Before fix 3 it read 0 of 10 rows here; it now reads 10 of 10, with 9 marks exact.
  - The tenth, A07, is OCR'd as "AQ7" by this container's renderer (Poppler 24.02). It is flagged uncertain for review, as the test requires of a wrong mark.
  - The test's exact-equality assertion depends on the renderer, so it is left as it is.
- **Others:** plan-read 7 of 7; estimator-assertions 11 of 11.

## Still short, measured here
- **C2419:** rotated column headers (vertical text), so 0 of 4 rows.
- **Door sizes on real sets:** T2507 and T2147 read 0 of 46 and 0 of 15 sizes. T2504 reads 13 of 22, T2331 4 of 8, T2502 5 of 9.
- **T2507:** 3 rows still dropped (141B, 142A, 143A); that is g043, on the Mac.
