// weyland-market-intelligence-worker/src/lib/json-response.js
//
// Intentional self-contained fork of ../../../src/lib/json-response.js
// (the main weylandai.com monolith's jsonResponse3 helper), byte-identical
// to the version market-intelligence.js was extracted alongside. This
// Worker is deployed independently of the monolith (its own wrangler.toml,
// its own `wrangler deploy`), so it does not import across the deploy
// boundary into src/lib/ the way in-monolith route modules do - same
// self-containment precedent as ocr-worker (its own package.json, zero
// imports back into the main src/ tree). If the monolith's copy of this
// function is ever renamed/changed, this copy does not follow
// automatically - that's the accepted tradeoff of a real service boundary,
// not an oversight.

export function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
