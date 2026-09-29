// src/lib/json-response.js
//
// jsonResponse3 - the JSON response wrapper used by nearly every route in
// weyland.worker.js (hundreds of call sites; the exact count wasn't
// re-verified in this pass since this file's only job is to give the two
// modules extracted in this phase - lib/auth.js and
// routes/document-generators.js - something explicit to import instead of
// reaching for an ambient module-level function).
//
// Extracted verbatim from the bundle (original name `jsonResponse3` kept
// so it's a drop-in for every existing call site; a rename to
// `jsonResponse` is real but separate cleanup, not attempted here).
// esbuild's cosmetic `__name(jsonResponse3, "jsonResponse")` call dropped -
// see src/README.md for why the other extracted modules do the same.
//
// This is a smaller, more mechanical extraction than the two the current
// phase was scoped to (lib/auth.js, routes/document-generators.js) - it
// exists only because both of those genuinely need it and duplicating a
// live function three ways (here x2 and the still-inline monolith copy)
// would be worse than a five-line file. The rest of the lib/ layer
// proposed in WORKER_MODULARIZATION_MAP.md §5 (cors.js, r2.js, stripe.js,
// etc.) is out of scope for this phase.

export function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
