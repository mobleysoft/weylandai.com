# WeylandAI — Launch Description

Written 2026-10-02, grounded against the live product (weylandai.com) and the
verified fact base in `PRODUCTHUNT_FACT_BASE.md` (compiled 2026-10-01 from
direct code reads and live endpoint checks, not marketing copy). This is the
external-facing one-paragraph description; it is deliberately narrower than
the full product suite so every sentence stays checkable against what is
actually live today.

## The paragraph (for Product Hunt / external listings)

> WeylandAI is a submittal-and-takeoff automation suite for construction
> subcontractors, built around a citation-grounded matching engine instead of
> a generic LLM wrapper: TakeoffX quantifies a drawing set, SubX extracts the
> hardware and submittal requirements, and CutsheetX matches every line item
> against a real manufacturer catalogue (60,000+ priced parts) so every match
> traces back to an actual cut sheet, not a hallucinated guess. It's built for
> subcontractors and GCs who currently spend hours per project hand-assembling
> submittal packages. The fastest way to judge it: go to weylandai.com and use
> it immediately, no signup required — every visitor lands in a live,
> pre-loaded demo project ("The WeylandAI Building") running the real SubX
> extraction-and-matching workflow against a real architectural door schedule,
> not a canned screenshot.

## Why this wording and not something broader

- **Leads with SubX/TakeoffX/CutsheetX only.** Those three are the most
  concretely verified products in the fact base (CutsheetX's catalog and
  SubX's real paying customer are independently confirmed; TakeoffX has a
  real backend per code but wasn't independently route-tested in the last
  audit pass). PropX, HuntX, MeetingX, and SightX are real and live but are
  deliberately left out of the single launch paragraph rather than listed
  as equally-proven — they're linked from the site itself for anyone who
  explores further.
- **"Citation-grounded matching" / "traces back to an actual cut sheet"** is
  the real mechanic, not marketing flourish: CutsheetX's matching runs
  against a genuine Cloudflare D1-backed hardware pricing catalog (not a
  demo dataset — see the fact base's seeded-pricing commit history), and the
  deterministic price-matrix extraction (shipped this session, see git log
  "Fix multi-finish price-matrix extraction") replaced an earlier
  LLM-per-row approach specifically to make matches traceable and
  deterministic rather than generative.
- **"No signup required" is verified live, today**: `weylandai.com/` serves
  real SubX extraction UI directly in the hero with no login wall, backed by
  a real demo project and real matched hardware data — confirmed by direct
  inspection of the live homepage during this session, not asserted from
  memory.
- **No customer-count or revenue claim is made.** The fact base documents one
  real, dated paid SOW (PrecisionAutoDoors, confirmed via a real email,
  2026-06-02) but explicitly flags that "active customer today" would need a
  fresh Stripe check that hasn't been done — so this description avoids
  present-tense customer claims entirely rather than repeat an unverified
  one.
- **No AI-model claim is made** (e.g. "runs its own AI") because the fact
  base marks that as verified only for the catalogue-extraction pipeline
  specifically, not the whole product, and this paragraph doesn't need it to
  be compelling.

## One-line variant (if a shorter hook is needed)

> Submittal and takeoff automation for construction subcontractors, with
> catalogue-matched (not hallucinated) hardware pricing — try the real demo
> at weylandai.com, no signup required.
