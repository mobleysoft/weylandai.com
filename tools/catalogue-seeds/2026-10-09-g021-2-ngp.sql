-- Goal g021: public manufacturer technical book, verified 2026-10-09.
-- Source: https://www.ngp.com/ngp/cache/file/065F4F55-38B1-4AEC-852956EFA8B92AC7.pdf
-- Content SHA256: ab117b53b17abbe593cab804e4683282aeca045265b3dcf1f879f3cd4236aea3
-- Full book text uses 1-based PDF ordinals; the original PDF is ingested offline by catalog-corpus.
-- INSERT OR IGNORE preserves existing records; reruns add no duplicates.
INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, website, verified, notes) VALUES ('mfr-ngp', 'National Guard Products', 'ngp', 'doors', 'https://www.ngp.com', 1, 'g021 public technical catalogue seed');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('NGP', 'mfr-ngp', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('NG', 'mfr-ngp', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('NATIONAL GUARD', 'mfr-ngp', 'g021_public_catalogue');
INSERT OR IGNORE INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, text_extracted, index_built, source_url) VALUES ('ab117b53b17abbe5', 'g021-ngp-ab117b53b17abbe5.pdf', 'ab117b53b17abbe593cab804e4683282aeca045265b3dcf1f879f3cd4236aea3', 6619632, 32, 'ngp', 'National Guard Products Condensed Catalog', '2026-10-09T17:21:25.581447+00:00', 'g021-catalogue-seed', 'catalog-corpus/7c122f87b32bb9b538cb8bf50a18af7c6f314587d30e7e1c6fa437f02d0a059a.pdf', 1, 0, 'https://www.ngp.com/ngp/cache/file/065F4F55-38B1-4AEC-852956EFA8B92AC7.pdf');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 1, ' CONDENSED

CATALOG



 NGP-CAT-CON-0125-A
', 43, 1, ' condensed

catalog



 ngp-cat-con-0125-a
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 2, 'CONDENSED CATALOG INDEX
Bumper Seal Thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3 Nylon Brush Seals with EPDM Rubber Insert. . . . . . 12
Concealed Fastener Seals . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8 Perimeter Seals. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
Continuous Hinge, Aluminum Geared Glass. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
 Concealed. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 21 Half Saddle Thresholds . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
 Full Surface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22 Heavy-Duty Thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
 Half Surface. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22 Hospitality
Continuous Hinge, Stainless Steel Door Bottoms, Door Shoes, Door Guards. . . . . . . . . . 16
 Concealed. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23 Security Door Guard . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
 Full Surface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 Vinyl Thresholds, Smoke Seal. . . . . . . . . . . . . . . . . . . . . . 15
 Half Mortise. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 Lite Kits & Louvers. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18-19
 Swing Clear. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 Offset Saddle Thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
Cover Plates . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4 Saddle Thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3
Finger Guard. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .17 Self-Adhesive Gasketing. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
Flood Shield . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17 Sliding Door Hardware . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 
GAPGUARD™ . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29-30 By-Pass, Bi-Fold. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
Gasketing By-Pass, Side Wall Mount. . . . . . . . . . . . . . . . . . . . . . . . . . 26
 Adjustable Perimeter Seals. . . . . . . . . . . . . . . . . . . . . . . . 10 Pocket Door/Frame Kit. . . . . . . . . . . . . . . . . . . . . . . . . . . . 27
 Astragals. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10 Stainless Steel. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28
 Automatic Door Bottoms. . . . . . . . . . . . . . . . . . . . . . . . . . . 11 Stainless Steel Saddle. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
 Door Shoes. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14 Thermal Break Thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
 Door Sweeps. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13

NUMERICAL INDEX
12V . . . . . . . . . . . . . . . . . . . . . . . 14 434 . . . . . . . . . . . . . . . . . . . . . . . . 3 2248 . . . . . . . . . . . . . . . . . . . . . . 17 HD5400 . . . . . . . . . . . . . . . . . . 22
20T ™ . . . . . . . . . . . . . . . . . . . . . 20 435 . . . . . . . . . . . . . . . . . . . . . . . . 3 2252 . . . . . . . . . . . . . . . . . . . . . . . 17 HD5700 . . . . . . . . . . . . . . . . . . 22
36ET . . . . . . . . . . . . . . . . . . . . . 16 436 . . . . . . . . . . . . . . . . . . . . . . . . 3 5020 . . . . . . . . . . . . . . . . . . . . . . 7 HP90-CYL . . . . . . . . . . . . . . . . 30
36ET6 . . . . . . . . . . . . . . . . . . . . 14 437 . . . . . . . . . . . . . . . . . . . . . . . . 3 5050 . . . . . . . . . . . . . . . . . . . . . . 7 HP90-FB . . . . . . . . . . . . . . . . . 30
97V . . . . . . . . . . . . . . . . . . . . . . . . 13 438 . . . . . . . . . . . . . . . . . . . . . . . . 3 5070 . . . . . . . . . . . . . . . . . . . . . . 7 HP90-MORT . . . . . . . . . . . . . 30
101V . . . . . . . . . . . . . . . . . . . . . . . 13 439 . . . . . . . . . . . . . . . . . . . . . . . . 3 5075 . . . . . . . . . . . . . . . . . . . . 7, 15 INSULATED
103N . . . . . . . . . . . . . . . . . . . . . 10 440 . . . . . . . . . . . . . . . . . . . . . . . 3 8424 . . . . . . . . . . . . . . . . . . . . . . 6 TEMPERED GLASS . . . . . 20
107 . . . . . . . . . . . . . . . . . . . . . . . 10 512SS . . . . . . . . . . . . . . . . . . . . . . 6 8425 . . . . . . . . . . . . . . . . . . . . . . 6 L-CVFM-SS . . . . . . . . . . . . . . . 18
110 . . . . . . . . . . . . . . . . . . . . . . . . 9 513 . . . . . . . . . . . . . . . . . . . . . . . . 3 8426 . . . . . . . . . . . . . . . . . . . . . . 6 L-700-A . . . . . . . . . . . . . . . . . . 18
115N . . . . . . . . . . . . . . . . . . . . . . 10 513HD . . . . . . . . . . . . . . . . . . . . . 4 8427 . . . . . . . . . . . . . . . . . . . . . . 6 L-700-RX . . . . . . . . . . . . . . . . . 18
137 . . . . . . . . . . . . . . . . . . . . . . . . 9 513SS . . . . . . . . . . . . . . . . . . . . . . 6 8428 . . . . . . . . . . . . . . . . . . . . . . 6 LAMINATED GLASS . . . . . . 20
155 . . . . . . . . . . . . . . . . . . . . . . . . 9 A605 . . . . . . . . . . . . . . . . . . . . . . 9 8429 . . . . . . . . . . . . . . . . . . . . . . 6 L-FRA100 . . . . . . . . . . . . . . . . . 18
158 . . . . . . . . . . . . . . . . . . . . . . . 10 613 . . . . . . . . . . . . . . . . . . . . . . . . 3 8430 . . . . . . . . . . . . . . . . . . . . . . 6 LO-PRO™ . . . . . . . . . . . . . . . . . 19
160 . . . . . . . . . . . . . . . . . . . . . . . . 9 A626 . . . . . . . . . . . . . . . . . . . . . . 9 9590 . . . . . . . . . . . . . . . . . . . . . 30 LO-PRO™-IS . . . . . . . . . . . . . . 19
170 . . . . . . . . . . . . . . . . . . . . . . . . 8 C627 . . . . . . . . . . . . . . . . . . . . . . 13 9595DKB . . . . . . . . . . . . . . . . . 30 PROTECT3™ . . . . . . . . . . . . . . 20
172 . . . . . . . . . . . . . . . . . . . . . . . . 8 653 . . . . . . . . . . . . . . . . . . . . . . . . 5 9990 . . . . . . . . . . . . . . . . . . . . . 29 Pyran® Platinum F . . . . . . . 20
200 . . . . . . . . . . . . . . . . . . . . . . . . 13 659 . . . . . . . . . . . . . . . . . . . . . . . . 5 AFDL . . . . . . . . . . . . . . . . . . . . . 18 SDG . . . . . . . . . . . . . . . . . . . . . . 16
220 . . . . . . . . . . . . . . . . . . . . . . . . 11 672 . . . . . . . . . . . . . . . . . . . . . . . . 8 FDLS . . . . . . . . . . . . . . . . . . . . . 19 SLAL-250-BP . . . . . . . . . . . . . 26
319EV . . . . . . . . . . . . . . . . . . . . 14 675 . . . . . . . . . . . . . . . . . . . . . 8, 13 FS10 . . . . . . . . . . . . . . . . . . . . . . . 17 SLAL-250-PD . . . . . . . . . . . . . 27
320 . . . . . . . . . . . . . . . . . . . . . . . . 11 D690 . . . . . . . . . . . . . . . . . . . . . . 12 FS22 . . . . . . . . . . . . . . . . . . . . . . 17 SLAL-250-PDKIT . . . . . . . . . 27
324 . . . . . . . . . . . . . . . . . . . . . . . . 5 C697 . . . . . . . . . . . . . . . . . . . . . . 12 FS34 . . . . . . . . . . . . . . . . . . . . . . 17 SLAL-250-SW . . . . . . . . . . . . 26
325 . . . . . . . . . . . . . . . . . . . . . . . . 5 D698 . . . . . . . . . . . . . . . . . . . . . . 12 FSSP . . . . . . . . . . . . . . . . . . . . . . 17 SLAL-75-BF . . . . . . . . . . . . . . 25
335N . . . . . . . . . . . . . . . . . . . . . 16 C699 . . . . . . . . . . . . . . . . . . . . . . 12 GAP90™ . . . . . . . . . . . . . . . . . . 29 SLAL-75-BP . . . . . . . . . . . . . . 25
400 . . . . . . . . . . . . . . . . . . . . . . . 15 700 . . . . . . . . . . . . . . . . . . . . . . . . 9 GAP90-ME . . . . . . . . . . . . . . . 29 SLAL-75-BPF . . . . . . . . . . . . . 25
401 . . . . . . . . . . . . . . . . . . . . . . . . 15 713 . . . . . . . . . . . . . . . . . . . . . . . . 3 GAP90N™ . . . . . . . . . . . . . . . . 29 SLSS1 . . . . . . . . . . . . . . . . . . . . . 28
413 . . . . . . . . . . . . . . . . . . . . . . . . 3 813 . . . . . . . . . . . . . . . . . . . . . . . . 3 GAPGUARD™ SLSS2 . . . . . . . . . . . . . . . . . . . . 28
420N . . . . . . . . . . . . . . . . . . . . . . 11 814 . . . . . . . . . . . . . . . . . . . . . . . . 4 FIRE CAULK . . . . . . . . . . . . 30 SS300 . . . . . . . . . . . . . . . . . . . . 23
423N . . . . . . . . . . . . . . . . . . . . . . 11 814SS . . . . . . . . . . . . . . . . . . . . . 4 HD1100 . . . . . . . . . . . . . . . . . . . . 21 SS302 . . . . . . . . . . . . . . . . . . . . 24
424E . . . . . . . . . . . . . . . . . . . . . . 3 818 . . . . . . . . . . . . . . . . . . . . . . . . 4 HD1400 . . . . . . . . . . . . . . . . . . . 21 SS304 . . . . . . . . . . . . . . . . . . . . 24
425E . . . . . . . . . . . . . . . . . . . . . . 3 818SS . . . . . . . . . . . . . . . . . . . . . 4 HD1800 . . . . . . . . . . . . . . . . . . . 21 SS305 . . . . . . . . . . . . . . . . . . . . 23
425HD . . . . . . . . . . . . . . . . . . . . 4 838 . . . . . . . . . . . . . . . . . . . . . . . . 4 HD2100 . . . . . . . . . . . . . . . . . . 22 SS306 . . . . . . . . . . . . . . . . . . . . 24
426E . . . . . . . . . . . . . . . . . . . . . . 3 896 . . . . . . . . . . . . . . . . . . . . . . . . 3 HD2400 . . . . . . . . . . . . . . . . . . . 21 SS311 . . . . . . . . . . . . . . . . . . . . . 24
427E . . . . . . . . . . . . . . . . . . . . . . 3 896HD . . . . . . . . . . . . . . . . . . . . 4 HD2700 . . . . . . . . . . . . . . . . . . . 21 SS315 . . . . . . . . . . . . . . . . . . . . . 23
428E . . . . . . . . . . . . . . . . . . . . . . 3 913 . . . . . . . . . . . . . . . . . . . . . . . . 3 HD4100 . . . . . . . . . . . . . . . . . . . 21 TEMPERED GLASS . . . . . . . 20
429E . . . . . . . . . . . . . . . . . . . . . . 3 950 . . . . . . . . . . . . . . . . . . . . . . . . 3 HD4200 . . . . . . . . . . . . . . . . . . 22
430E . . . . . . . . . . . . . . . . . . . . . . 3 1013 . . . . . . . . . . . . . . . . . . . . . . . 3 HD5300 . . . . . . . . . . . . . . . . . . 22


 Phone: 800-647-7874 | Fax: 800-255-7874 | orders@ngp.com | ngp.com
', 10504, 1, 'condensed catalog index
bumper seal thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3 nylon brush seals with epdm rubber insert. . . . . . 12
concealed fastener seals . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8 perimeter seals. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9
continuous hinge, aluminum geared glass. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 20
 concealed. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 21 half saddle thresholds . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
 full surface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22 heavy-duty thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4
 half surface. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 22 hospitality
continuous hinge, stainless steel door bottoms, door shoes, door guards. . . . . . . . . . 16
 concealed. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 23 security door guard . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 16
 full surface . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 vinyl thresholds, smoke seal. . . . . . . . . . . . . . . . . . . . . . 15
 half mortise. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 lite kits & louvers. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 18-19
 swing clear. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 24 offset saddle thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5
cover plates . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4 saddle thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3
finger guard. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .17 self-adhesive gasketing. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7
flood shield . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 17 sliding door hardware . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 
gapguard™ . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 29-30 by-pass, bi-fold. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 25
gasketing by-pass, side wall mount. . . . . . . . . . . . . . . . . . . . . . . . . . 26
 adjustable perimeter seals. . . . . . . . . . . . . . . . . . . . . . . . 10 pocket door/frame kit. . . . . . . . . . . . . . . . . . . . . . . . . . . . 27
 astragals. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 10 stainless steel. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 28
 automatic door bottoms. . . . . . . . . . . . . . . . . . . . . . . . . . . 11 stainless steel saddle. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
 door shoes. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 14 thermal break thresholds. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 6
 door sweeps. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 13

numerical index
12v . . . . . . . . . . . . . . . . . . . . . . . 14 434 . . . . . . . . . . . . . . . . . . . . . . . . 3 2248 . . . . . . . . . . . . . . . . . . . . . . 17 hd5400 . . . . . . . . . . . . . . . . . . 22
20t ™ . . . . . . . . . . . . . . . . . . . . . 20 435 . . . . . . . . . . . . . . . . . . . . . . . . 3 2252 . . . . . . . . . . . . . . . . . . . . . . . 17 hd5700 . . . . . . . . . . . . . . . . . . 22
36et . . . . . . . . . . . . . . . . . . . . . 16 436 . . . . . . . . . . . . . . . . . . . . . . . . 3 5020 . . . . . . . . . . . . . . . . . . . . . . 7 hp90-cyl . . . . . . . . . . . . . . . . 30
36et6 . . . . . . . . . . . . . . . . . . . . 14 437 . . . . . . . . . . . . . . . . . . . . . . . . 3 5050 . . . . . . . . . . . . . . . . . . . . . . 7 hp90-fb . . . . . . . . . . . . . . . . . 30
97v . . . . . . . . . . . . . . . . . . . . . . . . 13 438 . . . . . . . . . . . . . . . . . . . . . . . . 3 5070 . . . . . . . . . . . . . . . . . . . . . . 7 hp90-mort . . . . . . . . . . . . . 30
101v . . . . . . . . . . . . . . . . . . . . . . . 13 439 . . . . . . . . . . . . . . . . . . . . . . . . 3 5075 . . . . . . . . . . . . . . . . . . . . 7, 15 insulated
103n . . . . . . . . . . . . . . . . . . . . . 10 440 . . . . . . . . . . . . . . . . . . . . . . . 3 8424 . . . . . . . . . . . . . . . . . . . . . . 6 tempered glass . . . . . 20
107 . . . . . . . . . . . . . . . . . . . . . . . 10 512ss . . . . . . . . . . . . . . . . . . . . . . 6 8425 . . . . . . . . . . . . . . . . . . . . . . 6 l-cvfm-ss . . . . . . . . . . . . . . . 18
110 . . . . . . . . . . . . . . . . . . . . . . . . 9 513 . . . . . . . . . . . . . . . . . . . . . . . . 3 8426 . . . . . . . . . . . . . . . . . . . . . . 6 l-700-a . . . . . . . . . . . . . . . . . . 18
115n . . . . . . . . . . . . . . . . . . . . . . 10 513hd . . . . . . . . . . . . . . . . . . . . . 4 8427 . . . . . . . . . . . . . . . . . . . . . . 6 l-700-rx . . . . . . . . . . . . . . . . . 18
137 . . . . . . . . . . . . . . . . . . . . . . . . 9 513ss . . . . . . . . . . . . . . . . . . . . . . 6 8428 . . . . . . . . . . . . . . . . . . . . . . 6 laminated glass . . . . . . 20
155 . . . . . . . . . . . . . . . . . . . . . . . . 9 a605 . . . . . . . . . . . . . . . . . . . . . . 9 8429 . . . . . . . . . . . . . . . . . . . . . . 6 l-fra100 . . . . . . . . . . . . . . . . . 18
158 . . . . . . . . . . . . . . . . . . . . . . . 10 613 . . . . . . . . . . . . . . . . . . . . . . . . 3 8430 . . . . . . . . . . . . . . . . . . . . . . 6 lo-pro™ . . . . . . . . . . . . . . . . . 19
160 . . . . . . . . . . . . . . . . . . . . . . . . 9 a626 . . . . . . . . . . . . . . . . . . . . . . 9 9590 . . . . . . . . . . . . . . . . . . . . . 30 lo-pro™-is . . . . . . . . . . . . . . 19
170 . . . . . . . . . . . . . . . . . . . . . . . . 8 c627 . . . . . . . . . . . . . . . . . . . . . . 13 9595dkb . . . . . . . . . . . . . . . . . 30 protect3™ . . . . . . . . . . . . . . 20
172 . . . . . . . . . . . . . . . . . . . . . . . . 8 653 . . . . . . . . . . . . . . . . . . . . . . . . 5 9990 . . . . . . . . . . . . . . . . . . . . . 29 pyran® platinum f . . . . . . . 20
200 . . . . . . . . . . . . . . . . . . . . . . . . 13 659 . . . . . . . . . . . . . . . . . . . . . . . . 5 afdl . . . . . . . . . . . . . . . . . . . . . 18 sdg . . . . . . . . . . . . . . . . . . . . . . 16
220 . . . . . . . . . . . . . . . . . . . . . . . . 11 672 . . . . . . . . . . . . . . . . . . . . . . . . 8 fdls . . . . . . . . . . . . . . . . . . . . . 19 slal-250-bp . . . . . . . . . . . . . 26
319ev . . . . . . . . . . . . . . . . . . . . 14 675 . . . . . . . . . . . . . . . . . . . . . 8, 13 fs10 . . . . . . . . . . . . . . . . . . . . . . . 17 slal-250-pd . . . . . . . . . . . . . 27
320 . . . . . . . . . . . . . . . . . . . . . . . . 11 d690 . . . . . . . . . . . . . . . . . . . . . . 12 fs22 . . . . . . . . . . . . . . . . . . . . . . 17 slal-250-pdkit . . . . . . . . . 27
324 . . . . . . . . . . . . . . . . . . . . . . . . 5 c697 . . . . . . . . . . . . . . . . . . . . . . 12 fs34 . . . . . . . . . . . . . . . . . . . . . . 17 slal-250-sw . . . . . . . . . . . . 26
325 . . . . . . . . . . . . . . . . . . . . . . . . 5 d698 . . . . . . . . . . . . . . . . . . . . . . 12 fssp . . . . . . . . . . . . . . . . . . . . . . 17 slal-75-bf . . . . . . . . . . . . . . 25
335n . . . . . . . . . . . . . . . . . . . . . 16 c699 . . . . . . . . . . . . . . . . . . . . . . 12 gap90™ . . . . . . . . . . . . . . . . . . 29 slal-75-bp . . . . . . . . . . . . . . 25
400 . . . . . . . . . . . . . . . . . . . . . . . 15 700 . . . . . . . . . . . . . . . . . . . . . . . . 9 gap90-me . . . . . . . . . . . . . . . 29 slal-75-bpf . . . . . . . . . . . . . 25
401 . . . . . . . . . . . . . . . . . . . . . . . . 15 713 . . . . . . . . . . . . . . . . . . . . . . . . 3 gap90n™ . . . . . . . . . . . . . . . . 29 slss1 . . . . . . . . . . . . . . . . . . . . . 28
413 . . . . . . . . . . . . . . . . . . . . . . . . 3 813 . . . . . . . . . . . . . . . . . . . . . . . . 3 gapguard™ slss2 . . . . . . . . . . . . . . . . . . . . 28
420n . . . . . . . . . . . . . . . . . . . . . . 11 814 . . . . . . . . . . . . . . . . . . . . . . . . 4 fire caulk . . . . . . . . . . . . 30 ss300 . . . . . . . . . . . . . . . . . . . . 23
423n . . . . . . . . . . . . . . . . . . . . . . 11 814ss . . . . . . . . . . . . . . . . . . . . . 4 hd1100 . . . . . . . . . . . . . . . . . . . . 21 ss302 . . . . . . . . . . . . . . . . . . . . 24
424e . . . . . . . . . . . . . . . . . . . . . . 3 818 . . . . . . . . . . . . . . . . . . . . . . . . 4 hd1400 . . . . . . . . . . . . . . . . . . . 21 ss304 . . . . . . . . . . . . . . . . . . . . 24
425e . . . . . . . . . . . . . . . . . . . . . . 3 818ss . . . . . . . . . . . . . . . . . . . . . 4 hd1800 . . . . . . . . . . . . . . . . . . . 21 ss305 . . . . . . . . . . . . . . . . . . . . 23
425hd . . . . . . . . . . . . . . . . . . . . 4 838 . . . . . . . . . . . . . . . . . . . . . . . . 4 hd2100 . . . . . . . . . . . . . . . . . . 22 ss306 . . . . . . . . . . . . . . . . . . . . 24
426e . . . . . . . . . . . . . . . . . . . . . . 3 896 . . . . . . . . . . . . . . . . . . . . . . . . 3 hd2400 . . . . . . . . . . . . . . . . . . . 21 ss311 . . . . . . . . . . . . . . . . . . . . . 24
427e . . . . . . . . . . . . . . . . . . . . . . 3 896hd . . . . . . . . . . . . . . . . . . . . 4 hd2700 . . . . . . . . . . . . . . . . . . . 21 ss315 . . . . . . . . . . . . . . . . . . . . . 23
428e . . . . . . . . . . . . . . . . . . . . . . 3 913 . . . . . . . . . . . . . . . . . . . . . . . . 3 hd4100 . . . . . . . . . . . . . . . . . . . 21 tempered glass . . . . . . . 20
429e . . . . . . . . . . . . . . . . . . . . . . 3 950 . . . . . . . . . . . . . . . . . . . . . . . . 3 hd4200 . . . . . . . . . . . . . . . . . . 22
430e . . . . . . . . . . . . . . . . . . . . . . 3 1013 . . . . . . . . . . . . . . . . . . . . . . . 3 hd5300 . . . . . . . . . . . . . . . . . . 22


 phone: 800-647-7874 | fax: 800-255-7874 | orders@ngp.com | ngp.com
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 3, 'RATINGS
R ATING SYMBOLS LEGEND

 POSITIVE PRESSURE - CERTIFIED by UL to ANSI/UL10C Complies with IBC, NFPA 80 and
 NFPA 252 for application to hollow metal fire doors rated up to 3 hours, and wood fire doors rated
 up to 90 minutes (some ratings vary as noted).

 CERTIFIED by UL to CAN/ULC-S104 and ANSI/UL10B Complies with NFPA 80 and
 NFPA 252 for application to hollow metal fire doors rated up to 3 hours, and wood fire doors
 rated up to 90 minutes (some ratings vary as noted).

 NGP-EDGE® SEALING SYSTEM, CERTIFIED by UL to ANSI/UL10C Category ‘G’
 Required for Category B wood fire doors to meet positive pressure requirements complying with
 IBC, and NFPA 252. See individual products for maximum door size and ratings.

 SMOKE & DRAFT CONTROL GASKETING, CERTIFIED by UL to ANSI/UL10C and
 ANSI/UL 1784 Category ‘H’ Complies with IBC and NFPA 105 for use on ‘S’ labeled positive
 pressure hollow metal fire doors rated up to 3 hours, and wood fire doors rated up to 90 minutes
 (some ratings vary as noted).

 ACOUSTICAL TESTED to ASTM E90 Standard Test Method for Laboratory Measurement of
 Airborne Sound Transmission Loss of Building Partitions and Elements, and ASTM E2235 Standard
 Test Method for Determination of Decay Rates for use in Sound Insulation Test Methods.

 AIR INFILTRATION TESTED to ASTM E283, Standard Test Method for Determining Rate of Air
 Leakage Through Exterior Windows, Curtain Walls, and Doors.

 ANTI-MICROBIAL Treated with an anti-microbial additive to inhibit the growth of microorganisms.

 ANSI/BHMA CERTIFIED Certified gasketing complies with American National Standard for
 Door Gasketing and Edge Seal Systems ANSI/BHMA A156.22, and is listed in the BHMA Certified
 Products Directory.

 Online product listings: ul.com/database




LEED GREEN BUILDING
The LEED (Leadership in Energy and Environmental Design) Green Building Rating System® is a national
standard for developing high-performance, sustainable buildings developed by the U. S. Green Building
Council. Our current LEED letter containing LEED qualification information for all our products is available
at ngp.com
Environmental Product Declarations (EPD) prepared and certified by an Independent Laboratory based on
Life Cycle Assessments (LCA) of our products may be viewed on our website ngp.com
Health Product Declarations (HPD) may be viewed on our website ngp.com
National Guard Products sustainability report may be viewed on our website ngp.com
Contact us regarding our end-of-use product recycling program.

© NGP, Inc. 2025
 CONDENSED CATALOG 2
', 2563, 1, 'ratings
r ating symbols legend

 positive pressure - certified by ul to ansi/ul10c complies with ibc, nfpa 80 and
 nfpa 252 for application to hollow metal fire doors rated up to 3 hours, and wood fire doors rated
 up to 90 minutes (some ratings vary as noted).

 certified by ul to can/ulc-s104 and ansi/ul10b complies with nfpa 80 and
 nfpa 252 for application to hollow metal fire doors rated up to 3 hours, and wood fire doors
 rated up to 90 minutes (some ratings vary as noted).

 ngp-edge® sealing system, certified by ul to ansi/ul10c category ‘g’
 required for category b wood fire doors to meet positive pressure requirements complying with
 ibc, and nfpa 252. see individual products for maximum door size and ratings.

 smoke & draft control gasketing, certified by ul to ansi/ul10c and
 ansi/ul 1784 category ‘h’ complies with ibc and nfpa 105 for use on ‘s’ labeled positive
 pressure hollow metal fire doors rated up to 3 hours, and wood fire doors rated up to 90 minutes
 (some ratings vary as noted).

 acoustical tested to astm e90 standard test method for laboratory measurement of
 airborne sound transmission loss of building partitions and elements, and astm e2235 standard
 test method for determination of decay rates for use in sound insulation test methods.

 air infiltration tested to astm e283, standard test method for determining rate of air
 leakage through exterior windows, curtain walls, and doors.

 anti-microbial treated with an anti-microbial additive to inhibit the growth of microorganisms.

 ansi/bhma certified certified gasketing complies with american national standard for
 door gasketing and edge seal systems ansi/bhma a156.22, and is listed in the bhma certified
 products directory.

 online product listings: ul.com/database




leed green building
the leed (leadership in energy and environmental design) green building rating system® is a national
standard for developing high-performance, sustainable buildings developed by the u. s. green building
council. our current leed letter containing leed qualification information for all our products is available
at ngp.com
environmental product declarations (epd) prepared and certified by an independent laboratory based on
life cycle assessments (lca) of our products may be viewed on our website ngp.com
health product declarations (hpd) may be viewed on our website ngp.com
national guard products sustainability report may be viewed on our website ngp.com
contact us regarding our end-of-use product recycling program.

© ngp, inc. 2025
 condensed catalog 2
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 4, ' All Products In This Section


SADDLE THRESHOLDS
 PART # WIDTH NOTE: Flute Patterns Vary with Width of Threshold
 413* 434 4"
 513* 435 5" 1/4"
 Typical Wall .125
 613* 436 6"
 4"
 713* 437 7"
 813* 438 8"
 413 .53 lbs./ft.
 913 439 9"
 1013 440 10" Typical Wall .125


 434 .54 lbs./ft.
 PART # WIDTH 434DKB .54 lbs./ft.
 424E 4"
 425E 5" ½"
 Typical Wall .120
 426E 6"
 4"
 427E 7"
 428E 8"
 424E .65 lbs./ft.
 MATERIALS & FINISHES
 429E 9" - No Suffix: Mill Aluminum
 - DKB: Aluminum Dark Bronze/
 430E 10" Black Anodized
 - BR: Bronze (*Indicates if Available)


 CROSS REFERENCE
 NGP 413 513 613 713 813 913 1013 424E 425E 426E 427E 428E 429E 430E
 PEMKO 270 271 272 276 2748 2749 2750 170 171 172 176 2548 2549 2550
 ZERO 544 545 546 547 548 -- -- -- 8655 -- 6570 -- -- --
 HAGER 403S 413S 417S 430S 428S -- 448S 404S 412S 415S 416S 426S -- --
 KN CROWDER CT-64 CT-65 CT-66 CT-67 CT-68 CT-69 CT-610 CT-9 CT-10 CT-11 CT-12 CT-32 CT-909 CT-910

ADA COMPLIANT All Products In This Section


BUMPER SEAL THRESHOLDS
 PART # WIDTH
 896 5" ½"
 950 5"
 Typical Wall .125
 5"
 CROSS REFERENCE

 NGP 896 950
 896 .85 lbs./ft.
 PEMKO 2005 2005
 1/2"
 ZERO 65 566 Typical Wall .078
 1/4"
 HAGER 520S 477S
 5"
 KN CROWDER CT-72 CT-70
 950 .50 lbs./ft.

MATERIALS & FINISHES OPTIONAL: FASTENERS BUMPER SEAL
- No Suffix: Mill Aluminum SIA: SLIP-RESISTANT - #10 x 1-1/2" FH Zinc-Plated Seals Against the Door,
 FINISH Wood Screws Furnished. Dark Providing Weather Resistance
- DKB - Aluminum Dark Bronze/
 For Use in Areas Where Bronze Supplied With DKB B U M P E R S E A L O PT I O N S
 Black Anodized
 Conditions Can Be V Vinyl**
 Hazardous and Safety
 N NGP-TPV
 Is a Priority
 S Silicone

 **Vinyl (“V”) Supplied Unless Other
3 CONDENSED CATALOG Material Specified
', 1768, 1, ' all products in this section


saddle thresholds
 part # width note: flute patterns vary with width of threshold
 413* 434 4"
 513* 435 5" 1/4"
 typical wall .125
 613* 436 6"
 4"
 713* 437 7"
 813* 438 8"
 413 .53 lbs./ft.
 913 439 9"
 1013 440 10" typical wall .125


 434 .54 lbs./ft.
 part # width 434dkb .54 lbs./ft.
 424e 4"
 425e 5" ½"
 typical wall .120
 426e 6"
 4"
 427e 7"
 428e 8"
 424e .65 lbs./ft.
 materials & finishes
 429e 9" - no suffix: mill aluminum
 - dkb: aluminum dark bronze/
 430e 10" black anodized
 - br: bronze (*indicates if available)


 cross reference
 ngp 413 513 613 713 813 913 1013 424e 425e 426e 427e 428e 429e 430e
 pemko 270 271 272 276 2748 2749 2750 170 171 172 176 2548 2549 2550
 zero 544 545 546 547 548 -- -- -- 8655 -- 6570 -- -- --
 hager 403s 413s 417s 430s 428s -- 448s 404s 412s 415s 416s 426s -- --
 kn crowder ct-64 ct-65 ct-66 ct-67 ct-68 ct-69 ct-610 ct-9 ct-10 ct-11 ct-12 ct-32 ct-909 ct-910

ada compliant all products in this section


bumper seal thresholds
 part # width
 896 5" ½"
 950 5"
 typical wall .125
 5"
 cross reference

 ngp 896 950
 896 .85 lbs./ft.
 pemko 2005 2005
 1/2"
 zero 65 566 typical wall .078
 1/4"
 hager 520s 477s
 5"
 kn crowder ct-72 ct-70
 950 .50 lbs./ft.

materials & finishes optional: fasteners bumper seal
- no suffix: mill aluminum sia: slip-resistant - #10 x 1-1/2" fh zinc-plated seals against the door,
 finish wood screws furnished. dark providing weather resistance
- dkb - aluminum dark bronze/
 for use in areas where bronze supplied with dkb b u m p e r s e a l o pt i o n s
 black anodized
 conditions can be v vinyl**
 hazardous and safety
 n ngp-tpv
 is a priority
 s silicone

 **vinyl (“v”) supplied unless other
3 condensed catalog material specified
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 5, ' All Products In This Section


HEAVY-DUTY THRESHOLDS
 
 For Use Where Forklift or Vehicular Traffic Occurs
 
 Recommended for Delivery/Storage Doorways Where Heavier Loads Travel
 
 BHMA Certified to ANSI A156.21 Heavy Duty 10,000 lb. Load Test
 
 Optional SIA Slip-Resistant Finish Recommended in Moisture-Prone Areas

 PART # WIDTH 1/2"
 425HD 5" Typical Wall .244

 513HD 5" 5"

 896HD 5" 425HD 1.6 lbs./ft.
 1/4"

 5"
MATERIALS & FINISHES
- No Suffix: Mill Aluminum
 513HD 1.4 lbs./ft.
 Typical Wall .125
- DKB: Aluminum Dark Bronze/
 Black Anodized 1/2"
 1/4"

 BUMPER SEAL 5"
 Seals Against the Door,
 Providing Weather Resistance 896HD 1.01 lbs./ft.
 B U M P E R S E A L O PT I O N S
 CROSS REFERENCE
 V Vinyl**
 N NGP-TPV NGP 425HD 513HD 896HD
 S Silicone PEMKO 1715 2715 2705-T
 HAGER 427S -- --
**Vinyl (“V”) Supplied Unless Other
 Material Specified




COVER PLATES
 All Products In This Section




 PART # MAX WIDTH 1/8"
 Maximum Width 48" Maximum Width 48"
 818 48" Maximum Length 144" Maximum Length 144"

 818SS 48" 818 Aluminum
 814 48" 818SS Stainless Steel Standard with Square Edges, Beveling Available, Min. Width 3",
 Max Width 48", Length 144"
 814SS 48"
 838 48" 1/4"

 Maximum Width 48" Maximum Width 48"
MATERIALS & FINISHES Maximum Length 144" Maximum Length 144"

- No Suffix: Mill Aluminum 814 Aluminum - Max Width 48", Length 144"
- DKB: Aluminum Matte Black
 Powder Coat
 814SS Stainless Steel Standard with Square Edges, Beveling Available, Min. Width 4",
 Max Width 36", Length 96"


 OPTIONAL:
 SIA: SLIP-RESISTANT FINISH 3/8"
 For Use in Areas Where
 Conditions Can Be Hazardous Maximum Width 48" Maximum Width 48"
 Maximum Length 144" Maximum Length 144"
 and Safety Is a Priority
 838 Aluminum
 CROSS REFERENCE
 NGP 818 818SS 814 814SS 838
 PEMKO 18/1A -- 14/1A -- --
 ZERO 600CP -- 601CP -- --
 HAGER 676S -- 677S -- --



 CONDENSED CATALOG 4
', 1900, 1, ' all products in this section


heavy-duty thresholds
 
 for use where forklift or vehicular traffic occurs
 
 recommended for delivery/storage doorways where heavier loads travel
 
 bhma certified to ansi a156.21 heavy duty 10,000 lb. load test
 
 optional sia slip-resistant finish recommended in moisture-prone areas

 part # width 1/2"
 425hd 5" typical wall .244

 513hd 5" 5"

 896hd 5" 425hd 1.6 lbs./ft.
 1/4"

 5"
materials & finishes
- no suffix: mill aluminum
 513hd 1.4 lbs./ft.
 typical wall .125
- dkb: aluminum dark bronze/
 black anodized 1/2"
 1/4"

 bumper seal 5"
 seals against the door,
 providing weather resistance 896hd 1.01 lbs./ft.
 b u m p e r s e a l o pt i o n s
 cross reference
 v vinyl**
 n ngp-tpv ngp 425hd 513hd 896hd
 s silicone pemko 1715 2715 2705-t
 hager 427s -- --
**vinyl (“v”) supplied unless other
 material specified




cover plates
 all products in this section




 part # max width 1/8"
 maximum width 48" maximum width 48"
 818 48" maximum length 144" maximum length 144"

 818ss 48" 818 aluminum
 814 48" 818ss stainless steel standard with square edges, beveling available, min. width 3",
 max width 48", length 144"
 814ss 48"
 838 48" 1/4"

 maximum width 48" maximum width 48"
materials & finishes maximum length 144" maximum length 144"

- no suffix: mill aluminum 814 aluminum - max width 48", length 144"
- dkb: aluminum matte black
 powder coat
 814ss stainless steel standard with square edges, beveling available, min. width 4",
 max width 36", length 96"


 optional:
 sia: slip-resistant finish 3/8"
 for use in areas where
 conditions can be hazardous maximum width 48" maximum width 48"
 maximum length 144" maximum length 144"
 and safety is a priority
 838 aluminum
 cross reference
 ngp 818 818ss 814 814ss 838
 pemko 18/1a -- 14/1a -- --
 zero 600cp -- 601cp -- --
 hager 676s -- 677s -- --



 condensed catalog 4
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 6, ' All Products In This Section


HALF SADDLE THRESHOLDS
PART # WIDTH NOTE: Flute Patterns Vary with Width of Threshold
324 4"
325 5" 1/2"
 Typical Wall .250

 * When Installed with the
 Non-Beveled Edge Flush
 with Flooring or Where No 324 1.20 lbs./ft.
 4"


 Greater Than 1/4" Vertical 324DKB 1.20 lbs./ft.
 Rise Occurs.


CROSS REFERENCE 1/2"
NGP 324 325 Typical Wall .250
PEMKO 227 229
 5"
ZERO 1674 1675 325 1.32 lbs./ft. MATERIALS & FINISHES
HAGER 432S 431S 325DKB 1.32 lbs./ft. - No Suffix: Mill Aluminum
 - DKB: Aluminum Dark Bronze/
 Black Anodized



 All Products In This Section


OFFSET SADDLE THRESHOLDS
PART # WIDTH
653 51/2" Typical Wall .125 1/4" 1/4" 1/2"

659 7" 5-1/2"

 653 .78 lbs./ft.
CROSS REFERENCE 653DKB .78 lbs./ft.
NGP 653 659
PEMKO 158 2727

 1/4" 1/4"
ZERO 211 103 1/2"
 Typical Wall .125 Typical Wall .125
HAGER 438S --
 7" 7"


 659 .89 lbs./ft.
 659DKB .89 lbs./ft.

 MATERIALS & FINISHES OPTIONAL:
 - No Suffix: Mill Aluminum SIA: SLIP-RESISTANT FINISH
 - DKB: Aluminum Dark Bronze/ For Use in Areas Where
 Black Anodized Conditions Can Be Hazardous
 and Safety Is a Priority




5 CONDENSED CATALOG
', 1140, 1, ' all products in this section


half saddle thresholds
part # width note: flute patterns vary with width of threshold
324 4"
325 5" 1/2"
 typical wall .250

 * when installed with the
 non-beveled edge flush
 with flooring or where no 324 1.20 lbs./ft.
 4"


 greater than 1/4" vertical 324dkb 1.20 lbs./ft.
 rise occurs.


cross reference 1/2"
ngp 324 325 typical wall .250
pemko 227 229
 5"
zero 1674 1675 325 1.32 lbs./ft. materials & finishes
hager 432s 431s 325dkb 1.32 lbs./ft. - no suffix: mill aluminum
 - dkb: aluminum dark bronze/
 black anodized



 all products in this section


offset saddle thresholds
part # width
653 51/2" typical wall .125 1/4" 1/4" 1/2"

659 7" 5-1/2"

 653 .78 lbs./ft.
cross reference 653dkb .78 lbs./ft.
ngp 653 659
pemko 158 2727

 1/4" 1/4"
zero 211 103 1/2"
 typical wall .125 typical wall .125
hager 438s --
 7" 7"


 659 .89 lbs./ft.
 659dkb .89 lbs./ft.

 materials & finishes optional:
 - no suffix: mill aluminum sia: slip-resistant finish
 - dkb: aluminum dark bronze/ for use in areas where
 black anodized conditions can be hazardous
 and safety is a priority




5 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 7, ' All Products In This Section


THERMAL BREAK THRESHOLDS
PART # WIDTH
8424 4" Typical Wall .110 1/2"
8425 5"
 4"
8426 6"
8427 7" MATERIALS & FINISHES OPTIONAL:
 - No Suffix: Mill Aluminum SIA: SLIP-RESISTANT FINISH
8428 8" - DKB: Aluminum Dark Bronze/ For Use in Areas Where
 Black Anodized Conditions Can Be Hazardous
8429 9" and Safety Is a Priority
8430 10"


CROSS REFERENCE
NGP 8424 8425 8426 8427 8428 8429 8430
PEMKO 252 x 2_FG 252 x 3_FG 253 x 3_FG 253 x 4_FG 254 x 4_FG 254 x 5_FG 255 x 5_FG
ZERO 624 625 626 -- -- -- --
HAGER 420S 421S 422S 423S 424S 451S 452S
KN CROWDER CT-44 CT-45 CT-46, CT-406 CT-407 CT-408 CT-409 CT-410




 All Products In This Section


STAINLESS STEEL SADDLE
 Typical Wall .120
PART # WIDTH
513SS 5"
 1/4"
512SS 5"
 5"

 513SS 2.07 lbs./ft. Available in 4" to 10" width.
 1st digit = width (eg: 4" = 413SS)




 1/2"
 Typical Wall .120

 5"
 512SS 2.07 lbs./ft. Available in 4" to 10" width.
 1st digit = width (eg: 4" = 412SS)




CROSS REFERENCE MATERIALS & FINISHES
 - #304 Mill Finish Standard
NGP 513SS 512SS
 - Available: Polished (US32)
PEMKO -- 154SS Brushed (US32D)
HAGER -- 412S-32D
KN CROWDER -- CT-10SS




 CONDENSED CATALOG 6
', 1181, 1, ' all products in this section


thermal break thresholds
part # width
8424 4" typical wall .110 1/2"
8425 5"
 4"
8426 6"
8427 7" materials & finishes optional:
 - no suffix: mill aluminum sia: slip-resistant finish
8428 8" - dkb: aluminum dark bronze/ for use in areas where
 black anodized conditions can be hazardous
8429 9" and safety is a priority
8430 10"


cross reference
ngp 8424 8425 8426 8427 8428 8429 8430
pemko 252 x 2_fg 252 x 3_fg 253 x 3_fg 253 x 4_fg 254 x 4_fg 254 x 5_fg 255 x 5_fg
zero 624 625 626 -- -- -- --
hager 420s 421s 422s 423s 424s 451s 452s
kn crowder ct-44 ct-45 ct-46, ct-406 ct-407 ct-408 ct-409 ct-410




 all products in this section


stainless steel saddle
 typical wall .120
part # width
513ss 5"
 1/4"
512ss 5"
 5"

 513ss 2.07 lbs./ft. available in 4" to 10" width.
 1st digit = width (eg: 4" = 413ss)




 1/2"
 typical wall .120

 5"
 512ss 2.07 lbs./ft. available in 4" to 10" width.
 1st digit = width (eg: 4" = 412ss)




cross reference materials & finishes
 - #304 mill finish standard
ngp 513ss 512ss
 - available: polished (us32)
pemko -- 154ss brushed (us32d)
hager -- 412s-32d
kn crowder -- ct-10ss




 condensed catalog 6
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 8, ' All Products In This Section


SELF-ADHESIVE GASKETING
SILICONE BULB FIRE AND TPE BAT W ING SMOKE SEA L
SMOKE SEAL
 PART # COLORS PART # COLORS 1/2"
 1/4"
 5050B BROWN 5020C CHARCOAL
 1/2" 1/2"
 5050C CHARCOAL 5020CL CLEAR
 5050W
 5050CL*
 WHITE
 CLEAR
 5050 Available in 3'', 4'', 7'', 8'' and
 9'' Lengths
 5020
 * Anti-Microbial Not Available
Available in 17'', 20'', 21'', 25'' and in Clear
 *
300''* Rolls
*Clear Not Available in 300'' Rolls




SILICONE DOUBLE SHARK FLEXIBLE TRIPLE FIN
FIN SMOKE SEAL SMOKE SEAL
 PART # COLORS PART # COLORS 3/8ʺ

 5070B BROWN 5075B BROWN**
 1/2ʺ
 5070CL CLEAR 5075C CHARCOAL
Available in 4'', 7'', 8'' and 9'' Lengths
Smoke Rated for Perimeter
 5070 5075CL
 5075W
 CLEAR
 WHITE* 5075
and/or Meeting Edge (Astragal)
Applications. Available in 17'', 20'', 21''**, 25" and
 300''* Rolls
 **300'' Not Available in White
 **5075B Not Available in 21''




 CROSS REFERENCE
 NGP 5050 5020 5070 5075
 PEMKO S88 S442 S772 S773
 ZERO 188S 8144 8217S-BK 8150S-BK
 HAGER 726 721 739 738S
 KN CROWDER W-22 -- -- W-63



 * ANTI-MICROBIAL: 
 EDGE SEALING SYSTEM: 
 SMOKE AND DRAFT CONTROL -
 Not Available in Clear Category “G” for 20 Minute Rated Category CATEGORY “H”:
 B Wood Doors Perimeter Application Up To: Up to 3 Hours Hollow Metal Fire Doors
 Single Swing 4''0 X 8''0 Up to 90 Minutes Wood Fire Doors
 Pairs 8''0 X 8''0 Meets Requirements of RoHS Directive
 Use 9550 at the Meeting Edge of Pairs




7 CONDENSED CATALOG
', 1438, 1, ' all products in this section


self-adhesive gasketing
silicone bulb fire and tpe bat w ing smoke sea l
smoke seal
 part # colors part # colors 1/2"
 1/4"
 5050b brown 5020c charcoal
 1/2" 1/2"
 5050c charcoal 5020cl clear
 5050w
 5050cl*
 white
 clear
 5050 available in 3'', 4'', 7'', 8'' and
 9'' lengths
 5020
 * anti-microbial not available
available in 17'', 20'', 21'', 25'' and in clear
 *
300''* rolls
*clear not available in 300'' rolls




silicone double shark flexible triple fin
fin smoke seal smoke seal
 part # colors part # colors 3/8ʺ

 5070b brown 5075b brown**
 1/2ʺ
 5070cl clear 5075c charcoal
available in 4'', 7'', 8'' and 9'' lengths
smoke rated for perimeter
 5070 5075cl
 5075w
 clear
 white* 5075
and/or meeting edge (astragal)
applications. available in 17'', 20'', 21''**, 25" and
 300''* rolls
 **300'' not available in white
 **5075b not available in 21''




 cross reference
 ngp 5050 5020 5070 5075
 pemko s88 s442 s772 s773
 zero 188s 8144 8217s-bk 8150s-bk
 hager 726 721 739 738s
 kn crowder w-22 -- -- w-63



 * anti-microbial: 
 edge sealing system: 
 smoke and draft control -
 not available in clear category “g” for 20 minute rated category category “h”:
 b wood doors perimeter application up to: up to 3 hours hollow metal fire doors
 single swing 4''0 x 8''0 up to 90 minutes wood fire doors
 pairs 8''0 x 8''0 meets requirements of rohs directive
 use 9550 at the meeting edge of pairs




7 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 9, 'CONCEALED FASTENER SEALS
 Snap-On Cover Conceals Screw Heads for Clean Appearance
 #6 X 3/4" Stainless Steel Sheet Metal Screws Furnished
 Screw Holes Slotted for Adjustment

 3/16" 3/16"
 1" 1"

7/16" 7/16"
 170NA
 Anodized Aluminum
 Neoprene Silicone Neoprene Perimeter
 Seal with Concealed
 Fastener
170N 170S



 3/16"
 1" 1" 1/4"
 1" 7/16"
 7/16" 7/16" 7/16"


 Vinyl Pile Nylon Brush


170V 170P 675




 1" 1" 1"
 3/4" 3/4" 3/4"

 5/16" 5/16" 5/16"


 NGP_TPV Silicone Vinyl
 1/4" 1/4" 1/4"
172N 172S 172V




 3/4" 7/16" 3/4" 7/16"

 5/16" 5/16"

 Pile Nylon
 Brush
 MATERIALS & FINISHES
672P 672 - A: Clear Anodized Aluminum
 - DKB: Aluminum Dark Bronze/
 Black Anodized


CROSS REFERENCE

NGP 170N 170S 170V 170P 675 172N 172S 172V 672P 672
PEMKO 29310 -- -- -- 29324 -- -- -- -- --
ZERO -- -- -- -- -- 475, 8878 -- -- -- 8879
HAGER 885SN 885SS 885SV 885SW 882S -- -- -- -- --
KN CROWDER W-32N W-32S -- W-32P -- -- -- -- -- --



 CONDENSED CATALOG 8
', 970, 1, 'concealed fastener seals
 snap-on cover conceals screw heads for clean appearance
 #6 x 3/4" stainless steel sheet metal screws furnished
 screw holes slotted for adjustment

 3/16" 3/16"
 1" 1"

7/16" 7/16"
 170na
 anodized aluminum
 neoprene silicone neoprene perimeter
 seal with concealed
 fastener
170n 170s



 3/16"
 1" 1" 1/4"
 1" 7/16"
 7/16" 7/16" 7/16"


 vinyl pile nylon brush


170v 170p 675




 1" 1" 1"
 3/4" 3/4" 3/4"

 5/16" 5/16" 5/16"


 ngp_tpv silicone vinyl
 1/4" 1/4" 1/4"
172n 172s 172v




 3/4" 7/16" 3/4" 7/16"

 5/16" 5/16"

 pile nylon
 brush
 materials & finishes
672p 672 - a: clear anodized aluminum
 - dkb: aluminum dark bronze/
 black anodized


cross reference

ngp 170n 170s 170v 170p 675 172n 172s 172v 672p 672
pemko 29310 -- -- -- 29324 -- -- -- -- --
zero -- -- -- -- -- 475, 8878 -- -- -- 8879
hager 885sn 885ss 885sv 885sw 882s -- -- -- -- --
kn crowder w-32n w-32s -- w-32p -- -- -- -- -- --



 condensed catalog 8
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 10, ' All Products In This Section


GASKETING
PERIMETER SEALS
 137N
 5/8" 3/16"

110N Aluminum Neoprene
 7/8ʺ 5/16ʺ

Aluminum Neoprene Sponge Seal
Sponge Seal 3/16" 3/16ʺ
  
 Neoprene
 
 Neoprene is Black
 137S
110S Aluminum Silicone
Aluminum Silicone Sponge Seal
Sponge Seal
  
 Silicone
 
 Silicone


155S 160V 5/16"
 5/8" 3/16"
Aluminum Silicone Aluminum Vinyl 7/8"
 5/16"
Dense Bulb Perimeter 7/32" Perimeter Seal 1/4"

Seal  
 Vinyl
 
 Dense Silicone
 160S
155V Aluminum Silicone Dense
Aluminum Vinyl Bulb Perimeter Seal
Perimeter Seal
  
 Silicone
 
 Vinyl

 A605
700N Aluminum Nylon 5/8"
Compatible with Parallel Brush Seal
Arm Closers 1-1/2" 5/16"  
 Synthetic Polymer
 Polyamide 7/16"
 
 Neoprene
 1/4"  
 Nylon Brush
700S neoprene
Compatible with Parallel A626
Arm Closers Aluminum Nylon Brush Seal
 
 Silicone
  
 Synthetic Polymer
 Polyamide
  
 Nylon Brush
MATERIALS & FINISHES
- No Suffix: Mill Aluminum
- A: Clear Anodized Aluminum
- DKB: Aluminum Dark Bronze/
 Black Anodized



 CROSS REFERENCE
 NGP 110 137N 137S 155 160V 160S 700N 700S A605 A626
 PEMKO 332 319_E -- -- 303_V 303_S 2891-S 18041 45041
 ZERO -- 326, 328 -- -- -- -- 429 -- 8193, 8304 --
 HAGER 873S 862S -- 891SV -- -- -- 893S 803S
 KN CROWDER -- W-50S W-50S W-2 W-1 W-16 -- -- W-25S W-23



9 CONDENSED CATALOG
', 1323, 1, ' all products in this section


gasketing
perimeter seals
 137n
 5/8" 3/16"

110n aluminum neoprene
 7/8ʺ 5/16ʺ

aluminum neoprene sponge seal
sponge seal 3/16" 3/16ʺ
  
 neoprene
 
 neoprene is black
 137s
110s aluminum silicone
aluminum silicone sponge seal
sponge seal
  
 silicone
 
 silicone


155s 160v 5/16"
 5/8" 3/16"
aluminum silicone aluminum vinyl 7/8"
 5/16"
dense bulb perimeter 7/32" perimeter seal 1/4"

seal  
 vinyl
 
 dense silicone
 160s
155v aluminum silicone dense
aluminum vinyl bulb perimeter seal
perimeter seal
  
 silicone
 
 vinyl

 a605
700n aluminum nylon 5/8"
compatible with parallel brush seal
arm closers 1-1/2" 5/16"  
 synthetic polymer
 polyamide 7/16"
 
 neoprene
 1/4"  
 nylon brush
700s neoprene
compatible with parallel a626
arm closers aluminum nylon brush seal
 
 silicone
  
 synthetic polymer
 polyamide
  
 nylon brush
materials & finishes
- no suffix: mill aluminum
- a: clear anodized aluminum
- dkb: aluminum dark bronze/
 black anodized



 cross reference
 ngp 110 137n 137s 155 160v 160s 700n 700s a605 a626
 pemko 332 319_e -- -- 303_v 303_s 2891-s 18041 45041
 zero -- 326, 328 -- -- -- -- 429 -- 8193, 8304 --
 hager 873s 862s -- 891sv -- -- -- 893s 803s
 kn crowder -- w-50s w-50s w-2 w-1 w-16 -- -- w-25s w-23



9 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 11, ' All Products In This Section


GASKETING
ASTRAGALS

158N 158V 1-3/8"

Aluminum Overlapping Aluminum Overlapping 5/16"

Astragal with NGP-TPV Seal Astragal with Vinyl Seal
 Maximum 1/2"
 
 NGP-TPV  
 Vinyl Height 120"


 Fits Beveled
 1/8"
158S 158P Edge Doors.
 #8 X 1" FH U/C
Aluminum Overlapping Aluminum Overlapping Astragal SMS Furnished.

Astragal with Silicone Seal with Polypropylene Pile Seal
 
 Silicone  
 Polypropylene Pile
 MATERIALS & FINISHES
 - A: Clear Anodized Aluminum
 - DKB: Aluminum Dark Bronze/
 Black Anodized
115N METAL
 A - Anodized Aluminum
 EPDM
 Gray
 CROSS REFERENCE
Fire-Rated Aluminum Astragal DKB - Aluminum Dark Bronze/ Black
 with EPDM Seal Black Anodized NGP 158 115
 No Suffix - Mill Aluminum Gray PEMKO 355 329_N
 ZERO 41, 383 8194
 5/8" 3/8" *Specify Black Brush if Desired
 HAGER 837S 872S
 KN CROWDER W-9 W-5




 Provided as Two-Piece Set




 All Products In This Section

A DJUSTA BLE PERIMETER SE A LS
 Adjusting Range
103N 1-1/4" 1/4"

Aluminum Adjustable
Neoprene Perimeter Seal MATERIALS & FINISHES
 - A: Clear Anodized Aluminum
 
 Neoprene 13/16"
 - DKB: Aluminum Dark Bronze/
 Black Anodized


 OPTIONS:
 FS Option - Foam back seal - suffix ‘FS’
 - FATT - Fast Attach Tape
107N
Aluminum Adjustable CROSS REFERENCE
Neoprene Perimeter Seal Adjusting Range
 103 107
 1-1/4" 1/4" NGP
 
 Neoprene 350_S 379
 PEMKO
 1/2" 170 --
 ZERO
107S HAGER 865S 864S
Aluminum Adjustable KN CROWDER -- W-42
Silicone Perimeter Seal
 
 Silicone


 CONDENSED CATALOG 10
', 1522, 1, ' all products in this section


gasketing
astragals

158n 158v 1-3/8"

aluminum overlapping aluminum overlapping 5/16"

astragal with ngp-tpv seal astragal with vinyl seal
 maximum 1/2"
 
 ngp-tpv  
 vinyl height 120"


 fits beveled
 1/8"
158s 158p edge doors.
 #8 x 1" fh u/c
aluminum overlapping aluminum overlapping astragal sms furnished.

astragal with silicone seal with polypropylene pile seal
 
 silicone  
 polypropylene pile
 materials & finishes
 - a: clear anodized aluminum
 - dkb: aluminum dark bronze/
 black anodized
115n metal
 a - anodized aluminum
 epdm
 gray
 cross reference
fire-rated aluminum astragal dkb - aluminum dark bronze/ black
 with epdm seal black anodized ngp 158 115
 no suffix - mill aluminum gray pemko 355 329_n
 zero 41, 383 8194
 5/8" 3/8" *specify black brush if desired
 hager 837s 872s
 kn crowder w-9 w-5




 provided as two-piece set




 all products in this section

a djusta ble perimeter se a ls
 adjusting range
103n 1-1/4" 1/4"

aluminum adjustable
neoprene perimeter seal materials & finishes
 - a: clear anodized aluminum
 
 neoprene 13/16"
 - dkb: aluminum dark bronze/
 black anodized


 options:
 fs option - foam back seal - suffix ‘fs’
 - fatt - fast attach tape
107n
aluminum adjustable cross reference
neoprene perimeter seal adjusting range
 103 107
 1-1/4" 1/4" ngp
 
 neoprene 350_s 379
 pemko
 1/2" 170 --
 zero
107s hager 865s 864s
aluminum adjustable kn crowder -- w-42
silicone perimeter seal
 
 silicone


 condensed catalog 10
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 12, ' All Products In This Section


GASKETING
AU TOM ATIC DOOR BOT TOMS
 19/32" 15/16"
220N 420N
Aluminum Surface, Automatic
 Aluminum Heavy-Duty
Door Bottom with Neoprene Seal
 Surface, Automatic
 
 Neoprene is Black Door Bottom with
 Neoprene Seal
 2 5/16"
220S 2-1/4"  
 Neoprene is Black
Aluminum Surface, Automatic
Door Bottom with Silicone Seal
 
 Silicone is Gray


220WH 1/2"


Aluminum Surface, Automatic Door 7/8" Max Drop
 7/8" Max Drop

Bottom with Nylon Brush Seal 1"
 Mortise Required
 Aluminum Finish - Gray Brush
 
 15/16" x 1-5/8"
 Aluminum Dark Bronze/Black 423N 7/8"
 Anodized Finish - Black Brush 7/16" Mill Aluminum
Nylon Brush Recommended for Heavy-Duty Mortise
Carpet Applications Where No
 Drop Bar with
 Automatic Door
Threshold is Provided. Nylon Brush - Bottom
 suffix “WH” 1 1/2"
  
 Neoprene is Black
320N
Mill Aluminum Hollow Metal
Mortise Automatic Door Bottom
with NGP-TPV Seal
 3/4" Max Drop
 
 NGP-TPV is Black 1 1/2"


320S
Mill Aluminum Hollow Metal
Mortise Automatic Door Bottom
 
 Silicone is Gray 3/4"



320V 1/2"
 Max.Drop
 1/8"

Mill Aluminum Hollow Metal
Mortise Automatic Door Bottom
 
 Vinyl is Black


 CROSS REFERENCE

NGP 220 420N 423N 320
PEMKO -- 430 434 420 MATERIALS & FINISHES
 - A: Clear Anodized Aluminum
ZERO -- 361 360 355 - DKB: Aluminum Dark Bronze/
HAGER 321 747S 743S Black Anodized

KN CROWDER -- CT-52 CT-53 742SN, 742SV



11 CONDENSED CATALOG
', 1423, 1, ' all products in this section


gasketing
au tom atic door bot toms
 19/32" 15/16"
220n 420n
aluminum surface, automatic
 aluminum heavy-duty
door bottom with neoprene seal
 surface, automatic
 
 neoprene is black door bottom with
 neoprene seal
 2 5/16"
220s 2-1/4"  
 neoprene is black
aluminum surface, automatic
door bottom with silicone seal
 
 silicone is gray


220wh 1/2"


aluminum surface, automatic door 7/8" max drop
 7/8" max drop

bottom with nylon brush seal 1"
 mortise required
 aluminum finish - gray brush
 
 15/16" x 1-5/8"
 aluminum dark bronze/black 423n 7/8"
 anodized finish - black brush 7/16" mill aluminum
nylon brush recommended for heavy-duty mortise
carpet applications where no
 drop bar with
 automatic door
threshold is provided. nylon brush - bottom
 suffix “wh” 1 1/2"
  
 neoprene is black
320n
mill aluminum hollow metal
mortise automatic door bottom
with ngp-tpv seal
 3/4" max drop
 
 ngp-tpv is black 1 1/2"


320s
mill aluminum hollow metal
mortise automatic door bottom
 
 silicone is gray 3/4"



320v 1/2"
 max.drop
 1/8"

mill aluminum hollow metal
mortise automatic door bottom
 
 vinyl is black


 cross reference

ngp 220 420n 423n 320
pemko -- 430 434 420 materials & finishes
 - a: clear anodized aluminum
zero -- 361 360 355 - dkb: aluminum dark bronze/
hager 321 747s 743s black anodized

kn crowder -- ct-52 ct-53 742sn, 742sv



11 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 13, ' All Products In This Section


GASKETING
NYLON BRUSH SEALS WITH EPDM RUBBER INSERT


 EPDM Rubber Insert Protects Against Water Penetration
  PRODUCT#
 SUFFIX FINISH
 and Provides an Effective Bottom Seal for Exterior Doors
 A Clear Anodized with Black Brush
 Excellent Abrasion Resistance, Flexibility and Memory
 
 Aluminum Dark Bronze/
 Moisture-Resistant
  DKB
 Black Anodized with Black Brush
 Retains Insecticides Well
 

 Temperature Range - 60°F to 350°F
 

 #6 x 3/4" Stainless Steel SMS Furnished
 

 Screw Holes Slotted for Adjustment
 




 3/4" 1-1/16"




 3/4"
 EPDM
 Rubber
 1"
 Insert

 C697 EPDM
 Rubber
 Insert

 D698




 1-7/16"

 16"
 1-1/



 3/4"
 EPDM
 Rubber
 Insert
 1"
 C699
 EPDM
 Rubber
 Insert


 D690




 CONDENSED CATALOG 12
', 774, 1, ' all products in this section


gasketing
nylon brush seals with epdm rubber insert


 epdm rubber insert protects against water penetration
  product#
 suffix finish
 and provides an effective bottom seal for exterior doors
 a clear anodized with black brush
 excellent abrasion resistance, flexibility and memory
 
 aluminum dark bronze/
 moisture-resistant
  dkb
 black anodized with black brush
 retains insecticides well
 

 temperature range - 60°f to 350°f
 

 #6 x 3/4" stainless steel sms furnished
 

 screw holes slotted for adjustment
 




 3/4" 1-1/16"




 3/4"
 epdm
 rubber
 1"
 insert

 c697 epdm
 rubber
 insert

 d698




 1-7/16"

 16"
 1-1/



 3/4"
 epdm
 rubber
 insert
 1"
 c699
 epdm
 rubber
 insert


 d690




 condensed catalog 12
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 14, ' All Products In This Section


GASKETING
DOOR SWEEPS 1/4"




C627 97V
Nylon Brush Sweep Vinyl Sweep
 1 7/16"
 Aluminum Finish - Gray Brush
   
 Vinyl is Black 7/8"

 Aluminum Dark Bronze/Black
 Anodized Finish - Black Brush
 9/16"


 7/8"




 7/16"
675 200N 1/4ʺ
Concealed Fastener Nylon Aluminum Neoprene
Brush Perimeter Seal 1" Door Sweep
or Sweep

 Aluminum Finish - Gray Brush
 
 1-1/4ʺ
 Aluminum Dark Bronze/Black
 Anodized Finish - Black Brush 7/16" 200S
 Aluminum Silicone
 Door Sweep
 1/2ʺ




101V
Aluminum Vinyl Door Sweep 1 1/2"

 
 Vinyl is Black


 3/4"

 1/2"




CROSS REFERENCE
NGP C627 97V 675 200 101V
PEMKO 345_NB 307 29324 315_N 345_V MATERIALS & FINISHES
ZERO 8198 8191 -- 50M/39 8197 - No Suffix: Mill Aluminum
 - A: Clear Anodized Aluminum
HAGER 770SB 756S 882S 750S 770SV - DKB: Aluminum Dark Bronze/
KN CROWDER W-35-1 W-4 -- W-13S, W-38S -- Black Anodized




13 CONDENSED CATALOG
', 921, 1, ' all products in this section


gasketing
door sweeps 1/4"




c627 97v
nylon brush sweep vinyl sweep
 1 7/16"
 aluminum finish - gray brush
   
 vinyl is black 7/8"

 aluminum dark bronze/black
 anodized finish - black brush
 9/16"


 7/8"




 7/16"
675 200n 1/4ʺ
concealed fastener nylon aluminum neoprene
brush perimeter seal 1" door sweep
or sweep

 aluminum finish - gray brush
 
 1-1/4ʺ
 aluminum dark bronze/black
 anodized finish - black brush 7/16" 200s
 aluminum silicone
 door sweep
 1/2ʺ




101v
aluminum vinyl door sweep 1 1/2"

 
 vinyl is black


 3/4"

 1/2"




cross reference
ngp c627 97v 675 200 101v
pemko 345_nb 307 29324 315_n 345_v materials & finishes
zero 8198 8191 -- 50m/39 8197 - no suffix: mill aluminum
 - a: clear anodized aluminum
hager 770sb 756s 882s 750s 770sv - dkb: aluminum dark bronze/
kn crowder w-35-1 w-4 -- w-13s, w-38s -- black anodized




13 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 15, ' All Products In This Section


GASKETING
DOOR SHOES


12V
Aluminum Smooth Vinyl
Door Shoe
 1-3/16"
 
 Vinyl is Black

 1/2"




 1 3/4"
319EV
Aluminum Finned Vinyl
Door Shoe
 
 Vinyl is Black 7/8"
 5/8"



 vinyl
 7/16"




36ET6 1-3/4"

Aluminum Thermoplastic
Door Shoe
 
 Thermoplastic is
 Dark Brown 5/8" 7/8"




 9/16"




CROSS REFERENCE
NGP 12V 319EV 36ET6
PEMKO 208_V 216 -- MATERIALS & FINISHES
HAGER -- 778SV -- - No Suffix: Mill Aluminum
 - DKB: Aluminum Dark Bronze/
KN CROWDER -- CT-745 -- Black Anodized




 CONDENSED CATALOG 14
', 554, 1, ' all products in this section


gasketing
door shoes


12v
aluminum smooth vinyl
door shoe
 1-3/16"
 
 vinyl is black

 1/2"




 1 3/4"
319ev
aluminum finned vinyl
door shoe
 
 vinyl is black 7/8"
 5/8"



 vinyl
 7/16"




36et6 1-3/4"

aluminum thermoplastic
door shoe
 
 thermoplastic is
 dark brown 5/8" 7/8"




 9/16"




cross reference
ngp 12v 319ev 36et6
pemko 208_v 216 -- materials & finishes
hager -- 778sv -- - no suffix: mill aluminum
 - dkb: aluminum dark bronze/
kn crowder -- ct-745 -- black anodized




 condensed catalog 14
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 16, ' All Products On This Page


 HOSPITALITY
 VINYL THRESHOLDS, SMOKE SEAL


 401
 Hospitality Vinyl Carpet/Tile
 Divider Threshold
  
 Vinyl is Black
 * When Installed as Illustrated
 Between Carpet and/or Tile

 400
 Hospitality Vinyl Carpet/Tile
 Divider Threshold
  
 May be Field Trimmed for
 Narrower Widths
 Max Length = 73"
  
 Vinyl is Black



11/32" Tile Carpet

 5-1/2"

 * When Installed as Illustrated
 Between Carpet and/or Tile




 5075
 Flexible Triple Fin
 Smoke Seal
 PART # COLORS
 5075B BROWN**
 5075C CHARCOAL 3/8ʺ

 5075CL CLEAR
 1/2ʺ
 5075W WHITE*
 Available in 17'', 20'', 21''**, 25" and
 300''* Rolls
 **300'' Not Available in White
 **5075B Not Available in 21''




 CROSS REFERENCE

 NGP 401 400 5075
 PEMKO EV232BL -- S773
 ZERO 1685 -- 8150S-BK
 HAGER 900S 905S 738S
 KN CROWDER -- -- W-63




 15 CONDENSED CATALOG
', 846, 1, ' all products on this page


 hospitality
 vinyl thresholds, smoke seal


 401
 hospitality vinyl carpet/tile
 divider threshold
  
 vinyl is black
 * when installed as illustrated
 between carpet and/or tile

 400
 hospitality vinyl carpet/tile
 divider threshold
  
 may be field trimmed for
 narrower widths
 max length = 73"
  
 vinyl is black



11/32" tile carpet

 5-1/2"

 * when installed as illustrated
 between carpet and/or tile




 5075
 flexible triple fin
 smoke seal
 part # colors
 5075b brown**
 5075c charcoal 3/8ʺ

 5075cl clear
 1/2ʺ
 5075w white*
 available in 17'', 20'', 21''**, 25" and
 300''* rolls
 **300'' not available in white
 **5075b not available in 21''




 cross reference

 ngp 401 400 5075
 pemko ev232bl -- s773
 zero 1685 -- 8150s-bk
 hager 900s 905s 738s
 kn crowder -- -- w-63




 15 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 17, 'HOSPITALITY
DOOR BOTTOMS, DOOR SHOES, DOOR GUARDS


335N Mortise Required 36ET
 5/8" x 1-9/16"
Mortise Automatic 9/16" Thermoplastic Door Shoe
Door Bottom with  
 Thermoplastic is Dark Brown
 Adjusting
Neoprene Seal Screw 1-3/4"
 
 Available 23 1/4" Net to
 48" in Length 1-1/2"
 
 Fits Wood Fire Door
 Mortise Restrictions
 
 Neoprene is Black 5/8" 7/8"




 3/4" Max Drop
 11/16"




SDG 1 5/8"

Security Door Guard

 SKU COLORS
 SDG-3 POLISHED BRASS US3
 SDG-4 SATIN BRASS US4
 SDG-10B DARK BRONZE US10B 2 3/16"
 SDG-26 POLISHED CHROME US26
 SDG-26D SATIN CHROME US26D
 SDG-DS* STICKER FOR RETROFIT
 SDG-WS* STICKER FOR RETROFIT
* Covers Holes Left in Door and Frame from
 Removal of Swing-Bar Type Door Guards 1 1/2"




 FOR YOUR WARNING:
 COMFORT
 FRAME
 AND SAFETY DOOR LOCKS

 PLEASE USE AUTOMATICALLY

CROSS REFERENCE DEADBOLT UPON CLOSING

NGP 335N 36ET SDG
PEMKO 411 -- PDL
ZERO 320 -- --
KN CROWDER CT-51 -- --
 SDG-DS SDG-WS




 CONDENSED CATALOG 16
', 973, 1, 'hospitality
door bottoms, door shoes, door guards


335n mortise required 36et
 5/8" x 1-9/16"
mortise automatic 9/16" thermoplastic door shoe
door bottom with  
 thermoplastic is dark brown
 adjusting
neoprene seal screw 1-3/4"
 
 available 23 1/4" net to
 48" in length 1-1/2"
 
 fits wood fire door
 mortise restrictions
 
 neoprene is black 5/8" 7/8"




 3/4" max drop
 11/16"




sdg 1 5/8"

security door guard

 sku colors
 sdg-3 polished brass us3
 sdg-4 satin brass us4
 sdg-10b dark bronze us10b 2 3/16"
 sdg-26 polished chrome us26
 sdg-26d satin chrome us26d
 sdg-ds* sticker for retrofit
 sdg-ws* sticker for retrofit
* covers holes left in door and frame from
 removal of swing-bar type door guards 1 1/2"




 for your warning:
 comfort
 frame
 and safety door locks

 please use automatically

cross reference deadbolt upon closing

ngp 335n 36et sdg
pemko 411 -- pdl
zero 320 -- --
kn crowder ct-51 -- --
 sdg-ds sdg-ws




 condensed catalog 16
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 18, 'FINGER GUARD
Prevent Injury to Fingers Accidentally Placed in the Hinge
Area of a Door
 Ideal for Senior & Childcare Facilities
 Anodized Aluminum Housing
 Durable “Endless Cycle” Spring Mechanism 2248
 Mounts on Push Side of Door



 SKU MATERIAL
 2248 Aluminum Clear Anodized W/ White Polyethylene
 2248DKB Dark Bronze/Black Anodized W/ Black Polyethylene Details Not to Scale
 Rated Up to 3 Hours Metal Doors, 1 Hour Wood Doors


HINGE SIDE FINGER GUARD
 CROSS REFERENCE
 
 Available in Brown, Charcoal and White DOOR; WOOD NGP 2248 2252
 
 83'''' Length OR METAL
 ZERO -- 951, 972, 974
 
 Can Be Cut in the Field FRAME
 
 Mounts on Pull Side of Door
 
 #6 X 1/2'''' Tek Self-Drilling Screws

 SKU COLOR 2252
 22528 BROWN
 2252C CHARCOAL
 Rated Up to 3 Hours Metal
 2252W WHITE Doors, 1 1/2 Hours Wood Doors




FLOOD SHIELD
 
 1/4" Marine Grade Aluminum Shield with  
 Complies with Guidelines
 Handle Cutouts of the Federal Emergency
 
 Closed Cell Neoprene Rubber Gaskets Management Agency (FEMA)
 Installed on Bottom and Sides of Shield and Federal Insurance and Mitigation
 
 Anodized Aluminum Mounting Channels Administration (FIMA) for Use on Doors
 
 Universal Channels can Install Inside or in Flood Prone Areas
 Outside Mount  
 Lengths Up To 96" Available
 
 Stainless Steel Springs Provide Seal Compression  
 A Center Support Post
 is Recommended for
 SKU HEIGHT Installations Over 50"
 FS10 12" High With 10" of Flood Protection  
 Orders for this Product are
 FS22 24" High With 22" of Flood Protection Non-Changeable and
 Non-Cancellable
 FS34 36" High With 34" of Flood Protection
 MOUNTING CHANNEL
 1-1/4"
CROSS REFERENCE
NGP FS10 FS22 FS34 FSSP
ZERO 2070A-10 2070A-24 2070A-36 --

 FSSP Optional
 Support &Center
 Cap




17 CONDENSED CATALOG
', 1798, 1, 'finger guard
prevent injury to fingers accidentally placed in the hinge
area of a door
 ideal for senior & childcare facilities
 anodized aluminum housing
 durable “endless cycle” spring mechanism 2248
 mounts on push side of door



 sku material
 2248 aluminum clear anodized w/ white polyethylene
 2248dkb dark bronze/black anodized w/ black polyethylene details not to scale
 rated up to 3 hours metal doors, 1 hour wood doors


hinge side finger guard
 cross reference
 
 available in brown, charcoal and white door; wood ngp 2248 2252
 
 83'''' length or metal
 zero -- 951, 972, 974
 
 can be cut in the field frame
 
 mounts on pull side of door
 
 #6 x 1/2'''' tek self-drilling screws

 sku color 2252
 22528 brown
 2252c charcoal
 rated up to 3 hours metal
 2252w white doors, 1 1/2 hours wood doors




flood shield
 
 1/4" marine grade aluminum shield with  
 complies with guidelines
 handle cutouts of the federal emergency
 
 closed cell neoprene rubber gaskets management agency (fema)
 installed on bottom and sides of shield and federal insurance and mitigation
 
 anodized aluminum mounting channels administration (fima) for use on doors
 
 universal channels can install inside or in flood prone areas
 outside mount  
 lengths up to 96" available
 
 stainless steel springs provide seal compression  
 a center support post
 is recommended for
 sku height installations over 50"
 fs10 12" high with 10" of flood protection  
 orders for this product are
 fs22 24" high with 22" of flood protection non-changeable and
 non-cancellable
 fs34 36" high with 34" of flood protection
 mounting channel
 1-1/4"
cross reference
ngp fs10 fs22 fs34 fssp
zero 2070a-10 2070a-24 2070a-36 --

 fssp optional
 support &center
 cap




17 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 19, 'LITE KITS & LOUVERS
L-FRA100 L-CVFM-SS
Low Profile Lite Kit HOLLOW METAL
 OR WOOD DOOR Stainless Steel Lite Kit HOLLOW METAL
 OR WOOD DOOR



 For 1 3/4" Thick Doors and 3/16",  For 1 3/4" Thick Doors and 3/16",
 1/4", or 5/16" Glass 3/8" GLAZING
 1/4", or 5/16" Glass
 SPACE
 18 Ga. Cold Rolled Steel  18 Ga. Type 304 Stainless Steel




 EXPOSED GLASS = ORDER SIZE LESS 2"
 CUT GLASS = ORDER SIZE LESS 1"
 3/8" GLAZING




 DOOR CUTOUT & ORDER SIZE
 SPACE
 Mitered and Welded Corners  Mitered and Welded Corners
 3/16", 1/4"




 EXPOSED GLASS = ORDER SIZE LESS 2"
 or 5/16" GLASS




 DOOR CUTOUT & ORDER SIZE CUT GLASS = ORDER SIZE LESS 1"
 Gray Primer (GPZ) Powder  #4 Satin Finish 3/16", 1/4"
 or 5/16" GLASS
 Coat Finish




 1/2"



 1"
 HOLLOW METAL
 OR WOOD DOOR
 3/32"
 1/2"

 1-3/4
 "
 1"
 HOLLOW METAL
 OR WOOD DOOR
 5/32"



 1-3/4
 "


 INTERIOR EXTERIOR METAL

L-700-RX, AFDL METAL
 L-700-A DOOR


Self-Attaching, No Vision Steel No Vision Door
 DOOR


 1-1/4"
Door Louver and Partition Louver 3/16"
 1/2" 1/2"
 For 1 3/4" Thick Doors




 DOOR CUTOUT & ORDER SIZE
  For 1 3/8", 1 3/4" up to 2 1/4"




 DOOR CUTOUT & ORDER SIZE
 90°
 18 Ga. Cold Rolled Steel Thick Doors




 DOOR CUTOUT = ORDER SIZE
 1/2"


 Mitered and Welded Corners  20 Ga. Cold Rolled Steel 90°

 Inverted “V” Design 1-1/16"  Mitered and Welded Corners

 Gray Primer (GPZ) Powder  Inverted “V” Design
 Coat Finish 1-1/16"
  Gray Primer (GPZ) Powder
 Coat Finish
 1/2"




 1-1/4"
 1-1/16" 1-3/16" WOOD
 WOOD DOOR
 DOOR




CROSS REFERENCE
NGP L-FRA100 L-CVFM-SS L-700-RX L-700-A
AIR LOUVERS VSL VSL-S 800A1, 600A1 800 Series
ROCKWOOD LT-B1 LT-B1 Stainless Steel LV-1Y --




 CONDENSED CATALOG 18
', 1722, 1, 'lite kits & louvers
l-fra100 l-cvfm-ss
low profile lite kit hollow metal
 or wood door stainless steel lite kit hollow metal
 or wood door



 for 1 3/4" thick doors and 3/16",  for 1 3/4" thick doors and 3/16",
 1/4", or 5/16" glass 3/8" glazing
 1/4", or 5/16" glass
 space
 18 ga. cold rolled steel  18 ga. type 304 stainless steel




 exposed glass = order size less 2"
 cut glass = order size less 1"
 3/8" glazing




 door cutout & order size
 space
 mitered and welded corners  mitered and welded corners
 3/16", 1/4"




 exposed glass = order size less 2"
 or 5/16" glass




 door cutout & order size cut glass = order size less 1"
 gray primer (gpz) powder  #4 satin finish 3/16", 1/4"
 or 5/16" glass
 coat finish




 1/2"



 1"
 hollow metal
 or wood door
 3/32"
 1/2"

 1-3/4
 "
 1"
 hollow metal
 or wood door
 5/32"



 1-3/4
 "


 interior exterior metal

l-700-rx, afdl metal
 l-700-a door


self-attaching, no vision steel no vision door
 door


 1-1/4"
door louver and partition louver 3/16"
 1/2" 1/2"
 for 1 3/4" thick doors




 door cutout & order size
  for 1 3/8", 1 3/4" up to 2 1/4"




 door cutout & order size
 90°
 18 ga. cold rolled steel thick doors




 door cutout = order size
 1/2"


 mitered and welded corners  20 ga. cold rolled steel 90°

 inverted “v” design 1-1/16"  mitered and welded corners

 gray primer (gpz) powder  inverted “v” design
 coat finish 1-1/16"
  gray primer (gpz) powder
 coat finish
 1/2"




 1-1/4"
 1-1/16" 1-3/16" wood
 wood door
 door




cross reference
ngp l-fra100 l-cvfm-ss l-700-rx l-700-a
air louvers vsl vsl-s 800a1, 600a1 800 series
rockwood lt-b1 lt-b1 stainless steel lv-1y --




 condensed catalog 18
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 20, 'LITE KITS & LOUVERS
 10C
 7/64" 1-3/4" 7/64"
 DOOR
 ONLY
 EN-1634
LO-PRO™ European Std.
 11/16"
 1"
 BS 476.22
Low Profile Lite Kit FRAME
 O.D.
 1/2" British Std.
 ORDER
 GLASS
 SIZE
 For 1 3/4" Thick Doors and 3/16", 1/4", or 5/16" Glass SIZE 3/8” VISIBLE
 & LITE
 DOOR GLAZING

 20 Ga. Cold Rolled Steel CUTOUT SPACE


 ORDER SIZE ORDER SIZE




 ORDER SIZE PLUS 1"
 1/4”
 Mitered and Welded Corners
 ORDER SIZE IS
 GLAZING

 MINUS 1" MINUS 2"
 MATERIAL
 Gray Primer (GPZ) Powder Coat Finish
 VISIBLE LITE

 PLUS 2”



 OUTSIDE INSIDE




 7/64" 1-3/4" 7/64"
 OR
LO-PRO™-IS SPECIFY
 11/16" 1"

Low Profile Lite Kit FRAME
 O.D. 1/2"
 GLASS
 For Variable Door and/or Glass Thickness
 ORDER SIZE
 SIZE VISIBLE
 & LITE
 20 Ga. Cold Rolled Steel
 GLAZING
 DOOR

 ORDER SIZE
 THICKNESS
 CUTOUT 1/2" TO 1"
 Mitered and Welded Corners ORDER SIZE




 ORDER SIZE PLUS 1"
 MINUS 1"
 ORDER SIZE IS MINUS 2"
 Gray Primer (GPZ) Powder Coat Finish GLAZING
 SPACE

 VISIBLE LITE
 3/4" TO 1-1/16"


 PLUS 2"



 OUTSIDE INSIDE




 3/16" 3/16"
FDLS 1-1/8"

Inverted Split Y No Vision Door Louver 3/8"



 
 For 11/8" and Over Thick Doors
 
 18 Ga. Cold Rolled Steel




 ORDER SIZE MINUS 1/8"
 
 Mitered and Welded Corners
 
 Available in Uneven and Fractional Sizes ORDER
 SIZE 1"
 
 Fractional Sizes Fabricated with 1 1/2" Frame &
 DOOR
 Gray Primer (GPZ) Powder Coat Finish CUTOUT




 1-1/8"

 CROSS REFERENCE

 NGP LO-PRO™ LO-PRO™-IS FDLS OUTSIDE INSIDE


 AIR LOUVERS VSL VSIG 700A
 ROCKWOOD LT-B1 LT-B2, LT-B3, LT-B4 --




19 CONDENSED CATALOG
', 1566, 1, 'lite kits & louvers
 10c
 7/64" 1-3/4" 7/64"
 door
 only
 en-1634
lo-pro™ european std.
 11/16"
 1"
 bs 476.22
low profile lite kit frame
 o.d.
 1/2" british std.
 order
 glass
 size
 for 1 3/4" thick doors and 3/16", 1/4", or 5/16" glass size 3/8” visible
 & lite
 door glazing

 20 ga. cold rolled steel cutout space


 order size order size




 order size plus 1"
 1/4”
 mitered and welded corners
 order size is
 glazing

 minus 1" minus 2"
 material
 gray primer (gpz) powder coat finish
 visible lite

 plus 2”



 outside inside




 7/64" 1-3/4" 7/64"
 or
lo-pro™-is specify
 11/16" 1"

low profile lite kit frame
 o.d. 1/2"
 glass
 for variable door and/or glass thickness
 order size
 size visible
 & lite
 20 ga. cold rolled steel
 glazing
 door

 order size
 thickness
 cutout 1/2" to 1"
 mitered and welded corners order size




 order size plus 1"
 minus 1"
 order size is minus 2"
 gray primer (gpz) powder coat finish glazing
 space

 visible lite
 3/4" to 1-1/16"


 plus 2"



 outside inside




 3/16" 3/16"
fdls 1-1/8"

inverted split y no vision door louver 3/8"



 
 for 11/8" and over thick doors
 
 18 ga. cold rolled steel




 order size minus 1/8"
 
 mitered and welded corners
 
 available in uneven and fractional sizes order
 size 1"
 
 fractional sizes fabricated with 1 1/2" frame &
 door
 gray primer (gpz) powder coat finish cutout




 1-1/8"

 cross reference

 ngp lo-pro™ lo-pro™-is fdls outside inside


 air louvers vsl vsig 700a
 rockwood lt-b1 lt-b2, lt-b3, lt-b4 --




19 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 21, 'GLASS

PROTECT3™ PYRAN® PLATINUM F
Fire Protective Safety Wired Glass Fire-Protective Safety Glass Ceramic
 1/4" Thick  3/16" Thick
 Safety Filmed Wired Glass  
 Safety Filmed Glass Ceramic
 Fire Protective Rated  
 Fire Protective Rated
 Impact Safety-Rated  
 Impact Safety-Rated
 STC 28  
 Clear & Wireless Glass
  
 STC 31




20T ™ LAMINATED GLASS
20-Minute Fire-Protective Glass Impact Safety-Rated Laminated
 Architectural Glass
 1/4" Thick 1/4"



 
 Clear & Wireless, Tempered Glass  1/4" Thick
   
 Comprised of Two Pieces of
 Superior Optical Clarity
 
 Fire Protective Rated Glass and a .030" PVB Interlayer
 
 Impact Safety-Rated
  Manufactured in USA

 STC 28
  NON-Fire-Rated
  STC 35




TEMPERED GLASS INSULATED TEMPERED GLASS
 1/4" Thick  1" Thick
 
 Heat Treated Glass  
 Comprised of Two Pieces 1/4" Thick Clear
 
 Impact Safety-Rated Tempered Glass With 1/2" Air Space Between
 and Butyl Seal
 
 Clear & Wireless Glass
  
 Impact Safety-Rated
 
 STC 31
  
 Clear & Wireless Glass
  
 STC 35




CROSS REFERENCE

 PROTECT3™ PYRAN® PLATINUM F
 WireLiteNT, Wireshield FireLite NT




 CONDENSED CATALOG 20
', 1174, 1, 'glass

protect3™ pyran® platinum f
fire protective safety wired glass fire-protective safety glass ceramic
 1/4" thick  3/16" thick
 safety filmed wired glass  
 safety filmed glass ceramic
 fire protective rated  
 fire protective rated
 impact safety-rated  
 impact safety-rated
 stc 28  
 clear & wireless glass
  
 stc 31




20t ™ laminated glass
20-minute fire-protective glass impact safety-rated laminated
 architectural glass
 1/4" thick 1/4"



 
 clear & wireless, tempered glass  1/4" thick
   
 comprised of two pieces of
 superior optical clarity
 
 fire protective rated glass and a .030" pvb interlayer
 
 impact safety-rated
  manufactured in usa

 stc 28
  non-fire-rated
  stc 35




tempered glass insulated tempered glass
 1/4" thick  1" thick
 
 heat treated glass  
 comprised of two pieces 1/4" thick clear
 
 impact safety-rated tempered glass with 1/2" air space between
 and butyl seal
 
 clear & wireless glass
  
 impact safety-rated
 
 stc 31
  
 clear & wireless glass
  
 stc 35




cross reference

 protect3™ pyran® platinum f
 wirelitent, wireshield firelite nt




 condensed catalog 20
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 22, ' All Products In This Section


CONTINUOUS HINGE
ALUMINUM GEARED

CONCEALED
 3/4 3/4 3/4 3/4


 11/16" 11/16" 11/16" 11/16"
 alignment alignment alignment alignment
 flange flange 1/16" flange flange 1/16"
 both door both 1/8" door
 leafs inset leafs door inset
 inset


 1-9/16"
 1-9/16"
 1-15/16" 1-9/16" 1-15/16"



HD1100 HD1400 HD1800 HD2400




 door leaf lip door leaf lip


 3/4 3/4


 11/16"
 7/8"
alignment Available Options:
flange
both 1/2" Wood Screws
leafs 1-16" Torx Screws
 door Cut to Net Length
 inset Anti-Ligature Hospital Tip
 Dutch Door Prep
 1-15/16" Electric Thru-Wire
 Electric Power Transfer Prep
 Std. Lengths 83", 85", 95", 119"
 1-15/16" Furnished with TEK M.S.
 Finishes:
 A - Anodized Aluminum
 DKB - Aluminum Dark
 Bronze/Black Anodized


HD2700 HD4100
 door leaf lip



 CROSS REFERENCE
 NGP HD1100 HD1400 HD1800 HD2400 HD2700 HD4100
 SELECT SL11 HD SL14 HD SL18 HD SL24 HD -- SL41HD
 ROTON 780-112LL 780-124HD 780-111HD 780-224HD 780-226HD 780-041HD
 PEMKO FMSLF-HD1 SPFM-HD1 FMSLI-HD1 FM-HD1 -- OSFM-HD1
 STANLEY 661HD -- -- 662HD -- --
 ABH A110HD A140HD A111HD A240HD A270HD A410HD
 PBB CG31 -- CG311 CG31L CG31P CG31CL
 IVES 112HD 114XY -- 224HD -- --



21 CONDENSED CATALOG
', 1215, 1, ' all products in this section


continuous hinge
aluminum geared

concealed
 3/4 3/4 3/4 3/4


 11/16" 11/16" 11/16" 11/16"
 alignment alignment alignment alignment
 flange flange 1/16" flange flange 1/16"
 both door both 1/8" door
 leafs inset leafs door inset
 inset


 1-9/16"
 1-9/16"
 1-15/16" 1-9/16" 1-15/16"



hd1100 hd1400 hd1800 hd2400




 door leaf lip door leaf lip


 3/4 3/4


 11/16"
 7/8"
alignment available options:
flange
both 1/2" wood screws
leafs 1-16" torx screws
 door cut to net length
 inset anti-ligature hospital tip
 dutch door prep
 1-15/16" electric thru-wire
 electric power transfer prep
 std. lengths 83", 85", 95", 119"
 1-15/16" furnished with tek m.s.
 finishes:
 a - anodized aluminum
 dkb - aluminum dark
 bronze/black anodized


hd2700 hd4100
 door leaf lip



 cross reference
 ngp hd1100 hd1400 hd1800 hd2400 hd2700 hd4100
 select sl11 hd sl14 hd sl18 hd sl24 hd -- sl41hd
 roton 780-112ll 780-124hd 780-111hd 780-224hd 780-226hd 780-041hd
 pemko fmslf-hd1 spfm-hd1 fmsli-hd1 fm-hd1 -- osfm-hd1
 stanley 661hd -- -- 662hd -- --
 abh a110hd a140hd a111hd a240hd a270hd a410hd
 pbb cg31 -- cg311 cg31l cg31p cg31cl
 ives 112hd 114xy -- 224hd -- --



21 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 23, ' All Products In This Section


CONTINUOUS HINGE
ALUMINUM GEARED

 HALF SURFACE


 11/16" 11/16"
 alignment 7/8"
alignment
flange flange




 1-9/16"
 1-15/16"




 1-15/16"




 HD5300 HD5400 HD4200



 Available Options:
 1/2" Wood Screws
FULL SURFACE Torx Screws
 Cut to Net Length
 Anti-Ligature Hospital Tip
 Dutch Door Prep
 Electric Thru-Wire
 7/8" Electric Power Transfer Prep
 11/16"
 Std. Lengths 83", 85", 95", 119"
 Furnished with TEK M.S.
 Finishes:
 A - Anodized Aluminum
 DKB - Aluminum Dark
 Bronze/Black Anodized




 HD5700 HD2100




 CROSS REFERENCE
 NGP HD5300 HD5400 HD4200 HD5700 HD2100
 SELECT SL53 HD SL54 HD -- SL57 HD SL21 HD
 ROTON 780-053HD 780-54HD 780-211HD 780-157HD 780-210HD
 PEMKO -- HS-HD1 OSHS-HD1 FSCP-HD1 FS-HD1
 STANLEY -- 663HD -- 664HD 665HD
 ABH A530HD A540HD A211HD A570HD A210HD
 PBB CG34N CG34 -- CG33N CG33C
 IVES 053HD 054HD -- 157XY 210HD



 CONDENSED CATALOG 22
', 914, 1, ' all products in this section


continuous hinge
aluminum geared

 half surface


 11/16" 11/16"
 alignment 7/8"
alignment
flange flange




 1-9/16"
 1-15/16"




 1-15/16"




 hd5300 hd5400 hd4200



 available options:
 1/2" wood screws
full surface torx screws
 cut to net length
 anti-ligature hospital tip
 dutch door prep
 electric thru-wire
 7/8" electric power transfer prep
 11/16"
 std. lengths 83", 85", 95", 119"
 furnished with tek m.s.
 finishes:
 a - anodized aluminum
 dkb - aluminum dark
 bronze/black anodized




 hd5700 hd2100




 cross reference
 ngp hd5300 hd5400 hd4200 hd5700 hd2100
 select sl53 hd sl54 hd -- sl57 hd sl21 hd
 roton 780-053hd 780-54hd 780-211hd 780-157hd 780-210hd
 pemko -- hs-hd1 oshs-hd1 fscp-hd1 fs-hd1
 stanley -- 663hd -- 664hd 665hd
 abh a530hd a540hd a211hd a570hd a210hd
 pbb cg34n cg34 -- cg33n cg33c
 ives 053hd 054hd -- 157xy 210hd



 condensed catalog 22
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 24, ' All Products In This Section


CONTINUOUS HINGE
STA INLE SS STEEL

CONCEALED 14 Gauge Type 304 Stainless
 Steel Pin and Barrel Design



 3
 HINGE 0.063 8
 THICK
 0.075 THICK




 1
 2
 3
 4 3 13 4
 4




 3 0.036 DOOR
 4
 THICK

 1
 4 HINGE ALLOWANCE FRAME


SS300 SS305




 SS315


 Available Options:
 CROSS REFERENCE 1/2" Wood Screws
 Torx Screws
NGP SS300 SS305 SS315 Cut to Net Length
MARKAR FM300 HG305 HG315 Anti-Ligature Hospital Tip
 Dutch Door Prep
SELECT SL300 SL305 SL315 Welded Tips
 790-900 790-905 790-915 Electric Thru-Wire
HAGAR
 Electric Power Transfer Prep
ABH A500 A505 A515 Std. Lengths 83", 85", 95", 119"
 Furnished with TEK M.S.
IVES 700 705 715
 Wood Screws
STANLEY 651 652 653 Finishes:
 CH51 CH51G CH51L Brushed Stainless Steel
PBB
 US32D (630)



23 CONDENSED CATALOG
', 799, 1, ' all products in this section


continuous hinge
sta inle ss steel

concealed 14 gauge type 304 stainless
 steel pin and barrel design



 3
 hinge 0.063 8
 thick
 0.075 thick




 1
 2
 3
 4 3 13 4
 4




 3 0.036 door
 4
 thick

 1
 4 hinge allowance frame


ss300 ss305




 ss315


 available options:
 cross reference 1/2" wood screws
 torx screws
ngp ss300 ss305 ss315 cut to net length
markar fm300 hg305 hg315 anti-ligature hospital tip
 dutch door prep
select sl300 sl305 sl315 welded tips
 790-900 790-905 790-915 electric thru-wire
hagar
 electric power transfer prep
abh a500 a505 a515 std. lengths 83", 85", 95", 119"
 furnished with tek m.s.
ives 700 705 715
 wood screws
stanley 651 652 653 finishes:
 ch51 ch51g ch51l brushed stainless steel
pbb
 us32d (630)



23 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 25, ' All Products In This Section


CONTINUOUS HINGE
STA INLE SS STEEL

FULL SURFACE SWING CLEAR




SS302 SS311

HALF MORTISE




SS306 SS304


 Available Options:
CROSS REFERENCE 1/2" Wood Screws
 Torx Screws
NGP SS302 SS311 SS306 SS304 Cut to Net Length
MARKAR FS302 HG311 HG306 HM304 Anti-Ligature Hospital Tip
 Dutch Door Prep
SELECT SL302 SL311 SL306 -- Welded Tips
 -- 790-911 790-906 790-904 Electric Thru-Wire
HAGAR
 Electric Power Transfer Prep
ABH A502 A511 A506 A504 Std. Lengths 83", 85", 95", 119"
 Furnished with TEK M.S.
IVES 702 711 -- --
 Wood Screws
STANLEY 657 656 655 654 Finishes:
 CH53 CH52CL CH52L CH52 Brushed Stainless Steel
PBB
 US32D (630)



 CONDENSED CATALOG 24
', 689, 1, ' all products in this section


continuous hinge
sta inle ss steel

full surface swing clear




ss302 ss311

half mortise




ss306 ss304


 available options:
cross reference 1/2" wood screws
 torx screws
ngp ss302 ss311 ss306 ss304 cut to net length
markar fs302 hg311 hg306 hm304 anti-ligature hospital tip
 dutch door prep
select sl302 sl311 sl306 -- welded tips
 -- 790-911 790-906 790-904 electric thru-wire
hagar
 electric power transfer prep
abh a502 a511 a506 a504 std. lengths 83", 85", 95", 119"
 furnished with tek m.s.
ives 702 711 -- --
 wood screws
stanley 657 656 655 654 finishes:
 ch53 ch52cl ch52l ch52 brushed stainless steel
pbb
 us32d (630)



 condensed catalog 24
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 26, 'SLIDING DOOR HARDWARE
B Y-PA S S , B I-F O L D

SLAL-75-BP
Aluminum By-Pass Side Mount Track System

 SKU TRACK LENGTH

 SLAL-75-BP-48 48"

 SLAL-75-BP-60 60"

 SLAL-75-BP-72 72"

 SLAL-75-BP-96 96"


SLAL-75-BPF
Aluminum By-Pass Side Mount Track System
with Fascia

 SKU TRACK LENGTH

 SLAL-75-BPF-48 48"

 SLAL-75-BPF-60 60"

 SLAL-75-BPF-72 72"

 SLAL-75-BPF-96 96"


SLAL-75-BF
Aluminum Bi-Fold Top Mount Track System

TWO-DOOR SYSTEMS

 SKU TRACK LENGTH

 SLAL-75-BF2DR-36 36"

 SLAL-75-BF2DR-48 48"


FOUR-DOOR SYSTEMS

 SKU TRACK LENGTH

 SLAL-75-BF4DR-60 60"

 SLAL-75-BF4DR-72 72"

 SLAL-75-BF4DR-96 96"



CROSS REFERENCE
NGP SLAL-75-BP SLAL-75-BPF SLAL-75-BF
HAGER 9514 9614 9570
PEMKO -- -- HF2/100A
STANLEY BPC60A-00 -- BFC50-00
LE JOHNSON 2200 2200F 100FS
KN CROWDER C-600 -- CF-100



25 CONDENSED CATALOG
', 821, 1, 'sliding door hardware
b y-pa s s , b i-f o l d

slal-75-bp
aluminum by-pass side mount track system

 sku track length

 slal-75-bp-48 48"

 slal-75-bp-60 60"

 slal-75-bp-72 72"

 slal-75-bp-96 96"


slal-75-bpf
aluminum by-pass side mount track system
with fascia

 sku track length

 slal-75-bpf-48 48"

 slal-75-bpf-60 60"

 slal-75-bpf-72 72"

 slal-75-bpf-96 96"


slal-75-bf
aluminum bi-fold top mount track system

two-door systems

 sku track length

 slal-75-bf2dr-36 36"

 slal-75-bf2dr-48 48"


four-door systems

 sku track length

 slal-75-bf4dr-60 60"

 slal-75-bf4dr-72 72"

 slal-75-bf4dr-96 96"



cross reference
ngp slal-75-bp slal-75-bpf slal-75-bf
hager 9514 9614 9570
pemko -- -- hf2/100a
stanley bpc60a-00 -- bfc50-00
le johnson 2200 2200f 100fs
kn crowder c-600 -- cf-100



25 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 27, 'SLIDING DOOR HARDWARE
B Y-PA S S , S I D E WA L L M O U N T

SLAL-250-BP
Aluminum By-Pass Top Mount Track System

TWO-DOOR SYSTEMS

 SKU TRACK LENGTH

 SLAL-250-BP-2DR-48 48"

 SLAL-250-BP-2DR-60 60"

 SLAL-250-BP-2DR-72 72"

 SLAL-250-BP-2DR-96 96"

 SLAL-250-BP-2DR-144 144"


FOUR-DOOR SYSTEMS

 SKU TRACK LENGTH

 SLAL-250-BP-4DR-48 48"

 SLAL-250-BP-4DR-60 60"

 SLAL-250-BP-4DR-72 72"

 SLAL-250-BP-4DR-96 96"

 SLAL-250-BP-4DR-144 144"




SLAL-250-SW 2-1/8"

Aluminum Side Wall Mount Track System
 FASTENER


 SKU TRACK LENGTH
 SLAL-250-SW-48 48" 2-3/4"


 SLAL-250-SW-60 60" 3-13/16"


 SLAL-250-SW-72 72" TRACK
 EXTRUSION



 SLAL-250-SW-96 96"

 SLAL-250-SW-144 144”
 DOOR HANGER




CROSS REFERENCE
NGP SLAL-250-BP SLAL-250-SW
HAGER 9611 9710
PEMKO HBP200A 280C-SWKIT
STANLEY BPC150N-00 --
LE JOHNSON 100SM 2610
KN CROWDER C-500 C-412



 CONDENSED CATALOG 26
', 872, 1, 'sliding door hardware
b y-pa s s , s i d e wa l l m o u n t

slal-250-bp
aluminum by-pass top mount track system

two-door systems

 sku track length

 slal-250-bp-2dr-48 48"

 slal-250-bp-2dr-60 60"

 slal-250-bp-2dr-72 72"

 slal-250-bp-2dr-96 96"

 slal-250-bp-2dr-144 144"


four-door systems

 sku track length

 slal-250-bp-4dr-48 48"

 slal-250-bp-4dr-60 60"

 slal-250-bp-4dr-72 72"

 slal-250-bp-4dr-96 96"

 slal-250-bp-4dr-144 144"




slal-250-sw 2-1/8"

aluminum side wall mount track system
 fastener


 sku track length
 slal-250-sw-48 48" 2-3/4"


 slal-250-sw-60 60" 3-13/16"


 slal-250-sw-72 72" track
 extrusion



 slal-250-sw-96 96"

 slal-250-sw-144 144”
 door hanger




cross reference
ngp slal-250-bp slal-250-sw
hager 9611 9710
pemko hbp200a 280c-swkit
stanley bpc150n-00 --
le johnson 100sm 2610
kn crowder c-500 c-412



 condensed catalog 26
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 28, 'SLIDING DOOR HARDWARE
POCKET DOOR/FRAME KIT

SLAL-250-PD 1-13/16"

Aluminum Top Mount Track System

 SKU TRACK LENGTH
 1-7/16"

 SLAL-250-PD-48 48" TRACK
 EXTRUSION
 2-1/2"
 SLAL-250-PD-60 60"

 SLAL-250-PD-72 72"

 SLAL-250-PD-96 96" DOOR HANGER



 SLAL-250-PD-144 144"




 Doorway End



SLAL-250-PDKIT Nailing Boards

Aluminum Top Mount Track System Header and
 Track Assembly

 SKU APPLICATION FOR UP
 TO:
 SLAL-250-PDKIT 4" Wood or 3/0 x 7/0
 Metal Stud
 1-3/8" Door
 SLAL-250-PDKIT-48"DR 4" Wood or 4/0 x 7/0
 Metal Stud
 SLAL-250-PDKIT-6 6" Wood Stud 3/0 x 7/0 Split Stud Split Stud
 5/16" 5/16"
 (5 1/2" Header) clearance clearance
 both sides both sides

 SLAL-250-PDKIT-6-48" 6" Wood Stud 4/0 x 7/0 of door of door


 (5 1/2" Header) 2"


 SLAL-250-PDKIT-6M 6" Metal Stud 3/0 x 7/0
 (6" Header) 1-3/4" Door



 SLAL-250-PDKT-6M-48" 6" Metal Stud 4/0 x 7/0
 (6" Header) Split Stud Split Stud
 1/8" 1/8"
 clearance clearance
 both sides both sides
 of door of door


 2"
 3-1/2"

 Outside to Outside
 2"
 Inside to Inside




CROSS REFERENCE
NGP SLAL-250-PD SLAL-250-PDKIT
HAGER 9678 9630
PEMKO H200A PF28200A6080
STANLEY PDC150N-00 PDC150N-00
LE JOHNSON 100PD 1500PF
KN CROWDER C-411 TYPE B



27 CONDENSED CATALOG
', 1226, 1, 'sliding door hardware
pocket door/frame kit

slal-250-pd 1-13/16"

aluminum top mount track system

 sku track length
 1-7/16"

 slal-250-pd-48 48" track
 extrusion
 2-1/2"
 slal-250-pd-60 60"

 slal-250-pd-72 72"

 slal-250-pd-96 96" door hanger



 slal-250-pd-144 144"




 doorway end



slal-250-pdkit nailing boards

aluminum top mount track system header and
 track assembly

 sku application for up
 to:
 slal-250-pdkit 4" wood or 3/0 x 7/0
 metal stud
 1-3/8" door
 slal-250-pdkit-48"dr 4" wood or 4/0 x 7/0
 metal stud
 slal-250-pdkit-6 6" wood stud 3/0 x 7/0 split stud split stud
 5/16" 5/16"
 (5 1/2" header) clearance clearance
 both sides both sides

 slal-250-pdkit-6-48" 6" wood stud 4/0 x 7/0 of door of door


 (5 1/2" header) 2"


 slal-250-pdkit-6m 6" metal stud 3/0 x 7/0
 (6" header) 1-3/4" door



 slal-250-pdkt-6m-48" 6" metal stud 4/0 x 7/0
 (6" header) split stud split stud
 1/8" 1/8"
 clearance clearance
 both sides both sides
 of door of door


 2"
 3-1/2"

 outside to outside
 2"
 inside to inside




cross reference
ngp slal-250-pd slal-250-pdkit
hager 9678 9630
pemko h200a pf28200a6080
stanley pdc150n-00 pdc150n-00
le johnson 100pd 1500pf
kn crowder c-411 type b



27 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 29, 'SLIDING DOOR HARDWARE
STA INLE SS STEEL

SLSS1
Sliding Door Hardware, Stainless Steel Top
Mount Round Track System




 STAINLESS STEEL TOP MOUNT
STAINLESS STEEL TOP MOUNT ROUND TRACK SYSTEM (WITH SOFT CLOSE)
ROUND TRACK SYSTEM

 SKU TRACK LENGTH SKU TRACK LENGTH
 SLSS1-6 78 3/4" SLSS1-6-SC* 78 3/4"
 SLSS1-8 98 7/16" SLSS1-8-SC* 98 7/16"




SLSS2
Sliding Door Hardware, Stainless Steel Side
Mount Round Track System




 STAINLESS STEEL SIDE MOUNT
STAINLESS STEEL SIDE MOUNT ROUND TRACK SYSTEM (WITH SOFT CLOSE)
ROUND TRACK SYSTEM

 SKU TRACK LENGTH SKU TRACK LENGTH
 SLSS2-6 78 3/4" SLSS2-6-SC* 78 3/4"

 SLSS2-8 98 7/16" SLSS2-8-SC* 98 7/16"

 * Soft Close / Open Hardware is Included for Both
 Directions in Addition to the SLSS1-6 and SLSS1-8
 Complete Kit Contents




CROSS REFERENCE
NGP SLSS1 SLSS2 SLSS1-6-SC SLSS1-8-SC SLSS2-6-SC SLSS2-8-SC
PEMKO W60 W100 SFT-W60 SFT-W60 SFT-W100 SFT-W100
HAGER 9432 9436 -- -- -- --
KN CROWDER CRT-51 CRT-52 -- -- -- --




 CONDENSED CATALOG 28
', 993, 1, 'sliding door hardware
sta inle ss steel

slss1
sliding door hardware, stainless steel top
mount round track system




 stainless steel top mount
stainless steel top mount round track system (with soft close)
round track system

 sku track length sku track length
 slss1-6 78 3/4" slss1-6-sc* 78 3/4"
 slss1-8 98 7/16" slss1-8-sc* 98 7/16"




slss2
sliding door hardware, stainless steel side
mount round track system




 stainless steel side mount
stainless steel side mount round track system (with soft close)
round track system

 sku track length sku track length
 slss2-6 78 3/4" slss2-6-sc* 78 3/4"

 slss2-8 98 7/16" slss2-8-sc* 98 7/16"

 * soft close / open hardware is included for both
 directions in addition to the slss1-6 and slss1-8
 complete kit contents




cross reference
ngp slss1 slss2 slss1-6-sc slss1-8-sc slss2-6-sc slss2-8-sc
pemko w60 w100 sft-w60 sft-w60 sft-w100 sft-w100
hager 9432 9436 -- -- -- --
kn crowder crt-51 crt-52 -- -- -- --




 condensed catalog 28
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 30, 'GAPGUARD™ 90
 MINUTES




FIRE DOOR ACCESSORIES




 GAP90™ GAP90N™
 Fire Door Head / Fire Door Head /
 Jamb Gap Solution Jamb Gap Solution
 for Narrow Stops

  1/8" - 3/8" Gaps
  1/8" - 3/8" Gaps
  Non-Handed
 For Use When the
  
  In-Field Modifiable Soffit Depth is
 Available in Dark
  
 Between 1/2" and 1 3/8"
 Brown and Gray Non-Handed
  

 In-Field Modifiable
  

 Available in Dark
  
 Brown and Gray




 GAP90-ME 9990
 Meeting Edge Fire Door Top
 Gap Solution Gap Solution

 Meeting Edge Gaps
   Door Top Gaps,
  
 (Pairs of Doors), up to 3/8" Measuring up to 1/2"

 Non-Handed
    Non-Handed

 In-Field Modifiable
    In-Field Modifiable

 Gray Finish
   Recommended for Doors with
  
 Parallel Arm Closers

 *See Installation
 Brushed Stainless Steel Finish
  

 Requirements.




29 CONDENSED CATALOG
', 848, 1, 'gapguard™ 90
 minutes




fire door accessories




 gap90™ gap90n™
 fire door head / fire door head /
 jamb gap solution jamb gap solution
 for narrow stops

  1/8" - 3/8" gaps
  1/8" - 3/8" gaps
  non-handed
 for use when the
  
  in-field modifiable soffit depth is
 available in dark
  
 between 1/2" and 1 3/8"
 brown and gray non-handed
  

 in-field modifiable
  

 available in dark
  
 brown and gray




 gap90-me 9990
 meeting edge fire door top
 gap solution gap solution

 meeting edge gaps
   door top gaps,
  
 (pairs of doors), up to 3/8" measuring up to 1/2"

 non-handed
    non-handed

 in-field modifiable
    in-field modifiable

 gray finish
   recommended for doors with
  
 parallel arm closers

 *see installation
 brushed stainless steel finish
  

 requirements.




29 condensed catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 31, 'GAPGUARD™ 90
 MINUTES




FIRE DOOR ACCESSORIES




 9590 9595DKB
 Floating Fire Door
 Fire Door Bottom
 Bottom Gap Solution
 Gap Solution
 Door Bottom Gaps, up to 1 3/8"
  

 Door Bottom Gaps, up to 1 1/2"
  
 Non-Handed
  

 Non-Handed
  
 Designed to Travel Over Uneven Floors,
  

 In-Field Modifiable
   With a Range of 3/8"

 Brushed Stainless Steel Finish
   Optional L-Bracket Allows for Easy Installation
  

 Powder-Coated Dark Brown (DKB)
  




 HP90-FB GAPGUARD™
 Flush Bolt
 Hardware
 FIRE CAULK
 HP90-MORT Prep Filler Fill up to a
  
 1/2" Diameter
 Mortise Hardware Thru-Hole
 Prep Filler
 Fully-Cured in
  
 *See Installation 24 Hours
 Requirements.
 Sandable/Paintable
  

 Color: Tan
  

 10 Tubes
  
 per Box




 HP90-CYL
 Cylindrical Hardware
 Prep Filler

 *See Installation
 Requirements.




 *See Installation
 Requirements. *To retain UL Certification,
 the products indicated
 Includes Steel Filler
 must be installed using
 Plates for use on Hollow
 GapGuard™ Fire Caulk.
 Metal Doors




 CONDENSED CATALOG 30
', 1071, 1, 'gapguard™ 90
 minutes




fire door accessories




 9590 9595dkb
 floating fire door
 fire door bottom
 bottom gap solution
 gap solution
 door bottom gaps, up to 1 3/8"
  

 door bottom gaps, up to 1 1/2"
  
 non-handed
  

 non-handed
  
 designed to travel over uneven floors,
  

 in-field modifiable
   with a range of 3/8"

 brushed stainless steel finish
   optional l-bracket allows for easy installation
  

 powder-coated dark brown (dkb)
  




 hp90-fb gapguard™
 flush bolt
 hardware
 fire caulk
 hp90-mort prep filler fill up to a
  
 1/2" diameter
 mortise hardware thru-hole
 prep filler
 fully-cured in
  
 *see installation 24 hours
 requirements.
 sandable/paintable
  

 color: tan
  

 10 tubes
  
 per box




 hp90-cyl
 cylindrical hardware
 prep filler

 *see installation
 requirements.




 *see installation
 requirements. *to retain ul certification,
 the products indicated
 includes steel filler
 must be installed using
 plates for use on hollow
 gapguard™ fire caulk.
 metal doors




 condensed catalog 30
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('ab117b53b17abbe5', 32, ' For Our Most Up-to-Date
 Condensed Catalog Scan this
 QR Code or Visit ngp.com.




 For Our Most Up-To-Date
Complete Product Catalog Scan
 this QR Code or Visit ngp.com.




 ngp.com
 1-800-NGP-RUSH
 FAX: (800) 255-7874
 QUOTES: quotes@ngp.com
 ORDERS: orders@ngp.com

 MEMPHIS




 NGP-CAT-CON-0125-A
 4985 East Raines Road
 Memphis, TN 38118

 CARSON CITY
 3689 Arrowhead Drive
 Carson City, NV 89706
', 405, 1, ' for our most up-to-date
 condensed catalog scan this
 qr code or visit ngp.com.




 for our most up-to-date
complete product catalog scan
 this qr code or visit ngp.com.




 ngp.com
 1-800-ngp-rush
 fax: (800) 255-7874
 quotes: quotes@ngp.com
 orders: orders@ngp.com

 memphis




 ngp-cat-con-0125-a
 4985 east raines road
 memphis, tn 38118

 carson city
 3689 arrowhead drive
 carson city, nv 89706
');
INSERT OR IGNORE INTO products (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description, available, spec_sheet_url, catalog_number, search_text) VALUES ('prod-ngp-896', 'mfr-ngp', 'doors', '896', 'Thresholds', '896', 'National Guard Products 896', 'Thresholds; manufacturer technical catalogue', 1, 'https://www.ngp.com/ngp/cache/file/065F4F55-38B1-4AEC-852956EFA8B92AC7.pdf', '896', 'national guard products 896 896 thresholds');
INSERT OR IGNORE INTO product_documents (id, product_id, document_type, document_title, document_url, r2_object_key, r2_bucket, mime_type, page_count, file_size_bytes, file_hash_sha256, verified, active, notes) VALUES ('doc-g021-ngp-896', 'prod-ngp-896', 'cut_sheet', 'National Guard Products Condensed Catalog (PDF p.4)', 'https://www.ngp.com/ngp/cache/file/065F4F55-38B1-4AEC-852956EFA8B92AC7.pdf', 'catalog-corpus/7c122f87b32bb9b538cb8bf50a18af7c6f314587d30e7e1c6fa437f02d0a059a.pdf', 'subx-uploads', 'application/pdf', 32, 6619632, 'ab117b53b17abbe593cab804e4683282aeca045265b3dcf1f879f3cd4236aea3', 1, 1, 'g021: model visually verified on PDF ordinal 4. Full book; fetch is offline through catalog-corpus, never request-time.');
INSERT INTO catalogue_pages_fts (rowid, text_content) SELECT p.rowid, p.text_content FROM catalogue_pages p JOIN catalogues c ON c.catalogue_id = p.catalogue_id WHERE c.catalogue_id = 'ab117b53b17abbe5' AND c.index_built = 0 AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = c.catalogue_id) = c.page_count;
UPDATE catalogues SET index_built = 1 WHERE index_built = 0 AND catalogue_id = 'ab117b53b17abbe5' AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = 'ab117b53b17abbe5') = page_count;
INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES ('https://www.ngp.com/ngp/cache/file/065F4F55-38B1-4AEC-852956EFA8B92AC7.pdf', 'g021-priority-2', '2026-10-09T17:21:25.581447+00:00');
