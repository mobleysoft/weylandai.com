# Audit lines through the live matcher, 2026-10-08 (after)

Measured against https://weylandai.com (weyland-cutsheetx-worker version ead93f6a, deployed 15:17 EDT from 05024e1) with the same POST /api/cut-sheets/match-batch call the homepage paste box makes, an ephemeral guest token, lines pasted as printed. Before (plan/evidence/value_audit/recheck/recheck_api.json, 7 October 21:16 EDT, the value report's rows 5 and 6): Group 06 CL pasted as printed matched 1 of 14 lines, with the heading, the door numbers and the wrapped tails scored as misses; "Ives 8200" answered Sargent 8200 Series Mortise Lock (high, exact); "Ives 8302" answered ZERO 8302 (high, exact).

## Rockford Hardware Group No. 06 CL, pasted as printed (plan/evidence/value_audit/recheck/group06.txt)

5 of 6 item lines matched, 9 lines skipped by reason (heading, door list, column header, wrapped text, footer), 2413 ms.

| line | answer | confidence | citation |
|---|---|---|---|
| 1 EA CONTINUOUS HINGE SL11 / SL24 628 SEL | miss: Select Hinges is not in the catalogue |  |  |
| 1 EA ENTRANCE LOCK ALX53R-RHO-626 FSIC 626 SCH | Schlage ALX53 | medium base_model | Schlage Commercial Price Book 2023 p. 49 |
| 1 EA CLOSER, HOLD OPEN 4040XP H / HEDA - AS 689 LCN | LCN Closers 4040XP | high exact | LCN Price Book p. 6-48 |
| 1 EA KICK PLATE 8400 10" HIGH B-CS 630 IVE | IVES 8400 | high exact | Ives Price Book 2024 p. 93 |
| 1 EA WALL STOP WS406/407CCV 630 IVE | IVES WS406/407CCV | high exact | Ives Price Book p. 130 |
| 3 EA SILENCER SR64 GRY IVE | IVES SR64 | high exact | Ives Price Book 2024 p. 144 |
| Hardware Group No. 06 CL | skipped: heading | | |
| 109.1 109.2 111.1 113.1 128.1.1 129.1 | skipped: doors | | |
| 131.1 133.1 138.1.1 141.1 142.1 143.1 | skipped: doors | | |
| 144.1 145.1 146.1 151.1 153.1 159.1 | skipped: doors | | |
| 161.1 162.1 163.1 164.1 165.1 166.1 | skipped: doors | | |
| 173.1 174.1 175.1 176.1 177.1 178.1 | skipped: doors | | |
| QTY DESCRIPTION CATALOG NUMBER FINISH MFR | skipped: header | | |
| REQUIRED | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |

## Ives 8200 and Ives 8302

2 of 2 item lines matched, 0 lines skipped by reason (heading, door list, column header, wrapped text, footer), 1242 ms.

| line | answer | confidence | citation |
|---|---|---|---|
| Ives 8200 | IVES 8200 | medium catalogue_page | Ives Price Book 2024 p. 82 |
| Ives 8302 | IVES 8302-0 | medium variant | Ives Price Book p. 85 |

## Rockford Section 087100 p.18 (groups 02 RR-M, 06 CL, 07 CL), pasted as printed

16 of 20 item lines matched, 23 lines skipped by reason (heading, door list, column header, wrapped text, footer), 4237 ms.

