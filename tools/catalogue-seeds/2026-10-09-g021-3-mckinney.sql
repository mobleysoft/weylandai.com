-- Goal g021: public manufacturer technical book, verified 2026-10-09.
-- Source: https://marketing-assets.seclock.com/image/upload/AADSS1010289
-- Content SHA256: 00414107e0710bb62551b180e5f61b947a978da0e62190dd45473f05f015afe2
-- Full book text uses 1-based PDF ordinals; the original PDF is ingested offline by catalog-corpus.
-- INSERT OR IGNORE preserves existing records; reruns add no duplicates.
INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, website, verified, notes) VALUES ('mfr-mckinney', 'McKinney', 'mckinney', 'doors', 'https://www.mckinneyhinge.com', 1, 'g021 public technical catalogue seed');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('MCK', 'mfr-mckinney', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('MK', 'mfr-mckinney', 'g021_public_catalogue');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('MCKINNEY', 'mfr-mckinney', 'g021_public_catalogue');
INSERT OR IGNORE INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, text_extracted, index_built, source_url) VALUES ('00414107e0710bb6', 'g021-mckinney-00414107e0710bb6.pdf', '00414107e0710bb62551b180e5f61b947a978da0e62190dd45473f05f015afe2', 13032724, 92, 'mckinney', 'McKinney Full Line Hinge Catalog', '2026-10-09T17:21:28.219868+00:00', 'g021-catalogue-seed', 'catalog-corpus/cd6304bc5b178061ec1acde48ddc67d03fdaefc1fd67d0cb49e83d02f2f85e4f.pdf', 1, 0, 'https://marketing-assets.seclock.com/image/upload/AADSS1010289');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 1, 'McKinney
Full Line Catalog
', 27, 1, 'mckinney
full line catalog
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 2, 'Table of Contents
 Numerical Index 4
 General Information 5-29
 About McKinney and Sales & Support 5-6
 Warranty and Hinge Types 7-8
 Bearings and Knuckle Features 9-10
 Hinge Tips and Pins 11-12
 Applications and Hinge Selection 13-17
 Reference Charts 18-23
 Hand of Doors and Hinges 24
 Hinge Swaging 25
 Screws and Fasteners 26-27
 Finishes 28
 Product Maintenance and Care 29
 Full Mortise Hinges FM-1 – FM-17
 Full Mortise Bearing Hinges - Two Knuckle Standard Weight Series FM-1
 Full Mortise Bearing Hinges - Two Knuckle Heavy Weight Series FM-2
 Full Mortise Bearing Hinges - Three Knuckle Standard Weight Series FM-3
 Full Mortise Bearing Hinges - Three Knuckle Heavy Weight Series FM-4
 Full Mortise Institutional Hinges - Three Knuckle Hospital Tip Heavy Weight Series FM-5
 Swing Clear Full Mortise Bearing Hinges - Three Knuckle Heavy Weight Series (Reversible) FM-6
 Full Mortise Plain Bearing Hinges - Five Knuckle Standard Weight Series FM-7
 Hinge Pin Door Stop FM-7 – FM-8, FM-16
 Full Mortise Bearing Hinges - Five Knuckle Standard Weight Series FM-8
 Full Mortise Concealed Bearing Hinges - Five Knuckle Standard Weight Series FM-9
 Wide Throw Full Mortise Bearing Hinges - Five Knuckle Standard Weight Series FM-10
 Full Mortise Bearing Hinges - Five Knuckle Heavy Weight Full Mortise Series FM-11
 Full Mortise Concealed Bearing Hinges - Five Knuckle Heavy Weight Full Mortise Series FM-12
 Wide Throw Full Mortise Bearing Hinges - Five Knuckle Heavy Weight Wide Throw Series FM-13
 Swing Clear Full Mortise Bearing Hinges - Five Knuckle Standard Weight Swing Clear Series (Reversible) FM-14
 Swing Clear Full Mortise Bearing Hinges - Five Knuckle Heavy Weight Swing Clear Series (Reversible) FM-15
 Full Mortise Hinges - MacPro® Five Knuckle Standard Weight Series FM-16
 Full Mortise Hinges - MacPro® Five Knuckle Heavy Weight Series FM-17
 Full Mortise Anchor Hinges AH-1 – AH-4
 Three Knuckle Heavy Weight Anchor Hinges Series – Concealed Door Closers AH-1
 Three Knuckle Heavy Weight Anchor Hinge Series – Surface Applied Door Closers AH-2
 Three Knuckle Heavy Weight Anchor Hinge Series – Concealed Door Closers AH-3
 Three Knuckle Heavy Weight Anchor Hinge Series – With 4" Door Leg AH-4
 Half Mortise Hinges HM-1 – HM-3
 Half Mortise Bearing Hinges - Five Knuckle Standard Weight Half Mortise Series (Reversible) HM-1
 Half Mortise Bearing Hinges - Five Knuckle Heavy Weight Half Mortise Series (Reversible) HM-2
 Swing Clear Half Mortise Bearing Hinges - Five Knuckle Heavy Weight Half Mortise Swing Clear Series (Reversible) HM-3
 Half Surface Hinges HS-1 – HS-4
 Half Surface Plain Bearing Hinges - Five Knuckle Standard Weight Series (Reversible) HS-1
 Half Surface Bearing Hinges - Five Knuckle Heavy Weight Series (Reversible) HS-2
 Swing Clear Half Surface Bearing Hinges - Five Knuckle Heavy Weight Series (Reversible) HS-3
 Hinge Back Plates HS-4
 Full Surface Hinges FS-1 – FS-2
 Full Surface Bearing Hinges - Five Knuckle Heavy Weight Series (Reversible) FS-1
 Full Surface Bearing Hinges - Five Knuckle Standard Weight Series (Reversible) FS-2
 Spring Hinges & Pivots SH-1 – SH-5
 Full Mortise Single Acting Standard Weight Spring Hinge SH-1
 MacPro® Adjustable Spring Hinge SH-2
 Full Surface Double Acting Door Spring SH-2
 Non-Template Double Acting Spring Hinge SH-3 – SH-4
 Gravity Double Acting Pivot Hinge SH-5




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 3717, 1, 'table of contents
 numerical index 4
 general information 5-29
 about mckinney and sales & support 5-6
 warranty and hinge types 7-8
 bearings and knuckle features 9-10
 hinge tips and pins 11-12
 applications and hinge selection 13-17
 reference charts 18-23
 hand of doors and hinges 24
 hinge swaging 25
 screws and fasteners 26-27
 finishes 28
 product maintenance and care 29
 full mortise hinges fm-1 – fm-17
 full mortise bearing hinges - two knuckle standard weight series fm-1
 full mortise bearing hinges - two knuckle heavy weight series fm-2
 full mortise bearing hinges - three knuckle standard weight series fm-3
 full mortise bearing hinges - three knuckle heavy weight series fm-4
 full mortise institutional hinges - three knuckle hospital tip heavy weight series fm-5
 swing clear full mortise bearing hinges - three knuckle heavy weight series (reversible) fm-6
 full mortise plain bearing hinges - five knuckle standard weight series fm-7
 hinge pin door stop fm-7 – fm-8, fm-16
 full mortise bearing hinges - five knuckle standard weight series fm-8
 full mortise concealed bearing hinges - five knuckle standard weight series fm-9
 wide throw full mortise bearing hinges - five knuckle standard weight series fm-10
 full mortise bearing hinges - five knuckle heavy weight full mortise series fm-11
 full mortise concealed bearing hinges - five knuckle heavy weight full mortise series fm-12
 wide throw full mortise bearing hinges - five knuckle heavy weight wide throw series fm-13
 swing clear full mortise bearing hinges - five knuckle standard weight swing clear series (reversible) fm-14
 swing clear full mortise bearing hinges - five knuckle heavy weight swing clear series (reversible) fm-15
 full mortise hinges - macpro® five knuckle standard weight series fm-16
 full mortise hinges - macpro® five knuckle heavy weight series fm-17
 full mortise anchor hinges ah-1 – ah-4
 three knuckle heavy weight anchor hinges series – concealed door closers ah-1
 three knuckle heavy weight anchor hinge series – surface applied door closers ah-2
 three knuckle heavy weight anchor hinge series – concealed door closers ah-3
 three knuckle heavy weight anchor hinge series – with 4" door leg ah-4
 half mortise hinges hm-1 – hm-3
 half mortise bearing hinges - five knuckle standard weight half mortise series (reversible) hm-1
 half mortise bearing hinges - five knuckle heavy weight half mortise series (reversible) hm-2
 swing clear half mortise bearing hinges - five knuckle heavy weight half mortise swing clear series (reversible) hm-3
 half surface hinges hs-1 – hs-4
 half surface plain bearing hinges - five knuckle standard weight series (reversible) hs-1
 half surface bearing hinges - five knuckle heavy weight series (reversible) hs-2
 swing clear half surface bearing hinges - five knuckle heavy weight series (reversible) hs-3
 hinge back plates hs-4
 full surface hinges fs-1 – fs-2
 full surface bearing hinges - five knuckle heavy weight series (reversible) fs-1
 full surface bearing hinges - five knuckle standard weight series (reversible) fs-2
 spring hinges & pivots sh-1 – sh-5
 full mortise single acting standard weight spring hinge sh-1
 macpro® adjustable spring hinge sh-2
 full surface double acting door spring sh-2
 non-template double acting spring hinge sh-3 – sh-4
 gravity double acting pivot hinge sh-5




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 3, ' Table of Contents
 Rescue Hardware RH-1 – RH-4
 Jamb Mount Pivot Set RH-1
 Combination Strike and Stop RH-2
 Emergency Door Stop RH-3
 Double Lipped Strike RH-4
 Electrified Hinges EH-1 – EH-10
 Electrolynx® Hinge (QC Option) EH-1
 ElectroLynx® Retrofit Cables EH-2
 MacPro® Electric Hinges EH-3
 Concealed Circuit Electric Hinge (CC option) EH-4
 ElectroLynx® Power over Ethernet (PoE) Hinge and Wiring Harnesses EH-5 – EH-6
 Magnetic Monitoring Hinge (MM Option) EH-7
 Concealed Electrified Hinge EH-8
 Electrical Power Transfer (EPT) EH-8
 Electrified Hinge Service Kit and Molex Hand Crimp Tool EH-9
 Extraction Tool and Junction Box for Electric Hinges EH-10
 Specialty Hinges SP-1 – SP-13
 StormPro® Tornado Resistant Hinges SP-1
 Pocket Pivot Hinges SP-2
 Raised Barrel Full Mortise Standard and Heavy Weight Hinges SP-3
 Slip-In Full Mortise Type I and Type II Standard Weight Bearing Hinges SP-4
 Full Mortise Interim Hinges SP-5
 Residential Swing Clear Hinge SP-6
 RediFrame Swing Clear Hinge SP-6
 Residential Spring Hinges SP-7
 Residential Hinges SP-7
 Decorative Hinges - Square Barrel SP-8
 Decorative Hinges - Olive Knuckel SP-9
 Concealed Hinges SP-10 – SP-12
 Cam Lift Hinges and Pivot Reinforcing Hinges SP-13




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 3
', 1583, 1, ' table of contents
 rescue hardware rh-1 – rh-4
 jamb mount pivot set rh-1
 combination strike and stop rh-2
 emergency door stop rh-3
 double lipped strike rh-4
 electrified hinges eh-1 – eh-10
 electrolynx® hinge (qc option) eh-1
 electrolynx® retrofit cables eh-2
 macpro® electric hinges eh-3
 concealed circuit electric hinge (cc option) eh-4
 electrolynx® power over ethernet (poe) hinge and wiring harnesses eh-5 – eh-6
 magnetic monitoring hinge (mm option) eh-7
 concealed electrified hinge eh-8
 electrical power transfer (ept) eh-8
 electrified hinge service kit and molex hand crimp tool eh-9
 extraction tool and junction box for electric hinges eh-10
 specialty hinges sp-1 – sp-13
 stormpro® tornado resistant hinges sp-1
 pocket pivot hinges sp-2
 raised barrel full mortise standard and heavy weight hinges sp-3
 slip-in full mortise type i and type ii standard weight bearing hinges sp-4
 full mortise interim hinges sp-5
 residential swing clear hinge sp-6
 rediframe swing clear hinge sp-6
 residential spring hinges sp-7
 residential hinges sp-7
 decorative hinges - square barrel sp-8
 decorative hinges - olive knuckel sp-9
 concealed hinges sp-10 – sp-12
 cam lift hinges and pivot reinforcing hinges sp-13




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 4, 'Numerical Index
 Numerical Index
 451, 452, 453 SH-2 SQ3331 SP-8
 1001 SH-3 SQ314 SP-8
 1001 6x1/2 SH-4 Swing Clear Hinges T2895 SP-6
 1400, 1414, 1458 SP-7 T2314, T2714 FM-7
 1502, 1552 SH-1, SP7 TA314 FM-3
 8007 SH-5 TA386 FM-4
 BP-10, BP-11 HS-4 TA391 AH-1
 CC Option EH-4 TA392 AH-2
 CSS-9 RH-2 TA393 AH-3
 DLS-8 RH-4 TA394 AH-4
 DS-6 RH-3 TA714 FM-3
 EP-5J RH-1 TA786 FM-4
 H8007 SH-5 TA791 AH-1
 Hinge Pin Door Stop FM-7, FM-8, FM-16 TA792 AH-2
 HTA386 FM-5 TA794 AH-4
 HTA786 FM-5 TA795 FM-6
 Interim Hinge SP-5 TA2314 FM-8
 MG-16 EH-11 TA2371 FS-2
 MK1821A SP-10 TA2372 HS-1
 MK4001A SP-10 TA2395 FM-14
 MK80, MK80A, MK80SS SP-11 TA2398 FM-10
 MK100 SP-11 TA2714 FM-8
 MK100ME EH-8, SP-11 TA2731 FM-1
 MK150 SP-12 TA2771 FS-2
 MK200 SP-12 TA2772 HS-2
 MKCL134 SP-13 TA2774 HM-1
 MKCL180 SP-13 TA2798 FM-10
 MKCL250 SP-13 TA2895 SP-6, FM-14
 MKCL2500 SP-13 TA3331 FM-1
 5540 SP-13 TA3350 FM-2
 5545 SP-13 TA3383 SP-9
 8540 SP-13 TA3374 HM-1
 8545 SP-13 TA3750 FM-2
 MM Option EH-7 TA4895 FM-14, SP-6
 MP79, MPB79, MPB91 FM-16 TCA2314 FM-9
 MPB79, MPB91 QC or CC Option EH-3 TCA2714 FM-9
 MPB68, MPB99 FM-17 TCA3386 FM-12
 MPB68, MPB99 QC or CC Option EH-3 T4A3386 Wide Throw FM-13
 MPS60, MPS679 SH-2 TCA3786 FM-12
 PH-4 SP-2 T4A3381 FS-1
 PoE Option EH-5, EH-6 T4A3382 HS-2
 QC Option EH-1, EH-2 T4A3384 HM-2
 QC-R001 EH-10 T4A3386 FM-11
 QC-R002 EH-11 T4A3395 FM-15
 QC-R003 EH-10 T4A3781 FS-1
 RB-TA2314, RB-TA2714 SP-3 T4A3782 HS-2
 RB-T4A3386, RB-T4A3786 SP-3 T4A3784 HM-2
 RediFrame Swing Clear Hinge SP-6 T4A3786 FM-11
 Residential Hinges SP-6, SP-7 T4A3786 Wide Throw FM-13
 Slip-In Hinge SP-4 T4A3789 HM-3
 SP3386 SP-1 T4A3795 FM-15
 SP3786 SP-1 T4A3796 HS-3




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 4 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2031, 1, 'numerical index
 numerical index
 451, 452, 453 sh-2 sq3331 sp-8
 1001 sh-3 sq314 sp-8
 1001 6x1/2 sh-4 swing clear hinges t2895 sp-6
 1400, 1414, 1458 sp-7 t2314, t2714 fm-7
 1502, 1552 sh-1, sp7 ta314 fm-3
 8007 sh-5 ta386 fm-4
 bp-10, bp-11 hs-4 ta391 ah-1
 cc option eh-4 ta392 ah-2
 css-9 rh-2 ta393 ah-3
 dls-8 rh-4 ta394 ah-4
 ds-6 rh-3 ta714 fm-3
 ep-5j rh-1 ta786 fm-4
 h8007 sh-5 ta791 ah-1
 hinge pin door stop fm-7, fm-8, fm-16 ta792 ah-2
 hta386 fm-5 ta794 ah-4
 hta786 fm-5 ta795 fm-6
 interim hinge sp-5 ta2314 fm-8
 mg-16 eh-11 ta2371 fs-2
 mk1821a sp-10 ta2372 hs-1
 mk4001a sp-10 ta2395 fm-14
 mk80, mk80a, mk80ss sp-11 ta2398 fm-10
 mk100 sp-11 ta2714 fm-8
 mk100me eh-8, sp-11 ta2731 fm-1
 mk150 sp-12 ta2771 fs-2
 mk200 sp-12 ta2772 hs-2
 mkcl134 sp-13 ta2774 hm-1
 mkcl180 sp-13 ta2798 fm-10
 mkcl250 sp-13 ta2895 sp-6, fm-14
 mkcl2500 sp-13 ta3331 fm-1
 5540 sp-13 ta3350 fm-2
 5545 sp-13 ta3383 sp-9
 8540 sp-13 ta3374 hm-1
 8545 sp-13 ta3750 fm-2
 mm option eh-7 ta4895 fm-14, sp-6
 mp79, mpb79, mpb91 fm-16 tca2314 fm-9
 mpb79, mpb91 qc or cc option eh-3 tca2714 fm-9
 mpb68, mpb99 fm-17 tca3386 fm-12
 mpb68, mpb99 qc or cc option eh-3 t4a3386 wide throw fm-13
 mps60, mps679 sh-2 tca3786 fm-12
 ph-4 sp-2 t4a3381 fs-1
 poe option eh-5, eh-6 t4a3382 hs-2
 qc option eh-1, eh-2 t4a3384 hm-2
 qc-r001 eh-10 t4a3386 fm-11
 qc-r002 eh-11 t4a3395 fm-15
 qc-r003 eh-10 t4a3781 fs-1
 rb-ta2314, rb-ta2714 sp-3 t4a3782 hs-2
 rb-t4a3386, rb-t4a3786 sp-3 t4a3784 hm-2
 rediframe swing clear hinge sp-6 t4a3786 fm-11
 residential hinges sp-6, sp-7 t4a3786 wide throw fm-13
 slip-in hinge sp-4 t4a3789 hm-3
 sp3386 sp-1 t4a3795 fm-15
 sp3786 sp-1 t4a3796 hs-3




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 4 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 5, ' General Information
About the McKinney Line
McKinney is ASSA ABLOY’s line of high quality architectural hinges for
commercial use. McKinney joined the ASSA ABLOY family of products
in 1996. Under the ASSA ABLOY banner, we have greatly expanded the
research and development, and manufacturing capabilities of this product
line to have the most impact on improving custom hinge manufacturing.

Custom Manufacturing
A variety of materials and hinge types can be custom manufactured in the
Berlin, CT plant, including the ElectroLynx® hinges and Power over Ethernet
hinges. For more information on custom manufactured hinges, call McKinney.

Innovation
To support today’s need for electronic security applications, we have
developed a variety of electric hinges used in remote door monitoring and
access control systems, and received a patent on the Power over Ethernet
(PoE) hinge. In addition, by combining McKinney hinges with other ASSA ABLOY
Group products, we can offer StormPro tornado resistant solutions.

Decorative Hinges
The McKinney line of decorative architectural hinges comes with special
tips and finishes. Designed to suite with hardware from ASSA ABLOY Group
brands, these commercial decorative hinges open up a whole new world of
design options for your door openings. See the McKinney Architectural Hinge
Brochure for the complete offering.




 The Good Design Studio - your resource for beautiful doors, frames and hardware from
 ASSA ABLOY Group brands. Visit www.thegooddesignstudio.com to learn more.



 McKinney PoE Hinge,
 U.S. Patent No. 7,824,200
 Corbin Russwin 107 McKinney 2 knuckle hinge Rockwood
 and SARGENT ME lever with round end tips small door pull




LEED Certification Contribution
ASSA ABLOY can help to achieve prerequisites and accumulate points in several
categories and credit areas of LEED. For further information, please call
1 800 346 7707 or refer to our website www.assaabloydooraccessories.us.


 ASSA ABLOY is a member of the USGBC and CaGBC U.S.
 Green Building Council logo is a trademark owned by
 the U.S. Green Building Council and is used with permission.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 5
', 2468, 1, ' general information
about the mckinney line
mckinney is assa abloy’s line of high quality architectural hinges for
commercial use. mckinney joined the assa abloy family of products
in 1996. under the assa abloy banner, we have greatly expanded the
research and development, and manufacturing capabilities of this product
line to have the most impact on improving custom hinge manufacturing.

custom manufacturing
a variety of materials and hinge types can be custom manufactured in the
berlin, ct plant, including the electrolynx® hinges and power over ethernet
hinges. for more information on custom manufactured hinges, call mckinney.

innovation
to support today’s need for electronic security applications, we have
developed a variety of electric hinges used in remote door monitoring and
access control systems, and received a patent on the power over ethernet
(poe) hinge. in addition, by combining mckinney hinges with other assa abloy
group products, we can offer stormpro tornado resistant solutions.

decorative hinges
the mckinney line of decorative architectural hinges comes with special
tips and finishes. designed to suite with hardware from assa abloy group
brands, these commercial decorative hinges open up a whole new world of
design options for your door openings. see the mckinney architectural hinge
brochure for the complete offering.




 the good design studio - your resource for beautiful doors, frames and hardware from
 assa abloy group brands. visit www.thegooddesignstudio.com to learn more.



 mckinney poe hinge,
 u.s. patent no. 7,824,200
 corbin russwin 107 mckinney 2 knuckle hinge rockwood
 and sargent me lever with round end tips small door pull




leed certification contribution
assa abloy can help to achieve prerequisites and accumulate points in several
categories and credit areas of leed. for further information, please call
1 800 346 7707 or refer to our website www.assaabloydooraccessories.us.


 assa abloy is a member of the usgbc and cagbc u.s.
 green building council logo is a trademark owned by
 the u.s. green building council and is used with permission.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 5
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 6, 'General Information
 Sales & Support
 The McKinney product line is represented by the
 ASSA ABLOY Door Security Solutions team.
 Phone: 1-800-DSS-EZ4U (1-800-377-3948)
 Address: 110 Sargent Drive, New Haven, CT 06511
 Web site: www.assaabloydss.com
 Email:  Contact your local ASSA ABLOY Door Security Solutions
 Representative via e-mail by going to www.assaabloydss.com
 and clicking on “Sales Support”.
 Customer Service and Tech Support Representatives are available
 during regular business hours at 1-800-346-7707 or email
 customerservice.mckinney@assaabloy.com or
 techsupport.mckinney@assaabloy.com.
 Visit the Architectural Door Accessories website for the most up-to-date
 catalogs, promo sheets and templates: www.assaabloydooraccessories.us
 Order online from the Architectural Door Accessories WebShop:
 https://accessories.assaabloy.com/
 For WebShop assistance call 203-821-5763.
 Many popular McKinney products are stocked and ready to ship from
 warehouses in Ventura, CA and Berlin, CT. In addition, over 400 stock items
 are included in a 3-day QuickShip Program from the Berlin, CT plant. Details
 on the QuickShip program are available on the website.




 Terms & Conditions
 Complete shipment of the order must be accepted by Purchaser within normal lead times. The QUOTE number must be referenced
 on the order. The QUOTE is null and void if the Purchase Order does not include ALL product lines listed on the
 QUOTE or if the quantities for an item covered by the QUOTE deviate by 10% or more.
 Terms are 1% 15 Net 30. A charge of $50.00 will be made for itemization. A charge of $25.00 will be made when changes are
 requested on itemized jobs already processed. No invoice will be rendered for less than $50.00 net. On non-standard items
 a 5% over or under run constitutes a complete order.

 Freight Policy
 For freight policy terms & conditions please click here or see brand price book.

 Terms
 It is understood that a finance charge may be imposed which is the lesser or one and one-half percent (1 1⁄2) per month of
 the highest rate allowed by law on any amount which becomes past due and delinquent. Additionally, the Customer shall be
 responsible for all collection costs, court costs and reasonable attorney’s fees (where allowed by law) in connection with the
 recovery of any delinquent amount.

 Credit
 Acceptance of orders and deliveries thereof shall at all times be subject to our approval of credit.

 Shipments
 Once in the hands of the transportation company, the Purchaser assumes the risk of loss or damage in transit.
 All goods are F.O.B. shipping point via the most economical routing, with carrier chosen by us.

 Returned Goods
 No credit will be issued for returned goods unless such return is authorized. If such authorization is given by us, there will be a
 minimum handling charge of 45% or $50.00 which ever is greater, for stock items shipped within a 90 day period from the date
 of the request.

 Cancellations
 We are unable to accept cancellations or changes on non-stock and special ordered (s/o) items once processing begins.
 A charge will be assessed based on manufacturing expense incurred.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 6 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 3521, 1, 'general information
 sales & support
 the mckinney product line is represented by the
 assa abloy door security solutions team.
 phone: 1-800-dss-ez4u (1-800-377-3948)
 address: 110 sargent drive, new haven, ct 06511
 web site: www.assaabloydss.com
 email:  contact your local assa abloy door security solutions
 representative via e-mail by going to www.assaabloydss.com
 and clicking on “sales support”.
 customer service and tech support representatives are available
 during regular business hours at 1-800-346-7707 or email
 customerservice.mckinney@assaabloy.com or
 techsupport.mckinney@assaabloy.com.
 visit the architectural door accessories website for the most up-to-date
 catalogs, promo sheets and templates: www.assaabloydooraccessories.us
 order online from the architectural door accessories webshop:
 https://accessories.assaabloy.com/
 for webshop assistance call 203-821-5763.
 many popular mckinney products are stocked and ready to ship from
 warehouses in ventura, ca and berlin, ct. in addition, over 400 stock items
 are included in a 3-day quickship program from the berlin, ct plant. details
 on the quickship program are available on the website.




 terms & conditions
 complete shipment of the order must be accepted by purchaser within normal lead times. the quote number must be referenced
 on the order. the quote is null and void if the purchase order does not include all product lines listed on the
 quote or if the quantities for an item covered by the quote deviate by 10% or more.
 terms are 1% 15 net 30. a charge of $50.00 will be made for itemization. a charge of $25.00 will be made when changes are
 requested on itemized jobs already processed. no invoice will be rendered for less than $50.00 net. on non-standard items
 a 5% over or under run constitutes a complete order.

 freight policy
 for freight policy terms & conditions please click here or see brand price book.

 terms
 it is understood that a finance charge may be imposed which is the lesser or one and one-half percent (1 1⁄2) per month of
 the highest rate allowed by law on any amount which becomes past due and delinquent. additionally, the customer shall be
 responsible for all collection costs, court costs and reasonable attorney’s fees (where allowed by law) in connection with the
 recovery of any delinquent amount.

 credit
 acceptance of orders and deliveries thereof shall at all times be subject to our approval of credit.

 shipments
 once in the hands of the transportation company, the purchaser assumes the risk of loss or damage in transit.
 all goods are f.o.b. shipping point via the most economical routing, with carrier chosen by us.

 returned goods
 no credit will be issued for returned goods unless such return is authorized. if such authorization is given by us, there will be a
 minimum handling charge of 45% or $50.00 which ever is greater, for stock items shipped within a 90 day period from the date
 of the request.

 cancellations
 we are unable to accept cancellations or changes on non-stock and special ordered (s/o) items once processing begins.
 a charge will be assessed based on manufacturing expense incurred.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 6 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 7, ' Warranty And Hinge Types
Product Warranty
Our products are guaranteed to be free of defects in both workmanship and materials for a period of one year. Any bending,
defacing or modification of our product after leaving the factory will void the warranty. Liability shall be limited to the replacement
of product or component determined to be defective and shall not include costs arising from removal or reinstallation of product.
Cost of replacement shall not exceed original purchase price.
Written notice of damages must occur within the warranty period. A factory generated Return Goods Authorization will be
provided as no goods will be accepted without prior approval. These defective goods must be returned to our factory in Berlin,
CT, unless specified otherwise. Freight charges must be pre-paid unless noted otherwise.
This guarantee is only valid if the products are specified, applied and adjusted in accordance with the instructions contained in
the General Information Section of the McKinney product catalog and on frames and doors that are plumb and square.



Bulk Packed Hinges
We offer bulk packaging on most popular hinges. Hinges arrive ready-to-install with no interior packaging and screws in
bulk, which reduces the amount of material to discard. This also saves time, especially on larger installations, as individual boxes
do not need to be opened. The packaging is reinforced and holds 48 hinges. In addition, the box is strapped to ensure it arrives
intact at its destination.
The program is offered on the hinges listed below in 26D, with other finishes available upon request.
Orders are shipped quickly in 3 days or less.

 Bulk Pack
 No. Size Finish Material Weight
 Quantity
 T2714 4-1/2" x 4-1/2" 26D Steel STD 48

 TA2714 4-1/2" x 4-1/2" 26D Steel STD 48

 TA2714 NRP 4-1/2" x 4-1/2" 26D Steel STD 48

 MacPro®:
 MP79 4-1/2" x 4-1/2" 26D Steel STD 48

 MPB79 4-1/2" x 4-1/2" 26D Steel STD 48

 MPB79 NRP 4-1/2" x 4-1/2" 26D Steel STD 48

TO ORDER: Add the suffix BP to the part number, for example TA2714 BP 4-1/2 x 4-1/2 26D



Hinge Types
Our broad range of full mortise hinges come in a variety of metals, finishes, sizes, and weights to meet all your load bearing and
security applications. They include two, three, and five knuckle styles, swing clear hinges, wide throw hinges, anchor hinges,
electric hinges, institutional hinges, and pivots.
ASSA ABLOY hinges conform to Government standards CS9-65 and SDI as well as the following standards approved by the
Builders hardware Manufacturers/American National Standards Institute:

ANSI/BHMA Standard 156.1 - ANSI/BHMA Standard 156.17 -
The American National Standard for Butts and Hinges The American National Standard for Self-Closing
 Hinges & Pivots
ANSI/BHMA Standard 156.7 -
The American National Standard for Template Hinge ANSI/BHMA Standard 1156.18 -
Dimensions The American National Standard for Material and Finishes




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 7
', 3272, 1, ' warranty and hinge types
product warranty
our products are guaranteed to be free of defects in both workmanship and materials for a period of one year. any bending,
defacing or modification of our product after leaving the factory will void the warranty. liability shall be limited to the replacement
of product or component determined to be defective and shall not include costs arising from removal or reinstallation of product.
cost of replacement shall not exceed original purchase price.
written notice of damages must occur within the warranty period. a factory generated return goods authorization will be
provided as no goods will be accepted without prior approval. these defective goods must be returned to our factory in berlin,
ct, unless specified otherwise. freight charges must be pre-paid unless noted otherwise.
this guarantee is only valid if the products are specified, applied and adjusted in accordance with the instructions contained in
the general information section of the mckinney product catalog and on frames and doors that are plumb and square.



bulk packed hinges
we offer bulk packaging on most popular hinges. hinges arrive ready-to-install with no interior packaging and screws in
bulk, which reduces the amount of material to discard. this also saves time, especially on larger installations, as individual boxes
do not need to be opened. the packaging is reinforced and holds 48 hinges. in addition, the box is strapped to ensure it arrives
intact at its destination.
the program is offered on the hinges listed below in 26d, with other finishes available upon request.
orders are shipped quickly in 3 days or less.

 bulk pack
 no. size finish material weight
 quantity
 t2714 4-1/2" x 4-1/2" 26d steel std 48

 ta2714 4-1/2" x 4-1/2" 26d steel std 48

 ta2714 nrp 4-1/2" x 4-1/2" 26d steel std 48

 macpro®:
 mp79 4-1/2" x 4-1/2" 26d steel std 48

 mpb79 4-1/2" x 4-1/2" 26d steel std 48

 mpb79 nrp 4-1/2" x 4-1/2" 26d steel std 48

to order: add the suffix bp to the part number, for example ta2714 bp 4-1/2 x 4-1/2 26d



hinge types
our broad range of full mortise hinges come in a variety of metals, finishes, sizes, and weights to meet all your load bearing and
security applications. they include two, three, and five knuckle styles, swing clear hinges, wide throw hinges, anchor hinges,
electric hinges, institutional hinges, and pivots.
assa abloy hinges conform to government standards cs9-65 and sdi as well as the following standards approved by the
builders hardware manufacturers/american national standards institute:

ansi/bhma standard 156.1 - ansi/bhma standard 156.17 -
the american national standard for butts and hinges the american national standard for self-closing
 hinges & pivots
ansi/bhma standard 156.7 -
the american national standard for template hinge ansi/bhma standard 1156.18 -
dimensions the american national standard for material and finishes




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 7
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 8, 'Hinge Types
 Full Mortise Hinges Full Surface Hinges
 Our broad range of full mortise hinges come in a variety of Choose from regular and swing clear models for heavy weight
 metals, finishes, sizes, and weights to meet all your load bearing or standard weight bearing applications in a choice of
 bearing and security applications. They include two, three, five knuckle styles are available.
 and five knuckle styles, swing clear hinges, wide throw hinges,
 anchor hinges, electric hinges, institutional hinges,
 and pivots.



 Half Mortise Hinges Half Surface Hinges
 Available in a choice of metals, gauges, and sizes for a wide Heavy weight bearing, standard weight bearing, and plain
 range of door thicknesses. You may specify plain bearing, bearing hinges are available. Regular and swing clear
 standard weight bearing, or heavy weight bearing models. applications. Five knuckle styles are available.
 Regular and swing clear applications. Five knuckle styles are
 available.



 Security Hinges Spring & Specialty Hinges
 Our assortment of electrical security hinges are suitable for Included are full mortise single acting hinges. In addition, we
 a wide variety of control functions. Included are full mortise produce a variety of hinges for special applications including
 bearing hinges with either concealed circuitry or concealed anchor hinges, wide throw hinges, swing clear hinges, and
 switch. In addition, a unique, field-replaceable magnet pocket hinges.
 monitoring hinge, featuring a magnetic reed concealed switch,
 is available. We also produce full mortise institutional hinges for
 maximum security installations.




 Electric Hinges Miscellaneous
 To meet today’s need for greater security applications, ASSA ABLOY provides a standard duty center hung jamb
 ASSA ABLOY developed a variety of electric hinges used in mount pivot set as well as emergency door stops and strikes.
 remote door monitoring and access control systems. These
 The most up to date templates are available on the
 ElectroLynx® Hinges use convenient Molex connectors to make
 website at www.assaabloydooraccessories.us.
 installation quick and simple.
 Traditional wired connection electric hinges are available with
 28 gauge and 18 gauge wires.
 Also available are Magnetic Monitoring Hinges and electrified
 MK100ME Concealed Hinges.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 8 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2695, 1, 'hinge types
 full mortise hinges full surface hinges
 our broad range of full mortise hinges come in a variety of choose from regular and swing clear models for heavy weight
 metals, finishes, sizes, and weights to meet all your load bearing or standard weight bearing applications in a choice of
 bearing and security applications. they include two, three, five knuckle styles are available.
 and five knuckle styles, swing clear hinges, wide throw hinges,
 anchor hinges, electric hinges, institutional hinges,
 and pivots.



 half mortise hinges half surface hinges
 available in a choice of metals, gauges, and sizes for a wide heavy weight bearing, standard weight bearing, and plain
 range of door thicknesses. you may specify plain bearing, bearing hinges are available. regular and swing clear
 standard weight bearing, or heavy weight bearing models. applications. five knuckle styles are available.
 regular and swing clear applications. five knuckle styles are
 available.



 security hinges spring & specialty hinges
 our assortment of electrical security hinges are suitable for included are full mortise single acting hinges. in addition, we
 a wide variety of control functions. included are full mortise produce a variety of hinges for special applications including
 bearing hinges with either concealed circuitry or concealed anchor hinges, wide throw hinges, swing clear hinges, and
 switch. in addition, a unique, field-replaceable magnet pocket hinges.
 monitoring hinge, featuring a magnetic reed concealed switch,
 is available. we also produce full mortise institutional hinges for
 maximum security installations.




 electric hinges miscellaneous
 to meet today’s need for greater security applications, assa abloy provides a standard duty center hung jamb
 assa abloy developed a variety of electric hinges used in mount pivot set as well as emergency door stops and strikes.
 remote door monitoring and access control systems. these
 the most up to date templates are available on the
 electrolynx® hinges use convenient molex connectors to make
 website at www.assaabloydooraccessories.us.
 installation quick and simple.
 traditional wired connection electric hinges are available with
 28 gauge and 18 gauge wires.
 also available are magnetic monitoring hinges and electrified
 mk100me concealed hinges.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 8 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 9, ' Bearings
Hinge Bearings
We offer a number of bearing choices. Door weight, height, width, thickness and
frequency of operation are all factors in determining the proper hinge.



Oil Impregnated Bearing (TA)
One piece, non-ferrous, and self-lubricating bearings ensure
even longer-lasting wear and resistance to clogging, corrosion,
and hinge failure. This feature is standard and supplied on all
five knuckle bearing hinges up to 5" height. All 6" or larger are
Ball Bearing hinges.




