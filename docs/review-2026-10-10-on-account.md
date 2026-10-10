# Independent review of the first-customer-on-account path (PR 118, PR 119)

Reviewer: the Gemini pool (agy-gemini), read-only, 2026-10-10 00:19 to 00:23 EDT, on main e293d1a.
Status: claims until measured. Each finding below is to be checked against the code and the offer before any change.
Two readings the Mac already disputes: (a) "access is never denied when credits run out" describes the offer as sold
($100 first submittal plus 30 days of every product, no auto-charge, cut off at day 30), so unlimited builds inside the
30 days are the product, not a defect; the credit count is a display. (b) The on-account route is operator-only, so
the concurrency and enumeration points are low exposure; they still deserve the small fixes named.
Open for the owner to measure and fix: plus-addressed and password-sign-in claims (grants.js), the card after the
invoice is paid (webhook and on_account derivation), livemode assertion and D1-before-Stripe ordering, idempotency, and
the failure-path tests named at the end.

*   **Severity:** Note
    **File:** `weyland-platform-worker/src/routes/on-account.js:38-39`
    **Issue:** Authentication leaks route existence and relies solely on secret length for abuse prevention.
    **Trigger:** An attacker sending no secret header receives a 404 if the secret is unset, or a 401 if the secret is configured, allowing them to enumerate its presence. There are no rate limits. (The `secretEqual` function itself is constant-time).
    **Smallest fix:** Return 404 universally for unauthorized requests and apply `checkRateLimit()`.

*   **Severity:** Medium
    **File:** `weyland-platform-worker/src/routes/on-account.js:77-79`
    **Issue:** The on-account creation endpoint is not idempotent.
    **Trigger:** Two concurrent POST requests for the same email both see `waiting` as false, resulting in two Stripe customers, two Stripe invoices, and two held purchases.
    **Smallest fix:** Use a deterministic idempotency key for the Stripe API calls (e.g., hash of email + product + date) or enforce a unique index constraint in D1.

*   **Severity:** High
    **File:** `weyland-platform-worker/src/routes/on-account.js:93`, `weyland-platform-worker/src/lib/grants.js:40`
    **Issue:** Existing users signing in with a password cannot claim their on-account purchases, and email matching fails on plus-addressing. The 30-day window starts at claim, making the card UI ("On account <purchased_at>") confusing.
    **Trigger:** Operator buys for `existing@user.com`. User logs in via password. The purchase remains held because `emailVerified` is false and `in_` IDs are rejected by the checkout cookie regex. Or, operator buys for `john+1@example.com` and user logs in as `john@example.com`.
    **Smallest fix:** Assign `user_id` immediately in `on-account.js` if the user account is found instead of always holding it. Ensure emails are fully normalized before comparison.

*   **Severity:** Medium
    **File:** `weyland-platform-worker/src/lib/entitlements.js:145`
    **Issue:** The UI lies when the user pays the invoice. The `on_account` flag is derived purely from the `in_` prefix, and the webhook ignores invoice payments without subscriptions.
    **Trigger:** User pays the invoice via the Stripe hosted URL. The UI permanently displays "On account ... invoiced" instead of updating to "Paid".
    **Smallest fix:** Update the webhook to listen for invoice payment events and update the `checkout_session_id` to a non-`in_` value or add a `paid_at` column in `weyland_purchases`.

*   **Severity:** High
    **File:** `weyland-subx-worker/src/routes/subx-workspace.js:46-49, 87`
    **Issue:** Access is never denied when credits run out, older valid offers are ignored by the subquery, and rebuilding consumes a credit.
    **Trigger:** A user builds a package. `credits_used` hits its limit. They build again; `useOfferCredit` fails silently and returns false, which the route ignores, granting unlimited free builds. Rebuilding the exact same package consumes an extra credit.
    **Smallest fix:** Return a 402 if `!await useOfferCredit(...)`. Pass `sessionId` to make credit usage idempotent per package, and alter the subquery to find any offer with `credits_used < credits_total`.

