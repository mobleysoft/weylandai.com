// src/lib/html-format.js
//
// Tiny, pure, dependency-free HTML/date formatting helpers. Extracted
// 2026-09-10 from legacy-monolith.js (previously defined inline around
// line 144065-144081) - real fan-out beyond just the quote-html
// templating code (confirmed via grep: esc() and fmtDate() are each
// called from multiple unrelated places in legacy-monolith.js, not just
// the quote/proposal generator), so this is a genuinely shared utility
// module, not something private to one vertical.

/** Formats an ISO date string as "Month D, YYYY", or an em dash if absent/invalid. */
export function fmtDate(isoDate) {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(isoDate);
  }
}

/** HTML-escapes a value for safe interpolation into a template string. */
export function esc(str) {
  if (str == null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
