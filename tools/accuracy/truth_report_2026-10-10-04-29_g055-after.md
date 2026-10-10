# Truth report, 2026-10-10-04-29 (g055-after)

Harness: tools/accuracy/truth_run.mjs at e293d1a. Records: tools/corpus/harvest/truth/<sha16>.json (616), queue: tools/corpus/harvest/truth/queue.jsonl (3569 lines).

Reader A is the production text-layer reader (weyland-subx-worker/src/lib/text-layer-read.js, called as SubX's server calls it). Reader B is the second reader, geometry first (tools/accuracy/truth/reader_b.mjs: door schedules from the page's ruled lines, hardware groups from column fences). A row is AGREED when both readers read it and every compared field agrees after normalisation (doors: width, height, door type, material, fire rating, hardware set, location; items: qty, description, catalog, finish, maker); every other row is DISPUTED and goes to the queue. Oracles run over reader A's rows (the product's read): a marks on a floor plan, b schedule sets exist in 08 71 00, c each set's door list equals the schedule's doors with that set, d door/frame types in a legend, e sizes parse and marks follow the sheet's shape. Numbers per tier, never pooled.

Harvest PDFs in this report: 598.

## Tier: exact (2 PDFs)

| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |
|---|---|---|---|---|---|---|---|---|---|
| bidset/weylandai-building-bidset.pdf (4847b09e633103f7) | bidset (synthetic) | complete | 3 / 4,5,6 | 48 / 54 | 48 / 54 | 102/102 (100.0%) | 570/570 (100.0%) | a 48/48, b 10/10, c 10/10, d 3/3, e 48/48 | 0 |
| bidset/weylandai-building-bidset-scanned.pdf (e0abc0ac15f561ef) | unknown | pair | 3 / 4,5,6 | 48 / 50 | 48 / 50 | 59/98 (60.2%) | 491/545 (90.1%) | a -, b 10/11, c 8/10, d -, e 43/48 | 54 |

Per family (exact):

| family | PDFs | rows agreed | field agreement | a marks_on_plan | b sets_exist | c set_door_lists | d types_in_legend | e sizes_and_marks | queue |
|---|---|---|---|---|---|---|---|---|---|
| bidset (synthetic) | 1 | 102/102 (100.0%) | 570/570 (100.0%) | 48/48 (100.0%) | 10/10 (100.0%) | 10/10 (100.0%) | 3/3 (100.0%) | 48/48 (100.0%) | 0 |
| unknown | 1 | 59/98 (60.2%) | 491/545 (90.1%) | - | 10/11 (90.9%) | 8/10 (80.0%) | - | 43/48 (89.6%) | 54 |

Tier total: rows agreed 161/200 (80.5%); queue 54.

- bidset/weylandai-building-bidset-scanned.pdf: sets_exist: schedule set Q3 not in 08 71 00 (sets read: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10) / set_door_lists: set 02: list names 5, schedule carries 6; on schedule but not listed: 311; set 03: list names 16, schedule carries 15; listed but not on schedule with this set: 302 / sizes_and_marks: mark 205 p.3: size "7-0\"" -> null x 84; mark 208 p.3: size "3-0\"" -> 36 x null; mark 212 p.3: size "3'-0\"" -> 36 x null / no text layer: production OCR preprocessing, cell recognition and line reader; Poppler rendering (browser rendering is a separate check). Actual DPI is recorded per page; the same words are given to both readers

## Tier: audited (4 PDFs)

| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |
|---|---|---|---|---|---|---|---|---|---|
| door-schedules/dd339f57b51538ed.pdf (dd339f57b51538ed) | Berryessa | complete | 284,286,288 / 274,282 | 24 / 17 | 24 / 16 | 40/41 (97.6%) | 246/246 (100.0%) | a 24/24, b 2/2, c -, d -, e 24/24 | 1 |
| door-schedules/525dc0b72011077a.pdf (525dc0b72011077a) | Christina | spec-only | - / 219,220,221,222,223 | 0 / 103 | 0 / 102 | 99/104 (95.2%) | 459/462 (99.4%) | a -, b -, c -, d -, e - | 6 |
| OCCDoorSchedulePg4.pdf (fb3e0a8137da6cdf) | Glendale CCD (OCC) | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| door-schedules/f0e863d88ea688ff.pdf (f0e863d88ea688ff) | Rockford | complete | 29 / 17,18,19,20,21,22,23 | 65 / 110 | 65 / 110 | 173/175 (98.9%) | 860/863 (99.7%) | a 64/65, b 14/14, c 14/14, d 3/4, e 64/65 | 3 |

Per family (audited):

| family | PDFs | rows agreed | field agreement | a marks_on_plan | b sets_exist | c set_door_lists | d types_in_legend | e sizes_and_marks | queue |
|---|---|---|---|---|---|---|---|---|---|
| Berryessa | 1 | 40/41 (97.6%) | 246/246 (100.0%) | 24/24 (100.0%) | 2/2 (100.0%) | - | - | 24/24 (100.0%) | 1 |
| Christina | 1 | 99/104 (95.2%) | 459/462 (99.4%) | - | - | - | - | - | 6 |
| Glendale CCD (OCC) | 1 | n/a | n/a | - | - | - | - | - | 0 |
| Rockford | 1 | 173/175 (98.9%) | 860/863 (99.7%) | 64/65 (98.5%) | 14/14 (100.0%) | 14/14 (100.0%) | 3/4 (75.0%) | 64/65 (98.5%) | 3 |

Tier total: rows agreed 312/320 (97.5%); queue 10.

- OCCDoorSchedulePg4.pdf: no text layer: production OCR preprocessing, cell recognition and line reader; Poppler rendering (browser rendering is a separate check). Actual DPI is recorded per page; the same words are given to both readers
- door-schedules/f0e863d88ea688ff.pdf: marks_on_plan: mark 126.1.2 (schedule p.29) not tagged on any plan / types_in_legend: door type G (4 rows) not found near the door types legend / sizes_and_marks: mark 1J.1 p.29: shape 9A.9 is used by 1 of 65 marks on the sheet

## Tier: agreed (52 PDFs)

| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |
|---|---|---|---|---|---|---|---|---|---|
| e032d094e55d90bf.pdf (e032d094e55d90bf) | california_dgs_obas | spec-only | - / 205,206,207,208 | 0 / 97 | 0 / 85 | 81/97 (83.5%) | 248/255 (97.3%) | a -, b -, c -, d -, e - | 19 |
| 1af9e638165d85fb.pdf (1af9e638165d85fb) | delaware_bidcondocs | none | - / 52,53,54,55,56,57,58 | 0 / 153 | 0 / 142 | 2/195 (1.0%) | 197/461 (42.7%) | a -, b -, c -, d -, e - | 359 |
| 595613e060c69652.pdf (595613e060c69652) | delaware_bidcondocs | none | - / 272,273 | 0 / 38 | 0 / 38 | 38/38 (100.0%) | 151/151 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 7b69696841fe0be6.pdf (7b69696841fe0be6) | delaware_bidcondocs | none | - / 280,281 | 0 / 38 | 0 / 38 | 38/38 (100.0%) | 151/151 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 9014786c78096b94.pdf (9014786c78096b94) | delaware_bidcondocs | spec-only | - / 29,30,31,32,33,34 | 0 / 156 | 0 / 156 | 156/156 (100.0%) | 748/748 (100.0%) | a -, b -, c -, d -, e - | 0 |
| ef4f9bfd055baa96.pdf (ef4f9bfd055baa96) | delaware_bidcondocs | none | - / 2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17 | 0 / 301 | 0 / 301 | 1/302 (0.3%) | 600/1478 (40.6%) | a -, b -, c -, d -, e - | 898 |
| ff53a5ffd4bb171d.pdf (ff53a5ffd4bb171d) | delaware_bidcondocs | none | - / 4 | 0 / 37 | 0 / 36 | 1/37 (2.7%) | 72/142 (50.7%) | a -, b -, c -, d -, e - | 71 |
| plan-sets/fayette_ga_2419_addendum1_plans.pdf (9dffef61b825368d) | Fayette County (GA) | schedule-only | 5,14 / - | 35 / 0 | 53 / 0 | 31/54 (57.4%) | 91/95 (95.8%) | a 25/35, b -, c -, d -, e 33/35 | 24 |
| 0c3e6fa6f7d10337.pdf (0c3e6fa6f7d10337) | missouri_oa_fmdc | none | - / 202 | 0 / 10 | 0 / 10 | 10/10 (100.0%) | 50/50 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 0dabaf10e91593e9.pdf (0dabaf10e91593e9) | missouri_oa_fmdc | schedule-only | 18 / - | 18 / 0 | 18 / 0 | 18/18 (100.0%) | 90/90 (100.0%) | a -, b -, c -, d -, e 18/18 | 0 |
| 13423239b61e7a7a.pdf (13423239b61e7a7a) | missouri_oa_fmdc | spec-only | - / 180,181 | 0 / 29 | 0 / 27 | 27/29 (93.1%) | 135/135 (100.0%) | a -, b -, c -, d -, e - | 2 |
| 18b27b8baa47f0e1.pdf (18b27b8baa47f0e1) | missouri_oa_fmdc | schedule-only | 18,53 / - | 36 / 0 | 36 / 0 | 36/36 (100.0%) | 182/182 (100.0%) | a 4/36, b -, c -, d -, e 36/36 | 0 |
| 194733de48af8797.pdf (194733de48af8797) | missouri_oa_fmdc | schedule-only | 45 / 45 | 16 / 2 | 16 / 4 | 16/22 (72.7%) | 96/96 (100.0%) | a -, b -, c -, d 3/3, e 16/16 | 7 |
| 1d0374f8106ef8ad.pdf (1d0374f8106ef8ad) | missouri_oa_fmdc | spec-only | - / 349,350,351,352,353,354,355,356,357,358,359 | 0 / 238 | 0 / 238 | 2/240 (0.8%) | 474/944 (50.2%) | a -, b -, c -, d -, e - | 474 |
| 2b7024ad75f57ddf.pdf (2b7024ad75f57ddf) | missouri_oa_fmdc | schedule-only | 16 / - | 8 / 0 | 4 / 0 | 4/8 (50.0%) | 16/16 (100.0%) | a 8/8, b -, c -, d 1/2, e 4/8 | 4 |
| 32fa087bf1c11099.pdf (32fa087bf1c11099) | missouri_oa_fmdc | spec-only | - / 224,225 | 0 / 19 | 0 / 19 | 19/19 (100.0%) | 93/93 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 3506f831094dd516.pdf (3506f831094dd516) | missouri_oa_fmdc | schedule-only | 12 / 12 | 16 / 2 | 16 / 2 | 16/20 (80.0%) | 96/96 (100.0%) | a 16/16, b -, c -, d 3/3, e 16/16 | 4 |
| 44111d93bd635936.pdf (44111d93bd635936) | missouri_oa_fmdc | schedule-only | 17 / - | 44 / 0 | 44 / 0 | 44/44 (100.0%) | 220/220 (100.0%) | a -, b -, c -, d -, e 44/44 | 0 |
| 4ee0455611e3d73b.pdf (4ee0455611e3d73b) | missouri_oa_fmdc | spec-only | - / 355,356,357,366,367 | 0 / 41 | 0 / 33 | 1/54 (1.9%) | 38/89 (42.7%) | a -, b -, c -, d -, e - | 85 |
| 681fee601a3c34b1.pdf (681fee601a3c34b1) | missouri_oa_fmdc | schedule-only | 27 / 27 | 26 / 7 | 26 / 5 | 26/38 (68.4%) | 69/69 (100.0%) | a 26/26, b -, c -, d -, e 0/26 | 12 |
| 6e7e2d2bf65c383b.pdf (6e7e2d2bf65c383b) | missouri_oa_fmdc | schedule-only | 81,97,102 / - | 7 / 0 | 19 / 0 | 7/19 (36.8%) | 14/14 (100.0%) | a 0/7, b -, c -, d -, e 0/7 | 12 |
| 70ab5446590e40cc.pdf (70ab5446590e40cc) | missouri_oa_fmdc | schedule-only | 81,97,102 / - | 7 / 0 | 19 / 0 | 7/19 (36.8%) | 14/14 (100.0%) | a 0/7, b -, c -, d -, e 0/7 | 12 |
| 7239a04e6cc8b502.pdf (7239a04e6cc8b502) | missouri_oa_fmdc | schedule-only | 63 / - | 75 / 0 | 75 / 0 | 71/75 (94.7%) | 377/381 (99.0%) | a 70/75, b -, c -, d -, e 68/75 | 4 |
| 73792e72800f0eb7.pdf (73792e72800f0eb7) | missouri_oa_fmdc | spec-only | - / 397,398,399,400,401,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422 | 0 / 193 | 0 / 193 | 180/199 (90.5%) | 868/881 (98.5%) | a -, b -, c -, d -, e - | 27 |
| 7478006f7fd5b43c.pdf (7478006f7fd5b43c) | missouri_oa_fmdc | schedule-only | 28,32,45,46 / - | 211 / 0 | 211 / 0 | 210/211 (99.5%) | 1090/1092 (99.8%) | a 208/211, b -, c -, d 4/11, e 211/211 | 2 |
| 766c8d0ce484ef1f.pdf (766c8d0ce484ef1f) | missouri_oa_fmdc | spec-only | - / 166,167 | 0 / 17 | 0 / 17 | 17/17 (100.0%) | 85/85 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 85ebe6d39ba9fd81.pdf (85ebe6d39ba9fd81) | missouri_oa_fmdc | spec-only | - / 1 | 0 / 4 | 0 / 4 | 4/4 (100.0%) | 20/20 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 87c45b090a4832e8.pdf (87c45b090a4832e8) | missouri_oa_fmdc | none | - / 197,198 | 0 / 10 | 0 / 10 | 10/10 (100.0%) | 50/50 (100.0%) | a -, b -, c -, d -, e - | 0 |
| 89236ffa156fbaf5.pdf (89236ffa156fbaf5) | missouri_oa_fmdc | schedule-only | 42,43 / - | 29 / 0 | 29 / 0 | 29/29 (100.0%) | 143/143 (100.0%) | a 13/29, b -, c -, d 5/5, e 29/29 | 0 |
| 8a70af8566d61d90.pdf (8a70af8566d61d90) | missouri_oa_fmdc | schedule-only | 10 / - | 2 / 0 | 2 / 0 | 2/2 (100.0%) | 10/10 (100.0%) | a -, b -, c -, d -, e 2/2 | 0 |
| 8a99839626a199c6.pdf (8a99839626a199c6) | missouri_oa_fmdc | complete | 19 / 19 | 2 / 9 | 2 / 7 | 1/12 (8.3%) | 20/36 (55.6%) | a 2/2, b 0/1, c -, d -, e 0/2 | 20 |
| 8d7d2f5ad16de960.pdf (8d7d2f5ad16de960) | missouri_oa_fmdc | spec-only | - / 186,187 | 0 / 20 | 0 / 19 | 19/20 (95.0%) | 95/95 (100.0%) | a -, b -, c -, d -, e - | 2 |
| a4b7b0a81c5a6602.pdf (a4b7b0a81c5a6602) | missouri_oa_fmdc | complete | 15,16 / 20 | 14 / 16 | 14 / 14 | 14/31 (45.2%) | 96/122 (78.7%) | a -, b 1/3, c -, d -, e 14/14 | 30 |
| a6de54d2ad086d19.pdf (a6de54d2ad086d19) | missouri_oa_fmdc | spec-only | - / 383,384,385,386,387,388,389,390,391,392,393,394,395,486 | 0 / 213 | 0 / 214 | 212/214 (99.1%) | 844/846 (99.8%) | a -, b -, c -, d -, e - | 3 |
| a9809abcaf40ea04.pdf (a9809abcaf40ea04) | missouri_oa_fmdc | spec-only | - / 190 | 0 / 18 | 0 / 18 | 18/18 (100.0%) | 90/90 (100.0%) | a -, b -, c -, d -, e - | 0 |
| b978c4dede3e2580.pdf (b978c4dede3e2580) | missouri_oa_fmdc | spec-only | - / 369,370,371,372,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394 | 0 / 193 | 0 / 193 | 180/199 (90.5%) | 868/881 (98.5%) | a -, b -, c -, d -, e - | 27 |
| c6611cb8e91110f9.pdf (c6611cb8e91110f9) | missouri_oa_fmdc | none | - / 139 | 0 / 9 | 0 / 9 | 7/9 (77.8%) | 34/37 (91.9%) | a -, b -, c -, d -, e - | 3 |
| cb42b68eb0cc722e.pdf (cb42b68eb0cc722e) | missouri_oa_fmdc | spec-only | - / 335,336 | 0 / 37 | 0 / 37 | 37/37 (100.0%) | 179/179 (100.0%) | a -, b -, c -, d -, e - | 0 |
| e3b0c815e132d7ab.pdf (e3b0c815e132d7ab) | missouri_oa_fmdc | schedule-only | 20 / - | 18 / 0 | 18 / 0 | 18/18 (100.0%) | 92/92 (100.0%) | a 4/18, b -, c -, d -, e 18/18 | 0 |
| e3d0cc1bc22fd824.pdf (e3d0cc1bc22fd824) | missouri_oa_fmdc | schedule-only | 18 / - | 22 / 0 | 22 / 0 | 22/22 (100.0%) | 84/84 (100.0%) | a 22/22, b -, c -, d 3/6, e 22/22 | 0 |
| eefa018e007e581f.pdf (eefa018e007e581f) | missouri_oa_fmdc | schedule-only | 59 / - | 84 / 0 | 84 / 0 | 78/84 (92.9%) | 324/330 (98.2%) | a 39/84, b -, c -, d -, e 77/84 | 6 |
| f2a23b820b4d0a28.pdf (f2a23b820b4d0a28) | missouri_oa_fmdc | spec-only | - / 333,334,335,336,337,338,339,340,341 | 0 / 83 | 0 / 83 | 81/83 (97.6%) | 409/412 (99.3%) | a -, b -, c -, d -, e - | 3 |
| f97e99f88a931e74.pdf (f97e99f88a931e74) | missouri_oa_fmdc | schedule-only | 28,32,44,45 / - | 211 / 0 | 210 / 0 | 210/211 (99.5%) | 1087/1087 (100.0%) | a -, b -, c -, d 4/11, e 211/211 | 1 |
| fa55e486d7646ea2.pdf (fa55e486d7646ea2) | missouri_oa_fmdc | spec-only | - / 331,332 | 0 / 37 | 0 / 37 | 37/37 (100.0%) | 179/179 (100.0%) | a -, b -, c -, d -, e - | 0 |
| specs/df0b49aceba52a7e.pdf (df0b49aceba52a7e) | Noble County Highway Department | spec-only | - / 9,10 | 0 / 35 | 0 / 35 | 33/37 (89.2%) | 161/161 (100.0%) | a -, b -, c -, d -, e - | 6 |
| 21d60f1b54e0e3df.pdf (21d60f1b54e0e3df) | ohio_ofcc | schedule-only | 78,88 / - | 19 / 0 | 58 / 0 | 8/58 (13.8%) | 84/95 (88.4%) | a -, b -, c -, d 5/6, e 19/19 | 50 |
| 4e7e992b311a3f39.pdf (4e7e992b311a3f39) | ohio_ofcc | spec-only | - / 24,25,26,27,28 | 0 / 65 | 0 / 59 | 1/75 (1.3%) | 97/225 (43.1%) | a -, b -, c -, d -, e - | 154 |
| specs/05d675e35802017e.pdf (05d675e35802017e) | Orchard View Public Schools | spec-only | - / 22,23,24,25,26,27,28 | 0 / 72 | 0 / 72 | 71/72 (98.6%) | 332/334 (99.4%) | a -, b -, c -, d -, e - | 3 |
| door-schedules/a03cdcca2934ca5a.pdf (a03cdcca2934ca5a) | Rockford | spec-only | - / 16,17,18,19,20,21,22,23,24,25,26,27,28,29 | 0 / 172 | 0 / 172 | 169/172 (98.3%) | 840/844 (99.5%) | a -, b -, c -, d -, e - | 6 |
| 59c394ce07fc3f78.pdf (59c394ce07fc3f78) | school_district_sites | spec-only | - / 2,3 | 0 / 9 | 0 / 7 | 7/9 (77.8%) | 33/33 (100.0%) | a -, b -, c -, d -, e - | 3 |
| a248cf8b5dee4d92.pdf (a248cf8b5dee4d92) | university_bid_pages | spec-only | - / 23,24,25,26,27,28,29 | 0 / 123 | 0 / 108 | 108/123 (87.8%) | 517/517 (100.0%) | a -, b -, c -, d -, e - | 15 |
| f2c552167c78e1c4.pdf (f2c552167c78e1c4) | university_bid_pages | spec-only | - / 313,314 | 0 / 18 | 0 / 18 | 17/18 (94.4%) | 80/81 (98.8%) | a -, b -, c -, d -, e - | 1 |

