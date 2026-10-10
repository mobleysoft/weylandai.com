# g052: Mobley Contracting, WeylandAI's first customer, on credit

John's note (2026-10-09 23:03 EDT) sets the goal:
- Nobody outside can be a blocker: the firm becomes the first customer, on credit.
- The offer's held-buy path (no auto-charge, invoice on account) is the mechanism.
- Use R2502 (7478006f7fd5b43c, 211 doors) as the first project and T2507 as the second.
- Keep the records, and label the account Mobley Contracting.
- Measure with the first-customer journeys against production.

All runs below are against **https://weylandai.com (production)**, on 2026-10-10 between 03:11 and 03:25 UTC:
- They use the firm's own address, jmobleyworks+mobleycontracting@gmail.com, one of John's aliases (the only addresses tests mail).
- The journey is `tools/user-simulation/journeys/first-customer.mjs`. It is built from the same steps as a stranger's journeys:
  - code-sign-in, for the account;
  - subx-upload-to-submittal, for upload, read, review and package;
  - account-view, for the record.
- It deletes nothing.
- The reports are in [reports/](reports/), and the screenshots are in [shots/](shots/).

This container's Chromium has no GPU, so the runs use software WebGL. The reports say so; the Mac's GPU passes are the reference for the 3D homepage's timing.

## What is done on production

| Step | Result | Report |
|---|---|---|
| Account | Code sent to the firm's address, read from its inbox, signed in (inbox proven); "No WeylandAI account on this email yet … no card"; START MY FREE 14-DAY TRIAL; signed in; the server session and the account card are the firm's | [1-account.json](reports/1-account.json): **8 of 8** |
| First project: R2502 | See below | [2-project-R2502.json](reports/2-project-R2502.json): 9 of 11 |
| Second project: T2507 | The whole 30-page set (9.8 MB) uploaded as "T2507 (second project)". The finder named page 10 (49 rows), and **49 of 49** rows were read, each with its source. Package built: 5 pages. | [3-project-T2507.json](reports/3-project-T2507.json): 7 of 9 |
| Record | The account card and SubX list both projects (screenshots [account-card.png](shots/account-card.png), [subx-projects.png](shots/subx-projects.png), [dossier.png](shots/dossier.png)) | [4-record-before-buy.json](reports/4-record-before-buy.json): **4 of 4** |

Steps on R2502:
- The whole bid set (92 MB, 148 pages) is refused in the page's own words: "The reader takes PDFs up to 30 MB. Upload just the schedule pages."
- The firm uploads just the schedule pages (sheets 28, 32, 45 and 46, 2.5 MB) as "R2502 Missouri Hope (first project)".
- The finder names pages 1–4 and reads 2 + 1 + 131 + 77 = **211 of 211** rows. Every row cites its page and row.
- Door 104D is corrected with EDIT and marked CORRECTED.
- The package is built: 13 pages (cover, contents, door schedule of 211 doors in 7 pages, and the uploaded schedule in 4 pages).

The two failed checks on each project are the same: the package is built, but **not shown or downloadable**. The page says why: "The submittal package PDF comes with the $100 first submittal". That is the purchase this goal makes on account, below.

## What was missing, and is in this PR

1. **No way to buy without a card.**
   - The offer's checkout takes cards only (`allowed_payment_method_types: ["card"]`). Its "held" state is a card purchase waiting for its email to be proven; nothing invoiced on account existed.
   - New: `POST /api/billing/on-account` in weyland-platform-worker (`src/routes/on-account.js`). It is operator-only: the header `X-WeylandAI-Operator-Secret` must match `WEYLAND_OPERATOR_SECRET` (at least 32 characters). Without the secret the route does not exist; production answers 404 today.
   - The route sends the customer a Stripe invoice for the offer's live price with `collection_method: send_invoice`: no card, no automatic charge, due in 30 days. The invoice is finalized and sent to the firm's address.
   - It records the purchase as **held** for the email: the same held purchase a card checkout leaves.
   - The account takes the purchase at its next sign-in with an emailed code (the email proven). That opens the 30 days of every product and the first-submittal credit, exactly as a paid offer does.
   - The invoice is listed in the account card under INVOICES, because the purchase's Stripe customer becomes the account's.
   - It labels the account: the card's heading becomes "Mobley Contracting" when the account still carries its address as its name, and the company is set.
   - Tests: `weyland-platform-worker/src/routes/on-account.test.mjs`, 4 of 4, through the whole Worker against SQLite. They cover:
     - no secret, a short secret or a wrong secret;
     - bad orders;
     - a send_invoice invoice with no checkout, payment intent or charge;
     - held until a proven sign-in, then granted;
     - no second invoice for a waiting order;
     - offer_used once bought;
     - the name label.

     The platform worker passes 116 of 116.
   - The order is `tools/billing/on-account-order.mjs`. It reads the secret from the environment and never prints it.
2. **A pair correction was not kept.** R2502 prints door types like "WD-2 (PR)", and the reader leaves those doors single (104D, 104E and others).
   - The firm corrected 104D's size to `PR 3' - 4" x 6' - 8"`, the way the form writes a pair. The row was marked CORRECTED, but the server dropped the pair: the size parser's pair flag was never stored.
   - Fixed in `weyland-subx-worker/src/routes/subx-workspace.js`: a size correction now sets the stored pair (with `PR`) or clears it (without), and keeps the row's source citation. The correction log keeps the pair from before.
   - The size cell shows `PR` for a pair.
   - New test in `test/subx-workspace.test.mjs`. SubX passes 190 of 191; the one failure is the renderer-bound generated-mark-scan test, which passes on the Mac.
   - The reader itself still does not take "(PR)" in a door type as a pair. That is a reader gap for a later goal, measured across sets.
3. **The upload copy said "the whole bid set is fine".** For R2502 (92 MB) it is not.
   - The copy now reads: "PDF up to 30 MB: a whole bid set of that size is fine; a larger one, upload just its schedule pages."
   - The refusal message was already right.

## What waits on the Mac (deploy and one order)

1. Deploy weyland-platform-worker and weyland-subx-worker from this PR, through deploy-workers.yml.
2. Set the platform worker secret `WEYLAND_OPERATOR_SECRET`: a new random value of at least 32 characters, never pasted anywhere.
3. Place the order:
   ```
   WEYLAND_OPERATOR_SECRET=… node tools/billing/on-account-order.mjs --email jmobleyworks+mobleycontracting@gmail.com --name "Mobley Contracting" --terms-accepted-at 2026-10-09T23:03:00-04:00
   ```
   Expected: 201, a held offer purchase `in_…`, and an open invoice of $100.00 due in 30 days, emailed to the firm's address.
4. Then the journey finishes the goal (the code is read from the firm's inbox, as in step 1):
   - `STAGE=claim`: a code sign-in takes the held first submittal. The account card shows the first submittal, its 30 days and the invoice.
   - `STAGE=project REUSE_PROJECT=1 PROJECT="R2502 Missouri Hope (first project)" EXPECT_ROWS=211 CORRECT_MARK=104D CORRECT_SIZE="PR 3' - 4\" x 6' - 8\""`: the correction is kept as a pair, and the package is built, shown and downloaded.
   - `STAGE=record`: the customer record.

   The cloud session runs these once the order is placed. Each run's report goes into reports/ here.