Ball Bearing (TB)
Ball bearings are available as an option on all five knuckle
bearing hinges up to 5". All 6" hinges or larger are ball bearing
as a standard.




Concealed Bearing (TCA)
Concealed, anti-friction type bearings are available on all five
knuckle bearing hinges, which provide long-lasting wear and
consistency of hinge barrel design.
Note: All three and two knuckle bearing hinges are provided with
concealed, anti-friction type bearings (designated TA).




Plain Bearing
This is the designation for non-bearing hinges. Knuckles are
machined with bearing-like surfaces to move against one
another. These are not recommended for high frequency doors
or doors with closing devices. These hinges are not approved
for use in labeled openings.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 9
', 1596, 1, ' bearings
hinge bearings
we offer a number of bearing choices. door weight, height, width, thickness and
frequency of operation are all factors in determining the proper hinge.



oil impregnated bearing (ta)
one piece, non-ferrous, and self-lubricating bearings ensure
even longer-lasting wear and resistance to clogging, corrosion,
and hinge failure. this feature is standard and supplied on all
five knuckle bearing hinges up to 5" height. all 6" or larger are
ball bearing hinges.




ball bearing (tb)
ball bearings are available as an option on all five knuckle
bearing hinges up to 5". all 6" hinges or larger are ball bearing
as a standard.




concealed bearing (tca)
concealed, anti-friction type bearings are available on all five
knuckle bearing hinges, which provide long-lasting wear and
consistency of hinge barrel design.
note: all three and two knuckle bearing hinges are provided with
concealed, anti-friction type bearings (designated ta).




plain bearing
this is the designation for non-bearing hinges. knuckles are
machined with bearing-like surfaces to move against one
another. these are not recommended for high frequency doors
or doors with closing devices. these hinges are not approved
for use in labeled openings.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 9
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 10, 'Knuckle Features
 Hinge Knuckles
 Our line includes two, three and five knuckle hinges.

 Modern Two Knuckle
 This model offers the most security in a standard hinge. By design, pins are non-rising, non-removable and tamper
 The bearing hinges have a concealed stainless steel protected by a flush, non-removable cap at the end of the
 oil-impregnated bearing. Also, an anti-friction bushing in barrel. A door cannot be removed when in the closed position,
 the door leaf provides additional protection against vertical thus affording maximum security. Intermediate hinges can be
 and lateral wear. ordered opposite hand and installed upside down, to inhibit
 removal of the door in an open position.
 • The Moderne two knuckle hinge is available in
 stainless steel • Available non-removable door (NRD) hinges have a dowel
 in the barrel. One NRD hinge can be ordered per set
 • Standard and heavy weight
 • Two knuckle hinges are handed
 • Pins in all bearing hinges are stainless steel
 • Template hinges are made to conform to U.S.
 • Standard hinges are packed with all machine and all
 Government standards*
 wood screws




 Three Knuckle Five Knuckle
 Bearing hinges have concealed vertical and lateral thrust twin Bearing hinges are furnished with either an oil-impregnated
 anti-friction type bearings at both joints. bearing (TA)** or ball bearing (TB). (TA is standard unless
 TB is specified.) Concealed bearings (TCA) are available.
 • Pins in all non-ferrous bearing hinges are
 stainless steel • Pin stems in all non-ferrous bearing hinges are
 stainless steel
 • Pins in all ferrous hinges are steel
 • Pins in all ferrous hinges are steel
 • Pins in all hinges are non-rising type
 • Pins in all hinges are non-rising type
 • Standard hinges are packed with all machine and all
 wood screws • Template hinges are made to conform to U.S. Government
 standards*
 • Hinges are reversible for right or left hand except anchor
 hinges and certain electric hinges **Refer to our website at www.assaabloydooraccessories.us for additional
 information regarding ASSA ABLOY bearings.
 • Template hinges are made to conform to U.S.
 Government standards*

 *Template hinges are made in sizes, gauges, and with screw holes located to conform to ANSI/BHMA A156.7 and U.S. Government standards CS9-65 and
 SDI. Templates are available on request.




 PSF - Prison Safety Feature SSF - Safety Stud Feature
 A 7/16" diameter stud projects from the A stud attached to the face of one leaf
 back of each leaf which slips into a hole rotates into a cavity in the opposite leaf
 in the hinge reinforcing plates in both when the door is closed. This option
 the door and the frame. This prevents interlocks the two leaves together,
 the hinge from being removed even if preventing the removal of the door
 the screws have been sheared off. This even if the pin is removed.
 option is available on the HTA786 steel Available on Five Knuckle Hinges
 and HTA386 stainless prison hinge only.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 10 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 3356, 1, 'knuckle features
 hinge knuckles
 our line includes two, three and five knuckle hinges.

 modern two knuckle
 this model offers the most security in a standard hinge. by design, pins are non-rising, non-removable and tamper
 the bearing hinges have a concealed stainless steel protected by a flush, non-removable cap at the end of the
 oil-impregnated bearing. also, an anti-friction bushing in barrel. a door cannot be removed when in the closed position,
 the door leaf provides additional protection against vertical thus affording maximum security. intermediate hinges can be
 and lateral wear. ordered opposite hand and installed upside down, to inhibit
 removal of the door in an open position.
 • the moderne two knuckle hinge is available in
 stainless steel • available non-removable door (nrd) hinges have a dowel
 in the barrel. one nrd hinge can be ordered per set
 • standard and heavy weight
 • two knuckle hinges are handed
 • pins in all bearing hinges are stainless steel
 • template hinges are made to conform to u.s.
 • standard hinges are packed with all machine and all
 government standards*
 wood screws




 three knuckle five knuckle
 bearing hinges have concealed vertical and lateral thrust twin bearing hinges are furnished with either an oil-impregnated
 anti-friction type bearings at both joints. bearing (ta)** or ball bearing (tb). (ta is standard unless
 tb is specified.) concealed bearings (tca) are available.
 • pins in all non-ferrous bearing hinges are
 stainless steel • pin stems in all non-ferrous bearing hinges are
 stainless steel
 • pins in all ferrous hinges are steel
 • pins in all ferrous hinges are steel
 • pins in all hinges are non-rising type
 • pins in all hinges are non-rising type
 • standard hinges are packed with all machine and all
 wood screws • template hinges are made to conform to u.s. government
 standards*
 • hinges are reversible for right or left hand except anchor
 hinges and certain electric hinges **refer to our website at www.assaabloydooraccessories.us for additional
 information regarding assa abloy bearings.
 • template hinges are made to conform to u.s.
 government standards*

 *template hinges are made in sizes, gauges, and with screw holes located to conform to ansi/bhma a156.7 and u.s. government standards cs9-65 and
 sdi. templates are available on request.




 psf - prison safety feature ssf - safety stud feature
 a 7/16" diameter stud projects from the a stud attached to the face of one leaf
 back of each leaf which slips into a hole rotates into a cavity in the opposite leaf
 in the hinge reinforcing plates in both when the door is closed. this option
 the door and the frame. this prevents interlocks the two leaves together,
 the hinge from being removed even if preventing the removal of the door
 the screws have been sheared off. this even if the pin is removed.
 option is available on the hta786 steel available on five knuckle hinges
 and hta386 stainless prison hinge only.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 10 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 11, ' Hinge Tips
Hinge Tips
Select tips for additional functionality or to add to the decor.


Button Tips (Standard)
Button Tips and plugs are standard on five knuckle hinges.




Flush Pins (Standard)
Flush pins and plugs are furnished on our two and three knuckle hinges.




Hospital Tips
Hospital tips which feature a one-piece non-removable pin with tapered
tips. To order this option prefix our hinge number by “HT”. The hospital
tip feature by design makes the pin virtually non-removable.




Decorative Tips
Decorative tips enhance the design of your interior. Available for the
two or three knuckle hinge in flat, round, grooved or lined tip styles.
 FT RT
These hinges are designed to suite with doors and hardware from
the ASSA ABLOY Group brands.



 GT LT KT


Ball Tips
Ball Tips, made of solid brass, are available on five knuckle hinges
for a more decorative hinge appearance. To order this option add
the suffix “BT” to the hinge number.




Steeple Tips
Steeple Tips, made of solid brass, are available on five knuckle
hinges for a more decorative hinge appearance. To order this hinge
option, add the suffix “ST” to the hinge number.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 11
', 1503, 1, ' hinge tips
hinge tips
select tips for additional functionality or to add to the decor.


button tips (standard)
button tips and plugs are standard on five knuckle hinges.




flush pins (standard)
flush pins and plugs are furnished on our two and three knuckle hinges.




hospital tips
hospital tips which feature a one-piece non-removable pin with tapered
tips. to order this option prefix our hinge number by “ht”. the hospital
tip feature by design makes the pin virtually non-removable.




decorative tips
decorative tips enhance the design of your interior. available for the
two or three knuckle hinge in flat, round, grooved or lined tip styles.
 ft rt
these hinges are designed to suite with doors and hardware from
the assa abloy group brands.



 gt lt kt


ball tips
ball tips, made of solid brass, are available on five knuckle hinges
for a more decorative hinge appearance. to order this option add
the suffix “bt” to the hinge number.




steeple tips
steeple tips, made of solid brass, are available on five knuckle
hinges for a more decorative hinge appearance. to order this hinge
option, add the suffix “st” to the hinge number.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 11
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 12, 'Hinge Pins
 Hinge Pins
 Pins, by design, are non-rising.



 Two Knuckle
 Pins on bearing hinges are furnished in stainless steel.




 Three Knuckle
 Pin stems in all non-ferrous bearing hinges are stainless steel.
 Pins in all ferrous hinges are steel.




 Five Knuckle
 Pins on all non-ferrous bearing hinges are stainless steel
 with button tips.
 Pins on all ferrous hinges are steel.




 Non-Removable Pins

 NRP NRD
 A set screw is driven into the barrel of the hinge that is Two knuckle hinges are available with a non-removable pin
 inaccessible when the door is in the closed position. To order, which features a dowel which is force fitted into the jamb
 add the suffix “NRP” to the hinge number. leaf. When the door is hung, the pin is completely concealed
 and impossible to remove. One doweled hinge is usually
 furnished per set of three. To order, add the suffix “NRD” to
 the hinge number.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 12 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1266, 1, 'hinge pins
 hinge pins
 pins, by design, are non-rising.



 two knuckle
 pins on bearing hinges are furnished in stainless steel.




 three knuckle
 pin stems in all non-ferrous bearing hinges are stainless steel.
 pins in all ferrous hinges are steel.




 five knuckle
 pins on all non-ferrous bearing hinges are stainless steel
 with button tips.
 pins on all ferrous hinges are steel.




 non-removable pins

 nrp nrd
 a set screw is driven into the barrel of the hinge that is two knuckle hinges are available with a non-removable pin
 inaccessible when the door is in the closed position. to order, which features a dowel which is force fitted into the jamb
 add the suffix “nrp” to the hinge number. leaf. when the door is hung, the pin is completely concealed
 and impossible to remove. one doweled hinge is usually
 furnished per set of three. to order, add the suffix “nrd” to
 the hinge number.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 12 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 13, ' Applications
Options
Round Corner Option RCT2714
Furnished as 4" radius unless specified otherwise.
 1/


 32 " or /8 " may be specified on full mortise hinges.
5/ 5


Specify option “RC”.




Applications
This section will seek to address different variations be on the type of hinge to use within a given door/frame/wall
of door, frame and wall conditions which you might condition. The following examples are not intended to cover
encounter in hanging the door and the product solutions every possible situation in which a particular type hinge might
offered in the McKinney line. be used, but only a representative sampling. Consult the factory
 for any unusual installation requirements not shown here.
Included are some of the more common conditions and
some of the not-so-common conditions. The focus here will




Common Applications
Full Mortise Hinge TA2714
 Application
