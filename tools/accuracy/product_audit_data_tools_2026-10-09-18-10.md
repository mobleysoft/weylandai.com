# The data tools on sale, against their pricing-card claims, 2026-10-09-18-10

Live API https://weylandai.com, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).

| tool | input | result | numbers |
|---|---|---|---|
| HuntX | whole index (1389 notices), fit=doors, state=TX, due_within=30, min_value=1M, a saved search | PASS | 1389 notices from 7 sources; 11 door / 166 building / 514 signal / 698 civil; links 5/5 200; 0 of 1389 notices link to a dead page (none); 141 of 1389 link to the notice itself (txdot, il_cdb, ca_opsc, nyc_sca link to one agency page); sample email not sent (not a jmobleyworks+ address) |
| MarketX | all six metros, default 12 months, likely-door scope; both CSVs per metro | FAIL | chicago 1850 / $6,127,511,480; nyc 9437 / $18,932,146,292; la 827 / $5,408,090,321; austin 78 / $1,071,811,700; sf 757 / $2,191,879,405; seattle 405 / $1,043,269,869; projects CSV capped at 5,000: nyc 5000 of 9437; owners empty in la, austin, sf, seattle |

## HuntX: PASS

Claim: "Seven public sources, sorted by what a door sub can bid. Opportunity Discovery. Public construction notices from seven sources (Illinois CDB, NYC City Record and School Construction Authority, Los Angeles, Delaware, Texas DOT, California school funding), each tagged by trade fit: door scope named, building work, funding to watch, or civil. Filter by state, due date and value; saved searches count new notices since you last looked and send them to your feed reader (RSS) and your calendar (bid due dates)."

Bar: All seven named sources hold notices; every notice carries a trade fit and a link on its source's own site, and no link is dead (every distinct link fetched; a bot challenge is reported, not counted as dead); fit=doors returns only door-scope notices, each with the words that put it there, and its total equals the index's door count; state, due-date and value filters return only matching rows; 5 source links (5 different sources) answer HTTP 200; a saved search returns a new-notice count and working RSS and calendar feeds. The sample email is sent only if the account's address is jmobleyworks+<tag>@gmail.com.

- ok index answers: HTTP 200
- ok seven named sources each hold notices: {"txdot":673,"nyc_sca":356,"ca_opsc":166,"nyc_cityrecord":94,"il_cdb":53,"de_mmp":25,"la_ramp":22}
- ok full index read equals indexed count: 1389 rows read, indexed 1389
- ok every notice tagged with a trade fit: 0 untagged
- ok every notice links to its source's own site: all 1389
- ok fit=doors returns only door-scope notices: 11 rows
- ok fit=doors total equals the index's door count: total 11, fits.doors 11
- ok each door notice says why (trade_fit_why): 0 without a reason
- ok state=TX returns only TX: 673 rows
- ok due_within=30 returns only notices due in the next 30 days: 220 rows, 0 outside
- ok min_value=1000000 returns only notices worth $1M+: 890 rows, 0 under
- ok 5 source links answer 200: ["nyc_cityrecord 200","il_cdb 200","nyc_sca 200","la_ramp 200","de_mmp 200"]
- ok no notice links to a dead page (every distinct link fetched): 145 distinct links; 0 of 1389 notices link to a dead page
- ok saved search created: HTTP 200
- ok saved search reports a new-notice count: new_count 0
- ok RSS feed works: 200, 50 items
- ok calendar feed works (bid due dates): 200, 161 events

## MarketX: FAIL

Claim: "The door work your city is permitting, and who is building it. Commercial and multifamily building permits from Chicago, New York, Los Angeles, Austin, San Francisco and Seattle: permitted value by month against last year, by building use, for work likely to include doors; the largest and newest projects; the general contractors and owners ranked by permitted value where the city's permits name them (both in Chicago, owners in New York, contractors in Austin and Seattle; Los Angeles and San Francisco publish neither); the open public bids in the state. Projects and companies CSV."

Bar: All six metros hold permits with a permitted value; each metro's page carries months for this year and last year, a by-use split that adds up to the total, largest projects in value order, newest in date order, general contractors or owners ranked by permitted value (at least one of the two; a metro with neither fails 'who is building it'), the open-bids block, and the metros list's figures; both CSVs download for the paying account, the projects CSV holding every project of the period (up to its 5,000 cap) and the companies CSV beginning with the same ranking.

- ok metros answer: HTTP 200
- ok six metros, each with permits and value: ["chicago 1850","nyc 9437","la 827","austin 78","sf 754","seattle 405"]
- **FAIL** Chicago: value by month vs last year, by use, ranked lists, bids, both CSVs: 1850 projects $6,127,511,480 (last yr $5,229,420,905, 17.2%), months 13+12, use sum=total true, GCs 200, owners 200, bids 51, projects.csv 1850/1850, companies.csv 2106 rows (JSON ranks 400)
- ok New York City: value by month vs last year, by use, ranked lists, bids, both CSVs: 9437 projects $18,932,146,292 (last yr $8,661,260,201, 118.6%), months 13+12, use sum=total true, GCs 0, owners 200, bids 76, projects.csv 5000/5000, companies.csv 2932 rows (JSON ranks 200)
- ok Los Angeles: value by month vs last year, by use, ranked lists, bids, both CSVs: 827 projects $5,408,090,321 (last yr $2,124,721,515, 154.5%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 827/827, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in LADBS's open data"
- ok Austin: value by month vs last year, by use, ranked lists, bids, both CSVs: 78 projects $1,071,811,700 (last yr $1,006,378,802, 6.5%), months 13+12, use sum=total true, GCs 70, owners 0, bids 0, projects.csv 78/78, companies.csv 70 rows (JSON ranks 70)
- **FAIL** San Francisco: value by month vs last year, by use, ranked lists, bids, both CSVs: 757 projects $2,191,879,405 (last yr $1,274,456,543, 72%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 757/757, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in DBI's open data"
- ok Seattle: value by month vs last year, by use, ranked lists, bids, both CSVs: 405 projects $1,043,269,869 (last yr $1,106,605,349, -5.7%), months 13+12, use sum=total true, GCs 10, owners 0, bids 0, projects.csv 405/405, companies.csv 10 rows (JSON ranks 10)
