# G030: Truth Data and Reader Fixes

## 1. Candidate Page Truth (Hand Counts)

Hand-counted door schedule rows for the target sets on their candidate pages:

| Set / SHA16 | Page | Hand Count | Reader A Count |
|---|---|---:|---:|
| `7478006f7fd5b43c` | 28 | 32 | 32 |
| | 32 | 27 | 27 |
| | 45 | 68 | 68 |
| | 46 | 84 | 84 |
| **Total** | | **211** | **211** |
| `192a16af8f31ae0c` | 10 | 46 | 46 |
| **Total** | | **46** | **46** |
| `e3d0cc1bc22fd824` | 18 | 22 | 22 |
| **Total** | | **22** | **22** |

## 2. G020 Sets Reader Performance Before / After

Reader A performance across the ten harvested G020 sets before and after the fixes.

| Set / SHA16 | Candidate Pages | Rows by Hand | A Rows (Before) | A Rows (After) | B Rows (After) |
|---|---|---|---:|---:|---:|
| `7478006f7fd5b43c` | 28, 32, 45, 46 | 211 | 0 | 211 | 211 |
| `f97e99f88a931e74` | 28, 32, 44, 45 | - | 0 | 210 | 210 |
| `192a16af8f31ae0c` | 10 | 46 | 0 | 46 | 0 |
| `43a1f0db3f7ff345` | 14 | - | 0 | 0 | 0 |
| `e3d0cc1bc22fd824` | 18 | 22 | 0 | 22 | 22 |
| `3fd2388877347d09` | 13 | - | 0 | 0 | 9 |
| `4af80165bc367de8` | 7 | - | 0 | 0 | 0 |
| `89236ffa156fbaf5` | 42, 43 | - | 16 | 15 | 29 |
| `977cec6301f40433` | 10 | - | 0 | 0 | 3 |
| `2b7024ad75f57ddf` | 16 | - | 0 | 8 | 4 |

## 3. S1 Diagnostic Placement

Executing S1 diagnostic placement on the three target sets using real production rows from reader A.

| Set / SHA16 | A Rows Read | Tags Placed | Selected Plan Sheets |
|---|---:|---:|---|
| `7478006f7fd5b43c` | 211 | 208 | DORM FIRST FLOOR p.23, DORM SECOND FLOOR p.24, DORM THIRD FLOOR p.25, ADMIN. RESTROOM p.28 |
| `192a16af8f31ae0c` | 46 | 0 | FIRST FLOOR PLANS p.7, FIRST FLOOR DIMENSION p.8, PLANS & DETAILS p.11 |
| `e3d0cc1bc22fd824` | 22 | 22 | NEW CONSTRUCTION PLAN LEGEND p.9, NEW CONSTRUCTION PLAN LEGEND p.13 |

## 4. Root Causes & Fixes

**192a16af8f31ae0c**:
- **Root Cause**: Table header detection strictly required the vertical spacing below the title to be within `2 * h`, which failed for staggered/sparse headers.
- **Fix**: Relaxed `buildTable` to use `gapGroups` as a broader upward search boundary when resolving the header ceiling.

**7478006f7fd5b43c**:
- **Root Cause**: An arbitrary logic gap limited table column inclusion to `< 40 * h` horizontal distance between elements.
- **Fix**: Reverted the column-gap limit back to `< 20 * h` during table header bounds expansion, preventing the merging of separate schedules, properly bounding columns, and satisfying table structure validation. Added `NAME` to `HEADER_LABEL_WORDS`.

**e3d0cc1bc22fd824**:
- **Root Cause**: `DOOR #` text matched negatively against the `\b` boundary constraint in header labeling. A non-word character `#` at the end of a line followed by `\b` caused the regex to miss the mark header entirely.
- **Fix**: Replaced the `\b` word boundary in `fieldForHeader` classifiers with `(?:\b|$)` to correctly capture `DOOR #`.

**Still Missing**:
- S1 tag placement for `192a16af8f31ae0c` is 0 despite 46 rows read. Reader A splits stacked mark/room combos into standalone column text, but plan tags remain strictly formatted (e.g., `113`), preventing exact matcher reconciliation.
- Reader B geometry disagreement persists on `192a` (0 B rows vs 46 A rows).

## Summary

The `weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs` script was updated to resolve 0-row omissions for three real harvested sets. Modifications included relaxing vertical header bounding via `gapGroups`, reverting a column-merge width hack (`40*h` -> `20*h`), and fixing regex word boundaries trailing non-word characters (`#`).

Reader A now extracts 100% of the hand-counted rows for the three target sets (211, 46, and 22 rows). Agreement with independent Reader B was also restored for `7478` (211/211) and `e3d0` (22/22). S1 tag placement diagnostics demonstrated successful physical layout binding on `7478` (208/211 tags) and `e3d0` (22/22 tags), but failed entirely on `192a` (0/46 tags) due to mark/room textual formatting mismatches between the schedule and the plan drawings.