The most common application is a flush door/frame/wall
condition using a hollow metal frame with a standard hollow
metal or wood door which is flush or 1/16" inset from the face
of the frame, with a wall which is either flush (or inset from
the face of the frame. Recommended to hang door for 180˚
swing: Full Mortise Hinge. The same hinge could be used
with a wood or aluminum frame provided the door/frame/
wall conditions are flush.
Note: A fire labeled wood door requires sufficient hinge reinforcement
to use this type hinge.




Less Common Flush Door/Frame/Wall Application
Half Mortise Hinge TA2774
 Application
A hollow metal or wood door with channel iron frame.
Recommended to hang door for 180˚ swing:
Half Mortise Hinge.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 13
', 1969, 1, ' applications
options
round corner option rct2714
furnished as 4" radius unless specified otherwise.
 1/


 32 " or /8 " may be specified on full mortise hinges.
5/ 5


specify option “rc”.




applications
this section will seek to address different variations be on the type of hinge to use within a given door/frame/wall
of door, frame and wall conditions which you might condition. the following examples are not intended to cover
encounter in hanging the door and the product solutions every possible situation in which a particular type hinge might
offered in the mckinney line. be used, but only a representative sampling. consult the factory
 for any unusual installation requirements not shown here.
included are some of the more common conditions and
some of the not-so-common conditions. the focus here will




common applications
full mortise hinge ta2714
 application
the most common application is a flush door/frame/wall
condition using a hollow metal frame with a standard hollow
metal or wood door which is flush or 1/16" inset from the face
of the frame, with a wall which is either flush (or inset from
the face of the frame. recommended to hang door for 180˚
swing: full mortise hinge. the same hinge could be used
with a wood or aluminum frame provided the door/frame/
wall conditions are flush.
note: a fire labeled wood door requires sufficient hinge reinforcement
to use this type hinge.




less common flush door/frame/wall application
half mortise hinge ta2774
 application
a hollow metal or wood door with channel iron frame.
recommended to hang door for 180˚ swing:
half mortise hinge.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 13
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 14, 'Applications
 Less Common Flush Door/Frame/Wall Application
 TA2771 Full Surface Hinge
 Application
 A fire labeled wood door (without sufficient hinge
 reinforcement) or a kalamein (metal-clad wood door) with
 channel iron frame. Recommended to hang door for 80˚
 swing: Full Surface Hinge. On fire labeled wood doors, the
 door leaf is hung using a back plate with grommet nuts and
 bolts. Another popular application for this type hinge is a
 tubular steel gate hung on a channel iron frame.




 TA2772 Half Surface Hinge
 Application
 A fire labeled wood door (without sufficient hinge
 reinforcement) or a kalamein (metal-clad wood door) with
 channel iron frame. Recommended to hang door for 180˚
 swing: Half Surface Hinge. On fire labeled wood doors, the
 door leaf is hung using a back plate with grommet nuts
 and bolts.




 Special Applications
 TA792 Anchor Hinge
 Application
 On high frequency and/or heavy wood or metal doors,
 additional anchoring of the hinges into the door and jamb
 may be necessary. This is a common application in schools,
 hospitals or any other buildings where heavy traffic and
 unusual strain on the doors, jamb and hinges is experienced.
 Recommended to hang door for 80˚ swing: Full Mortise
 Anchor Hinge. Sold in sets of one full mortise anchor hinge
 and two heavy weight full mortise hinges.
 Note: Anchor hinges are handed and sold for either square edge doors on
 hinge side or beveled (1/8" in 2") edge doors on hinge side. Hand and bevel
 (McKinney hinges use uses a "5" in front of the item number to indicate 1/8"
 in 2" bevel. Example: TA5792 should be specified.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 14 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1977, 1, 'applications
 less common flush door/frame/wall application
 ta2771 full surface hinge
 application
 a fire labeled wood door (without sufficient hinge
 reinforcement) or a kalamein (metal-clad wood door) with
 channel iron frame. recommended to hang door for 80˚
 swing: full surface hinge. on fire labeled wood doors, the
 door leaf is hung using a back plate with grommet nuts and
 bolts. another popular application for this type hinge is a
 tubular steel gate hung on a channel iron frame.




 ta2772 half surface hinge
 application
 a fire labeled wood door (without sufficient hinge
 reinforcement) or a kalamein (metal-clad wood door) with
 channel iron frame. recommended to hang door for 180˚
 swing: half surface hinge. on fire labeled wood doors, the
 door leaf is hung using a back plate with grommet nuts
 and bolts.




 special applications
 ta792 anchor hinge
 application
 on high frequency and/or heavy wood or metal doors,
 additional anchoring of the hinges into the door and jamb
 may be necessary. this is a common application in schools,
 hospitals or any other buildings where heavy traffic and
 unusual strain on the doors, jamb and hinges is experienced.
 recommended to hang door for 80˚ swing: full mortise
 anchor hinge. sold in sets of one full mortise anchor hinge
 and two heavy weight full mortise hinges.
 note: anchor hinges are handed and sold for either square edge doors on
 hinge side or beveled (1/8" in 2") edge doors on hinge side. hand and bevel
 (mckinney hinges use uses a "5" in front of the item number to indicate 1/8"
 in 2" bevel. example: ta5792 should be specified.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 14 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 15, ' Applications
Special Applications
Spring Hinge 1502
Some door/frame/wall and even ceiling conditions make door (Full Mortise Type)
closers impractical. An alternative closing device is the Spring
Hinge. Generally, at least two hinges on a door must be spring
hinges to provide adequate closing force.
Note: NFPA requires a minimum of two (2) spring hinges on fire labeled
doors. With adjustable spring tension on the hinge, the closing speed of the
door is determined by the amount of closing force set on the hinge. Spring
hinges may not be suitable for applications requiring a closing device with
non-critical closing and latching speed adjustments. With respect to meeting
ADA requirements for closing devices, carpeting and/or gasketing can
interfere with latching.




Swing Clear Hinge TA2895
 Application
A condition which is common in barrier free openings, and
especially in hospitals, is how to remove the door edge
from the opening at 90˚ of swing with flush door/wall/ frame
conditions. The solution offered by this hinge is the offset of
the hinge barrel to a location along the face of the hinge jamb,
thereby removing the door edge and the barrel of the hinge as
obstacles in the opening at 90˚ or more of swing. If the door
is beveled on the hinge side, specify the appropriate beveled
hinge and handing for your application*.
*Consult individual Swing Clear catalog pages for beveled hinge
 product numbers.
Electric versions available- QC, CC, CC-18


 Meets or exceeds
 ANSI A117.1 - 1986
 Providing Accessibility
 and Usability for Physically
 Handicapped People




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 15
', 1938, 1, ' applications
special applications
spring hinge 1502
some door/frame/wall and even ceiling conditions make door (full mortise type)
closers impractical. an alternative closing device is the spring
hinge. generally, at least two hinges on a door must be spring
hinges to provide adequate closing force.
note: nfpa requires a minimum of two (2) spring hinges on fire labeled
doors. with adjustable spring tension on the hinge, the closing speed of the
door is determined by the amount of closing force set on the hinge. spring
hinges may not be suitable for applications requiring a closing device with
non-critical closing and latching speed adjustments. with respect to meeting
ada requirements for closing devices, carpeting and/or gasketing can
interfere with latching.




swing clear hinge ta2895
 application
a condition which is common in barrier free openings, and
especially in hospitals, is how to remove the door edge
from the opening at 90˚ of swing with flush door/wall/ frame
conditions. the solution offered by this hinge is the offset of
the hinge barrel to a location along the face of the hinge jamb,
thereby removing the door edge and the barrel of the hinge as
obstacles in the opening at 90˚ or more of swing. if the door
is beveled on the hinge side, specify the appropriate beveled
hinge and handing for your application*.
*consult individual swing clear catalog pages for beveled hinge
 product numbers.
electric versions available- qc, cc, cc-18


 meets or exceeds
 ansi a117.1 - 1986
 providing accessibility
 and usability for physically
 handicapped people




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 15
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 16, 'Applications
 Non-Flush Door/Wall/Frame Applications
 TA2798 Wide Throw Hinge
 Application
 If the door is not flush with the frame, is sitting back in a deep
 reveal from the face of the frame with or without additional
 obstacles created by applied trim on the face of the frame or a
 deeper reveal caused by a projecting wall, and the door is to
 swing 180˚, then a Full Mortise Wide Throw Hinge may be
 used in hanging the door.
 Important in this regard is how to calculate the proper width of
 a wide throw hinge (rounded to the next higher whole number if
 result is not a whole number: e.g., 6", 7", 8", etc.)



 How to Calculate the Proper Wide Throw Hinge Width
 1. If the door is sitting inside a deep frame reveal with no other obstacles (i.e., projecting
 trim or wall), add the depth of the reveal (distance from the face of the frame to the
 face of the door) to the recommended width of hinge used under flush conditions.
 Example: A 6" wide (wide throw) hinge would replace a 41/2" wide regular mortise
 hinge (used under flush conditions) if the depth of the reveal is 11/2".


 2. If the door is to clear projecting trim or wall and the barrel of the hinge is not obstructed, then
 calculate as follows:
 (a) double the size of the door
 (b) subtract 1/2" if the door thickness is less than or equal to 21/4" or subtract 3/4" if the door
 thickness is greater than 21/4"
 (c) add for the additional depth from the face of the obstruction to the face of the door
 (d) add for clearance between the door and the face of the obstruction at 180˚ of swing
 (generally 1" or more).


 If, for instance, you have a 13/4" thick door:
 (a) 13/4" door thickness x 2 = 31/2"
 (b) less 1/2" equals 3"
 (c) plus 3" for the additional depth from the face
 of the wall to the face of the door equals 6"
 (d) plus 1" for the clearance between the door
 and the face of the obstruction at 180˚ of
 swing equals 7" overall hinge width.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 16 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2302, 1, 'applications
 non-flush door/wall/frame applications
 ta2798 wide throw hinge
 application
 if the door is not flush with the frame, is sitting back in a deep
 reveal from the face of the frame with or without additional
 obstacles created by applied trim on the face of the frame or a
 deeper reveal caused by a projecting wall, and the door is to
 swing 180˚, then a full mortise wide throw hinge may be
 used in hanging the door.
 important in this regard is how to calculate the proper width of
 a wide throw hinge (rounded to the next higher whole number if
 result is not a whole number: e.g., 6", 7", 8", etc.)



 how to calculate the proper wide throw hinge width
 1. if the door is sitting inside a deep frame reveal with no other obstacles (i.e., projecting
 trim or wall), add the depth of the reveal (distance from the face of the frame to the
 face of the door) to the recommended width of hinge used under flush conditions.
 example: a 6" wide (wide throw) hinge would replace a 41/2" wide regular mortise
 hinge (used under flush conditions) if the depth of the reveal is 11/2".


 2. if the door is to clear projecting trim or wall and the barrel of the hinge is not obstructed, then
 calculate as follows:
 (a) double the size of the door
 (b) subtract 1/2" if the door thickness is less than or equal to 21/4" or subtract 3/4" if the door
 thickness is greater than 21/4"
 (c) add for the additional depth from the face of the obstruction to the face of the door
 (d) add for clearance between the door and the face of the obstruction at 180˚ of swing
 (generally 1" or more).


 if, for instance, you have a 13/4" thick door:
 (a) 13/4" door thickness x 2 = 31/2"
 (b) less 1/2" equals 3"
 (c) plus 3" for the additional depth from the face
 of the wall to the face of the door equals 6"
 (d) plus 1" for the clearance between the door
 and the face of the obstruction at 180˚ of
 swing equals 7" overall hinge width.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 16 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 17, ' Hinge Selection
Raised Barrel Hinge
If the door is not flush with the frame but rather is sitting back
 Raised Barrel Raised Barrel
in a deep reveal from the face of the frame a Full Mortise
 Square Edge Door Beveled Edge Door
Raised Barrel Hinge may be used in hanging the door.
The solution offered by this hinge is the offset of the hinge
barrel away from the hinge jamb. Bevel of door edge should be
specified.
Raised Barrel Hinges (RB Prefix) are only available on
5-Knuckle 41/2" x 41/2" Standard and Heavy Weight and 5" x
41/2" Heavy Weight only. The hinges have NRP and are reversible
for handing.




Pocket Hinge
An increasingly popular door, frame and wall condition in
 PH-4 Application

corridors is cross-corridor or double egress pairs of doors
standing in wall pockets at 90˚ of swing, so as to be clear of
the initial opening and out of the corridor altogether.
Solution: Pocket Hinge.
As corridor doors are often fire labeled, the hardware must
be approved for use in fire labeled openings. Solution: the
McKinney PH-4 Pocket Hinge. UL approved for use on both
hollow metal and steel covered composite fire doors rated up to
3 hours and on wood core type fire doors rated 20 minutes.




Pivots
Recommended for use on average frequency double acting
 EP-5J
doors in schools, hospitals, institutions and other public
buildings. Not for use on labeled doors and frames.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 17
', 1740, 1, ' hinge selection
raised barrel hinge
if the door is not flush with the frame but rather is sitting back
 raised barrel raised barrel
in a deep reveal from the face of the frame a full mortise
 square edge door beveled edge door
raised barrel hinge may be used in hanging the door.
the solution offered by this hinge is the offset of the hinge
barrel away from the hinge jamb. bevel of door edge should be
specified.
raised barrel hinges (rb prefix) are only available on
5-knuckle 41/2" x 41/2" standard and heavy weight and 5" x
41/2" heavy weight only. the hinges have nrp and are reversible
for handing.




pocket hinge
an increasingly popular door, frame and wall condition in
 ph-4 application

corridors is cross-corridor or double egress pairs of doors
standing in wall pockets at 90˚ of swing, so as to be clear of
the initial opening and out of the corridor altogether.
solution: pocket hinge.
as corridor doors are often fire labeled, the hardware must
be approved for use in fire labeled openings. solution: the
mckinney ph-4 pocket hinge. ul approved for use on both
hollow metal and steel covered composite fire doors rated up to
3 hours and on wood core type fire doors rated 20 minutes.




pivots
recommended for use on average frequency double acting
 ep-5j
doors in schools, hospitals, institutions and other public
buildings. not for use on labeled doors and frames.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 17
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 18, 'Reference Charts
 Quick Reference Chart

 Variation of McKinney
 Door, Frame Wall Basic Hinge Type Brand
 Frame Type Door Type Hinge Type
 Conditions Shown Below Example
 (See Note 2) (See Note 3)

 Wood
 Flush* Wood or Metal Full Mortise (not applicable) TA2714
 or Metal

 Flush* Channel Iron Wood or Metal Half Mortise (not applicable) TA2774

 Kalamein or Fire
 Flush* Channel Iron Labeled Wood Full Surface (not applicable) TA2771
 Door (See Note 1)

 Kalamein or Fire
 Flush* Metal Labeled Wood Half Surface (not applicable) TA2772
 Door (See Note 1)

 Heavy and/or High
 Flush* Metal Frequency Wood Anchor Full Mortise TA792
 or Metal

 Wood or Metal
 Wood Full Mortise
 Flush* Requiring Alternative Closing Spring 1502
 or Metal Half Surface
 Device

 Wood or Metal
 Wood
 Flush* Required to Clear Swing Clear Full Mortise TA2895
 or Metal
 Opening at 90˚ of Swing

 Wood or Metal with
 Wood
 Deep Frame Reveal Maximum Swing of 90˚ Raised Barrel Full Mortise RBTA2714
 or Metal
 to 110˚

 Deep Frame Reveal
 with or without
 Wood Wood or Metal with
 Trim on the Face of Wide Throw Full Mortise TA2798
 or Metal swing to 180˚
 the Frame or a Projecting
 Wall


 Wall Pocket at
 Metal Wood or Metal Pocket Hinge (not applicable) PH-4
 90˚ of swing


 * Includes door and frame conditions of up to 1/8" inset.

 Notes:
 1. Fire labeled wood door without sufficient hinge reinforcement. Door leaf is hung using back plate with grommet nuts and bolts.
 2. The four basic hinge types are full mortise, half mortise, full surface and half surface. Variations (i.e. anchor, swing clear, raised barrel,
 wide throw) are available in the basic types shown above but may not be available in all basic hinge types. Consult individual catalog
 pages for availability.
 3. Consult individual catalog pages for available sizes, weights, materials, versions, bearings and finishes. Hinges for doors beveled
 (1/8" in 2") on hinge side use 5000 series for 3K hinges (e.g. TA5792); use 4000 series for 5K hinges (e.g., TA4895).




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 18 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2377, 1, 'reference charts
 quick reference chart

 variation of mckinney
 door, frame wall basic hinge type brand
 frame type door type hinge type
 conditions shown below example
 (see note 2) (see note 3)

 wood
 flush* wood or metal full mortise (not applicable) ta2714
 or metal

 flush* channel iron wood or metal half mortise (not applicable) ta2774

 kalamein or fire
 flush* channel iron labeled wood full surface (not applicable) ta2771
 door (see note 1)

 kalamein or fire
 flush* metal labeled wood half surface (not applicable) ta2772
 door (see note 1)

 heavy and/or high
 flush* metal frequency wood anchor full mortise ta792
 or metal

 wood or metal
 wood full mortise
 flush* requiring alternative closing spring 1502
 or metal half surface
 device

 wood or metal
 wood
 flush* required to clear swing clear full mortise ta2895
 or metal
 opening at 90˚ of swing

 wood or metal with
 wood
 deep frame reveal maximum swing of 90˚ raised barrel full mortise rbta2714
 or metal
 to 110˚

 deep frame reveal
 with or without
 wood wood or metal with
 trim on the face of wide throw full mortise ta2798
 or metal swing to 180˚
 the frame or a projecting
 wall


 wall pocket at
 metal wood or metal pocket hinge (not applicable) ph-4
 90˚ of swing


 * includes door and frame conditions of up to 1/8" inset.

 notes:
 1. fire labeled wood door without sufficient hinge reinforcement. door leaf is hung using back plate with grommet nuts and bolts.
 2. the four basic hinge types are full mortise, half mortise, full surface and half surface. variations (i.e. anchor, swing clear, raised barrel,
 wide throw) are available in the basic types shown above but may not be available in all basic hinge types. consult individual catalog
 pages for availability.
 3. consult individual catalog pages for available sizes, weights, materials, versions, bearings and finishes. hinges for doors beveled
 (1/8" in 2") on hinge side use 5000 series for 3k hinges (e.g. ta5792); use 4000 series for 5k hinges (e.g., ta4895).




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 18 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 19, ' Reference Charts
Door Weights
The following wood and metal door weights are provided as a convenience to catalog users. They are
approximate and will vary slightly among door manufacturers. The weight of the door hardware should
be added to the weights listed below. For any thickness not shown, the individual manufacturer’s catalog
should be consulted.


 Door Weights* (Based upon 3'' 0" x 7'' 0" Door Size)

 Hollow Metal Door Weights by Gauge Wood Door Weights by Door Thickness
 Door Gauge — # Per Square Foot # Per Square Foot
 20 Gauge Door 4 Door Thickness 13/8" 13/4"
 18 Gauge Door 5 Particle/Mineral Core 4.75 5.25
 16 Gauge Door 6 Stave Core Wood 3.75 4.25
 14 Gauge Door 7 Hollow Core Wood 1.3 1.5
* Weights do not include hardware.




How to Determine the Proper Hinge Width
Knowing the door thickness and trim projection, use the following formula for determining minimum hinge
width for all full mortise hinges:
1. Door thickness
2. Backset
3. Required Clearance
4. Inset
Door thickness - Backset x 2 + Required Clearance + Inset (if applicable) = the proper hinge width

D = Door Thickness
B = Backset
W = Hinge Width
 D = Door Thickness
 T = Trim Depth
 W = Hinge Width "B"


 "D"




 Clearance
 "W"




 For doors up to 21/2" thick:
 W=(2 x D) + T
 For doors 21/2" to 3" thick:
 W=(2 x D)+(2 x T)+ 1/4"




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 19
', 1677, 1, ' reference charts
door weights
the following wood and metal door weights are provided as a convenience to catalog users. they are
approximate and will vary slightly among door manufacturers. the weight of the door hardware should
be added to the weights listed below. for any thickness not shown, the individual manufacturer’s catalog
should be consulted.


 door weights* (based upon 3'' 0" x 7'' 0" door size)

 hollow metal door weights by gauge wood door weights by door thickness
 door gauge — # per square foot # per square foot
 20 gauge door 4 door thickness 13/8" 13/4"
 18 gauge door 5 particle/mineral core 4.75 5.25
 16 gauge door 6 stave core wood 3.75 4.25
 14 gauge door 7 hollow core wood 1.3 1.5
* weights do not include hardware.




how to determine the proper hinge width
knowing the door thickness and trim projection, use the following formula for determining minimum hinge
width for all full mortise hinges:
1. door thickness
2. backset
3. required clearance
4. inset
door thickness - backset x 2 + required clearance + inset (if applicable) = the proper hinge width

d = door thickness
b = backset
w = hinge width
 d = door thickness
 t = trim depth
 w = hinge width "b"


 "d"




 clearance
 "w"




 for doors up to 21/2" thick:
 w=(2 x d) + t
 for doors 21/2" to 3" thick:
 w=(2 x d)+(2 x t)+ 1/4"




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 19
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 20, 'Reference Charts
 The table below indicates the trim clearance provided by hinges of specified widths on flush doors, not inset, of standard
 thickness. For doors of other thicknesses, apply the proper formula.


 Trim Clearance

 Door Thickness Hinge Width Max Clearance Provided
 1 8"
 3/
 3 2"
 1/
 11/4"
 4" 13/4"
 13/4" 4" 1"
 41/2" 11/2"
 5" 2"
 6" 3"
 2" 41/2" 1"
 5" 2"
 1/


 6" 21/2"
 21/4" 5" 1"
 6" 2"



 The hinge widths of half mortise, half surface and full surface hinges are standard, depending on the hinge length. Note that in
 these hinge types, the amount of clearance available is determined by the amount of offset and not by the hinge width.


 Recommended Size of Hinges per Door (Wood or Metal)

 Door Thickness Door Width Hinge Height
 Hinge Gauge
 in Inches (mm) in Inches (mm) in Inches (mm)

 13/8" (35) Up to 36" (914) 31/2" (89) .123
 13/8" (35) Over 36" (914) 4" (102) .130
 1 4" (44)
 3/
 Up to 36" (914) 4 2" (114)
 1/
 .134
 1 4" (44)
 3/
 36" – 48" 5" (127) .134
 (914 – 1219)
 13/4" (44) Over 48" (1219) 6" (152) .160
 2" – 2 2" (51 – 64)
 1/
 Up to 42" (1067) 5" (127) HW* .190
 2" – 21/2" (51 – 64) Over 42" (1067) 6" (152) HW* .203


 * Heavy Weight hinges should be used on all extra heavy doors or those exposed to high frequency use.
 Consult the factory for doors wider than 3''0". Five knuckle heavy weight hinges are four bearing.
 The following gauges of metal may apply:
 Heavy weight 41/2" (114) high = .180 gauge
 Heavy weight 5" (127) high = .190 gauge
 Heavy weight 6" (152) high = .203 gauge


 Note: Five knuckle 8" (203) high hinges have six bearings.
 Note: On hinge size the dimension shown is the hinge height. Where full mortise or other hinges with two
 dimensions are used, the first dimension given is always the height. The second dimension is the hinge width
 when open.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 20 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2193, 1, 'reference charts
 the table below indicates the trim clearance provided by hinges of specified widths on flush doors, not inset, of standard
 thickness. for doors of other thicknesses, apply the proper formula.


 trim clearance

 door thickness hinge width max clearance provided
 1 8"
 3/
 3 2"
 1/
 11/4"
 4" 13/4"
 13/4" 4" 1"
 41/2" 11/2"
 5" 2"
 6" 3"
 2" 41/2" 1"
 5" 2"
 1/


 6" 21/2"
 21/4" 5" 1"
 6" 2"



 the hinge widths of half mortise, half surface and full surface hinges are standard, depending on the hinge length. note that in
 these hinge types, the amount of clearance available is determined by the amount of offset and not by the hinge width.


 recommended size of hinges per door (wood or metal)

 door thickness door width hinge height
 hinge gauge
 in inches (mm) in inches (mm) in inches (mm)

 13/8" (35) up to 36" (914) 31/2" (89) .123
 13/8" (35) over 36" (914) 4" (102) .130
 1 4" (44)
 3/
 up to 36" (914) 4 2" (114)
 1/
 .134
 1 4" (44)
 3/
 36" – 48" 5" (127) .134
 (914 – 1219)
 13/4" (44) over 48" (1219) 6" (152) .160
 2" – 2 2" (51 – 64)
 1/
 up to 42" (1067) 5" (127) hw* .190
 2" – 21/2" (51 – 64) over 42" (1067) 6" (152) hw* .203


 * heavy weight hinges should be used on all extra heavy doors or those exposed to high frequency use.
 consult the factory for doors wider than 3''0". five knuckle heavy weight hinges are four bearing.
 the following gauges of metal may apply:
 heavy weight 41/2" (114) high = .180 gauge
 heavy weight 5" (127) high = .190 gauge
 heavy weight 6" (152) high = .203 gauge


 note: five knuckle 8" (203) high hinges have six bearings.
 note: on hinge size the dimension shown is the hinge height. where full mortise or other hinges with two
 dimensions are used, the first dimension given is always the height. the second dimension is the hinge width
 when open.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 20 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 21, ' Reference Charts
 Expected Frequency of Door Operations

 Expected Frequency*
 Installation Type Daily Yearly
 Commercial
 Commercial Store Entrance 5,000 1,500,000
 Office Building Entrance 4,000 1,200,000
 Theater Entrance 1,000 450,000
 School Entrance 1,250 225,000 High
 School Restroom Door 1,250 225,000
 Store or Bank Entrance 500 150,000
 Office Building Restroom Door 400 118,000
 School Corridor Door 80 15,000

 Average
 Office Building Corridor Door 75 22,000
 Store Restroom Door 60 18,000

 Residential
 Entrance 40 15,000
 Restroom Door 25 9,000
 Low
 Corridor Door 10 3,600
 Closet Door 6 2,200

* One cycle = one complete opening and closing.


Note: We recommend that bearing hinges be used on all above categories other than “Residential”.


 Recommended Number of Hinges per Door 3''0" Wide (Wood or Metal)

 Door Height in Inches (mm) # of Hinges Per Door
 Up to 60 (1524) 2
 60 – 90 (1524 – 2286) 3
 90 – 120 (2286 – 3048) 4


Note: An additional hinge is required for each additional 30".




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 21
', 1366, 1, ' reference charts
 expected frequency of door operations

 expected frequency*
 installation type daily yearly
 commercial
 commercial store entrance 5,000 1,500,000
 office building entrance 4,000 1,200,000
 theater entrance 1,000 450,000
 school entrance 1,250 225,000 high
 school restroom door 1,250 225,000
 store or bank entrance 500 150,000
 office building restroom door 400 118,000
 school corridor door 80 15,000

 average
 office building corridor door 75 22,000
 store restroom door 60 18,000

 residential
 entrance 40 15,000
 restroom door 25 9,000
 low
 corridor door 10 3,600
 closet door 6 2,200

* one cycle = one complete opening and closing.


note: we recommend that bearing hinges be used on all above categories other than “residential”.


 recommended number of hinges per door 3''0" wide (wood or metal)

 door height in inches (mm) # of hinges per door
 up to 60 (1524) 2
 60 – 90 (1524 – 2286) 3
 90 – 120 (2286 – 3048) 4


note: an additional hinge is required for each additional 30".




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 21
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 22, 'Reference Charts
 Underwriters'' Laboratories Requirements
 The requirements of the Underwriters’ Laboratories, Inc., for fire
 door hardware are determined by door label, which in turn is
 established by the location of the opening. The following are
 the classifications of Underwriter’s Laboratories, Inc.




 Door Situation Location
 Class A Fire Walls
 Class B Vertical Shafts
 Class C Corridor & Room Partitions
 Class D Exterior Walls
 (severe fire exposure)
 Class D Exterior Fire Escapes
 (severe fire exposure)
 Class E Exterior Wall
 (moderate fire exposure)
 Class E Exterior Fire Escapes
 (moderate fire exposure)




 On all public and some private heavy construction three hinges Three hinges assure proper door alignment and enable other
 are required for each door. This practice is standard under U.S. hardware to function properly. There is less door warping and
 Government specifications and is required under most building less hinge wear. On light wood doors the alignment problem is
 codes and Fire Underwriters’ specifications. as great as on heavy doors so less than three hinges should
 never be considered.




 The top of the top hinge should be 5" from the jamb header. EXCEPTION:
 The bottom of the bottom hinge should be 10" from the The McKinney Anchor Hinge mounts at the very top of the door.
 finished floor. On doors over 7''6" high, four hinges are required.
 The center of the center hinge should be equidistant
 from the other two hinges.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 22 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1835, 1, 'reference charts
 underwriters'' laboratories requirements
 the requirements of the underwriters’ laboratories, inc., for fire
 door hardware are determined by door label, which in turn is
 established by the location of the opening. the following are
 the classifications of underwriter’s laboratories, inc.




 door situation location
 class a fire walls
 class b vertical shafts
 class c corridor & room partitions
 class d exterior walls
 (severe fire exposure)
 class d exterior fire escapes
 (severe fire exposure)
 class e exterior wall
 (moderate fire exposure)
 class e exterior fire escapes
 (moderate fire exposure)




 on all public and some private heavy construction three hinges three hinges assure proper door alignment and enable other
 are required for each door. this practice is standard under u.s. hardware to function properly. there is less door warping and
 government specifications and is required under most building less hinge wear. on light wood doors the alignment problem is
 codes and fire underwriters’ specifications. as great as on heavy doors so less than three hinges should
 never be considered.




 the top of the top hinge should be 5" from the jamb header. exception:
 the bottom of the bottom hinge should be 10" from the the mckinney anchor hinge mounts at the very top of the door.
 finished floor. on doors over 7''6" high, four hinges are required.
 the center of the center hinge should be equidistant
 from the other two hinges.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 22 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 23, ' Reference Charts
Table 1 Reference NFPA-80
Table 6.4.3.1 2022 Builders Hardware Mortise, Surface, and Full-Length Hinges, Pivots
or Spring Hinges for Swinging Doors
Mortise and Surface Hinges, Pivots or Spring Hinges for Swinging Doors. Doors up to 60" (1.52 m) in height shall be provided with two
hinges and an additional hinge for each additional 30" (0.76 m) of door height or fraction thereof. The distance between hinges shall be
permitted to exceed 30" (0.76 m). Where spring hinges are used, at least two shall be provided.


 Maximum Door Size Minimum Hinge Size
 Maximum
 Width Height Height Thickness
 Door Rating Type Hinge
 ft. (m) ft. (m) in. (mm) in. (mm)
 Hours
 For 13/4" (44.5mm) or Thicker Doors
 3 or less 4 (1.22) 10 (3.05) 41/2" (114.3) 0.180 (4.57) Steel, Mortise or Surface

 3 or less 4 (1.22) 8 (2.44) 4 2" (114.3)
 1/
 0.134 (3.40) Steel, Mortise or Surface

 1 2 or less
 1/
 31/
 6 (0.96) 8 (2.44) 6" (152.4) 0.225 (5.72) Steel-Olive Knuckle or Paumelle

 3 or less 4 (1.22) 10 (3.05) 4" (101.6) 0.225 (5.72) Steel Pivots (including top, bottom and intermediate)

 1 2 or less
 1/
 3 (0.91) 5 (1.52) 4" (101.6) 0.130 (3.30) Steel, Mortise or Surface

 11/2 or less 2 (0.61) 3 (0.91) 3" (76.2) 0.092 (2.34) Steel, Mortise or Surface

 3 or less 3 (0.91) 7 (2.13) 41/2" (114.3) 0.134 (3.40) Steel, Mortise or Surface (labeled self closing spring type)

 3 or less 3 (0.91) 7 (2.13) 4" (101.6) 0.105 (2.67) Steel, Mortise or Surface (labeled self closing spring type)

 For 13/8" (34.93mm) Doors
 3 or less 3 (0.91) 7 (2.13) 31/2" (88.9) 0.123 (3.12) Steel, Mortise or Surface

 3 or less 2 3 (0.81)
 2/
 7 (2.13) 3 2" (88.9)
 1/
 0.105 (2.67) Steel, Mortise, or Surface (labeled, self-closing, spring type)

Note: Table 6.4.3.1 lists the most common applications of hinges, spring hinges and pivots. Consult the door and hardware manufacturer''s specific listings for
 applications not addressed in this table.

6.4.3* Builders Hardware.
6.4.3.1 Hinges and pivots. Hinges, spring hinges, continuous hinges, and pivots shall be as specified in individual door and hardware
manufacturer''s published listings or Table 6.4.3.1.
6.4.3.1.1* Doors up to 60 in. (1.52 m) in height shall be provided with at least two hinges.
6.4.3.1.2 Doors in excess of 60 in. (1.52 m) shall have an additional 30 in. (0.76 m) of door height or fraction thereof, or in accordance
with the manufacturer''s published listing.
6.4.3.1.3 The distance between hinges shall be permitted to exceed 30 in. (0.76 m).
6.4.3.1.4 Where spring hinges are used, at least two shall be provided.
6.4.3.1.5 All hinges or pivots, except spring hinges, shall be of the ball bearing type.
6.4.3.1.5.1 Hinges or pivots employing other antifriction bearing surfaces shall be permitted if they meet the requirements of ANSI/BHMA
A156.1, Standard for Butts and Hinges.
6.4.3.1.5.2 Spring hinges shall be labeled and shall meet the requirements of ANSI/BHMA A156.17, Standard for Self Closing Hinges &
Pivots, Grade 1.
6.4.3.1.6 Hinges 4-1/2 in. (114mm high and 0.180 in. (4.57mm) thick) shall be permitted for use on wide and heavy doors or doors that are
subjected to heavy use or unusual stress.
6.4.3.1.7 Fire doors with hinges of lighter weight that are not of the ball bearing type shall be permitted under the following conditions:
 (1) They are part of a listed assembly.
 (2) They meet the test requirements of ANSI/BHMA A156.1, Standard for Butts and Hinges.
 (3) They have been tested to a minimum of 350,000 cycles.

 Reproduced with permission of NFPA from NFPA 80, Standard for Fire Doors and Other Opening Protectives, 2022 edition.
 Copyright© 2021, National Fire Protection Association. For a full copy of NFPA 80, please go to www.nfpa.org.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 23
', 4090, 1, ' reference charts
table 1 reference nfpa-80
table 6.4.3.1 2022 builders hardware mortise, surface, and full-length hinges, pivots
or spring hinges for swinging doors
mortise and surface hinges, pivots or spring hinges for swinging doors. doors up to 60" (1.52 m) in height shall be provided with two
hinges and an additional hinge for each additional 30" (0.76 m) of door height or fraction thereof. the distance between hinges shall be
permitted to exceed 30" (0.76 m). where spring hinges are used, at least two shall be provided.


 maximum door size minimum hinge size
 maximum
 width height height thickness
 door rating type hinge
 ft. (m) ft. (m) in. (mm) in. (mm)
 hours
 for 13/4" (44.5mm) or thicker doors
 3 or less 4 (1.22) 10 (3.05) 41/2" (114.3) 0.180 (4.57) steel, mortise or surface

 3 or less 4 (1.22) 8 (2.44) 4 2" (114.3)
 1/
 0.134 (3.40) steel, mortise or surface

 1 2 or less
 1/
 31/
 6 (0.96) 8 (2.44) 6" (152.4) 0.225 (5.72) steel-olive knuckle or paumelle

 3 or less 4 (1.22) 10 (3.05) 4" (101.6) 0.225 (5.72) steel pivots (including top, bottom and intermediate)

 1 2 or less
 1/
 3 (0.91) 5 (1.52) 4" (101.6) 0.130 (3.30) steel, mortise or surface

 11/2 or less 2 (0.61) 3 (0.91) 3" (76.2) 0.092 (2.34) steel, mortise or surface

 3 or less 3 (0.91) 7 (2.13) 41/2" (114.3) 0.134 (3.40) steel, mortise or surface (labeled self closing spring type)

 3 or less 3 (0.91) 7 (2.13) 4" (101.6) 0.105 (2.67) steel, mortise or surface (labeled self closing spring type)

 for 13/8" (34.93mm) doors
 3 or less 3 (0.91) 7 (2.13) 31/2" (88.9) 0.123 (3.12) steel, mortise or surface

 3 or less 2 3 (0.81)
 2/
 7 (2.13) 3 2" (88.9)
 1/
 0.105 (2.67) steel, mortise, or surface (labeled, self-closing, spring type)

note: table 6.4.3.1 lists the most common applications of hinges, spring hinges and pivots. consult the door and hardware manufacturer''s specific listings for
 applications not addressed in this table.

6.4.3* builders hardware.
6.4.3.1 hinges and pivots. hinges, spring hinges, continuous hinges, and pivots shall be as specified in individual door and hardware
manufacturer''s published listings or table 6.4.3.1.
6.4.3.1.1* doors up to 60 in. (1.52 m) in height shall be provided with at least two hinges.
6.4.3.1.2 doors in excess of 60 in. (1.52 m) shall have an additional 30 in. (0.76 m) of door height or fraction thereof, or in accordance
with the manufacturer''s published listing.
6.4.3.1.3 the distance between hinges shall be permitted to exceed 30 in. (0.76 m).
6.4.3.1.4 where spring hinges are used, at least two shall be provided.
6.4.3.1.5 all hinges or pivots, except spring hinges, shall be of the ball bearing type.
6.4.3.1.5.1 hinges or pivots employing other antifriction bearing surfaces shall be permitted if they meet the requirements of ansi/bhma
a156.1, standard for butts and hinges.
6.4.3.1.5.2 spring hinges shall be labeled and shall meet the requirements of ansi/bhma a156.17, standard for self closing hinges &
pivots, grade 1.
6.4.3.1.6 hinges 4-1/2 in. (114mm high and 0.180 in. (4.57mm) thick) shall be permitted for use on wide and heavy doors or doors that are
subjected to heavy use or unusual stress.
6.4.3.1.7 fire doors with hinges of lighter weight that are not of the ball bearing type shall be permitted under the following conditions:
 (1) they are part of a listed assembly.
 (2) they meet the test requirements of ansi/bhma a156.1, standard for butts and hinges.
 (3) they have been tested to a minimum of 350,000 cycles.

 reproduced with permission of nfpa from nfpa 80, standard for fire doors and other opening protectives, 2022 edition.
 copyright© 2021, national fire protection association. for a full copy of nfpa 80, please go to www.nfpa.org.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 23
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 24, 'Reference Charts
 Hand of Doors
 All doors are handed - right or left. The following Regular Doors Opening In
 illustrations indicate clearly this “handing” as it is
 understood within the hardware industry.
 Hand of door is determined from the outside.
 When standing on outside of door and hinges are on the
 right, it is right hand. When hinges are on the left, it is
 left hand.
 OUTSIDE OUTSIDE
 A double acting door opens from you and toward you, Left Hand Door takes left hand hinges Right Hand Door takes right hand hinges

 therefore it is not called reverse like a single acting door.
 Reverse Doors Opening Out




 OUTSIDE OUTSIDE
 Left Hand Reverse Door takes right hand hinges Right Hand Reverse Door takes left hand hinges



 Double Acting Doors
 Right Side of Hinge Left Side of Hinge




 Left Side of Hinge Outside Right Side of Hinge
 Left hand Door Right Hand Door




 Hand of Hinges
 All doors are handed – right or left. The following illustrations
 indicate clearly this “handing” as it is understood within the
 hardware industry.
 A simple method of determining the hand of all loose joint
 hinges is to open the hinge full with the countersunk screw
 holes in view. If the hinge can be held by the right hand leaf Right Hand

 and it does not fall apart, it is a right hand (RH) hinge. If the
 hinge must be held by the left hand leaf to keep it from falling
 apart, it is a left hand (LH) hinge.
 The hand of hinges may be specified by suffixing the symbols
 RH or LH to the catalog number.




 Left Hand




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 24 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1892, 1, 'reference charts
 hand of doors
 all doors are handed - right or left. the following regular doors opening in
 illustrations indicate clearly this “handing” as it is
 understood within the hardware industry.
 hand of door is determined from the outside.
 when standing on outside of door and hinges are on the
 right, it is right hand. when hinges are on the left, it is
 left hand.
 outside outside
 a double acting door opens from you and toward you, left hand door takes left hand hinges right hand door takes right hand hinges

 therefore it is not called reverse like a single acting door.
 reverse doors opening out




 outside outside
 left hand reverse door takes right hand hinges right hand reverse door takes left hand hinges



 double acting doors
 right side of hinge left side of hinge




 left side of hinge outside right side of hinge
 left hand door right hand door




 hand of hinges
 all doors are handed – right or left. the following illustrations
 indicate clearly this “handing” as it is understood within the
 hardware industry.
 a simple method of determining the hand of all loose joint
 hinges is to open the hinge full with the countersunk screw
 holes in view. if the hinge can be held by the right hand leaf right hand

 and it does not fall apart, it is a right hand (rh) hinge. if the
 hinge must be held by the left hand leaf to keep it from falling
 apart, it is a left hand (lh) hinge.
 the hand of hinges may be specified by suffixing the symbols
 rh or lh to the catalog number.




 left hand




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 24 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 25, ' Hand of Doors And Hinges
Hinge Swaging
Swaging is the slight offset in the hinge leaves which permits
them to close to a parallel position as the door closes.

 Hinge Opened Full Mortise
 All hinges for full mortise applications are swaged. Normal
 swaging on standard and heavy gauge hinges provides a
 Hinge Closed clearance of 1/16" when the leaves are parallel.




 Hinge Opened
 Full Surface
 Hinges for full surface applications are not swaged.
 Blank hinges are for full surface welded application and
 Hinge Closed are always furnished “flat back” unless specified otherwise
 when ordered.




 Hinge Opened
 Beveled Door
 Hinges for beveled door applications have one leaf swaged at
 an angle of 31/2˚ (1/8" in 2") to maintain proper door and frame
 Hinge Closed clearance when doors are beveled on the hinge side. Specify
 handing on these hinges.




 Hinge with One Leaf Swaged One Leaf Swaged
 When only one leaf is swaged, the non-swaged leaf is
 approximately 1/16" shorter as a standard. For all hollow metal
 door and frame applications, both leaves must be the same
 width. On your order, specify “Leaves must be equal”.




 One Leaf Swaged Flat
 Hinge with One Leaf Swaged Flat
 When only one leaf is swaged flat, the non-swaged leaf is
 approximately 3/32" shorter as a standard. For all hollow metal
 door and frame applications, both leaves must be the same
 width. On your order, specify “Leaves must be equal”.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 25
', 1791, 1, ' hand of doors and hinges
hinge swaging
swaging is the slight offset in the hinge leaves which permits
them to close to a parallel position as the door closes.

 hinge opened full mortise
 all hinges for full mortise applications are swaged. normal
 swaging on standard and heavy gauge hinges provides a
 hinge closed clearance of 1/16" when the leaves are parallel.




 hinge opened
 full surface
 hinges for full surface applications are not swaged.
 blank hinges are for full surface welded application and
 hinge closed are always furnished “flat back” unless specified otherwise
 when ordered.




 hinge opened
 beveled door
 hinges for beveled door applications have one leaf swaged at
 an angle of 31/2˚ (1/8" in 2") to maintain proper door and frame
 hinge closed clearance when doors are beveled on the hinge side. specify
 handing on these hinges.




 hinge with one leaf swaged one leaf swaged
 when only one leaf is swaged, the non-swaged leaf is
 approximately 1/16" shorter as a standard. for all hollow metal
 door and frame applications, both leaves must be the same
 width. on your order, specify “leaves must be equal”.




 one leaf swaged flat
 hinge with one leaf swaged flat
 when only one leaf is swaged flat, the non-swaged leaf is
 approximately 3/32" shorter as a standard. for all hollow metal
 door and frame applications, both leaves must be the same
 width. on your order, specify “leaves must be equal”.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 25
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 26, 'Screws and Fasteners
 Screws and Fasteners
 Templated Screw Holes
 Our hinges are manufactured with templated screw hole locations
 and tolerances which conform to the American National Standards
 Institute (ANSI/BHMA A-156.7). We publish a complete listing of
 templates which list the overall hinge size, material gauge and exact
 screw hole location. The most current templates are found on our
 website www.assaabloydooraccessories.us. These templates should
 be consulted prior to any door or frame preparation.




 Machine and Wood Screws
 Shown:
 1. 2. 3. 4. 5. 6.
 1. Phillips Head Machine Screw
 2. Torx Head Machine Screw
 3. Machined Safety Torx Screw
 4. Torx Head Wood Screw
 5. Phillips Head Wood Screw
 6. Oval Phillips Head Machine Screw with Grommet Nut



 Note: Original Self-tapping Torx Screw (MK22209) should be used on installations where
 customer requires self-tapping screw (some installations might have drilled holes
 while others might require holes to be drilled)
 New Machined Safety Torx Screw (MK22208) should be used on installations where
 the door and frame are already drilled and tapped.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 26 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1486, 1, 'screws and fasteners
 screws and fasteners
 templated screw holes
 our hinges are manufactured with templated screw hole locations
 and tolerances which conform to the american national standards
 institute (ansi/bhma a-156.7). we publish a complete listing of
 templates which list the overall hinge size, material gauge and exact
 screw hole location. the most current templates are found on our
 website www.assaabloydooraccessories.us. these templates should
 be consulted prior to any door or frame preparation.




 machine and wood screws
 shown:
 1. 2. 3. 4. 5. 6.
 1. phillips head machine screw
 2. torx head machine screw
 3. machined safety torx screw
 4. torx head wood screw
 5. phillips head wood screw
 6. oval phillips head machine screw with grommet nut



 note: original self-tapping torx screw (mk22209) should be used on installations where
 customer requires self-tapping screw (some installations might have drilled holes
 while others might require holes to be drilled)
 new machined safety torx screw (mk22208) should be used on installations where
 the door and frame are already drilled and tapped.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 26 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 27, ' Screws and Fasteners
 Full Mortise Hinges Half Mortise Hinges

 Size of Hinge Machine Screws Wood Screws Size of Hinge Machine Screws

31/2" x 31/2"* 1/
 2 " x 10-24 1 x 10 41/2" 1/
 2 " x 12-24
3 2" x 5"
 1/ 1/
 2 " x 10-24 1 x 10 5" 1/
 2 " x 12-24
4" x 4"* 1/
 2 " x 12-24 11/4 x 12 6" 1/
 2 " x 1/4 -20
41/2" x 4" 1/
 2 " x 12-24 11/4 x 12
41/2" x 41/2" 1/
 2 " x 12-24 11/4 x 12
 Swing Clear Hinges
4" x 6" 1/
 2 " x 12-24 11/4 x 12
 Size of Hinge Machine Screws Wood Screws
4" x 7" 1/
 2 " x 12-24 11/4 x 12
41/2" x 6" 1/
 2 " x 12-24 11/4 x 12 41/2" 1/
 2 x 12-24 11/4 x 12

41/2" x 7" 1/
 2 " x 12-24 11/4 x 12 5" 1/
 2 x 12-24 11/4 x 12

41/2" x 8" 1/
 2 " x 12-24 11/4 x 12
5" x 4" 1/
 2 " x 12-24 11/4 x 12
 Full Surface Hinges
5" x 41/2" 1/
 2 " x 12-24 1/
 4 x 12
 Thru Bolts &
5" x 5" 1/
 2 " x 12-24 11/4 x 12 Size of Hinge Machine Screws
 Grommet Nut
5" x 7" 1/
 2 " x 12-24 11/4 x 12
 41/2" 1/
 2 x 12-24 2 x 1/4 -20
5" x 8" 1/
 2 " x 12-24 11/2 x 14
 5" 1/
 2 x 12-24 2 x 1/4 -20
6" x 5" 1/
 2 " x 1/4"-20 11/2 x 14
 6" 1/
 2 x 1/4 -20 2 x 1/4 -20
6" x 6" 1/
 2 " x 1/4"-20 11/2 x 14
8" x 6" 1/
 2 " x 1/4"-20 11/2 x 14
8" x 8" 1/
 2 " x 1/4"-20 11/2 x 14
 Half Surface Hinges
 Thru Bolts &
 Size of Hinge Machine Screws
 *1400-1414-1458 Residential Guide Grommet Nut
 Size of Hinge Wood Screws 4 1/2" 1/
 2 x 12-24 2 x 1/4 -20
3 1/2" x 3 1/2" 3/
 4 x9 5" 1/
 2 x 12-24 2 x 1/4 -20
4" x 4" 1x9 6" 1/
 2 x 1/4 -20 2 x 1/4 -20




Packing:
Full mortise hinges are packed all machine x half
wood screws.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 27
', 1873, 1, ' screws and fasteners
 full mortise hinges half mortise hinges

 size of hinge machine screws wood screws size of hinge machine screws

31/2" x 31/2"* 1/
 2 " x 10-24 1 x 10 41/2" 1/
 2 " x 12-24
3 2" x 5"
 1/ 1/
 2 " x 10-24 1 x 10 5" 1/
 2 " x 12-24
4" x 4"* 1/
 2 " x 12-24 11/4 x 12 6" 1/
 2 " x 1/4 -20
41/2" x 4" 1/
 2 " x 12-24 11/4 x 12
41/2" x 41/2" 1/
 2 " x 12-24 11/4 x 12
 swing clear hinges
4" x 6" 1/
 2 " x 12-24 11/4 x 12
 size of hinge machine screws wood screws
4" x 7" 1/
 2 " x 12-24 11/4 x 12
41/2" x 6" 1/
 2 " x 12-24 11/4 x 12 41/2" 1/
 2 x 12-24 11/4 x 12

41/2" x 7" 1/
 2 " x 12-24 11/4 x 12 5" 1/
 2 x 12-24 11/4 x 12

41/2" x 8" 1/
 2 " x 12-24 11/4 x 12
5" x 4" 1/
 2 " x 12-24 11/4 x 12
 full surface hinges
5" x 41/2" 1/
 2 " x 12-24 1/
 4 x 12
 thru bolts &
5" x 5" 1/
 2 " x 12-24 11/4 x 12 size of hinge machine screws
 grommet nut
5" x 7" 1/
 2 " x 12-24 11/4 x 12
 41/2" 1/
 2 x 12-24 2 x 1/4 -20
5" x 8" 1/
 2 " x 12-24 11/2 x 14
 5" 1/
 2 x 12-24 2 x 1/4 -20
6" x 5" 1/
 2 " x 1/4"-20 11/2 x 14
 6" 1/
 2 x 1/4 -20 2 x 1/4 -20
6" x 6" 1/
 2 " x 1/4"-20 11/2 x 14
8" x 6" 1/
 2 " x 1/4"-20 11/2 x 14
8" x 8" 1/
 2 " x 1/4"-20 11/2 x 14
 half surface hinges
 thru bolts &
 size of hinge machine screws
 *1400-1414-1458 residential guide grommet nut
 size of hinge wood screws 4 1/2" 1/
 2 x 12-24 2 x 1/4 -20
3 1/2" x 3 1/2" 3/
 4 x9 5" 1/
 2 x 12-24 2 x 1/4 -20
4" x 4" 1x9 6" 1/
 2 x 1/4 -20 2 x 1/4 -20




packing:
full mortise hinges are packed all machine x half
wood screws.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 27
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 28, 'Finishes Finishes
 McKinney hinge product finishes meet or exceed the American
 National Standards for materials and finishes (ANSI/BHMA -
 A156.18 and BHMA 1301).
 The Agion antimicrobial is not intended as a substitute for good
 Every effort is made to furnish finishes which do comply with hygiene. Coated products must still be cleaned to ensure the
 the U.S. Standard. However, we cannot guarantee that our finish surfaces will be free of destructive microbes. ASSA ABLOY makes
 will match other manufacturers’ finish. Where a special finish no representations or warranties, express or implied, as to the
 or a matched finish is required, a sample must be submitted efficacy of the Agion antimicrobial. A copy of the Agion warranty is
 with the order. available upon request. Agion is a registered trademark of Agion
 MicroShield® Technologies, Inc., Wakefield, MA, USA.
 ASSA ABLOY Group companies offer MicroShield®, an
 antimicrobial coating for door hardware. MicroShield uses
 proven silver ion-based technology from Agion®, a leading
 provider of antimicrobial solutions, to stem the spread of
 bacteria and other microbes.
 MicroShield® is a registered trademark of ASSA ABLOY Access
 and Egress Hardware Group, Inc.


 Standard Architectural Finishes

 BHMA Code BHMA Code McKinney/U.S. Code Finish Description
 Non-Ferrous (Brass or Stainless Steel) Ferrous (Steel)
 605 (Brass) 632 3 Bright Brass, Clear Coated
 606 (Brass) 633 4 Satin Brass, Clear Coated
 611 (Bronze) 637 9 Bright Bronze, Clear Coated
 612 (Bronze) 639 10 Satin Bronze, Clear Coated
 614 (Bronze) 641 10A Antique Bronze, Oil Rubbed and Clear Coated
 613 (Bronze) 640 10B Dark Oxidized Satin Bronze, Oil Rubbed
 618 (Brass, Bronze) 645 14 Bright Nickel Plated, Clear Coated
 619 (Brass, Bronze) 646 15 Satin Nickel Plated, Clear Coated
 625 (Brass, Bronze) 651 26 Bright Chrome
 626 (Brass, Bronze) 652 26D Satin Chrome
 629 (300 Series Stainless) n/a 32 Bright Stainless Steel
 630 (300 Series Stainless) n/a 32D Satin Stainless Steel



 Custom Architectural Finishes

 BHMA Code BHMA Code McKinney/U.S. Code Finish Description
 Non-Ferrous (Brass or Stainless Steel) Ferrous (Steel)
 609 (Brass) 638 5 Satin Brass, Blackened, Satin Relieved, Clear Coated
 610 (Brass) 636 7 Satin Brass, Blackened, Bright Relieved, Clear Coated
 616 (Bronze) 643 11 Satin Bronze, Blackened, Satin Relieved, Clear Coated
 623 (Bronze) 649 20 Light Oxidized Statuary Bronze, Clear Coated
 624 (Bronze) 650 20A Dark Oxidized Statuary Bronze, Clear Coated


 Note: Check with factory for availability and pricing on these finishes.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 28 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2955, 1, 'finishes finishes
 mckinney hinge product finishes meet or exceed the american
 national standards for materials and finishes (ansi/bhma -
 a156.18 and bhma 1301).
 the agion antimicrobial is not intended as a substitute for good
 every effort is made to furnish finishes which do comply with hygiene. coated products must still be cleaned to ensure the
 the u.s. standard. however, we cannot guarantee that our finish surfaces will be free of destructive microbes. assa abloy makes
 will match other manufacturers’ finish. where a special finish no representations or warranties, express or implied, as to the
 or a matched finish is required, a sample must be submitted efficacy of the agion antimicrobial. a copy of the agion warranty is
 with the order. available upon request. agion is a registered trademark of agion
 microshield® technologies, inc., wakefield, ma, usa.
 assa abloy group companies offer microshield®, an
 antimicrobial coating for door hardware. microshield uses
 proven silver ion-based technology from agion®, a leading
 provider of antimicrobial solutions, to stem the spread of
 bacteria and other microbes.
 microshield® is a registered trademark of assa abloy access
 and egress hardware group, inc.


 standard architectural finishes

 bhma code bhma code mckinney/u.s. code finish description
 non-ferrous (brass or stainless steel) ferrous (steel)
 605 (brass) 632 3 bright brass, clear coated
 606 (brass) 633 4 satin brass, clear coated
 611 (bronze) 637 9 bright bronze, clear coated
 612 (bronze) 639 10 satin bronze, clear coated
 614 (bronze) 641 10a antique bronze, oil rubbed and clear coated
 613 (bronze) 640 10b dark oxidized satin bronze, oil rubbed
 618 (brass, bronze) 645 14 bright nickel plated, clear coated
 619 (brass, bronze) 646 15 satin nickel plated, clear coated
 625 (brass, bronze) 651 26 bright chrome
 626 (brass, bronze) 652 26d satin chrome
 629 (300 series stainless) n/a 32 bright stainless steel
 630 (300 series stainless) n/a 32d satin stainless steel



 custom architectural finishes

 bhma code bhma code mckinney/u.s. code finish description
 non-ferrous (brass or stainless steel) ferrous (steel)
 609 (brass) 638 5 satin brass, blackened, satin relieved, clear coated
 610 (brass) 636 7 satin brass, blackened, bright relieved, clear coated
 616 (bronze) 643 11 satin bronze, blackened, satin relieved, clear coated
 623 (bronze) 649 20 light oxidized statuary bronze, clear coated
 624 (bronze) 650 20a dark oxidized statuary bronze, clear coated


 note: check with factory for availability and pricing on these finishes.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 28 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 29, ' Product Maintenance and Care
 Powder Coat Finishes

 Base Material McKinney/U.S. Code Finish Description
 Steel P Primed for Painting
 Steel D3 Dark Bronze Powder Coat
 Stainless Steel 10BE Dark Oxidized Satin Bronze, Equivalent
 Stainless Steel BSP Black Suede Powder Coat
 Stainless Steel WSP White Suede Powder Coat
 Stainless Steel CPC Clear Powder Coat
 Stainless Steel 32DBIO MicroShield Agion Antimicrobial

Note: May not be available on MacPRO or Rescue Hardware.



Product Maintenance & Care
The McKinney line of hinges are manufactured in compliance with all applicable federal and ANSI specifications.
The following are general maintenance tips for providing long life and proper finish appearance.
Hinges must be free swinging without any binding. To align the hinges to prevent binding the use of shims is recommended, if
required. If the hinges begin to make noise, remove any binding conditions, grease or lubricate all moving parts, re-mount the
hinge and re-adjust the hinge with the proper shims.
The hinges come “greased” from the factory, but should be checked on a regular basis for lubrication. ASSA ABLOY recommends
that hinges used in commercial, high frequency applications or in extreme environmental conditions be lubricated annually to
ensure long life and quiet operation.
To lubricate our standard hinge, remove the pin and apply a generous coating of lithium grease and reinsert the pin by driving it
completely down to the shoulder of the pin head.
Hinges sized properly for the door weight, door size and frequency of use will last for a considerable period of time without
maintenance. Hinge screws should be periodically inspected for tightness.
Steel hinges are intended for use on interior applications only. Brass and Stainless steel hinges can be used for either interior or
exterior. All steel will eventually rust and all brass will eventually tarnish. To slow down the corrosion/tarnishing process, a clear
coat of lacquer is applied on the top surface of the steel or brass materials and the finish surface. Plated finishes receive a clear
coating of lacquer to protect against atmospheric conditions.
McKinney stainless steel hinges are made with 304 stainless steel material. Stainless steel is corrosion resistant, but not corrosion
proof. Because there is at least 10.5% of chromium in stainless steel hinges, oxidation can occur which could leads to the
appearance of “red rust”. This red rust could be caused from atmospheric conditions, when hinges are exposed to moist or marine
environments, chemical conditions, such as being exposed to high chloride chemicals cleaners, or contact with steel, copper or
other foreign materials. Never use steel wool to clean stainless steel hinges. Period cleaning is recommended to avoid seeing red
rust on the hinges. We recommend using a general purpose stainless steel cleaner.
Many anti-bacterial cleaners used to clean and sanitize door hardware contain high levels of chlorides which will cause corrosion
if not properly rinsed off. For additional corrosion protection, we recommend ordering stainless steel hinges with a clear powder
applied over the base metal, (CPC).
Hinges that come painted or plated are in accordance with ANSI/BHMA finishing standards and ASTM B-117 salt spray standards.
Caution should be used when installing the hinges to avoid damage to the painted or plated finish. To remove dirt, the use of a soft
damp cloth free any chemicals can be used. Abrasive cleaners or lacquer thinners should not be used to clean the surface of the
hinges. To do so will void any warranty of that product.
Any questions about our product, please call us at 1-800-346-7707.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. 29
', 4030, 1, ' product maintenance and care
 powder coat finishes

 base material mckinney/u.s. code finish description
 steel p primed for painting
 steel d3 dark bronze powder coat
 stainless steel 10be dark oxidized satin bronze, equivalent
 stainless steel bsp black suede powder coat
 stainless steel wsp white suede powder coat
 stainless steel cpc clear powder coat
 stainless steel 32dbio microshield agion antimicrobial

note: may not be available on macpro or rescue hardware.



product maintenance & care
the mckinney line of hinges are manufactured in compliance with all applicable federal and ansi specifications.
the following are general maintenance tips for providing long life and proper finish appearance.
hinges must be free swinging without any binding. to align the hinges to prevent binding the use of shims is recommended, if
required. if the hinges begin to make noise, remove any binding conditions, grease or lubricate all moving parts, re-mount the
hinge and re-adjust the hinge with the proper shims.
the hinges come “greased” from the factory, but should be checked on a regular basis for lubrication. assa abloy recommends
that hinges used in commercial, high frequency applications or in extreme environmental conditions be lubricated annually to
ensure long life and quiet operation.
to lubricate our standard hinge, remove the pin and apply a generous coating of lithium grease and reinsert the pin by driving it
completely down to the shoulder of the pin head.
hinges sized properly for the door weight, door size and frequency of use will last for a considerable period of time without
maintenance. hinge screws should be periodically inspected for tightness.
steel hinges are intended for use on interior applications only. brass and stainless steel hinges can be used for either interior or
exterior. all steel will eventually rust and all brass will eventually tarnish. to slow down the corrosion/tarnishing process, a clear
coat of lacquer is applied on the top surface of the steel or brass materials and the finish surface. plated finishes receive a clear
coating of lacquer to protect against atmospheric conditions.
mckinney stainless steel hinges are made with 304 stainless steel material. stainless steel is corrosion resistant, but not corrosion
proof. because there is at least 10.5% of chromium in stainless steel hinges, oxidation can occur which could leads to the
appearance of “red rust”. this red rust could be caused from atmospheric conditions, when hinges are exposed to moist or marine
environments, chemical conditions, such as being exposed to high chloride chemicals cleaners, or contact with steel, copper or
other foreign materials. never use steel wool to clean stainless steel hinges. period cleaning is recommended to avoid seeing red
rust on the hinges. we recommend using a general purpose stainless steel cleaner.
many anti-bacterial cleaners used to clean and sanitize door hardware contain high levels of chlorides which will cause corrosion
if not properly rinsed off. for additional corrosion protection, we recommend ordering stainless steel hinges with a clear powder
applied over the base metal, (cpc).
hinges that come painted or plated are in accordance with ansi/bhma finishing standards and astm b-117 salt spray standards.
caution should be used when installing the hinges to avoid damage to the painted or plated finish. to remove dirt, the use of a soft
damp cloth free any chemicals can be used. abrasive cleaners or lacquer thinners should not be used to clean the surface of the
hinges. to do so will void any warranty of that product.
any questions about our product, please call us at 1-800-346-7707.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. 29
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 30, 'Full Mortise Bearing Hinges
 Two Knuckle Standard Weight Series
 Recommended for standard weight, medium frequency doors, or doors with closing devices.

 • Full mortise bearing hinges are commonly used for the
 flush door/frame/wall application
 TA3331
 • Two knuckle design has a clean finished look
 • Specify right or left hand when ordering
 TA2731
 • Decorative tips are available
 • For available finishes see page 28




 No. ANSI Cross Reference Base Material Weight
 TA3331 A5112 Stainless STD Application
 TA2731 A8112 Steel STD



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 4" x 4" 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12 Options:

 5" x 41/2" 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 Code Description

 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 NRD Non-Removable Door –
 * 5" x 5" TA2731 Only one set screwed hinge
 furnished per set
 RC Round Corner – 1/4"
 radius furnished unless
 Decorative Tip Options (TA2731 only) specified otherwise
 FT Flat Tip SSF Safety Stud Feature
 FT RT
 RT Round Tip MM Magnetic Monitoring
 GT Grooved Tip QC ElectroLynx® hinge 4 or 8
 wire available
 LT Lined Tip
 GT LT KT CC Concealed Circuit 4 or 8
 KT Knurled Tip
 wire available
 Note: Not available on 3 2 " x 3 2" hinges
 1/ 1/




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-1 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1798, 1, 'full mortise bearing hinges
 two knuckle standard weight series
 recommended for standard weight, medium frequency doors, or doors with closing devices.

 • full mortise bearing hinges are commonly used for the
 flush door/frame/wall application
 ta3331
 • two knuckle design has a clean finished look
 • specify right or left hand when ordering
 ta2731
 • decorative tips are available
 • for available finishes see page 28




 no. ansi cross reference base material weight
 ta3331 a5112 stainless std application
 ta2731 a8112 steel std



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 4" x 4" 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12 options:

 5" x 41/2" 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 code description

 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 nrd non-removable door –
 * 5" x 5" ta2731 only one set screwed hinge
 furnished per set
 rc round corner – 1/4"
 radius furnished unless
 decorative tip options (ta2731 only) specified otherwise
 ft flat tip ssf safety stud feature
 ft rt
 rt round tip mm magnetic monitoring
 gt grooved tip qc electrolynx® hinge 4 or 8
 wire available
 lt lined tip
 gt lt kt cc concealed circuit 4 or 8
 kt knurled tip
 wire available
 note: not available on 3 2 " x 3 2" hinges
 1/ 1/




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-1 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 31, ' Full Mortise Bearing Hinges
Two Knuckle Heavy Weight Series
Recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • Use for the common flush door/frame/wall application TA3350
 • Heavy weight hinges should be used on all extra heavy
 TA3750
 doors or those exposed to high frequency use
 • Two knuckle design has a clean finished look
 • For Beveled Edge (where doors are beveled on hinge
 side) specify TA5350 or TA5750
 • Specify right or left hand when ordering
 • For available finishes see page 28


 Application

 No. ANSI Cross Reference Base Material Weight
 TA3350 A5111 Stainless HVY
 TA3750 A8111 Steel HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood Options:
 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 1 4 x 12
 1/ Code Description
 5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24 1 4 x 12
 1/ NRD Non-Removable Door –
 one set screwed hinge
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 1 4 x 12
 1/
 furnished per set
* 5" x 5" TA3750 Only
 RC Round Corner – 1/4"
 radius furnished unless
 specified otherwise
 SSF Safety Stud Feature
Approved for NFPA 80 fire rated openings
 MM Magnetic Monitoring
 QC ElectroLynx® hinge 4 or 8
 wire available
 CC Concealed Circuit 4 or 8
 wire available
 FT Flat Tip
 RT Round Tip
 GT Grooved Tip
 LT Lined Tip




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-2
', 1761, 1, ' full mortise bearing hinges
two knuckle heavy weight series
recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • use for the common flush door/frame/wall application ta3350
 • heavy weight hinges should be used on all extra heavy
 ta3750
 doors or those exposed to high frequency use
 • two knuckle design has a clean finished look
 • for beveled edge (where doors are beveled on hinge
 side) specify ta5350 or ta5750
 • specify right or left hand when ordering
 • for available finishes see page 28


 application

 no. ansi cross reference base material weight
 ta3350 a5111 stainless hvy
 ta3750 a8111 steel hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood options:
 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 1 4 x 12
 1/ code description
 5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24 1 4 x 12
 1/ nrd non-removable door –
 one set screwed hinge
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 1 4 x 12
 1/
 furnished per set
* 5" x 5" ta3750 only
 rc round corner – 1/4"
 radius furnished unless
 specified otherwise
 ssf safety stud feature
approved for nfpa 80 fire rated openings
 mm magnetic monitoring
 qc electrolynx® hinge 4 or 8
 wire available
 cc concealed circuit 4 or 8
 wire available
 ft flat tip
 rt round tip
 gt grooved tip
 lt lined tip




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-2
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 32, 'Full Mortise Bearing Hinges
 Three Knuckle Standard Weight Series
 The full mortise bearing hinge is recommended for standard weight, medium
 frequency doors, or doors with closing devices.

 • Use for the common flush door/frame/wall application TA314
 • Decorative tips are available
 TA714
 • For available finishes see page 28




 No. ANSI Cross Reference Base Material Weight
 TA314 A5112 Stainless STD
 TA314 A2112 Brass STD
 Application
 TA714 A8112 Steel STD



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 3 2" x 3 2"
 1/ 1/ *
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12 Options:

 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12 Code Description

 5" x 41/2"* 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 NRP Non-Removable Pin

 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 RC Round Corner – 1/4"
 radius furnished unless
 * Not available in Brass Base material specified otherwise
 HT Hospital Tip
 SSF Safety Stud Feature
 Decorative Tip Options
 QC ElectroLynx® Hinge –
 FT Flat Tip 4, 8 or 12 wire available
 FT RT
 RT Round Tip CC Concealed Circuit –
 GT Grooved Tip 4, 8 or 12 wire available

 LT Lined Tip CC-18 Concealed Circuit – 2, 4,
 GT LT KT 6, 8 or 10 wire available
 BT Ball Tip
 (2-18AWG wires and the
 ST Steeple Tip remainder 28AWG wires)
 KT Knurled Tip MM Magnetic Monitoring
 Note: Not available on 31/2 " x 31/2" hinges




 BT




 Steel & Stainless Approved for
 NFPA 80 fire rated openings


 ST


 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-3 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1939, 1, 'full mortise bearing hinges
 three knuckle standard weight series
 the full mortise bearing hinge is recommended for standard weight, medium
 frequency doors, or doors with closing devices.

 • use for the common flush door/frame/wall application ta314
 • decorative tips are available
 ta714
 • for available finishes see page 28




 no. ansi cross reference base material weight
 ta314 a5112 stainless std
 ta314 a2112 brass std
 application
 ta714 a8112 steel std



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 3 2" x 3 2"
 1/ 1/ *
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12 options:

 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12 code description

 5" x 41/2"* 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 nrp non-removable pin

 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 rc round corner – 1/4"
 radius furnished unless
 * not available in brass base material specified otherwise
 ht hospital tip
 ssf safety stud feature
 decorative tip options
 qc electrolynx® hinge –
 ft flat tip 4, 8 or 12 wire available
 ft rt
 rt round tip cc concealed circuit –
 gt grooved tip 4, 8 or 12 wire available

 lt lined tip cc-18 concealed circuit – 2, 4,
 gt lt kt 6, 8 or 10 wire available
 bt ball tip
 (2-18awg wires and the
 st steeple tip remainder 28awg wires)
 kt knurled tip mm magnetic monitoring
 note: not available on 31/2 " x 31/2" hinges




 bt




 steel & stainless approved for
 nfpa 80 fire rated openings


 st


 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-3 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 33, ' Full Mortise Bearing Hinges
Three Knuckle Heavy Weight Series
Recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • Heavy weight hinges should be used on all extra heavy
 doors or those exposed to high frequency use TA386
 • Use for the common flush door/frame/wall application TA786
 • Beveled Edge - where doors are beveled on hinge side
 specify TA5386 or TA5786
 • For available finishes see page 28
 • Decorative flat tips are available on 41/2" and 5"



 Application
 No. ANSI Cross Reference Base Material Weight
 TA386 A5111 Stainless HVY
 TA386 A2111 Brass HVY
 TA786 A8111 Steel HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood Options:
 41/2" x 4" 114.3 x 101.6 .180 8 1/
 2 x 12-24 11/4 x 12 Code Description
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 NRP Non-Removable Pin
 5" x 41/2" 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 RC Round Corner – 1/4"
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 specified otherwise
 6" x 5"* 152.4 x 127 .203 10 1/
 2 x 1⁄4 -20 11/2 x 14
 HT Hospital Tip
 6" x 6"* 152.4 x 152.4 .203 10 1/
 2 x 1⁄4 -20 11/2 x 14
 SSF Safety Stud Feature
* Not available in Brass Base material. QC ElectroLynx® Hinge –
 4, 8 or 12 wire available
 CC Concealed Circuit –
 4, 8 or 12 wire available
 CC-18 Concealed Circuit –2, 4,
 6, 8 or 10 wire available
 (2-18AWG wires and the
 remainder 28AWG wires)
Steel & Stainless Approved for MM Magnetic Monitoring
NFPA 80 fire rated openings
 FT Flat Tip
 BT Ball Tip
 RT Round Tip
 GT Grooved Tip
 LT Lined Tip
 KT Knurled Tip




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-4
', 2042, 1, ' full mortise bearing hinges
three knuckle heavy weight series
recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • heavy weight hinges should be used on all extra heavy
 doors or those exposed to high frequency use ta386
 • use for the common flush door/frame/wall application ta786
 • beveled edge - where doors are beveled on hinge side
 specify ta5386 or ta5786
 • for available finishes see page 28
 • decorative flat tips are available on 41/2" and 5"



 application
 no. ansi cross reference base material weight
 ta386 a5111 stainless hvy
 ta386 a2111 brass hvy
 ta786 a8111 steel hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood options:
 41/2" x 4" 114.3 x 101.6 .180 8 1/
 2 x 12-24 11/4 x 12 code description
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 nrp non-removable pin
 5" x 41/2" 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 rc round corner – 1/4"
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 specified otherwise
 6" x 5"* 152.4 x 127 .203 10 1/
 2 x 1⁄4 -20 11/2 x 14
 ht hospital tip
 6" x 6"* 152.4 x 152.4 .203 10 1/
 2 x 1⁄4 -20 11/2 x 14
 ssf safety stud feature
* not available in brass base material. qc electrolynx® hinge –
 4, 8 or 12 wire available
 cc concealed circuit –
 4, 8 or 12 wire available
 cc-18 concealed circuit –2, 4,
 6, 8 or 10 wire available
 (2-18awg wires and the
 remainder 28awg wires)
steel & stainless approved for mm magnetic monitoring
nfpa 80 fire rated openings
 ft flat tip
 bt ball tip
 rt round tip
 gt grooved tip
 lt lined tip
 kt knurled tip




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-4
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 34, 'Full Mortise Institutional Hinges
 Three Knuckle Hospital Tip Heavy Weight Series
 Recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where security requirements exist.

 • Institutional hinges feature hospital tipped ends and HTA386
 concealed bearing assemblies
 HTA786
 • The prison safety feature is available on
 non-electric hinges
 • Heavy weight hinges should be used on all extra
 heavy doors or those exposed to high frequency use Shown with optional
 prison safety feature
 • Use for the common flush door/frame/wall application (4½ x 4½ size only)
 • Beveled Edge - where doors are beveled on hinge side
 specify HTA5386 or HTA5786
 • Torx Pin Head Fasteners Available
 • For available finishes see page 28
 Application
 No. ANSI Cross Reference Base Material Weight
 HTA386 A5111 Stainless HVY
 HTA786 A8111 Steel HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 Options:
 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
 Code Description
 5" x 41/2"* 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12
 PSF Prison Safety Feature
 * Not Available with PSF option. MM Magnetic Monitoring*
 QC ElectroLynx® Hinge –
 4, 8 or 12 wire available.
 (12 wire not available
 with PSF)
 CC Concealed Circuit –
 4, 8 or 12 wire available.
 (12 wire not available
 with PSF)


 Approved for NFPA 80 fire rated openings * Not Available with PSF option.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-5 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1822, 1, 'full mortise institutional hinges
 three knuckle hospital tip heavy weight series
 recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where security requirements exist.

 • institutional hinges feature hospital tipped ends and hta386
 concealed bearing assemblies
 hta786
 • the prison safety feature is available on
 non-electric hinges
 • heavy weight hinges should be used on all extra
 heavy doors or those exposed to high frequency use shown with optional
 prison safety feature
 • use for the common flush door/frame/wall application (4½ x 4½ size only)
 • beveled edge - where doors are beveled on hinge side
 specify hta5386 or hta5786
 • torx pin head fasteners available
 • for available finishes see page 28
 application
 no. ansi cross reference base material weight
 hta386 a5111 stainless hvy
 hta786 a8111 steel hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 options:
 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
 code description
 5" x 41/2"* 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12
 psf prison safety feature
 * not available with psf option. mm magnetic monitoring*
 qc electrolynx® hinge –
 4, 8 or 12 wire available.
 (12 wire not available
 with psf)
 cc concealed circuit –
 4, 8 or 12 wire available.
 (12 wire not available
 with psf)


 approved for nfpa 80 fire rated openings * not available with psf option.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-5 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 35, ' Swing Clear Full Mortise Bearing Hinges
Three Knuckle Heavy Weight Series (Reversible)
Recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • Hinge allows for maximum clearance for passage of beds,
 tables or other equipment through doorway
 TA795
 • Pressed steel jambs require no special reinforcing
 • Steel base materials
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify TA5795
 • For available finishes see page 28




 No. ANSI Cross Reference Base Material Weight
 TA795 A8121 Steel HVY Application




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 4 "
 1/
 2 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
 5" 127 .190 8 1/
 2 x 12-24 11/4 x 12

Note: The pin is held in place by an NRP set screw which allows the hinge to be reversible.




 Options:
 Code Description
 HT Hospital Tip




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-6
', 1339, 1, ' swing clear full mortise bearing hinges
three knuckle heavy weight series (reversible)
recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

 • hinge allows for maximum clearance for passage of beds,
 tables or other equipment through doorway
 ta795
 • pressed steel jambs require no special reinforcing
 • steel base materials
 • for beveled edge, where doors are beveled on hinge 
 side, specify ta5795
 • for available finishes see page 28




 no. ansi cross reference base material weight
 ta795 a8121 steel hvy application




 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 4 "
 1/
 2 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
 5" 127 .190 8 1/
 2 x 12-24 11/4 x 12

note: the pin is held in place by an nrp set screw which allows the hinge to be reversible.




 options:
 code description
 ht hospital tip




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-6
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 36, 'Full Mortise Plain Bearing Hinges
 Five Knuckle Standard Weight Series
 The full mortise plain bearing hinge is recommended for low frequency doors.

 • Use for the common flush door/frame/wall application
 T2314
 • Available on the QuickShip program
 • T2314 stainless steel base material – For available finishes
 T2714
 see page 28
 • T2714 steel base material – For available finishes see
 page 28
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify T4314 or T4714



 No. ANSI Cross Reference Base Material Weight Application

 T2314 A5133 Stainless STD
 T2714 A8133 Steel STD



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 3 2" x 3 2"*
 1/ 1/
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4" 114.3 x 114.3 .130 8 1/
 2 x 12-24 11/4 x 12 Options:

 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .134 8 1/
 2 x 12-24 1 4 x 12
 1/ Code Description

 5" x 41/2" 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 NRP Non-Removable Pin

 5" x 5" 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 RC Round Corner – 1/4"
 *Available with reverse hole pattern. radius furnished unless
 Not available in brass base. specified otherwise
 HT Hospital Tip
 BT Ball Tip
 ST Steeple Tip
 SSF Safety Stud Feature



 McKinney Hinge Pin Door Stop
 • Recommended for high-use or high impact doors with McKinney T2714
 or TA2714 hinges
 • Protects against damage to doors and walls
 • Runs the full length of the hinge

 Part number Description Finish
 76305 Hinge Pin Stop for MacPro MP79 & MPB79 26D
 76306 Hinge Pin Stop for McKinney T2714 & TA2714 26D
 76307 Hinge Pin Stop for MacPro MP79 & MPB79 BSP
 76308 Hinge Pin Stop for McKinney T2714 & TA2714 BSP




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-7 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2028, 1, 'full mortise plain bearing hinges
 five knuckle standard weight series
 the full mortise plain bearing hinge is recommended for low frequency doors.

 • use for the common flush door/frame/wall application
 t2314
 • available on the quickship program
 • t2314 stainless steel base material – for available finishes
 t2714
 see page 28
 • t2714 steel base material – for available finishes see
 page 28
 • for beveled edge, where doors are beveled on hinge 
 side, specify t4314 or t4714



 no. ansi cross reference base material weight application

 t2314 a5133 stainless std
 t2714 a8133 steel std



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 3 2" x 3 2"*
 1/ 1/
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4" 114.3 x 114.3 .130 8 1/
 2 x 12-24 11/4 x 12 options:

 4 2" x 4 2"
 1/ 1/
 114.3 x 114.3 .134 8 1/
 2 x 12-24 1 4 x 12
 1/ code description

 5" x 41/2" 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12 nrp non-removable pin

 5" x 5" 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 rc round corner – 1/4"
 *available with reverse hole pattern. radius furnished unless
 not available in brass base. specified otherwise
 ht hospital tip
 bt ball tip
 st steeple tip
 ssf safety stud feature



 mckinney hinge pin door stop
 • recommended for high-use or high impact doors with mckinney t2714
 or ta2714 hinges
 • protects against damage to doors and walls
 • runs the full length of the hinge

 part number description finish
 76305 hinge pin stop for macpro mp79 & mpb79 26d
 76306 hinge pin stop for mckinney t2714 & ta2714 26d
 76307 hinge pin stop for macpro mp79 & mpb79 bsp
 76308 hinge pin stop for mckinney t2714 & ta2714 bsp




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-7 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 37, ' Full Mortise Bearing Hinges
Five Knuckle Standard Weight Series
Recommended for standard weight, medium frequency doors, or doors with closing devices.
 • Use for common flush door/frame/wall applications
 • For Beveled Edge, where doors are beveled on hinge side, specify TA4314 or TA4714
 • For available finishes see page 28 TA2314
 No. ANSI Cross Reference Base Material Weight TA2714
 TA2314 A5112 Stainless STD
 TA2314 A2112 Brass STD
 TA2714 A8112 Steel STD

 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 Application
 3 2" x 3 2"*
 1/ 1/
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 4 2" x 4"
 1/
 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 5" x 4 2"*
 1/
 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12
 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12
 6" x 6"* 152.4 x 152.4 .160 10 1/
 2 x 1/4 -20 11/2 x 14
* Not available in Brass base material.

Options:

 Code Description Code Description Code Description
 NRP Non-Removable Pin GT Grooved Tip* MM Magnetic Monitoring
 TB Ball Bearing LT Lined Tip* QC ElectroLynx® Hinge –
 4, 8 or 12
 TCA Concealed Bearing RT Round Tip* wire available
 RC Round Corner – 4" 1/
 ST Steeple Tip CC Concealed Circuit –
 radius furnished unless 4, 8 or 12 wire available
 specified otherwise KT Knurled Tip

 HT Hospital Tip SSF Safety Stud Feature

 BT Ball Tip CC-18 Concealed Circuit – 2, 4,
 6, 8 or 10 wire available
 FT Flat Tip* (2-18AWG wires and the
 remainder 28AWG wires)
*Not available on 3-1/2" and 6" sizes
 Steel & Stainless Approved for NFPA 80 fire rated openings

 McKinney Hinge Pin Door Stop
 • Recommended for high-use or high impact doors with McKinney T2714 or TA2714 hinges
 • Protects against damage to doors and walls
 • Runs the full length of the hinge
 Part number Description Finish
 76305 Hinge Pin Stop for MacPro MP79 & MPB79 26D
 76306 Hinge Pin Stop for McKinney T2714 & TA2714 26D
 76307 Hinge Pin Stop for MacPro MP79 & MPB79 BSP
 76308 Hinge Pin Stop for McKinney T2714 & TA2714 BSP




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-8
', 2463, 1, ' full mortise bearing hinges
five knuckle standard weight series
recommended for standard weight, medium frequency doors, or doors with closing devices.
 • use for common flush door/frame/wall applications
 • for beveled edge, where doors are beveled on hinge side, specify ta4314 or ta4714
 • for available finishes see page 28 ta2314
 no. ansi cross reference base material weight ta2714
 ta2314 a5112 stainless std
 ta2314 a2112 brass std
 ta2714 a8112 steel std

 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 application
 3 2" x 3 2"*
 1/ 1/
 88.9 x 88.9 .123 6 1/
 2 x 10-24 1 x 10
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 4 2" x 4"
 1/
 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 5" x 4 2"*
 1/
 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12
 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12
 6" x 6"* 152.4 x 152.4 .160 10 1/
 2 x 1/4 -20 11/2 x 14
* not available in brass base material.

options:

 code description code description code description
 nrp non-removable pin gt grooved tip* mm magnetic monitoring
 tb ball bearing lt lined tip* qc electrolynx® hinge –
 4, 8 or 12
 tca concealed bearing rt round tip* wire available
 rc round corner – 4" 1/
 st steeple tip cc concealed circuit –
 radius furnished unless 4, 8 or 12 wire available
 specified otherwise kt knurled tip

 ht hospital tip ssf safety stud feature

 bt ball tip cc-18 concealed circuit – 2, 4,
 6, 8 or 10 wire available
 ft flat tip* (2-18awg wires and the
 remainder 28awg wires)
*not available on 3-1/2" and 6" sizes
 steel & stainless approved for nfpa 80 fire rated openings

 mckinney hinge pin door stop
 • recommended for high-use or high impact doors with mckinney t2714 or ta2714 hinges
 • protects against damage to doors and walls
 • runs the full length of the hinge
 part number description finish
 76305 hinge pin stop for macpro mp79 & mpb79 26d
 76306 hinge pin stop for mckinney t2714 & ta2714 26d
 76307 hinge pin stop for macpro mp79 & mpb79 bsp
 76308 hinge pin stop for mckinney t2714 & ta2714 bsp




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-8
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 38, 'Full Mortise Concealed Bearing Hinges
 Five Knuckle Standard Weight Series
 Recommended for standard weight, medium frequency doors, or doors with closing devices.

 • Concealed Bearing
 • Use for common flush door/frame/wall applications TCA2314
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify TCA4314 or TCA4714
 TCA2714
 • For available finishes see page 28


 No. ANSI Cross Reference Base Material Weight
 TCA2314 A5112 Stainless STD
 TCA2714 A8112 Steel STD
 Application




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 41/2" x 4"* 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2"* 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 5" x 41/2"* 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12
 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 Options:
 Code Description
 * Not available in Brass base material.
 NRP Non-Removable Pin
 RC Round Corner – 1/4"
 radius furnished unless
 specified otherwise
 HT Hospital Tip
 BT Ball Tip
 ST Steeple Tip
 SSF Safety Stud Feature
 QC ElectroLynx® Hinge –
 4, 8 or 12 wire available
 CC Concealed Circuit –
 4, 8 or 12 wire available
 Approved for NFPA 80 fire rated openings
 CC-18 Concealed Circuit – 2, 4,
 6, 8 or 10 wire available
 (2-18AWG wires and the
 remainder 28AWG wires)
 MM Magnetic Monitoring




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-9 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1669, 1, 'full mortise concealed bearing hinges
 five knuckle standard weight series
 recommended for standard weight, medium frequency doors, or doors with closing devices.

 • concealed bearing
 • use for common flush door/frame/wall applications tca2314
 • for beveled edge, where doors are beveled on hinge 
 side, specify tca4314 or tca4714
 tca2714
 • for available finishes see page 28


 no. ansi cross reference base material weight
 tca2314 a5112 stainless std
 tca2714 a8112 steel std
 application




 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 41/2" x 4"* 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2"* 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 5" x 41/2"* 127 x 114.3 .146 8 1/
 2 x 12-24 11/4 x 12
 5" x 5"* 127 x 127 .146 8 1/
 2 x 12-24 11/4 x 12 options:
 code description
 * not available in brass base material.
 nrp non-removable pin
 rc round corner – 1/4"
 radius furnished unless
 specified otherwise
 ht hospital tip
 bt ball tip
 st steeple tip
 ssf safety stud feature
 qc electrolynx® hinge –
 4, 8 or 12 wire available
 cc concealed circuit –
 4, 8 or 12 wire available
 approved for nfpa 80 fire rated openings
 cc-18 concealed circuit – 2, 4,
 6, 8 or 10 wire available
 (2-18awg wires and the
 remainder 28awg wires)
 mm magnetic monitoring




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-9 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 39, ' Wide Throw Full Mortise Bearing Hinges
Five Knuckle Standard Weight Series
Wide throw hinges are utilized where a door is recessed from the face of the frame.


 • The wide throw full mortise bearing hinge is
 recommended for use on standard weight, medium
 TA2398
 frequency doors where it is necessary to open the door TA2798
 around a large reveal
 • For information on calculating the proper width of a wide
 throw hinge see page 16
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify TA4398 or TA4798
 • For available finishes see page 28

 Application

 No. ANSI Cross Reference Base Material Weight
 TA2398 A5112 Stainless STD
 TA2798 A8112 Steel STD



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 3 2" x 5"
 1/
 88.9 x 127 .123 6 1/
 2 x 10-24 1 x 10 Options:
 31/2" x 6" 88.9 x 152.4 .123 6 1/
 2 x 10-24 1 x 10 Code Description
 4" x 6" 101.6 x 152.4 .130 8 1/
 2 x 12-24 11/4 x 12 NRP Non-Removable Pin
 41/2" x 5" 114.3 x 127 .134 8 1/
 2 x 12-24 11/4 x 12 TB Ball Bearing
 41/2" x 6" 114.3 x 152.4 .134 8 1/
 2 x 12-24 11/4 x 12 TCA Concealed Bearing

 41/2" x 7" 114.3 x 177.8 .134 8 1/
 2 x 12-24 11/4 x 12 RC Round Corner – 1/4"
 radius furnished unless
 41/2" x 8" 114.3 x 203.2 .134 8 1/
 2 x 12-24 11/4 x 12
 specified otherwise
 5" x 7" 127 x 177.8 .146 8 1/
 2 x 12-24 11/4 x 12 HT Hospital Tip
 BT Ball Tip
 ST Steeple Tip
 SSF Safety Stud Feature
Approved for NFPA 80 fire rated openings QC ElectroLynx® Hinge –
 4, 8 or 12 wire available*


 CC Concealed Circuit –
 4, 8 or 12 wire available*
 CC-18 Concealed Circuit –
 2, 4, 6, 8 or 10 wire
 available (2-18AWG
 wires and the remainder
 28AWG wires)*
 MM Magnetic Monitoring
 * Maximum 6" width.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-10
', 2077, 1, ' wide throw full mortise bearing hinges
five knuckle standard weight series
wide throw hinges are utilized where a door is recessed from the face of the frame.


 • the wide throw full mortise bearing hinge is
 recommended for use on standard weight, medium
 ta2398
 frequency doors where it is necessary to open the door ta2798
 around a large reveal
 • for information on calculating the proper width of a wide
 throw hinge see page 16
 • for beveled edge, where doors are beveled on hinge 
 side, specify ta4398 or ta4798
 • for available finishes see page 28

 application

 no. ansi cross reference base material weight
 ta2398 a5112 stainless std
 ta2798 a8112 steel std



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 3 2" x 5"
 1/
 88.9 x 127 .123 6 1/
 2 x 10-24 1 x 10 options:
 31/2" x 6" 88.9 x 152.4 .123 6 1/
 2 x 10-24 1 x 10 code description
 4" x 6" 101.6 x 152.4 .130 8 1/
 2 x 12-24 11/4 x 12 nrp non-removable pin
 41/2" x 5" 114.3 x 127 .134 8 1/
 2 x 12-24 11/4 x 12 tb ball bearing
 41/2" x 6" 114.3 x 152.4 .134 8 1/
 2 x 12-24 11/4 x 12 tca concealed bearing

 41/2" x 7" 114.3 x 177.8 .134 8 1/
 2 x 12-24 11/4 x 12 rc round corner – 1/4"
 radius furnished unless
 41/2" x 8" 114.3 x 203.2 .134 8 1/
 2 x 12-24 11/4 x 12
 specified otherwise
 5" x 7" 127 x 177.8 .146 8 1/
 2 x 12-24 11/4 x 12 ht hospital tip
 bt ball tip
 st steeple tip
 ssf safety stud feature
approved for nfpa 80 fire rated openings qc electrolynx® hinge –
 4, 8 or 12 wire available*


 cc concealed circuit –
 4, 8 or 12 wire available*
 cc-18 concealed circuit –
 2, 4, 6, 8 or 10 wire
 available (2-18awg
 wires and the remainder
 28awg wires)*
 mm magnetic monitoring
 * maximum 6" width.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-10
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 40, 'Full Mortise Bearing Hinges
 Five Knuckle Heavy Weight Full Mortise Series
 Recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where heavy traffic is experienced.

 • Heavy weight hinges should be used on all extra heavy T4A3386
 doors or those exposed to high frequency use
 T4A3786
 • T4A3386- Stainless steel base or available in brass base
 material polished
 • T4A3786- Steel base material
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify T4A4386 or T4A4786
 • For available finishes see page 28

 Note: 8" x 6" and 8" x 8" have six bearings. Specify T6B3386 or T6B3786. Application



 No. ANSI Cross Reference Base Material Weight
 T4A3386 A5111 Stainless HVY
 T4A3386 A2111 Brass HVY
 T4A3786 A8111 Steel HVY



 Specifications Options:
 Fasteners Code Description
 No. of
 Inches mm Gauge Holes Machine Wood NRP Non-Removable Pin
 41/2" x 4" 114.3 x 101.6 .180 8 1/
 2 x 12-24 11/4 x 12 T4B Ball Bearing
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 TCA Concealed Bearing
 5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24 1 4 x 12
 1/
 RC Round Corner – 1/4"
 radius furnished unless
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12
 specified otherwise
 6" x 5"* 152.4 x 127 .203 10 1/
 2 x 1/4 -20 11/2 x 14
 HT Hospital Tip
 6" x 6"* 152.4 x 152.4 .203 10 1/
 2 x 1/4 -20 11/2 x 14
 BT**** Ball Tip
 8" x 6"** 203.2 x 125.4 .203 16 1/
 2 x 1/4 -20 11/2 x 14
 FT **** Flat Tip
 8" x 8"*** 203.2 x 203.2 .203 16 1/
 2 x 1/4 -20 11/2 x 14
 ST**** Steeple Tip

 * Not available in brass base material. KT Knurled Tip
 ** Available in steel only. SSF Safety Stud Feature
 ***Available in stainless steel only.
 ****FT tips not offered on 6" and 8" sizes, BT and ST not offered on 8" sizes. RB Raised Barrel*
 QC ElectroLynx® Hinge –
 4, 8 or 12 wire available
 CC Concealed Circuit –
 4, 8 or 12 wire available
 CC-18 Concealed Circuit – 2, 4,
 Steel & Stainless Approved for 6, 8 or 10 wire available
 NFPA 80 fire rated openings (2-18AWG wires and the
 remainder 28AWG wires)
 MM Magnetic Monitoring
 * Refer to page SP-3 for Raised Barrel.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-11 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2517, 1, 'full mortise bearing hinges
 five knuckle heavy weight full mortise series
 recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where heavy traffic is experienced.

 • heavy weight hinges should be used on all extra heavy t4a3386
 doors or those exposed to high frequency use
 t4a3786
 • t4a3386- stainless steel base or available in brass base
 material polished
 • t4a3786- steel base material
 • for beveled edge, where doors are beveled on hinge 
 side, specify t4a4386 or t4a4786
 • for available finishes see page 28

 note: 8" x 6" and 8" x 8" have six bearings. specify t6b3386 or t6b3786. application



 no. ansi cross reference base material weight
 t4a3386 a5111 stainless hvy
 t4a3386 a2111 brass hvy
 t4a3786 a8111 steel hvy



 specifications options:
 fasteners code description
 no. of
 inches mm gauge holes machine wood nrp non-removable pin
 41/2" x 4" 114.3 x 101.6 .180 8 1/
 2 x 12-24 11/4 x 12 t4b ball bearing
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 tca concealed bearing
 5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24 1 4 x 12
 1/
 rc round corner – 1/4"
 radius furnished unless
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12
 specified otherwise
 6" x 5"* 152.4 x 127 .203 10 1/
 2 x 1/4 -20 11/2 x 14
 ht hospital tip
 6" x 6"* 152.4 x 152.4 .203 10 1/
 2 x 1/4 -20 11/2 x 14
 bt**** ball tip
 8" x 6"** 203.2 x 125.4 .203 16 1/
 2 x 1/4 -20 11/2 x 14
 ft **** flat tip
 8" x 8"*** 203.2 x 203.2 .203 16 1/
 2 x 1/4 -20 11/2 x 14
 st**** steeple tip

 * not available in brass base material. kt knurled tip
 ** available in steel only. ssf safety stud feature
 ***available in stainless steel only.
 ****ft tips not offered on 6" and 8" sizes, bt and st not offered on 8" sizes. rb raised barrel*
 qc electrolynx® hinge –
 4, 8 or 12 wire available
 cc concealed circuit –
 4, 8 or 12 wire available
 cc-18 concealed circuit – 2, 4,
 steel & stainless approved for 6, 8 or 10 wire available
 nfpa 80 fire rated openings (2-18awg wires and the
 remainder 28awg wires)
 mm magnetic monitoring
 * refer to page sp-3 for raised barrel.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-11 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 41, ' Full Mortise Concealed Bearing Hinges
Five Knuckle Heavy Weight Full Mortise Series
Recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

Concealed Bearing TCA3386
 • Heavy weight hinges should be used on all extra heavy
 TCA3786
 doors or those exposed to high frequency use
 • TCA3386 – Stainless steel base
 • TCA3786 – Steel base material
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify TCA4386 or TCA4786
 • For available finishes see page 28

 Application



 No. ANSI Cross Reference Base Material Weight
 TCA3386 A5111 Stainless HVY
 TCA3786 A8111 Steel HVY




 Specifications
 Fasteners Options:
 No. of
 Inches mm Gauge Holes Machine Wood Code Description
 4 2" x 4"*
 1/
 114.3 x 101.6 .180 8 1/
 2 x 12-24 1 4 x 12
 1/
 NRP Non-Removable Pin
 4 2" x 4 2"*
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 1 4 x 12
 1/
 RC Round Corner – 1/4"
 5" x 41/2"* 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 specified otherwise
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12
 HT Hospital Tip

* Not available in brass base material. BT Ball Tip
 ST Steeple Tip
 SSF Safety Stud Feature
 QC ElectroLynx® Hinge –
Approved for NFPA 80 fire rated openings 4, 8 or 12 wire available
 CC Concealed Circuit –
 4, 8 or 12 wire available
 CC-18 Concealed Circuit – 2, 4,
 6, 8 or 10 wire available
 (2-18AWG wires and the
 remainder 28AWG wires)
 MM Magnetic Monitoring




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-12
', 1871, 1, ' full mortise concealed bearing hinges
five knuckle heavy weight full mortise series
recommended for use on high frequency and/or heavy wood or metal doors in
schools, hospitals or other public buildings where heavy traffic is experienced.

concealed bearing tca3386
 • heavy weight hinges should be used on all extra heavy
 tca3786
 doors or those exposed to high frequency use
 • tca3386 – stainless steel base
 • tca3786 – steel base material
 • for beveled edge, where doors are beveled on hinge 
 side, specify tca4386 or tca4786
 • for available finishes see page 28

 application



 no. ansi cross reference base material weight
 tca3386 a5111 stainless hvy
 tca3786 a8111 steel hvy




 specifications
 fasteners options:
 no. of
 inches mm gauge holes machine wood code description
 4 2" x 4"*
 1/
 114.3 x 101.6 .180 8 1/
 2 x 12-24 1 4 x 12
 1/
 nrp non-removable pin
 4 2" x 4 2"*
 1/ 1/
 114.3 x 114.3 .180 8 1/
 2 x 12-24 1 4 x 12
 1/
 rc round corner – 1/4"
 5" x 41/2"* 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 specified otherwise
 5" x 5"* 127 x 127 .190 8 1/
 2 x 12-24 11/4 x 12
 ht hospital tip

* not available in brass base material. bt ball tip
 st steeple tip
 ssf safety stud feature
 qc electrolynx® hinge –
approved for nfpa 80 fire rated openings 4, 8 or 12 wire available
 cc concealed circuit –
 4, 8 or 12 wire available
 cc-18 concealed circuit – 2, 4,
 6, 8 or 10 wire available
 (2-18awg wires and the
 remainder 28awg wires)
 mm magnetic monitoring




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-12
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 42, 'Wide Throw Full Mortise Bearing Hinges
 Five Knuckle Heavy Weight Wide Throw Series
 Recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where heavy traffic is experienced
 and it is necessary to open the door around a large reveal.
 T4A3386
 • Heavy weight hinges should be used on all extra heavy
 T4A3786
 doors or those exposed to high frequency use
 • T4A3386 – Stainless steel base
 • T4A3786 – Steel base material
 • For Beveled Edge, where doors are beveled on hinge 
 side, specify T4A4386 or TA4786
 • For available finishes see page 28
 Application




 No. ANSI Cross Reference Base Material Weight
 T4A3386 A5111 Stainless HVY
 T4A3786 A8111 Steel HVY




 Specifications
 Fasteners
 No. of Options:
 Inches mm Gauge Holes Machine Wood
 Code Description
 41/2" x 5" 114.3 x 127 .180 8 1/
 2 x 12-24 11/4 x 12
 NRP Non-Removable Pin
 41/2" x 6" 114.3 x 152.4 .180 6 1/
 2 x 10-24 11/4 x 12
 T4B Ball Bearing
 41/2" x 7" 114.3 x 177.8 .180 8 1/
 2 x 12-24 11/4 x 12
 TCA Concealed Bearing
 41/2" x 8" 114.3 x 203.2 .180 8 1/
 2 x 12-24 11/4 x 12
 RC Round Corner – 1/4"
 5" x 6" 127 x 152.4 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 5" x 7" 127 X 177.8 .190 8 1/
 2 x 12-24 11/4 x 12 specified otherwise

 5" x 8" 127 X 203.2 .190 8 1/
 2 x 12-24 11/4 x 12 HT Hospital Tip
 BT Ball Tip
 ST Steeple Tip
 SSF Safety Stud Feature
 QC ElectroLynx® Hinge –
 4, 8 or 12 wire available*
 CC Concealed Circuit –
 Approved for NFPA 80 fire rated openings 4, 8 or 12 wire available*
 MM Magnetic Monitoring

 * QC and CC options available on
 hinges up to 6" wide.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-13 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2010, 1, 'wide throw full mortise bearing hinges
 five knuckle heavy weight wide throw series
 recommended for use on high frequency and/or heavy wood or metal doors in
 schools, hospitals or other public buildings where heavy traffic is experienced
 and it is necessary to open the door around a large reveal.
 t4a3386
 • heavy weight hinges should be used on all extra heavy
 t4a3786
 doors or those exposed to high frequency use
 • t4a3386 – stainless steel base
 • t4a3786 – steel base material
 • for beveled edge, where doors are beveled on hinge 
 side, specify t4a4386 or ta4786
 • for available finishes see page 28
 application




 no. ansi cross reference base material weight
 t4a3386 a5111 stainless hvy
 t4a3786 a8111 steel hvy




 specifications
 fasteners
 no. of options:
 inches mm gauge holes machine wood
 code description
 41/2" x 5" 114.3 x 127 .180 8 1/
 2 x 12-24 11/4 x 12
 nrp non-removable pin
 41/2" x 6" 114.3 x 152.4 .180 6 1/
 2 x 10-24 11/4 x 12
 t4b ball bearing
 41/2" x 7" 114.3 x 177.8 .180 8 1/
 2 x 12-24 11/4 x 12
 tca concealed bearing
 41/2" x 8" 114.3 x 203.2 .180 8 1/
 2 x 12-24 11/4 x 12
 rc round corner – 1/4"
 5" x 6" 127 x 152.4 .190 8 1/
 2 x 12-24 11/4 x 12 radius furnished unless
 5" x 7" 127 x 177.8 .190 8 1/
 2 x 12-24 11/4 x 12 specified otherwise

 5" x 8" 127 x 203.2 .190 8 1/
 2 x 12-24 11/4 x 12 ht hospital tip
 bt ball tip
 st steeple tip
 ssf safety stud feature
 qc electrolynx® hinge –
 4, 8 or 12 wire available*
 cc concealed circuit –
 approved for nfpa 80 fire rated openings 4, 8 or 12 wire available*
 mm magnetic monitoring

 * qc and cc options available on
 hinges up to 6" wide.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-13 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 43, ' Swing Clear Full Mortise Bearing Hinges
Five Knuckle Standard Weight Swing Clear Series (Reversible)
Swing Clear Hinges create barrier free openings by moving the hinge barrel
and door edge out of the way.

 • Recommended for use on standard weight, medium
 frequency doors in schools, hospitals or other TA2395
 public buildings TA2895
 • Hinge allows for maximum clearance for passage of 
 beds, tables or other equipment through the doorway
 • Meets ADA Requirements and ANSI A117.1-1986
 • Pressed steel jambs require no special reinforcing
 • Pin is held in place by an NRP set screw, which allows
 the hinge to be reversible
 • For Beveled Edge, where doors are beveled on hinge 
 Application
 side, specify TA4895 or TA4395
 • For available finishes see page 28




 No. ANSI Cross Reference Base Material Weight
 TA2395 N/A Stainless STD
 TA2895 A8122 Steel STD



 Specifications
 Fasteners
 No. of Options:
 Inches mm Gauge Holes Machine Wood
 Code Description
 41/2" 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 TB Ball Bearing
 5"* 127 .146 8 1/
 2 x 12-24 11/2 x 12
 HT Hospital Tip

*Not Available with electric options QC ElectroLynx® Hinge –
 4, 8 or 12 wire available
 in 4-1/2" US26D and
 US32D only
 CC Concealed Circuit –
Approved for NFPA 80 fire rated openings 4, 8 or 12 wire available
 in 4-1/2" US26D and
 US32D only




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-14
', 1696, 1, ' swing clear full mortise bearing hinges
five knuckle standard weight swing clear series (reversible)
swing clear hinges create barrier free openings by moving the hinge barrel
and door edge out of the way.

 • recommended for use on standard weight, medium
 frequency doors in schools, hospitals or other ta2395
 public buildings ta2895
 • hinge allows for maximum clearance for passage of 
 beds, tables or other equipment through the doorway
 • meets ada requirements and ansi a117.1-1986
 • pressed steel jambs require no special reinforcing
 • pin is held in place by an nrp set screw, which allows
 the hinge to be reversible
 • for beveled edge, where doors are beveled on hinge 
 application
 side, specify ta4895 or ta4395
 • for available finishes see page 28




 no. ansi cross reference base material weight
 ta2395 n/a stainless std
 ta2895 a8122 steel std



 specifications
 fasteners
 no. of options:
 inches mm gauge holes machine wood
 code description
 41/2" 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
 tb ball bearing
 5"* 127 .146 8 1/
 2 x 12-24 11/2 x 12
 ht hospital tip

*not available with electric options qc electrolynx® hinge –
 4, 8 or 12 wire available
 in 4-1/2" us26d and
 us32d only
 cc concealed circuit –
approved for nfpa 80 fire rated openings 4, 8 or 12 wire available
 in 4-1/2" us26d and
 us32d only




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-14
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 44, 'Swing Clear Full Mortise Bearing Hinges
 Five Knuckle Heavy Weight Swing Clear Series (Reversible)
 Swing Clear Hinges create barrier free openings by moving the hinge barrel
 and door edge out of the way.

 • Recommended for use on high frequency and/or heavy T4A3395
 wood or metal doors in schools, hospitals or other 
 public buildings where heavy traffic is experienced T4A3795
 • Hinge allows for maximum clearance for passage of 
 beds, tables or other equipment through the doorway
 • Meets ADA Requirements and ANSI A117.1-1986
 • Pressed steel jambs require no special reinforcing
 • Pin is held in place by an NRP set screw, which allows
 the hinge to be reversible
 • For Beveled Edge, where doors are beveled in hinge
 Application
 side, specify T4A4395 or T4A4795
 • For available finishes see page 28




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-15 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1224, 1, 'swing clear full mortise bearing hinges
 five knuckle heavy weight swing clear series (reversible)
 swing clear hinges create barrier free openings by moving the hinge barrel
 and door edge out of the way.

 • recommended for use on high frequency and/or heavy t4a3395
 wood or metal doors in schools, hospitals or other 
 public buildings where heavy traffic is experienced t4a3795
 • hinge allows for maximum clearance for passage of 
 beds, tables or other equipment through the doorway
 • meets ada requirements and ansi a117.1-1986
 • pressed steel jambs require no special reinforcing
 • pin is held in place by an nrp set screw, which allows
 the hinge to be reversible
 • for beveled edge, where doors are beveled in hinge
 application
 side, specify t4a4395 or t4a4795
 • for available finishes see page 28




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-15 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 45, ' Full Mortise Hinges
MacPro® Five Knuckle Standard Weight Series
The MacPro line offers contractor grade hinges to get the job done
right. High quality MacPro hinges are an extraordinary value, ideal
when you need large quantities of standard hinges.

 • Plain bearing hinges are for standard weight doors only
 MP79
 • For standard weight doors with a closing device, MPB79 MP91
 or MPB91 bearing hinge must be used
 • MacPro templated hinges are made to conform to
 ANSI/BHMA 156.1, 156.7
 • For available finishes consult the factory



 ANSI Cross MPB79
 No. Reference Base Material Weight Bearing MPB91
 MP79 A8133 Steel STD Plain
 Bearing
 MP91 5133 Stainless* STD Plain
 MPB79 A8112 Steel STD Bearing
 MPB91 A5112 Stainless STD Bearing

*41/2" x 41/2"
 Application




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 4 2" x 4"
 1/
 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12



 Options:
Approved for NFPA 80 fire rated openings
 Code Description
 NRP* Non-Removable Pin
 *4½ x 4½ MP91 32D NRP only
 4½ x 4 MPB91 32D NRP only



 McKinney Hinge Pin Door Stop
 • Recommended for high-use or high impact doors with MacPro MP79 & MPB79 hinges
 • Protects against damage to doors and walls
 • Runs the full length of the hinge

 Part number Description Finish
 76305 Hinge Pin Stop for MacPro MP79 & MPB79 26D
 76306 Hinge Pin Stop for McKinney T2714 & TA2714 26D
 76307 Hinge Pin Stop for MacPro MP79 & MPB79 BSP
 76308 Hinge Pin Stop for McKinney T2714 & TA2714 BSP




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FM-16
', 1916, 1, ' full mortise hinges
macpro® five knuckle standard weight series
the macpro line offers contractor grade hinges to get the job done
right. high quality macpro hinges are an extraordinary value, ideal
when you need large quantities of standard hinges.

 • plain bearing hinges are for standard weight doors only
 mp79
 • for standard weight doors with a closing device, mpb79 mp91
 or mpb91 bearing hinge must be used
 • macpro templated hinges are made to conform to
 ansi/bhma 156.1, 156.7
 • for available finishes consult the factory



 ansi cross mpb79
 no. reference base material weight bearing mpb91
 mp79 a8133 steel std plain
 bearing
 mp91 5133 stainless* std plain
 mpb79 a8112 steel std bearing
 mpb91 a5112 stainless std bearing

*41/2" x 41/2"
 application




 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 4 2" x 4"
 1/
 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12



 options:
approved for nfpa 80 fire rated openings
 code description
 nrp* non-removable pin
 *4½ x 4½ mp91 32d nrp only
 4½ x 4 mpb91 32d nrp only



 mckinney hinge pin door stop
 • recommended for high-use or high impact doors with macpro mp79 & mpb79 hinges
 • protects against damage to doors and walls
 • runs the full length of the hinge

 part number description finish
 76305 hinge pin stop for macpro mp79 & mpb79 26d
 76306 hinge pin stop for mckinney t2714 & ta2714 26d
 76307 hinge pin stop for macpro mp79 & mpb79 bsp
 76308 hinge pin stop for mckinney t2714 & ta2714 bsp




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fm-16
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 46, 'Full Mortise Hinges
 MacPro® Five Knuckle Heavy Weight Series
 The MacPro® line offers contractor grade hinges to get the job done
 right. High quality heavy weight hinges are an extraordinary value,
 ideal when you need large quantities of standard hinges.

 • For doors with a closing device, bearing hinge
 MPB99
 must be used MPB68
 • For heavy weight doors with a closing device, select a
 MPB68, heavy weight bearing hinge
 • MacPro templated hinges are made to conform to
 ANSI/BHMA 156.1, 156.7
 • For available finishes consult the factory

 Application

 ANSI
 Cross
 No. Reference Base Material Weight Bearing
 MPB99 A5111 Stainless HVY Bearing
 MPB68 A8111 Steel HVY Bearing



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood Options:
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 Code Description
 5" x 41/2" 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 NRP Non-Removable Pin




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FM-17 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1330, 1, 'full mortise hinges
 macpro® five knuckle heavy weight series
 the macpro® line offers contractor grade hinges to get the job done
 right. high quality heavy weight hinges are an extraordinary value,
 ideal when you need large quantities of standard hinges.

 • for doors with a closing device, bearing hinge
 mpb99
 must be used mpb68
 • for heavy weight doors with a closing device, select a
 mpb68, heavy weight bearing hinge
 • macpro templated hinges are made to conform to
 ansi/bhma 156.1, 156.7
 • for available finishes consult the factory

 application

 ansi
 cross
 no. reference base material weight bearing
 mpb99 a5111 stainless hvy bearing
 mpb68 a8111 steel hvy bearing



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood options:
 41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12 code description
 5" x 41/2" 127 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12 nrp non-removable pin




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fm-17 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 47, ' Full Mortise Anchor Hinges
Three Knuckle Heavy Weight Anchor Hinges Series –
Concealed Door Closers
Anchor hinge sets are used on doors where high traffic, abuse, or other door
hardware place an unusual strain on the door, jamb, and hinges.

 • Recommended for use on high frequency and/or heavy TA391
 wood or metal doors in schools, hospitals or other public
 buildings where heavy traffic is experienced TA791
 • For use with concealed door holders or door closers
 • Set includes one anchor hinge and two 5" x 41/2" full
 mortise hinges
 • Sets require handing and are packed with all machine
 and all wood screws
 • The pin is inserted from the bottom of the barrel on the
 anchor hinge, and is held in place by an NRP set screw
 • Anchor plate for door header only, permits use of 
 holders and closers concealed in the top of the jamb
 • For Beveled Edge, where doors are beveled in hinge
 side, specify TA5391 or TA5791
 • TA391 available in 32D
 • TA791 available in 26D
 Application


 No. ANSI Cross Reference Base Material Weight
 TA391 A5551 Stainless HVY
 TA791 A8551 Steel HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 5" x 4 2"
 1/
 127 x 114.3 .190 13 1/
 2 x 12-24 11/4 x 12




Approved for NFPA 80 fire rated openings For electrification, a fourth hinge is required.
 Please see the electrified hinges and order separately.
 QuickConnect (QC), Concealed Circuit (CC), and
 Magnetic Monitoring (MM) options are available.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. AH-1
', 1832, 1, ' full mortise anchor hinges
three knuckle heavy weight anchor hinges series –
concealed door closers
anchor hinge sets are used on doors where high traffic, abuse, or other door
hardware place an unusual strain on the door, jamb, and hinges.

 • recommended for use on high frequency and/or heavy ta391
 wood or metal doors in schools, hospitals or other public
 buildings where heavy traffic is experienced ta791
 • for use with concealed door holders or door closers
 • set includes one anchor hinge and two 5" x 41/2" full
 mortise hinges
 • sets require handing and are packed with all machine
 and all wood screws
 • the pin is inserted from the bottom of the barrel on the
 anchor hinge, and is held in place by an nrp set screw
 • anchor plate for door header only, permits use of 
 holders and closers concealed in the top of the jamb
 • for beveled edge, where doors are beveled in hinge
 side, specify ta5391 or ta5791
 • ta391 available in 32d
 • ta791 available in 26d
 application


 no. ansi cross reference base material weight
 ta391 a5551 stainless hvy
 ta791 a8551 steel hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 5" x 4 2"
 1/
 127 x 114.3 .190 13 1/
 2 x 12-24 11/4 x 12




approved for nfpa 80 fire rated openings for electrification, a fourth hinge is required.
 please see the electrified hinges and order separately.
 quickconnect (qc), concealed circuit (cc), and
 magnetic monitoring (mm) options are available.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. ah-1
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 48, 'Full Mortise Anchor Hinges
 Three Knuckle Heavy Weight Anchor Hinge Series –
 Surface Applied Door Closers
 Anchor hinge sets are used on doors where high traffic, abuse, or other door
 hardware place an unusual strain on the door, jamb, and hinges.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other TA392
 public buildings where heavy traffic is experienced TA792
 • Anchor plate for jamb and door header permits use of
 surface applied holders and closers
 • Set includes one anchor hinge and two 5" x 41/2" full 
 mortise hinges. One mortise hinge can be electrified
 • Sets require handing and are packed with all machine
 and all wood screws
 • The pin is inserted from the bottom of the barrel
 on the anchor hinge, and is held in place by an NRP
 set screw
 • For Beveled Edge, where doors are beveled in hinge 
 side, specify TA5392 or TA5792
 • TA392 available in 32D
 • TA792 available in 26D Application



 No. ANSI Cross Reference Base Material Weight
 TA392 A5551 Stainless HVY
 TA792 A8551 Steel HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 5" x 4 2"
 1/
 127 x 114.3 .190 17 1/
 2 x 12-24 11/4 x 12




 Approved for NFPA 80 fire rated openings For electrification, a fourth hinge is required.
 Please see the electrified hinges and order separately.
 QuickConnect (QC), Concealed Circuit (CC), and
 Magnetic Monitoring (MM) options are available.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 AH-2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1817, 1, 'full mortise anchor hinges
 three knuckle heavy weight anchor hinge series –
 surface applied door closers
 anchor hinge sets are used on doors where high traffic, abuse, or other door
 hardware place an unusual strain on the door, jamb, and hinges.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other ta392
 public buildings where heavy traffic is experienced ta792
 • anchor plate for jamb and door header permits use of
 surface applied holders and closers
 • set includes one anchor hinge and two 5" x 41/2" full 
 mortise hinges. one mortise hinge can be electrified
 • sets require handing and are packed with all machine
 and all wood screws
 • the pin is inserted from the bottom of the barrel
 on the anchor hinge, and is held in place by an nrp
 set screw
 • for beveled edge, where doors are beveled in hinge 
 side, specify ta5392 or ta5792
 • ta392 available in 32d
 • ta792 available in 26d application



 no. ansi cross reference base material weight
 ta392 a5551 stainless hvy
 ta792 a8551 steel hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 5" x 4 2"
 1/
 127 x 114.3 .190 17 1/
 2 x 12-24 11/4 x 12




 approved for nfpa 80 fire rated openings for electrification, a fourth hinge is required.
 please see the electrified hinges and order separately.
 quickconnect (qc), concealed circuit (cc), and
 magnetic monitoring (mm) options are available.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 ah-2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 49, ' Full Mortise Anchor Hinges
Three Knuckle Heavy Weight Anchor Hinge Series –
Concealed Door Closers
Anchor hinge sets are used on doors where high traffic, abuse, or other door
hardware place an unusual strain on the door, jamb, and hinges.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other public TA393
 buildings where heavy traffic is experienced
 • For use with concealed door holders or door closers
 • Set includes one anchor hinge and two 5" x 41/2" full
 mortise hinges
 • Sets require handing and are packed with all machine
 and all wood screws
 • The pin is inserted from the bottom of the barrel on the
 anchor hinge, and is held in place by an NRP set screw
 Application
 • Anchor plate for jamb header only, permits use of 
 holders and closers concealed in the top of the door
 • For Beveled Edge, where doors are beveled in hinge
 side, specify TA5393
 • TA393 available in 32D




 No. ANSI Cross Reference Base Material Weight
 TA393 A5551 Stainless HVY



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 5" x 41/2" 127 x 114.3 .190 12 1/
 2 x 12-24 11/4 x 12




Approved for NFPA 80 fire rated openings For electrification, a fourth hinge is required.
 Please see the electrified hinges and order separately.
 QuickConnect (QC), Concealed Circuit (CC), and
 Magnetic Monitoring (MM) options are available.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. AH-3
', 1764, 1, ' full mortise anchor hinges
three knuckle heavy weight anchor hinge series –
concealed door closers
anchor hinge sets are used on doors where high traffic, abuse, or other door
hardware place an unusual strain on the door, jamb, and hinges.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other public ta393
 buildings where heavy traffic is experienced
 • for use with concealed door holders or door closers
 • set includes one anchor hinge and two 5" x 41/2" full
 mortise hinges
 • sets require handing and are packed with all machine
 and all wood screws
 • the pin is inserted from the bottom of the barrel on the
 anchor hinge, and is held in place by an nrp set screw
 application
 • anchor plate for jamb header only, permits use of 
 holders and closers concealed in the top of the door
 • for beveled edge, where doors are beveled in hinge
 side, specify ta5393
 • ta393 available in 32d




 no. ansi cross reference base material weight
 ta393 a5551 stainless hvy



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 5" x 41/2" 127 x 114.3 .190 12 1/
 2 x 12-24 11/4 x 12




approved for nfpa 80 fire rated openings for electrification, a fourth hinge is required.
 please see the electrified hinges and order separately.
 quickconnect (qc), concealed circuit (cc), and
 magnetic monitoring (mm) options are available.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. ah-3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 50, ' Full Mortise Anchor Hinges
 Three Knuckle Heavy Weight Anchor Hinge Series – With 4" Door Leg
 Anchor hinge sets are used on doors where high traffic, abuse, or other door
 hardware place an unusual strain on the door, jamb, and hinges.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other TA394
 public buildings where heavy traffic is experienced TA794
 • Set includes one anchor hinge and two 5" x 41/2" full 
 mortise hinges
 • Sets require handing and are packed with all machine
 and all wood screws
 • The pin is inserted from the bottom of the barrel
 on the anchor hinge, and is held in place by an NRP
 set screw Application
 • Anchor plate for jamb and door header permits use of
 surface applied holders and closers
 • For Beveled Edge, where doors are beveled in hinge 
 side, specify TA5394 or TA5794
 • TA394 available in 32D
 • TA794 available in 26D


 No. ANSI Cross Reference Base Material Weight
 TA394 A5551 Stainless HVY
 TA794 A8551 Steel HVY


 For electrification, a fourth hinge is required.
 Specifications Please see the electrified hinges and order
 Fasteners separately. QuickConnect (QC), Concealed
 No. of Circuit (CC), and Magnetic Monitoring (MM)
 Inches mm Gauge Holes Machine Wood options are available.
 5" x 4 2"
 1/
 127 x 114.3 .190 14 1/
 2 x 12-24 11/4 x 12



e




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 AH-4 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1769, 1, ' full mortise anchor hinges
 three knuckle heavy weight anchor hinge series – with 4" door leg
 anchor hinge sets are used on doors where high traffic, abuse, or other door
 hardware place an unusual strain on the door, jamb, and hinges.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other ta394
 public buildings where heavy traffic is experienced ta794
 • set includes one anchor hinge and two 5" x 41/2" full 
 mortise hinges
 • sets require handing and are packed with all machine
 and all wood screws
 • the pin is inserted from the bottom of the barrel
 on the anchor hinge, and is held in place by an nrp
 set screw application
 • anchor plate for jamb and door header permits use of
 surface applied holders and closers
 • for beveled edge, where doors are beveled in hinge 
 side, specify ta5394 or ta5794
 • ta394 available in 32d
 • ta794 available in 26d


 no. ansi cross reference base material weight
 ta394 a5551 stainless hvy
 ta794 a8551 steel hvy


 for electrification, a fourth hinge is required.
 specifications please see the electrified hinges and order
 fasteners separately. quickconnect (qc), concealed
 no. of circuit (cc), and magnetic monitoring (mm)
 inches mm gauge holes machine wood options are available.
 5" x 4 2"
 1/
 127 x 114.3 .190 14 1/
 2 x 12-24 11/4 x 12



e




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 ah-4 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 51, ' Half Mortise Bearing Hinges
Five Knuckle Standard Weight Half Mortise Series (Reversible)
Half Mortise Bearing Hinges are for greater frequency and weight than the Plain
Bearing hinges.

 • Recommended for use on average frequency and/or
 medium weight wood or metal doors in schools, hospitals TA3374
 or other public buildings where medium TA2774
 traffic is experienced
 • The hinges may be used on channel iron jambs
 • The jamb leaf is applied to the surface of the jamb
 with machine screws. The door leaf is mortised into
 the edge of the door
 • The pin is held in place by an NRP set screw, which 
 allows the hinge to be reversible
 • For Beveled Edge, where doors are beveled in hinge 
 side, specify TA4374 or TA4774
 • For TA2774 available finishes see page 29 Application

 • TA3374 available in 32D



 No. ANSI Cross Reference Base Material Weight
 TA3374 A522 Stainless STD
 TA2774 A822 Steel STD



 Specifications
 Options:
 Fasteners
 No. of
 Code Description
 Inches mm Gauge Holes Machine
 TB Ball Bearing
 41/2" 114.3 .134 7 1/
 2 x 12-24
 HT Hospital Tip
 5" 127.0 .146 8 1/
 2 x 12-24




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. HM-1
', 1514, 1, ' half mortise bearing hinges
five knuckle standard weight half mortise series (reversible)
half mortise bearing hinges are for greater frequency and weight than the plain
bearing hinges.

 • recommended for use on average frequency and/or
 medium weight wood or metal doors in schools, hospitals ta3374
 or other public buildings where medium ta2774
 traffic is experienced
 • the hinges may be used on channel iron jambs
 • the jamb leaf is applied to the surface of the jamb
 with machine screws. the door leaf is mortised into
 the edge of the door
 • the pin is held in place by an nrp set screw, which 
 allows the hinge to be reversible
 • for beveled edge, where doors are beveled in hinge 
 side, specify ta4374 or ta4774
 • for ta2774 available finishes see page 29 application

 • ta3374 available in 32d



 no. ansi cross reference base material weight
 ta3374 a522 stainless std
 ta2774 a822 steel std



 specifications
 options:
 fasteners
 no. of
 code description
 inches mm gauge holes machine
 tb ball bearing
 41/2" 114.3 .134 7 1/
 2 x 12-24
 ht hospital tip
 5" 127.0 .146 8 1/
 2 x 12-24




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. hm-1
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 52, 'Half Mortise Bearing Hinges
 Five Knuckle Heavy Weight Half Mortise Series (Reversible)
 Half Mortise Bearing Heavy Weight Hinges are for greater frequency and weight
 than Plain Bearing or standard hinges.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other T4A3784
 public buildings where heavy traffic is experienced
 • The hinges may be used on channel iron jambs
 • The jamb leaf is applied to the surface of the jamb
 with machine screws. The door leaf is mortised into
 the edge of the door
 • The pin is held in place by an NRP set screw, which 
 allows the hinge to be reversible
 • For Beveled Edge, where doors are beveled in hinge
 side, specify T4A4784
 • T4A3384 available in 32D, T4A3784 available in P and 26D


 No. ANSI Cross Reference Base Material Weight Application

 T4A3784 A8211 Steel HVY




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine
 4 2"
 1/
 114.3 .180 7 1/
 2 x 12-24
 5" 127.0 .190 8 1/
 2 x 12-24
 Options:
 Code Description
 T4B Ball Bearing
 HT Hospital Tip




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 HM-2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1476, 1, 'half mortise bearing hinges
 five knuckle heavy weight half mortise series (reversible)
 half mortise bearing heavy weight hinges are for greater frequency and weight
 than plain bearing or standard hinges.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other t4a3784
 public buildings where heavy traffic is experienced
 • the hinges may be used on channel iron jambs
 • the jamb leaf is applied to the surface of the jamb
 with machine screws. the door leaf is mortised into
 the edge of the door
 • the pin is held in place by an nrp set screw, which 
 allows the hinge to be reversible
 • for beveled edge, where doors are beveled in hinge
 side, specify t4a4784
 • t4a3384 available in 32d, t4a3784 available in p and 26d


 no. ansi cross reference base material weight application

 t4a3784 a8211 steel hvy




 specifications
 fasteners
 no. of
 inches mm gauge holes machine
 4 2"
 1/
 114.3 .180 7 1/
 2 x 12-24
 5" 127.0 .190 8 1/
 2 x 12-24
 options:
 code description
 t4b ball bearing
 ht hospital tip




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 hm-2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 53, ' Swing Clear Half Mortise Bearing Hinges
Five Knuckle Heavy Weight Swing Clear Half Mortise Series (Reversible)
The swing of these hinges allows maximum clearance for passage of beds,
tables or other equipment through door openings.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other T4A3789
 public buildings where heavy traffic is experienced
 • The hinges may be used on channel iron jambs
 • The jamb leaf is applied to the surface of the jamb
 with machine screws. The door leaf is mortised into
 the edge of the door
 • The pin is held in place by an NRP set screw, which 
 allows the hinge to be reversible
 • For Beveled Edge, where doors are beveled in hinge
 side, specify T4A4789
 • Available in 26D


 No. ANSI Cross Reference Base Material Weight Application

 T4A3789 A8221 Steel HVY




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Jamb Machine Door Machine Door Wood
 5" 127.0 .190 8 1/
 2 x 1/4 -20 1/
 2 x 12-24 1 1/4 x 12




 Options:
 Code Description
 T4B Ball Bearing
 HT Hospital Tip




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. HM-3
', 1478, 1, ' swing clear half mortise bearing hinges
five knuckle heavy weight swing clear half mortise series (reversible)
the swing of these hinges allows maximum clearance for passage of beds,
tables or other equipment through door openings.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other t4a3789
 public buildings where heavy traffic is experienced
 • the hinges may be used on channel iron jambs
 • the jamb leaf is applied to the surface of the jamb
 with machine screws. the door leaf is mortised into
 the edge of the door
 • the pin is held in place by an nrp set screw, which 
 allows the hinge to be reversible
 • for beveled edge, where doors are beveled in hinge
 side, specify t4a4789
 • available in 26d


 no. ansi cross reference base material weight application

 t4a3789 a8221 steel hvy




 specifications
 fasteners
 no. of
 inches mm gauge holes jamb machine door machine door wood
 5" 127.0 .190 8 1/
 2 x 1/4 -20 1/
 2 x 12-24 1 1/4 x 12




 options:
 code description
 t4b ball bearing
 ht hospital tip




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. hm-3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 54, 'Half Surface Bearing Hinges
 Five Knuckle Standard Weight Series (Reversible)
 Recommended for use on average frequency and/or medium weight wood or
 metal doors in schools, hospitals or other public buildings where medium
 traffic is experienced.

 • Standard weight half surface hinges are packed with TA2772
 all machine screws and thru bolts and grommet nuts TA2372
 • The jamb leaf is fastened into the mortise with machine
 screws. The door leaf is applied full surface with thru
 bolts and grommet nuts
 • The pin is held in place by an NRP set screw, which 
 allows the hinge to be reversible
 • Specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • For available finishes see page 28



 No. ANSI Cross Reference Base Material Weight Application
 TA2772 A8412 Steel STD
 TA2372 A8412 Stainless Steel STD




 Specifications
 Fasteners
 No. of Jamb
 Inches mm Gauge Holes Machine Door Machine
 41/2" 114.3 .134 7 1/
 2 x 12-24 2 x 1/4 -20
 5" 127.0 .146 8 1/
 2 x 12-24 2 x 1/4 -20

 Options:
 Code Description
 BP-10 Back Plate*
 TB Ball Bearing
 HT Hospital Tips

 * Refer to page HS-8 for BP-10.




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 HS-1 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1553, 1, 'half surface bearing hinges
 five knuckle standard weight series (reversible)
 recommended for use on average frequency and/or medium weight wood or
 metal doors in schools, hospitals or other public buildings where medium
 traffic is experienced.

 • standard weight half surface hinges are packed with ta2772
 all machine screws and thru bolts and grommet nuts ta2372
 • the jamb leaf is fastened into the mortise with machine
 screws. the door leaf is applied full surface with thru
 bolts and grommet nuts
 • the pin is held in place by an nrp set screw, which 
 allows the hinge to be reversible
 • specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • for available finishes see page 28



 no. ansi cross reference base material weight application
 ta2772 a8412 steel std
 ta2372 a8412 stainless steel std




 specifications
 fasteners
 no. of jamb
 inches mm gauge holes machine door machine
 41/2" 114.3 .134 7 1/
 2 x 12-24 2 x 1/4 -20
 5" 127.0 .146 8 1/
 2 x 12-24 2 x 1/4 -20

 options:
 code description
 bp-10 back plate*
 tb ball bearing
 ht hospital tips

 * refer to page hs-8 for bp-10.




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 hs-1 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 55, ' Half Surface Bearing Hinge
Five Knuckle Heavy Weight Series (Reversible)
Recommended for use on high frequency and/or heavy weight wood or metal doors
in schools, hospitals or other public buildings where heavy traffic is experienced.


 • Heavy weight half surface hinges are packed with all T4A3382
 machine screws and thru bolts and grommet nuts T4A3782
 • The jamb leaf is fastened into the mortise with machine
 screws. The door leaf is applied full surface with thru
 bolts and grommet nuts
 • The pin is held in place by an NRP set screw, which
 allows the hinge to be reversible
 • Specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • For available finishes see page 28


 No. ANSI Cross Reference Base Material Weight Application

 T4A3382 A5411 Stainless HVY
 T4A3782 A8411 Steel HVY



 Specifications
 Machine Screws
 No. of
 Inches mm Gauge Holes Door Jamb
 41/2" 114.3 .180 7 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .190 8 2 x 1/4 -20 1/
 2 x 12-24
 6"* 152.4 .203 10 2 x 1/4 -20 1/
 2 x 1/4 -20

 Options:
*Advise door thickness 13/4" or 2 1/4".
 Code Description
 BP-10 Back Plate*
 TB Ball Bearing
 HT Hospital Tip

 * Refer to page HS-8 for BP-10.




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. HS-2
', 1604, 1, ' half surface bearing hinge
five knuckle heavy weight series (reversible)
recommended for use on high frequency and/or heavy weight wood or metal doors
in schools, hospitals or other public buildings where heavy traffic is experienced.


 • heavy weight half surface hinges are packed with all t4a3382
 machine screws and thru bolts and grommet nuts t4a3782
 • the jamb leaf is fastened into the mortise with machine
 screws. the door leaf is applied full surface with thru
 bolts and grommet nuts
 • the pin is held in place by an nrp set screw, which
 allows the hinge to be reversible
 • specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • for available finishes see page 28


 no. ansi cross reference base material weight application

 t4a3382 a5411 stainless hvy
 t4a3782 a8411 steel hvy



 specifications
 machine screws
 no. of
 inches mm gauge holes door jamb
 41/2" 114.3 .180 7 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .190 8 2 x 1/4 -20 1/
 2 x 12-24
 6"* 152.4 .203 10 2 x 1/4 -20 1/
 2 x 1/4 -20

 options:
*advise door thickness 13/4" or 2 1/4".
 code description
 bp-10 back plate*
 tb ball bearing
 ht hospital tip

 * refer to page hs-8 for bp-10.




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. hs-2
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 56, 'Half Surface Bearing Hinges
 Five Knuckle Heavy Weight Swing Clear Series (Reversible)
 The wide swing of these hinges allows maximum clearance for passage of beds,
 tables or other equipment through door openings.

 • Recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other T4A3796
 public buildings where heavy traffic is experienced
 • Swing clear heavy weight half surface hinges are
 packed with all machine screws and thru bolts and
 grommet nuts
 • The jamb leaf is fastened into the mortise with machine
 screws. The door leaf is applied full surface with thru
 bolts and grommet nuts
 • The pin is held in place by an NRP set screw, which
 allows the hinge to be reversible
 • Specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed Application
 • Available in 26D


 No. ANSI Cross Reference Base Material Weight
 T4A3796 A8421 Steel HVY



 Specifications
 Machine Screws
 No. of
 Inches mm Gauge Holes Door Jamb
 5" 127.0 .190 9 2x 1/
 4 -20 1/
 2 x 12-24


 Options:
 Code Description
 HT Hospital Tip
 T4B Ball Bearing




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 HS-3 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1520, 1, 'half surface bearing hinges
 five knuckle heavy weight swing clear series (reversible)
 the wide swing of these hinges allows maximum clearance for passage of beds,
 tables or other equipment through door openings.

 • recommended for use on high frequency and/or heavy
 wood or metal doors in schools, hospitals or other t4a3796
 public buildings where heavy traffic is experienced
 • swing clear heavy weight half surface hinges are
 packed with all machine screws and thru bolts and
 grommet nuts
 • the jamb leaf is fastened into the mortise with machine
 screws. the door leaf is applied full surface with thru
 bolts and grommet nuts
 • the pin is held in place by an nrp set screw, which
 allows the hinge to be reversible
 • specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed application
 • available in 26d


 no. ansi cross reference base material weight
 t4a3796 a8421 steel hvy



 specifications
 machine screws
 no. of
 inches mm gauge holes door jamb
 5" 127.0 .190 9 2x 1/
 4 -20 1/
 2 x 12-24


 options:
 code description
 ht hospital tip
 t4b ball bearing




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 hs-3 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 57, ' Hinge Back Plates
Hinge Back Plate
Recommended for use with Half Surface Hinges.

 • Available to fit popular half surface hinges
 • For finishes see page 29




No. For Use With Base Material
BP-10 TA2772, T4A3782 Steel
BP-11 T4A3796 Steel




Specifications
 No. of
No. Inches mm Holes
BP-10 41/2" 114.3 3
 BP-10
BP-10 5" 127.0 4
BP-11 5" 127.0 5




 BP-11




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. HS-4
', 716, 1, ' hinge back plates
hinge back plate
recommended for use with half surface hinges.

 • available to fit popular half surface hinges
 • for finishes see page 29




no. for use with base material
bp-10 ta2772, t4a3782 steel
bp-11 t4a3796 steel




specifications
 no. of
no. inches mm holes
bp-10 41/2" 114.3 3
 bp-10
bp-10 5" 127.0 4
bp-11 5" 127.0 5




 bp-11




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. hs-4
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 58, 'Full Surface Bearing Hinges
 Five Knuckle Heavy Weight Series (Reversible)
 Recommended for use on high frequency and/or heavy weight wood or metal doors
 in schools, hospitals or other public buildings where heavy traffic is experienced.

 • The hinges may be used on channel iron frames
 T4A3381
 • The narrow leaf is applied to the surface of the jamb
 with machine screws. The door leaf is applied to the T4A3781
 surface of the door with thru bolts and grommet nuts
 • Heavy weight full surface hinges are packed with all
 machine screws and thru bolts and grommet nuts
 • The pin is held in place by an NRP set screw, which
 allows the hinge to be reversible
 • T4A3381 available in 32D, T4A3781 available in P and 26D
 • Specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed


 No. ANSI Cross Reference Base Material Weight
 Application
 T4A3381 A5311 Stainless HVY
 T4A3781 A8311 Steel HVY



 Specifications
 Machine Screws
 No. of
 Inches mm Gauge Holes Door Jamb
 41/2" 114.3 .180 6 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .180 8 2 x 1/4 -20 1/
 2 x 12-24
 6" 152.4 .203 9 2 x 1/4 -20 1/
 2 x 1/4 -20
 Options:
 Code Description
 T4B Ball Bearing
 HT Hospital Tip

 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 FS-1 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1610, 1, 'full surface bearing hinges
 five knuckle heavy weight series (reversible)
 recommended for use on high frequency and/or heavy weight wood or metal doors
 in schools, hospitals or other public buildings where heavy traffic is experienced.

 • the hinges may be used on channel iron frames
 t4a3381
 • the narrow leaf is applied to the surface of the jamb
 with machine screws. the door leaf is applied to the t4a3781
 surface of the door with thru bolts and grommet nuts
 • heavy weight full surface hinges are packed with all
 machine screws and thru bolts and grommet nuts
 • the pin is held in place by an nrp set screw, which
 allows the hinge to be reversible
 • t4a3381 available in 32d, t4a3781 available in p and 26d
 • specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed


 no. ansi cross reference base material weight
 application
 t4a3381 a5311 stainless hvy
 t4a3781 a8311 steel hvy



 specifications
 machine screws
 no. of
 inches mm gauge holes door jamb
 41/2" 114.3 .180 6 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .180 8 2 x 1/4 -20 1/
 2 x 12-24
 6" 152.4 .203 9 2 x 1/4 -20 1/
 2 x 1/4 -20
 options:
 code description
 t4b ball bearing
 ht hospital tip

 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 fs-1 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 59, ' Full Surface Bearing Hinges
Five Knuckle Standard Weight Series (Reversible)
Recommended for use on average frequency and/or medium weight wood or metal doors
in schools, hospitals or other public buildings where medium traffic is experienced.

 • The hinges may be used on channel iron jambs
 TA2371
 • The narrow leaf is applied to the surface of the jamb
 with machine screws. The door leaf is applied to the TA2771
 surface of the door with thru bolts and grommet nuts
 • Standard weight full surface hinges are packed with all
 machine screws and thru bolts and grommet nuts
 • The pin is held in place by an NRP set screw, which 
 allows the hinge to be reversible
 • Specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • For TA2771 available finishes see page 28, TA2371
 available in 32D


 Application
 No. ANSI Cross Reference Base Material Weight
 TA2371 A5312 Stainless STD
 TA2771 A8312 Steel STD



 Specifications
 Machine Screws
 No. of
 Inches mm Gauge Holes Door Jamb
 41/2" 114.3 .134 6 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .146 8 2 x 1/4 -20 1/
 2 x 12-24
 Options:
 Code Description
 T4B Ball Bearing
 HT Hospital Tip




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. FS-2
', 1581, 1, ' full surface bearing hinges
five knuckle standard weight series (reversible)
recommended for use on average frequency and/or medium weight wood or metal doors
in schools, hospitals or other public buildings where medium traffic is experienced.

 • the hinges may be used on channel iron jambs
 ta2371
 • the narrow leaf is applied to the surface of the jamb
 with machine screws. the door leaf is applied to the ta2771
 surface of the door with thru bolts and grommet nuts
 • standard weight full surface hinges are packed with all
 machine screws and thru bolts and grommet nuts
 • the pin is held in place by an nrp set screw, which 
 allows the hinge to be reversible
 • specify if the door thickness is greater than 13/4" to ensure
 that proper bolt is packed
 • for ta2771 available finishes see page 28, ta2371
 available in 32d


 application
 no. ansi cross reference base material weight
 ta2371 a5312 stainless std
 ta2771 a8312 steel std



 specifications
 machine screws
 no. of
 inches mm gauge holes door jamb
 41/2" 114.3 .134 6 2 x 1/4 -20 1/
 2 x 12-24
 5" 127.0 .146 8 2 x 1/4 -20 1/
 2 x 12-24
 options:
 code description
 t4b ball bearing
 ht hospital tip




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. fs-2
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 60, 'Spring Hinges & Pivots
 Standard Weight Spring Hinge
 Recommended for standard weight, medium frequency doors in place
 of door closers in apartments, hotels, motels, office buildings, etc.

 • Full mortise single acting spring hinge
 1502
 • Spring hinges are an alternative to door closing
 devices. For maximum performance it is recommended to 1552
 use all spring hinges on the door.
 • This non-handed spring hinge series is adjustable
 and tension can be added or reduced by means of
 a hex key that is provided
 • Caution: Use of gasketing for smoke or sound protection,
 wind conditions or unbalanced air pressure, twisted or
 misaligned frames or doors, door bottoms, improper latch
 adjustment may prevent doors from latching. Additional
 spring hinges may be required.
 • For available finishes see page 28
 Application




 No. ANSI Cross Reference Base Material Weight
 1502 K81081 Steel STD
 1502 K81081F Steel STD
 1552 K51071 Stainless Steel STD
 1552 K51071F Stainless Steel STD




 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12

 *Not available in 1552.




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SH-1 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1675, 1, 'spring hinges & pivots
 standard weight spring hinge
 recommended for standard weight, medium frequency doors in place
 of door closers in apartments, hotels, motels, office buildings, etc.

 • full mortise single acting spring hinge
 1502
 • spring hinges are an alternative to door closing
 devices. for maximum performance it is recommended to 1552
 use all spring hinges on the door.
 • this non-handed spring hinge series is adjustable
 and tension can be added or reduced by means of
 a hex key that is provided
 • caution: use of gasketing for smoke or sound protection,
 wind conditions or unbalanced air pressure, twisted or
 misaligned frames or doors, door bottoms, improper latch
 adjustment may prevent doors from latching. additional
 spring hinges may be required.
 • for available finishes see page 28
 application




 no. ansi cross reference base material weight
 1502 k81081 steel std
 1502 k81081f steel std
 1552 k51071 stainless steel std
 1552 k51071f stainless steel std




 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 4" x 4"* 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 4" 114.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12

 *not available in 1552.




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sh-1 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 61, ' Spring Hinges & Pivots
MacPro® Adjustable Spring Hinge
MacPro offers contract grade hinges to get the job done right. They are
a key player in very competitive jobs, especially in the retrofit arena.

 • Recommended for standard weight hinge applications
 requiring self-closing control, such as apartments, MPS60
 hotels, motels, dormitories, office buildings, etc MPS679
 • Spring hinges are an alternative to door closing
 devices. Generally two hinges on the door must be
 spring hinges to provide adequate closing force
 NFPA requires a minimum of two (2) spring hinges on
 labeled doors
 • MPS679 - Set of two MPS60 spring hinges and one
 MPB79 full mortise butt hinge
 • MacPro templated hinges are made to conform to
 ANSI/BHMA 156.1, 156.7, 156.17 Application

 • MPS60 Finishes available: P - Prime Coat, 15, 26D,
 10BE and BSP
 • MPS679 available in 26D


Approved for NFPA 80 fire rated openings




Full Surface Double Acting Door Spring
Simplified method of closing doors.
 451
 • This economical series is designed to be surface applied
 to the door and frame 452
 • Coil springs made of high grade steel wire 453
 • Adjustable tension, no special tools required
 • Wrought steel brackets prevent breakage
 • All 450 Series are finished in BSP and are packed
 with 1x12 wood screws


 No. ANSI Cross Reference Base Material Weight
 451 K87441 Steel HVY
 452 K87441 Steel HVY
 453 K87441 Steel HVY


 Specifications
 Fasteners
 No. of
 Number Overall Length Spring Length Holes Wood
 451 9" 5" 6 1 x 12
 452 11" 7" 6 1 x 12
 453 13" 9" 6 1 x 12




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SH-2
', 1916, 1, ' spring hinges & pivots
macpro® adjustable spring hinge
macpro offers contract grade hinges to get the job done right. they are
a key player in very competitive jobs, especially in the retrofit arena.

 • recommended for standard weight hinge applications
 requiring self-closing control, such as apartments, mps60
 hotels, motels, dormitories, office buildings, etc mps679
 • spring hinges are an alternative to door closing
 devices. generally two hinges on the door must be
 spring hinges to provide adequate closing force
 nfpa requires a minimum of two (2) spring hinges on
 labeled doors
 • mps679 - set of two mps60 spring hinges and one
 mpb79 full mortise butt hinge
 • macpro templated hinges are made to conform to
 ansi/bhma 156.1, 156.7, 156.17 application

 • mps60 finishes available: p - prime coat, 15, 26d,
 10be and bsp
 • mps679 available in 26d


approved for nfpa 80 fire rated openings




full surface double acting door spring
simplified method of closing doors.
 451
 • this economical series is designed to be surface applied
 to the door and frame 452
 • coil springs made of high grade steel wire 453
 • adjustable tension, no special tools required
 • wrought steel brackets prevent breakage
 • all 450 series are finished in bsp and are packed
 with 1x12 wood screws


 no. ansi cross reference base material weight
 451 k87441 steel hvy
 452 k87441 steel hvy
 453 k87441 steel hvy


 specifications
 fasteners
 no. of
 number overall length spring length holes wood
 451 9" 5" 6 1 x 12
 452 11" 7" 6 1 x 12
 453 13" 9" 6 1 x 12




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sh-2
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 62, 'Spring Hinges & Pivots
 Double Acting Spring Hinge
 Recommended for wood doors not weighted with plate glass or heavy hardware.

 • Door flange mortised or surface applied to edge of door
 1001
 • Jamb flange surfaced applied to jamb
 • Do not use on doors with hinge edge beveled
 • Non-handed, non-template
 • Packed with all wood screws
 • Polished and plated 26D




 No. ANSI Cross Reference Base Material Application

 1001 K81041 Steel


 Maximum Door Sizes and Weights
 2 Hinges Per Door 3 Hinges Per Door
 Catalog Door Door Door Door Door
 Number Weight Width Weight Width Height
 Lbs. Lbs.
 1001 3" 35 2'' 0" 40 2'' 8" 5'' 0"
 1001 4" 60 2'' 4" 75 3'' 0" 6'' 8"
 1001 5" 65 2'' 8" 93 3'' 0" 6'' 8"
 1001 6" 75 2'' 8" 107 3'' 0" 7'' 0"
 * Minimum height for weights shown. Hinge capacity decreases as door height decreases.
 Refer to 6 x 41/2 1001 for 13/4" thick stock hollow metal doors.



 Approximate Dimensions in Inches
 A Length of Door Flange 3" 4" 5" 6"
 (size of hinge)

 B Minimum Thickness of Door 3/
 4 " 7/
 8 " 11/8" 11/4"


 C Maximum Thickness of Door 1" 11/4" 11/2" 13/4"
 with Chamfering


 D Maximum Thickness of Door 7/
 8 " 11/8" 13/8" 13/4"
 without Chamfering for Metal Doors


 Door Specifications
 Minimum 3/
 " x 2''2" to
 4
 7/
 " x 2''2" to
 8 11/8" x 2''4" to 11/4" x 2''6" to
 Maximum 1" x 2''0" 1 4" x 2''0"
 1/
 11/2" x 2''2" 13/4" x 2''4"
 It is recommended that three hinges be used on door sizes as indicated above.
 The center hinge should be installed as close as possible to the top hinge for maximum support.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SH-3 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1904, 1, 'spring hinges & pivots
 double acting spring hinge
 recommended for wood doors not weighted with plate glass or heavy hardware.

 • door flange mortised or surface applied to edge of door
 1001
 • jamb flange surfaced applied to jamb
 • do not use on doors with hinge edge beveled
 • non-handed, non-template
 • packed with all wood screws
 • polished and plated 26d




 no. ansi cross reference base material application

 1001 k81041 steel


 maximum door sizes and weights
 2 hinges per door 3 hinges per door
 catalog door door door door door
 number weight width weight width height
 lbs. lbs.
 1001 3" 35 2'' 0" 40 2'' 8" 5'' 0"
 1001 4" 60 2'' 4" 75 3'' 0" 6'' 8"
 1001 5" 65 2'' 8" 93 3'' 0" 6'' 8"
 1001 6" 75 2'' 8" 107 3'' 0" 7'' 0"
 * minimum height for weights shown. hinge capacity decreases as door height decreases.
 refer to 6 x 41/2 1001 for 13/4" thick stock hollow metal doors.



 approximate dimensions in inches
 a length of door flange 3" 4" 5" 6"
 (size of hinge)

 b minimum thickness of door 3/
 4 " 7/
 8 " 11/8" 11/4"


 c maximum thickness of door 1" 11/4" 11/2" 13/4"
 with chamfering


 d maximum thickness of door 7/
 8 " 11/8" 13/8" 13/4"
 without chamfering for metal doors


 door specifications
 minimum 3/
 " x 2''2" to
 4
 7/
 " x 2''2" to
 8 11/8" x 2''4" to 11/4" x 2''6" to
 maximum 1" x 2''0" 1 4" x 2''0"
 1/
 11/2" x 2''2" 13/4" x 2''4"
 it is recommended that three hinges be used on door sizes as indicated above.
 the center hinge should be installed as close as possible to the top hinge for maximum support.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sh-3 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 63, ' Spring Hinges & Pivots
Double Acting Spring Hinge
Recommended for use on stock hollow metal or wood doors that are 13/4" thick.

 • Door flange designed to fit standard 41/2" x 41/2"
 1001 6x41/2
 template mortise
 • Jamb flange surfaced applied to jamb
 • Do not use on doors with hinge edge beveled
 • Non-handed, non-template
 • Packed with all machine screws and half wood screws
 • US26D only




 No. ANSI Cross Reference Base Material Application
 1001 K81151 Steel


 Specification Schedule for Door 7'' High or More
 Max Door Weight Lbs.* Lockside Clearance*
 Door Width 2 Each 3 Each Flat Edge Round Edge
 2''0" 96 145 1/
 4 " 1/
 16 "
 2''2" 89 135 3/
 16 " 1/
 16 "
 2''6" 77 125 3/
 16 " 1/
 16 "
 2''8" 72 115 1/
 8 " 1/
 16 "
 3''0" 64 105 1/
 8 " 1/
 16 "

* Minimum height for weights shown. Hinge capacity decreases as door height decreases.
It is recommended that three hinges be used on door sizes as indicated above.
These listed weights include a margin of safety. Minimum clearance required on
edge of door and frame on lock side. Hinge side clearance, allow 1/4" per door
because of jamb flange and hinge body not being mortised. The center hinge should
be installed as close as possible to the top hinge for maximum support. Hinge
capacity decreases as door height decreases.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SH-4
', 1652, 1, ' spring hinges & pivots
double acting spring hinge
recommended for use on stock hollow metal or wood doors that are 13/4" thick.

 • door flange designed to fit standard 41/2" x 41/2"
 1001 6x41/2
 template mortise
 • jamb flange surfaced applied to jamb
 • do not use on doors with hinge edge beveled
 • non-handed, non-template
 • packed with all machine screws and half wood screws
 • us26d only




 no. ansi cross reference base material application
 1001 k81151 steel


 specification schedule for door 7'' high or more
 max door weight lbs.* lockside clearance*
 door width 2 each 3 each flat edge round edge
 2''0" 96 145 1/
 4 " 1/
 16 "
 2''2" 89 135 3/
 16 " 1/
 16 "
 2''6" 77 125 3/
 16 " 1/
 16 "
 2''8" 72 115 1/
 8 " 1/
 16 "
 3''0" 64 105 1/
 8 " 1/
 16 "

* minimum height for weights shown. hinge capacity decreases as door height decreases.
it is recommended that three hinges be used on door sizes as indicated above.
these listed weights include a margin of safety. minimum clearance required on
edge of door and frame on lock side. hinge side clearance, allow 1/4" per door
because of jamb flange and hinge body not being mortised. the center hinge should
be installed as close as possible to the top hinge for maximum support. hinge
capacity decreases as door height decreases.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sh-4
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 64, 'Spring Hinges & Pivots
 Gravity Double Acting Pivot Hinge
 Enables the door to open in both directions and automatically return to the center position.

 • Recommended for use on double acting saloon doors
 • Mounted to top and bottom of each door
 • Door weight closes the door – no spring 8007
 • Ideal for heavy-duty applications and high-traffic areas H8007
 • Hold-open feature that keeps door at a 90-degree angle (H8007)
 • Constructed from heavy-duty commercial grade steel
 • US26D finish only
 • Easy to install




 No. Base Material
 8007 Steel




 Specifications for 8007
 Door Thickness 7/8" to 1-5/8"
 Door Weight Lbs. 50
 Door Width 30"
 Door Height* 5''0"

 * Maximum height for weights shown. Hinge capacity decreases as gate height decreases.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SH-5 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1123, 1, 'spring hinges & pivots
 gravity double acting pivot hinge
 enables the door to open in both directions and automatically return to the center position.

 • recommended for use on double acting saloon doors
 • mounted to top and bottom of each door
 • door weight closes the door – no spring 8007
 • ideal for heavy-duty applications and high-traffic areas h8007
 • hold-open feature that keeps door at a 90-degree angle (h8007)
 • constructed from heavy-duty commercial grade steel
 • us26d finish only
 • easy to install




 no. base material
 8007 steel




 specifications for 8007
 door thickness 7/8" to 1-5/8"
 door weight lbs. 50
 door width 30"
 door height* 5''0"

 * maximum height for weights shown. hinge capacity decreases as gate height decreases.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sh-5 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 65, ' Rescue Hardware
Jamb Mount Pivot Set
Recommended for installations on average frequency double acting
doors in schools, hospitals, institutions and other public buildings.

 • Used in conjunction with CSS-9 Combinations Strike
 and Stops and DS-6 Emergency Door Stops
 EP-5J
 • Thrust steel ball bearing in bottom pivot, oil
 impregnated bronze bearing in top pivot
 • Center Hung
 • Mortised into side jamb
 • Full mortise top pivot
 • Non-handed
 • 15/32 radius heel edge of door
 • Maximum Door Weight (interior or exterior) up to
 125 lbs 3''6" x 8''0"
 • All EP-5J Pivot sets are packed with 14 x 11/2" wood
 screws and 1/4 -20 x 5/8" machine screws
 • Ferrous base pivot set polished and plated 26D


Specifications
No. ANSI Cross Reference Base Material
EP-5J C07042 Steel



Door Weight Chart
(lbs per square foot)


 Door Thickness
 13/4" 2"
Aluminum 3 2 lbs
 1/
 5 lbs
Wood-
Particle Core 5 lbs 53/4 lbs
Wood-
Stave Block Core 4 lbs 41/2 lbs
14 Gauge
Hollow Metal 83/4 lbs 10 lbs
16 Gauge
Hollow Metal 71/2 lbs 81/2 lbs
18 Gauge
Hollow Metal 61/2 lbs 71/2 lbs




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. RH-1
', 1424, 1, ' rescue hardware
jamb mount pivot set
recommended for installations on average frequency double acting
doors in schools, hospitals, institutions and other public buildings.

 • used in conjunction with css-9 combinations strike
 and stops and ds-6 emergency door stops
 ep-5j
 • thrust steel ball bearing in bottom pivot, oil
 impregnated bronze bearing in top pivot
 • center hung
 • mortised into side jamb
 • full mortise top pivot
 • non-handed
 • 15/32 radius heel edge of door
 • maximum door weight (interior or exterior) up to
 125 lbs 3''6" x 8''0"
 • all ep-5j pivot sets are packed with 14 x 11/2" wood
 screws and 1/4 -20 x 5/8" machine screws
 • ferrous base pivot set polished and plated 26d


specifications
no. ansi cross reference base material
ep-5j c07042 steel



door weight chart
(lbs per square foot)


 door thickness
 13/4" 2"
aluminum 3 2 lbs
 1/
 5 lbs
wood-
particle core 5 lbs 53/4 lbs
wood-
stave block core 4 lbs 41/2 lbs
14 gauge
hollow metal 83/4 lbs 10 lbs
16 gauge
hollow metal 71/2 lbs 81/2 lbs
18 gauge
hollow metal 61/2 lbs 71/2 lbs




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. rh-1
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 66, 'Rescue Hardware
 Combination Strike and Stop
 Recommended for installations on hospital or nursing home bathroom
 doors along with our EP-5J. This unit allows center hung or 1/8" inset doors
 to be opened in both directions without damaging the frame.

 • Manufactured for use with cylindrical or bored locks
 CSS-9
 Offset Hung
 • Cannot be used with deadbolts
 • Can be manufactured for the following mortise locks:
 – Sargent 7900 and 8200 (no deadbolt function)
 – Corbin Russwin ML2000 (no deadbolt function)
 – ASSA ABLOY ACCENTRA™ 8800 (no deadbolt function)
 – When ordering, specify lock model and function
 • Available in offset or center hung latch bolt location
 for frame sizes 53/4", 57/8" and 63/4" CSS-9
 • Custom units available for frame sizes 31/2" to 10"
 Center Hung
 consult factory for availability
 • For use on 13/4" thick doors
 • All Combination Strike and Stops are packed with
 2 x 8-32 machine screws
 1/


 • Available in brass material polished and plated 26D
 Application
 • Please provide order form for all CSS-9 orders


 No. ANSI Cross Reference Base Material
 CSS-9 A1882 Brass



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine
 53/4" 146.1 .095 6 1/
 2 x 8-32
 57/8" 149.2 .095 6 1/
 2 x 8-32
 6 4"
 3/
 171.5 .095 6 1/
 2 x 8-32




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 RH-2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1650, 1, 'rescue hardware
 combination strike and stop
 recommended for installations on hospital or nursing home bathroom
 doors along with our ep-5j. this unit allows center hung or 1/8" inset doors
 to be opened in both directions without damaging the frame.

 • manufactured for use with cylindrical or bored locks
 css-9
 offset hung
 • cannot be used with deadbolts
 • can be manufactured for the following mortise locks:
 – sargent 7900 and 8200 (no deadbolt function)
 – corbin russwin ml2000 (no deadbolt function)
 – assa abloy accentra™ 8800 (no deadbolt function)
 – when ordering, specify lock model and function
 • available in offset or center hung latch bolt location
 for frame sizes 53/4", 57/8" and 63/4" css-9
 • custom units available for frame sizes 31/2" to 10"
 center hung
 consult factory for availability
 • for use on 13/4" thick doors
 • all combination strike and stops are packed with
 2 x 8-32 machine screws
 1/


 • available in brass material polished and plated 26d
 application
 • please provide order form for all css-9 orders


 no. ansi cross reference base material
 css-9 a1882 brass



 specifications
 fasteners
 no. of
 inches mm gauge holes machine
 53/4" 146.1 .095 6 1/
 2 x 8-32
 57/8" 149.2 .095 6 1/
 2 x 8-32
 6 4"
 3/
 171.5 .095 6 1/
 2 x 8-32




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 rh-2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 67, ' Rescue Hardware
Emergency Door Stop
Recommended for installation with our EP-5J pivot in schools, hospitals, institutions
and other public buildings. This unit allows center hung or 1/8" inset doors to be
opened in both directions without damaging the frame.

 • Used to convert double acting doors hung on center DS-6
 pivots to single acting doors
 • Emergency release allows door to swing open in the
 opposite direction
 • Mortise only on frame
 • Latch releases with a touch of the finger
 • Second touch of lever returns latch to original position
 • Available in brass material polished and plated 26D




No. ANSI Cross Reference Base Material
DS-6 A1882 Brass


 Specifications
 Fasteners Application
 No. of
 Inches mm Gauge Holes Machine
 Surface Plate 41/2" x 15/8" 114.3 x 41.3 .134 4 1/
 2 x 12-24
 Bolt height 13/4" 44.5




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. RH-3
', 1192, 1, ' rescue hardware
emergency door stop
recommended for installation with our ep-5j pivot in schools, hospitals, institutions
and other public buildings. this unit allows center hung or 1/8" inset doors to be
opened in both directions without damaging the frame.

 • used to convert double acting doors hung on center ds-6
 pivots to single acting doors
 • emergency release allows door to swing open in the
 opposite direction
 • mortise only on frame
 • latch releases with a touch of the finger
 • second touch of lever returns latch to original position
 • available in brass material polished and plated 26d




no. ansi cross reference base material
ds-6 a1882 brass


 specifications
 fasteners application
 no. of
 inches mm gauge holes machine
 surface plate 41/2" x 15/8" 114.3 x 41.3 .134 4 1/
 2 x 12-24
 bolt height 13/4" 44.5




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. rh-3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 68, 'Rescue Hardware
 Double Lipped Strike
 Recommended for installations on hospital or nursing home bathroom doors
 along with our EP-5J and DS-6 Emergency Stop. This unit allows center hung or
 8 " inset doors to be opened in both directions without damaging the frame.
 1/




 DLS-8
 • Manufactured for use with cylindrical or bored locks
 • Cannot be used with deadbolts
 • Can be manufactured for the following mortise locks:
 – Sargent 7900 and 8200 (no deadbolt function)
 – Corbin Russwin ML2000 (no deadbolt function)
 – ASSA ABLOY ACCENTRA™ 8800 (no deadbolt function)
 – When ordering, specify lock model and function
 • Available in offset or center hung
 • Latch bolt location for frame sizes 53/4 and 63/4"
 Application
 • Custom units available for frame sizes 31/2" to 10".
 Consult factory for availability
 • For use on 13/4" thick doors
 • All Combination Strike and Stops are packed with
 2 x 8-32 machine screws
 1/


 • Available in brass material polished and plated 26D



 No. Base Material
 DLS-8 Brass


 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine
 5 4"
 3/
 146.1 .095 6 1/
 2 x 8-32
 63/4" 171.5 .095 6 1/
 2 x 8-32




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 RH-4 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1525, 1, 'rescue hardware
 double lipped strike
 recommended for installations on hospital or nursing home bathroom doors
 along with our ep-5j and ds-6 emergency stop. this unit allows center hung or
 8 " inset doors to be opened in both directions without damaging the frame.
 1/




 dls-8
 • manufactured for use with cylindrical or bored locks
 • cannot be used with deadbolts
 • can be manufactured for the following mortise locks:
 – sargent 7900 and 8200 (no deadbolt function)
 – corbin russwin ml2000 (no deadbolt function)
 – assa abloy accentra™ 8800 (no deadbolt function)
 – when ordering, specify lock model and function
 • available in offset or center hung
 • latch bolt location for frame sizes 53/4 and 63/4"
 application
 • custom units available for frame sizes 31/2" to 10".
 consult factory for availability
 • for use on 13/4" thick doors
 • all combination strike and stops are packed with
 2 x 8-32 machine screws
 1/


 • available in brass material polished and plated 26d



 no. base material
 dls-8 brass


 specifications
 fasteners
 no. of
 inches mm gauge holes machine
 5 4"
 3/
 146.1 .095 6 1/
 2 x 8-32
 63/4" 171.5 .095 6 1/
 2 x 8-32




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 rh-4 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 69, ' Electrified Hinges
ElectroLynx® Hinge (QC option)
Each hinge features concealed plug connectors that eliminate the need for separate or
exposed wiring. Standard connectors make installation quick and simple. Brass eyelets add
protection and durability.

 • QC option is available on standard and heavy weight
 full mortise bearing hinges as well as swing clear and wide
 throw hinges
 QC-12
 • Electric hinges allow a constant flow of current from
 the power source through the hinge to electrified
 door hardware
 • No external wires can be seen, eliminating tampering and
 improving the aesthetics of the door opening
 • Materials: Brass, stainless steel, and steel
 • For 4 amp continuous @ 24 volts AC or DC per circuit,
 28 gauge multi-strand wires are used
 • An 8 position connector is used for QC4 and QC8 wire
 hinges. An 8 position and a 4 position connector is used for
 QC12 wire hinges
 Application
 • Hand of hinge must be specified on two knuckle hinges
 ElectroLynx
 • Can be used in conjunction with MM option on most full Harness
 mortise hinges. QC12 x MM not recommended for wood or (Sold
 solid core doors Separately)

 • Full Mortise QC hinges are available in most BHMA and
 McKinney powder coat finishes
 • Wires are coordinated to work with other ASSA ABLOY
 Group brands electro-mechanical hardware Female
 Male connector
*Electric hinges should be installed in the center position on the connector
 door. Installation instructions are packed with each hinge.
*Hinges are factory tested and specially packaged to minimize Back of 12 wire hinge shown

 against damage during shipment.


 Options:
 Code Description
3-Knuckle 5-Knuckle
 QC4 2 circuits
TA314 TA2314
 QC8 4 circuits
TA714 TA2714
 QC12 6 circuits
TA386 T4A3386
TA786 T4A3786
 TA2895
 T4A3395 Most hinges including this Swing Clear
 Hinge can be electrically modified. Call
 T4A3795
 1-800-346-7707 for more information.




Steel & Stainless - Approved for NFPA 80
fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. EH-1
', 2337, 1, ' electrified hinges
electrolynx® hinge (qc option)
each hinge features concealed plug connectors that eliminate the need for separate or
exposed wiring. standard connectors make installation quick and simple. brass eyelets add
protection and durability.

 • qc option is available on standard and heavy weight
 full mortise bearing hinges as well as swing clear and wide
 throw hinges
 qc-12
 • electric hinges allow a constant flow of current from
 the power source through the hinge to electrified
 door hardware
 • no external wires can be seen, eliminating tampering and
 improving the aesthetics of the door opening
 • materials: brass, stainless steel, and steel
 • for 4 amp continuous @ 24 volts ac or dc per circuit,
 28 gauge multi-strand wires are used
 • an 8 position connector is used for qc4 and qc8 wire
 hinges. an 8 position and a 4 position connector is used for
 qc12 wire hinges
 application
 • hand of hinge must be specified on two knuckle hinges
 electrolynx
 • can be used in conjunction with mm option on most full harness
 mortise hinges. qc12 x mm not recommended for wood or (sold
 solid core doors separately)

 • full mortise qc hinges are available in most bhma and
 mckinney powder coat finishes
 • wires are coordinated to work with other assa abloy
 group brands electro-mechanical hardware female
 male connector
*electric hinges should be installed in the center position on the connector
 door. installation instructions are packed with each hinge.
*hinges are factory tested and specially packaged to minimize back of 12 wire hinge shown

 against damage during shipment.


 options:
 code description
3-knuckle 5-knuckle
 qc4 2 circuits
ta314 ta2314
 qc8 4 circuits
ta714 ta2714
 qc12 6 circuits
ta386 t4a3386
ta786 t4a3786
 ta2895
 t4a3395 most hinges including this swing clear
 hinge can be electrically modified. call
 t4a3795
 1-800-346-7707 for more information.




steel & stainless - approved for nfpa 80
fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. eh-1
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 70, 'Electrified Hinges
 ElectroLynx® Retrofit Cables
 If you are not ordering ASSA ABLOY Door Group doors with the ElectroLynx®
 cable pre-installed in the door, you must order an ElectroLynx® retrofit cable
 to go between ANY hardware and the hinge.

 • Includes 3" cables to go from the hinge to an exit device
 • Includes a cable that is up to 15'' that goes up and around a
 full lite metal door
 QC-C1500P Shown



 Standard ElectroLynx® Retrofit Cable Sizes




 12 Conductor
 Actual Cable 12 Conductor and and Molex one end,
 Length Molex both ends pinned one end Typical Application
 3" QC-C003 QC-C003P
 6" QC-C006 QC-C006P Between hinge and the end of an exit device.
 12" QC-C012 QC-C012P
 26" QC-C200 QC-C200P
 32" QC-C206 QC-C206P
 Between hinge and through the door to the lockset
 38" QC-C300 QC-C300P
 or exit device trim.
 44" QC-C306 QC-C306P
 50" QC-C400 QC-C400P
 15'' 2" QC-C1500 QC-C1500P
 From the hinge location, up the jamb to
 25'' - QC-C2500P above the ceiling, or up and around full lite
 or half lite metal door.
 30'' - QC-C3000P

 Custom lengths available.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 EH-2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1440, 1, 'electrified hinges
 electrolynx® retrofit cables
 if you are not ordering assa abloy door group doors with the electrolynx®
 cable pre-installed in the door, you must order an electrolynx® retrofit cable
 to go between any hardware and the hinge.

 • includes 3" cables to go from the hinge to an exit device
 • includes a cable that is up to 15'' that goes up and around a
 full lite metal door
 qc-c1500p shown



 standard electrolynx® retrofit cable sizes




 12 conductor
 actual cable 12 conductor and and molex one end,
 length molex both ends pinned one end typical application
 3" qc-c003 qc-c003p
 6" qc-c006 qc-c006p between hinge and the end of an exit device.
 12" qc-c012 qc-c012p
 26" qc-c200 qc-c200p
 32" qc-c206 qc-c206p
 between hinge and through the door to the lockset
 38" qc-c300 qc-c300p
 or exit device trim.
 44" qc-c306 qc-c306p
 50" qc-c400 qc-c400p
 15'' 2" qc-c1500 qc-c1500p
 from the hinge location, up the jamb to
 25'' - qc-c2500p above the ceiling, or up and around full lite
 or half lite metal door.
 30'' - qc-c3000p

 custom lengths available.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 eh-2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 71, ' Electrified Hinges
MacPro® Electric Hinges
MacPro® Electric Hinges connect the power source to electrified door hardware such as
locking hardware and exit devices. They are ideal for new construction as well as retrofit
and aftermarket applications. The MacPro Electric Hinges feature center exit wires
allowing them to replace existing electric hinges with center exit wires.

 • MacPro Electric Hinges are easy to install with ElectroLynx®
 Quick Connect (QC) or Concealed Circuit (CC) connection
 options
 • Once installed, the wires are concealed to increase security
 and prevent tampering
 • Available in standard and heavy weight
 • Brass eyelets on the portal holes prevent chafing, giving the
 hinge an extended service life
 • UL Listed
 • Concealed Circuit (CC) is available as CC4 or CC8
 • ElectroLynx® Quick Connect (QC) is available with
 QC4, QC8 or QC12



Approved for NFPA 80 fire rated openings




 Hinge Base
 No. Size Gauge Weight Finish Connector Options
 Type Material
 MPB79 41/2" x 4" Bearing Steel .134 STD 26D CC4, CC8
 MPB79 41/2" x 4" Bearing Steel .134 STD 26D QC4, QC8, QC12
 MPB79 41/2" x 41/2" Bearing Steel .134 STD 26D CC4, CC8
 MPB79 41/2" x 41/2" Bearing Steel .134 STD 26D, BSP QC4, QC8, QC12
 MPB79 41/2" x 41/2" Bearing Steel .134 STD BSP CC8, QC8, QC12
 MPB68 4 2" x 4 2"
 1/ 1/
 Bearing Steel .180 HVY 26D CC4, CC8
 MPB68 4 2" x 4 2"
 1/ 1/
 Bearing Steel .180 HVY 26D QC4, QC8, QC12
 MPB91 4 2" x 4
 1/
 Bearing Stainless .134 STD 32D CC8, QC12
 MPB91 4 2" x 4 2
 1/ 1/
 Bearing Stainless .134 STD 32D CC8, QC12
 MPB99 4 2" x 4
 1/
 Bearing Stainless .180 HVY 32D CC8, QC12
 MPB99 4 2" x 4 2
 1/ 1/
 Bearing Stainless .180 HVY 32D CC8, QC12
 MPB99 5" x 4½ Bearing Stainless .180 HVY 32D CC8, QC12




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. EH-3
', 2103, 1, ' electrified hinges
macpro® electric hinges
macpro® electric hinges connect the power source to electrified door hardware such as
locking hardware and exit devices. they are ideal for new construction as well as retrofit
and aftermarket applications. the macpro electric hinges feature center exit wires
allowing them to replace existing electric hinges with center exit wires.

 • macpro electric hinges are easy to install with electrolynx®
 quick connect (qc) or concealed circuit (cc) connection
 options
 • once installed, the wires are concealed to increase security
 and prevent tampering
 • available in standard and heavy weight
 • brass eyelets on the portal holes prevent chafing, giving the
 hinge an extended service life
 • ul listed
 • concealed circuit (cc) is available as cc4 or cc8
 • electrolynx® quick connect (qc) is available with
 qc4, qc8 or qc12



approved for nfpa 80 fire rated openings




 hinge base
 no. size gauge weight finish connector options
 type material
 mpb79 41/2" x 4" bearing steel .134 std 26d cc4, cc8
 mpb79 41/2" x 4" bearing steel .134 std 26d qc4, qc8, qc12
 mpb79 41/2" x 41/2" bearing steel .134 std 26d cc4, cc8
 mpb79 41/2" x 41/2" bearing steel .134 std 26d, bsp qc4, qc8, qc12
 mpb79 41/2" x 41/2" bearing steel .134 std bsp cc8, qc8, qc12
 mpb68 4 2" x 4 2"
 1/ 1/
 bearing steel .180 hvy 26d cc4, cc8
 mpb68 4 2" x 4 2"
 1/ 1/
 bearing steel .180 hvy 26d qc4, qc8, qc12
 mpb91 4 2" x 4
 1/
 bearing stainless .134 std 32d cc8, qc12
 mpb91 4 2" x 4 2
 1/ 1/
 bearing stainless .134 std 32d cc8, qc12
 mpb99 4 2" x 4
 1/
 bearing stainless .180 hvy 32d cc8, qc12
 mpb99 4 2" x 4 2
 1/ 1/
 bearing stainless .180 hvy 32d cc8, qc12
 mpb99 5" x 4½ bearing stainless .180 hvy 32d cc8, qc12




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. eh-3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 72, 'Electrified Hinges Electrified Hinges
 Concealed Circuit Electric Hinge (CC option)
 McKinney Concealed Circuit (CC) electric hinges allow a constant flow of current from the
 power source through the hinge to electrified door hardware. No external wires can be
 seen, eliminating disruption of power due to tampering or disconnection, and improving
 the aesthetics of the opening.

 • Allows operation of devices requiring power such as electric
 locks, electric strikes, and electric latch retraction exit devices
 • Wires are contained within the hinge – invisible and CC2-18
 tamperproof
 • Available with most two, three, and five knuckle
 bearing hinges
 • Available with 4, 8 or 12 wires
 • Materials: Standard and heavy weight, brass, steel, and
 stainless steel
 • Four amp continuous @ 24 volts AC or DC per circuit
 16.0 Amps intermittent duty (pulse) for 300 milliseconds
 • CC option has 28 gauge wire
 • CC-18 option has 2 18 gauge wires and the remainder Application
 28 gauge wire. Available 2,4,6,8 and 10 wire
 • Can be used in conjunction with MM option on most full
 mortise hinges. CC12 x MM not recommended for wood or
 solid core doors
 • Optional Mortar guard MG-16 available
 • Hinges are supplied with 8" (305) leads as standard.
 Extra lengths are available at additional cost
 Note: Two knuckle style is handed.




 CC-18 Option CC Option
 Suffix Suffix Wires Capacity
 CC4-18 CC4 4 2 circuits
 CC8-18 CC8 8 4 circuits
 CC2-18 CC12 12 6 circuits
 CC6-18
 CC10-18




 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 EH-4 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1901, 1, 'electrified hinges electrified hinges
 concealed circuit electric hinge (cc option)
 mckinney concealed circuit (cc) electric hinges allow a constant flow of current from the
 power source through the hinge to electrified door hardware. no external wires can be
 seen, eliminating disruption of power due to tampering or disconnection, and improving
 the aesthetics of the opening.

 • allows operation of devices requiring power such as electric
 locks, electric strikes, and electric latch retraction exit devices
 • wires are contained within the hinge – invisible and cc2-18
 tamperproof
 • available with most two, three, and five knuckle
 bearing hinges
 • available with 4, 8 or 12 wires
 • materials: standard and heavy weight, brass, steel, and
 stainless steel
 • four amp continuous @ 24 volts ac or dc per circuit
 16.0 amps intermittent duty (pulse) for 300 milliseconds
 • cc option has 28 gauge wire
 • cc-18 option has 2 18 gauge wires and the remainder application
 28 gauge wire. available 2,4,6,8 and 10 wire
 • can be used in conjunction with mm option on most full
 mortise hinges. cc12 x mm not recommended for wood or
 solid core doors
 • optional mortar guard mg-16 available
 • hinges are supplied with 8" (305) leads as standard.
 extra lengths are available at additional cost
 note: two knuckle style is handed.




 cc-18 option cc option
 suffix suffix wires capacity
 cc4-18 cc4 4 2 circuits
 cc8-18 cc8 8 4 circuits
 cc2-18 cc12 12 6 circuits
 cc6-18
 cc10-18




 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 eh-4 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 73, 'Electrified Hinges Electrified Hinges
 ElectroLynx® Power over Ethernet (PoE) Hinge
 The McKinney ElectroLynx® PoE Quick Connect hinge provides for the passing of Ethernet
 data through the door opening. Installation is a snap with the friendly “plug and play”
 connectors which allow power to be linked from the incoming source through the door to
 the electrified hardware. PoE data is bidirectional.

 • Brass eyelets add protection and durability to the PoE PoE Option
 hinge which features common wire colors coordinated
 to work with intelligent Power over Ethernet
 electromechanical hardware from SARGENT and
 Corbin Russwin
 • The PoE hinge should be installed in the second from
 bottom hinge position on the door. Once installed, it
 will give no outward indication of its function and will
 transfer power and data efficiently and reliably, as long
 as the wire capacity is not exceeded
 • All PoE hinges are factory tested and specially packaged
 to minimize damage during shipment. Installation
 U.S. Patent No. 7,824,200
 instructions are packed with each hinge. Along with
 the PoE hinge, mating PoE door and frame side
 Application
 harnesses are required to complete the opening. The
 required PoE harnesses must be ordered separately
 • Specify suffix PoE
 Available on:
 41/2" and 5" TA2314 & TA2714 Standard Weight 5 Knuckle
 41/2" and 5" T4A3386 & T4A3786 Heavy Weight 5 Knuckle

 Steel & Stainless - Approved for NFPA 80
 fire rated openings

 Harness Length McKinney Catalog # Door Side Application
 30" PoE-C206P 20" to 25" door width (doors with 3 butt hinges with PoE hinge in center to
 stile to stile raceway to lock prep).
 36" PoE-C300P 26" to 31" door width (doors with 3 butt hinges with PoE hinge in center to
 stile to stile raceway to lock prep).
 42" PoE-C306P 32" to 36" door width (doors with 3 butt hinges with PoE hinge in center to
 stile to stile raceway to lock prep).
 48" PoE-C400P 37" to 42" door width (doors with 3 butt hinges with PoE hinge in center to
 stile to stile raceway to lock prep).
 54" PoE-C406P 43" to 48" door width (doors with 3 butt hinges with PoE hinge in center to
 stile to stile raceway to lock prep).
 60" PoE-C500P Door Harness Assembly
 84" PoE-C700P Door Harness Assembly
 156" PoE-C1300P Door Harness Assembly
 EPT Harness
 360" PoE-CEPT30 EPT Harness Assembly
 Frame Side Application
 180" PoE-C1500P From the hinge location, up the jamb to wall/ceiling
 Custom Lengths Available




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. EH-5
', 2817, 1, 'electrified hinges electrified hinges
 electrolynx® power over ethernet (poe) hinge
 the mckinney electrolynx® poe quick connect hinge provides for the passing of ethernet
 data through the door opening. installation is a snap with the friendly “plug and play”
 connectors which allow power to be linked from the incoming source through the door to
 the electrified hardware. poe data is bidirectional.

 • brass eyelets add protection and durability to the poe poe option
 hinge which features common wire colors coordinated
 to work with intelligent power over ethernet
 electromechanical hardware from sargent and
 corbin russwin
 • the poe hinge should be installed in the second from
 bottom hinge position on the door. once installed, it
 will give no outward indication of its function and will
 transfer power and data efficiently and reliably, as long
 as the wire capacity is not exceeded
 • all poe hinges are factory tested and specially packaged
 to minimize damage during shipment. installation
 u.s. patent no. 7,824,200
 instructions are packed with each hinge. along with
 the poe hinge, mating poe door and frame side
 application
 harnesses are required to complete the opening. the
 required poe harnesses must be ordered separately
 • specify suffix poe
 available on:
 41/2" and 5" ta2314 & ta2714 standard weight 5 knuckle
 41/2" and 5" t4a3386 & t4a3786 heavy weight 5 knuckle

 steel & stainless - approved for nfpa 80
 fire rated openings

 harness length mckinney catalog # door side application
 30" poe-c206p 20" to 25" door width (doors with 3 butt hinges with poe hinge in center to
 stile to stile raceway to lock prep).
 36" poe-c300p 26" to 31" door width (doors with 3 butt hinges with poe hinge in center to
 stile to stile raceway to lock prep).
 42" poe-c306p 32" to 36" door width (doors with 3 butt hinges with poe hinge in center to
 stile to stile raceway to lock prep).
 48" poe-c400p 37" to 42" door width (doors with 3 butt hinges with poe hinge in center to
 stile to stile raceway to lock prep).
 54" poe-c406p 43" to 48" door width (doors with 3 butt hinges with poe hinge in center to
 stile to stile raceway to lock prep).
 60" poe-c500p door harness assembly
 84" poe-c700p door harness assembly
 156" poe-c1300p door harness assembly
 ept harness
 360" poe-cept30 ept harness assembly
 frame side application
 180" poe-c1500p from the hinge location, up the jamb to wall/ceiling
 custom lengths available




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. eh-5
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 74, 'Electrified Hinges Electrified Hinges
 ElectroLynx® Power over Ethernet (PoE)
 Harnesses with RJ-45 Connectors
 Connecting ASSA ABLOY Group brands Corbin Russwin and SARGENT next
 generation Power over Ethernet (PoE) enabled hardware is quick and easy with new
 ElectroLynx® harnesses from McKinney. Molex connectors connect the hinge to the
 harness, and a standard RJ-45 connector connects the harness to the electrified door
 hardware.
 The following hardware uses the RJ-45 connectors: PoE-C206PRJ
 • Corbin Russwin IN220
 • Corbin Russwin Access 700 PIP1
 • SARGENT IN220
 • SARGENT Passport 1000 P1
 Harnesses are available with the RJ-45 connector attached or loose in the package.
 D-28912
 The harnesses range in length from 30" up to 156" with custom lengths available
 (consult factory).

 ElectroLynx PoE Harnesses with RJ-45 Connectors
 D-28912




 Actual Cable Molex one end, RJ-45 Molex one end,
 Length attached one end D-28908
 RJ-45 Loose Door Side Application
 30" PoE-C206PRJ PoE-C206RJ 20" to 25" door width (doors with 3 butt hinges with PoE
 hinge in center to stile to stile raceway to lock prep).
 D-28908
 36" PoE-C300PRJ PoE-C300RJ 26" to 31" door width (doors with 3 butt hinges with PoE
 hinge in center to stile to stile raceway to lock prep).
 42" PoE-C306PRJ PoE-C306RJ 32" to 36" door width (doors with 3 butt hinges with PoE
 hinge in center to stile to stile raceway to lock prep).
 48" PoE-C400PRJ PoE-C400RJ 37" to 42" door width (doors with 3 butt hinges with PoE
 hinge in center to stile to stile raceway to lock prep).
 54" PoE-C406PRJ PoE-C406RJ 43" to 48" door width (doors with 3 butt hinges with PoE
 hinge in center to stile to stile raceway to lock prep).
 Door Harness Assembly
 60" PoE-C500PRJ PoE-C500RJ Door Harness Assembly
 84" PoE-C700PRJ PoE-C700RJ Door Harness Assembly
 156" PoE-C1300PRJ PoE-C1300RJ Door Harness Assembly


 EPT Harness Assembly
 30 ft cable with loose RJ-45 connector




 Actual Cable
 Length RJ-45 Loose EPT Harness Assembly
 360" PoE-CEPT30RJ EPT Harness Assembly




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 EH-6 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2402, 1, 'electrified hinges electrified hinges
 electrolynx® power over ethernet (poe)
 harnesses with rj-45 connectors
 connecting assa abloy group brands corbin russwin and sargent next
 generation power over ethernet (poe) enabled hardware is quick and easy with new
 electrolynx® harnesses from mckinney. molex connectors connect the hinge to the
 harness, and a standard rj-45 connector connects the harness to the electrified door
 hardware.
 the following hardware uses the rj-45 connectors: poe-c206prj
 • corbin russwin in220
 • corbin russwin access 700 pip1
 • sargent in220
 • sargent passport 1000 p1
 harnesses are available with the rj-45 connector attached or loose in the package.
 d-28912
 the harnesses range in length from 30" up to 156" with custom lengths available
 (consult factory).

 electrolynx poe harnesses with rj-45 connectors
 d-28912




 actual cable molex one end, rj-45 molex one end,
 length attached one end d-28908
 rj-45 loose door side application
 30" poe-c206prj poe-c206rj 20" to 25" door width (doors with 3 butt hinges with poe
 hinge in center to stile to stile raceway to lock prep).
 d-28908
 36" poe-c300prj poe-c300rj 26" to 31" door width (doors with 3 butt hinges with poe
 hinge in center to stile to stile raceway to lock prep).
 42" poe-c306prj poe-c306rj 32" to 36" door width (doors with 3 butt hinges with poe
 hinge in center to stile to stile raceway to lock prep).
 48" poe-c400prj poe-c400rj 37" to 42" door width (doors with 3 butt hinges with poe
 hinge in center to stile to stile raceway to lock prep).
 54" poe-c406prj poe-c406rj 43" to 48" door width (doors with 3 butt hinges with poe
 hinge in center to stile to stile raceway to lock prep).
 door harness assembly
 60" poe-c500prj poe-c500rj door harness assembly
 84" poe-c700prj poe-c700rj door harness assembly
 156" poe-c1300prj poe-c1300rj door harness assembly


 ept harness assembly
 30 ft cable with loose rj-45 connector




 actual cable
 length rj-45 loose ept harness assembly
 360" poe-cept30rj ept harness assembly




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 eh-6 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 75, 'Electrified Hinges Electrified Hinges
 Magnetic Monitoring Hinge (MM Option)
 The McKinney Magnetic Monitoring Hinge is the only system on the market that permits field
 replacement of magnet and switch. It is a simple, dependable system which defies detection,
 yet is readily accessible for inspection and easy adjustment.
 • MM Electric Hinges should be installed in the center position on doors with three hinges or the
 second hinge position from the bottom on doors with four hinges
 • Neither switch nor operating magnet are attached to the hinge. Non-attachment feature reduces
 the chance of damage during installation. Installation instructions packed with each hinge. All MM
 Electric Hinges are individually factory pre-tested
 • The MM feature is available on most two, three and five knuckle full mortise standard and heavy
 weight hinges. Consult the individual catalog pages for this option feature

 • For low voltage (48 volt maximum) .25 Amps AC or
 DC non-inductive load MM Option
 • Magnetic reed concealed switch impervious to dirt
 and moisture
 • Can be used in conjunction with QC option on most
 full mortise hinges up to QC12. QC12 x MM not
 recommended for wood or solid core doors
 • Can be used in conjunction with CC option on most
 full mortise hinges up to CC12 Wire. CC12 x MM not
 recommended for wood or solid core doors



 Front View




 UL Listing
 6V .25 Amps
 12V .25 Amps
 24V .125 Amps
 48V .062 Amps




 Steel & Stainless - Approved for NFPA 80
 fire rated openings

 Back View




 Application




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. EH-7
', 1905, 1, 'electrified hinges electrified hinges
 magnetic monitoring hinge (mm option)
 the mckinney magnetic monitoring hinge is the only system on the market that permits field
 replacement of magnet and switch. it is a simple, dependable system which defies detection,
 yet is readily accessible for inspection and easy adjustment.
 • mm electric hinges should be installed in the center position on doors with three hinges or the
 second hinge position from the bottom on doors with four hinges
 • neither switch nor operating magnet are attached to the hinge. non-attachment feature reduces
 the chance of damage during installation. installation instructions packed with each hinge. all mm
 electric hinges are individually factory pre-tested
 • the mm feature is available on most two, three and five knuckle full mortise standard and heavy
 weight hinges. consult the individual catalog pages for this option feature

 • for low voltage (48 volt maximum) .25 amps ac or
 dc non-inductive load mm option
 • magnetic reed concealed switch impervious to dirt
 and moisture
 • can be used in conjunction with qc option on most
 full mortise hinges up to qc12. qc12 x mm not
 recommended for wood or solid core doors
 • can be used in conjunction with cc option on most
 full mortise hinges up to cc12 wire. cc12 x mm not
 recommended for wood or solid core doors



 front view




 ul listing
 6v .25 amps
 12v .25 amps
 24v .125 amps
 48v .062 amps




 steel & stainless - approved for nfpa 80
 fire rated openings

 back view




 application




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. eh-7
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 76, 'Electrified Hinges
 Concealed Electric Hinge (MK100ME)
 For use on wood or hollow metal doors with wood or metal frames.
 • Magnetic covers included
 • Door thickness minimum: 13/8"
 • Base material: Zinc alloy
 • Available in Satin Chrome and Matte Black only
 • Available in CC12 and QC12 configurations

 Note: When installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.


 Hinge Capacity
 Number of Door Width
 Hinges 32" 36" 42" 48" MK100ME
 2 224 lbs 220 lbs 180 lbs 165 lbs
 3 253 lbs 246 lbs 202 lbs 185 lbs
 4 282 lbs 275 lbs 216 lbs 198 lbs



 Electrical Power Transfer (EPT)
 • Installs in the door and frame edges
 • Accepts a thick cable and protects it within a flexible McK-EPTL, McK-EPT
 steel shield
 • Device that will work on most doors hung using butt
 hinges, continuous hinges or pivots
 • Will not function on a center pivot door


 Part # Description
 McK-EPT Electrical power transfer
 McK-EPTL Electrical power transfer, long
 McK-EL-EPT ElectroLynx® EPT -12 wire
 McK-EL-EPTL ElectroLynx® EPTL -12 wire



 Door Cord McK-TSB-C
 • Simplest and most economical solution for power transfer
 • Consists of an 18" or 36" armored stainless steel cable
 and plastic end pieces in light gray and black
 • Cable has an interior diameter of .25"
 • Supports interior wire cables up to .2"


 Part # Description
 McK-TSB-C Door cord with gray/black caps 18" cord
 McK-TSB-CXL Door cord with gray/black caps 36" cord




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 EH-8 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1851, 1, 'electrified hinges
 concealed electric hinge (mk100me)
 for use on wood or hollow metal doors with wood or metal frames.
 • magnetic covers included
 • door thickness minimum: 13/8"
 • base material: zinc alloy
 • available in satin chrome and matte black only
 • available in cc12 and qc12 configurations

 note: when installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.


 hinge capacity
 number of door width
 hinges 32" 36" 42" 48" mk100me
 2 224 lbs 220 lbs 180 lbs 165 lbs
 3 253 lbs 246 lbs 202 lbs 185 lbs
 4 282 lbs 275 lbs 216 lbs 198 lbs



 electrical power transfer (ept)
 • installs in the door and frame edges
 • accepts a thick cable and protects it within a flexible mck-eptl, mck-ept
 steel shield
 • device that will work on most doors hung using butt
 hinges, continuous hinges or pivots
 • will not function on a center pivot door


 part # description
 mck-ept electrical power transfer
 mck-eptl electrical power transfer, long
 mck-el-ept electrolynx® ept -12 wire
 mck-el-eptl electrolynx® eptl -12 wire



 door cord mck-tsb-c
 • simplest and most economical solution for power transfer
 • consists of an 18" or 36" armored stainless steel cable
 and plastic end pieces in light gray and black
 • cable has an interior diameter of .25"
 • supports interior wire cables up to .2"


 part # description
 mck-tsb-c door cord with gray/black caps 18" cord
 mck-tsb-cxl door cord with gray/black caps 36" cord




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 eh-8 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 77, ' Electrified Hinges
Electrified Hinge Service Kit
 • Includes a quantity of every different type of connector and
 terminal required for repairing product connections/terminations
 or pinning wires on certain retrofit harnesses
 • Contains 10 each 2, 4, 8 Molex receptacles and plugs as
 well as corresponding terminals, extraction tool and pinning
 assembly guider


 Part # Description
 QC-R001
 QC-R001 Service Kit

 Locking mechanism

 Receptacles and Terminals
 Female Male plug
 Quantity Part # Description
 receptacle (8 circuit)
 1 bag (100 pc) QC-RF2 Female receptacle (2ckt)
 (8 circuit)
 1 bag (100 pc) QC-RF4 Female receptacle (4ckt)
 1 bag (100 pc) QC-RF8 Female receptacle (8ckt)
 1 bag (100 pc) QC-RM2 Male plug (2ckt)
 1 bag (100 pc) QC-RM4 Male plug (4ckt)
 Female receptacle Male plug requires
 1 bag (100 pc) QC-RM8 Male plug (8ckt)
 requires female terminal male terminal
 1 bag (100 pc) QC-FT2024 Female terminal (AWG 20-24)
 1 bag (100 pc) QC-FT2630 Female terminal (AWG 26-30)
 1 bag (100 pc) QC-MT2024 Male terminal (AWG 20-24)
 1 bag (100 pc) QC-MT2630 Male terminal (AWG 26-30)
 1 bag (100 pc) POE-MT2024 Male Terminal (AWG 20-24) The plug and receptacle connectors are designed to
 mate and lock together as shown in the figure. Plug the
 1 bag (100 pc) POE-RM6 Male Plug connectors onto each other with the locking mechanism
 aligned as indicated.
 1 bag (100 pc) POE-RF6 Female Plug
 1 bag (100 pc) POE-MT2630 Male Terminal
 1 bag (100 pc) POE-FT2630 Female Terminal
 1 bag (10 pc) QC-DCC Pinning assembly guide



