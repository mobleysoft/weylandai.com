# The five schedule tools on their audit documents, 2026-10-09-08-02

Live API https://weylandai.com, as a paying test account. Pass = the bar below, taken from each tool's pricing card. Script: tools/accuracy/product_audit_schedule_tools.mjs.

| tool | document | result | numbers |
|---|---|---|---|
| PropX | Berryessa Bid B-09-2023-24 (session read from A9.2 and 08 71 00) | FAIL | 4 lines (door 24, frame 0, hardware 24 openings), 2 priced; subtotal $231736.08, tax $21435.59, total $253171.67; PDF 64 KB, 2 pp, 4 s. FAIL: Hardware set 2 (6 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS, Zero International 188SBK PSA) is printed at $10114.84 an opening, which prices 6 of 9 components priced: 2 from the schedule, 4 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced; Hardware set 1 (4 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS, Zero International 188SBK PSA) is printed at $4604.8 an opening, which prices 4 of 7 components priced: 2 from the schedule, 2 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025) at your multipliers; the PDF does not say the rest are unpriced |

## PropX: FAIL

Card: "Requires SubX · turns a submittal into a priced, sendable proposal. Proposal Express. Builds a complete, priced proposal - client info, scope, terms, signature block - directly from a SubX submittal's real extracted door schedule."

Bar: from the Berryessa session: the lines come from its doors (door lines total 24 openings, hardware lines total the 24 openings that name a set), generate returns a stored proposal whose PDF downloads (%PDF) and prints every line and its total, line totals and subtotal/tax/grand total are arithmetically consistent, and the proposal is priced: a grand total above $0, and no rate printed as a set's price that covers only some of its items without saying so (lines left at $0 for the estimator are allowed; the workspace says they print at $0).

Why it fails:

- Hardware set 2 (6 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS, Zero International 188SBK PSA) is printed at $10114.84 an opening, which prices 6 of 9 components priced: 2 from the schedule, 4 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers; the PDF does not say the rest are unpriced; Hardware set 1 (4 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS, Zero International 188SBK PSA) is printed at $4604.8 an opening, which prices 4 of 7 components priced: 2 from the schedule, 2 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025) at your multipliers; the PDF does not say the rest are unpriced

| line | qty | unit price | price source |
|---|---|---|---|
| Door - type B | 22 | 0 | enter |
| Door - type A | 2 | 0 | enter |
| Hardware set 2 (6 of 9 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 1" LDW B-CS, Zero International 188SBK PSA) | 22 | 10114.84 | 6 of 9 components priced: 2 from the schedule, 4 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025, Zero International Price Book 2025 1.0) at your multipliers |
| Hardware set 1 (4 of 7 items priced; not in this price: VERIFY PERMANENT CORE WITH DISTRICT, Ives 8400 10" X 2" LDW B-CS, Zero International 188SBK PSA) | 2 | 4604.8 | 4 of 7 components priced: 2 from the schedule, 2 from the makers' price books (Von Duprin Price Book 2024 1.0, LCN Price Book 2025) at your multipliers |

Generate: {"http":200,"ms":3513,"stored":true,"proposalId":"7ea23946-4d06-4625-8209-82334dffa2af","quoteNumber":7,"doorCount":24,"lineItemCount":4,"subtotal":231736.08,"taxAmount":21435.59,"grandTotal":253171.67,"error":null}

PDF: {"http":200,"bytes":65948,"is_pdf":true,"pages":2,"prints_grand_total":true,"prints_client":true,"lines_printed":4,"partial_note_printed":false,"has_signature_block":true,"has_terms":true}

Sessions created and deleted: berryessa 677aa14e-6925-44a6-aa17-214700018770 deleted
