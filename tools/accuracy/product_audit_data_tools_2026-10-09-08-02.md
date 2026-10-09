# The data tools on sale, against their pricing-card claims, 2026-10-09-08-02

Live API https://weylandai.com, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).

| tool | input | result | numbers |
|---|---|---|---|
| HuntX | whole index (1387 notices), fit=doors, state=TX, due_within=30, min_value=1M, a saved search | PASS | 1387 notices from 7 sources; 11 door / 164 building / 514 signal / 698 civil; links 5/5 200; 0 of 1387 notices link to a dead page (none); 140 of 1387 link to the notice itself (txdot, il_cdb, ca_opsc, nyc_sca link to one agency page); sample email not sent (not a jmobleyworks+ address) |
| CompX | all awards; fit=doors; vendors Atlantic Rolling Steel Door Corp., FREDANTE CONSTR CORP, B.J. Laura & Sons Inc.; CSV of the default (building) search | PASS | 2809 awards ($42,610,619,643), 59 door awards; vendors 3/3 equal NYC open data; CSV 2000 of 2328 rows |
| CompX TxDOT vendor route (off-card) | q=Austin Bridge -> AUSTIN BRIDGE & ROAD SERVICES, LP | FAIL | AUSTIN BRIDGE & ROAD SERVICES, LP: CompX 7 bids / 5 wins ($33,499,043); TxDOT 76 projects / 12 wins ($75,514,048); 31 other vendors in the reply |

## HuntX: PASS

Claim: "Seven public sources, sorted by what a door sub can bid. Opportunity Discovery. Public construction notices from seven sources (Illinois CDB, NYC City Record and School Construction Authority, Los Angeles, Delaware, Texas DOT, California school funding), each tagged by trade fit: door scope named, building work, funding to watch, or civil. Filter by state, due date and value; saved searches count new notices since you last looked and send them to your feed reader (RSS) and your calendar (bid due dates)."

Bar: All seven named sources hold notices; every notice carries a trade fit and a link on its source's own site, and no link is dead (every distinct link fetched; a bot challenge is reported, not counted as dead); fit=doors returns only door-scope notices, each with the words that put it there, and its total equals the index's door count; state, due-date and value filters return only matching rows; 5 source links (5 different sources) answer HTTP 200; a saved search returns a new-notice count and working RSS and calendar feeds. The sample email is sent only if the account's address is jmobleyworks+<tag>@gmail.com.

- ok index answers: HTTP 200
- ok seven named sources each hold notices: {"txdot":673,"nyc_sca":356,"ca_opsc":166,"nyc_cityrecord":93,"il_cdb":52,"de_mmp":25,"la_ramp":22}
- ok full index read equals indexed count: 1387 rows read, indexed 1387
- ok every notice tagged with a trade fit: 0 untagged
- ok every notice links to its source's own site: all 1387
- ok fit=doors returns only door-scope notices: 11 rows
- ok fit=doors total equals the index's door count: total 11, fits.doors 11
- ok each door notice says why (trade_fit_why): 0 without a reason
- ok state=TX returns only TX: 673 rows
- ok due_within=30 returns only notices due in the next 30 days: 217 rows, 0 outside
- ok min_value=1000000 returns only notices worth $1M+: 889 rows, 0 under
- ok 5 source links answer 200: ["nyc_cityrecord 200","il_cdb 200","nyc_sca 200","la_ramp 200","de_mmp 200"]
- ok no notice links to a dead page (every distinct link fetched): 144 distinct links; 0 of 1387 notices link to a dead page
- ok saved search created: HTTP 200
- ok saved search reports a new-notice count: new_count 0
- ok RSS feed works: 200, 50 items
- ok calendar feed works (bid due dates): 200, 157 events

## CompX: PASS

Claim: "Real Who wins public door and building work. Public contract awards for door, hardware and building work (NYC City Record, since 2021): who won, how much, from which agency and by what method, with vendors and agencies ranked by what they won. CSV export."

Bar: Every award row names vendor, amount, agency, method and an award date on or after 2021-01-01; vendors and agencies come ranked by total won; door-fit awards exist; for 3 real door vendors CompX's award count and total equal NYC open data's own (same award notices, one per request id); the CSV the page's button asks for (limit 2000) holds every award of the search up to that cap (a cut is reported).

- ok awards answer, paid: HTTP 200 paid true
- ok each award: vendor, amount, agency, method, date >= 2021: 0 of 2000 incomplete
- ok all rows returned to a paying account: 2000 rows of 2809
- ok vendors ranked by total won: 50 vendors
- ok agencies ranked by total won: 30 agencies
- ok door-fit awards present: 59 door awards, $69,281,833
- ok 3 door vendors: award count and total equal NYC open data: ["Atlantic Rolling Steel Door Corp.: 9 / $6,832,825 vs 9 / $6,832,825","FREDANTE CONSTR CORP: 3 / $7,004,457 vs 3 / $7,004,457","B.J. Laura & Sons Inc.: 5 / $3,817,650 vs 5 / $3,817,650"]
- ok CSV export holds the search's awards (up to the page's 2,000 cap): HTTP 200, 2000 rows; the search has 2328

## CompX TxDOT vendor route (off-card): FAIL

Claim: "(Not on the pricing card any more; the CompX page no longer calls it.) /api/compx/vendors: TxDOT bid tabulations by vendor: total bids, wins, win rate, total won value."

Bar: For a real TxDOT contractor, total_bids equals the distinct projects (CSJ) that vendor bid in data.texas.gov's bid tabulations and wins equals the projects where it was low bidder: one count per project, not per bid item.

- ok route answers: HTTP 200
- ok the vendor is in the result: 32 vendors returned
- **FAIL** total bids = distinct projects in TxDOT data: CompX 7, TxDOT 76 projects (8418 bid-item rows)
- **FAIL** wins = projects where low bidder: CompX 5, TxDOT 12
- **FAIL** total won value equals TxDOT's: CompX $33,499,043, TxDOT $75,514,048