Molex Hand Crimp Tool
The crimp tool is required for adding Molex terminals (connector pins) to wires used with ElectroLynx® products.
The tool is intended for low volume, or repair requirements only.



Part # Description
 QC-R003
QC-R003 Molex Hand Crimp Tool




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. EH-9
', 2163, 1, ' electrified hinges
electrified hinge service kit
 • includes a quantity of every different type of connector and
 terminal required for repairing product connections/terminations
 or pinning wires on certain retrofit harnesses
 • contains 10 each 2, 4, 8 molex receptacles and plugs as
 well as corresponding terminals, extraction tool and pinning
 assembly guider


 part # description
 qc-r001
 qc-r001 service kit

 locking mechanism

 receptacles and terminals
 female male plug
 quantity part # description
 receptacle (8 circuit)
 1 bag (100 pc) qc-rf2 female receptacle (2ckt)
 (8 circuit)
 1 bag (100 pc) qc-rf4 female receptacle (4ckt)
 1 bag (100 pc) qc-rf8 female receptacle (8ckt)
 1 bag (100 pc) qc-rm2 male plug (2ckt)
 1 bag (100 pc) qc-rm4 male plug (4ckt)
 female receptacle male plug requires
 1 bag (100 pc) qc-rm8 male plug (8ckt)
 requires female terminal male terminal
 1 bag (100 pc) qc-ft2024 female terminal (awg 20-24)
 1 bag (100 pc) qc-ft2630 female terminal (awg 26-30)
 1 bag (100 pc) qc-mt2024 male terminal (awg 20-24)
 1 bag (100 pc) qc-mt2630 male terminal (awg 26-30)
 1 bag (100 pc) poe-mt2024 male terminal (awg 20-24) the plug and receptacle connectors are designed to
 mate and lock together as shown in the figure. plug the
 1 bag (100 pc) poe-rm6 male plug connectors onto each other with the locking mechanism
 aligned as indicated.
 1 bag (100 pc) poe-rf6 female plug
 1 bag (100 pc) poe-mt2630 male terminal
 1 bag (100 pc) poe-ft2630 female terminal
 1 bag (10 pc) qc-dcc pinning assembly guide



