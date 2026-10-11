# One opening, two schedule pages (g078c)

Rule: `cross-page-inventory-scope-v2`. An extracted schedule row is evidence for an opening. Cross-page rows can collapse only with affirmative, matching building scope, followed by matching inventory or row evidence. There are no project/hash/page exceptions.

## Scope and identity

`weyland-shared/building-scope.js` reads title-block facility/building names, asset/site/facility numbers, addresses, and explicit building/loop/floor labels. Stacked facility names and split number labels retain their decoded evidence. Every scope field records its text, coordinates and source in `door_resolution.pages[].scope_evidence`.

At least one building identity field must match; matching sheet families or floor numbers alone are insufficient. All extracted scope fields must agree. Conflicting or one-sided evidence keeps openings separate. Two pages with no building evidence also stay separate. Sheet-family variants and floors can veto a match. Plan placement permits partial evidence but rejects explicit conflicts.

Within that scope, two or more shared marks covering at least 80% of the smaller inventory establish a repeated schedule. Otherwise, identical compared row fields and positive width/height are required. Every contributing pair must agree: an unknown page cannot bridge two buildings. Same-page multiplicity is always retained, including reordered rows sharing a mark.

The selected complete row comes from a dedicated door-schedule sheet, then a schedule heading, an unclassified sheet, and finally specifications/general notes. Ties use the lower page number. Authoritative blanks remain blank. Source rows, scope comparisons, conflicting fields and page/mark/occurrence aliases remain available for review. Each reader resolves independently; agreement aligns shared source aliases once.

`readSchedules` exposes canonical openings, original rows and `doorResolution`. Truth counts and oracles consume the canonical rows; `door_rows` preserves the extracted counts and `door_resolution` explains the decisions. `buildPlacement` uses the same resolver and retains the original rows on each card. Conflicting buildings cannot borrow each other's tags, and schedule cells on mixed plan/schedule sheets do not count as drawn tags. `truth_run.mjs` changes are limited to this data plumbing.

## Three local regression sets

| Set | Original PDF pages | Rows A/B | Openings A/B | Agreed rows → openings |
|---|---|---:|---:|---:|
| X2530-01 | 18, 53 | 36/36 | 36/36 | 36 → 36 |
| R2405-01 | 15, 16 | 14/14 | 7/7 | 14 → 7 |
| Fayette | 5, 14 | 53/53 | 27/27 | 47 → 25 |

**X2530-01 is the negative control.** A-101 on page 18 describes Loop 4 (asset 7815307019); A-101.A on page 53 describes Loop 1 (asset 7815307024). Sixteen marks repeat, but these are separate buildings. The decoded page-18 title block contains overprinted asset values `7815307019; 7815307024` and site values `5302; 5307`. Page 53 has only asset `7815307024` and site `5307`. The resolver retains all values instead of silently discarding overprinting or accepting any overlapping number. Building, asset, site and sheet-family differences veto collapse. On the two supplied mixed plan/schedule pages, all 36 openings have distinct placement identities, 18 per building.

**R2405-01 is a positive control.** A-101 and A-102 share `TROOP I HEADQUARTERS`, `1301 NAGOGAMI ROAD`, site `6010`, and the complete printed facility-number set `8136010004; 8136010005`. Both readers recover the same seven marks twice. The result has seven openings and seven agreeing cards placed on A-101; each retains both source rows. The adjacent consultant address is excluded from project scope.

**Fayette is a positive control.** Both sheets identify `FAYETTE COUNTY ANIMAL SHELTER`, `1155 SR 74 S`. Those stacked name/address lines sit above the lower sheet-title box. Page 5 is specifications; page 14 is the dedicated door schedule. All 26 recovered page-14 marks repeat on page 5; page 5 adds 119D. The selected 120A width is 36 inches from page 14, with the 54-inch page-5 reading retained as a conflict. The 27 count is recovered numbered openings: the pre-existing missed 201A line, two `##` placeholders and C.O. are not newly recovered by this identity change.

## Reproduction

The checked-in fixtures contain original text items, viewport transforms, annotations and schedule rules, not precomputed reader output. Both readers run on them in every test. The four g078b fixtures retain SHA-256 provenance for their local page PDFs; only empty text and rules outside the detected tables were removed. Fayette uses the existing g070 text fixtures with g078 rule fixtures.

```sh
cd weyland-subx-worker && node --test
# From the repository root:
node --test $(rg --files tools/accuracy -g '*.test.mjs') weyland-shared/plan-read.test.mjs
```

No truth or placement records are regenerated for this task. Fixture tests exercise the loader, independent readers, agreement, placement, scope audit, reruns, missing/conflicting scope, and same-page multiplicity. Full-harvest counts are not claimed. See the delivery report for clock times and final suite results.
