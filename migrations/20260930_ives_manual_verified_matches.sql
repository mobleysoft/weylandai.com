-- Two real, manually-verified matches found during a deep Ives pricing
-- pass 2026-09-30. Both are genuinely real products already priced in
-- product_variants, NOT missing data - but the automated matcher
-- (resolveCataloguePrices in src/lib/pricing.js) correctly refuses to
-- auto-match them, by design: these hardware_components rows record
-- only the bare numeric base model ("221", "347") with the real finish
-- suffix living in the separate `finish` column ("619", "B15") rather
-- than embedded in `model` - and tokMatches() deliberately blocks fuzzy
-- prefix/suffix matching when a token is pure-numeric (e.g. "221"),
-- specifically to prevent the false-positive class already found this
-- session (Ives "60" spuriously "matching" "8281-18-605" via a bare
-- numeric substring coincidence). Widening that guard would reopen the
-- same risk for OTHER components, so it should stay in place - these
-- two rows are fixed by direct, individually-verified citation instead
-- of a matcher change.
--
-- Verification for each: the real catalogue already has an ACTIVE row
-- whose full_model_number is exactly <model><finish-suffix> concatenated:
--   - id comp_1786492975984_rgkgcgggw: model="221", finish="619" ->
--     real catalogue row "221B15" (finish_code 619, $7.60), matching
--     this catalogue's own real "B"+legacy-finish-number suffix
--     convention already visible elsewhere (e.g. FS436 US15 = finish
--     619 too).
--   - id comp_1786492824904_rjg6azsg6: model="347", finish="B15" ->
--     real catalogue row "347B15" (finish_code 619, $24.30) - here the
--     schedule's own `finish` column already carries the literal "B15"
--     suffix, an exact, unambiguous match to the real variant.
-- Both are single-candidate (no alternate SKU ambiguity), so this is a
-- real citation, not a guess.

UPDATE hardware_components
SET unit_price = 7.60,
    list_price = 7.60,
    price_source = 'catalog',
    product_variant_id = 'var-221b15-1786501165562',
    product_match_confidence = 0.9,
    updated_at = datetime('now')
WHERE hardware_components.id = 'comp_1786492975984_rgkgcgggw' AND (unit_price IS NULL OR unit_price = 0);

UPDATE hardware_components
SET unit_price = 24.30,
    list_price = 24.30,
    price_source = 'catalog',
    product_variant_id = 'var-347b15-1786501249560',
    product_match_confidence = 0.9,
    updated_at = datetime('now')
WHERE hardware_components.id = 'comp_1786492824904_rjg6azsg6' AND (unit_price IS NULL OR unit_price = 0);