molex hand crimp tool
the crimp tool is required for adding molex terminals (connector pins) to wires used with electrolynx® products.
the tool is intended for low volume, or repair requirements only.



part # description
 qc-r003
qc-r003 molex hand crimp tool




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. eh-9
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 78, 'Electrified Hinges
 Extraction Tool
 The extraction tool is a simple hand tool used to remove damaged terminals from an ElectroLynx® female
 receptacle or male plug.


 QC-R002
 Part # Description
 QC-R002 Extraction Tool




 Junction Box for Electric Hinges
 Recommended for use with our Concealed Circuit Hinges to protect wires. Unit to be
 installed in middle hinge location.

 • Knock-out holes on both ends for wires to pass through MG-16
 • Removable cover plate from end brackets
 • Guard supplied assembled for use with electric hinges
 • Fits hinge reinforcements for 41/2" or 5" contract
 grade hinges
 • 20 gauge galvanized sheet steel, furnished in 2C finish




 Part # Description
 MG-16 Junction Box




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 EH-10 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1077, 1, 'electrified hinges
 extraction tool
 the extraction tool is a simple hand tool used to remove damaged terminals from an electrolynx® female
 receptacle or male plug.


 qc-r002
 part # description
 qc-r002 extraction tool




 junction box for electric hinges
 recommended for use with our concealed circuit hinges to protect wires. unit to be
 installed in middle hinge location.

 • knock-out holes on both ends for wires to pass through mg-16
 • removable cover plate from end brackets
 • guard supplied assembled for use with electric hinges
 • fits hinge reinforcements for 41/2" or 5" contract
 grade hinges
 • 20 gauge galvanized sheet steel, furnished in 2c finish




 part # description
 mg-16 junction box




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 eh-10 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 79, ' Specialty Hinges
StormPro® Tornado Resistant Hinges
Built to withstand the extreme wind speeds and flying debris
associated with severe weather conditions.

 • McKinney StormPro® hinges are part of the integrated unit SP3386
 when used with StormPro® tornado resistant assemblies
 from Ceco Door and CURRIES, along with other StormPro® SP3786
 hardware by ASSA ABLOY Group brands
 • ASSA ABLOY StormPro® Assemblies Meet UL Certification
 for Fire, ICC 500-2014 and FEMA Guidelines
 • Use for the common flush door/frame/wall application
 • Fire rated thru 3 hours
 • Packed with stainless steel machine screws
 Application




