# Schedule reading accuracy, 2026-10-08-11-01 (after_text_layer)

Live API https://weylandai.com. Ground truth: tools/corpus/expected (read by eye). Rows found = expected rows whose mark was read on the right page (a mark one character off still counts as found, with the mark field wrong). Field accuracy = right fields over the found rows' fields (doors: mark, hardware group, width, height, fire rating, door type; items: qty, description, catalog, finish, maker).

| document | what | expected | found | rows found | field accuracy | extra | notes |
|---|---|---|---|---|---|---|---|
| rockford | doors | 65 | 65 | 100% | 100% | 0 | p29 65 doors 10s; p17 HTTP 422 1s; p18 3 groups 22s; p19 3 groups 30s; p20 2 groups 40s; p21 1 groups 53s; p22 1 groups 66s; p23 HTTP 503 71s |
| rockford | hardware items | 110 (14 groups) | 103 (13 groups) | 93.6% | 82.3% | 0 groups | doors linked 61/61 |
| berryessa | doors | 24 | 9 | 37.5% | 96.3% | 0 | p284 9 doors 4s; p286 7 doors 6s; p288 8 doors 4s; p282 2 groups 17s |
| berryessa | hardware items | 16 (2 groups) | 16 (2 groups) | 100% | 85% | 0 groups |  |
| occ | doors | 42 | 41 | 97.6% | 97.2% | 1 | p1 42 doors 13s |
| christina | hardware items | 23 (1 groups) | 22 (1 groups) | 95.7% | 78.2% | 0 groups |  |

## Per field

- rockford doors: mark 65/65, hardware_group 65/65, width_inches 65/65, height_inches 65/65, fire_rating 65/65, door_type 65/65
- rockford items: qty 103/103, description 12/103, catalog 103/103, finish 103/103, mfr 103/103
- rockford find-pages: route not available
- rockford p17: HTTP 422 grid door-schedule extraction failed (no_grid_detected): found 0 column lines, 0 row lines - page may not contain a ruled table - grid door-schedule extraction failed (no_grid_detected): found 0 column lines, 0 row lines - page may not contain a ruled table (browser reader unavailable: browser_launch_failed: Unable to create new browser: code: 503: message: No browser available)
- rockford p23: HTTP 503 undefined
- berryessa doors: mark 8/9, hardware_group 9/9, width_inches 9/9, height_inches 9/9, fire_rating 9/9, door_type 8/9
- berryessa items: qty 16/16, description 4/16, catalog 16/16, finish 16/16, mfr 16/16
- berryessa find-pages: route not available
- occ doors: mark 41/41, hardware_group 41/41, width_inches 40/41, height_inches 39/41, fire_rating 40/41, door_type 38/41
- occ find-pages: route not available
- christina items: qty 21/22, description 1/22, catalog 22/22, finish 20/22, mfr 22/22
- christina find-pages: route not available

## Wrong fields (first 40 per document)

