# The data tools on sale, against their pricing-card claims, 2026-10-09-08-30

Live API https://weylandai.com, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).

| tool | input | result | numbers |
|---|---|---|---|
| HuntX | whole index (1387 notices), fit=doors, state=TX, due_within=30, min_value=1M, a saved search | PASS | 1387 notices from 7 sources; 11 door / 164 building / 514 signal / 698 civil; links 5/5 200; 0 of 1387 notices link to a dead page (none); 140 of 1387 link to the notice itself (txdot, il_cdb, ca_opsc, nyc_sca link to one agency page); sample email not sent (not a jmobleyworks+ address) |
| ForecastX | proposal 1 (QA GC, $11,754), start 2026-11-01, 4 months, retainage 5%, terms 45 d, material 55% on 30 d | PASS | 7 months, contract $11,754, lowest 2026-12 $-6,465; independent recompute equal to the cent; approved CO $1,290 added (CO $1,290, status restored to submitted) |
| WireX | the paying account's wire, the briefing, the reports; each of the 7 listed feeds read directly | PASS | 99 headlines: Engineering News-Record 20, Construction Dive 10, For Construction Pros 10, Building Enclosure 20, SDM Magazine 20, Security Sales & Integration 19; ENR 20; 1 of 7 listed feeds empty on the wire though each publishes 0 items; links 200/200/challenge/200/200 |

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

## ForecastX: PASS

Claim: "Cash flow across your contracts, change orders included. Monthly cash flow across your PropX contracts with approved change orders counted: billing, retainage held and released, payments after each job's terms, material paid on supplier terms, and your lowest month."

Bar: For a real PropX proposal, every month's billing, retainage held, payments received, retainage released, material paid, net and cumulative equal a cash flow computed independently from the card's words (to the cent); billing adds up to the contract; the contract is the proposal's total plus its approved change orders (an existing change order is set approved for one call, the contract must rise by exactly its amount, and its old status is put back); the lowest month is the month with the lowest cumulative; the CSV carries the same months.

- ok a real PropX proposal on the account: 9 contracts
- ok portfolio answers: HTTP 200 
- ok contract = proposal total + approved change orders: 11754.43 = 11754.43 + 0
- ok every month equals the independent cash flow: 7 months
- ok billing adds up to the contract: $11,754
- ok lowest month is the lowest cumulative: 2026-12 $-6,465
- ok an approved change order raises the contract by exactly its amount: CO 1 $1,290: 11754.43 -> 13044.18
- ok CSV carries the same months: HTTP 200, 7 rows

## WireX: PASS

Claim: "(From /news; WireX is not on /pricing.) Construction industry news & engineering-report desk. Live headlines from Engineering News-Record & Construction Dive, a deterministic Editor's Briefing that cites its own sources, and WeylandAI's own real, audited price-extraction validation history. WireX Pro, $49.00/month: 20 headlines per feed instead of 6, full reports wire."

Bar: For the paying account the wire is Pro and carries headlines from Engineering News-Record and from Construction Dive; every headline has a title, a link to the publisher and a publication date within 14 days; each feed gives min(20, what the feed itself publishes) headlines (each feed read directly for comparison); the wire was ingested within the last hour; 5 headline links are live (200, or a publisher's bot challenge, reported); every citation in the briefing points at a listed source; the reports list has dated, statused entries.

- ok news answers: HTTP 200
- ok paying account is Pro: pro true
- ok headlines from Engineering News-Record: 20 items
- ok headlines from Construction Dive: 10 items
- ok every headline: title, publisher link, date within 14 days: 0 of 99 fail
- ok ingested within the last hour: 2026-10-09T08:29:59.815Z (1 min ago)
- ok each feed gives min(20, what it publishes), or the wire shows the feed's refusal: ["Engineering News-Record 20/20","Construction Dive 10/10","For Construction Pros 10/10","Building Enclosure 20/20","SDM Magazine 20/20","Security Sales & Integration 19/19","USGlass 0/0"]
- ok 5 headline links: none dead (a bot challenge is reported, not counted): ["Engineering News-Record 200","Construction Dive 200","For Construction Pros challenge","Building Enclosure 200","SDM Magazine 200"]
- ok briefing cites only listed sources: 18 citations over 36 sources
- ok reports: dated, statused entries: ["1 VALIDATED 2026-09-30","2 FALSIFIED 2026-10-01","3 VALIDATED 2026-10-01","4 VALIDATED 2026-10-02","5 PARTIAL 2026-10-02"]
