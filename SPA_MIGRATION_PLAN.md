# weylandai.com → SkeletonKing-v2 SPA migration plan

**Date**: 2026-10-03
**Status**: Real plan + a real, tested, committed first slice of actual client-side routing (not a visual-only header patch). Deploy of that first slice is currently blocked on an invalid Cloudflare API credential in this shell's environment — see "Execution status" at the bottom. Everything else below is scoping for the rest of the migration.

This replaces the whack-a-mole pattern (two separate "fix the nav on all 18 pages" passes today, both incomplete) with a structural fix: wire weylandai.com's real pages through the same real SPA router mechanism already proven live on filmline.cc and bloomagi.cc, not another round of making every page's own static header markup look the same.

---

## 0. The real shell mechanism (read in full from skeletonking-v2.js, 953 lines)

SkeletonKing v2 (`/Users/johnmobley/nginx/workers/venture-fleet/src/lib/skeletonking-v2.js`) is **not** a config-object/template-registry system. Concretely:

- **Routing is 4 hardcoded paths**, not a registrable route table: `resolvePage()` is an if-chain for exactly `/`, `/pricing`, `/product`, `/login`, else 404. There is no mechanism today for a venture to register a 5th, 6th, 36th page — every additional page type requires a new `if` branch and a new page-builder function hand-written into the shared file.
- **The real, reusable part is the mechanism, not the route list**: a persistent shell (`shellHeader`/`shellFooter`/`shellCss`, rendered into every response) wraps a swappable `<main id="sk-outlet">`. A same-origin click on `[data-sk-link]` is intercepted by `shellRouterJs`, which fetches the *same URL* with an `X-Skeletonking-Route: fragment` request header; the server answers with `{title, meta, html, script}` JSON instead of a full document; `script` is re-injected via a freshly-created `<script>` element (never `innerHTML`, which silently drops `<script>` tags) so each route's interactive JS rewires itself identically on first load or a client-routed swap; real `history.pushState`/`popstate` make back/forward work. Every route is *also* independently loadable as a full document (progressive enhancement — direct-load, crawlers, no-JS all still work).
- **Checkout is a single hardcoded SKU per venture**: `/api/_shell/checkout` takes no parameters from the client at all — it reads `venture.monetization.price_id`, one Pro-tier price, and proxies to `https://vendyai.com/api/checkout/sessions`. No concept of multiple SKUs/seats per venture exists yet.
- **Auth is AuthFor-backed, token-in-localStorage**, via `/api/_shell/auth/{login,register,verify}` proxies — a different mechanism from weylandai.com's own already-live, already-working cookie-session AuthFor integration (`weyland_session` cookie + D1 `weyland_sessions` table, `src/lib/auth.js`).
- **Consumers**: exactly 2 ventures, `filmline.cc` and `bloomagi.cc`, both inside the shared `mobley-venture-fleet-a` Worker, both single-page-per-concept ventures reading from one shared `VENTURES` object populated from `ventures.json`.

**Why weylandai.com can't just be "added to the Set"**: weylandai.com is not a venture-fleet tenant — it's its own dedicated, much larger Worker (`weylandai-com-worker`, `wrangler.toml` `main = weyland.worker.js`, bundled by esbuild from `src/worker-entry.js`) with its own D1 database (86 tables), R2, KV, Durable Objects (`SightXRoom`), and 36+ genuinely distinct real pages — nothing like the single-row `ventures.json` entries filmline.cc/bloomagi.cc are. The right move is **porting the mechanism** (persistent shell + fragment-JSON router + script re-injection) into weylandai.com's own codebase, generalized to an arbitrary route count — which is itself a legitimate, shared-platform-grade generalization that should eventually fold back into skeletonking-v2.js so any future venture with more than 4 real pages benefits, not a WeylandAI-only fork.

---

## 1. Complete real route inventory (from the live dispatch table)

