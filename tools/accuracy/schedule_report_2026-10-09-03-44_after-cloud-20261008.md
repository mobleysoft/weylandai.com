# Schedule reading accuracy, 2026-10-09-03-44 (after-cloud-20261008)

Live API https://weylandai.com. Ground truth: tools/corpus/expected (read by eye). Rows found = expected rows whose mark was read on the right page (a mark one character off still counts as found, with the mark field wrong). Field accuracy = right fields over the found rows' fields (doors: mark, hardware group, width, height, fire rating, door type; items: qty, description, catalog, finish, maker).

| document | what | expected | found | rows found | field accuracy | extra | notes |
|---|---|---|---|---|---|---|---|
| rockford | doors | 65 | 65 | 100% | 100% | 0 | p29 HTTP 503 73s; p17 HTTP 503 73s; p18 HTTP 503 73s; p19 HTTP 503 73s; p20 HTTP 503 73s; p21 HTTP 503 73s; p22 HTTP 503 73s; p23 HTTP 503 73s |
| rockford | hardware items | 110 (14 groups) | 49 (7 groups) | 44.5% | 100% | 0 groups | doors linked 48/48 |
| berryessa | doors | 24 | 24 | 100% | 98.6% | 0 | p284 9 doors 1s; p286 7 doors 0s; p288 8 doors 0s; p282 2 groups 0s |
| berryessa | hardware items | 16 (2 groups) | 16 (2 groups) | 100% | 100% | 0 groups |  |
| occ | doors | 42 | 41 | 97.6% | 97.2% | 1 | p1 42 doors 16s |
| christina | hardware items | 23 (1 groups) | 22 (1 groups) | 95.7% | 97.3% | 0 groups |  |

## Per field

- rockford doors: mark 65/65, hardware_group 65/65, width_inches 65/65, height_inches 65/65, fire_rating 65/65, door_type 65/65
- rockford items: qty 49/49, description 49/49, catalog 49/49, finish 49/49, mfr 49/49
- rockford find-pages: door [29] (expected [29]), hardware [17,18,19,20,21,22,23] (expected [17,18,19,20,21,22,23]), 6 s
- rockford p29: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p17: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p18: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p19: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p20: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p21: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p22: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- rockford p23: HTTP 503 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]> 
- berryessa doors: mark 24/24, hardware_group 24/24, width_inches 24/24, height_inches 24/24, fire_rating 24/24, door_type 22/24
- berryessa items: qty 16/16, description 16/16, catalog 16/16, finish 16/16, mfr 16/16
- berryessa find-pages: door [284,286,288] (expected [284,286,288]), hardware [282] (expected [282]), 6 s
- occ doors: mark 41/41, hardware_group 41/41, width_inches 40/41, height_inches 39/41, fire_rating 40/41, door_type 38/41
- occ find-pages: door [] (expected [1]), hardware [] (expected []), 3 s
- christina items: qty 21/22, description 22/22, catalog 22/22, finish 20/22, mfr 22/22
- christina find-pages: door [] (expected []), hardware [219,220,221,222,223] (expected [219]), 5 s

## Wrong fields (first 40 per document)

- rockford: 7 wrong
  - group 23 STO: not found
  - group 28 COR: not found
  - group 32 EXD: not found
  - group 40 UTY: not found
  - group 44 UTY-IT: not found
  - group 47 VES: not found
  - group 51 UTY-CUS: not found
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
- christina: 4 wrong
  - 01 / RELAY MODULE ALTRONTICS RB1224 BY SECURITY VENDOR: not found
  - 01 / H/C PUSH SWITCH 946HP45MO x 946475WR (EXTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / H/C PUSH SWITCH 946HP45MO (INTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS BY SECURITY VENDOR: qty: expected null, read 1

Cleanup: {"deleted":{"hardware_components":88,"client_telemetry":4,"door_hardware_matrix":98,"door_schedule_entries":131,"hardware_page_extractions":5,"hardware_sets":10,"hardware_extraction_sessions":4,"weyland_sessions":1,"users":1},"r2":["deleted","deleted","deleted","deleted"],"kv":["deleted","deleted","deleted","deleted"],"remaining":{"users":0,"weyland_sessions":0,"extraction_sessions":0},"ok":true}
