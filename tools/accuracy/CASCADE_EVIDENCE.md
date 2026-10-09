# Schedule cascade evidence

The browser grid reader, OCR line reader and positioned PDF text reader return
`field_evidence` on door rows. Saved rows keep its bounded envelope in the
existing `field_confidence_json`; the session doors API returns it again.
No database migration is needed.

Each named field keeps the original text, original recognizer score and parsed
value, followed by the chosen read/value/view. A rejected parse keeps its raw
score here even though the existing review confidence remains zero. Reread
summaries record conflicts, stopped budgets and selected views. They contain at
most six text readings, two selected views and no pixels or word-box arrays.
The envelope has a version, stage and pinned OCR model SHA-256; it is
limited to 24 known fields and 16,000 UTF-8 bytes per row. Text-layer reads
carry null recognition scores because positioned text is not an OCR prediction.

Evaluate a browser receipt or a saved session doors response offline:

```sh
node tools/accuracy/cascade_evidence.mjs \
  --receipt /path/to/receipt.json \
  --expected tools/corpus/expected/occ-a-801-door-schedule.json \
  --project occ --split development --page 1
```

For a multi-variant browser receipt, add `--variant scanned`. For a multi-page
label file, choose the original PDF page with `--page`. Use one matching page's
receipt. To map a saved cropped page 1 to label page 4, add `--page 4
--receipt-page 1`; known page mismatches are rejected without that explicit
mapping. The command reads local JSON and prints its report; it makes no network
call and changes no files or policy.

The report counts missing, duplicate and extra marks, uses all labeled
dimensions as its denominator, and separates original-score reliability bins
from diagnostic threshold coverage and wrong accepted dimensions. Partial,
corrected and legacy constant-score rows are excluded from threshold accepts.
Zero accepted fields give undefined precision (`null`). Older receipts honestly
report raw evidence as unavailable; the tool cannot reconstruct lost scores.

OCC and the synthetic building remain development regressions. `--split` is a
declared dataset role, not proof of an independent holdout. Choose new projects,
label them without reading extraction output, and keep calibration and test
projects separate before fitting any confidence mapping. The current 0.8 review
threshold is unchanged; this tool does not train, certify or promote a model.
