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
