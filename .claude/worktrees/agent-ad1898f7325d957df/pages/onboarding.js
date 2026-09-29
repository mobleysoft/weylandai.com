// pages/onboarding.js
// Extracted verbatim (2026-09-08, Phase 1 modularization) from the inline
// `function serve_onboarding()` that lived inside the SovereignWeylandRoutes
// IIFE in weyland.worker.js (original lines ~165588-165597). No content or
// behavior change - same comment, same redirect target and status code.
export function serve_onboarding() {
  // Same truncation bug as careers/venturedeck - this function's real
  // body never existed past the nav. Its CSS (bundle-box, slider-box,
  // alacarte-grid) duplicates the real commercial content that already
  // lives on /pricing (fixed earlier this session to stop selling the
  // wrong SKU) - rebuilding a second, parallel checkout surface here
  // risks the exact same drift bug recurring. Send users straight to
  // the one real, working checkout instead.
  return Response.redirect("https://weylandai.com/subscribe", 302);
}
