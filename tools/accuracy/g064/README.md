# g064: reader B over-counted X2404-01 (12 rows read, 8 on the sheet)

Goal (Mobley, 2026-10-10 03:52 EDT): reader B reads X2404-01 at the 8 rows of sheet A601, page 81 (100A to 107A), for sets 6e7e2d2bf65c383b and 70ab5446590e40cc.

## Cause

Page 81 was never the problem: reader B reads exactly 8 rows there (100A to 107A). The other 4 rows came from **page 97**, the mechanical sheet's air-device schedule ([render](x2404-p97-air-devices-97.png)).
- Its header is TAG | TYPE | DESCRIPTION | FACE SIZE WIDTH / HEIGHT | CONNECTION SIZE | MAX. AIRFLOW | THROW 150/100/50 FPM | MAX. NC | MATERIAL | FINISH | FRAME/BORDER | DAMPER | BASIS OF DESIGN | REMARKS.
- TAG maps to the mark and FACE SIZE WIDTH/HEIGHT to a door size, so the diffusers C3, I1, R1 and R2 counted as doors.
- The page is a door-schedule candidate because the mechanical sheet names a door somewhere.

## Fix

`tools/accuracy/truth/reader_b.mjs`: `panelHeader` (g051) also refuses a header with two or more mechanical equipment words: CFM, AIRFLOW, THROW, DAMPER, DIFFUSER, GRILLE, REGISTER, MBH, BTU, GPM, RPM, SEER, EER, TONS, ESP, NC, NECK, KW, HP.

## Result

| Set | Reader B rows before → after | Agreed | Tier |
|---|---|---|---|
| 6e7e2d2bf65c383b (X2410/X2404 rebid) | 12 → 8 | 8 of 12 → 8 of 8 | agreed |
| 70ab5446590e40cc | 12 → 8 | 8 of 12 → 8 of 8 | agreed |

**Whole harvest:** 598 PDFs, run at e571925 (this branch merged with main 372e178, which includes g059's reader A). `node tools/accuracy/truth/compare_runs.mjs origin/main:tools/corpus/harvest/truth <run>` **exits 0: "no set lost agreed rows or a tier"**. Only the two sets above change ([table](compare-committed-truth-vs-g064-run.md)).

A first run before merging main exited 1 on 0da96f79 and 72bedaab. Their committed records had moved with g059's reader A change, which that branch lacked. After the merge both are unchanged.

## Tests

- `node --test tools/accuracy/g064/reader-b.test.mjs`: 3 of 3.
  - **Page 81:** 100A to 107A.
  - **Page 97:** 0 doors and 0 tables.
  - **Headers:** equipment headers are told from door headers (including T2507's, T2421's and X2404's).
- Without the equipment words, 2 of the 3 fail.
- The g047, g050, g051, g057 and g060 reader B tests stay green: 18 of 18 together with g064's.
