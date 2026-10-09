-- Verified manufacturer family 90S, not an inferred sized 902S/904S item.
-- Primary source: https://us.allegion.com/content/dam/allegion-us-2/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf
-- Content SHA256: 20d53134b94b9894eeb2284a3aecb385c9d583cde123ee5e7fbdd6b8f685654e
-- PDF ordinals 14 and 15 visually inspected; full book text retained for FTS.
-- Apply with the existing offline corpus ingestion; confirm R2 before acceptance.
-- INSERT OR IGNORE preserves pre-existing manufacturer, product and document rows.
INSERT OR IGNORE INTO manufacturers (id, name, slug, trade, website, verified, notes) VALUES ('mfr-glynnj', 'Glynn-Johnson', 'glynn-johnson', 'doors', 'https://us.allegion.com/en/products/brands/glynn-johnson.html', 1, 'Primary technical catalogue 101401, source verified 2026-10-09');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('GLY', 'mfr-glynnj', 'primary_catalogue_101401');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('GJ', 'mfr-glynnj', 'primary_catalogue_101401');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('GLYNN-JOHNSON', 'mfr-glynnj', 'primary_catalogue_101401');
INSERT OR IGNORE INTO manufacturer_aliases (alias, manufacturer_id, source) VALUES ('GLYNN JOHNSON', 'mfr-glynnj', 'primary_catalogue_101401');
INSERT OR IGNORE INTO catalogues (catalogue_id, source_filename, source_hash_sha256, file_size_bytes, page_count, manufacturer, title, ingested_at, ingested_by, storage_path, text_extracted, index_built, source_url) VALUES ('20d53134b94b9894', 'glynn-johnson-101401-20d53134b94b9894.pdf', '20d53134b94b9894eeb2284a3aecb385c9d583cde123ee5e7fbdd6b8f685654e', 3027847, 32, 'glynn-johnson', 'Glynn-Johnson Overhead Door Holders/Stops Catalog 101401', '2026-10-09T22:49:20.935652+00:00', 'glynn-johnson-90s-seed', 'catalog-corpus/116ee74ce84a7ffd04b688883362e538cf138ab724958f003aff06fdf75ba60d.pdf', 1, 0, 'https://us.allegion.com/content/dam/allegion-us-2/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 1, 'Overhead
door holders
and stops
', 32, 1, 'overhead
door holders
and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 2, ' Quality hardware for superior door control
 Known throughout the industry as the “overhead door holder specialist,” Glynn-Johnson has made its name with
 state-of-the-art manufacturing and technology. Delivering both superior quality and exceptional performance,
 Glynn-Johnson products are offered in a wide variety of popular finishes and configurations providing the
 flexibility needed to meet the most demanding door control applications.




 Information and customer care

 us.allegion.com
 US 877-671-7011
 Canada 800-900-4734
 support@allegion.com
 Accessories_TechProdSupport@allegion.com


 Ordering
 allegion_orders@allegion.com

 Fax: 1-877-424-8494




2 • Glynn-Johnson • Door holders and stops
', 711, 1, ' quality hardware for superior door control
 known throughout the industry as the “overhead door holder specialist,” glynn-johnson has made its name with
 state-of-the-art manufacturing and technology. delivering both superior quality and exceptional performance,
 glynn-johnson products are offered in a wide variety of popular finishes and configurations providing the
 flexibility needed to meet the most demanding door control applications.




 information and customer care

 us.allegion.com
 us 877-671-7011
 canada 800-900-4734
 support@allegion.com
 accessories_techprodsupport@allegion.com


 ordering
 allegion_orders@allegion.com

 fax: 1-877-424-8494




2 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 3, 'Table of contents
 General information 4

 Installation methods 5

 70 and 79 Series 6

 81 Series 10

 90 Series 14

 100 Series 18

 410 Series 22

 450 Series 26

 Compatibility information 30




Finish cross-reference guide
 US Number BHMA Finish description
 US3 605 Bright Brass

 US4 606 Satin Brass

 US10 612 Satin Bronze

 US10B 613 Satin Bronze, Oil-Rubbed

 US15 619 Satin Nickel

 US26 625 Bright Chrome

 US26D 626 Satin Chrome

 US32 629 Bright Stainless Steel

 US32D 630 Stainless Steel



 Glynn-Johnson finish BHMA Powder coated finishes
 SP10 691 Light Bronze

 SP4 706 Brass

 SP28 689 Aluminum

 SPBLK 622 Black

 SP313 695 Dark Bronze

 652 652 Satin Chrome

 643e/716 1
 - Aged Bronze, Blackened, Edge Relieved
1
 Not a powder coated finish.




 Glynn-Johnson • Door holders and stops • 3
', 815, 1, 'table of contents
 general information 4

 installation methods 5

 70 and 79 series 6

 81 series 10

 90 series 14

 100 series 18

 410 series 22

 450 series 26

 compatibility information 30




finish cross-reference guide
 us number bhma finish description
 us3 605 bright brass

 us4 606 satin brass

 us10 612 satin bronze

 us10b 613 satin bronze, oil-rubbed

 us15 619 satin nickel

 us26 625 bright chrome

 us26d 626 satin chrome

 us32 629 bright stainless steel

 us32d 630 stainless steel



 glynn-johnson finish bhma powder coated finishes
 sp10 691 light bronze

 sp4 706 brass

 sp28 689 aluminum

 spblk 622 black

 sp313 695 dark bronze

 652 652 satin chrome

 643e/716 1
 - aged bronze, blackened, edge relieved
1
 not a powder coated finish.




 glynn-johnson • door holders and stops • 3
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 4, 'Overhead door holders and stops

Overhead door controls Door and frame reinforcement
The best door control device is one that operates Glynn-Johnson overhead holders and stops are fabricated
overhead, with an arm functioning from the jamb to the from top quality materials including brass, steel, and
top of the door. When the door stopping or hold-open does stainless steel and are designed to function even under
not exceed 110°, this device is by far the most efficient. The constant heavy-duty abuse. Therefore, it is essential that
overhead holder and stop is out of the way, in contrast with all doors and frames be adequately reinforced to provide
floor or wall-mounted stops, which can be a stumbling proper anchorage for the overhead stop. For metal doors
hazard and are vulnerable to damage by accident and and frames, we recommend reinforcement be a minimum
vandalism. Glynn-Johnson overhead holders and stops of 3⁄16" thick, 1 1⁄2" wide and 12" long to effectively
should always be used on doors furnished with door distribute the load. For wood doors and frames, we stress
closers, as closers are not door stops and should not be the importance of making them strong enough to
expected to perform that function. Glynn-Johnson provide proper anchorage for the door holders. For
overhead stops are designed to protect door closers from reinforcement details, refer to individual templates for
violent openings. each overhead stop.



Selecting degree of Definition of “door opening”
hold-open or stop Glynn-Johnson defines the terms “door opening” as the

Glynn-Johnson overhead holders are designed to function actual width of the door opening, from jamb to jamb, not

effectively from 85° to 110°. When conditions permit, we just the width of the door. For example, if you have a 45"

recommend the minimum degree of hold-open be set at opening it would require a size 5 holder if the door is hung

95° to put the door knob, pull and panic hardware beyond on butts or offset pivots. Regardless of the style or series

the flow of traffic. When selecting the degree of hold-open of holders, Glynn-Johnson has standardized the size of

for doors opening back-to-back, or against a wall, please holders and stops for all openings, combining the size in

note all Glynn-Johnson overhead holders have shock the model number. The third digit in all models

absorbers which ‘give’ approximately 5° – 7° beyond the designates the size. If any further information is required

hold-open or initial stop point. The concept of dead-stop on sizing a holder or stop, contact customer care or your

templating means that the degree of opening be set 5°–7° Allegion consultant.

less than the point of required dead-stop to accommodate
the compression of the shock absorber.




Butt/offset pivots1

Concealed series Surface series

Size 100 410 Door opening 70 79 81 90 450
1 101 411 18" - 23" - - - - 451
2 102 412 23 ⁄16" - 27"
 1
 702 792 - 902 452
3 103 413 27 1⁄16" - 33" 703 793 813 903 453
4 104 414 33 ⁄16" - 39"
 1
 704 794 814 904 454
5 105 415 39 ⁄16" - 45"
 1
 705 795 815 905 455
6 106 - 45 ⁄16" - 54"
 1
 706 796 2
 816 906 -

1
 Refer to individual catalog pages for further details and for information on center hung applications.
2
 796 unit may be templated for use on doors wider than 54". Contact factory with specific information on door frame construction.




4 • Glynn-Johnson • Door holders and stops
', 3427, 1, 'overhead door holders and stops

overhead door controls door and frame reinforcement
the best door control device is one that operates glynn-johnson overhead holders and stops are fabricated
overhead, with an arm functioning from the jamb to the from top quality materials including brass, steel, and
top of the door. when the door stopping or hold-open does stainless steel and are designed to function even under
not exceed 110°, this device is by far the most efficient. the constant heavy-duty abuse. therefore, it is essential that
overhead holder and stop is out of the way, in contrast with all doors and frames be adequately reinforced to provide
floor or wall-mounted stops, which can be a stumbling proper anchorage for the overhead stop. for metal doors
hazard and are vulnerable to damage by accident and and frames, we recommend reinforcement be a minimum
vandalism. glynn-johnson overhead holders and stops of 3⁄16" thick, 1 1⁄2" wide and 12" long to effectively
should always be used on doors furnished with door distribute the load. for wood doors and frames, we stress
closers, as closers are not door stops and should not be the importance of making them strong enough to
expected to perform that function. glynn-johnson provide proper anchorage for the door holders. for
overhead stops are designed to protect door closers from reinforcement details, refer to individual templates for
violent openings. each overhead stop.



selecting degree of definition of “door opening”
hold-open or stop glynn-johnson defines the terms “door opening” as the

glynn-johnson overhead holders are designed to function actual width of the door opening, from jamb to jamb, not

effectively from 85° to 110°. when conditions permit, we just the width of the door. for example, if you have a 45"

recommend the minimum degree of hold-open be set at opening it would require a size 5 holder if the door is hung

95° to put the door knob, pull and panic hardware beyond on butts or offset pivots. regardless of the style or series

the flow of traffic. when selecting the degree of hold-open of holders, glynn-johnson has standardized the size of

for doors opening back-to-back, or against a wall, please holders and stops for all openings, combining the size in

note all glynn-johnson overhead holders have shock the model number. the third digit in all models

absorbers which ‘give’ approximately 5° – 7° beyond the designates the size. if any further information is required

hold-open or initial stop point. the concept of dead-stop on sizing a holder or stop, contact customer care or your

templating means that the degree of opening be set 5°–7° allegion consultant.

less than the point of required dead-stop to accommodate
the compression of the shock absorber.




butt/offset pivots1

concealed series surface series

size 100 410 door opening 70 79 81 90 450
1 101 411 18" - 23" - - - - 451
2 102 412 23 ⁄16" - 27"
 1
 702 792 - 902 452
3 103 413 27 1⁄16" - 33" 703 793 813 903 453
4 104 414 33 ⁄16" - 39"
 1
 704 794 814 904 454
5 105 415 39 ⁄16" - 45"
 1
 705 795 815 905 455
6 106 - 45 ⁄16" - 54"
 1
 706 796 2
 816 906 -

1
 refer to individual catalog pages for further details and for information on center hung applications.
2
 796 unit may be templated for use on doors wider than 54". contact factory with specific information on door frame construction.




4 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 5, 'Installation methods
Door mounting hardware
Mounting templates for all series holders show various
types of hinging methods as well as various degrees of
opening. To accommodate the overhead stop to the
various mounting methods requires a simple shifting of
dimensions A and B. To be assured that reinforcement and
mortising are in the proper location, be sure to secure the
proper templates from your Glynn-Johnson dealer.
These templates include all necessary information for
reinforcing door and frame, complete installation
instructions for the various mounting methods and the
degree of opening required.

Concealed
Concealed overhead door holder installation requires that
the jamb bracket be mortised flush with the bottom of the
jamb. The arm and channel must be mortised into the door
so the arm is flush with top of the door. A cutout made for
the arm on the stop side of single acting doors as in the
sketch. Double acting doors require a cutout for the arm
on both sides of the door as shown in the sketch. Hollow
metal doors must be reinforced at the top of the door to
provide necessary strength for the channel. Hollow metal
frames must be reinforced in the jamb to provide strength
for the jamb bracket. Strength of wood frame and door
must be adequate for the holder specified. Accurate
template drawings for each holder give complete
reinforcement and mortising specifications. They are
readily available from your Allegion consultant.

Surface type
Surface mounted overhead door holder installation does
not require mortising of jamb or door. The jamb bracket is
surface mounted on the stop of the frame. The channel is
also surface mounted on the face of the door. Hollow
metal doors and jambs must be reinforced to provide
necessary strength for the holder specified. Strength of
wood doors and jambs must also be adequate for the
holder. A typical surface mounted installation is shown in
Figure 1 where jamb bracket is fastened to the stop. Angle
jamb brackets are available for use with rabbeted doors or
flush transom installations (Figure 3). Jamb brackets with
special shims for use on jambs with blade stops are also
available (Figure 4). Advise stop height and the
appropriate shim kit will be provided.




 Glynn-Johnson • Door holders and stops • 5
', 2281, 1, 'installation methods
door mounting hardware
mounting templates for all series holders show various
types of hinging methods as well as various degrees of
opening. to accommodate the overhead stop to the
various mounting methods requires a simple shifting of
dimensions a and b. to be assured that reinforcement and
mortising are in the proper location, be sure to secure the
proper templates from your glynn-johnson dealer.
these templates include all necessary information for
reinforcing door and frame, complete installation
instructions for the various mounting methods and the
degree of opening required.

concealed
concealed overhead door holder installation requires that
the jamb bracket be mortised flush with the bottom of the
jamb. the arm and channel must be mortised into the door
so the arm is flush with top of the door. a cutout made for
the arm on the stop side of single acting doors as in the
sketch. double acting doors require a cutout for the arm
on both sides of the door as shown in the sketch. hollow
metal doors must be reinforced at the top of the door to
provide necessary strength for the channel. hollow metal
frames must be reinforced in the jamb to provide strength
for the jamb bracket. strength of wood frame and door
must be adequate for the holder specified. accurate
template drawings for each holder give complete
reinforcement and mortising specifications. they are
readily available from your allegion consultant.

surface type
surface mounted overhead door holder installation does
not require mortising of jamb or door. the jamb bracket is
surface mounted on the stop of the frame. the channel is
also surface mounted on the face of the door. hollow
metal doors and jambs must be reinforced to provide
necessary strength for the holder specified. strength of
wood doors and jambs must also be adequate for the
holder. a typical surface mounted installation is shown in
figure 1 where jamb bracket is fastened to the stop. angle
jamb brackets are available for use with rabbeted doors or
flush transom installations (figure 3). jamb brackets with
special shims for use on jambs with blade stops are also
available (figure 4). advise stop height and the
appropriate shim kit will be provided.




 glynn-johnson • door holders and stops • 5
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 6, '70 and 79 Series surface overhead door holders/stops
 Materials and finishes
 Glynn-Johnson 70 and 79 Series models are constructed
 primarily of brass and 300 Series stainless steel
 substrates, with several components fabricated of steel
 treated to resist corrosion. Models in the 70 Series utilize
 a 1⁄2" diameter stainless steel bar, while the 79 Series uses
 a 3⁄4" stainless steel bar.

 The bar is always provided in US32D. The spring, washer
70 Series heavy-duty and nut are provided in a clear zinc finish. The door
79 Series extra heavy-duty bracket, jamb bracket and hook (for hold-open units) are
 available in the following finishes: US3, US4, US10,
Glynn-Johnson offers a complete line of overhead holders US10B, US15, US26, US26D, 643E, SP4, SP10, SP28,
and stops, providing solutions for the most complex door SP313 and SPBLK.
control problems. Glynn-Johnson 70 Series and 79 Series
surface-mounted holders and stops are designed to meet
the demands of high-traffic industrial applications. These Models
units are simple to install.
 Glynn-Johnson 70 and 79 Series holders and stops offer
Compatible with a variety of door closers, these models rugged durability and ease of installation. The surface-
come with templates to allow for variable mounting applied door and jamb brackets provide reliable door
positions, ranging from 85° to 110° hold-open/stop angle. control, yet require minimal door and frame preparation.
These templates are designed for installation in almost all
 Glynn-Johnson 70 Series hold-open and stop-only
types of doors, including doors with conventional butt-
 models provide heavy-duty door protection. The 79 Series
type hinges or specialty hinges.
 models incorporate the basic characteristics of the 70
Four models: Series, but can protect extremely heavy or large doors
§ 70H Series hold-open model – heavy-duty subject to violent use or abusive conditions (i.e., vault
§ 70S Series stop-only model – heavy-duty doors, cell doors, oversized plant entry doors).
§ 79H Series hold-open model – extra heavy-duty 70H and 79H Series hold-open models
§ 79S Series stop-only model – extra heavy-duty (Suffix H) Hold-open models in both series provide a
 selective hold-open function with easy-to-adjust tension.
Five sizes:
 A simple 90° rotation of the roller mechanism disables
§ Simple
 the hold-open function, allowing the unit to serve as a
§ Standardized
 shock-absorbing stop. The hold-open function provides a
§ Each model is available in five sizes
 convenient method of holding the door open at a
Three options: predetermined position for short or long periods of
§ J—Angle jamb bracket time, permitting an unobstructed traffic flow through
§ SB—Sex bolt mounting the opening.

§ SOC—Pin-in-socket security screws Both series provide a durable hold-open mechanism that
 can be turned off, allowing the unit to function as a
Unmatched convenience:
 shock-absorbing stop. The hold-open tension is simply
§ Non-handed
 adjusted incrementally for increased or decreased holding
§ Single-acting doors
 power by turning the nut at the end of the bar. While both
§ Interior/exterior applications series are designed for demanding applications, the 79
§ Durable Series is recommended for extremely heavy or wide doors
§ Easy to install subject to violent or abusive conditions.
§ Improved corrosion resistance
§ Function conversion kits available




6 • Glynn-Johnson • Door holders and stops
', 3438, 1, '70 and 79 series surface overhead door holders/stops
 materials and finishes
 glynn-johnson 70 and 79 series models are constructed
 primarily of brass and 300 series stainless steel
 substrates, with several components fabricated of steel
 treated to resist corrosion. models in the 70 series utilize
 a 1⁄2" diameter stainless steel bar, while the 79 series uses
 a 3⁄4" stainless steel bar.

 the bar is always provided in us32d. the spring, washer
70 series heavy-duty and nut are provided in a clear zinc finish. the door
79 series extra heavy-duty bracket, jamb bracket and hook (for hold-open units) are
 available in the following finishes: us3, us4, us10,
glynn-johnson offers a complete line of overhead holders us10b, us15, us26, us26d, 643e, sp4, sp10, sp28,
and stops, providing solutions for the most complex door sp313 and spblk.
control problems. glynn-johnson 70 series and 79 series
surface-mounted holders and stops are designed to meet
the demands of high-traffic industrial applications. these models
units are simple to install.
 glynn-johnson 70 and 79 series holders and stops offer
compatible with a variety of door closers, these models rugged durability and ease of installation. the surface-
come with templates to allow for variable mounting applied door and jamb brackets provide reliable door
positions, ranging from 85° to 110° hold-open/stop angle. control, yet require minimal door and frame preparation.
these templates are designed for installation in almost all
 glynn-johnson 70 series hold-open and stop-only
types of doors, including doors with conventional butt-
 models provide heavy-duty door protection. the 79 series
type hinges or specialty hinges.
 models incorporate the basic characteristics of the 70
four models: series, but can protect extremely heavy or large doors
§ 70h series hold-open model – heavy-duty subject to violent use or abusive conditions (i.e., vault
§ 70s series stop-only model – heavy-duty doors, cell doors, oversized plant entry doors).
§ 79h series hold-open model – extra heavy-duty 70h and 79h series hold-open models
§ 79s series stop-only model – extra heavy-duty (suffix h) hold-open models in both series provide a
 selective hold-open function with easy-to-adjust tension.
five sizes:
 a simple 90° rotation of the roller mechanism disables
§ simple
 the hold-open function, allowing the unit to serve as a
§ standardized
 shock-absorbing stop. the hold-open function provides a
§ each model is available in five sizes
 convenient method of holding the door open at a
three options: predetermined position for short or long periods of
§ j—angle jamb bracket time, permitting an unobstructed traffic flow through
§ sb—sex bolt mounting the opening.

§ soc—pin-in-socket security screws both series provide a durable hold-open mechanism that
 can be turned off, allowing the unit to function as a
unmatched convenience:
 shock-absorbing stop. the hold-open tension is simply
§ non-handed
 adjusted incrementally for increased or decreased holding
§ single-acting doors
 power by turning the nut at the end of the bar. while both
§ interior/exterior applications series are designed for demanding applications, the 79
§ durable series is recommended for extremely heavy or wide doors
§ easy to install subject to violent or abusive conditions.
§ improved corrosion resistance
§ function conversion kits available




6 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 7, '70S and 79S Series stop-only models
 Options
(Suffix S) When the hold-open function is not a
requirement, stop-only models provide a reliable method Suffix J (angle jamb bracket)
of door control. Stop-only models provide the same An angle jamb bracket is available to convert standard
shock-absorbing capability as hold-open models. The models to flush transom mounting If ordered with unit
stop-only model may be used on fire doors. add suffix J. If needed separately, order either 70J or 79J
 by finish needed.

Application information Suffix SB (sex bolt mounting)
 A package of 4 sex bolts provided with the 79 Series and
UL classification a package of 2 sex bolts provided with the
The 70 and 79 Series stop-only models are classified by 70 Series.
Underwriters Laboratories (UL) as Miscellaneous fire door
accessories. This classification applies to use on either Suffix SOC (pin-in-socket security screw)
hollow metal fire doors or wood fire doors. These units A screw package with pin-in-socket screw for mounting
may be used on doors of any rating. As a reminder, the both the door bracket and jamb bracket is provided
miscellaneous fire door accessories (GVUX) section is instead of the standard screw package.
defined by UL as: “Miscellaneous fire door accessories are
intended for installation with classified fire doors and/or
listed fire door frame as identified in the individual listings.
The accessories have been investigated to determine that
when installed in accordance with the manufacturer’s
instructions, the accessories do not adversely affect the
fire rating at the fire door and/or fire door frame.”

Dead-stop templating
Dead-stop templating is recommended for applications
where a wall or similar obstruction is placed at an opening
angle of 110° or less (i.e., doors that open back-to-back).
Dead-stop templating can be applied to hold-open and
stop-only models. The dead-stop position is the point at
which the shock-absorbing spring is fully compressed.
Therefore, when dead-stop templating is used, the
initial degree of opening will be 5° to 7° less than the
dead-stop opening.

Example: If the holder is templated to a 100° dead-stop, the
 door will hold open at an angle between 93° and
 95° but no further than 100°.




 Glynn-Johnson • Door holders and stops • 7
', 2303, 1, '70s and 79s series stop-only models
 options
(suffix s) when the hold-open function is not a
requirement, stop-only models provide a reliable method suffix j (angle jamb bracket)
of door control. stop-only models provide the same an angle jamb bracket is available to convert standard
shock-absorbing capability as hold-open models. the models to flush transom mounting if ordered with unit
stop-only model may be used on fire doors. add suffix j. if needed separately, order either 70j or 79j
 by finish needed.

application information suffix sb (sex bolt mounting)
 a package of 4 sex bolts provided with the 79 series and
ul classification a package of 2 sex bolts provided with the
the 70 and 79 series stop-only models are classified by 70 series.
underwriters laboratories (ul) as miscellaneous fire door
accessories. this classification applies to use on either suffix soc (pin-in-socket security screw)
hollow metal fire doors or wood fire doors. these units a screw package with pin-in-socket screw for mounting
may be used on doors of any rating. as a reminder, the both the door bracket and jamb bracket is provided
miscellaneous fire door accessories (gvux) section is instead of the standard screw package.
defined by ul as: “miscellaneous fire door accessories are
intended for installation with classified fire doors and/or
listed fire door frame as identified in the individual listings.
the accessories have been investigated to determine that
when installed in accordance with the manufacturer’s
instructions, the accessories do not adversely affect the
fire rating at the fire door and/or fire door frame.”

dead-stop templating
dead-stop templating is recommended for applications
where a wall or similar obstruction is placed at an opening
angle of 110° or less (i.e., doors that open back-to-back).
dead-stop templating can be applied to hold-open and
stop-only models. the dead-stop position is the point at
which the shock-absorbing spring is fully compressed.
therefore, when dead-stop templating is used, the
initial degree of opening will be 5° to 7° less than the
dead-stop opening.

example: if the holder is templated to a 100° dead-stop, the
 door will hold open at an angle between 93° and
 95° but no further than 100°.




 glynn-johnson • door holders and stops • 7
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 8, '70 and 79 Series surface overhead door holders/stops



 3/4" 1"




 3/16" 12"



 1-3/4"




 7/8" 1-1/4" 3-1/2"




 6"
 3-1/2"


 1-1/4"
 7/8"




 2"

 1-3/8"



 6"

 1/4" 3-1/16"




70 and 79 Series sizing chart BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA Fed. spec.

 702H/706H C08511 G-J 70
Size Door opening Stop only Hold open Door opening Stop only Hold open
 702S/706S C08541 G-J 70
1 - - - - - -
 792H/796H C08511 G-J 70
2 23 1⁄16" - 27" 702S/792S 702H/792H 27 1⁄16" - 33" 702S/792S 702H/792H
 792S/796H C08541 G-J 70
3 27 1⁄16" - 33" 703S/793S 703H/793H 33 1⁄16" - 39" 703S/793S 703H/793H
4 33 1⁄16" - 39" 704S/794S 704H/794H 39 1⁄16" - 45" 704S/794S 704H/794H
5 39 ⁄16" - 45"
 1
 705S/795S 705H/795H 45 ⁄16" - 51"
 1
 705S/795S 705H/795H
6 45 ⁄16" - 51"
 1
 706S/796S 706H/796H 51 ⁄16" - 59"
 1
 706S/796S 706H/796H
Note: This chart illustrates the most common types of hinging and door opening sizes.
 For unusual door details, contact Glynn-Johnson for availability.




The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


8 • Glynn-Johnson • Door holders and stops
', 1306, 1, '70 and 79 series surface overhead door holders/stops



 3/4" 1"




 3/16" 12"



 1-3/4"




 7/8" 1-1/4" 3-1/2"




 6"
 3-1/2"


 1-1/4"
 7/8"




 2"

 1-3/8"



 6"

 1/4" 3-1/16"




70 and 79 series sizing chart bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma fed. spec.

 702h/706h c08511 g-j 70
size door opening stop only hold open door opening stop only hold open
 702s/706s c08541 g-j 70
1 - - - - - -
 792h/796h c08511 g-j 70
2 23 1⁄16" - 27" 702s/792s 702h/792h 27 1⁄16" - 33" 702s/792s 702h/792h
 792s/796h c08541 g-j 70
3 27 1⁄16" - 33" 703s/793s 703h/793h 33 1⁄16" - 39" 703s/793s 703h/793h
4 33 1⁄16" - 39" 704s/794s 704h/794h 39 1⁄16" - 45" 704s/794s 704h/794h
5 39 ⁄16" - 45"
 1
 705s/795s 705h/795h 45 ⁄16" - 51"
 1
 705s/795s 705h/795h
6 45 ⁄16" - 51"
 1
 706s/796s 706h/796h 51 ⁄16" - 59"
 1
 706s/796s 706h/796h
note: this chart illustrates the most common types of hinging and door opening sizes.
 for unusual door details, contact glynn-johnson for availability.




the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


8 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 9, 'How to order
 70 4 S US3 SB-1


Overhead Series:
 70 Heavy-duty
 79 Extra heavy-duty

Size (door opening using butt or offset pivots):
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

Function:
 H Hold-open
 S Stop-only

Finishes:
 BHMA US Finish description
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
 625 US26 Polished Chrome
 626 US26D Satin Chrome
 643E/716 – Aged Bronze, Blackened, Edge Relieved
 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
 695 SP313 Powder Coat Dark Bronze
 622 SPBLK Powder Coat Black

Options:
 J Angle jamb bracket
 SB-1 Sex bolts for door bracket, doors up to 2"
 SB-2 Sex bolts for door bracket, doors from 2" to 3"
 SOC Pin-in-socket security screws



 Glynn-Johnson • Door holders and stops • 9
', 890, 1, 'how to order
 70 4 s us3 sb-1


overhead series:
 70 heavy-duty
 79 extra heavy-duty

size (door opening using butt or offset pivots):
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

function:
 h hold-open
 s stop-only

finishes:
 bhma us finish description
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 619 us15 satin nickel
 625 us26 polished chrome
 626 us26d satin chrome
 643e/716 – aged bronze, blackened, edge relieved
 706 sp4 powder coat brass
 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
 695 sp313 powder coat dark bronze
 622 spblk powder coat black

options:
 j angle jamb bracket
 sb-1 sex bolts for door bracket, doors up to 2"
 sb-2 sex bolts for door bracket, doors from 2" to 3"
 soc pin-in-socket security screws



 glynn-johnson • door holders and stops • 9
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 10, '81 Series surface overhead door holders/stops
 Materials and finishes
 In brass, steel or 300 stainless steel, these models offer
 the broadest range of finishes in the industry,
 complementing any design. Stainless steel models offer
 the highest resistance to corrosion. Available in the
 following finishes:

 BHMA US Finish description
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
 625 US26 Polished Chrome
81 Series heavy-duty 629 US32 Bright Stainless Steel
 630 US32D Stainless Steel
Glynn-Johnson offers the most complete line of overhead
 643E/716 – Aged Bronze, Blackened, Edge Relieved
holders and stops, providing solutions for the most 652 – Satin Chrome
complex door control problems. These surface-mounted 622 SPBLK Powder Coat Black
holders and stops offer the most effective shock-
absorbing capacity, helping protect doors, frames
and hardware.
 Models
 Designed for heavy-duty applications, these models
Glynn-Johnson 81 Series holders and stops provide rugged,
 provide long-lasting protection for doors, frames,
heavy-duty door control. The jointed-arm design provides
 hardware and surrounding walls or obstructions. They
the most effective stop mechanism available. The
 are compatible with most door closers and feature an
overhead holder body is thru-bolted to the door with sex
 extremely reliable hold-open function and rugged shock
bolts. The jamb bracket is mounted to the stop of the
 absorption. All models feature jointed-arm design and
frame, so a minimum of door and frame preparation
 centered jamb bracket.
is required.
 Designed for heavy-duty applications, 81 Series models
Two models:
 are ideal for doors that are opened frequently. They
§ 81H Series hold-open
 provide long-lasting protection to doors, frames, hinges,
§ 81S Series stop-only
 related hardware and surrounding walls or obstructions.
Four sizes:
 81H Series hold-open
§ Simple
 (Suffix H) The hold-open model should be used when
§ Standardized doors will need to be held open at a preset position for an
§ Each model is available in four sizes extended period. This allows unobstructed traffic flow.
Three options: Hold-open model provides a selective hold-open
§ J—Angle jamb bracket function. A simple turn of the thumbturn disables the
 hold-open function, allowing the unit to serve as a shock
§ SHIM—blade stop shims
 absorbing stop.
§ SOC—Pin-in-socket security screw package
 The hold-open mechanism is selective and may be turned
Unmatched convenience:
 on or off with a simple turn of the thumbturn. In the “off”
§ Reversible
 position, these models act as stops and shock absorbers.
§ Single-acting doors In the “on” position, they hold the door open at a preset
§ Interior/exterior applications position between 85° and 110°. The hold-open force is not
§ Durable adjustable in the 81H Series.
§ Easy to install 81S Series stop-only
 (Suffix S) When the hold-open function is not required,
 the stop-only models provide the same effective door
 control, without the hold-open feature. The stop-only
 model may be used on fire doors.


10 • Glynn-Johnson • Door holders and stops
', 3170, 1, '81 series surface overhead door holders/stops
 materials and finishes
 in brass, steel or 300 stainless steel, these models offer
 the broadest range of finishes in the industry,
 complementing any design. stainless steel models offer
 the highest resistance to corrosion. available in the
 following finishes:

 bhma us finish description
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 619 us15 satin nickel
 625 us26 polished chrome
81 series heavy-duty 629 us32 bright stainless steel
 630 us32d stainless steel
glynn-johnson offers the most complete line of overhead
 643e/716 – aged bronze, blackened, edge relieved
holders and stops, providing solutions for the most 652 – satin chrome
complex door control problems. these surface-mounted 622 spblk powder coat black
holders and stops offer the most effective shock-
absorbing capacity, helping protect doors, frames
and hardware.
 models
 designed for heavy-duty applications, these models
glynn-johnson 81 series holders and stops provide rugged,
 provide long-lasting protection for doors, frames,
heavy-duty door control. the jointed-arm design provides
 hardware and surrounding walls or obstructions. they
the most effective stop mechanism available. the
 are compatible with most door closers and feature an
overhead holder body is thru-bolted to the door with sex
 extremely reliable hold-open function and rugged shock
bolts. the jamb bracket is mounted to the stop of the
 absorption. all models feature jointed-arm design and
frame, so a minimum of door and frame preparation
 centered jamb bracket.
is required.
 designed for heavy-duty applications, 81 series models
two models:
 are ideal for doors that are opened frequently. they
§ 81h series hold-open
 provide long-lasting protection to doors, frames, hinges,
§ 81s series stop-only
 related hardware and surrounding walls or obstructions.
four sizes:
 81h series hold-open
§ simple
 (suffix h) the hold-open model should be used when
§ standardized doors will need to be held open at a preset position for an
§ each model is available in four sizes extended period. this allows unobstructed traffic flow.
three options: hold-open model provides a selective hold-open
§ j—angle jamb bracket function. a simple turn of the thumbturn disables the
 hold-open function, allowing the unit to serve as a shock
§ shim—blade stop shims
 absorbing stop.
§ soc—pin-in-socket security screw package
 the hold-open mechanism is selective and may be turned
unmatched convenience:
 on or off with a simple turn of the thumbturn. in the “off”
§ reversible
 position, these models act as stops and shock absorbers.
§ single-acting doors in the “on” position, they hold the door open at a preset
§ interior/exterior applications position between 85° and 110°. the hold-open force is not
§ durable adjustable in the 81h series.
§ easy to install 81s series stop-only
 (suffix s) when the hold-open function is not required,
 the stop-only models provide the same effective door
 control, without the hold-open feature. the stop-only
 model may be used on fire doors.


10 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 11, 'Application information Options
UL classification Suffix J (angle jamb bracket)
The 81 Series stop-only models are classified by An option on the 81 Series is the “J” angle jamb bracket,
Underwriters Laboratories (UL) as miscellaneous fire door which converts the standard model to flush transom
accessories. This classification applies to use on either mounting. The angle jamb bracket affixes to the standard
hollow metal fire doors or wood fire doors. These units jamb bracket. If ordered with unit add suffix J. If need
may be used on doors of any rating. As a reminder, the separately order 81J by finish needed.
miscellaneous fire door accessories (GVUX) section is
 Suffix SOC (pin-in-socket security screws)
defined by UL as: “Miscellaneous fire door accessories are
 A screw package with pin-in-socket screws for mounting
intended in the individual Listings. The accessories have
 the door bracket and the jamb bracket is provided instead
been investigated to determine that when installed in
 of the standard screw package.
accordance with the manufacturer’s instructions, the
accessories do not adversely affect the fire rating of the Suffix SHIM (blade stop shims)
fire door and/or fire door frames.” Shim kits are available in three sizes:
 81 SHIM1 is a 1⁄4" shim kit
Dead-stop templating
 81 SHIM2 is a 1⁄2" shim kit
If a wall or similar obstruction is in place at an opening
 81 SHIM3 is a 3⁄4" shim kit
angle of 110° or less (i.e. doors that open back-to-back),
dead-stop templating should be used for all hold-open If ordered with overhead, add suffix SHIM (1, 2 or 3).
and stop-only models. The dead-stop position is reached If needed separately order 81 SHIM 1, 2, or 3 by
when the shock-absorbing spring is fully compressed. finish needed.
The initial degree of opening will be 5° to 7° less than the
dead-stop opening.
Example: If the holder is templated to 100° dead-stop, the door
 will hold open somewhere between 93° to 95°, but no
 further than 100°.

Environmental considerations
Environmental factors should always be considered when
specifying overhead holders and stops. Doors that are
positioned on a building’s exterior or subject to corrosive
conditions should be equipped with a holder constructed
primarily of stainless steel or brass materials. For interior
applications, steel is acceptable, though brass
substrates generally provide a more attractive
architectural-grade finish.




 Glynn-Johnson • Door holders and stops • 11
', 2469, 1, 'application information options
ul classification suffix j (angle jamb bracket)
the 81 series stop-only models are classified by an option on the 81 series is the “j” angle jamb bracket,
underwriters laboratories (ul) as miscellaneous fire door which converts the standard model to flush transom
accessories. this classification applies to use on either mounting. the angle jamb bracket affixes to the standard
hollow metal fire doors or wood fire doors. these units jamb bracket. if ordered with unit add suffix j. if need
may be used on doors of any rating. as a reminder, the separately order 81j by finish needed.
miscellaneous fire door accessories (gvux) section is
 suffix soc (pin-in-socket security screws)
defined by ul as: “miscellaneous fire door accessories are
 a screw package with pin-in-socket screws for mounting
intended in the individual listings. the accessories have
 the door bracket and the jamb bracket is provided instead
been investigated to determine that when installed in
 of the standard screw package.
accordance with the manufacturer’s instructions, the
accessories do not adversely affect the fire rating of the suffix shim (blade stop shims)
fire door and/or fire door frames.” shim kits are available in three sizes:
 81 shim1 is a 1⁄4" shim kit
dead-stop templating
 81 shim2 is a 1⁄2" shim kit
if a wall or similar obstruction is in place at an opening
 81 shim3 is a 3⁄4" shim kit
angle of 110° or less (i.e. doors that open back-to-back),
dead-stop templating should be used for all hold-open if ordered with overhead, add suffix shim (1, 2 or 3).
and stop-only models. the dead-stop position is reached if needed separately order 81 shim 1, 2, or 3 by
when the shock-absorbing spring is fully compressed. finish needed.
the initial degree of opening will be 5° to 7° less than the
dead-stop opening.
example: if the holder is templated to 100° dead-stop, the door
 will hold open somewhere between 93° to 95°, but no
 further than 100°.

environmental considerations
environmental factors should always be considered when
specifying overhead holders and stops. doors that are
positioned on a building’s exterior or subject to corrosive
conditions should be equipped with a holder constructed
primarily of stainless steel or brass materials. for interior
applications, steel is acceptable, though brass
substrates generally provide a more attractive
architectural-grade finish.




 glynn-johnson • door holders and stops • 11
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 12, '81 Series surface overhead door holders/stops


 A Front view

 A




 1/2" (13mm)

 B 8-1/8"



 Door bracket

 1/4"

 1"
 81 Series
 1/2" (13mm)
 Plan mounting view



 B




 3-1/2" (64mm)
 A
 B



 1-3/4"




 1-5/8"
 2-3/4"
 2-3/16"
 Standard jamb bracket
 Front elevation




81 Series sizing chart BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA* Fed. spec.

 813-816 H C03511 G-J 80
Size Door opening Stop only Hold open Door opening Stop only Hold open
 813-816 S C03541 G-J 80
1 - - - - - -
 *
 First numeral (0) designates optional
2 - - - - - - material.

3 27 1⁄16" - 33" 813S 813H 33 1⁄16" - 39" 813S 813H To specify:
 Brass material, change 0 to 1 (i.e. C13511)
4 33 ⁄16" - 39"
 1
 814S 814H 39 ⁄16" - 45"
 1
 814S 814H Stainless steel material, change 0 to 5
 (i.e. C51511)
5 39 ⁄16" - 45"
 1
 815S 815H 45 ⁄16" - 51"
 1
 815S 815H Steel material, change 0 to 8
 (i.e. C83511)
6 45 1⁄16" - 51" 816S 816H 51 1⁄16" - 59" 816S 816H
Note: This chart illustrates the most common types of hinging and door opening sizes.
 For unusual door details, contact Glynn-Johnson for availability.




The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


12 • Glynn-Johnson • Door holders and stops
', 1416, 1, '81 series surface overhead door holders/stops


 a front view

 a




 1/2" (13mm)

 b 8-1/8"



 door bracket

 1/4"

 1"
 81 series
 1/2" (13mm)
 plan mounting view



 b




 3-1/2" (64mm)
 a
 b



 1-3/4"




 1-5/8"
 2-3/4"
 2-3/16"
 standard jamb bracket
 front elevation




81 series sizing chart bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma* fed. spec.

 813-816 h c03511 g-j 80
size door opening stop only hold open door opening stop only hold open
 813-816 s c03541 g-j 80
1 - - - - - -
 *
 first numeral (0) designates optional
2 - - - - - - material.

3 27 1⁄16" - 33" 813s 813h 33 1⁄16" - 39" 813s 813h to specify:
 brass material, change 0 to 1 (i.e. c13511)
4 33 ⁄16" - 39"
 1
 814s 814h 39 ⁄16" - 45"
 1
 814s 814h stainless steel material, change 0 to 5
 (i.e. c51511)
5 39 ⁄16" - 45"
 1
 815s 815h 45 ⁄16" - 51"
 1
 815s 815h steel material, change 0 to 8
 (i.e. c83511)
6 45 1⁄16" - 51" 816s 816h 51 1⁄16" - 59" 816s 816h
note: this chart illustrates the most common types of hinging and door opening sizes.
 for unusual door details, contact glynn-johnson for availability.




the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


12 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 13, 'How to order
 81 4 H US32D SOC


Overhead Series:
 81

Size (door opening using butt or offset pivots):
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

Function:
 H Hold-open
 S Stop-only

Finishes:
 BHMA US Finish description
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
 625 US26 Polished Chrome
 629 US32 Bright Stainless Steel
 630 US32D Stainless Steel
 643E/716 – Aged Bronze, Blackened, Edge Relieved
 652 – Satin Chrome
 622 SPBLK Powder Coat Black

Options:
 J Angle jamb bracket
 SHIM 
 SHIM 1 1⁄4" kit
 SHIM 1 1⁄2" kit
 SHIM 1 3⁄4" kit
 SOC Pin-in-socket security screws




 Glynn-Johnson • Door holders and stops • 13
', 733, 1, 'how to order
 81 4 h us32d soc


overhead series:
 81

size (door opening using butt or offset pivots):
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

function:
 h hold-open
 s stop-only

finishes:
 bhma us finish description
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 619 us15 satin nickel
 625 us26 polished chrome
 629 us32 bright stainless steel
 630 us32d stainless steel
 643e/716 – aged bronze, blackened, edge relieved
 652 – satin chrome
 622 spblk powder coat black

options:
 j angle jamb bracket
 shim 
 shim 1 1⁄4" kit
 shim 1 1⁄2" kit
 shim 1 3⁄4" kit
 soc pin-in-socket security screws




 glynn-johnson • door holders and stops • 13
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 14, '90 Series surface overhead door holders/stops
 Materials and finishes
 In 300 Series stainless steel, brass and steel substrates,
 these models are available in the largest selection of
 finishes in the industry. Stainless steel models offer the
 highest resistance to corrosion. Available in the
 following finishes:

90 Series heavy-duty BHMA
 605
 US
 US3
 Finish description
 Polished Brass
Glynn-Johnson 90 Series holders and stops are the most 606 US4 Satin Brass
rugged models available for heavy-duty applications. The 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
channel is thru-bolted to the door with sex bolts, and the
 619 US15 Satin Nickel
jamb bracket is surface mounted to the jamb, requiring 625 US26 Polished Chrome
minimal door and frame preparation. 643E/716 – Aged Bronze, Blackened, Edge Relieved
These versatile units can be used in conjunction with most 652 – Satin Chrome
 706 SP4 Powder Coat Brass
surface-applied door closers. The provided templates
 691 SP10 Powder Coat Bronze
allow for variable mounting positions, ranging from 85° to 689 SP28 Powder Coat Aluminum
110° hold-open/stop angle. These templates are designed 695 SP313 Powder Coat Dark Bronze
for installation in almost all types of doors, including doors 622 SPBLK Powder Coat Black
with conventional butt-type hinges or specialty hinges.

Four models: Models
§ 90H Series hold-open model Glynn-Johnson 90 Series door holders and stops provide
§ 90S Series stop-only model long-lasting protection for doors, frames and hardware.
§ 90F Series friction hold-open model All models incorporate a heavy-duty channel/slide-arm
§ 90SE Series special stop-only model design and offset jamb bracket. This unique design allows
 for simple field modification of functions, should user
Five sizes:
 requirements change.
§ Simple
§ Standardized 90H Series hold-open

§ Each model is available in five sizes (Suffix H) Hold-open models provide a convenient
 method of holding the door open at a predetermined
Three options: position for short or long periods of time, permitting an
§ J—Angle jamb bracket unobstructed traffic flow through the opening. The
§ SHIM—Blade stop shim kits hold-open function can easily be turned on or off by
§ SOC—Pin-in-socket security screw package simply rotating the serrated knob on the bottom of the
 channel. This knob engages the hold-open mechanism,
Unmatched convenience:
 allowing the door to be held open at a predetermined
§ Non-handed
 position ranging from 85° to 110°. When the knob is
§ Improved compatibility with door closers
 flipped over, it acts as a stop and shock absorber.
§ Single-acting doors
 The tension on the hold-open mechanism can be
§ Interior/exterior applications
 adjusted using a phillips screwdriver to offset air
§ Durable currents or other exterior conditions. The hold-open
§ Easy to install tension adjustment is located on the top of the slider
§ Improved corrosion resistance in the channel.
§ Function conversion kits available




14 • Glynn-Johnson • Door holders and stops
', 3036, 1, '90 series surface overhead door holders/stops
 materials and finishes
 in 300 series stainless steel, brass and steel substrates,
 these models are available in the largest selection of
 finishes in the industry. stainless steel models offer the
 highest resistance to corrosion. available in the
 following finishes:

90 series heavy-duty bhma
 605
 us
 us3
 finish description
 polished brass
glynn-johnson 90 series holders and stops are the most 606 us4 satin brass
rugged models available for heavy-duty applications. the 612 us10 satin bronze
 613 us10b oil rubbed bronze
channel is thru-bolted to the door with sex bolts, and the
 619 us15 satin nickel
jamb bracket is surface mounted to the jamb, requiring 625 us26 polished chrome
minimal door and frame preparation. 643e/716 – aged bronze, blackened, edge relieved
these versatile units can be used in conjunction with most 652 – satin chrome
 706 sp4 powder coat brass
surface-applied door closers. the provided templates
 691 sp10 powder coat bronze
allow for variable mounting positions, ranging from 85° to 689 sp28 powder coat aluminum
110° hold-open/stop angle. these templates are designed 695 sp313 powder coat dark bronze
for installation in almost all types of doors, including doors 622 spblk powder coat black
with conventional butt-type hinges or specialty hinges.

four models: models
§ 90h series hold-open model glynn-johnson 90 series door holders and stops provide
§ 90s series stop-only model long-lasting protection for doors, frames and hardware.
§ 90f series friction hold-open model all models incorporate a heavy-duty channel/slide-arm
§ 90se series special stop-only model design and offset jamb bracket. this unique design allows
 for simple field modification of functions, should user
five sizes:
 requirements change.
§ simple
§ standardized 90h series hold-open

§ each model is available in five sizes (suffix h) hold-open models provide a convenient
 method of holding the door open at a predetermined
three options: position for short or long periods of time, permitting an
§ j—angle jamb bracket unobstructed traffic flow through the opening. the
§ shim—blade stop shim kits hold-open function can easily be turned on or off by
§ soc—pin-in-socket security screw package simply rotating the serrated knob on the bottom of the
 channel. this knob engages the hold-open mechanism,
unmatched convenience:
 allowing the door to be held open at a predetermined
§ non-handed
 position ranging from 85° to 110°. when the knob is
§ improved compatibility with door closers
 flipped over, it acts as a stop and shock absorber.
§ single-acting doors
 the tension on the hold-open mechanism can be
§ interior/exterior applications
 adjusted using a phillips screwdriver to offset air
§ durable currents or other exterior conditions. the hold-open
§ easy to install tension adjustment is located on the top of the slider
§ improved corrosion resistance in the channel.
§ function conversion kits available




14 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 15, '90S Series stop-only Dead-stop templating
(Suffix S) When the hold-open function is not a Dead-stop templating is recommended for applications
requirement, stop-only models provide a reliable method where a wall or similar obstruction is placed at an
of door control. Stop-only models provide the same opening angle of 110° or less (i.e., doors that open
shock-absorbing capability as hold-open models. The back-to-back). Dead-stop templating can be applied to
stop-only model may be used on fire doors. hold-open, stop-only and friction models. The dead-stop
 position is the point at which the shock-absorbing spring
90F Series friction hold-open
 is fully compressed. Therefore, when dead-stop
(Suffix F) Friction hold-open models are ideal for patient
 templating is used, the initial degree of opening will be 5°
room doors, wardrobe and closet doors or similar
 to 7° less than the dead-stop opening.
applications where multiple hold-open positions are
 Example: If the holder is templated to a 100° dead-stop, the
desired. The friction tension can be adjusted through the door will hold open at an angle between 93° and
top of the channel using an Allen wrench. The friction 95° but no further than 100°.
tension adjustment is located on the top of the slider in Note: Do not use dead-stop templating on the 90SE
 Series since there is no shock-absorbing spring.
the channel.
 Environmental considerations
90SE Series special stop-only
 Environmental factors should always be considered
(Suffix SE) When stop-only models are used in conjunction
 when specifying overhead holders and stops. Doors that
with single-point, hold-only electronic door closers, the
 are positioned on a building’s exterior or subject to
stop-only function may be ordered without the shock-
 corrosive conditions should be equipped with a holder
absorbing mechanism. Used as an auxiliary stop, these
 constructed primarily of stainless steel or brass materials.
models prolong the life of the closer. The stop location is
 For interior applications, steel is acceptable, though brass
adjusted using an Allen wrench on the stop block located
 substrates generally provide a more attractive
in the channel. The SE option cannot be added to an
 architectural-grade finish.
existing unit. It must be factory ordered.
Note: Caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing
 spring can put added stress on the door and frame.
 Options
 Suffix J (angle jamb bracket)

Application Information An angle jamb bracket is available for converting
 standard models to hinge-side or flush transom
UL Classification mounting. The angle jamb bracket affixes to the standard
The 90 Series stop-only models are classified by jamb bracket. If ordered with the unit add suffix J. If
Underwriters Laboratories (UL) as miscellaneous fire door needed separately order 90J by finish needed.
accessories. This classification applies to use on either
 Suffix SOC (pin-in-socket security screws)
hollow metal fire doors or wood fire doors. These units
 A screw package with pin-in-socket screws for mounting
may be used on doors of any rating. As a reminder, the
 the door bracket and the jamb bracket is provided instead
miscellaneous fire door accessories (GVUX) section is
 of the standard screw package.
defined by UL as: “Miscellaneous fire door accessories are
intended in the individual listings. The accessories have Suffix SHIM (blade stop shims)
been investigated to determine that when installed in Shim kits are available in 3 sizes
accordance with the manufacturer’s instructions, the 90 SHIM1 is a 1⁄4" shim kit
accessories do not adversely affect the fire rating of the 90 SHIM2 is a 1⁄2" shim kit
fire door and/or fire door frames.” 90 SHIM3 is a 3⁄4" shim kit

 If ordered with overhead, add suffix SHIM (1, 2 or 3). If
 needed separately order 90 SHIM (1, 2 or 3)–finish.




 Glynn-Johnson • Door holders and stops • 15
', 3962, 1, '90s series stop-only dead-stop templating
(suffix s) when the hold-open function is not a dead-stop templating is recommended for applications
requirement, stop-only models provide a reliable method where a wall or similar obstruction is placed at an
of door control. stop-only models provide the same opening angle of 110° or less (i.e., doors that open
shock-absorbing capability as hold-open models. the back-to-back). dead-stop templating can be applied to
stop-only model may be used on fire doors. hold-open, stop-only and friction models. the dead-stop
 position is the point at which the shock-absorbing spring
90f series friction hold-open
 is fully compressed. therefore, when dead-stop
(suffix f) friction hold-open models are ideal for patient
 templating is used, the initial degree of opening will be 5°
room doors, wardrobe and closet doors or similar
 to 7° less than the dead-stop opening.
applications where multiple hold-open positions are
 example: if the holder is templated to a 100° dead-stop, the
desired. the friction tension can be adjusted through the door will hold open at an angle between 93° and
top of the channel using an allen wrench. the friction 95° but no further than 100°.
tension adjustment is located on the top of the slider in note: do not use dead-stop templating on the 90se
 series since there is no shock-absorbing spring.
the channel.
 environmental considerations
90se series special stop-only
 environmental factors should always be considered
(suffix se) when stop-only models are used in conjunction
 when specifying overhead holders and stops. doors that
with single-point, hold-only electronic door closers, the
 are positioned on a building’s exterior or subject to
stop-only function may be ordered without the shock-
 corrosive conditions should be equipped with a holder
absorbing mechanism. used as an auxiliary stop, these
 constructed primarily of stainless steel or brass materials.
models prolong the life of the closer. the stop location is
 for interior applications, steel is acceptable, though brass
adjusted using an allen wrench on the stop block located
 substrates generally provide a more attractive
in the channel. the se option cannot be added to an
 architectural-grade finish.
existing unit. it must be factory ordered.
note: caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing
 spring can put added stress on the door and frame.
 options
 suffix j (angle jamb bracket)

application information an angle jamb bracket is available for converting
 standard models to hinge-side or flush transom
ul classification mounting. the angle jamb bracket affixes to the standard
the 90 series stop-only models are classified by jamb bracket. if ordered with the unit add suffix j. if
underwriters laboratories (ul) as miscellaneous fire door needed separately order 90j by finish needed.
accessories. this classification applies to use on either
 suffix soc (pin-in-socket security screws)
hollow metal fire doors or wood fire doors. these units
 a screw package with pin-in-socket screws for mounting
may be used on doors of any rating. as a reminder, the
 the door bracket and the jamb bracket is provided instead
miscellaneous fire door accessories (gvux) section is
 of the standard screw package.
defined by ul as: “miscellaneous fire door accessories are
intended in the individual listings. the accessories have suffix shim (blade stop shims)
been investigated to determine that when installed in shim kits are available in 3 sizes
accordance with the manufacturer’s instructions, the 90 shim1 is a 1⁄4" shim kit
accessories do not adversely affect the fire rating of the 90 shim2 is a 1⁄2" shim kit
fire door and/or fire door frames.” 90 shim3 is a 3⁄4" shim kit

 if ordered with overhead, add suffix shim (1, 2 or 3). if
 needed separately order 90 shim (1, 2 or 3)–finish.




 glynn-johnson • door holders and stops • 15
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 16, '90 Series surface overhead door holders/stops




 1-3/16"
 1-3/4"

 1/4"
 1''




 1/4"
 3-1/2"




 1-1/2"
 1/4"




 2-5/8"
 1-1/2"




90 Series sizing chart BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA* Fed. spec.

 902-906 H C02511 1161
Size Door Stop Hold Friction Door Stop Hold Friction
 opening only open opening only open 902-906 S C02541 1161A

 902-906 F C02531 -
1 - - - - - - - -
2 23 1⁄16" - 27" 902S 902H 902F 27 1⁄16" - 33" 902S 902H 902F *
 First numeral (0) designates optional
 material.
3 27 ⁄16" - 33"
 1
 903S 903H 903F 33 ⁄16" - 39"
 1
 903S 903H 903F
 To specify:
4 33 ⁄16" - 39"
 1
 904S 904H 904F 39 ⁄16" - 45"
 1
 904S 904H 904F Brass material, change 0 to 1
 (i.e. C12511)
5 39 1⁄16" - 45" 905S 905H 905F 45 1⁄16" - 51" 905S 905H 905F Stainless steel material, change 0 to 5
 (i.e. C52511)
6 45 ⁄16" - 54"
 1
 906S 906H 906F 51 ⁄16" - 57"
 1
 906S 906H 906F Steel material, change 0 to 8
 (i.e. C82511)

Note: This chart illustrates the most common types of hinging and door opening sizes.
 For unusual door details, contact Glynn-Johnson for availability.



The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


16 • Glynn-Johnson • Door holders and stops
', 1406, 1, '90 series surface overhead door holders/stops




 1-3/16"
 1-3/4"

 1/4"
 1''




 1/4"
 3-1/2"




 1-1/2"
 1/4"




 2-5/8"
 1-1/2"




90 series sizing chart bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma* fed. spec.

 902-906 h c02511 1161
size door stop hold friction door stop hold friction
 opening only open opening only open 902-906 s c02541 1161a

 902-906 f c02531 -
1 - - - - - - - -
2 23 1⁄16" - 27" 902s 902h 902f 27 1⁄16" - 33" 902s 902h 902f *
 first numeral (0) designates optional
 material.
3 27 ⁄16" - 33"
 1
 903s 903h 903f 33 ⁄16" - 39"
 1
 903s 903h 903f
 to specify:
4 33 ⁄16" - 39"
 1
 904s 904h 904f 39 ⁄16" - 45"
 1
 904s 904h 904f brass material, change 0 to 1
 (i.e. c12511)
5 39 1⁄16" - 45" 905s 905h 905f 45 1⁄16" - 51" 905s 905h 905f stainless steel material, change 0 to 5
 (i.e. c52511)
6 45 ⁄16" - 54"
 1
 906s 906h 906f 51 ⁄16" - 57"
 1
 906s 906h 906f steel material, change 0 to 8
 (i.e. c82511)

note: this chart illustrates the most common types of hinging and door opening sizes.
 for unusual door details, contact glynn-johnson for availability.



the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


16 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 17, 'How to order
 90 4 H US32D J

Overhead Series:
 90

Size (door opening using butt or offset pivots):
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

Function:
 H Hold-open
 F Friction hold-open
 S Stop-only
 SE Special stop-only

Finishes:
 BHMA US Finish description
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
 625 US26 Polished Chrome
 643E/716 – Aged Bronze, Blackened, Edge Relieved
 652 – Satin Chrome
 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
 695 SP313 Powder Coat Dark Bronze
 622 SPBLK Powder Coat Black

Options:
 J Angle jamb bracket
 SHIM 
 Blade stop shims
 SHIM 1 1⁄4" kit
 SHIM 2 1⁄2" kit
 SHIM 3 3⁄4" kit
 SOC Pin-in-socket security screws




 Glynn-Johnson • Door holders and stops • 17
', 872, 1, 'how to order
 90 4 h us32d j

overhead series:
 90

size (door opening using butt or offset pivots):
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

function:
 h hold-open
 f friction hold-open
 s stop-only
 se special stop-only

finishes:
 bhma us finish description
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 619 us15 satin nickel
 625 us26 polished chrome
 643e/716 – aged bronze, blackened, edge relieved
 652 – satin chrome
 706 sp4 powder coat brass
 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
 695 sp313 powder coat dark bronze
 622 spblk powder coat black

options:
 j angle jamb bracket
 shim 
 blade stop shims
 shim 1 1⁄4" kit
 shim 2 1⁄2" kit
 shim 3 3⁄4" kit
 soc pin-in-socket security screws




 glynn-johnson • door holders and stops • 17
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 18, '100 Series concealed overhead door holders/stops
 § Reduced door prep
 § Durable
 § Improved corrosion resistance
 § Function conversion kits are available

 Materials and finishes
 In heavy gauge brass or 300 Series stainless steel, these
 models offer the broadest range of finishes in the industry,
 complementing any design and offering the highest
100 Series heavy-duty resistance to corrosion. Available in the following finishes:
Glynn-Johnson offers a complete line of overhead door
 BHMA US Finish description
holders and stops, accommodating virtually all openings 605 US3 Polished Brass
with solutions for even the most complex door control 606 US4 Satin Brass
problems. These concealed holders and stops provide 612 US10 Satin Bronze
the most attractive and reliable heavy-duty door 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
control available.
 625 US26 Polished Chrome
Glynn-Johnson 100 Series holders and stops provide the 626 US26D Satin Chrome
most reliable and versatile concealed overhead door 629 US32 Bright Stainless Steel
control. They are designed for installation on virtually all 630 US32D Stainless Steel
 643E/716 – Aged Bronze, Blackened, Edge Relieved
types of doors mounted on conventional type butt hinges,
 706 SP4 Powder Coat Brass
pivots, continuous hinges, swing clear hinges and 691 SP10 Powder Coat Bronze
numerous other specialty hinges. When used in 689 SP28 Powder Coat Aluminum
conjunction with many surface-applied door closers, 100 695 SP313 Powder Coat Dark Bronze
Series holders and stops provide the most effective control 622 SPBLK Powder Coat Black
for entrance doors and vestibule doors of all types, as well
as heavy or often used interior doors. Templates provided Models
allow for variable mounting positions, ranging from
 These models provide a wide range of optional features,
85° - 110° of opening.
 and are ideal for use on entrance and vestibule doors,
Five models: large doors, doors opened frequently, or doors subject to
§ 100H Series hold-open model abuse. These models are also furnished with an
§ 100HP Series internal hold-open model offset-style jamb bracket.
§ 100F Series friction hold-open model Designed for heavy-duty applications, 100 Series models
§ 100S Series stop-only model will provide long-lasting protection to doors, frames, hinges,
§ 100SE Series special stop-only model related hardware and surrounding walls or obstructions.

Six sizes: 100H Series hold-open
§ Each model comes in six sizes. (Suffix H) The hold-open function should be used where it
§ Simple is desired to hold a door open at a predetermined position
 for short or long periods of time, permitting an unobstructed
§ Standardized
 traffic flow through the opening.
Three options:
 These models are both selective and adjustable, featuring
§ ADJ—Adjustable jamb bracket
 the most reliable hold-open mechanism available. They
§ CJ—Jamb Bracket for use with LCN 5030 closer
 feature a control knob which protrudes from the face of
§ SOC—Pin-in-socket security screw package the door and turns the hold-open function on or off. Set in
Unmatched convenience: the inactive position, the unit acts as a stop and shock
§ Non-handed absorber. The tension on the hold-open mechanism can

§ Improved compatibility with door closers be adjusted using an Allen wrench to offset air currents or
 other exterior conditions. The hold-open tension
§ Single/double-acting doors
 adjustment is located in the bottom of the track in the
§ Interior/exterior applications
 top of the door.


18 • Glynn-Johnson • Door holders and stops
', 3574, 1, '100 series concealed overhead door holders/stops
 § reduced door prep
 § durable
 § improved corrosion resistance
 § function conversion kits are available

 materials and finishes
 in heavy gauge brass or 300 series stainless steel, these
 models offer the broadest range of finishes in the industry,
 complementing any design and offering the highest
100 series heavy-duty resistance to corrosion. available in the following finishes:
glynn-johnson offers a complete line of overhead door
 bhma us finish description
holders and stops, accommodating virtually all openings 605 us3 polished brass
with solutions for even the most complex door control 606 us4 satin brass
problems. these concealed holders and stops provide 612 us10 satin bronze
the most attractive and reliable heavy-duty door 613 us10b oil rubbed bronze
 619 us15 satin nickel
control available.
 625 us26 polished chrome
glynn-johnson 100 series holders and stops provide the 626 us26d satin chrome
most reliable and versatile concealed overhead door 629 us32 bright stainless steel
control. they are designed for installation on virtually all 630 us32d stainless steel
 643e/716 – aged bronze, blackened, edge relieved
types of doors mounted on conventional type butt hinges,
 706 sp4 powder coat brass
pivots, continuous hinges, swing clear hinges and 691 sp10 powder coat bronze
numerous other specialty hinges. when used in 689 sp28 powder coat aluminum
conjunction with many surface-applied door closers, 100 695 sp313 powder coat dark bronze
series holders and stops provide the most effective control 622 spblk powder coat black
for entrance doors and vestibule doors of all types, as well
as heavy or often used interior doors. templates provided models
allow for variable mounting positions, ranging from
 these models provide a wide range of optional features,
85° - 110° of opening.
 and are ideal for use on entrance and vestibule doors,
five models: large doors, doors opened frequently, or doors subject to
§ 100h series hold-open model abuse. these models are also furnished with an
§ 100hp series internal hold-open model offset-style jamb bracket.
§ 100f series friction hold-open model designed for heavy-duty applications, 100 series models
§ 100s series stop-only model will provide long-lasting protection to doors, frames, hinges,
§ 100se series special stop-only model related hardware and surrounding walls or obstructions.

six sizes: 100h series hold-open
§ each model comes in six sizes. (suffix h) the hold-open function should be used where it
§ simple is desired to hold a door open at a predetermined position
 for short or long periods of time, permitting an unobstructed
§ standardized
 traffic flow through the opening.
three options:
 these models are both selective and adjustable, featuring
§ adj—adjustable jamb bracket
 the most reliable hold-open mechanism available. they
§ cj—jamb bracket for use with lcn 5030 closer
 feature a control knob which protrudes from the face of
§ soc—pin-in-socket security screw package the door and turns the hold-open function on or off. set in
unmatched convenience: the inactive position, the unit acts as a stop and shock
§ non-handed absorber. the tension on the hold-open mechanism can

§ improved compatibility with door closers be adjusted using an allen wrench to offset air currents or
 other exterior conditions. the hold-open tension
§ single/double-acting doors
 adjustment is located in the bottom of the track in the
§ interior/exterior applications
 top of the door.


18 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 19, '100HP Series internal hold-open Dead-stop templating
These models provide a hold-open unit with the hold-open If a wall or similar obstruction is in place at 110° or less
mechanism built into the channel, thus reducing the door opening angle (i.e. doors that open back-to-back),
prep. The 100HP have a preset hold-open force that is not dead-stop templating should be used. This includes all
adjustable. The hold-open feature is not selectable in hold-open, friction and stop-only models, except when
these units, so the doors are always held open. the “SE” option is used. The dead-stop position is reached
 when the shock-absorbing spring is fully compressed, the
100F Series friction hold-open
 initial degree of opening will be 5° to 7° less than the
(Suffix F) Friction hold-open models provide an alternative
 dead-stop opening.
holding method, ideal for heavy patient room doors, closet
 Example: If the holder is templated to a 100° dead-stop, the
doors or similar applications where multiple hold-open door will hold open at an angle between 93° and
positions are desired. The friction tension is adjusted using 95° but no further than 100°.
an Allen wrench and an open end wrench. The friction Note: Do not use dead-stop templating on the 100SE
tension adjustment is located on the top of the slider in Series since there is no shock-absorbing spring.

the channel.
 Environmental considerations
100S Series stop-only Environmental factors should always be considered when
(Suffix S) When the hold-open function is not required, the specifying overhead holders and stops. Doors that are
stop-only function provides the same effective door positioned on a building’s exterior or subject to corrosive
control minus the hold-open feature. The stop-only model conditions should be equipped with a holder constructed
may be used on fire doors. primarily of stainless steel or brass materials. For
 interior applications, steel is acceptable, though brass
100SE Series special stop-only substrates generally provide a more attractive
(Suffix SE) When stop-only models are used in conjunction architectural-grade finish.
with single point hold-open electronic door closers, they
may be ordered without the shock-absorbing mechanism.
Used as an auxiliary stop with these closers, they will Options
prolong the life of the closer. The stop location is adjusted
 Suffix ADJ (adjustable jamb bracket)
using an Allen wrench on the stop block located in the
 An additional option on the 100 Series is the adjustable
channel. The SE option cannot be added to an existing
 jamb bracket, which allows the degree of hold-open or
unit. It must be factory ordered.
 stop angle to be adjusted after installation. Suffix “ADJ” is
Note: Caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing spring available in all functions, but only in sizes 3, 4, 5 and 6.
 can put added stress on the door and frame. ADJ jamb bracket requires additional frame prep. The ADJ
 option cannot be added to an existing unit, it must be
 factory ordered.
Application Information
 Suffix CJ (closer jamb bracket)
UL Classification Provides a special jamb bracket needed for 100 Series
The 100 Series stop-only models are classified by units used with LCN 5030 closers. These special jamb
Underwriters Laboratories (UL) as miscellaneous fire door brackets are handed, so handing will need to be specified
accessories. This classification applies to use on either when ordering the “CJ” option, CJLH for a left hand door
hollow metal fire doors or wood fire doors. Where wood and CJRH for a right hand door. The CJ option cannot be
door manufacturer’s listing allows for the cutout required added to an existing unit, it must be factory ordered.
for installation, concealed overhead stops may be used on
those wood fire doors. These units may be used on doors Suffix SOC (Pin-in-socket security screw package)
of any rating. As a reminder, the miscellaneous fire door A screw package with pin-in-socket screws for mounting
accessories (GVUX) section is defined by UL as: the jamb bracket to the frame is provided instead of the
“Miscellaneous fire door accessories are intended in the standard screw package.
individual listings. The accessories have been investigated
to determine that when installed in accordance with the
manufacturer’s instructions, the accessories do not
adversely affect the fire rating of the fire door and/or fire
door frames."

 Glynn-Johnson • Door holders and stops • 19
', 4526, 1, '100hp series internal hold-open dead-stop templating
these models provide a hold-open unit with the hold-open if a wall or similar obstruction is in place at 110° or less
mechanism built into the channel, thus reducing the door opening angle (i.e. doors that open back-to-back),
prep. the 100hp have a preset hold-open force that is not dead-stop templating should be used. this includes all
adjustable. the hold-open feature is not selectable in hold-open, friction and stop-only models, except when
these units, so the doors are always held open. the “se” option is used. the dead-stop position is reached
 when the shock-absorbing spring is fully compressed, the
100f series friction hold-open
 initial degree of opening will be 5° to 7° less than the
(suffix f) friction hold-open models provide an alternative
 dead-stop opening.
holding method, ideal for heavy patient room doors, closet
 example: if the holder is templated to a 100° dead-stop, the
doors or similar applications where multiple hold-open door will hold open at an angle between 93° and
positions are desired. the friction tension is adjusted using 95° but no further than 100°.
an allen wrench and an open end wrench. the friction note: do not use dead-stop templating on the 100se
tension adjustment is located on the top of the slider in series since there is no shock-absorbing spring.

the channel.
 environmental considerations
100s series stop-only environmental factors should always be considered when
(suffix s) when the hold-open function is not required, the specifying overhead holders and stops. doors that are
stop-only function provides the same effective door positioned on a building’s exterior or subject to corrosive
control minus the hold-open feature. the stop-only model conditions should be equipped with a holder constructed
may be used on fire doors. primarily of stainless steel or brass materials. for
 interior applications, steel is acceptable, though brass
100se series special stop-only substrates generally provide a more attractive
(suffix se) when stop-only models are used in conjunction architectural-grade finish.
with single point hold-open electronic door closers, they
may be ordered without the shock-absorbing mechanism.
used as an auxiliary stop with these closers, they will options
prolong the life of the closer. the stop location is adjusted
 suffix adj (adjustable jamb bracket)
using an allen wrench on the stop block located in the
 an additional option on the 100 series is the adjustable
channel. the se option cannot be added to an existing
 jamb bracket, which allows the degree of hold-open or
unit. it must be factory ordered.
 stop angle to be adjusted after installation. suffix “adj” is
note: caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing spring available in all functions, but only in sizes 3, 4, 5 and 6.
 can put added stress on the door and frame. adj jamb bracket requires additional frame prep. the adj
 option cannot be added to an existing unit, it must be
 factory ordered.
application information
 suffix cj (closer jamb bracket)
ul classification provides a special jamb bracket needed for 100 series
the 100 series stop-only models are classified by units used with lcn 5030 closers. these special jamb
underwriters laboratories (ul) as miscellaneous fire door brackets are handed, so handing will need to be specified
accessories. this classification applies to use on either when ordering the “cj” option, cjlh for a left hand door
hollow metal fire doors or wood fire doors. where wood and cjrh for a right hand door. the cj option cannot be
door manufacturer’s listing allows for the cutout required added to an existing unit, it must be factory ordered.
for installation, concealed overhead stops may be used on
those wood fire doors. these units may be used on doors suffix soc (pin-in-socket security screw package)
of any rating. as a reminder, the miscellaneous fire door a screw package with pin-in-socket screws for mounting
accessories (gvux) section is defined by ul as: the jamb bracket to the frame is provided instead of the
“miscellaneous fire door accessories are intended in the standard screw package.
individual listings. the accessories have been investigated
to determine that when installed in accordance with the
manufacturer’s instructions, the accessories do not
adversely affect the fire rating of the fire door and/or fire
door frames."

 glynn-johnson • door holders and stops • 19
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 20, '100 Series concealed overhead door holders/stops



 1/4"
 3/4"

 2"




 1" 1"
 1-1/4" 1-1/4"




 4-1/4"


 3/4"
 1-1/4"
 1/4" 1/4"
 1"
 3/8"



 2-3/8" 5-1/2"




 3-1/2"


 1/2" 12"


 1-1/4"




 3/8"




100 Series sizing chart2 BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA* Fed. spec.

 101-106 H C01511 1160
Size Door Stop Hold Friction Door Stop Hold Friction
 opening only open opening only open 101-106 S C01541 -

 101-106 F C01531 -
11 18" - 23" 101S 101H 101F - - - -
21 23 1⁄16" - 27" 102S 102H 102F - - - - *
 First numeral (0) designates optional
 material.
3 27 ⁄16" - 33"
 1
 103S 103H 103F 33 ⁄16" - 39"
 1
 103S 103H 103F
 To specify:
4 33 1⁄16" - 39" 104S 104H 104F 39 1⁄16" - 45" 104S 104H 104F Brass material, change 0 to 1
 (i.e. C11511)
5 39 1⁄16" - 45" 105S 105H 105F 45 1⁄16" - 51" 105S 105H 105F Stainless steel material, change 0 to 5
 (i.e. C51511)
6 45 ⁄16" - 54"
 1
 106S 106H 106F 51 ⁄16" - 57"
 1
 106S 106H 106F

Note: This chart illustrates the most common types of hinging and door opening sizes.
 For unusual door details, contact Glynn-Johnson for availability.
 1
 These sizes are not available for use with offset pivots. Also not available with the ADJ option.
 2
 Wood doors with automatic flush bolts or roller latches, consult factory.




The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


20 • Glynn-Johnson • Door holders and stops
', 1603, 1, '100 series concealed overhead door holders/stops



 1/4"
 3/4"

 2"




 1" 1"
 1-1/4" 1-1/4"




 4-1/4"


 3/4"
 1-1/4"
 1/4" 1/4"
 1"
 3/8"



 2-3/8" 5-1/2"




 3-1/2"


 1/2" 12"


 1-1/4"




 3/8"




100 series sizing chart2 bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma* fed. spec.

 101-106 h c01511 1160
size door stop hold friction door stop hold friction
 opening only open opening only open 101-106 s c01541 -

 101-106 f c01531 -
11 18" - 23" 101s 101h 101f - - - -
21 23 1⁄16" - 27" 102s 102h 102f - - - - *
 first numeral (0) designates optional
 material.
3 27 ⁄16" - 33"
 1
 103s 103h 103f 33 ⁄16" - 39"
 1
 103s 103h 103f
 to specify:
4 33 1⁄16" - 39" 104s 104h 104f 39 1⁄16" - 45" 104s 104h 104f brass material, change 0 to 1
 (i.e. c11511)
5 39 1⁄16" - 45" 105s 105h 105f 45 1⁄16" - 51" 105s 105h 105f stainless steel material, change 0 to 5
 (i.e. c51511)
6 45 ⁄16" - 54"
 1
 106s 106h 106f 51 ⁄16" - 57"
 1
 106s 106h 106f

note: this chart illustrates the most common types of hinging and door opening sizes.
 for unusual door details, contact glynn-johnson for availability.
 1
 these sizes are not available for use with offset pivots. also not available with the adj option.
 2
 wood doors with automatic flush bolts or roller latches, consult factory.




the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


20 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 21, 'How to order
 10 4 H US26D ADJ

Overhead Series:
 10

Size (door opening using butt or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

Function:
 H Hold-open
 HP Internal hold-open
 F Friction hold-open
 S Stop-only
 SE Special stop-only

Finishes:
 BHMA US Finish description
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 619 US15 Satin Nickel
 625 US26 Polished Chrome
 626 US26D Satin Chrome
 629 US32 Bright Stainless Steel
 630 US32D Stainless Steel
 643E/716 – Aged Bronze, Blackened, Edge Relieved
 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
 695 SP313 Powder Coat Dark Bronze
 622 SPBLK Powder Coat Black

Options:
 ADJ Adjustable jamb bracket
 CJLH Special jamb bracket for LCN 5030 closer, LH door
 CJRH Special jamb bracket for LCN 5030 closer, RH door
 SOC Pin-in-socket security screws



 Glynn-Johnson • Door holders and stops • 21
', 1017, 1, 'how to order
 10 4 h us26d adj

overhead series:
 10

size (door opening using butt or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")
 6 (45 1⁄16"–54")

function:
 h hold-open
 hp internal hold-open
 f friction hold-open
 s stop-only
 se special stop-only

finishes:
 bhma us finish description
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 619 us15 satin nickel
 625 us26 polished chrome
 626 us26d satin chrome
 629 us32 bright stainless steel
 630 us32d stainless steel
 643e/716 – aged bronze, blackened, edge relieved
 706 sp4 powder coat brass
 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
 695 sp313 powder coat dark bronze
 622 spblk powder coat black

options:
 adj adjustable jamb bracket
 cjlh special jamb bracket for lcn 5030 closer, lh door
 cjrh special jamb bracket for lcn 5030 closer, rh door
 soc pin-in-socket security screws



 glynn-johnson • door holders and stops • 21
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 22, '410 Series concealed overhead door holders/stops
 § Interior applications
 § Durable
 § Easy to install
 § Improved corrosion resistance

 Materials and finishes
 All models are available in 300 Series stainless steel,
 brass and steel substrates. The broadest range of finishes
 in the industry is provided to complement any design.

 BHMA US Finish description
410 Series medium-duty 605
 606
 US3
 US4
 Polished Brass
 Satin Brass
Glynn-Johnson offers the most complete line of overhead 612 US10 Satin Bronze
door holders and stops, offering solutions for the most 613 US10B Oil Rubbed Bronze
 629 US32 Bright Stainless Steel
complex door control problems. The 410 Series offers the
 630 US32D Stainless Steel
industry’s widest variety of functions, base materials and 652 – Satin Chrome
finishes to fit all medium to light-duty applications. 706 SP4 Powder Coat Brass
The perfect combination of form and function, Glynn- 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
Johnson 410 Series holders and stops offer effective door
 695 SP313 Powder Coat Dark Bronze
control and a low-profile design. Each model is 622 SPBLK Powder Coat Black
constructed so that the channel is encased in the door and
the jamb bracket is mortised in the frame. When the door
is open, the arm and jamb bracket are visible. Conversely,
 Models
when the door is in the closed position, the entire holder is Glynn-Johnson 410 Series holders and stops are designed
completely concealed. for medium- to light-duty applications. They’re ideal for
These versatile models can be used with most surface- openings that are subject to normal activity, providing
applied door closers. The provided templates allow for protection for the door, frame, hinges and surrounding
variable mounting positions, ranging from 85° to 110° of walls or obstructions.
opening. These templates are designed for installation in All models incorporate the popular channel/slide-arm
almost all types of doors, including doors with design and offset jamb brackets. This improved design
conventional butt-type hinges or specialty hinges. allows for simple field modification of functions, should
 user requirements change.
Four models:
§ 410H Series hold-open 410H Series hold-open
§ 410S Series stop-only (Suffix H) Hold-open models provide a convenient
§ 410F Series friction hold-open method of holding the door open at a predetermined

§ 410SE Series special stop-only position for short or long periods of time, permitting an
 unobstructed traffic flow. The hold-open tension can
Five sizes: be adjusted using an Allen wrench through the end of
§ Simple the slider located in the channel mounted in the top of
§ Standardized the door.
§ Each model is available in five sizes
 These models feature a rugged, automatic hold-open
One option: mechanism activated when the door is opened to a
§ Soc—Pin-in-socket security screw package preset angle. Each model meets the 250,000 test cycles
Unmatched convenience: required for Grade 1 classification. The hold-open feature
§ Non-handed is not selectable, so the door is always held open.

§ Improved compatibility with door closers
§ Single/double-acting doors




22 • Glynn-Johnson • Door holders and stops
', 3219, 1, '410 series concealed overhead door holders/stops
 § interior applications
 § durable
 § easy to install
 § improved corrosion resistance

 materials and finishes
 all models are available in 300 series stainless steel,
 brass and steel substrates. the broadest range of finishes
 in the industry is provided to complement any design.

 bhma us finish description
410 series medium-duty 605
 606
 us3
 us4
 polished brass
 satin brass
glynn-johnson offers the most complete line of overhead 612 us10 satin bronze
door holders and stops, offering solutions for the most 613 us10b oil rubbed bronze
 629 us32 bright stainless steel
complex door control problems. the 410 series offers the
 630 us32d stainless steel
industry’s widest variety of functions, base materials and 652 – satin chrome
finishes to fit all medium to light-duty applications. 706 sp4 powder coat brass
the perfect combination of form and function, glynn- 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
johnson 410 series holders and stops offer effective door
 695 sp313 powder coat dark bronze
control and a low-profile design. each model is 622 spblk powder coat black
constructed so that the channel is encased in the door and
the jamb bracket is mortised in the frame. when the door
is open, the arm and jamb bracket are visible. conversely,
 models
when the door is in the closed position, the entire holder is glynn-johnson 410 series holders and stops are designed
completely concealed. for medium- to light-duty applications. they’re ideal for
these versatile models can be used with most surface- openings that are subject to normal activity, providing
applied door closers. the provided templates allow for protection for the door, frame, hinges and surrounding
variable mounting positions, ranging from 85° to 110° of walls or obstructions.
opening. these templates are designed for installation in all models incorporate the popular channel/slide-arm
almost all types of doors, including doors with design and offset jamb brackets. this improved design
conventional butt-type hinges or specialty hinges. allows for simple field modification of functions, should
 user requirements change.
four models:
§ 410h series hold-open 410h series hold-open
§ 410s series stop-only (suffix h) hold-open models provide a convenient
§ 410f series friction hold-open method of holding the door open at a predetermined

§ 410se series special stop-only position for short or long periods of time, permitting an
 unobstructed traffic flow. the hold-open tension can
five sizes: be adjusted using an allen wrench through the end of
§ simple the slider located in the channel mounted in the top of
§ standardized the door.
§ each model is available in five sizes
 these models feature a rugged, automatic hold-open
one option: mechanism activated when the door is opened to a
§ soc—pin-in-socket security screw package preset angle. each model meets the 250,000 test cycles
unmatched convenience: required for grade 1 classification. the hold-open feature
§ non-handed is not selectable, so the door is always held open.

§ improved compatibility with door closers
§ single/double-acting doors




22 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 23, '410S Series stop-only stop-only and friction models. The dead-stop position is
(Suffix S) When the hold-open function is not a the point at which the shock-absorbing spring is fully
requirement,the stop-only function provides an effective compressed. Therefore, when dead-stop templating is
method of door control. The stop-only model may be used used, the initial degree of opening will be 5° to 7° less
on fire doors. than the dead-stop opening.
 Example: If the holder is templated to a 100° dead-stop, the
410F Series friction hold-open door will hold open at an angle between 93° and
(Suffix F) Friction hold-open models are ideal for patient 95° but no further than 100°.
room doors, wardrobe and closet doors, or similar Note: Do not use dead-stop templating on the 410SE
applications where multiple hold-open positions are Series since there is no shock-absorbing spring.
desired. The friction tension can be adjusted using an Allen Environmental considerations
wrench on the slider located in the channel mounted at the Environmental factors should always be considered when
top of the door. specifying overhead holders and stops. Doors that are
 positioned on a building’s exterior or subject to corrosive
410SE Series special stop-only
 conditions should be equipped with a holder constructed
(Suffix SE) When stop-only models are used in conjunction
 primarily of stainless steel, brass or bronze materials. For
with single-point, hold-open electronic door closers, the
 interior applications, steel is acceptable, though brass
stop-only function may be ordered less the shock-
 and bronze substrates generally provide a more attractive
absorbing mechanism. Used as an auxiliary stop, these
 architectural-grade finish.
optional models prolong the life of the closer. The stop
location is adjusted using an Allen wrench on the stop Heavy-use applications
block located in the channel. The SE option cannot be A heavy-duty holder or stop should be considered when
added to an existing unit. It must be factory ordered. doors and frames are subject to heavy, frequent use. Also,
Note: Caution should be taken when using this option in other heavy-duty units should be considered on exterior doors
 applications, as the elimination of the shock-absorbing subject to wind.
 spring can put added stress on the door and frame.


 Options
Application information
 Suffix SOC (pin-in-socket security screw package)
UL classification A screw package with pin-in-socket screws for mounting
The 410 Series stop-only models are classified by the jamb bracket to the frame is provided instead of the
Underwriters Laboratories (UL) as miscellaneous fire door standard screw package.
accessories. This classification applies to use on either
hollow metal fire doors or wood fire doors. Where wood
door manufacturer’s listing allows for the cutout required
for installation, concealed overhead stops may be used on
those wood fire doors. These units may be used on doors
of any rating. As a reminder, the miscellaneous fire door
accessories (GVUX) section is defined by UL as:
“Miscellaneous fire door accessories are intended in the
individual Listings. The accessories have been investigated
to determine that when installed in accordance with the
manufacturer’s instructions, the accessories do not
adversely affect the fire rating of the fire door and/or fire
door frames.”

Dead-stop templating
Dead-stop templating is recommended for applications
where a wall or similar obstruction is in place at an opening
angle of 110° or less (i.e., doors that open back-to-back).
Dead-stop templating can be applied to hold-open,




 Glynn-Johnson • Door holders and stops • 23
', 3673, 1, '410s series stop-only stop-only and friction models. the dead-stop position is
(suffix s) when the hold-open function is not a the point at which the shock-absorbing spring is fully
requirement,the stop-only function provides an effective compressed. therefore, when dead-stop templating is
method of door control. the stop-only model may be used used, the initial degree of opening will be 5° to 7° less
on fire doors. than the dead-stop opening.
 example: if the holder is templated to a 100° dead-stop, the
410f series friction hold-open door will hold open at an angle between 93° and
(suffix f) friction hold-open models are ideal for patient 95° but no further than 100°.
room doors, wardrobe and closet doors, or similar note: do not use dead-stop templating on the 410se
applications where multiple hold-open positions are series since there is no shock-absorbing spring.
desired. the friction tension can be adjusted using an allen environmental considerations
wrench on the slider located in the channel mounted at the environmental factors should always be considered when
top of the door. specifying overhead holders and stops. doors that are
 positioned on a building’s exterior or subject to corrosive
410se series special stop-only
 conditions should be equipped with a holder constructed
(suffix se) when stop-only models are used in conjunction
 primarily of stainless steel, brass or bronze materials. for
with single-point, hold-open electronic door closers, the
 interior applications, steel is acceptable, though brass
stop-only function may be ordered less the shock-
 and bronze substrates generally provide a more attractive
absorbing mechanism. used as an auxiliary stop, these
 architectural-grade finish.
optional models prolong the life of the closer. the stop
location is adjusted using an allen wrench on the stop heavy-use applications
block located in the channel. the se option cannot be a heavy-duty holder or stop should be considered when
added to an existing unit. it must be factory ordered. doors and frames are subject to heavy, frequent use. also,
note: caution should be taken when using this option in other heavy-duty units should be considered on exterior doors
 applications, as the elimination of the shock-absorbing subject to wind.
 spring can put added stress on the door and frame.


 options
application information
 suffix soc (pin-in-socket security screw package)
ul classification a screw package with pin-in-socket screws for mounting
the 410 series stop-only models are classified by the jamb bracket to the frame is provided instead of the
underwriters laboratories (ul) as miscellaneous fire door standard screw package.
accessories. this classification applies to use on either
hollow metal fire doors or wood fire doors. where wood
door manufacturer’s listing allows for the cutout required
for installation, concealed overhead stops may be used on
those wood fire doors. these units may be used on doors
of any rating. as a reminder, the miscellaneous fire door
accessories (gvux) section is defined by ul as:
“miscellaneous fire door accessories are intended in the
individual listings. the accessories have been investigated
to determine that when installed in accordance with the
manufacturer’s instructions, the accessories do not
adversely affect the fire rating of the fire door and/or fire
door frames.”

dead-stop templating
dead-stop templating is recommended for applications
where a wall or similar obstruction is in place at an opening
angle of 110° or less (i.e., doors that open back-to-back).
dead-stop templating can be applied to hold-open,




 glynn-johnson • door holders and stops • 23
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 24, '410 Series concealed overhead door holders/stops




 3/16"


 3/4"




 2-7/8"




 1/4"

 1-1/16"




 13/16" 13/16"




410 Series sizing chart BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA* Fed. spec.

 411-106 H C04511 1166
Size Door Stop Hold Friction Door Stop Hold Friction
 opening only open opening only open 411-106 S C04541 1166A

 411-106 F C04531 1164
1 1, 2
 18" - 23" 411S 411H 411F - - - -
21 23 1⁄16" - 27" 412S 412H 412F - - - - *
 First numeral (0) designates optional
 material.
3 27 1⁄16" - 33" 413S 413H 413F 33 1⁄16" - 39" 413S 413H 413F
 To specify:
4 33 1⁄16" - 39" 414S 414H 414F 39 1⁄16" - 45" 414S 414H 414F Brass material, change 0 to 1
 (i.e. C14511)
5 39 1⁄16" - 45" 415S 415H 415F 45 1⁄16" - 51" 415S 415H 415F Stainless steel material, change 0 to 5
 (i.e. C54511)
 Steel material, change 0 to 8
Note: This chart illustrates the most common types of hinging and door opening sizes. (i.e. C84511)
 For unusual door details, contact Glynn-Johnson for availability.
 Doors with automatic flush bolts or roller latches, consult factory.
 1
 These sizes are not available for use with offset pivots
 2
 Cannot be used with swing clear hinges


The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


24 • Glynn-Johnson • Door holders and stops
', 1489, 1, '410 series concealed overhead door holders/stops




 3/16"


 3/4"




 2-7/8"




 1/4"

 1-1/16"




 13/16" 13/16"




410 series sizing chart bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma* fed. spec.

 411-106 h c04511 1166
size door stop hold friction door stop hold friction
 opening only open opening only open 411-106 s c04541 1166a

 411-106 f c04531 1164
1 1, 2
 18" - 23" 411s 411h 411f - - - -
21 23 1⁄16" - 27" 412s 412h 412f - - - - *
 first numeral (0) designates optional
 material.
3 27 1⁄16" - 33" 413s 413h 413f 33 1⁄16" - 39" 413s 413h 413f
 to specify:
4 33 1⁄16" - 39" 414s 414h 414f 39 1⁄16" - 45" 414s 414h 414f brass material, change 0 to 1
 (i.e. c14511)
5 39 1⁄16" - 45" 415s 415h 415f 45 1⁄16" - 51" 415s 415h 415f stainless steel material, change 0 to 5
 (i.e. c54511)
 steel material, change 0 to 8
note: this chart illustrates the most common types of hinging and door opening sizes. (i.e. c84511)
 for unusual door details, contact glynn-johnson for availability.
 doors with automatic flush bolts or roller latches, consult factory.
 1
 these sizes are not available for use with offset pivots
 2
 cannot be used with swing clear hinges


the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


24 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 25, 'How to order

 41 1 H US10B SOC

Overhead Series:
 41

Size (door opening using butts or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")

Function:
 H Hold-open
 F Friction hold-open
 S Stop-only
 SE Special stop-only

Finishes:
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 629 US32 Bright Stainless Steel
 630 US32D Stainless Steel
 652 – Satin Chrome
 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
 695 SP313 Powder Coat Dark Bronze
 622 SPBLK Powder Coat Black

Options:
 SOC Pin-in-socket security screws




 Glynn-Johnson • Door holders and stops • 25
', 707, 1, 'how to order

 41 1 h us10b soc

overhead series:
 41

size (door opening using butts or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")

function:
 h hold-open
 f friction hold-open
 s stop-only
 se special stop-only

finishes:
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 629 us32 bright stainless steel
 630 us32d stainless steel
 652 – satin chrome
 706 sp4 powder coat brass
 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
 695 sp313 powder coat dark bronze
 622 spblk powder coat black

options:
 soc pin-in-socket security screws




 glynn-johnson • door holders and stops • 25
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 26, '450 Series surface overhead door holders/stops
 § Improved jamb bracket design
 § Single acting doors
 § Interior applications
 § Durable
 § Easy to install
 § Improved corrosion resistance

 Materials and finishes
 In brass, 300 Series stainless steel or steel, these models
 offer the broadest range of finishes in the industry to
450 Series medium-duty complement any design. Brass and stainless steel offer
Glynn-Johnson provides the most complete line of the highest resistance to corrosion, while all these base
overhead holders and stops, offering solutions for the materials are suitable for normal interior use.
most demanding door control problems. These holders BHMA US Finish description
and stops offer the widest variety of functions, materials 605 US3 Polished Brass
and finishes to fit all medium- to light-duty applications. 606 US4 Satin Brass
The channel is thru-bolted to the door using sex bolts, and 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
the jamb bracket is surface mounted to the jamb, requiring
 629 US32 Bright Stainless Steel
minimal door and frame preparation. 630 US32D Stainless Steel
Glynn-Johnson 450 Series holders and stops provide 652 – Satin Chrome
reliable and versatile surface-mounted overhead door 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
control for all medium to light-duty applications. The
 689 SP28 Powder Coat Aluminum
visible components are available in a wide variety of 695 SP313 Powder Coat Dark Bronze
architectural finishes to complement any design. 622 SPBLK Powder Coat Black
The 450 Series holders and stops are designed for
installation in virtually all types of doors and frames Models
including doors with conventional butt hinges, offset
 Glynn-Johnson 450 Series holders and stops are
pivots, continuous hinges, swing clear hinges and many
 designed for medium to light-duty applications. They’re
other specialty hinges. The templates provided allow for
 ideal for openings that are subject to normal activity,
variable mounting positions, ranging from 85° - 110°
 providing protection for the door, frame, hinges and
of opening.
 surrounding walls or obstructions.
Four models:
 Designed for improved compatibility with most door
§ 450H Series hold-open model
 closers, all models incorporate popular channel/slide
§ 450S Series stop-only model arm design and offset jamb brackets. The improved
§ 450F Series friction hold-open model design makes it easier to change functions in the field,
§ 450SE Series special stop-only model should user requirements change.

Five sizes: 450H Series hold-open
§ Simple (Suffix H) These models conveniently hold doors open
§ Standardized at a predetermined position, permitting unobstructed
§ Each model is available in five sizes traffic flow.

Three options: These models feature an adjustable automatic hold-
§ J—Angle jamb bracket open that is activated when the door is opened to a
 preset angle. The hold-open tension can be adjusted
§ SHIM—Blade stop SHIM kit
 using an allen wrench through the end of the slider
§ Soc—Pin-in-socket security screw package
 located in the channel at the top of the door. Each meets
Unmatched convenience: the 250,000 test cycles required for Grade 1 classification.
§ Non-handed
§ Improved compatibility with door closers


26 • Glynn-Johnson • Door holders and stops
', 3332, 1, '450 series surface overhead door holders/stops
 § improved jamb bracket design
 § single acting doors
 § interior applications
 § durable
 § easy to install
 § improved corrosion resistance

 materials and finishes
 in brass, 300 series stainless steel or steel, these models
 offer the broadest range of finishes in the industry to
450 series medium-duty complement any design. brass and stainless steel offer
glynn-johnson provides the most complete line of the highest resistance to corrosion, while all these base
overhead holders and stops, offering solutions for the materials are suitable for normal interior use.
most demanding door control problems. these holders bhma us finish description
and stops offer the widest variety of functions, materials 605 us3 polished brass
and finishes to fit all medium- to light-duty applications. 606 us4 satin brass
the channel is thru-bolted to the door using sex bolts, and 612 us10 satin bronze
 613 us10b oil rubbed bronze
the jamb bracket is surface mounted to the jamb, requiring
 629 us32 bright stainless steel
minimal door and frame preparation. 630 us32d stainless steel
glynn-johnson 450 series holders and stops provide 652 – satin chrome
reliable and versatile surface-mounted overhead door 706 sp4 powder coat brass
 691 sp10 powder coat bronze
control for all medium to light-duty applications. the
 689 sp28 powder coat aluminum
visible components are available in a wide variety of 695 sp313 powder coat dark bronze
architectural finishes to complement any design. 622 spblk powder coat black
the 450 series holders and stops are designed for
installation in virtually all types of doors and frames models
including doors with conventional butt hinges, offset
 glynn-johnson 450 series holders and stops are
pivots, continuous hinges, swing clear hinges and many
 designed for medium to light-duty applications. they’re
other specialty hinges. the templates provided allow for
 ideal for openings that are subject to normal activity,
variable mounting positions, ranging from 85° - 110°
 providing protection for the door, frame, hinges and
of opening.
 surrounding walls or obstructions.
four models:
 designed for improved compatibility with most door
§ 450h series hold-open model
 closers, all models incorporate popular channel/slide
§ 450s series stop-only model arm design and offset jamb brackets. the improved
§ 450f series friction hold-open model design makes it easier to change functions in the field,
§ 450se series special stop-only model should user requirements change.

five sizes: 450h series hold-open
§ simple (suffix h) these models conveniently hold doors open
§ standardized at a predetermined position, permitting unobstructed
§ each model is available in five sizes traffic flow.

three options: these models feature an adjustable automatic hold-
§ j—angle jamb bracket open that is activated when the door is opened to a
 preset angle. the hold-open tension can be adjusted
§ shim—blade stop shim kit
 using an allen wrench through the end of the slider
§ soc—pin-in-socket security screw package
 located in the channel at the top of the door. each meets
unmatched convenience: the 250,000 test cycles required for grade 1 classification.
§ non-handed
§ improved compatibility with door closers


26 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 27, '450S Series stop-only open back-to-back), dead-stop templating should be
(Suffix S) When the hold-open function is not required, the used. This includes all hold-open, Friction and stop-only
stop-only function provides the same effective door models, except when the "SE" option is used.
control without keeping the door held open. The stop-only The dead-stop position is reached when the shock-
model may be used on fire doors. absorbing spring is fully compressed, allowing an initial
450F Series friction hold-open degree of opening of 5° to 7° less than the
(Suffix F) Friction hold-open models provide an alternative dead-stop opening.
holding method ideal for patient room doors, wardrobe or Example: If the holder is templated to a 100° dead-stop, the
closet doors, or similar applications where multiple door will hold open at an angle between 93° and
 95° but no further than 100°.
hold-open positions are desired. The friction tension can
be adjusted using an allen wrench on the slider located in Note: Do not use dead-stop templating on the 450SE
 Series since there is no shock-absorbing spring.
the channel at the top of the door.

450SE Series special stop-only Environmental conditions
(Suffix SE) When stop-only models are used in conjunction To assure a long operating life for holders and stops,
with single point hold-open electronic door closers, the consider the environment where they will be used. Doors
function may be ordered without the shock absorbing that open to the exterior of a building or are subject to
mechanism. Used as an auxiliary stop with these closers, corrosive conditions should have a holder constructed
they will prolong the life of the closer. The stop location is primarily of stainless steel, brass or bronze materials. For
adjusted using an Allen wrench on the stop block located interior doors, steel material may be acceptable, although
in the channel. The SE option cannot be added to an brass and bronze substrates will provide a more attractive
existing unit. It must be factory ordered. architectural grade finish.
Note: Caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing spring
 Heavy-use applications
 can put added stress on the door and frame. Where doors and frames are subject to heavy use and
 abuse, a heavy-duty holder or stop should be considered.
 Also heavy-duty units should be considered on exterior
Application information doors subject to wind.

Closer applications
Glynn-Johnson 450 Series models require minimal door Options
and frame preparation. They may be used in conjunction
 Suffix J (angle jamb bracket)
with most surface-applied door closers. In some cases,
 An additional option on the 450 Series is the angle jamb
optional drop brackets may need to be mounted on the
 bracket for hinge-side or flush transom mounting. The
closers. These brackets are available from the closer
 angle jamb bracket affixes to the standard jamb bracket.
manufacturer.
 If ordered with the overhead add suffix J. If needed
UL classification separately order 450J-finish.
The 450 Series stop-only models are classified by
 Suffix SHIM (blade stop shims)
Underwriters Laboratories (UL) as miscellaneous fire door
 Shim kits are available in 3 sizes:
accessories. This classification applies to use on either
 450 SHIM1 is a 3⁄16" shim kit
hollow metal fire doors or wood fire doors. These units
 450 SHIM2 is a 3⁄8" shim kit
may be used on doors of any rating. As a reminder, the
 450 SHIM3 is a 9⁄16" shim kit
miscellaneous fire door accessories (GVUX) section is
defined by UL as: “Miscellaneous fire door accessories are If ordered with overhead, add suffix SHIM (1, 2 or 3).
intended in the individual listings. The accessories have If needed separately order 450SHIM (1, 2 or 3)–finish.
been investigated to determine that when installed in
 Suffix SOC (Pin-in-socket security screw package)
accordance with the manufacturer’s instructions, the
 A screw package with pin-in-socket screws for mounting
accessories do not adversely affect the fire rating of the
 the channel to the door and the jamb bracket to the
fire door and/or fire door frames.”
 frame is provided instead of the standard screw package.
Dead-stop templating
For situations where a wall or similar obstruction is in
place at an opening angle of 110° or less (e.g. doors that
 Glynn-Johnson • Door holders and stops • 27
', 4419, 1, '450s series stop-only open back-to-back), dead-stop templating should be
(suffix s) when the hold-open function is not required, the used. this includes all hold-open, friction and stop-only
stop-only function provides the same effective door models, except when the "se" option is used.
control without keeping the door held open. the stop-only the dead-stop position is reached when the shock-
model may be used on fire doors. absorbing spring is fully compressed, allowing an initial
450f series friction hold-open degree of opening of 5° to 7° less than the
(suffix f) friction hold-open models provide an alternative dead-stop opening.
holding method ideal for patient room doors, wardrobe or example: if the holder is templated to a 100° dead-stop, the
closet doors, or similar applications where multiple door will hold open at an angle between 93° and
 95° but no further than 100°.
hold-open positions are desired. the friction tension can
be adjusted using an allen wrench on the slider located in note: do not use dead-stop templating on the 450se
 series since there is no shock-absorbing spring.
the channel at the top of the door.

450se series special stop-only environmental conditions
(suffix se) when stop-only models are used in conjunction to assure a long operating life for holders and stops,
with single point hold-open electronic door closers, the consider the environment where they will be used. doors
function may be ordered without the shock absorbing that open to the exterior of a building or are subject to
mechanism. used as an auxiliary stop with these closers, corrosive conditions should have a holder constructed
they will prolong the life of the closer. the stop location is primarily of stainless steel, brass or bronze materials. for
adjusted using an allen wrench on the stop block located interior doors, steel material may be acceptable, although
in the channel. the se option cannot be added to an brass and bronze substrates will provide a more attractive
existing unit. it must be factory ordered. architectural grade finish.
note: caution should be taken when using this option in other
 applications, as the elimination of the shock-absorbing spring
 heavy-use applications
 can put added stress on the door and frame. where doors and frames are subject to heavy use and
 abuse, a heavy-duty holder or stop should be considered.
 also heavy-duty units should be considered on exterior
application information doors subject to wind.

closer applications
glynn-johnson 450 series models require minimal door options
and frame preparation. they may be used in conjunction
 suffix j (angle jamb bracket)
with most surface-applied door closers. in some cases,
 an additional option on the 450 series is the angle jamb
optional drop brackets may need to be mounted on the
 bracket for hinge-side or flush transom mounting. the
closers. these brackets are available from the closer
 angle jamb bracket affixes to the standard jamb bracket.
manufacturer.
 if ordered with the overhead add suffix j. if needed
ul classification separately order 450j-finish.
the 450 series stop-only models are classified by
 suffix shim (blade stop shims)
underwriters laboratories (ul) as miscellaneous fire door
 shim kits are available in 3 sizes:
accessories. this classification applies to use on either
 450 shim1 is a 3⁄16" shim kit
hollow metal fire doors or wood fire doors. these units
 450 shim2 is a 3⁄8" shim kit
may be used on doors of any rating. as a reminder, the
 450 shim3 is a 9⁄16" shim kit
miscellaneous fire door accessories (gvux) section is
defined by ul as: “miscellaneous fire door accessories are if ordered with overhead, add suffix shim (1, 2 or 3).
intended in the individual listings. the accessories have if needed separately order 450shim (1, 2 or 3)–finish.
been investigated to determine that when installed in
 suffix soc (pin-in-socket security screw package)
accordance with the manufacturer’s instructions, the
 a screw package with pin-in-socket screws for mounting
accessories do not adversely affect the fire rating of the
 the channel to the door and the jamb bracket to the
fire door and/or fire door frames.”
 frame is provided instead of the standard screw package.
dead-stop templating
for situations where a wall or similar obstruction is in
place at an opening angle of 110° or less (e.g. doors that
 glynn-johnson • door holders and stops • 27
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 28, '450 Series surface overhead door holders/stops




 3/16" 7/8"
 1-1/4"

 3/4"




 3/16"




 2-7/8" 1-1/4"
 3/16"




 2-1/4"
 1-1/4"




450 Series sizing chart BHMA/ANSI, A156.8 and Fed.
 spec. cross reference

Butt/offset pivots Center hung G-J model BHMA* Fed. spec.

 451-455 H C05511 1166
Size Door Stop Hold Friction Door Stop Hold Friction
 opening only open opening only open 451-455 S C05541 1166A

 451-455 F C05531 1164
1 1
 18" - 23" 451S 451H 451F 23 ⁄16" - 27"
 1
 451S 451H 451F
2 23 1⁄16" - 27" 452S 452H 452F 27 1⁄16" - 33" 452S 452H 452F *
 First numeral (0) designates optional
 material.
3 27 1⁄16" - 33" 453S 453H 453F 33 1⁄16" - 39" 453S 453H 453F
 To specify:
4 33 1⁄16" - 39" 454S 454H 454F 39 1⁄16" - 45" 454S 454H 454F Brass/bronze material, change 0 to 1
 (i.e. C15511)
5 39 1⁄16" - 45" 455S 455H 455F 45 1⁄16" - 51" 455S 455H 455F Stainless steel material, change 0 to 5
 (i.e. C55511)
 Steel material, change 0 to 8
Note: This chart illustrates the most common types of hinging and door opening sizes. (i.e. C85511)
 For unusual door details, contact Glynn-Johnson for availability.
 1
 Cannot be used with swing clear hinges




The template information on this page is for reference only and is not intended to serve as an installation template.
For more information, reference the Template Directory in the Document Library at us.allegion.com.


28 • Glynn-Johnson • Door holders and stops
', 1426, 1, '450 series surface overhead door holders/stops




 3/16" 7/8"
 1-1/4"

 3/4"




 3/16"




 2-7/8" 1-1/4"
 3/16"




 2-1/4"
 1-1/4"




450 series sizing chart bhma/ansi, a156.8 and fed.
 spec. cross reference

butt/offset pivots center hung g-j model bhma* fed. spec.

 451-455 h c05511 1166
size door stop hold friction door stop hold friction
 opening only open opening only open 451-455 s c05541 1166a

 451-455 f c05531 1164
1 1
 18" - 23" 451s 451h 451f 23 ⁄16" - 27"
 1
 451s 451h 451f
2 23 1⁄16" - 27" 452s 452h 452f 27 1⁄16" - 33" 452s 452h 452f *
 first numeral (0) designates optional
 material.
3 27 1⁄16" - 33" 453s 453h 453f 33 1⁄16" - 39" 453s 453h 453f
 to specify:
4 33 1⁄16" - 39" 454s 454h 454f 39 1⁄16" - 45" 454s 454h 454f brass/bronze material, change 0 to 1
 (i.e. c15511)
5 39 1⁄16" - 45" 455s 455h 455f 45 1⁄16" - 51" 455s 455h 455f stainless steel material, change 0 to 5
 (i.e. c55511)
 steel material, change 0 to 8
note: this chart illustrates the most common types of hinging and door opening sizes. (i.e. c85511)
 for unusual door details, contact glynn-johnson for availability.
 1
 cannot be used with swing clear hinges




the template information on this page is for reference only and is not intended to serve as an installation template.
for more information, reference the template directory in the document library at us.allegion.com.


28 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 29, 'How to order

 45 1 H US32D J

Overhead Series:
 45

Size (door opening using butt or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")

Function:
 H Hold-open
 F Friction hold-open
 S Stop-only
 SE Special stop-only

Finishes:
 605 US3 Polished Brass
 606 US4 Satin Brass
 612 US10 Satin Bronze
 613 US10B Oil Rubbed Bronze
 629 US32 Bright Stainless Steel
 630 US32D Stainless Steel
 652 – Satin Chrome
 706 SP4 Powder Coat Brass
 691 SP10 Powder Coat Bronze
 689 SP28 Powder Coat Aluminum
 695 SP313 Powder Coat Dark Bronze
 622 SPBLK Powder Coat Black

Options:
 J Angle jamb bracket
 SHIM 
 Blade stop shims
 SHIM 1 3⁄16" kit
 SHIM 2 3⁄8" kit
 SHIM 3 9⁄16" kit
 SOC Pin-in-socket security screws




 Glynn-Johnson • Door holders and stops • 29
', 805, 1, 'how to order

 45 1 h us32d j

overhead series:
 45

size (door opening using butt or offset pivots):
 1 (18" - 23")
 2 (23 1⁄16"–27")
 3 (27 1⁄16" –33")
 4 (33 1⁄16"–39")
 5 (39 1⁄16"–45")

function:
 h hold-open
 f friction hold-open
 s stop-only
 se special stop-only

finishes:
 605 us3 polished brass
 606 us4 satin brass
 612 us10 satin bronze
 613 us10b oil rubbed bronze
 629 us32 bright stainless steel
 630 us32d stainless steel
 652 – satin chrome
 706 sp4 powder coat brass
 691 sp10 powder coat bronze
 689 sp28 powder coat aluminum
 695 sp313 powder coat dark bronze
 622 spblk powder coat black

options:
 j angle jamb bracket
 shim 
 blade stop shims
 shim 1 3⁄16" kit
 shim 2 3⁄8" kit
 shim 3 9⁄16" kit
 soc pin-in-socket security screws




 glynn-johnson • door holders and stops • 29
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 30, 'Glynn-Johnson overhead holder and closer compatibility
In order to better understand the compatibility of LCN door closers and Glynn-Johnson overhead stops and holders,
please contact Allegion''s Technical Support team.

This team can help answer questions such as:

§ Does a specific closer and overhead combination require a special template?
§ If so, which special template is required for compatibility?
§ Is a closer and overhead device compatible or not?
§ If there is a conflict when mounting, what plates, brackets, or shoe is required to make it compatible?


For more information about LCN and GJ compatibility, email Closers_TechProdSupport@allegion.com or call 877-671-7011,
option 2, then press 4.




30 • Glynn-Johnson • Door holders and stops
', 758, 1, 'glynn-johnson overhead holder and closer compatibility
in order to better understand the compatibility of lcn door closers and glynn-johnson overhead stops and holders,
please contact allegion''s technical support team.

this team can help answer questions such as:

§ does a specific closer and overhead combination require a special template?
§ if so, which special template is required for compatibility?
§ is a closer and overhead device compatible or not?
§ if there is a conflict when mounting, what plates, brackets, or shoe is required to make it compatible?


for more information about lcn and gj compatibility, email closers_techprodsupport@allegion.com or call 877-671-7011,
option 2, then press 4.




30 • glynn-johnson • door holders and stops
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 31, 'Glynn-Johnson • Door holders and stops • 31
', 44, 1, 'glynn-johnson • door holders and stops • 31
');
INSERT OR IGNORE INTO catalogue_pages (catalogue_id, page_num, text_content, char_count, has_extractable_text, search_text) VALUES ('20d53134b94b9894', 32, ' About Allegion


 At Allegion (NYSE: ALLE), we design and manufacture innovative security and
 access solutions that help keep people safe where they live, learn, work and
 connect. We’re pioneering safety with our strong legacy of brands like CISA®,
 Interflex®, LCN®, Schlage®, SimonsVoss® and Von Duprin®. Our comprehensive
 portfolio of hardware, software and electronic solutions is sold around the world
 and spans residential and commercial locks, door closer and exit devices, steel
 doors and frames, access control and workforce productivity systems.

 For more, visit www.allegion.com




© 2025 Allegion
001401, Rev. 09/25
allegion.com/us
', 652, 1, ' about allegion


 at allegion (nyse: alle), we design and manufacture innovative security and
 access solutions that help keep people safe where they live, learn, work and
 connect. we’re pioneering safety with our strong legacy of brands like cisa®,
 interflex®, lcn®, schlage®, simonsvoss® and von duprin®. our comprehensive
 portfolio of hardware, software and electronic solutions is sold around the world
 and spans residential and commercial locks, door closer and exit devices, steel
 doors and frames, access control and workforce productivity systems.

 for more, visit www.allegion.com




© 2025 allegion
001401, rev. 09/25
allegion.com/us
');
INSERT OR IGNORE INTO products (id, manufacturer_id, trade, product_series, product_family, base_model, display_name, description, available, spec_sheet_url, catalog_number, search_text) VALUES ('prod-gly-90s', 'mfr-glynnj', 'doors', '90S', 'Surface overhead stops', '90S', 'Glynn-Johnson 90S Series stop-only', '90S Series stop-only family; manufacturer technical catalogue 101401, PDF ordinals 14-15. Size must be specified separately.', 1, 'https://us.allegion.com/content/dam/allegion-us-2/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf', '90S', 'glynn-johnson gly gj 90s series stop-only surface overhead stops');
INSERT OR IGNORE INTO product_documents (id, product_id, document_type, document_title, document_url, r2_object_key, r2_bucket, mime_type, page_count, file_size_bytes, file_hash_sha256, verified, active, notes) VALUES ('doc-glynn-johnson-90s-101401', 'prod-gly-90s', 'cut_sheet', 'Glynn-Johnson Overhead Door Holders/Stops Catalog 101401 (PDF p.15)', 'https://us.allegion.com/content/dam/allegion-us-2/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf', 'catalog-corpus/116ee74ce84a7ffd04b688883362e538cf138ab724958f003aff06fdf75ba60d.pdf', 'subx-uploads', 'application/pdf', 32, 3027847, '20d53134b94b9894eeb2284a3aecb385c9d583cde123ee5e7fbdd6b8f685654e', 1, 1, 'Primary source visually verified 2026-10-09: family on PDF ordinal 14, stop-only description on 15. Full manufacturer book; offline corpus storage must be verified before acceptance. No sized model inferred.');
INSERT INTO catalogue_pages_fts (rowid, text_content) SELECT p.rowid, p.text_content FROM catalogue_pages p JOIN catalogues c ON c.catalogue_id=p.catalogue_id WHERE c.catalogue_id='20d53134b94b9894' AND c.index_built=0 AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id=c.catalogue_id)=c.page_count;
UPDATE catalogues SET index_built=1 WHERE index_built=0 AND catalogue_id='20d53134b94b9894' AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id='20d53134b94b9894')=page_count;
INSERT OR IGNORE INTO catalog_corpus_wanted (url, reason, requested_at) VALUES ('https://us.allegion.com/content/dam/allegion-us-2/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf', 'primary-glynn-johnson-90s-technical-catalogue', '2026-10-09T22:49:20.935652+00:00');
