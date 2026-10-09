# The five schedule tools on their audit documents, 2026-10-09-07-51

Live API https://weylandai.com, as a paying test account. Pass = the bar below, taken from each tool's pricing card. Script: tools/accuracy/product_audit_schedule_tools.mjs.

| tool | document | result | numbers |
|---|---|---|---|
| PropX | Berryessa Bid B-09-2023-24 (session read from A9.2 and 08 71 00) | FAIL | 4 lines (door 24, frame 0, hardware 24 openings), 2 priced; subtotal $10759.2, tax $995.23, total $11754.43; PDF 64 KB, 2 pp, 2 s. FAIL: Hardware set 2 (2 of 9 items priced; not in this price: Von Duprin PA-AX-9927-EO-F-LBR-499F, Von Duprin PA-AX-9927-L-F-2SI-LBR-06-499F, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, +3 more) is printed at $455.8 an opening, which prices 2 of 9 components; the PDF does not say the rest are unpriced; Hardware set 1 (2 of 7 items priced; not in this price: Von Duprin PA-AX-99-L-F-2SI-06, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, Ives 8400 10" X 2" LDW B-CS, +1 more) is printed at $365.8 an opening, which prices 2 of 7 components; the PDF does not say the rest are unpriced |

## PropX: FAIL

Card: "Requires SubX · turns a submittal into a priced, sendable proposal. Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule."

Bar: from the Berryessa session: the lines come from its doors (door lines total 24 openings, hardware lines total the 24 openings that name a set), generate returns a stored proposal whose PDF downloads (%PDF) and prints every line and its total, line totals and subtotal/tax/grand total are arithmetically consistent, and the proposal is priced: a grand total above $0, and no rate printed as a set's price that covers only some of its items without saying so (lines left at $0 for the estimator are allowed; the workspace says they print at $0).

Why it fails:

- Hardware set 2 (2 of 9 items priced; not in this price: Von Duprin PA-AX-9927-EO-F-LBR-499F, Von Duprin PA-AX-9927-L-F-2SI-LBR-06-499F, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, +3 more) is printed at $455.8 an opening, which prices 2 of 9 components; the PDF does not say the rest are unpriced; Hardware set 1 (2 of 7 items priced; not in this price: Von Duprin PA-AX-99-L-F-2SI-06, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, Ives 8400 10" X 2" LDW B-CS, +1 more) is printed at $365.8 an opening, which prices 2 of 7 components; the PDF does not say the rest are unpriced

| line | qty | unit price | price source |
|---|---|---|---|
| Door - type B | 22 | 0 | enter |
| Door - type A | 2 | 0 | enter |
| Hardware set 2 (2 of 9 items priced; not in this price: Von Duprin PA-AX-9927-EO-F-LBR-499F, Von Duprin PA-AX-9927-L-F-2SI-LBR-06-499F, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, +3 more) | 22 | 455.8 | 2 of 9 components priced on the schedule |
| Hardware set 1 (2 of 7 items priced; not in this price: Von Duprin PA-AX-99-L-F-2SI-06, VERIFY PERMANENT CORE WITH DISTRICT, LCN 4040XP EDA, Ives 8400 10" X 2" LDW B-CS, +1 more) | 2 | 365.8 | 2 of 7 components priced on the schedule |

Generate: {"http":200,"ms":1678,"stored":true,"proposalId":"a61b56e9-7839-4194-b277-85f7472b00a9","quoteNumber":6,"doorCount":24,"lineItemCount":4,"subtotal":10759.2,"taxAmount":995.23,"grandTotal":11754.43,"error":null}

PDF: {"http":200,"bytes":65974,"is_pdf":true,"pages":2,"prints_grand_total":true,"prints_client":true,"lines_printed":4,"partial_note_printed":false,"has_signature_block":true,"has_terms":true}

Sessions created and deleted: berryessa 9a6fa7b3-e445-4b8d-b439-c856c09c1a56 deleted
