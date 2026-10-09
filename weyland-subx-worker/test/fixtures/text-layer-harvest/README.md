G004 regression fixtures are positioned words extracted with the production
`pageTextLines` function from the read-only harvest PDFs named by `source.sha16`.
`source.page` is the one-based PDF page. Each compact word array follows
`word_fields`; coordinates are PDF points, y down, rounded to four decimals.
Tests reconstruct the lines with `clusterLines`.

The assertions in `text-layer-harvest.test.mjs` were checked against rendered
pages and page text. Reader B's output is not the expected result: the fixtures
intentionally preserve valid A-only rows and fields B assigns incorrectly.
Full pages are retained so adjacent legends, prose, headings, and notes continue
to exercise the table boundaries.
