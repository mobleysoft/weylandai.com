# Schedule reading accuracy, 2026-10-08-04-55 (before)

Live API https://weylandai.com. Ground truth: tools/corpus/expected (read by eye). Rows found = expected rows whose mark was read on the right page (a mark one character off still counts as found, with the mark field wrong). Field accuracy = right fields over the found rows' fields (doors: mark, hardware group, width, height, fire rating, door type; items: qty, description, catalog, finish, maker).

| document | what | expected | found | rows found | field accuracy | extra | notes |
|---|---|---|---|---|---|---|---|
| rockford | doors | 65 | 0 | 0% | n/a | 0 | p29 HTTP 422 31s; p18 HTTP 422 5s; p19 HTTP 422 7s; p20 HTTP 422 7s; p21 HTTP 422 5s; p22 HTTP 422 6s; p23 HTTP 422 6s |
| rockford | hardware items | 103 (13 groups) | 0 (0 groups) | 0% | n/a | 0 groups |  |
| berryessa | doors | 24 | 0 | 0% | n/a | 0 | p284 HTTP 422 14s; p286 HTTP 422 8s; p288 HTTP 422 13s; p282 HTTP 422 4s |
| berryessa | hardware items | 16 (2 groups) | 0 (0 groups) | 0% | n/a | 0 groups |  |
| occ | doors | 42 | 41 | 97.6% | 97.2% | 1 | p1 42 doors 17s |
| christina | hardware items | 23 (1 groups) | 0 (0 groups) | 0% | n/a | 1 groups |  |

## Per field

- rockford doors: mark 0/0, hardware_group 0/0, width_inches 0/0, height_inches 0/0, fire_rating 0/0, door_type 0/0
- rockford items: qty 0/0, description 0/0, catalog 0/0, finish 0/0, mfr 0/0
- rockford find-pages: route not available
- rockford p29: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 29 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p18: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 18 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p19: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 19 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p20: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 20 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p21: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 21 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p22: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 22 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- rockford p23: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 23 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- berryessa doors: mark 0/0, hardware_group 0/0, width_inches 0/0, height_inches 0/0, fire_rating 0/0, door_type 0/0
- berryessa items: qty 0/0, description 0/0, catalog 0/0, finish 0/0, mfr 0/0
- berryessa find-pages: route not available
- berryessa p284: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 284 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- berryessa p286: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 286 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- berryessa p288: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 288 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- berryessa p282: HTTP 422 no_schedule_table_found - No door schedule or hardware schedule table was found on page 282 (the page was read as shown and turned 90, 180 and 270 degrees). Check that this page holds the schedule itself, ruled into rows and columns.
- occ doors: mark 41/41, hardware_group 41/41, width_inches 40/41, height_inches 39/41, fire_rating 40/41, door_type 38/41
- occ find-pages: route not available
- christina items: qty 0/0, description 0/0, catalog 0/0, finish 0/0, mfr 0/0
- christina find-pages: route not available

## Wrong fields (first 40 per document)

- rockford: 78 wrong
  - 1J.1 (p29): not found
  - 109.1 (p29): not found
  - 109.2 (p29): not found
  - 111.1 (p29): not found
  - 111.1.1 (p29): not found
  - 113.1 (p29): not found
  - 113.1.1 (p29): not found
  - 114.1 (p29): not found
  - 118.1 (p29): not found
  - 119.1 (p29): not found
  - 119.2 (p29): not found
  - 126.1 (p29): not found
  - 126.1.1 (p29): not found
  - 126.1.2 (p29): not found
  - 126.2 (p29): not found
  - 127.1 (p29): not found
  - 128.1.1 (p29): not found
  - 129.1 (p29): not found
  - 130.1 (p29): not found
  - 131.1 (p29): not found
  - 132.1 (p29): not found
  - 133.1 (p29): not found
  - 134.1 (p29): not found
  - 136.1 (p29): not found
  - 138.1 (p29): not found
  - 138.1.1 (p29): not found
  - 138.2 (p29): not found
  - 141.1 (p29): not found
  - 142.1 (p29): not found
  - 143.1 (p29): not found
  - 144.1 (p29): not found
  - 145.1 (p29): not found
  - 146.1 (p29): not found
  - 147.1 (p29): not found
  - 147.1.1 (p29): not found
  - 148.1 (p29): not found
  - 150.1 (p29): not found
  - 151.1 (p29): not found
  - 152.1 (p29): not found
  - 152.1.1 (p29): not found
- berryessa: 26 wrong
  - 001 (p284): not found
  - 002 (p284): not found
  - 003 (p284): not found
  - 004 (p284): not found
  - 005 (p284): not found
  - 006 (p284): not found
  - 007 (p284): not found
  - 008 (p284): not found
  - 009 (p284): not found
  - 001 (p286): not found
  - 002 (p286): not found
  - 003 (p286): not found
  - 004 (p286): not found
  - 005 (p286): not found
  - 006 (p286): not found
  - 008 (p286): not found
  - 001 (p288): not found
  - 002 (p288): not found
  - 003 (p288): not found
  - 004 (p288): not found
  - 005 (p288): not found
  - 006 (p288): not found
  - 007 (p288): not found
  - 008 (p288): not found
  - group 01: not found
  - group 02: not found
- occ: 8 wrong
  - 138: width_inches: expected 36, read null
  - 139: door_type: expected "C", read "Cc"
  - 143 (p1): not found
  - 147A: door_type: expected "C", read "Cc"
  - 227: door_type: expected "B", read "R"
  - 235: fire_rating: expected "20 MIN.", read "2U MIN."
  - 244: height_inches: expected 95, read null
  - 245: height_inches: expected 95, read null
- christina: 1 wrong
  - group 01: not found

Cleanup: {"deleted":{"hardware_components":24,"client_telemetry":4,"door_hardware_matrix":2,"door_schedule_entries":42,"hardware_page_extractions":2,"hardware_sets":1,"hardware_extraction_sessions":4,"weyland_sessions":1,"users":1},"r2":["deleted","deleted","deleted","deleted"],"kv":["deleted","deleted","deleted","deleted"],"remaining":{"users":0,"weyland_sessions":0,"extraction_sessions":0},"ok":true}
