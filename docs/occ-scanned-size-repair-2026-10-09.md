# OCC scanned schedule repair — 2026-10-09

## Result and scope

The Letter scan takes the legacy deterministic grid branch, rather than the large-sheet OCR-line branch. Its 150 DPI rule centers were scaled into a 1200 DPI table image without refining their positions. Several centers were 2–8 pixels away from the actual rule, clipping text and changing the row read.

This change refines each known horizontal rule against the actual text-sized bitmap within a bounded search, never beyond half its neighboring row gap. It keeps the same table, column mapping and physical row provenance. Colored annotations are removed after initial layout detection and before refinement. Removing them before initial detection was tested and rejected because the table became incomplete.

Dimension rereads add fixed threshold, trimmed-text and 40/48-pixel crop views. Only actual recognizer text with a valid physical format can vote. Two agreeing parsed values are required; conflicting weak values abstain. Confidence remains the measured minimum of supporting reads, including zero from numeric whitelist views. Plain inches require a physically valid width/height pair, preventing a lost feet delimiter in an impossible height from approving a spurious width. No expected mark, dimension, row count or fixture-specific correction enters recognition.

All application, runner and nested module cache references advance to `20261009g019r3`. The source and served grid module are byte-identical.

## Same-source comparison

The local source PDF SHA-256 is `fb3e0a8137da6cdf789eb29c85ffdd8343ab6d07f7d6d47a960359111529be82`. It has one sideways Letter page and no extractable text. Truth is the existing `tools/corpus/expected/occ-a-801-door-schedule.json`. Its 42 rows × 6 compared fields give a full denominator of **252**, including missing rows.

| Reader | Exact marks | False extras | Correct numeric size pairs | Correct fields / full expected denominator |
|---|---:|---:|---:|---:|
| Historical 2026-10-09 06:48 receipt | 41/42 | 1 (`1423`) | 38/42 | 239/252 (94.8%) |
| Deployed r2, fresh owned upload/read | 41/42 | 1 (`1423`) | 35/42 | 236/252 (93.7%) |
| This r3 code, three independent local browser reads | 42/42 | 0 | 41/42 | 245/252 (97.2%) |

The old harness's 97.2% score excludes missing rows from its denominator (239/246). It is not equivalent to the full-denominator result above.

R3 restores heights for 147A, 242 and 246, and also recovers width138 and previously unread heights244/245. All 41 returned numeric pairs agree with truth. Door143 is recovered as the correct mark, but its dimensions abstain because colored revision markup obscures the glyphs and rereads conflict. Remaining field discrepancies are hardware143 (`a9` versus09), types139/147A (`Cc` versusC) and227 (`R` versusB), and fire235 (`2U MIN.` versus20MIN.). These seven fields remain an accuracy gap.

**Trusted size count remains 0/42.** All41 numeric widths and39 numeric heights are below0.8 recognizer confidence. The values remain available for review, and the existing confidence exclusion stays in force. This release does not claim that low-confidence sizes are independently validated or that all customer documents are accurate.

## Verification

- Worker tests: **134/134**; DOM tests: **8/8**.
- Actual bitmap regression tests cover offset/thick rule centers, short text remaining distinct from rulings, neighboring band limits and nonfinite search windows.
- Dimension regressions cover varied feet/inch values and fractions, semantic disagreement, weak conflicting values, physical paired-inch validation and shared call budgets.
- Three OCC reads:42 exact marks/noextras,41 correct pairs,245/252fields; 394 calls each; 5.007/5.020/4.957 seconds; `partial:false`. No expected marks supplied. CPU-only Chromium avoids competing with the production Metal browser matrix.
- Exact shipped browser runner on the existing vector/large sideways scan benchmark:48 unique rows/noextras and **336/336fields** for each. Scan17.815seconds,1178calls,`partial:false`; page budget remains2000calls/60seconds. This is a separate source/branch gate.
- Source/served SHA-256: `8cc114f1cdb1ad953f07a582b9b81b1c00fe68032af38559d9b7f14054bc2bbf`.
- Browser processes use bounded outer timeouts and close browser/server/PDF resources. The preexisting tracked `g019-browser.json` receipt was preserved.

Fresh private receipts stay outside Git in `/Users/johnmobley/mascom/logs/weyland-occ-production-20261009/`. No private PDF, screenshot, cookie, token, upload ID or account details are committed. Production r2 diagnosis used an owned throwaway account and verified cleanup:47D1rows removed, upload/R2/KVremoved, all owned account/session/project counts zero.

OCC final receipt SHA-256:

- `occ-local-final-run1.json`: `24d77c172d710d7c5b76919f66880a042bc9c7014b7a87ddd04406eae4a39fb4`
- `occ-local-final-run2.json`: `cb72f06833726503ababd0f11c533c0be2cbe5fddb82099ab1e542243e09b536`
- `occ-local-final-run3.json`: `0d457941320349971b27a1ab2e9c8a231fb69467c6a345032e3be70001e97138`

This checkpoint improves the measured OCC regression and preserves the large-sheet benchmark; the remaining seven OCC fields are still open. It has not been deployed by its author.