| line | answer | confidence | citation |
|---|---|---|---|
| 1 EA CONTINUOUS HINGE SL11 / SL24 628 SEL | miss: Select Hinges is not in the catalogue |  |  |
| 1 EA PUSH PLATE 8200 4" X 16" 630 IVE | IVES 8200 | medium catalogue_page | Ives Price Book 2024 p. 82 |
| 1 EA PULL PLATE 8302 10" 4" X 16" 630 IVE | IVES 8302-0 | medium variant | Ives Price Book p. 85 |
| 1 EA REG/ PA SURFACE 4040XP REG / 4040XP EDA - AS 689 LCN | LCN Closers 4040XP | high exact | LCN Price Book p. 6-48 |
| 1 EA KICK PLATE 8400 10" HIGH B-CS 630 IVE | IVES 8400 | high exact | Ives Price Book 2024 p. 93 |
| 1 EA MOP PLATE 8400 4" HIGH B-CS 630 IVE | IVES 8400 | high exact | Ives Price Book 2024 p. 93 |
| 1 EA WALL STOP WS406/407CCV 630 IVE | IVES WS406/407CCV | high exact | Ives Price Book p. 130 |
| 3 EA SILENCER SR64 GRY IVE | IVES SR64 | high exact | Ives Price Book 2024 p. 144 |
| 1 EA CONTINUOUS HINGE SL11 / SL24 628 SEL | miss: Select Hinges is not in the catalogue |  |  |
| 1 EA ENTRANCE LOCK ALX53R-RHO-626 FSIC 626 SCH | Schlage ALX53 | medium base_model | Schlage Commercial Price Book 2023 p. 49 |
| 1 EA CLOSER, HOLD OPEN 4040XP H / HEDA - AS 689 LCN | LCN Closers 4040XP | high exact | LCN Price Book p. 6-48 |
| 1 EA KICK PLATE 8400 10" HIGH B-CS 630 IVE | IVES 8400 | high exact | Ives Price Book 2024 p. 93 |
| 1 EA WALL STOP WS406/407CCV 630 IVE | IVES WS406/407CCV | high exact | Ives Price Book p. 130 |
| 3 EA SILENCER SR64 GRY IVE | IVES SR64 | high exact | Ives Price Book 2024 p. 144 |
| 1 EA CONTINUOUS HINGE SL11 / SL24 628 SEL | miss: Select Hinges is not in the catalogue |  |  |
| 1 EA ENTRANCE LOCK ALX53R-RHO-626 FSIC 626 SCH | Schlage ALX53 | medium base_model | Schlage Commercial Price Book 2023 p. 49 |
| 1 EA OH STOP 90S 652 GLY | miss: Glynn-Johnson is in the catalogue; 90S is not |  |  |
| 1 EA CLOSER, HOLD OPEN 4040XP H / HEDA - AS 689 LCN | LCN Closers 4040XP | high exact | LCN Price Book p. 6-48 |
| 1 EA KICK PLATE 8400 10" HIGH B-CS 630 IVE | IVES 8400 | high exact | Ives Price Book 2024 p. 93 |
| 3 EA SILENCER SR64 GRY IVE | IVES SR64 | high exact | Ives Price Book 2024 p. 144 |
| Hardware Group No. 02 RR-M | skipped: heading | | |
| 147.1 148.1 167.1 168.1 179.1 180.1 | skipped: doors | | |
| QTY DESCRIPTION CATALOG NUMBER FINISH MFR | skipped: header | | |
| Hardware Group No. 06 CL | skipped: heading | | |
| 109.1 109.2 111.1 113.1 128.1.1 129.1 | skipped: doors | | |
| 131.1 133.1 138.1.1 141.1 142.1 143.1 | skipped: doors | | |
| 144.1 145.1 146.1 151.1 153.1 159.1 | skipped: doors | | |
| 161.1 162.1 163.1 164.1 165.1 166.1 | skipped: doors | | |
| 173.1 174.1 175.1 176.1 177.1 178.1 | skipped: doors | | |
| QTY DESCRIPTION CATALOG NUMBER FINISH MFR | skipped: header | | |
| Hardware Group No. 07 CL | skipped: heading | | |
| 127.1 150.1 155.1 170.1 182.1 | skipped: doors | | |
| QTY DESCRIPTION CATALOG NUMBER FINISH MFR | skipped: header | | |
| FINISH HARDWARE 087100-7 | skipped: footer | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |
| CLOSER - AS REQUIRED REQUIRED | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |
| REQUIRED | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |
| REQUIRED | skipped: wrapped | | |
| TKTX SCREWS AT HM DOORS | skipped: wrapped | | |

## Christina HS Hardware Set 01 (24 rows as the text layer prints them)

9 of 23 item lines matched, 3 lines skipped by reason (heading, door list, column header, wrapped text, footer), 3200 ms.