No. ANSI Cross Reference Base Material Weight
SP3386 A5111 Stainless HVY
SP3786 A8111 Steel HVY



Specifications
 Fasteners
 No. of Options:
Inches mm Gauge Holes Machine
 Code Description
41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24
 NRP Non-Removable Pin
41/2" x 5" 114.3 x 127 .180 8 1/
 2 x 12-24
 QC ElectroLynx® Hinge 4,
4 2" x 6"
 1/
 114.3 x 152.4 .180 8 1/
 2 x 12-24 8, 12 wire available on
 hinges up to 6" wide
4 2" x 7"
 1/
 114.3 x 177.8 .180 8 1/
 2 x 12-24
4 2" x 8"
 1/
 114.3 x 203.2 .180 8 1/
 2 x 12-24
5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24
5" x 5" 127 x 127 .190 8 1/
 2 x 12-24
5" x 6" 127 x 152.4 .190 8 1/
 2 x 12-24
5" x 7" 127 x 177.8 .190 8 1/
 2 x 12-24
5" x 8" 127 x 203.2 .190 8 1/
 2 x 12-24




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-1
', 1766, 1, ' specialty hinges
stormpro® tornado resistant hinges
built to withstand the extreme wind speeds and flying debris
associated with severe weather conditions.

 • mckinney stormpro® hinges are part of the integrated unit sp3386
 when used with stormpro® tornado resistant assemblies
 from ceco door and curries, along with other stormpro® sp3786
 hardware by assa abloy group brands
 • assa abloy stormpro® assemblies meet ul certification
 for fire, icc 500-2014 and fema guidelines
 • use for the common flush door/frame/wall application
 • fire rated thru 3 hours
 • packed with stainless steel machine screws
 application




