# Schedule reading accuracy, 2026-10-09-06-48 (all-five)

Live API https://weylandai.com. Ground truth: tools/corpus/expected (read by eye). Rows found = expected rows whose mark was read on the right page (a mark one character off still counts as found, with the mark field wrong). Field accuracy = right fields over the found rows' fields (doors: mark, hardware group, width, height, fire rating, door type; items: qty, description, catalog, finish, maker).

| document | what | expected | found | rows found | field accuracy | extra | notes |
|---|---|---|---|---|---|---|---|
| rockford | doors | 65 | 65 | 100% | 100% | 0 | p29 65 doors 0s; p17 1 groups 0s; p18 3 groups 0s; p19 3 groups 0s; p20 2 groups 0s; p21 1 groups 0s; p22 1 groups 0s; p23 3 groups 0s |
| rockford | hardware items | 110 (14 groups) | 110 (14 groups) | 100% | 99.5% | 0 groups | doors linked 64/64 |
| berryessa | doors | 24 | 24 | 100% | 98.6% | 0 | p284 9 doors 0s; p286 7 doors 0s; p288 8 doors 0s; p282 2 groups 0s |
| berryessa | hardware items | 16 (2 groups) | 16 (2 groups) | 100% | 100% | 0 groups |  |
| occ | doors | 42 | 41 | 97.6% | 97.2% | 1 | p1 42 doors 15s |
| christina | hardware items | 23 (1 groups) | 22 (1 groups) | 95.7% | 95.5% | 0 groups |  |

## Per field

- rockford doors: mark 65/65, hardware_group 65/65, width_inches 65/65, height_inches 65/65, fire_rating 65/65, door_type 65/65
- rockford items: qty 110/110, description 108/110, catalog 109/110, finish 110/110, mfr 110/110
- rockford find-pages: door [29] (expected [29]), hardware [17,18,19,20,21,22,23] (expected [17,18,19,20,21,22,23]), 5 s
- berryessa doors: mark 24/24, hardware_group 24/24, width_inches 24/24, height_inches 24/24, fire_rating 24/24, door_type 22/24
- berryessa items: qty 16/16, description 16/16, catalog 16/16, finish 16/16, mfr 16/16
- berryessa find-pages: door [284,286,288] (expected [284,286,288]), hardware [282] (expected [282]), 8 s
- occ doors: mark 41/41, hardware_group 41/41, width_inches 40/41, height_inches 39/41, fire_rating 40/41, door_type 38/41
- occ find-pages: door [] (expected [1]), hardware [] (expected []), 3 s
- christina items: qty 21/22, description 21/22, catalog 21/22, finish 20/22, mfr 22/22
- christina find-pages: door [] (expected []), hardware [219,220,221,222,223] (expected [219]), 10 s

## Wrong fields (first 40 per document)

- rockford: 3 wrong
  - 32 EXD / SURFACE CLOSER 4040XP REG / 4040XP EDA - AS REQUIRED: description: expected "SURFACE CLOSER", read "SURFACE CLOSER (REG/"
  - 32 EXD / SURFACE CLOSER 4040XP REG / 4040XP EDA - AS REQUIRED: catalog: expected "4040XP REG / 4040XP EDA - AS REQUIRED", read "4040XP REG / 4040XP EDA - AS"
  - 40 UTY / SURFACE CLOSER 4040XP SCUSH: description: expected "SURFACE CLOSER", read "SURFACE CLOSER (PA"
- berryessa: 2 wrong
  - 002: door_type: expected "B", read null
  - 002: door_type: expected "B", read null
- occ: 8 wrong
  - 138: width_inches: expected 36, read null
  - 139: door_type: expected "C", read "Cc"
  - 143 (p1): not found
  - 147A: door_type: expected "C", read "Cc"
  - 227: door_type: expected "B", read "R"
  - 235: fire_rating: expected "20 MIN.", read "2U MIN."
  - 244: height_inches: expected 95, read null
  - 245: height_inches: expected 95, read null
- christina: 6 wrong
  - 01 / AUTO DOOR OPERATOR DORMA 100 SERIES BY SECURITY VENDOR: description: expected "AUTO DOOR OPERATOR", read "AUTO DOOR OPERATOR RELAY MODULE"
  - 01 / AUTO DOOR OPERATOR DORMA 100 SERIES BY SECURITY VENDOR: catalog: expected "DORMA 100 SERIES BY SECURITY VENDOR", read "DORMA 100 SERIES BY SECURITY VENDOR ALTRONTICS RB1224 BY SECURITY VENDOR"
  - 01 / RELAY MODULE ALTRONTICS RB1224 BY SECURITY VENDOR: not found
  - 01 / H/C PUSH SWITCH 946HP45MO x 946475WR (EXTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / H/C PUSH SWITCH 946HP45MO (INTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS BY SECURITY VENDOR: qty: expected null, read 1

Cleanup: {"mode":"api","deleted":["906236f3-0fd0-4d5f-afdd-ff59b885c1e7 (326 rows)","71b97e2b-3fa8-421a-9c70-6b976ba17064 (45 rows)","3cfa0515-9f78-4a34-8b78-933f071b239c (44 rows)","df4e7232-9d05-4404-866a-9b3d7fd0efb8 (29 rows)"],"failed":[],"ok":true}
