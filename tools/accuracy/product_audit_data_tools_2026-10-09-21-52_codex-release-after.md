# The data tools on sale, against their pricing-card claims, 2026-10-09-21-52

Live API https://weylandai.com, as a paying test account. Pass = every check of the tool's bar (tools/accuracy/product_audit_data_tools.mjs).

| tool | input | result | numbers |
|---|---|---|---|
| MarketX | all six metros, default 12 months, likely-door scope; both CSVs per metro | PASS | chicago 1868 / $6,173,457,133; nyc 9466 / $19,002,202,508; la 827 / $5,408,090,321; austin 78 / $1,071,811,700; sf 757 / $2,191,879,405; seattle 405 / $1,043,269,869; projects CSV capped at 5,000: nyc 5000 of 9466; owners empty in la, austin, sf, seattle |

## MarketX: PASS

Claim: "The door work your city is permitting, and who is building it. Commercial and multifamily building permits from Chicago, New York, Los Angeles, Austin, San Francisco and Seattle: permitted value by month against last year, by building use, for work likely to include doors; the largest and newest projects; the general contractors and owners ranked by permitted value where the city's permits name them (both in Chicago, owners in New York, contractors in Austin and Seattle; Los Angeles and San Francisco publish neither); the open public bids in the state. Projects and companies CSV."

Bar: All six metros hold permits with a permitted value; each metro's page carries months for this year and last year, a by-use split that adds up to the total, largest projects in value order, newest in date order, general contractors or owners ranked by permitted value where the city's published records name them; Los Angeles and San Francisco must explain that their source publishes neither, rather than supply invented companies, the open-bids block, and the metros list's figures; both CSVs download for the paying account, the projects CSV holding every project of the period (up to its 5,000 cap) and the companies CSV beginning with the same ranking.

- ok metros answer: HTTP 200
- ok six metros, each with permits and value: ["chicago 1868","nyc 9466","la 827","austin 78","sf 757","seattle 405"]
- ok Chicago: value by month vs last year, by use, ranked lists, bids, both CSVs: 1868 projects $6,173,457,133 (last yr $5,229,420,905, 18.1%), months 13+12, use sum=total true, GCs 200, owners 200, bids 51, projects.csv 1868/1868, companies.csv 2106 rows (JSON ranks 400)
- ok New York City: value by month vs last year, by use, ranked lists, bids, both CSVs: 9466 projects $19,002,202,508 (last yr $8,659,985,201, 119.4%), months 13+12, use sum=total true, GCs 0, owners 200, bids 76, projects.csv 5000/5000, companies.csv 2938 rows (JSON ranks 200)
- ok Los Angeles: value by month vs last year, by use, ranked lists, bids, both CSVs: 827 projects $5,408,090,321 (last yr $2,124,721,515, 154.5%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 827/827, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in LADBS's open data"
- ok Austin: value by month vs last year, by use, ranked lists, bids, both CSVs: 78 projects $1,071,811,700 (last yr $1,006,378,802, 6.5%), months 13+12, use sum=total true, GCs 70, owners 0, bids 0, projects.csv 78/78, companies.csv 70 rows (JSON ranks 70)
- ok San Francisco: value by month vs last year, by use, ranked lists, bids, both CSVs: 757 projects $2,191,879,405 (last yr $1,274,456,543, 72%), months 13+12, use sum=total true, GCs 0, owners 0, bids 14, projects.csv 757/757, companies.csv 0 rows (JSON ranks 0); no GC or owner ranked: "No owner or contractor in DBI's open data"
- ok Seattle: value by month vs last year, by use, ranked lists, bids, both CSVs: 405 projects $1,043,269,869 (last yr $1,106,605,349, -5.7%), months 13+12, use sum=total true, GCs 10, owners 0, bids 0, projects.csv 405/405, companies.csv 10 rows (JSON ranks 10)
