# Paste-flow accuracy harness

`match_accuracy.mjs` measures the schedule paste flow end to end against the live API: real
products sampled from D1 (`sample_products_raw.json`, 320 rows pulled with
`wrangler d1 execute weyland_db`), each written seven ways an estimator actually types a line
(canonical, model only, lower case, comma separated, finish suffix, quantity prefix, tab
separated), plus ten negative lines that are not products. Every line goes through
`POST /api/cut-sheets/match-batch` with an ephemeral trial token, exactly like the homepage.

Run: `node tools/accuracy/match_accuracy.mjs` (writes `report_<date-time>.json` and `.md`).

## Results, 2026-10-05/06

| run | recall | precision | false positives (of 10) | what changed |
|---|---|---|---|---|
| baseline (`report_2026-10-06`) | 67.3% | 78.9% | 3 | none: this is what shipped |
| parser v1 (`report_2026-10-06_run2_after_parser_v1`) | 91.4% | 95.8% | 0 | unit word after a quantity ("2 ea") dropped; longest known manufacturer prefix from the live manufacturers table (National Guard Products, Camden Door Controls, BEA Inc); matcher: tokens without digits only match exactly, `product_series LIKE` and the category guess removed, an unknown manufacturer limits the line to exact matches |
| parser v2 (`report_2026-10-06-03-09`) | 97.9% | 99.9% | 0 | the rest of the line is tried as the model first (catalogue models with spaces: "DW16/MU16 10'0\" thru 10'6\"", "Hardware Pack SLSS2"); a first token that is not a known manufacturer but looks like a model makes the line model-only |

Remaining misses (5 of 320 per spelling) are products outside the doors trade (Sloan, Kohler,
Dyke): the matcher scopes to `trade = 'doors'`. Model-only lines have 3 wrong products out of
320 where a bare number ("111") exists under several manufacturers. Next: try the doors trade
first and then any trade; prefer a manufacturer-qualified exact over a bare numeric model.

The numbers are from the public finder's deterministic path; no language model is in it.
