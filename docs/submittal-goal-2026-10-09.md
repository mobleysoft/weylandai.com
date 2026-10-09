# The $100 first submittal on a full-size bid set: evidence, 2026-10-09

The goal set on 2026-10-09: make the $100 first submittal real on a full-size bid set and prove it, in five parts. Each part below names the commit-tracked evidence on main and the command that reproduces it.

## 1. Schedule reading: at least 95% of rows at 95% field accuracy on all five documents, no page read failing

`OCC_PDF=<copy of weyland-fixtures/fixtures/occ-a-801-pg4.pdf> node tools/accuracy/schedule_read_accuracy.mjs --token-file <qa token>`
Report: `tools/accuracy/schedule_report_2026-10-09-06-48_all-five.md` (live, 2026-10-09 06:48 UTC).

| document | what | rows found | field accuracy |
|---|---|---|---|
| Rockford A2.2 | doors | 65 / 65 (100%) | 100% |
| Rockford 08 71 00 | hardware items | 110 / 110 in 14 groups (100%) | 99.5%, doors linked 64 / 64 |
| Berryessa A9.2 | doors | 24 / 24 (100%) | 98.6% |
| Berryessa 08 71 00 | hardware items | 16 / 16 (100%) | 100% |
| OCC A-801 | doors | 41 / 42 (97.6%) | 97.2% |
| Christina set 01 | hardware items | 22 / 23 (95.7%) | 95.5% |

No page failed. Rockford's 08 71 00 pages 17-23 and 29, which died at 73 s with Cloudflare's 503 on 2026-10-08, now read from the PDF's own text in the Worker (mobleysoft/weylandai.com PRs 63-66: text layer first, struck-through addendum lines left out, the document opened once per batch, pricing deferred off the page save).

## 2. Packets cite a catalogue page for every item the catalogue holds; every other item is a miss with what is needed

`node tools/accuracy/packet_coverage.mjs --token-file <qa token>`
Report: `tools/accuracy/packet_report_2026-10-09-06-46_schlage-ives.md`.

- Rockford Bid 26-27 Addendum One: 37 distinct items; 36 cited with a catalogue page in the packet; 1 missed: Glynn-Johnson 90S (4 EA, sets 07, 23, 40, 51), "Glynn-Johnson is in the catalogue; 90S is not", needed "Glynn-Johnson 90S in the catalogue" (no Glynn-Johnson book on file prints it). Two lines another trade furnishes (BY DIVISION 28 card readers, BY DOOR AND FRAME MANUFACTURER seals) are listed in the packet as by others. Packet 69 pages.
- Berryessa Bid B-09-2023-24: 10 of 10 cited, 0 missed. Packet 20 pages.

Select Hinges went into the catalogue first (`tools/catalogue-seeds/2026-10-09-select-hinges.sql`: 37 products, Select's own spec sheets in R2); SL11 and SL57 are cited from them. Also on the way: the filed-book search budget now counts only book reading (sets 40-47 had been skipped), catalogue pages with a PDF on file rank first (Ives 8200, 8302, 8190HD, 9190HD from the Ives Products Catalog), and Schlage's own ND catalog and ALX sell sheet were filed for ND40, ALX53 and ALX80 (`tools/catalogue-seeds/2026-10-09-schlage-nd-alx-sheets.sql`).

## 3. Journeys: run-journeys --passes 3 green for all 23

The four regressions in `docs/direction-2026-10-08.md` and fix 10 (with `docs/patches/fix10-journey-expectations.patch` applied) are on main in mobleysoft/weylandai.com#71. The three-pass run is made on the Mac (GPU); its result is recorded below when it lands.

RESULT: pending the Mac's run.

## 4. The six tools that were NOT SOLD YET

`node tools/accuracy/doc_tools_audit.mjs --token-file <qa token>`

RESULT: pending.

## 5. A first-time estimator on the Rockford set: would they pay $100?

RESULT: pending (`docs/estimator-audit-rockford-2026-10-09.md`).