no. ansi cross reference base material weight
sp3386 a5111 stainless hvy
sp3786 a8111 steel hvy



specifications
 fasteners
 no. of options:
inches mm gauge holes machine
 code description
41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24
 nrp non-removable pin
41/2" x 5" 114.3 x 127 .180 8 1/
 2 x 12-24
 qc electrolynx® hinge 4,
4 2" x 6"
 1/
 114.3 x 152.4 .180 8 1/
 2 x 12-24 8, 12 wire available on
 hinges up to 6" wide
4 2" x 7"
 1/
 114.3 x 177.8 .180 8 1/
 2 x 12-24
4 2" x 8"
 1/
 114.3 x 203.2 .180 8 1/
 2 x 12-24
5" x 4 2"
 1/
 127 x 114.3 .190 8 1/
 2 x 12-24
5" x 5" 127 x 127 .190 8 1/
 2 x 12-24
5" x 6" 127 x 152.4 .190 8 1/
 2 x 12-24
5" x 7" 127 x 177.8 .190 8 1/
 2 x 12-24
5" x 8" 127 x 203.2 .190 8 1/
 2 x 12-24




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-1
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 80, 'Specialty Hinges
 Pocket Pivot Hinges
 Recommended for applications where use of the full width of the corridor is required,
 such as cross corridor and smoke and fire doors as well as patient room doors.


 • The Full Mortise Pocket Pivot Hinge is designed to give
 a flush appearance to the corridor when the door is
 PH-4
 open and recessed into a pocket in the corridor wall
 • For single and cross corridor doors, the PH-4 allows
 the door to lay against the wall with no projection into
 the opening and no gap between the door and frame
 • When combined with a floor closer, this application has
 minimum visible hardware and clearances
 • The PH-4 Full Mortise Pocket Pivot Hinge meets
 material and performance requirements of NFPA-80
 and ANSI A-156-1
 • Meets or exceeds ANSI A117.1 – 1986
 Application
 Providing Accessibility and Usability for Physically
 Handicapped People
 • Investment cast steel base material (Finish - 26D)
 • Two thrust bearings for vertical loads
 • Roller bearing for lateral support
 • Listed for both hollow metal or steel covered
 composite fire doors rated up to 3 hours
 • Listed for wood core type fire doors rated 20 minutes
 • Non-handed




 Specifications
 Fasteners
 No. of
 No. Base Material Gauge Holes Machine Wood
 PH-4 Cast Steel .187 10 3/
 4 x 12-24 11/4 x 12



 Specifications
 Door Weight (Lbs.) Door Width # Hinges/Door
 150 3''0" x 7''0" 2
 250 3''0" x 7''0" 3
 350 4''0" x 7''0" 4

 Meets or exceeds
 Recommended for applications where Swing Clear Hinges are aesthetically
 ANSI A117.1 - 1986
 unacceptable and use of the full width of the corridor is required, such as cross
 Providing Accessibility
 corridor and smoke and fire doors as well as patient room doors.
 and Usability for Physically
 Handicapped People


 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-2 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 2176, 1, 'specialty hinges
 pocket pivot hinges
 recommended for applications where use of the full width of the corridor is required,
 such as cross corridor and smoke and fire doors as well as patient room doors.


 • the full mortise pocket pivot hinge is designed to give
 a flush appearance to the corridor when the door is
 ph-4
 open and recessed into a pocket in the corridor wall
 • for single and cross corridor doors, the ph-4 allows
 the door to lay against the wall with no projection into
 the opening and no gap between the door and frame
 • when combined with a floor closer, this application has
 minimum visible hardware and clearances
 • the ph-4 full mortise pocket pivot hinge meets
 material and performance requirements of nfpa-80
 and ansi a-156-1
 • meets or exceeds ansi a117.1 – 1986
 application
 providing accessibility and usability for physically
 handicapped people
 • investment cast steel base material (finish - 26d)
 • two thrust bearings for vertical loads
 • roller bearing for lateral support
 • listed for both hollow metal or steel covered
 composite fire doors rated up to 3 hours
 • listed for wood core type fire doors rated 20 minutes
 • non-handed




 specifications
 fasteners
 no. of
 no. base material gauge holes machine wood
 ph-4 cast steel .187 10 3/
 4 x 12-24 11/4 x 12



 specifications
 door weight (lbs.) door width # hinges/door
 150 3''0" x 7''0" 2
 250 3''0" x 7''0" 3
 350 4''0" x 7''0" 4

 meets or exceeds
 recommended for applications where swing clear hinges are aesthetically
 ansi a117.1 - 1986
 unacceptable and use of the full width of the corridor is required, such as cross
 providing accessibility
 corridor and smoke and fire doors as well as patient room doors.
 and usability for physically
 handicapped people


 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-2 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 81, ' Specialty Hinges
Raised Barrel Full Mortise Standard and Heavy Weight Hinges
Raised Barrel Hinges are recommended for use where the door is set in a deep reveal.

 • Standard weight raised barrel hinges are recommended
 for use on average frequency and/or medium weight RB-TA2314
 wood or metal doors where the door is set in a deep
 revealed frame RB-TA2714
 • Standard weight raised barrel hinges are supplied with
 a no hole bottom plug and the pin is held in place by an
 NRP set screw which allows the hinge to be reversible.
 Specify RB-TA4714/RB-TA4314 for doors beveled on
 hinge side
 • Heavy weight raised barrel hinges are recommended for
 use on high frequency and/or heavy wood or metal doors
 where the door is set in a deep revealed frame RB-T4A3786
 • Heavy weight raised barrel hinges are supplied with RB-T4A3386
 a no hole bottom plug and the pin is held in place by an
 NRP set screw which allows the hinge to be reversible.
 Specify RB-T4A4786/RB-T4A4386 for doors beveled
 on hinge side
 • Door leaf mortised into door
 • Frame leaf may be mortised or surface applied
 • Reversible Hinge

 Square Edge
No. Base Material Weight
 Application
RB-TA2714 Steel STD
RB-TA2314 Stainless Steel STD
RB-T4A3786 Steel HVY
RB-T4A3386 Stainless Steel HVY


Specifications
 Fasteners
 No. of Beveled Edge
Inches mm Gauge Holes Machine Wood Application

41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
5" x 41/2" 127.0 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-3
', 1939, 1, ' specialty hinges
raised barrel full mortise standard and heavy weight hinges
raised barrel hinges are recommended for use where the door is set in a deep reveal.

 • standard weight raised barrel hinges are recommended
 for use on average frequency and/or medium weight rb-ta2314
 wood or metal doors where the door is set in a deep
 revealed frame rb-ta2714
 • standard weight raised barrel hinges are supplied with
 a no hole bottom plug and the pin is held in place by an
 nrp set screw which allows the hinge to be reversible.
 specify rb-ta4714/rb-ta4314 for doors beveled on
 hinge side
 • heavy weight raised barrel hinges are recommended for
 use on high frequency and/or heavy wood or metal doors
 where the door is set in a deep revealed frame rb-t4a3786
 • heavy weight raised barrel hinges are supplied with rb-t4a3386
 a no hole bottom plug and the pin is held in place by an
 nrp set screw which allows the hinge to be reversible.
 specify rb-t4a4786/rb-t4a4386 for doors beveled
 on hinge side
 • door leaf mortised into door
 • frame leaf may be mortised or surface applied
 • reversible hinge

 square edge
no. base material weight
 application
rb-ta2714 steel std
rb-ta2314 stainless steel std
rb-t4a3786 steel hvy
rb-t4a3386 stainless steel hvy


specifications
 fasteners
 no. of beveled edge
inches mm gauge holes machine wood application

41/2" x 41/2" 114.3 x 114.3 .134 8 1/
 2 x 12-24 11/4 x 12
41/2" x 41/2" 114.3 x 114.3 .180 8 1/
 2 x 12-24 11/4 x 12
5" x 41/2" 127.0 x 114.3 .190 8 1/
 2 x 12-24 11/4 x 12




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 82, 'Specialty Hinges
 Slip-In Full Mortise Type 1 and 2 Standard Weight Bearing Hinges
 Recommended for use on average frequency and/or medium weight aluminum doors
 with aluminum frames in schools, hospitals and other public buildings where medium
 traffic is experienced.

 Type 1
 Type 1
 • One leaf has standard punching and countersinking
 and the other leaf is drilled and tapped so it can be
 inserted through a slot in the door or frame. Both
 leaves are specially swaged to provide 3/16" clearance
 between leaves when parallel
 • Hinges are handed - Indicate hand when ordering.
 LH shown, RH opposite
 Type 2 Type 2
 • Both leaves are drilled and tapped so they can be
 inserted through a slot in the door and frame. Both
 leaves are specially swaged to provide 5/16" clearance
 between the leaves when parallel
 • Hinges are non-handed


 No. Base Material Weight Type 1
 Application
 TA2314 Type 1 Stainless Steel STD
 TA2714 Type 1 Steel STD
 TA2314 Type 2 Stainless Steel STD
 TA2714 Type 2 Steel STD



 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood Type 2
 4" x 4" Type 1 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12 Application

 41/2" x 4" Type 1 124.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" Type 1 124.3 x 124.3 .134 8 1/
 2 x 12-24 11/4 x 12


 Fastener
 No. of
 Inches mm Gauge Holes Machine
 4" x 4" Type 2 101.6 x 101.6 .130 8 1/
 2 x 12-24
 41/2" x 4" Type 2 124.3 x 101.6 .134 8 1/
 2 x 12-24
 Options:
 41/2" x 41/2" Type 2 124.3 x 124.3 .134 8 1/
 2 x 12-24
 Code Description
 NRP Non-Removable Pin

 Approved for NFPA 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-4 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1965, 1, 'specialty hinges
 slip-in full mortise type 1 and 2 standard weight bearing hinges
 recommended for use on average frequency and/or medium weight aluminum doors
 with aluminum frames in schools, hospitals and other public buildings where medium
 traffic is experienced.

 type 1
 type 1
 • one leaf has standard punching and countersinking
 and the other leaf is drilled and tapped so it can be
 inserted through a slot in the door or frame. both
 leaves are specially swaged to provide 3/16" clearance
 between leaves when parallel
 • hinges are handed - indicate hand when ordering.
 lh shown, rh opposite
 type 2 type 2
 • both leaves are drilled and tapped so they can be
 inserted through a slot in the door and frame. both
 leaves are specially swaged to provide 5/16" clearance
 between the leaves when parallel
 • hinges are non-handed


 no. base material weight type 1
 application
 ta2314 type 1 stainless steel std
 ta2714 type 1 steel std
 ta2314 type 2 stainless steel std
 ta2714 type 2 steel std



 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood type 2
 4" x 4" type 1 101.6 x 101.6 .130 8 1/
 2 x 12-24 11/4 x 12 application

 41/2" x 4" type 1 124.3 x 101.6 .134 8 1/
 2 x 12-24 11/4 x 12
 41/2" x 41/2" type 1 124.3 x 124.3 .134 8 1/
 2 x 12-24 11/4 x 12


 fastener
 no. of
 inches mm gauge holes machine
 4" x 4" type 2 101.6 x 101.6 .130 8 1/
 2 x 12-24
 41/2" x 4" type 2 124.3 x 101.6 .134 8 1/
 2 x 12-24
 options:
 41/2" x 41/2" type 2 124.3 x 124.3 .134 8 1/
 2 x 12-24
 code description
 nrp non-removable pin

 approved for nfpa 80 fire rated openings




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-4 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 83, ' Specialty Hinges
Full Mortise Interim Hinges
Recommended for installations where door and frame are prepped for two
different size hinges.

 • For new or retrofit installations
 TA2714
 • An equal amount is trimmed from the top and bottom Interim
 of the leaf
 • Interim hinges are supplied with a no hole bottom plug
 and the pin is held in place by an NRP set screw which
 allows the hinge to be reversible
 • Available in both standard (TA2714; TA2314) and heavy
 weight (T4A3786; T4A3386)
 • For finishes see page 28


