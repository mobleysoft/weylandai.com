# The data tools on sale, against their pricing-card claims, 2026-10-09-08-06

Live API https://weylandai.com, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).

| tool | input | result | numbers |
|---|---|---|---|
| HuntX | whole index (1387 notices), fit=doors, state=TX, due_within=30, min_value=1M, a saved search | FAIL | 1387 notices from 7 sources; 11 door / 164 building / 514 signal / 698 civil; links 5/5 200; 1 of 1387 notices link to a dead page (de_mmp 1); 140 of 1387 link to the notice itself (txdot, il_cdb, ca_opsc, nyc_sca link to one agency page); sample email not sent (not a jmobleyworks+ address) |
| CompX | all awards; fit=doors; vendors Atlantic Rolling Steel Door Corp., FREDANTE CONSTR CORP, B.J. Laura & Sons Inc.; CSV of the default (building) search | PASS | 2809 awards ($42,610,619,643), 59 door awards; vendors 3/3 equal NYC open data; CSV 2000 of 2328 rows |
| CompX TxDOT vendor route (off-card) | q=Austin Bridge -> AUSTIN BRIDGE & ROAD SERVICES, LP | PASS | AUSTIN BRIDGE & ROAD SERVICES, LP: CompX 76 bids / 12 wins ($75,514,048); TxDOT 76 projects / 12 wins ($75,514,048); 0 other vendors in the reply |
| MarketX | all six metros, default 12 months, likely-door scope; both CSVs per metro | PASS | chicago 1850 / $6,127,511,480; nyc 9437 / $18,932,146,292; la 827 / $5,408,090,321; austin 78 / $1,071,811,700; sf 754 / $2,175,277,963; seattle 405 / $1,043,269,869; projects CSV capped at 5,000: nyc 5000 of 9437; owners empty in la, austin, sf, seattle |
| WeatherX | 1 PropX job(s): 1855 Lucretia Ave, San Jose, CA 95122 | PASS | San Jose city: 14 periods/6.3 d, NWS 13/13 agree; log 1 days (job 10.3 h old) |
| GeoX | 7 PropX job(s); shop 1600 Pennsylvania Ave NW, Washington, DC 20500 | PASS | "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); "Berryessa Union School District, San Jose, CA" unplaceable (Census has no match; GeoX says unmatched); San Jose city / Santa Clara County / Census Tract 5031.22, 2414 mi; 7/7 agree with Census; unincorporated case not exercised (no such job) |
| ForecastX | proposal 1 (QA GC, $11,754), start 2026-11-01, 4 months, retainage 5%, terms 45 d, material 55% on 30 d | FAIL | 7 months, contract $12,772, lowest 2026-12 $-7,025; independent recompute equal to the cent; approved CO $1,290 added (CO $1,290, status restored to submitted) |
| WireX | the paying account's wire, the briefing, the reports; each of the 7 listed feeds read directly | FAIL | 99 headlines: Engineering News-Record 20, Construction Dive 10, For Construction Pros 10, Building Enclosure 20, SDM Magazine 20, Security Sales & Integration 19; ENR 20; 1 of 7 listed feeds empty on the wire though each publishes 10 items; links 200/200/challenge/200/200 |

