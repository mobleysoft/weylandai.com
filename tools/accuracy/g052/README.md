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

## After the order (2026-10-10, 03:43–03:52 UTC, production)

At 23:43 EDT the Mac placed the order: held offer purchase `in_1UOrBTLWTxUJi5AVJiJScQVc`, customer `cus_VPgYGhGvuf8Y2c`, Stripe invoice 4K1HEGPI-0001 open for $100.00 and due in 30 days. The firm's inbox received it at 03:43:05 UTC ("New invoice from John Mobley #4K1HEGPI-0001").

| Stage | Result | Report |
|---|---|---|
| claim | See below | [5-claim.json](reports/5-claim.json): **7 of 7** |
| R2502 again | See below | [6-project-R2502-paid.json](reports/6-project-R2502-paid.json): **11 of 11** |
| record | Account card ([shots-after/account-card.png](shots-after/account-card.png)): "Mobley Contracting", First submittal, access until November 9, and under INVOICES "Oct 10, 2026 · $100 · Due … On account for Mobley Contracting" with VIEW. SubX lists both projects ([shots-after/subx-projects.png](shots-after/subx-projects.png)). | [7-record-after-buy.json](reports/7-record-after-buy.json): **4 of 4** |

Claim stage:
- Before signing in again, the account card said: "A purchase made with jmobleyworks+mobleycontracting@gmail.com while signed out is waiting. Confirm the email with a code".
- A new code was read from the firm's inbox (it arrived at 03:44:14).
- The sign-in answered `claimed: [{ session_id: "in_1UOrBTLWTxUJi5AVJiJScQVc", product_id: "weyland-first-submittal", access_ends_at: "2026-11-09T03:44:51Z" }]`.
- The account card now reads: Plan "First submittal: every product for 30 days", access until Monday, November 9, 2026.

R2502 again:
- The firm opened its R2502 project; 211 of 211 rows, each with its source.
- 104D was corrected to `PR 3' - 4" x 6' - 8"`, and **kept as a pair**: EDIT shows `PR 3'-4" x 6'-8"` and the row reads `PR 3'-4" x 6'-8"` (with the SubX deploy of #118).
- The package was built (13 pages), **shown in the page** (13 pages drawn) and **downloaded**: [R2502_Missouri_Hope_first_project_submittal.pdf](R2502_Missouri_Hope_first_project_submittal.pdf). The package:
  - says "PREPARED BY: Mobley Contracting";
  - has a door schedule of 211 doors, each citing its page and row;
  - lists 104D as `PR 3'-4" x 6'-8"`.

### Two things the account card said wrong, fixed in this PR

- **"Paid Oct 10, 2026 · $100"** on a purchase made on account, while the invoice below says Due.
  - The access summary now carries `first_submittal.on_account` (weyland-platform-worker/src/lib/entitlements.js). The card says "On account Oct 10, 2026 · $100 invoiced" (assets/weyland-shell.js).
  - A card purchase still says Paid.
  - Tests: on-account.test.mjs (the claimed account's `/api/auth/me`) and offer.test.mjs (a card purchase is not on account).
- **"1 of 1 packet left to build"** after the packet was built: nothing ever counted the credit (`credits_used` was written nowhere).
  - A package built while the account's output access comes from the first submittal now uses the credit, capped at the credits bought (`useOfferCredit`, weyland-subx-worker/src/routes/subx-workspace.js).
  - New test in test/subx-workspace.test.mjs.
  - The firm's packet was built before this fix, so its card shows 1 of 1 until its next build after the deploy.

Tests: SubX 194 of 195 (the one renderer-bound test), platform worker 116 of 116, estimator assertions 11 of 11.

### For the Mac

- **Deploy:** this PR touches weyland-subx-worker, weyland-platform-worker and assets/weyland-shell.js.
- **Invoice sender name:** Stripe's invoice email names the seller "John Mobley". That comes from the Stripe account's public business name, not this code. Stripe's settings would make it read WeylandAI / Argo LLC, as the invoice footer does.