Per family (agreed):

| family | PDFs | rows agreed | field agreement | a marks_on_plan | b sets_exist | c set_door_lists | d types_in_legend | e sizes_and_marks | queue |
|---|---|---|---|---|---|---|---|---|---|
| california_dgs_obas | 1 | 81/97 (83.5%) | 248/255 (97.3%) | - | - | - | - | - | 19 |
| delaware_bidcondocs | 6 | 236/766 (30.8%) | 1919/3131 (61.3%) | - | - | - | - | - | 1328 |
| Fayette County (GA) | 1 | 31/54 (57.4%) | 91/95 (95.8%) | 25/35 (71.4%) | - | - | - | 33/35 (94.3%) | 24 |
| missouri_oa_fmdc | 36 | 1690/2118 (79.8%) | 8631/9240 (93.4%) | 412/541 (76.2%) | 1/4 (25.0%) | - | 23/41 (56.1%) | 786/846 (92.9%) | 740 |
| Noble County Highway Department | 1 | 33/37 (89.2%) | 161/161 (100.0%) | - | - | - | - | - | 6 |
| ohio_ofcc | 2 | 9/133 (6.8%) | 181/320 (56.6%) | - | - | - | 5/6 (83.3%) | 19/19 (100.0%) | 204 |
| Orchard View Public Schools | 1 | 71/72 (98.6%) | 332/334 (99.4%) | - | - | - | - | - | 3 |
| Rockford | 1 | 169/172 (98.3%) | 840/844 (99.5%) | - | - | - | - | - | 6 |
| school_district_sites | 1 | 7/9 (77.8%) | 33/33 (100.0%) | - | - | - | - | - | 3 |
| university_bid_pages | 2 | 125/141 (88.7%) | 597/598 (99.8%) | - | - | - | - | - | 16 |

Tier total: rows agreed 2452/3599 (68.1%); queue 2349.

- plan-sets/fayette_ga_2419_addendum1_plans.pdf: marks_on_plan: mark 116A (schedule p.5) not tagged on any plan; mark 119D (schedule p.5) not tagged on any plan; mark 201A (schedule p.5) not tagged on any plan / sizes_and_marks: mark 111A p.5: size "3'-0\" x 7'-0\" MARK" -> 36 x null; mark 201A p.5: size "6'-0\" x 6'-8\" DRAWN DOOR TO ATTIC MECHANICAL" -> 72 x null
- 18b27b8baa47f0e1.pdf: marks_on_plan: mark 100-1 (schedule p.18) not tagged on any plan; mark 100-2 (schedule p.18) not tagged on any plan; mark 101-1 (schedule p.18) not tagged on any plan
- 2b7024ad75f57ddf.pdf: types_in_legend: door type OVHD (4 rows) not found near the door types legend / sizes_and_marks: mark OVHD-1 p.16: size null -> null x null; mark OVHD-2 p.16: size null -> null x null; mark OVHD-3 p.16: size null -> null x null
- 681fee601a3c34b1.pdf: sizes_and_marks: mark 102 p.27: size "2'-8\"" -> null x null; mark 103B p.27: size "2'-8\"" -> null x null; mark 103C p.27: size "3'-0\"" -> null x null
- 6e7e2d2bf65c383b.pdf: marks_on_plan: mark F1 (schedule p.102) not tagged on any plan; mark F1 (schedule p.102) not tagged on any plan; mark F1 (schedule p.102) not tagged on any plan / sizes_and_marks: mark F1 p.102: size null -> null x null; mark F1 p.102: size null -> null x null; mark F1 p.102: size null -> null x null
- 70ab5446590e40cc.pdf: marks_on_plan: mark F1 (schedule p.102) not tagged on any plan; mark F1 (schedule p.102) not tagged on any plan; mark F1 (schedule p.102) not tagged on any plan / sizes_and_marks: mark F1 p.102: size null -> null x null; mark F1 p.102: size null -> null x null; mark F1 p.102: size null -> null x null
- 7239a04e6cc8b502.pdf: marks_on_plan: mark 134 (schedule p.63) not tagged on any plan; mark 173.1 (schedule p.63) not tagged on any plan; mark 173.2 (schedule p.63) not tagged on any plan / sizes_and_marks: mark 100 p.63: size "7'-0\" x 3'-0\"" -> 84 x null; mark 123.1 p.63: size null -> null x null; mark 123.2 p.63: size null -> null x null
- 7478006f7fd5b43c.pdf: marks_on_plan: mark AD101 (schedule p.28) not tagged on any plan; mark PT101 (schedule p.32) not tagged on any plan; mark 102 (schedule p.45) not tagged on any plan / types_in_legend: door type HM-1(PR) (1 rows) not found near the door types legend; frame type TYP-2 (47 rows) not found near the frame types legend; frame type TYP-1 (3 rows) not found near the frame types legend
- 89236ffa156fbaf5.pdf: marks_on_plan: mark 129C (schedule p.42) not tagged on any plan; mark 160 (schedule p.42) not tagged on any plan; mark 161 (schedule p.42) not tagged on any plan
- 8a99839626a199c6.pdf: sets_exist: schedule set MATCH EXIST. not in 08 71 00 (sets read: 1, 2) / sizes_and_marks: mark D1 p.19: size "6'-10\" x 2'-8\"" -> 82 x null; mark D2 p.19: size "6'-10\" x 2'-6\"" -> 82 x null
- a4b7b0a81c5a6602.pdf: sets_exist: schedule set 01 not in 08 71 00 (sets read: (CONTINUED), 3); schedule set 02 not in 08 71 00 (sets read: (CONTINUED), 3)
- e3b0c815e132d7ab.pdf: marks_on_plan: mark 100-1 (schedule p.20) not tagged on any plan; mark 100-2 (schedule p.20) not tagged on any plan; mark 101-1 (schedule p.20) not tagged on any plan
- e3d0cc1bc22fd824.pdf: types_in_legend: frame type F3 (1 rows) not found near the frame types legend; frame type F1 (2 rows) not found near the frame types legend; frame type F2 (11 rows) not found near the frame types legend
- eefa018e007e581f.pdf: marks_on_plan: mark 100-1 (schedule p.59) not tagged on any plan; mark 100-2 (schedule p.59) not tagged on any plan; mark 102-1 (schedule p.59) not tagged on any plan / sizes_and_marks: mark 200-6 p.59: size "2' - 0\" x 2' - 0\"" -> 24 x null; mark 200-7 p.59: size "2' - 5\" x 2' - 5\"" -> 29 x null; mark 200-8 p.59: size "2' - 5\" x 2' - 5\"" -> 29 x null
- f97e99f88a931e74.pdf: types_in_legend: door type HM-1(PR) (1 rows) not found near the door types legend; frame type TYP-2 (47 rows) not found near the frame types legend; frame type TYP-1 (3 rows) not found near the frame types legend
- 21d60f1b54e0e3df.pdf: types_in_legend: frame type SF (16 rows) not found near the frame types legend

## Tier: oracle-checked (16 PDFs)

| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |
|---|---|---|---|---|---|---|---|---|---|
| door-schedules/7586a61c5ac75707.pdf (7586a61c5ac75707) | Connor Consolidated School / Maine BGS | schedule-only | 3 / - | 6 / 0 | 6 / 0 | 0/6 (0.0%) | 34/42 (81.0%) | a -, b -, c -, d 2/2, e 6/6 | 8 |
| 15b85ca679307cc1.pdf (15b85ca679307cc1) | missouri_oa_fmdc | schedule-only | 15 / - | 33 / 0 | 0 / 0 | 0/33 (0.0%) | n/a | a 33/33, b -, c -, d -, e 16/33 | 33 |
| 192a16af8f31ae0c.pdf (192a16af8f31ae0c) | missouri_oa_fmdc | schedule-only | 10 / - | 49 / 0 | 0 / 0 | 0/49 (0.0%) | n/a | a 49/49, b -, c -, d -, e 49/49 | 49 |
| 2dcaf854a34b17e8.pdf (2dcaf854a34b17e8) | missouri_oa_fmdc | schedule-only | 12 / - | 3 / 0 | 0 / 0 | 0/3 (0.0%) | n/a | a 2/3, b -, c -, d -, e 0/3 | 3 |
| 3fd2388877347d09.pdf (3fd2388877347d09) | missouri_oa_fmdc | complete | 13 / 13 | 9 / 25 | 9 / 1 | 0/35 (0.0%) | 19/35 (54.3%) | a 5/9, b 2/4, c -, d -, e 5/9 | 43 |
| 4908fa633a44f761.pdf (4908fa633a44f761) | missouri_oa_fmdc | schedule-only | 15 / - | 33 / 0 | 0 / 0 | 0/33 (0.0%) | n/a | a 33/33, b -, c -, d -, e 16/33 | 33 |
| 4af80165bc367de8.pdf (4af80165bc367de8) | missouri_oa_fmdc | schedule-only | 7 / - | 4 / 0 | 0 / 0 | 0/4 (0.0%) | n/a | a 2/4, b -, c -, d -, e 4/4 | 4 |
| 66a4b9f32d9fc75b.pdf (66a4b9f32d9fc75b) | missouri_oa_fmdc | schedule-only | 3 / - | 33 / 0 | 0 / 0 | 0/33 (0.0%) | n/a | a -, b -, c -, d -, e 16/33 | 33 |
| 6742faed77cfde33.pdf (6742faed77cfde33) | missouri_oa_fmdc | schedule-only | 8 / - | 11 / 0 | 0 / 0 | 0/11 (0.0%) | n/a | a 11/11, b -, c -, d -, e 11/11 | 11 |
| 89fb03ce95eb4fc3.pdf (89fb03ce95eb4fc3) | missouri_oa_fmdc | schedule-only | 32 / - | 3 / 0 | 0 / 0 | 0/3 (0.0%) | n/a | a -, b -, c -, d -, e 3/3 | 3 |
| 977cec6301f40433.pdf (977cec6301f40433) | missouri_oa_fmdc | schedule-only | 10 / 10 | 3 / 12 | 3 / 19 | 0/37 (0.0%) | n/a | a -, b -, c -, d 2/2, e 3/3 | 37 |
| b116a0570cbe0357.pdf (b116a0570cbe0357) | missouri_oa_fmdc | schedule-only | 18 / - | 3 / 0 | 0 / 0 | 0/3 (0.0%) | n/a | a -, b -, c -, d -, e 3/3 | 3 |
| d97676451b6159b1.pdf (d97676451b6159b1) | missouri_oa_fmdc | schedule-only | 22 / - | 4 / 0 | 4 / 0 | 0/4 (0.0%) | 7/12 (58.3%) | a 0/4, b -, c -, d -, e 3/4 | 5 |
| df2c6ec2225731d7.pdf (df2c6ec2225731d7) | missouri_oa_fmdc | schedule-only | 10 / - | 4 / 0 | 0 / 0 | 0/4 (0.0%) | n/a | a -, b -, c -, d -, e 0/4 | 4 |
| df76d4056a456207.pdf (df76d4056a456207) | missouri_oa_fmdc | pair | 114,118 / 114 | 2 / 19 | 19 / 13 | 0/51 (0.0%) | 0/8 (0.0%) | a -, b -, c 0/1, d 0/2, e 0/2 | 61 |
| 7b0f774a5d8eb62f.pdf (7b0f774a5d8eb62f) | ohio_ofcc | schedule-only | 12 / - | 1 / 0 | 1 / 0 | 0/1 (0.0%) | 2/5 (40.0%) | a -, b -, c -, d -, e 1/1 | 3 |

