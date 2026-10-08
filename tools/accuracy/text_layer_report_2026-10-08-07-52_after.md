# Schedule reading from the text layer, 2026-10-08-07-52 (after)

The SubX reader module run in Node (pdf.js 6.2.108) on the corpus pages, scored by schedule-scoring.mjs against tools/corpus/expected (read by eye). Targets: 95% of rows found, 95% field accuracy.

| document | what | expected | found | rows found | field accuracy | extra | reads |
|---|---|---|---|---|---|---|---|
| rockford | doors | 65 | 65 | 100% | 100% | 0 | p29 65 doors 321ms; p18 3 groups 56ms; p19 3 groups 35ms; p20 2 groups 24ms; p21 1 groups 38ms; p22 1 groups 31ms; p23 3 groups 26ms |
| rockford | hardware items | 103 (13 groups) | 103 (13 groups) | 100% | 100% | 0 groups | doors linked 61/61 |
| berryessa | doors | 24 | 24 | 100% | 98.6% | 0 | p284 9 doors 133ms; p286 7 doors 96ms; p288 8 doors 87ms; p282 2 groups 49ms |
| berryessa | hardware items | 16 (2 groups) | 16 (2 groups) | 100% | 100% | 0 groups |  |
| occ | - | | | | | | file not in this checkout |
| christina | hardware items | 23 (1 groups) | 23 (1 groups) | 100% | 99.1% | 0 groups |  |

## Per field

- rockford doors: mark 65/65, hardware_group 65/65, width_inches 65/65, height_inches 65/65, fire_rating 65/65, door_type 65/65
- rockford items: qty 103/103, description 103/103, catalog 103/103, finish 103/103, mfr 103/103
- berryessa doors: mark 24/24, hardware_group 24/24, width_inches 24/24, height_inches 24/24, fire_rating 24/24, door_type 22/24
- berryessa items: qty 16/16, description 16/16, catalog 16/16, finish 16/16, mfr 16/16
- christina items: qty 22/23, description 23/23, catalog 23/23, finish 23/23, mfr 23/23

## Everything still wrong

- berryessa: 2
  - 002: door_type: expected "B", read null
  - 002: door_type: expected "B", read null
- christina: 1
  - 01 / VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS BY SECURITY VENDOR: qty: expected null, read 1

All read documents meet the targets.

## The remaining misses, checked against the page images

- Berryessa door 002 on A9.2 pp.286 and 288, door type "B": the letter is drawn as linework on those two sheets and is not in the text layer at all (page 284 has it as text). The reader leaves it empty for the reviewer; it does not guess.
- Christina VIDEO/INTERCOM, quantity: the text layer has a "1" in the QTY cell. Rendered at 200 dpi, a stroke of the NOT FOR CONSTRUCTION watermark covers it, which is why it was read by eye as no quantity. The reader's 1 is what is printed; the expected row is the one to revisit.
- Not scored: Rockford 08 71 00 p.17 prints Hardware Group No. 01 RR (doors 130.1, 132.1, 134.1; 7 items). rockford-087100-hardware-groups.json covers pp.18-23 and lists 01 RR under groups_not_printed; it is printed, on the page before. The reader reads it.

## Every page of the corpus (false positives)

Both readers were also run on every page of every PDF in tools/corpus/door-schedules and plan-sets (2,105 pages). Door rows came back only from real door schedules: Rockford A2.2, Berryessa A9.2 (three sheets) and Fayette pp.5 and 14 (not yet in expected/). Hardware groups came back from Rockford pp.17-23, Berryessa p.282, Christina pp.219-223 and a03cdcca pp.16-29. No spec paragraph numbers, finish legends or hardware catalog columns were read as doors.
