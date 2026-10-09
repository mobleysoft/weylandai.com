# The form tools on sale, on real project input, 2026-10-09-07-38

Live API https://weylandai.com, as a paying test account. Each tool's output was produced through the site's API, its PDF read back with pdftotext -layout, and checked against the pricing card's claim and the job's real facts (tools/accuracy/product_audit_form_tools.mjs). PASS = every check holds.

Setup: Berryessa read by SubX: {"status":200,"doors":24,"groups":2,"items":16,"failed":[]}; PropX proposal: {"id":"6a2092d0-5fee-4c3b-8592-700dc4165528","quote":1,"client":"QA GC","address":"1855 Lucretia Ave, San Jose, CA 95122","doors":24,"subtotal":10759.2,"tax":995.23,"total":11754.43,"pdf_http":200,"pdf_has_total":true}; Rockford: {"status":200,"doors":65,"groups":14,"items":110,"failed":[]}. Sessions cleaned up: 0e82a193: deleted, e18a8de2: deleted

| tool | input | result | numbers |
|---|---|---|---|
| LienX | CA conditional progress waiver, Berryessa job (owner from the bid set; customer, job location and amount from the PropX proposal); Ohio for the general form | PASS | CA § 8132: 25 of 25 statute lines in order; amount $11,754.43; 10 statutory states; 0 refused |
| BidX | HuntX notice "Replace Windows & Doors, Roofing System & Upgrade Site Drainage — Galesburg Readiness Center" (Illinois Capital Development Board) + PropX quote 1 (Berryessa, $11,754.43) | FAIL | base bid $11,754.43 in words and figures; SOV 5 lines = $10,759.20; bond $1,175.44; notice 546-140-011 |
| CoA | Berryessa SubX session (24 openings, all 120 min rated, sets 1 and 2) | PASS | 24 of 24 rated openings have a record; 0 closer/latch flags (0 expected); pairs shown 22/22 |
| CloseX | Berryessa SubX session; warranties from 08 71 00 1.07 | FAIL | 24/24 openings, 24 keyed, 5/5 warranties, 8 catalogue pages for 10 products; pairs 22/22 |
| RFaX | Berryessa SubX session | PASS | issues: no_manufacturer; RFIs 1, 2; 24 openings, 3 schedule pages attached; answered tracked |
| ChangeOrdX | PropX quote 1 (Berryessa, $11,754.43): CO A adds one hardware set 2, approved; CO B deletes one set 1 | PASS | CO 8 $1,017.59 (approved), CO 9 $-456.34; contract $11,754.43 -> $12,772.02 -> $12,315.68; both set to rejected afterwards |
| PermitX | Berryessa SubX session (no electrified hardware) and Rockford SubX session (sets 32 EXD, 40 UTY, 44 UTY-IT electrified) | PASS | Berryessa scope "24 openings (24 fire-rated), 464 items in 2 sets", 0 electrified; Rockford 6 listed vs 6 electrified (missed 0, extra 0); catalogue pages 4 |
| SafetyX | NIOSH FACE Report 2000-16 (Alabama, 16-year-old framer fell 27 ft and was struck by a truss; died), 20 pages, text layer | PASS | 54 lines over 20 pages; falls on pages 1, 10, 2, 3, 4, 7, 8, 9; struck-by 3; death hint 12; action + case + 300/300A |
| MeetingX | Room pamv0nn2do: the Berryessa coordination meeting, 8 record items | PASS | 8/8 record items read back intact; TURN relay on |
| NotesX | Room pamv0nn2do (the MeetingX record above) | PASS | attendees WeylandAI QA (Claude cloud); 2 decisions, 2 actions (1 done), 2 chat, transcript appendix |

## LienX: PASS

Card: "Fills the state's own statutory lien waiver form word for word (Arizona, California, Florida, Georgia, Michigan, Mississippi, Nevada, Texas, Utah and Wyoming today, checked against the statute's text) from the job's owner, customer, amount and dates. States whose statutory forms LienX does not carry yet are refused rather than given a generic waiver; other states get a general form, labelled as one."

