# g060: reader B on T2507-01 A-103

Goal (Mobley, 2026-10-10 03:32 EDT): reader B reads T2507-01 sheet A-103 (set 192a16af8f31ae0c, PDF page 10) at 49 door rows, the count from the render. Two of the rows are 132A: two openings sharing a tag. The set then moves from oracle-checked to agreed.

## Cause

The sheet prints the room number in the ROOM column and only the letter in MARK ([render](t2507-10.png)):

    ROOM 100 | NAME CAN WASH | MARK A | DOOR SIZE WD 3'-0" HGT 7'-0" | ...

The opening's mark is the two together, 100A, which is how reader A and the plans read it. In reader B, the MARK cell "A" is not mark-like, so the table failed the "first body band holds a mark" check and was dropped.

## Fix

`tools/accuracy/truth/reader_b.mjs`, `withRoomMark`: when the mark cell holds one or two letters and the location (ROOM) cell starts with a number, the mark is the room number plus the letter. This applies both to the header check and to every body row.

## Result

| | Before | After |
|---|---|---|
| Reader B rows on p.10 | 0 | **49** (100A … 143A, with 113B, 115B, 116B, 128B, 129B, 131B, 132B, 141B, and 132A twice) |
| Agreed with reader A (49) | 0 | **47** |
| Tier | oracle-checked | **agreed** |

- The two disputed rows are the location on 113A and 113B. Reader A reads "113 S1", taking a word from the room name "S1 PERSONNEL SERVICES"; reader B reads "113".
- Oracles: marks on the plan 49 of 49, sizes and marks 49 of 49.

**Whole harvest:** 598 PDFs at e5d020c. `node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth <run>` **exits 0: "no set lost agreed rows or a tier"**. T2507 is the only set that changes ([table](compare-committed-truth-vs-g060-run.md)).

## Tests

- `node --test tools/accuracy/g060/reader-b.test.mjs`: 1 of 1. It checks:
  - 49 marks, starting 100A, 101A, 102A, 103A and ending 143A;
  - 132A twice;
  - 113B and 141B present;
  - 36 x 84 for 100A.

  It fails without the join.
- The g047, g050, g051 and g057 reader B tests stay green: 15 of 15 together.