*   **Severity:** High
    **File:** `weyland-platform-worker/src/routes/on-account.js:93`
    **Issue:** A failed D1 insertion leaves a stranded, finalized Stripe invoice with no database record. Livemode is not asserted.
    **Trigger:** Operator submits an order, Stripe's `/invoices/.../send` succeeds, but `recordPurchase` throws a database or network exception. The user is invoiced $100 but cannot claim access. A test environment key (`sk_test_`) could also accidentally create fake invoices.
    **Smallest fix:** Assert `env.STRIPE_SECRET_KEY.startsWith("sk_live_")`. Insert the `weyland_purchases` row with a `pending` status *before* finalizing the Stripe invoice, then update it to `held`.

*   **Severity:** Medium
    **File:** `weyland-platform-worker/src/routes/on-account.test.mjs`, `weyland-platform-worker/src/routes/offer.test.mjs`
    **Issue:** Tests only cover happy paths and do not verify critical failure states, race conditions, or database failures.
    **Trigger:** A developer introduces a regression in error handling, but the test suite passes.
    **Smallest fix:** Add these concrete test names: `concurrent on-account POSTs for the same email do not create duplicate invoices or held purchases`, `a D1 failure after sending the invoice returns 502 and does not leave a stranded invoice in Stripe`, `building a package out of credits denies access instead of merely stopping the count`, `rebuilding the same package does not consume a second credit`, and `a password sign-in can claim a held on-account purchase without needing an emailed code`.

review finished 2026-10-10T00:23:05-04:00

## Measured against the code (g056, cloud session, 2026-10-10)

Each finding was checked on main e293d1a/62c397f, then fixed with a test or answered here. The tests are in:
- `weyland-platform-worker/src/routes/on-account.test.mjs` (13 tests);
- `weyland-subx-worker/test/subx-workspace.test.mjs` (2 more).

Totals: the platform worker passes 125 of 125. SubX passes 196 of 197; the one failure is the renderer-bound generated-mark-scan test, which passes on the Mac.

1. **Route existence and rate limit (Note): fixed.**
   - A missing, short or wrong secret all answer 404, so the response no longer tells whether the secret is configured.
   - Requests are rate-limited to 10 a minute per IP (`checkRateLimit`). The eleventh is 404, even with the right secret.
   - Tests:
     - "no operator secret, a short one, a wrong one or none sent: 404 alike …"
     - "ten tries a minute from one address: the eleventh is 404 even with the right secret"
   - `tools/billing/on-account-order.mjs` reads a 404 as "the route is not there or the secret is wrong".
2. **Idempotency (Medium): fixed.**
   - The first write is a D1 reservation row keyed `onacct:<email>:<product>`. Its primary key makes it the one writer for that email. A concurrent POST gets 409 `in_progress`, and a later one gets the held order back (200, `existing`).
   - A reservation whose writer died is cleared after 5 minutes.
   - Stripe creates carry idempotency keys derived from the email and product: customer, invoice, item, finalize, send.
   - Tests:
     - "concurrent on-account POSTs for the same email do not create duplicate invoices or held purchases" (4 at once: one 201, one invoice, one row);
     - "a reservation left by a writer that died is cleared after five minutes; a fresh one answers in_progress".
3. **Claims by password sign-in and by plus address (High).**
   - **Password sign-in: real, fixed.** A held purchase made on account (an `in_` invoice id) names its customer by address. The account whose address is that address takes it at any sign-in, password or code (`lib/grants.js` `isOnAccountPurchase`, claim method `on_account_address`).
   - Every sign-in now looks for such purchases (`claimOnSignIn` no longer returns early without a code).
   - Sign-in finds the account whatever the address's case or stray spaces (`auth-session.js`; an exact match wins). The order's address is taken trimmed and lower-cased.
   - A card purchase held for an address still needs the emailed code or the paying browser. Someone may have typed another person's address at checkout, so that rule stays.
   - **Plus addresses: not a defect, and kept that way.** `john+1@…` and `john@…` are different addresses: a purchase for one is not taken by the other. The review's suggested "normalisation" would hand a purchase to a different inbox.
   - Tests:
     - "a password sign-in can claim a held on-account purchase without needing an emailed code, whatever the address's case or spaces";
     - "a plus-addressed order is claimed only by the exact plus address: not by the base address, even with a code";
     - "a card purchase held for an address still needs the emailed code or the paying browser (unchanged)".
   - **The 30 days start at the claim: as designed.** The window is the offer's 30 days of use. The card shows "On account <date>" for the invoice date and "Access until" for the window. Assigning `user_id` at order time instead was not needed once any sign-in claims.
