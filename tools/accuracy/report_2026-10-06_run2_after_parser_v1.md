# Paste-flow match accuracy, 2026-10-06

Live API https://weylandai.com, 320 real products x 7 spellings + 10 negatives = 2250 lines, 129626 ms.

| metric | value |
|---|---|
| recall (right product, any spelling) | 91.4% |
| precision (of matched lines, right product) | 95.8% |
| false positives on non-product lines | 0/10 |

| spelling | correct | same model, other id | wrong product | miss | dropped |
|---|---|---|---|---|---|
| canonical | 284 | 0 | 21 | 15 | 0 |
| model_only | 279 | 1 | 5 | 35 | 0 |
| lower_case | 284 | 0 | 21 | 15 | 0 |
| comma_separated | 316 | 0 | 0 | 4 | 0 |
| finish_suffix | 284 | 0 | 21 | 15 | 0 |
| quantity_prefix | 284 | 0 | 21 | 15 | 0 |
| tab_separated | 316 | 0 | 0 | 4 | 0 |

## Worst lines (first 60)

| spelling | line | grade | expected | got | parsed mfr / model |
|---|---|---|---|---|---|
| canonical | Steelcraft DW16/MU16 10'0" thru 10'6" | wrong_product | STEELCRAFT DW16/MU16 10'0" thru 10'6" | STEELCRAFT DW16/MU16 8'6" thru 9'0" | Steelcraft / DW16/MU16 |
| model_only | DW16/MU16 10'0" thru 10'6" | miss | STEELCRAFT DW16/MU16 10'0" thru 10'6" |  | DW16/MU16 / 10'0" |
| lower_case | steelcraft dw16/mu16 10'0" thru 10'6" | wrong_product | STEELCRAFT DW16/MU16 10'0" thru 10'6" | STEELCRAFT DW16/MU16 8'6" thru 9'0" | steelcraft / dw16/mu16 |
| finish_suffix | Steelcraft DW16/MU16 10'0" thru 10'6" 626 | wrong_product | STEELCRAFT DW16/MU16 10'0" thru 10'6" | STEELCRAFT DW16/MU16 8'6" thru 9'0" | Steelcraft / DW16/MU16 |
| quantity_prefix | 2 ea Steelcraft DW16/MU16 10'0" thru 10'6" | wrong_product | STEELCRAFT DW16/MU16 10'0" thru 10'6" | STEELCRAFT DW16/MU16 8'6" thru 9'0" | Steelcraft / DW16/MU16 |
| model_only | US-1B MATT BLACK | miss | DYKE US-1B MATT BLACK |  | US-1B / MATT |
| canonical | National Guard Products Hardware Pack SLSS2 | miss | NGP Hardware Pack SLSS2 |  | National Guard Products / Hardware |
| model_only | Hardware Pack SLSS2 | wrong_product | NGP Hardware Pack SLSS2 | NGP Pack | Hardware / Pack |
| lower_case | national guard products hardware pack slss2 | miss | NGP Hardware Pack SLSS2 |  | national guard products / hardware |
| finish_suffix | National Guard Products Hardware Pack SLSS2 626 | miss | NGP Hardware Pack SLSS2 |  | National Guard Products / Hardware |
| quantity_prefix | 2 ea National Guard Products Hardware Pack SLSS2 | miss | NGP Hardware Pack SLSS2 |  | National Guard Products / Hardware |
| canonical | Sloan Valve Company Royal 111 | miss | Sloan Royal 111 Flushometer |  | Sloan Valve Company / Royal |
| model_only | Royal 111 | wrong_product | Sloan Royal 111 Flushometer | NGP 111 | Royal / 111 |
| lower_case | sloan valve company royal 111 | miss | Sloan Royal 111 Flushometer |  | sloan valve company / royal |
| comma_separated | Sloan Valve Company, Royal 111 | miss | Sloan Royal 111 Flushometer |  | Sloan Valve Company / Royal 111 |
| finish_suffix | Sloan Valve Company Royal 111 626 | miss | Sloan Royal 111 Flushometer |  | Sloan Valve Company / Royal |
| quantity_prefix | 2 ea Sloan Valve Company Royal 111 | miss | Sloan Royal 111 Flushometer |  | Sloan Valve Company / Royal |
| tab_separated | Sloan Valve Company TAB Royal 111 TAB per schedule | miss | Sloan Royal 111 Flushometer |  | Sloan Valve Company / Royal 111 |
| canonical | Steelcraft SZ18 POLYS / GALV SZ004 | wrong_product | STEELCRAFT SZ18 POLYS / GALV SZ004 | STEELCRAFT SZ18 POLYS GALV SZ001 | Steelcraft / SZ18 |
| model_only | SZ18 POLYS / GALV SZ004 | miss | STEELCRAFT SZ18 POLYS / GALV SZ004 |  | SZ18 / POLYS |
| lower_case | steelcraft sz18 polys / galv sz004 | wrong_product | STEELCRAFT SZ18 POLYS / GALV SZ004 | STEELCRAFT SZ18 POLYS GALV SZ001 | steelcraft / sz18 |
| finish_suffix | Steelcraft SZ18 POLYS / GALV SZ004 626 | wrong_product | STEELCRAFT SZ18 POLYS / GALV SZ004 | STEELCRAFT SZ18 POLYS GALV SZ001 | Steelcraft / SZ18 |
| quantity_prefix | 2 ea Steelcraft SZ18 POLYS / GALV SZ004 | wrong_product | STEELCRAFT SZ18 POLYS / GALV SZ004 | STEELCRAFT SZ18 POLYS GALV SZ001 | Steelcraft / SZ18 |
| canonical | Steelcraft H- UP TO 7'2" HIGH 1'6" thru 2'8" | miss | STEELCRAFT H- UP TO 7'2" HIGH 1'6" thru 2'8" |  | Steelcraft / H- |
| model_only | H- UP TO 7'2" HIGH 1'6" thru 2'8" | miss | STEELCRAFT H- UP TO 7'2" HIGH 1'6" thru 2'8" |  | H- / UP |
| lower_case | steelcraft h- up to 7'2" high 1'6" thru 2'8" | miss | STEELCRAFT H- UP TO 7'2" HIGH 1'6" thru 2'8" |  | steelcraft / h- |
| finish_suffix | Steelcraft H- UP TO 7'2" HIGH 1'6" thru 2'8" 626 | miss | STEELCRAFT H- UP TO 7'2" HIGH 1'6" thru 2'8" |  | Steelcraft / H- |
| quantity_prefix | 2 ea Steelcraft H- UP TO 7'2" HIGH 1'6" thru 2'8" | miss | STEELCRAFT H- UP TO 7'2" HIGH 1'6" thru 2'8" |  | Steelcraft / H- |
| canonical | Steelcraft F16 Over 8" thru 12" face | wrong_product | STEELCRAFT F16 Over 8" thru 12" face | STEELCRAFT F16/FN16 8 | Steelcraft / F16 |
| model_only | F16 Over 8" thru 12" face | miss | STEELCRAFT F16 Over 8" thru 12" face |  | Over / 8" |
| lower_case | steelcraft f16 over 8" thru 12" face | wrong_product | STEELCRAFT F16 Over 8" thru 12" face | STEELCRAFT F16/FN16 8 | steelcraft / f16 |
| finish_suffix | Steelcraft F16 Over 8" thru 12" face 626 | wrong_product | STEELCRAFT F16 Over 8" thru 12" face | STEELCRAFT F16/FN16 8 | Steelcraft / F16 |
| quantity_prefix | 2 ea Steelcraft F16 Over 8" thru 12" face | wrong_product | STEELCRAFT F16 Over 8" thru 12" face | STEELCRAFT F16/FN16 8 | Steelcraft / F16 |
| canonical | Kohler K-2032 | miss | Kohler Ladena Wall-Mount Lavatory |  | Kohler / K-2032 |
| model_only | K-2032 | miss | Kohler Ladena Wall-Mount Lavatory |  |  / K-2032 |
| lower_case | kohler k-2032 | miss | Kohler Ladena Wall-Mount Lavatory |  | kohler / k-2032 |
| comma_separated | Kohler, K-2032 | miss | Kohler Ladena Wall-Mount Lavatory |  | Kohler / K-2032 |
| finish_suffix | Kohler K-2032 626 | miss | Kohler Ladena Wall-Mount Lavatory |  | Kohler / K-2032 |
| quantity_prefix | 2 ea Kohler K-2032 | miss | Kohler Ladena Wall-Mount Lavatory |  | Kohler / K-2032 |
| tab_separated | Kohler TAB K-2032 TAB per schedule | miss | Kohler Ladena Wall-Mount Lavatory |  | Kohler / K-2032 |
| canonical | Steelcraft F14/FN14 15 7'0" door height | wrong_product | STEELCRAFT F14/FN14 15 7'0" door height | STEELCRAFT F14/FN14 8 | Steelcraft / F14/FN14 |
| model_only | F14/FN14 15 7'0" door height | miss | STEELCRAFT F14/FN14 15 7'0" door height |  | F14/FN14 / 15 |
| lower_case | steelcraft f14/fn14 15 7'0" door height | wrong_product | STEELCRAFT F14/FN14 15 7'0" door height | STEELCRAFT F14/FN14 8 | steelcraft / f14/fn14 |
| finish_suffix | Steelcraft F14/FN14 15 7'0" door height 626 | wrong_product | STEELCRAFT F14/FN14 15 7'0" door height | STEELCRAFT F14/FN14 8 | Steelcraft / F14/FN14 |
| quantity_prefix | 2 ea Steelcraft F14/FN14 15 7'0" door height | wrong_product | STEELCRAFT F14/FN14 15 7'0" door height | STEELCRAFT F14/FN14 8 | Steelcraft / F14/FN14 |
| canonical | Steelcraft F16/FN16 102 Slide together mullion - part A | wrong_product | STEELCRAFT F16/FN16 102 Slide together mullion - part A | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
| model_only | F16/FN16 102 Slide together mullion - part A | miss | STEELCRAFT F16/FN16 102 Slide together mullion - part A |  | F16/FN16 / 102 |
| lower_case | steelcraft f16/fn16 102 slide together mullion - part a | wrong_product | STEELCRAFT F16/FN16 102 Slide together mullion - part A | STEELCRAFT F16/FN16 8 | steelcraft / f16/fn16 |
| finish_suffix | Steelcraft F16/FN16 102 Slide together mullion - part A 626 | wrong_product | STEELCRAFT F16/FN16 102 Slide together mullion - part A | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
| quantity_prefix | 2 ea Steelcraft F16/FN16 102 Slide together mullion - part A | wrong_product | STEELCRAFT F16/FN16 102 Slide together mullion - part A | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
| canonical | Steelcraft MU16 9'0" | wrong_product | STEELCRAFT MU16 9'0" | STEELCRAFT MU16 7'2" | Steelcraft / MU16 |
| model_only | MU16 9'0" | miss | STEELCRAFT MU16 9'0" |  | MU16 / 9'0" |
| lower_case | steelcraft mu16 9'0" | wrong_product | STEELCRAFT MU16 9'0" | STEELCRAFT MU16 7'2" | steelcraft / mu16 |
| finish_suffix | Steelcraft MU16 9'0" 626 | wrong_product | STEELCRAFT MU16 9'0" | STEELCRAFT MU16 7'2" | Steelcraft / MU16 |
| quantity_prefix | 2 ea Steelcraft MU16 9'0" | wrong_product | STEELCRAFT MU16 9'0" | STEELCRAFT MU16 7'2" | Steelcraft / MU16 |
| canonical | Steelcraft F16/FN16 36 7'2" door height | wrong_product | STEELCRAFT F16/FN16 36 7'2" door height | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
| model_only | F16/FN16 36 7'2" door height | wrong_product | STEELCRAFT F16/FN16 36 7'2" door height | ZERO 36 | F16/FN16 / 36 |
| lower_case | steelcraft f16/fn16 36 7'2" door height | wrong_product | STEELCRAFT F16/FN16 36 7'2" door height | STEELCRAFT F16/FN16 8 | steelcraft / f16/fn16 |
| finish_suffix | Steelcraft F16/FN16 36 7'2" door height 626 | wrong_product | STEELCRAFT F16/FN16 36 7'2" door height | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
| quantity_prefix | 2 ea Steelcraft F16/FN16 36 7'2" door height | wrong_product | STEELCRAFT F16/FN16 36 7'2" door height | STEELCRAFT F16/FN16 8 | Steelcraft / F16/FN16 |