No. Base Material Weight
TA2714 Interim Steel STD
TA2314 Interim Stainless Steel STD
T4A3786 Interim Steel HVY
T4A3386 Interim Stainless Steel HVY



Specifications
 Fasteners
 No. of
Door Leaf Jamb Leaf Gauge Holes Machine Wood
5" 4 2"*
 1/
 .146 STD 8 1/
 2 x 12-24 11/4 x 12
41/2"* 5" .146 STD 8 1/
 2 x 12-24 11/4 x 12



Specifications
 Fasteners
 No. of
Door Leaf Jamb Leaf Gauge Holes Machine Wood
5" 4 2"*
 1/
 .190 HVY 8 1/
 2 x 12-24 11/4 x 12
41/2"* 5" .190 HVY 8 1/
 2 x 12-24 11/4 x 12

*Trimmed to height




Approved for NFPA 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-5
', 1444, 1, ' specialty hinges
full mortise interim hinges
recommended for installations where door and frame are prepped for two
different size hinges.

 • for new or retrofit installations
 ta2714
 • an equal amount is trimmed from the top and bottom interim
 of the leaf
 • interim hinges are supplied with a no hole bottom plug
 and the pin is held in place by an nrp set screw which
 allows the hinge to be reversible
 • available in both standard (ta2714; ta2314) and heavy
 weight (t4a3786; t4a3386)
 • for finishes see page 28


no. base material weight
ta2714 interim steel std
ta2314 interim stainless steel std
t4a3786 interim steel hvy
t4a3386 interim stainless steel hvy



specifications
 fasteners
 no. of
door leaf jamb leaf gauge holes machine wood
5" 4 2"*
 1/
 .146 std 8 1/
 2 x 12-24 11/4 x 12
41/2"* 5" .146 std 8 1/
 2 x 12-24 11/4 x 12



specifications
 fasteners
 no. of
door leaf jamb leaf gauge holes machine wood
5" 4 2"*
 1/
 .190 hvy 8 1/
 2 x 12-24 11/4 x 12
41/2"* 5" .190 hvy 8 1/
 2 x 12-24 11/4 x 12

*trimmed to height




approved for nfpa 80 fire rated openings




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-5
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 84, 'Specialty Hinges
 Residential Swing Clear Hinge
 Swing Clear Hinges create barrier free openings by moving the hinge barrel
 and door edge out of the way. Recommended for use on new or retrofit
 applications where accessibility is a current or future issue.



 Available Styles Specifications

 T2895 Inches mm Gauge No. of Fasteners
 Size Finish Corners Holes Wood

 31/2" US4 /4" RC
 1 31/2" 88.9 0.086 6 1 x10
 3 /2 "
 1
 US4 /8" RC
 5 4" 101.6 0.123 8 11/4 x 12
 31/2" US15 /4" RC
 1
 Base material is steel
 3 /2 "
 1
 US15 /8" RC
 5
 Residential Swing
 31/2" 10BE /4" RC
 1
 Clear Hinge
 31/2" 10BE /8" RC
 5

 T2895
 4" US4 /4" RC
 1


 4" US15 /4" RC
 1


 4" 10BE /4" RC
 1




 Door opening with a Door opening with a
 regular hinge swing clear hinge




 RediFrame Swing Clear Hinge
 Designed specifically for RediFrame and Timely door frames.


 Available Styles Specifications

 TA2895 & TA4895 Inches mm Gauge No. of Fasteners
 Size Finish Corners Holes
 41/2" 26D SC 41/2" 114.3 0.134 8 Metal and Wood

 Base material is steel
 Rediframe Swing
 Clear Hinge
 TA2895




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-6 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1440, 1, 'specialty hinges
 residential swing clear hinge
 swing clear hinges create barrier free openings by moving the hinge barrel
 and door edge out of the way. recommended for use on new or retrofit
 applications where accessibility is a current or future issue.



 available styles specifications

 t2895 inches mm gauge no. of fasteners
 size finish corners holes wood

 31/2" us4 /4" rc
 1 31/2" 88.9 0.086 6 1 x10
 3 /2 "
 1
 us4 /8" rc
 5 4" 101.6 0.123 8 11/4 x 12
 31/2" us15 /4" rc
 1
 base material is steel
 3 /2 "
 1
 us15 /8" rc
 5
 residential swing
 31/2" 10be /4" rc
 1
 clear hinge
 31/2" 10be /8" rc
 5

 t2895
 4" us4 /4" rc
 1


 4" us15 /4" rc
 1


 4" 10be /4" rc
 1




 door opening with a door opening with a
 regular hinge swing clear hinge




 rediframe swing clear hinge
 designed specifically for rediframe and timely door frames.


 available styles specifications

 ta2895 & ta4895 inches mm gauge no. of fasteners
 size finish corners holes
 41/2" 26d sc 41/2" 114.3 0.134 8 metal and wood

 base material is steel
 rediframe swing
 clear hinge
 ta2895




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-6 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 85, ' Specialty Hinges
Residential Spring Hinges
Designed for light weight, self-closing doors.
 • Made out of residential grade material making it a perfect fit for multi-family housing and similar
 applications
 • Used as an alternative to door closing devices
 • Generally two spring hinges must be used in order to provide the force needed to close the door

 • The 31⁄2" hinge is available as the 1552 stainless steel version or the 1502 steel hinge which is offered
 in a variety of finishes
 Part number Description Finish
 155880 31/2 x 31/2 1502 3
 31/2 x 31/2
 155881 3 /2 x 3 /2 1502
 1 1
 4
 155882 31/2 x 31/2 1502 10 1502
 155883 3 /2 x 3 /2 1502
 1 1
 10A
 155884 31/2 x 31/2 1502 10B
 155884E 31/2 x 31/2 1502 10BE
 155885 3 /2 x 3 /2 1502
 1 1
 15
 155886 31/2 x 31/2 1502 26
 155887 3 /2 x 3 /2 1502
 1 1
 26D
 155888 31/2 x 31/2 1502 BSP
 155889 31/2 x 31/2 1502 P
 155890 3 /2 x 3 /2 1552
 1 1
 32D

Specifications
 Inches mm Gauge No. of Fasteners Fasteners
 Holes Wood Metal
 31/2" x 31/2" 88.9 x 88.9 .106 6 #10 x 11/4" #10-24 x ½"



Residential Hinges
 4x4
For light weight doors.
 1400
 • For multi-family and residential applications
 • Rounded or square corners
 • Consult the factory for availability of other finishes


 Part number Description Finish Corners 31/2 x 31/2
 56689 3 /2 x 3 /2 1400
 1 1
 4 Square
 1414
 56868 31/2 x 31/2 1458 26D 5
 /8 " radius

 56869 3 /2 x 3 /2 1458
 1 1
 BSP 5
 /8 " radius

 56870 31/2 x 31/2 1458 3 5
 /8 " radius

 56288 3 /2 x 3 /2 1400
 1 1
 26D Square
 56281 31/2 x 31/2 1414 26D 1
 /4" radius 31/2 x 31/2
 56748 4 x 4 1400 26D Square
 1458
Base material is steel




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-7
', 1989, 1, ' specialty hinges
residential spring hinges
designed for light weight, self-closing doors.
 • made out of residential grade material making it a perfect fit for multi-family housing and similar
 applications
 • used as an alternative to door closing devices
 • generally two spring hinges must be used in order to provide the force needed to close the door

 • the 31⁄2" hinge is available as the 1552 stainless steel version or the 1502 steel hinge which is offered
 in a variety of finishes
 part number description finish
 155880 31/2 x 31/2 1502 3
 31/2 x 31/2
 155881 3 /2 x 3 /2 1502
 1 1
 4
 155882 31/2 x 31/2 1502 10 1502
 155883 3 /2 x 3 /2 1502
 1 1
 10a
 155884 31/2 x 31/2 1502 10b
 155884e 31/2 x 31/2 1502 10be
 155885 3 /2 x 3 /2 1502
 1 1
 15
 155886 31/2 x 31/2 1502 26
 155887 3 /2 x 3 /2 1502
 1 1
 26d
 155888 31/2 x 31/2 1502 bsp
 155889 31/2 x 31/2 1502 p
 155890 3 /2 x 3 /2 1552
 1 1
 32d

specifications
 inches mm gauge no. of fasteners fasteners
 holes wood metal
 31/2" x 31/2" 88.9 x 88.9 .106 6 #10 x 11/4" #10-24 x ½"



residential hinges
 4x4
for light weight doors.
 1400
 • for multi-family and residential applications
 • rounded or square corners
 • consult the factory for availability of other finishes


 part number description finish corners 31/2 x 31/2
 56689 3 /2 x 3 /2 1400
 1 1
 4 square
 1414
 56868 31/2 x 31/2 1458 26d 5
 /8 " radius

 56869 3 /2 x 3 /2 1458
 1 1
 bsp 5
 /8 " radius

 56870 31/2 x 31/2 1458 3 5
 /8 " radius

 56288 3 /2 x 3 /2 1400
 1 1
 26d square
 56281 31/2 x 31/2 1414 26d 1
 /4" radius 31/2 x 31/2
 56748 4 x 4 1400 26d square
 1458
base material is steel




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-7
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 86, 'Specialty Hinges
 Decorative Hinges – Square Barrel
 Recommended for use on doors of average weight with average frequency.


 • Interior or exterior hollow metal and wood frame doors
 • 13/4" thick doors
 • Used with square edge doors only
 • Bearing contains anti-friction component
 • Cannot be electrified
 • SQ314 only:
 • UL Listed for both hollow metal or steel covered 
 composite fire doors rated up to 3 hours SQ3331
 • UL Listed for wood core fire doors rated 20 minutes
 Two Knuckle

 No. Base Material Handing Weight
 SQ3331 Two Knuckle Brass Handed Special
 SQ314 Three Knuckle Stainless Steel Non-Handed Special

 Approved for NFPA 80 fire rated openings


 Specifications
 Fasteners
 No. of
 Inches mm Gauge Holes Machine Wood
 41/2" x 41/2" 114.3 x 114.3 .177 8 1/
 2 x 12-24 11/4 x 12 SQ314
 41/2" x 4* 114.3 x 101.6 .177 8 1/
 2 x 12-24 11/4 x 12 Three Knuckle
 *Size not offered for SQ3331



 SQ3331 Finishes
 03 – Bright Brass, Clear Coated
 10B – Dark Oxidized Satin Bronze, Oil Rubbed
 10BE – Dark Oxidized Satin Bronze, Equivalent
 14 – Bright Nickel, Clear Coated
 15 – Satin Nickel, Clear Coated
 26 – Bright Chrome
 26D – Satin Chrome
 BSP – Black Suede Powder Coat
 WSP – White Suede Powder Coat


 SQ314 Finish
 32D – Satin Stainless Steel

 Note: Other finishes may be available upon request




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-8 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1682, 1, 'specialty hinges
 decorative hinges – square barrel
 recommended for use on doors of average weight with average frequency.


 • interior or exterior hollow metal and wood frame doors
 • 13/4" thick doors
 • used with square edge doors only
 • bearing contains anti-friction component
 • cannot be electrified
 • sq314 only:
 • ul listed for both hollow metal or steel covered 
 composite fire doors rated up to 3 hours sq3331
 • ul listed for wood core fire doors rated 20 minutes
 two knuckle

 no. base material handing weight
 sq3331 two knuckle brass handed special
 sq314 three knuckle stainless steel non-handed special

 approved for nfpa 80 fire rated openings


 specifications
 fasteners
 no. of
 inches mm gauge holes machine wood
 41/2" x 41/2" 114.3 x 114.3 .177 8 1/
 2 x 12-24 11/4 x 12 sq314
 41/2" x 4* 114.3 x 101.6 .177 8 1/
 2 x 12-24 11/4 x 12 three knuckle
 *size not offered for sq3331



 sq3331 finishes
 03 – bright brass, clear coated
 10b – dark oxidized satin bronze, oil rubbed
 10be – dark oxidized satin bronze, equivalent
 14 – bright nickel, clear coated
 15 – satin nickel, clear coated
 26 – bright chrome
 26d – satin chrome
 bsp – black suede powder coat
 wsp – white suede powder coat


 sq314 finish
 32d – satin stainless steel

 note: other finishes may be available upon request




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-8 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 87, ' Specialty Hinges
Decorative Hinges – Olive Knuckle
Recommended for use on interior or exterior hollow metal and wood frame doors.


 • Interior or exterior hollow metal and wood frame doors
 TA3383
 • 13/8" to 13/4" thick doors
 • Bearing contains anti-friction component
 • Specify right or left hand when ordering
 • Cannot be electrified




No. Base Material Weight
TA3383 Olive Knuckle Brass LT



Specifications
 Fasteners
 No. of
Inches mm Gauge Holes Machine Wood
6" x 37/8" 152.4 x 98.4 .203 8 1/
 2 x 12-24 11/4 x 12

Width of Leaves 13/16" (20.6mm)




 Finishes
 03 – Bright Brass, Clear Coated
 03NL – Bright Brass, No Lacquer
 10B – Dark Oxidized Satin Bronze, Oil Rubbed
 10BE – Dark Oxidized Satin Bronze, Equivalent
 14 – Bright Nickel, Clear Coated
 15 – Satin Nickel, Clear Coated
 26 – Bright Chrome
 26D – Satin Chrome
 BSP – Black Suede Powder Coat
 WSP – White Suede Powder Coat




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-9
', 1258, 1, ' specialty hinges
decorative hinges – olive knuckle
recommended for use on interior or exterior hollow metal and wood frame doors.


 • interior or exterior hollow metal and wood frame doors
 ta3383
 • 13/8" to 13/4" thick doors
 • bearing contains anti-friction component
 • specify right or left hand when ordering
 • cannot be electrified




no. base material weight
ta3383 olive knuckle brass lt



specifications
 fasteners
 no. of
inches mm gauge holes machine wood
6" x 37/8" 152.4 x 98.4 .203 8 1/
 2 x 12-24 11/4 x 12

width of leaves 13/16" (20.6mm)




 finishes
 03 – bright brass, clear coated
 03nl – bright brass, no lacquer
 10b – dark oxidized satin bronze, oil rubbed
 10be – dark oxidized satin bronze, equivalent
 14 – bright nickel, clear coated
 15 – satin nickel, clear coated
 26 – bright chrome
 26d – satin chrome
 bsp – black suede powder coat
 wsp – white suede powder coat




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-9
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 88, 'Concealed Hinges
 Concealed Hinges Finishes
 For use on wood or hollow metal doors with wood or metal frames. Satin Chrome
 • Non-handed • Opening angle: 180° • 3-dimensional adjustability Matte Black

 No. Of Matte White
 Model Inches mm Metal Wood (MK1821A only)
 Holes
 MK1821A 63/32" x 53/64" 155 x 21 4 M5 x 20 screws 35mm PHWS Additional finishes on request
 MK4001A 41/2" x 7/8" 115 x 23 4 M5 x 20 screws 35mm PHWS




 MK1821A Series
 • Magnetic Covers included • Base material: Zinc alloy
 • Door thickness minimum: 1"
 Hinge Capacity
 Number of Door Width
 Hinges 27.5" 32" 36" 40"
 2 227 lbs 198 lbs 176 lbs 158 lbs
 3 253 lbs 220 lbs 198 lbs 178 lbs
 4 285 lbs 249 lbs 220 lbs 198 lbs
 MK1821A
 Note: When installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 MK4001A Series
 • Snap-on covers included • Base material: Zinc alloy
 • Door thickness minimum: 11/4"

 Hinge Capacity
 Number of Door Width
 Hinges 32" 36" 38" 42" 48"
 2 138 lbs 130 lbs 123 lbs 112 lbs 97 lbs
 3 155 lbs 146 lbs 139 lbs 126 lbs 109 lbs
 4 166 lbs 156 lbs 148 lbs 135 lbs 116 lbs

 Note: When installing with a door closer at least 3 hinges are required,
 MK4001A
 and reduce maximum door weight in chart by 30%.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-10 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1629, 1, 'concealed hinges
 concealed hinges finishes
 for use on wood or hollow metal doors with wood or metal frames. satin chrome
 • non-handed • opening angle: 180° • 3-dimensional adjustability matte black

 no. of matte white
 model inches mm metal wood (mk1821a only)
 holes
 mk1821a 63/32" x 53/64" 155 x 21 4 m5 x 20 screws 35mm phws additional finishes on request
 mk4001a 41/2" x 7/8" 115 x 23 4 m5 x 20 screws 35mm phws




 mk1821a series
 • magnetic covers included • base material: zinc alloy
 • door thickness minimum: 1"
 hinge capacity
 number of door width
 hinges 27.5" 32" 36" 40"
 2 227 lbs 198 lbs 176 lbs 158 lbs
 3 253 lbs 220 lbs 198 lbs 178 lbs
 4 285 lbs 249 lbs 220 lbs 198 lbs
 mk1821a
 note: when installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 mk4001a series
 • snap-on covers included • base material: zinc alloy
 • door thickness minimum: 11/4"

 hinge capacity
 number of door width
 hinges 32" 36" 38" 42" 48"
 2 138 lbs 130 lbs 123 lbs 112 lbs 97 lbs
 3 155 lbs 146 lbs 139 lbs 126 lbs 109 lbs
 4 166 lbs 156 lbs 148 lbs 135 lbs 116 lbs

 note: when installing with a door closer at least 3 hinges are required,
 mk4001a
 and reduce maximum door weight in chart by 30%.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-10 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 89, ' Concealed Hinges
Concealed Hinges Finishes
For use on wood or hollow metal doors with wood or metal frames. MK80SS:
 • Non-handed • Opening angle: 180° • 3-dimensional adjustability Stainless Steel
 MK80, MK80A, MK100, MK100ME:
 No. Of
 Model Inches mm Metal Wood Satin Chrome
 Holes
 Matte Black
 MK80 43/8" x 11/8" 111.5 x 29 4 M5 x 20 screws 35mm PHWS
 MK80A, MK100 only:
 MK80A 43/8" x 11/8" 111.5 x 29 4 M5 x 20 screws 35mm PHWS
 Matte White
 MK80SS 43/8" x 11/8" 111.5 x 29 4 M5 x 20 screws 35mm PHWS Polished Chrome*
 MK100 63/32" x 53/64" 160 x 28 8 M5 x 20 screws 35mm PHWS Polished Brass*
 MK100ME 6 /4" x 1 /16"
 1 1
 160 x 28 8 M5 x 20 screws 35mm PHWS Polished Copper
 Antique Bronze*
 Additional finishes on request

 *C ataphoresis coating is standard on
 these finishes, providing a durable and
 corrosion-resistant surface.
MK80/MK80A/MK80SS Series
 • Covers: • Base material:
 – MK80/MK80SS: No covers – MK80/MK80A: Zinc alloy
 – MK80A: Magnetic – MK80SS: Stainless Steel
 covers included • Cataphoresis coating is standard
 • Door thickness minimum: 13/8" on MK80A for select finishes


Hinge Capacity
Number of Door Width
Hinges 32" 36" 42" 48"
2 185 lbs 176 lbs 143 lbs 132 lbs
3 211 lbs 198 lbs 160 lbs 149 lbs
4 233 lbs 220 lbs 171 lbs 158 lbs

Note: When installing with a door closer at least 3 hinges are required, MK80 MK80A MK80SS
 and reduce maximum door weight in chart by 30%.
 MK80SS approved for NFPA80 fire rated openings



 MK100/MK100ME Series
 • Magnetic covers included • MK100ME available in CC12
 • Door thickness minimum: 13/8" and QC12 configurations
 • Base material: Zinc alloy • Cataphoresis coating is standard
 • ANSI/BHMA 156.1 Grade 1 on MK100 for select finishes
 (MK100 only)


 Hinge Capacity
 Number of Door Width
 Hinges 32" 36" 42" 48"
 2 224 lbs 220 lbs 180 lbs 165 lbs
 3 253 lbs 246 lbs 202 lbs 185 lbs MK100 MK100ME
 4 282 lbs 275 lbs 216 lbs 198 lbs

Note: When installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-11
', 2402, 1, ' concealed hinges
concealed hinges finishes
for use on wood or hollow metal doors with wood or metal frames. mk80ss:
 • non-handed • opening angle: 180° • 3-dimensional adjustability stainless steel
 mk80, mk80a, mk100, mk100me:
 no. of
 model inches mm metal wood satin chrome
 holes
 matte black
 mk80 43/8" x 11/8" 111.5 x 29 4 m5 x 20 screws 35mm phws
 mk80a, mk100 only:
 mk80a 43/8" x 11/8" 111.5 x 29 4 m5 x 20 screws 35mm phws
 matte white
 mk80ss 43/8" x 11/8" 111.5 x 29 4 m5 x 20 screws 35mm phws polished chrome*
 mk100 63/32" x 53/64" 160 x 28 8 m5 x 20 screws 35mm phws polished brass*
 mk100me 6 /4" x 1 /16"
 1 1
 160 x 28 8 m5 x 20 screws 35mm phws polished copper
 antique bronze*
 additional finishes on request

 *c ataphoresis coating is standard on
 these finishes, providing a durable and
 corrosion-resistant surface.
mk80/mk80a/mk80ss series
 • covers: • base material:
 – mk80/mk80ss: no covers – mk80/mk80a: zinc alloy
 – mk80a: magnetic – mk80ss: stainless steel
 covers included • cataphoresis coating is standard
 • door thickness minimum: 13/8" on mk80a for select finishes


hinge capacity
number of door width
hinges 32" 36" 42" 48"
2 185 lbs 176 lbs 143 lbs 132 lbs
3 211 lbs 198 lbs 160 lbs 149 lbs
4 233 lbs 220 lbs 171 lbs 158 lbs

note: when installing with a door closer at least 3 hinges are required, mk80 mk80a mk80ss
 and reduce maximum door weight in chart by 30%.
 mk80ss approved for nfpa80 fire rated openings



 mk100/mk100me series
 • magnetic covers included • mk100me available in cc12
 • door thickness minimum: 13/8" and qc12 configurations
 • base material: zinc alloy • cataphoresis coating is standard
 • ansi/bhma 156.1 grade 1 on mk100 for select finishes
 (mk100 only)


 hinge capacity
 number of door width
 hinges 32" 36" 42" 48"
 2 224 lbs 220 lbs 180 lbs 165 lbs
 3 253 lbs 246 lbs 202 lbs 185 lbs mk100 mk100me
 4 282 lbs 275 lbs 216 lbs 198 lbs

note: when installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-11
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 90, 'Concealed Hinges
 Concealed Hinges Finishes
 For use on wood or hollow metal doors with wood or metal frames. Satin Chrome
 • Non-handed • Opening angle: 180° • 3-dimensional adjustability Additional finishes on request

 No. Of
 Model Inches mm Metal Wood
 Holes
 MK150 7 7/8" x 11/4" 200 x 32 8 M5 x 20 screws 35mm PHWS
 MK200 101/4" x 13/8" 260 x 36 8 M5 x 20 screws 35mm PHWS




 MK150 Series
 • Magnetic covers included • Base Material: Zinc alloy
 • Door thickness minimum: 11/2" • ANSI/BHMA A156.1 Double
 Weight Testing Accomplished
 Hinge Capacity
 Door Width
 MK150 Series
 Number of
 Hinges 32" 36" 38" 42" 48"
 2 366 lbs 326 lbs 313 lbs 280 lbs 245 lbs
 3 412 lbs 367 lbs 352 lbs 315 lbs 275 lbs
 4 457 lbs 408 lbs 391 lbs 350 lbs 306 lbs

 Note: When installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 MK200 Series
 • Magnetic covers included • Base Material: Zinc alloy
 • Door thickness minimum: 13/4" • ANSI/BHMA A156.1 Triple
 Weight Testing Accomplished
 Hinge Capacity
 Number of Door Width MK200 Series
 Hinges 32" 36" 38" 42" 48"
 2 487 lbs 434 lbs 417 lbs 373 lbs 326 lbs
 3 548 lbs 489 lbs 469 lbs 419 lbs 367 lbs
 4 609 lbs 543 lbs 521 lbs 466 lbs 408 lbs

 Note: When installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 800-346-7707 | www.mckinneyhinge.com
 Check the web site for the up-to-date catalog
 McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
 SP-12 All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited.
', 1738, 1, 'concealed hinges
 concealed hinges finishes
 for use on wood or hollow metal doors with wood or metal frames. satin chrome
 • non-handed • opening angle: 180° • 3-dimensional adjustability additional finishes on request

 no. of
 model inches mm metal wood
 holes
 mk150 7 7/8" x 11/4" 200 x 32 8 m5 x 20 screws 35mm phws
 mk200 101/4" x 13/8" 260 x 36 8 m5 x 20 screws 35mm phws




 mk150 series
 • magnetic covers included • base material: zinc alloy
 • door thickness minimum: 11/2" • ansi/bhma a156.1 double
 weight testing accomplished
 hinge capacity
 door width
 mk150 series
 number of
 hinges 32" 36" 38" 42" 48"
 2 366 lbs 326 lbs 313 lbs 280 lbs 245 lbs
 3 412 lbs 367 lbs 352 lbs 315 lbs 275 lbs
 4 457 lbs 408 lbs 391 lbs 350 lbs 306 lbs

 note: when installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 mk200 series
 • magnetic covers included • base material: zinc alloy
 • door thickness minimum: 13/4" • ansi/bhma a156.1 triple
 weight testing accomplished
 hinge capacity
 number of door width mk200 series
 hinges 32" 36" 38" 42" 48"
 2 487 lbs 434 lbs 417 lbs 373 lbs 326 lbs
 3 548 lbs 489 lbs 469 lbs 419 lbs 367 lbs
 4 609 lbs 543 lbs 521 lbs 466 lbs 408 lbs

 note: when installing with a door closer at least 3 hinges are required,
 and reduce maximum door weight in chart by 30%.




 800-346-7707 | www.mckinneyhinge.com
 check the web site for the up-to-date catalog
 mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
 sp-12 all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited.
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 91, ' Specialty Hinges
Cam Lift Hinges
Move the door up and then lower it to create a tight seal when the door is closed. These
hinges are recommended for acoustic doors and energy saving doors with seals.

 • 4 models for standard and heavy weight metal doors
 • 304 Stainless Steel Material, 32D Finish
 • Handed- specify right (RH) or left handed (LH) when ordering
 • Clearance - Minimum clearance at head of frame is 3/16". For doors greater
 than 13/4" clearance is 1/4"
 Cam Lift Hinge (RH)
 Model Size Fasteners
 No. Of Lift (180° Door Rating
 Thickness MKCL134
 Holes Opening) (11⁄2 Pairs)
 MKCL134 41/2" x 41/2" 12-24 x 3/4" 8 3
 /16" up to 200 lbs .134
 MKCL180 5" x 4 /2"
 1
 12-24 x /4"
 3
 8 1
 /4 " up to 300 lbs .180
 MKCL250 5" x 4 /2"
 1
 12-24 x /4"
 3
 8 5
 /16" up to 500 lbs .25
 MKCL2500 5" x 41/2" /16 -18 x 3/4"
 5
 8 5
 /16" up to 900 lbs .25

Approved for NFPA80 fire rated openings




 Cam Lift Hinge (LH)
 MKCL180


Pivot Reinforcing Hinges 5540
Installed at the top of the door and to the head of the frame and 5545
are used as a retrofit solution to fix sagging or damaged doors.

 • Handed
 • Installed at the top of the door and to the head of the frame 8540
 • Satin stainless steel (5540, 5545) and satin nickel plated (8540, 8545) finishes only
 8545
 • Retrofittable
 • Fixes sagging or damaged doors




 Model Inches Millimeters Gauge No. of Holes Fastener

 5540 4" 101.6 0.190 9 Oval Philips Head Machine Screw with Grommet Nut
 5545 4 ⁄"
 1
 2 114.3 0.190 9 Oval Philips Head Machine Screw with Grommet Nut
 8540 4" 101.6 0.190 9 Oval Philips Head Machine Screw with Grommet Nut
 8545 4 ⁄"
 1
 2 114.3 0.190 9 Oval Philips Head Machine Screw with Grommet Nut




800-346-7707 | www.mckinneyhinge.com
Check the web site for the up-to-date catalog
McKinney is a brand associated with Corbin Russwin, Inc., an ASSA ABLOY Group company. Copyright © 2012-2025, Corbin Russwin, Inc.
All rights reserved. Reproduction in whole or in part without the express written permission of Corbin Russwin, Inc. is prohibited. SP-13
', 2053, 1, ' specialty hinges
cam lift hinges
move the door up and then lower it to create a tight seal when the door is closed. these
hinges are recommended for acoustic doors and energy saving doors with seals.

 • 4 models for standard and heavy weight metal doors
 • 304 stainless steel material, 32d finish
 • handed- specify right (rh) or left handed (lh) when ordering
 • clearance - minimum clearance at head of frame is 3/16". for doors greater
 than 13/4" clearance is 1/4"
 cam lift hinge (rh)
 model size fasteners
 no. of lift (180° door rating
 thickness mkcl134
 holes opening) (11⁄2 pairs)
 mkcl134 41/2" x 41/2" 12-24 x 3/4" 8 3
 /16" up to 200 lbs .134
 mkcl180 5" x 4 /2"
 1
 12-24 x /4"
 3
 8 1
 /4 " up to 300 lbs .180
 mkcl250 5" x 4 /2"
 1
 12-24 x /4"
 3
 8 5
 /16" up to 500 lbs .25
 mkcl2500 5" x 41/2" /16 -18 x 3/4"
 5
 8 5
 /16" up to 900 lbs .25

approved for nfpa80 fire rated openings




 cam lift hinge (lh)
 mkcl180


pivot reinforcing hinges 5540
installed at the top of the door and to the head of the frame and 5545
are used as a retrofit solution to fix sagging or damaged doors.

 • handed
 • installed at the top of the door and to the head of the frame 8540
 • satin stainless steel (5540, 5545) and satin nickel plated (8540, 8545) finishes only
 8545
 • retrofittable
 • fixes sagging or damaged doors




 model inches millimeters gauge no. of holes fastener

 5540 4" 101.6 0.190 9 oval philips head machine screw with grommet nut
 5545 4 ⁄"
 1
 2 114.3 0.190 9 oval philips head machine screw with grommet nut
 8540 4" 101.6 0.190 9 oval philips head machine screw with grommet nut
 8545 4 ⁄"
 1
 2 114.3 0.190 9 oval philips head machine screw with grommet nut




800-346-7707 | www.mckinneyhinge.com
check the web site for the up-to-date catalog
mckinney is a brand associated with corbin russwin, inc., an assa abloy group company. copyright © 2012-2025, corbin russwin, inc.
all rights reserved. reproduction in whole or in part without the express written permission of corbin russwin, inc. is prohibited. sp-13
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('00414107e0710bb6', 92, 'McKinney ASSA ABLOY Opening Solutions
225 Episcopal Road Door Security Solutions Canada
Berlin, CT 06037 160 Four Valley Drive
www.mckinneyhinge.com Vaughan, ON L4K 4T9
1 800 346 7707 www.assaabloydss.ca
 1 800 461 3007

McKinney is a product line of ASSA ABLOY Accessories and Door Controls Group, Inc., an ASSA ABLOY Group company.
Copyright © 2020-2025, ASSA ABLOY Accessories and Door Controls Group, Inc. All rights reserved. Reproduction in whole or in part
without the express written permission of ASSA ABLOY Accessories and Door Controls Group, Inc. is prohibited. Printed in the U.S.A. 51510 5672 2/25
', 612, 1, 'mckinney assa abloy opening solutions
225 episcopal road door security solutions canada
berlin, ct 06037 160 four valley drive
www.mckinneyhinge.com vaughan, on l4k 4t9
1 800 346 7707 www.assaabloydss.ca
 1 800 461 3007

mckinney is a product line of assa abloy accessories and door controls group, inc., an assa abloy group company.
copyright © 2020-2025, assa abloy accessories and door controls group, inc. all rights reserved. reproduction in whole or in part
without the express written permission of assa abloy accessories and door controls group, inc. is prohibited. printed in the u.s.a. 51510 5672 2/25
');
INSERT OR IGNORE INTO products (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description, available, spec_sheet_url, catalog_number, search_text) VALUES ('prod-mckinney-ta2314', 'mfr-mckinney', 'doors', 'TA', 'Full Mortise Hinges', 'TA2314', 'McKinney TA2314', 'Full Mortise Hinges; manufacturer technical catalogue', 1, 'https://marketing-assets.seclock.com/image/upload/AADSS1010289', 'TA2314', 'mckinney ta2314 ta full mortise hinges');
INSERT OR IGNORE INTO product_documents (id, product_id, document_type, document_title, document_url, r2_object_key, r2_bucket, mime_type, page_count, file_size_bytes, file_hash_sha256, verified, active, notes) VALUES ('doc-g021-mckinney-ta2314', 'prod-mckinney-ta2314', 'cut_sheet', 'McKinney Full Line Hinge Catalog (PDF p.37)', 'https://marketing-assets.seclock.com/image/upload/AADSS1010289', 'catalog-corpus/cd6304bc5b178061ec1acde48ddc67d03fdaefc1fd67d0cb49e83d02f2f85e4f.pdf', 'subx-uploads', 'application/pdf', 92, 13032724, '00414107e0710bb62551b180e5f61b947a978da0e62190dd45473f05f015afe2', 1, 1, 'g021: model visually verified on PDF ordinal 37. Full book; fetch is offline through catalog-corpus, never request-time.');
INSERT OR IGNORE INTO products (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description, available, spec_sheet_url, catalog_number, search_text) VALUES ('prod-mckinney-ta2714', 'mfr-mckinney', 'doors', 'TA', 'Full Mortise Hinges', 'TA2714', 'McKinney TA2714', 'Full Mortise Hinges; manufacturer technical catalogue', 1, 'https://marketing-assets.seclock.com/image/upload/AADSS1010289', 'TA2714', 'mckinney ta2714 ta full mortise hinges');
INSERT OR IGNORE INTO product_documents (id, product_id, document_type, document_title, document_url, r2_object_key, r2_bucket, mime_type, page_count, file_size_bytes, file_hash_sha256, verified, active, notes) VALUES ('doc-g021-mckinney-ta2714', 'prod-mckinney-ta2714', 'cut_sheet', 'McKinney Full Line Hinge Catalog (PDF p.37)', 'https://marketing-assets.seclock.com/image/upload/AADSS1010289', 'catalog-corpus/cd6304bc5b178061ec1acde48ddc67d03fdaefc1fd67d0cb49e83d02f2f85e4f.pdf', 'subx-uploads', 'application/pdf', 92, 13032724, '00414107e0710bb62551b180e5f61b947a978da0e62190dd45473f05f015afe2', 1, 1, 'g021: model visually verified on PDF ordinal 37. Full book; fetch is offline through catalog-corpus, never request-time.');
INSERT INTO catalogue_pages_fts (rowid, text_content) SELECT p.rowid, p.text_content FROM catalogue_pages p JOIN catalogues c ON c.catalogue_id = p.catalogue_id WHERE c.catalogue_id = '00414107e0710bb6' AND c.index_built = 0 AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = c.catalogue_id) = c.page_count;
UPDATE catalogues SET index_built = 1 WHERE index_built = 0 AND catalogue_id = '00414107e0710bb6' AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = '00414107e0710bb6') = page_count;
INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES ('https://marketing-assets.seclock.com/image/upload/AADSS1010289', 'g021-priority-3', '2026-10-09T17:21:28.219868+00:00');
