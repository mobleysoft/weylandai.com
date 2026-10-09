# The form tools on sale, on real project input, 2026-10-09-07-51

Live API https://weylandai.com, as a paying test account. Each tool's output was produced through the site's API, its PDF read back with pdftotext -layout, and checked against the pricing card's claim and the job's real facts (tools/accuracy/product_audit_form_tools.mjs). PASS = every check holds.

Setup: Berryessa read by SubX: {"status":200,"doors":24,"groups":2,"items":16,"failed":[]}; PropX proposal: {"id":"6a2092d0-5fee-4c3b-8592-700dc4165528","quote":1,"client":"QA GC","address":"1855 Lucretia Ave, San Jose, CA 95122","doors":24,"subtotal":10759.2,"tax":995.23,"total":11754.43,"pdf_http":200,"pdf_has_total":true}. Sessions cleaned up: 94b34f60: deleted

| tool | input | result | numbers |
|---|---|---|---|
| BidX | HuntX notice "Replace Windows & Doors, Roofing System & Upgrade Site Drainage — Galesburg Readiness Center" (Illinois Capital Development Board) + PropX quote 1 (Berryessa, $11,754.43) | PASS | base bid $11,754.43 in words and figures; SOV 5 lines = $10,759.20; bond $1,175.44; notice 546-140-011 |
| CloseX | Berryessa SubX session; warranties from 08 71 00 1.07 | FAIL | 24/24 openings, 24 keyed, 5/5 warranties, 8 catalogue pages for 10 products; pairs 22/22 |

## BidX: PASS

Card: "Builds the bid form for a public bid from a HuntX notice and your PropX proposal: base bid in words and figures, schedule of values, alternates, unit prices, addenda acknowledged, bid bond, qualifications, and a bidder checklist."

| check | ok | detail |
|---|---|---|
| preview joins the notice and the proposal | yes | HTTP 200 PropX quote 1 |
| PDF returned | yes | HTTP 200 |
| HuntX notice facts on the bid form (agency, solicitation, location, due, notice link) | yes | Illinois Capital Development Board / Replace Windows & Doors, Roofing System & Upgrade Site Drainage — Galesburg Readiness Center / Knox County, IL / 2026-12-15T00:00:00.000 / https://cdb.illinois.gov/procurement.html / 546-140-011 |
| base bid in words and figures = the PropX total | yes | Eleven thousand seven hundred fifty-four and 43/100 dollars ($11,754.43) |
| schedule of values = the proposal's lines (qty, unit, amount) and sums to its subtotal | yes | 5 lines, sum $10,759.20 vs subtotal $10,759.20 |
| alternate and unit prices printed | yes | Deduct hardware set 1 at Majestic Way openings 002 and 003 $731.60 |
| addenda section present (none listed) | yes |  |
| bid bond 10% (Berryessa 00 21 13) of the base bid | yes | $1,175.44 |
| qualifications/exclusions printed | yes |  |
| bidder checklist printed | yes |  |
| no placeholder text | yes |  |

- HuntX holds no Berryessa notice (searched 'Berryessa', 'door replacement', state CA + fit doors), so the notice and the proposal are different jobs; the check is that each one's facts reach the form.

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

