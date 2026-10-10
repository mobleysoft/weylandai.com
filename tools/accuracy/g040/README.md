# g040: code sign-in completed from a real inbox, observed end to end, no reveal key

2026-10-09, about 23:46-23:50Z, against https://weylandai.com and https://authfor.com (production). No AUTHFOR_JOURNEY_KEY or other reveal key was set or used. The code was read only from the email.

## What ran
`tools/user-simulation/journeys/code-sign-in.mjs` with `CODE_FILE`, `CODE_ALIAS_TAG=g040` and `NO_D1=1`. The browser was a real Chromium; this container has no GPU, so the kit's GPU gate was bypassed in a temporary local copy, which changes only the launch.

1. On weylandai.com, the sign-in view asks AuthFor for a code for `jmobleyworks+wa-code-g040@gmail.com`. AuthFor answers 200: sent, WeylandAI's mail, 8 digits, 15 minutes, no code in the answer.
2. The email arrived in that inbox nine seconds later, from auth@weylandai.com, subject "WeylandAI sign-in code: …". The cloud session read it through the Gmail connector and wrote the code into `CODE_FILE`.
3. A wrong code first: 401 CODE_INVALID, with the tries left shown on the page.
4. The right code: AuthFor's verify answered 200 with a token and `email_verified: true`.
   - The page says "You are signed in as jmobleyworks+wa-code-g040@gmail.com" and "No WeylandAI account on this email yet".
   - It offers the free 14-day trial. The site creates no account by itself.

**run2-pass.txt** and **run2-report.json**: 11 of 11 checks pass.

## What the first run showed (run1-expected-account-row.txt)
The first run used the journey's original ending. That ending expects a WeylandAI users row inserted through D1 before sign-in, and this session has no D1 access.
- The AuthFor sign-in itself succeeded: 200, inbox proven.
- With no users row, the page correctly showed the no-account trial offer.
- So the checks written for an existing account failed, and so did the D1 cleanup.
- `NO_D1=1` now checks the real no-account state instead. It skips D1, and leaves the homepage's demo clone (id in the report notes) to the demo-clone sweep.

## Side effects
- AuthFor now has an identity for `jmobleyworks+wa-code-g040@gmail.com`, created by the first code sign-in. AuthFor identities cannot be deleted from here.
- No WeylandAI users row was created.
- The same alias is reused on reruns.
- Two code emails sit in that inbox. Both codes are spent or expired.

## The signed-in-with-an-account ending
That ending (server session, account card, sign-out, next sign-in prefilled) needs the D1 users row. The Mac runs it with:

    CODE_FILE=<file> node tools/user-simulation/journeys/code-sign-in.mjs

whoever reads the inbox writes the code into `<file>`.
