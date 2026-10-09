# g041: S1 tag matching for suffixed marks

## The rule (weyland-shared/plan-read.js, readPlan)
Some sets number doors by room and letter: T2507's schedule says 113A and 113B. The plan draws each tag as the room number with the letter stacked directly above or below it, as two text items on two baselines. Before this change, readPlan matched only tags printed as one item or one line, so T2507 placed 0 of 46 rows (tools/accuracy/g030/REPORT.md).

**When it applies:** a mark of the form number plus letter (113A, or 113-A) that has no exact tag on a plan sheet.

**What counts as a stacked tag:**
- the number item, plus one lone letter item;
- the letter is centred on the number within 1.2 text heights across;
- it sits between 0.5 and 2.4 text heights above or below the number;
- its text height is 0.6 to 1.6 times the number's.

**Safeguards:**
- An exact tag always wins.
- Each letter item serves only one tag.
- Tags found this way carry `matched_by: "stacked: 113 with A"`, so they can always be counted apart.
- Items used in a stacked pair are not reported as unmatched tags.

## Tests
`node --test weyland-shared/plan-read.test.mjs` passes 7 of 7, including two new g041 tests:
- letters stacked below and above the number are placed;
- a letter 100 points away is rejected;
- a C 30 points below its number is rejected;
- an exact 130A wins over a stacked pair;
- one letter between two numbers serves one tag;
- plain marks are unaffected.

Widening the geometry limits makes the first test fail.

## Measurement (not run here: blocked)
`node tools/accuracy/g041/measure.mjs <dir with 192a16af8f31ae0c.pdf, 7478006f7fd5b43c.pdf, e3d0cc1bc22fd824.pdf>`

It reads the schedules with reader A, as g020/plan-report.mjs does, places them with readPlan, and prints placed / exact / stacked per set. It also writes measure.json, listing every stacked tag with its sheet, coordinates and room.

**Bar:**
- T2507: 46 of 46 placed.
- R2502: 208 exact, as before, with every stacked tag (if any) checked by eye against the sheet.
- T2504: 22 of 22, unchanged.

**Why it was not run here:** this session cannot read the harvest PDFs from R2. See docs/cloud-status.md.
