// pages/progress.js
// Extracted verbatim (2026-09-08, Phase 1 modularization) from the inline
// `function serve_progress()` that lived inside the SovereignWeylandRoutes
// IIFE in weyland.worker.js (original lines ~167502-167510). No content or
// behavior change - same comment, same redirect target and status code.
export function serve_progress() {
  // Same truncation bug as careers/venturedeck/onboarding - real body
  // never existed past the nav. Not linked from any nav or other page
  // (grepped - only its own map registration references it), and no
  // real "sovereign work progress" log content exists anywhere to
  // reconstruct honestly. Send it to the real homepage instead of
  // rebuilding a page with fabricated status content.
  return Response.redirect("https://weylandai.com/", 302);
}
