# The five schedule tools on their audit documents, 2026-10-09-08-06

Live API https://weylandai.com, as a paying test account. Pass = the bar below, taken from each tool's pricing card. Script: tools/accuracy/product_audit_schedule_tools.mjs.

| tool | document | result | numbers |
|---|---|---|---|
| SubX | Rockford Bid 26-27 Addendum One (A2.2 p.29; 08 71 00 pp.17-23) | PASS | pages found: door yes, groups 7/7; doors 65/65 (65 with page+row); groups 14/14; packet 68 pp, 36 of 37 items cited, 1 stated misses, 51 s |
| CutSheetX | Rockford 08 71 00 items (10 real, 2 not in catalogue) | PASS | 10 of 10 items matched to the right maker with an opening citation; 2 of 2 unknown items stated as misses; paste agrees on 12 of 12 |
| TakeoffX | Rockford A2.2 (65 doors) and Berryessa A9.2 x3 (24 doors) | PASS | rockford 65/65 doors, 4 of 4 breakdowns exact, 65 traced to row, 4.3 s/page; berryessa 24/24 doors, 4 of 4 breakdowns exact, 24 traced to row, 1.1 s/page |
| PropX | Berryessa Bid B-09-2023-24 (session read from A9.2 and 08 71 00) | FAIL | 4 lines (door 24, frame 0, hardware 24 openings), 2 priced; subtotal $233108.88, tax $21562.57, total $254671.45; PDF 64 KB, 2 pp, 5 s. FAIL: Hardware set 2 (7 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS) is printed at $10172.04 an opening, which prices 7 of 9 components priced: 2 from the schedule, 5 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced; Hardware set 1 (5 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS) is printed at $4662 an opening, which prices 5 of 7 components priced: 2 from the schedule, 3 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced |
| SightX | Berryessa Bid B-09-2023-24 (session, 24 doors on 3 sheets) | PASS | 24/24 doors (same marks), 24 at 42x94, 24 rated 120, 24 with hardware drawn; shared link opens with 24 doors |

## SubX: PASS

Card: "Submittal Express. Reads a ruled door or hardware schedule table on the page you name, lists the doors and hardware sets with the page and row each came from, and builds the submittal PDF, attaching the cited document for items our catalogue covers. Full-size CAD sheets and spec-section hardware groups do not read yet."

Bar: find-pages names the schedule page (A2.2, p.29) and the 08 71 00 group pages (pp.17-23); every page reads; the doors read equal the 65 hand-read marks and each carries its page and row; the 14 hardware groups are read; the packet PDF is built and every item is either cited with a catalogue page or listed as a miss that says why and what is needed.

Checks: {"find_pages":{"door_page_found":true,"hardware_pages_found":"7 of 7","door_schedule_pages":[29],"hardware_pages":[17,18,19,20,21,22,23],"status":200},"read":{"door_pages_ms":4257,"group_pages_ms":17504,"failed":[]},"doors":{"read":65,"schedule":65,"missing":[],"extra":[],"with_page_and_row":65},"groups":{"read":14,"schedule":14,"set_numbers":["01 RR","02 RR-M","06 CL","07 CL","19 STO","19F STO","20 STO","23 STO","28 COR","32 EXD","40 UTY","44 UTY-IT","47 VES","51 UTY-CUS"]},"packet":{"ms":50940,"total_pages":68,"components":37,"cited":36,"missed":1,"misses_without_why_or_need":0,"misses":["Glynn-Johnson 90S - Glynn-Johnson is in the catalogue; 90S is not"],"pdf":{"status":200,"bytes":6096493,"is_pdf":true,"pages":68}}}

## CutSheetX: PASS

Card: "Paste product lines as maker and model; CutsheetX matches what our catalogue covers (Allegion's brands plus NGP, BEA, Camden and Dyke) and cites the price-book or catalogue page for each match. Lines pasted as a spec prints them do not parse yet."

Bar: each real Rockford item (as maker + model) matches a product of that maker and cites a page or sheet whose document is that maker's and opens (HTTP 200); the same items pasted as lines give the same answers; an item the catalogue does not hold comes back unmatched with a stated reason.

| item | matched | product | cited | opens | result |
|---|---|---|---|---|---|
| LCN 4040XP | true | LCN Closers 4040XP | catalogue_page: LCN 4000 Series Surface Mounted Closers Catalog p.41 | 200 | PASS |
| Von Duprin 99 | true | Von Duprin 99 | price_book: Von Duprin Price Book p.26 | 200 | PASS |
| Ives 8400 | true | IVES 8400 | catalogue_page: Ives Architectural Hardware Products Catalog p.131 | 200 | PASS |
| Schlage ND40 | true | Schlage ND40 | cut_sheet: Schlage ND Series Catalog 106501 p.16 | 200 | PASS |
| Select SL11 | true | Select Hinges SL11 | cut_sheet: Select Hinges SL11 spec sheet p.1 | 200 | PASS |
| Zero 188SBK | true | Zero International 188S-B | price_book: Zero Price Book p.44 | 200 | PASS |
| Ives WS406/407CCV | true | IVES WS406/407CCV | catalogue_page: Ives Architectural Hardware Products Catalog p.203 | 200 | PASS |
| Schlage ALX53 | true | Schlage ALX53 | cut_sheet: Schlage ALX Series sell sheet 113320 p.4 | 200 | PASS |
| Glynn-Johnson 100S | true | Glynn-Johnson 100 | price_book: Glynn-Johnson Price Book p.23 | 200 | PASS |
| Von Duprin EPT10 | true | Von Duprin EPT10 | catalogue_page: Von Duprin 22 Series Catalog p.25 | 200 | PASS |
| Acme Doorworks ZX-4471 (a maker the catalogue does not hold) | false |  | no maker named Acme Doorworks is known, and no product is named Acme Doorworks ZX-4471 | | PASS (stated miss) |
| LCN 9977QZ (a known maker, a model it does not make) | false |  | LCN Closers is in the catalogue; 9977QZ is not | | PASS (stated miss) |

