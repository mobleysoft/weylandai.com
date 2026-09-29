-- Reactivate real, priced product_variants rows that were left active=0
-- with NO explanatory note, added 2026-09-29.
--
-- Investigated as part of the pricing-accuracy fix: 21,366 of 59,998
-- variants are active=0. Most (16,176) carry a real, honest note
-- explaining why (superseded price book, retired edition, or a caught
-- fabrication correction like the STD_FINISHES fan-disposition entries)
-- - those are correctly inactive and untouched by this migration.
--
-- The other 5,190 have active=0 and notes IS NULL - no documented reason.
-- Sampled several (Zero International 164A/605 etc.) directly: real
-- prices ($67.62 etc.), real source_catalogue_id citations, created the
-- same day (2026-07-31) as the rest of that day's real catalogue import -
-- nothing about them looks fabricated or deliberately retired.
--
-- Scoped tightly, checked before writing: of the 5,190, only 2,320 have
-- NO other row (active or inactive, with or without a note) sharing the
-- same product_id + finish_code - those 2,320 are the true orphans this
-- migration reactivates. The other 2,870 share a product_id+finish_code
-- with some other row (an active duplicate, or another inactive row that
-- DOES carry an explanatory note) - left untouched rather than guessed
-- at, since reactivating those could create an ambiguous duplicate-active
-- price for the same real product+finish.
UPDATE product_variants
SET active = 1
WHERE active = 0
  AND notes IS NULL
  AND id NOT IN (
    SELECT pv1.id FROM product_variants pv1
    JOIN product_variants pv2
      ON pv2.product_id = pv1.product_id
     AND pv2.finish_code IS pv1.finish_code
     AND pv2.id != pv1.id
    WHERE pv1.active = 0 AND pv1.notes IS NULL
  );
