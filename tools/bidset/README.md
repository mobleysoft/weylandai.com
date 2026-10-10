# Bid-set generation and packet grade

`building.mjs` is the source model for the sample bid set. `make.mjs` creates the vector and scanned PDFs plus the expected door and hardware data. The project is explicitly marked **SAMPLE PROJECT - NOT A REAL BUILDING**.

`grade.mjs` uploads each variant to production SubX, discovers and reads the schedule pages, builds a packet, compares extracted doors and hardware with the source model, verifies exact maker/model/page citations for every held catalog item, checks disclosure of unheld items, reads the packet back, and deletes the test session. It exits nonzero if any check fails or cleanup does not complete.

Run the pure grading checks with:

```sh
node --test tools/bidset/coverage.test.mjs
```

The packet grade is a regression test against a self-authored model. It does not establish independent architect approval or jurisdiction-specific code compliance. Public bid sets and human review remain the outside checks.

The live upload endpoint requires a real WeylandAI account; an AuthFor anonymous trial token is intentionally refused before any file is stored. A fresh live grade therefore needs the existing QA-account token. The attempted anonymous run on 2026-10-10 stopped at HTTP 401 before a SubX session or upload was created.

## Historical report correction

`grade_report_2026-10-09-07-38.*` recorded all 6 checks passing. Its held-item citation check was unsound: it inferred individual citations from aggregate matched/unmatched totals. Do not rely on its `25 of 25` citation claim. The corrected checker requires each held item to match a packet section's manufacturer, model, and embedded page. The current live packet has not yet been rerun with this stricter check.