Paste of the same 12 lines: HTTP 200, 12 lines read, 0 disagree with the single match.

## TakeoffX: PASS

Card: "Takeoff Express. Counts doors by type, size, fire rating and hardware group from your door schedule page, 18 to 40 seconds a page, with every count traced to its row. It reads schedules, not drawings."

Bar: for each session the takeoff's door count and its counts by door type, size, fire rating and hardware group equal the tallies of the hand-read schedule, and every door row carries its page and table row; door pages read within the card's 40 s a page.

- Rockford Bid 26-27 Addendum One: 65 doors (schedule 65), 65 traced to page and row, door pages 4.3 s a page [p29 65 doors via text_layer]
  - by door type: exact
  - by size: exact
  - by fire rating: exact
  - by hardware group: exact
- Berryessa Bid B-09-2023-24: 24 doors (schedule 24), 24 traced to page and row, door pages 1.1 s a page [p284 9 doors via text_layer] [p286 7 doors via text_layer] [p288 8 doors via text_layer]
  - by door type: exact
  - by size: exact
  - by fire rating: exact
  - by hardware group: exact

## PropX: FAIL

Card: "Requires SubX · turns a submittal into a priced, sendable proposal. Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule."

Bar: from the Berryessa session: the lines come from its doors (door lines total 24 openings, hardware lines total the 24 openings that name a set), generate returns a stored proposal whose PDF downloads (%PDF) and prints every line and its total, line totals and subtotal/tax/grand total are arithmetically consistent, and the proposal is priced: a grand total above $0, and no rate printed as a set's price that covers only some of its items without saying so (lines left at $0 for the estimator are allowed; the workspace says they print at $0).

Why it fails:

- Hardware set 2 (7 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS) is printed at $10172.04 an opening, which prices 7 of 9 components priced: 2 from the schedule, 5 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced; Hardware set 1 (5 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS) is printed at $4662 an opening, which prices 5 of 7 components priced: 2 from the schedule, 3 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced

| line | qty | unit price | price source |
|---|---|---|---|
| Door - type B | 22 | 0 | enter |
| Door - type A | 2 | 0 | enter |
| Hardware set 2 (7 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS) | 22 | 10172.04 | 7 of 9 components priced: 2 from the schedule, 5 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers |
| Hardware set 1 (5 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS) | 2 | 4662 | 5 of 7 components priced: 2 from the schedule, 3 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers |

Generate: {"http":200,"ms":4824,"stored":true,"proposalId":"566e7fde-d643-4284-9e9a-78dc970ec3cb","quoteNumber":8,"doorCount":24,"lineItemCount":4,"subtotal":233108.88,"taxAmount":21562.57,"grandTotal":254671.45,"error":null}

PDF: {"http":200,"bytes":65986,"is_pdf":true,"pages":2,"prints_grand_total":true,"prints_client":true,"lines_printed":4,"partial_note_printed":false,"has_signature_block":true,"has_terms":true}

## SightX: PASS

Card: "Spatial Project Intelligence. Builds a 3D corridor from your door schedule (a SubX session or a pasted schedule): each door at its scheduled size, material and fire rating, its hardware set drawn where it mounts, a door-by-door tour, and a link your GC can walk without an account. Doors stand in schedule order, not on your floor plan."

Bar: the corridor model built from the Berryessa session has 24 doors (the schedule's count, same marks), each at its scheduled size (42 x 94 in) and fire rating (120), each door's hardware set present in the model with items to draw, and the corridor saves to a link that opens without an account.

Model: {"http":200,"ms":68,"doors":24,"schedule_doors":24,"same_marks":true,"sized_42x94":24,"rated_120":24,"sets_in_model":["1","2"],"door_sets":["2","1"],"doors_with_hardware_drawn":24,"notes":[]}

Link: {"save_http":200,"url":"/sightx/?m=3LscYFhSeWM2","open_without_account_http":200,"doors_in_link":24,"cleanup":"deleted"}

Sessions created and deleted: rockford 1f5b10cf-0702-4787-9c6b-43eb5b972738 deleted; berryessa d5d2a990-ad36-4933-9afb-ec7606c5eef2 deleted