- rockford: 92 wrong
  - group 01 RR: not found
  - 02 RR-M / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 02 RR-M / PULL PLATE 8302 10" 4" X 16" TKTX SCREWS AT HM DOORS: description: expected "PULL PLATE", read "pull_handle"
  - 02 RR-M / REG/ PA SURFACE CLOSER - AS REQUIRED 4040XP REG / 4040XP EDA - AS REQUIRED: description: expected "REG/ PA SURFACE CLOSER - AS REQUIRED", read "closer"
  - 02 RR-M / MOP PLATE 8400 4" HIGH B-CS TKTX SCREWS AT HM DOORS: description: expected "MOP PLATE", read "lock"
  - 02 RR-M / WALL STOP WS406/407CCV: description: expected "WALL STOP", read "stop"
  - 02 RR-M / SILENCER SR64: description: expected "SILENCER", read "lock"
  - 06 CL / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 06 CL / ENTRANCE LOCK ALX53R-RHO-626 FSIC: description: expected "ENTRANCE LOCK", read "lock"
  - 06 CL / CLOSER, HOLD OPEN 4040XP H / HEDA - AS REQUIRED: description: expected "CLOSER, HOLD OPEN", read "closer"
  - 06 CL / WALL STOP WS406/407CCV: description: expected "WALL STOP", read "stop"
  - 06 CL / SILENCER SR64: description: expected "SILENCER", read "lock"
  - 07 CL / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 07 CL / ENTRANCE LOCK ALX53R-RHO-626 FSIC: description: expected "ENTRANCE LOCK", read "lock"
  - 07 CL / OH STOP 90S: description: expected "OH STOP", read "stop"
  - 07 CL / CLOSER, HOLD OPEN 4040XP H / HEDA - AS REQUIRED: description: expected "CLOSER, HOLD OPEN", read "closer"
  - 07 CL / SILENCER SR64: description: expected "SILENCER", read "lock"
  - 19 STO / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 19 STO / CONST LATCHING BOLT FB51P / FB61P: description: expected "CONST LATCHING BOLT", read "latch"
  - 19 STO / DUST PROOF STRIKE DP1/ DP2 (AS REQ'D): description: expected "DUST PROOF STRIKE", read "lock"
  - 19 STO / STOREROOM LOCK ALX80R-RHO-626 FSIC: description: expected "STOREROOM LOCK", read "lock"
  - 19 STO / CLOSER, HOLD OPEN 4040XP H / HEDA - AS REQUIRED: description: expected "CLOSER, HOLD OPEN", read "closer"
  - 19 STO / ARMOR PLATE 8400 34" HIGH B-CS TKTX SCREWS AT HM DOORS: description: expected "ARMOR PLATE", read "lock"
  - 19 STO / WALL STOP WS406/407CCV: description: expected "WALL STOP", read "stop"
  - 19 STO / SILENCER SR64: description: expected "SILENCER", read "lock"
  - 19F STO / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 19F STO / CONST LATCHING BOLT FB51P / FB61P: description: expected "CONST LATCHING BOLT", read "latch"
  - 19F STO / DUST PROOF STRIKE DP1/ DP2 (AS REQ'D): description: expected "DUST PROOF STRIKE", read "lock"
  - 19F STO / STOREROOM LOCK ALX80R-RHO-626 FSIC: description: expected "STOREROOM LOCK", read "lock"
  - 19F STO / REG/ PA SURFACE CLOSER - AS REQUIRED 4040XP REG / 4040XP EDA - AS REQUIRED: description: expected "REG/ PA SURFACE CLOSER - AS REQUIRED", read "closer"
  - 19F STO / ARMOR PLATE 8400 34" HIGH B-CS TKTX SCREWS AT HM DOORS: description: expected "ARMOR PLATE", read "lock"
  - 19F STO / WALL STOP WS406/407CCV: description: expected "WALL STOP", read "stop"
  - 19F STO / GASKETING 188SBK PSA: description: expected "GASKETING", read "seal"
  - 20 STO / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 20 STO / STOREROOM LOCK ALX80R-RHO-626 FSIC: description: expected "STOREROOM LOCK", read "lock"
  - 20 STO / REG/ PA SURFACE CLOSER - AS REQUIRED 4040XP REG / 4040XP EDA - AS REQUIRED: description: expected "REG/ PA SURFACE CLOSER - AS REQUIRED", read "closer"
  - 20 STO / WALL STOP WS406/407CCV: description: expected "WALL STOP", read "stop"
  - 20 STO / SILENCER SR64: description: expected "SILENCER", read "lock"
  - 23 STO / CONTINUOUS HINGE SL11 / SL24: description: expected "CONTINUOUS HINGE", read "hinge"
  - 23 STO / STOREROOM LOCK ALX80R-RHO-626 FSIC: description: expected "STOREROOM LOCK", read "lock"
- berryessa: 29 wrong
  - 001: mark: expected "001", read "009"
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
  - 002: door_type: expected "B", read null
  - 01 / FIRE EXIT HARDWARE PA-AX-99-L-F-2SI-06: description: expected "FIRE EXIT HARDWARE", read "exit_device"
  - 01 / RIM CYLINDER 20-057 ICX: description: expected "RIM CYLINDER", read "cylinder"
  - 01 / INTERCHANGEABLE CORE VERIFY PERMANENT CORE WITH DISTRICT: description: expected "INTERCHANGEABLE CORE", read "core"
  - 01 / SURFACE CLOSER 4040XP EDA: description: expected "SURFACE CLOSER", read "closer"
  - 01 / GASKETING 188SBK PSA: description: expected "GASKETING", read "seal"
  - 02 / FIRE EXIT HARDWARE PA-AX-9927-EO-F-LBR-499F: description: expected "FIRE EXIT HARDWARE", read "exit_device"
  - 02 / FIRE EXIT HARDWARE PA-AX-9927-L-F-2SI-LBR-06-499F: description: expected "FIRE EXIT HARDWARE", read "exit_device"
  - 02 / RIM CYLINDER 20-057 ICX: description: expected "RIM CYLINDER", read "cylinder"
  - 02 / INTERCHANGEABLE CORE VERIFY PERMANENT CORE WITH DISTRICT: description: expected "INTERCHANGEABLE CORE", read "core"
  - 02 / SURFACE CLOSER 4040XP EDA: description: expected "SURFACE CLOSER", read "closer"
  - 02 / GASKETING 188SBK PSA: description: expected "GASKETING", read "seal"
  - 02 / MEETING STILE 328AA-S: description: expected "MEETING STILE", read "lock"
- occ: 8 wrong
  - 138: width_inches: expected 36, read null
  - 139: door_type: expected "C", read "Cc"
  - 143 (p1): not found
  - 147A: door_type: expected "C", read "Cc"
  - 227: door_type: expected "B", read "R"
  - 235: fire_rating: expected "20 MIN.", read "2U MIN."
  - 244: height_inches: expected 95, read null
  - 245: height_inches: expected 95, read null
- christina: 25 wrong
  - 01 / CONTINUOUS HINGES 224HD (PREP'D FOR EPT): description: expected "CONTINUOUS HINGES", read "hinge"
  - 01 / KEY REMOVEABLE MULLION KR4954: description: expected "KEY REMOVEABLE MULLION", read "key"
  - 01 / MULLION CYLINDER MORTISE TYPE W/ CORE (KEYED TO EXISTING SYSTEM): description: expected "MULLION CYLINDER", read "cylinder"
  - 01 / DOOR PULLS 1191-4: description: expected "DOOR PULLS", read "pull_handle"
  - 01 / DOOR CLOSER W/ STOPS 4041XP SPR CNS 4041XP-30 & 61: description: expected "DOOR CLOSER W/ STOPS", read "closer"
  - 01 / ELECTRIC POWER TRANSFERS EPT-10 BY SECURITY VENDOR: description: expected "ELECTRIC POWER TRANSFERS", read "lock"
  - 01 / ELECTRIFIED PANIC DEVICE RX-QEL98L-NL-03 LD BY SECURITY VENDOR: description: expected "ELECTRIFIED PANIC DEVICE", read "exit_device"
  - 01 / POWER SUPPLY BY SECURITY VENDOR: description: expected "POWER SUPPLY", read "lock"
  - 01 / TRIM CYLINDER & CORE AS REQUIRED (KEYED TO EXISTING SYSTEM): description: expected "TRIM CYLINDER & CORE", read "cylinder"
  - 01 / DOOR PULLS 1191-4: description: expected "DOOR PULLS", read "pull_handle"
  - 01 / DOOR CLOSER W/ STOPS 4041XP SPR CNS 4041XP-30 & 61: description: expected "DOOR CLOSER W/ STOPS", read "closer"
  - 01 / ELECTRIFIED PANIC DEVICE RX-QEL98L-BE-03 LD BY SECURITY VENDOR: description: expected "ELECTRIFIED PANIC DEVICE", read "exit_device"
  - 01 / AUTO DOOR OPERATOR DORMA 100 SERIES BY SECURITY VENDOR: description: expected "AUTO DOOR OPERATOR", read "lock"
  - 01 / RELAY MODULE ALTRONTICS RB1224 BY SECURITY VENDOR: not found
  - 01 / H/C PUSH SWITCH 946HP45MO x 946475WR (EXTERIOR) BY SECURITY VENDOR: description: expected "H/C PUSH SWITCH", read "lock"
  - 01 / H/C PUSH SWITCH 946HP45MO x 946475WR (EXTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / H/C PUSH SWITCH 946HP45MO (INTERIOR) BY SECURITY VENDOR: description: expected "H/C PUSH SWITCH", read "lock"
  - 01 / H/C PUSH SWITCH 946HP45MO (INTERIOR) BY SECURITY VENDOR: finish: expected "US32D", read "630"
  - 01 / BALLARD POST (FOR H/C SWITCH) BY SECURITY VENDOR: description: expected "BALLARD POST (FOR H/C SWITCH)", read "lock"
  - 01 / KEY SWITCH 960MA BY SECURITY VENDOR: description: expected "KEY SWITCH", read "key"
  - 01 / KEY SWITCH CYLINDER MORTISE TYPE W/ CORE (KEYED TO EXISTING SYSTEM): description: expected "KEY SWITCH CYLINDER", read "cylinder"
  - 01 / DOOR POSITION SWITCHES GRI 180-12-W-34" STL DR CONTACT WHITE BY SECURITY VENDOR: description: expected "DOOR POSITION SWITCHES", read "lock"
  - 01 / VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS BY SECURITY VENDOR: qty: expected null, read 1
  - 01 / VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS BY SECURITY VENDOR: description: expected "VIDEO/INTERCOM STATION & CONSOLE w/ 5 RELEASE BUTTONS", read "hinge"
  - 01 / CARD READER HID GLOBAL SIGNO 40TKS-002MRN-ADV iClass/EOS BY SECURITY VENDOR: description: expected "CARD READER", read "lock"

Cleanup: {"deleted":{"hardware_components":146,"client_telemetry":4,"door_hardware_matrix":124,"door_schedule_entries":116,"hardware_page_extractions":13,"hardware_sets":16,"hardware_extraction_sessions":4,"weyland_sessions":1,"users":1},"r2":["deleted","deleted","deleted","deleted"],"kv":["deleted","deleted","deleted","deleted"],"remaining":{"users":0,"weyland_sessions":0,"extraction_sessions":0},"ok":tru