Per family (oracle-checked):

| family | PDFs | rows agreed | field agreement | a marks_on_plan | b sets_exist | c set_door_lists | d types_in_legend | e sizes_and_marks | queue |
|---|---|---|---|---|---|---|---|---|---|
| Connor Consolidated School / Maine BGS | 1 | 0/6 (0.0%) | 34/42 (81.0%) | - | - | - | 2/2 (100.0%) | 6/6 (100.0%) | 8 |
| missouri_oa_fmdc | 14 | 0/303 (0.0%) | 26/55 (47.3%) | 135/146 (92.5%) | 2/4 (50.0%) | 0/1 (0.0%) | 2/4 (50.0%) | 129/194 (66.5%) | 322 |
| ohio_ofcc | 1 | 0/1 (0.0%) | 2/5 (40.0%) | - | - | - | - | 1/1 (100.0%) | 3 |

Tier total: rows agreed 0/310 (0.0%); queue 333.

- 15b85ca679307cc1.pdf: sizes_and_marks: mark 101 p.15: size "E x ISTING ALUM STOREFRONT DOOR SYSTEM TO REMAIN" -> null x null; mark 107 p.15: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null; mark 107A p.15: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null
- 2dcaf854a34b17e8.pdf: marks_on_plan: mark 2X (schedule p.12) not tagged on any plan / sizes_and_marks: mark 101 p.12: size null -> null x null; mark 102 p.12: size null -> null x null; mark 2X p.12: size null -> null x null
- 3fd2388877347d09.pdf: marks_on_plan: mark OH01 (schedule p.13) not tagged on any plan; mark OH02 (schedule p.13) not tagged on any plan; mark OH03 (schedule p.13) not tagged on any plan / sets_exist: schedule set 3 not in 08 71 00 (sets read: 1, 2); schedule set MANUF. not in 08 71 00 (sets read: 1, 2) / sizes_and_marks: mark 001 p.13: size "3'-0\"/2'-6\" x 7'-0\"" -> null x 84; mark 003 p.13: size "3'-0\" x 7'-0\" HOLLOW" -> 36 x null; mark 004 p.13: size "3'-0\" x 7'-0\" HOLLOW" -> 36 x null
- 4908fa633a44f761.pdf: sizes_and_marks: mark 101 p.15: size "E x ISTING ALUM STOREFRONT DOOR SYSTEM TO REMAIN" -> null x null; mark 107 p.15: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null; mark 107A p.15: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null
- 4af80165bc367de8.pdf: marks_on_plan: mark 116B (schedule p.7) not tagged on any plan; mark 123A (schedule p.7) not tagged on any plan
- 66a4b9f32d9fc75b.pdf: sizes_and_marks: mark 101 p.3: size "E x ISTING ALUM STOREFRONT DOOR SYSTEM TO REMAIN" -> null x null; mark 107 p.3: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null; mark 107A p.3: size "E x ISTING DOOR & FRAME TO REMAIN" -> null x null
- d97676451b6159b1.pdf: marks_on_plan: mark 101 (schedule p.22) not tagged on any plan; mark 102 (schedule p.22) not tagged on any plan; mark 103 (schedule p.22) not tagged on any plan / sizes_and_marks: mark 104 p.22: size "2' - 6\" COMMENTS: x 6' - 8\"" -> null x 80
- df2c6ec2225731d7.pdf: sizes_and_marks: mark 101 p.10: size null -> null x null; mark 102 p.10: size null -> null x null; mark 2X p.10: size null -> null x null
- df76d4056a456207.pdf: set_door_lists: set 9: list names 2, schedule carries 0; listed but not on schedule with this set: 1 2 / types_in_legend: door type I (2 rows) not found near the door types legend; frame type A19 (2 rows) not found near the frame types legend / sizes_and_marks: mark KEH1 p.118: size "9\" x 20\" / 2" -> null x null; mark KEH1 p.118: size "10\" x 10\" / 2" -> null x null

## Tier: unread (542 PDFs)