The authoritative route table is `SovereignWeylandRoutes.dispatch()`'s `map` object in `src/lib/marketing-pages.js` (confirmed by reading `src/lib/weyland-entry.js`: `SovereignWeylandRoutes.dispatch(url.pathname)` is the real call site for every GET/HEAD that isn't `/api/*`). `weyland.worker.js` itself is a 7.5MB **bundled build output** (esbuild, `npm run build`), not hand-edited source — all real edits happen in `src/`.

| Route | Handler | Real embedded functionality | Risk class |
|---|---|---|---|
| `/` (and `whyweyland`) | `serve_whyweyland` | none — pure comparison-matrix content | **content-only** |
| `/pricing` | `serve_pricing` | **real multi-SKU Stripe checkout** (`POST /api/billing/checkout/create`, `product_id`+`quantity`, direct Stripe key — see §3) | **checkout-bearing** |
| `/subscribe` | `serve_subscribe` | SubConP seat checkout (`assets/subscribe.js`, VendyAI-fronted per its own copy) | **checkout-bearing** |
| `/huntx` | `serve_huntx` | live opportunity feed (`/api/hunt/opportunities`, `/api/hunt/refresh`) | functional, no checkout |
| `/subx` | `serve_subx` | marketing page only, links into the real app | content-only |
| `/subx-app` | `serve_subx_app` | **the real, session-bearing SubX workspace** — `/api/hardware-schedule/{start,session/:id}`, `/api/sessions` — cookie-auth-gated | **highest-risk, auth-bearing** |
| `/takeoffx`, `/propx` | `serve_takeoffx`, `serve_propx` | marketing pages, no inline fetch calls found | content-only |
| `/marketx`, `/pricex`, `/compx`, `/geox`, `/forecastx`, `/weatherx` | `serve_*` | live calculators/lookups against real external data (Census, NWS, TXDOT) via dedicated `/api/*` endpoints; standalone-seat upsell CTA (`mailto:`, no in-page checkout) | functional, no checkout |
| `/lienx`, `/bidx`, `/coa` | `serve_lienx`, `serve_bidx`, `serve_coa` | real document-generation (`/api/lien-waivers/generate`, `/api/bid-packages/generate`, `/api/coa-packages/generate`) | functional, no checkout |
| `/inspecx`, `/safetyx`, `/survx`, `/specx`, `/drawx`, `/asbuiltx` | `serve_*` | real `/api/*/analyze` calls (vision/analysis pipelines) | functional, no checkout |
| `/leadx` | `serve_leadx` | `/api/leads/{criteria,qualify}` | functional, no checkout |
| `/rfax`, `/changeordx`, `/permitx`, `/closex`, `/notesx` | `serve_*` | content-only per the earlier nav-sweep (no fetch calls found) | content-only |
| `/careers`, `/investors`, `/qtext`, `/financials` | `serve_*` | content-only | content-only |
| `/venturedeck` (`/deck`) | `serve_venturedeck` | 302 redirect to `deck.weyland.onamerica.org` | redirect, not a real page |
| `/onboarding`, `/progress` | imported from `pages/*.js` | redirects per nav-sweep | redirect |
| `/cutsheetx` | `serve_cutsheetx` | 302 redirect to `/pricing` | redirect |
| `/sightx`, `/meetingx`, `/sightx/*.json` | `serve_sightx`, `serve_meetingx`, manifest routes | **full-bleed custom WebGL/WebSocket apps** — see §4 | **exempt, stays outside the shell** |

This reconciles with the nav-sweep agent's handoff (23 pages on the canonical `renderNav()`-generated header, 9 on an older/inconsistent header — pricing, subscribe, qtext, marketx, pricex, compx, geox, forecastx, weatherx) — but it's important to be precise about what "canonical header" meant there: `renderNav()` (confirmed directly, `src/lib/marketing-pages.js:41`) is a **shared link-list generator**, not a router. Every page using it still does a full server round-trip and full-document reload on every nav click — "canonical header" fixed *link consistency*, not *navigation*. That's the real distinction this migration closes.

---

## 2. Classification: content-only vs. real-functionality pages