| check | ok | detail |
|---|---|---|
| PDF returned | yes | HTTP 200 |
| every line of the Civ. Code § 8132 form, word for word and in order | yes | 25 lines |
| job facts filled (owner, customer, location, amount, dates) | yes | QA Door Hardware Co (WeylandAI test account) / QA GC / 1855 Lucretia Ave, San Jose, CA 95122 / Berryessa Union School District / September 30, 2026 / QA GC / $11,754.43 / QA Door Hardware Co (WeylandAI test account) / October 9, 2026 |
| no placeholder text | yes |  |
| the ten states the card names are the statutory states carried | yes | AZ,CA,FL,GA,MI,MS,NV,TX,UT,WY |
| Ohio (no statutory form) gets a PDF | yes | HTTP 200 |
| Ohio's waiver is labelled a general form | yes | label found: true |

- The refused list is empty, so no state is refused today; the card's refusal branch cannot be exercised.

## BidX: FAIL

Card: "Builds the bid form for a public bid from a HuntX notice and your PropX proposal: base bid in words and figures, schedule of values, alternates, unit prices, addenda acknowledged, bid bond, qualifications, and a bidder checklist."

| check | ok | detail |
|---|---|---|
| preview joins the notice and the proposal | yes | HTTP 200 PropX quote 1 |
| PDF returned | yes | HTTP 200 |
| HuntX notice facts on the bid form (agency, solicitation, location, due, notice link) | NO | missing: due=2026-12-15T00:00:00.000 |
| base bid in words and figures = the PropX total | yes | Eleven thousand seven hundred fifty-four and 43/100 dollars ($11,754.43) |
| schedule of values = the proposal's lines (qty, unit, amount) and sums to its subtotal | yes | 5 lines, sum $10,759.20 vs subtotal $10,759.20 |
| alternate and unit prices printed | yes | Deduct hardware set 1 at Majestic Way openings 002 and 003 $731.60 |
| addenda section present (none listed) | yes |  |
| bid bond 10% (Berryessa 00 21 13) of the base bid | yes | $1,175.44 |
| qualifications/exclusions printed | yes |  |
| bidder checklist printed | yes |  |
| no placeholder text | yes |  |

- HuntX holds no Berryessa notice (searched 'Berryessa', 'door replacement', state CA + fit doors), so the notice and the proposal are different jobs; the check is that each one's facts reach the form.

## CoA: PASS

Card: "The certificate of occupancy request package with an acceptance inspection record for every fire-rated opening in your SubX schedule: rating, hardware, a flag when the set has no closer or latch, and the checks NFPA 80 calls for, with pass/fail and sign-off."

| check | ok | detail |
|---|---|---|
| PDF returned | yes | HTTP 200 |
| one record per fire-rated opening, with its rating and set | yes | 24 records |
| closer / latch flags right (both sets have LCN 4040XP and a Von Duprin exit device: no flags) | yes | 0 flags |
| hardware of the set listed on the record | yes |  |
| NFPA 80 checks with PASS / FAIL / NA and sign-off per opening | yes | 24 sign-off lines |
| openings' sizes are the schedule's (pairs shown as pairs) | yes | 22 of 22 pairs (PR) shown as pairs; e.g. Opening 001 · rating 120 · PR 3'-6" x 7'-10" · set 2 Self-closing in the s |
| project and owner on the cover | yes |  |
| no placeholder text | yes |  |

## CloseX: FAIL

Card: "The Section 08 71 00 closeout from your SubX job: hardware schedule as installed, keying schedule, warranty table per manufacturer, attic stock, checklist with sign-off, and the catalogue page of every installed product."

| check | ok | detail |
|---|---|---|
| PDF returned | yes | HTTP 200 |
| hardware schedule as installed: every opening with rating and set | yes | 24 of 24 |
| every scheduled item (catalogue number) in the as-installed schedule | NO | PA-AX-9927-L-F-2SI-LBR-06-499F |
| opening sizes are the schedule's (pairs shown as pairs) | yes | 22 of 22 pairs shown as PR; e.g. Opening 001 · PR 3'-6" x 7'-10" · 120 rated · set 2 QTY ITEM MAN |
| keying schedule lists every keyed opening (all 24 have rim cylinders) | yes | 24 of 24 |
| warranty table per manufacturer (terms from the spec) | yes | LCN, Von Duprin, Ives, Schlage, Zero International |
| attic stock and checklist with sign-off | yes |  |
| the catalogue page of every installed product | yes | 8 pages cited for 10 products, 8 appended; products with no page: none |
| project and owner on the cover | yes |  |
| no placeholder text | yes |  |

