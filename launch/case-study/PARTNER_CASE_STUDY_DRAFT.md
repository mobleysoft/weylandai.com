# Case study - draft scaffold (needs John's facts and the subject's consent)

Why this exists: one named, consenting user with a before/after beats every metric
card on the page. This scaffold holds only what is verified and lists exactly what is
missing. Nothing here goes on the site until the blanks are filled by John and the
subject has agreed in writing to be named.

## What is verified today
- WeylandAI is Mobley's own venture. A partner bought in for $40k upfront (2026,
  off-platform). That is investor capital with real expectations, not a customer purchase,
  so it is NOT itself a case study. It is evidence of conviction, and the partner may be
  the right person to introduce the first case-study subject.
- The homepage demos (HuntX, CutsheetX, PropX) run against real backends with no account.

## What a publishable case study needs (fill in; keep every number traceable)
1. Subject: Precision Auto Doors (Andrew Miller, cofounder of WeylandAI). Consent to be named given by phone 2026-10-04 (per John); a one-line written confirmation is still worth collecting. Still needed: trade scope, region, size.
2. The job: one real project (name or an agreed description), bid date, scope.
3. The workflow before WeylandAI, with the time it took and who did it.
4. The workflow with WeylandAI: which tools were used (CutsheetX? TakeOffX? PropX?), on
   which documents, and what came out.
5. The measured difference: hours saved on that job, errors caught, or margin protected,
   each with how it was measured.
6. One quote in the subject's own words.
7. A screenshot or export from their real project (redacted as they require).

## Where it goes once real
- A chapter on the single page between CutsheetX and PropX ("One job, start to finish"),
  same chapter styling, no new secondary page.
- The Product Hunt first comment's second paragraph.

## Candidate route to a subject
Ask the $40k partner for one introduction to a subcontractor who will run one real bid
through CutsheetX with us watching the clock. Offer the suite free for that job in
exchange for the numbers and the quote.

## Measured so far (sample package, not a real bid) - 2026-10-04
Harness: `timed_run.mjs` (same directory). Against production with an ephemeral session:
ephemeral session 0.9 s; six CutsheetX matches (LCN 4040XP, Von Duprin 99, Schlage L9080,
Ives 5BB1, LCN 1461, Hager BB1279) 0.56-0.63 s each, 6/6 exact; PropX proposal 0.63 s;
real PDF 1.6 s (67 KB). Total 6.6 s. Raw output: `timed_run_sample_2026-10-04.json`.

To run Andrew's actual bid: export his spec lines as `specs.json`
(`[{"manufacturer": "...", "model": "..."}, ...]`) and run
`node launch/case-study/timed_run.mjs specs.json`. Publish only what that prints.