- **Content-only (safe to migrate purely on markup/shell, no backend risk)**: `/`, `/whyweyland`, `/takeoffx`, `/propx`, `/careers`, `/investors`, `/qtext`, `/financials`, `/rfax`, `/changeordx`, `/permitx`, `/closex`, `/notesx`, `/subx` (marketing page).
- **Real embedded functionality, no payment (migrate carefully — preserve the page's own `<script>`/fetch calls via the fragment's `script` field, don't rewrite the API contract)**: `/huntx`, `/marketx`, `/pricex`, `/compx`, `/geox`, `/forecastx`, `/weatherx`, `/lienx`, `/bidx`, `/coa`, `/inspecx`, `/safetyx`, `/survx`, `/specx`, `/drawx`, `/asbuiltx`, `/leadx`.
- **Checkout-bearing (migrate last, highest care)**: `/pricing` (direct Stripe, multi-SKU), `/subscribe` (SubConP seat checkout).
- **Auth-bearing, session-critical (migrate last of all, or not at all until the shell's auth model is reconciled with weylandai's own)**: `/subx-app` — the real paid workspace, cookie-session-gated, with its own D1-backed session table. This should **not** be forced onto the shell's separate AuthFor-token-in-localStorage convention; weylandai.com's existing cookie-session AuthFor integration is already real and live and should be kept as-is (see §3).
- **Exempt, not part of this migration**: `/sightx`, `/meetingx` (see §4).
- **Redirects**: `/venturedeck`, `/onboarding`, `/progress`, `/cutsheetx` — not real pages, nothing to migrate.

---

## 3. What SkeletonKing v2 itself needs, for this migration to be more than a one-off port

1. **A real, registrable N-route table**, not 4 hardcoded `if` branches. The shell's actual reusable value (persistent header + fragment router + script re-injection) should be factored so a venture can hand it `{ "/path": buildFn, ... }` instead of requiring a hand-edited `resolvePage()`. This benefits any future venture — including filmline.cc/bloomagi.cc themselves — that outgrows 4 pages, not just WeylandAI.
2. **Multi-SKU checkout**, not a single hardcoded `venture.monetization.price_id`. WeylandAI's `/pricing` alone needs per-seat checkout for ~10 distinct product SKUs (`weatherx-seat`, `forecastx-seat`, `geox-seat`, etc., real `product_id`s already defined in `src/routes/billing.js`'s `WEYLAND_PRODUCTS`). `/api/_shell/checkout` needs to accept a `product_id`/`price_id` parameter and look it up per-venture instead of assuming one Pro tier. This is a genuine shared-platform improvement: any future multi-tier venture gets it too.
3. **A real finding, stated plainly**: skeletonking-v2.js's own header comment says outright that "WeylandAI... held its own direct Stripe key" rather than going through VendyAI like every v2-shell venture does. Confirmed directly: `src/lib/stripe-billing.js` calls `api.stripe.com/v1` with `env2.STRIPE_SECRET_KEY` — a direct Stripe secret, not a VendyAI proxy. Moving `/pricing` and `/subscribe` onto VendyAI-proxied checkout (matching the shell's security model, zero Stripe key in the venture's own Worker) would be a real, valuable improvement — but it's a **payment-plumbing change**, independent of and riskier than the SPA-shell visual/nav port, and should be sequenced as its own deliberate, separately-tested pass, never bundled silently into a nav migration.
4. **Auth is NOT something to port for weylandai.com** — the shell's token-in-localStorage AuthFor proxy is a good *default for ventures with no existing auth*. WeylandAI already has a real, live, working cookie-session AuthFor integration (`src/lib/auth.js`, `src/lib/authfor-client.js`, `weyland_session` cookie, D1-backed). Switching `/subx-app` to the shell's different auth convention during a nav migration would be a gratuitous, high-risk change with no real benefit — keep weylandai's own auth mechanism; only adopt the shell's *routing* pattern.

---

## 4. SightX and MeetingX: confirmed exempt, stay outside the shell