| line | answer | confidence | citation |
|---|---|---|---|
| 2 CONTINUOUS HINGES 224HD (PREP'D FOR EPT) 689 IVE | IVES 224HD | medium catalogue_page | Ives Price Book 2024 p. 42 |
| 1 KEY REMOVEABLE MULLION KR4954 BLK VD | Von Duprin KR4954 | medium catalogue_page | Von Duprin 98-99 Series Catalog p. 53 |
| 1 MULLION CYLINDER MORTISE TYPE W/ CORE (KEYED TO EXISTING SYSTEM) 626S  | miss: no catalogue number on the line |  |  |
| 2 DOOR PULLS 1191-4 630 TRM | miss: Trimco is in the catalogue; 1191-4 is not |  |  |
| 1 DOOR CLOSER W/ STOPS 4041XP SPR CNS 4041XP-30 & 61 689 LCN | LCN Closers 4041 | medium base_model | LCN Price Book p. 31-32 |
| 2 ELECTRIC POWER TRANSFERS EPT-10 BY SECURITY VENDOR 630 VD | Von Duprin EPT10 | high exact | Von Duprin 22 Series Catalog p. 25 |
| 1 ELECTRIFIED PANIC DEVICE RX-QEL98L-NL-03 LD BY SECURITY VENDOR 630 VD | Von Duprin 98 | medium series | Von Duprin Price Book p. 26-36 |
| 1 POWER SUPPLY BY SECURITY VENDOR | miss: nothing catalogued is named 1 POWER SUPPLY BY SECURITY VENDOR |  |  |
| 1 TRIM CYLINDER & CORE AS REQUIRED (KEYED TO EXISTING SYSTEM) 626 SCH | miss: no catalogue number on the line |  |  |
| 2 DOOR PULLS 1191-4 630 TRM | miss: Trimco is in the catalogue; 1191-4 is not |  |  |
| 1 DOOR CLOSER W/ STOPS 4041XP SPR CNS 4041XP-30 & 61 689 LCN | LCN Closers 4041 | medium base_model | LCN Price Book p. 31-32 |
| 1 ELECTRIFIED PANIC DEVICE RX-QEL98L-BE-03 LD BY SECURITY VENDOR 630 VD | Von Duprin 98 | medium series | Von Duprin Price Book p. 26-36 |
| 1 THRESHOLD 896ADJ SIA SSMS/EA AL NGP | National Guard Products 896 | medium base_model | NGP Price Book p. 21 |
| 2 DOOR SWEEPS 101V AL NGP | National Guard Products 101V | high exact | NGP Price Book p. 10-14 |
| 1 AUTO DOOR OPERATOR DORMA 100 SERIES BY SECURITY VENDOR AL DOR | miss: dormakaba is not in the catalogue |  |  |
| 1 RELAY MODULE ALTRONTICS RB1224 BY SECURITY VENDOR | miss: nothing catalogued is named RB1224 BY SECURITY VENDOR |  |  |
| 1 H/C PUSH SWITCH 946HP45MO x 946475WR (EXTERIOR) BY SECURITY VENDOR US3 | miss: RCI (Rutherford Controls) is not in the catalogue |  |  |
| 1 H/C PUSH SWITCH 946HP45MO (INTERIOR) BY SECURITY VENDOR US32D RCI | miss: RCI (Rutherford Controls) is not in the catalogue |  |  |
| 1 BALLARD POST (FOR H/C SWITCH) BY SECURITY VENDOR | miss: nothing catalogued is named 1 BALLARD POST (FOR H/C SWITCH) BY SEC |  |  |
| 1 KEY SWITCH 960MA BY SECURITY VENDOR 630 RCI | miss: RCI (Rutherford Controls) is not in the catalogue |  |  |
| 1 KEY SWITCH CYLINDER MORTISE TYPE W/ CORE (KEYED TO EXISTING SYSTEM) 62 | miss: no catalogue number on the line |  |  |
| 2 DOOR POSITION SWITCHES GRI 180-12-W-34" STL DR CONTACT WHITE BY SECURI | miss: GRI (George Risk Industries) is not in the catalogue |  |  |
| 1 VIDEO/INTERCOM STATION & CONSOLE w/ BY SECURITY VENDOR | miss: nothing catalogued is named VIDEO/INTERCOM STATION & CONSOLE w/ BY |  |  |
| Hardware Set: 01-CARD READER EXTERIOR BULLET RESTANT ALD & ALF | skipped: heading | | |
| Door# 100B | skipped: heading | | |
| Qty Description Product Number Fin Man | skipped: header | | |

## Makers the catalogue lacks for these documents

Not in the catalogue at all: Select Hinges (SEL), dormakaba (DOR), RCI / Rutherford Controls (RCI), GRI / George Risk (GRI), Altronix. In the catalogue but without the model named: Trimco 1191-4 (Trimco holds 1 product), Glynn-Johnson 90S, Zero 188SBK, Schlage cylinders specified without a catalogue number. Ives 8200 and Glynn-Johnson 90S have no product row but are named in the maker's own price-book text (Ives Price Book 2024 p.82; Glynn-Johnson Price Book 2025 p.20): the matcher answers with that page, medium, and the packet can embed it only once that book's PDF is the edition its index was made from.