4. **The card after the invoice is paid (Medium): fixed.**
   - `weyland_purchases.paid_at` is added; old tables get it via `ALTER … ADD COLUMN`.
   - The payment webhook's `invoice.paid` for an on-account invoice (an `in_` id with no subscription) stamps it with Stripe's `status_transitions.paid_at`. A redelivery changes nothing.
   - The access summary carries `first_submittal.paid_at`. The card reads "On account <date> · $100 invoiced" while unpaid, and "Paid <paid date> · $100" once paid.
   - Test: "when the invoice is paid, one invoice.paid webhook turns the card from On account to Paid; a redelivery changes nothing".
5. **Credits (High): not a defect for access; one part checked by a test.**
   - **Unlimited builds inside the 30 days:** this is the offer as sold ($100 first submittal plus 30 days of every product, no automatic charge, cut off at day 30). Returning 402 when the count is used up would sell less than was bought. The credit is the card's count (the Mac's reading (a)).
     - Test: "building a package past the credit inside the 30 days is still the offer (every product until day 30), not a denial". The credit is used up, output access is still paid via the offer, and it ends at day 30.
   - **A rebuild consuming a second credit:** the count is capped at the credits bought (1), so it cannot.
     - Test: "rebuilding the same package does not consume a second credit".
   - **Older valid offers ignored by the subquery:** an account has at most one granted offer. The card checkout and the on-account route both refuse a second one with 409 `offer_used`, so there is no older one to find.
6. **A D1 failure strands a sent invoice; livemode (High): fixed.**
   - The order of operations is now:
     1. the reservation;
     2. the Stripe customer, the draft invoice and its item;
     3. the D1 row becomes the invoice's row (status `pending`);
     4. only then is the invoice finalized and sent (status `held`).
   - A D1 failure before sending deletes the draft and the reservation, and answers 502 with `sent: false`.
   - A send failure after the record leaves the `pending` row: nobody can claim an unsent invoice. The next POST for the email finishes it without a second invoice.
   - Only `sk_live_` / `rk_live_` keys are accepted (otherwise 503 `not_live`, before Stripe). A draft that comes back with `livemode !== true` is deleted unsent.
   - Tests:
     - "a D1 failure after the invoice is drafted returns 502 and leaves no stranded invoice in Stripe: nothing is sent";
     - "sending fails after the record: 502 names the recorded invoice; the next POST for the email finishes it (no second invoice)";
     - "only live Stripe: a test key is refused before Stripe; a test-mode invoice is deleted unsent and leaves no row";
     - and in the main order test, "the purchase is recorded before Stripe finalizes the invoice", checked inside the finalize call.
7. **Failure-path tests (Medium): present.** Each named test, and where it is:
   - **concurrent POSTs:** as named.
   - **the D1 failure:** "after the invoice is drafted": the order changed, so no invoice is ever sent before the record exists.
   - **out of credits:** answered under 5, with the opposite assertion, because that is the offer.
   - **rebuilding:** as named.
   - **the password sign-in claim:** as named.

The 30-day everything rule of the offer is unchanged. `outputAccess` and the offer window are untouched.

The production record of Mobley Contracting (`in_1UOrBTLWTxUJi5AVJiJScQVc`, granted by an emailed code) is unaffected. Its card turns to Paid when that invoice is paid.