## HuntX: FAIL

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
- **FAIL** no notice links to a dead page (every distinct link fetched): 144 distinct links; 1 of 1387 notices link to a dead page: de_mmp 1 (https://mmp.delaware.gov/Bids/Details/9329 -> 503)
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

## CompX TxDOT vendor route (off-card): PASS

Claim: "(Not on the pricing card any more; the CompX page no longer calls it.) /api/compx/vendors: TxDOT bid tabulations by vendor: total bids, wins, win rate, total won value."

Bar: For a real TxDOT contractor, total_bids equals the distinct projects (CSJ) that vendor bid in data.texas.gov's bid tabulations and wins equals the projects where it was low bidder: one count per project, not per bid item.

- ok route answers: HTTP 200
- ok the vendor is in the result: 1 vendors returned
- ok total bids = distinct projects in TxDOT data: CompX 76, TxDOT 76 projects (8418 bid-item rows)
- ok wins = projects where low bidder: CompX 12, TxDOT 12
- ok total won value equals TxDOT's: CompX $75,514,048, TxDOT $75,514,048

## MarketX: PASS

Claim: "The door work your city is permitting, and who is building it. Commercial and multifamily building permits from Chicago, New York, Los Angeles, Austin, San Francisco and Seattle: permitted value by month against last year, by building use, for work likely to include doors; the largest and newest projects; the general contractors and owners ranked by permitted value where the city's permits name them (both in Chicago, owners in New York, contractors in Austin and Seattle; Los Angeles and San Francisco publish neither); the open public bids in the state. Projects and companies CSV."

Bar: All six metros hold permits with a permitted value; each metro's page carries months for this year and last year, a by-use split that adds up to the total, largest projects in value order, newest in date order, general contractors or owners ranked by permitted value (at least one of the two; a metro with neither fails 'who is building it'), the open-bids block, and the metros list's figures; both CSVs download for the paying account, the projects CSV holding every project of the period (up to its 5,000 cap) and the companies CSV beginning with the same ranking.

- ok metros answer: HTTP 200
- ok six metros, each with permits and value: ["chicago 1850","nyc 9437","la 827","austin 78","sf 754","seattle 405"]
- ok Chicago: value by month vs last year, by use, ranked lists, bids, both CSVs: 1850 projects $6,127,511,480 (last yr $5,229,420,905, 17.2%), months 13+12, use sum=total true, GCs 200, owners 200, bids 50, projects.csv 1850/1850, companies.csv 2088 rows (JSON ranks 400)
- ok New York City: value by month vs last year, by use, ranked lists, bids, both CSVs: 9437 projects $18,932,146,292 (last yr $8,661,260,201, 118.6%), months 13+12, use sum=total true, GCs 0, owners 200, bids 73, projects.csv 5000/5000, companies.csv 2932 rows (JSON ranks 200)
- ok Los Angeles: value by month vs last year, by use, ranked lists, bids, both CSVs: 827 projects $5,408,090,321 (last yr $2,124,721,515, 154.5%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 827/827, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in LADBS's open data"
- ok Austin: value by month vs last year, by use, ranked lists, bids, both CSVs: 78 projects $1,071,811,700 (last yr $1,006,378,802, 6.5%), months 13+12, use sum=total true, GCs 70, owners 0, bids 0, projects.csv 78/78, companies.csv 70 rows (JSON ranks 70)
- ok San Francisco: value by month vs last year, by use, ranked lists, bids, both CSVs: 754 projects $2,175,277,963 (last yr $1,274,456,543, 70.7%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 754/754, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in DBI's open data"
- ok Seattle: value by month vs last year, by use, ranked lists, bids, both CSVs: 405 projects $1,043,269,869 (last yr $1,106,605,349, -5.7%), months 13+12, use sum=total true, GCs 10, owners 0, bids 0, projects.csv 405/405, companies.csv 10 rows (JSON ranks 10)

## WeatherX: PASS

Claim: "Install-day weather and a daily weather log per job. Each job's next 7 days from the National Weather Service with the install risk for door and frame work, and a daily log of what the nearest station observed at the job (temperatures, wind, gusts, precipitation) for delay claims."

Bar: Each job gets 7 days (14 NWS periods) starting now, each period's temperature equal to the NWS forecast for the job's point (within 3 F, the route caches up to 3 h) and its install risk following the stated rule (thunder/snow/ice, rain >= 60%, wind >= 25 mph or <= 32 F is high; rain >= 30% or wind >= 15 mph moderate); and each job's daily log holds at least one observed day with station, temperatures, wind, gust and precipitation fields.

- ok jobs answer: HTTP 200
- ok job 7: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 6: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 5: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 4: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 3: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 2: "Berryessa Union School District, San Jose, CA" has no Census match; no forecast is invented: 0 periods
- ok job 1: 14 periods covering 7 days, current: 14 periods over 6.3 days, first 2026-10-08T23:00:00-07:00
- ok job 1: temperatures equal the NWS forecast (±3 F): 13 of 13 matching periods agree
- ok job 1: install risk follows the stated rule: 0 periods off; risks low
- ok job 1: daily weather log holds observed days: 1 logged days; job 10.3 h old
- ok at least one placeable job: 1 jobs
- ok the daily log is shown on at least one job (one 48 h old, or any job with logged days): ["1855 Lucretia Ave, San Jose, CA 95122: 1 days"]

## GeoX: PASS

Claim: "Where each job is and who permits it. Places every job with the Census geocoder: county, city, census tract and the building permit authority it usually answers to (city if incorporated, else county), with miles from your shop."

Bar: Every job with an address is placed; its county, city, tract and coordinates equal the Census geocoder's own answer for that address; the permit authority is the city when the address is in an incorporated place and the county otherwise; miles from the shop equal the great-circle distance within 0.5 mi; the CSV export carries the same jobs.

- ok jobs answer: HTTP 200
- ok shop placed: 1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500
- ok account has at least one job with an address: 7 jobs
- ok job 7: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 6: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 5: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 4: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 3: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 2: the Census cannot place "Berryessa Union School District, San Jose, CA"; GeoX says so and invents nothing: matched false
- ok job 1: county, city, tract, authority, miles equal the Census answer: San Jose city / Santa Clara County / Census Tract 5031.22; 2414 mi (recomputed 2414.0)
- ok CSV export carries the jobs: HTTP 200, 7 rows

## ForecastX: FAIL

Claim: "Cash flow across your contracts, change orders included. Monthly cash flow across your PropX contracts with approved change orders counted: billing, retainage held and released, payments after each job's terms, material paid on supplier terms, and your lowest month."

Bar: For a real PropX proposal, every month's billing, retainage held, payments received, retainage released, material paid, net and cumulative equal a cash flow computed independently from the card's words (to the cent); billing adds up to the contract; the contract is the proposal's total plus its approved change orders (an existing change order is set approved for one call, the contract must rise by exactly its amount, and its old status is put back); the lowest month is the month with the lowest cumulative; the CSV carries the same months.

- ok a real PropX proposal on the account: 7 contracts
- ok portfolio answers: HTTP 200 
- **FAIL** contract = proposal total + approved change orders: 12772.02 = 11754.43 + 0
- ok every month equals the independent cash flow: 7 months
- ok billing adds up to the contract: $12,772
- ok lowest month is the lowest cumulative: 2026-12 $-7,025
- ok an approved change order raises the contract by exactly its amount: CO 1 $1,290: 12772.02 -> 14061.77
- ok CSV carries the same months: HTTP 200, 7 rows

## WireX: FAIL

Claim: "(From /news; WireX is not on /pricing.) Construction industry news & engineering-report desk. Live headlines from Engineering News-Record & Construction Dive, a deterministic Editor's Briefing that cites its own sources, and WeylandAI's own real, audited price-extraction validation history. WireX Pro, $49.00/month: 20 headlines per feed instead of 6, full reports wire."

Bar: For the paying account the wire is Pro and carries headlines from Engineering News-Record and from Construction Dive; every headline has a title, a link to the publisher and a publication date within 14 days; each feed gives min(20, what the feed itself publishes) headlines (each feed read directly for comparison); the wire was ingested within the last hour; 5 headline links are live (200, or a publisher's bot challenge, reported); every citation in the briefing points at a listed source; the reports list has dated, statused entries.

- ok news answers: HTTP 200
- ok paying account is Pro: pro true
- ok headlines from Engineering News-Record: 20 items
- ok headlines from Construction Dive: 10 items
- ok every headline: title, publisher link, date within 14 days: 0 of 99 fail
- ok ingested within the last hour: 2026-10-09T07:49:38.692Z (18 min ago)
- **FAIL** each feed gives min(20, what it publishes): ["Engineering News-Record 20/20","Construction Dive 10/10","For Construction Pros 10/10","Building Enclosure 20/20","SDM Magazine 20/20","Security Sales & Integration 19/19","USGlass 0/10"]
- ok 5 headline links: none dead (a bot challenge is reported, not counted): ["Engineering News-Record 200","Construction Dive 200","For Construction Pros challenge","Building Enclosure 200","SDM Magazine 200"]
- ok briefing cites only listed sources: 18 citations over 36 sources
- ok reports: dated, statused entries: ["1 VALIDATED 2026-09-30","2 FALSIFIED 2026-10-01","3 VALIDATED 2026-10-01","4 VALIDATED 2026-10-02","5 PARTIAL 2026-10-02"]
