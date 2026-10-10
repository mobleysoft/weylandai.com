# g050: range and stacked-mark rows with QUANTITY, read by both readers (class C3)

The goal, from Mobley (2026-10-09 21:11 EDT), with the Mac's notes at 21:11 and 22:30:
- Range and stacked-mark rows with QUANTITY are read by both readers, on 3506f831094dd516 and 194733de48af8797.
- The bar is the rendered-page count: 16 rows standing for 520 doors on each sheet, with QUANTITY kept.
- Measure each set before and after; no set may lose agreed rows.

## Eye truth (rendered sheets)

C2410 A-601 has five schedules, each with columns DOOR # | ROOM NAME | DOOR SIZE | DOOR TYPE | HARDWARE GROUP # | QUANTITY | REMARKS.

**3506f831094dd516 p.12:**
- Housing units 1–4 each print three rows with quantities 8, 56 and 64:
  - "1A101 TO 1D102";
  - "1A103 TO 1D116";
  - "1A201 TO 1D216".
- The alternates table prints "151A 151B / 151C" (3), "256" (1), "258A / 258B" (2) and "259A / 259B" (2).
- That is 16 rows, 4 × 128 + 8 = **520 doors**.

**194733de48af8797 p.45 (addendum 1):**
- The units have three rows each:
  - unit 1: 48, 16 and 64, where the 16 row is "1A105 TO 1A116 / 1B109 TO 1B116";
  - unit 2: 56, 8 and 64, where the 8 row is "2A109 TO 2A112 & 2B109 TO 2B112";
  - unit 3: 60, 4 and 64, where the 4 row is "3A109 TO 3A 112";
  - unit 4: 60, 4 and 64.
- The alternates are the same as on 3506.
- That is 16 rows, **520 doors**.

## Result

| Set | page | eye rows / doors | A before | A after | B before | B after | agreed before → after |
|---|---|---|---|---|---|---|---|
| 3506f831094dd516 | 12 | 16 / 520 | 30 rows | 16 rows, 520 doors | 31 rows | 16 rows, 520 doors | 5 → 16 |
| 194733de48af8797 | 45 | 16 / 520 | 34 rows | 16 rows, 520 doors | 35 rows | 16 rows, 520 doors | 11 → 16 |

All 32 rows agree in both readers on every compared field, quantity included. Each row carries:
- `door_number` / `mark`: the first mark, e.g. "1A101";
- `marks`: every mark printed, e.g. ["1A101","1D102"] or ["151A","151B","151C"];
- `mark_ranges`: e.g. [{from:"1A101",to:"1D102"}];
- `quantity`.

Reader A also keeps `mark_text`.

## How

**Reader A** (weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs; the served .bin twin is byte-identical):
- `fieldForHeader` maps QTY / QUANTITY to `quantity`, unless the label counts leaves, hinges or panels. Before, QTY mapped to nothing.
- `quantityRows` handles an unruled table with a quantity column:
  - A row is its data line: a value outside the mark, location and notes columns.
  - Mark lines chained by a trailing TO / & / THRU are one run.
  - A run that holds a data line belongs to it.
  - A run without one joins the nearest data line. On a near tie it joins the one below; when it carries its own room ("1B109 TO CELL B109-CELL B116") it joins the one above.
  - Other lines, such as wrapped remarks, join the nearest data line within 1.6 row pitches.
  - Marks in the unnamed column just left of the mark column are the mark column's. Centred "151A" starts its own column.
- `readMarkList` parses the mark cell: ranges, stacks, "&" lists, and an end mark printed apart ("3A 112" is read as 3A112).
- Tables without a quantity column take the old path unchanged.

**Reader B** (tools/accuracy/truth/reader_b.mjs):
- `fieldOf` maps QTY / QUANTITY to `quantity`.
- A ruled band whose quantity cell holds one number is one row. Before, each mark-like word in the band started a row.
- `markListOf` is reader B's own parser of the mark cell.

**Agreement** (tools/accuracy/truth/agree.mjs): reader rows are compared on `ROW_FIELDS` = DOOR_FIELDS + quantity. Scoring against expected files keeps DOOR_FIELDS, because those files carry no quantity. `reader_a.mjs` mapResult passes through quantity, marks and mark_ranges.

## No set loses agreed rows

**Field check:** reader A, every door field on the 17 measured sets (26 pages), using `tools/accuracy/g049/fields.mjs`:
- [fields-main.json](fields-main.json) is origin/main b287aee; [fields-g050.json](fields-g050.json) is this branch.
- Only the two target pages differ.
- Every other page is identical, field for field.

**Whole harvest:** 598 PDFs from R2, run with `truth_run.mjs --dir … --out …`:
- The main run is origin/main b287aee, the same run used for g047. The after run is this branch.
- `node tools/accuracy/truth/compare_runs.mjs <main run> <g050 run>` **exits 0**: [compare-main-run-vs-g050-run.md](compare-main-run-vs-g050-run.md).
- Only three sets change:
  - 3506f831 (5 → 16 agreed);
  - 194733de (11 → 16 agreed);
  - 4597f173e1d67daf, which drops from 3 to 1 reader A rows with agreement unchanged (see below).
- `compare_runs.mjs origin/main:tools/corpus/harvest/truth <g050 run>` also **exits 0**: [compare-committed-truth-vs-g050-run.md](compare-committed-truth-vs-g050-run.md).
  - The PR 115 drop on both C3 sets is recovered: 9 → 16 and 13 → 16 against the committed records.

**4597f173e1d67daf p.33** is a KITCHEN HOOD SCHEDULE (ACT1, KEH1…) that reader A takes for a door table, both before and after.
- Its "QTY." column now groups the hood rows: A reads 1 row instead of 3.
- 0 rows agreed before and after; the tier stays unread.
- Reading a non-door table as doors is the existing fault, outside this goal.

This run is built on main, so reader B there does not yet have g047's fix (PR 116). The two changes touch different parts of reader_b.mjs and merge cleanly.

## Tests

- `cd weyland-subx-worker && node --test`: 191 of 192. The one failure is the renderer-bound generated-mark-scan test, which passes on the Mac.
  - test/real-set-schedules.test.mjs adds three tests. Both sheets check marks, ranges and quantity row by row, plus the 520 sum. readMarkList is tested on its own.
  - The fixtures are test/fixtures/g050-c2410-a601-lines.json and g050-c2410add-a601-lines.json.
- `node --test tools/accuracy/g050/reader-b.test.mjs`: 2 of 2. Its fixtures are the five schedules' items and rules, from tools/accuracy/g050/extract-page.mjs.
- `node --test tools/user-simulation/estimator-assertions.test.mjs`: 11 of 11.