Both are legitimate full-bleed custom applications, not marketing/content pages, confirmed directly:
- `serve_sightx` renders a dedicated WebGL experience (`assets/sightx-ingest.js`, `assets/sightx-experience.js`, `assets/sightx-reconstruction.js`, `assets/engine3d/three.module.min.js` — a 674KB real Three.js build) plus a Durable-Object-backed multiplayer room (`SightXRoom`, real WebSocket upgrade handling in `weyland-entry.js`) for live collaborative walkthroughs.
- `serve_meetingx` is the real-time collaboration counterpart, same WebSocket room infrastructure.

Neither fits inside a `<main id="sk-outlet">` swap target or a CSP-safe inline-script shell — they need their own full document, their own canvas, their own WebSocket upgrade path before any shell chrome could even attach. They should link **into** the shell's nav (a plain `<a href="/sightx">` — no `data-sk-link`, so clicking it always does a real full navigation, which is correct and desired) and link back **out** to `/` via a normal anchor on their own page chrome. No shell integration is needed or appropriate.

---

## 5. Migration sequence

1. **Done, this pass**: `/` ↔ `/pricing` — see "Execution status" below. Proves the real router end-to-end (fragment JSON contract, script re-injection, history nav) on the two highest-nav-visibility pages, including one checkout-bearing page, without touching the checkout backend.
2. **Next (content-only, zero backend risk)**: `/takeoffx`, `/propx`, `/careers`, `/investors`, `/qtext`, `/financials`, `/rfax`, `/changeordx`, `/permitx`, `/closex`, `/notesx`, `/subx`. Same mechanical pattern as this pass's §6 edits (wrap in `<main id="sk-outlet">`, append `skRouterScriptTag()`, add `isFragment` branch) — no script-extraction complexity since none of these have inline `<script>` blocks to preserve.
3. **Then (real functionality, no checkout)**: `/huntx`, `/marketx`, `/pricex`, `/compx`, `/geox`, `/forecastx`, `/weatherx`, `/lienx`, `/bidx`, `/coa`, `/inspecx`, `/safetyx`, `/survx`, `/specx`, `/drawx`, `/asbuiltx`, `/leadx`. Same mechanical pattern, but each one's inline `<script>` (the real `/api/*` fetch wiring) must be extracted via `extractOutletFragment()` exactly as done for `/pricing` this pass — copy the pattern, never re-derive the API contract by hand.
4. **Then, deliberately separate from nav work**: build multi-SKU support into `/api/_shell/checkout`-equivalent machinery (or keep `/api/billing/checkout/create` as-is and just wrap `/pricing`'s existing script, which this pass already did — multi-SKU checkout only becomes a blocker if WeylandAI tries to adopt the *shell's own* checkout proxy instead of keeping its own working one).
5. **Last, separately reviewed**: `/subscribe` (SubConP seat checkout) and the Stripe-key-to-VendyAI migration from §3.3, if John decides that's worth doing — not required for the SPA-nav migration itself.
6. **Never in scope for this migration**: `/subx-app` onto a different auth mechanism; `/sightx`, `/meetingx` into the shell at all.

---

## 6. Execution status — real first slice implemented, tested, committed; deploy blocked on credentials

Implemented for real (not scaffolded): `/` and `/pricing` now support both response modes through the actual fragment-JSON router contract, using the exact mechanism described in §0, ported rather than reinvented.

**Files**:
- `src/lib/sk-router.js` (new) — `skRouterScriptTag()` (the client router: `data-sk-link` click interception, `X-Skeletonking-Route: fragment` fetch, JSON swap into `#sk-outlet`, script re-injection via a real `<script>` element, `history.pushState`/`popstate`) and `extractOutletFragment()` (derives `{title, meta, html, script}` from the *same* full-document HTML string the non-fragment path renders, via `<main id="sk-outlet">` markers — no separate hand-maintained content copy to drift out of sync with the real page).
- `src/lib/marketing-pages.js` — `serve_whyweyland`/`serve_pricing` now take an `isFragment` argument and branch; `renderNav()`'s shared link markup gets `data-sk-link` site-wide (safe no-op on every not-yet-migrated route — the router's own fallback to `window.location.href` when a response doesn't carry the fragment header handles that gracefully, confirmed by testing `/huntx` under a fragment request below). Pricing's real checkout script (`fetch('/api/billing/checkout/create', ...)`, unchanged byte-for-byte) is extracted into the fragment's `script` field rather than rewritten.
- `src/lib/weyland-entry.js` — threads the `X-Skeletonking-Route: fragment` flag into `dispatch()`, and skips the `MASCOM_EDGE` home-page cache shortcut specifically for fragment requests (so the `/` ← `/pricing` direction doesn't silently degrade to a full reload because the edge cache doesn't know the fragment contract).

