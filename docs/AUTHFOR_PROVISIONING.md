# AuthFor provisioning and the October 23 cutoff

This code supports confidential server-side provisioning. It does not create a
client, configure credentials, execute M02 migration, or change the cutoff.
The fixed cutoff is `2026-10-23T00:00:00Z` (October 22 at 8 p.m. EDT).

## Supported client registration

Use AuthFor's existing API, never write an `oauth_client:` record directly.

1. Sign in to an existing AuthFor administrator account, completing MFA if
   enabled. Use its first-party account access token. An OAuth profile token,
   Weyland operator token, guest token, or caller-supplied role cannot authorize
   client registration. The endpoint checks the durable account's `role: admin`.
2. `GET https://authfor.com/api/v1/admin/oauth-clients` with that Bearer token
   inventories existing clients. The companion AuthFor change adds the public
   `provision` boolean to this admin-only listing. It never exposes secret hashes
   or credentials. Check existing private credential records before creating a
   duplicate client; the listing cannot recover a lost client secret.
3. If no usable client exists, deliberately call
   `POST https://authfor.com/api/v1/admin/oauth-clients` with the same token and:

   ```json
   {"name":"WeylandAI server provisioning","redirect_uris":["https://weylandai.com/login"],"provision":true}
   ```

   A nonempty registered HTTPS redirect list is required by this existing API,
   including for provisioning. It is not used by `/api/v1/register`. The response
   supplies a generated `client_id` and one-time `client_secret`; capture them
   directly into private credential storage without terminal/session output.
4. Configure both server bindings below with the captured values. Verify presence
   and names privately. Never put either credential in frontend assets, repository
   files, `wrangler.toml` values, user replies, logs, or test evidence.

AuthFor stores the client under `oauth_client:<client_id>` in its consistent
AuthState store, with legacy KV fallback until M02 completion. Its schema is:

```text
client_id, name, redirect_uris[], secret_hash, secret_salt,
created_at, created_by, provision: true
```

It stores no plaintext secret. Registration requires both supplied credentials
and `provision:true`. This capability is currently account-creation authority,
not a venture restriction enforced by AuthFor. Use it only in trusted server code.

## Bindings and route owners

Both worker owners require the same exact secret binding names:

| Worker | Secret binding names | Callers |
| --- | --- | --- |
| `weyland-platform-worker` | `AUTHFOR_PROVISION_CLIENT_ID`, `AUTHFOR_PROVISION_CLIENT_SECRET` | Production `/api/webhooks/subscription*`, reconciliation and polling |
| `weylandai-com-worker` | `AUTHFOR_PROVISION_CLIENT_ID`, `AUTHFOR_PROVISION_CLIENT_SECRET` | `/api/access/requests/:id/approve`; monolith webhook fallback |

AuthFor itself already has confidential client support. These bindings belong to
the consumers, not `authfor-gateway-worker`. No new service binding or migration
secret is required for provisioning.

`weyland-shared/authfor-provisioning.js` sends credentials server to server. When
both bindings are absent it preserves the existing anonymous grace-period call;
AuthFor remains the authority for the cutoff. Partial/empty configuration fails
closed. A 202, rejection, missing real identity/session, or unavailable service
never creates a local checkout account/session. Its paid receipt remains pending,
dedupe keys are released, and delivery returns 503. Redelivery, reconciliation,
the existing sweep, or a later paying-browser poll can retry. A buyer who instead
signs in enters the existing held-purchase inbox-proof claim path.

The monolith retains its one POST webhook route and its injected signature
verifiers, while delegating receipt/grant processing to the canonical platform
handler and catalogue. Current and older vendyai forward shapes and direct
Stripe signatures are tested. Missing/unknown product metadata grants nothing.

## Guest signup and release order

The homepage preserves immediate guest upgrade during the grace period. When
AuthFor answers `202 EMAIL_CODE_REQUIRED`, it sends a code with purpose `verify`,
shows an inline code field, and repeats the upgrade with
`email_code: {token, code}`. Both actual proxy implementations forward that proof
and preserve 202. The chosen password, guest token, page and matches stay intact.
The shared SDK's `register` also accepts an optional fourth `emailCode` argument.

Review/configure the client, release the Weyland platform code and frontend, and
intentionally release the monolith invite guard/wiring before the deadline.
Release AuthFor's guest-upgrade gate and admin listing support with its safe
deployment wrapper. The gate shares the existing grace period; inbox proof is
required at and after the cutoff. Test rejection/retry and proof flows before
declaring production readiness. The accepted tests use disposable offline fixtures;
they do not prove a live confidential connection or email delivery.

M02 migration and N02 legacy receiver/cutover review remain separate operational
gates. This change does not run them or broaden their authority.
