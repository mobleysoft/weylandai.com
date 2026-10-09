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
| matcher v3, live (`report_2026-10-06-23-27`) | 99.15% | 99.95% | 0 | every exact attempt (whole line with the manufacturer, rest of the line, model token) runs before any prefix match; each attempt ranks the line's trade first and then any trade, in one query; products from another trade come back marked `_other_trade`, medium confidence at most; bare numbers of 4 digits or fewer never prefix-match; typed `%` and `_` are escaped in LIKE. Implemented 2026-10-06 by a Claude workflow, committed and deployed by Codex (741c48a), measured live here |
| one matcher in weyland-shared, live (`report_2026-10-08-19-20`) | 99.9% | 100.0% | 0 | parser: lines read as specs print them (QTY EA DESCRIPTION CATALOG FINISH MFR, the maker from the trailing code SEL/SCH/LCN/IVE...; group headings, door lists, column headers, wrapped tails and section footers skipped by reason instead of scored; no split at a comma inside a description; quantity-first lines read as maker then catalogue number); matcher (weyland-shared/product-database.js, re-exported by both workers): a named maker never gets another maker's product ("Ives 8200" was a Sargent lock, high exact), finish codes never match, spec-style models fall back to the base model, a variant or the series under the maker, a word that is not a maker matches only a model-shaped token; catalogue pages ranked product page before contents. The 3 misses left are Ives rows named by a finish code (US10, US28, US32D) typed alone, refused on purpose. Audit lines (Rockford Group 06 CL as printed, Ives 8200/8302, p.18, Christina set 01): `audit_lines_2026-10-08.md`. Measured live on weyland-cutsheetx-worker ead93f6a |

Remaining misses after matcher v3 (19 of 2,240 product lines) are all parser-side: commas inside a
model ("NGP 9500 X 2525 B, C, W") split the line; a leading number or letter is read as a quantity or
line mark ("1705 5-LITE SSB", "6 PNL TEXT FG", Steelcraft F16/F12); "Square D" is not yet a known
manufacturer. The matcher change moved no line from correct to wrong.

The numbers are from the public finder's deterministic path; no language model is in it.

# Truth at scale (2026-10-09)

docs/direction-2026-10-08.md, "Truth at scale for the harvested corpus": a downloaded set tests the
product the moment it is read, without anyone writing expected rows first. Offline, no network or credentials. Vector reads use vendored pdf.js; scan reads also need
Poppler (`pdfinfo` / `pdftoppm`) and use the shipped Tesseract engine and model.

    node tools/accuracy/truth_run.mjs                  # everything in tools/corpus + tools/bidset/out (+ $OCC_PDF)
    node tools/accuracy/truth_run.mjs --dir <folder>   # a folder of PDFs, e.g. the harvest pulled from R2
                                                       #   weyland-fixtures harvest/<sha16>.pdf; a manifest.json
                                                       #   in the folder (filename, source_label, source_url) names families
    node tools/accuracy/truth_run.mjs --files a.pdf,b.pdf   |   --only <sha16,...>   |   --max-pages <n>
    node tools/accuracy/truth_report.mjs [--label x]   # per-tier report: truth_report_<stamp>.md / .json
    node tools/accuracy/truth/show.mjs <sha16> [--all] # one truth record in short
    node tools/accuracy/truth/debug_page.mjs <file.pdf> <page> door|hw   # both readers on one page

What runs, per PDF:

- Page finding: pages whose text names a door schedule (DOOR, SCHEDULE, a hardware column, a mark
  column) or a hardware set heading are read by both readers.
- Reader A (`truth/reader_a.mjs`): the production text-layer reader, called exactly as SubX's server
  calls it (weyland-subx-worker/src/lib/text-layer-read.js).
- Reader B (`truth/reader_b.mjs`): built differently. Door schedules from the page's ruled lines
  (pdf.js operator list, `truth/pdf.mjs`): tables from connected rules or from row rules sharing one
  x-extent, row bands from the horizontals, column fences from the long verticals, spanning header
  labels from the short rules around them; text is only dropped into cells. No ruled table, no rows.
  Hardware groups: column fences from the page's vertical rules, else from the white gutters of the
  item lines' x-projection; struck-through words (a ruled bar through the letters) are left out.
- Agreement (`truth/agree.mjs`): doors aligned by page + mark, items by set + catalog/description.
  A row both readers read with every field equal after normalisation is agreed (accepted truth); the
  rest are written to `tools/corpus/harvest/truth/queue.jsonl` (a run replaces the lines of the PDFs
  it read).
- Oracles (`truth/oracles.mjs`), over reader A's rows, chosen by the triage class
  (`tools/corpus/harvest/triage.json` when present, else inferred: complete / pair / schedule-only /
  spec-only / plan-only): a marks on a floor plan (weyland-shared/plan-read.js), b sets exist in
  08 71 00, c set door lists equal the schedule's, d types in the door/frame types legend, e sizes
  parse and marks follow the sheet's shape.
- Tier: exact (tools/bidset/out, truth in building.mjs), audited (tools/corpus/expected), agreed (at
  least one agreed row), oracle-checked (no agreed row, an oracle applies), unread. Exact and
  audited files also score reader A, reader B and the agreed rows against the expected rows, which
  calibrates the agreement method (how often an agreed field is right).

Record: `tools/corpus/harvest/truth/<sha16>.json` (sha16 = first 16 hex of the file's sha256):
sha16, file, family, source, triage_class, tier, agreement_rate, rows_agreed, rows_disputed,
per-field agreement, oracles, calibration, disagreements (first 40).

Scans with at most six pages (raise `--ocr-max-pages` for larger files) use production
`ocrRasterPageLines`: orientation, image deskew, cell recognition, and line formation. Only the
renderer is adapted: Poppler here, pdf.js in the browser. The 36 MP budget caps ARCH D sheets
at 204 DPI even when `--ocr-dpi 600` is requested; actual DPI is recorded per page.

Browser verification: `node tools/accuracy/scanned_sheet_browser.mjs` serves the shipped assets
and runs the real `grid-runner.html` in Chromium. `--manual` prints a local URL for an existing
browser. Set `PLAYWRIGHT_CORE` / `CHROMIUM_PATH` to use an existing test installation. It writes
`g019-browser.json` with both variants, exact mark equality, field scores, and asset hashes.
The live upload/save journey is `tools/user-simulation/journeys/subx-scanned-sheet.mjs`.

Limits: the truth command does not exercise browser rendering or upload/save; reader B was
developed against the audited files, so its calibration there is in-sample; the human 2% spot
check of agreed rows is separate.
`TRUTH_DEBUG=1` prints reader B's table and column decisions.