**Verified locally before committing** (direct `node` invocation of `SovereignWeylandRoutes.dispatch()`, both arguments):
- `/` full document: contains `<main id="sk-outlet">`, the router script, and `data-sk-link` on the "SEE FULL PRICING" CTA.
- `/` fragment: correct JSON, content has no stray `<html>` wrapper, empty `script` (home has no inline JS, correctly).
- `/pricing` full document: `<main id="sk-outlet">` present, checkout fetch call intact, `data-sk-link` on the home-brand link.
- `/pricing` fragment: correct JSON; `script` field contains the real `moneyFormatter`/checkout-fetch JS; `html` field has **no** leftover `<script>` tag (correctly extracted).
- `/huntx` (unmigrated route) under both a normal request and a fragment request: unaffected, status 200, no `X-Skeletonking-Route` header on the fragment request — confirming the client router's fallback-to-full-navigation path is exactly what fires for it, not a crash or a broken partial response.
- Unknown route: `dispatch()` still correctly returns `null`.
- `node --check` passed on all three edited/new files; `npm run build` (esbuild) rebuilt `weyland.worker.js` cleanly with the new code present (`grep` confirmed 12 occurrences of the new markers in the bundle).

**Committed**: `8ecccdf` on `main` — `src/lib/sk-router.js`, `src/lib/marketing-pages.js`, `src/lib/weyland-entry.js`, `weyland.worker.js`.

**Deploy attempted, blocked**: `./safe-deploy.sh` (this repo's real pre/post-deploy safety wrapper) passed every pre-deploy check (clean scoped tree, all required bindings present) but `wrangler deploy` itself failed Cloudflare authentication for the target account (`f07be5f84583d0d100b05aeeae56870b`) with every credential combination tried in this shell session:
- The ambient `CF_API_KEY` (no matching `CF_EMAIL`) — `Unknown X-Auth-Key or X-Auth-Email [9103]`, the known stray-env-var hazard.
- `CF_API_KEY`+`CF_EMAIL` freshly re-derived via `secretctl.py export-shell` — same account, different error: `Authentication failed [9106]`.
- `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ACCOUNT_ID` (the pair that does match `wrangler.toml`'s `account_id`) — `Invalid access token [9109]`, i.e. Cloudflare's own API is rejecting this specific token as invalid, not a local formatting issue (checked: no stray whitespace, no stray quote characters, clean charset).

This is a credential-rotation gap outside what I can self-service (I cannot mint or rotate a Cloudflare API token). **A mid-flight, unrelated concurrent edit was also found and avoided**: another in-progress session's uncommitted SightX color-scheme changes (`assets/sightx-controls.js`, `src/pages/sightx.html`) got pulled into one `npm run build` rebuild attempt; caught before deploying by diffing `weyland.worker.js` against the commit, and `weyland.worker.js` was restored via `git checkout --` to the exact committed, tested bundle before any further deploy attempt — the concurrent session's in-progress work was never touched or disturbed.

**Next step**: once a valid `CLOUDFLARE_API_TOKEN` (or `CF_API_KEY`+`CF_EMAIL` pair) for account `f07be5f84583d0d100b05aeeae56870b` is available, re-run `cd /Users/johnmobley/weylandai.com && ./safe-deploy.sh` (no rebuild needed — commit `8ecccdf`'s `weyland.worker.js` is already the correct, tested bundle) and verify live: `curl -s https://weylandai.com/pricing -H "X-Skeletonking-Route: fragment"` should return the fragment JSON, and a browser click-through from `/` to `/pricing` and back should show no full-page reload and working browser back/forward.