- No room names (ADMIN LOBBY HALL, A-POD / CORRIDOR, ...) appear: SubX's door rows carry no location for Berryessa.

## RFaX: PASS

Card: "Reads your SubX schedule and finds what to ask: missing hardware sets, fire-rated openings without a closer or latch, missing sizes, unnamed manufacturers. Each becomes a numbered RFI with the affected openings and schedule pages attached, tracked until answered."

| check | ok | detail |
|---|---|---|
| issues found = the schedule's real gaps (only: core with no manufacturer, sets 1 and 2) | yes | ["Hardware items with no manufacturer named: The hardware schedule names no manufacturer for: INTERCHANGEABLE CORE VERIFY PERMANENT CORE WITH DISTRICT (sets 1, 2). Please confirm the manufacturer, or whether an equal is acceptable."] |
| RFIs numbered in turn | yes | 1, 2 |
| PDF returned | yes | HTTP 200 |
| RFI number, project, question on the RFI | yes |  |
| affected openings listed (mark, set, items, page) | yes | 24 of 24 |
| schedule pages attached | yes | 3 of 3 schedule pages (284, 286, 288) in the PDF |
| openings' sizes are the schedule's (pairs shown as pairs) | yes | 22 of 22 pairs shown as PR |
| no placeholder text | yes |  |
| tracked until answered (answered RFI shows its answer and date; the other stays open) | yes | [{"n":1,"status":"answered","answered_at":"2026-10-09T07:39:14.819Z"},{"n":2,"status":"open","days":0}] |

## ChangeOrdX: PASS

Card: "Prices change orders from your PropX contract's own unit prices plus labor, overhead, profit, tax and bond; numbers them per contract and carries the contract sum and time forward through the approved ones."

| check | ok | detail |
|---|---|---|
| the proposal's unit prices match its PropX PDF | yes | set 2 $455.80, set 1 $365.80 in the PropX PDF: true |
| CO A priced at the contract's unit price + labor, overhead, profit, tax, bond | yes | amount 1017.59 vs expected 1017.59; number 8 vs 8 |
| CO B (a deduct) priced and numbered next | yes | amount -456.34 vs expected -456.34; number 9 |
| PDFs returned | yes | HTTP 200, 200 |
| CO A PDF: contract line at contract unit price, tax at the contract's rate, total | yes | tax $42.16, total $1,017.59 |
| CO B PDF carries the sum and time forward through approved CO A | yes | prior $12,772.02 -> new $12,315.68, days 2 |
| project, customer and base contract on the CO | yes |  |
| no placeholder text | yes |  |

- Both test change orders are set to 'rejected' afterwards so the contract sum carried forward is unchanged; they stay on the contract (no delete in the API).

## PermitX: PASS

Card: "Writes the scope of work from your SubX schedule and lists every opening with electrified, access-control or operator hardware, the plan-review coordination (power, fire alarm release, free egress) and the electrified products' catalogue pages."

| check | ok | detail |
|---|---|---|
| Berryessa PDF returned | yes | HTTP 200 |
| Berryessa scope of work = the schedule's counts | yes | Furnish and install door hardware at 24 openings (24 fire-rated), 464 hardware items in 2 hardware sets per the door and hardware schedules. |
| Berryessa: no electrified openings listed (none in the schedule) | yes |  |
| plan-review coordination (power, fire alarm release, free egress) | yes |  |
| no placeholder text (Berryessa) | yes |  |
| Rockford: every electrified opening listed, and only those | yes | expected 6 (1J.1, 119.1, 119.2, 126.1.1, 136.1, 152.1.1); listed 6; missed: none; not electrified but listed: none |
| Rockford PDF returned | yes | HTTP 200 |
| the electrified products' catalogue pages | yes | 4 of 4 electrified products have a cited page; not cited: none; PDF's own "no page on file" line: absent |
| no placeholder text (Rockford) | yes |  |

