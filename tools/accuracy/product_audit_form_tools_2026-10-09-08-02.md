# The form tools on sale, on real project input, 2026-10-09-08-02

Live API https://weylandai.com, as a paying test account. Each tool's output was produced through the site's API, its PDF read back with pdftotext -layout, and checked against the pricing card's claim and the job's real facts (tools/accuracy/product_audit_form_tools.mjs). PASS = every check holds.

Setup: Berryessa read by SubX: {"status":200,"doors":24,"groups":2,"items":16,"failed":[]}; PropX proposal: {"id":"6a2092d0-5fee-4c3b-8592-700dc4165528","quote":1,"client":"QA GC","address":"1855 Lucretia Ave, San Jose, CA 95122","doors":24,"subtotal":10759.2,"tax":995.23,"total":11754.43,"pdf_http":200,"pdf_has_total":true}. Sessions cleaned up: 328d760c: deleted

| tool | input | result | numbers |
|---|---|---|---|
| CloseX | Berryessa SubX session; warranties from 08 71 00 1.07 | PASS | 24/24 openings, 24 keyed, 5/5 warranties, 8 catalogue pages for 10 products; pairs 22/22 |

## CloseX: PASS

Card: "The Section 08 71 00 closeout from your SubX job: hardware schedule as installed, keying schedule, warranty table per manufacturer, attic stock, checklist with sign-off, and the catalogue page of every installed product."

| check | ok | detail |
|---|---|---|
| PDF returned | yes | HTTP 200 |
| hardware schedule as installed: every opening with rating and set | yes | 24 of 24 |
| every scheduled item (catalogue number) in the as-installed schedule | yes | 11 catalogue numbers |
| opening sizes are the schedule's (pairs shown as pairs) | yes | 22 of 22 pairs shown as PR; e.g. Opening 001 · PR 3'-6" x 7'-10" · 120 rated · set 2 QTY ITEM MAN |
| keying schedule lists every keyed opening (all 24 have rim cylinders) | yes | 24 of 24 |
| warranty table per manufacturer (terms from the spec) | yes | LCN, Von Duprin, Ives, Schlage, Zero International |
| attic stock and checklist with sign-off | yes |  |
| the catalogue page of every installed product | yes | 8 pages cited for 10 products, 8 appended; products with no page: none |
| project and owner on the cover | yes |  |
| no placeholder text | yes |  |

- No room names (ADMIN LOBBY HALL, A-POD / CORRIDOR, ...) appear: SubX's door rows carry no location for Berryessa.

