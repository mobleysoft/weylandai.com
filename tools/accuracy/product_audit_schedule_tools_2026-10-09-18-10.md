# The five schedule tools on their audit documents, 2026-10-09-18-10

Live API https://weylandai.com, as a paying test account. Pass = the bar below, taken from each tool's pricing card. Script: tools/accuracy/product_audit_schedule_tools.mjs.

| tool | document | result | numbers |
|---|---|---|---|
| PropX | Berryessa Bid B-09-2023-24 (session read from A9.2 and 08 71 00) | PASS | 4 lines (door 24, frame 0, hardware 24 openings), 2 priced; subtotal $233108.88, tax $21562.57, total $254671.45; PDF 64 KB, 2 pp, 4 s |

## PropX: PASS

Card: "Requires SubX · turns a submittal into a priced, sendable proposal. Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule."

Bar: from the Berryessa session: the lines come from its doors (door lines total 24 openings, hardware lines total the 24 openings that name a set), generate returns a stored proposal whose PDF downloads (%PDF) and prints every line and its total, line totals and subtotal/tax/grand total are arithmetically consistent, and the proposal is priced: a grand total above $0, and no rate printed as a set's price that covers only some of its items without saying so (lines left at $0 for the estimator are allowed; the workspace says they print at $0).

| line | qty | unit price | price source |
|---|---|---|---|
| Door - type B | 22 | 0 | enter |
| Door - type A | 2 | 0 | enter |
| Hardware set 2 (7 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS) | 22 | 10172.04 | 7 of 9 components priced: 2 from the schedule, 5 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers |
| Hardware set 1 (5 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS) | 2 | 4662 | 5 of 7 components priced: 2 from the schedule, 3 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers |

Generate: {"http":200,"ms":4237,"stored":true,"proposalId":"3ed5493b-bc9b-4002-aa48-08b272f380c2","quoteNumber":10,"doorCount":24,"lineItemCount":4,"subtotal":233108.88,"taxAmount":21562.57,"grandTotal":254671.45,"error":null}

PDF: {"http":200,"bytes":65987,"is_pdf":true,"pages":2,"prints_grand_total":true,"prints_client":true,"lines_printed":4,"partial_note_printed":true,"has_signature_block":true,"has_terms":true}

Sessions created and deleted: berryessa 8e8410a1-072a-4d8d-93be-0c50853154d2 deleted
