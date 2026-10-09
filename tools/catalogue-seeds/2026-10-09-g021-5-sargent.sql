-- Goal g021: public manufacturer technical book, verified 2026-10-09.
-- Source: https://marketing-assets.seclock.com/image/upload/SARGENT_80_Series_Catalog
-- Content SHA256: 5951c34371c6b788da4ab0be979a7b3a526ca850906a15e98de1ba49948c8d67
-- Full book text uses 1-based PDF ordinals; the original PDF is ingested offline by catalog-corpus.
-- INSERT OR IGNORE preserves existing records; reruns add no duplicates.
INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, website, verified, notes) VALUES ('mfr-sargent', 'Sargent', 'sargent', 'doors', 'https://www.sargentlock.com', 1, 'g021 public technical catalogue seed');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('SAR', 'mfr-sargent', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('SGT', 'mfr-sargent', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('SARGENT', 'mfr-sargent', 'g021_public_catalogue');
INSERT OR IGNORE INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, text_extracted, index_built, source_url) VALUES ('5951c34371c6b788', 'g021-sargent-5951c34371c6b788.pdf', '5951c34371c6b788da4ab0be979a7b3a526ca850906a15e98de1ba49948c8d67', 9265553, 80, 'sargent', 'Sargent 80 Series Exit Device Catalog 90641 (07/25)', '2026-10-09T17:21:27.722007+00:00', 'g021-catalogue-seed', 'catalog-corpus/e28aa64695674220eed8f6dc101bdcbfe262944e1b7731352fc99ced30b5f63c.pdf', 1, 0, 'https://marketing-assets.seclock.com/image/upload/SARGENT_80_Series_Catalog');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 1, 'Product Catalog



 80 Series
 Exit Device
', 43, 1, 'product catalog



 80 series
 exit device
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 2, '90641
 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




2 80 Series




1-800-727-5477 • www.sargentlock.com




 This product can expose you to lead


 which is known to the state of California
 WARNING
 to cause cancer and birth defects or other


 reproductive harm. For more information go


 to www.P65warnings.ca.gov.
', 541, 1, '90641
 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




2 80 series




1-800-727-5477 • www.sargentlock.com




 this product can expose you to lead


 which is known to the state of california
 warning
 to cause cancer and birth defects or other


 reproductive harm. for more information go


 to www.p65warnings.ca.gov.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 3, 'Table of Contents
80 Series


Features and Innovations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ­6
UL Fire Door Ratings and Opening Sizes . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
Windstorm Certifications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
Rim Exit Device for Wide Stile Doors (Panic & Fire Rated)
 8888/8810 Multi-Function Rim Exit Devices & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8-9
 8800 Rim Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
 8800 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11




Mortise Lock Exit Device for Wide Stile Doors (Panic & Fire Rated)
 8900 Mortise Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
 8900 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13




Surface Vertical Rod Exit Device for Wide Stile Doors (Panic & Fire Rated)
 8700 SVR Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
 8700 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
 NB8700 Less Bottom Rod SVR Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
 NB8700 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17




 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Concealed Vertical Rod Exit Device for Wide Stile Doors (Panic & Fire Rated)
 MD8600 (Windstorm Rated) & NB-MD8600 Concealed Vertical Rod Exit Device for Metal Doors . . . . . . . . . . . . . . . . 18
 MD8600 & NB-MD8600 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 19
 AD8600 & NB-AD8600 CVR Devices for Aluminum Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
 AD8600 & NB-AD8600 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 21
 WD8600 & NB-WD8600 CVR Devices for Wood Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22
 WD8600 & NB-WD8600 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23

Narrow Design Rim Exit Device for Wide & Narrow Door Stiles (Panic & Fire Rated)
 8500 Rim Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24
 8500 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
 AD8500 Narrow Design Rim Exit Device for Aluminum Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 26
 AD8500 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 27



Narrow Design Mortise Lock Exit Device for Wide Door Stiles (Panic & Fire Rated)
 8300 Mortise Exit Devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 8300 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29




Narrow Design Concealed Vertical Rod Exit Device for Wide & Narrow Stiles (Panic & Fire Rated)
 MD8400 & NB-MD8400 Narrow Stile CVR Devices for Metal Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 30
 MD8400 & NB-MD8400 Functions & Trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 31
 AD8400 & NB-AD8400 Narrow Stile CVR Devices for Aluminum Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32
 AD8400 & NB-AD8400 Functions & Trims for Aluminum Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 33




 1-800-727-5477 • www.sargentlock.com
 3 90641
', 5495, 1, 'table of contents
80 series


features and innovations . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ­6
ul fire door ratings and opening sizes . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
windstorm certifications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
rim exit device for wide stile doors (panic & fire rated)
 8888/8810 multi-function rim exit devices & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8-9
 8800 rim exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10
 8800 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 11




mortise lock exit device for wide stile doors (panic & fire rated)
 8900 mortise exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 12
 8900 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13




surface vertical rod exit device for wide stile doors (panic & fire rated)
 8700 svr exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14
 8700 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 15
 nb8700 less bottom rod svr exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
 nb8700 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17




 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
concealed vertical rod exit device for wide stile doors (panic & fire rated)
 md8600 (windstorm rated) & nb-md8600 concealed vertical rod exit device for metal doors . . . . . . . . . . . . . . . . 18
 md8600 & nb-md8600 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 19
 ad8600 & nb-ad8600 cvr devices for aluminum doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
 ad8600 & nb-ad8600 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 21
 wd8600 & nb-wd8600 cvr devices for wood doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22
 wd8600 & nb-wd8600 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23

narrow design rim exit device for wide & narrow door stiles (panic & fire rated)
 8500 rim exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24
 8500 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
 ad8500 narrow design rim exit device for aluminum doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 26
 ad8500 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 27



narrow design mortise lock exit device for wide door stiles (panic & fire rated)
 8300 mortise exit devices . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 8300 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29




narrow design concealed vertical rod exit device for wide & narrow stiles (panic & fire rated)
 md8400 & nb-md8400 narrow stile cvr devices for metal doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 30
 md8400 & nb-md8400 functions & trims . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 31
 ad8400 & nb-ad8400 narrow stile cvr devices for aluminum doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 32
 ad8400 & nb-ad8400 functions & trims for aluminum doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 33




 1-800-727-5477 • www.sargentlock.com
 3 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 4, ' Table of Contents
 80 Series


 Low Profile Center & Top Latching Vertical Rod Exit Device (Panic & Fire Rated)
 LP8600 & LR8600 Center & Top Latching Exit Devices for Pairs of Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 34
 LP8600/LR8600 Functions & Trims for Pairs of Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 35
 LS8600 Center and Top Latching Vertical Rod for Single Door Applications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 36
 LS8600 Functions & Trims for Single Doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 37




 UL Listed Windstorm Products
 MD8600 Concealed Vertical Rod Exit Devices: UL Hurricane-Resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 38-39
 HC8800 Rim Exit Devices: UL Listed Hurricane-Resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 40-41
 WS8800 Rim Exit Devices: UL Listed Hurricane-Resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 42-43
 WS8900 Mortise Exit Device: UL Listed Hurricane-Resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 44-45
 HC4-8700 SVR Exit Devices: UL Listed Hurricane-Resistant (up to 150 psf) . . . . . . . . . . . . . . . . . . . . . . . . . . . 46-47
 HC8700 SVR Exit Devices: UL Listed Hurricane-Resistant (up to 65 psf) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 48-49
 FM8700 2-Point SVR Exit Device: UL Listed Tornado-Resistant ICC500 (2014/2020) . . . . . . . . . . . . . . . . . . . .50-51
 Electrical Options
 ElectroLynx® Information & Option Compatibility Chart . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 52
 Security Shim Kit Option . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 53
 SARGuide PL- Option & Latch Bolt Monitoring Option (53-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 54
 Alarm (AL-) Option & Request-to-Exit (55-) Option . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 55
 Electric Latch Retraction Option (56-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 56
 Electric Latch Retraction Motor Kits & Push Rail Kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 57




 07/25
 Electric Dogging (58-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 58
 ElectroGuard Delayed Egress Option (59-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 59
 Electrified & Monitored (54-) ET Trims & Power Supplies . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 60




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Lever and Trim Designs
 ET Trim, Levers and Pulls . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 61
 Coastal Series Levers & Thumbpiece Pulls . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 62
 Studio Collection Levers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 63-64
 Ordering Gramercy Series Levers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 65
 Anti-Vandal Trim, 988 Surface Bolt, ET Plates & Dummy Rails . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 66
 Miscellaneous
 Cylinder Information . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 67
 Mullions: Aluminum, Steel & Electrified . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 68-69
 Mullion Accessories and Stabilizers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 70
 Through-bolt Kits, Rod Extensions and Shim Kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 71
 End Caps and Cylinder Dogging Kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 72
 Rail Sizes and How to Order ET Trim . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 73
 Mechanical Options & Descriptions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 74
 Cylinder Options & Descriptions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 75
 How to Order . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 76
 Finishes & Finish Care . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 77
 Architectural Specifications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 78




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 4 1-800-727-5477 • www.sargentlock.com
', 6011, 1, ' table of contents
 80 series


 low profile center & top latching vertical rod exit device (panic & fire rated)
 lp8600 & lr8600 center & top latching exit devices for pairs of doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 34
 lp8600/lr8600 functions & trims for pairs of doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 35
 ls8600 center and top latching vertical rod for single door applications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 36
 ls8600 functions & trims for single doors . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 37




 ul listed windstorm products
 md8600 concealed vertical rod exit devices: ul hurricane-resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 38-39
 hc8800 rim exit devices: ul listed hurricane-resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 40-41
 ws8800 rim exit devices: ul listed hurricane-resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 42-43
 ws8900 mortise exit device: ul listed hurricane-resistant . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 44-45
 hc4-8700 svr exit devices: ul listed hurricane-resistant (up to 150 psf) . . . . . . . . . . . . . . . . . . . . . . . . . . . 46-47
 hc8700 svr exit devices: ul listed hurricane-resistant (up to 65 psf) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 48-49
 fm8700 2-point svr exit device: ul listed tornado-resistant icc500 (2014/2020) . . . . . . . . . . . . . . . . . . . .50-51
 electrical options
 electrolynx® information & option compatibility chart . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 52
 security shim kit option . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 53
 sarguide pl- option & latch bolt monitoring option (53-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 54
 alarm (al-) option & request-to-exit (55-) option . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 55
 electric latch retraction option (56-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 56
 electric latch retraction motor kits & push rail kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 57




 07/25
 electric dogging (58-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 58
 electroguard delayed egress option (59-) . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 59
 electrified & monitored (54-) et trims & power supplies . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 60




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 lever and trim designs
 et trim, levers and pulls . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 61
 coastal series levers & thumbpiece pulls . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 62
 studio collection levers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 63-64
 ordering gramercy series levers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 65
 anti-vandal trim, 988 surface bolt, et plates & dummy rails . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 66
 miscellaneous
 cylinder information . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 67
 mullions: aluminum, steel & electrified . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 68-69
 mullion accessories and stabilizers . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 70
 through-bolt kits, rod extensions and shim kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 71
 end caps and cylinder dogging kits . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 72
 rail sizes and how to order et trim . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 73
 mechanical options & descriptions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 74
 cylinder options & descriptions . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 75
 how to order . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 76
 finishes & finish care . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 77
 architectural specifications . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 78




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 4 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 5, 'Features and Innovations
80 Series


SARGENT manufactures a full line of exit devices including vertical rod, rim and mortise for both standard and narrow stile doors. These
devices provide the best combination of simplicity, strength, durability, aesthetics and innovation and are perfect for applications such as
commercial office buildings, medical and educational institutions.
Simplicity Strength & Durability
• Easy installation and maintenance-free design • Made of finest component materials
• “True” architectural hardware finishes consistent with • Heavy duty mounting construction
 BHMA/ANSI standards • Built to withstand abusive conditions
• Few moving parts – less wear • 5 Year warranty
• Modular construction
Hurricane-Resistant Products and Certifications Innovation
• UL Certified Latching Hardware and Assemblies (ZHEM & ZHLL) • Broad offering of electro-mechanical solutions for the most
• Product-specific detailed certifications and listings demanding access/egress control applications
• Available with Rim, Mortise, SVR & CVR devices • MicroShield® anti-microbial finish coating offers a new level
 of protection
 • SARGuide™ exit device contains an electroluminescent touchpad
Security to enhance the visibility of exit locations in dark or smoke-filled
 passages and effectively improve the safety of any public building
• Double cylinder functions available
 • CTL (Center and Top Latching) Vertical Rod Devices offer less bottom
• Torx® and spanner screws rod convenience with true center latching for added security
• Anti-vandal trim options
• Master keying with SARGENT Security Key systems available
 (Signature, Keso F1, Keso and XC)




 07/25
EcoFlex®
 • Reduces energy consumption up to 95% for exit trim, as certified by Green Circle, which lowers operating costs; assists with load




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 reduction in optimizing energy performance credit in LEED, and reduces the number of power supplies requires.
 • Field configurable to fail-safe or fail-secure, and operates from 12-24VDC, offering greater flexibility in system design.
• Innovative actuator design provides superior reliability through higher performance and reduced maintenance; the ability to have longer cable
 runs without negatively impacting lock function. It reduces the risk of voltage drops and eliminates inductive kickback, and lowers the total cost
 of owner ship.



MicroShield® Coating
MicroShield®
ASSA ABLOY Group companies offer MicroShield®, an anti-microbial coating for door hardware. MicroShield uses proven silver ion-based
technology from Agion®, a leading provider of antimicrobial solutions, to stem the spread of bacteria and other microbes.
MicroShield® is a trademark of the respective ASSA ABLOY Group company.


 The Agion antimicrobial is not intended as a substitute for good hygiene. Coated products must still be cleaned to ensure the
 surfaces will be free of destructive microbes. ASSA ABLOY makes no representations or warranties, express or implied, as to the
 efficacy of the Agion antimicrobial. A copy of the Agion warranty is available upon request. Agion is a registered trademark of Agion
 Technologies, Inc., Wakefield, MA, USA.



SARGuide




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
The PL- SARGuide Photoluminescent Exit Device is a non electrical option which produces visible EXIT signage in darkness or low lit areas.
• Approved for use in New York City in accordance with RS 6-1 and RS 6-1A.
• Recharges from ambient light.
• No wiring or maintenance needed.




 1-800-727-5477 • www.sargentlock.com
 5 90641
', 3784, 1, 'features and innovations
80 series


sargent manufactures a full line of exit devices including vertical rod, rim and mortise for both standard and narrow stile doors. these
devices provide the best combination of simplicity, strength, durability, aesthetics and innovation and are perfect for applications such as
commercial office buildings, medical and educational institutions.
simplicity strength & durability
• easy installation and maintenance-free design • made of finest component materials
• “true” architectural hardware finishes consistent with • heavy duty mounting construction
 bhma/ansi standards • built to withstand abusive conditions
• few moving parts – less wear • 5 year warranty
• modular construction
hurricane-resistant products and certifications innovation
• ul certified latching hardware and assemblies (zhem & zhll) • broad offering of electro-mechanical solutions for the most
• product-specific detailed certifications and listings demanding access/egress control applications
• available with rim, mortise, svr & cvr devices • microshield® anti-microbial finish coating offers a new level
 of protection
 • sarguide™ exit device contains an electroluminescent touchpad
security to enhance the visibility of exit locations in dark or smoke-filled
 passages and effectively improve the safety of any public building
• double cylinder functions available
 • ctl (center and top latching) vertical rod devices offer less bottom
• torx® and spanner screws rod convenience with true center latching for added security
• anti-vandal trim options
• master keying with sargent security key systems available
 (signature, keso f1, keso and xc)




 07/25
ecoflex®
 • reduces energy consumption up to 95% for exit trim, as certified by green circle, which lowers operating costs; assists with load




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 reduction in optimizing energy performance credit in leed, and reduces the number of power supplies requires.
 • field configurable to fail-safe or fail-secure, and operates from 12-24vdc, offering greater flexibility in system design.
• innovative actuator design provides superior reliability through higher performance and reduced maintenance; the ability to have longer cable
 runs without negatively impacting lock function. it reduces the risk of voltage drops and eliminates inductive kickback, and lowers the total cost
 of owner ship.



microshield® coating
microshield®
assa abloy group companies offer microshield®, an anti-microbial coating for door hardware. microshield uses proven silver ion-based
technology from agion®, a leading provider of antimicrobial solutions, to stem the spread of bacteria and other microbes.
microshield® is a trademark of the respective assa abloy group company.


 the agion antimicrobial is not intended as a substitute for good hygiene. coated products must still be cleaned to ensure the
 surfaces will be free of destructive microbes. assa abloy makes no representations or warranties, express or implied, as to the
 efficacy of the agion antimicrobial. a copy of the agion warranty is available upon request. agion is a registered trademark of agion
 technologies, inc., wakefield, ma, usa.



sarguide




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
the pl- sarguide photoluminescent exit device is a non electrical option which produces visible exit signage in darkness or low lit areas.
• approved for use in new york city in accordance with rs 6-1 and rs 6-1a.
• recharges from ambient light.
• no wiring or maintenance needed.




 1-800-727-5477 • www.sargentlock.com
 5 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 6, ' UL Fire Door Ratings
 and Openings Sizes
 80 Series

 Maximum Door Opening-Fire Doors

 with
 12-HC980 or with VR/VR SVR/Mortise CVR/Mortise CVR/Mortise VR/VR
 Type Exit Device Door Single Door 12-980 or with 12-HD980 Doors Doors MD Doors WD Doors Double
 Material 12-HCL980 12-L980 Mullion Swing Same Swing Same Swing Same Swing Same Egress
 Mullion Direction Direction Direction Direction


 3 Hour 4’ 1.5 Hour 8’
 12-8800 Metal 3 Hour 8’ x 8’ 3 Hour 8’ x 10’ –– –– –– –– ––
 x 10’ x 8’
 Rim 1.5 Hour 8’
 12-8500 Metal 3 Hour 4’ x 8’ 3 Hour 8’ x 8’ 3 Hour 8’ x 8’ –– –– –– –– ––
 x 8’




 Mortise Lock
 12-8900 Metal 3 Hour 4’ –– –– –– –– 3 Hour 8’ x 8’ 3 Hour 8’ x 10’ –– ––
 x 10’



 12-8300 Metal 3 Hour 4’ –– –– –– –– –– 3 Hour 8’ x 10’ –– ––
 x 10’


 12-FM8700 Metal 3 Hour 4’ x 8’ –– –– –– 3 Hour 8’ x 8’ –– –– –– ––

 SVR 12-8700 Metal –– –– –– –– 3 Hour 8’ x 8’ 3 Hour 8’ x 8’ –– –– 3 Hour 8’ x 8’

 12-NB8700 Metal –– –– –– –– 3 Hour 8’ x 10’ –– –– –– 3 Hour 8’ x 10’

 12-MD8600 Metal –– –– –– –– 3 Hour 8’ x 10’ –– 3 Hour 8’ x 10’ –– 3 Hour 8’ x 10’
 12-NB- Metal –– –– –– –– 3 Hour 8’ x 10’ –– –– –– 3 Hour 8’ x 10’
 CVR
 MD8600




 07/25
 12-MD8400 Metal –– –– –– –– 3 Hour 8’ x 10’ –– 3 Hour 8’ x 10’ –– 3 Hour 8’ x 10’
 12-NB- Metal –– –– –– –– 3 Hour 8’ x 10’ –– –– –– 3 Hour 8’ x 10’




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 MD8400
 3 Hour 4’



 CVR/Mortise
 12-LS8600 Metal –– –– –– –– –– –– –– ––
 x 10’


 12-LP8600 & 3 Hour 8’ x 3 Hour 8’ x
 12-LR8600 Metal –– –– –– –– 10’ –– –– –– 10’




 Any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and Sargent Manufacturing Company makes no
 representations or warranties concerning what such impact may be in any specific situation. When retrofitting any portion of an existing fire rated opening, or
 specifying and installing a new fire-rated opening, please consult with a code specialist or local code official (Authority Having Jurisdiction) to ensure compliance
 with all applicable codes and ratings.

 Notes:
 • Please contact door manufacturer for specifications regarding fire door construction.
 • Consult wood door manufacturers for current UL listing.




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 6 1-800-727-5477 • www.sargentlock.com
', 2484, 1, ' ul fire door ratings
 and openings sizes
 80 series

 maximum door opening-fire doors

 with
 12-hc980 or with vr/vr svr/mortise cvr/mortise cvr/mortise vr/vr
 type exit device door single door 12-980 or with 12-hd980 doors doors md doors wd doors double
 material 12-hcl980 12-l980 mullion swing same swing same swing same swing same egress
 mullion direction direction direction direction


 3 hour 4’ 1.5 hour 8’
 12-8800 metal 3 hour 8’ x 8’ 3 hour 8’ x 10’ –– –– –– –– ––
 x 10’ x 8’
 rim 1.5 hour 8’
 12-8500 metal 3 hour 4’ x 8’ 3 hour 8’ x 8’ 3 hour 8’ x 8’ –– –– –– –– ––
 x 8’




 mortise lock
 12-8900 metal 3 hour 4’ –– –– –– –– 3 hour 8’ x 8’ 3 hour 8’ x 10’ –– ––
 x 10’



 12-8300 metal 3 hour 4’ –– –– –– –– –– 3 hour 8’ x 10’ –– ––
 x 10’


 12-fm8700 metal 3 hour 4’ x 8’ –– –– –– 3 hour 8’ x 8’ –– –– –– ––

 svr 12-8700 metal –– –– –– –– 3 hour 8’ x 8’ 3 hour 8’ x 8’ –– –– 3 hour 8’ x 8’

 12-nb8700 metal –– –– –– –– 3 hour 8’ x 10’ –– –– –– 3 hour 8’ x 10’

 12-md8600 metal –– –– –– –– 3 hour 8’ x 10’ –– 3 hour 8’ x 10’ –– 3 hour 8’ x 10’
 12-nb- metal –– –– –– –– 3 hour 8’ x 10’ –– –– –– 3 hour 8’ x 10’
 cvr
 md8600




 07/25
 12-md8400 metal –– –– –– –– 3 hour 8’ x 10’ –– 3 hour 8’ x 10’ –– 3 hour 8’ x 10’
 12-nb- metal –– –– –– –– 3 hour 8’ x 10’ –– –– –– 3 hour 8’ x 10’




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 md8400
 3 hour 4’



 cvr/mortise
 12-ls8600 metal –– –– –– –– –– –– –– ––
 x 10’


 12-lp8600 & 3 hour 8’ x 3 hour 8’ x
 12-lr8600 metal –– –– –– –– 10’ –– –– –– 10’




 any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and sargent manufacturing company makes no
 representations or warranties concerning what such impact may be in any specific situation. when retrofitting any portion of an existing fire rated opening, or
 specifying and installing a new fire-rated opening, please consult with a code specialist or local code official (authority having jurisdiction) to ensure compliance
 with all applicable codes and ratings.

 notes:
 • please contact door manufacturer for specifications regarding fire door construction.
 • consult wood door manufacturers for current ul listing.




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 6 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 7, 'Windstorm Certifications
80 Series


Windstorm Certifications: Florida Building Codes & UL Listings
SARGENT Manufacturing’s products meet building codes that require hurricane, windstorm and FEMA certifications, including some of the
most stringent building codes as specified in the Florida Building Code, Miami Dade Code and the International Building Code. Listed below
are certifications and standards met by the 80 Series lock.


Florida Building Code: FL2998
UL Certification Directory: ZHEM.R21744 – Latching Hardware
 ANSI/SDI-BHMA A250.13 “Testing and Rating of Severe Windstorm Resistant Components for Swinging Door Assemblies”
 “Standard Test Method for Structural Performance of Exterior Windows, Doors, Skylights and Curtain Walls by
 ANSI/ASTM E330
 Uniform Static Air Pressure Difference”
 “Standard Test Method for Performance of Exterior Windows, Curtain Walls, Doors, and Impact Protective
 ANSI/ASTM E1886
 Systems Impacted by Missile(s) and Exposed to Cyclic Pressure Differentials”
 “Standard Specification for Performance of Exterior Windows, Curtain Walls, Doors and Impact Protective Systems
 ASTM E1996
 Impacted by Windborne Debris in Hurricanes”

 (TAS) 201 “Impact Test Procedures”*

 “Standard Test Method for Structural Performance of Exterior Windows, Doors, Skylights and Curtain Walls by
 (TAS) 202
 Uniform Static Air Pressure Difference”

 (TAS) 203 “Criteria for Testing Products Subject to Cyclic Wind Pressure Loading”*




 07/25
* Published in the “Florida Building Code”
Any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and Sargent Manufacturing
Company makes no representations or warranties concerning what such impact may be in any specific situation. When retrofitting any portion




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
of an existing fire rated opening, or specifying and installing a new fire-rated opening, please consult with a code specialist or local code official
(Authority Having Jurisdiction) to ensure compliance with all applicable codes and ratings.


UL Certification Directory: ZHLL.R21744 – Products for Use in Windstorm-rated Assemblies
Certifications to meet assembly requirements are done in conjunction with doors from ASSA ABLOY Group companies CECO DOOR and
CURRIES.

 “Standard Test Method for Structural Performance of Exterior Windows, Doors, Skylights and Curtain Walls by
 ASTM E330
 Uniform Static Air Pressure Difference”
 “Standard Test Method for Performance of Exterior Windows, Curtain Walls, Doors, and Impact Protective
 ANSI/ASTM E1886
 Systems Impacted by Missile(s) and Exposed to Cyclic Pressure Differentials”
 “Standard Specification for Performance of Exterior Windows, Curtain Walls, Doors and Impact Protective Systems
 ASTM E1996
 Impacted by Windborne Debris in Hurricanes”
 AAMA/WDMA/CSA
 “Standard/Specification for Windows, Doors, and Unit Skylights”
 101/I.S.2/A440
 FEMA Publication 320 “Taking Shelter From the Storm: Building a Safe Room for Your Home or Small Business”, investigated with
 (2021) respect to impact and pressure requirements only.
 FEMA Publication 361 “Design and Construction Guidance for Community Safe Rooms”, investigated with respect to impact and




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 (2021) pressure requirements only.
 “ICC/NSSA Standard for the Design and Construction of Storm Shelters”, investigated with respect to impact
 and pressure testing. Minimum missile impact speeds vary with the design wind speed desired for a particular
 ICC 500 (2014/2020)
 product. The information below correlates design wind speed to the minimum missile speeds as discussed in
 Table 305.1.1 of ICC 500

Any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and Sargent Manufacturing
Company makes no representations or warranties concerning what such impact may be in any specific situation. When retrofitting any portion
of an existing fire rated opening, or specifying and installing a new fire-rated opening, please consult with a code specialist or local code official
(Authority Having Jurisdiction) to ensure compliance with all applicable codes and ratings.




 1-800-727-5477 • www.sargentlock.com
 7 90641
', 4455, 1, 'windstorm certifications
80 series


windstorm certifications: florida building codes & ul listings
sargent manufacturing’s products meet building codes that require hurricane, windstorm and fema certifications, including some of the
most stringent building codes as specified in the florida building code, miami dade code and the international building code. listed below
are certifications and standards met by the 80 series lock.


florida building code: fl2998
ul certification directory: zhem.r21744 – latching hardware
 ansi/sdi-bhma a250.13 “testing and rating of severe windstorm resistant components for swinging door assemblies”
 “standard test method for structural performance of exterior windows, doors, skylights and curtain walls by
 ansi/astm e330
 uniform static air pressure difference”
 “standard test method for performance of exterior windows, curtain walls, doors, and impact protective
 ansi/astm e1886
 systems impacted by missile(s) and exposed to cyclic pressure differentials”
 “standard specification for performance of exterior windows, curtain walls, doors and impact protective systems
 astm e1996
 impacted by windborne debris in hurricanes”

 (tas) 201 “impact test procedures”*

 “standard test method for structural performance of exterior windows, doors, skylights and curtain walls by
 (tas) 202
 uniform static air pressure difference”

 (tas) 203 “criteria for testing products subject to cyclic wind pressure loading”*




 07/25
* published in the “florida building code”
any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and sargent manufacturing
company makes no representations or warranties concerning what such impact may be in any specific situation. when retrofitting any portion




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
of an existing fire rated opening, or specifying and installing a new fire-rated opening, please consult with a code specialist or local code official
(authority having jurisdiction) to ensure compliance with all applicable codes and ratings.


ul certification directory: zhll.r21744 – products for use in windstorm-rated assemblies
certifications to meet assembly requirements are done in conjunction with doors from assa abloy group companies ceco door and
curries.

 “standard test method for structural performance of exterior windows, doors, skylights and curtain walls by
 astm e330
 uniform static air pressure difference”
 “standard test method for performance of exterior windows, curtain walls, doors, and impact protective
 ansi/astm e1886
 systems impacted by missile(s) and exposed to cyclic pressure differentials”
 “standard specification for performance of exterior windows, curtain walls, doors and impact protective systems
 astm e1996
 impacted by windborne debris in hurricanes”
 aama/wdma/csa
 “standard/specification for windows, doors, and unit skylights”
 101/i.s.2/a440
 fema publication 320 “taking shelter from the storm: building a safe room for your home or small business”, investigated with
 (2021) respect to impact and pressure requirements only.
 fema publication 361 “design and construction guidance for community safe rooms”, investigated with respect to impact and




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 (2021) pressure requirements only.
 “icc/nssa standard for the design and construction of storm shelters”, investigated with respect to impact
 and pressure testing. minimum missile impact speeds vary with the design wind speed desired for a particular
 icc 500 (2014/2020)
 product. the information below correlates design wind speed to the minimum missile speeds as discussed in
 table 305.1.1 of icc 500

any retrofit or other field modification to a fire rated opening can potentially impact the fire rating of the opening, and sargent manufacturing
company makes no representations or warranties concerning what such impact may be in any specific situation. when retrofitting any portion
of an existing fire rated opening, or specifying and installing a new fire-rated opening, please consult with a code specialist or local code official
(authority having jurisdiction) to ensure compliance with all applicable codes and ratings.




 1-800-727-5477 • www.sargentlock.com
 7 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 8, ' 8888/8810 Multi-Function Rim
 Exit Device and Trims
 80 Series

 8888/8810 Multi-Function exit device and trim
 • Device & trim sold separately; easy to mix and match
 • Designed for standard width stile applications on wood and
 metal doors
 • 7 functions available as determined by the trim function
 • 3 trim designs available:
 - 700 ET Controls
 - 88 Lever & Rose trim
 - Pull trims
 • Single and double door applications with a mullion
 Specifications
 Door Type Wood or metal Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4"
 thick, specify thickness and order as 31-
 Stile 4-1/2" (114mm) minimum stile width
 The 8888/8810 Rim Exit Device
 • ANSI/BHMA A156.3 - Grade 1 Mounting Supplied standard with wood and machine screws 
 • UL10C (Fire) and UL305 (Panic) Listed Available with through-bolts and mortise nuts
 • Device is non-handed Chassis Cover Cold drawn stainless steel, brass or bronze with ANSI/BHMA Finishes
 • ANSI/BHMA architectural finishes Chassis Nonferrous alloy (Panic) Ferrous alloy (Fire Rated)
 • Four standard sizes available Rails Roll Formed Stainless Steel, Brass or Bronze with ANSI/BHMA Finishes
 To Order: Specify options, 8888 or 8810, Hand Non-handed
 Rail Size and Finish Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for




 07/25
 Example: 12-19-8888F x 32D (Non 12- only) cylinder dogging (#41 cylinder supplied)

 Latchbolt Stainless steel, 3/4" (19mm) throw




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Strike 649 Strike supplied standard for panic & fire rated openings
 700 Series ET Control Fire Exit Hardware See chart - Page 6
 3-9/16" MAX* Rail Chart
 (90mm)
 - Rails are available in 4 sizes, use door width to determine size needed.
 - Rails will be factory cut to size if door width is supplied or can be cut in the field
 Stock Size Door Widths Remarks
 E 24" to 32" (61cm to 81cm) No cutting required for 32" (81cm) door
 8-1/16"
 (205mm)
 F 33" to 36" (84cm to 91cm) No cutting required for 36" (91cm) door
 J 37" to 42" (94cm to 107cm) No cutting required for 42" (107cm) door
 G 43'' to 48" (110cm to 122cm) No cutting required for 48" (122cm) door

 1-13/16" 13/16" 88 Lever and Rose Trim
 (46mm) (21mm)
 • The 88 Lever and Rose Trim is sold separately
 from the exit device and can be used with 8888
 & 8810 Exit Device.
 • The trim is non handed and is through-bolted
 LB to the chassis for greater security and durability.
 ROSE: L




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Available in 4 functions and 4 lever designs to
 The 700 Series ET Control is sold LEVER: B accommodate most requirements.
 separately from the exit device and can
 be used with 8888 & 8810 Exit Device. 688 Trim Retrofit Kit
 The trim is non handed and is through-
 649 Strike
 1-5/32"
 bolted to the chassis for greater security • 688 Trim Retrofit kit allows an • Supplied standard (29mm)
 and durability. Available in 7 functions 8810/8888 rim exit with an ET to for panic & fire rated
 and SARGENT Studio, Coastal and replace Von Duprin’s 98/99 series openings
 standard lever designs to accommodate exit with trim with minimal • Surface applied
 most requirements. door prep. 3-11/16"
 • Black nylon coated
 • ANSI/BHMA Finishes • Order as: 688 Kit 3/4"
 (94mm)

 • Easy operating lever handle allows (19mm) 1/4"
 convenient one hand operation (6mm)

 • ET trim is not available in 32 or 32D
 • Stainless steel levers are available


90641
 8 1-800-727-5477 • www.sargentlock.com
', 3684, 1, ' 8888/8810 multi-function rim
 exit device and trims
 80 series

 8888/8810 multi-function exit device and trim
 • device & trim sold separately; easy to mix and match
 • designed for standard width stile applications on wood and
 metal doors
 • 7 functions available as determined by the trim function
 • 3 trim designs available:
 - 700 et controls
 - 88 lever & rose trim
 - pull trims
 • single and double door applications with a mullion
 specifications
 door type wood or metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4"
 thick, specify thickness and order as 31-
 stile 4-1/2" (114mm) minimum stile width
 the 8888/8810 rim exit device
 • ansi/bhma a156.3 - grade 1 mounting supplied standard with wood and machine screws 
 • ul10c (fire) and ul305 (panic) listed available with through-bolts and mortise nuts
 • device is non-handed chassis cover cold drawn stainless steel, brass or bronze with ansi/bhma finishes
 • ansi/bhma architectural finishes chassis nonferrous alloy (panic) ferrous alloy (fire rated)
 • four standard sizes available rails roll formed stainless steel, brass or bronze with ansi/bhma finishes
 to order: specify options, 8888 or 8810, hand non-handed
 rail size and finish dogging feature hex key dogging standard on non fired rated devices; specify 16- for




 07/25
 example: 12-19-8888f x 32d (non 12- only) cylinder dogging (#41 cylinder supplied)

 latchbolt stainless steel, 3/4" (19mm) throw




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 strike 649 strike supplied standard for panic & fire rated openings
 700 series et control fire exit hardware see chart - page 6
 3-9/16" max* rail chart
 (90mm)
 - rails are available in 4 sizes, use door width to determine size needed.
 - rails will be factory cut to size if door width is supplied or can be cut in the field
 stock size door widths remarks
 e 24" to 32" (61cm to 81cm) no cutting required for 32" (81cm) door
 8-1/16"
 (205mm)
 f 33" to 36" (84cm to 91cm) no cutting required for 36" (91cm) door
 j 37" to 42" (94cm to 107cm) no cutting required for 42" (107cm) door
 g 43'' to 48" (110cm to 122cm) no cutting required for 48" (122cm) door

 1-13/16" 13/16" 88 lever and rose trim
 (46mm) (21mm)
 • the 88 lever and rose trim is sold separately
 from the exit device and can be used with 8888
 & 8810 exit device.
 • the trim is non handed and is through-bolted
 lb to the chassis for greater security and durability.
 rose: l




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 available in 4 functions and 4 lever designs to
 the 700 series et control is sold lever: b accommodate most requirements.
 separately from the exit device and can
 be used with 8888 & 8810 exit device. 688 trim retrofit kit
 the trim is non handed and is through-
 649 strike
 1-5/32"
 bolted to the chassis for greater security • 688 trim retrofit kit allows an • supplied standard (29mm)
 and durability. available in 7 functions 8810/8888 rim exit with an et to for panic & fire rated
 and sargent studio, coastal and replace von duprin’s 98/99 series openings
 standard lever designs to accommodate exit with trim with minimal • surface applied
 most requirements. door prep. 3-11/16"
 • black nylon coated
 • ansi/bhma finishes • order as: 688 kit 3/4"
 (94mm)

 • easy operating lever handle allows (19mm) 1/4"
 convenient one hand operation (6mm)

 • et trim is not available in 32 or 32d
 • stainless steel levers are available


90641
 8 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 9, '8888/8810 Multi-Function Rim
Exit Device and Trims
80 Series


How to order 8888/8810 Multi-Function Exit Devices: How to order trim for 8888 & 8810 Exit Devices:
Specify the following: Specify the following:
 Options Series Rail Finish Options Trim Designation Hand Finish Options
 16- 8888 or 8810 F 32D 10- 713-8 ET_* RHR 26D
 10- 88-CL_ * Non-Handed 10B Exit Trim
• All trims and functions listed on this page, work with 8888 & 8810 Exit 60- 814-MSL RHR 04
 12-
Devices *16- 10-
• Available options listed at the right *Specify lever design 19- 11-
• 8888 & 8810 are identical products and are non-handed Available Options listed at the right 43- 11-70-
• Exit devices are not available in 14, 15, 26 and 26D finishes 5CH- 11-72-7P-
 GL- 11-73-7P-
 CPC- 21-
 LC-
700 Series ET Trim SARGENT ANSI LD-
 60-
 63-
 PL-
 Function Function Description & Cylinder Info 64-
 +70-
 Numbers Numbers (1-3/4" Door) Trim Designations
 +72-
 Night Latch +73-
 04 03 Key Retracts Latch 704 ET_ x Hand & Finish +73-7P-
 #34 Cylinder Supplied +65-73-
 No outside operation (No Cylinder) +65-73-7P-
 10 02 ET Control is used as Pull Only 710 ET_ x Hand & Finish BR-
 LC-
 SC-
 Key Outside Unlocks/Locks Trim
 13 08 #41 Cylinder Supplied 713-8 ET_ x Hand & Finish SE-
 ++ SF-
 *** SG-
700 Series ET Controls 15 14 Passage Only (No cylinder) 715-8 ET_ x Hand & Finish
To order: Specify options followed by Freewheeling Trim - * Supplied with
trim designation, lever design, hand 40 02 No outside operation 740 ET_ x Hand & Finish standard 41 cylinder,
and finish (as shown to the right). (No Cylinder) Dummy Trim for cylinder options,




 07/25
 Freewheeling Trim - see trim options
Example: 11-SG-713-8 x RHR x 10B
 43 08 Key Outside Unlocks/Locks Trim 743-8 ET_ x Hand & Finish ** Only available with
Freewheeling Trim #41 Cylinder Supplied 15, 26D and 32D
 Freewheeling Trim - finishes




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
The lever rotates when the door is 44 03 Key Retracts Latch 744 ET_ x Hand & Finish +  Single crossed
locked preventing excessive force #34 Cylinder Supplied options are not
from being applied to the horizontal available with 88
 Note: ET trim is not available in 32 (629) or 32D (630) Lever & Rose Trim
lever
 with J Lever
 ++ Double Cross
88 Lever and Rose Trim ANSI options
To order: Specify options followed Function are only available
 with 88 Lever &
by trim designation, lever design and Numbers Description Trim Designations Rose Trim
finish (as shown to the right).
 Key Retracts Latch
Example: 10-SG-88-CLP x 26D 03 Cylinder Supplied 88-KL_ x Finish
 No outside Operation (No Cylinder)
 02 Dummy Trim 88-DL_ x Finish
 Key Outside Unlocks/locks Trim
 08 Cylinder Supplied 88-CL_ x Finish
 Available
 14 Passage Only (No cylinder) 88-LL_ x Finish Finishes
 Lever Designs available for 88 Lever & Rose Trim are L, B, J & P
 Note: For 88 Lever & Rose trim, the 1st letter is the function, the 2nd is the “L” Rose Design & the 3rd is the SARGENT BHMA
 Finishes Finishes
 lever design specified
 03 605
 04 606
Keyed & Non Keyed Pull Trim for 8888 & 8810 Devices Trim Designations 09 611




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
Use the six digit designation (Ex “866-MAL”) when ordering 10 612
trim without an Exit Device, always specify options, 10B 613
designation, finish & hand 10BE 613E
Example: 10-SG-814-FSW x 04 x RHR 10BL 613L
 14 618
 SARGENT Description & Cylinder 15 619
 Function #’s ANSI Info. (1-3/4" Door) 20D 624
 Key Retracts Latch 26 625
 04 03 #34 Cylinder Supplied
 814-FSL* 814-FSW* 814-MSL* 814-PSB* 814-STS
 26D 626
 32 629
 No O/S Operation or Cylinder
 10 02 (Pull Only)
 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 32D 630
Note: 88 Lever & Rose trim & ET’s are not available in 32(629) or 32D(630) BSP —
* FSL, FSW, MSL and PSB trims are used with (HC-& 12-) 8888 and 8804 only and are the same as FLL, FLW, MAL and PTB pulls, except for cylinder hole located 3/8”
(9mm) lower
 WSP
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D


 1-800-727-5477 • www.sargentlock.com
 9 90641
', 4235, 1, '8888/8810 multi-function rim
exit device and trims
80 series


how to order 8888/8810 multi-function exit devices: how to order trim for 8888 & 8810 exit devices:
specify the following: specify the following:
 options series rail finish options trim designation hand finish options
 16- 8888 or 8810 f 32d 10- 713-8 et_* rhr 26d
 10- 88-cl_ * non-handed 10b exit trim
• all trims and functions listed on this page, work with 8888 & 8810 exit 60- 814-msl rhr 04
 12-
devices *16- 10-
• available options listed at the right *specify lever design 19- 11-
• 8888 & 8810 are identical products and are non-handed available options listed at the right 43- 11-70-
• exit devices are not available in 14, 15, 26 and 26d finishes 5ch- 11-72-7p-
 gl- 11-73-7p-
 cpc- 21-
 lc-
700 series et trim sargent ansi ld-
 60-
 63-
 pl-
 function function description & cylinder info 64-
 +70-
 numbers numbers (1-3/4" door) trim designations
 +72-
 night latch +73-
 04 03 key retracts latch 704 et_ x hand & finish +73-7p-
 #34 cylinder supplied +65-73-
 no outside operation (no cylinder) +65-73-7p-
 10 02 et control is used as pull only 710 et_ x hand & finish br-
 lc-
 sc-
 key outside unlocks/locks trim
 13 08 #41 cylinder supplied 713-8 et_ x hand & finish se-
 ++ sf-
 *** sg-
700 series et controls 15 14 passage only (no cylinder) 715-8 et_ x hand & finish
to order: specify options followed by freewheeling trim - * supplied with
trim designation, lever design, hand 40 02 no outside operation 740 et_ x hand & finish standard 41 cylinder,
and finish (as shown to the right). (no cylinder) dummy trim for cylinder options,




 07/25
 freewheeling trim - see trim options
example: 11-sg-713-8 x rhr x 10b
 43 08 key outside unlocks/locks trim 743-8 et_ x hand & finish ** only available with
freewheeling trim #41 cylinder supplied 15, 26d and 32d
 freewheeling trim - finishes




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
the lever rotates when the door is 44 03 key retracts latch 744 et_ x hand & finish +  single crossed
locked preventing excessive force #34 cylinder supplied options are not
from being applied to the horizontal available with 88
 note: et trim is not available in 32 (629) or 32d (630) lever & rose trim
lever
 with j lever
 ++ double cross
88 lever and rose trim ansi options
to order: specify options followed function are only available
 with 88 lever &
by trim designation, lever design and numbers description trim designations rose trim
finish (as shown to the right).
 key retracts latch
example: 10-sg-88-clp x 26d 03 cylinder supplied 88-kl_ x finish
 no outside operation (no cylinder)
 02 dummy trim 88-dl_ x finish
 key outside unlocks/locks trim
 08 cylinder supplied 88-cl_ x finish
 available
 14 passage only (no cylinder) 88-ll_ x finish finishes
 lever designs available for 88 lever & rose trim are l, b, j & p
 note: for 88 lever & rose trim, the 1st letter is the function, the 2nd is the “l” rose design & the 3rd is the sargent bhma
 finishes finishes
 lever design specified
 03 605
 04 606
keyed & non keyed pull trim for 8888 & 8810 devices trim designations 09 611




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
use the six digit designation (ex “866-mal”) when ordering 10 612
trim without an exit device, always specify options, 10b 613
designation, finish & hand 10be 613e
example: 10-sg-814-fsw x 04 x rhr 10bl 613l
 14 618
 sargent description & cylinder 15 619
 function #’s ansi info. (1-3/4" door) 20d 624
 key retracts latch 26 625
 04 03 #34 cylinder supplied
 814-fsl* 814-fsw* 814-msl* 814-psb* 814-sts
 26d 626
 32 629
 no o/s operation or cylinder
 10 02 (pull only)
 810-fll 810-flw 810-mal 810-ptb 810-sts 32d 630
note: 88 lever & rose trim & et’s are not available in 32(629) or 32d(630) bsp —
* fsl, fsw, msl and psb trims are used with (hc-& 12-) 8888 and 8804 only and are the same as fll, flw, mal and ptb pulls, except for cylinder hole located 3/8”
(9mm) lower
 wsp
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d


 1-800-727-5477 • www.sargentlock.com
 9 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 10, ' 8800 Rim Exit Device
 80 Series

 8800 Series 8800 Features
 Rim Exit Device • Designed for standard width stile applications on wood and metal doors
 • Also available as an HC8800 or WS8800 for hurricane-resistant
 applications, see Hurricane-Resistant section of this catalog
 • Single point rim latching device
 • Single door & double door applications with mullions
 • Quiet operation and solid security
 • ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) Listed



 Specifications 8800 Series Rim Exit Device
 Door Type Metal Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 5" thick,
 specify thickness and order as 31- (see page 67 for function limitation)
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as determined Rails are available in 4 sizes, use door width to determine size
 by door width needed. Rails will be factory cut to size, if door width is supplied.
 • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door 49- Lock/Unlock Indicator
 • J Rail for 37" to 42" door widths, No cutting required for 42" door Option
 • G Rail for 43" to 48" door widths, No cutting required for 48" door




 07/25
 Strike 649 Standard Black Nylon Coated • Displays whether the door
 has been secured by the
 Optional Strikes 642, 644 and 613 inside cylinder.




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for • Red icon indicates locked
 cylinder dogging (#41 cylinder supplied)
 • White icon indicates
 Electric Options AL- Alarm
 unlocked
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring • Dogging overrides 49-
 55- Request-to-Exit Signal - Rail Monitoring functionality (must order less
 56- Remote Latch Retraction dogging)
 58- Electric Dogging • Available on 8816 and 8866
 59- Electroguard – Self Contained Delayed Egress functions only
 Weather Resistant WH- Weep Holes (Available only with Clear Coated Finishes. See
 Chart - Page 77)
 649 Strike
 Mounting Fasteners Supplied standard with wood and machine screws • Supplied standard for panic
 Available with through-bolts and mortise (sex) nuts & fire rated openings
 Latch Bolt Stainless steel, 3/4" (19mm) throw • Surface applied
 Device Centerline from 41" (1041 mm) for Standard Applications • Black nylon coated
 Finished Floor
 Center Case 8-3/8" (213mm) x 2-5/8" (67mm)
 Dimensions
 Projection Pushbar Neutral – 3" (76 mm)
 Pushbar Depressed – 2-1/8" (54 mm)
 Fire Exit Hardware See Chart – Page 6




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 688 Trim Retrofit Kit Alternate Strikes For 8800 Rim Devices
 642 Strike 644 Strike 613 Strike
 • 688 Trim Retrofit kit
 allows an 8800* Series 7/16"
 (38mm)
 rim exit with an ET to 3-5/8" 2"
 replace Von Duprin’s 3-5/8"
 (92mm) (92mm)
 (92mm)
 98/99 Series exit with
 trim with minimal door “L”
 1-1/2" 2-7/16"
 prep. (38mm) (62mm)
 1-1/2"
 1-1/2"
 * Except for 16 function (38mm)
 (38mm)
 1/4"
 5/8"
 • Order as: 688 Kit (6mm)
 (16mm)
 • Mortised. Dimension “L” • Surface applied. For use 
 equals door thickness plus on pairs of doors without 
 1/2" (13mm). Black nylon mullion. Ductile Iron. • Half mortised.
 coated on lip only Black nylon coated Black nylon coated

90641
 10 1-800-727-5477 • www.sargentlock.com
', 3552, 1, ' 8800 rim exit device
 80 series

 8800 series 8800 features
 rim exit device • designed for standard width stile applications on wood and metal doors
 • also available as an hc8800 or ws8800 for hurricane-resistant
 applications, see hurricane-resistant section of this catalog
 • single point rim latching device
 • single door & double door applications with mullions
 • quiet operation and solid security
 • ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed



 specifications 8800 series rim exit device
 door type metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 5" thick,
 specify thickness and order as 31- (see page 67 for function limitation)
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as determined rails are available in 4 sizes, use door width to determine size
 by door width needed. rails will be factory cut to size, if door width is supplied.
 • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door 49- lock/unlock indicator
 • j rail for 37" to 42" door widths, no cutting required for 42" door option
 • g rail for 43" to 48" door widths, no cutting required for 48" door




 07/25
 strike 649 standard black nylon coated • displays whether the door
 has been secured by the
 optional strikes 642, 644 and 613 inside cylinder.




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for • red icon indicates locked
 cylinder dogging (#41 cylinder supplied)
 • white icon indicates
 electric options al- alarm
 unlocked
 53- lx latchbolt monitor
 54- outside lever monitoring • dogging overrides 49-
 55- request-to-exit signal - rail monitoring functionality (must order less
 56- remote latch retraction dogging)
 58- electric dogging • available on 8816 and 8866
 59- electroguard – self contained delayed egress functions only
 weather resistant wh- weep holes (available only with clear coated finishes. see
 chart - page 77)
 649 strike
 mounting fasteners supplied standard with wood and machine screws • supplied standard for panic
 available with through-bolts and mortise (sex) nuts & fire rated openings
 latch bolt stainless steel, 3/4" (19mm) throw • surface applied
 device centerline from 41" (1041 mm) for standard applications • black nylon coated
 finished floor
 center case 8-3/8" (213mm) x 2-5/8" (67mm)
 dimensions
 projection pushbar neutral – 3" (76 mm)
 pushbar depressed – 2-1/8" (54 mm)
 fire exit hardware see chart – page 6




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 688 trim retrofit kit alternate strikes for 8800 rim devices
 642 strike 644 strike 613 strike
 • 688 trim retrofit kit
 allows an 8800* series 7/16"
 (38mm)
 rim exit with an et to 3-5/8" 2"
 replace von duprin’s 3-5/8"
 (92mm) (92mm)
 (92mm)
 98/99 series exit with
 trim with minimal door “l”
 1-1/2" 2-7/16"
 prep. (38mm) (62mm)
 1-1/2"
 1-1/2"
 * except for 16 function (38mm)
 (38mm)
 1/4"
 5/8"
 • order as: 688 kit (6mm)
 (16mm)
 • mortised. dimension “l” • surface applied. for use 
 equals door thickness plus on pairs of doors without 
 1/2" (13mm). black nylon mullion. ductile iron. • half mortised.
 coated on lip only black nylon coated black nylon coated

90641
 10 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 11, '8800 Functions and Trims
80 Series

 Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 F1-83-56 88 13 F ETL RHR 26D 32D 36"
 Options
700 Series ET Trim SARGENT ANSI ANSI Type 1
 8800
 
 Exits with ET Trim, specify Function Function Description & Cylinder Info 8800
 lever design after the ET Numbers Numbers (1-3/4" Door) Panic & Fire Mechanical Options:
 designation (e.g., ETL) 12-
 Night Latch
 16-
 04 03 Key Retracts Latch 8804 x ET_ 19-
 #34 Cylinder Supplied 31-
 Key unlocks Trim, Trim retracts latch/ 36-
 37-
 06 09 Trim relocks when key is removed 8806 x ET_ 43-
 #41 Cylinder Supplied 53-
 54-
 10 01 No outside operation (No Cylinder) 8810 55-
 56-
 No outside operation (No Cylinder)
 10 02 ET Control is used as Pull Only 8810 x ET_ 56-HK-
Lever Designs for ET Controls 58-
 59-
A, B, E, F, J, L, P, W Key Outside Unlocks/locks Trim 5CH-
 13 08 #41 Cylinder Supplied 8813 x ET_ BC-59-
Also available with Coastal Series & 76-
 85-
Studio Collection Levers 15 14 Passage Only (No cylinder) 8815 x ET_ 86-
 87-
 Key Outside Retracts Latch;
ET Designation with Suffix 16 10 Key Inside Unlocks/Locks O/S Trim 8816 x ET_
 AL-
 BT-
(Used to order ET without device) O/S #34 Cylinder & I/S #44 Cylinder Supplied CPC-
 GL-
8800 Series: 704, 706-8, 710, 713-8, Freewheeling Trim - LD-
715-8, 716, 740, 743-8, 744, 746-8, 40 02 No outside operation 8840 x ET_ PL-
773-8, 774-8, 775-8 & 776-8 (No Cylinder) Dummy Trim ** SG-
 TB-
 Freewheeling Trim - TL-
Freewheeling Trim 43 08 Key Outside Unlocks/locks Trim 8843 x ET_ WH-
 #41 Cylinder Supplied Cylinder Options:
The lever rotates when the door is 10-
 Freewheeling Trim - 10-21-
locked preventing excessive force
 44 03 Key Retracts Latch 8844 x ET_ 10-63-
from being applied to the horizontal #34 Cylinder Supplied 11-




 07/25
lever 11-21-
 Freewheeling Trim - 11-60-
 Key unlocks Trim, Trim retracts latch/ 11-63-
 46 09 Trim relocks when key is removed 8846 x ET_ 11-64-
 11-70-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Electrified ET Trim #41 Cylinder Supplied 11-72-7P-
 11-73-7P-
 Electrified ET Trim - Fail Safe
Voltage must be specified for the 73 Power Off, Unlocks Lever (No Cylinder) 8873 x ET_ 11-65-73-7P-
following functions: 73, 74, 75 and 76. 21-
 51-
Specify: 12VDC or 24VDC Electrified ET Trim - Fail Secure
 74 Power Off, Locks Lever (No Cylinder) 8874 x ET_ 52-
 60-
 63-
 Electrified ET Trim - Fail Safe 64-
 75 Power Off, Unlocks Lever, Key Retracts Latch 8875 x ET_ 70-
 #34 Cylinder Supplied 72-
 73-
 Electrified ET Trim - Fail Secure 65-73-
 76 Power Off, Locks Lever, Key Retracts Latch 8876 x ET_ 65-73-7P-
 #34 Cylinder Supplied 73-7P-
 81-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are supplied in 32 82-
 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel finishes, specify 14/32 or 15/32D to F1-82-
 receive nickel finished trims and stainless exit devices 83-
 F1-83-
Pull & Thumbpiece Trim Section Trim Designations Series 84-
 BR-
 • Use three letter designations (Ex “PTB”) when ordering the LC-
 Exit Device with trim *SC-
 *SE-
 • Use the six digit designation (Ex “866-MAL”) when ordering
 trim without an Exit Device, always specify finish * Options are not
 available with 8816
 ** Only available with
 15, 26D and 32D
 Description & finishes
 SARGENT ANSI
 Function Cylinder Info. Available
 Function 8800
 Numbers (1-3/4" Door)
 Numbers Panic & Fire Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Night Latch 814- 814- 8804 x Trim SARGENT BHMA
 04 03 Key Retracts Latch 814-FSL* 814-PSB* 814-STS 862 Pull
 #34 Cylinder Supplied FSW* MSL* Designation Finishes Finishes

 03 605
 No O/S Operation or 8810 x Trim
 10 02 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 862 Pull 04 606
 Cylinder (Pull Only) Designation 09 611
 Passage Only 8828 x Trim 10 612
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS N/A Designation 10B 613
 10BE 613E
 Key Outside Unlocks/ 8863 x Trim 10BL 613L
 63 05 Locks Thumbpiece 866-FLL 866-FLW 866-MAL 866-PTB 866-STS N/A Designation 14
 #34 Cylinder Supplied 618
 15 619
 Key Outside Retracts Latch; 20D 624
 8866 x Trim
 66 07 Key Inside Unlocks/Locks 866-FLL 866-FLW 866-MAL 866-PTB 866-STS N/A Designation
 26 625
 O/S Trim O/S #34 & I/S #44 26D 626
* FSL, FSW, MSL and PSB trims are used with (HC-& 12-) 8888 and 8804 only and are the same as FLL, FLW, MAL and PTB pulls except for cylinder hole located 3/8” 32 629
(9mm) lower. 32D 630
Note: Thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately. BSP 32DCP
Note: FLW & FSW trims are not available in 32(629) or 32D(630).
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D. WSP


 1-800-727-5477 • www.sargentlock.com
 11 90641
', 5077, 1, '8800 functions and trims
80 series

 options series function rail lgth trim hand outside finish inside finish door width
 f1-83-56 88 13 f etl rhr 26d 32d 36"
 options
700 series et trim sargent ansi ansi type 1
 8800
 
 exits with et trim, specify function function description & cylinder info 8800
 lever design after the et numbers numbers (1-3/4" door) panic & fire mechanical options:
 designation (e.g., etl) 12-
 night latch
 16-
 04 03 key retracts latch 8804 x et_ 19-
 #34 cylinder supplied 31-
 key unlocks trim, trim retracts latch/ 36-
 37-
 06 09 trim relocks when key is removed 8806 x et_ 43-
 #41 cylinder supplied 53-
 54-
 10 01 no outside operation (no cylinder) 8810 55-
 56-
 no outside operation (no cylinder)
 10 02 et control is used as pull only 8810 x et_ 56-hk-
lever designs for et controls 58-
 59-
a, b, e, f, j, l, p, w key outside unlocks/locks trim 5ch-
 13 08 #41 cylinder supplied 8813 x et_ bc-59-
also available with coastal series & 76-
 85-
studio collection levers 15 14 passage only (no cylinder) 8815 x et_ 86-
 87-
 key outside retracts latch;
et designation with suffix 16 10 key inside unlocks/locks o/s trim 8816 x et_
 al-
 bt-
(used to order et without device) o/s #34 cylinder & i/s #44 cylinder supplied cpc-
 gl-
8800 series: 704, 706-8, 710, 713-8, freewheeling trim - ld-
715-8, 716, 740, 743-8, 744, 746-8, 40 02 no outside operation 8840 x et_ pl-
773-8, 774-8, 775-8 & 776-8 (no cylinder) dummy trim ** sg-
 tb-
 freewheeling trim - tl-
freewheeling trim 43 08 key outside unlocks/locks trim 8843 x et_ wh-
 #41 cylinder supplied cylinder options:
the lever rotates when the door is 10-
 freewheeling trim - 10-21-
locked preventing excessive force
 44 03 key retracts latch 8844 x et_ 10-63-
from being applied to the horizontal #34 cylinder supplied 11-




 07/25
lever 11-21-
 freewheeling trim - 11-60-
 key unlocks trim, trim retracts latch/ 11-63-
 46 09 trim relocks when key is removed 8846 x et_ 11-64-
 11-70-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
electrified et trim #41 cylinder supplied 11-72-7p-
 11-73-7p-
 electrified et trim - fail safe
voltage must be specified for the 73 power off, unlocks lever (no cylinder) 8873 x et_ 11-65-73-7p-
following functions: 73, 74, 75 and 76. 21-
 51-
specify: 12vdc or 24vdc electrified et trim - fail secure
 74 power off, locks lever (no cylinder) 8874 x et_ 52-
 60-
 63-
 electrified et trim - fail safe 64-
 75 power off, unlocks lever, key retracts latch 8875 x et_ 70-
 #34 cylinder supplied 72-
 73-
 electrified et trim - fail secure 65-73-
 76 power off, locks lever, key retracts latch 8876 x et_ 65-73-7p-
 #34 cylinder supplied 73-7p-
 81-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are supplied in 32 82-
 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel finishes, specify 14/32 or 15/32d to f1-82-
 receive nickel finished trims and stainless exit devices 83-
 f1-83-
pull & thumbpiece trim section trim designations series 84-
 br-
 • use three letter designations (ex “ptb”) when ordering the lc-
 exit device with trim *sc-
 *se-
 • use the six digit designation (ex “866-mal”) when ordering
 trim without an exit device, always specify finish * options are not
 available with 8816
 ** only available with
 15, 26d and 32d
 description & finishes
 sargent ansi
 function cylinder info. available
 function 8800
 numbers (1-3/4" door)
 numbers panic & fire finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 night latch 814- 814- 8804 x trim sargent bhma
 04 03 key retracts latch 814-fsl* 814-psb* 814-sts 862 pull
 #34 cylinder supplied fsw* msl* designation finishes finishes

 03 605
 no o/s operation or 8810 x trim
 10 02 810-fll 810-flw 810-mal 810-ptb 810-sts 862 pull 04 606
 cylinder (pull only) designation 09 611
 passage only 8828 x trim 10 612
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts n/a designation 10b 613
 10be 613e
 key outside unlocks/ 8863 x trim 10bl 613l
 63 05 locks thumbpiece 866-fll 866-flw 866-mal 866-ptb 866-sts n/a designation 14
 #34 cylinder supplied 618
 15 619
 key outside retracts latch; 20d 624
 8866 x trim
 66 07 key inside unlocks/locks 866-fll 866-flw 866-mal 866-ptb 866-sts n/a designation
 26 625
 o/s trim o/s #34 & i/s #44 26d 626
* fsl, fsw, msl and psb trims are used with (hc-& 12-) 8888 and 8804 only and are the same as fll, flw, mal and ptb pulls except for cylinder hole located 3/8” 32 629
(9mm) lower. 32d 630
note: thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately. bsp 32dcp
note: flw & fsw trims are not available in 32(629) or 32d(630).
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d. wsp


 1-800-727-5477 • www.sargentlock.com
 11 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 12, ' 8900 Mortise Lock Exit Device
 80 Series

 8900 Features
 8900 Series • Designed for standard width stile applications on wood and metal doors
 Mortise Lock Exit Device • Concealed single point guarded latching for additional security
 • Also available as a WS8900 for additional certifications and listings, see
 Hurricane-Resistant section of this catalog
 • Single door applications
 • Double door applications with Vertical Rod
 • ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) Listed
 Specifications for 8900 Mortise Lock Exit
 Door Type Metal Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2 1/4" thick, specify thickness and order as 31-
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as determined Rails are available in 4 sizes, use door width to determine size needed.
 by door width Rails will be factory cut to size, if door width is supplied
 • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike C908 Standard Black Nylon Coated – ANSI Prep A115.1
 Optional Strikes – 815 Open Back Strike or 908 Flat Lipped Strike with Black Nylon
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder




 07/25
 supplied)
 Electric Options AL- Alarm
 PL- SARGuide™ Photoluminescent Coated




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress

 Mounting Fasteners Supplied standard with wood and machine screws
 Available with through-bolts and mortise (sex) nuts
 Latch Bolt Brass Nickel Plated, 3/4" (19mm) throw, anti-friction
 Guarded/DeadLatch Brass Nickel Plated, sliding type
 Device Centerline from 41" (1041 mm) for Standard Applications; 38" (965mm) for elementary schools
 Finished Floor
 Center Case 8-3/8" (213mm) x 2-5/8" (67mm)
 Dimensions
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6

 C908 Standard Strike Single Door 815 Open Back Strike
 • Curved lip ANSI A-115.1




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Trim
 • Handed. 1-1/4" (32mm) lip standard
 1-1/4" • Longer lips
 in increments
 (32mm)
 of 1/4" (6mm) 4-7/8" 3-3/8"
 (124mm) (86mm)
 through 2-7/8"
 (73mm) 
 available
 3-3/8" • Black nylon
 coated
 4-7/8" Pair of Doors
 (86mm) (124mm)
 1-1/4"
 Trim
 (32mm)

 • ANSI A-115.14 Open Back
 • Beveled 1/8" (3mm) in 2" (51mm)
 1-1/4" • Specify hand of active door
 (32mm) 3/32" • Black nylon coat
 (2mm) 815 Open back strike;
 Inactive door with vertical rods • “B” label


90641
 12 1-800-727-5477 • www.sargentlock.com
', 3142, 1, ' 8900 mortise lock exit device
 80 series

 8900 features
 8900 series • designed for standard width stile applications on wood and metal doors
 mortise lock exit device • concealed single point guarded latching for additional security
 • also available as a ws8900 for additional certifications and listings, see
 hurricane-resistant section of this catalog
 • single door applications
 • double door applications with vertical rod
 • ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed
 specifications for 8900 mortise lock exit
 door type metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2 1/4" thick, specify thickness and order as 31-
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as determined rails are available in 4 sizes, use door width to determine size needed.
 by door width rails will be factory cut to size, if door width is supplied
 • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike c908 standard black nylon coated – ansi prep a115.1
 optional strikes – 815 open back strike or 908 flat lipped strike with black nylon
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder




 07/25
 supplied)
 electric options al- alarm
 pl- sarguide™ photoluminescent coated




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress

 mounting fasteners supplied standard with wood and machine screws
 available with through-bolts and mortise (sex) nuts
 latch bolt brass nickel plated, 3/4" (19mm) throw, anti-friction
 guarded/deadlatch brass nickel plated, sliding type
 device centerline from 41" (1041 mm) for standard applications; 38" (965mm) for elementary schools
 finished floor
 center case 8-3/8" (213mm) x 2-5/8" (67mm)
 dimensions
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6

 c908 standard strike single door 815 open back strike
 • curved lip ansi a-115.1




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 trim
 • handed. 1-1/4" (32mm) lip standard
 1-1/4" • longer lips
 in increments
 (32mm)
 of 1/4" (6mm) 4-7/8" 3-3/8"
 (124mm) (86mm)
 through 2-7/8"
 (73mm) 
 available
 3-3/8" • black nylon
 coated
 4-7/8" pair of doors
 (86mm) (124mm)
 1-1/4"
 trim
 (32mm)

 • ansi a-115.14 open back
 • beveled 1/8" (3mm) in 2" (51mm)
 1-1/4" • specify hand of active door
 (32mm) 3/32" • black nylon coat
 (2mm) 815 open back strike;
 inactive door with vertical rods • “b” label


90641
 12 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 13, '8900 Functions and Trims
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 F1-83- 89 13 F ETL RHR 26 32 36"
 Options

 SARGENT ANSI ANSI Type 3 8900

 Function Function Description & Cylinder Info 8900
700 Series ET Trim Numbers Numbers (1-3/4" Door) Panic & Fire Mechanical Options:
 12-
 Exits with ET Trim, specify Night Latch 16-
 19-
 lever design after the ET 04 03 Key Retracts Latch 8904 x ET_ 23-
 designation (e.g., ETL) #46 Cylinder Supplied 31-
 36-
 Key unlocks Trim, Trim retracts Latch/ 37-
 06 09 Trim relocks when key is removed 8906 x ET_ 43-
 #41 Cylinder Supplied 53-
 54-
 55-
 10 01 No outside operation (No Cylinder) 8910 56-
 56-HK-
 No outside operation (No Cylinder)
 10 02 ET Control is used as Pull Only 8910 x ET_ 58-
 59-
 BC-59-
 76-
Lever Designs for ET Controls Key Outside Unlocks/locks Trim
 13 08 #41 Cylinder Supplied 8913 x ET_ 85-
 86-
A, B, E, F, J, L, P, W 87-
 AL-
Also available with Coastal Series &
Studio Collection Levers
 15 14 Passage Only (No cylinder) 8915 x ET_ BT-
 CPC-
 LD-
 Key Outside Retracts Latch; PL-
ET Designation with Suffix 16 10 Key Inside Unlocks/Locks O/S Trim 8916 x ET_ ** SG-
(Used to order ET without device) O/S #46 & I/S #34 Cylinder Supplied Cylinder Options:
 10-
8900 Series: 704, 706, 710, 713, Freewheeling Trim -
 10-21-
 10-63-
715, 716, 740, 743, 744, 773, 774, 40 02 No outside Operation 8940 x ET_ 11-
775 & 776 (No Cylinder) Dummy Trim 11-21-
 11-60-
 11-63-
Freewheeling Trim Freewheeling Trim - 11-64-




 07/25
 43 08 Key Outside Unlocks/locks Trim 8943 x ET_ 11-70-7P-
The lever rotates when the door is #41 Cylinder Supplied 11-72-7P-
locked preventing excessive force 11-73-7P-
 11-65-73-7P-
from being applied to the horizontal Freewheeling Trim - 21-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
lever 44 03 Key Retracts Latch 8944 x ET_ 51-
 For 1-3/4" Door #46 Cylinder Supplied 52-
 60-
Electrified ET Trim and Electrified ET Trim - Fail Safe 63-
 64-
Electrified Mortise Locks 75* Power Off, Unlocks Lever,
 8975 x ET_ 70-
 Key Retracts Latch 72-
Voltage must be specified for the For 1-3/4" Door #46 Cylinder Supplied 73-
following functions: 73, 74, 75 and Electrified ET Trim - Fail Secure 65-73-
76. Power Off, Locks Lever, 65-73-7P-
Specify: 12VDC or 24VDC
 76** Key Retracts Latch 8976 x ET_ 73-7P-
 81-
 For 1-3/4" Door #46 Cylinder Supplied 82-
 F1-82-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 83-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel F1-83-
 84-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices BR-
 * 75 Function without cylinder is available as a 73 Function LC-
 ** 76 Function without cylinder is available as a 74 Function *SC-
 *SE-

 * Options are not
Pull & Thumbpiece Trim Section Trim Designations available with the
 • Use three letter designations (Ex “PTB”) when ordering following functions:
 the Exit Device with trim 04 x ET, 16, 44,
 75 & 76
 • Use the six digit designation (Ex “866-MAL”) when ** Only available with
 ordering trim without an Exit Device, always specify finish Series 15, 26D and 32D
 & hand finishes



SARGENT ANSI Description & Cylinder Info. Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Function Function (1-3/4" Door) Finishes
Numbers Numbers 8900 Panic & Fire SARGENT BHMA
 Finishes Finishes
 Night Latch-Key Retracts Latch 8904 x Trim
 04 03 #41 Cylinder Supplied 814-FLL 814-FLW 814-MAL 814-PTB 814-STS
 Designation 03 605
 04 606
 No O/S Operation or Cylinder 8910 x Trim 611
 10 02 (Pull Only) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 09
 Designation 10 612
 Passage Only 8928 x Trim 10B 613
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS 10BE 613E
 Designation 613L
 10BL
 Key Outside Unlocks/locks Thumbpiece 8963 x Trim 14 618
 63 05 #41 Cylinder Supplied 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 15 619
 Designation
 20D 624
 Key Outside Retracts Latch;
 8966 x Trim 26 625
 66 07 Key Inside Unlocks/Locks Trim; 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 626
 O/S #34 & I/S #41 Cylinder Supplied Designation 26D
 32 629
Note: Thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately. 630
Note: FLW trim is not available in 32(629) or 32D(630). 32D
Note: Thumbpiece trims used with 8900 mortise lock exit devices are handed. BSP —
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D. WSP


 1-800-727-5477 • www.sargentlock.com
 13 90641
', 4858, 1, '8900 functions and trims
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width
 f1-83- 89 13 f etl rhr 26 32 36"
 options

 sargent ansi ansi type 3 8900

 function function description & cylinder info 8900
700 series et trim numbers numbers (1-3/4" door) panic & fire mechanical options:
 12-
 exits with et trim, specify night latch 16-
 19-
 lever design after the et 04 03 key retracts latch 8904 x et_ 23-
 designation (e.g., etl) #46 cylinder supplied 31-
 36-
 key unlocks trim, trim retracts latch/ 37-
 06 09 trim relocks when key is removed 8906 x et_ 43-
 #41 cylinder supplied 53-
 54-
 55-
 10 01 no outside operation (no cylinder) 8910 56-
 56-hk-
 no outside operation (no cylinder)
 10 02 et control is used as pull only 8910 x et_ 58-
 59-
 bc-59-
 76-
lever designs for et controls key outside unlocks/locks trim
 13 08 #41 cylinder supplied 8913 x et_ 85-
 86-
a, b, e, f, j, l, p, w 87-
 al-
also available with coastal series &
studio collection levers
 15 14 passage only (no cylinder) 8915 x et_ bt-
 cpc-
 ld-
 key outside retracts latch; pl-
et designation with suffix 16 10 key inside unlocks/locks o/s trim 8916 x et_ ** sg-
(used to order et without device) o/s #46 & i/s #34 cylinder supplied cylinder options:
 10-
8900 series: 704, 706, 710, 713, freewheeling trim -
 10-21-
 10-63-
715, 716, 740, 743, 744, 773, 774, 40 02 no outside operation 8940 x et_ 11-
775 & 776 (no cylinder) dummy trim 11-21-
 11-60-
 11-63-
freewheeling trim freewheeling trim - 11-64-




 07/25
 43 08 key outside unlocks/locks trim 8943 x et_ 11-70-7p-
the lever rotates when the door is #41 cylinder supplied 11-72-7p-
locked preventing excessive force 11-73-7p-
 11-65-73-7p-
from being applied to the horizontal freewheeling trim - 21-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
lever 44 03 key retracts latch 8944 x et_ 51-
 for 1-3/4" door #46 cylinder supplied 52-
 60-
electrified et trim and electrified et trim - fail safe 63-
 64-
electrified mortise locks 75* power off, unlocks lever,
 8975 x et_ 70-
 key retracts latch 72-
voltage must be specified for the for 1-3/4" door #46 cylinder supplied 73-
following functions: 73, 74, 75 and electrified et trim - fail secure 65-73-
76. power off, locks lever, 65-73-7p-
specify: 12vdc or 24vdc
 76** key retracts latch 8976 x et_ 73-7p-
 81-
 for 1-3/4" door #46 cylinder supplied 82-
 f1-82-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 83-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel f1-83-
 84-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices br-
 * 75 function without cylinder is available as a 73 function lc-
 ** 76 function without cylinder is available as a 74 function *sc-
 *se-

 * options are not
pull & thumbpiece trim section trim designations available with the
 • use three letter designations (ex “ptb”) when ordering following functions:
 the exit device with trim 04 x et, 16, 44,
 75 & 76
 • use the six digit designation (ex “866-mal”) when ** only available with
 ordering trim without an exit device, always specify finish series 15, 26d and 32d
 & hand finishes



sargent ansi description & cylinder info. available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 function function (1-3/4" door) finishes
numbers numbers 8900 panic & fire sargent bhma
 finishes finishes
 night latch-key retracts latch 8904 x trim
 04 03 #41 cylinder supplied 814-fll 814-flw 814-mal 814-ptb 814-sts
 designation 03 605
 04 606
 no o/s operation or cylinder 8910 x trim 611
 10 02 (pull only) 810-fll 810-flw 810-mal 810-ptb 810-sts 09
 designation 10 612
 passage only 8928 x trim 10b 613
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts 10be 613e
 designation 613l
 10bl
 key outside unlocks/locks thumbpiece 8963 x trim 14 618
 63 05 #41 cylinder supplied 866-fll 866-flw 866-mal 866-ptb 866-sts 15 619
 designation
 20d 624
 key outside retracts latch;
 8966 x trim 26 625
 66 07 key inside unlocks/locks trim; 866-fll 866-flw 866-mal 866-ptb 866-sts 626
 o/s #34 & i/s #41 cylinder supplied designation 26d
 32 629
note: thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately. 630
note: flw trim is not available in 32(629) or 32d(630). 32d
note: thumbpiece trims used with 8900 mortise lock exit devices are handed. bsp —
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d. wsp


 1-800-727-5477 • www.sargentlock.com
 13 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 14, ' 8700 Surface Vertical Rod Exit Device
 80 Series

 Features 646 Top Strike
 8700 Series • Two point latching (top & bottom with
 Surface Vertical Rod Exit Device adjustability through center case) • Standard for both Panic &
 • Standard bottom latch compatible with latch track Fire (12-) Hardware
 thresholds (by others) • Surface applied to frame
 • Single and double door applications • Black nylon coated
 • ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) Listed • Replaces 629 Strike
 • Also available as HC8700 for hurricane-resistant 1-5/32"
 (29mm)
 applications, see Hurricane-Resistant section of 3/4"
 (19mm) 1/4"
 this catalog (6mm)
 • Also available as FM8700, use with StormPro
 Series doors, frames and hinges is required when
 used as a certified tornado solution. For tornado-
 resistant applications, see Tornado-Resistant 3-11/16"
 section of this catalog (94mm)
 • Rods are 1/2" (13mm) brass, bronze or stainless
 steel
 Note: The 8700 Exit Device can not be used less bottom rod. If less
 Specifications for 8700 Series Exit bottom rod is desired, specify NB8700 Series Exit Device

 Door Type Wood or metal doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 5" thick, specify 624 Bottom Strike
 thickness and order as 31- (see page 67 for function limitation)
 Stile 4-1/2" (114mm) minimum stile width with trim and 3-1/2" (44mm) minimum • Standard for 8700
 stile without trim • Applied to surface of
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed. floor or to a flat threshold
 determined Rails will be factory cut to size, if door width is supplied • Black nylon coated




 07/25
 by door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 2-1/2"
 Strike 646 Top Strike (Panic and Fire Rated) (64mm)
 624 Bottom Strike; 655 Fire Rated Bottom Strike
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder
 dogging (#41 cylinder supplied)
 Electric Options AL- Alarm 9/16" 3/8"
 (14mm) (10mm)
 PL- SARGuide™ Photoluminescent Coated
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- ELR Remote Latch Retraction 655 Bottom Strike
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress • Standard for 12-8700 and
 Mounting Fasteners Supplied standard with wood and machine screws 14-8700
 Available with through-bolts and mortise (sex) nuts • Stainless steel
 Top & Bottom Bolt Brass, Stainless steel • Black nylon coated
 Device Centerline from 41" (1041 mm) for Standard Applications; 38" (965mm) for elementary • Replaces 647 Strike
 schools
 2-3/4"
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening - Non-fire rated (70mm)
 doors
 96" (2438mm) Max Door Opening - Fire rated doors
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm) 1-13/16"




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 (46mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6



 Inside Lever Assembly 648 & 653 Strikes (Alternate Strikes for 8700 SVR Devices)
 for 300 Series Aux Control
 Attaches to top rod and
 648 Strike 653 Strike
 engages with 300 Series For doors having 7/16" 1 7/8" Alternate for 12-8700
 transom panel (11mm) (48mm) 1-3/4"
 Auxiliary Control. Packed (44mm)
 applications
 standard with 306 and 313 1/2''
 Auxiliary Controls Black nylon coated (13mm)
 2-1/2" 2-5/16"
 Part # 97-2378 (64mm) 2-1/8" 2-3/4" (59mm)
 1-1/8" (54mm) (70mm)
 Black nylon
 Note: 26 or 26D is automatically supplied when 32 or 32D is specified. (29mm)
 coated



90641
 14 1-800-727-5477 • www.sargentlock.com
', 4160, 1, ' 8700 surface vertical rod exit device
 80 series

 features 646 top strike
 8700 series • two point latching (top & bottom with
 surface vertical rod exit device adjustability through center case) • standard for both panic &
 • standard bottom latch compatible with latch track fire (12-) hardware
 thresholds (by others) • surface applied to frame
 • single and double door applications • black nylon coated
 • ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed • replaces 629 strike
 • also available as hc8700 for hurricane-resistant 1-5/32"
 (29mm)
 applications, see hurricane-resistant section of 3/4"
 (19mm) 1/4"
 this catalog (6mm)
 • also available as fm8700, use with stormpro
 series doors, frames and hinges is required when
 used as a certified tornado solution. for tornado-
 resistant applications, see tornado-resistant 3-11/16"
 section of this catalog (94mm)
 • rods are 1/2" (13mm) brass, bronze or stainless
 steel
 note: the 8700 exit device can not be used less bottom rod. if less
 specifications for 8700 series exit bottom rod is desired, specify nb8700 series exit device

 door type wood or metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 5" thick, specify 624 bottom strike
 thickness and order as 31- (see page 67 for function limitation)
 stile 4-1/2" (114mm) minimum stile width with trim and 3-1/2" (44mm) minimum • standard for 8700
 stile without trim • applied to surface of
 rail sizes as rails are available in 4 sizes, use door width to determine size needed. floor or to a flat threshold
 determined rails will be factory cut to size, if door width is supplied • black nylon coated




 07/25
 by door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 2-1/2"
 strike 646 top strike (panic and fire rated) (64mm)
 624 bottom strike; 655 fire rated bottom strike
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder
 dogging (#41 cylinder supplied)
 electric options al- alarm 9/16" 3/8"
 (14mm) (10mm)
 pl- sarguide™ photoluminescent coated
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- elr remote latch retraction 655 bottom strike
 58- electric dogging
 59- electroguard – self contained delayed egress • standard for 12-8700 and
 mounting fasteners supplied standard with wood and machine screws 14-8700
 available with through-bolts and mortise (sex) nuts • stainless steel
 top & bottom bolt brass, stainless steel • black nylon coated
 device centerline from 41" (1041 mm) for standard applications; 38" (965mm) for elementary • replaces 647 strike
 schools
 2-3/4"
 door/opening height must be specified - 120" (3048mm) max door opening - non-fire rated (70mm)
 doors
 96" (2438mm) max door opening - fire rated doors
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm) 1-13/16"




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 (46mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6



 inside lever assembly 648 & 653 strikes (alternate strikes for 8700 svr devices)
 for 300 series aux control
 attaches to top rod and
 648 strike 653 strike
 engages with 300 series for doors having 7/16" 1 7/8" alternate for 12-8700
 transom panel (11mm) (48mm) 1-3/4"
 auxiliary control. packed (44mm)
 applications
 standard with 306 and 313 1/2''
 auxiliary controls black nylon coated (13mm)
 2-1/2" 2-5/16"
 part # 97-2378 (64mm) 2-1/8" 2-3/4" (59mm)
 1-1/8" (54mm) (70mm)
 black nylon
 note: 26 or 26d is automatically supplied when 32 or 32d is specified. (29mm)
 coated



90641
 14 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 15, '8700 Functions and Trims
80 Series

How to order:
 Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF
 F1-83- 87 13 F ETL RHR 32D 10B 36" 84" 41"


 SARGENT ANSI ANSI Type 2
700 Series ET Trim
 Function Function Description & Cylinder Info. 8700 Options
 Exits with ET Trim, specify
 lever design after the ET Numbers Numbers (1-3/4" Door) Panic & Fire 8700
 designation (e.g., ETL) Key unlocks Trim, Trim retracts latch/
 06 09 Trim relocks when key is removed 8706 x ET_
 #41 Cylinder Supplied Mechanical Options:
 12-
 10 01 No outside operation (No Cylinder)* 8710 14-
 16-
 No outside operation (No Cylinder)* 19-
 10 02 ET Control is used as Pull Only
 8710 x ET_
 31-
 Key Outside Unlocks/locks Trim 36-
 13 08 #41 Cylinder Supplied
 8713 x ET_ 37-
 43-
 15 14 Passage Only (No cylinder) 8715 x ET_ 53-
Lever Designs for ET Controls 54-
 Freewheeling Trim - 55-
 40 02 No outside Operation (No Cylinder)* Dummy Trim
 8740 x ET_ 56-
A, B, E, F, J, L, P, W
 56-HK-
Also available with Coastal Series & Freewheeling Trim - 58-
Studio Collection Levers 43 08 Key Outside Unlocks/locks Trim 8743 x ET_ 59-
 #41 Cylinder Supplied BC-59-
 76-
ET Designation with Suffix Freewheeling Trim - 85-
(Used to order ET without device) 46 09 Key unlocks Trim, Trim retracts latch/ 8746 x ET_ 86-
 relocks when key is removed #41 Cylinder Supplied 87-
8700 Series: 706, 710, 713, 715, 740, 5CH-
 Electrified ET Trim - Fail Safe AL-
743, 744, 746, 773 & 774 73 Power Off, Unlocks Lever (No Cylinder)*
 8773 x ET_
 BT-
 Electrified ET Trim - Fail Secure CPC-
Freewheeling Trim 74 Power Off, Locks Lever (No Cylinder)*
 8774 x ET_ LD-
 PL-
The lever rotates when the door is *SG-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are supplied TB-
locked preventing excessive force Cylinder Options:
 in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel finishes, specify
from being applied to the horizontal 10-




 07/25
 14/32 or 15/32D to receive nickel finished trims and stainless exit devices. 10-21-
lever. Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 10-63-
Electrified ET Trim * Cylinder Override is available with a 306 Aux Control 11-
 Example Order: 8773F 12V x ETMG x 306 x RHR x 32D x 36"w x 84"h 11-21-
Voltage must be specified for the




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 11-60-
following functions: 73 and 74. 11-63-
 11-64-
Specify: 12VDC or 24VDC 11-70-7P-
 11-72-7P-
 11-73-7P-
 SARGENT ANSI 11-65-73-7P-
 21-
300 Series++ Function Function Description & Cylinder Info. 8700 51-
Auxiliary Control & 862 Pull Numbers Numbers (1-3/4" Door) Panic & Fire 52-
 60-
 Key unlocks Turn; Turn retracts latch/ 63-
 06 12 Turn relocks when key is removed 8710 x 306 64-
 #41 Cylinder Supplied 70-
 72-
 862 Pull Only 73-
 10 02 (Optional Pulls: 863 & 864)
 8710 x 862 65-73-
 65-73-7P-
 300 Series 73-7P-
 Key Outside Unlocks/locks Turn 81-
 Aux. Control 862 Pull 13 11 #41 Cylinder Supplied
 8710 x 313
 82-
 F1-82-
Notes: 83-
300 Series Auxiliary Control are not compatible with 59- option. F1-83-
When ordering 8700 Series Exit Device x 300 Series Aux. Control, specify 10 Function for the exit. Example: 8710F x 306 x RHR x 32D x 42" x 90" 84-
 BR-
++ Note: Exit Devices must be mounted 38" AFF when used with Auxiliary Controls to meet ICC/ANSI A117.1-2003 Accessible and Usable and Facilities Code LC-
 SC-
Pull & Thumbpiece Trim Section Trim Designations SE-
 • Use three letter designations (Ex “PTB”) when ordering * Only available with
 the Exit Device with trim 15, 26D and 32D
 • Use the six digit designation (Ex “866-MAL”) when finishes
 ordering trim without an Exit Device, always specify finish
 Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Finishes
 SARGENT ANSI
 BHMA
 Function Function Description & Cylinder SARGENT
 Finishes
 8700 Finishes
 Numbers Numbers Info. (1-3/4" Door) Panic & Fire
 03 605
 Pull Only 8710 x Trim 04 606
 10 02 (No Cylinder)* 810-FLL 810-FLW 810-MAL 810-PTB 810-STS
 Designation 09 611
 Passage Only 8728 x Trim 10 612
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS 10B 613
 Designation
 Key unlocks Thumbpiece,
 10BE 613E
 Thumbpiece retracts latch/ 8762 x Trim 10BL 613L
 62 06 Thumbpiece relocks when key is 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 14 618
 Designation
 removed #34 Cylinder Supplied 15 619
 Key Outside Unlocks/ 8763 x Trim 20D 624
 63 05 locks Thumbpiece 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 26 625
 #34 Cylinder Supplied Designation
 26D 626
* Cylinder Override is available with a 306 Aux Control. 32 629
Note: Thumbpiece trims for 62 and 63 function devices are identical and are identified as 66 function when trim is ordered separately. 32D 630
Note: FLW trim is not available in 32(629) or 32D(630). BSP —
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D.
 WSP

 1-800-727-5477 • www.sargentlock.com
 15 90641
', 5233, 1, '8700 functions and trims
80 series

how to order:
 options series function rail lgth trim hand outside finish inside finish door width door height aff
 f1-83- 87 13 f etl rhr 32d 10b 36" 84" 41"


 sargent ansi ansi type 2
700 series et trim
 function function description & cylinder info. 8700 options
 exits with et trim, specify
 lever design after the et numbers numbers (1-3/4" door) panic & fire 8700
 designation (e.g., etl) key unlocks trim, trim retracts latch/
 06 09 trim relocks when key is removed 8706 x et_
 #41 cylinder supplied mechanical options:
 12-
 10 01 no outside operation (no cylinder)* 8710 14-
 16-
 no outside operation (no cylinder)* 19-
 10 02 et control is used as pull only
 8710 x et_
 31-
 key outside unlocks/locks trim 36-
 13 08 #41 cylinder supplied
 8713 x et_ 37-
 43-
 15 14 passage only (no cylinder) 8715 x et_ 53-
lever designs for et controls 54-
 freewheeling trim - 55-
 40 02 no outside operation (no cylinder)* dummy trim
 8740 x et_ 56-
a, b, e, f, j, l, p, w
 56-hk-
also available with coastal series & freewheeling trim - 58-
studio collection levers 43 08 key outside unlocks/locks trim 8743 x et_ 59-
 #41 cylinder supplied bc-59-
 76-
et designation with suffix freewheeling trim - 85-
(used to order et without device) 46 09 key unlocks trim, trim retracts latch/ 8746 x et_ 86-
 relocks when key is removed #41 cylinder supplied 87-
8700 series: 706, 710, 713, 715, 740, 5ch-
 electrified et trim - fail safe al-
743, 744, 746, 773 & 774 73 power off, unlocks lever (no cylinder)*
 8773 x et_
 bt-
 electrified et trim - fail secure cpc-
freewheeling trim 74 power off, locks lever (no cylinder)*
 8774 x et_ ld-
 pl-
the lever rotates when the door is *sg-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are supplied tb-
locked preventing excessive force cylinder options:
 in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel finishes, specify
from being applied to the horizontal 10-




 07/25
 14/32 or 15/32d to receive nickel finished trims and stainless exit devices. 10-21-
lever. note: aff means above finished floor, center line of rail above finished floor 10-63-
electrified et trim * cylinder override is available with a 306 aux control 11-
 example order: 8773f 12v x etmg x 306 x rhr x 32d x 36"w x 84"h 11-21-
voltage must be specified for the




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 11-60-
following functions: 73 and 74. 11-63-
 11-64-
specify: 12vdc or 24vdc 11-70-7p-
 11-72-7p-
 11-73-7p-
 sargent ansi 11-65-73-7p-
 21-
300 series++ function function description & cylinder info. 8700 51-
auxiliary control & 862 pull numbers numbers (1-3/4" door) panic & fire 52-
 60-
 key unlocks turn; turn retracts latch/ 63-
 06 12 turn relocks when key is removed 8710 x 306 64-
 #41 cylinder supplied 70-
 72-
 862 pull only 73-
 10 02 (optional pulls: 863 & 864)
 8710 x 862 65-73-
 65-73-7p-
 300 series 73-7p-
 key outside unlocks/locks turn 81-
 aux. control 862 pull 13 11 #41 cylinder supplied
 8710 x 313
 82-
 f1-82-
notes: 83-
300 series auxiliary control are not compatible with 59- option. f1-83-
when ordering 8700 series exit device x 300 series aux. control, specify 10 function for the exit. example: 8710f x 306 x rhr x 32d x 42" x 90" 84-
 br-
++ note: exit devices must be mounted 38" aff when used with auxiliary controls to meet icc/ansi a117.1-2003 accessible and usable and facilities code lc-
 sc-
pull & thumbpiece trim section trim designations se-
 • use three letter designations (ex “ptb”) when ordering * only available with
 the exit device with trim 15, 26d and 32d
 • use the six digit designation (ex “866-mal”) when finishes
 ordering trim without an exit device, always specify finish
 available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 finishes
 sargent ansi
 bhma
 function function description & cylinder sargent
 finishes
 8700 finishes
 numbers numbers info. (1-3/4" door) panic & fire
 03 605
 pull only 8710 x trim 04 606
 10 02 (no cylinder)* 810-fll 810-flw 810-mal 810-ptb 810-sts
 designation 09 611
 passage only 8728 x trim 10 612
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts 10b 613
 designation
 key unlocks thumbpiece,
 10be 613e
 thumbpiece retracts latch/ 8762 x trim 10bl 613l
 62 06 thumbpiece relocks when key is 866-fll 866-flw 866-mal 866-ptb 866-sts 14 618
 designation
 removed #34 cylinder supplied 15 619
 key outside unlocks/ 8763 x trim 20d 624
 63 05 locks thumbpiece 866-fll 866-flw 866-mal 866-ptb 866-sts 26 625
 #34 cylinder supplied designation
 26d 626
* cylinder override is available with a 306 aux control. 32 629
note: thumbpiece trims for 62 and 63 function devices are identical and are identified as 66 function when trim is ordered separately. 32d 630
note: flw trim is not available in 32(629) or 32d(630). bsp —
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d.
 wsp

 1-800-727-5477 • www.sargentlock.com
 15 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 16, ' NB-8700 Top Latch
 Surface Vertical Rod Exit Device
 80 Series




 Features
 • Single point top latching
 • Top latchbolt projection adjustable
 through center case
 • ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) Listed
 • Tripping potential removed - no bottom
 strike
 • Rods are 1/2" (13mm) brass, bronze or
 stainless steel




 Specifications for NB-8700 Series Exit 646 Top Strike
 Door Type Wood or metal doors • Standard for both
 Panic & Fire (12-) Hardware




 07/25
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 5" thick,
 specify thickness and order as 31- (see page 67 for function limitation) • Surface applied

 Stile 4-1/2" (114mm) minimum stile with trim and 3-1/2" (44mm) minimum stile • Fire Rated




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 without trim • Black nylon coated
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed. 1-5/32"
 determined by Rails will be factory cut to size, if door width is supplied (29mm) 3/4"
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door (19mm)
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 646 Top Strike (Panic and Fire Rated) 1/4"
 3-11/16" (6mm)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for (94mm)
 cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 PL- SARGuide Photoluminescent Coated
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Delayed Egress
 Mounting Fasteners Supplied standard with wood and machine screws
 Available with through-bolts and mortise (sex) nuts
 Top Bolt Stainless steel




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76 mm)
 Pushbar Depressed – 2-1/8" (54 mm)
 Fire Exit Hardware See Chart – Page 6




90641
 16 1-800-727-5477 • www.sargentlock.com
', 2522, 1, ' nb-8700 top latch
 surface vertical rod exit device
 80 series




 features
 • single point top latching
 • top latchbolt projection adjustable
 through center case
 • ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed
 • tripping potential removed - no bottom
 strike
 • rods are 1/2" (13mm) brass, bronze or
 stainless steel




 specifications for nb-8700 series exit 646 top strike
 door type wood or metal doors • standard for both
 panic & fire (12-) hardware




 07/25
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 5" thick,
 specify thickness and order as 31- (see page 67 for function limitation) • surface applied

 stile 4-1/2" (114mm) minimum stile with trim and 3-1/2" (44mm) minimum stile • fire rated




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 without trim • black nylon coated
 rail sizes as rails are available in 4 sizes, use door width to determine size needed. 1-5/32"
 determined by rails will be factory cut to size, if door width is supplied (29mm) 3/4"
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door (19mm)
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 646 top strike (panic and fire rated) 1/4"
 3-11/16" (6mm)
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for (94mm)
 cylinder dogging (#41 cylinder supplied)
 electric options al- alarm
 pl- sarguide photoluminescent coated
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- delayed egress
 mounting fasteners supplied standard with wood and machine screws
 available with through-bolts and mortise (sex) nuts
 top bolt stainless steel




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 device centerline from 41" (1041mm) for standard applications
 finished floor
 door/opening height must be specified - 120" (3048mm) max door opening
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76 mm)
 pushbar depressed – 2-1/8" (54 mm)
 fire exit hardware see chart – page 6




90641
 16 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 17, 'NB-8700 Functions and Trims
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF
 12- NB-87 13 F ETL RHR 26D 32D 36" 84" 41"

 Options
700 Series ET Trim SARGENT ANSI ANSI Type 2 NB-8700
 Exits with ET Trim, specify Function Function Description & Cylinder Info NB-8700
 lever design after the ET Numbers Numbers (1-3/4" Door) (Panic & Fire) Mechanical Options:
 designation (e.g., ETL) 12-
 Key unlocks Trim. Trim retracts latch.Trim relocks
 06 09 when key is removed. #41 Cylinder Supplied. NB-8706 x ET_ 16-
 19-
 31-
 10 01 No outside operation (No Cylinder) NB-8710 36-
 No outside operation (No Cylinder) 37-
 10 02 ET Control is used as Pull Only NB-8710 x ET_ 43-
 53-
 Key Outside unlocks/locks trim 54-
 13 08 #41 Cylinder Supplied NB-8713 x ET_ 55-
 56-
 15 14 Passage Only (No cylinder) NB-8715 x ET_ 56-HK-
Lever Designs for ET Controls 58-
 Freewheeling Trim - 59-
A, B, E, F, J, L, P, W 40 02 No outside operation NB-8740 x ET_ 76-
Also available with Coastal Series & (No Cylinder) Dummy Trim 85-
Studio Collection Levers 86-
 Freewheeling Trim - 87-
ET Designation with Suffix 43 08 Key Outside Unlocks/locks Trim NB-8743 x ET_ 5CH-
 #41 Cylinder Supplied AL-
(Used to order ET without device) BT-
 Freewheeling Trim - CPC-
NB-8700 Series: 706, 710, 713, 715, 46 09 Key unlocks Trim, Trim retracts latch/relocks when key NB-8746 x ET_ LD-
740,743, 744, 746, 773 & 774 is removed. #41 Cylinder Supplied/ PL-
 Electrified ET Trim - Fail Safe * SG-
 73 Power Off, Unlocks Lever (No Cylinder)* NB-8773 x ET_ TB-
Freewheeling Trim Cylinder Options:
 Electrified ET Trim - Fail Secure 10-
The lever rotates when the door is 74 Power Off, Locks Lever (No Cylinder)* NB-8774 x ET_ 10-21-
locked preventing excessive force 10-63-




 07/25
 11-
from being applied to the horizontal Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 11-21-
lever supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 11-60-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 11-63-
Electrified ET Trim Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 11-64-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Note: 12-NB8700 devices require thermal pins 11-70-7P-
Voltage must be specified for the Note: 12-NB Applications require thermal pin. Thermal Pin supplied when ordered as a 12-NB Device. 11-72-7P-
following functions: 73 and 74. *Cylinder Override is available with a 306 Aux Control 11-73-7P-
 11-65-73-7P-
Specify: 12VDC or 24VDC 21-
 SARGENT ANSI 51-
300 Series++ Function Function Description & Cylinder Info. NB-8700 52-
 60-
Auxiliary Control & 862 Pull Numbers Numbers (1-3/4" Door) Panic & Fire 63-
 Key unlocks Turn; Turn retracts latch/ 64-
 06 12 Turn relocks when key is removed NB-8710 x 306 70-
 #41 Cylinder Supplied 72-
 73-
 862 Pull Only 65-73-
 10 02 (Optional Pulls: 863 & 864)
 NB-8710 x 862 65-73-7P-
 73-7P-
 300 Series Key Outside Unlocks/locks Turn 81-
 Aux. Control 862 Pull 13 11 #41 Cylinder Supplied
 NB-8710 x 313 82-
 F1-82-
Notes: 83-
300 Series Auxiliary Control are not compatible with 59- option. F1-83-
When ordering NB-8700 Series Exit Device x 300 Series Aux. Control, specify 10 Function for the exit. Example: NB-8710F x 306 x RHR x 32D x 42" x 90" 84-
++ Note: Exit Devices must be mounted 38" AFF when used with Auxiliary Controls to meet ICC/ANSI A117.1-2003 Accessible and Usable and Facilities Code BR-
 LC-
 SC-
Pull & Thumbpiece Trim Section Trim Designations SE-
 • Use three letter designations (Ex “PTB”) when ordering
 the Exit Device with trim * Only available with
 • Use the six digit designation (Ex “866-MAL”) when 15, 26D and 32D
 ordering trim without an Exit Device, always specify finish finishes

 Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT ANSI
 Finishes
 Function Function Description & Cylinder SARGENT BHMA
 NB-8700
 Numbers Numbers Info. (1-3/4" Door) Panic & Fire
 Finishes Finishes

 Pull Only NB-8710 x Trim 03 605
 10 02 (No Cylinder)* 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 04 606
 Designation
 09 611
 Passage Only NB-8728 x Trim 10 612
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS
 Designation 10B 613
 Key unlocks Thumbpiece, 10BE 613E
 Thumbpiece retracts latch/ NB-8762 x Trim 10BL 613L
 62 06 Thumbpiece relocks when key is 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 14 618
 Designation
 removed #34 Cylinder Supplied 15 619
 Key Outside Unlocks/ NB-8763 x Trim 20D 624
 63 05 locks Thumbpiece 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 26 625
 #34 Cylinder Supplied Designation 26D 626
 32 629
* Cylinder Override is available with a 306 Aux Control.
Note: Thumbpiece trims for 62 and 63 function devices are identical and are identified as 66 function when trim is ordered separately. 32D 630
Note: FLW trim is not available in 32(629) or 32D(630). BSP —
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D. WSP


 1-800-727-5477 • www.sargentlock.com
 17 90641
', 5357, 1, 'nb-8700 functions and trims
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff
 12- nb-87 13 f etl rhr 26d 32d 36" 84" 41"

 options
700 series et trim sargent ansi ansi type 2 nb-8700
 exits with et trim, specify function function description & cylinder info nb-8700
 lever design after the et numbers numbers (1-3/4" door) (panic & fire) mechanical options:
 designation (e.g., etl) 12-
 key unlocks trim. trim retracts latch.trim relocks
 06 09 when key is removed. #41 cylinder supplied. nb-8706 x et_ 16-
 19-
 31-
 10 01 no outside operation (no cylinder) nb-8710 36-
 no outside operation (no cylinder) 37-
 10 02 et control is used as pull only nb-8710 x et_ 43-
 53-
 key outside unlocks/locks trim 54-
 13 08 #41 cylinder supplied nb-8713 x et_ 55-
 56-
 15 14 passage only (no cylinder) nb-8715 x et_ 56-hk-
lever designs for et controls 58-
 freewheeling trim - 59-
a, b, e, f, j, l, p, w 40 02 no outside operation nb-8740 x et_ 76-
also available with coastal series & (no cylinder) dummy trim 85-
studio collection levers 86-
 freewheeling trim - 87-
et designation with suffix 43 08 key outside unlocks/locks trim nb-8743 x et_ 5ch-
 #41 cylinder supplied al-
(used to order et without device) bt-
 freewheeling trim - cpc-
nb-8700 series: 706, 710, 713, 715, 46 09 key unlocks trim, trim retracts latch/relocks when key nb-8746 x et_ ld-
740,743, 744, 746, 773 & 774 is removed. #41 cylinder supplied/ pl-
 electrified et trim - fail safe * sg-
 73 power off, unlocks lever (no cylinder)* nb-8773 x et_ tb-
freewheeling trim cylinder options:
 electrified et trim - fail secure 10-
the lever rotates when the door is 74 power off, locks lever (no cylinder)* nb-8774 x et_ 10-21-
locked preventing excessive force 10-63-




 07/25
 11-
from being applied to the horizontal note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 11-21-
lever supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 11-60-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 11-63-
electrified et trim note: aff means above finished floor, center line of rail above finished floor 11-64-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 note: 12-nb8700 devices require thermal pins 11-70-7p-
voltage must be specified for the note: 12-nb applications require thermal pin. thermal pin supplied when ordered as a 12-nb device. 11-72-7p-
following functions: 73 and 74. *cylinder override is available with a 306 aux control 11-73-7p-
 11-65-73-7p-
specify: 12vdc or 24vdc 21-
 sargent ansi 51-
300 series++ function function description & cylinder info. nb-8700 52-
 60-
auxiliary control & 862 pull numbers numbers (1-3/4" door) panic & fire 63-
 key unlocks turn; turn retracts latch/ 64-
 06 12 turn relocks when key is removed nb-8710 x 306 70-
 #41 cylinder supplied 72-
 73-
 862 pull only 65-73-
 10 02 (optional pulls: 863 & 864)
 nb-8710 x 862 65-73-7p-
 73-7p-
 300 series key outside unlocks/locks turn 81-
 aux. control 862 pull 13 11 #41 cylinder supplied
 nb-8710 x 313 82-
 f1-82-
notes: 83-
300 series auxiliary control are not compatible with 59- option. f1-83-
when ordering nb-8700 series exit device x 300 series aux. control, specify 10 function for the exit. example: nb-8710f x 306 x rhr x 32d x 42" x 90" 84-
++ note: exit devices must be mounted 38" aff when used with auxiliary controls to meet icc/ansi a117.1-2003 accessible and usable and facilities code br-
 lc-
 sc-
pull & thumbpiece trim section trim designations se-
 • use three letter designations (ex “ptb”) when ordering
 the exit device with trim * only available with
 • use the six digit designation (ex “866-mal”) when 15, 26d and 32d
 ordering trim without an exit device, always specify finish finishes

 available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent ansi
 finishes
 function function description & cylinder sargent bhma
 nb-8700
 numbers numbers info. (1-3/4" door) panic & fire
 finishes finishes

 pull only nb-8710 x trim 03 605
 10 02 (no cylinder)* 810-fll 810-flw 810-mal 810-ptb 810-sts 04 606
 designation
 09 611
 passage only nb-8728 x trim 10 612
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts
 designation 10b 613
 key unlocks thumbpiece, 10be 613e
 thumbpiece retracts latch/ nb-8762 x trim 10bl 613l
 62 06 thumbpiece relocks when key is 866-fll 866-flw 866-mal 866-ptb 866-sts 14 618
 designation
 removed #34 cylinder supplied 15 619
 key outside unlocks/ nb-8763 x trim 20d 624
 63 05 locks thumbpiece 866-fll 866-flw 866-mal 866-ptb 866-sts 26 625
 #34 cylinder supplied designation 26d 626
 32 629
* cylinder override is available with a 306 aux control.
note: thumbpiece trims for 62 and 63 function devices are identical and are identified as 66 function when trim is ordered separately. 32d 630
note: flw trim is not available in 32(629) or 32d(630). bsp —
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d. wsp


 1-800-727-5477 • www.sargentlock.com
 17 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 18, ' MD8600(Windstorm Rated) and NB-MD8600
 Concealed Vertical Rod Exit Device for Metal
 Doors
 80 Series

 MD8600 Series Features
 Concealed Vertical Rod Exit Device • Designed for standard width stile applications on hollow metal
 for Metal Doors doors
 • Concealed rods for security and aesthetics
 • Single and double door applications
 • Specify NB- for less bottom rod
 – NB not available with HC and WS options
 • Devices are ANSI A156.3 - Grade 1
 • UL Fire and Panic listed
 Specifications for MD8600 & NB-MD8600 Series Exit
 Door Type Metal Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 Cladding Available for 1/4" on 1/2" panels. Specify 31- and panel thickness on order. Only available on 1-3/4" door 
 thickness. Must be noted separately from door thickness on order string.
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door




 07/25
 Strike 650 Top Strike & 606 Bottom Strike (Panic and Fire Rated)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 PL- SARGuide™ Photoluminescent Coated
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with machine screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 96" max door height for HC and WS options
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6
 Notes:
 • MD8600 & 12-MD8600 can be used as NB- Device by simply not installing the bottom rod/bolt
 • 12-NB Applications require thermal pin. Thermal Pin supplied when ordered as a 12-NB Device.




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • Must include "WS" option in the order string to specify Windstorm Rated product.



 100 Series Aux Control 650 Top Strike 606 Bottom
 • For application Strike
 • Available as
 an 06 or in hollow 1-1/8" • Furnished with 1-1/16"
 13 function metal frames (29mm)
 expansion shields (27mm)
 • Supplied with a • Stainless steel • Mortised into floor
 SARGENT #41 nylon coated
 2-1/2" • Stainless steel 2-5/8"
 Mortise Cylinder (64mm) (67mm)
 5/32"
 • Can be used with any (4mm)
 SARGENT Mortise
 Key System



90641
 18 1-800-727-5477 • www.sargentlock.com
', 3356, 1, ' md8600(windstorm rated) and nb-md8600
 concealed vertical rod exit device for metal
 doors
 80 series

 md8600 series features
 concealed vertical rod exit device • designed for standard width stile applications on hollow metal
 for metal doors doors
 • concealed rods for security and aesthetics
 • single and double door applications
 • specify nb- for less bottom rod
 – nb not available with hc and ws options
 • devices are ansi a156.3 - grade 1
 • ul fire and panic listed
 specifications for md8600 & nb-md8600 series exit
 door type metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 cladding available for 1/4" on 1/2" panels. specify 31- and panel thickness on order. only available on 1-3/4" door 
 thickness. must be noted separately from door thickness on order string.
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door




 07/25
 strike 650 top strike & 606 bottom strike (panic and fire rated)
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 electric options al- alarm




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 pl- sarguide™ photoluminescent coated
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with machine screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 120" (3048mm) max door opening
 96" max door height for hc and ws options
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6
 notes:
 • md8600 & 12-md8600 can be used as nb- device by simply not installing the bottom rod/bolt
 • 12-nb applications require thermal pin. thermal pin supplied when ordered as a 12-nb device.




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • must include "ws" option in the order string to specify windstorm rated product.



 100 series aux control 650 top strike 606 bottom
 • for application strike
 • available as
 an 06 or in hollow 1-1/8" • furnished with 1-1/16"
 13 function metal frames (29mm)
 expansion shields (27mm)
 • supplied with a • stainless steel • mortised into floor
 sargent #41 nylon coated
 2-1/2" • stainless steel 2-5/8"
 mortise cylinder (64mm) (67mm)
 5/32"
 • can be used with any (4mm)
 sargent mortise
 key system



90641
 18 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 19, 'MD8600 and NB-MD8600 Functions
and Trims for Metal Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 59-NB- MD86 13 F ETL RHR 03 03 36" 84" 41" MD8600


700 Series ET Trim SARGENT ANSI ANSI Type 8 Mechanical Options:
 Function Function Description & Cylinder Info MD8600 12-
 Exits with ET Trim, specify Numbers Numbers (1-3/4" Door) Panic & Fire 16-
 lever design after the ET 19-
 designation (e.g., ETL) Key unlocks Trim, Trim retracts latch/ 31-
 06 09 Trim relocks when key is removed MD8606 x ET_ 36-
 #41 Cylinder Supplied 37-
 43-
 53-
 54-
 10 01 No outside operation (No Cylinder)* MD8610 55-
 56-
 56-HK-
 No outside operation (No Cylinder)* 5LH
 10 02 ET Control is used as Pull Only
 MD8610 x ET_ 58-
Lever Designs for ET 59-
 BC-59-
Controls 76-
 Key Outside Unlocks/locks Trim
A, B, E, F, J, L, P, W 13 08 #41 Cylinder Supplied
 MD8613 x ET_ 85-
 86-
Also available with Coastal Series & 87-
Studio Collection Levers AL-
 BT-
 15 14 Passage Only (No cylinder) MD8615 x ET_ CPC-
ET Designation with Suffix HC-
(Used to order ET without LD-
device) Freewheeling Trim - NB-
 40 02 No outside Operation MD8640 x ET_ PL-
MD8600 & NB-MD8600 Series: * SG-
 (No Cylinder)** Dummy Trim
706-4, 710-4, 713-4, 715-4, 740-4, WS-
743-4, 746-4, 773-4, & 774-4 Freewheeling Trim - Cylinder Options:
 10-
 43 08 Key Outside Unlocks/locks Trim MD8643 x ET_ 10-21-
 #41 Cylinder Supplied 10-63-




 07/25
Freewheeling Trim Freewheeling Trim - 11-
 11-21-
 Key unlocks Trim, Trim retracts latch/
The lever rotates when the door is 46 09 Trim relocks when key is removed
 MD8646 x ET_ 11-60-
locked preventing excessive force 11-63-
 #41 Cylinder Supplied 11-64-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
from being applied to the horizontal
 11-70-7P-
lever 11-72-7P-
 Electrified ET Trim - Fail Safe
 73 Power Off, Unlocks Lever (No Cylinder)*
 MD8673 x ET_ 11-73-7P-
Electrified ET Trim 11-65-73-7P-
 21-
Voltage must be specified for the 51-
 Electrified ET Trim - Fail Secure 52-
following functions: 73 and 74. 74 Power Off, Locks Lever (No Cylinder)*
 MD8674 x ET_ 60-
Specify: 12VDC or 24VDC
 63-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 64-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 70-
 72-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices.
 73-
 65-73-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor. 65-73-7P-
 * Cylinder Override is available with a 106 Aux Control 73-7P-
 Example Order: MD8673F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h 81-
 82-
 F1-82-
 83-
 F1-83-
 84-
 BR-
 LC-
 SC-
 SE-

 * Only available with
 SARGENT ANSI 15, 26D and 32D
 finishes
100 Series Auxiliary Control* Function Function Description & Cylinder Info MD8600
& 862 Pull Numbers Numbers (1-3/4" Door) Panic & Fire




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Key unlocks Turn, Turn retracts latch/ Available
 06 12 Turn relocks when key is removed MD8610 x 106 Finishes
 #41 Cylinder Supplied SARGENT BHMA
 Finishes Finishes
 862 Pull Only 03 605
 10 02 (Optional Pulls: 863 & 864)
 MD8610 x 862 Pull 04 606
 09 611
 10 612
 100 Series Aux. 862 Pull Key Outside Unlocks/locks Turn 10B 613
 Control 13 11 #41 Cylinder Supplied
 MD8610 x 113 10BE 613E
 10BL 613L
 14 618
 Note: When ordering MD8600/NB-MD8600 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit. 15 619
 20D 624
 Example: MD8610F x 106 x RHR x 32D x 42" x 90"
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP


 1-800-727-5477 • www.sargentlock.com
 19 90641
', 3949, 1, 'md8600 and nb-md8600 functions
and trims for metal doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 59-nb- md86 13 f etl rhr 03 03 36" 84" 41" md8600


700 series et trim sargent ansi ansi type 8 mechanical options:
 function function description & cylinder info md8600 12-
 exits with et trim, specify numbers numbers (1-3/4" door) panic & fire 16-
 lever design after the et 19-
 designation (e.g., etl) key unlocks trim, trim retracts latch/ 31-
 06 09 trim relocks when key is removed md8606 x et_ 36-
 #41 cylinder supplied 37-
 43-
 53-
 54-
 10 01 no outside operation (no cylinder)* md8610 55-
 56-
 56-hk-
 no outside operation (no cylinder)* 5lh
 10 02 et control is used as pull only
 md8610 x et_ 58-
lever designs for et 59-
 bc-59-
controls 76-
 key outside unlocks/locks trim
a, b, e, f, j, l, p, w 13 08 #41 cylinder supplied
 md8613 x et_ 85-
 86-
also available with coastal series & 87-
studio collection levers al-
 bt-
 15 14 passage only (no cylinder) md8615 x et_ cpc-
et designation with suffix hc-
(used to order et without ld-
device) freewheeling trim - nb-
 40 02 no outside operation md8640 x et_ pl-
md8600 & nb-md8600 series: * sg-
 (no cylinder)** dummy trim
706-4, 710-4, 713-4, 715-4, 740-4, ws-
743-4, 746-4, 773-4, & 774-4 freewheeling trim - cylinder options:
 10-
 43 08 key outside unlocks/locks trim md8643 x et_ 10-21-
 #41 cylinder supplied 10-63-




 07/25
freewheeling trim freewheeling trim - 11-
 11-21-
 key unlocks trim, trim retracts latch/
the lever rotates when the door is 46 09 trim relocks when key is removed
 md8646 x et_ 11-60-
locked preventing excessive force 11-63-
 #41 cylinder supplied 11-64-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
from being applied to the horizontal
 11-70-7p-
lever 11-72-7p-
 electrified et trim - fail safe
 73 power off, unlocks lever (no cylinder)*
 md8673 x et_ 11-73-7p-
electrified et trim 11-65-73-7p-
 21-
voltage must be specified for the 51-
 electrified et trim - fail secure 52-
following functions: 73 and 74. 74 power off, locks lever (no cylinder)*
 md8674 x et_ 60-
specify: 12vdc or 24vdc
 63-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 64-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 70-
 72-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices.
 73-
 65-73-
 note: aff means above finished floor, center line of rail above finished floor. 65-73-7p-
 * cylinder override is available with a 106 aux control 73-7p-
 example order: md8673f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h 81-
 82-
 f1-82-
 83-
 f1-83-
 84-
 br-
 lc-
 sc-
 se-

 * only available with
 sargent ansi 15, 26d and 32d
 finishes
100 series auxiliary control* function function description & cylinder info md8600
& 862 pull numbers numbers (1-3/4" door) panic & fire




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 key unlocks turn, turn retracts latch/ available
 06 12 turn relocks when key is removed md8610 x 106 finishes
 #41 cylinder supplied sargent bhma
 finishes finishes
 862 pull only 03 605
 10 02 (optional pulls: 863 & 864)
 md8610 x 862 pull 04 606
 09 611
 10 612
 100 series aux. 862 pull key outside unlocks/locks turn 10b 613
 control 13 11 #41 cylinder supplied
 md8610 x 113 10be 613e
 10bl 613l
 14 618
 note: when ordering md8600/nb-md8600 series exit device x 100 series aux. control, specify 10 function for the exit. 15 619
 20d 624
 example: md8610f x 106 x rhr x 32d x 42" x 90"
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp


 1-800-727-5477 • www.sargentlock.com
 19 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 20, ' AD8600 and NB-AD8600
 Concealed Vertical Rod Exit Device
 for Aluminum Doors
 80 Series

 AD8600 Series Features
 Concealed Vertical Rod Exit Device • Designed for standard width stile
 for Aluminum Doors applications on aluminum doors
 • Concealed rods for security and 
 aesthetics
 • Single and double door applications
 • Specify NB- for less bottom rod
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL305 (Panic) listed only
 Specifications for AD8600 & NB-AD8600 Series Exit

 Door Type Aluminum Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" 
 thick, specify thickness and order as 31-
 Available for 1/4" on 1/2" panels. Specify 31- and panel thickness on
 Cladding order. Only available on 1-3/4" door thickness.
 Must be noted separately from door thickness on order MD8600
 string. NB-MD8600 WD8600 NB-WD8600
 Stile 4-1/2" (114mm) minimum stile width
 MD8600 NB-MD8600
 MD8600
 NB-AD8600 NB-MD8600
 WD8600
 AD8600 WD8600
 NB-WD8600
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door




 07/25
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 640 Strikes for Top & Bottom Strike




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 PL- SARGuide™ Photoluminescent Coated
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with machine screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware Not Available

 Note: AD8600 can be used as NB- Device by simply not installing the bottom rod/bolt




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux Control 639/640 Strike Kits
 • Available as an 06 or • Steel with Black Nylon Coating
 13 function .25"
 • Machine Screws Supplied 6.35mm
 (6.35mm)
 2" .25in
 • Supplied with a • 640 Kit contains 2 strikes 50.80mm
 (50.80mm)
 2.00in
 SARGENT #41 Mortise (Top & Bottom)
 Cylinder
 • 639 Kit contains 1 strike
 • Can be used with any (Top Only)
 SARGENT Mortise Key
 System
 Ø1.21"
 30.73mm
 (30.73mm)
 1.21in




90641
 20 1-800-727-5477 • www.sargentlock.com
', 3164, 1, ' ad8600 and nb-ad8600
 concealed vertical rod exit device
 for aluminum doors
 80 series

 ad8600 series features
 concealed vertical rod exit device • designed for standard width stile
 for aluminum doors applications on aluminum doors
 • concealed rods for security and 
 aesthetics
 • single and double door applications
 • specify nb- for less bottom rod
 • devices are ansi/bhma a156.3 - grade 1
 • ul305 (panic) listed only
 specifications for ad8600 & nb-ad8600 series exit

 door type aluminum doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" 
 thick, specify thickness and order as 31-
 available for 1/4" on 1/2" panels. specify 31- and panel thickness on
 cladding order. only available on 1-3/4" door thickness.
 must be noted separately from door thickness on order md8600
 string. nb-md8600 wd8600 nb-wd8600
 stile 4-1/2" (114mm) minimum stile width
 md8600 nb-md8600
 md8600
 nb-ad8600 nb-md8600
 wd8600
 ad8600 wd8600
 nb-wd8600
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door




 07/25
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 640 strikes for top & bottom strike




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 electric options al- alarm
 pl- sarguide™ photoluminescent coated
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with machine screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 120" (3048mm) max door opening
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware not available

 note: ad8600 can be used as nb- device by simply not installing the bottom rod/bolt




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux control 639/640 strike kits
 • available as an 06 or • steel with black nylon coating
 13 function .25"
 • machine screws supplied 6.35mm
 (6.35mm)
 2" .25in
 • supplied with a • 640 kit contains 2 strikes 50.80mm
 (50.80mm)
 2.00in
 sargent #41 mortise (top & bottom)
 cylinder
 • 639 kit contains 1 strike
 • can be used with any (top only)
 sargent mortise key
 system
 ø1.21"
 30.73mm
 (30.73mm)
 1.21in




90641
 20 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 21, 'AD8600 and NB-AD8600
Functions and Trims
for Aluminum Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 56-NB- AD86 13 F ETL RHR 15 32D 36" 84" 41" AD8600


700 Series ET Trim SARGENT ANSI ANSI Type 8
 Mechanical Options:
 Function Function Description & Cylinder Info AD8600 16-
 Exits with ET Trim, specify Numbers Numbers (1-3/4" Door) Panic 19-
 lever design after the ET 31-
 designation (e.g., ETL) Key unlocks Trim, Trim retracts latch/
 36-
 06 09 Trim relocks when key is removed AD8606 x ET_ 37-
 #41 Cylinder Supplied 43-
 53-
 54-
 10 01 No outside operation (No Cylinder)* AD8610 55-
 56-
 56-HK-
 5LH
 No outside operation (No Cylinder)* 58-
 10 02 ET Control is used as Pull Only
 AD8610 x ET_ 59-
Lever Designs for ET BC-59-
Controls 76-
 Key Outside Unlocks/locks Trim 85-
A, B, E, F, J, L, P, W 13 08 #41 Cylinder Supplied
 AD8613 x ET_ 86-
Also available with Coastal Series & 87-
Studio Collection Levers AL-
 BT-
ET Designation with Suffix 15 14 Passage Only (No cylinder) AD8615 x ET_ CPC-
 LD-
(Used to order ET without NB-
device) Freewheeling Trim - PL-
 40 02 No outside operation AD8640 x ET_ * SG-
AD8600 & NB-AD8600 Series: Cylinder Options:
706-4, 710-4, 713-4, 715-4, 740-4, (No Cylinder)* Dummy Trim 10-
743-4, 746-4, 773-4, & 774-4 Freewheeling Trim - 10-21-
 10-63-
 43 08 Key Outside Unlocks/locks Trim AD8643 x ET_ 11-
Freewheeling Trim #41 Cylinder Supplied 11-21-




 07/25
 11-60-
 Freewheeling Trim -
The lever rotates when the door is 11-63-
 Key unlocks Trim, Trim retracts latch/ 11-64-
locked preventing excessive force 46 09 Trim relocks when key is removed
 AD8646 x ET_ 11-70-7P-
from being applied to the horizontal
 #41 Cylinder Supplied 11-72-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
lever 11-73-7P-
 Electrified ET Trim - Fail Safe 11-65-73-7P-
Electrified ET Trim 73 Power Off, Unlocks Lever (No Cylinder)*
 AD8673 x ET_ 21-
 51-
Voltage must be specified for the 52-
following functions: 73 and 74. 60-
 Electrified ET Trim - Fail Secure 63-
Specify: 12VDC or 24VDC 74 Power Off, Locks Lever (No Cylinder)*
 AD8674 x ET_ 64-
 70-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 72-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 73-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 65-73-
 65-73-7P-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor
 73-7P-
 * Cylinder Override is available with a 106 Aux Control 81-
 Example Order: AD8673F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h 82-
 F1-82-
 83-
 F1-83-
 SARGENT ANSI 84-
100 Series Auxiliary Control* Function Function Description & Cylinder Info AD8600 BR-
 LC-
& 862 Pull Numbers Numbers (1-3/4" Door) Panic SC-
 Key unlocks Turn, Turn retracts latch/ SE-
 06 12 Turn relocks when key is removed AD8610 x 106
 #41 Cylinder Supplied * Only available with
 15, 26D and 32D
 862 Pull Only finishes
 10 02 (Optional Pulls: 863 & 864)
 AD8610 x 862 Pull
 Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux. 862 Pull Key Outside Unlocks/locks Turn
 Finishes
 Control 13 11 #41 Cylinder Supplied
 AD8610 x 113 SARGENT BHMA
 Finishes Finishes


 Note: When ordering AD8600/NB-AD8600 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit. 03 605
 Example: AD8610F x 106 x RHR x 32D x 42" x 90" 04 606
 09 611
 10 612
 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP

 1-800-727-5477 • www.sargentlock.com
 21 90641
', 3919, 1, 'ad8600 and nb-ad8600
functions and trims
for aluminum doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 56-nb- ad86 13 f etl rhr 15 32d 36" 84" 41" ad8600


700 series et trim sargent ansi ansi type 8
 mechanical options:
 function function description & cylinder info ad8600 16-
 exits with et trim, specify numbers numbers (1-3/4" door) panic 19-
 lever design after the et 31-
 designation (e.g., etl) key unlocks trim, trim retracts latch/
 36-
 06 09 trim relocks when key is removed ad8606 x et_ 37-
 #41 cylinder supplied 43-
 53-
 54-
 10 01 no outside operation (no cylinder)* ad8610 55-
 56-
 56-hk-
 5lh
 no outside operation (no cylinder)* 58-
 10 02 et control is used as pull only
 ad8610 x et_ 59-
lever designs for et bc-59-
controls 76-
 key outside unlocks/locks trim 85-
a, b, e, f, j, l, p, w 13 08 #41 cylinder supplied
 ad8613 x et_ 86-
also available with coastal series & 87-
studio collection levers al-
 bt-
et designation with suffix 15 14 passage only (no cylinder) ad8615 x et_ cpc-
 ld-
(used to order et without nb-
device) freewheeling trim - pl-
 40 02 no outside operation ad8640 x et_ * sg-
ad8600 & nb-ad8600 series: cylinder options:
706-4, 710-4, 713-4, 715-4, 740-4, (no cylinder)* dummy trim 10-
743-4, 746-4, 773-4, & 774-4 freewheeling trim - 10-21-
 10-63-
 43 08 key outside unlocks/locks trim ad8643 x et_ 11-
freewheeling trim #41 cylinder supplied 11-21-




 07/25
 11-60-
 freewheeling trim -
the lever rotates when the door is 11-63-
 key unlocks trim, trim retracts latch/ 11-64-
locked preventing excessive force 46 09 trim relocks when key is removed
 ad8646 x et_ 11-70-7p-
from being applied to the horizontal
 #41 cylinder supplied 11-72-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
lever 11-73-7p-
 electrified et trim - fail safe 11-65-73-7p-
electrified et trim 73 power off, unlocks lever (no cylinder)*
 ad8673 x et_ 21-
 51-
voltage must be specified for the 52-
following functions: 73 and 74. 60-
 electrified et trim - fail secure 63-
specify: 12vdc or 24vdc 74 power off, locks lever (no cylinder)*
 ad8674 x et_ 64-
 70-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 72-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 73-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 65-73-
 65-73-7p-
 note: aff means above finished floor, center line of rail above finished floor
 73-7p-
 * cylinder override is available with a 106 aux control 81-
 example order: ad8673f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h 82-
 f1-82-
 83-
 f1-83-
 sargent ansi 84-
100 series auxiliary control* function function description & cylinder info ad8600 br-
 lc-
& 862 pull numbers numbers (1-3/4" door) panic sc-
 key unlocks turn, turn retracts latch/ se-
 06 12 turn relocks when key is removed ad8610 x 106
 #41 cylinder supplied * only available with
 15, 26d and 32d
 862 pull only finishes
 10 02 (optional pulls: 863 & 864)
 ad8610 x 862 pull
 available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux. 862 pull key outside unlocks/locks turn
 finishes
 control 13 11 #41 cylinder supplied
 ad8610 x 113 sargent bhma
 finishes finishes


 note: when ordering ad8600/nb-ad8600 series exit device x 100 series aux. control, specify 10 function for the exit. 03 605
 example: ad8610f x 106 x rhr x 32d x 42" x 90" 04 606
 09 611
 10 612
 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp

 1-800-727-5477 • www.sargentlock.com
 21 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 22, ' WD8600 and NB-WD8600
 Concealed Vertical Rod Exit Device
 for Wood Doors
 80 Series


 Features
 • Designed for standard width stile 
 applications on wood doors
 • Concealed rods offer security
 WD8600 Series • Single and double door applications
 Concealed Vertical Rod Exit Device • Specify NB- for less bottom rod
 for Wood Doors • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) listed
 Specifications for WD8600 & NB-WD8600 Series Exit
 Door Type Wood Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 Cladding Available for 1/4" on 1/2" panels. Specify 31- and panel thickness on order. Only available on 1-3/4" door 
 thickness. Must be noted separately from door thickness on order string.
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 650 Top Strike & 606 Bottom Strike (Panic and Fire Rated)




 07/25
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 PL- SARGuide™ Photoluminescent Coated




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with wood screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 108" (2743mm) Max Door Opening - Fire rated doors
 120" (3048mm) Max Door Opening - Non-fire rated doors
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6
 Note: WD8600 & 12-WD8600 can be used as NB- Device by simply not installing the bottom rod/bolt
 Note: 12-NB applications require thermal pin. Thermal pin supplied when ordered as a 12-NB device




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux Control 650 Top Strike 606 Bottom Strike
 • Available as an 06 or
 13 function
 1-1/8"
 • Supplied with a (29mm) 1-1/16"
 SARGENT #41 Mortise (27mm)
 Cylinder
 2-1/2"
 • Can be used with any (64mm)
 2-5/8"
 SARGENT Mortise Key (67mm)
 5/32"
 System
 • For application in hollow metal frames (4mm)

 • Stainless steel
 • Furnished with expansion shields
 • Mortised into floor
 • Stainless steel

90641
 22 1-800-727-5477 • www.sargentlock.com
', 3216, 1, ' wd8600 and nb-wd8600
 concealed vertical rod exit device
 for wood doors
 80 series


 features
 • designed for standard width stile 
 applications on wood doors
 • concealed rods offer security
 wd8600 series • single and double door applications
 concealed vertical rod exit device • specify nb- for less bottom rod
 for wood doors • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed
 specifications for wd8600 & nb-wd8600 series exit
 door type wood doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 cladding available for 1/4" on 1/2" panels. specify 31- and panel thickness on order. only available on 1-3/4" door 
 thickness. must be noted separately from door thickness on order string.
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 650 top strike & 606 bottom strike (panic and fire rated)




 07/25
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 electric options al- alarm
 pl- sarguide™ photoluminescent coated




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with wood screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 108" (2743mm) max door opening - fire rated doors
 120" (3048mm) max door opening - non-fire rated doors
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6
 note: wd8600 & 12-wd8600 can be used as nb- device by simply not installing the bottom rod/bolt
 note: 12-nb applications require thermal pin. thermal pin supplied when ordered as a 12-nb device




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux control 650 top strike 606 bottom strike
 • available as an 06 or
 13 function
 1-1/8"
 • supplied with a (29mm) 1-1/16"
 sargent #41 mortise (27mm)
 cylinder
 2-1/2"
 • can be used with any (64mm)
 2-5/8"
 sargent mortise key (67mm)
 5/32"
 system
 • for application in hollow metal frames (4mm)

 • stainless steel
 • furnished with expansion shields
 • mortised into floor
 • stainless steel

90641
 22 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 23, 'WD8600 and NB-WD8600
Functions and Trims
for Wood Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 58-NB- WD86 13 F ETL RHR 26D 32D 36" 84" 41" WD8600


700 Series ET Trim SARGENT ANSI ANSI Type 7 Mechanical Options:
 Function Function Description & Cylinder Info WD8600 12-
 Exits with ET Trim, specify 16-
 lever design after the ET Numbers Numbers (1-3/4" Door) Panic & Fire 19-
 designation (e.g., ETL) Key unlocks Trim, Trim retracts latch/ 31-
 36-
 06 09 Trim relocks when key is removed WD8606 x ET_ 37-
 #41 Cylinder Supplied 43-
 53-
 54-
 10 01 No outside operation (No Cylinder)* WD8610 55-
 56-
 56-HK-
 5LH
 No outside operation (No Cylinder)* 58-
 10 02 ET Control is used as Pull Only
 WD8610 x ET_ 59-
Lever Designs for ET Controls BC-59-
A, B, E, F, J, L, P, W 76-
 Key Outside Unlocks/locks Trim 85-
Also available with Coastal Series 13 08 WD8613 x ET_ 86-
& Studio Collection Levers #41 Cylinder Supplied 87-
 AL-
ET Designation with Suffix BT-
 15 14 Passage Only (No cylinder) WD8615 x ET_ CPC-
(Used to order ET without device) LD-
MD8600 & NB-MD8600 Series: NB-
 PL-
706-4, 710-4, 713-4, 715-4, 740-4, Freewheeling Trim - * SG-
743-4, 746-4, 773-4, & 774-4 40 02 No outside operation WD8640 x ET_ Cylinder Options:
 (No Cylinder)* Dummy Trim 10-
Freewheeling Trim 10-21-
 Freewheeling Trim - 10-63-
The lever rotates when the door is 43 08 Key Outside Unlocks/locks Trim WD8643 x ET_ 11-
locked preventing excessive force 11-21-
 #41 Cylinder Supplied 11-60-




 07/25
from being applied to the horizontal
 Freewheeling Trim - 11-63-
lever 11-64-
 Key unlocks Trim, Trim retracts latch/
 46 09 Trim relocks when key is removed WD8646 x ET_ 11-70-7P-
Electrified ET Trim 11-72-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 #41 Cylinder Supplied 11-73-7P-
Voltage must be specified for the 11-65-73-7P-
following functions: 73 and 74. Electrified ET Trim - Fail Safe 21-
Specify: 12VDC or 24VDC 73 Power Off, Unlocks Lever (No Cylinder)*
 WD8673 x ET_ 51-
 52-
 60-
 63-
 Electrified ET Trim - Fail Secure 64-
 74 Power Off, Locks Lever (No Cylinder)*
 WD8674 x ET_ 70-
 72-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 73-
 65-73-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel
 65-73-7P-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices. 73-7P-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 81-
 * Cylinder Override is available with a 106 Aux Control 82-
 Example Order: WD8673F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h F1-82-
 83-
 F1-83-
 84-
 SARGENT ANSI BR-
 WD8600 LC-
100 Series Auxiliary Control* Function Function Description & Cylinder Info
 Panic & Fire SC-
& 862 Pull Numbers Numbers (1-3/4" Door) SE-
 Key unlocks Turn, Turn retracts latch/
 06 12 Turn relocks when key is removed WD8610 x 106 * Only available with
 #41 Cylinder Supplied 15, 26D and 32D
 finishes
 862 Pull Only
 10 02 (Optional Pulls: 863 & 864)
 WD8610 x 862 Pull Available
 Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux. 862 Pull Key Outside Unlocks/locks Turn
 SARGENT BHMA
 Control 13 11 #41 Cylinder Supplied
 WD8610 x 113 Finishes Finishes

 03 605
 04 606
 Note: When ordering WD8600/NB-WD8600 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit. 09
 Example: WD8610F x 106 x RHR x 32D x 42" x 90"
 611
 10 612
 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP


 1-800-727-5477 • www.sargentlock.com
 23 90641
', 3937, 1, 'wd8600 and nb-wd8600
functions and trims
for wood doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 58-nb- wd86 13 f etl rhr 26d 32d 36" 84" 41" wd8600


700 series et trim sargent ansi ansi type 7 mechanical options:
 function function description & cylinder info wd8600 12-
 exits with et trim, specify 16-
 lever design after the et numbers numbers (1-3/4" door) panic & fire 19-
 designation (e.g., etl) key unlocks trim, trim retracts latch/ 31-
 36-
 06 09 trim relocks when key is removed wd8606 x et_ 37-
 #41 cylinder supplied 43-
 53-
 54-
 10 01 no outside operation (no cylinder)* wd8610 55-
 56-
 56-hk-
 5lh
 no outside operation (no cylinder)* 58-
 10 02 et control is used as pull only
 wd8610 x et_ 59-
lever designs for et controls bc-59-
a, b, e, f, j, l, p, w 76-
 key outside unlocks/locks trim 85-
also available with coastal series 13 08 wd8613 x et_ 86-
& studio collection levers #41 cylinder supplied 87-
 al-
et designation with suffix bt-
 15 14 passage only (no cylinder) wd8615 x et_ cpc-
(used to order et without device) ld-
md8600 & nb-md8600 series: nb-
 pl-
706-4, 710-4, 713-4, 715-4, 740-4, freewheeling trim - * sg-
743-4, 746-4, 773-4, & 774-4 40 02 no outside operation wd8640 x et_ cylinder options:
 (no cylinder)* dummy trim 10-
freewheeling trim 10-21-
 freewheeling trim - 10-63-
the lever rotates when the door is 43 08 key outside unlocks/locks trim wd8643 x et_ 11-
locked preventing excessive force 11-21-
 #41 cylinder supplied 11-60-




 07/25
from being applied to the horizontal
 freewheeling trim - 11-63-
lever 11-64-
 key unlocks trim, trim retracts latch/
 46 09 trim relocks when key is removed wd8646 x et_ 11-70-7p-
electrified et trim 11-72-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 #41 cylinder supplied 11-73-7p-
voltage must be specified for the 11-65-73-7p-
following functions: 73 and 74. electrified et trim - fail safe 21-
specify: 12vdc or 24vdc 73 power off, unlocks lever (no cylinder)*
 wd8673 x et_ 51-
 52-
 60-
 63-
 electrified et trim - fail secure 64-
 74 power off, locks lever (no cylinder)*
 wd8674 x et_ 70-
 72-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 73-
 65-73-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel
 65-73-7p-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices. 73-7p-
 note: aff means above finished floor, center line of rail above finished floor 81-
 * cylinder override is available with a 106 aux control 82-
 example order: wd8673f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h f1-82-
 83-
 f1-83-
 84-
 sargent ansi br-
 wd8600 lc-
100 series auxiliary control* function function description & cylinder info
 panic & fire sc-
& 862 pull numbers numbers (1-3/4" door) se-
 key unlocks turn, turn retracts latch/
 06 12 turn relocks when key is removed wd8610 x 106 * only available with
 #41 cylinder supplied 15, 26d and 32d
 finishes
 862 pull only
 10 02 (optional pulls: 863 & 864)
 wd8610 x 862 pull available
 finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux. 862 pull key outside unlocks/locks turn
 sargent bhma
 control 13 11 #41 cylinder supplied
 wd8610 x 113 finishes finishes

 03 605
 04 606
 note: when ordering wd8600/nb-wd8600 series exit device x 100 series aux. control, specify 10 function for the exit. 09
 example: wd8610f x 106 x rhr x 32d x 42" x 90"
 611
 10 612
 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp


 1-800-727-5477 • www.sargentlock.com
 23 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 24, ' 8500 Narrow Design Rim Exit Device
 80 Series


 8500 Features
 • Designed for narrow stile applications
 (e.g., aluminum frame full glass doors)
 • Single and double doors with mullion
 • Single point rim latching device
 8500 Series • Quiet operation and solid security
 Narrow Design Rim Exit Device • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) listed

 Specifications for 8500 Series Exit
 Door Type Wood or metal Doors 604 Wear Plate Kit
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 5" thick, • Designed for use with
 specify thickness and order as 31- (see page 67 for function limitation) narrow stile aluminum
 Stile 2" (114mm) minimum stile (Less Trim) doors
 Rail sizes as Rails are available in 4 sizes, use door width to determine size • Field cut to accommodate
 determined by door needed. Rails will be factory cut to size, if door width is supplied. all door frame face sizes
 width • E Rail for 24" to 32" door widths
 • F Rail for 33" to 36" door widths
 • J Rail for 37" to 42" door widths
 • G Rail for 43" to 48" door widths
 Strike 657 Strike, Supplied standard for panic devices 649 Standard Strike for 12-8500
 656 Strike, Supplied standard for panic devices
 • Surface applied
 649 Strike, Supplied standard for fired rated devices
 Optional Strikes – 649, 658 Standard with 650A Mullion • Black nylon coated




 07/25
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for
 cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction 651 Mullion Stabilizer Kit
 58- Electric Dogging • Stabilizer block
 59- Electroguard – Self Contained Delayed Egress • Furnished standard
 Weather Resistant WH- Weep Holes (Available only with Clear Coated Finishes. See w/650A Mullion
 Chart - Page 77)
 Mounting Fasteners Supplied standard with wood and machine screws • Order as a 651 Kit
 Available with through-bolts and mortise (sex) nuts
 Latch Bolt Stainless steel, 3/4" (19mm) throw
 Device Centerline 41" (1041 mm) for Standard Applications
 from Finished Floor 656 Mullion Strike
 Center Case 8-5/16" (211mm) x 1-1/16" (27mm) • Surface applied
 Dimensions
 Projection Pushbar Neutral – 3" (76 mm) • Use with 980 mullions
 Pushbar Depressed – 2-1/8" (54 mm) • Black nylon coated
 Fire Exit Hardware See Chart – Page 6

 668 Shim Kits for 8500
 • Two Chassis Shims and SHIMS
 (2 REQ’D)
 Two End Cap Shims 657 Standard Strike for 8500
 • Shims are 1/8" for • Surface applied




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 a total height of 1/4" or mortised
 • For use on frames with
 SHIMS
 blade stop or
 (2 REQ’D)
 integral stop
 • Black nylon coated


 658 Strike alternative for 8500
 • Packed standard with
 650A mullion
 • Can be ordered separately for
 MOUNTING
 BRACKET surface application
 to frames
 NARROW STILE END CAP
 THRU-BOLT WITH CHASSIS ASSEMBLY • Black nylon coated
 SCREWS PROVIDED

90641
 24 1-800-727-5477 • www.sargentlock.com
', 3339, 1, ' 8500 narrow design rim exit device
 80 series


 8500 features
 • designed for narrow stile applications
 (e.g., aluminum frame full glass doors)
 • single and double doors with mullion
 • single point rim latching device
 8500 series • quiet operation and solid security
 narrow design rim exit device • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed

 specifications for 8500 series exit
 door type wood or metal doors 604 wear plate kit
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 5" thick, • designed for use with
 specify thickness and order as 31- (see page 67 for function limitation) narrow stile aluminum
 stile 2" (114mm) minimum stile (less trim) doors
 rail sizes as rails are available in 4 sizes, use door width to determine size • field cut to accommodate
 determined by door needed. rails will be factory cut to size, if door width is supplied. all door frame face sizes
 width • e rail for 24" to 32" door widths
 • f rail for 33" to 36" door widths
 • j rail for 37" to 42" door widths
 • g rail for 43" to 48" door widths
 strike 657 strike, supplied standard for panic devices 649 standard strike for 12-8500
 656 strike, supplied standard for panic devices
 • surface applied
 649 strike, supplied standard for fired rated devices
 optional strikes – 649, 658 standard with 650a mullion • black nylon coated




 07/25
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for
 cylinder dogging (#41 cylinder supplied)
 electric options al- alarm




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction 651 mullion stabilizer kit
 58- electric dogging • stabilizer block
 59- electroguard – self contained delayed egress • furnished standard
 weather resistant wh- weep holes (available only with clear coated finishes. see w/650a mullion
 chart - page 77)
 mounting fasteners supplied standard with wood and machine screws • order as a 651 kit
 available with through-bolts and mortise (sex) nuts
 latch bolt stainless steel, 3/4" (19mm) throw
 device centerline 41" (1041 mm) for standard applications
 from finished floor 656 mullion strike
 center case 8-5/16" (211mm) x 1-1/16" (27mm) • surface applied
 dimensions
 projection pushbar neutral – 3" (76 mm) • use with 980 mullions
 pushbar depressed – 2-1/8" (54 mm) • black nylon coated
 fire exit hardware see chart – page 6

 668 shim kits for 8500
 • two chassis shims and shims
 (2 req’d)
 two end cap shims 657 standard strike for 8500
 • shims are 1/8" for • surface applied




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 a total height of 1/4" or mortised
 • for use on frames with
 shims
 blade stop or
 (2 req’d)
 integral stop
 • black nylon coated


 658 strike alternative for 8500
 • packed standard with
 650a mullion
 • can be ordered separately for
 mounting
 bracket surface application
 to frames
 narrow stile end cap
 thru-bolt with chassis assembly • black nylon coated
 screws provided

90641
 24 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 25, '8500 Narrow Design Rim Exit Device
Functions & Trim
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 F1-83-56 85 13 F ETL RHR 15 32D 36"

 Options
700 Series ET Trim SARGENT ANSI ANSI Type 4
 8500
 Exits with ET Trim, specify Function Function 8500
 lever design after the ET Numbers Numbers Description & Cylinder Info. (1-3/4" Door) Panic
 designation (e.g., ETL) Mechanical Options:
 12-
 Night Latch 16-
 04* 03 Key Retracts Latch 8504 x ET_ 19-
 #34 Cylinder Supplied 31-
 36-
 37-
 Key unlocks Trim, Trim retracts latch/ 43-
 06 09 Trim relocks when key is removed 8506 x ET_ 53-
 #41 Cylinder Supplied 54-
 55-
 56-
 10 01 No outside operation (No Cylinder) 8510 56-HK-
Lever Designs for ET Controls 58-
 No outside operation (No Cylinder) 59-
A, B, E, F, J, L, P, W 10 02 ET Control is used as Pull Only 8510 x ET_ 5CH-
 BC-59-
Also available with Coastal Series & 76-
Studio Collection Levers Key Outside Unlocks/locks Trim 85-
 13 08 #41 Cylinder Supplied 8513 x ET_ 86-
 87-
ET Designation with Suffix AL-
(Used to order ET without device) BT-
 15 14 Passage Only (No cylinder) 8515 x ET_ CPC-
8500 Series: 704, 706-8, 710, 713-8, GL-
715-8, 740, 743-8, 744, 746-8, 773-8 LD-
 Freewheeling Trim - PL-
& 774-8 40 02 No outside operation 8540 x ET_ * SG-
 (No Cylinder) Dummy Trim WH-
Freewheeling Trim Cylinder Options:
 10-
The lever rotates when the door is Freewheeling Trim - 10-21-




 07/25
locked preventing excessive force 43 08 Key Outside Unlocks/locks Trim 8543 x ET_ 10-63-
 #41 Cylinder Supplied 11-
from being applied to the horizontal 11-21-
lever 11-60-
 Freewheeling Trim - 11-63-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 44 03 Key Retracts Latch 8544 x ET_ 11-64-
 #34 Cylinder Supplied 11-70-7P-
 11-72-7P-
Electrified ET Trim 11-73-7P-
 Freewheeling Trim - 11-65-73-7P-
Voltage must be specified for the 21-
 Key unlocks Trim, Trim retracts latch/
following functions: 73 and 74. 46 09 Trim relocks when key is removed 8546 x ET_ 51-
 52-
Specify: 12VDC or 24VDC #41 Cylinder Supplied 60-
 63-
 Electrified ET Trim - Fail Safe 64-
 73 Power Off, Unlocks Lever (No Cylinder)** 8573 x ET_ 70-
 72-
 73-
 Electrified ET Trim - Fail Secure 65-73-
 74 Power Off, Locks Lever (No Cylinder)** 8574 x ET_ 65-73-7P-
 73-7P-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 81-
 supplied in 32 or 32D to match accordingly. 32or 32D is automatically supplied when 26 or 26D is specified. For nickel 82-
 F1-82-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 83-
 * Consult factory when using with cylinders from other manufacturers F1-83-
 ** Cylinder override is not available with 8500 Series Devices 84-
 BR-
 LC-
 SC-
 SE-

 Series
 * Only available with
 15, 26D and 32D
 Trim designations finishes

 SARGENT ANSI Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Function Function Description & Cylinder Finishes
 Pull Trim Section Numbers Numbers Info. (1-3/4" Door) 8500 Panic
 BHMA
 SARGENT
 Finishes Finishes
 Night Latch 8504 x 862
 04 03 Key Retracts Latch 03 605
 #34 Cylinder Supplied Pull only 04 606
 09 611
 862 Pull Only 8510 x 862 10 612
 10 02 (Optional Pulls: 863 & 864) 10B 613
 862 Pull Pull only
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP ­32DCP
 WSP

 1-800-727-5477 • www.sargentlock.com
 25 90641
', 3658, 1, '8500 narrow design rim exit device
functions & trim
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width
 f1-83-56 85 13 f etl rhr 15 32d 36"

 options
700 series et trim sargent ansi ansi type 4
 8500
 exits with et trim, specify function function 8500
 lever design after the et numbers numbers description & cylinder info. (1-3/4" door) panic
 designation (e.g., etl) mechanical options:
 12-
 night latch 16-
 04* 03 key retracts latch 8504 x et_ 19-
 #34 cylinder supplied 31-
 36-
 37-
 key unlocks trim, trim retracts latch/ 43-
 06 09 trim relocks when key is removed 8506 x et_ 53-
 #41 cylinder supplied 54-
 55-
 56-
 10 01 no outside operation (no cylinder) 8510 56-hk-
lever designs for et controls 58-
 no outside operation (no cylinder) 59-
a, b, e, f, j, l, p, w 10 02 et control is used as pull only 8510 x et_ 5ch-
 bc-59-
also available with coastal series & 76-
studio collection levers key outside unlocks/locks trim 85-
 13 08 #41 cylinder supplied 8513 x et_ 86-
 87-
et designation with suffix al-
(used to order et without device) bt-
 15 14 passage only (no cylinder) 8515 x et_ cpc-
8500 series: 704, 706-8, 710, 713-8, gl-
715-8, 740, 743-8, 744, 746-8, 773-8 ld-
 freewheeling trim - pl-
& 774-8 40 02 no outside operation 8540 x et_ * sg-
 (no cylinder) dummy trim wh-
freewheeling trim cylinder options:
 10-
the lever rotates when the door is freewheeling trim - 10-21-




 07/25
locked preventing excessive force 43 08 key outside unlocks/locks trim 8543 x et_ 10-63-
 #41 cylinder supplied 11-
from being applied to the horizontal 11-21-
lever 11-60-
 freewheeling trim - 11-63-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 44 03 key retracts latch 8544 x et_ 11-64-
 #34 cylinder supplied 11-70-7p-
 11-72-7p-
electrified et trim 11-73-7p-
 freewheeling trim - 11-65-73-7p-
voltage must be specified for the 21-
 key unlocks trim, trim retracts latch/
following functions: 73 and 74. 46 09 trim relocks when key is removed 8546 x et_ 51-
 52-
specify: 12vdc or 24vdc #41 cylinder supplied 60-
 63-
 electrified et trim - fail safe 64-
 73 power off, unlocks lever (no cylinder)** 8573 x et_ 70-
 72-
 73-
 electrified et trim - fail secure 65-73-
 74 power off, locks lever (no cylinder)** 8574 x et_ 65-73-7p-
 73-7p-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 81-
 supplied in 32 or 32d to match accordingly. 32or 32d is automatically supplied when 26 or 26d is specified. for nickel 82-
 f1-82-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 83-
 * consult factory when using with cylinders from other manufacturers f1-83-
 ** cylinder override is not available with 8500 series devices 84-
 br-
 lc-
 sc-
 se-

 series
 * only available with
 15, 26d and 32d
 trim designations finishes

 sargent ansi available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 function function description & cylinder finishes
 pull trim section numbers numbers info. (1-3/4" door) 8500 panic
 bhma
 sargent
 finishes finishes
 night latch 8504 x 862
 04 03 key retracts latch 03 605
 #34 cylinder supplied pull only 04 606
 09 611
 862 pull only 8510 x 862 10 612
 10 02 (optional pulls: 863 & 864) 10b 613
 862 pull pull only
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp ­32dcp
 wsp

 1-800-727-5477 • www.sargentlock.com
 25 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 26, ' AD8500 Narrow Design Rim Exit Device
 for Aluminum Doors
 80 Series


 AD8500 Features
 • Designed for narrow stile applications
 (e.g., aluminum frame full glass doors)
 • Single and double doors with mullion
 • Single point rim latching device
 AD8500 Series • Quiet operation and solid security
 Narrow Design Rim Exit Device • Devices are ANSI/BHMA A156.3 - Grade 1
 • Available Windstorm-rated; order WS-
 Specifications for AD8500 Series Exit
 Door Type Aluminum Doors 657 Standard Strike for 8500
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 5" • Surface applied
 thick, specify thickness and order as 31- (see page 67 for function or mortised
 limitation)
 • For use on frames with
 Stile 2" (114mm) minimum stile (Less Trim) blade stop or
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed. integral stop
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths • Black nylon coated
 • F Rail for 33" to 36" door widths
 • J Rail for 37" to 42" door widths
 • G Rail for 43" to 48" door widths
 Strike 657 Strike, Supplied standard for panic devices 651 Mullion Stabilizer Kit
 656 Strike, Supplied standard for panic devices
 649 Strike, Supplied standard for fired rated devices
 Optional Strikes – 649, 658 Standard with 650A Mullion




 07/25
 Dogging Feature Hex key dogging standard; specify 16- for cylinder dogging
 (#41 cylinder supplied)
 Electric Options AL- Alarm




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring • Stabilizer block
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction • Furnished standard w/650A Mullion
 58- Electric Dogging • Order as a 651 Kit
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with wood and machine screws
 Available with through-bolts and mortise (sex) nuts
 Latch Bolt Stainless steel, 3/4" (19mm) throw 656 Mullion Strike
 Device Centerline from • Surface applied
 Finished Floor 41" (1041 mm) for Standard Applications
 • Use with 980 mullions
 Center Case Dimensions 8-5/16" (211mm) x 1-1/16" (27mm)
 • Black nylon coated
 Projection Pushbar Neutral – 3" (77mm)
 Pushbar Depressed – 2-1/8" (54mm)


 535 Kit for Windstorm Applications (WS-AD8500)
 • Two Chassis Shims and
 Two End Cap Shims
 SHIMS
 (2 REQ’D)
 604 Wear Plate Kit
 • Shims are 1/8" for • Surface applied
 a total height of 1/4" • Accommodates
 all sizes of door




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • 
 649 Strike Pack
 SHIMS
 frame face
 • 
 651 Stabilizer Kit
 (2 REQ’D)




 MOUNTING
 BRACKET

 NARROW STILE END CAP
 THRU-BOLT WITH CHASSIS ASSEMBLY
 SCREWS PROVIDED




90641
 26 1-800-727-5477 • www.sargentlock.com
', 2992, 1, ' ad8500 narrow design rim exit device
 for aluminum doors
 80 series


 ad8500 features
 • designed for narrow stile applications
 (e.g., aluminum frame full glass doors)
 • single and double doors with mullion
 • single point rim latching device
 ad8500 series • quiet operation and solid security
 narrow design rim exit device • devices are ansi/bhma a156.3 - grade 1
 • available windstorm-rated; order ws-
 specifications for ad8500 series exit
 door type aluminum doors 657 standard strike for 8500
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 5" • surface applied
 thick, specify thickness and order as 31- (see page 67 for function or mortised
 limitation)
 • for use on frames with
 stile 2" (114mm) minimum stile (less trim) blade stop or
 rail sizes as rails are available in 4 sizes, use door width to determine size needed. integral stop
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths • black nylon coated
 • f rail for 33" to 36" door widths
 • j rail for 37" to 42" door widths
 • g rail for 43" to 48" door widths
 strike 657 strike, supplied standard for panic devices 651 mullion stabilizer kit
 656 strike, supplied standard for panic devices
 649 strike, supplied standard for fired rated devices
 optional strikes – 649, 658 standard with 650a mullion




 07/25
 dogging feature hex key dogging standard; specify 16- for cylinder dogging
 (#41 cylinder supplied)
 electric options al- alarm




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 53- lx latchbolt monitor
 54- outside lever monitoring • stabilizer block
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction • furnished standard w/650a mullion
 58- electric dogging • order as a 651 kit
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with wood and machine screws
 available with through-bolts and mortise (sex) nuts
 latch bolt stainless steel, 3/4" (19mm) throw 656 mullion strike
 device centerline from • surface applied
 finished floor 41" (1041 mm) for standard applications
 • use with 980 mullions
 center case dimensions 8-5/16" (211mm) x 1-1/16" (27mm)
 • black nylon coated
 projection pushbar neutral – 3" (77mm)
 pushbar depressed – 2-1/8" (54mm)


 535 kit for windstorm applications (ws-ad8500)
 • two chassis shims and
 two end cap shims
 shims
 (2 req’d)
 604 wear plate kit
 • shims are 1/8" for • surface applied
 a total height of 1/4" • accommodates
 all sizes of door




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • 
 649 strike pack
 shims
 frame face
 • 
 651 stabilizer kit
 (2 req’d)




 mounting
 bracket

 narrow stile end cap
 thru-bolt with chassis assembly
 screws provided




90641
 26 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 27, 'AD8500 Narrow Design Rim Exit Device
Functions & Trim
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 F1-83-56 AD85 13 F ETL RHR 15 32D 36"

 Options
700 Series ET Trim SARGENT ANSI ANSI Type 4
 AD8500
 Exits with ET Trim, specify Function Function AD8500
 lever design after the ET Numbers Numbers Description & Cylinder Info. (1-3/4" Door) Panic Mechanical Options:
 designation (e.g., ETL) 12-
 Night Latch 16-
 04* 03 Key Retracts Latch AD8504 x ET_ 19-
 #34 Cylinder Supplied 31-
 36-
 37-
 Key unlocks Trim, Trim retracts latch/ 43-
 53-
 06 09 Trim relocks when key is removed AD8506 x ET_ 54-
 #41 Cylinder Supplied 55-
 56-
 56-HK-
 10 01 No outside operation (No Cylinder) AD8510 58-
Lever Designs for ET Controls 59-
 No outside operation (No Cylinder) 5CH-
A, B, E, F, J, L, P, W 10 02 ET Control is used as Pull Only AD8510 x ET_ BC-59-
Also available with Coastal Series & 76-
 85-
Studio Collection Levers Key Outside Unlocks/locks Trim 86-
 13 08 #41 Cylinder Supplied AD8513 x ET_ 87-
ET Designation with Suffix AL-
 BT-
(Used to order ET without device) CPC-
 15 14 Passage Only (No cylinder) AD8515 x ET_ GL-
AD8500 Series: 704, 706-8, 710, LD-
713-8, 715-8, 740, 743-8, 744, 746-8, Freewheeling Trim - PL-
773-8 & 774-8 40 02 No outside operation AD8540 x ET_ * SG-
 WS-
 (No Cylinder) Dummy Trim Cylinder Options:
Freewheeling Trim 10-
 Freewheeling Trim - 10-21-
The lever rotates when the door is 10-63-




 07/25
locked preventing excessive force 43 08 Key Outside Unlocks/locks Trim AD8543 x ET_ 11-
 #41 Cylinder Supplied 11-21-
from being applied to the horizontal
 11-60-
lever 11-63-
 Freewheeling Trim -




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 11-64-
 44 03 Key Retracts Latch AD8544 x ET_ 11-70-7P-
 #34 Cylinder Supplied 11-72-7P-
 11-73-7P-
Electrified ET Trim 11-65-73-7P-
 Freewheeling Trim - 21-
Voltage must be specified for the Key unlocks Trim, Trim retracts latch/ 51-
following functions: 73 and 74. 46 09 Trim relocks when key is removed AD8546 x ET_ 52-
Specify: 12VDC or 24VDC #41 Cylinder Supplied 60-
 63-
 64-
 Electrified ET Trim - Fail Safe 70-
 73 Power Off, Unlocks Lever (No Cylinder)** AD8573 x ET_ 72-
 73-
 Electrified ET Trim - Fail Secure 65-73-
 74 Power Off, Locks Lever (No Cylinder)** AD8574 x ET_ 65-73-7P-
 73-7P-
 81-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 82-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel F1-82-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 83-
 * Consult factory when using with cylinders from other manufacturers F1-83-
 84-
 ** Cylinder override is not available with AD8500 Series Devices
 BR-
 LC-
 SC-
 SE-

 Series * Only available with
 15, 26D and 32D
 finishes
 Trim designations
 SARGENT ANSI Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Function Function Description & Cylinder Finishes
 Pull Trim Section Numbers Numbers Info. (1-3/4" Door) AD8500 Panic
 SARGENT BHMA
 Finishes Finishes
 Night Latch AD8504 x 862
 04 03 Key Retracts Latch 03
 #34 Cylinder Supplied Pull only 605
 04 606
 09 611
 862 Pull Only AD8510 x 862 10 612
 10 02 (Optional Pulls: 863 & 864) 10B
 862 Pull Pull only 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP

 1-800-727-5477 • www.sargentlock.com
 27 90641
', 3696, 1, 'ad8500 narrow design rim exit device
functions & trim
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width
 f1-83-56 ad85 13 f etl rhr 15 32d 36"

 options
700 series et trim sargent ansi ansi type 4
 ad8500
 exits with et trim, specify function function ad8500
 lever design after the et numbers numbers description & cylinder info. (1-3/4" door) panic mechanical options:
 designation (e.g., etl) 12-
 night latch 16-
 04* 03 key retracts latch ad8504 x et_ 19-
 #34 cylinder supplied 31-
 36-
 37-
 key unlocks trim, trim retracts latch/ 43-
 53-
 06 09 trim relocks when key is removed ad8506 x et_ 54-
 #41 cylinder supplied 55-
 56-
 56-hk-
 10 01 no outside operation (no cylinder) ad8510 58-
lever designs for et controls 59-
 no outside operation (no cylinder) 5ch-
a, b, e, f, j, l, p, w 10 02 et control is used as pull only ad8510 x et_ bc-59-
also available with coastal series & 76-
 85-
studio collection levers key outside unlocks/locks trim 86-
 13 08 #41 cylinder supplied ad8513 x et_ 87-
et designation with suffix al-
 bt-
(used to order et without device) cpc-
 15 14 passage only (no cylinder) ad8515 x et_ gl-
ad8500 series: 704, 706-8, 710, ld-
713-8, 715-8, 740, 743-8, 744, 746-8, freewheeling trim - pl-
773-8 & 774-8 40 02 no outside operation ad8540 x et_ * sg-
 ws-
 (no cylinder) dummy trim cylinder options:
freewheeling trim 10-
 freewheeling trim - 10-21-
the lever rotates when the door is 10-63-




 07/25
locked preventing excessive force 43 08 key outside unlocks/locks trim ad8543 x et_ 11-
 #41 cylinder supplied 11-21-
from being applied to the horizontal
 11-60-
lever 11-63-
 freewheeling trim -




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 11-64-
 44 03 key retracts latch ad8544 x et_ 11-70-7p-
 #34 cylinder supplied 11-72-7p-
 11-73-7p-
electrified et trim 11-65-73-7p-
 freewheeling trim - 21-
voltage must be specified for the key unlocks trim, trim retracts latch/ 51-
following functions: 73 and 74. 46 09 trim relocks when key is removed ad8546 x et_ 52-
specify: 12vdc or 24vdc #41 cylinder supplied 60-
 63-
 64-
 electrified et trim - fail safe 70-
 73 power off, unlocks lever (no cylinder)** ad8573 x et_ 72-
 73-
 electrified et trim - fail secure 65-73-
 74 power off, locks lever (no cylinder)** ad8574 x et_ 65-73-7p-
 73-7p-
 81-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 82-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel f1-82-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 83-
 * consult factory when using with cylinders from other manufacturers f1-83-
 84-
 ** cylinder override is not available with ad8500 series devices
 br-
 lc-
 sc-
 se-

 series * only available with
 15, 26d and 32d
 finishes
 trim designations
 sargent ansi available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 function function description & cylinder finishes
 pull trim section numbers numbers info. (1-3/4" door) ad8500 panic
 sargent bhma
 finishes finishes
 night latch ad8504 x 862
 04 03 key retracts latch 03
 #34 cylinder supplied pull only 605
 04 606
 09 611
 862 pull only ad8510 x 862 10 612
 10 02 (optional pulls: 863 & 864) 10b
 862 pull pull only 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp

 1-800-727-5477 • www.sargentlock.com
 27 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 28, ' 8300 Narrow Design
 Mortise Lock Exit Device
 80 Series


 8300 Features
 • Designed for standard width stiles with a narrow design look
 • Through-bolted trim for quiet operation and security
 • Single door applications
 8300 Series • Double door applications with Mortise Lock x Vertical
 Rod Device
 Narrow Design Mortise Lock Exit Device
 • UL10C (Fire) and UL305 (Panic) listed

 Specifications for 8300 Mortise Lock Exit • Devices are ANSI/BHMA A156.3 - Grade 1

 Door Type Wood or metal doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike C908 Standard Black Nylon Coated – ANSI Prep A115.1
 Optional Strikes – 815 Open Back Strike or 908 Flat Lipped Strike with Black Nylon
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)




 07/25
 Electric Options AL- Alarm
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with wood and machine screws
 Available with through-bolts and mortise(sex) nuts
 Latch Bolt Brass Nickel Plated, 3/4" (19mm) throw, anti-friction
 Guarded/Deadlatch Brass, sliding type
 Device Centerline from 41" (1041 mm) for Standard Applications
 Finished Floor
 Center Case Dimensions 8-5/16" (211mm) x 1-1/16" (27mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6



 C908 Standard Strike Single Door 815 Open Back Strike
 Trim
 • Curved lip ANSI A-115.1
 • Handed. 1-1/4" (32mm) lip standard




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 1-1/4" • Longer lips
 in increments
 (32mm) 4-7/8" 3-3/8"
 of 1/4" (6mm) (124mm) (86mm)
 through 2-7/8"
 (73mm) available
 • Black nylon coated
 Pair of Doors
 3-3/8" 4-7/8"
 (86mm) (124mm)
 Trim 1-1/4"
 (32mm)

 • ANSI A-115.14 Open Back
 • Beveled 1/8" (3mm) in 2" (51mm)
 • Specify hand of active door
 1-1/4"
 (32mm) 3/32"
 • Black nylon coat
 (2mm) 815 Open back strike • “B” label



90641
 28 1-800-727-5477 • www.sargentlock.com
', 2952, 1, ' 8300 narrow design
 mortise lock exit device
 80 series


 8300 features
 • designed for standard width stiles with a narrow design look
 • through-bolted trim for quiet operation and security
 • single door applications
 8300 series • double door applications with mortise lock x vertical
 rod device
 narrow design mortise lock exit device
 • ul10c (fire) and ul305 (panic) listed

 specifications for 8300 mortise lock exit • devices are ansi/bhma a156.3 - grade 1

 door type wood or metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike c908 standard black nylon coated – ansi prep a115.1
 optional strikes – 815 open back strike or 908 flat lipped strike with black nylon
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)




 07/25
 electric options al- alarm
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with wood and machine screws
 available with through-bolts and mortise(sex) nuts
 latch bolt brass nickel plated, 3/4" (19mm) throw, anti-friction
 guarded/deadlatch brass, sliding type
 device centerline from 41" (1041 mm) for standard applications
 finished floor
 center case dimensions 8-5/16" (211mm) x 1-1/16" (27mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6



 c908 standard strike single door 815 open back strike
 trim
 • curved lip ansi a-115.1
 • handed. 1-1/4" (32mm) lip standard




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 1-1/4" • longer lips
 in increments
 (32mm) 4-7/8" 3-3/8"
 of 1/4" (6mm) (124mm) (86mm)
 through 2-7/8"
 (73mm) available
 • black nylon coated
 pair of doors
 3-3/8" 4-7/8"
 (86mm) (124mm)
 trim 1-1/4"
 (32mm)

 • ansi a-115.14 open back
 • beveled 1/8" (3mm) in 2" (51mm)
 • specify hand of active door
 1-1/4"
 (32mm) 3/32"
 • black nylon coat
 (2mm) 815 open back strike • “b” label



90641
 28 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 29, '8300 Narrow Design
Mortise Lock Exit Device Functions & Trim
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Options
 11- 83 13 F ETL RHR 26D 32D 36" 8300


 SARGENT ANSI ANSI Type 10 Mechanical Options:
 Function Function Description & Cylinder Info 8300 12-
 16-
700 Series ET Trim Numbers Numbers (1-3/4" Door) Panic & Fire 19-
 23-
 Exits with ET Trim, specify Night Latch *31
 lever design after the ET 36-
 04 03 Key Retracts Latch 8304 x ET_ 37-
 designation (e.g., ETL) #46 Cylinder Supplied 43-
 53-
 54-
 10 01 No outside operation (No Cylinder) 8310 55-
 56-
 No outside operation (No Cylinder) 56-HK-
 10 02 ET Control is used as Pull Only 8310 x ET_ 58-
 59-
 BC-59-
 Key Outside Unlocks/locks Trim 76-
 13 08 #41 Cylinder Supplied 8313 x ET_ 85-
Lever Designs for ET Controls 86-
 87-
A, B, E, F, J, L, P, W AL-
Also available with Coastal Series & 15 14 Passage Only (No cylinder) 8315 x ET_ BT-
Studio Collection Levers LD-
 Freewheeling Trim - PL-
 *** SG-
ET Designation with Suffix 40 02 No outside operation 8340 x ET_ Cylinder Options:
 (No Cylinder) Dummy Trim 10-
(Used to order ET without device) 10-21-
8300 Series: 704, 710, 713, 715, 740, 10-63-
 Freewheeling Trim - 11-
743, 744, 773, 774, 775 & 776 43 08 Key Outside Unlocks/locks Trim 8343 x ET_ 11-21-
 #41 Cylinder Supplied 11-60-
Freewheeling Trim 11-63-
 11-64-
The lever rotates when the door is Freewheeling Trim - 11-70-7P-
locked preventing excessive force 44 03 8344 x ET_ 11-72-7P-




 07/25
 Key Retracts Latch
from being applied to the horizontal For 1-3/4” Door #46 Cylinder Supplied 11-73-7P-
 11-65-73-7P-
lever 21-
Electrified ET Trim and Electrified ET Trim - Fail Safe 51-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Power Off, Unlocks Lever, 52-
Electrified Mortise Locks 75* Key Retracts Latch 8375 x ET_ 60-
 For 1-3/4" Door #46 Cylinder Supplied 63-
Voltage must be specified for the 64-
 following functions: 73, 74, 75 and Electrified ET Trim - Fail Secure 70-
76. Power Off, Locks Lever, 72-
Specify: 12VDC or 24VDC 76** Key Retracts Latch 8376 x ET_ 73-
 65-73-
 For 1-3/4" Door #46 Cylinder Supplied 65-73-7P-
 73-7P-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 81-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 82-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices F1-82-
 * 75 Function without cylinder is available as a 73 Function 83-
 F1-83-
 ** 76 Function without cylinder is available as a 74 Function 84-
 BR-
 LC-
 *SC-
Pull & Thumbpiece Trim Section Trim designations Series *SE-
 • Use three letter designations (Ex “PTB”) when
 ordering the Exit Device with trim * Options are not
 • Use the six digit designation (Ex “866-MAL”) available with the
 when ordering trim without an Exit Device, following functions:
 always specify finish & hand 04, 44, 75 & 76
 ** For SC- & SE- options
 contact factory for
 availability
 *** Only available with
SARGENT ANSI Description & 15, 26D and 32D
 Cylinder Info. finishes
 Function Function
Numbers Numbers (1-3/4" Door)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 8300 Panic & Fire
 Available
 Night Latch-Key Retracts Latch 8304 x Trim Finishes
 04 03 #41 Cylinder Supplied 814-FLL 814-FLW 814-MAL 814-PTB 814-STS
 Designation SARGENT BHMA
 Finishes Finishes
 No O/S Operation or Cylinder 8310 x Trim
 10 02 (Pull Only) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 03 605
 Designation 04 606
 09 611
 Passage Only 8328 x Trim 10 612
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS 10B 613
 Designation 613E
 10BE
 Key Outside Unlocks/locks 10BL 613L
 8363 x Trim 618
 63 05 Thumbpiece #41 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 14
 Cylinder Supplied Designation 15 619
 20D 624
 26 625
Note: Thumbpiece Trims used with Mortise Lock Exit Devices are handed
 26D 626
Note: Thumbpiece trims for 63 function devices are identified as 66 function when trim is ordered separately
 32 629
Note: FLW trim is not available in 32(629) or 32D(630)
 32D 630
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D
 BSP —
 WSP

 1-800-727-5477 • www.sargentlock.com
 29 90641
', 4499, 1, '8300 narrow design
mortise lock exit device functions & trim
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width options
 11- 83 13 f etl rhr 26d 32d 36" 8300


 sargent ansi ansi type 10 mechanical options:
 function function description & cylinder info 8300 12-
 16-
700 series et trim numbers numbers (1-3/4" door) panic & fire 19-
 23-
 exits with et trim, specify night latch *31
 lever design after the et 36-
 04 03 key retracts latch 8304 x et_ 37-
 designation (e.g., etl) #46 cylinder supplied 43-
 53-
 54-
 10 01 no outside operation (no cylinder) 8310 55-
 56-
 no outside operation (no cylinder) 56-hk-
 10 02 et control is used as pull only 8310 x et_ 58-
 59-
 bc-59-
 key outside unlocks/locks trim 76-
 13 08 #41 cylinder supplied 8313 x et_ 85-
lever designs for et controls 86-
 87-
a, b, e, f, j, l, p, w al-
also available with coastal series & 15 14 passage only (no cylinder) 8315 x et_ bt-
studio collection levers ld-
 freewheeling trim - pl-
 *** sg-
et designation with suffix 40 02 no outside operation 8340 x et_ cylinder options:
 (no cylinder) dummy trim 10-
(used to order et without device) 10-21-
8300 series: 704, 710, 713, 715, 740, 10-63-
 freewheeling trim - 11-
743, 744, 773, 774, 775 & 776 43 08 key outside unlocks/locks trim 8343 x et_ 11-21-
 #41 cylinder supplied 11-60-
freewheeling trim 11-63-
 11-64-
the lever rotates when the door is freewheeling trim - 11-70-7p-
locked preventing excessive force 44 03 8344 x et_ 11-72-7p-




 07/25
 key retracts latch
from being applied to the horizontal for 1-3/4” door #46 cylinder supplied 11-73-7p-
 11-65-73-7p-
lever 21-
electrified et trim and electrified et trim - fail safe 51-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 power off, unlocks lever, 52-
electrified mortise locks 75* key retracts latch 8375 x et_ 60-
 for 1-3/4" door #46 cylinder supplied 63-
voltage must be specified for the 64-
 following functions: 73, 74, 75 and electrified et trim - fail secure 70-
76. power off, locks lever, 72-
specify: 12vdc or 24vdc 76** key retracts latch 8376 x et_ 73-
 65-73-
 for 1-3/4" door #46 cylinder supplied 65-73-7p-
 73-7p-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 81-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 82-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices f1-82-
 * 75 function without cylinder is available as a 73 function 83-
 f1-83-
 ** 76 function without cylinder is available as a 74 function 84-
 br-
 lc-
 *sc-
pull & thumbpiece trim section trim designations series *se-
 • use three letter designations (ex “ptb”) when
 ordering the exit device with trim * options are not
 • use the six digit designation (ex “866-mal”) available with the
 when ordering trim without an exit device, following functions:
 always specify finish & hand 04, 44, 75 & 76
 ** for sc- & se- options
 contact factory for
 availability
 *** only available with
sargent ansi description & 15, 26d and 32d
 cylinder info. finishes
 function function
numbers numbers (1-3/4" door)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 8300 panic & fire
 available
 night latch-key retracts latch 8304 x trim finishes
 04 03 #41 cylinder supplied 814-fll 814-flw 814-mal 814-ptb 814-sts
 designation sargent bhma
 finishes finishes
 no o/s operation or cylinder 8310 x trim
 10 02 (pull only) 810-fll 810-flw 810-mal 810-ptb 810-sts 03 605
 designation 04 606
 09 611
 passage only 8328 x trim 10 612
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts 10b 613
 designation 613e
 10be
 key outside unlocks/locks 10bl 613l
 8363 x trim 618
 63 05 thumbpiece #41 866-fll 866-flw 866-mal 866-ptb 866-sts 14
 cylinder supplied designation 15 619
 20d 624
 26 625
note: thumbpiece trims used with mortise lock exit devices are handed
 26d 626
note: thumbpiece trims for 63 function devices are identified as 66 function when trim is ordered separately
 32 629
note: flw trim is not available in 32(629) or 32d(630)
 32d 630
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d
 bsp —
 wsp

 1-800-727-5477 • www.sargentlock.com
 29 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 30, ' MD8400 and NB-MD8400 Narrow Stile
 Concealed Vertical Rod Exit Device
 for Metal Doors
 80 Series

 MD8400 Series MD8400 & NB-MD8400 Features
 Concealed Vertical Rod Exit Device • Designed for narrow stile applications (e.g., full glass doors)
 for Metal Doors • Concealed rods for security and aesthetics
 • UL10C (Fire) and UL305 (Panic) listed
 • Specify NB- for less bottom rod
 • NB- Devices allows free access for wheelchairs and carts. No bottom strike
 eliminates tripping potential
 • All functions determined by outside trim
 Specifications for MD8400 & • Devices are ANSI/BHMA A156.3 - Grade 1
 NB-MD8400 Exit
 MD8400
 MD8600
 Door Type NB-MD8600
 Hollow Metal Doors WD8600 8400 NB-MD8400
 NB-WD8600
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick,
 specify thickness and order as 31-
 MD8400 MD8400
 12-MD8400 NB-12-MD8400
MD8600 MD8600
 NB-MD8600 NB-MD8600 8400 8400 NB-MD8400 NB-MD8400
 Cladding WD8600
 Available WD8600
 NB-WD8600
 for 1/4" on 1/2" NB-WD8600
 panels. Specify 31- and panel thickness on order.
 Only available on 1-3/4" door thickness. Must be noted separately from door
 thickness on order string.
 Stile 1-3/4" (44mm) minimum stile width required. Stile must be hollow with inside
 dimension of at least 1-3/8" (35mm) square
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths
 • F Rail for 33" to 36" door widths
 • J Rail for 37" to 42" door widths




 07/25
 • G Rail for 43" to 48" door widths
 Strike 650 Top Strike & 606 Bottom Strike (Panic and Fire Rated)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with machine screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76 mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6
 Note: MD8400 & 12-MD8400 can be used as NB- device by simply not installing the bottom rod/bolt
 Note: 12-NB applications require thermal pin. Thermal pin supplied when ordered as a 12-NB device




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux Control 650 & 652 Strike Packs 606 Bottom Strike (12-)
 
 • Available as an 06 or 1-1/8"
 1-1/16"
 (27mm)
 13 function (29mm)

 • Supplied with a
 SARGENT #41 Mortise 2-5/8"
 Cylinder 2-1/2" (67mm)
 (64mm)
 • Can be used with any 5/32"
 SARGENT Mortise Key • Stainless steel (4mm)
 System • 650 & 652 Strike Packs contain the
 same strike • Furnished with expansion shields
 • 650 Strike Pack contains 1 strike for • Mortised into floor
 Top Bolt • Stainless steel
 • 652 Strike Pack contains 2 strikes for • Bottom strike for 12-MD8400
 Top & Bottom


 90641
 30 1-800-727-5477 • www.sargentlock.com
', 3587, 1, ' md8400 and nb-md8400 narrow stile
 concealed vertical rod exit device
 for metal doors
 80 series

 md8400 series md8400 & nb-md8400 features
 concealed vertical rod exit device • designed for narrow stile applications (e.g., full glass doors)
 for metal doors • concealed rods for security and aesthetics
 • ul10c (fire) and ul305 (panic) listed
 • specify nb- for less bottom rod
 • nb- devices allows free access for wheelchairs and carts. no bottom strike
 eliminates tripping potential
 • all functions determined by outside trim
 specifications for md8400 & • devices are ansi/bhma a156.3 - grade 1
 nb-md8400 exit
 md8400
 md8600
 door type nb-md8600
 hollow metal doors wd8600 8400 nb-md8400
 nb-wd8600
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick,
 specify thickness and order as 31-
 md8400 md8400
 12-md8400 nb-12-md8400
md8600 md8600
 nb-md8600 nb-md8600 8400 8400 nb-md8400 nb-md8400
 cladding wd8600
 available wd8600
 nb-wd8600
 for 1/4" on 1/2" nb-wd8600
 panels. specify 31- and panel thickness on order.
 only available on 1-3/4" door thickness. must be noted separately from door
 thickness on order string.
 stile 1-3/4" (44mm) minimum stile width required. stile must be hollow with inside
 dimension of at least 1-3/8" (35mm) square
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths
 • f rail for 33" to 36" door widths
 • j rail for 37" to 42" door widths




 07/25
 • g rail for 43" to 48" door widths
 strike 650 top strike & 606 bottom strike (panic and fire rated)
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 dogging (#41 cylinder supplied)
 electric options al- alarm
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with machine screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 120" (3048mm) max door opening
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76 mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6
 note: md8400 & 12-md8400 can be used as nb- device by simply not installing the bottom rod/bolt
 note: 12-nb applications require thermal pin. thermal pin supplied when ordered as a 12-nb device




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux control 650 & 652 strike packs 606 bottom strike (12-)
 
 • available as an 06 or 1-1/8"
 1-1/16"
 (27mm)
 13 function (29mm)

 • supplied with a
 sargent #41 mortise 2-5/8"
 cylinder 2-1/2" (67mm)
 (64mm)
 • can be used with any 5/32"
 sargent mortise key • stainless steel (4mm)
 system • 650 & 652 strike packs contain the
 same strike • furnished with expansion shields
 • 650 strike pack contains 1 strike for • mortised into floor
 top bolt • stainless steel
 • 652 strike pack contains 2 strikes for • bottom strike for 12-md8400
 top & bottom


 90641
 30 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 31, 'MD8400 and NB-MD8400
Functions and Trims for Metal Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 55- NB-MD84 13 F ETL RHR 26D 32D 36" 84" 41"
 MD8400

 SARGENT ANSI ANSI Type 6
 Mechanical Options:
 Function Function Description & Cylinder Info 8400 12-
700 Series ET Trim
 Numbers Numbers (1-3/4" Door) Panic & Fire 16-
 Exits with ET Trim, specify 19-
 lever design after the ET Key unlocks Trim, Trim retracts latch/ 31-

 designation (e.g., ETL) 06 09 Trim relocks when key is removed MD8406 x ET_ 36-
 37-
 #41 Cylinder Supplied 43-
 53-
 54-
 10 01 No outside operation (No Cylinder)* MD8410 55-
 56-
 56-HK-
 5LH
 No outside operation (No Cylinder)*
 10 02 ET Control is used as Pull Only
 MD8410 x ET_ 58-
 59-
 BC-59-
Lever Designs for ET Controls 76-
 Key Outside Unlocks/locks Trim 85-
A, B, E, F, J, L, P, W 13 08 #41 Cylinder Supplied
 MD8413 x ET_ 86-
Also available with Coastal Series & 87-
Studio Collection Levers AL-
 BT-
 15 14 Passage Only (No cylinder) MD8415 x ET_ CPC-
ET Designation with Suffix LD-
(Used to order ET without device) NB-
 PL-
MD8400 & NB-MD8400 Series: 706- Freewheeling Trim - * SG-
4, 710-4, 713-4, 715-4, 740-4, 743-4, 40 02 No outside operation MD8440 x ET_ Cylinder Options:
746-4, 773-4, & 774-4 (No Cylinder)* Dummy Trim 10-
 10-21-
 Freewheeling Trim - 10-63-
Freewheeling Trim 43 08 Key Outside Unlocks/locks Trim MD8443 x ET_ 11-
 11-21-
The lever rotates when the door is #41 Cylinder Supplied 11-60-




 07/25
locked preventing excessive force Freewheeling Trim - 11-63-
from being applied to the horizontal 11-64-
 Key unlocks Trim, Trim retracts latch/ 11-70-7P-
lever 46 09 Trim relocks when key is removed MD8446 x ET_ 11-72-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 #41 Cylinder Supplied 11-73-7P-
 11-65-73-7P-
 Electrified ET Trim - Fail Safe 21-
 73 Power Off, Unlocks Lever (No Cylinder)* MD8473 x ET_ 51-
 52-
Electrified ET Trim Specify: 12VDC or 24VDC 60-
 63-
Voltage must be specified for the Electrified ET Trim - Fail Secure 64-
following functions: 73 and 74. 74 Power Off, Locks Lever (No Cylinder)* MD8474 x ET_ 70-
Specify: 12VDC or 24VDC Specify: 12VDC or 24VDC 72-
 73-
 65-73-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 65-73-7P-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 73-7P-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 81-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 82-
 * Cylinder Override is available with a 106 Aux Control F1-82-
 Example Order: MD8473F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h 83-
 F1-83-
 84-
 BR-
 LC-
 SARGENT ANSI SC-
 SE-
100 Series Auxiliary Control* Function Function MD8400
& 862 Pull Numbers Numbers Panic & Fire * Only available with
 15, 26D and 32D
 Key unlocks Turn, Turn retracts latch/ finishes
 06 12 Turn relocks when key is removed MD8410 x 106
 #41 Cylinder Supplied

 862 Pull Only Available
 10 02 MD8410 x 862 Pull




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 (Optional Pulls: 863 & 864) Finishes
 SARGENT BHMA
 862 Pull Finishes Finishes
 100 Series Aux. Key Outside Unlocks/locks Turn
 13 11 #41 Cylinder Supplied
 MD8410 x 113
 Control
 03 605
 04 606
 Note: When ordering MD8400 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit. 09 611
 Example: MD8410F x 106 x RHR x 32D x 42" x 90" 10 612
 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP


 1-800-727-5477 • www.sargentlock.com
 31 90641
', 3932, 1, 'md8400 and nb-md8400
functions and trims for metal doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 55- nb-md84 13 f etl rhr 26d 32d 36" 84" 41"
 md8400

 sargent ansi ansi type 6
 mechanical options:
 function function description & cylinder info 8400 12-
700 series et trim
 numbers numbers (1-3/4" door) panic & fire 16-
 exits with et trim, specify 19-
 lever design after the et key unlocks trim, trim retracts latch/ 31-

 designation (e.g., etl) 06 09 trim relocks when key is removed md8406 x et_ 36-
 37-
 #41 cylinder supplied 43-
 53-
 54-
 10 01 no outside operation (no cylinder)* md8410 55-
 56-
 56-hk-
 5lh
 no outside operation (no cylinder)*
 10 02 et control is used as pull only
 md8410 x et_ 58-
 59-
 bc-59-
lever designs for et controls 76-
 key outside unlocks/locks trim 85-
a, b, e, f, j, l, p, w 13 08 #41 cylinder supplied
 md8413 x et_ 86-
also available with coastal series & 87-
studio collection levers al-
 bt-
 15 14 passage only (no cylinder) md8415 x et_ cpc-
et designation with suffix ld-
(used to order et without device) nb-
 pl-
md8400 & nb-md8400 series: 706- freewheeling trim - * sg-
4, 710-4, 713-4, 715-4, 740-4, 743-4, 40 02 no outside operation md8440 x et_ cylinder options:
746-4, 773-4, & 774-4 (no cylinder)* dummy trim 10-
 10-21-
 freewheeling trim - 10-63-
freewheeling trim 43 08 key outside unlocks/locks trim md8443 x et_ 11-
 11-21-
the lever rotates when the door is #41 cylinder supplied 11-60-




 07/25
locked preventing excessive force freewheeling trim - 11-63-
from being applied to the horizontal 11-64-
 key unlocks trim, trim retracts latch/ 11-70-7p-
lever 46 09 trim relocks when key is removed md8446 x et_ 11-72-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 #41 cylinder supplied 11-73-7p-
 11-65-73-7p-
 electrified et trim - fail safe 21-
 73 power off, unlocks lever (no cylinder)* md8473 x et_ 51-
 52-
electrified et trim specify: 12vdc or 24vdc 60-
 63-
voltage must be specified for the electrified et trim - fail secure 64-
following functions: 73 and 74. 74 power off, locks lever (no cylinder)* md8474 x et_ 70-
specify: 12vdc or 24vdc specify: 12vdc or 24vdc 72-
 73-
 65-73-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 65-73-7p-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 73-7p-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 81-
 note: aff means above finished floor, center line of rail above finished floor 82-
 * cylinder override is available with a 106 aux control f1-82-
 example order: md8473f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h 83-
 f1-83-
 84-
 br-
 lc-
 sargent ansi sc-
 se-
100 series auxiliary control* function function md8400
& 862 pull numbers numbers panic & fire * only available with
 15, 26d and 32d
 key unlocks turn, turn retracts latch/ finishes
 06 12 turn relocks when key is removed md8410 x 106
 #41 cylinder supplied

 862 pull only available
 10 02 md8410 x 862 pull




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 (optional pulls: 863 & 864) finishes
 sargent bhma
 862 pull finishes finishes
 100 series aux. key outside unlocks/locks turn
 13 11 #41 cylinder supplied
 md8410 x 113
 control
 03 605
 04 606
 note: when ordering md8400 series exit device x 100 series aux. control, specify 10 function for the exit. 09 611
 example: md8410f x 106 x rhr x 32d x 42" x 90" 10 612
 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp


 1-800-727-5477 • www.sargentlock.com
 31 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 32, ' AD8400 and NB-AD8400 Narrow Stile
 Concealed Vertical Rod Exit Device
 for Aluminum Doors
 80 Series

 AD8400 Series AD8400 & NB-AD8400 Features
 • Designed for narrow stile aluminum door applications (e.g., full glass doors)
 Concealed Vertical Rod Exit Device
 • Concealed rods for security and aesthetics
 for Aluminum Doors
 • UL305 (Panic) listed
 • Specify NB- for less bottom rod
 • NB- device allows free access for wheelchairs and carts. No bottom strike
 eliminates tripping potential
 • All functions determined by outside trim
 • Devices are ANSI/BHMA A156.3 - Grade 1
 Specifications for AD8400 & NB-AD8400 Exit
 MD8400
 8400 NB-MD8400
 DoorMD8600
 Type NB-MD8600 WD8600 doors
 Hollow or extruded aluminum NB-WD8600
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick,
 specify thickness and order as 31-
 Cladding Available for 1/4" on 1/2" panels. Specify 31- MD8400
 and panel thickness MD8400
 AD8400 NB-AD8400
MD8600 MD8600
 NB-MD8600 NB-MD8600
 WD8600 WD8600
 NB-WD8600 8400
 NB-WD8600 8400 on order. NB-MD8400 NB-MD8400
 Only available on 1-3/4" door thickness. Must be noted separately from door
 thickness on order string.
 Stile 1-3/4" (44mm) minimum stile width required. Stile must be hollow with inside
 dimension of at least 1-3/8" (35mm) square
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths
 • F Rail for 33" to 36" door widths
 • J Rail for 37" to 42" door widths
 • G Rail for 43" to 48" door widths




 07/25
 Strike 640 Strike for Top & Bottom
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 53- LX Latchbolt Monitor
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with machine screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware Not Available
 Note: AD8400 can be used as NB- Device by simply not installing the bottom rod/bolt




 100 Series Aux Control 639/640 Strike Kits




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • Available as an 06 or • Steel with Black Nylon Coating
 13 function • Machine Screws Supplied .25"
 6.35mm
 2" .25in
 (6.35mm)
 • Supplied with a • 640 Kit contains 2 strikes 50.80mm
 (50.80mm)
 2.00in
 SARGENT #41 Mortise (Top & Bottom)
 Cylinder
 • 639 Kit contains 1 strike
 • Can be used with any (Top Only)
 SARGENT Mortise Key
 System Ø1.21"
 (30.73mm)
 30.73mm
 1.21in




 90641
 32 1-800-727-5477 • www.sargentlock.com
', 3311, 1, ' ad8400 and nb-ad8400 narrow stile
 concealed vertical rod exit device
 for aluminum doors
 80 series

 ad8400 series ad8400 & nb-ad8400 features
 • designed for narrow stile aluminum door applications (e.g., full glass doors)
 concealed vertical rod exit device
 • concealed rods for security and aesthetics
 for aluminum doors
 • ul305 (panic) listed
 • specify nb- for less bottom rod
 • nb- device allows free access for wheelchairs and carts. no bottom strike
 eliminates tripping potential
 • all functions determined by outside trim
 • devices are ansi/bhma a156.3 - grade 1
 specifications for ad8400 & nb-ad8400 exit
 md8400
 8400 nb-md8400
 doormd8600
 type nb-md8600 wd8600 doors
 hollow or extruded aluminum nb-wd8600
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick,
 specify thickness and order as 31-
 cladding available for 1/4" on 1/2" panels. specify 31- md8400
 and panel thickness md8400
 ad8400 nb-ad8400
md8600 md8600
 nb-md8600 nb-md8600
 wd8600 wd8600
 nb-wd8600 8400
 nb-wd8600 8400 on order. nb-md8400 nb-md8400
 only available on 1-3/4" door thickness. must be noted separately from door
 thickness on order string.
 stile 1-3/4" (44mm) minimum stile width required. stile must be hollow with inside
 dimension of at least 1-3/8" (35mm) square
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths
 • f rail for 33" to 36" door widths
 • j rail for 37" to 42" door widths
 • g rail for 43" to 48" door widths




 07/25
 strike 640 strike for top & bottom
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 dogging (#41 cylinder supplied)
 electric options al- alarm
 53- lx latchbolt monitor
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with machine screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 120" (3048mm) max door opening
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware not available
 note: ad8400 can be used as nb- device by simply not installing the bottom rod/bolt




 100 series aux control 639/640 strike kits




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • available as an 06 or • steel with black nylon coating
 13 function • machine screws supplied .25"
 6.35mm
 2" .25in
 (6.35mm)
 • supplied with a • 640 kit contains 2 strikes 50.80mm
 (50.80mm)
 2.00in
 sargent #41 mortise (top & bottom)
 cylinder
 • 639 kit contains 1 strike
 • can be used with any (top only)
 sargent mortise key
 system ø1.21"
 (30.73mm)
 30.73mm
 1.21in




 90641
 32 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 33, 'AD8400 and NB-AD8400
Functions and Trims
for Aluminum Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 55- AD84 13 F ETL RHR 26D 32D 36" 84" 41"
 AD8400

 SARGENT ANSI ANSI Type 6
 Mechanical Options:
 Function Function Description & Cylinder Info AD8400
700 Series ET Trim 16-
 Numbers Numbers (1-3/4" Door) Panic 19-
 Exits with ET Trim, specify 31-
 lever design after the ET Key unlocks Trim, Trim retracts latch/ 36-
 designation (e.g., ETL) 06 09 Trim relocks when key is removed AD8406 x ET_ 37-
 43-
 #41 Cylinder Supplied 53-
 54-
 55-
 10 01 No outside operation (No Cylinder)* AD8410 56-
 56-HK-
 5LH
 58-
 No outside operation (No Cylinder)* 59-
 10 02 ET Control is used as Pull Only
 AD8410 x ET_ BC-59-
 76-
Lever Designs for ET Controls 85-
 Key Outside Unlocks/locks Trim 86-
A, B, E, F, J, L, P, W 13 08 #41 Cylinder Supplied
 AD8413 x ET_ 87-
Also available with Coastal Series & AL-
 BT-
Studio Collection Levers
 CPC-
 LD-
 15 14 Passage Only (No cylinder) AD8415 x ET_ NB-
ET Designation with Suffix PL-
(Used to order ET without device) * SG-
 Freewheeling Trim - Cylinder Options:
8400 & NB-8400 Series: 706-4, 710- 40 02 No outside operation AD8440 x ET_ 10-
4, 713-4, 715-4, 740-4, 743-4, 746-4, (No Cylinder)* Dummy Trim 10-21-
773-4, & 774-4 10-63-
 Freewheeling Trim - 11-
 11-21-
Freewheeling Trim 43 08 Key Outside Unlocks/locks Trim AD8443 x ET_ 11-60-
 #41 Cylinder Supplied 11-63-




 07/25
The lever rotates when the door is 11-64-
locked preventing excessive force
 Freewheeling Trim - 11-70-7P-
 Key unlocks Trim, Trim retracts latch/ 11-72-7P-
from being applied to the horizontal 46 09 Trim relocks when key is removed AD8446 x ET_ 11-73-7P-
lever 11-65-73-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 #41 Cylinder Supplied 21-
 Electrified ET Trim - Fail Safe 51-
 52-
Electrified ET Trim 73 Power Off, Unlocks Lever (No Cylinder)* AD8473 x ET_ 60-
 Specify: 12VDC or 24VDC 63-
Voltage must be specified for the 64-
following functions: 73 and 74. Electrified ET Trim - Fail Secure 70-
 74 Power Off, Locks Lever (No Cylinder)* AD8474 x ET_ 72-
Specify: 12VDC or 24VDC 73-
 Specify: 12VDC or 24VDC 65-73-
 65-73-7P-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 73-7P-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 81-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices. 82-
 F1-82-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor
 83-
 * Cylinder Override is available with a 106 Aux Control F1-83-
 Example Order: AD8473F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h 84-
 BR-
 LC-
 SC-
 SE-
 SARGENT ANSI
100 Series Auxiliary Control* Function Function AD8400 * Only available with
 15, 26D and 32D
& 862 Pull Numbers Numbers Panic finishes
 Key unlocks Turn, Turn retracts latch/
 06 12 Turn relocks when key is removed AD8410 x 106
 #41 Cylinder Supplied Available
 Finishes
 862 Pull Only
 10 02 AD8410 x 862 Pull




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT BHMA
 (Optional Pulls: 863 & 864) Finishes Finishes

 100 Series Aux. 862 Pull Key Outside Unlocks/locks Turn 03 605
 Control 13 11 #41 Cylinder Supplied
 AD8410 x 113 04 606
 09 611
 10 612
 Note: When ordering 8400 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit.
 Example: AD8410F x 106 x RHR x 32D x 42" x 90" 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP


 1-800-727-5477 • www.sargentlock.com
 33 90641
', 3909, 1, 'ad8400 and nb-ad8400
functions and trims
for aluminum doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 55- ad84 13 f etl rhr 26d 32d 36" 84" 41"
 ad8400

 sargent ansi ansi type 6
 mechanical options:
 function function description & cylinder info ad8400
700 series et trim 16-
 numbers numbers (1-3/4" door) panic 19-
 exits with et trim, specify 31-
 lever design after the et key unlocks trim, trim retracts latch/ 36-
 designation (e.g., etl) 06 09 trim relocks when key is removed ad8406 x et_ 37-
 43-
 #41 cylinder supplied 53-
 54-
 55-
 10 01 no outside operation (no cylinder)* ad8410 56-
 56-hk-
 5lh
 58-
 no outside operation (no cylinder)* 59-
 10 02 et control is used as pull only
 ad8410 x et_ bc-59-
 76-
lever designs for et controls 85-
 key outside unlocks/locks trim 86-
a, b, e, f, j, l, p, w 13 08 #41 cylinder supplied
 ad8413 x et_ 87-
also available with coastal series & al-
 bt-
studio collection levers
 cpc-
 ld-
 15 14 passage only (no cylinder) ad8415 x et_ nb-
et designation with suffix pl-
(used to order et without device) * sg-
 freewheeling trim - cylinder options:
8400 & nb-8400 series: 706-4, 710- 40 02 no outside operation ad8440 x et_ 10-
4, 713-4, 715-4, 740-4, 743-4, 746-4, (no cylinder)* dummy trim 10-21-
773-4, & 774-4 10-63-
 freewheeling trim - 11-
 11-21-
freewheeling trim 43 08 key outside unlocks/locks trim ad8443 x et_ 11-60-
 #41 cylinder supplied 11-63-




 07/25
the lever rotates when the door is 11-64-
locked preventing excessive force
 freewheeling trim - 11-70-7p-
 key unlocks trim, trim retracts latch/ 11-72-7p-
from being applied to the horizontal 46 09 trim relocks when key is removed ad8446 x et_ 11-73-7p-
lever 11-65-73-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 #41 cylinder supplied 21-
 electrified et trim - fail safe 51-
 52-
electrified et trim 73 power off, unlocks lever (no cylinder)* ad8473 x et_ 60-
 specify: 12vdc or 24vdc 63-
voltage must be specified for the 64-
following functions: 73 and 74. electrified et trim - fail secure 70-
 74 power off, locks lever (no cylinder)* ad8474 x et_ 72-
specify: 12vdc or 24vdc 73-
 specify: 12vdc or 24vdc 65-73-
 65-73-7p-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 73-7p-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 81-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices. 82-
 f1-82-
 note: aff means above finished floor, center line of rail above finished floor
 83-
 * cylinder override is available with a 106 aux control f1-83-
 example order: ad8473f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h 84-
 br-
 lc-
 sc-
 se-
 sargent ansi
100 series auxiliary control* function function ad8400 * only available with
 15, 26d and 32d
& 862 pull numbers numbers panic finishes
 key unlocks turn, turn retracts latch/
 06 12 turn relocks when key is removed ad8410 x 106
 #41 cylinder supplied available
 finishes
 862 pull only
 10 02 ad8410 x 862 pull




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent bhma
 (optional pulls: 863 & 864) finishes finishes

 100 series aux. 862 pull key outside unlocks/locks turn 03 605
 control 13 11 #41 cylinder supplied
 ad8410 x 113 04 606
 09 611
 10 612
 note: when ordering 8400 series exit device x 100 series aux. control, specify 10 function for the exit.
 example: ad8410f x 106 x rhr x 32d x 42" x 90" 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp


 1-800-727-5477 • www.sargentlock.com
 33 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 34, ' LP8600 & LR8600 Low Profile Center &
 Top Latch Concealed Vertical Rods for
 Pair of Doors & Double Egress
 80 Series


 LP8600 & LR8600 Series Features
 • The security of a stainless steel center bolt,
 two concealed top bolts and a low profile
 device for pairs of doors without bottom
 rod issues
 • Devices are ANSI/BHMA A156.3 - Grade 1

 LP8600 Shown • UL10C (Fire) and UL305 (Panic) listed
 • 1-1/2" total projection from face of door
 • Center and top latching
 • No visible active chassis
 Specifications • Center latchbolt adjustable for up to 3/8"
 (9mm) door gap
 Door Type Factory prepped metal doors for LP & LR devices
 • Both doors are active. Either door can
 Door Thickness 1-3/4" (44mm) doors only with 2-3/4" (70mm) backset
 be opened or closed without affecting
 Stile 4-1/2" (114mm) minimum stile the other door. Open back strikes are not
 Rail sizes as Rails are available in 3 sizes, use door width to determine required
 determined by size needed. • Top case latchbolt projection adjustable
 door width • L Rail for 36" door width no cutting required through top case
 • M Rail for 42" to 44" door width no cutting required
 • Tripping potential removed - no bottom
 • N Rail - 46" to 48" door width no cutting required
 strike
 Strike 650 Top Strike (Panic and Fire Rated)
 • All functions determined by outside trim
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- (ET Trim only)




 07/25
 for cylinder dogging (#41 cylinder supplied)
 • Concealed rods for security and aesthetics
 Electric Options AL- Alarm
 54- Outside Lever Monitoring LP8610 Side View




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 Mounting Fasteners Supplied standard with machine screws
 Top & Center Bolts Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 1-1/2" (38mm)
 Pushbar Depressed – 5/8" (15mm)
 Fire Exit Hardware See Chart – Page 6
 How it works: The mortise lock of the LP device has a stainless steel bolt which projects into the mortise lock
 of the LR device at the center of the door in addition to top bolts in each door.

 Double Egress Application
 Left Hand
 Pair of Doors Notes: Reverse Bevel
 1. Available for 1-3/4" (44mm) thick doors




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 only. No glass bead shim kits or inside panel Left Hand
 condition permitted. Reverse Bevel
 2. LS/LP/LR8600 are available in the following
 door sizes only: 36", 42", 44", 46" or 48"
 (914mm, 1067mm, 1118mm, 1168mm
 or 1219mm)




 Note: The following hollow metal door manufacturers are equipped to reinforce and prepare
 their steel doors for the LS/LP/LR8600 Series Low Profile exit devices: CECO, CURRIES and
 FLEMING. Please check with any other hollow metal door manufacturers regarding their ability
 to properly reinforce and prepare their doors for these exit devices



90641
 34 1-800-727-5477 • www.sargentlock.com
', 3354, 1, ' lp8600 & lr8600 low profile center &
 top latch concealed vertical rods for
 pair of doors & double egress
 80 series


 lp8600 & lr8600 series features
 • the security of a stainless steel center bolt,
 two concealed top bolts and a low profile
 device for pairs of doors without bottom
 rod issues
 • devices are ansi/bhma a156.3 - grade 1

 lp8600 shown • ul10c (fire) and ul305 (panic) listed
 • 1-1/2" total projection from face of door
 • center and top latching
 • no visible active chassis
 specifications • center latchbolt adjustable for up to 3/8"
 (9mm) door gap
 door type factory prepped metal doors for lp & lr devices
 • both doors are active. either door can
 door thickness 1-3/4" (44mm) doors only with 2-3/4" (70mm) backset
 be opened or closed without affecting
 stile 4-1/2" (114mm) minimum stile the other door. open back strikes are not
 rail sizes as rails are available in 3 sizes, use door width to determine required
 determined by size needed. • top case latchbolt projection adjustable
 door width • l rail for 36" door width no cutting required through top case
 • m rail for 42" to 44" door width no cutting required
 • tripping potential removed - no bottom
 • n rail - 46" to 48" door width no cutting required
 strike
 strike 650 top strike (panic and fire rated)
 • all functions determined by outside trim
 dogging feature hex key dogging standard on non fired rated devices; specify 16- (et trim only)




 07/25
 for cylinder dogging (#41 cylinder supplied)
 • concealed rods for security and aesthetics
 electric options al- alarm
 54- outside lever monitoring lp8610 side view




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 mounting fasteners supplied standard with machine screws
 top & center bolts stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor
 door/opening height must be specified - 120" (3048mm) max door opening
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 1-1/2" (38mm)
 pushbar depressed – 5/8" (15mm)
 fire exit hardware see chart – page 6
 how it works: the mortise lock of the lp device has a stainless steel bolt which projects into the mortise lock
 of the lr device at the center of the door in addition to top bolts in each door.

 double egress application
 left hand
 pair of doors notes: reverse bevel
 1. available for 1-3/4" (44mm) thick doors




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 only. no glass bead shim kits or inside panel left hand
 condition permitted. reverse bevel
 2. ls/lp/lr8600 are available in the following
 door sizes only: 36", 42", 44", 46" or 48"
 (914mm, 1067mm, 1118mm, 1168mm
 or 1219mm)




 note: the following hollow metal door manufacturers are equipped to reinforce and prepare
 their steel doors for the ls/lp/lr8600 series low profile exit devices: ceco, curries and
 fleming. please check with any other hollow metal door manufacturers regarding their ability
 to properly reinforce and prepare their doors for these exit devices



90641
 34 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 35, 'LP & LR8600 Functions & Trims for
Pairs of Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 55- LP86 13 F ETL RHR 14 32 36" 84" 41"
 LP & LR8600

700 Series ET Trim SARGENT ANSI ANSI Type 2
 Mechanical Options:
 Function Function Description & Cylinder Info LP8600 LR8600
 Exits with ET Trim, specify 12-
 lever design after the ET Numbers Numbers (1-3/4" Door) Panic & Fire Panic & Fire 16-
 designation (e.g., ETL) 19-
 Key unlocks Trim, Trim retracts latch/ 36-
 06 09 Trim relocks when key is removed LP8606 x ET_ LR8606 x ET_ 37-
 #41 Cylinder Supplied 54-
 55-
 56-
 10 01 No outside operation (No Cylinder) LP8610 LR8610 56-HK-
 58-
 76-
 No outside operation (No Cylinder) 85-
Lever Designs for ET Controls 10 02 ET Control is used as Pull Only
 LP8610 x ET_ LR8610 x ET_ 86-
 87-
A, B, E, F, J, L, P, W AL-
Also available with Coastal Series & BT-
 Key Outside Unlocks/locks Trim
Studio Collection Levers 13 08 #41 Cylinder Supplied
 LP8613 x ET_ LR8613 x ET_ CPC-
 LD-
 PL-
ET Designation with Suffix * SG-
(Used to order ET without device) 15 14 Passage Only (No cylinder) LP8615 x ET_ LR8615 x ET_ Cylinder Options:
 10-
LP8600 & LR8600 Series: 706-6,
 10-21-
710-6, 10-63-
 Freewheeling Trim -
713-6, 715-6, 740-6, 743-6, 746-6, 11-
773-6 & 774-6 40 02 No outside operation LP8640 x ET_ LR8640 x ET_
 (No Cylinder) Dummy Trim 11-21-
 11-60-
Freewheeling Trim 11-63-
 Freewheeling Trim -
The lever rotates when the door is 11-64-
 43 08 Key Outside Unlocks/locks Trim LP8643 x ET_ LR8643 x ET_ 11-70-7P-
locked preventing excessive force #41 Cylinder Supplied
 11-72-7P-




 07/25
from being applied to the horizontal 11-73-7P-
lever Freewheeling Trim -
 Key unlocks Trim, Trim retracts latch/ 11-65-73-7P-
 46 09 Trim relocks when key is removed
 LP8646 x ET_ LR8646 x ET_ 21-
Electrified ET Trim 51-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 #41 Cylinder Supplied
 52-
Voltage must be specified for the 60-
following functions: 73 and 74. Electrified ET Trim - Fail Safe 63-
Specify: 12VDC or 24VDC
 73 Power Off, Unlocks Lever (No Cylinder)*
 LP8673 x ET_ LR8673 x ET_ 64-
 70-
 72-
Note: LP & LR Exit devices should be
 Electrified ET Trim - Fail Secure 73-
ordered in pairs, for correct operation; 74 Power Off, Locks Lever (No Cylinder)*
 LP8674 x ET_ LR8674 x ET_ 65-73-
one device engages the other. For 65-73-7P-
single door applications, order LS 73-7P-
Device Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 81-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 82-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices F1-82-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 83-
 * Cylinder override is not available with LP & LR 8600 Series Devices F1-83-
 84-
 BR-
 68-1183 Double Lipped LC-
 SC-
 LR Mortise Front 650 Top Strike SE-


 1-1/8" * Only available with
 (29mm) 15, 26D and 32D
 finishes

 3-3/8" 2-1/2"
 (86mm) (64mm)
 Available




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • For application in metal
 Finishes
 8"
 (203mm) frames SARGENT
 Finishes
 BHMA
 Finishes
 • Stainless steel
 03 605
 1-1/4" 04 606
 (32mm) 09 611
 10 612
 10B 613
 • Standard for LR8600 10BE 613E
 • Stainless steel only 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP


 1-800-727-5477 • www.sargentlock.com
 35 90641
', 3760, 1, 'lp & lr8600 functions & trims for
pairs of doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 55- lp86 13 f etl rhr 14 32 36" 84" 41"
 lp & lr8600

700 series et trim sargent ansi ansi type 2
 mechanical options:
 function function description & cylinder info lp8600 lr8600
 exits with et trim, specify 12-
 lever design after the et numbers numbers (1-3/4" door) panic & fire panic & fire 16-
 designation (e.g., etl) 19-
 key unlocks trim, trim retracts latch/ 36-
 06 09 trim relocks when key is removed lp8606 x et_ lr8606 x et_ 37-
 #41 cylinder supplied 54-
 55-
 56-
 10 01 no outside operation (no cylinder) lp8610 lr8610 56-hk-
 58-
 76-
 no outside operation (no cylinder) 85-
lever designs for et controls 10 02 et control is used as pull only
 lp8610 x et_ lr8610 x et_ 86-
 87-
a, b, e, f, j, l, p, w al-
also available with coastal series & bt-
 key outside unlocks/locks trim
studio collection levers 13 08 #41 cylinder supplied
 lp8613 x et_ lr8613 x et_ cpc-
 ld-
 pl-
et designation with suffix * sg-
(used to order et without device) 15 14 passage only (no cylinder) lp8615 x et_ lr8615 x et_ cylinder options:
 10-
lp8600 & lr8600 series: 706-6,
 10-21-
710-6, 10-63-
 freewheeling trim -
713-6, 715-6, 740-6, 743-6, 746-6, 11-
773-6 & 774-6 40 02 no outside operation lp8640 x et_ lr8640 x et_
 (no cylinder) dummy trim 11-21-
 11-60-
freewheeling trim 11-63-
 freewheeling trim -
the lever rotates when the door is 11-64-
 43 08 key outside unlocks/locks trim lp8643 x et_ lr8643 x et_ 11-70-7p-
locked preventing excessive force #41 cylinder supplied
 11-72-7p-




 07/25
from being applied to the horizontal 11-73-7p-
lever freewheeling trim -
 key unlocks trim, trim retracts latch/ 11-65-73-7p-
 46 09 trim relocks when key is removed
 lp8646 x et_ lr8646 x et_ 21-
electrified et trim 51-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 #41 cylinder supplied
 52-
voltage must be specified for the 60-
following functions: 73 and 74. electrified et trim - fail safe 63-
specify: 12vdc or 24vdc
 73 power off, unlocks lever (no cylinder)*
 lp8673 x et_ lr8673 x et_ 64-
 70-
 72-
note: lp & lr exit devices should be
 electrified et trim - fail secure 73-
ordered in pairs, for correct operation; 74 power off, locks lever (no cylinder)*
 lp8674 x et_ lr8674 x et_ 65-73-
one device engages the other. for 65-73-7p-
single door applications, order ls 73-7p-
device note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 81-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 82-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices f1-82-
 note: aff means above finished floor, center line of rail above finished floor 83-
 * cylinder override is not available with lp & lr 8600 series devices f1-83-
 84-
 br-
 68-1183 double lipped lc-
 sc-
 lr mortise front 650 top strike se-


 1-1/8" * only available with
 (29mm) 15, 26d and 32d
 finishes

 3-3/8" 2-1/2"
 (86mm) (64mm)
 available




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • for application in metal
 finishes
 8"
 (203mm) frames sargent
 finishes
 bhma
 finishes
 • stainless steel
 03 605
 1-1/4" 04 606
 (32mm) 09 611
 10 612
 10b 613
 • standard for lr8600 10be 613e
 • stainless steel only 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp


 1-800-727-5477 • www.sargentlock.com
 35 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 36, ' LS8600 Low Profile Center &
 Top Latch Concealed Vertical Rod
 for Single Door Applications
 80 Series


 Features
 • The security of a stainless steel center bolt,
 concealed top bolt and a low profile device
 LS8600 Series for single doors without bottom rod issues
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) listed
 • 1-1/2" total projection from face of door
 • Center and top latching
 • No visible active chassis
 • Center latchbolt adjustable for up to 3/8"
 (9mm) door gap
 • Top case latchbolt projection adjustable
 through top case
 • Tripping potential removed - no bottom strike

 Specifications for LS8600 Series Exit • All functions determined by outside trim
 (ET Trim only)
 Door Type Factory prepped metal doors for LP & LR devices • Concealed rods for security and aesthetics
 Door Thickness 1-3/4" (44mm) doors only with 2-3/4" (70mm) backset
 Stile 4-1/2" (114mm) minimum stile width LS8610 Side View
 Rail sizes as Rails are available in 3 sizes, use door width to determine size
 determined needed.




 07/25
 by door width • L Rail for 36" door width no cutting required
 • M Rail for 42" to 44" door width no cutting required
 • N Rail - 46" to 48" door width no cutting required




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Strike 650 Top Strike & C7710 Mortise Strike (Panic and Fire Rated)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify
 16- for cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 Mounting Fasteners Supplied standard with machine screws
 Top & Center Bolts Stainless steel
 Device Centerline from Notes:
 41" (1041 mm) for Standard Applications
 Finished Floor 1. Available for 1-3/4" (44mm) thick doors
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening only. No glass bead shim kits or inside
 panel condition permitted.
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 2. LS/LP/LR8600 are available in the 
 Projection Pushbar Neutral – 1-1/2" (38mm) following door sizes only: 36", 42", 44",
 Pushbar Depressed – 5/8" (15mm) 46" or 48" (914mm, 1067mm,
 Fire Exit Hardware See Chart – Page 6 1118mm, 1168mm or 1219mm)

 How it works: The mortise lock of the LS device has a stainless steel bolt which projects into the




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 door frame at the center of the door with the additional security of a concealed top bolt.

 Note: The following hollow metal door manufacturers are equipped to reinforce and prepare
 their steel doors for the LS/LP/LR8600 Series Low Profile exit devices: CECO, CURRIES and
 FLEMING. Please check with any other hollow metal door manufacturers regarding their
 ability to properly reinforce and prepare their doors for these exit devices




90641
 36 1-800-727-5477 • www.sargentlock.com
', 3135, 1, ' ls8600 low profile center &
 top latch concealed vertical rod
 for single door applications
 80 series


 features
 • the security of a stainless steel center bolt,
 concealed top bolt and a low profile device
 ls8600 series for single doors without bottom rod issues
 • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed
 • 1-1/2" total projection from face of door
 • center and top latching
 • no visible active chassis
 • center latchbolt adjustable for up to 3/8"
 (9mm) door gap
 • top case latchbolt projection adjustable
 through top case
 • tripping potential removed - no bottom strike

 specifications for ls8600 series exit • all functions determined by outside trim
 (et trim only)
 door type factory prepped metal doors for lp & lr devices • concealed rods for security and aesthetics
 door thickness 1-3/4" (44mm) doors only with 2-3/4" (70mm) backset
 stile 4-1/2" (114mm) minimum stile width ls8610 side view
 rail sizes as rails are available in 3 sizes, use door width to determine size
 determined needed.




 07/25
 by door width • l rail for 36" door width no cutting required
 • m rail for 42" to 44" door width no cutting required
 • n rail - 46" to 48" door width no cutting required




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 strike 650 top strike & c7710 mortise strike (panic and fire rated)
 dogging feature hex key dogging standard on non fired rated devices; specify
 16- for cylinder dogging (#41 cylinder supplied)
 electric options al- alarm
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 mounting fasteners supplied standard with machine screws
 top & center bolts stainless steel
 device centerline from notes:
 41" (1041 mm) for standard applications
 finished floor 1. available for 1-3/4" (44mm) thick doors
 door/opening height must be specified - 120" (3048mm) max door opening only. no glass bead shim kits or inside
 panel condition permitted.
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 2. ls/lp/lr8600 are available in the 
 projection pushbar neutral – 1-1/2" (38mm) following door sizes only: 36", 42", 44",
 pushbar depressed – 5/8" (15mm) 46" or 48" (914mm, 1067mm,
 fire exit hardware see chart – page 6 1118mm, 1168mm or 1219mm)

 how it works: the mortise lock of the ls device has a stainless steel bolt which projects into the




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 door frame at the center of the door with the additional security of a concealed top bolt.

 note: the following hollow metal door manufacturers are equipped to reinforce and prepare
 their steel doors for the ls/lp/lr8600 series low profile exit devices: ceco, curries and
 fleming. please check with any other hollow metal door manufacturers regarding their
 ability to properly reinforce and prepare their doors for these exit devices




90641
 36 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 37, 'LS8600 Functions and Trims
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 55- LP86 13 F ETL RHR 26D 32D 36" 84" 41"
 LS8600

700 Series ET Trim SARGENT ANSI ANSI Type 12
 Mechanical Options:
 Function Function Description & Cylinder Info LS8600 12-
 Exits with ET Trim, specify
 lever design after the ET Numbers Numbers (1-3/4" Door) Panic & Fire 16-
 19-
 designation (e.g., ETL) 36-
 Key unlocks Trim, Trim retracts latch/
 37-
 06 09 Trim relocks when key is removed LS8606 x ET_ 54-
 #41 Cylinder Required & Supplied 55-
 56-
 56-HK-
 58-
 10 01 No outside operation (No Cylinder) LS8610 76-
 85-
 86-
 87-
Lever Designs for ET Controls AL-
 No outside operation (No Cylinder) BT-
A, B, E, F, J, L, P, W 10 02 ET Control is used as Pull Only
 LS8610 x ET_
 CPC-
Also available with Coastal Series &
 LD-
Studio Collection Levers
 PL-
 * SG-
ET Designation with Suffix Key Outside Unlocks/locks Trim Cylinder Options:
(Used to order ET without device) 13 08 #41 Cylinder Required & Supplied
 LS8613 x ET_ 10-
 10-21-
LS8600 Series: 706-6, 710-6, 713-6, 10-63-
715-6, 740-6, 743-6, 746-6, 773-6 11-
& 774-6 11-21-
 15 14 Passage Only (No cylinder) LS8615 x ET_ 11-60-
 11-63-
Freewheeling Trim 11-64-
The lever rotates when the door is 11-70-7P-
 Freewheeling Trim - 11-72-7P-
locked preventing excessive force
 11-73-7P-
 40 02 LS8640 x ET_




 07/25
from being applied to the horizontal No outside operation
 11-65-73-7P-
lever (No Cylinder) Dummy Trim
 21-
 51-
 52-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Freewheeling Trim - 60-
Electrified ET Trim 43 08 Key Outside Unlocks/locks Trim LS8643 x ET_ 63-
Voltage must be specified for the #41 Cylinder Supplied 64-
following functions: 73 and 74. 70-
 72-
Specify: 12VDC or 24VDC Freewheeling Trim - 73-
 Key unlocks Trim, Trim retracts latch/
 46 09 Trim relocks when key is removed
 LS8646 x ET_ 65-73-
 65-73-7P-
 #41 Cylinder Required & Supplied 73-7P-
 81-
 82-
 Electrified ET Trim - Fail Safe F1-82-
 73 Power Off, Unlocks Lever (No Cylinder)*
 LS8673 x ET_ 83-
 F1-83-
 84-
 BR-
 Electrified ET Trim - Fail Secure LC-
 74 Power Off, Locks Lever (No Cylinder)* LS8674 x ET_ SC-
 SE-

 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel * Only available with
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 15, 26D and 32D
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor finishes
 * Cylinder override is not available with LP 8700 Series Devices


 C7710 Mortise Centercase 650 Top Strike
 Strike Available
 1-1/4"
 (32mm) Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 1-1/8"
 (29mm) SARGENT BHMA
 Finishes Finishes

 03 605
 2-1/2"
 (64mm) 04 606
 09 611
 4-7/8" 10 612
 3-3/8" (124mm)
 (86mm) • For application in metal 10B 613
 frames 10BE 613E
 10BL 613L
 • Stainless steel 14 618
 • Top strike for Panic & Fire 15 619
 20D 624
 Rated
 26 625
 • Standard for LS8600 26D 626
 • Handed 32 629
 32D 630
 • Stainless steel only BSP —
 WSP

 1-800-727-5477 • www.sargentlock.com
 37 90641
', 3503, 1, 'ls8600 functions and trims
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 55- lp86 13 f etl rhr 26d 32d 36" 84" 41"
 ls8600

700 series et trim sargent ansi ansi type 12
 mechanical options:
 function function description & cylinder info ls8600 12-
 exits with et trim, specify
 lever design after the et numbers numbers (1-3/4" door) panic & fire 16-
 19-
 designation (e.g., etl) 36-
 key unlocks trim, trim retracts latch/
 37-
 06 09 trim relocks when key is removed ls8606 x et_ 54-
 #41 cylinder required & supplied 55-
 56-
 56-hk-
 58-
 10 01 no outside operation (no cylinder) ls8610 76-
 85-
 86-
 87-
lever designs for et controls al-
 no outside operation (no cylinder) bt-
a, b, e, f, j, l, p, w 10 02 et control is used as pull only
 ls8610 x et_
 cpc-
also available with coastal series &
 ld-
studio collection levers
 pl-
 * sg-
et designation with suffix key outside unlocks/locks trim cylinder options:
(used to order et without device) 13 08 #41 cylinder required & supplied
 ls8613 x et_ 10-
 10-21-
ls8600 series: 706-6, 710-6, 713-6, 10-63-
715-6, 740-6, 743-6, 746-6, 773-6 11-
& 774-6 11-21-
 15 14 passage only (no cylinder) ls8615 x et_ 11-60-
 11-63-
freewheeling trim 11-64-
the lever rotates when the door is 11-70-7p-
 freewheeling trim - 11-72-7p-
locked preventing excessive force
 11-73-7p-
 40 02 ls8640 x et_




 07/25
from being applied to the horizontal no outside operation
 11-65-73-7p-
lever (no cylinder) dummy trim
 21-
 51-
 52-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 freewheeling trim - 60-
electrified et trim 43 08 key outside unlocks/locks trim ls8643 x et_ 63-
voltage must be specified for the #41 cylinder supplied 64-
following functions: 73 and 74. 70-
 72-
specify: 12vdc or 24vdc freewheeling trim - 73-
 key unlocks trim, trim retracts latch/
 46 09 trim relocks when key is removed
 ls8646 x et_ 65-73-
 65-73-7p-
 #41 cylinder required & supplied 73-7p-
 81-
 82-
 electrified et trim - fail safe f1-82-
 73 power off, unlocks lever (no cylinder)*
 ls8673 x et_ 83-
 f1-83-
 84-
 br-
 electrified et trim - fail secure lc-
 74 power off, locks lever (no cylinder)* ls8674 x et_ sc-
 se-

 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel * only available with
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 15, 26d and 32d
 note: aff means above finished floor, center line of rail above finished floor finishes
 * cylinder override is not available with lp 8700 series devices


 c7710 mortise centercase 650 top strike
 strike available
 1-1/4"
 (32mm) finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 1-1/8"
 (29mm) sargent bhma
 finishes finishes

 03 605
 2-1/2"
 (64mm) 04 606
 09 611
 4-7/8" 10 612
 3-3/8" (124mm)
 (86mm) • for application in metal 10b 613
 frames 10be 613e
 10bl 613l
 • stainless steel 14 618
 • top strike for panic & fire 15 619
 20d 624
 rated
 26 625
 • standard for ls8600 26d 626
 • handed 32 629
 32d 630
 • stainless steel only bsp —
 wsp

 1-800-727-5477 • www.sargentlock.com
 37 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 38, ' MD8600 (Hurricane-Resistant)
 Concealed Vertical Rod Exit Device
 for Metal Doors
 80 Series

 MD8600 Series Features
 Concealed Vertical Rod Exit Device • Designed for standard width stile applications on hollow metal
 for Metal Doors doors
 • Concealed rods for security and aesthetics
 • Single and double door applications
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) listed


 Specifications for MD8600 Series Exit
 Door Type Metal Doors
 Door Thickness 1-3/4" (44mm) minimum thickness. For doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 Cladding Available for 1/4" on 1/2" panels. Specify 31- and panel thickness on order. Only available on 1-3/4" door
 thickness. Must be noted separately from door thickness on order string.
 Stile 4-1/2" (114mm) minimum stile width
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined by Rails will be factory cut to size, if door width is supplied
 door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 650 Top Strike & 606 Bottom Strike (Panic and Fire Rated)




 07/25
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 Electric Options AL- Alarm
 53- LX Latchbolt Monitor




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 54- Outside Lever Monitoring
 55- Request-to-Exit Signal - Rail Monitoring
 56- Remote Latch Retraction
 58- Electric Dogging
 59- Electroguard – Self Contained Delayed Egress
 Mounting Fasteners Supplied standard with machine screws
 Top Bolt Stainless steel
 Device Centerline from 41" (1041mm) for Standard Applications
 Finished Floor 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 120" (3048mm) Max Door Opening
 96" max door height for HC and WS options
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6
 Notes:
 • MD8600 & 12-MD8600 can be used as NB- Device by simply not installing the bottom rod/bolt.
 • 12-NB Applications require thermal pin. Thermal Pin supplied when ordered as a 12-NB Device.
 • Must include "HC" option in the order string to specify Hurricane Resistant product.




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 100 Series Aux Control 650 Top Strike 606 Bottom Strike
 • Available as
 an 06 or 1-1/8" 1-1/16"
 13 function (29mm) (27mm)
 • Supplied with
 a SARGENT 2-1/2" 2-5/8"
 #41 Mortise (64mm) (67mm)
 Cylinder 5/32"
 • For application in hollow (4mm)
 • Can be used metal frames
 with any
 SARGENT • Stainless steel nylon coated
 • Furnished with expansion shields
 Mortise Key
 System • Mortised into floor
 • Stainless steel

90641
 38 1-800-727-5477 • www.sargentlock.com
', 3239, 1, ' md8600 (hurricane-resistant)
 concealed vertical rod exit device
 for metal doors
 80 series

 md8600 series features
 concealed vertical rod exit device • designed for standard width stile applications on hollow metal
 for metal doors doors
 • concealed rods for security and aesthetics
 • single and double door applications
 • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed


 specifications for md8600 series exit
 door type metal doors
 door thickness 1-3/4" (44mm) minimum thickness. for doors over 1-3/4" to 2-1/4" thick, specify thickness and order as 31-
 cladding available for 1/4" on 1/2" panels. specify 31- and panel thickness on order. only available on 1-3/4" door
 thickness. must be noted separately from door thickness on order string.
 stile 4-1/2" (114mm) minimum stile width
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined by rails will be factory cut to size, if door width is supplied
 door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 650 top strike & 606 bottom strike (panic and fire rated)




 07/25
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for cylinder dogging (#41 cylinder supplied)
 electric options al- alarm
 53- lx latchbolt monitor




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 54- outside lever monitoring
 55- request-to-exit signal - rail monitoring
 56- remote latch retraction
 58- electric dogging
 59- electroguard – self contained delayed egress
 mounting fasteners supplied standard with machine screws
 top bolt stainless steel
 device centerline from 41" (1041mm) for standard applications
 finished floor 38" (965mm) for elementary schools
 door/opening height must be specified - 120" (3048mm) max door opening
 96" max door height for hc and ws options
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6
 notes:
 • md8600 & 12-md8600 can be used as nb- device by simply not installing the bottom rod/bolt.
 • 12-nb applications require thermal pin. thermal pin supplied when ordered as a 12-nb device.
 • must include "hc" option in the order string to specify hurricane resistant product.




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 100 series aux control 650 top strike 606 bottom strike
 • available as
 an 06 or 1-1/8" 1-1/16"
 13 function (29mm) (27mm)
 • supplied with
 a sargent 2-1/2" 2-5/8"
 #41 mortise (64mm) (67mm)
 cylinder 5/32"
 • for application in hollow (4mm)
 • can be used metal frames
 with any
 sargent • stainless steel nylon coated
 • furnished with expansion shields
 mortise key
 system • mortised into floor
 • stainless steel

90641
 38 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 39, 'MD8600 Functions and Trims
for Metal Doors
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF Options
 59- MD86 13 F ETL RHR 03 03 36" 84" 41" MD8600


700 Series ET Trim SARGENT ANSI ANSI Type 8 Mechanical Options:
 Function Function Description & Cylinder Info MD8600 12-
 Exits with ET Trim, specify Numbers Numbers 16-
 (1-3/4" Door) Panic & Fire
 lever design after the ET 19-
 designation (e.g., ETL) Key unlocks Trim, Trim retracts latch/ 31-
 06 09 Trim relocks when key is removed MD8606 x ET_ 36-
 #41 Cylinder Supplied 37-
 43-
 53-
 54-
 10 01 No outside operation (No Cylinder)* MD8610 55-
 56-
 56-HK-
 No outside operation (No Cylinder)* 5LH
 10 02 ET Control is used as Pull Only
 MD8610 x ET_ 58-
Lever Designs for ET 59-
 BC-59-
Controls 76-
 Key Outside Unlocks/locks Trim
A, B, E, F, J, L, P, W 13 08 #41 Cylinder Supplied
 MD8613 x ET_ 85-
 86-
Also available with Coastal Series &
 87-
Studio Collection Levers AL-
 BT-
 15 14 Passage Only (No cylinder) MD8615 x ET_ CPC-
ET Designation with Suffix HC-
(Used to order ET without Freewheeling Trim - LD-
device) PL-
 40 02 No outside Operation MD8640 x ET_ * SG-
MD8600 Series: (No Cylinder)* Dummy Trim WS-
706-4, 710-4, 713-4, 715-4, 740-4, Cylinder Options:
 Freewheeling Trim - 10-
743-4, 746-4, 773-4, & 774-4
 43 08 Key Outside Unlocks/locks Trim MD8643 x ET_ 10-21-
 #41 Cylinder Supplied 10-63-
Freewheeling Trim 11-




 07/25
 Freewheeling Trim - 11-21-
The lever rotates when the door is Key unlocks Trim, Trim retracts latch/ 11-60-
locked preventing excessive force 46 09 Trim relocks when key is removed
 MD8646 x ET_ 11-63-
from being applied to the horizontal 11-64-
 #41 Cylinder Supplied




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
lever 11-70-7P-
 11-72-7P-
 Electrified ET Trim - Fail Safe 11-73-7P-
Electrified ET Trim 73 Power Off, Unlocks Lever (No Cylinder)*
 MD8673 x ET_ 11-65-73-7P-
 21-
Voltage must be specified for the
 51-
following functions: 73 and 74. Electrified ET Trim - Fail Secure 52-
Specify: 12VDC or 24VDC 74 Power Off, Locks Lever (No Cylinder)*
 MD8674 x ET_ 60-
 63-
 64-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 70-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 72-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 73-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 65-73-
 * Cylinder Override is available with a 106 Aux Control 65-73-7P-
 Example Order: MD8673F 12V x ETMG x 106 x RHR x 32D x 36"w x 84"h 73-7P-
 81-
 82-
 F1-82-
 SARGENT ANSI 83-
 F1-83-
100 Series Auxiliary Control* Function Function Description & Cylinder Info MD8600 84-
& 862 Pull Numbers Numbers (1-3/4" Door) Panic & Fire BR-
 LC-
 Key unlocks Turn, Turn retracts latch/ SC-
 06 12 Turn relocks when key is removed MD8610 x 106 SE-
 #41 Cylinder Supplied * Only available with
 15, 26D and 32D
 862 Pull Only finishes
 10 02 (Optional Pulls: 863 & 864)
 MD8610 x 862 Pull




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Available
 100 Series Aux. 862 Pull Key Outside Unlocks/locks Turn Finishes
 Control 13 11 #41 Cylinder Supplied
 MD8610 x 113
 SARGENT BHMA
 Finishes Finishes

 Note: When ordering MD8600 Series Exit Device x 100 Series Aux. Control, specify 10 Function for the exit. 03 605
 Example: MD8610F x 106 x RHR x 32D x 42" x 90" 04 606
 09 611
 10 612
 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP




 1-800-727-5477 • www.sargentlock.com
 39 90641
', 3902, 1, 'md8600 functions and trims
for metal doors
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff options
 59- md86 13 f etl rhr 03 03 36" 84" 41" md8600


700 series et trim sargent ansi ansi type 8 mechanical options:
 function function description & cylinder info md8600 12-
 exits with et trim, specify numbers numbers 16-
 (1-3/4" door) panic & fire
 lever design after the et 19-
 designation (e.g., etl) key unlocks trim, trim retracts latch/ 31-
 06 09 trim relocks when key is removed md8606 x et_ 36-
 #41 cylinder supplied 37-
 43-
 53-
 54-
 10 01 no outside operation (no cylinder)* md8610 55-
 56-
 56-hk-
 no outside operation (no cylinder)* 5lh
 10 02 et control is used as pull only
 md8610 x et_ 58-
lever designs for et 59-
 bc-59-
controls 76-
 key outside unlocks/locks trim
a, b, e, f, j, l, p, w 13 08 #41 cylinder supplied
 md8613 x et_ 85-
 86-
also available with coastal series &
 87-
studio collection levers al-
 bt-
 15 14 passage only (no cylinder) md8615 x et_ cpc-
et designation with suffix hc-
(used to order et without freewheeling trim - ld-
device) pl-
 40 02 no outside operation md8640 x et_ * sg-
md8600 series: (no cylinder)* dummy trim ws-
706-4, 710-4, 713-4, 715-4, 740-4, cylinder options:
 freewheeling trim - 10-
743-4, 746-4, 773-4, & 774-4
 43 08 key outside unlocks/locks trim md8643 x et_ 10-21-
 #41 cylinder supplied 10-63-
freewheeling trim 11-




 07/25
 freewheeling trim - 11-21-
the lever rotates when the door is key unlocks trim, trim retracts latch/ 11-60-
locked preventing excessive force 46 09 trim relocks when key is removed
 md8646 x et_ 11-63-
from being applied to the horizontal 11-64-
 #41 cylinder supplied




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
lever 11-70-7p-
 11-72-7p-
 electrified et trim - fail safe 11-73-7p-
electrified et trim 73 power off, unlocks lever (no cylinder)*
 md8673 x et_ 11-65-73-7p-
 21-
voltage must be specified for the
 51-
following functions: 73 and 74. electrified et trim - fail secure 52-
specify: 12vdc or 24vdc 74 power off, locks lever (no cylinder)*
 md8674 x et_ 60-
 63-
 64-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 70-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 72-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 73-
 note: aff means above finished floor, center line of rail above finished floor 65-73-
 * cylinder override is available with a 106 aux control 65-73-7p-
 example order: md8673f 12v x etmg x 106 x rhr x 32d x 36"w x 84"h 73-7p-
 81-
 82-
 f1-82-
 sargent ansi 83-
 f1-83-
100 series auxiliary control* function function description & cylinder info md8600 84-
& 862 pull numbers numbers (1-3/4" door) panic & fire br-
 lc-
 key unlocks turn, turn retracts latch/ sc-
 06 12 turn relocks when key is removed md8610 x 106 se-
 #41 cylinder supplied * only available with
 15, 26d and 32d
 862 pull only finishes
 10 02 (optional pulls: 863 & 864)
 md8610 x 862 pull




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 available
 100 series aux. 862 pull key outside unlocks/locks turn finishes
 control 13 11 #41 cylinder supplied
 md8610 x 113
 sargent bhma
 finishes finishes

 note: when ordering md8600 series exit device x 100 series aux. control, specify 10 function for the exit. 03 605
 example: md8610f x 106 x rhr x 32d x 42" x 90" 04 606
 09 611
 10 612
 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp




 1-800-727-5477 • www.sargentlock.com
 39 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 40, ' UL Listed Hurricane-Resistant
 HC8800 Rim Exit Device
 80 Series

 Features
 HC8800 Series
 Rim Exit Device • Designed for standard width stile applications on metal doors.
 For doors 1-3/4" (44mm) thick.
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) and UL305 (Panic) listed

 Rails are available in 4 sizes, use door width to determine size needed.
 Rails will be factory cut to size, if door width is supplied
 • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Note: For additional information on 8800 Series, see page 9



 HC8800, 12-HC8800 Series 649 Strike
 Rim Exit Device • Supplied standard for panic & fire
 1-5/32"
 (29mm)
 • Chassis: ductile iron rated openings
 • Surface applied
 • Requires 2 chassis shims and 2 end bracket
 shims included with the exit device • Black nylon coated
 • Additional information on HC980 Mullions 3/4"
 (19mm) 1/4" 3-11/16"
 available in Mullion Section of this catalog (6mm) (94mm)




 07/25
 Single Door




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Double Door HC-8800 with HC-980 Mullion



 (HC8800)
 (12-HC8800)
 649 Strike HC-980 Mullion




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 40 1-800-727-5477 • www.sargentlock.com
', 1613, 1, ' ul listed hurricane-resistant
 hc8800 rim exit device
 80 series

 features
 hc8800 series
 rim exit device • designed for standard width stile applications on metal doors.
 for doors 1-3/4" (44mm) thick.
 • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) and ul305 (panic) listed

 rails are available in 4 sizes, use door width to determine size needed.
 rails will be factory cut to size, if door width is supplied
 • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 note: for additional information on 8800 series, see page 9



 hc8800, 12-hc8800 series 649 strike
 rim exit device • supplied standard for panic & fire
 1-5/32"
 (29mm)
 • chassis: ductile iron rated openings
 • surface applied
 • requires 2 chassis shims and 2 end bracket
 shims included with the exit device • black nylon coated
 • additional information on hc980 mullions 3/4"
 (19mm) 1/4" 3-11/16"
 available in mullion section of this catalog (6mm) (94mm)




 07/25
 single door




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 double door hc-8800 with hc-980 mullion



 (hc8800)
 (12-hc8800)
 649 strike hc-980 mullion




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 40 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 41, 'UL Listed Hurricane-Resistant
HC8800 Functions and Trims
80 Series

 Options for
How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 12 HC88 13 F ETL RHR 15 32D 36" HC8800


 Mechanical Options:
 SARGENT ANSI ANSI Type 1 12-
700 Series ET Trim Function Function HC8800
 Description & Cylinder Info 16-
 19-
 Exits with ET Trim, specify Numbers Numbers (1-3/4" Door) Panic & Fire 31-
 lever design after the ET 36-
 designation (e.g., ETL) Night Latch 37-
 04 03 Key Retracts Latch HC8804 x ET_ 43-
 #34 Cylinder Supplied 54-
 55-
 Key unlocks Trim, Trim retracts latch/ 56-
 06 09 Trim relocks when key is removed HC8806 x ET_ 56-HK-
 #41 Cylinder Supplied 58-
 76-
 85-
 10 01 No outside operation (No Cylinder) HC8810 86-
 87-
 BT-
Lever Designs for ET Controls No outside operation (No Cylinder) CPC-
 10 02 ET Control is used as Pull Only HC8810 x ET_ LD-
A, B, E, F, J, L, P, W PL-
Also available with Coastal Series & * SG-
Studio Collection Levers Key Outside Unlocks/locks Trim TB-
 13 08 #41 Cylinder Supplied HC8813 x ET_ Cylinder Options:
 10-
ET Designation with Suffix 10-21-
(Used to order ET without device) 10-63-
 15 14 Passage Only (No cylinder) HC8815 x ET_ 11-
HC-8800 Series: 704, 706-8, 710, 11-21-
713-8, 715-8, 740, 743-8, 744, 746-8, 11-60-
 Freewheeling Trim -
773-8, 774-8, 775-8 & 776-8 11-63-
 40 02 No outside operation HC8840 x ET_ 11-64-
 (No Cylinder) Dummy Trim 11-70-7P-
Freewheeling Trim 11-72-7P-




 07/25
 Freewheeling Trim - 11-73-7P-
The lever rotates when the door is
locked preventing excessive force 43 08 Key Outside Unlocks/locks Trim HC8843 x ET_ 11-65-73-7P-
 #41 Cylinder Supplied 21-
from being applied to the horizontal 51-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
lever 52-
 Freewheeling Trim - Key Retracts Latch 60-
 44 03 #34 Cylinder Supplied HC8844 x ET_ 63-
Electrified ET Trim 64-
 70-
Voltage must be specified for the Freewheeling Trim - 72-
following functions: 73, 74, 75 and Key unlocks Trim, Trim retracts latch/ 73-
 46 09 Trim relocks when key is removed HC8846 x ET_ 65-73-
76. 65-73-7P-
 #41 Cylinder Supplied
Specify: 12VDC or 24VDC 73-7P-
 Electrified ET Trim - Fail Safe 81-
 Power Off, Unlocks Lever, 82-
 75* Key Retracts Latch HC8875 x ET_ F1-82-
 #34 Cylinder Supplied 83-
 F1-83-
 Electrified ET Trim - Fail Secure 84-
 Power Off, Locks Lever, BR-
 76** \Key Retracts Latch HC8876 x ET_ LC-
 SC-
 #34 Cylinder Supplied SE-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel * Only available with
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 15, 26D and 32D
 • 75 Function without cylinder is available as a 73 Function finishes
 ** 76 Function without cylinder is available as a 74 Function

 Trim Designations
 • Use three letter designations (Ex “PTB”) when ordering
 the Exit Device with Trim Available
 • Use the six digit designation (Ex “814-MSL”) when Finishes
 ordering trim without an Exit Device, always specify Series




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT BHMA
Pull Section finish Finishes Finishes

 03 605
 04 606
 09 611
SARGENT ANSI 10 612
 Function Function Description & Cylinder 10B 613
 HC800
Numbers Numbers Info. (1-3/4" Door) Panic & Fire 10BE 613E
 10BL 613L
 Night Latch-Key Retracts Latch HC8804 x Trim 14 618
 04 03 #34 Cylinder Supplied 814-FSL* 814-FSW* 814-MSL* 814-PSB* 814-STS 15 619
 Designation
 20D 624
 26 625
 No O/S Operation or Cylinder HC8810 x Trim 26D 626
 10 02 (Pull Only) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS
 Designation 32 629
 32D 630
* FSL, FSW, MSL and PSB trims are used with (HC-& 12-) 8888 and 8804 only and are the same as FLL, FLW, MAL and PTB pulls except for cylinder hole located 3/8"
(9mm) lower
 BSP —
Note: FLW & FSW trims are not available in 32(629) or 32D(630) WSP
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D


 1-800-727-5477 • www.sargentlock.com
 41 90641
', 4321, 1, 'ul listed hurricane-resistant
hc8800 functions and trims
80 series

 options for
how to order: options series function rail lgth trim hand outside finish inside finish door width
 12 hc88 13 f etl rhr 15 32d 36" hc8800


 mechanical options:
 sargent ansi ansi type 1 12-
700 series et trim function function hc8800
 description & cylinder info 16-
 19-
 exits with et trim, specify numbers numbers (1-3/4" door) panic & fire 31-
 lever design after the et 36-
 designation (e.g., etl) night latch 37-
 04 03 key retracts latch hc8804 x et_ 43-
 #34 cylinder supplied 54-
 55-
 key unlocks trim, trim retracts latch/ 56-
 06 09 trim relocks when key is removed hc8806 x et_ 56-hk-
 #41 cylinder supplied 58-
 76-
 85-
 10 01 no outside operation (no cylinder) hc8810 86-
 87-
 bt-
lever designs for et controls no outside operation (no cylinder) cpc-
 10 02 et control is used as pull only hc8810 x et_ ld-
a, b, e, f, j, l, p, w pl-
also available with coastal series & * sg-
studio collection levers key outside unlocks/locks trim tb-
 13 08 #41 cylinder supplied hc8813 x et_ cylinder options:
 10-
et designation with suffix 10-21-
(used to order et without device) 10-63-
 15 14 passage only (no cylinder) hc8815 x et_ 11-
hc-8800 series: 704, 706-8, 710, 11-21-
713-8, 715-8, 740, 743-8, 744, 746-8, 11-60-
 freewheeling trim -
773-8, 774-8, 775-8 & 776-8 11-63-
 40 02 no outside operation hc8840 x et_ 11-64-
 (no cylinder) dummy trim 11-70-7p-
freewheeling trim 11-72-7p-




 07/25
 freewheeling trim - 11-73-7p-
the lever rotates when the door is
locked preventing excessive force 43 08 key outside unlocks/locks trim hc8843 x et_ 11-65-73-7p-
 #41 cylinder supplied 21-
from being applied to the horizontal 51-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
lever 52-
 freewheeling trim - key retracts latch 60-
 44 03 #34 cylinder supplied hc8844 x et_ 63-
electrified et trim 64-
 70-
voltage must be specified for the freewheeling trim - 72-
following functions: 73, 74, 75 and key unlocks trim, trim retracts latch/ 73-
 46 09 trim relocks when key is removed hc8846 x et_ 65-73-
76. 65-73-7p-
 #41 cylinder supplied
specify: 12vdc or 24vdc 73-7p-
 electrified et trim - fail safe 81-
 power off, unlocks lever, 82-
 75* key retracts latch hc8875 x et_ f1-82-
 #34 cylinder supplied 83-
 f1-83-
 electrified et trim - fail secure 84-
 power off, locks lever, br-
 76** \key retracts latch hc8876 x et_ lc-
 sc-
 #34 cylinder supplied se-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel * only available with
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 15, 26d and 32d
 • 75 function without cylinder is available as a 73 function finishes
 ** 76 function without cylinder is available as a 74 function

 trim designations
 • use three letter designations (ex “ptb”) when ordering
 the exit device with trim available
 • use the six digit designation (ex “814-msl”) when finishes
 ordering trim without an exit device, always specify series




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent bhma
pull section finish finishes finishes

 03 605
 04 606
 09 611
sargent ansi 10 612
 function function description & cylinder 10b 613
 hc800
numbers numbers info. (1-3/4" door) panic & fire 10be 613e
 10bl 613l
 night latch-key retracts latch hc8804 x trim 14 618
 04 03 #34 cylinder supplied 814-fsl* 814-fsw* 814-msl* 814-psb* 814-sts 15 619
 designation
 20d 624
 26 625
 no o/s operation or cylinder hc8810 x trim 26d 626
 10 02 (pull only) 810-fll 810-flw 810-mal 810-ptb 810-sts
 designation 32 629
 32d 630
* fsl, fsw, msl and psb trims are used with (hc-& 12-) 8888 and 8804 only and are the same as fll, flw, mal and ptb pulls except for cylinder hole located 3/8"
(9mm) lower
 bsp —
note: flw & fsw trims are not available in 32(629) or 32d(630) wsp
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d


 1-800-727-5477 • www.sargentlock.com
 41 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 42, ' UL Listed Hurricane-Resistant
 WS8800 Rim Exit Device
 80 Series

 WS8800 Series Features
 Rim Exit Device • WS 8800 available for single hollow metal door applications
 for 1-3/4" thick door, 3''0" x 7''0" max, with 6" min stile
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL305 (Panic) Listed

 WS8800 rails are available in 2 sizes, use door width to determine
 size needed. Rails will be factory cut to size, if door width is supplied
 • E Rail for 24" to 32" door widths, No cutting required for 32"
 door
 • F Rail for 33" to 36" door widths, No cutting required for 36"
 door
 Note: For additional information on 8800 Series, see page 9
 649 Strike WS8800, 12-WS8800 Series
 • Supplied standard for panic & fire Rim Exit Device
 rated openings
 1-5/32" • Chassis: Non Fire Rated - Nonferrous alloy
 • Surface applied (29mm)
 • Requires 3 chassis shims and 3 end bracket shims included
 • Black nylon coated with the exit device

 3/4"
 (19mm)
 Single Door
 1/4"
 (6mm)




 07/25
 3-11/16" Trim
 (94mm)

 WS8800)




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 (12-WS8800)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 42 1-800-727-5477 • www.sargentlock.com
', 1352, 1, ' ul listed hurricane-resistant
 ws8800 rim exit device
 80 series

 ws8800 series features
 rim exit device • ws 8800 available for single hollow metal door applications
 for 1-3/4" thick door, 3''0" x 7''0" max, with 6" min stile
 • devices are ansi/bhma a156.3 - grade 1
 • ul305 (panic) listed

 ws8800 rails are available in 2 sizes, use door width to determine
 size needed. rails will be factory cut to size, if door width is supplied
 • e rail for 24" to 32" door widths, no cutting required for 32"
 door
 • f rail for 33" to 36" door widths, no cutting required for 36"
 door
 note: for additional information on 8800 series, see page 9
 649 strike ws8800, 12-ws8800 series
 • supplied standard for panic & fire rim exit device
 rated openings
 1-5/32" • chassis: non fire rated - nonferrous alloy
 • surface applied (29mm)
 • requires 3 chassis shims and 3 end bracket shims included
 • black nylon coated with the exit device

 3/4"
 (19mm)
 single door
 1/4"
 (6mm)




 07/25
 3-11/16" trim
 (94mm)

 ws8800)




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 (12-ws8800)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 42 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 43, 'UL Listed Hurricane-Resistant
WS8800 Functions and Trims
80 Series

 Options for
How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width HC8800
 12 WS88 13 F ETL RHR 15 32D 36" &WS8800

 Mechanical Options:
 SARGENT ANSI ANSI Type 1 12-
700 Series ET Trim Function Function WS8800
 Description & Cylinder Info 16-
 19-
 Exits with ET Trim, specify Numbers Numbers (1-3/4" Door) Panic & Fire 31-
 lever design after the ET 36-
 designation (e.g., ETL) Night Latch 37-
 04 03 Key Retracts Latch WS8804 x ET_ 43-
 #34 Cylinder Supplied 54-
 55-
 Key unlocks Trim, Trim retracts latch/ 56-
 06 09 Trim relocks when key is removed WS8806 x ET_ 56-HK-
 #41 Cylinder Supplied 58-
 76-
 85-
 10 01 No outside operation (No Cylinder) WS8810 86-
 87-
 BT-
Lever Designs for ET Controls No outside operation (No Cylinder) CPC-
 10 02 ET Control is used as Pull Only
 WS8810 x ET_ LD-
A, B, E, F, J, L, P, W PL-
Also available with Coastal Series & * SG-
Studio Collection Levers Key Outside Unlocks/locks Trim TB-
 13 08 #41 Cylinder Supplied
 WS8813 x ET_ Cylinder Options:
 10-
ET Designation with Suffix 10-21-
(Used to order ET without device) 10-63-
 15 14 Passage Only (No cylinder) WS8815 x ET_ 11-
HC-8800 Series: 704, 706-8, 710, 11-21-
713-8, 715-8, 740, 743-8, 744, 746-8, 11-60-
 Freewheeling Trim -
773-8, 774-8, 775-8 & 776-8 11-63-
 40 02 No outside Operation WS8840 x ET_ 11-64-
 (No Cylinder) Dummy Trim 11-70-7P-
Freewheeling Trim 11-72-7P-




 07/25
 Freewheeling Trim - 11-73-7P-
The lever rotates when the door is
locked preventing excessive force 43 08 Key Outside Unlocks/locks Trim WS8843 x ET_ 11-65-73-7P-
 #41 Cylinder Supplied 21-
from being applied to the horizontal 51-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
lever 52-
 Freewheeling Trim - Key Retracts Latch 60-
 44 03 #34 Cylinder Supplied
 WS8844 x ET_ 63-
Electrified ET Trim 64-
 70-
Voltage must be specified for the Freewheeling Trim - 72-
following functions: 73, 74, 75 and Key unlocks Trim, Trim retracts latch/ 73-
 46 09 Trim relocks when key is removed
 WS8846 x ET_ 65-73-
76. 65-73-7P-
 #41 Cylinder Supplied
Specify: 12VDC or 24VDC 73-7P-
 Electrified ET Trim - Fail Safe 81-
 Power Off, Unlocks Lever, 82-
 75* Key Retracts Latch
 WS8875 x ET_ F1-82-
 #34 Cylinder Supplied 83-
 F1-83-
 Electrified ET Trim - Fail Secure 84-
 Power Off, Locks Lever, BR-
 76** Key Retracts Latch
 WS8876 x ET_ LC-
 SC-
 #34 Cylinder Supplied SE-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel * Only available with
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 15, 26D and 32D
 * 75 Function without cylinder is available as a 73 Function finishes
 ** 76 Function without cylinder is available as a 74 Function

 Trim Designations
 • Use three letter designations (Ex “PTB”) when ordering
 the Exit Device with trim
 • Use the six digit designation (Ex “810-MAL”) when Available
Pull Section ordering trim without an Exit Device, always specify finish Series Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT BHMA
 Finishes Finishes

 03 605
 04 606
SARGENT ANSI 09 611
 Description & Cylinder 10 612
 Function Function WS800
 10B
 Info. (1-3/4" Door) Panic & Fire 613
Numbers Numbers 10BE 613E
 Night Latch-Key Retracts Latch WS8804 x Trim 10BL 613L
 04 03 #34 Cylinder Supplied 814-FSL* 814-FSW* 814-MSL* 814-PSB* 814-STS 14 618
 Designation
 15 619
 20D 624
 No O/S Operation or Cylinder WS8810 x Trim
 10 02 (Pull Only) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS 26 625
 Designation 26D 626
* FSL, FSW, MSL and PSB trims are used with (HC-& 12-) 8888 and 8804 only and are the same as FLL, FLW, MAL and PTB pulls except for cylinder hole located 3/8" 32 629
(9mm) lower 32D 630
Note: FLW & FSW trims are not available in 32(629) or 32D(630) BSP —
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D WSP

 1-800-727-5477 • www.sargentlock.com
 43 90641
', 4330, 1, 'ul listed hurricane-resistant
ws8800 functions and trims
80 series

 options for
how to order: options series function rail lgth trim hand outside finish inside finish door width hc8800
 12 ws88 13 f etl rhr 15 32d 36" &ws8800

 mechanical options:
 sargent ansi ansi type 1 12-
700 series et trim function function ws8800
 description & cylinder info 16-
 19-
 exits with et trim, specify numbers numbers (1-3/4" door) panic & fire 31-
 lever design after the et 36-
 designation (e.g., etl) night latch 37-
 04 03 key retracts latch ws8804 x et_ 43-
 #34 cylinder supplied 54-
 55-
 key unlocks trim, trim retracts latch/ 56-
 06 09 trim relocks when key is removed ws8806 x et_ 56-hk-
 #41 cylinder supplied 58-
 76-
 85-
 10 01 no outside operation (no cylinder) ws8810 86-
 87-
 bt-
lever designs for et controls no outside operation (no cylinder) cpc-
 10 02 et control is used as pull only
 ws8810 x et_ ld-
a, b, e, f, j, l, p, w pl-
also available with coastal series & * sg-
studio collection levers key outside unlocks/locks trim tb-
 13 08 #41 cylinder supplied
 ws8813 x et_ cylinder options:
 10-
et designation with suffix 10-21-
(used to order et without device) 10-63-
 15 14 passage only (no cylinder) ws8815 x et_ 11-
hc-8800 series: 704, 706-8, 710, 11-21-
713-8, 715-8, 740, 743-8, 744, 746-8, 11-60-
 freewheeling trim -
773-8, 774-8, 775-8 & 776-8 11-63-
 40 02 no outside operation ws8840 x et_ 11-64-
 (no cylinder) dummy trim 11-70-7p-
freewheeling trim 11-72-7p-




 07/25
 freewheeling trim - 11-73-7p-
the lever rotates when the door is
locked preventing excessive force 43 08 key outside unlocks/locks trim ws8843 x et_ 11-65-73-7p-
 #41 cylinder supplied 21-
from being applied to the horizontal 51-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
lever 52-
 freewheeling trim - key retracts latch 60-
 44 03 #34 cylinder supplied
 ws8844 x et_ 63-
electrified et trim 64-
 70-
voltage must be specified for the freewheeling trim - 72-
following functions: 73, 74, 75 and key unlocks trim, trim retracts latch/ 73-
 46 09 trim relocks when key is removed
 ws8846 x et_ 65-73-
76. 65-73-7p-
 #41 cylinder supplied
specify: 12vdc or 24vdc 73-7p-
 electrified et trim - fail safe 81-
 power off, unlocks lever, 82-
 75* key retracts latch
 ws8875 x et_ f1-82-
 #34 cylinder supplied 83-
 f1-83-
 electrified et trim - fail secure 84-
 power off, locks lever, br-
 76** key retracts latch
 ws8876 x et_ lc-
 sc-
 #34 cylinder supplied se-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel * only available with
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 15, 26d and 32d
 * 75 function without cylinder is available as a 73 function finishes
 ** 76 function without cylinder is available as a 74 function

 trim designations
 • use three letter designations (ex “ptb”) when ordering
 the exit device with trim
 • use the six digit designation (ex “810-mal”) when available
pull section ordering trim without an exit device, always specify finish series finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent bhma
 finishes finishes

 03 605
 04 606
sargent ansi 09 611
 description & cylinder 10 612
 function function ws800
 10b
 info. (1-3/4" door) panic & fire 613
numbers numbers 10be 613e
 night latch-key retracts latch ws8804 x trim 10bl 613l
 04 03 #34 cylinder supplied 814-fsl* 814-fsw* 814-msl* 814-psb* 814-sts 14 618
 designation
 15 619
 20d 624
 no o/s operation or cylinder ws8810 x trim
 10 02 (pull only) 810-fll 810-flw 810-mal 810-ptb 810-sts 26 625
 designation 26d 626
* fsl, fsw, msl and psb trims are used with (hc-& 12-) 8888 and 8804 only and are the same as fll, flw, mal and ptb pulls except for cylinder hole located 3/8" 32 629
(9mm) lower 32d 630
note: flw & fsw trims are not available in 32(629) or 32d(630) bsp —
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d wsp

 1-800-727-5477 • www.sargentlock.com
 43 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 44, ' UL Listed Hurricane-Resistant
 WS8900 Mortise Lock Exit Device
 80 Series

 WS8900 Series Features
 Mortise Lock Exit Device • WS8900 available for Single Hollow Metals Doors applications for
 1-3/4" Thick door, 3''0" x 7''0" Max. Door with 6" Min Stile
 • Requires 4 chassis shims and 4 end bracket shims to be included
 with exit device
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL305 (Panic) Listed

 WS8900 rails are available in 2 sizes, use door width to determine size
 needed. Rails will be factory cut to size, if door width is supplied
 • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 Note: For additional information on 8900 Series and Windstorm Ratings
 for the standard 8900 Series, see page 13



 Single Door C908 Standard Strike
 • Curved lip ANSI A-115.1
 WS8900, 12-WS8900 Series
 Mortise Exit Device • Handed. 1-1/4" (32mm) lip standard
 • Requires 4 chassis shims and 
 1-1/4" • Longer lips in increments
 4 end bracket shims included with (32mm) of
 the exit device 1/4" (6mm) through




 07/25
 2-7/8" (73mm) available
 • Black nylon coated
 3-3/8




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 (86mm) 4-7/8
 (124mm)




 1-1/4"
 (32mm) 3/32"
 (2mm)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 44 1-800-727-5477 • www.sargentlock.com
', 1546, 1, ' ul listed hurricane-resistant
 ws8900 mortise lock exit device
 80 series

 ws8900 series features
 mortise lock exit device • ws8900 available for single hollow metals doors applications for
 1-3/4" thick door, 3''0" x 7''0" max. door with 6" min stile
 • requires 4 chassis shims and 4 end bracket shims to be included
 with exit device
 • devices are ansi/bhma a156.3 - grade 1
 • ul305 (panic) listed

 ws8900 rails are available in 2 sizes, use door width to determine size
 needed. rails will be factory cut to size, if door width is supplied
 • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 note: for additional information on 8900 series and windstorm ratings
 for the standard 8900 series, see page 13



 single door c908 standard strike
 • curved lip ansi a-115.1
 ws8900, 12-ws8900 series
 mortise exit device • handed. 1-1/4" (32mm) lip standard
 • requires 4 chassis shims and 
 1-1/4" • longer lips in increments
 4 end bracket shims included with (32mm) of
 the exit device 1/4" (6mm) through




 07/25
 2-7/8" (73mm) available
 • black nylon coated
 3-3/8




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 (86mm) 4-7/8
 (124mm)




 1-1/4"
 (32mm) 3/32"
 (2mm)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 44 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 45, 'UL Listed Hurricane-Resistant
WS8900 Functions and Trims
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width
 11-63- WS89 13 F ETL RHR 14 32 36"
 Options
 SARGENT ANSI WS8900

 Function Function Description & Cylinder Info WS8900
700 Series ET Trim Numbers Numbers (1-3/4" Door) Panic & Fire Mechanical Options:
 12-
 Exits with ET Trim, specify Night Latch 16-
 lever design after the ET 04 03 Key Retracts Latch WS8904 x ET_ 19-
 #46 Cylinder Supplied 23-
 designation (e.g., ETL) 31-
 Key unlocks Trim, Trim retracts Latch/
 36-
 06 09 Trim relocks when key is removed WS8906 x ET_ 37-
 #41 Cylinder Supplied 43-
 54-
 10 01 No outside operation (No Cylinder) WS8910 55-
 56-
 56-HK-
 No outside operation (No Cylinder) 58-
 10 02 ET Control is used as Pull Only WS8910 x ET_ 76-
 85-
Lever Designs for ET Controls Key Outside Unlocks/locks Trim 86-
 13 08 #41 Cylinder Supplied WS8913 x ET_ 87-
A, B, E, F, J, L, P, W BT-
Also available with Coastal Series & CPC-
Studio Collection Levers 15 14 Passage Only (No cylinder) WS8915 x ET_ LD-
 PL-
 ** SG-
 Key Outside Retracts Latch; Cylinder Options:
ET Designation with Suffix 16 10 Key Inside Unlocks/Locks O/S Trim WS8916 x ET_ 10-
(Used to order ET without device) O/S #46 & I/S #34 Cylinder Supplied 10-21-
 10-63-
WS8900 Series: 704, 706, 710, 713, Freewheeling Trim - 11-
715, 716, 740, 743, 744, 773, 774, 40 02 No outside operation (No Cylinder) Dummy Trim WS8940 x ET_ 11-21-
775 & 776 11-60-
 Freewheeling Trim - 11-63-
 43 08 Key Outside Unlocks/locks Trim WS8943 x ET_ 11-64-
Freewheeling Trim #41 Cylinder Supplied 11-70-7P-
 11-72-7P-




 07/25
The lever rotates when the door is Freewheeling Trim - Key Retracts Latch 11-73-7P-
locked preventing excessive force 44 03 For 1-3/4” Door #46 Cylinder Supplied WS8944 x ET_ 11-65-73-7P-
 21-
from being applied to the horizontal Electrified ET Trim - Fail Safe 51-
lever Power Off, Unlocks Lever, 52-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Electrified ET Trim and 75* Key Retracts Latch WS8975 x ET_ 60-
 For 1-3/4" Door #46 Cylinder Supplied 63-
Electrified Mortise Locks Electrified ET Trim - Fail Secure 64-
 70-
Voltage must be specified for the Power Off, Locks Lever,
 76** Key Retracts Latch WS8976 x ET_ 72-
following functions: 73, 74, 75 and 73-
76. For 1-3/4" Door #46 Cylinder Supplied 65-73-
 65-73-7P-
Specify: 12VDC or 24VDC Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 73-7P-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 81-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 82-
 * 75 Function without cylinder is available as a 73 Function F1-82-
 83-
 ** 76 Function without cylinder is available as a 74 Function F1-83-
 84-
Pull & Thumbpiece Trim Section Trim Designations BR-
 LC-
 • Use three letter designations (Ex “PTB”) when ordering the Exit *SC-
 Device with trim *SE-
 • Use the six digit designation (Ex “866-MAL”) when ordering trim * Options are not
 without an Exit Device, always specify finish & hand available with the
 following functions:
 04 x ET, 16, 44, 75
 & 76
 ** Only available with
 SARGENT ANSI 15, 26D and 32D
 finishes
 Function Function Description & Cylinder WS8900 Panic & Fire
 Numbers Numbers Info. (1-3/4" Door)
 Night Latch WS8904 x Trim Available
 04 03 Key Retracts Latch 814-FLL 814-FLW 814-MAL 814-PTB 814-STS Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 #41 Cylinder Supplied Designation
 SARGENT BHMA
 No O/S Operation or Cylinder WS8910 x Trim Finishes Finishes
 10 02 (Pull Only) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS
 Designation 03 605
 04 606
 Passage Only WS8928 x Trim 09 611
 28 15 (No cylinder) 828-FLL 828-FLW 828-MAL 828-PTB 828-STS 10
 Designation 612
 10B 613
 Key Outside Unlocks/ WS8963 x Trim 10BE 613E
 63 05 locks Thumbpiece 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 10BL 613L
 #41 Cylinder Supplied Designation 14 618
 15 619
 Key Outside Retracts Latch; Key WS8966 x Trim 20D 624
 66 07 Inside Unlocks/Locks O/S Trim 866-FLL 866-FLW 866-MAL 866-PTB 866-STS 26 625
 O/S #34 & I/S #41 Supplied Designation
 26D 626
Note: Thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately 32 629
Note: FLW trim is not available in 32(629) or 32D(630) 32D 630
Note: Thumbpiece Trims used with Mortise Lock Exit Devices are handed BSP —
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D WSP


 1-800-727-5477 • www.sargentlock.com
 45 90641
', 4868, 1, 'ul listed hurricane-resistant
ws8900 functions and trims
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width
 11-63- ws89 13 f etl rhr 14 32 36"
 options
 sargent ansi ws8900

 function function description & cylinder info ws8900
700 series et trim numbers numbers (1-3/4" door) panic & fire mechanical options:
 12-
 exits with et trim, specify night latch 16-
 lever design after the et 04 03 key retracts latch ws8904 x et_ 19-
 #46 cylinder supplied 23-
 designation (e.g., etl) 31-
 key unlocks trim, trim retracts latch/
 36-
 06 09 trim relocks when key is removed ws8906 x et_ 37-
 #41 cylinder supplied 43-
 54-
 10 01 no outside operation (no cylinder) ws8910 55-
 56-
 56-hk-
 no outside operation (no cylinder) 58-
 10 02 et control is used as pull only ws8910 x et_ 76-
 85-
lever designs for et controls key outside unlocks/locks trim 86-
 13 08 #41 cylinder supplied ws8913 x et_ 87-
a, b, e, f, j, l, p, w bt-
also available with coastal series & cpc-
studio collection levers 15 14 passage only (no cylinder) ws8915 x et_ ld-
 pl-
 ** sg-
 key outside retracts latch; cylinder options:
et designation with suffix 16 10 key inside unlocks/locks o/s trim ws8916 x et_ 10-
(used to order et without device) o/s #46 & i/s #34 cylinder supplied 10-21-
 10-63-
ws8900 series: 704, 706, 710, 713, freewheeling trim - 11-
715, 716, 740, 743, 744, 773, 774, 40 02 no outside operation (no cylinder) dummy trim ws8940 x et_ 11-21-
775 & 776 11-60-
 freewheeling trim - 11-63-
 43 08 key outside unlocks/locks trim ws8943 x et_ 11-64-
freewheeling trim #41 cylinder supplied 11-70-7p-
 11-72-7p-




 07/25
the lever rotates when the door is freewheeling trim - key retracts latch 11-73-7p-
locked preventing excessive force 44 03 for 1-3/4” door #46 cylinder supplied ws8944 x et_ 11-65-73-7p-
 21-
from being applied to the horizontal electrified et trim - fail safe 51-
lever power off, unlocks lever, 52-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
electrified et trim and 75* key retracts latch ws8975 x et_ 60-
 for 1-3/4" door #46 cylinder supplied 63-
electrified mortise locks electrified et trim - fail secure 64-
 70-
voltage must be specified for the power off, locks lever,
 76** key retracts latch ws8976 x et_ 72-
following functions: 73, 74, 75 and 73-
76. for 1-3/4" door #46 cylinder supplied 65-73-
 65-73-7p-
specify: 12vdc or 24vdc note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 73-7p-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 81-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 82-
 * 75 function without cylinder is available as a 73 function f1-82-
 83-
 ** 76 function without cylinder is available as a 74 function f1-83-
 84-
pull & thumbpiece trim section trim designations br-
 lc-
 • use three letter designations (ex “ptb”) when ordering the exit *sc-
 device with trim *se-
 • use the six digit designation (ex “866-mal”) when ordering trim * options are not
 without an exit device, always specify finish & hand available with the
 following functions:
 04 x et, 16, 44, 75
 & 76
 ** only available with
 sargent ansi 15, 26d and 32d
 finishes
 function function description & cylinder ws8900 panic & fire
 numbers numbers info. (1-3/4" door)
 night latch ws8904 x trim available
 04 03 key retracts latch 814-fll 814-flw 814-mal 814-ptb 814-sts finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 #41 cylinder supplied designation
 sargent bhma
 no o/s operation or cylinder ws8910 x trim finishes finishes
 10 02 (pull only) 810-fll 810-flw 810-mal 810-ptb 810-sts
 designation 03 605
 04 606
 passage only ws8928 x trim 09 611
 28 15 (no cylinder) 828-fll 828-flw 828-mal 828-ptb 828-sts 10
 designation 612
 10b 613
 key outside unlocks/ ws8963 x trim 10be 613e
 63 05 locks thumbpiece 866-fll 866-flw 866-mal 866-ptb 866-sts 10bl 613l
 #41 cylinder supplied designation 14 618
 15 619
 key outside retracts latch; key ws8966 x trim 20d 624
 66 07 inside unlocks/locks o/s trim 866-fll 866-flw 866-mal 866-ptb 866-sts 26 625
 o/s #34 & i/s #41 supplied designation
 26d 626
note: thumbpiece trims for 63 and 66 function devices are identical and are identified as 66 function when trim is ordered separately 32 629
note: flw trim is not available in 32(629) or 32d(630) 32d 630
note: thumbpiece trims used with mortise lock exit devices are handed bsp —
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d wsp


 1-800-727-5477 • www.sargentlock.com
 45 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 46, ' UL Listed Hurricane Resistant
 HC4-8700 Surface Vertical Rod Device
 80 Series

 Features
 • Meets the abuse and high wind loads required by Florida building code including
 HVHZ.
 • Devices are ANSI/BHMA A156.3 - Grade 1
 Note: For additional information on 8700 Series, see page 14



 HC4-8700
 Series
 Surface Vertical Rod
 Exit Device



 Openings 8''0" x 8''0" (2438mm x 2438mm)
 Strikes 659 Top Strike in frame with larger mounting screws for both top and 
 bottom cases. 655 bottom strike furnished standard
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined Rails will be factory cut to size, if door width is supplied
 by door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door




 07/25
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 659 Top Strike (Panic and Fire Rated)




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 655 Bottom Strike (Panic and Fire Rated)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 Top & Bottom Bolt Stainless steel
 Device Centerline 41" (1041 mm) for Standard Applications
 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 96" (2438mm) Max Door Opening
 Fire Exit Hardware See Chart – Page 6
 Note: Approved single openings cannot be used as a pair, but a door in a pair can be used as a single
 opening.



 659 Top Strike 655 Bottom Strike
 • For HC4-8700/12-HC4-8700 • For HC4-
 • Latchbolt nylon coated 8700/12-HC4-8700
 • Stainless steel




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • Stainless steel
 • Black nylon coated
 1-1/4"
 (32mm) 2-3/4"
 (70mm)


 2-5/16"
 (59mm)
 1-13/16"
 (46mm)


 1/2" 1-1/2"
 (13mm) (38mm)




90641
 46 1-800-727-5477 • www.sargentlock.com
', 2156, 1, ' ul listed hurricane resistant
 hc4-8700 surface vertical rod device
 80 series

 features
 • meets the abuse and high wind loads required by florida building code including
 hvhz.
 • devices are ansi/bhma a156.3 - grade 1
 note: for additional information on 8700 series, see page 14



 hc4-8700
 series
 surface vertical rod
 exit device



 openings 8''0" x 8''0" (2438mm x 2438mm)
 strikes 659 top strike in frame with larger mounting screws for both top and 
 bottom cases. 655 bottom strike furnished standard
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined rails will be factory cut to size, if door width is supplied
 by door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door




 07/25
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 659 top strike (panic and fire rated)




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 655 bottom strike (panic and fire rated)
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 top & bottom bolt stainless steel
 device centerline 41" (1041 mm) for standard applications
 38" (965mm) for elementary schools
 door/opening height must be specified - 96" (2438mm) max door opening
 fire exit hardware see chart – page 6
 note: approved single openings cannot be used as a pair, but a door in a pair can be used as a single
 opening.



 659 top strike 655 bottom strike
 • for hc4-8700/12-hc4-8700 • for hc4-
 • latchbolt nylon coated 8700/12-hc4-8700
 • stainless steel




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • stainless steel
 • black nylon coated
 1-1/4"
 (32mm) 2-3/4"
 (70mm)


 2-5/16"
 (59mm)
 1-13/16"
 (46mm)


 1/2" 1-1/2"
 (13mm) (38mm)




90641
 46 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 47, 'UL Listed Hurricane Resistant
HC4-8700 Functions and Trims
80 Series

How to order:
 Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF
 10-63- HC4-87 13 F ETL RHR 15 32D 36" 84" 41"

700 Series ET Trim ANSI Type 2 Options
 SARGENT ANSI
 Exits with ET Trim, specify Function Function Description & Cylinder Info HC4-8700 HC4-8700
 lever design after the ET
 designation (e.g., ETL) Numbers Numbers (1-3/4" Door) Panic & Fire
 Mechanical Options:
 Key unlocks Trim, Trim retracts latch/ 12-
 06 09 Trim relocks when key is removed HC4-8706 x ET_ 16-
 #41 Cylinder Supplied 19-
 31-
 36-
 10 01 No outside operation (No Cylinder) HC4-8710 37-
 43-
 53-
 No outside operation (No Cylinder)
 10 02 ET Control is used as Pull Only HC4-8710 x ET_ 54-
 55-
 56-
Lever Designs for ET Controls Key Outside Unlocks/locks Trim 56-HK-
A, B, E, F, J, L, P, W
 13 08 #41 Cylinder Supplied HC4-8713 x ET_ 58-
 59-
Also available with Coastal Series & BC-59-
Studio Collection Levers 15 14 Passage Only (No cylinder) HC4-8715 x ET_ 76-
 85-
 86-
ET Designation with Suffix Freewheeling Trim - 87-
 40 02 No outside operation (No Cylinder) Dummy Trim HC4-8740 x ET_ BT-
(Used to order ET without device)
 CPC-
HC4-8700 Series: 706, 710, 713, 715, LD-
 Freewheeling Trim - PL-
740, 743, 746, 773 & 774 43 08 Key Outside Unlocks/locks Trim HC4-8743 x ET_ * SG-
 #41 Cylinder Supplied TB-
Freewheeling Trim Cylinder Options:
 Freewheeling Trim - 10-
 10-21-
The lever rotates when the door is 46 09 Key unlocks Trim, Trim retracts latch/ HC4-8746 x ET_ 10-63-
locked preventing excessive force relocks when key is removed #41 Cylinder Supplied 11-
from being applied to the horizontal 11-21-
 Electrified ET Trim - Fail Safe 11-60-
lever 73 HC4-8773 x ET_




 07/25
 Power Off, Unlocks Lever (No Cylinder) 11-63-
Electrified ET Trim 11-64-
 Electrified ET Trim - Fail Secure 11-70-7P-
Voltage must be specified for the 74 HC4-8774 x ET_ 11-72-7P-
following functions: 73 and 74. Power Off, Locks Lever (No Cylinder)
 11-73-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Specify: 12VDC or 24VDC 11-65-73-7P-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 21-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 51-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 52-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 60-
 63-
 64-
 70-
 72-
 73-
 65-73-
Pull & Thumbpiece Trim Section Trim Designations Series 65-73-7P-
 • Use only letter designations when ordering the Exit Device with 73-7P-
 81-
 trim 82-
 • Use the six digit designation (Ex “866-MAL”) when ordering trim F1-82-
 83-
 without an Exit Device, always specify finish F1-83-
 84-
 BR-
 LC-
 SC-
 SARGENT ANSI SE-
 Function Function Description & Cylinder HC4-8700
 Numbers Numbers Info. (1-3/4" Door) Panic & Fire * Only available with
 15, 26D and 32D
 Pull Only HC4-8710 x Trim finishes
 10 02 (No Cylinder) 810-FLL 810-FLW 810-MAL 810-PTB 810-STS Designation
Note: FLW trim is not available in 32(629) or 32D(630)
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D except
 Available
 Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT BHMA
 Finishes Finishes


 03
 605
 04
 606
 09
 611
 10
 612
 10B
 613
 10BE
 613E
 10BL
 613L
 14
 618
 15
 619
 20D
 624
 26
 625
 26D
 626
 32
 629
 32D
 630
 BSP
 —
 WSP


 1-800-727-5477 • www.sargentlock.com
 47 90641
', 3797, 1, 'ul listed hurricane resistant
hc4-8700 functions and trims
80 series

how to order:
 options series function rail lgth trim hand outside finish inside finish door width door height aff
 10-63- hc4-87 13 f etl rhr 15 32d 36" 84" 41"

700 series et trim ansi type 2 options
 sargent ansi
 exits with et trim, specify function function description & cylinder info hc4-8700 hc4-8700
 lever design after the et
 designation (e.g., etl) numbers numbers (1-3/4" door) panic & fire
 mechanical options:
 key unlocks trim, trim retracts latch/ 12-
 06 09 trim relocks when key is removed hc4-8706 x et_ 16-
 #41 cylinder supplied 19-
 31-
 36-
 10 01 no outside operation (no cylinder) hc4-8710 37-
 43-
 53-
 no outside operation (no cylinder)
 10 02 et control is used as pull only hc4-8710 x et_ 54-
 55-
 56-
lever designs for et controls key outside unlocks/locks trim 56-hk-
a, b, e, f, j, l, p, w
 13 08 #41 cylinder supplied hc4-8713 x et_ 58-
 59-
also available with coastal series & bc-59-
studio collection levers 15 14 passage only (no cylinder) hc4-8715 x et_ 76-
 85-
 86-
et designation with suffix freewheeling trim - 87-
 40 02 no outside operation (no cylinder) dummy trim hc4-8740 x et_ bt-
(used to order et without device)
 cpc-
hc4-8700 series: 706, 710, 713, 715, ld-
 freewheeling trim - pl-
740, 743, 746, 773 & 774 43 08 key outside unlocks/locks trim hc4-8743 x et_ * sg-
 #41 cylinder supplied tb-
freewheeling trim cylinder options:
 freewheeling trim - 10-
 10-21-
the lever rotates when the door is 46 09 key unlocks trim, trim retracts latch/ hc4-8746 x et_ 10-63-
locked preventing excessive force relocks when key is removed #41 cylinder supplied 11-
from being applied to the horizontal 11-21-
 electrified et trim - fail safe 11-60-
lever 73 hc4-8773 x et_




 07/25
 power off, unlocks lever (no cylinder) 11-63-
electrified et trim 11-64-
 electrified et trim - fail secure 11-70-7p-
voltage must be specified for the 74 hc4-8774 x et_ 11-72-7p-
following functions: 73 and 74. power off, locks lever (no cylinder)
 11-73-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
specify: 12vdc or 24vdc 11-65-73-7p-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 21-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 51-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 52-
 note: aff means above finished floor, center line of rail above finished floor 60-
 63-
 64-
 70-
 72-
 73-
 65-73-
pull & thumbpiece trim section trim designations series 65-73-7p-
 • use only letter designations when ordering the exit device with 73-7p-
 81-
 trim 82-
 • use the six digit designation (ex “866-mal”) when ordering trim f1-82-
 83-
 without an exit device, always specify finish f1-83-
 84-
 br-
 lc-
 sc-
 sargent ansi se-
 function function description & cylinder hc4-8700
 numbers numbers info. (1-3/4" door) panic & fire * only available with
 15, 26d and 32d
 pull only hc4-8710 x trim finishes
 10 02 (no cylinder) 810-fll 810-flw 810-mal 810-ptb 810-sts designation
note: flw trim is not available in 32(629) or 32d(630)
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d except
 available
 finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent bhma
 finishes finishes


 03
 605
 04
 606
 09
 611
 10
 612
 10b
 613
 10be
 613e
 10bl
 613l
 14
 618
 15
 619
 20d
 624
 26
 625
 26d
 626
 32
 629
 32d
 630
 bsp
 —
 wsp


 1-800-727-5477 • www.sargentlock.com
 47 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 48, ' UL Listed Hurricane-Resistant
 HC8700 Surface Vertical Rod Exit Device
 80 Series


 Features
 • Meets the abuse and high wind loads required by Florida building code including
 HVHZ.
 • Accepted & approved with CURRIES hollow metal doors and McKINNEY hinges.
 Any substitution of hardware makes the Hurricane Code inapplicable.
 • Devices are ANSI/BHMA A156.3 - Grade 1
 Note: For additional information on 8700 Series, see page 14
 HC8700 Series
 Surface Vertical Rod
 Exit Device



 Openings 8''0" x 8''0" (2438mm x 2438mm) Curries 16 gauge 747 flush, S edge
 Frames CURRIES 16 gauge KD, Pipe spacer anchors only, 12 gauge full
 sleeve reinforcing and existing opening anchor in head of frame
 Hinges McKINNEY TA2714 or T2714
 Hardware Configuration 1 SARGENT HC8700 or 12-HC8700 Exit Devices on both leaves
 Hardware Configuration 2 SARGENT 8200 Series mortise lock (active),
 Vertical Rod Exit & SARGENT HC8700 or 12-HC8700 exit devices (inactive),
 Mortise Lock Ives 360 surface bolts at 5 3/4" (147mm) at centerline
 Strikes 654 top bolt in frame with larger mounting screws for both top and




 07/25
 bottom cases. 655 bottom strike furnished standard
 Rail sizes as Rails are available in 4 sizes, use door width to determine size needed.
 determined Rails will be factory cut to size, if door width is supplied




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 by door width • E Rail for 24" to 32" door widths, No cutting required for 32" door
 • F Rail for 33" to 36" door widths, No cutting required for 36" door
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Strike 654 Top Latch (Panic and Fire Rated)
 655 Bottom Strike (Panic and Fire Rated)
 Dogging Feature Hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 Top & Bottom Bolt Stainless steel
 Device Centerline 41" (1041 mm) for Standard Applications
 38" (965mm) for elementary schools
 Door/Opening Height Must be specified - 96" (2438mm) Max Door Opening
 Fire Exit Hardware See Chart – Page 6
 Note: Approved single openings cannot be used as a pair, but a door in a pair can be used as a single
 opening.



 654 Top Latch 655 Bottom Strike
 • For HC8700/12-HC8700 • For HC8700/12-HC8700




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • Latchbolt nylon • Stainless steel
 1-1/4"
 coated (32mm) • Black nylon 2-3/4"
 (70mm)
 • Stainless coated
 steel
 2-5/16"
 (59mm)
 1-13/16"
 (46mm)


 1/2" 1-1/2"
 (13mm) (38mm)




90641
 48 1-800-727-5477 • www.sargentlock.com
', 2785, 1, ' ul listed hurricane-resistant
 hc8700 surface vertical rod exit device
 80 series


 features
 • meets the abuse and high wind loads required by florida building code including
 hvhz.
 • accepted & approved with curries hollow metal doors and mckinney hinges.
 any substitution of hardware makes the hurricane code inapplicable.
 • devices are ansi/bhma a156.3 - grade 1
 note: for additional information on 8700 series, see page 14
 hc8700 series
 surface vertical rod
 exit device



 openings 8''0" x 8''0" (2438mm x 2438mm) curries 16 gauge 747 flush, s edge
 frames curries 16 gauge kd, pipe spacer anchors only, 12 gauge full
 sleeve reinforcing and existing opening anchor in head of frame
 hinges mckinney ta2714 or t2714
 hardware configuration 1 sargent hc8700 or 12-hc8700 exit devices on both leaves
 hardware configuration 2 sargent 8200 series mortise lock (active),
 vertical rod exit & sargent hc8700 or 12-hc8700 exit devices (inactive),
 mortise lock ives 360 surface bolts at 5 3/4" (147mm) at centerline
 strikes 654 top bolt in frame with larger mounting screws for both top and




 07/25
 bottom cases. 655 bottom strike furnished standard
 rail sizes as rails are available in 4 sizes, use door width to determine size needed.
 determined rails will be factory cut to size, if door width is supplied




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 by door width • e rail for 24" to 32" door widths, no cutting required for 32" door
 • f rail for 33" to 36" door widths, no cutting required for 36" door
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 strike 654 top latch (panic and fire rated)
 655 bottom strike (panic and fire rated)
 dogging feature hex key dogging standard on non fired rated devices; specify 16- for 
 cylinder dogging (#41 cylinder supplied)
 top & bottom bolt stainless steel
 device centerline 41" (1041 mm) for standard applications
 38" (965mm) for elementary schools
 door/opening height must be specified - 96" (2438mm) max door opening
 fire exit hardware see chart – page 6
 note: approved single openings cannot be used as a pair, but a door in a pair can be used as a single
 opening.



 654 top latch 655 bottom strike
 • for hc8700/12-hc8700 • for hc8700/12-hc8700




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • latchbolt nylon • stainless steel
 1-1/4"
 coated (32mm) • black nylon 2-3/4"
 (70mm)
 • stainless coated
 steel
 2-5/16"
 (59mm)
 1-13/16"
 (46mm)


 1/2" 1-1/2"
 (13mm) (38mm)




90641
 48 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 49, 'UL Listed Hurricane-Resistant
HC8700 Functions and Trims
80 Series

How to order:
 Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF
 10-63- HC87 13 F ETL RHR 15 32D 36" 84" 41"

700 Series ET Trim ANSI Type 2 Options
 SARGENT ANSI
 Exits with ET Trim, specify Function Function Description & Cylinder Info HC8700 HC8700
 lever design after the ET
 designation (e.g., ETL) Numbers Numbers (1-3/4" Door) Panic & Fire
 Mechanical Options:
 Key unlocks Trim, Trim retracts latch/ 12-
 06 09 Trim relocks when key is removed HC8706 x ET_ 16-
 #41 Cylinder Supplied 19-
 31-
 36-
 10 01 No outside operation (No Cylinder)* HC8710 37-
 43-
 53-
 No outside operation (No Cylinder)*
 10 02 ET Control is used as Pull Only
 HC8710 x ET_ 54-
 55-
 56-
Lever Designs for ET Controls Key Outside Unlocks/locks Trim 56-HK-
A, B, E, F, J, L, P, W
 13 08 #41 Cylinder Supplied
 HC8713 x ET_ 58-
 59-
Also available with Coastal Series & BC-59-
Studio Collection Levers 15 14 Passage Only (No cylinder) HC8715 x ET_ 76-
 85-
 86-
ET Designation with Suffix Freewheeling Trim - 87-
 40 02 No outside operation (No Cylinder)* Dummy Trim
 HC8740 x ET_ BT-
(Used to order ET without device)
 CPC-
HC8700 Series: 706, 710, 713, 715, LD-
 Freewheeling Trim - PL-
740, 743, 746, 773 & 774 43 08 Key Outside Unlocks/locks Trim HC8743 x ET_ * SG-
 #41 Cylinder Supplied TB-
Freewheeling Trim Cylinder Options:
 Freewheeling Trim - 10-
 10-21-
The lever rotates when the door is 46 09 Key unlocks Trim, Trim retracts latch/ HC8746 x ET_ 10-63-
locked preventing excessive force relocks when key is removed #41 Cylinder Supplied 11-
from being applied to the horizontal 11-21-
 Electrified ET Trim - Fail Safe 11-60-
lever 73 HC8773 x ET_




 07/25
 Power Off, Unlocks Lever (No Cylinder)* 11-63-
Electrified ET Trim 11-64-
 Electrified ET Trim - Fail Secure 11-70-7P-
Voltage must be specified for the 74 HC8774 x ET_ 11-72-7P-
following functions: 73 and 74. Power Off, Locks Lever (No Cylinder)*
 11-73-7P-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Specify: 12VDC or 24VDC 11-65-73-7P-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are 21-
 supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel 51-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices 52-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor 60-
 63-
 * Cylinder Override is available with a 306 Aux Control 64-
 Example Order: 8773F 12V x ETMG x 306 x RHR x 32D x 36"w x 84"h 70-
 72-
 73-
 SARGENT ANSI 65-73-
 65-73-7P-
300 Series* Function Function Description & Cylinder Info HC8700 73-7P-
 81-
Auxiliary Control & 862 Pull Numbers Numbers (1-3/4" Door) Panic & Fire 82-
 Key unlocks Turn, Turn retracts latch/ F1-82-
 83-
 06 12 Turn relocks when key is removed HC8710 x 306 F1-83-
 #41 Cylinder Supplied 84-
 BR-
 862 Pull Only LC-
 10 02 (Optional Pulls: 863 & 864)
 HC8710 x 862 SC-
 SE-


 300 Series Key Outside Unlocks/locks Turn * Only available with
 862 Pull 13 11 #41 Cylinder Supplied
 HC8710 x 313
 Aux. Control 15, 26D and 32D
 finishes
Note: When ordering HC8700 Series Exit Device x 300 Series Aux. Control, specify 10 Function for the exit. Example: HC8710F x 306 x RHR x 32D
x 42" x 90"


Pull & Thumbpiece Trim Section Trim Designations Series Available
 • Use only letter designations when ordering the Exit Device with Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 trim SARGENT BHMA
 • Use the six digit designation (Ex “866-MAL”) when ordering trim Finishes Finishes
 without an Exit Device, always specify finish
 03
 605
 04
 606
 09
 SARGENT ANSI 611
 10
 Function Function Description & Cylinder 612
 HC8700 10B
 613
 Numbers Numbers Info. (1-3/4" Door) Panic & Fire 10BE
 613E
 10BL
 Pull Only HC8710 x Trim 613L
 10 02 (No Cylinder)* 810-FLL 810-FLW 810-MAL 810-PTB 810-STS Designation
 14
 618
 15
 619
 * Cylinder Override is available with a 306 Aux Control 20D
 Note: FLW trim is not available in 32(629) or 32D(630) 624
 26
 Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D 625
 26D
 626
 32
 629
 32D
 630
 BSP
 —
 WSP


 1-800-727-5477 • www.sargentlock.com
 49 90641
', 4527, 1, 'ul listed hurricane-resistant
hc8700 functions and trims
80 series

how to order:
 options series function rail lgth trim hand outside finish inside finish door width door height aff
 10-63- hc87 13 f etl rhr 15 32d 36" 84" 41"

700 series et trim ansi type 2 options
 sargent ansi
 exits with et trim, specify function function description & cylinder info hc8700 hc8700
 lever design after the et
 designation (e.g., etl) numbers numbers (1-3/4" door) panic & fire
 mechanical options:
 key unlocks trim, trim retracts latch/ 12-
 06 09 trim relocks when key is removed hc8706 x et_ 16-
 #41 cylinder supplied 19-
 31-
 36-
 10 01 no outside operation (no cylinder)* hc8710 37-
 43-
 53-
 no outside operation (no cylinder)*
 10 02 et control is used as pull only
 hc8710 x et_ 54-
 55-
 56-
lever designs for et controls key outside unlocks/locks trim 56-hk-
a, b, e, f, j, l, p, w
 13 08 #41 cylinder supplied
 hc8713 x et_ 58-
 59-
also available with coastal series & bc-59-
studio collection levers 15 14 passage only (no cylinder) hc8715 x et_ 76-
 85-
 86-
et designation with suffix freewheeling trim - 87-
 40 02 no outside operation (no cylinder)* dummy trim
 hc8740 x et_ bt-
(used to order et without device)
 cpc-
hc8700 series: 706, 710, 713, 715, ld-
 freewheeling trim - pl-
740, 743, 746, 773 & 774 43 08 key outside unlocks/locks trim hc8743 x et_ * sg-
 #41 cylinder supplied tb-
freewheeling trim cylinder options:
 freewheeling trim - 10-
 10-21-
the lever rotates when the door is 46 09 key unlocks trim, trim retracts latch/ hc8746 x et_ 10-63-
locked preventing excessive force relocks when key is removed #41 cylinder supplied 11-
from being applied to the horizontal 11-21-
 electrified et trim - fail safe 11-60-
lever 73 hc8773 x et_




 07/25
 power off, unlocks lever (no cylinder)* 11-63-
electrified et trim 11-64-
 electrified et trim - fail secure 11-70-7p-
voltage must be specified for the 74 hc8774 x et_ 11-72-7p-
following functions: 73 and 74. power off, locks lever (no cylinder)*
 11-73-7p-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
specify: 12vdc or 24vdc 11-65-73-7p-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are 21-
 supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel 51-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices 52-
 note: aff means above finished floor, center line of rail above finished floor 60-
 63-
 * cylinder override is available with a 306 aux control 64-
 example order: 8773f 12v x etmg x 306 x rhr x 32d x 36"w x 84"h 70-
 72-
 73-
 sargent ansi 65-73-
 65-73-7p-
300 series* function function description & cylinder info hc8700 73-7p-
 81-
auxiliary control & 862 pull numbers numbers (1-3/4" door) panic & fire 82-
 key unlocks turn, turn retracts latch/ f1-82-
 83-
 06 12 turn relocks when key is removed hc8710 x 306 f1-83-
 #41 cylinder supplied 84-
 br-
 862 pull only lc-
 10 02 (optional pulls: 863 & 864)
 hc8710 x 862 sc-
 se-


 300 series key outside unlocks/locks turn * only available with
 862 pull 13 11 #41 cylinder supplied
 hc8710 x 313
 aux. control 15, 26d and 32d
 finishes
note: when ordering hc8700 series exit device x 300 series aux. control, specify 10 function for the exit. example: hc8710f x 306 x rhr x 32d
x 42" x 90"


pull & thumbpiece trim section trim designations series available
 • use only letter designations when ordering the exit device with finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 trim sargent bhma
 • use the six digit designation (ex “866-mal”) when ordering trim finishes finishes
 without an exit device, always specify finish
 03
 605
 04
 606
 09
 sargent ansi 611
 10
 function function description & cylinder 612
 hc8700 10b
 613
 numbers numbers info. (1-3/4" door) panic & fire 10be
 613e
 10bl
 pull only hc8710 x trim 613l
 10 02 (no cylinder)* 810-fll 810-flw 810-mal 810-ptb 810-sts designation
 14
 618
 15
 619
 * cylinder override is available with a 306 aux control 20d
 note: flw trim is not available in 32(629) or 32d(630) 624
 26
 note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d 625
 26d
 626
 32
 629
 32d
 630
 bsp
 —
 wsp


 1-800-727-5477 • www.sargentlock.com
 49 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 50, ' UL Listed Tornado-Resistant
 FM8700 Surface Vertical Rod Exit Device
 80 Series

 Features 569 Shim Kit
 • 2-point latching exit device
 • UL Listed in compliance with ICC 500
 (2014/2020) and FEMA P-361 (2015)
 • Specially machined rail and internal SHIMS

 components make the FM8700 sturdier and SHIMS

 more robust than standard products
 • Devices are ANSI/BHMA A156.3 - Grade 1
 • UL10C (Fire) Listed

 FM8700 Series
 Surface Vertical Rod Exit Device
 SHIMS




 Specifications:
 Doors and Frames CECO DOOR and CURRIES StormPro® Series Door Assemblies
 - 6''0" x 6''8" to 8''-0" x 8''-0" for pairs of fire rated doors
 - 3''0" x 6''8" to 4''-0" x 8''-0" for single fire rated doors (Requires 4 Thermal Pins)
 Hardware SARGENT FM8700 or 12-FM8700 Exit Device on both leaves or single door applications
 Hinges McKinney SP3386/SP3786 StormPro® Tornado Resistant Butt Hinges
 McKinney MCK-HG305 Continuous Hinges




 07/25
 Markar HG305 Continuous Hinges
 Strikes 659 Top Strike in frame and 653 Bottom Strike furnished standard
 655 Bottom Strike optional




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Shim Kit 569 Shim Kit furnished standard
 Rail sizes as determined by Rails are available in 3 sizes, use door width to determine size needed.
 door width Rails will be factory cut to size, if door width is supplied
 • F Rail for 36" door width
 • J Rail for 37" to 42" door widths, No cutting required for 42" door
 • G Rail for 43" to 48" door widths, No cutting required for 48" door
 Dogging Feature Hex key dogging available on non fired rated devices only
 Electric Options 54- Outside Lever Monitoring Option
 Mounting Fasteners Supplied standard with machine screws and with throughbolts for the latch cases

 Top & Bottom Bolt Stainless steel
 Device Centerline 41" (1041mm) for Standard Applications
 from Finished Floor 38" (965mm) for elementary schools
 Center Case Dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 Projection Pushbar Neutral – 3" (76mm)
 Pushbar Depressed – 2-1/8" (54mm)
 Fire Exit Hardware See Chart – Page 6

 659 Top Strike 653 Bottom Strike 655 Bottom Strike
 1-3/4"
 • For Panic & Fire Rated • Provided as standard (44mm) • Stainless steel




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • Latchbolt nylon coated • Panic and Fire-Rated • Black nylon coated
 • Stainless steel • UL305, UL10C and BHMA
 2-1/8" Grade 2 Certified
 1-1/4" 2-3/4"
 (54mm) (70mm)
 (32mm)
 2-3/4"
 (70mm)

 2-5/16"
 (59mm)
 1/2"
 (13mm) 1-13/16"
 (46mm)
 Black nylon coated
 1/2" 1-1/2"
 (13mm) (38mm) 2-5/16"
 (59mm)
 Note: See assembly guide card UL website for all available FEMA and ICC 500 (2014/2020) rated options
 655 Strike must be specified at time of order. Default option remains 635 strike


90641
 50 1-800-727-5477 • www.sargentlock.com
', 2939, 1, ' ul listed tornado-resistant
 fm8700 surface vertical rod exit device
 80 series

 features 569 shim kit
 • 2-point latching exit device
 • ul listed in compliance with icc 500
 (2014/2020) and fema p-361 (2015)
 • specially machined rail and internal shims

 components make the fm8700 sturdier and shims

 more robust than standard products
 • devices are ansi/bhma a156.3 - grade 1
 • ul10c (fire) listed

 fm8700 series
 surface vertical rod exit device
 shims




 specifications:
 doors and frames ceco door and curries stormpro® series door assemblies
 - 6''0" x 6''8" to 8''-0" x 8''-0" for pairs of fire rated doors
 - 3''0" x 6''8" to 4''-0" x 8''-0" for single fire rated doors (requires 4 thermal pins)
 hardware sargent fm8700 or 12-fm8700 exit device on both leaves or single door applications
 hinges mckinney sp3386/sp3786 stormpro® tornado resistant butt hinges
 mckinney mck-hg305 continuous hinges




 07/25
 markar hg305 continuous hinges
 strikes 659 top strike in frame and 653 bottom strike furnished standard
 655 bottom strike optional




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 shim kit 569 shim kit furnished standard
 rail sizes as determined by rails are available in 3 sizes, use door width to determine size needed.
 door width rails will be factory cut to size, if door width is supplied
 • f rail for 36" door width
 • j rail for 37" to 42" door widths, no cutting required for 42" door
 • g rail for 43" to 48" door widths, no cutting required for 48" door
 dogging feature hex key dogging available on non fired rated devices only
 electric options 54- outside lever monitoring option
 mounting fasteners supplied standard with machine screws and with throughbolts for the latch cases

 top & bottom bolt stainless steel
 device centerline 41" (1041mm) for standard applications
 from finished floor 38" (965mm) for elementary schools
 center case dimensions 8-3/8" (213mm) x 2-5/8" (67mm)
 projection pushbar neutral – 3" (76mm)
 pushbar depressed – 2-1/8" (54mm)
 fire exit hardware see chart – page 6

 659 top strike 653 bottom strike 655 bottom strike
 1-3/4"
 • for panic & fire rated • provided as standard (44mm) • stainless steel




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • latchbolt nylon coated • panic and fire-rated • black nylon coated
 • stainless steel • ul305, ul10c and bhma
 2-1/8" grade 2 certified
 1-1/4" 2-3/4"
 (54mm) (70mm)
 (32mm)
 2-3/4"
 (70mm)

 2-5/16"
 (59mm)
 1/2"
 (13mm) 1-13/16"
 (46mm)
 black nylon coated
 1/2" 1-1/2"
 (13mm) (38mm) 2-5/16"
 (59mm)
 note: see assembly guide card ul website for all available fema and icc 500 (2014/2020) rated options
 655 strike must be specified at time of order. default option remains 635 strike


90641
 50 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 51, 'UL Listed Tornado-Resistant
FM8700 Functions and Trims
80 Series

How to order: Options Series Function Rail Lgth Trim Hand Outside Finish Inside Finish Door Width Door Height AFF
 12- FM87 06 F ETL RHR 15 32D 36" 84" 41"

700 Series ET Trim SARGENT ANSI ANSI Type 2 Options
 Exits with ET Trim, specify Function Function Description & Cylinder Info FM8700 FM8700
 lever design after the ET Numbers Numbers (1-3/4" Door) (Panic & Fire)
 designation (e.g., ETL)
 Key unlocks Trim, Trim retracts latch/ Mechanical Options:
 06 09 Trim relocks when key is removed FM8706 x ET_ 12-
 #41 Cylinder Supplied 36-
 37-
 43-
 10 01 No outside operation (No Cylinder)* FM8710 54-
 76-
 85-
 No outside operation (No Cylinder)* 86-
 10 02 ET Control is used as Pull Only
 FM8710 x ET_ 87-
Lever Designs for ET Controls CPC-
A, B, E, F, J, L, P, W LD-
Also available with Coastal Series & Key oustide unlocks/locks trim PL-
 13 08 #41 cylinder supplied
 FM8713 x ET_ * SG-
Studio Collection Levers
 TB-
 Cylinder Options:
ET Designation with Suffix Freewheeling Trim -
 10-
(Used to order ET without device) 40 02 No outside operation FM8740 x ET_ 10-21-
 (No Cylinder)* Dummy Trim
FM8700 Series: 706, 710, 740, 743, 10-63-
 11-
746 & 774 Freewheeling Trim -
 11-21-
 43 08 Key Outside Unlocks/locks Trim FM8743 x ET_ 11-60-
Freewheeling Trim #41 Cylinder Supplied
 11-63-
The lever rotates when the door is Freewheeling Trim - 11-64-
locked preventing excessive force Key unlocks Trim, Trim retracts latch/ 11-70-7P-
 46 09 relocks when key is removed FM8746 x ET_
 11-72-7P-
from being applied to the horizontal




 07/25
 #41 Cylinder Supplied 11-73-7P-
lever
 11-65-73-7P-
 Electrified ET Trim - Fail Secure 21-
Electrified ET Trim 74 Power Off, Locks Lever (No Cylinder)*
 FM8774 x ET_
 51-




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Voltage must be specified for the 52-
following functions: 73 and 74. 60-
 Note: Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are
 63-
Specify: 12VDC or 24VDC supplied in 32 or 32D to match accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel
 64-
 finishes, specify 14/32 or 15/32D to receive nickel finished trims and stainless exit devices
 70-
 Note: AFF means Above Finished Floor, center line of rail Above Finished Floor
 72-
 * Cylinder Override is available with a 306 Aux Control
 73-
 Example Order: FM8774F 12V x ETMG x 306 x RHR x 32D x 36"w x 84"h
 65-73-
 65-73-7P-
 73-7P-
 81-
 82-
 F1-82-
 83-
 F1-83-
 SARGENT ANSI 84-
 Function Function Description & Cylinder Info BR-
 300 Series Auxiliary* FM8700
 LC-
 Control Numbers Numbers (1-3/4" Door) Panic & Fire SC-
 SE-
 Key unlocks Turn, Turn retracts latch/
 06 12 Turn relocks when key is removed FM8710 x 306 * Only available with
 #41 Cylinder Supplied 15, 26D and 32D
 finishes


 Key Outside Unlocks/locks Turn Available
 13 11 FM8710 x 313
 #41 Cylinder Supplied Finishes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 SARGENT BHMA
 Finishes Finishes
 Note: When ordering FM8700 Series Exit Device x 300 Series Aux. Control, specify 10 Function for the exit.
 Example: FM8710F x 306 x RHR x 32D x 42" x 90 605
 03
 04 606
 09 611
 10 612
 10B 613
 10BE 613E
 10BL 613L
 14 618
 15 619
 20D 624
 26 625
 26D 626
 32 629
 32D 630
 BSP —
 WSP



 1-800-727-5477 • www.sargentlock.com
 51 90641
', 3572, 1, 'ul listed tornado-resistant
fm8700 functions and trims
80 series

how to order: options series function rail lgth trim hand outside finish inside finish door width door height aff
 12- fm87 06 f etl rhr 15 32d 36" 84" 41"

700 series et trim sargent ansi ansi type 2 options
 exits with et trim, specify function function description & cylinder info fm8700 fm8700
 lever design after the et numbers numbers (1-3/4" door) (panic & fire)
 designation (e.g., etl)
 key unlocks trim, trim retracts latch/ mechanical options:
 06 09 trim relocks when key is removed fm8706 x et_ 12-
 #41 cylinder supplied 36-
 37-
 43-
 10 01 no outside operation (no cylinder)* fm8710 54-
 76-
 85-
 no outside operation (no cylinder)* 86-
 10 02 et control is used as pull only
 fm8710 x et_ 87-
lever designs for et controls cpc-
a, b, e, f, j, l, p, w ld-
also available with coastal series & key oustide unlocks/locks trim pl-
 13 08 #41 cylinder supplied
 fm8713 x et_ * sg-
studio collection levers
 tb-
 cylinder options:
et designation with suffix freewheeling trim -
 10-
(used to order et without device) 40 02 no outside operation fm8740 x et_ 10-21-
 (no cylinder)* dummy trim
fm8700 series: 706, 710, 740, 743, 10-63-
 11-
746 & 774 freewheeling trim -
 11-21-
 43 08 key outside unlocks/locks trim fm8743 x et_ 11-60-
freewheeling trim #41 cylinder supplied
 11-63-
the lever rotates when the door is freewheeling trim - 11-64-
locked preventing excessive force key unlocks trim, trim retracts latch/ 11-70-7p-
 46 09 relocks when key is removed fm8746 x et_
 11-72-7p-
from being applied to the horizontal




 07/25
 #41 cylinder supplied 11-73-7p-
lever
 11-65-73-7p-
 electrified et trim - fail secure 21-
electrified et trim 74 power off, locks lever (no cylinder)*
 fm8774 x et_
 51-




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
voltage must be specified for the 52-
following functions: 73 and 74. 60-
 note: exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are
 63-
specify: 12vdc or 24vdc supplied in 32 or 32d to match accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel
 64-
 finishes, specify 14/32 or 15/32d to receive nickel finished trims and stainless exit devices
 70-
 note: aff means above finished floor, center line of rail above finished floor
 72-
 * cylinder override is available with a 306 aux control
 73-
 example order: fm8774f 12v x etmg x 306 x rhr x 32d x 36"w x 84"h
 65-73-
 65-73-7p-
 73-7p-
 81-
 82-
 f1-82-
 83-
 f1-83-
 sargent ansi 84-
 function function description & cylinder info br-
 300 series auxiliary* fm8700
 lc-
 control numbers numbers (1-3/4" door) panic & fire sc-
 se-
 key unlocks turn, turn retracts latch/
 06 12 turn relocks when key is removed fm8710 x 306 * only available with
 #41 cylinder supplied 15, 26d and 32d
 finishes


 key outside unlocks/locks turn available
 13 11 fm8710 x 313
 #41 cylinder supplied finishes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sargent bhma
 finishes finishes
 note: when ordering fm8700 series exit device x 300 series aux. control, specify 10 function for the exit.
 example: fm8710f x 306 x rhr x 32d x 42" x 90 605
 03
 04 606
 09 611
 10 612
 10b 613
 10be 613e
 10bl 613l
 14 618
 15 619
 20d 624
 26 625
 26d 626
 32 629
 32d 630
 bsp —
 wsp



 1-800-727-5477 • www.sargentlock.com
 51 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 52, ' ElectroLynx® Information and
 Option Compatibility Chart
 80 Series


 ElectroLynx Connector & Color Chart

 Electrifed Trim (Solenoid ET and/or 54-) requires its own QC8 Hinge
 8 PIN CONNECTOR Note: For more
 PRODUCT 1- 2- 3- 4- 5- 6- 7- 8- information on
 Black Red White Green Orange Blue Brown Yellow ElectroLynx® Retrofit
 Kits and harnesses,
 ELECTRIFIED EXIT TRIM Power Lever Monitoring see instruction
 document A7738,
 Solenoid Functions and solenoid ET Trim 54- Switch Option located at the
 Lever Monitoring SARGENT web site
 NEG POS C NO NC

 Electrified Exit Devices will require their own QC8 or QC12 Hinge as determined by specified options (see chart below)
 8 PIN CONNECTOR 4 PIN CONNECTOR FLYING LEADS
 PRODUCT 1- 2- 3- 4- 5- 6- 7- 8- 9- 10- 11- 12- 13-Red/ 14-Red/ 14-Red/
 Black Red White Green Orange Blue Brown Yellow Violet Gray Pink Tan Green Yellow Black




 EXIT DEVICES Power Latch Monitoring Rail Monitoring 56-

 56- & 58- 53- Switch Option 55- Switch Option 56- TIMER CIRCUIT
 80
 Series Exits 53-NO 53-NC
 NEG POS C C NO NC A B
 56-EG 53-56-NO




 07/25
 DELAYED EGRESS EXIT DEVICES




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Power Remote Alarm Relay LBM - OPTION VOICE/GANG
 59-80 Series Fire Earth External Door
 Electroguard Alarm Ground Inhibit Status
 NEG POS C NO NC C NO NC C NO NC

 All electrical options are supplied with ElectroLynx® connectors and require McKINNEY QC Hinges and cables to complete the system




 Electrical Option Availability Chart
 Primary Options Compatible Options
 12- Fire Rated AL- BT- 53- 55- 56- 58- 59-
 *AL- Alarmed Exit 12- 53- 58-
 16- Cylinder Dogging 53- 55- 56- 58-
 53- Latch Monitoring AL- 12- 16-‡- 55- 56- 58-
 55- Rail Monitoring 12- 16-‡- 53- 56- 58-
 56- Electric Latch Retraction 12- 16-‡- 53- 55-
 58- Electric Dogging AL- 12- 16-‡- 53- 55-




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 **59- Electroguard® 12-

 How to use this chart: Select appropriate option in the left column, under “Primary Option”, then follow the row to find compatible options.
 Note: Underlined compatible options affect minimum door width. Consult factory
 * The AL- design includes monitored push rail
 ** The 59- design includes monitored push rail and latch




90641
 52 1-800-727-5477 • www.sargentlock.com
', 2457, 1, ' electrolynx® information and
 option compatibility chart
 80 series


 electrolynx connector & color chart

 electrifed trim (solenoid et and/or 54-) requires its own qc8 hinge
 8 pin connector note: for more
 product 1- 2- 3- 4- 5- 6- 7- 8- information on
 black red white green orange blue brown yellow electrolynx® retrofit
 kits and harnesses,
 electrified exit trim power lever monitoring see instruction
 document a7738,
 solenoid functions and solenoid et trim 54- switch option located at the
 lever monitoring sargent web site
 neg pos c no nc

 electrified exit devices will require their own qc8 or qc12 hinge as determined by specified options (see chart below)
 8 pin connector 4 pin connector flying leads
 product 1- 2- 3- 4- 5- 6- 7- 8- 9- 10- 11- 12- 13-red/ 14-red/ 14-red/
 black red white green orange blue brown yellow violet gray pink tan green yellow black




 exit devices power latch monitoring rail monitoring 56-

 56- & 58- 53- switch option 55- switch option 56- timer circuit
 80
 series exits 53-no 53-nc
 neg pos c c no nc a b
 56-eg 53-56-no




 07/25
 delayed egress exit devices




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 power remote alarm relay lbm - option voice/gang
 59-80 series fire earth external door
 electroguard alarm ground inhibit status
 neg pos c no nc c no nc c no nc

 all electrical options are supplied with electrolynx® connectors and require mckinney qc hinges and cables to complete the system




 electrical option availability chart
 primary options compatible options
 12- fire rated al- bt- 53- 55- 56- 58- 59-
 *al- alarmed exit 12- 53- 58-
 16- cylinder dogging 53- 55- 56- 58-
 53- latch monitoring al- 12- 16-‡- 55- 56- 58-
 55- rail monitoring 12- 16-‡- 53- 56- 58-
 56- electric latch retraction 12- 16-‡- 53- 55-
 58- electric dogging al- 12- 16-‡- 53- 55-




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 **59- electroguard® 12-

 how to use this chart: select appropriate option in the left column, under “primary option”, then follow the row to find compatible options.
 note: underlined compatible options affect minimum door width. consult factory
 * the al- design includes monitored push rail
 ** the 59- design includes monitored push rail and latch




90641
 52 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 53, 'Security Shim Kit
80 Series

Exit Device Security Shim Kit Features & Benefits:
The SARGENT 541 Exit Device Security Shim Kit fills the gap • Nylon and brushed aluminum construction can be easily cut
between the exit device and the glass creating a flush surface. and trimmed for custom fit
This kit can be easily trimmed and installed to accommodate • Fits all doors up to 48" wide and stiles ranging from 4-1/2" to
most door styles without removing the SARGENT push rail exit 6"
device.
 • Adjustment shims accommodate gaps from 3/8" to 3/4"
This not only responds to the ever increasing need for improved
building security, but also maintains the facility’s aesthetic design. • 6 Lobe tamper proof security screws are included
 • A T10 Torx driver required for assembly
 • Fasteners are countersunk for flush finish
 • 541 Kit contains a 48" shim, ready to be sized

 How to order:
 • 541 Kit




 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




 1-800-727-5477 • www.sargentlock.com
 53 90641
', 1228, 1, 'security shim kit
80 series

exit device security shim kit features & benefits:
the sargent 541 exit device security shim kit fills the gap • nylon and brushed aluminum construction can be easily cut
between the exit device and the glass creating a flush surface. and trimmed for custom fit
this kit can be easily trimmed and installed to accommodate • fits all doors up to 48" wide and stiles ranging from 4-1/2" to
most door styles without removing the sargent push rail exit 6"
device.
 • adjustment shims accommodate gaps from 3/8" to 3/4"
this not only responds to the ever increasing need for improved
building security, but also maintains the facility’s aesthetic design. • 6 lobe tamper proof security screws are included
 • a t10 torx driver required for assembly
 • fasteners are countersunk for flush finish
 • 541 kit contains a 48" shim, ready to be sized

 how to order:
 • 541 kit




 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




 1-800-727-5477 • www.sargentlock.com
 53 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 54, ' SARGuide™ Options (PL-) and
 Latch Bolt Monitoring Option (53-)
 80 Series

 PL- Photoluminescent Option (non-electrified)
 SARGuide® PL Exit Device – with photoluminescent coating – is
 a non electrical option which produces visible EXIT signage in
 darkness or low lit areas.
 • 
 Approved for use in New York City in accordance
 with RS 6-1 and RS 6-1A
 • Recharges from ambient light
 • No wiring or maintenance needed
 • Available for all door widths
 • Order as a PL- option
 LiteGuide™
 (e.g., PL-8713F x ETMA x 32D x 36" x 84") As part of their promise to provide innovative solutions to their customers,
 ASSA ABLOY Group companies offer the LiteGuideTM system, a luminescent egress
 marking system. LiteGuideTM installation is facilitated by ASSA ABLOY’s ElectroLynx®,
 a universal quick-connect system that simplifies the electrification of the door.
 LiteGuideTM is a trademark of ASSA ABLOY Inc.




 53- Latch Bolt Monitoring Option




 07/25
 The latch monitor provides tamper resistant latch monitoring, not just rail movement sensing. The monitor switch is activated when the rail is
 depressed or where there is movement of the latch.




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 • Switch type SPDT form “C” contacts
 • 30 VDC@2 Amp. maximum rating
 • All wires run through rail
 • Field installation kits are not available
 • Available for all door widths
 • Adjustable switch bracket to fine tune sensitivity: set screw
 pivot bracket allows precise adjustment for more accurate
 notification of latchbolt movement (8500 and 8800 Series only).
 • Available with all 80 Series Devices, except LP, LR, LS, PP-,
 PR- & SP8600, FM8700
 • 5lb. pressure released (5CH) option available.
 • See page 74 for compatible options
 • See McKINNEY’s Transfer Device Solutions Catalog for QC
 Hinge and cable requirements
 • Order as a 53- option
 (e.g., 53-8813F x ETJ x 32D x 36" Door)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 54 1-800-727-5477 • www.sargentlock.com
', 2189, 1, ' sarguide™ options (pl-) and
 latch bolt monitoring option (53-)
 80 series

 pl- photoluminescent option (non-electrified)
 sarguide® pl exit device – with photoluminescent coating – is
 a non electrical option which produces visible exit signage in
 darkness or low lit areas.
 • 
 approved for use in new york city in accordance
 with rs 6-1 and rs 6-1a
 • recharges from ambient light
 • no wiring or maintenance needed
 • available for all door widths
 • order as a pl- option
 liteguide™
 (e.g., pl-8713f x etma x 32d x 36" x 84") as part of their promise to provide innovative solutions to their customers,
 assa abloy group companies offer the liteguidetm system, a luminescent egress
 marking system. liteguidetm installation is facilitated by assa abloy’s electrolynx®,
 a universal quick-connect system that simplifies the electrification of the door.
 liteguidetm is a trademark of assa abloy inc.




 53- latch bolt monitoring option




 07/25
 the latch monitor provides tamper resistant latch monitoring, not just rail movement sensing. the monitor switch is activated when the rail is
 depressed or where there is movement of the latch.




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 • switch type spdt form “c” contacts
 • 30 vdc@2 amp. maximum rating
 • all wires run through rail
 • field installation kits are not available
 • available for all door widths
 • adjustable switch bracket to fine tune sensitivity: set screw
 pivot bracket allows precise adjustment for more accurate
 notification of latchbolt movement (8500 and 8800 series only).
 • available with all 80 series devices, except lp, lr, ls, pp-,
 pr- & sp8600, fm8700
 • 5lb. pressure released (5ch) option available.
 • see page 74 for compatible options
 • see mckinney’s transfer device solutions catalog for qc
 hinge and cable requirements
 • order as a 53- option
 (e.g., 53-8813f x etj x 32d x 36" door)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 54 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 55, 'Alarm Option (AL-)
Request-to-Exit Option (55-)
80 Series

AL- Alarm Option
SARGENT’s AL-80 Series Exit Devices are designed for areas requiring a stand-alone alarm on
outward swinging doors. This device has an integrated alarm in the push rail to discourage the
unauthorized use of emergency exit doors. The alarm inside the rail sounds immediately upon
exit. The AL-80 Series is ideal for rear exterior doors, doors leading to a rooftop, or anywhere
security is a concern.


Features
• Microprocessor based alarm board • Field selectable continuous alarm option- • Available with all 80 Devices, except
• When armed, alarm sounds immediately 9VDC 300mAh Supply and 546 Harness LP, LR, LS8600, FM8700,WS & HC8800
 upon rail depression recommended Devices

• All exit devices have tamper resistant • Automatic re-arming option •  Minimum Door Widths:
 latching (Guarded Latch) • Supplied with a #41 (1-1/8") with standard - Wide Stile Door : E-n/a; F-36" only;
 off set cam J-42"-39"; G-48"-43"
• Battery powered – 9VDC - Narrow Stile Door: E-32" only; f-36"-34";
• 103 Db @ 8 ft pulsating horn • UL Listed and cUL Listed J-42"-37"; G-48"-43"
• Flashing red LED provides visible violation • UL Listed to Canadian Safety Standards • See page 74 for compatible options
 indication, reset by key only • Rail Monitoring & Guarded Latch are • See McKINNEY’s Transfer Device
• Low battery alert standard internal features Solutions Catalog for QC Hinge and cable
 requirements (if hard wired)
 • Order as an AL- option
 (e.g., AL-8916F x ETJ x 32D x 36" Door)
545 Alarm Retrofit Kits 546 Wiring Harness
Alarm retrofit kits available for the following 80 Series devices - 8300,




 07/25
 Harness allows for remote control of the alarmed exit device
MD8600, WD8600, GL-8800, and 8900 only. (GL-8800: Rim device with
guarded latch) • Remote Alarm Reset– reset from remote location
 Kit # Device Style Pivot to Pivot Rail Size • External Inhibit – shunts alarm from remote location




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 545-1 Wide 11-1/4" F • Remote Power – allows unit to be wired to a 9VDC 300mAh
 11-1/4" F power supply
 545-2 Narrow • Remote Monitor – allows unit to be wired to remote console
 8-1/2" E
 *545-3 Wide 20-1/2" G • Order as:
 - 546 - Wiring Harness (For AL- option) - Mfg. prior to 7/1/04
 545-4 Narrow 20-1/2" G
 - 546-F - Wiring Harness for F-Size Rails - Mfg. after 7/1/04
 545-6 Narrow 14" J - 546-G - Wiring Harness for G-Size Rails - Mfg. after 7/1/04
 545-7 Wide 14" J - 546-J - Wiring Harness for J-Size Rails - Mfg. after 7/1/04
*Note: #41 Cylinder is not supplied standard and must be ordered separately



55- Request-to-Exit Option
SARGENT Request-to-Exit Signal Switch option for exit devices provides push rail monitoring for a variety of applications; such as to sound an
alarm, initialize a delayed egress system, or de-energize an electromagnetic lock.

Switch type SPDT form “C” contacts • Minimum Door Widths:
• 30 VDC@2 Amp. maximum rating - Wide Stile Door 24"
 - Narrow Stile Door 24"
• All wires run through rail
 • See McKINNEY‘s Transfer Device Solutions Catalog for QC Hinge
• Available with all 80 Series devices, except for FM8700 and cable requirements




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
• 5lb. pressure released (5CH) option available. • Order as a 55- option
• See page 74 for compatible options (e.g., 55-8913F x ETMA x 32D x 36")

Universal 855 Retrofit Kit

• Retrofits existing 80 Series device installations with Request-to-Exit
 Signal Switch option
• Available for wide and narrow stile devices and 8895 Active Dummy Rail
• Compatible with all rail sizes (E, F, J, G), minimum rail length 26"
• Can not be used with 56- rails
• To order separately, order as 855




 1-800-727-5477 • www.sargentlock.com
 55 90641
', 4014, 1, 'alarm option (al-)
request-to-exit option (55-)
80 series

al- alarm option
sargent’s al-80 series exit devices are designed for areas requiring a stand-alone alarm on
outward swinging doors. this device has an integrated alarm in the push rail to discourage the
unauthorized use of emergency exit doors. the alarm inside the rail sounds immediately upon
exit. the al-80 series is ideal for rear exterior doors, doors leading to a rooftop, or anywhere
security is a concern.


features
• microprocessor based alarm board • field selectable continuous alarm option- • available with all 80 devices, except
• when armed, alarm sounds immediately 9vdc 300mah supply and 546 harness lp, lr, ls8600, fm8700,ws & hc8800
 upon rail depression recommended devices

• all exit devices have tamper resistant • automatic re-arming option •  minimum door widths:
 latching (guarded latch) • supplied with a #41 (1-1/8") with standard - wide stile door : e-n/a; f-36" only;
 off set cam j-42"-39"; g-48"-43"
• battery powered – 9vdc - narrow stile door: e-32" only; f-36"-34";
• 103 db @ 8 ft pulsating horn • ul listed and cul listed j-42"-37"; g-48"-43"
• flashing red led provides visible violation • ul listed to canadian safety standards • see page 74 for compatible options
 indication, reset by key only • rail monitoring & guarded latch are • see mckinney’s transfer device
• low battery alert standard internal features solutions catalog for qc hinge and cable
 requirements (if hard wired)
 • order as an al- option
 (e.g., al-8916f x etj x 32d x 36" door)
545 alarm retrofit kits 546 wiring harness
alarm retrofit kits available for the following 80 series devices - 8300,




 07/25
 harness allows for remote control of the alarmed exit device
md8600, wd8600, gl-8800, and 8900 only. (gl-8800: rim device with
guarded latch) • remote alarm reset– reset from remote location
 kit # device style pivot to pivot rail size • external inhibit – shunts alarm from remote location




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 545-1 wide 11-1/4" f • remote power – allows unit to be wired to a 9vdc 300mah
 11-1/4" f power supply
 545-2 narrow • remote monitor – allows unit to be wired to remote console
 8-1/2" e
 *545-3 wide 20-1/2" g • order as:
 - 546 - wiring harness (for al- option) - mfg. prior to 7/1/04
 545-4 narrow 20-1/2" g
 - 546-f - wiring harness for f-size rails - mfg. after 7/1/04
 545-6 narrow 14" j - 546-g - wiring harness for g-size rails - mfg. after 7/1/04
 545-7 wide 14" j - 546-j - wiring harness for j-size rails - mfg. after 7/1/04
*note: #41 cylinder is not supplied standard and must be ordered separately



55- request-to-exit option
sargent request-to-exit signal switch option for exit devices provides push rail monitoring for a variety of applications; such as to sound an
alarm, initialize a delayed egress system, or de-energize an electromagnetic lock.

switch type spdt form “c” contacts • minimum door widths:
• 30 vdc@2 amp. maximum rating - wide stile door 24"
 - narrow stile door 24"
• all wires run through rail
 • see mckinney‘s transfer device solutions catalog for qc hinge
• available with all 80 series devices, except for fm8700 and cable requirements




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
• 5lb. pressure released (5ch) option available. • order as a 55- option
• see page 74 for compatible options (e.g., 55-8913f x etma x 32d x 36")

universal 855 retrofit kit

• retrofits existing 80 series device installations with request-to-exit
 signal switch option
• available for wide and narrow stile devices and 8895 active dummy rail
• compatible with all rail sizes (e, f, j, g), minimum rail length 26"
• can not be used with 56- rails
• to order separately, order as 855




 1-800-727-5477 • www.sargentlock.com
 55 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 56, ' Electric Latch Retraction Option (56-)
 80 Series

 SARGENT’s Electric Latch Retraction exit device is the perfect choice for high traffic egress doors that require access control. This non-handed
 exit device rail is durable and easy to install. It utilizes a latch retraction motor rather than a solenoid, ensuring quiet operation ideal for
 locations such as conference rooms, theaters and libraries. Once retracted, the door functions in a push/pull manner.
 The 56- exit device can be dogged for momentary ingress and egress and is commonly used in conjunction with an automatic door operator. The
 device can be dogged continuously on fire-rated devices that are tied into the building’s fire detection system.




 56- Electric Latch Retraction Features Optional Accessories
 • 5 year warranty • LSP-12-24 Power Supply
 • Patent pending and/or patent www.assaabloydss.com/patents • 4370 Keyswitch




 07/25
 • Field serviceable -modular design • 4291/4292 Keypad
 • Motor driven latch retraction for smooth, precise operation • 3287 Door Status Switch
 • Amount of rail retraction is automatically controlled by the 56- • Norton Automatic Door Operator




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 circuitry; System actively monitors its position and adjusts itself • Norton ADA Push Switch or
 • Digital retraction timer (0-20 seconds; factory setting is 5 seconds) Wave to Open Switch
 • Non-contact Request-to-Exit (55-) switch available
 • Retrofit kits available - see next page
 • Standard electric hinge - no special power transfer required
 • Can be used for continuous and intermittent use
 • UL Listed for Class II Circuitry
 • 5lb. pressure released (5CH) option available.
 • Power Requirements: 24VDC regulated/filtered power supply
 (LSP-12-24)
 • Current draw: .6A during retraction and .25A maintained in dogged
 hold position
 • Requires 1A at 24VDC regulated/filtered power supply
 • Available for all 80 Series exit devices (except FM8700)
 • See page 74 for compatible options
 • Minimum Door Widths:
 - Wide Stile Door 28"
 - Narrow Stile Door 28"




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • See McKINNEY’s Transfer Device Solutions Catalog for QC Hinge
 and cable requirements
 • Order as a 56- option
 (e.g., 56-HK-8913F x ETMF x 32D x 36")

 Note: HK- and 16- are not available for Fire Rated Doors
 Note: The 56- Option is not supplied with Manual Dogging
 (Hex Key or Cylinder Dogging) unless specified




90641
 56 1-800-727-5477 • www.sargentlock.com
', 2720, 1, ' electric latch retraction option (56-)
 80 series

 sargent’s electric latch retraction exit device is the perfect choice for high traffic egress doors that require access control. this non-handed
 exit device rail is durable and easy to install. it utilizes a latch retraction motor rather than a solenoid, ensuring quiet operation ideal for
 locations such as conference rooms, theaters and libraries. once retracted, the door functions in a push/pull manner.
 the 56- exit device can be dogged for momentary ingress and egress and is commonly used in conjunction with an automatic door operator. the
 device can be dogged continuously on fire-rated devices that are tied into the building’s fire detection system.




 56- electric latch retraction features optional accessories
 • 5 year warranty • lsp-12-24 power supply
 • patent pending and/or patent www.assaabloydss.com/patents • 4370 keyswitch




 07/25
 • field serviceable -modular design • 4291/4292 keypad
 • motor driven latch retraction for smooth, precise operation • 3287 door status switch
 • amount of rail retraction is automatically controlled by the 56- • norton automatic door operator




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 circuitry; system actively monitors its position and adjusts itself • norton ada push switch or
 • digital retraction timer (0-20 seconds; factory setting is 5 seconds) wave to open switch
 • non-contact request-to-exit (55-) switch available
 • retrofit kits available - see next page
 • standard electric hinge - no special power transfer required
 • can be used for continuous and intermittent use
 • ul listed for class ii circuitry
 • 5lb. pressure released (5ch) option available.
 • power requirements: 24vdc regulated/filtered power supply
 (lsp-12-24)
 • current draw: .6a during retraction and .25a maintained in dogged
 hold position
 • requires 1a at 24vdc regulated/filtered power supply
 • available for all 80 series exit devices (except fm8700)
 • see page 74 for compatible options
 • minimum door widths:
 - wide stile door 28"
 - narrow stile door 28"




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • see mckinney’s transfer device solutions catalog for qc hinge
 and cable requirements
 • order as a 56- option
 (e.g., 56-hk-8913f x etmf x 32d x 36")

 note: hk- and 16- are not available for fire rated doors
 note: the 56- option is not supplied with manual dogging
 (hex key or cylinder dogging) unless specified




90641
 56 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 57, 'Electric Latch Retraction Motor Kits and
Push Rail Kits
80 Series

 M56- Motor Retrofit Kits
 Upgradeable Design Upgrade using R56 Kits only Rail Sizes




 X
 Exit Devices that
 The 56- Motor Retrofit Kits are upgradable
 Exit Devices with
 a stepped Nose
 can only be added to have straight & Tail, produced
 80 Series Exit Devices* push rail nose prior to 2007,
 manufactured after 2006 & tail; require the R56
 manufactured
 & P Series Exit Device starting in 2007
 Kits; the Push must
 be replaced

 Rail Size is determined by the
56- Push Retrofit Type of Device
 Kit Number to be Upgraded Kits Description: 56- Motor Kits Pivot to Pivot Dimensions

 80 Series &
 M56A x
 P Series Exit Retrofits standard mechanical rail. Contains ribbon wiring. 8-1/2" = “E” Rail**
 Rail Size‑‑
 Device*
 M56B x 53-80 Series Retrofits 53- Exit Devices. Does not include 53- Signal Switch.
 11-1/4" = “F” Rail**
 Rail Size Exit Devices* Contains wiring to reconnect to the pre-existing 53- Chassis Signal Switch.

* Except Exit Devices with a stepped Nose & Tail, produced prior to 2007 and all FM8700 Series Exit Devices 14" = “J” Rail
** Motor Retrofit Kits are identical for E and F size Rail Assemblies
 20-1/2" = “G” Rail
• 55-M56 Kit: Request to Exit Signal Switch is integrated into the connecting arm within the rail
• 56- Motor Retrofit Kits can be used with 855 Request to Exit Kit or 816 Cylinder Dogging Kits
• Kits require a minimum insert length of 5" for 56- & 7" for 16-56- for the electronics
• Rail size is needed when ordering to supply the correct length wires




 07/25
Option Available: 55- Non-Contact Request to Exit switch
How to Order: M56A (Kit #) x F (Rail Size)




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
Kit includes: Motor Bracket Assy, Motor Controller & Fasteners



 R56- Retrofit Kits with Push Rail
 Upgradeable Design Mounting Rail Pivots Rail Sizes
 Upgradable Devices with
 The 56- Push Retrofit Kits Exit Devices Mounting Rail
 do not have Pivot Pins
 can only be added to Pivots in the can Not be
 80 Series* Exit Device Mtg Rails; upgraded
 manufactured after 1995 manufactured
 starting in
 1995

 Rail Size is determined by the
56- Push Retrofit Type of Device
 Kit Number to be Upgraded Kit Descriptions: 56- Push Retrofit Kits Pivot to Pivot Dimensions

R56A x Rail Size & 80 Series
 Retrofits standard mechanical rail. Contains ribbon wiring. 8-1/2" = “E” Rail
 Finish Exit Device*

 R56B x Rail Size 53-80 Series Retrofits 53- Exit Devices. Does not include 53- Signal Switch.
 11-1/4" = “F” Rail
 & Finish Exit Devices* Contains wiring to reconnect to the pre-existing 53- Chassis Signal Switch.




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
* Except 80 Series Exit Devices produced prior to 1995 and all FM8700 Series Exit Devices 14" = “J” Rail

• Adding a R56 Kit to a 55- Rail, the 55- Switch will be eliminated. 20-1/2" = “G” Rail
• For 55-56- Rail Assemblies, use either a 55-R56 Kit or a R56 Kit with a 855 Kit
• R56A & R56B Kits can be used with 855 Request to Exit Kit or 816 Cylinder Dogging Kits
• Kits require a minimum insert length of 5" for 56- & 7" for 16-56- for the electronics
Options:
 19- Push Rail less the Black Lexan Touch Pad
 55- Non-Contact Request to Exit switch
 HK- Hex Key Dogging to allow for manual dogging of the device
 SG- MicroShield® antimicrobial clear powder coat (only available with 15, 26D and 32D finishes)
How to Order: R56A (Kit #) x F (Rail Size) x 32D (Finish);
Kit includes: Motor Bracket & Push Rail Assy, Motor Controller & Fasteners



 1-800-727-5477 • www.sargentlock.com
 57 90641
', 3751, 1, 'electric latch retraction motor kits and
push rail kits
80 series

 m56- motor retrofit kits
 upgradeable design upgrade using r56 kits only rail sizes




 x
 exit devices that
 the 56- motor retrofit kits are upgradable
 exit devices with
 a stepped nose
 can only be added to have straight & tail, produced
 80 series exit devices* push rail nose prior to 2007,
 manufactured after 2006 & tail; require the r56
 manufactured
 & p series exit device starting in 2007
 kits; the push must
 be replaced

 rail size is determined by the
56- push retrofit type of device
 kit number to be upgraded kits description: 56- motor kits pivot to pivot dimensions

 80 series &
 m56a x
 p series exit retrofits standard mechanical rail. contains ribbon wiring. 8-1/2" = “e” rail**
 rail size‑‑
 device*
 m56b x 53-80 series retrofits 53- exit devices. does not include 53- signal switch.
 11-1/4" = “f” rail**
 rail size exit devices* contains wiring to reconnect to the pre-existing 53- chassis signal switch.

* except exit devices with a stepped nose & tail, produced prior to 2007 and all fm8700 series exit devices 14" = “j” rail
** motor retrofit kits are identical for e and f size rail assemblies
 20-1/2" = “g” rail
• 55-m56 kit: request to exit signal switch is integrated into the connecting arm within the rail
• 56- motor retrofit kits can be used with 855 request to exit kit or 816 cylinder dogging kits
• kits require a minimum insert length of 5" for 56- & 7" for 16-56- for the electronics
• rail size is needed when ordering to supply the correct length wires




 07/25
option available: 55- non-contact request to exit switch
how to order: m56a (kit #) x f (rail size)




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
kit includes: motor bracket assy, motor controller & fasteners



 r56- retrofit kits with push rail
 upgradeable design mounting rail pivots rail sizes
 upgradable devices with
 the 56- push retrofit kits exit devices mounting rail
 do not have pivot pins
 can only be added to pivots in the can not be
 80 series* exit device mtg rails; upgraded
 manufactured after 1995 manufactured
 starting in
 1995

 rail size is determined by the
56- push retrofit type of device
 kit number to be upgraded kit descriptions: 56- push retrofit kits pivot to pivot dimensions

r56a x rail size & 80 series
 retrofits standard mechanical rail. contains ribbon wiring. 8-1/2" = “e” rail
 finish exit device*

 r56b x rail size 53-80 series retrofits 53- exit devices. does not include 53- signal switch.
 11-1/4" = “f” rail
 & finish exit devices* contains wiring to reconnect to the pre-existing 53- chassis signal switch.




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
* except 80 series exit devices produced prior to 1995 and all fm8700 series exit devices 14" = “j” rail

• adding a r56 kit to a 55- rail, the 55- switch will be eliminated. 20-1/2" = “g” rail
• for 55-56- rail assemblies, use either a 55-r56 kit or a r56 kit with a 855 kit
• r56a & r56b kits can be used with 855 request to exit kit or 816 cylinder dogging kits
• kits require a minimum insert length of 5" for 56- & 7" for 16-56- for the electronics
options:
 19- push rail less the black lexan touch pad
 55- non-contact request to exit switch
 hk- hex key dogging to allow for manual dogging of the device
 sg- microshield® antimicrobial clear powder coat (only available with 15, 26d and 32d finishes)
how to order: r56a (kit #) x f (rail size) x 32d (finish);
kit includes: motor bracket & push rail assy, motor controller & fasteners



 1-800-727-5477 • www.sargentlock.com
 57 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 58, ' Electric Dogging Option (58-)
 80 Series


 58- Electric Dogging
 Libraries, auditoriums, theaters, courtrooms, churches and schools benefit from the convenience of electric dogging (unlocking). When the
 58-80 Series exit device is energized and the push rail is depressed, it will continuously hold the push rail down and the latch(es) will be held
 retracted.
 When the device is de-energized or power is interrupted, the latch(es) will extend. This feature is ideal for areas that require the silent
 operation of exit device hardware.



 58- Features
 • Provides quiet ingress and egress when dogged • Available for all door widths
 • Standard electric hinge - no special power transfer required • See McKINNEY’s Transfer Device Solutions Catalog for QC Hinge
 • Manual hex key dogging provided on non-fire rated devices and cable requirements

 • UL Listed for Panic and Fire (12-) • Order as a 58- option (e.g., 58-8813F x ETJ x 32D x 36" Door)

 • Holding force 70 lbs. min.
 • Power Requirements: 24VDC regulated/filtered power supply Optional Accessories
 (LSP-12-24) • 4370 Key Switch
 • Current draw: .2 amp • 3287 Door Status Switch
 • Available for all 80 Series Devices, except FM8700 Devices • LSP-12-24 Power Supply
 • See page 74 for compatible options




 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 58 1-800-727-5477 • www.sargentlock.com
', 1597, 1, ' electric dogging option (58-)
 80 series


 58- electric dogging
 libraries, auditoriums, theaters, courtrooms, churches and schools benefit from the convenience of electric dogging (unlocking). when the
 58-80 series exit device is energized and the push rail is depressed, it will continuously hold the push rail down and the latch(es) will be held
 retracted.
 when the device is de-energized or power is interrupted, the latch(es) will extend. this feature is ideal for areas that require the silent
 operation of exit device hardware.



 58- features
 • provides quiet ingress and egress when dogged • available for all door widths
 • standard electric hinge - no special power transfer required • see mckinney’s transfer device solutions catalog for qc hinge
 • manual hex key dogging provided on non-fire rated devices and cable requirements

 • ul listed for panic and fire (12-) • order as a 58- option (e.g., 58-8813f x etj x 32d x 36" door)

 • holding force 70 lbs. min.
 • power requirements: 24vdc regulated/filtered power supply optional accessories
 (lsp-12-24) • 4370 key switch
 • current draw: .2 amp • 3287 door status switch
 • available for all 80 series devices, except fm8700 devices • lsp-12-24 power supply
 • see page 74 for compatible options




 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 58 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 59, 'ElectroGuard Delayed Egress Option
(59-)
80 Series


59- Self Contained Delayed Egress Device
Commonly used in schools, nursing homes, shopping centers and libraries, delayed egress exit devices provide a means of monitoring egress
to prevent unauthorized exit. When the exit device push pad is depressed, the 59-80 Series delayed egress exit device sounds an alarm from
the rail to alert personnel that someone is attempting egress. The exit device stays secure for fifteen seconds, allowing time for personnel to
respond.
Momentary release for egress (adjustable for 5, 10, 20 or 40 seconds) is provided by a cylinder on the rail or from a remote location. When the
fire alarm system is activated (if connected), the exit device disarms and allows immediate egress.
Note: As of February 2014, the 59- option has a new design. The updated 59- functionalities utilize new sensor technologies and is only
available for order as a complete device. Component upgrades are not offered with prior generation products because wire harnesses are not
backwards compatible. When replacing an existing device with an updated one, there is no change to door templating or mounting

59- Features
Compliance
• Conforms to NFPA 101 Special Locking Arrangements
• Available in UL Listed Panic and Fire Rated (12- option) devices
• UL294 Listed for Special Locking Arrangements
• When ordered with BC- option, complies with BOCA code relating to delayed egress. Requires door status switch (3287) ordered separately

Operation
• Depressing the push rail for one second or longer initiates an alarm
• LED visual notification system for easy identification of armed device; LED lights are field-selectable as red or green
• Momentary or maintained egress with key OR from a remote location




 07/25
• Alarm disabled by key in the rail OR by remote reset
• Alarm sounds for fifteen seconds during unauthorized egress; after fifteen seconds




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 lock releases. 30 second delay available with written permission of Authority
 having Jurisdiction
• Field adjustable nuisance delay (0 or 1 second)
• External inhibit features with authorized egress, card reader access and scheduled
 delayed egress from access control panel
Specifications
• 
 Rod guards must be used on surface vertical rod devices.
 Consult factory for more information
• Standard size 41 mortise cylinder in rail
• Field adjustable momentary time delay preset for five seconds at factory
• 80dB horn enclosed in rail assembly
• Uses standard electric hinge - no special power transfer required
• Guarded & monitored latch and rail standard
• Power Requirements: 24VDC regulated/filtered power supply
• Key override capabilities
• Current draw: .2 amp. nominal, .5 amp (max) with optional features
• Minimum Door Widths:
 - Wide Stile Door 32"




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 - Narrow Stile Door 32"
• Ability to gang up to 12 doors
• Shipped with decal “Emergency Exit Only. Push until alarm sounds. Door can be opened in 15 seconds”
• See McKINNEY’s Transfer Device Solutions Catalog for QC Hinge and cable requirements
• Available for all 80 Series devices, except LP, LR, LS, SP8600, FM, ND8700, MS, and HC8800 Devices
• Not compatible with 8700 SVR devices utilizing a 300 series Auxiliary Control
• Order as a 59- option (e.g., 59-8813F x ETJ x 32D x 36" Door)
• See page 74 for compatible options

Installation & Maintenance
• Diagnostic LEDs on PC board for easy troubleshooting




 1-800-727-5477 • www.sargentlock.com
 59 90641
', 3720, 1, 'electroguard delayed egress option
(59-)
80 series


59- self contained delayed egress device
commonly used in schools, nursing homes, shopping centers and libraries, delayed egress exit devices provide a means of monitoring egress
to prevent unauthorized exit. when the exit device push pad is depressed, the 59-80 series delayed egress exit device sounds an alarm from
the rail to alert personnel that someone is attempting egress. the exit device stays secure for fifteen seconds, allowing time for personnel to
respond.
momentary release for egress (adjustable for 5, 10, 20 or 40 seconds) is provided by a cylinder on the rail or from a remote location. when the
fire alarm system is activated (if connected), the exit device disarms and allows immediate egress.
note: as of february 2014, the 59- option has a new design. the updated 59- functionalities utilize new sensor technologies and is only
available for order as a complete device. component upgrades are not offered with prior generation products because wire harnesses are not
backwards compatible. when replacing an existing device with an updated one, there is no change to door templating or mounting

59- features
compliance
• conforms to nfpa 101 special locking arrangements
• available in ul listed panic and fire rated (12- option) devices
• ul294 listed for special locking arrangements
• when ordered with bc- option, complies with boca code relating to delayed egress. requires door status switch (3287) ordered separately

operation
• depressing the push rail for one second or longer initiates an alarm
• led visual notification system for easy identification of armed device; led lights are field-selectable as red or green
• momentary or maintained egress with key or from a remote location




 07/25
• alarm disabled by key in the rail or by remote reset
• alarm sounds for fifteen seconds during unauthorized egress; after fifteen seconds




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 lock releases. 30 second delay available with written permission of authority
 having jurisdiction
• field adjustable nuisance delay (0 or 1 second)
• external inhibit features with authorized egress, card reader access and scheduled
 delayed egress from access control panel
specifications
• 
 rod guards must be used on surface vertical rod devices.
 consult factory for more information
• standard size 41 mortise cylinder in rail
• field adjustable momentary time delay preset for five seconds at factory
• 80db horn enclosed in rail assembly
• uses standard electric hinge - no special power transfer required
• guarded & monitored latch and rail standard
• power requirements: 24vdc regulated/filtered power supply
• key override capabilities
• current draw: .2 amp. nominal, .5 amp (max) with optional features
• minimum door widths:
 - wide stile door 32"




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 - narrow stile door 32"
• ability to gang up to 12 doors
• shipped with decal “emergency exit only. push until alarm sounds. door can be opened in 15 seconds”
• see mckinney’s transfer device solutions catalog for qc hinge and cable requirements
• available for all 80 series devices, except lp, lr, ls, sp8600, fm, nd8700, ms, and hc8800 devices
• not compatible with 8700 svr devices utilizing a 300 series auxiliary control
• order as a 59- option (e.g., 59-8813f x etj x 32d x 36" door)
• see page 74 for compatible options

installation & maintenance
• diagnostic leds on pc board for easy troubleshooting




 1-800-727-5477 • www.sargentlock.com
 59 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 60, ' Electrified and Monitored (54-) ET Trims
 and Power Supplies
 80 Series

 Electro-Mechanical ET Lever Handle Controls
 EcoFlex® ET trim provides remote means of locking and unlocking of the lever. This trim operates from 12-24 VDC. Rim and Mortise Exit
 Devices are available with cylinder override. Cylinder override can be added to the other series with the use of a 100 or 300 series Auxiliary
 Control, except NB8700 devices.
 73 & 74 Function ET Trim 75 & 76 Function ET Trim
 • Available for all 80 Series Exit Devices • Available for all 80 Series Exit Devices
 • Requires a McKINNEY QC8 Hinge for EcoFlex® ET Trims • Requires a McKINNEY QC8 Hinge for Ecoflex
 and/or 54- option ET Trims and/or 54- option
 • Features EcoFlex® • Features EcoFlex® technology
 • Voltage: Operates from 12-24 VDC. (Voltage must be • Voltage: Operates from 12-24 VDC. (Voltage
 specified) must be specified)
 • Actuator Draw = 400mA inrush / 15mA continuous • Actuator Draw = 400mA inrush / 15mA
 @ 12VDC / 24VDC continuous @ 12VDC / 24VDC
 •  Operating Temp.: Max. 151°F (66°C) Min -31°F (-35°C). •  Operating Temp.: Max. 151°F (66°C) Min -31°F (-35°C).
 •  Full wave rectification installed inside the ET Control • Full wave rectification installed inside the ET Control
 • UL and cUL listed for use on fire doors • UL and cUL listed for use on fire doors
 • 5lb. pressure released (5CH) option available. • 5lb. pressure released (5CH) option available.
 • Field reversible • Field reversible
 • EcoFlex® Trim is specified by the product function • EcoFlex® Trim is specified by the product function
 • 73 Function - Fail Safe - Lever is unlocked when power is off - • 75 Function - Fail Safe - Lever is unlocked when power is off
 no cylinder override with cylinder override




 07/25
 • 74 Function - Fail Secure - Lever is locked when power is off - • 76 Function - Fail Secure - Lever is locked when power is off
 no cylinder override with cylinder override
 • Cylinder override available with the use of 100 or 300 Series Auxiliary • Key retracts latch mechanically




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Control, except NB8700 devices Note: Repeated operation at voltage exceeding +/- 10% is
 Note: Repeated operation at voltage exceeding +/- 10% is not recommended not recommended

 54- Option- Lever Monitoring
 • Available with all 80 Series exit devices x ET trim with these functions 06, 13, 15, 16, 73, 74, 75 & 76
 • Requires a McKINNEY QC8 Hinge for 54- and/or EcoFlex® ET Trims
 • Switch type SPDT form “C” contacts
 • 30VDC @ 2 Amp. maximum rating
 • Monitors lever rotation, can be incorporated into alarm systems or in conjunction with an electromagnet
 • Must specify hand, non-reversible
 • Not available with Freewheeling Trim

 LSP-12-24 Power Supply
 Operation Listings
 • LifeSafety Power supplies are designed to provide reliable • UL294, UL603, UL1076
 filtered and regulated power for long life to a variety of electrified • ULC S318, ULC S319
 hardware components. Recommended for the 58-, 56-, 59- exit
 devices option and electric trim. Applications




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 • 59- Delayed Egress
 Features • 58- Electric Dogging
 • Selectable voltage output between 12V and 24V with a single • EcoFlex® Electrified Trim
 switch • 56- Motorized Electric Latch
 • Internal Back-Up battery charging circuit * Retraction
 • Regulated and filtered, fuse protected outputs
 • Each output can be individually turned on and off via a jumper * Note: Batteries are not included
 • Power status of each output is shown by an LED with the power supply
 • Rugged steel enclosure
 • Fire alarm interface included – Dry contacts NO/NC, 9-33VDC,
 3-15mA Model No. Description
 LSP-12-24 12V – 6AMP 24V – 3AMP Power Supply
 Electrical Specifications
 • Inputs: 120VAC
 • Outputs: 12VDC @ 6 Amp or 24VDC @3 Amp
 • 8 Total Outputs


90641
 60 1-800-727-5477 • www.sargentlock.com
', 4116, 1, ' electrified and monitored (54-) et trims
 and power supplies
 80 series

 electro-mechanical et lever handle controls
 ecoflex® et trim provides remote means of locking and unlocking of the lever. this trim operates from 12-24 vdc. rim and mortise exit
 devices are available with cylinder override. cylinder override can be added to the other series with the use of a 100 or 300 series auxiliary
 control, except nb8700 devices.
 73 & 74 function et trim 75 & 76 function et trim
 • available for all 80 series exit devices • available for all 80 series exit devices
 • requires a mckinney qc8 hinge for ecoflex® et trims • requires a mckinney qc8 hinge for ecoflex
 and/or 54- option et trims and/or 54- option
 • features ecoflex® • features ecoflex® technology
 • voltage: operates from 12-24 vdc. (voltage must be • voltage: operates from 12-24 vdc. (voltage
 specified) must be specified)
 • actuator draw = 400ma inrush / 15ma continuous • actuator draw = 400ma inrush / 15ma
 @ 12vdc / 24vdc continuous @ 12vdc / 24vdc
 •  operating temp.: max. 151°f (66°c) min -31°f (-35°c). •  operating temp.: max. 151°f (66°c) min -31°f (-35°c).
 •  full wave rectification installed inside the et control • full wave rectification installed inside the et control
 • ul and cul listed for use on fire doors • ul and cul listed for use on fire doors
 • 5lb. pressure released (5ch) option available. • 5lb. pressure released (5ch) option available.
 • field reversible • field reversible
 • ecoflex® trim is specified by the product function • ecoflex® trim is specified by the product function
 • 73 function - fail safe - lever is unlocked when power is off - • 75 function - fail safe - lever is unlocked when power is off
 no cylinder override with cylinder override




 07/25
 • 74 function - fail secure - lever is locked when power is off - • 76 function - fail secure - lever is locked when power is off
 no cylinder override with cylinder override
 • cylinder override available with the use of 100 or 300 series auxiliary • key retracts latch mechanically




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 control, except nb8700 devices note: repeated operation at voltage exceeding +/- 10% is
 note: repeated operation at voltage exceeding +/- 10% is not recommended not recommended

 54- option- lever monitoring
 • available with all 80 series exit devices x et trim with these functions 06, 13, 15, 16, 73, 74, 75 & 76
 • requires a mckinney qc8 hinge for 54- and/or ecoflex® et trims
 • switch type spdt form “c” contacts
 • 30vdc @ 2 amp. maximum rating
 • monitors lever rotation, can be incorporated into alarm systems or in conjunction with an electromagnet
 • must specify hand, non-reversible
 • not available with freewheeling trim

 lsp-12-24 power supply
 operation listings
 • lifesafety power supplies are designed to provide reliable • ul294, ul603, ul1076
 filtered and regulated power for long life to a variety of electrified • ulc s318, ulc s319
 hardware components. recommended for the 58-, 56-, 59- exit
 devices option and electric trim. applications




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 • 59- delayed egress
 features • 58- electric dogging
 • selectable voltage output between 12v and 24v with a single • ecoflex® electrified trim
 switch • 56- motorized electric latch
 • internal back-up battery charging circuit * retraction
 • regulated and filtered, fuse protected outputs
 • each output can be individually turned on and off via a jumper * note: batteries are not included
 • power status of each output is shown by an led with the power supply
 • rugged steel enclosure
 • fire alarm interface included – dry contacts no/nc, 9-33vdc,
 3-15ma model no. description
 lsp-12-24 12v – 6amp 24v – 3amp power supply
 electrical specifications
 • inputs: 120vac
 • outputs: 12vdc @ 6 amp or 24vdc @3 amp
 • 8 total outputs


90641
 60 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 61, 'ET Trim, Levers and Pulls
80 Series


ET Lever Controls A Lever B Lever
 • Handed
 3-9/16" MAX*
 (90mm)




 13/16"
 13/16" (21mm)
 3-1/2" (21mm) 3-1/8"
 8-1/16" (89mm)
 (205mm) (79mm)



 4-1/2"
 (114mm) 4-5/8"
 (117mm)

 1-13/16" 13/16"
 (46mm) (21mm) E Lever F Lever



 *Projection varies by lever design.
 2-1/2" (63mm) projection with
 L Lever 13/16"
 13/16"
 (21mm) (21mm)
 3-1/4"




 07/25
 3"
Note: ET suffixes required when ordering ET (83mm)
 (76mm)
trim without an exit device, see page 73 for
complete details




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 4" 4"
 (102mm) (102mm)



J Lever* L Lever* P Lever*




 13/16" 13/16"
 (21mm) 13/16"
 (21mm)
 1/2" 2-3/8" 1/2" 3" (21mm)
 2-3/4" (13mm) 5/16"
 (13mm) (60mm) (76mm)
 (70mm) (8mm)

 4-1/2" 4-15/16"
 4-11/16" (114mm) (125mm)
 (119mm)


W Lever Pulls
 2-3/4" 862 863 864




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 (70mm)
 4" 4" 3-1/2"
 (102mm) (102mm) (89mm)


 1-3/4"
 13/16" (44mm)
 10" 18" 10"
 (21mm) (254mm) (457mm) (254mm)
 3" MTG MTG MTG Holes
 (76mm) Holes Holes



 4-11/16" 90°
 1" Dia. 3/4" Dia.
 (119mm) (19mm)
 (25mm)
* Lever returns within 1/2" (13mm) of door face 1" Dia.
 (25mm)
 SIDE PROFILE




 1-800-727-5477 • www.sargentlock.com
 61 90641
', 1408, 1, 'et trim, levers and pulls
80 series


et lever controls a lever b lever
 • handed
 3-9/16" max*
 (90mm)




 13/16"
 13/16" (21mm)
 3-1/2" (21mm) 3-1/8"
 8-1/16" (89mm)
 (205mm) (79mm)



 4-1/2"
 (114mm) 4-5/8"
 (117mm)

 1-13/16" 13/16"
 (46mm) (21mm) e lever f lever



 *projection varies by lever design.
 2-1/2" (63mm) projection with
 l lever 13/16"
 13/16"
 (21mm) (21mm)
 3-1/4"




 07/25
 3"
note: et suffixes required when ordering et (83mm)
 (76mm)
trim without an exit device, see page 73 for
complete details




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 4" 4"
 (102mm) (102mm)



j lever* l lever* p lever*




 13/16" 13/16"
 (21mm) 13/16"
 (21mm)
 1/2" 2-3/8" 1/2" 3" (21mm)
 2-3/4" (13mm) 5/16"
 (13mm) (60mm) (76mm)
 (70mm) (8mm)

 4-1/2" 4-15/16"
 4-11/16" (114mm) (125mm)
 (119mm)


w lever pulls
 2-3/4" 862 863 864




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 (70mm)
 4" 4" 3-1/2"
 (102mm) (102mm) (89mm)


 1-3/4"
 13/16" (44mm)
 10" 18" 10"
 (21mm) (254mm) (457mm) (254mm)
 3" mtg mtg mtg holes
 (76mm) holes holes



 4-11/16" 90°
 1" dia. 3/4" dia.
 (119mm) (19mm)
 (25mm)
* lever returns within 1/2" (13mm) of door face 1" dia.
 (25mm)
 side profile




 1-800-727-5477 • www.sargentlock.com
 61 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 62, ' Coastal Series Levers and
 Thumbpiece Pulls
 80 Series


 • Coastal Series™ levers can be used with R - Rockport™ S - Sanibel™
 all SARGENT 80 Series exit devices with ET trim
 • All levers – solid cast brass
 • All standard functions available
 • Finishes available: 03, 04, 09, 10, 10B, 10BE,
 10BL, 14, 15, 20D, 26, 26D, BSP
 4-1/16"
 2-1/2"
 (103mm)
 (64mm)

 13/16" 13/16"
 (21mm) (21mm)

 4-1/4" 4-1/2"
 (108mm) (114mm)
 Y - Yarmouth™ G - Gulfport™ • Specify hand when ordering




 3-1/4" 3-1/2"
 (83mm) (89mm)

 13/16" 13/16"
 (21mm) (21mm)


 4-1/2" 4-1/2"




 07/25
 (114mm) (114mm)
 • Specify hand when ordering • Specify hand when ordering

 Pulls and Thumbpieces Trims




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 These trims are through-bolted, creating perfect alignment of center case, thumbpiece and cylinder, as required. Through-bolts pass through
 the chassis of the devices and are bolted directly to the trim. FSL, FSW, MSL and PSB pulls are used with 12- 8804 and 8804 only, they are
 identical to FLL, FLW, MAL and PTB pulls except the cylinder hole is located 3/8" (9mm) lower. The 802-PTB plate is a flat plate which can be
 used to cover existing door preps and is as ANSI/BHMA function 01.
 FLL/FSL FLW/FSW MAL/MSL
 1-3/4" 2-1/16" 1-3/4" 2-1/16"
 (44mm) (52mm) (44mm) (52mm) 2-5/8" 2-1/16"
 (67mm) (52mm)




 14-5/16"
 (364mm) 14-5/16" 14-1/4"
 (364mm) (362mm)




 6"
 152mm
 6" 6"
 (152mm) (152mm)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 STS PTB/PSB 802-PTB
 3-1/2" 1-15/16" 3-1/2"
 (89mm) (49mm) (98mm)
 1-5/8" 2-1/4" 2-1/16"
 (41mm) (57mm) (52mm)




 15" 15"
 (381mm) (381mm)
 9-5/8" 7-3/16"
 (244mm) (198mm)
 6" 6"
 (152mm) 152mm




90641
 62 1-800-727-5477 • www.sargentlock.com
', 1902, 1, ' coastal series levers and
 thumbpiece pulls
 80 series


 • coastal series™ levers can be used with r - rockport™ s - sanibel™
 all sargent 80 series exit devices with et trim
 • all levers – solid cast brass
 • all standard functions available
 • finishes available: 03, 04, 09, 10, 10b, 10be,
 10bl, 14, 15, 20d, 26, 26d, bsp
 4-1/16"
 2-1/2"
 (103mm)
 (64mm)

 13/16" 13/16"
 (21mm) (21mm)

 4-1/4" 4-1/2"
 (108mm) (114mm)
 y - yarmouth™ g - gulfport™ • specify hand when ordering




 3-1/4" 3-1/2"
 (83mm) (89mm)

 13/16" 13/16"
 (21mm) (21mm)


 4-1/2" 4-1/2"




 07/25
 (114mm) (114mm)
 • specify hand when ordering • specify hand when ordering

 pulls and thumbpieces trims




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 these trims are through-bolted, creating perfect alignment of center case, thumbpiece and cylinder, as required. through-bolts pass through
 the chassis of the devices and are bolted directly to the trim. fsl, fsw, msl and psb pulls are used with 12- 8804 and 8804 only, they are
 identical to fll, flw, mal and ptb pulls except the cylinder hole is located 3/8" (9mm) lower. the 802-ptb plate is a flat plate which can be
 used to cover existing door preps and is as ansi/bhma function 01.
 fll/fsl flw/fsw mal/msl
 1-3/4" 2-1/16" 1-3/4" 2-1/16"
 (44mm) (52mm) (44mm) (52mm) 2-5/8" 2-1/16"
 (67mm) (52mm)




 14-5/16"
 (364mm) 14-5/16" 14-1/4"
 (364mm) (362mm)




 6"
 152mm
 6" 6"
 (152mm) (152mm)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 sts ptb/psb 802-ptb
 3-1/2" 1-15/16" 3-1/2"
 (89mm) (49mm) (98mm)
 1-5/8" 2-1/4" 2-1/16"
 (41mm) (57mm) (52mm)




 15" 15"
 (381mm) (381mm)
 9-5/8" 7-3/16"
 (244mm) (198mm)
 6" 6"
 (152mm) 152mm




90641
 62 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 63, 'Studio Collection Levers
80 Series


Studio Collection trim is available in a broad array of designs and finishes. It allows for uniformity throughout a facility using the 8200, R8200 and
7900 Series Mortise Locks, Access Control Products, 80 Series Exit Devices, DL and RDL Series Tubular Locks.
All levers meet ADA compliance for national codes. Visit the online Decorative Hardware Product Selector at selector.sargentlock.com to mix and
match styles and finishes.


Centro Series Notting Hill Series Aventura Series
 (MA & MO are Non-Handed Levers)




 MD MA2,3 MB




 MJ MQ2 ME




 MP2 MT2 MF




 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 NF¹
 ND¹ MO2,3




 NJ¹ MZ1,2 MG




 GT MI




 MW¹




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
¹ Lever returns within 1/2" (13mm) of door face
2
 Not available in 32D or 32 finish
3
 MA & MO are Non-Handed Levers)




 1-800-727-5477 • www.sargentlock.com
 63 90641
', 1097, 1, 'studio collection levers
80 series


studio collection trim is available in a broad array of designs and finishes. it allows for uniformity throughout a facility using the 8200, r8200 and
7900 series mortise locks, access control products, 80 series exit devices, dl and rdl series tubular locks.
all levers meet ada compliance for national codes. visit the online decorative hardware product selector at selector.sargentlock.com to mix and
match styles and finishes.


centro series notting hill series aventura series
 (ma & mo are non-handed levers)




 md ma2,3 mb




 mj mq2 me




 mp2 mt2 mf




 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 nf¹
 nd¹ mo2,3




 nj¹ mz1,2 mg




 gt mi




 mw¹




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
¹ lever returns within 1/2" (13mm) of door face
2
 not available in 32d or 32 finish
3
 ma & mo are non-handed levers)




 1-800-727-5477 • www.sargentlock.com
 63 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 64, ' Studio Collection Levers
 80 Series


 Odéon Series Gramercy Series2 Wooster Square3
 (Handed Levers)



 RCM2 H0013
 MN4,5



 MH4,5 RAL2 H0023



 MS4,5 REM2 H0033



 RAM2 H0043
 MU4,5


 MV4,5 RAS2 H005¹,3




 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 RAG2 H006¹,3
 NU1,4,5



 RGM2
 WG


 H015 H0072



 H0161 H0082,5




 H017 H0112




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 H018


 ¹ Lever returns within 1/2" (13mm) of door face
 ² Gramercy levers are customized. See page 65 for ordering information
 ³ H 003-H006 - Contain white or black polycarbonate inserts. Not available with
 MicroShield antimicrobial coating.
 ®



 4
 Not available in 32 or 32D finish
 5
 Handed Levers



90641
 64 1-800-727-5477 • www.sargentlock.com
', 925, 1, ' studio collection levers
 80 series


 odéon series gramercy series2 wooster square3
 (handed levers)



 rcm2 h0013
 mn4,5



 mh4,5 ral2 h0023



 ms4,5 rem2 h0033



 ram2 h0043
 mu4,5


 mv4,5 ras2 h005¹,3




 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 rag2 h006¹,3
 nu1,4,5



 rgm2
 wg


 h015 h0072



 h0161 h0082,5




 h017 h0112




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 h018


 ¹ lever returns within 1/2" (13mm) of door face
 ² gramercy levers are customized. see page 65 for ordering information
 ³ h 003-h006 - contain white or black polycarbonate inserts. not available with
 microshield antimicrobial coating.
 ®



 4
 not available in 32 or 32d finish
 5
 handed levers



90641
 64 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 65, 'How to Order Gramercy Series Levers
80 Series

Gramercy Series Levers




REM, RGM RCM RAG, RAL, RAM**, RAS

Gramercy Finish Codes
 ANSI/BHMA Finish SARGENT Finish Gramercy Code* Description
 630 32D 30 Satin Stainless Steel
 629 32 29 Bright Stainless Steel
 613E 10BE 3E Dark Oxidized Satin Bronze, Equivalent
 N/A BSP BS Black Suede Powder Coat
 N/A WSP WS White Suede Powder Coat
 N/A N/A BK Black (Santoprene™ or leather insert)
 N/A N/A BN Brown (leather insert)
*Code used to specify Gramercy Series finishes only. Use available finishes list to specify desired finish when ordering.




 07/25
Gramercy Lever Descriptions & Available Finishes




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Lever Designation Lever Description Available Finishes (AS ORDERED)
 RAG Grooved Insert 3030, 2929, 2930, 3029, 3E3E, BSBS or WSWS
 RAL Leather Insert 30BK, 30BN, 29BK, 29BN, 3EBK3E, BSBKBS, WSBKWS, 3EBN3E, BSBNBS or WSBNWS
 RAM Satin Metal Insert 2930** only (SEE NOTATION)
 RAS Santoprene Insert 30BK, 29BK, 3E3E, BSBS or WSWS
 RCM Raised Band 2930, 2929, 3030, 3029, 3E3E, BSBS or WSWS
 REM Plain 2929, 3030, 3E3E, BSBS or WSWS
 RGM Two Grooves 2929, 3030, 3E3E, BSBS or WSWS

**Notes for two-tone finishes:
• 2930 Finish: grip of lever is 32D, balance of lever is 32. Rose/escutcheon and lock finish will be 32.
• 3029 Finish: grip of lever is 32, balance of lever is 32D. Rose/escutcheon and lock finish will be 32D.

To order Gramercy Series levers with SARGENT products, see the examples below. When specifying finish, use the last two digits of the BHMA
standard finish code, i.e. use “29” for polished stainless, BHMA finish 629

Sample order on how to specify an




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
Exit Device with Gramercy levers Gramercy Lever information
 Rail Voltage Inside Door Opening
Options Series Function Size Trim Lever Finish Hand AFF
 Finish Width Height

 Select
 Specified RHR Select For
 from Above
 for Leather Bright stainless steel with RH, from vertical
 Select from 80 Series catalog 80 Finished
 electrical insert brown leather LHR, or 80 Series rod
 Series Floor
 functions LH catalog devices
 catalog


 10- 87 73 F 12VDC F RAL 29 BN 29 RH 32D 36" 84" 41"




 1-800-727-5477 • www.sargentlock.com
 65 90641
', 2425, 1, 'how to order gramercy series levers
80 series

gramercy series levers




rem, rgm rcm rag, ral, ram**, ras

gramercy finish codes
 ansi/bhma finish sargent finish gramercy code* description
 630 32d 30 satin stainless steel
 629 32 29 bright stainless steel
 613e 10be 3e dark oxidized satin bronze, equivalent
 n/a bsp bs black suede powder coat
 n/a wsp ws white suede powder coat
 n/a n/a bk black (santoprene™ or leather insert)
 n/a n/a bn brown (leather insert)
*code used to specify gramercy series finishes only. use available finishes list to specify desired finish when ordering.




 07/25
gramercy lever descriptions & available finishes




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 lever designation lever description available finishes (as ordered)
 rag grooved insert 3030, 2929, 2930, 3029, 3e3e, bsbs or wsws
 ral leather insert 30bk, 30bn, 29bk, 29bn, 3ebk3e, bsbkbs, wsbkws, 3ebn3e, bsbnbs or wsbnws
 ram satin metal insert 2930** only (see notation)
 ras santoprene insert 30bk, 29bk, 3e3e, bsbs or wsws
 rcm raised band 2930, 2929, 3030, 3029, 3e3e, bsbs or wsws
 rem plain 2929, 3030, 3e3e, bsbs or wsws
 rgm two grooves 2929, 3030, 3e3e, bsbs or wsws

**notes for two-tone finishes:
• 2930 finish: grip of lever is 32d, balance of lever is 32. rose/escutcheon and lock finish will be 32.
• 3029 finish: grip of lever is 32, balance of lever is 32d. rose/escutcheon and lock finish will be 32d.

to order gramercy series levers with sargent products, see the examples below. when specifying finish, use the last two digits of the bhma
standard finish code, i.e. use “29” for polished stainless, bhma finish 629

sample order on how to specify an




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
exit device with gramercy levers gramercy lever information
 rail voltage inside door opening
options series function size trim lever finish hand aff
 finish width height

 select
 specified rhr select for
 from above
 for leather bright stainless steel with rh, from vertical
 select from 80 series catalog 80 finished
 electrical insert brown leather lhr, or 80 series rod
 series floor
 functions lh catalog devices
 catalog


 10- 87 73 f 12vdc f ral 29 bn 29 rh 32d 36" 84" 41"




 1-800-727-5477 • www.sargentlock.com
 65 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 66, ' Anti-Vandal Trim, 988 Surface Bolt,
 ET Plates and Dummy Rails
 80 Series


 Anti-Vandal Trim Features
 1-1/4" Dia. • Heavy duty 12 gauge stainless steel in 32D finish
 (32mm)
 • Through-bolted for added strength
 3-1/8" • Handed – Specify RHR or LHR
 (79mm)
 • ADA Compliant
 • #34 Rim Cylinder supplied for 8804
 10-9/16" • #41 Mortise Cylinder supplied for 8904
 (268mm)
 • Night Latch and Dummy Functions available
 • Available for MD & WD8610, 8710, 8804, 8810,
 8904 & 8910 Devices
 •  Options not available with AV trim: 1-, 31, 49, 50,
 3-9/16"
 68, 69, 76, 77, 85, 86, 87, DX & SG
 (90mm)
 8-3/16"
 • Without protective lip for inactive door
 (208mm)
 •  AVT Retrofit Kit works easily with existing product
 with minor prep modification
 Designed for exterior doors that require •  Order by part number (826, 824, 821 or 827) as
 extra security or resistance to vandalism, determined by product & function below
 anti-vandal trim (AVT) plates have an
 extended lip on the active side of the
 Part Number Description Application
 door to provide extra protection for the
 latchbolt. A matte plastic coated grip Cylinder, but No
 provides a comfortable pull over wide 826 Protective Lip
 8804 Mfg after 02-2001




 07/25
 temperature ranges. Fully through-bolted
 Protective Lip & 8904; also 8804 Mfg
 with no exposed exterior fasteners for a 824
 cleaner look and increased security. Cylinder before 02-2001




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 No Protective Lip MD & WD8610, 8710
 821
 & No Cylinder and 8810
 Protective Lip &
 827 8910
 No Cylinder

 988 Surface Bolt Kit 821 for use on all inactive leafs



 ET Cover Plate 8893 Dummy Rail
 For all ET functions
 3-1/2"
 (89mm)


 • Designed for severe windload (Hurricane A decorative push bar for vestibule door
 Code) environments where surface bolts applications where continuity of design
 are is desired, but no exit device is required.
 required (e.g., on inactive doors) 8-3/4"
 Outside dummy trim available on order.
 (222mm)
 • Tested to Dade County protocols • Order as a: 8893 x finish; Specify door
 • Listed to UL 10C for use on fire rated width and door stile width when ordering.
 door assemblies. Refer to codes for 
 locations where surface bolts are allowed
 8895 Active Dummy Rail




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 on fire doors This plate is designed to be mounted
 • All steel construction for maximum behind the ET control to cover a stock
 strength and heavy duty use hollow metal cutout
 – Full 3/4" (19mm) square, 12" (305mm) • Order as a: 68-0657 x finish
 bolt with 1-1/4" (32mm) throw
 – Bright zinc-plated finish
 – Jimmy-resistant design locks bolt 809 Touchpad Kit
 automatically when thrown; released Push rail operates on this rail to simulate
 by pressing knob toward door while • Lexan touchpad replacement kit for active doors. Can be used with dummy trim.
 retracting all 80 Series push rails • Order as a: 8885 x Finish; specify door
 – Bolt can be locked in retracted or • Direct replacement – uses existing width and door stile width when ordering.
 thrown position mounting holes • Available with Request-to-Exit (REX)
 • Angle (L shaped) and mortise strike with • Order as a: 809 Touch Pad signaling switch; specify 55-8895 x Finish
 mounting hardware supplied standard
 • Order as a: 988 Surface Bolt


90641
 66 1-800-727-5477 • www.sargentlock.com
', 3575, 1, ' anti-vandal trim, 988 surface bolt,
 et plates and dummy rails
 80 series


 anti-vandal trim features
 1-1/4" dia. • heavy duty 12 gauge stainless steel in 32d finish
 (32mm)
 • through-bolted for added strength
 3-1/8" • handed – specify rhr or lhr
 (79mm)
 • ada compliant
 • #34 rim cylinder supplied for 8804
 10-9/16" • #41 mortise cylinder supplied for 8904
 (268mm)
 • night latch and dummy functions available
 • available for md & wd8610, 8710, 8804, 8810,
 8904 & 8910 devices
 •  options not available with av trim: 1-, 31, 49, 50,
 3-9/16"
 68, 69, 76, 77, 85, 86, 87, dx & sg
 (90mm)
 8-3/16"
 • without protective lip for inactive door
 (208mm)
 •  avt retrofit kit works easily with existing product
 with minor prep modification
 designed for exterior doors that require •  order by part number (826, 824, 821 or 827) as
 extra security or resistance to vandalism, determined by product & function below
 anti-vandal trim (avt) plates have an
 extended lip on the active side of the
 part number description application
 door to provide extra protection for the
 latchbolt. a matte plastic coated grip cylinder, but no
 provides a comfortable pull over wide 826 protective lip
 8804 mfg after 02-2001




 07/25
 temperature ranges. fully through-bolted
 protective lip & 8904; also 8804 mfg
 with no exposed exterior fasteners for a 824
 cleaner look and increased security. cylinder before 02-2001




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 no protective lip md & wd8610, 8710
 821
 & no cylinder and 8810
 protective lip &
 827 8910
 no cylinder

 988 surface bolt kit 821 for use on all inactive leafs



 et cover plate 8893 dummy rail
 for all et functions
 3-1/2"
 (89mm)


 • designed for severe windload (hurricane a decorative push bar for vestibule door
 code) environments where surface bolts applications where continuity of design
 are is desired, but no exit device is required.
 required (e.g., on inactive doors) 8-3/4"
 outside dummy trim available on order.
 (222mm)
 • tested to dade county protocols • order as a: 8893 x finish; specify door
 • listed to ul 10c for use on fire rated width and door stile width when ordering.
 door assemblies. refer to codes for 
 locations where surface bolts are allowed
 8895 active dummy rail




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 on fire doors this plate is designed to be mounted
 • all steel construction for maximum behind the et control to cover a stock
 strength and heavy duty use hollow metal cutout
 – full 3/4" (19mm) square, 12" (305mm) • order as a: 68-0657 x finish
 bolt with 1-1/4" (32mm) throw
 – bright zinc-plated finish
 – jimmy-resistant design locks bolt 809 touchpad kit
 automatically when thrown; released push rail operates on this rail to simulate
 by pressing knob toward door while • lexan touchpad replacement kit for active doors. can be used with dummy trim.
 retracting all 80 series push rails • order as a: 8885 x finish; specify door
 – bolt can be locked in retracted or • direct replacement – uses existing width and door stile width when ordering.
 thrown position mounting holes • available with request-to-exit (rex)
 • angle (l shaped) and mortise strike with • order as a: 809 touch pad signaling switch; specify 55-8895 x finish
 mounting hardware supplied standard
 • order as a: 988 surface bolt


90641
 66 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 67, 'Cylinder Information
80 Series


 Thicker Doors Specifications
• Convenient for applications requiring durability, improved insulation, and resilience to heavy use.
• Door thicknesses above standard 1-3/4" available over 2.5" to 5" thick based on function limitation below:

Device with Trim
 Device Stile Function Door Thickness
 Narrow 8504
 8804
 8816 Up to 2.5"
 Wide
 8875
 8876
 8506
 8510
 8513
 Narrow
 RIM 8515
 8573




 07/25
 8574
 8806




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 8810
 8813
 Wide Up to 5"
 8815
 8873
 8874
 8706
 8710
 8713
 SVR Wide
 8715
 8773
 8774
Note: Must specify 31- Option and Trim

How to order:
31- 8810 F NEL RHR 32D 5"




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
Device with Auxiliary Control
 Exit Device Stile Trim Function Aux Controls Door Thickness
 8710 306/P313
 SVR Wide 8773 Up to 4.75"
 306
 8774

Note: Must specify 31- Option and Auxiliary Control.

How to order:
31- 8710 306 F RHR 32D 84" 5"




 1-800-727-5477 • www.sargentlock.com
 67 90641
', 1180, 1, 'cylinder information
80 series


 thicker doors specifications
• convenient for applications requiring durability, improved insulation, and resilience to heavy use.
• door thicknesses above standard 1-3/4" available over 2.5" to 5" thick based on function limitation below:

device with trim
 device stile function door thickness
 narrow 8504
 8804
 8816 up to 2.5"
 wide
 8875
 8876
 8506
 8510
 8513
 narrow
 rim 8515
 8573




 07/25
 8574
 8806




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 8810
 8813
 wide up to 5"
 8815
 8873
 8874
 8706
 8710
 8713
 svr wide
 8715
 8773
 8774
note: must specify 31- option and trim

how to order:
31- 8810 f nel rhr 32d 5"




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
device with auxiliary control
 exit device stile trim function aux controls door thickness
 8710 306/p313
 svr wide 8773 up to 4.75"
 306
 8774

note: must specify 31- option and auxiliary control.

how to order:
31- 8710 306 f rhr 32d 84" 5"




 1-800-727-5477 • www.sargentlock.com
 67 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 68, ' Mullions: Aluminum, Steel and
 Electrified
 80 Series



 Aluminum Mullions Electrified
 Product Designation 650A 980 L980 EL980
 Description Removable Removable Lockable Electrical Lockable
 Material Aluminum Aluminum Aluminum Steel
 US28/Satin
 Standard Finish Prime Coat Aluminum Prime Coat Gray Paint
 Anodized Aluminum
 Specify:
 Specify Specify Wall Mounting Kit: 98-2580
 “L980A” Anodized Aluminum
 Options “650A x 10B” “980A” for Anodized US28/
 Specify: “L980A x10B”
 Top Ret Pack :98-2558
 for 313AN to match 10B Satin Aluminum Bottom Ret Pack: 98-2556
 for 313AN to match 10B
 Stk Size 96" 86" 86" 86"
 Max Stk Height 120" 120" 120" 120"
 Pre-prepped 658 Strikes Included No No No
 Cylinder Size Not Required Not Required #41 #46 Only
 T Shaped T Shaped
 Shape 1-1/2" x 2-1/2" Rectangular 2" x 3"
 2-1/2" x 3" 2-1/2" x 3"
 Top Retainer - 511 All Cylinder Options Available
 Includes 651 Stabilizers and For use with Electric Strikes
 Bottom Retainer - 502 Wall Mount Kit 98-2578
 Misc. Information imbedded Weather Stripping and Monitoring, Quick Connect
 Adapter for narrow transom: Top Ret Pack 98-2526
 and Accessories Top Retainer 94-2050 Wiring Supplied




 07/25
 507 - Aluminum Prime Coated Bottom Ret Pack 98-2525
 Bottom Retainer 94-2051 Cylinder Kit 980C2*
 507A - Anodized Aluminum Cylinder Kit 980C1*




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 *Note: Cylinder Kits must be ordered separately


 Steel Mullions
 Product Designations HC980 980S L980S HCL980 12-HD980
 Description Hurricane Code Standard Mullion Lockable Lockable Hurricane Code Heavy Duty
 Material Steel Steel Steel Steel Steel
 Fire Rated Specify 12-HC980 Specify 12-980 Specify 12-L980 Specify 12-HCL980 Specify 12-HD980
 Fire Rated Max
 96" 96" 96" 96" 120"
 Height
 Finish Gray Paint Gray Paint Gray Paint Gray Paint Gray Paint
 Stk Size 86" 86" 86" 86" 120"
 Max Stk Height 96" 120" 120" 96" 120"
 Pre-prepped No No No No No
 #41 Std #41 Std
 Cylinder Size Not Required Not Required Not Required
 (#42 & #43 available) (#42 & #43 available)
 Shape Rectangular 2" x 3" Rectangular 2" x 3" Rectangular 2" x 3" Rectangular 2" x 3" Rectangular 2" x 3"
 For 12-8800 - Channel Iron
 Fire rated for 8''0" x 8''0"
 & Malleable iron top &
 Designed for severe wind paired openings
 bottom retainers. 12-HD980 is for pair of
 load conditions due to Mullions longer than 86" must
 Mullions longer than 86" doors over 8''0" to 10''0" for
 Misc. Information hurricanes or windstorms.
 must be ordered as 12-
 be ordered as 12- option x See Notes Below
 use with 12-8800 Rim Exits
 Tested to Dade County 120" length and cut to size in
 option x 120" length and includes two piece strikes




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Protocols & ASTM Standards the field. Fire rating is valid
 cut to size in the field. Fire
 only up to 96"
 rating is valid only up to 96"
 Wall Mounting Kit - 98-2579
 Top Retainer Pack: 98-2593
 Top Ret Pack - 98-2599 Top Ret Pack - 98-2190 Top Ret Pack - 98-2559 Top Ret Pack - 98-2599
 Bottom Retainer Pack: 98-2594
 Accessories Bottom Ret Pack - 98-2600 Bottom Ret Pack - 98-2191 Bottom Ret Pack - 98-2556
 Top Retainer Shim Kit - 601
 Bottom Ret Pack - 98-2600
 Top Retainer Shim Kit - 601 Top Retainer Shim Kit - 601 Top Retainer Shim Kit - 601 Top Retainer Shim Kit - 601
 Cylinder Kit - 980C1*
 Cylinder Kit - 980C1*

 *Note: Cylinder Kits must be ordered separately

 Note for HC980/12-HC980 Mullions: HCL980 Mullion Information
 • Designed for severe wind load conditions due to hurricanes or • Model 12-HC-L980 may be supplied for doors UL fire rated up to
 tornadoes and including 3 hrs not exceeding 8 ft in width and height
 • Tested to Dade County protocols and ANSI 250.13 ASTM Standards • Meets the following standards: ANSI 250.13, ASTM E330,
 and FEMA 361 ASTM 1886, ASTM 1996, TAS 201, TAS 202 & TAS 203
 • 12- Fire labeled version • Designed for use with UL Classified HC8810, HC8800 and
 • Replacement lock kits are available for lockable mullions 12-HC8800 rim exit devices
 Part numbers for each model are listed in the price book

90641
 68 1-800-727-5477 • www.sargentlock.com
', 4299, 1, ' mullions: aluminum, steel and
 electrified
 80 series



 aluminum mullions electrified
 product designation 650a 980 l980 el980
 description removable removable lockable electrical lockable
 material aluminum aluminum aluminum steel
 us28/satin
 standard finish prime coat aluminum prime coat gray paint
 anodized aluminum
 specify:
 specify specify wall mounting kit: 98-2580
 “l980a” anodized aluminum
 options “650a x 10b” “980a” for anodized us28/
 specify: “l980a x10b”
 top ret pack :98-2558
 for 313an to match 10b satin aluminum bottom ret pack: 98-2556
 for 313an to match 10b
 stk size 96" 86" 86" 86"
 max stk height 120" 120" 120" 120"
 pre-prepped 658 strikes included no no no
 cylinder size not required not required #41 #46 only
 t shaped t shaped
 shape 1-1/2" x 2-1/2" rectangular 2" x 3"
 2-1/2" x 3" 2-1/2" x 3"
 top retainer - 511 all cylinder options available
 includes 651 stabilizers and for use with electric strikes
 bottom retainer - 502 wall mount kit 98-2578
 misc. information imbedded weather stripping and monitoring, quick connect
 adapter for narrow transom: top ret pack 98-2526
 and accessories top retainer 94-2050 wiring supplied




 07/25
 507 - aluminum prime coated bottom ret pack 98-2525
 bottom retainer 94-2051 cylinder kit 980c2*
 507a - anodized aluminum cylinder kit 980c1*




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 *note: cylinder kits must be ordered separately


 steel mullions
 product designations hc980 980s l980s hcl980 12-hd980
 description hurricane code standard mullion lockable lockable hurricane code heavy duty
 material steel steel steel steel steel
 fire rated specify 12-hc980 specify 12-980 specify 12-l980 specify 12-hcl980 specify 12-hd980
 fire rated max
 96" 96" 96" 96" 120"
 height
 finish gray paint gray paint gray paint gray paint gray paint
 stk size 86" 86" 86" 86" 120"
 max stk height 96" 120" 120" 96" 120"
 pre-prepped no no no no no
 #41 std #41 std
 cylinder size not required not required not required
 (#42 & #43 available) (#42 & #43 available)
 shape rectangular 2" x 3" rectangular 2" x 3" rectangular 2" x 3" rectangular 2" x 3" rectangular 2" x 3"
 for 12-8800 - channel iron
 fire rated for 8''0" x 8''0"
 & malleable iron top &
 designed for severe wind paired openings
 bottom retainers. 12-hd980 is for pair of
 load conditions due to mullions longer than 86" must
 mullions longer than 86" doors over 8''0" to 10''0" for
 misc. information hurricanes or windstorms.
 must be ordered as 12-
 be ordered as 12- option x see notes below
 use with 12-8800 rim exits
 tested to dade county 120" length and cut to size in
 option x 120" length and includes two piece strikes




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 protocols & astm standards the field. fire rating is valid
 cut to size in the field. fire
 only up to 96"
 rating is valid only up to 96"
 wall mounting kit - 98-2579
 top retainer pack: 98-2593
 top ret pack - 98-2599 top ret pack - 98-2190 top ret pack - 98-2559 top ret pack - 98-2599
 bottom retainer pack: 98-2594
 accessories bottom ret pack - 98-2600 bottom ret pack - 98-2191 bottom ret pack - 98-2556
 top retainer shim kit - 601
 bottom ret pack - 98-2600
 top retainer shim kit - 601 top retainer shim kit - 601 top retainer shim kit - 601 top retainer shim kit - 601
 cylinder kit - 980c1*
 cylinder kit - 980c1*

 *note: cylinder kits must be ordered separately

 note for hc980/12-hc980 mullions: hcl980 mullion information
 • designed for severe wind load conditions due to hurricanes or • model 12-hc-l980 may be supplied for doors ul fire rated up to
 tornadoes and including 3 hrs not exceeding 8 ft in width and height
 • tested to dade county protocols and ansi 250.13 astm standards • meets the following standards: ansi 250.13, astm e330,
 and fema 361 astm 1886, astm 1996, tas 201, tas 202 & tas 203
 • 12- fire labeled version • designed for use with ul classified hc8810, hc8800 and
 • replacement lock kits are available for lockable mullions 12-hc8800 rim exit devices
 part numbers for each model are listed in the price book

90641
 68 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 69, 'Split Mullions
80 Series



 Split Mullions (Steel)
 Product Designations SM980S SML980S SMEL980
 Description Standard Mullion Lockable Electrical Lockable
 Material Steel Steel Steel
 Finish Gray Paint Gray Paint Gray Paint
 Stk Size 96" 96" 96"
 Max Stk Height 96" 96" 96"
 Pre-prepped No No No
 #41 Std
 Cylinder Size Not Required #46 Only
 (#42 & #43 available)
 Shape Rectangular 2" x 3" Rectangular 2" x 3" Rectangular 2" x 3"
 Misc. Information Not fire rated Not fire rated Not fire rated
 Top Ret Pack - 98-2558
 Wall Mounting Kit - 98-2579 Bottom Ret Pack - 98-2556
 Top Ret Pack - 98-2190 Top Ret Pack - 98-2559 For use with Electric Strikes and
 Bottom Ret Pack - 98-2191 Bottom Ret Pack - 98-2556 Monitoring, Quick Connect Wiring
 Accessories
 Top Retainer Shim Kit - 601 Top Retainer Shim Kit - 601 Supplied




 07/25
 Screw Pack - 98-2029 Cylinder Kit - 980C1* Cylinder Kit - 980C2*
 Screw Pack - 98-2029 Wall Mounting Kit: 98-2580
 Screw Pack - 98-2029




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
*Note: Cylinder Kits must be ordered separately




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




 1-800-727-5477 • www.sargentlock.com
 69 90641
', 1335, 1, 'split mullions
80 series



 split mullions (steel)
 product designations sm980s sml980s smel980
 description standard mullion lockable electrical lockable
 material steel steel steel
 finish gray paint gray paint gray paint
 stk size 96" 96" 96"
 max stk height 96" 96" 96"
 pre-prepped no no no
 #41 std
 cylinder size not required #46 only
 (#42 & #43 available)
 shape rectangular 2" x 3" rectangular 2" x 3" rectangular 2" x 3"
 misc. information not fire rated not fire rated not fire rated
 top ret pack - 98-2558
 wall mounting kit - 98-2579 bottom ret pack - 98-2556
 top ret pack - 98-2190 top ret pack - 98-2559 for use with electric strikes and
 bottom ret pack - 98-2191 bottom ret pack - 98-2556 monitoring, quick connect wiring
 accessories
 top retainer shim kit - 601 top retainer shim kit - 601 supplied




 07/25
 screw pack - 98-2029 cylinder kit - 980c1* cylinder kit - 980c2*
 screw pack - 98-2029 wall mounting kit: 98-2580
 screw pack - 98-2029




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
*note: cylinder kits must be ordered separately




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




 1-800-727-5477 • www.sargentlock.com
 69 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 70, ' Mullion Accessories and Stabilizers
 80 Series

 Mullion Accessories 507 Narrow Transom Bars Adapter 980S Mullion Application
 RK980 • Available with 980 and 980A • All steel mullions are 2" x 3"
 Latchbolt assembly retrofit kit with top and
 bottom retainers for 980 aluminum mullion • Required when soffit is 1-1/4" (32mm) to
 2" (51mm) wide
 • Order as a: 507 for 980 mullion or 507A
 for 980A mullion

 Soffit
 19/32"
 (15mm)
 Top Retainer


 Mullion
 Door Body



 980 Mullion &
 651 Mullion Stabilizer Kit 650A Mullion L980 Lockable Mullion




 07/25
 • Stabilizer block
 • Furnished standard w/650A Mullion




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 • Order as a 651 Kit



 980C1 Cylinder Mullion Kit Lockable Mullion Lockable Mullion Cylinder Kit
 Options*
 L980, L980A, L980S & HC-L980 mullions
 are available with these options: 10, 10-21-,
 10-63-, 11-, 11-21-, 11-60, 11-63-, 11-64-,
 11-72-7P-, 11-65-73-7P-, 11-73-7P-, 21-, 60-,
 63-, 64-, 70, 72-, 73-, 65-73-, 65-73-7P-, 73-7P-,
 • Lockable mullions only 81-, 82-, F1-82-, 83-, F1-83-, 84-, SC- & SE-.
 • Aluminum and steel
 • Includes cylinder and collar EL980 mullion is available with these
 • Available in 26D & 10B finish options:

 10, 10-21-, 10-63-, 11-, 11-21-, 11-60, 11-63-,
 11-64-, 11-72-7P-, 11-65-73-7P-, 11-73-7P-,
 980C2 Cylinder Mullion Kit Mullion Weights & Packaging 21-, 60-, 63-, 64-, 70, 72-, 73-, 65-73-,




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Product Avg Wt Case 65-73-7P-, 73-7P-, 81-, 82- & F1-82-.
 Exit Device with Trim 15 lbs 1 ea *Lockable mullions are shipped without
 980 Mullion 18 lbs 1 ea cylinders. Order Cylinder Mullion Kit
 separately.
 12-980 Mullion 40 lbs 1 ea
 650A Mullion 18 lbs 1 ea
 SM980S Split Mullion 40 lbs 1 ea
 • Lockable mullions
 • Electrified only
 • Includes cylinder and collar
 • Available in 26D finish only




90641
 70 1-800-727-5477 • www.sargentlock.com
', 2089, 1, ' mullion accessories and stabilizers
 80 series

 mullion accessories 507 narrow transom bars adapter 980s mullion application
 rk980 • available with 980 and 980a • all steel mullions are 2" x 3"
 latchbolt assembly retrofit kit with top and
 bottom retainers for 980 aluminum mullion • required when soffit is 1-1/4" (32mm) to
 2" (51mm) wide
 • order as a: 507 for 980 mullion or 507a
 for 980a mullion

 soffit
 19/32"
 (15mm)
 top retainer


 mullion
 door body



 980 mullion &
 651 mullion stabilizer kit 650a mullion l980 lockable mullion




 07/25
 • stabilizer block
 • furnished standard w/650a mullion




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 • order as a 651 kit



 980c1 cylinder mullion kit lockable mullion lockable mullion cylinder kit
 options*
 l980, l980a, l980s & hc-l980 mullions
 are available with these options: 10, 10-21-,
 10-63-, 11-, 11-21-, 11-60, 11-63-, 11-64-,
 11-72-7p-, 11-65-73-7p-, 11-73-7p-, 21-, 60-,
 63-, 64-, 70, 72-, 73-, 65-73-, 65-73-7p-, 73-7p-,
 • lockable mullions only 81-, 82-, f1-82-, 83-, f1-83-, 84-, sc- & se-.
 • aluminum and steel
 • includes cylinder and collar el980 mullion is available with these
 • available in 26d & 10b finish options:

 10, 10-21-, 10-63-, 11-, 11-21-, 11-60, 11-63-,
 11-64-, 11-72-7p-, 11-65-73-7p-, 11-73-7p-,
 980c2 cylinder mullion kit mullion weights & packaging 21-, 60-, 63-, 64-, 70, 72-, 73-, 65-73-,




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 product avg wt case 65-73-7p-, 73-7p-, 81-, 82- & f1-82-.
 exit device with trim 15 lbs 1 ea *lockable mullions are shipped without
 980 mullion 18 lbs 1 ea cylinders. order cylinder mullion kit
 separately.
 12-980 mullion 40 lbs 1 ea
 650a mullion 18 lbs 1 ea
 sm980s split mullion 40 lbs 1 ea
 • lockable mullions
 • electrified only
 • includes cylinder and collar
 • available in 26d finish only




90641
 70 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 71, 'Through-bolt Kits, Rod Extensions and
Shim Kits
80 Series


Through-bolt (TB) Applications Rod Extension Kits Glass Bead Shim Kits
 8700 - Two bolts at center case • For surface mounted top rod extensions Kit 587 Two 1/8" thick shims
 and hinge stile case, three at for 8700 exit device
 top and bottom cases and two • 570 Kit is for a Rod Connector & spiral pin
 Kit 537 Two 1/8" thick shims
 at top and bottom guide cases for 12-8700
 • 571 Kits includes top rod extension & 570 kit
 for device mfg prior to November 2002 Exit Device
 Kit 589 Two 1/8" shims for
 • Specify Kits concealed vertical
 Extension and finish: rod, rim and mortise
 assembly
 • 571-6 for 6" lock exit devices
 Rod connector Rod Extension
 Spiral pin
 • 571-12 for 12"
 Rod Extension

 • 571-18 for 18"
 Rod Extension
 Top rod

 • 687 Kits include Rod Extension for devices
 12-8700 - Two bolts at center mfg after November 2002
 case and hinge stile case, four
 • Specify Kits and finish: Concealed Vertical
 at top and bottom cases and Mortise Lock OR Rod or Rim exit
 two at top and bottom guide • 687-6 for 6" Rod Extension exit device device
 case Note:
 • 687-12 for 12" Rod Extension • Lift slide length must be increased for




 07/25
 8600 and 12-8600
 
 Note: For extensions over 12" full rod
 • Lift lever length must be increased for
 Through-bolts Qty Part # lengths
 8900 and 12-8900




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 are available, see Rod Replacement Kits
 8700 Rail & Chassis 4 68-2279 Below • Shim thickness must not exceed 1/4"
 8700 Cases & Guides 10 68-2282 (6mm) on 8900 and 12-8900
 • Spindles and through-bolt lengths must
 12-8700 Complete 16 68-2288 be increased on 8700, 12-8700, 8800,
 8800 Rail & Chassis 4 68-2279 12-8800 exits
 • Kits are available in EB, ED, and EN
 To order through-bolts with device:
 Example: 8804 FLL x TB
 Rod & Bolt Replacement Kits Rod Replacement Kits
 Note: Attaching Screws – All series are
 furnished standard with wood screws for Bottom Rod Top Rod Bottom
 Top Rod & Product
 Product &
 wood and Kalamein doors and machine Bolt Kit * Kit ++ Rod Kit +++
 Bolt Kit **
 screws for metal doors. Through-bolts and All 8700+ 670T 670B
 8700 N/A N/A
 mortise nuts must be specified to mount fire
 MD & AD8600 MD660T 660B
 exit devices on composite fire doors with MD & AD8600 MD691T 691B
 steel, wood or plastic covering WD8600 WD660T 660B
 WD8600 WD691T 691B WD8600 x Aux WDA660T 660B
 WD8600 x Aux WDA691T 691B MD & AD8400 MD660T 660B
565 Metal End Cap Kit PP/PR/SP8600 661P N/A
 MD & AD8400 MD691T 691B
 LP/LR/LS8600 661L N/A
 Mounting PP/PR/SP8600 692P N/A
 Plate Metal End Cap + Finish Information Required




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 LP/LR/LS8600 692L N/A ++ Door Height & Rail Location Required
 +++ Rail Location Required
 * Door Height & Rail Location Required
 ** Rail Location Required


 End cap with hardware finish includes
 mounting plate with wood and machine screws
 Order as a 565 Kit x Finish




 1-800-727-5477 • www.sargentlock.com
 71 90641
', 3215, 1, 'through-bolt kits, rod extensions and
shim kits
80 series


through-bolt (tb) applications rod extension kits glass bead shim kits
 8700 - two bolts at center case • for surface mounted top rod extensions kit 587 two 1/8" thick shims
 and hinge stile case, three at for 8700 exit device
 top and bottom cases and two • 570 kit is for a rod connector & spiral pin
 kit 537 two 1/8" thick shims
 at top and bottom guide cases for 12-8700
 • 571 kits includes top rod extension & 570 kit
 for device mfg prior to november 2002 exit device
 kit 589 two 1/8" shims for
 • specify kits concealed vertical
 extension and finish: rod, rim and mortise
 assembly
 • 571-6 for 6" lock exit devices
 rod connector rod extension
 spiral pin
 • 571-12 for 12"
 rod extension

 • 571-18 for 18"
 rod extension
 top rod

 • 687 kits include rod extension for devices
 12-8700 - two bolts at center mfg after november 2002
 case and hinge stile case, four
 • specify kits and finish: concealed vertical
 at top and bottom cases and mortise lock or rod or rim exit
 two at top and bottom guide • 687-6 for 6" rod extension exit device device
 case note:
 • 687-12 for 12" rod extension • lift slide length must be increased for




 07/25
 8600 and 12-8600
 
 note: for extensions over 12" full rod
 • lift lever length must be increased for
 through-bolts qty part # lengths
 8900 and 12-8900




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 are available, see rod replacement kits
 8700 rail & chassis 4 68-2279 below • shim thickness must not exceed 1/4"
 8700 cases & guides 10 68-2282 (6mm) on 8900 and 12-8900
 • spindles and through-bolt lengths must
 12-8700 complete 16 68-2288 be increased on 8700, 12-8700, 8800,
 8800 rail & chassis 4 68-2279 12-8800 exits
 • kits are available in eb, ed, and en
 to order through-bolts with device:
 example: 8804 fll x tb
 rod & bolt replacement kits rod replacement kits
 note: attaching screws – all series are
 furnished standard with wood screws for bottom rod top rod bottom
 top rod & product
 product &
 wood and kalamein doors and machine bolt kit * kit ++ rod kit +++
 bolt kit **
 screws for metal doors. through-bolts and all 8700+ 670t 670b
 8700 n/a n/a
 mortise nuts must be specified to mount fire
 md & ad8600 md660t 660b
 exit devices on composite fire doors with md & ad8600 md691t 691b
 steel, wood or plastic covering wd8600 wd660t 660b
 wd8600 wd691t 691b wd8600 x aux wda660t 660b
 wd8600 x aux wda691t 691b md & ad8400 md660t 660b
565 metal end cap kit pp/pr/sp8600 661p n/a
 md & ad8400 md691t 691b
 lp/lr/ls8600 661l n/a
 mounting pp/pr/sp8600 692p n/a
 plate metal end cap + finish information required




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 lp/lr/ls8600 692l n/a ++ door height & rail location required
 +++ rail location required
 * door height & rail location required
 ** rail location required


 end cap with hardware finish includes
 mounting plate with wood and machine screws
 order as a 565 kit x finish




 1-800-727-5477 • www.sargentlock.com
 71 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 72, ' End Caps and
 Cylinder Dogging Kits
 80 Series


 Cylinder Dogging 16- Option 665 Flush End Cap Kit and 553 Shim
 Kit



 A 41 mortise cylinder (included), located
 in the rail insert, locks the rail in retracted
 position. Available for all 80 Series devices
 except Fire Rated, FM8700 & some electrical
 options.
 Order as a 16- option with the device • 665 Kit is Flush End Cap for 80 Series
 Example: 16-8813F x ETJ x 03 Finish exit device
 Also available as a 816 Kit • 665 Kit available for retrofit/replacement
 Specify Kit based on Rail size
 • To order specify 665 Kit x Finish
 Example: or with the Device as a 43- option
 816-1 x finish for “F” wide
 • 553 Kit is an 1/8” Shim for Flush End Caps
 816-2 x finish for “E” & “F” narrow
 816-3 x finish for “G” wide • 553 Shim Kit is only available in ED, EN & EB*
 816-4 x finish for “G” narrow • To order specify 553 Kit x Finish
 816-5 x finish for “E” wide
 816-6 x finish for “J” narrow * Note: EB (BHMA 690) Powder coated to match 10B
 816-7 x finish for “J” wide EN (BHMA 689) Powder coated to match 26D
 816-8 x finish for “E” narrow




 07/25
 Cylinder included
 Note: Cylinder dogging requires a 27"
 minimum door width




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 Cylinder Nut Wrench




 This wrench simplifies the installation and
 removal of mortise cylinders nuts used on
 700 Series Auxiliary Control (80 Series
 ET Trim).
 • Part number 97-0568




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 72 1-800-727-5477 • www.sargentlock.com
', 1695, 1, ' end caps and
 cylinder dogging kits
 80 series


 cylinder dogging 16- option 665 flush end cap kit and 553 shim
 kit



 a 41 mortise cylinder (included), located
 in the rail insert, locks the rail in retracted
 position. available for all 80 series devices
 except fire rated, fm8700 & some electrical
 options.
 order as a 16- option with the device • 665 kit is flush end cap for 80 series
 example: 16-8813f x etj x 03 finish exit device
 also available as a 816 kit • 665 kit available for retrofit/replacement
 specify kit based on rail size
 • to order specify 665 kit x finish
 example: or with the device as a 43- option
 816-1 x finish for “f” wide
 • 553 kit is an 1/8” shim for flush end caps
 816-2 x finish for “e” & “f” narrow
 816-3 x finish for “g” wide • 553 shim kit is only available in ed, en & eb*
 816-4 x finish for “g” narrow • to order specify 553 kit x finish
 816-5 x finish for “e” wide
 816-6 x finish for “j” narrow * note: eb (bhma 690) powder coated to match 10b
 816-7 x finish for “j” wide en (bhma 689) powder coated to match 26d
 816-8 x finish for “e” narrow




 07/25
 cylinder included
 note: cylinder dogging requires a 27"
 minimum door width




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 cylinder nut wrench




 this wrench simplifies the installation and
 removal of mortise cylinders nuts used on
 700 series auxiliary control (80 series
 et trim).
 • part number 97-0568




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 72 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 73, 'Rail Sizes and How to Order ET Trim
80 Series


Cover Dimensions and
Touchbar Projections Rail Sizes
 Narrow Wide SARGENT offers four sizes of rails to accommodate 32", 36", 42" and 48" doors. These
 rails can be cut for smaller doors as specified in the chart below.

 3"
 SARGENT will cut all rails to size if door width is specified when the hardware is ordered.
 (76mm)


 8-5/16" 2-5/16"
 8-3/8"
 (213mm)
 Stock Door
 (211mm) (59mm) Size Widths Remarks LP, LR & LS8600 Rail Sizes
 E 24" to 32" No cutting required L Rail 36" (91cm) No cutting
 (61cm to 81cm) for 32" (81cm) door required
 F 33" to 36" No cutting required M Rail 42" to 44" No cutting
 1-1/16" 1-7/16" 2-5/8"
 (27mm) (37mm)
 (84cm to 91cm) for 36" (91cm) door (107cm to 112cm) required
 (67mm)
 J 37" to 42" No cutting required
 (94cm to 107cm) for 42" (107cm) door N Rail 46" to 48" No cutting
 G 43" to 48" No cutting required (117cm to 122cm) required
 (110cm to 122cm) for 48" (122cm) door




 3"




 07/25
 (77mm) 2-1/8"
 (54mm)

 Neutral Depressed




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 How to specify and order ET Trim without an Exit Device
 Example for 775-8 ETL 26D RHR 12VDC
 7 75 -8 ETL 26D RHR 12VDC
 7 for 700 2 digit Suffix - ET followed by Finish Hand Voltage
 Series function Determined by Lever Design for ET Trims
 Auxiliary number Exit Device Pages Page 83 Page 78
 Control (See Chart) 61-64 Page 60

Notes:
• LFIC (Removable) and SFIC (70-) option cylinders require 97-0351 cylinder rings for 700 Series ET Controls and
 94-0153 rings for 100 & 300 Series Aux controls.
• When ordering 775 or 776 trim, specify either a rim cylinder or mortise cylinder.
 730 Spindle Retrofit Kits are used
 No Suffix -8 Suffix to replace existing spindles for 06,
 13, 15, 16, 73, 74, 75 & 76 function
 Square Spindle or No Spindle
 Cross Type Spindle ET Trims
 for inactive functions




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 - Kits include Spindle, Retainer Plates,
 for all 8900, 8300, 8700 with bottom rod and for 8800, 8500, NB8700, PP, PR & SP8700 Mounting. Screws & Return Springs
8800, 8500, NB8700, PP, PR & SP8700 devices devices, except with these functions: 730-1 700 Series Spindle 1-3/4" Door
 with these functions: 04, 10, 16, 40 & 44 04, 10, 16, 40 & 44 730-2 700 Series Spindle 2" Door
 730-3 700 Series Spindle 2-1/4" Door
 730-4 700-4 Series Spindle 1-3/4" Door
 -4 Suffix -6 Suffix
 730-5 700-4 Series Spindle 2" Door
 730-6 700-4 Series Spindle 2-1/4" Door
 Offset Mtg Tabs Offset Mtg Tab
 Top & Bottom Top Only 730-7 700-8 Series Spindle 1-3/4" Door
 730-8 700-8 Series Spindle 2" Door
 for all AD & MD8400 and AD, WD
 for all PP, PR, SP, LP, LR & LS 8600 devices 730-9 700-8 Series Spindle 2-1/4" Door
 & MD 8600 devices



 1-800-727-5477 • www.sargentlock.com
 73 90641
', 2960, 1, 'rail sizes and how to order et trim
80 series


cover dimensions and
touchbar projections rail sizes
 narrow wide sargent offers four sizes of rails to accommodate 32", 36", 42" and 48" doors. these
 rails can be cut for smaller doors as specified in the chart below.

 3"
 sargent will cut all rails to size if door width is specified when the hardware is ordered.
 (76mm)


 8-5/16" 2-5/16"
 8-3/8"
 (213mm)
 stock door
 (211mm) (59mm) size widths remarks lp, lr & ls8600 rail sizes
 e 24" to 32" no cutting required l rail 36" (91cm) no cutting
 (61cm to 81cm) for 32" (81cm) door required
 f 33" to 36" no cutting required m rail 42" to 44" no cutting
 1-1/16" 1-7/16" 2-5/8"
 (27mm) (37mm)
 (84cm to 91cm) for 36" (91cm) door (107cm to 112cm) required
 (67mm)
 j 37" to 42" no cutting required
 (94cm to 107cm) for 42" (107cm) door n rail 46" to 48" no cutting
 g 43" to 48" no cutting required (117cm to 122cm) required
 (110cm to 122cm) for 48" (122cm) door




 3"




 07/25
 (77mm) 2-1/8"
 (54mm)

 neutral depressed




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 how to specify and order et trim without an exit device
 example for 775-8 etl 26d rhr 12vdc
 7 75 -8 etl 26d rhr 12vdc
 7 for 700 2 digit suffix - et followed by finish hand voltage
 series function determined by lever design for et trims
 auxiliary number exit device pages page 83 page 78
 control (see chart) 61-64 page 60

notes:
• lfic (removable) and sfic (70-) option cylinders require 97-0351 cylinder rings for 700 series et controls and
 94-0153 rings for 100 & 300 series aux controls.
• when ordering 775 or 776 trim, specify either a rim cylinder or mortise cylinder.
 730 spindle retrofit kits are used
 no suffix -8 suffix to replace existing spindles for 06,
 13, 15, 16, 73, 74, 75 & 76 function
 square spindle or no spindle
 cross type spindle et trims
 for inactive functions




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 - kits include spindle, retainer plates,
 for all 8900, 8300, 8700 with bottom rod and for 8800, 8500, nb8700, pp, pr & sp8700 mounting. screws & return springs
8800, 8500, nb8700, pp, pr & sp8700 devices devices, except with these functions: 730-1 700 series spindle 1-3/4" door
 with these functions: 04, 10, 16, 40 & 44 04, 10, 16, 40 & 44 730-2 700 series spindle 2" door
 730-3 700 series spindle 2-1/4" door
 730-4 700-4 series spindle 1-3/4" door
 -4 suffix -6 suffix
 730-5 700-4 series spindle 2" door
 730-6 700-4 series spindle 2-1/4" door
 offset mtg tabs offset mtg tab
 top & bottom top only 730-7 700-8 series spindle 1-3/4" door
 730-8 700-8 series spindle 2" door
 for all ad & md8400 and ad, wd
 for all pp, pr, sp, lp, lr & ls 8600 devices 730-9 700-8 series spindle 2-1/4" door
 & md 8600 devices



 1-800-727-5477 • www.sargentlock.com
 73 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 74, ' Mechanical Options and Descriptions
 80 Series

 Mechanical Options:

 Categories How to Specify Detailed Description

 Fire Rated 12- UL Fire Label Exit hardware (not available with 16- & HK-)

 SVR Bolt 14- Sliding bolt bottom case for 8700

 16- Cylinder lockdown with # 41 Cylinder & # 97 Ring (not available with 12-, 59- or AL- Option)
 Cylinder Dogging
 LD- Less dogging for non fire rated devices

 Less Touch Pad 19- Pushbar without Lexan touchpad

 8900/8300 Strike 23- 4-7/8" (124mm) ANSI flat lip strike (for 8900 & 8300 Series Mortise Lock Exit Devices)

 Doors over 1-3/4" and/or Panels (Specify door thickness, panel thickness & location as required.) Not available for HC8700,
 Thick Doors 31-
 FM8700. Extended lip strike supplied for 8300 & 8900 Series.

 36- Six lobe security head screws
 Security Fasteners
 37- Spanner head screws

 Flush End cap 43- Flush End Cap (Not available with LP, LR & LS Devices)

 Indicator 49- Indicator (Available on 8816 and 8866 functions only)
 Latchbolt monitoring switch (not available with 49-, 59-, GL-, HC-, WS- or on FM8700, PP/PR/SP8600 & LP/LR/LS8600 Exit
 53-
 Devices)
 54- Monitors ET Lever movement with Internal micro switch in ET Control




 07/25
 55- Request to Exit - Signal Switch in Rail (not available with 59- & FM8700)

 56- Remote Latch Retraction (not available 58-, 59-, AL-, BT- or FM8700 Option)




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 56-HK- Remote Latch Retraction with manual Hex Key dogging (not available 12-, 58-, 59-, AL- or BT- Option)
 Electrical
 Options 58- Electric Rail Dogging (Not available 56- & 59-)
 Electroguard® Self Contained Delayed Egress Device (not available with 16-, 53-, 55-, 56-, 58-, AL-, BT-, GL-, HC- & WS
 59- Option Prefixes, PP/PR/SP8600, LP/LR/LS8600 Exit Devices) (NB, 54- are available upon request) Not compatible with 300
 Series Aux Controls on NB8700, 8700.
 AL- Alarmed Exit (Not available 16-, 56-, 59-, BT-, GL-, HC- , HC4 & WS-) (minimum Dr width 36")
 Electroguard® Boca Code (Door Status Switch required) (not available with 16-, 55-, 56-, 58-, AL-, BT-, GL-, HC- & WS-
 BC-59- Options and on NB8700, PP/PR/SP8600 & LP/LR/LS8600 Exit Devices) Not compatible with 300 Series Aux Controls on
 NB8700, 8700.
 76- Tactile Warning - Milled Outside Lever (not available with Studio & Coastal Levers and the A Lever)

 Tactile Warning 85- Tactile Warning - Abrasive strip on Push Rail (Not available with PL-)
 Options 86- Tactile Warning - Abrasive coating on Outside Lever

 87- Tactile Warning - Abrasive strip on Push Rail & Abrasive coating on Outside Lever (not available with PL-)

 CPC- Clear Powder Coat (Available for 32 & 32D Finishes)
 Finish Protection
 SG- MicroShield® antimicrobial clear powder coat (only available with 15, 26D and 32D finishes)

 Top Rod Only NB- Less Bottom Rod & Bolt (for SVR & CVR Devices)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Guarded Latch GL- Guarded Latch for Rim Exit Devices (not available 53-, 59-, AL-, HC- & WS-)

 SARGuide PL- SARGuide™ PL – Photoluminescent Coated Push Rail – (Touchpad eliminated) (not available 85, 87)

 Through Bolts TB- Through Bolts for 8300, 8500, 8600, 8700, 8800 & 8900 Devices
 5lb. Pressure Release (8800, 8500, 8600 & 8400 devices only)
 Rail Force 5CH- Not available with 14-, 49-, 58-, 59-, BC-59, TI-
 Consult Factory: 23-, 31-, 36-, 37-, 43-, 54-, 55-, 56-HK, AL-, 76-, 87-, CPC-, SG-, NB-, GL-, TB
 Weep Holes (8500 and 8800 devices only) (Not available with AL-, 56-, 58-, 59-, HC-, WS-, BC-, HC4-, TL- & PL-) (Only
 Weather Resistant WH-
 available with 03, 04, 09, 10, 10BL, 20D, 10BE, BSP, WSP & 32DCP Finishes)




90641
 74 1-800-727-5477 • www.sargentlock.com
', 3864, 1, ' mechanical options and descriptions
 80 series

 mechanical options:

 categories how to specify detailed description

 fire rated 12- ul fire label exit hardware (not available with 16- & hk-)

 svr bolt 14- sliding bolt bottom case for 8700

 16- cylinder lockdown with # 41 cylinder & # 97 ring (not available with 12-, 59- or al- option)
 cylinder dogging
 ld- less dogging for non fire rated devices

 less touch pad 19- pushbar without lexan touchpad

 8900/8300 strike 23- 4-7/8" (124mm) ansi flat lip strike (for 8900 & 8300 series mortise lock exit devices)

 doors over 1-3/4" and/or panels (specify door thickness, panel thickness & location as required.) not available for hc8700,
 thick doors 31-
 fm8700. extended lip strike supplied for 8300 & 8900 series.

 36- six lobe security head screws
 security fasteners
 37- spanner head screws

 flush end cap 43- flush end cap (not available with lp, lr & ls devices)

 indicator 49- indicator (available on 8816 and 8866 functions only)
 latchbolt monitoring switch (not available with 49-, 59-, gl-, hc-, ws- or on fm8700, pp/pr/sp8600 & lp/lr/ls8600 exit
 53-
 devices)
 54- monitors et lever movement with internal micro switch in et control




 07/25
 55- request to exit - signal switch in rail (not available with 59- & fm8700)

 56- remote latch retraction (not available 58-, 59-, al-, bt- or fm8700 option)




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 56-hk- remote latch retraction with manual hex key dogging (not available 12-, 58-, 59-, al- or bt- option)
 electrical
 options 58- electric rail dogging (not available 56- & 59-)
 electroguard® self contained delayed egress device (not available with 16-, 53-, 55-, 56-, 58-, al-, bt-, gl-, hc- & ws
 59- option prefixes, pp/pr/sp8600, lp/lr/ls8600 exit devices) (nb, 54- are available upon request) not compatible with 300
 series aux controls on nb8700, 8700.
 al- alarmed exit (not available 16-, 56-, 59-, bt-, gl-, hc- , hc4 & ws-) (minimum dr width 36")
 electroguard® boca code (door status switch required) (not available with 16-, 55-, 56-, 58-, al-, bt-, gl-, hc- & ws-
 bc-59- options and on nb8700, pp/pr/sp8600 & lp/lr/ls8600 exit devices) not compatible with 300 series aux controls on
 nb8700, 8700.
 76- tactile warning - milled outside lever (not available with studio & coastal levers and the a lever)

 tactile warning 85- tactile warning - abrasive strip on push rail (not available with pl-)
 options 86- tactile warning - abrasive coating on outside lever

 87- tactile warning - abrasive strip on push rail & abrasive coating on outside lever (not available with pl-)

 cpc- clear powder coat (available for 32 & 32d finishes)
 finish protection
 sg- microshield® antimicrobial clear powder coat (only available with 15, 26d and 32d finishes)

 top rod only nb- less bottom rod & bolt (for svr & cvr devices)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 guarded latch gl- guarded latch for rim exit devices (not available 53-, 59-, al-, hc- & ws-)

 sarguide pl- sarguide™ pl – photoluminescent coated push rail – (touchpad eliminated) (not available 85, 87)

 through bolts tb- through bolts for 8300, 8500, 8600, 8700, 8800 & 8900 devices
 5lb. pressure release (8800, 8500, 8600 & 8400 devices only)
 rail force 5ch- not available with 14-, 49-, 58-, 59-, bc-59, ti-
 consult factory: 23-, 31-, 36-, 37-, 43-, 54-, 55-, 56-hk, al-, 76-, 87-, cpc-, sg-, nb-, gl-, tb
 weep holes (8500 and 8800 devices only) (not available with al-, 56-, 58-, 59-, hc-, ws-, bc-, hc4-, tl- & pl-) (only
 weather resistant wh-
 available with 03, 04, 09, 10, 10bl, 20d, 10be, bsp, wsp & 32dcp finishes)




90641
 74 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 75, 'Cylinder Options and Descriptions
80 Series

Cylinder Options:
Conventional Cylinder - SARGENT Conventional Cylinders Supplied Standard (Unless Otherwise Specified)
 DG1- SARGENT Degree Key System Level 1 (bump resistant with patented keys)
 DG1-21- Degree Level 1 Construction Master Keying
 DG1-60- Degree Level 1 Removable Disposable Construction Core
 DG1-63- Degree Level 1 Removable Core
 DG1-64- Degree Level 1 Removable Construction Keyed LFIC
 DG1-65- Degree Level 1 Unassembled/Uncombined Core
 DG2- SARGENT Degree Key System Level 2 (geographically exclusive; bump and pick resistant)
 DG2-21- Degree Level 2 Construction Master Keying
 DG2-60- Degree Level 2 Removable Disposable Construction Core
 Degree Key System
 DG2-63- Degree Level 2 Removable Core
 DG2-64- Degree Level 2 Removable Construction Keyed LFIC
 DG2-65- Degree Level 2 Unassembled/Uncombined Core
 DG3- SARGENT Degree Key System Level 3 (geographically exclusive; UL437 certified; bump and pick resistant)
 DG3-21- Degree Level 3 Construction Master Keying
 DG3-60- Degree Level 3 Removable Disposable Construction Core
 DG3-63- Degree Level 3 Removable Core
 DG3-64- Degree Level 3 Removable Construction Keyed LFIC
 DG3-65 Degree Level 3 Unassembled/Uncombined Core
 Signature 10- SARGENT Signature Key System (Not Available with other Key Systems)
 Key System 10-21- SARGENT Signature Construction Key System (Lost Ball)




 07/25
 Signature- LFIC 10-63- SARGENT Signature Large Format Interchangeable Core Cylinder (Removable)
 11- XC Key System (Not available with other Key systems unless specified)
 XC- Key System
 11-21- XC- Construction Key System (Lost Ball)




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 11-60- Device to accept XC- Permanent Large Format Interchangeable Core, Disposable plastic Core- provided
 XC- Large Format
Interchangeable Core 11-63- Device provided with XC- Large Format Interchangeable Core Cylinder - (Includes masterkeying, grand masterkeying)
 (Removable Core) Device provided with Keyed construction core to accept XC- Permanent Large Format Interchangeable Core (ordered
 11-64-
 separately)
 11-70-7P- Device to accept XC- SFIC ( 7-Pin) XC- Permanent Cores, plastic disposable core provided
 XC- Small Format 11-72-7P- Device to accept XC- SFIC (7-Pin Keyed Construction Core provided) cylinder Permanent core ordered separately
 Interchangeable
 Core 11-73-7P- Device provided with XC- Small Format 7-Pin interchangeable core (Includes masterkeying, grand masterkeying)
 11-65-73-7P- Device provided to accept XC- Uncombinated 7-Pin SFIC (Permanent) Core - (Packed Loose)
 Construction Key
 21- SARGENT Lost Ball Construction Keying for Conventional, XC and Signature Series (N/A with 63- or 73-)
 Systems
 Old Style Removable 51- Removable Core Cylinder (Old Style) provided (existing systems only)
 Core 52- Removable Construction Core (Old Style) Permanent core ordered separately (existing systems only)
 Device to accept SARGENT Permanent Large Format Interchangeable Core, Disposable plastic Core provided
 60-
 Large Format (Permanent Cores ordered separately)
Interchangeable Core 63- Device provided with Large Format Interchangeable Core Cylinder - (Includes masterkeying, grand masterkeying)
 (Removable Core) Device provided with Keyed construction core to accept Permanent Large Format Interchangeable Core (ordered
 64-
 separately)
 70- Device to accept 6- or 7-Pin SFIC Permanent Cores, plastic disposable core provided
 Device to accept 6- or 7-Pin SFIC (6-Pin Keyed Construction Core provided) Cylinder (Permanent Core ordered
 72-
 Small Format separately)
 Interchangeable 73- Device provided with 6-Pin SFIC (Includes masterkeying, grand masterkeying)
 Core 65-73- Device provided to accept Uncombinated 6-Pin SFIC (Permanent) Core - (Packed Loose for field keying)
 65-73-7P- Device provided to accept Uncombinated 7-Pin SFIC (Permanent) Core - (Packed Loose for field keying)
 73-7P- Device provided with Small Format 7-Pin Interchangeable Core (Includes masterkeying, grand masterkeying)




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 Device provided with housings to accept Keso (83) & Keso F1 (F1-83-) removable cores. (Permanent Cores ordered
 81-
 separately)
 82- Device provided with SARGENT Keso Security Cylinder
 Keso & Keso F1 F1-82- Device provided with SARGENT Keso F1 Security Cylinder (Patented)
 83- Device provided with SARGENT Keso Security Removable Core cylinder
 F1-83- Device provided with SARGENT Keso F1 Security Removable Core cylinder (Patented)
 84- Device provided with SARGENT Keso Construction Cores (Permanent Cores ordered separately)
 Added Security BR- Bump Resistant Cylinder (Available with Conventional & Conventional XC Cylinders Only)
 Less Cylinder - SARGENT supplies standard blocking rings for 1-1/8" Cylinders (For longer cylinders order collars/rings
 Less Cylinder LC-
 separately)
 SC- Schlage C keyway cylinder, 0 bitted (not available with: 8904, 8916, 8944, 8975, 8976, 8866, 8304, 8344, 8375 & 8376)
 Schlage Keyways
 SE- Schlage E keyway cylinder, 0 bitted (not available with: 8904, 8916, 8944, 8975, 8976, 8866, 8304, 8344, 8375 & 8376)
 Lever to
 SF- L Lever to accept Schlage® large format interchangable core (supplied less core, tailpiece included)
 Accept Schlage

Note: For V-10 Cylinders and information, contact ASSA


 1-800-727-5477 • www.sargentlock.com
 75 90641
', 5551, 1, 'cylinder options and descriptions
80 series

cylinder options:
conventional cylinder - sargent conventional cylinders supplied standard (unless otherwise specified)
 dg1- sargent degree key system level 1 (bump resistant with patented keys)
 dg1-21- degree level 1 construction master keying
 dg1-60- degree level 1 removable disposable construction core
 dg1-63- degree level 1 removable core
 dg1-64- degree level 1 removable construction keyed lfic
 dg1-65- degree level 1 unassembled/uncombined core
 dg2- sargent degree key system level 2 (geographically exclusive; bump and pick resistant)
 dg2-21- degree level 2 construction master keying
 dg2-60- degree level 2 removable disposable construction core
 degree key system
 dg2-63- degree level 2 removable core
 dg2-64- degree level 2 removable construction keyed lfic
 dg2-65- degree level 2 unassembled/uncombined core
 dg3- sargent degree key system level 3 (geographically exclusive; ul437 certified; bump and pick resistant)
 dg3-21- degree level 3 construction master keying
 dg3-60- degree level 3 removable disposable construction core
 dg3-63- degree level 3 removable core
 dg3-64- degree level 3 removable construction keyed lfic
 dg3-65 degree level 3 unassembled/uncombined core
 signature 10- sargent signature key system (not available with other key systems)
 key system 10-21- sargent signature construction key system (lost ball)




 07/25
 signature- lfic 10-63- sargent signature large format interchangeable core cylinder (removable)
 11- xc key system (not available with other key systems unless specified)
 xc- key system
 11-21- xc- construction key system (lost ball)




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 11-60- device to accept xc- permanent large format interchangeable core, disposable plastic core- provided
 xc- large format
interchangeable core 11-63- device provided with xc- large format interchangeable core cylinder - (includes masterkeying, grand masterkeying)
 (removable core) device provided with keyed construction core to accept xc- permanent large format interchangeable core (ordered
 11-64-
 separately)
 11-70-7p- device to accept xc- sfic ( 7-pin) xc- permanent cores, plastic disposable core provided
 xc- small format 11-72-7p- device to accept xc- sfic (7-pin keyed construction core provided) cylinder permanent core ordered separately
 interchangeable
 core 11-73-7p- device provided with xc- small format 7-pin interchangeable core (includes masterkeying, grand masterkeying)
 11-65-73-7p- device provided to accept xc- uncombinated 7-pin sfic (permanent) core - (packed loose)
 construction key
 21- sargent lost ball construction keying for conventional, xc and signature series (n/a with 63- or 73-)
 systems
 old style removable 51- removable core cylinder (old style) provided (existing systems only)
 core 52- removable construction core (old style) permanent core ordered separately (existing systems only)
 device to accept sargent permanent large format interchangeable core, disposable plastic core provided
 60-
 large format (permanent cores ordered separately)
interchangeable core 63- device provided with large format interchangeable core cylinder - (includes masterkeying, grand masterkeying)
 (removable core) device provided with keyed construction core to accept permanent large format interchangeable core (ordered
 64-
 separately)
 70- device to accept 6- or 7-pin sfic permanent cores, plastic disposable core provided
 device to accept 6- or 7-pin sfic (6-pin keyed construction core provided) cylinder (permanent core ordered
 72-
 small format separately)
 interchangeable 73- device provided with 6-pin sfic (includes masterkeying, grand masterkeying)
 core 65-73- device provided to accept uncombinated 6-pin sfic (permanent) core - (packed loose for field keying)
 65-73-7p- device provided to accept uncombinated 7-pin sfic (permanent) core - (packed loose for field keying)
 73-7p- device provided with small format 7-pin interchangeable core (includes masterkeying, grand masterkeying)




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 device provided with housings to accept keso (83) & keso f1 (f1-83-) removable cores. (permanent cores ordered
 81-
 separately)
 82- device provided with sargent keso security cylinder
 keso & keso f1 f1-82- device provided with sargent keso f1 security cylinder (patented)
 83- device provided with sargent keso security removable core cylinder
 f1-83- device provided with sargent keso f1 security removable core cylinder (patented)
 84- device provided with sargent keso construction cores (permanent cores ordered separately)
 added security br- bump resistant cylinder (available with conventional & conventional xc cylinders only)
 less cylinder - sargent supplies standard blocking rings for 1-1/8" cylinders (for longer cylinders order collars/rings
 less cylinder lc-
 separately)
 sc- schlage c keyway cylinder, 0 bitted (not available with: 8904, 8916, 8944, 8975, 8976, 8866, 8304, 8344, 8375 & 8376)
 schlage keyways
 se- schlage e keyway cylinder, 0 bitted (not available with: 8904, 8916, 8944, 8975, 8976, 8866, 8304, 8344, 8375 & 8376)
 lever to
 sf- l lever to accept schlage® large format interchangable core (supplied less core, tailpiece included)
 accept schlage

note: for v-10 cylinders and information, contact assa


 1-800-727-5477 • www.sargentlock.com
 75 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 76, ' How to Order
 80 Series


 How to Order Exit Devices
 Example Order:
 12- 89 75 F ETMR 12VDC RHR 26D 32D 36" 84" 41"
 Outside Inside Door Opening
 Options Device Type Function Rail Size Trim Voltage Hand AFF
 Finish Finish Width Height
 04 - Night For ET 12VDC
 89 - Mortise E 24"-32" trim RHR Available Inside If door Required Center
 Latch
 specify ET Finishes Finish width for Line of
 Available 06 - Night
 WS89 - Mortise F 33"-36" followed 24V0DC LHR page 75 Available is Vertical Rail
 Options latch Finishes supplied
 10 - by Lever Rod Exit Above
 Listing page 75 rails
 88 - Rim J 37"-42" design, Devices Finish
 Pgs 73-74 Dummy Voltage will be
 13 - See pages required Floor 41"
 HC88 - Rim G 43"-48" 60-62 cut to Standard
 Classroom for size
 15 - Rail Sizes Solenoid
 WS88 - Rim
 Passage Listed Controlled
 16 - For
 87 - SVR Below Functions -
 Entrance are for LP, Thumbpiece 73, 74, 75
 Trims and
 28 - TP LR & 76
 NB87 - SVR Pulls
 Passage & LS specify Trim
 40 - Devices Designation
 HC87 - SVR
 FW Dummy Only as specified
 43 - FW
 FM87 - SVR L 36" Door by Device
 Classroom
 Type
 44 - FW
 MD86 - CVR M 42"-44"
 Night Latch
 46 - FW




 07/25
 AD86 - CVR N 46"-48"
 Night Latch
 62 - TP
 WD86 - CVR
 Night Latch




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 63 - TP
 85 - Rim Narrow
 Classroom
 MD84 - CVR 66 - TP
 Narrow Entrance

 AD84 - CVR
 73 - Legend
 Solenoid
 Narrow AD - Aluminum Door HC - Hurricane Code
 Fail Safe
 AFF - Above Finish Floor MD - Metal Door
 CTL - Center & Top Latching Exit NB - No Bottom Rod
 74 - CVR - Concealed Vertical Rod SVR - Surface Vertical Rod
 83 - Mortise
 Solenoid ET - SARGENT External Lever Trim TP - Thumbpiece Trim
 Narrow
 Fail Secure FM - FEMA WD - Wood Door
 FW - Freewheeling Trim WS - Windstorm
 75 -
 Solenoid
 PP87 - CTL SVR
 Fail Safe
 w/Cyl
 Mounting Heights
 1/8"
 76 - (3mm)
 Solenoid • 41" (1041mm) from finished floor for standard application
 PR87 - CTL SVR
 Fail Secure • 38" (965mm) from finished floor for elementary schools and to meet
 w/Cyl local accessibility standards when a 100 or 300 Series Auxiliary Control is




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
 used (38" AFF must be specified)
 SP87 - CTL SVR Stop




 Door Opening Height
 Height
 PP86 - CTL CVR
 Hand
 PR86 - CTL CVR Door
 Inside
 1/4"
 SP86 - CTL CVR (6mm)

 Right Hand
 LP86 - CTL CVR Left Hand Reverse
 Reverse “RHR”
 “LHR”
 LR86 - CTL CVR Finished Floor
 Outside
 LS86 - CTL CVR




90641
 76 1-800-727-5477 • www.sargentlock.com
', 2666, 1, ' how to order
 80 series


 how to order exit devices
 example order:
 12- 89 75 f etmr 12vdc rhr 26d 32d 36" 84" 41"
 outside inside door opening
 options device type function rail size trim voltage hand aff
 finish finish width height
 04 - night for et 12vdc
 89 - mortise e 24"-32" trim rhr available inside if door required center
 latch
 specify et finishes finish width for line of
 available 06 - night
 ws89 - mortise f 33"-36" followed 24v0dc lhr page 75 available is vertical rail
 options latch finishes supplied
 10 - by lever rod exit above
 listing page 75 rails
 88 - rim j 37"-42" design, devices finish
 pgs 73-74 dummy voltage will be
 13 - see pages required floor 41"
 hc88 - rim g 43"-48" 60-62 cut to standard
 classroom for size
 15 - rail sizes solenoid
 ws88 - rim
 passage listed controlled
 16 - for
 87 - svr below functions -
 entrance are for lp, thumbpiece 73, 74, 75
 trims and
 28 - tp lr & 76
 nb87 - svr pulls
 passage & ls specify trim
 40 - devices designation
 hc87 - svr
 fw dummy only as specified
 43 - fw
 fm87 - svr l 36" door by device
 classroom
 type
 44 - fw
 md86 - cvr m 42"-44"
 night latch
 46 - fw




 07/25
 ad86 - cvr n 46"-48"
 night latch
 62 - tp
 wd86 - cvr
 night latch




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 63 - tp
 85 - rim narrow
 classroom
 md84 - cvr 66 - tp
 narrow entrance

 ad84 - cvr
 73 - legend
 solenoid
 narrow ad - aluminum door hc - hurricane code
 fail safe
 aff - above finish floor md - metal door
 ctl - center & top latching exit nb - no bottom rod
 74 - cvr - concealed vertical rod svr - surface vertical rod
 83 - mortise
 solenoid et - sargent external lever trim tp - thumbpiece trim
 narrow
 fail secure fm - fema wd - wood door
 fw - freewheeling trim ws - windstorm
 75 -
 solenoid
 pp87 - ctl svr
 fail safe
 w/cyl
 mounting heights
 1/8"
 76 - (3mm)
 solenoid • 41" (1041mm) from finished floor for standard application
 pr87 - ctl svr
 fail secure • 38" (965mm) from finished floor for elementary schools and to meet
 w/cyl local accessibility standards when a 100 or 300 series auxiliary control is




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
 used (38" aff must be specified)
 sp87 - ctl svr stop




 door opening height
 height
 pp86 - ctl cvr
 hand
 pr86 - ctl cvr door
 inside
 1/4"
 sp86 - ctl cvr (6mm)

 right hand
 lp86 - ctl cvr left hand reverse
 reverse “rhr”
 “lhr”
 lr86 - ctl cvr finished floor
 outside
 ls86 - ctl cvr




90641
 76 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 77, 'Finishes and Finish Care
80 Series


Finish
SARGENT# BHMA# Description How to clean Avoid these cleaners
 3 605 Polished brass, clear coated
 4 606 Satin brass, clear coated
 9 611 Polished bronze, clear coated Mild non-abrasive detergent Abrasive cleaners, bleach solvents,
 10 612 Satin bronze, clear coated with damp cloth or sponge steel or bronze wool

 BSP — Black Suede Powder Coat
 32DCP — Satin stainless steel, clear coated

 10B 613 Oxidized bronze, oil rubbed
 Abrasive cleaners, bleach solvents,
 Lemon oil polished with dry cloth
 Dark oxidized satin bronze, steel or bronze wool
 10BE 613E
 equivalent
 10BL 613L Oxidized satin, bronze, clear coated
 14* 618* Polished nickel, clear coated
 15* 619* Satin nickel, clear coated
 Mild non-abrasive detergent Abrasive cleaners, bleach solvents,
 20D 624 Statuary dark bronze, clear coated
 with damp cloth or sponge steel or bronze wool
 26* 625* Polished chrome




 07/25
 26D* 626* Satin chrome
 32* 629* Polished stainless steel




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 32D* 630* Satin stainless steel Plastic pad or bronze wool Cleaners, solvents, bleach, steel wool

* Exit devices are available in all standard finishes, except 14, 15, 26 & 26D. With these finishes, exit devices are supplied in 32 or 32D to match
 accordingly. 32 or 32D is automatically supplied when 26 or 26D is specified. For nickel finishes, specify 14/32 or 15/32D to receive nickel
 finished trims and stainless exit devices.
Note: FLW & FSW are NOT available in 32 or 32D
Note: Pulls and thumb piece trims are not available in 14, 15, 26 or 26D except FLW & FSW which are available in 14 and 15.


Lock/Cylinder Finish

 Device Finish Cylinder/Core*
 03, 04, 09, 10, 10B, 10BE, 10BL, 20D 04
 14, 15, 26, 26D, 32, 32D 15
 BSP BSP

*Finish when cylinder provided with Device




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
To avoid discoloration and pitting:
• Keep stainless steel away from contact with other metals
• Avoid cleaning with mineral acids or chlorine products
• Avoid cleaning with abrasive products like sandpaper or steel
wool

To maintain the finish:
• Remove any contamination before damage occurs
• Protect with a metal polish or car wax




 1-800-727-5477 • www.sargentlock.com
 77 90641
', 2431, 1, 'finishes and finish care
80 series


finish
sargent# bhma# description how to clean avoid these cleaners
 3 605 polished brass, clear coated
 4 606 satin brass, clear coated
 9 611 polished bronze, clear coated mild non-abrasive detergent abrasive cleaners, bleach solvents,
 10 612 satin bronze, clear coated with damp cloth or sponge steel or bronze wool

 bsp — black suede powder coat
 32dcp — satin stainless steel, clear coated

 10b 613 oxidized bronze, oil rubbed
 abrasive cleaners, bleach solvents,
 lemon oil polished with dry cloth
 dark oxidized satin bronze, steel or bronze wool
 10be 613e
 equivalent
 10bl 613l oxidized satin, bronze, clear coated
 14* 618* polished nickel, clear coated
 15* 619* satin nickel, clear coated
 mild non-abrasive detergent abrasive cleaners, bleach solvents,
 20d 624 statuary dark bronze, clear coated
 with damp cloth or sponge steel or bronze wool
 26* 625* polished chrome




 07/25
 26d* 626* satin chrome
 32* 629* polished stainless steel




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 32d* 630* satin stainless steel plastic pad or bronze wool cleaners, solvents, bleach, steel wool

* exit devices are available in all standard finishes, except 14, 15, 26 & 26d. with these finishes, exit devices are supplied in 32 or 32d to match
 accordingly. 32 or 32d is automatically supplied when 26 or 26d is specified. for nickel finishes, specify 14/32 or 15/32d to receive nickel
 finished trims and stainless exit devices.
note: flw & fsw are not available in 32 or 32d
note: pulls and thumb piece trims are not available in 14, 15, 26 or 26d except flw & fsw which are available in 14 and 15.


lock/cylinder finish

 device finish cylinder/core*
 03, 04, 09, 10, 10b, 10be, 10bl, 20d 04
 14, 15, 26, 26d, 32, 32d 15
 bsp bsp

*finish when cylinder provided with device




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
to avoid discoloration and pitting:
• keep stainless steel away from contact with other metals
• avoid cleaning with mineral acids or chlorine products
• avoid cleaning with abrasive products like sandpaper or steel
wool

to maintain the finish:
• remove any contamination before damage occurs
• protect with a metal polish or car wax




 1-800-727-5477 • www.sargentlock.com
 77 90641
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 78, ' Architectural Specifications
 80 Series


 2.01 EXIT DEVICES
 A. Exit devices shall be 80 Series push rail devices as manufactured by SARGENT Manufacturing Company, New Haven, CT.
 B. Exit devices shall be certified to meet or exceed the requirements of ANSI/BHMA A156.3 Grade 1.
 C. Exit devices shall be listed by Underwriters Laboratories for panic and bear the UL label for life safety in full compliance with NFPA 80 

 and NFPA 101. Exit devices for fire labeled doors shall be UL listed as “Fire Exit Hardware”.
 D. Exit Devices shall be certified to meet the requirements of ANSI/BHMA A156.41, Door Hardware Single Motion To Egress.
 E. Provide standard hex key dogging on non fire-rated exit devices, with cylinder dogging (i.e., SARGENT 16- option) as an option.
 F. Exit devices shall comply with UL 10C positive pressure requirements.
 G. Construction:
 1. Chassis shall be of heavy duty cast design with one piece drawn nonferrous removable covers matching the material of the push and
 mounting rails.
 2. Stamped steel chassis are not acceptable.
 3. Mounting rails shall be formed from a solid single piece of stainless steel, brass or bronze no less than 0.072 inches thick.
 4. Push rails shall be constructed of 0.062 inch thick material in the same manner as the mounting rail. Painted or anodized aluminum 
 shall not be considered heavy duty and are not acceptable.
 5. Provide protective Lexan touchpad on the exit device push rail to prevent scratches and serve as a visible guide to the user.
 6. Metal end caps shall be formed from the same base metal as the push and mounting rails.
 H. Exit devices shall have a maximum of 3 inches projection from the face of the door in the non-dogged position. When in the dogged 
 position, the device shall have no more than a 2-1/8 inch projection from the door face.
 I. The design of the exit device shall eliminate the necessity of removing the device from the door for standard maintenance or keying changes.
 J. The device chassis shall be mounted and operable without the need of the rail or the chassis cover.
 K. Trim shall be through-bolted.




 07/25
 L. Devices shall be available with matching trim for both wide and narrow stile doors, including electrified functions when required.
 M. Exit device operating lever trim shall withstand 1000 inch pounds of torque without allowing access.




 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 N. Lever trim shall be available in architectural finishes and designs to match that of the locksets specified.
 O. Provide electrified exit devices with ElectroLynx® standardized plug connectors to accommodate up to twelve wires.
 P. Plug connectors shall plug directly into ElectroLynx® through-door wiring harnesses for connection to electric transfer hinge and power
 supplies.
 Q. Provide sufficient number of concealed wires to accommodate electric function of specified hardware.
 R. Exit devices shall have a five year limited warranty.

 These guidelines should be referenced regularly and as required for proper appearance and longevity of finish.




 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.




90641
 78 1-800-727-5477 • www.sargentlock.com
', 3350, 1, ' architectural specifications
 80 series


 2.01 exit devices
 a. exit devices shall be 80 series push rail devices as manufactured by sargent manufacturing company, new haven, ct.
 b. exit devices shall be certified to meet or exceed the requirements of ansi/bhma a156.3 grade 1.
 c. exit devices shall be listed by underwriters laboratories for panic and bear the ul label for life safety in full compliance with nfpa 80 

 and nfpa 101. exit devices for fire labeled doors shall be ul listed as “fire exit hardware”.
 d. exit devices shall be certified to meet the requirements of ansi/bhma a156.41, door hardware single motion to egress.
 e. provide standard hex key dogging on non fire-rated exit devices, with cylinder dogging (i.e., sargent 16- option) as an option.
 f. exit devices shall comply with ul 10c positive pressure requirements.
 g. construction:
 1. chassis shall be of heavy duty cast design with one piece drawn nonferrous removable covers matching the material of the push and
 mounting rails.
 2. stamped steel chassis are not acceptable.
 3. mounting rails shall be formed from a solid single piece of stainless steel, brass or bronze no less than 0.072 inches thick.
 4. push rails shall be constructed of 0.062 inch thick material in the same manner as the mounting rail. painted or anodized aluminum 
 shall not be considered heavy duty and are not acceptable.
 5. provide protective lexan touchpad on the exit device push rail to prevent scratches and serve as a visible guide to the user.
 6. metal end caps shall be formed from the same base metal as the push and mounting rails.
 h. exit devices shall have a maximum of 3 inches projection from the face of the door in the non-dogged position. when in the dogged 
 position, the device shall have no more than a 2-1/8 inch projection from the door face.
 i. the design of the exit device shall eliminate the necessity of removing the device from the door for standard maintenance or keying changes.
 j. the device chassis shall be mounted and operable without the need of the rail or the chassis cover.
 k. trim shall be through-bolted.




 07/25
 l. devices shall be available with matching trim for both wide and narrow stile doors, including electrified functions when required.
 m. exit device operating lever trim shall withstand 1000 inch pounds of torque without allowing access.




 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 n. lever trim shall be available in architectural finishes and designs to match that of the locksets specified.
 o. provide electrified exit devices with electrolynx® standardized plug connectors to accommodate up to twelve wires.
 p. plug connectors shall plug directly into electrolynx® through-door wiring harnesses for connection to electric transfer hinge and power
 supplies.
 q. provide sufficient number of concealed wires to accommodate electric function of specified hardware.
 r. exit devices shall have a five year limited warranty.

 these guidelines should be referenced regularly and as required for proper appearance and longevity of finish.




 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.




90641
 78 1-800-727-5477 • www.sargentlock.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 79, ' 80 Series Notes




1-800-727-5477 • www.sargentlock.com




79
90641
 07/25 Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written
 permission of SARGENT Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents.
', 334, 1, ' 80 series notes




1-800-727-5477 • www.sargentlock.com




79
90641
 07/25 copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written
 permission of sargent manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('5951c34371c6b788', 80, 'The ASSA ABLOY Group is the global leader
in access solutions. Every day, we help billions
of people experience a more open world.
ASSA ABLOY Opening Solutions leads
the development within door openings
and products for access solutions in
homes, businesses and institutions. Our
offering includes doors, frames, door and
window hardware, mechanical and smart
locks, access control and service.




SARGENT Manufacturing Company
100 Sargent Drive
New Haven, CT 06511 USA
800-727-5477
www.sargentlock.com

Founded in the early 1800s, SARGENT® is a market leader in locksets, cylinders, door closers, exit devices, electro-mechanical products and access control systems for
new construction, renovation, and replacement applications. The company’s customer base includes commercial construction, institutional, and industrial markets.
Copyright © 1998-2025, SARGENT Manufacturing Company. All rights reserved. Reproduction in whole or in part without the express written permission of SARGENT
Manufacturing Company is prohibited. Patent pending and/or patent www.assaabloydss.com/patents. 90641 07/25
', 1099, 1, 'the assa abloy group is the global leader
in access solutions. every day, we help billions
of people experience a more open world.
assa abloy opening solutions leads
the development within door openings
and products for access solutions in
homes, businesses and institutions. our
offering includes doors, frames, door and
window hardware, mechanical and smart
locks, access control and service.




sargent manufacturing company
100 sargent drive
new haven, ct 06511 usa
800-727-5477
www.sargentlock.com

founded in the early 1800s, sargent® is a market leader in locksets, cylinders, door closers, exit devices, electro-mechanical products and access control systems for
new construction, renovation, and replacement applications. the company’s customer base includes commercial construction, institutional, and industrial markets.
copyright © 1998-2025, sargent manufacturing company. all rights reserved. reproduction in whole or in part without the express written permission of sargent
manufacturing company is prohibited. patent pending and/or patent www.assaabloydss.com/patents. 90641 07/25
');
INSERT OR IGNORE INTO products (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description, available, spec_sheet_url, catalog_number, search_text) VALUES ('prod-sargent-8800', 'mfr-sargent', 'doors', '80', 'Exit Devices', '8800', 'Sargent 8800', 'Exit Devices; manufacturer technical catalogue', 1, 'https://marketing-assets.seclock.com/image/upload/SARGENT_80_Series_Catalog', '8800', 'sargent 8800 80 exit devices');
INSERT OR IGNORE INTO product_documents (id, product_id, document_type, document_title, document_url, r2_object_key, r2_bucket, mime_type, page_count, file_size_bytes, file_hash_sha256, verified, active, notes) VALUES ('doc-g021-sargent-8800', 'prod-sargent-8800', 'cut_sheet', 'Sargent 80 Series Exit Device Catalog 90641 (07/25) (PDF p.10)', 'https://marketing-assets.seclock.com/image/upload/SARGENT_80_Series_Catalog', 'catalog-corpus/e28aa64695674220eed8f6dc101bdcbfe262944e1b7731352fc99ced30b5f63c.pdf', 'subx-uploads', 'application/pdf', 80, 9265553, '5951c34371c6b788da4ab0be979a7b3a526ca850906a15e98de1ba49948c8d67', 1, 1, 'g021: model visually verified on PDF ordinal 10. Full book; fetch is offline through catalog-corpus, never request-time.');
INSERT INTO catalogue_pages_fts (rowid, text_content) SELECT p.rowid, p.text_content FROM catalogue_pages p JOIN catalogues c ON c.catalogue_id = p.catalogue_id WHERE c.catalogue_id = '5951c34371c6b788' AND c.index_built = 0 AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = c.catalogue_id) = c.page_count;
UPDATE catalogues SET index_built = 1 WHERE index_built = 0 AND catalogue_id = '5951c34371c6b788' AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = '5951c34371c6b788') = page_count;
INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES ('https://marketing-assets.seclock.com/image/upload/SARGENT_80_Series_Catalog', 'g021-priority-5', '2026-10-09T17:21:27.722007+00:00');