| PDF | family | class | schedule p. / hardware p. | A doors / items | B doors / items | rows agreed | field agreement | oracles (pass/total) | queue |
|---|---|---|---|---|---|---|---|---|---|
| 787f4789180fe427.pdf (787f4789180fe427) | california_dgs_obas | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8578719ee6ac0384.pdf (8578719ee6ac0384) | california_dgs_obas | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 87e9a3bb8105b26a.pdf (87e9a3bb8105b26a) | california_dgs_obas | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b00024dc62942d01.pdf (b00024dc62942d01) | california_dgs_obas | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| de34006cc5f5ce81.pdf (de34006cc5f5ce81) | california_dgs_obas | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| door-schedules/3613c8cf8793a451.pdf (3613c8cf8793a451) | Christina | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| door-schedules/698d75cbfa43c61e.pdf (698d75cbfa43c61e) | Christina | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| specs/4743b24c01862b5f.pdf (4743b24c01862b5f) | City of Worcester / Worcester Public Schools | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6fdd1c2bc4e377ea.pdf (6fdd1c2bc4e377ea) | civicplus_documentcenter | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 36752ef3a65a3014.pdf (36752ef3a65a3014) | delaware_bidcondocs | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 445a88a2ee0c80b2.pdf (445a88a2ee0c80b2) | delaware_bidcondocs | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8f985ae512f28f45.pdf (8f985ae512f28f45) | delaware_bidcondocs | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b21a6e555884848d.pdf (b21a6e555884848d) | delaware_bidcondocs | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 014c6f8ae2d6c158.pdf (014c6f8ae2d6c158) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 01c4eb6f59501165.pdf (01c4eb6f59501165) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 01e8e139c7fe8fb9.pdf (01e8e139c7fe8fb9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 01fef74556b437d4.pdf (01fef74556b437d4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 02207abd41ae353d.pdf (02207abd41ae353d) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 02cd1539c98e2e7d.pdf (02cd1539c98e2e7d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0438e17bff02f253.pdf (0438e17bff02f253) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 04917b3deafa2af5.pdf (04917b3deafa2af5) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 04cebdda020407dd.pdf (04cebdda020407dd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 05121ff9bf137ff2.pdf (05121ff9bf137ff2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 053883c6630d3ca4.pdf (053883c6630d3ca4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 05608ea9e887b73f.pdf (05608ea9e887b73f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0562188794c2fdd1.pdf (0562188794c2fdd1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 057611111badcce6.pdf (057611111badcce6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 059b72fb1702ce44.pdf (059b72fb1702ce44) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 05efae640e4e8a50.pdf (05efae640e4e8a50) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 07777e8e85f2039e.pdf (07777e8e85f2039e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 07b3b5e5ee786a5e.pdf (07b3b5e5ee786a5e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 07ca51cf0349bef1.pdf (07ca51cf0349bef1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 08222a6152c7525b.pdf (08222a6152c7525b) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0830cebf1ec13b7e.pdf (0830cebf1ec13b7e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0a11467a5730ccb1.pdf (0a11467a5730ccb1) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0acdca2c711619f4.pdf (0acdca2c711619f4) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0ad0a644c1e0ee90.pdf (0ad0a644c1e0ee90) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0b332388f922e8ec.pdf (0b332388f922e8ec) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0c3f3cdf49c42ec3.pdf (0c3f3cdf49c42ec3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0c6a67bea90d6181.pdf (0c6a67bea90d6181) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0d27143b5fdca774.pdf (0d27143b5fdca774) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0d518909fb8349f9.pdf (0d518909fb8349f9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0e1cd50b40da91e0.pdf (0e1cd50b40da91e0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0eb1a5109964db1f.pdf (0eb1a5109964db1f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0f087df36e1bc91c.pdf (0f087df36e1bc91c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 102f0aa46317f520.pdf (102f0aa46317f520) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1167c3d7b404983f.pdf (1167c3d7b404983f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 125564a18de2ff6b.pdf (125564a18de2ff6b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 128d1f39fb8e317b.pdf (128d1f39fb8e317b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 13c6b0f4fbcf0d7f.pdf (13c6b0f4fbcf0d7f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 141cdd05a1701a6e.pdf (141cdd05a1701a6e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1463b6744ee4f291.pdf (1463b6744ee4f291) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 157c72762449d265.pdf (157c72762449d265) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 161c8e7f05943db7.pdf (161c8e7f05943db7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1745b65f8f8d7ec1.pdf (1745b65f8f8d7ec1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1763668d3b56c587.pdf (1763668d3b56c587) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 17f3d8a8b77d3731.pdf (17f3d8a8b77d3731) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1850c88365fdba06.pdf (1850c88365fdba06) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1859c08cd450a2bd.pdf (1859c08cd450a2bd) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1869dbedda484452.pdf (1869dbedda484452) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 18ceb7ae9fd8e87d.pdf (18ceb7ae9fd8e87d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 197b7cbaddfe850c.pdf (197b7cbaddfe850c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 19b8647df16c386e.pdf (19b8647df16c386e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1ab191dd9b1c5c98.pdf (1ab191dd9b1c5c98) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1abc74ab5e14afc4.pdf (1abc74ab5e14afc4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1ad7eba501a16684.pdf (1ad7eba501a16684) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1b135b7527049b0a.pdf (1b135b7527049b0a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1b2c4bc26b1ad520.pdf (1b2c4bc26b1ad520) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1bf58869b846dcf7.pdf (1bf58869b846dcf7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1c5f3c6800774c1d.pdf (1c5f3c6800774c1d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1ca5c02c2d5b92e1.pdf (1ca5c02c2d5b92e1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1d290a3c796d7ee8.pdf (1d290a3c796d7ee8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1d870cff3a0080de.pdf (1d870cff3a0080de) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1dc71da52a8911a6.pdf (1dc71da52a8911a6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1ed738a3c54e4dec.pdf (1ed738a3c54e4dec) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 1f3d7195503d4af5.pdf (1f3d7195503d4af5) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 203b65e8ead1db1f.pdf (203b65e8ead1db1f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 20fd2cf1e2b4e4a7.pdf (20fd2cf1e2b4e4a7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 211d0a2a6ec122d9.pdf (211d0a2a6ec122d9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2142df4cc2290373.pdf (2142df4cc2290373) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 21d27218aa40a570.pdf (21d27218aa40a570) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 220cb22ab617e0f4.pdf (220cb22ab617e0f4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 228666ed0b112248.pdf (228666ed0b112248) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 23d0610c5158a23b.pdf (23d0610c5158a23b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 23eebfaa6e871deb.pdf (23eebfaa6e871deb) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 23febdeb29ca9df4.pdf (23febdeb29ca9df4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 24010d5e8535e65c.pdf (24010d5e8535e65c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 242d2fa096dc152c.pdf (242d2fa096dc152c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 249f8761de1ab0a0.pdf (249f8761de1ab0a0) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 25b38d28cff03b38.pdf (25b38d28cff03b38) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 25c49ef50bd14aa8.pdf (25c49ef50bd14aa8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 25d985afd74a9ad2.pdf (25d985afd74a9ad2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 265434ca71ab1acd.pdf (265434ca71ab1acd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 26b15bdcec6a82d6.pdf (26b15bdcec6a82d6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 27413bf3c25d2a48.pdf (27413bf3c25d2a48) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 277c2a486b34df55.pdf (277c2a486b34df55) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 28de4435bdaff0b3.pdf (28de4435bdaff0b3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 29a0de4cf3213be1.pdf (29a0de4cf3213be1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 29d2809d82307086.pdf (29d2809d82307086) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2afad1f6f765851b.pdf (2afad1f6f765851b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2b68bb45f5993150.pdf (2b68bb45f5993150) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2b79865b11790f32.pdf (2b79865b11790f32) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2b94772c51b808a2.pdf (2b94772c51b808a2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2baf6eeb4d6ff696.pdf (2baf6eeb4d6ff696) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2dbeb034695510a4.pdf (2dbeb034695510a4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2ef53e0ac322782e.pdf (2ef53e0ac322782e) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2fd55e951f2c2993.pdf (2fd55e951f2c2993) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2ffea3533bdb0727.pdf (2ffea3533bdb0727) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 30f8a4e47b456836.pdf (30f8a4e47b456836) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 314201089b256dbe.pdf (314201089b256dbe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 316358ab316fe16d.pdf (316358ab316fe16d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3270a1849c7d03d1.pdf (3270a1849c7d03d1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 32b631d235082c7c.pdf (32b631d235082c7c) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 34a28cfeeef77c75.pdf (34a28cfeeef77c75) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 351bea1177c74b91.pdf (351bea1177c74b91) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 359a1923e626a461.pdf (359a1923e626a461) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 35e1e5a57a0a54ff.pdf (35e1e5a57a0a54ff) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 35f15fbbef803979.pdf (35f15fbbef803979) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 36ffbc7f1c8f4dd9.pdf (36ffbc7f1c8f4dd9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 379d62d7e974df36.pdf (379d62d7e974df36) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 37d20cba4390c2a0.pdf (37d20cba4390c2a0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3808360a251cfa8c.pdf (3808360a251cfa8c) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 390a78e54d80424f.pdf (390a78e54d80424f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 39464574afe1841b.pdf (39464574afe1841b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3952cacfa1762e9c.pdf (3952cacfa1762e9c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3a5a01cdd8fab103.pdf (3a5a01cdd8fab103) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3aa0946f94cf6aa7.pdf (3aa0946f94cf6aa7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3b0cb226a793d955.pdf (3b0cb226a793d955) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3b87f69a7e56ac02.pdf (3b87f69a7e56ac02) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3c17d4c83483a22c.pdf (3c17d4c83483a22c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3c3b0c6a2343fd50.pdf (3c3b0c6a2343fd50) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3c75b7927ebbc8e3.pdf (3c75b7927ebbc8e3) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3d04250aba6f8fe1.pdf (3d04250aba6f8fe1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3d190df7097eec42.pdf (3d190df7097eec42) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3d1ea94433269e5d.pdf (3d1ea94433269e5d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3d747800486f5bba.pdf (3d747800486f5bba) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3ef4b0f325533f61.pdf (3ef4b0f325533f61) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3f2340a8b3e4a2fe.pdf (3f2340a8b3e4a2fe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3f3b7ca0c349e2a5.pdf (3f3b7ca0c349e2a5) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3f4359137b47a5f0.pdf (3f4359137b47a5f0) | missouri_oa_fmdc | spec-only | - / 1 | 0 / 16 | 0 / 16 | 0/32 (0.0%) | n/a | a -, b -, c -, d -, e - | 34 |
| 3f830a5f75c47eeb.pdf (3f830a5f75c47eeb) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3f8a6b971a3c902e.pdf (3f8a6b971a3c902e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 3fedac1a7175f82b.pdf (3fedac1a7175f82b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 400e8c6b5df592d0.pdf (400e8c6b5df592d0) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 40177ab31e8e56cd.pdf (40177ab31e8e56cd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 41917ea2a5eeda67.pdf (41917ea2a5eeda67) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 41f56a81d206ffac.pdf (41f56a81d206ffac) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 41fd5fc67dcaa81a.pdf (41fd5fc67dcaa81a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 41ffea1437279ea0.pdf (41ffea1437279ea0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 42328229562da392.pdf (42328229562da392) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4324c330edfd4954.pdf (4324c330edfd4954) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 43a1f0db3f7ff345.pdf (43a1f0db3f7ff345) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 452a2e0ea047cd23.pdf (452a2e0ea047cd23) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4597f173e1d67daf.pdf (4597f173e1d67daf) | missouri_oa_fmdc | plan-only | 33 / - | 1 / 0 | 6 / 0 | 0/7 (0.0%) | n/a | a -, b -, c -, d -, e - | 7 |
| 45b5536d4d5a611e.pdf (45b5536d4d5a611e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 45ff8821520ca42b.pdf (45ff8821520ca42b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 46d8ea54dbd1c0d1.pdf (46d8ea54dbd1c0d1) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 46f594abf65fdb03.pdf (46f594abf65fdb03) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 480dc55c0d2be24a.pdf (480dc55c0d2be24a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4834889b47b8107b.pdf (4834889b47b8107b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 488d3da15a88bef8.pdf (488d3da15a88bef8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 48c40fd22aeded03.pdf (48c40fd22aeded03) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 494aea999f0c15bf.pdf (494aea999f0c15bf) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4972df84962bee54.pdf (4972df84962bee54) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4974cfdc4019ec89.pdf (4974cfdc4019ec89) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4a265af143c73b68.pdf (4a265af143c73b68) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4bb9303c88e243d4.pdf (4bb9303c88e243d4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4bd6674f938a636e.pdf (4bd6674f938a636e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4c6b3f45d61978e1.pdf (4c6b3f45d61978e1) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4d7dd78790db703e.pdf (4d7dd78790db703e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4d8051b462351e64.pdf (4d8051b462351e64) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4df4001c95b2c62a.pdf (4df4001c95b2c62a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 4f1e9995e401cd5d.pdf (4f1e9995e401cd5d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 50909be43cbd0449.pdf (50909be43cbd0449) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 50b9674dfd9402fb.pdf (50b9674dfd9402fb) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 51f3388d0d4dc468.pdf (51f3388d0d4dc468) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5310d964ade700ab.pdf (5310d964ade700ab) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5352132fa1887baf.pdf (5352132fa1887baf) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 53692601ef1e4080.pdf (53692601ef1e4080) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 537f49f81ca81cd3.pdf (537f49f81ca81cd3) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 53d6bc37e4c054b3.pdf (53d6bc37e4c054b3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 53e0ad03512ccd51.pdf (53e0ad03512ccd51) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 54c1fe66c4ab2254.pdf (54c1fe66c4ab2254) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5514a4c4984fc60f.pdf (5514a4c4984fc60f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 551795eefc942630.pdf (551795eefc942630) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 55811b7ea27ea93c.pdf (55811b7ea27ea93c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5582b45d115bc18b.pdf (5582b45d115bc18b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 55ac1ce2c909c322.pdf (55ac1ce2c909c322) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5612a5baa5ea31fa.pdf (5612a5baa5ea31fa) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5648348d1c7752dd.pdf (5648348d1c7752dd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5679feac4b39748a.pdf (5679feac4b39748a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 57eb921909ab4f3b.pdf (57eb921909ab4f3b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5865e9e8ce4f0a4b.pdf (5865e9e8ce4f0a4b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 58fcc5f56bc6e1c1.pdf (58fcc5f56bc6e1c1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5980eba4ba0ff1cd.pdf (5980eba4ba0ff1cd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 59971f832e053a3d.pdf (59971f832e053a3d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 599b5fbfd8ba8149.pdf (599b5fbfd8ba8149) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 59ddd2ddbb912c3d.pdf (59ddd2ddbb912c3d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5a3d03f5fbec7091.pdf (5a3d03f5fbec7091) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5bcf553a42bb1843.pdf (5bcf553a42bb1843) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5beeabd88969dca6.pdf (5beeabd88969dca6) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5c398745bd39b247.pdf (5c398745bd39b247) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5c3ccc450be545f9.pdf (5c3ccc450be545f9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5cd419534aad66db.pdf (5cd419534aad66db) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5d87309e4ef2f6a9.pdf (5d87309e4ef2f6a9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5dd323c97267dce4.pdf (5dd323c97267dce4) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5df8adfeeeb0c624.pdf (5df8adfeeeb0c624) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5df97513cff80a9a.pdf (5df97513cff80a9a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5e18a37ae97680f7.pdf (5e18a37ae97680f7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5ea4fbdfa0af25cf.pdf (5ea4fbdfa0af25cf) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5f61d18622c0845a.pdf (5f61d18622c0845a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5f647581c9504729.pdf (5f647581c9504729) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5fd2a7c90059b081.pdf (5fd2a7c90059b081) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5fd552afee701a12.pdf (5fd552afee701a12) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5ff41eaaa77054ee.pdf (5ff41eaaa77054ee) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 60b6d30fc22b94de.pdf (60b6d30fc22b94de) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6111f9581b14cf12.pdf (6111f9581b14cf12) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 61bd6a483519458e.pdf (61bd6a483519458e) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 62e171520ccf4672.pdf (62e171520ccf4672) | missouri_oa_fmdc | schedule-only | 3 / - | 0 / 0 | 1 / 0 | 0/1 (0.0%) | n/a | a -, b -, c -, d -, e - | 1 |
| 62ea85ae17a77231.pdf (62ea85ae17a77231) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 63036b35e440b973.pdf (63036b35e440b973) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 63252ee388d6a45d.pdf (63252ee388d6a45d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 639c7a837ce9700d.pdf (639c7a837ce9700d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6402249730ba82c7.pdf (6402249730ba82c7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 64381a794924b4df.pdf (64381a794924b4df) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 65f2566f745304d7.pdf (65f2566f745304d7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 66142f0d268ffe78.pdf (66142f0d268ffe78) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 66aae60521c84020.pdf (66aae60521c84020) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 674e8c0ea89da178.pdf (674e8c0ea89da178) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 680476532860241b.pdf (680476532860241b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 692f520e99bc468d.pdf (692f520e99bc468d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 698a8b99affd19b3.pdf (698a8b99affd19b3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6b29d315350e41a0.pdf (6b29d315350e41a0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6b9db5ca70ad2758.pdf (6b9db5ca70ad2758) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6bcfd6d4a4274c96.pdf (6bcfd6d4a4274c96) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6c1ece9494edad7f.pdf (6c1ece9494edad7f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6c5b563d0c6d806a.pdf (6c5b563d0c6d806a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6c768fb11d2497b0.pdf (6c768fb11d2497b0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6c88981edc5e97ab.pdf (6c88981edc5e97ab) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6d0c2a6d945fd0c0.pdf (6d0c2a6d945fd0c0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6e05a02185b4a17e.pdf (6e05a02185b4a17e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6e64557495b3e21a.pdf (6e64557495b3e21a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6ed382d77bb284b6.pdf (6ed382d77bb284b6) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6ef5f624af8e391f.pdf (6ef5f624af8e391f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 714bef588c904504.pdf (714bef588c904504) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7176aeb37d37d8f7.pdf (7176aeb37d37d8f7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 72b12ee9d9641e73.pdf (72b12ee9d9641e73) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 72bedaaba4d51d4f.pdf (72bedaaba4d51d4f) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7382de8de1294cea.pdf (7382de8de1294cea) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 739603b30049e99d.pdf (739603b30049e99d) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 741f3c11563f5821.pdf (741f3c11563f5821) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 749d664b8ab657f7.pdf (749d664b8ab657f7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7533d61f9d3dc568.pdf (7533d61f9d3dc568) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 75610b3aa870bd75.pdf (75610b3aa870bd75) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 762886fc01d140d0.pdf (762886fc01d140d0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 763d81a5f26dbe99.pdf (763d81a5f26dbe99) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 76e857e3a9cfd874.pdf (76e857e3a9cfd874) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 77690d35232e111f.pdf (77690d35232e111f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 77e4a50079448e69.pdf (77e4a50079448e69) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 784aa0a0a8bf212c.pdf (784aa0a0a8bf212c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 78917ebbb84c7bd2.pdf (78917ebbb84c7bd2) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 79b595e2bb962a47.pdf (79b595e2bb962a47) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7a5b3f3f07dd0e85.pdf (7a5b3f3f07dd0e85) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7a7c6eb490500bf5.pdf (7a7c6eb490500bf5) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7b4a0340c8d4a849.pdf (7b4a0340c8d4a849) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7cb737cbff8b12f3.pdf (7cb737cbff8b12f3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7db52ea3668990a7.pdf (7db52ea3668990a7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7dbe706f7dd14eee.pdf (7dbe706f7dd14eee) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7e33d50c3241bc57.pdf (7e33d50c3241bc57) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 7f80a1d037c430a1.pdf (7f80a1d037c430a1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 805e38493de375ea.pdf (805e38493de375ea) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8062333b32064ab5.pdf (8062333b32064ab5) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 80a841ef6227ace0.pdf (80a841ef6227ace0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 80f954741777f0ff.pdf (80f954741777f0ff) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 81205af4bc88c57f.pdf (81205af4bc88c57f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 812a9ce915558290.pdf (812a9ce915558290) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 82f455c55139f8ff.pdf (82f455c55139f8ff) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 83c94e6dc8be63f2.pdf (83c94e6dc8be63f2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 83f33ccceca81d8d.pdf (83f33ccceca81d8d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 852ab605fd4886b6.pdf (852ab605fd4886b6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 857ea2afb1b3c214.pdf (857ea2afb1b3c214) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 870a74de2949a3dc.pdf (870a74de2949a3dc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 87418ef9c44c875f.pdf (87418ef9c44c875f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8900a915fe932a31.pdf (8900a915fe932a31) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 897fcc70aa408db6.pdf (897fcc70aa408db6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8982c1c80bbdff7b.pdf (8982c1c80bbdff7b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8a1635f1549f28c4.pdf (8a1635f1549f28c4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8a464985c1312963.pdf (8a464985c1312963) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8aeedf6f43a7d75a.pdf (8aeedf6f43a7d75a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8beba21f6d7cb405.pdf (8beba21f6d7cb405) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8c02530985342e28.pdf (8c02530985342e28) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8c1d2f38320c038f.pdf (8c1d2f38320c038f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8c313f49464c9ece.pdf (8c313f49464c9ece) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8c336c43fa7f9668.pdf (8c336c43fa7f9668) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8c77fa69fc375a81.pdf (8c77fa69fc375a81) | missouri_oa_fmdc | spec-only | 115 / 35,36,37,38,39,40,41,42,43,44,45,46,47 | 0 / 262 | 8 / 250 | 0/306 (0.0%) | 421/1013 (41.6%) | a -, b -, c -, d -, e - | 685 |
| 8cdacedd59871758.pdf (8cdacedd59871758) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8d175054a3b02796.pdf (8d175054a3b02796) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8d33d943bed5adfc.pdf (8d33d943bed5adfc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8d58ff441ef70cca.pdf (8d58ff441ef70cca) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8dd57bbf7dd1b4f2.pdf (8dd57bbf7dd1b4f2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8e7640eb83808a13.pdf (8e7640eb83808a13) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 8f0690f913bb2158.pdf (8f0690f913bb2158) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 902a9dc2687091f6.pdf (902a9dc2687091f6) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 90ee27ac625e19b3.pdf (90ee27ac625e19b3) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9107df83a5342bbd.pdf (9107df83a5342bbd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 911663489cfb9745.pdf (911663489cfb9745) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9194f7a6554b23a0.pdf (9194f7a6554b23a0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 91b46ab08eb49a10.pdf (91b46ab08eb49a10) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 925a8e35e1c99235.pdf (925a8e35e1c99235) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9283b2c753b99250.pdf (9283b2c753b99250) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 931de4a42970408b.pdf (931de4a42970408b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 93e5740d31b51be5.pdf (93e5740d31b51be5) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9431a7bb1bd9293e.pdf (9431a7bb1bd9293e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 949574350f03215d.pdf (949574350f03215d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9539481c2cfda818.pdf (9539481c2cfda818) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 964f1753a534dc75.pdf (964f1753a534dc75) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 1 |
| 96a1f576258288dc.pdf (96a1f576258288dc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 96a50bac34588068.pdf (96a50bac34588068) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 976ff7c9e2730b45.pdf (976ff7c9e2730b45) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 97a5b061c23c63b1.pdf (97a5b061c23c63b1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 980646e24299b097.pdf (980646e24299b097) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 98b7d32414e7c748.pdf (98b7d32414e7c748) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 99602b3d30905b9d.pdf (99602b3d30905b9d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 99d71cc0897758df.pdf (99d71cc0897758df) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9a67782c15a9267b.pdf (9a67782c15a9267b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9a8212953a743380.pdf (9a8212953a743380) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9ae8852eb6afab51.pdf (9ae8852eb6afab51) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9c27ae710c6f9a78.pdf (9c27ae710c6f9a78) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9d323de6e388caf2.pdf (9d323de6e388caf2) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9dcdd09794e13ff3.pdf (9dcdd09794e13ff3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9e3520243bb13d9a.pdf (9e3520243bb13d9a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9e4c88e75ccdfd41.pdf (9e4c88e75ccdfd41) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 9ebe3bd1a816592a.pdf (9ebe3bd1a816592a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a00155cd049b0ca8.pdf (a00155cd049b0ca8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a011ed727a8c9942.pdf (a011ed727a8c9942) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a027b94b8006dabf.pdf (a027b94b8006dabf) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a04d9c7f96623591.pdf (a04d9c7f96623591) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a1293439ff6b37d2.pdf (a1293439ff6b37d2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a18e530c03d503be.pdf (a18e530c03d503be) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a2575af396c7580f.pdf (a2575af396c7580f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a2f285da0373a15a.pdf (a2f285da0373a15a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a3192f1b0abf4e4f.pdf (a3192f1b0abf4e4f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a37a5cda56d67ec8.pdf (a37a5cda56d67ec8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a51d6c53e624c6b4.pdf (a51d6c53e624c6b4) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a535a4ff7f40a321.pdf (a535a4ff7f40a321) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a65abf8b442a96c2.pdf (a65abf8b442a96c2) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a6699df61f9e01fe.pdf (a6699df61f9e01fe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a71daa35d8d7a7b4.pdf (a71daa35d8d7a7b4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a7639a4a627d1e08.pdf (a7639a4a627d1e08) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a76df6dd733c9eeb.pdf (a76df6dd733c9eeb) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a8a38d8e29b96013.pdf (a8a38d8e29b96013) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a93f05a0ea0378a3.pdf (a93f05a0ea0378a3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a98bdba1743bc3d2.pdf (a98bdba1743bc3d2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a9d683a98e0e2bb3.pdf (a9d683a98e0e2bb3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| aadb27653f3e341d.pdf (aadb27653f3e341d) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| aafa0dbff46c0d65.pdf (aafa0dbff46c0d65) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ad1de90100b8c7ab.pdf (ad1de90100b8c7ab) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ad60d9552013a5fe.pdf (ad60d9552013a5fe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ae76db062cdc63a9.pdf (ae76db062cdc63a9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| aea06e723b9c143a.pdf (aea06e723b9c143a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| afbf221856f21ac7.pdf (afbf221856f21ac7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b12461ea35043586.pdf (b12461ea35043586) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b1b8acd2eeadb18f.pdf (b1b8acd2eeadb18f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b37247a4d047b301.pdf (b37247a4d047b301) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b3a18f6ead3921f8.pdf (b3a18f6ead3921f8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b439bee82145fcd6.pdf (b439bee82145fcd6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b463a1b65d813b81.pdf (b463a1b65d813b81) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b5222bfa89d6d75c.pdf (b5222bfa89d6d75c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b585050d597e6c63.pdf (b585050d597e6c63) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b63a3ca43ccf4a78.pdf (b63a3ca43ccf4a78) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b6af9935ff7470bc.pdf (b6af9935ff7470bc) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b6faa64fa1fd04ef.pdf (b6faa64fa1fd04ef) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b77926ccb9c56bdd.pdf (b77926ccb9c56bdd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b80a52b1b8bd38e7.pdf (b80a52b1b8bd38e7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b91629056cf836cd.pdf (b91629056cf836cd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b92bb3b0bb75bed1.pdf (b92bb3b0bb75bed1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b940bc84f048da17.pdf (b940bc84f048da17) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b960876fdae20b59.pdf (b960876fdae20b59) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b979e92b286f1212.pdf (b979e92b286f1212) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b98bacdb23bf4c21.pdf (b98bacdb23bf4c21) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ba0640215cf14f93.pdf (ba0640215cf14f93) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ba31ee50485652ca.pdf (ba31ee50485652ca) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ba852671af1425f3.pdf (ba852671af1425f3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| bc55f1e145e98cca.pdf (bc55f1e145e98cca) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| bda54b608a59598d.pdf (bda54b608a59598d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| be525504aecd99fe.pdf (be525504aecd99fe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| bf4f9c6ea75ca294.pdf (bf4f9c6ea75ca294) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| bf9886b46a0ee79e.pdf (bf9886b46a0ee79e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c03ea143ffcfd328.pdf (c03ea143ffcfd328) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c0595c10440a4e97.pdf (c0595c10440a4e97) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c067cc0eaab06f20.pdf (c067cc0eaab06f20) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c0ee0f0aa6c36977.pdf (c0ee0f0aa6c36977) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c0f22f2bc46c5f3e.pdf (c0f22f2bc46c5f3e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c0fb8bd2ff812a71.pdf (c0fb8bd2ff812a71) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c222311175b4c847.pdf (c222311175b4c847) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c30e00afdd09c89c.pdf (c30e00afdd09c89c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c39a2ea077e679b9.pdf (c39a2ea077e679b9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c4231ac3703bd391.pdf (c4231ac3703bd391) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c4c109222ea8e335.pdf (c4c109222ea8e335) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c4c8fe1b1b302fcd.pdf (c4c8fe1b1b302fcd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c52d6ddfff2719d3.pdf (c52d6ddfff2719d3) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c5ae1b3f2fbd462e.pdf (c5ae1b3f2fbd462e) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c60a5a5f139fa40b.pdf (c60a5a5f139fa40b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c67c6594f20f4d6c.pdf (c67c6594f20f4d6c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c7f4306fa394bbe4.pdf (c7f4306fa394bbe4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c8375a50690a1698.pdf (c8375a50690a1698) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c894ac85f4c7c373.pdf (c894ac85f4c7c373) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c919f1e49505d0c3.pdf (c919f1e49505d0c3) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c9685e0ebb602866.pdf (c9685e0ebb602866) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| c98b8a0808c71ae0.pdf (c98b8a0808c71ae0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ca8dc1fd8e44382c.pdf (ca8dc1fd8e44382c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cab88f3ed775f2c3.pdf (cab88f3ed775f2c3) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cb09001942d89f15.pdf (cb09001942d89f15) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cb2727da7983a1a8.pdf (cb2727da7983a1a8) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cb9bfd887c5db994.pdf (cb9bfd887c5db994) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cd673574910f0619.pdf (cd673574910f0619) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cd80584cbc821fe2.pdf (cd80584cbc821fe2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ce407066f0c5ea4e.pdf (ce407066f0c5ea4e) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ce492d87ecd92131.pdf (ce492d87ecd92131) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cef2f959b908caee.pdf (cef2f959b908caee) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cf0ffc4649de5043.pdf (cf0ffc4649de5043) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cfcdf4c10913aee6.pdf (cfcdf4c10913aee6) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| cfef4564b96e196f.pdf (cfef4564b96e196f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d07dbed2618deb80.pdf (d07dbed2618deb80) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d0eb3491a8ae1e04.pdf (d0eb3491a8ae1e04) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d10b7b6566c0d385.pdf (d10b7b6566c0d385) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d14bd852adbdc2cc.pdf (d14bd852adbdc2cc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d1701d3f16992222.pdf (d1701d3f16992222) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d25c368e4ac42622.pdf (d25c368e4ac42622) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d2a5afc192992322.pdf (d2a5afc192992322) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d2bfdabf546a3e51.pdf (d2bfdabf546a3e51) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d2d4c1d8f54f955c.pdf (d2d4c1d8f54f955c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d2ff31568db16007.pdf (d2ff31568db16007) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d366b315407c2b21.pdf (d366b315407c2b21) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d373ba3eb5e12432.pdf (d373ba3eb5e12432) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d4dbc94eea4cbe7b.pdf (d4dbc94eea4cbe7b) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d5f19aec37c6784c.pdf (d5f19aec37c6784c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d65470c0999a712f.pdf (d65470c0999a712f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d67baadf32900c03.pdf (d67baadf32900c03) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d73640d3c6d7574a.pdf (d73640d3c6d7574a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d8735d83c1d458af.pdf (d8735d83c1d458af) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d896e06c1d396dfc.pdf (d896e06c1d396dfc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d8c6fdb65e3c0e0c.pdf (d8c6fdb65e3c0e0c) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d9158d936b8d113c.pdf (d9158d936b8d113c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d92fcc6b79208e11.pdf (d92fcc6b79208e11) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d935738000c24023.pdf (d935738000c24023) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d941c53acb0c1c44.pdf (d941c53acb0c1c44) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d945170e94575bfc.pdf (d945170e94575bfc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d9d28f30e9838f2f.pdf (d9d28f30e9838f2f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| da32b874a70dc1ac.pdf (da32b874a70dc1ac) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| da3ab61474db382a.pdf (da3ab61474db382a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| da584d77aa24ae66.pdf (da584d77aa24ae66) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| db190042e197bcc7.pdf (db190042e197bcc7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| db95ab6b370e136c.pdf (db95ab6b370e136c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| dc06aa59aec826d4.pdf (dc06aa59aec826d4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| dd3ca217098d4cda.pdf (dd3ca217098d4cda) | missouri_oa_fmdc | spec-only | - / 199 | 0 / 21 | 0 / 19 | 0/23 (0.0%) | 34/68 (50.0%) | a -, b -, c -, d -, e - | 41 |
| dd48ea9345d781da.pdf (dd48ea9345d781da) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ddd3ed06dde3f8eb.pdf (ddd3ed06dde3f8eb) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| de14832c3d32692e.pdf (de14832c3d32692e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| def8ca8d09e60ec2.pdf (def8ca8d09e60ec2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| df430795739fcd7f.pdf (df430795739fcd7f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e16b835b1afacf37.pdf (e16b835b1afacf37) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e176acb1ea9c116d.pdf (e176acb1ea9c116d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e232da6c76983dbe.pdf (e232da6c76983dbe) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e265b15b9a9d00a1.pdf (e265b15b9a9d00a1) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e283b6c80d8acd49.pdf (e283b6c80d8acd49) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e373e12a90bfe7ad.pdf (e373e12a90bfe7ad) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e3e749761843bca7.pdf (e3e749761843bca7) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e41edc080626f03a.pdf (e41edc080626f03a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e47b93524e6faf25.pdf (e47b93524e6faf25) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e530a0c887ca7929.pdf (e530a0c887ca7929) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e5963633cb05296a.pdf (e5963633cb05296a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e75d52a7a714c978.pdf (e75d52a7a714c978) | missouri_oa_fmdc | schedule-only | 23 / 23 | 0 / 21 | 14 / 18 | 0/52 (0.0%) | 2/5 (40.0%) | a -, b -, c -, d -, e - | 54 |
| e78c0434f0d49f17.pdf (e78c0434f0d49f17) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e7d87bdafecf8b47.pdf (e7d87bdafecf8b47) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e7d8d89785535af9.pdf (e7d8d89785535af9) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e7f6ac3f8ba58a20.pdf (e7f6ac3f8ba58a20) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e8a888bdd7523b77.pdf (e8a888bdd7523b77) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e978cde69793e027.pdf (e978cde69793e027) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e98dcaeb37699330.pdf (e98dcaeb37699330) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e9f1ef9c54b64db4.pdf (e9f1ef9c54b64db4) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ea26cf717ffa6ca7.pdf (ea26cf717ffa6ca7) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ea2ab4ddeaa28333.pdf (ea2ab4ddeaa28333) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| eaae34d244e7d25b.pdf (eaae34d244e7d25b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| eafaead87725b2c5.pdf (eafaead87725b2c5) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| eb83a1b8d3ca9c4e.pdf (eb83a1b8d3ca9c4e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| eb985ef35799e0ed.pdf (eb985ef35799e0ed) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ebaa4c3a9346449c.pdf (ebaa4c3a9346449c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ec0abb1306b3c570.pdf (ec0abb1306b3c570) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ecceb3a74e74e14f.pdf (ecceb3a74e74e14f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ee0d4510c7901e89.pdf (ee0d4510c7901e89) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| efaa381caf89c6fc.pdf (efaa381caf89c6fc) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f04ed9de84c71ab7.pdf (f04ed9de84c71ab7) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f06d8adcd112ab1c.pdf (f06d8adcd112ab1c) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f0c30c40cf54bba0.pdf (f0c30c40cf54bba0) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f0e69661605cde13.pdf (f0e69661605cde13) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f1858edcfdc0443d.pdf (f1858edcfdc0443d) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f1b3775834293b58.pdf (f1b3775834293b58) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f20602733eeca7f6.pdf (f20602733eeca7f6) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f260dce40d06e915.pdf (f260dce40d06e915) | missouri_oa_fmdc | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f2fe6c177b15ce4f.pdf (f2fe6c177b15ce4f) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f38f7fd7866e1976.pdf (f38f7fd7866e1976) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f3bae1ab9f821c94.pdf (f3bae1ab9f821c94) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f408f0ff2330c9ca.pdf (f408f0ff2330c9ca) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f42d73ba437092ce.pdf (f42d73ba437092ce) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f4b77ed6a1ce5242.pdf (f4b77ed6a1ce5242) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f51bb49ef19da4a2.pdf (f51bb49ef19da4a2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f525c88e5bc8d41a.pdf (f525c88e5bc8d41a) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f540c4059013d097.pdf (f540c4059013d097) | missouri_oa_fmdc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f5de9d7d54303728.pdf (f5de9d7d54303728) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f6150f2ba02f3e9f.pdf (f6150f2ba02f3e9f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f6dd470ea806cf4b.pdf (f6dd470ea806cf4b) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f6ef7a867c33f725.pdf (f6ef7a867c33f725) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f77f7d9fc8052b4f.pdf (f77f7d9fc8052b4f) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f7fba85b27d4db77.pdf (f7fba85b27d4db77) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f80b255845f1675a.pdf (f80b255845f1675a) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f8157da156612956.pdf (f8157da156612956) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fa3b0eb3a83dea55.pdf (fa3b0eb3a83dea55) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fbb984ddcf9f5e8e.pdf (fbb984ddcf9f5e8e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fc0659be02dae787.pdf (fc0659be02dae787) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fc992bc46bb8e8fd.pdf (fc992bc46bb8e8fd) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fd33f2af15d6fb79.pdf (fd33f2af15d6fb79) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fe852b0bac74ae4e.pdf (fe852b0bac74ae4e) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fed55dbedb84bbb2.pdf (fed55dbedb84bbb2) | missouri_oa_fmdc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| ff9c494916a7d8b5.pdf (ff9c494916a7d8b5) | missouri_oa_fmdc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| plan-sets/fb77f58b8f8faae8.pdf (fb77f58b8f8faae8) | Montgomery County | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| b3711090d93c110e.pdf (b3711090d93c110e) | municipal_wordpress_uploads | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d142f61752f9aa78.pdf (d142f61752f9aa78) | municipal_wordpress_uploads | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| e2dd6edcaf13cc45.pdf (e2dd6edcaf13cc45) | municipal_wordpress_uploads | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| specs/89ce8170e64b6508.pdf (89ce8170e64b6508) | Oakton College District 535 | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 0da96f79112b83dc.pdf (0da96f79112b83dc) | ohio_ofcc | schedule-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 6b4d9c81c273f090.pdf (6b4d9c81c273f090) | ohio_ofcc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a0668368afa04fca.pdf (a0668368afa04fca) | ohio_ofcc | plan-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d014ee568cacc11e.pdf (d014ee568cacc11e) | ohio_ofcc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| f8882b2d07ca4177.pdf (f8882b2d07ca4177) | ohio_ofcc | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| door-schedules/4e600acf05b8c943.pdf (4e600acf05b8c943) | Rockford | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| specs/636c4b0e68b8036d.pdf (636c4b0e68b8036d) | Schenectady County | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 2628479aced915d9.pdf (2628479aced915d9) | school_district_sites | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| 5ca1073ee12bc860.pdf (5ca1073ee12bc860) | school_district_sites | spec-only | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| d697f7a680b8322f.pdf (d697f7a680b8322f) | school_district_sites | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| fbe54632a07fcf84.pdf (fbe54632a07fcf84) | school_district_sites | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |
| a88cebda3496f4a3.pdf (a88cebda3496f4a3) | utah_pmn | none | - / - | 0 / 0 | 0 / 0 | n/a | n/a | a -, b -, c -, d -, e - | 0 |

Per family (unread):

| family | PDFs | rows agreed | field agreement | a marks_on_plan | b sets_exist | c set_door_lists | d types_in_legend | e sizes_and_marks | queue |
|---|---|---|---|---|---|---|---|---|---|
| california_dgs_obas | 5 | n/a | n/a | - | - | - | - | - | 0 |
| Christina | 2 | n/a | n/a | - | - | - | - | - | 0 |
| City of Worcester / Worcester Public Schools | 1 | n/a | n/a | - | - | - | - | - | 0 |
| civicplus_documentcenter | 1 | n/a | n/a | - | - | - | - | - | 0 |
| delaware_bidcondocs | 4 | n/a | n/a | - | - | - | - | - | 0 |
| missouri_oa_fmdc | 512 | 0/421 (0.0%) | 457/1086 (42.1%) | - | - | - | - | - | 823 |
| Montgomery County | 1 | n/a | n/a | - | - | - | - | - | 0 |
| municipal_wordpress_uploads | 3 | n/a | n/a | - | - | - | - | - | 0 |
| Oakton College District 535 | 1 | n/a | n/a | - | - | - | - | - | 0 |
| ohio_ofcc | 5 | n/a | n/a | - | - | - | - | - | 0 |
| Rockford | 1 | n/a | n/a | - | - | - | - | - | 0 |
| Schenectady County | 1 | n/a | n/a | - | - | - | - | - | 0 |
| school_district_sites | 4 | n/a | n/a | - | - | - | - | - | 0 |
| utah_pmn | 1 | n/a | n/a | - | - | - | - | - | 0 |

Tier total: rows agreed 0/421 (0.0%); queue 823.

- 787f4789180fe427.pdf: no door schedule or hardware set read by either reader
- 8578719ee6ac0384.pdf: no door schedule or hardware set read by either reader
- 87e9a3bb8105b26a.pdf: no door schedule or hardware set read by either reader
- b00024dc62942d01.pdf: no door schedule or hardware set read by either reader
- de34006cc5f5ce81.pdf: no door schedule or hardware set read by either reader
- door-schedules/3613c8cf8793a451.pdf: no door schedule or hardware set read by either reader
- door-schedules/698d75cbfa43c61e.pdf: no door schedule or hardware set read by either reader
- specs/4743b24c01862b5f.pdf: no door schedule or hardware set read by either reader
- 6fdd1c2bc4e377ea.pdf: no door schedule or hardware set read by either reader
- 36752ef3a65a3014.pdf: no door schedule or hardware set read by either reader
- 445a88a2ee0c80b2.pdf: no door schedule or hardware set read by either reader
- 8f985ae512f28f45.pdf: no door schedule or hardware set read by either reader
- b21a6e555884848d.pdf: no door schedule or hardware set read by either reader
- 014c6f8ae2d6c158.pdf: no door schedule or hardware set read by either reader
- 01c4eb6f59501165.pdf: no door schedule or hardware set read by either reader
- 01e8e139c7fe8fb9.pdf: no door schedule or hardware set read by either reader
- 01fef74556b437d4.pdf: no door schedule or hardware set read by either reader
- 02207abd41ae353d.pdf: no door schedule or hardware set read by either reader
- 02cd1539c98e2e7d.pdf: no door schedule or hardware set read by either reader
- 0438e17bff02f253.pdf: no door schedule or hardware set read by either reader
- 04917b3deafa2af5.pdf: no door schedule or hardware set read by either reader
- 04cebdda020407dd.pdf: no door schedule or hardware set read by either reader
- 05121ff9bf137ff2.pdf: no door schedule or hardware set read by either reader
- 053883c6630d3ca4.pdf: no door schedule or hardware set read by either reader
- 05608ea9e887b73f.pdf: no door schedule or hardware set read by either reader
- 0562188794c2fdd1.pdf: no door schedule or hardware set read by either reader
- 057611111badcce6.pdf: no door schedule or hardware set read by either reader
- 059b72fb1702ce44.pdf: no door schedule or hardware set read by either reader
- 05efae640e4e8a50.pdf: no door schedule or hardware set read by either reader
- 07777e8e85f2039e.pdf: no door schedule or hardware set read by either reader
- 07b3b5e5ee786a5e.pdf: no door schedule or hardware set read by either reader
- 07ca51cf0349bef1.pdf: no door schedule or hardware set read by either reader
- 08222a6152c7525b.pdf: no door schedule or hardware set read by either reader
- 0830cebf1ec13b7e.pdf: no door schedule or hardware set read by either reader
- 0a11467a5730ccb1.pdf: no door schedule or hardware set read by either reader
- 0acdca2c711619f4.pdf: no door schedule or hardware set read by either reader
- 0ad0a644c1e0ee90.pdf: no door schedule or hardware set read by either reader
- 0b332388f922e8ec.pdf: no door schedule or hardware set read by either reader
- 0c3f3cdf49c42ec3.pdf: no door schedule or hardware set read by either reader
- 0c6a67bea90d6181.pdf: no door schedule or hardware set read by either reader
- 0d27143b5fdca774.pdf: no door schedule or hardware set read by either reader
- 0d518909fb8349f9.pdf: no door schedule or hardware set read by either reader
- 0e1cd50b40da91e0.pdf: no door schedule or hardware set read by either reader
- 0eb1a5109964db1f.pdf: no door schedule or hardware set read by either reader
- 0f087df36e1bc91c.pdf: no door schedule or hardware set read by either reader
- 102f0aa46317f520.pdf: no door schedule or hardware set read by either reader
- 1167c3d7b404983f.pdf: no door schedule or hardware set read by either reader
- 125564a18de2ff6b.pdf: no door schedule or hardware set read by either reader
- 128d1f39fb8e317b.pdf: no door schedule or hardware set read by either reader
- 13c6b0f4fbcf0d7f.pdf: no door schedule or hardware set read by either reader
- 141cdd05a1701a6e.pdf: no door schedule or hardware set read by either reader
- 1463b6744ee4f291.pdf: no door schedule or hardware set read by either reader
- 157c72762449d265.pdf: no door schedule or hardware set read by either reader
- 161c8e7f05943db7.pdf: no door schedule or hardware set read by either reader
- 1745b65f8f8d7ec1.pdf: no door schedule or hardware set read by either reader
- 1763668d3b56c587.pdf: no door schedule or hardware set read by either reader
- 17f3d8a8b77d3731.pdf: no door schedule or hardware set read by either reader
- 1850c88365fdba06.pdf: no door schedule or hardware set read by either reader
- 1859c08cd450a2bd.pdf: no door schedule or hardware set read by either reader
- 1869dbedda484452.pdf: no door schedule or hardware set read by either reader
- 18ceb7ae9fd8e87d.pdf: no door schedule or hardware set read by either reader
- 197b7cbaddfe850c.pdf: no door schedule or hardware set read by either reader
- 19b8647df16c386e.pdf: no door schedule or hardware set read by either reader
- 1ab191dd9b1c5c98.pdf: no door schedule or hardware set read by either reader
- 1abc74ab5e14afc4.pdf: no door schedule or hardware set read by either reader
- 1ad7eba501a16684.pdf: no door schedule or hardware set read by either reader
- 1b135b7527049b0a.pdf: no door schedule or hardware set read by either reader
- 1b2c4bc26b1ad520.pdf: no door schedule or hardware set read by either reader
- 1bf58869b846dcf7.pdf: no door schedule or hardware set read by either reader
- 1c5f3c6800774c1d.pdf: no door schedule or hardware set read by either reader
- 1ca5c02c2d5b92e1.pdf: no door schedule or hardware set read by either reader
- 1d290a3c796d7ee8.pdf: no door schedule or hardware set read by either reader
- 1d870cff3a0080de.pdf: no door schedule or hardware set read by either reader
- 1dc71da52a8911a6.pdf: no door schedule or hardware set read by either reader
- 1ed738a3c54e4dec.pdf: no door schedule or hardware set read by either reader
- 1f3d7195503d4af5.pdf: no door schedule or hardware set read by either reader
- 203b65e8ead1db1f.pdf: no door schedule or hardware set read by either reader
- 20fd2cf1e2b4e4a7.pdf: no door schedule or hardware set read by either reader
- 211d0a2a6ec122d9.pdf: no door schedule or hardware set read by either reader
- 2142df4cc2290373.pdf: no door schedule or hardware set read by either reader
- 21d27218aa40a570.pdf: no door schedule or hardware set read by either reader
- 220cb22ab617e0f4.pdf: no door schedule or hardware set read by either reader
- 228666ed0b112248.pdf: no door schedule or hardware set read by either reader
- 23d0610c5158a23b.pdf: no door schedule or hardware set read by either reader
- 23eebfaa6e871deb.pdf: no door schedule or hardware set read by either reader
- 23febdeb29ca9df4.pdf: no door schedule or hardware set read by either reader
- 24010d5e8535e65c.pdf: no door schedule or hardware set read by either reader
- 242d2fa096dc152c.pdf: no door schedule or hardware set read by either reader
- 249f8761de1ab0a0.pdf: no door schedule or hardware set read by either reader
- 25b38d28cff03b38.pdf: no door schedule or hardware set read by either reader
- 25c49ef50bd14aa8.pdf: no door schedule or hardware set read by either reader
- 25d985afd74a9ad2.pdf: no door schedule or hardware set read by either reader
- 265434ca71ab1acd.pdf: no door schedule or hardware set read by either reader
- 26b15bdcec6a82d6.pdf: no door schedule or hardware set read by either reader
- 27413bf3c25d2a48.pdf: no door schedule or hardware set read by either reader
- 277c2a486b34df55.pdf: no door schedule or hardware set read by either reader
- 28de4435bdaff0b3.pdf: no door schedule or hardware set read by either reader
- 29a0de4cf3213be1.pdf: no door schedule or hardware set read by either reader
- 29d2809d82307086.pdf: no door schedule or hardware set read by either reader
- 2afad1f6f765851b.pdf: no door schedule or hardware set read by either reader
- 2b68bb45f5993150.pdf: no door schedule or hardware set read by either reader
- 2b79865b11790f32.pdf: no door schedule or hardware set read by either reader
- 2b94772c51b808a2.pdf: no door schedule or hardware set read by either reader
- 2baf6eeb4d6ff696.pdf: no door schedule or hardware set read by either reader
- 2dbeb034695510a4.pdf: no door schedule or hardware set read by either reader
- 2ef53e0ac322782e.pdf: no door schedule or hardware set read by either reader
- 2fd55e951f2c2993.pdf: no door schedule or hardware set read by either reader
- 2ffea3533bdb0727.pdf: no door schedule or hardware set read by either reader
- 30f8a4e47b456836.pdf: no door schedule or hardware set read by either reader
- 314201089b256dbe.pdf: no door schedule or hardware set read by either reader
- 316358ab316fe16d.pdf: no door schedule or hardware set read by either reader
- 3270a1849c7d03d1.pdf: no door schedule or hardware set read by either reader
- 32b631d235082c7c.pdf: no door schedule or hardware set read by either reader
- 34a28cfeeef77c75.pdf: no door schedule or hardware set read by either reader
- 351bea1177c74b91.pdf: no door schedule or hardware set read by either reader
- 359a1923e626a461.pdf: no door schedule or hardware set read by either reader
- 35e1e5a57a0a54ff.pdf: no door schedule or hardware set read by either reader
- 35f15fbbef803979.pdf: no door schedule or hardware set read by either reader
- 36ffbc7f1c8f4dd9.pdf: no door schedule or hardware set read by either reader
- 379d62d7e974df36.pdf: no door schedule or hardware set read by either reader
- 37d20cba4390c2a0.pdf: no door schedule or hardware set read by either reader
- 3808360a251cfa8c.pdf: no door schedule or hardware set read by either reader
- 390a78e54d80424f.pdf: no door schedule or hardware set read by either reader
- 39464574afe1841b.pdf: no door schedule or hardware set read by either reader
- 3952cacfa1762e9c.pdf: no door schedule or hardware set read by either reader
- 3a5a01cdd8fab103.pdf: no door schedule or hardware set read by either reader
- 3aa0946f94cf6aa7.pdf: no door schedule or hardware set read by either reader
- 3b0cb226a793d955.pdf: no door schedule or hardware set read by either reader
- 3b87f69a7e56ac02.pdf: no door schedule or hardware set read by either reader
- 3c17d4c83483a22c.pdf: no door schedule or hardware set read by either reader
- 3c3b0c6a2343fd50.pdf: no door schedule or hardware set read by either reader
- 3c75b7927ebbc8e3.pdf: no door schedule or hardware set read by either reader
- 3d04250aba6f8fe1.pdf: no door schedule or hardware set read by either reader
- 3d190df7097eec42.pdf: no door schedule or hardware set read by either reader
- 3d1ea94433269e5d.pdf: no door schedule or hardware set read by either reader
- 3d747800486f5bba.pdf: no door schedule or hardware set read by either reader
- 3ef4b0f325533f61.pdf: no door schedule or hardware set read by either reader
- 3f2340a8b3e4a2fe.pdf: no door schedule or hardware set read by either reader
- 3f3b7ca0c349e2a5.pdf: no door schedule or hardware set read by either reader
- 3f4359137b47a5f0.pdf: no rows agreed and no oracle applies
- 3f830a5f75c47eeb.pdf: no door schedule or hardware set read by either reader
- 3f8a6b971a3c902e.pdf: no door schedule or hardware set read by either reader
- 3fedac1a7175f82b.pdf: no door schedule or hardware set read by either reader
- 400e8c6b5df592d0.pdf: no door schedule or hardware set read by either reader
- 40177ab31e8e56cd.pdf: no door schedule or hardware set read by either reader
- 41917ea2a5eeda67.pdf: no door schedule or hardware set read by either reader
- 41f56a81d206ffac.pdf: no door schedule or hardware set read by either reader
- 41fd5fc67dcaa81a.pdf: no door schedule or hardware set read by either reader
- 41ffea1437279ea0.pdf: no door schedule or hardware set read by either reader
- 42328229562da392.pdf: no door schedule or hardware set read by either reader
- 4324c330edfd4954.pdf: no door schedule or hardware set read by either reader
- 43a1f0db3f7ff345.pdf: no door schedule or hardware set read by either reader
- 452a2e0ea047cd23.pdf: no door schedule or hardware set read by either reader
- 4597f173e1d67daf.pdf: no rows agreed and no oracle applies
- 45b5536d4d5a611e.pdf: no door schedule or hardware set read by either reader
- 45ff8821520ca42b.pdf: no door schedule or hardware set read by either reader
- 46d8ea54dbd1c0d1.pdf: no door schedule or hardware set read by either reader
- 46f594abf65fdb03.pdf: no door schedule or hardware set read by either reader
- 480dc55c0d2be24a.pdf: no door schedule or hardware set read by either reader
- 4834889b47b8107b.pdf: no door schedule or hardware set read by either reader
- 488d3da15a88bef8.pdf: no door schedule or hardware set read by either reader
- 48c40fd22aeded03.pdf: no door schedule or hardware set read by either reader
- 494aea999f0c15bf.pdf: no door schedule or hardware set read by either reader
- 4972df84962bee54.pdf: no door schedule or hardware set read by either reader
- 4974cfdc4019ec89.pdf: no door schedule or hardware set read by either reader
- 4a265af143c73b68.pdf: no door schedule or hardware set read by either reader
- 4bb9303c88e243d4.pdf: no door schedule or hardware set read by either reader
- 4bd6674f938a636e.pdf: no door schedule or hardware set read by either reader
- 4c6b3f45d61978e1.pdf: no door schedule or hardware set read by either reader
- 4d7dd78790db703e.pdf: no door schedule or hardware set read by either reader
- 4d8051b462351e64.pdf: no door schedule or hardware set read by either reader
- 4df4001c95b2c62a.pdf: no door schedule or hardware set read by either reader
- 4f1e9995e401cd5d.pdf: no door schedule or hardware set read by either reader
- 50909be43cbd0449.pdf: no door schedule or hardware set read by either reader
- 50b9674dfd9402fb.pdf: no door schedule or hardware set read by either reader
- 51f3388d0d4dc468.pdf: no door schedule or hardware set read by either reader
- 5310d964ade700ab.pdf: no door schedule or hardware set read by either reader
- 5352132fa1887baf.pdf: no door schedule or hardware set read by either reader
- 53692601ef1e4080.pdf: no door schedule or hardware set read by either reader
- 537f49f81ca81cd3.pdf: no door schedule or hardware set read by either reader
- 53d6bc37e4c054b3.pdf: no door schedule or hardware set read by either reader
- 53e0ad03512ccd51.pdf: no door schedule or hardware set read by either reader
- 54c1fe66c4ab2254.pdf: no door schedule or hardware set read by either reader
- 5514a4c4984fc60f.pdf: no door schedule or hardware set read by either reader
- 551795eefc942630.pdf: no door schedule or hardware set read by either reader
- 55811b7ea27ea93c.pdf: no door schedule or hardware set read by either reader
- 5582b45d115bc18b.pdf: no door schedule or hardware set read by either reader
- 55ac1ce2c909c322.pdf: no door schedule or hardware set read by either reader
- 5612a5baa5ea31fa.pdf: no door schedule or hardware set read by either reader
- 5648348d1c7752dd.pdf: no door schedule or hardware set read by either reader
- 5679feac4b39748a.pdf: no door schedule or hardware set read by either reader
- 57eb921909ab4f3b.pdf: no door schedule or hardware set read by either reader
- 5865e9e8ce4f0a4b.pdf: no door schedule or hardware set read by either reader
- 58fcc5f56bc6e1c1.pdf: no door schedule or hardware set read by either reader
- 5980eba4ba0ff1cd.pdf: no door schedule or hardware set read by either reader
- 59971f832e053a3d.pdf: no door schedule or hardware set read by either reader
- 599b5fbfd8ba8149.pdf: no door schedule or hardware set read by either reader
- 59ddd2ddbb912c3d.pdf: no door schedule or hardware set read by either reader
- 5a3d03f5fbec7091.pdf: no door schedule or hardware set read by either reader
- 5bcf553a42bb1843.pdf: no door schedule or hardware set read by either reader
- 5beeabd88969dca6.pdf: no door schedule or hardware set read by either reader
- 5c398745bd39b247.pdf: no door schedule or hardware set read by either reader
- 5c3ccc450be545f9.pdf: no door schedule or hardware set read by either reader
- 5cd419534aad66db.pdf: no door schedule or hardware set read by either reader
- 5d87309e4ef2f6a9.pdf: no door schedule or hardware set read by either reader
- 5dd323c97267dce4.pdf: no door schedule or hardware set read by either reader
- 5df8adfeeeb0c624.pdf: no door schedule or hardware set read by either reader
- 5df97513cff80a9a.pdf: no door schedule or hardware set read by either reader
- 5e18a37ae97680f7.pdf: no door schedule or hardware set read by either reader
- 5ea4fbdfa0af25cf.pdf: no door schedule or hardware set read by either reader
- 5f61d18622c0845a.pdf: no door schedule or hardware set read by either reader
- 5f647581c9504729.pdf: no door schedule or hardware set read by either reader
- 5fd2a7c90059b081.pdf: no door schedule or hardware set read by either reader
- 5fd552afee701a12.pdf: no door schedule or hardware set read by either reader
- 5ff41eaaa77054ee.pdf: no door schedule or hardware set read by either reader
- 60b6d30fc22b94de.pdf: no door schedule or hardware set read by either reader
- 6111f9581b14cf12.pdf: no door schedule or hardware set read by either reader
- 61bd6a483519458e.pdf: no door schedule or hardware set read by either reader
- 62e171520ccf4672.pdf: no rows agreed and no oracle applies
- 62ea85ae17a77231.pdf: no door schedule or hardware set read by either reader
- 63036b35e440b973.pdf: no text layer and more than 6 pages (raise --ocr-max-pages to OCR it) / no text layer on any page and too many pages to OCR here
- 63252ee388d6a45d.pdf: no door schedule or hardware set read by either reader
- 639c7a837ce9700d.pdf: no door schedule or hardware set read by either reader
- 6402249730ba82c7.pdf: no door schedule or hardware set read by either reader
- 64381a794924b4df.pdf: no door schedule or hardware set read by either reader
- 65f2566f745304d7.pdf: no door schedule or hardware set read by either reader
- 66142f0d268ffe78.pdf: no door schedule or hardware set read by either reader
- 66aae60521c84020.pdf: no door schedule or hardware set read by either reader
- 674e8c0ea89da178.pdf: no door schedule or hardware set read by either reader
- 680476532860241b.pdf: no door schedule or hardware set read by either reader
- 692f520e99bc468d.pdf: no door schedule or hardware set read by either reader
- 698a8b99affd19b3.pdf: no door schedule or hardware set read by either reader
- 6b29d315350e41a0.pdf: no door schedule or hardware set read by either reader
- 6b9db5ca70ad2758.pdf: no door schedule or hardware set read by either reader
- 6bcfd6d4a4274c96.pdf: no door schedule or hardware set read by either reader
- 6c1ece9494edad7f.pdf: no door schedule or hardware set read by either reader
- 6c5b563d0c6d806a.pdf: no door schedule or hardware set read by either reader
- 6c768fb11d2497b0.pdf: no door schedule or hardware set read by either reader
- 6c88981edc5e97ab.pdf: no door schedule or hardware set read by either reader
- 6d0c2a6d945fd0c0.pdf: no door schedule or hardware set read by either reader
- 6e05a02185b4a17e.pdf: no door schedule or hardware set read by either reader
- 6e64557495b3e21a.pdf: no door schedule or hardware set read by either reader
- 6ed382d77bb284b6.pdf: no door schedule or hardware set read by either reader
- 6ef5f624af8e391f.pdf: no door schedule or hardware set read by either reader
- 714bef588c904504.pdf: no door schedule or hardware set read by either reader
- 7176aeb37d37d8f7.pdf: no door schedule or hardware set read by either reader
- 72b12ee9d9641e73.pdf: no door schedule or hardware set read by either reader
- 72bedaaba4d51d4f.pdf: no door schedule or hardware set read by either reader
- 7382de8de1294cea.pdf: no door schedule or hardware set read by either reader
- 739603b30049e99d.pdf: no door schedule or hardware set read by either reader
- 741f3c11563f5821.pdf: no door schedule or hardware set read by either reader
- 749d664b8ab657f7.pdf: no door schedule or hardware set read by either reader
- 7533d61f9d3dc568.pdf: no door schedule or hardware set read by either reader
- 75610b3aa870bd75.pdf: no door schedule or hardware set read by either reader
- 762886fc01d140d0.pdf: no door schedule or hardware set read by either reader
- 763d81a5f26dbe99.pdf: no door schedule or hardware set read by either reader
- 76e857e3a9cfd874.pdf: no door schedule or hardware set read by either reader
- 77690d35232e111f.pdf: no door schedule or hardware set read by either reader
- 77e4a50079448e69.pdf: no door schedule or hardware set read by either reader
- 784aa0a0a8bf212c.pdf: no door schedule or hardware set read by either reader
- 78917ebbb84c7bd2.pdf: no door schedule or hardware set read by either reader
- 79b595e2bb962a47.pdf: no door schedule or hardware set read by either reader
- 7a5b3f3f07dd0e85.pdf: no door schedule or hardware set read by either reader
- 7a7c6eb490500bf5.pdf: no door schedule or hardware set read by either reader
- 7b4a0340c8d4a849.pdf: no door schedule or hardware set read by either reader
- 7cb737cbff8b12f3.pdf: no door schedule or hardware set read by either reader
- 7db52ea3668990a7.pdf: no door schedule or hardware set read by either reader
- 7dbe706f7dd14eee.pdf: no door schedule or hardware set read by either reader
- 7e33d50c3241bc57.pdf: no door schedule or hardware set read by either reader
- 7f80a1d037c430a1.pdf: no door schedule or hardware set read by either reader
- 805e38493de375ea.pdf: no door schedule or hardware set read by either reader
- 8062333b32064ab5.pdf: no door schedule or hardware set read by either reader
- 80a841ef6227ace0.pdf: no door schedule or hardware set read by either reader
- 80f954741777f0ff.pdf: no door schedule or hardware set read by either reader
- 81205af4bc88c57f.pdf: no door schedule or hardware set read by either reader
- 812a9ce915558290.pdf: no door schedule or hardware set read by either reader
- 82f455c55139f8ff.pdf: no door schedule or hardware set read by either reader
- 83c94e6dc8be63f2.pdf: no door schedule or hardware set read by either reader
- 83f33ccceca81d8d.pdf: no door schedule or hardware set read by either reader
- 852ab605fd4886b6.pdf: no door schedule or hardware set read by either reader
- 857ea2afb1b3c214.pdf: no door schedule or hardware set read by either reader
- 870a74de2949a3dc.pdf: no door schedule or hardware set read by either reader
- 87418ef9c44c875f.pdf: no door schedule or hardware set read by either reader
- 8900a915fe932a31.pdf: no door schedule or hardware set read by either reader
- 897fcc70aa408db6.pdf: no door schedule or hardware set read by either reader
- 8982c1c80bbdff7b.pdf: no door schedule or hardware set read by either reader
- 8a1635f1549f28c4.pdf: no door schedule or hardware set read by either reader
- 8a464985c1312963.pdf: no door schedule or hardware set read by either reader
- 8aeedf6f43a7d75a.pdf: no door schedule or hardware set read by either reader
- 8beba21f6d7cb405.pdf: no door schedule or hardware set read by either reader
- 8c02530985342e28.pdf: no door schedule or hardware set read by either reader
- 8c1d2f38320c038f.pdf: no door schedule or hardware set read by either reader
- 8c313f49464c9ece.pdf: no door schedule or hardware set read by either reader
- 8c336c43fa7f9668.pdf: no door schedule or hardware set read by either reader
- 8c77fa69fc375a81.pdf: no rows agreed and no oracle applies
- 8cdacedd59871758.pdf: no door schedule or hardware set read by either reader
- 8d175054a3b02796.pdf: no door schedule or hardware set read by either reader
- 8d33d943bed5adfc.pdf: no door schedule or hardware set read by either reader
- 8d58ff441ef70cca.pdf: no door schedule or hardware set read by either reader
- 8dd57bbf7dd1b4f2.pdf: no door schedule or hardware set read by either reader
- 8e7640eb83808a13.pdf: no door schedule or hardware set read by either reader
- 8f0690f913bb2158.pdf: no door schedule or hardware set read by either reader
- 902a9dc2687091f6.pdf: no door schedule or hardware set read by either reader
- 90ee27ac625e19b3.pdf: no door schedule or hardware set read by either reader
- 9107df83a5342bbd.pdf: no door schedule or hardware set read by either reader
- 911663489cfb9745.pdf: no door schedule or hardware set read by either reader
- 9194f7a6554b23a0.pdf: no door schedule or hardware set read by either reader
- 91b46ab08eb49a10.pdf: no door schedule or hardware set read by either reader
- 925a8e35e1c99235.pdf: no door schedule or hardware set read by either reader
- 9283b2c753b99250.pdf: no door schedule or hardware set read by either reader
- 931de4a42970408b.pdf: no door schedule or hardware set read by either reader
- 93e5740d31b51be5.pdf: no door schedule or hardware set read by either reader
- 9431a7bb1bd9293e.pdf: no door schedule or hardware set read by either reader
- 949574350f03215d.pdf: no door schedule or hardware set read by either reader
- 9539481c2cfda818.pdf: no door schedule or hardware set read by either reader
- 964f1753a534dc75.pdf: no door schedule or hardware set read by either reader
- 96a1f576258288dc.pdf: no door schedule or hardware set read by either reader
- 96a50bac34588068.pdf: no door schedule or hardware set read by either reader
- 976ff7c9e2730b45.pdf: no door schedule or hardware set read by either reader
- 97a5b061c23c63b1.pdf: no door schedule or hardware set read by either reader
- 980646e24299b097.pdf: no door schedule or hardware set read by either reader
- 98b7d32414e7c748.pdf: no door schedule or hardware set read by either reader
- 99602b3d30905b9d.pdf: no door schedule or hardware set read by either reader
- 99d71cc0897758df.pdf: no door schedule or hardware set read by either reader
- 9a67782c15a9267b.pdf: no door schedule or hardware set read by either reader
- 9a8212953a743380.pdf: no door schedule or hardware set read by either reader
- 9ae8852eb6afab51.pdf: no door schedule or hardware set read by either reader
- 9c27ae710c6f9a78.pdf: no door schedule or hardware set read by either reader
- 9d323de6e388caf2.pdf: no door schedule or hardware set read by either reader
- 9dcdd09794e13ff3.pdf: no door schedule or hardware set read by either reader
- 9e3520243bb13d9a.pdf: no door schedule or hardware set read by either reader
- 9e4c88e75ccdfd41.pdf: no door schedule or hardware set read by either reader
- 9ebe3bd1a816592a.pdf: no door schedule or hardware set read by either reader
- a00155cd049b0ca8.pdf: no door schedule or hardware set read by either reader
- a011ed727a8c9942.pdf: no door schedule or hardware set read by either reader
- a027b94b8006dabf.pdf: no door schedule or hardware set read by either reader
- a04d9c7f96623591.pdf: no door schedule or hardware set read by either reader
- a1293439ff6b37d2.pdf: no door schedule or hardware set read by either reader
- a18e530c03d503be.pdf: no door schedule or hardware set read by either reader
- a2575af396c7580f.pdf: no door schedule or hardware set read by either reader
- a2f285da0373a15a.pdf: no door schedule or hardware set read by either reader
- a3192f1b0abf4e4f.pdf: no door schedule or hardware set read by either reader
- a37a5cda56d67ec8.pdf: no door schedule or hardware set read by either reader
- a51d6c53e624c6b4.pdf: no door schedule or hardware set read by either reader
- a535a4ff7f40a321.pdf: no door schedule or hardware set read by either reader
- a65abf8b442a96c2.pdf: no door schedule or hardware set read by either reader
- a6699df61f9e01fe.pdf: no door schedule or hardware set read by either reader
- a71daa35d8d7a7b4.pdf: no door schedule or hardware set read by either reader
- a7639a4a627d1e08.pdf: no door schedule or hardware set read by either reader
- a76df6dd733c9eeb.pdf: no door schedule or hardware set read by either reader
- a8a38d8e29b96013.pdf: no door schedule or hardware set read by either reader
- a93f05a0ea0378a3.pdf: no door schedule or hardware set read by either reader
- a98bdba1743bc3d2.pdf: no door schedule or hardware set read by either reader
- a9d683a98e0e2bb3.pdf: no door schedule or hardware set read by either reader
- aadb27653f3e341d.pdf: no door schedule or hardware set read by either reader
- aafa0dbff46c0d65.pdf: no door schedule or hardware set read by either reader
- ad1de90100b8c7ab.pdf: no door schedule or hardware set read by either reader
- ad60d9552013a5fe.pdf: no door schedule or hardware set read by either reader
- ae76db062cdc63a9.pdf: no door schedule or hardware set read by either reader
- aea06e723b9c143a.pdf: no door schedule or hardware set read by either reader
- afbf221856f21ac7.pdf: no door schedule or hardware set read by either reader
- b12461ea35043586.pdf: no door schedule or hardware set read by either reader
- b1b8acd2eeadb18f.pdf: no door schedule or hardware set read by either reader
- b37247a4d047b301.pdf: no door schedule or hardware set read by either reader
- b3a18f6ead3921f8.pdf: no door schedule or hardware set read by either reader
- b439bee82145fcd6.pdf: no door schedule or hardware set read by either reader
- b463a1b65d813b81.pdf: no door schedule or hardware set read by either reader
- b5222bfa89d6d75c.pdf: no door schedule or hardware set read by either reader
- b585050d597e6c63.pdf: no door schedule or hardware set read by either reader
- b63a3ca43ccf4a78.pdf: no door schedule or hardware set read by either reader
- b6af9935ff7470bc.pdf: no door schedule or hardware set read by either reader
- b6faa64fa1fd04ef.pdf: no door schedule or hardware set read by either reader
- b77926ccb9c56bdd.pdf: no door schedule or hardware set read by either reader
- b80a52b1b8bd38e7.pdf: no door schedule or hardware set read by either reader
- b91629056cf836cd.pdf: no door schedule or hardware set read by either reader
- b92bb3b0bb75bed1.pdf: no door schedule or hardware set read by either reader
- b940bc84f048da17.pdf: no door schedule or hardware set read by either reader
- b960876fdae20b59.pdf: no door schedule or hardware set read by either reader
- b979e92b286f1212.pdf: no door schedule or hardware set read by either reader
- b98bacdb23bf4c21.pdf: no door schedule or hardware set read by either reader
- ba0640215cf14f93.pdf: no door schedule or hardware set read by either reader
- ba31ee50485652ca.pdf: no door schedule or hardware set read by either reader
- ba852671af1425f3.pdf: no door schedule or hardware set read by either reader
- bc55f1e145e98cca.pdf: no door schedule or hardware set read by either reader
- bda54b608a59598d.pdf: no door schedule or hardware set read by either reader
- be525504aecd99fe.pdf: no door schedule or hardware set read by either reader
- bf4f9c6ea75ca294.pdf: no door schedule or hardware set read by either reader
- bf9886b46a0ee79e.pdf: no door schedule or hardware set read by either reader
- c03ea143ffcfd328.pdf: no door schedule or hardware set read by either reader
- c0595c10440a4e97.pdf: no door schedule or hardware set read by either reader
- c067cc0eaab06f20.pdf: no door schedule or hardware set read by either reader
- c0ee0f0aa6c36977.pdf: no door schedule or hardware set read by either reader
- c0f22f2bc46c5f3e.pdf: no door schedule or hardware set read by either reader
- c0fb8bd2ff812a71.pdf: no door schedule or hardware set read by either reader
- c222311175b4c847.pdf: no door schedule or hardware set read by either reader
- c30e00afdd09c89c.pdf: no door schedule or hardware set read by either reader
- c39a2ea077e679b9.pdf: no door schedule or hardware set read by either reader
- c4231ac3703bd391.pdf: no door schedule or hardware set read by either reader
- c4c109222ea8e335.pdf: no door schedule or hardware set read by either reader
- c4c8fe1b1b302fcd.pdf: no door schedule or hardware set read by either reader
- c52d6ddfff2719d3.pdf: no door schedule or hardware set read by either reader
- c5ae1b3f2fbd462e.pdf: no door schedule or hardware set read by either reader
- c60a5a5f139fa40b.pdf: no door schedule or hardware set read by either reader
- c67c6594f20f4d6c.pdf: no door schedule or hardware set read by either reader
- c7f4306fa394bbe4.pdf: no door schedule or hardware set read by either reader
- c8375a50690a1698.pdf: no door schedule or hardware set read by either reader
- c894ac85f4c7c373.pdf: no door schedule or hardware set read by either reader
- c919f1e49505d0c3.pdf: no door schedule or hardware set read by either reader
- c9685e0ebb602866.pdf: no door schedule or hardware set read by either reader
- c98b8a0808c71ae0.pdf: no door schedule or hardware set read by either reader
- ca8dc1fd8e44382c.pdf: no door schedule or hardware set read by either reader
- cab88f3ed775f2c3.pdf: no door schedule or hardware set read by either reader
- cb09001942d89f15.pdf: no door schedule or hardware set read by either reader
- cb2727da7983a1a8.pdf: no door schedule or hardware set read by either reader
- cb9bfd887c5db994.pdf: no door schedule or hardware set read by either reader
- cd673574910f0619.pdf: no door schedule or hardware set read by either reader
- cd80584cbc821fe2.pdf: no door schedule or hardware set read by either reader
- ce407066f0c5ea4e.pdf: no door schedule or hardware set read by either reader
- ce492d87ecd92131.pdf: no door schedule or hardware set read by either reader
- cef2f959b908caee.pdf: no door schedule or hardware set read by either reader
- cf0ffc4649de5043.pdf: no door schedule or hardware set read by either reader
- cfcdf4c10913aee6.pdf: no door schedule or hardware set read by either reader
- cfef4564b96e196f.pdf: no door schedule or hardware set read by either reader
- d07dbed2618deb80.pdf: no door schedule or hardware set read by either reader
- d0eb3491a8ae1e04.pdf: no door schedule or hardware set read by either reader
- d10b7b6566c0d385.pdf: no door schedule or hardware set read by either reader
- d14bd852adbdc2cc.pdf: no door schedule or hardware set read by either reader
- d1701d3f16992222.pdf: no door schedule or hardware set read by either reader
- d25c368e4ac42622.pdf: no door schedule or hardware set read by either reader
- d2a5afc192992322.pdf: no door schedule or hardware set read by either reader
- d2bfdabf546a3e51.pdf: no door schedule or hardware set read by either reader
- d2d4c1d8f54f955c.pdf: no door schedule or hardware set read by either reader
- d2ff31568db16007.pdf: no door schedule or hardware set read by either reader
- d366b315407c2b21.pdf: no door schedule or hardware set read by either reader
- d373ba3eb5e12432.pdf: no door schedule or hardware set read by either reader
- d4dbc94eea4cbe7b.pdf: no door schedule or hardware set read by either reader
- d5f19aec37c6784c.pdf: no door schedule or hardware set read by either reader
- d65470c0999a712f.pdf: no door schedule or hardware set read by either reader
- d67baadf32900c03.pdf: no door schedule or hardware set read by either reader
- d73640d3c6d7574a.pdf: no door schedule or hardware set read by either reader
- d8735d83c1d458af.pdf: no door schedule or hardware set read by either reader
- d896e06c1d396dfc.pdf: no door schedule or hardware set read by either reader
- d8c6fdb65e3c0e0c.pdf: no door schedule or hardware set read by either reader
- d9158d936b8d113c.pdf: no door schedule or hardware set read by either reader
- d92fcc6b79208e11.pdf: no door schedule or hardware set read by either reader
- d935738000c24023.pdf: no door schedule or hardware set read by either reader
- d941c53acb0c1c44.pdf: no door schedule or hardware set read by either reader
- d945170e94575bfc.pdf: no door schedule or hardware set read by either reader
- d9d28f30e9838f2f.pdf: no door schedule or hardware set read by either reader
- da32b874a70dc1ac.pdf: no door schedule or hardware set read by either reader
- da3ab61474db382a.pdf: no door schedule or hardware set read by either reader
- da584d77aa24ae66.pdf: no door schedule or hardware set read by either reader
- db190042e197bcc7.pdf: no door schedule or hardware set read by either reader
- db95ab6b370e136c.pdf: no door schedule or hardware set read by either reader
- dc06aa59aec826d4.pdf: no door schedule or hardware set read by either reader
- dd3ca217098d4cda.pdf: no rows agreed and no oracle applies
- dd48ea9345d781da.pdf: no door schedule or hardware set read by either reader
- ddd3ed06dde3f8eb.pdf: no door schedule or hardware set read by either reader
- de14832c3d32692e.pdf: no door schedule or hardware set read by either reader
- def8ca8d09e60ec2.pdf: no door schedule or hardware set read by either reader
- df430795739fcd7f.pdf: no door schedule or hardware set read by either reader
- e16b835b1afacf37.pdf: no door schedule or hardware set read by either reader
- e176acb1ea9c116d.pdf: no door schedule or hardware set read by either reader
- e232da6c76983dbe.pdf: no door schedule or hardware set read by either reader
- e265b15b9a9d00a1.pdf: no door schedule or hardware set read by either reader
- e283b6c80d8acd49.pdf: no door schedule or hardware set read by either reader
- e373e12a90bfe7ad.pdf: no door schedule or hardware set read by either reader
- e3e749761843bca7.pdf: no door schedule or hardware set read by either reader
- e41edc080626f03a.pdf: no door schedule or hardware set read by either reader
- e47b93524e6faf25.pdf: no door schedule or hardware set read by either reader
- e530a0c887ca7929.pdf: no door schedule or hardware set read by either reader
- e5963633cb05296a.pdf: no door schedule or hardware set read by either reader
- e75d52a7a714c978.pdf: no rows agreed and no oracle applies
- e78c0434f0d49f17.pdf: no door schedule or hardware set read by either reader
- e7d87bdafecf8b47.pdf: no door schedule or hardware set read by either reader
- e7d8d89785535af9.pdf: no door schedule or hardware set read by either reader
- e7f6ac3f8ba58a20.pdf: no door schedule or hardware set read by either reader
- e8a888bdd7523b77.pdf: no door schedule or hardware set read by either reader
- e978cde69793e027.pdf: no door schedule or hardware set read by either reader
- e98dcaeb37699330.pdf: no door schedule or hardware set read by either reader
- e9f1ef9c54b64db4.pdf: no door schedule or hardware set read by either reader
- ea26cf717ffa6ca7.pdf: no door schedule or hardware set read by either reader
- ea2ab4ddeaa28333.pdf: no door schedule or hardware set read by either reader
- eaae34d244e7d25b.pdf: no door schedule or hardware set read by either reader
- eafaead87725b2c5.pdf: no door schedule or hardware set read by either reader
- eb83a1b8d3ca9c4e.pdf: no door schedule or hardware set read by either reader
- eb985ef35799e0ed.pdf: no door schedule or hardware set read by either reader
- ebaa4c3a9346449c.pdf: no door schedule or hardware set read by either reader
- ec0abb1306b3c570.pdf: no door schedule or hardware set read by either reader
- ecceb3a74e74e14f.pdf: no door schedule or hardware set read by either reader
- ee0d4510c7901e89.pdf: no door schedule or hardware set read by either reader
- efaa381caf89c6fc.pdf: no door schedule or hardware set read by either reader
- f04ed9de84c71ab7.pdf: no door schedule or hardware set read by either reader
- f06d8adcd112ab1c.pdf: no door schedule or hardware set read by either reader
- f0c30c40cf54bba0.pdf: no door schedule or hardware set read by either reader
- f0e69661605cde13.pdf: no door schedule or hardware set read by either reader
- f1858edcfdc0443d.pdf: no door schedule or hardware set read by either reader
- f1b3775834293b58.pdf: no door schedule or hardware set read by either reader
- f20602733eeca7f6.pdf: no door schedule or hardware set read by either reader
- f260dce40d06e915.pdf: no door schedule or hardware set read by either reader
- f2fe6c177b15ce4f.pdf: no door schedule or hardware set read by either reader
- f38f7fd7866e1976.pdf: no door schedule or hardware set read by either reader
- f3bae1ab9f821c94.pdf: no door schedule or hardware set read by either reader
- f408f0ff2330c9ca.pdf: no door schedule or hardware set read by either reader
- f42d73ba437092ce.pdf: no door schedule or hardware set read by either reader
- f4b77ed6a1ce5242.pdf: no door schedule or hardware set read by either reader
- f51bb49ef19da4a2.pdf: no door schedule or hardware set read by either reader
- f525c88e5bc8d41a.pdf: no door schedule or hardware set read by either reader
- f540c4059013d097.pdf: no door schedule or hardware set read by either reader
- f5de9d7d54303728.pdf: no door schedule or hardware set read by either reader
- f6150f2ba02f3e9f.pdf: no door schedule or hardware set read by either reader
- f6dd470ea806cf4b.pdf: no door schedule or hardware set read by either reader
- f6ef7a867c33f725.pdf: no door schedule or hardware set read by either reader
- f77f7d9fc8052b4f.pdf: no door schedule or hardware set read by either reader
- f7fba85b27d4db77.pdf: no door schedule or hardware set read by either reader
- f80b255845f1675a.pdf: no door schedule or hardware set read by either reader
- f8157da156612956.pdf: no door schedule or hardware set read by either reader
- fa3b0eb3a83dea55.pdf: no door schedule or hardware set read by either reader
- fbb984ddcf9f5e8e.pdf: no door schedule or hardware set read by either reader
- fc0659be02dae787.pdf: no door schedule or hardware set read by either reader
- fc992bc46bb8e8fd.pdf: no door schedule or hardware set read by either reader
- fd33f2af15d6fb79.pdf: no door schedule or hardware set read by either reader
- fe852b0bac74ae4e.pdf: no door schedule or hardware set read by either reader
- fed55dbedb84bbb2.pdf: no door schedule or hardware set read by either reader
- ff9c494916a7d8b5.pdf: no door schedule or hardware set read by either reader
- plan-sets/fb77f58b8f8faae8.pdf: no door schedule or hardware set read by either reader
- b3711090d93c110e.pdf: no door schedule or hardware set read by either reader
- d142f61752f9aa78.pdf: no door schedule or hardware set read by either reader
- e2dd6edcaf13cc45.pdf: no door schedule or hardware set read by either reader
- specs/89ce8170e64b6508.pdf: no door schedule or hardware set read by either reader
- 0da96f79112b83dc.pdf: no door schedule or hardware set read by either reader
- 6b4d9c81c273f090.pdf: no door schedule or hardware set read by either reader
- a0668368afa04fca.pdf: no door schedule or hardware set read by either reader
- d014ee568cacc11e.pdf: no door schedule or hardware set read by either reader
- f8882b2d07ca4177.pdf: no door schedule or hardware set read by either reader
- door-schedules/4e600acf05b8c943.pdf: no door schedule or hardware set read by either reader
- specs/636c4b0e68b8036d.pdf: no door schedule or hardware set read by either reader
- 2628479aced915d9.pdf: no door schedule or hardware set read by either reader
- 5ca1073ee12bc860.pdf: no door schedule or hardware set read by either reader
- d697f7a680b8322f.pdf: no door schedule or hardware set read by either reader
- fbe54632a07fcf84.pdf: no door schedule or hardware set read by either reader
- a88cebda3496f4a3.pdf: no door schedule or hardware set read by either reader

## Calibration: the agreement method against expected rows

For the exact (synthetic) and audited PDFs each reader, and the agreed rows, are scored against the expected rows (rows found, rows with every field right, fields right). 'Agreed fields' is the question the method stands on: of the fields both readers read the same, how many are right; 'disputed fields' says which reader was right where they differ. An addendum's struck value (expected 'superseded') counts as right, as in schedule_read_accuracy.mjs.

Caveat: reader B was written and tuned on these same audited files (Rockford, Berryessa, Christina) and the synthetic set during this build, so its numbers here are in-sample. The harvest is its out-of-sample test.

| tier | PDF | expected | reader A rows found / fully right / fields | reader B rows found / fully right / fields | agreed rows found / fully right | agreed fields right | disputed fields: A right / B right / neither |
|---|---|---|---|---|---|---|---|
| exact | bidset/weylandai-building-bidset.pdf | tools/bidset/out/truth-doors.json | 48/48 / 48 / 336/336 (100.0%) | 48/48 / 48 / 336/336 (100.0%) | 48/48 / 48 | 301/301 (100.0%) | 0 / 0 / 0 of 0 |
| exact | bidset/weylandai-building-bidset.pdf | tools/bidset/out/truth-groups.json | 54/54 / 54 / 270/270 (100.0%) | 54/54 / 54 / 270/270 (100.0%) | 54/54 / 54 | 269/269 (100.0%) | 0 / 0 / 0 of 0 |
| exact | bidset/weylandai-building-bidset-scanned.pdf | tools/bidset/out/truth-doors.json | 48/48 / 42 / 330/336 (98.2%) | 48/48 / 7 / 276/336 (82.1%) | 9/48 / 7 | 241/247 (97.6%) | 54 / 0 / 0 of 54 |
| exact | bidset/weylandai-building-bidset-scanned.pdf | tools/bidset/out/truth-groups.json | 50/54 / 49 / 249/250 (99.6%) | 50/54 / 49 / 249/250 (99.6%) | 50/54 / 49 | 248/249 (99.6%) | 0 / 0 / 0 of 0 |
| audited | door-schedules/525dc0b72011077a.pdf | christina-chs-hardware-set-01.json | 22/23 / 20 / 107/110 (97.3%) | 20/23 / 18 / 96/100 (96.0%) | 19/23 / 18 | 86/89 (96.6%) | 1 / 0 / 0 of 1 |
| audited | door-schedules/dd339f57b51538ed.pdf | berryessa-087100-hardware-groups.json | 16/16 / 16 / 80/80 (100.0%) | 16/16 / 16 / 80/80 (100.0%) | 16/16 / 16 | 44/44 (100.0%) | 0 / 0 / 0 of 0 |
| audited | door-schedules/dd339f57b51538ed.pdf | berryessa-a9.2-door-schedules.json | 24/24 / 24 / 168/168 (100.0%) | 24/24 / 24 / 168/168 (100.0%) | 24/24 / 24 | 168/168 (100.0%) | 0 / 0 / 0 of 0 |
| audited | door-schedules/f0e863d88ea688ff.pdf | rockford-087100-hardware-groups.json | 110/110 / 108 / 547/550 (99.5%) | 110/110 / 110 / 550/550 (100.0%) | 108/110 / 108 | 536/536 (100.0%) | 0 / 3 / 0 of 3 |
| audited | door-schedules/f0e863d88ea688ff.pdf | rockford-a2.2-door-schedule.json | 65/65 / 65 / 390/390 (100.0%) | 65/65 / 65 / 390/390 (100.0%) | 65/65 / 65 | 324/324 (100.0%) | 0 / 0 / 0 of 0 |
| audited | OCCDoorSchedulePg4.pdf | occ-a-801-door-schedule.json | 0/42 / 0 / n/a | 0/42 / 0 / n/a | 0/42 / 0 | n/a | 0 / 0 / 0 of 0 |

- exact: agreed rows fully right 158/161 (98.1%); agreed fields right 1059/1066 (99.3%); disputed fields 54 (A right 54, B right 0, neither 0).
- audited: agreed rows fully right 231/232 (99.6%); agreed fields right 1158/1161 (99.7%); disputed fields 4 (A right 1, B right 3, neither 0).
  - agreed but wrong, door-schedules/525dc0b72011077a.pdf christina-chs-hardware-set-01.json: 1 / DORMA 100 SERIES BY SECURITY VENDOR ALTRONTICS RB1224 BY SECURITY VENDOR description expected "AUTO DOOR OPERATOR", both read "AUTO DOOR OPERATOR RELAY MODULE"
  - agreed but wrong, door-schedules/525dc0b72011077a.pdf christina-chs-hardware-set-01.json: 1 / DORMA 100 SERIES BY SECURITY VENDOR ALTRONTICS RB1224 BY SECURITY VENDOR catalog expected "DORMA 100 SERIES BY SECURITY VENDOR", both read "DORMA 100 SERIES BY SECURITY VENDOR ALTRONTICS RB1224 BY SECURITY VENDOR"
  - agreed but wrong, door-schedules/525dc0b72011077a.pdf christina-chs-hardware-set-01.json: 1 / BY SECURITY VENDOR qty expected null, both read 1
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-doors.json: 205 width_inches expected 36, both read null
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-doors.json: 208 height_inches expected 84, both read null
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-doors.json: 212 height_inches expected 84, both read null
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-doors.json: 302 hardware_group expected "03", both read "Q3"
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-doors.json: 311 width_inches expected 36, both read null
  - agreed but wrong, bidset/weylandai-building-bidset-scanned.pdf tools/bidset/out/truth-groups.json: 6 / 5BBiHW 4.5 X 4.5 catalog expected "5BB1HW 4.5 X 4.5", both read "5BBiHW 4.5 X 4.5"

## Queue

tools/corpus/harvest/truth/queue.jsonl: 3569 disagreements (one line per field a reader pair read differently, per row only one reader read, or per set whose door lists differ).

- by tier: oracle-checked 333, agreed 2349, exact 54, unread 823, audited 10
- by kind and field: item catalog 1007, item finish 889, item manufacturer 658, item (row) 505, door (row) 317, door height_inches 51, group doors 26, item description 26, door width_inches 23, door hardware_group 19, door door_type 19, group (set) 14, door fire_rating 8, door material 3, item qty 2, door quantity 2

## Not done here

- The harvest (R2 weyland-fixtures harvest/<sha16>.pdf) is partly included (598 PDFs).
- OCC A-801 (audited) is included.
- Scanned PDFs within --ocr-max-pages use production OCR preprocessing and cell recognition with Poppler rendering. The actual DPI is recorded per page under the 36 MP budget. Browser rendering and upload/save are separate checks (scanned_sheet_browser.mjs and the subx-scanned-sheet journey).
- The 2% human spot check of agreed rows (to catch both readers wrong the same way) is not part of this run.
- tools/corpus/harvest/triage.json was used for triage classes.