## SafetyX: PASS

Card: "Reads your safety reports and daily logs (text or scanned) and lists every incident, injury and hazard with its page, sorted by OSHA hazard (falls, struck-by, caught-in, electrocution first) with the 29 CFR 1926 standard. Injuries get a 29 CFR 1904.7 recording hint. Your safety log keeps corrective actions with owners and due dates, and builds the OSHA 300 log and 300A summary from your cases. Reading and the log are free; the 300/300A forms and exports are paid."

| check | ok | detail |
|---|---|---|
| input is the FACE 2000-16 PDF | yes | sha256 66e38c02a9e2b8b2 (the copy audited on 2026-10-09: 66e38c02a9e2b8b2) |
| report read | yes | HTTP 200, 20 pages (20 text layer, 0 OCR), 54 lines |
| every flagged line has its page | yes |  |
| the 27 ft fall flagged as Falls with 29 CFR 1926.501 (pages 1 and 3) | yes | fall lines on pages 1, 10, 2, 3, 4, 7, 8, 9: p1 A Sixteen-Year-Old Male Died After Falling 27 Feet at a Residential / p1 crew member (the victim) died after falling |
| struck on the head by a truss flagged as Struck-by (page 3) | yes | p3 to which he fell was covered with building materials and scrap lumber. One or more of the trusses fell / p3 with or just behind the victim, and he was struck on the head by a truss upon impact with the ground. / p9 debris. An 8-foot wooden truss section fell with or after the victim’s fall, striking him on |
| the death gets the 1904.7 recording hint | yes | p1 A Sixteen-Year-Old Male Died After Falling 27 Feet at a Residential / p1 Fatality Assessment and Control Evaluation (FACE) Project |
| corrective action kept with owner, due date, hazard, closed | yes | {"owner":"Framing foreman","due":"2026-10-16","status":"closed","hazard":"Falls"} |
| 300A totals count the case (G deaths +1, M1 injuries +1) | yes | G 0 -> 1, M1 0 -> 1 |
| OSHA 300 CSV export carries the case | yes | HTTP 200 |
| OSHA 300 / 300A PDF returned | yes | HTTP 200 |
| 300 log row and 300A summary in the PDF | yes | G H I J = 1 0 0 0 |
| no placeholder text | yes |  |

- No real safety report exists for the Berryessa job; a published NIOSH incident report is the real input. It has a text layer, so the scanned (OCR) path is not exercised here.

## MeetingX: PASS

Card: "A project room with voice, video and screen share between browsers (up to 6 people). Chat, decisions, actions and transcript are saved with the room, so everyone, and anyone who opens it later, sees the same record. Some strict office networks block direct calls."

| check | ok | detail |
|---|---|---|
| room access for a MeetingX account | yes | HTTP 200 {"room":"pamv0nn2do","signedIn":true,"access":true,"name":"WeylandAI QA (Claude cloud)"} |
| ICE servers for the browser-to-browser call | yes | relay (TURN): true |
| chat, decisions, actions, transcript saved and read back in order with who, when and done state | yes | 8 of 8 back; first mismatch: null |

- Voice, video and screen share run browser to browser over WebRTC and are not exercised over HTTP; the check covers room access, ICE servers and the saved record.

## NotesX: PASS

Card: "Turns a MeetingX room's saved record into minutes: attendees, numbered decisions, action items open and done, discussion, and the transcript as an appendix."

| check | ok | detail |
|---|---|---|
| PDF returned | yes | HTTP 200 |
| attendees from the record | yes | WeylandAI QA (Claude cloud) |
| decisions numbered in order | yes | 2 decisions |
| action items with open / done state | yes | Action items # ACTION (AND OWNER) STATUS RECORDED BY 1 Send the core RFI to the architect (owner: hardware PM) Done WeylandAI QA (Claude cloud) 2 Confirm whether PR 3'-6" is per leaf at Majestic Way,  |
| discussion (room chat) | yes |  |
| transcript as an appendix | yes |  |
| meeting date is today's | yes |  |
| no placeholder text | yes |  |

