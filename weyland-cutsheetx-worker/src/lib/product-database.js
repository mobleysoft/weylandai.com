// src/lib/product-database.js
//
// The CPS in-memory product-database matching layer: a hand-curated
// PRODUCT_DATABASE array of common door-hardware products (manufacturer
// codes/models -> spec/compliance metadata), fuzzy manufacturer+model
// matching against it (findProductMatch), component-field enrichment
// from a match (enrichComponent), and the real D1-backed product/
// cut-sheet lookups (matchProductFromDb, getCutSheetsForProduct,
// matchComponentToCutSheets) used by the cut-sheet-matching routes.
//
// Extracted 2026-09-10 from legacy-monolith.js (previously inline,
// lines 147643-148040 - non-contiguous: autoEnrichSessionOnSave and
// savePageExtraction2 sit interleaved between getCutSheetsForProduct
// and matchComponentToCutSheets but are unrelated (page-extraction-save
// logic, already an established injected dependency for
// hardware-schedule-page-extract.js/hardware-schedule-finalize-image.js)
// and were left in place rather than dragged into this file.
//
// This is a genuinely distinct matching approach from lib/pricing.js's
// resolveCataloguePrices: this one does simple substring matching
// against a small hand-curated in-memory array (no D1 catalogue query,
// no MFR_CODE_MAP), while pricing.js's tokenized matcher queries the
// real product_variants/manufacturer_aliases tables. Both are real and
// both are still called from different places - not a duplicate to
// consolidate in a behavior-preserving extraction pass.
//
// validateProductDatabase() runs once at module load (matching the
// original's top-level side effect exactly), logging errors/warnings
// if any product entry is missing required fields - preserved as-is
// below rather than converted to a lazy check.
//
// __name(fn, "fnName") bundler bookkeeping calls stripped, same as
// every prior extraction this session.

var PRODUCT_DATABASE = [
  // Schlage Locks
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9080P", "L9080", "L9080-P"], productName: "Schlage L9080P Passage Mortise Lock", category: "Locks & Locksets", specs: 'ANSI/BHMA Grade 1, Heavy Duty Commercial, 2-3/4" Backset', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$340-485" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9050", "L9050L"], productName: "Schlage L9050 Entry/Office Mortise Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Heavy Duty Commercial, Keyed Function", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$360-505" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9070"], productName: "Schlage L9070 Classroom Mortise Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Classroom Function", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$370-515" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9453"], productName: "Schlage L9453 Electrified Mortise Lock", category: "Locks & Locksets", specs: 'ANSI/BHMA Grade 1, Electric, 2-3/4" Backset', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$580-750" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["ND80PD", "ND80", "ND-80PD"], productName: "Schlage ND80PD Passage Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Heavy Duty Commercial", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2, UL", priceRange: "$180-260" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["ND70PD", "ND70", "ND-70PD"], productName: "Schlage ND70PD Classroom Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Classroom Function", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2, UL", priceRange: "$185-265" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["ND96PD", "ND96", "ND-96PD"], productName: "Schlage ND96PD Storeroom Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Storeroom Function", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2, UL", priceRange: "$185-270" },
  // LCN Closers
  { manufacturer: "LCN", code: ["LCN"], models: ["4110", "4110 Series"], productName: "LCN 4110 Series Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Regular Arm, Sizes 1-6, Adjustable Power", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$280-390" },
  { manufacturer: "LCN", code: ["LCN"], models: ["4040XP", "4040", "4040-XP"], productName: "LCN 4040XP Hold Open Arm Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Hold-Open Arm, Delayed Action", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$320-440" },
  { manufacturer: "LCN", code: ["LCN"], models: ["8310"], productName: "LCN 8310 Series Concealed Overhead Closer", category: "Closers & Operators", specs: "Heavy Duty, Concealed in Door, Sizes 1-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$420-580" },
  { manufacturer: "LCN", code: ["LCN"], models: ["8310ME"], productName: "LCN 8310ME Multi-Electrical Closer", category: "Closers & Operators", specs: "Heavy Duty, Concealed, Electrified, Multi-Point Control", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$680-850" },
  // Ives Hardware
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["5BB1"], productName: "Ives 5BB1 Full Mortise Ball Bearing Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Standard Weight, Ball Bearing, Non-Removable Pin', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1", priceRange: "$22-35" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["5BB1HD", "5BB1-HD"], productName: "Ives 5BB1HD Heavy Duty Ball Bearing Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Heavy Duty, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1", priceRange: "$28-42" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["BB1279"], productName: "Ives BB1279 Continuous Hinge", category: "Hinges & Pivots", specs: '83" Full Height, Heavy Duty, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.26", priceRange: "$180-260" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["622"], productName: "Ives 622 Door Stop", category: "Stops & Holders", specs: "Floor Mounted, Solid Brass, Adjustable Height", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$18-28" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["632"], productName: "Ives 632 Overhead Stop", category: "Stops & Holders", specs: "Overhead Mounted, Heavy Duty, Adjustable", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$32-48" },
  // Von Duprin Exit Devices
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["98", "98 Series"], productName: "Von Duprin 98 Series Rim Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Rim Mount, Night Latch', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$420-580" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["99", "99 Series"], productName: "Von Duprin 99 Series Surface Vertical Rod", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Surface Vertical Rod, Top & Bottom Latching', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$520-680" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["33A", "35A", "33A/35A"], productName: "Von Duprin 33A/35A Concealed Vertical Rod", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Concealed Vertical Rod', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$720-890" },
  // Pemko Thresholds
  { manufacturer: "Pemko", code: ["PEMKO"], models: ["170"], productName: "Pemko 170 Series Threshold", category: "Thresholds & Seals", specs: 'Aluminum, Mill Finish, 1/2" Rise, ADA Compliant', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.21, ADA", priceRange: "$42-65" },
  { manufacturer: "Pemko", code: ["PEMKO"], models: ["411"], productName: "Pemko 411 Series Automatic Door Bottom", category: "Thresholds & Seals", specs: "Surface Mounted, Automatic Drop Seal, Sound Rated", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.22", priceRange: "$68-95" },
  { manufacturer: "Pemko", code: ["PEMKO"], models: ["2005"], productName: "Pemko 2005 Series Perimeter Gasketing", category: "Thresholds & Seals", specs: "EPDM Rubber, Adhesive Back, Sound/Smoke Rated", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.22, UL1784", priceRange: "$15-28" },
  // Hager Hinges
  { manufacturer: "Hager", code: ["HAGER"], models: ["BB1279"], productName: "Hager BB1279 Continuous Hinge", category: "Hinges & Pivots", specs: '83" Full Height, Heavy Duty, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.26 Grade 1", priceRange: "$175-255" },
  { manufacturer: "Hager", code: ["HAGER"], models: ["BB1168"], productName: "Hager BB1168 Ball Bearing Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Standard Weight, Ball Bearing, Non-Removable Pin', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1 Grade 1", priceRange: "$24-38" },
  // Rockwood Push/Pull
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["70A"], productName: "Rockwood 70A Push Plate", category: "Push Plates & Pulls", specs: '6" x 16", 050 Stainless Steel, Beveled Edges', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$32-48" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["111"], productName: "Rockwood 111 Push/Pull Plate", category: "Push Plates & Pulls", specs: '3.5" x 15", 050 Stainless Steel, Plate with Pull Handle', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$68-95" },
  // Don-Jo Protection
  { manufacturer: "Don-Jo", code: ["DONJO", "DON-JO"], models: ["LP-207", "LP207"], productName: "Don-Jo LP-207 Latch Protector", category: "Protection & Armor", specs: '2.75" Width, 7" Height, Stainless Steel, Anti-Spread', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.27", priceRange: "$18-28" },
  { manufacturer: "Don-Jo", code: ["DONJO", "DON-JO"], models: ["SP-206", "SP206"], productName: "Don-Jo SP-206 Security Stud", category: "Protection & Armor", specs: '2" x 6" Hinge Pin Protection, Stainless Steel', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$12-22" },
  // HES Electric Strikes
  { manufacturer: "HES", code: ["HES"], models: ["1006", "1006 Series"], productName: "HES 1006 Series Electric Strike", category: "Electric Strikes", specs: '12/24VDC, Fail Secure, ANSI 4-7/8" Strike, Stainless Faceplate', fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.31, UL10C", priceRange: "$180-260" },
  { manufacturer: "HES", code: ["HES"], models: ["5000", "5000 Series"], productName: "HES 5000 Series Heavy Duty Electric Strike", category: "Electric Strikes", specs: "12/24VDC, Fail Secure/Safe Selectable, Mortise Lock Compatible", fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.31 Grade 1, UL10C", priceRange: "$280-390" },
  // Yale Exit Devices
  { manufacturer: "Yale", code: ["YALE"], models: ["8700", "8700 Series"], productName: "Yale 8700 Series Rim Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Rim Mount, Fire Rated', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3 Grade 1, UL10C", priceRange: "$380-520" },
  { manufacturer: "Yale", code: ["YALE"], models: ["8800", "8800 Series"], productName: "Yale 8800 Series Surface Vertical Rod", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Surface Vertical Rod, Fire Rated', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3 Grade 1, UL10C", priceRange: "$480-640" },
  // Norton Closers
  { manufacturer: "Norton", code: ["NORTON"], models: ["7500", "7500 Series"], productName: "Norton 7500 Series Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Regular Arm, Sizes 1-6, Cast Iron Body", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$240-340" },
  { manufacturer: "Norton", code: ["NORTON"], models: ["8301"], productName: "Norton 8301 Concealed Overhead Closer", category: "Closers & Operators", specs: "Heavy Duty, Concealed in Header, Sizes 1-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$360-480" },
  // Additional Schlage Lock Models
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["ND40S", "ND40"], productName: "Schlage ND40S Entrance/Office Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Keyed Entry Function", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2, UL", priceRange: "$185-270" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["ND53PD", "ND53"], productName: "Schlage ND53PD Entry Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Entrance Function, Push Button Lock", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2, UL", priceRange: "$190-275" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["AL70PD", "AL70"], productName: "Schlage AL70PD Classroom Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 2, Light Duty Commercial", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2", priceRange: "$95-145" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["AL80PD", "AL80"], productName: "Schlage AL80PD Passage Cylindrical Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 2, Light Duty Commercial", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.2", priceRange: "$85-135" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["CO250"], productName: "Schlage CO250 Exit Trim", category: "Locks & Locksets", specs: "Exit Device Trim, Mortise Lock Compatible, Grade 1", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13", priceRange: "$280-385" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9000", "L9000 Series"], productName: "Schlage L9000 Series Mortise Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Heavy Duty, Multiple Functions", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$340-485" },
  { manufacturer: "Schlage", code: ["SCH", "SCHLAGE"], models: ["L9040"], productName: "Schlage L9040 Entrance Mortise Lock", category: "Locks & Locksets", specs: "ANSI/BHMA Grade 1, Entrance Function, Thumbturn", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.13, UL10C", priceRange: "$350-495" },
  // Dorma Door Closers
  { manufacturer: "Dorma", code: ["DORMA"], models: ["8000", "8000 Series"], productName: "Dorma 8000 Series Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Regular/Top Jamb/Parallel Arm, EN 2-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1, EN 1154", priceRange: "$260-370" },
  { manufacturer: "Dorma", code: ["DORMA"], models: ["RTS85"], productName: "Dorma RTS85 Overhead Concealed Closer", category: "Closers & Operators", specs: "Heavy Duty, Concealed, Track Arm, EN 3-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1, EN 1154", priceRange: "$420-580" },
  { manufacturer: "Dorma", code: ["DORMA"], models: ["TS93"], productName: "Dorma TS93 Cam-Action Closer", category: "Closers & Operators", specs: "Heavy Duty, Surface Mount, Cam-Action Technology", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$380-520" },
  // Stanley Door Closers
  { manufacturer: "Stanley", code: ["STANLEY", "STA"], models: ["QDC200", "QDC 200"], productName: "Stanley QDC200 Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Quick Install, Regular Arm, Sizes 1-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$220-310" },
  { manufacturer: "Stanley", code: ["STANLEY", "STA"], models: ["QDC300"], productName: "Stanley QDC300 Overhead Concealed Closer", category: "Closers & Operators", specs: "Heavy Duty, Concealed in Header, Quick Install", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$340-460" },
  // Jackson Door Closers
  { manufacturer: "Jackson", code: ["JACKSON"], models: ["5200"], productName: "Jackson 5200 Series Surface Closer", category: "Closers & Operators", specs: "Heavy Duty, Regular Arm, Sizes 1-6", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4 Grade 1", priceRange: "$210-295" },
  // More Von Duprin Exit Devices
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["88", "88 Series"], productName: "Von Duprin 88 Series Rim Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Rim Mount, Classroom Function', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$380-520" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["9927", "9927 Series"], productName: "Von Duprin 9927 Narrow Stile Exit Device", category: "Exit Devices", specs: "Grade 1, Narrow Stile, Rim/SVR Compatible", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$620-780" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["22", "22 Series"], productName: "Von Duprin 22 Series Mortise Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Mortise Lock Compatible', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$680-840" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["6200", "6200 Series"], productName: "Von Duprin 6200 Series Electric Exit Device", category: "Exit Devices", specs: "Grade 1, Electrified, Rim/Mortise Options", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$980-1280" },
  // Corbin Russwin Exit Devices
  { manufacturer: "Corbin Russwin", code: ["CORBIN", "CR", "CORBINRUSSWIN"], models: ["ED5200"], productName: "Corbin Russwin ED5200 Rim Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Rim Mount, Fire Rated', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$420-580" },
  { manufacturer: "Corbin Russwin", code: ["CORBIN", "CR", "CORBINRUSSWIN"], models: ["ED5400"], productName: "Corbin Russwin ED5400 Mortise Exit Device", category: "Exit Devices", specs: 'Grade 1, 36" Wide, Mortise Lock Compatible', fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3, UL10C", priceRange: "$720-890" },
  // Additional Architectural Hardware - Pulls & Plates
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["BF150", "BF 150"], productName: "Rockwood BF150 Pull Handle", category: "Push Plates & Pulls", specs: '1-1/4" Diameter, 12" CTC, Stainless Steel', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.6", priceRange: "$85-125" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["BF158"], productName: "Rockwood BF158 Pull Handle", category: "Push Plates & Pulls", specs: '1-1/2" Diameter, 18" CTC, Extra Heavy Duty', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.6", priceRange: "$125-175" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["RP4"], productName: "Rockwood RP4 Raised Push Plate", category: "Push Plates & Pulls", specs: '4" x 16", Stainless Steel, Raised Design', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$42-62" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["450"], productName: "Rockwood 450 Kick Plate", category: "Protection & Armor", specs: '6" Height, 050 Stainless, Beveled Edges', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$38-58" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["620"], productName: "Rockwood 620 Mop Plate", category: "Protection & Armor", specs: '10" Height, 050 Stainless, Full Width Protection', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$48-72" },
  // Trimco Architectural Hardware
  { manufacturer: "Trimco", code: ["TRIMCO"], models: ["1220"], productName: "Trimco 1220 Series Pull Handle", category: "Push Plates & Pulls", specs: '1" Diameter, 8"-36" CTC, Stainless Steel', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.6", priceRange: "$72-110" },
  { manufacturer: "Trimco", code: ["TRIMCO"], models: ["1522"], productName: "Trimco 1522 Series Push/Pull Plate", category: "Push Plates & Pulls", specs: '4" x 16", Stainless Steel, Integral Pull', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.6", priceRange: "$95-145" },
  // Glynn-Johnson Overhead Stops
  { manufacturer: "Glynn-Johnson", code: ["GJ", "GLYNNJOHNSON"], models: ["100"], productName: "Glynn-Johnson 100 Series Overhead Stop", category: "Stops & Holders", specs: "Overhead Mount, Heavy Duty, Parallel Arm", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$68-95" },
  { manufacturer: "Glynn-Johnson", code: ["GJ", "GLYNNJOHNSON"], models: ["90"], productName: "Glynn-Johnson 90 Series Overhead Holder", category: "Stops & Holders", specs: "Overhead Mount, Hold Open, Manual Release", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$85-120" },
  // Rixson Overhead Devices
  { manufacturer: "Rixson", code: ["RIXSON"], models: ["27"], productName: "Rixson 27 Overhead Stop", category: "Stops & Holders", specs: "Overhead Mount, Heavy Duty, Friction Hold", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$58-82" },
  { manufacturer: "Rixson", code: ["RIXSON"], models: ["370"], productName: "Rixson 370 Floor Closer", category: "Closers & Operators", specs: "Concealed in Floor, Heavy Traffic, Hydraulic", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4", priceRange: "$680-890" },
  { manufacturer: "Rixson", code: ["RIXSON"], models: ["10"], productName: "Rixson 10 Pivot Set", category: "Hinges & Pivots", specs: "Center Hung Pivot, Concealed, Heavy Duty", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4", priceRange: "$280-390" },
  // McKinney Hinges
  { manufacturer: "McKinney", code: ["MCKINNEY"], models: ["TA2714"], productName: "McKinney TA2714 Ball Bearing Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Heavy Weight, Ball Bearing, USP Prime', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1 Grade 1", priceRange: "$32-48" },
  { manufacturer: "McKinney", code: ["MCKINNEY"], models: ["T4A3786"], productName: "McKinney T4A3786 Electric Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Electrified, 8 Wire, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1 Grade 1", priceRange: "$125-175" },
  // Stanley Hinges
  { manufacturer: "Stanley", code: ["STANLEY", "STA"], models: ["FBB179"], productName: "Stanley FBB179 Ball Bearing Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Standard Weight, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1 Grade 1", priceRange: "$24-38" },
  { manufacturer: "Stanley", code: ["STANLEY", "STA"], models: ["CEFBB179"], productName: "Stanley CEFBB179 Electric Hinge", category: "Hinges & Pivots", specs: '4.5" x 4.5", Electrified, 8 Wire Concealed', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.1 Grade 1", priceRange: "$118-168" },
  { manufacturer: "Stanley", code: ["STANLEY", "STA"], models: ["CBBB179"], productName: "Stanley CBBB179 Continuous Hinge", category: "Hinges & Pivots", specs: '83" Full Height, Heavy Duty, Ball Bearing', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.26 Grade 1", priceRange: "$168-245" },
  // Bommer Pivots
  { manufacturer: "Bommer", code: ["BOMMER"], models: ["3029"], productName: "Bommer 3029 Single Acting Pivot", category: "Hinges & Pivots", specs: "Floor/Frame Pivot, Single Acting, Heavy Duty", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4", priceRange: "$185-260" },
  { manufacturer: "Bommer", code: ["BOMMER"], models: ["7811"], productName: "Bommer 7811 Double Acting Pivot", category: "Hinges & Pivots", specs: "Floor/Frame Pivot, Double Acting, 180\xB0 Swing", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.4", priceRange: "$240-330" },
  // Additional Threshold/Seal Products
  { manufacturer: "National Guard", code: ["NG", "NATIONALGUARD", "NATIONAL GUARD"], models: ["175"], productName: "National Guard 175 Threshold", category: "Thresholds & Seals", specs: 'Aluminum, Mill Finish, 1/2" Rise, ADA', fireRating: "Non-Rated", ada: true, standards: "ANSI/BHMA A156.21, ADA", priceRange: "$38-58" },
  { manufacturer: "National Guard", code: ["NG", "NATIONALGUARD", "NATIONAL GUARD"], models: ["693L"], productName: "National Guard 693L Automatic Door Bottom", category: "Thresholds & Seals", specs: "Surface Mount, Automatic Drop, Neoprene Seal", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.22", priceRange: "$72-105" },
  // Zero International Seals
  { manufacturer: "Zero", code: ["ZERO", "ZERO INTERNATIONAL"], models: ["780"], productName: "Zero 780 Automatic Door Bottom", category: "Thresholds & Seals", specs: "Concealed Mount, Automatic Drop, Sound Rated", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.22, UL1784", priceRange: "$85-125" },
  { manufacturer: "Zero", code: ["ZERO", "ZERO INTERNATIONAL"], models: ["1700"], productName: "Zero 1700 Series Perimeter Seal", category: "Thresholds & Seals", specs: "EPDM Rubber, Adhesive/Kerf Mount, Sound/Smoke", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.22, UL1784", priceRange: "$18-32" },
  // Additional HES Electric Strikes
  { manufacturer: "HES", code: ["HES"], models: ["9600"], productName: "HES 9600 Series Folger Adam Compatible Strike", category: "Electric Strikes", specs: "12/24VDC, Fail Secure, For Rim Exit Devices", fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.31, UL10C", priceRange: "$220-310" },
  { manufacturer: "HES", code: ["HES"], models: ["5000C"], productName: "HES 5000C Cylindrical Lock Strike", category: "Electric Strikes", specs: "12/24VDC, Fail Secure, For Cylindrical Locks", fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.31 Grade 1", priceRange: "$195-275" },
  // Adams Rite Electric Strikes
  { manufacturer: "Adams Rite", code: ["AR", "ADAMSRITE", "ADAMS RITE"], models: ["7400"], productName: "Adams Rite 7400 Series Electric Strike", category: "Electric Strikes", specs: "12/24VDC, Fail Secure, Narrow Stile", fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.31", priceRange: "$240-330" },
  { manufacturer: "Adams Rite", code: ["AR", "ADAMSRITE", "ADAMS RITE"], models: ["7110"], productName: "Adams Rite 7110 Solenoid Lock", category: "Electric Strikes", specs: "12/24VDC, Fail Secure, Surface Mount", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.31", priceRange: "$180-250" },
  // Securitron Mag Locks
  { manufacturer: "Securitron", code: ["SECURITRON"], models: ["M62"], productName: "Securitron M62 Electromagnetic Lock", category: "Electric Strikes", specs: "12/24VDC, 1200 lbs Holding Force, Surface Mount", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.23", priceRange: "$280-390" },
  { manufacturer: "Securitron", code: ["SECURITRON"], models: ["M32"], productName: "Securitron M32 Electromagnetic Lock", category: "Electric Strikes", specs: "12/24VDC, 600 lbs Holding Force, Compact", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.23", priceRange: "$210-295" },
  // Alarm Controls Electromagnetic Locks
  { manufacturer: "Alarm Controls", code: ["AC", "ALARMCONTROLS"], models: ["600"], productName: "Alarm Controls 600 Mag Lock", category: "Electric Strikes", specs: "12/24VDC, 1200 lbs Holding Force", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.23", priceRange: "$195-275" },
  // Additional Don-Jo Protection Hardware
  { manufacturer: "Don-Jo", code: ["DONJO", "DON-JO"], models: ["1510", "CW-1510"], productName: "Don-Jo CW-1510 Edge Wrap Protector", category: "Protection & Armor", specs: '10" Height, 16 Gauge, Stainless Steel', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.27", priceRange: "$38-58" },
  { manufacturer: "Don-Jo", code: ["DONJO", "DON-JO"], models: ["90"], productName: "Don-Jo 90 Door Edge Guard", category: "Protection & Armor", specs: '1-1/2" x 84", Stainless Steel J Channel', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$48-72" },
  { manufacturer: "Don-Jo", code: ["DONJO", "DON-JO"], models: ["RP-1412"], productName: "Don-Jo RP-1412 Remodeler Plate", category: "Protection & Armor", specs: '4-1/2" x 12", Stainless Steel, Cover Plate', fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.6", priceRange: "$28-42" },
  // Additional Ives Hardware
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["FB450"], productName: "Ives FB450 Flush Bolt", category: "Locks & Locksets", specs: 'Manual, 12" or 18" Length, Brass/Bronze', fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.16, UL10C", priceRange: "$95-145" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["FB458"], productName: "Ives FB458 Automatic Flush Bolt", category: "Locks & Locksets", specs: 'Automatic, 12" or 18" Length, Heavy Duty', fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.16, UL10C", priceRange: "$165-245" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["436B"], productName: "Ives 436B Roller Latch", category: "Locks & Locksets", specs: "Adjustable, Spring Loaded, Brass/Bronze", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$18-28" },
  { manufacturer: "Ives", code: ["IVE", "IVES"], models: ["315"], productName: "Ives 315 Sliding Door Latch", category: "Locks & Locksets", specs: "Hook Latch, Cavity Slider, Stainless Steel", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$42-62" },
  // Additional Rockwood Flush Bolts
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["580"], productName: "Rockwood 580 Automatic Flush Bolt", category: "Locks & Locksets", specs: 'Automatic, 12" or 18", Brass/Bronze', fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.16, UL10C", priceRange: "$158-235" },
  { manufacturer: "Rockwood", code: ["ROCKWOOD"], models: ["585"], productName: "Rockwood 585 Manual Flush Bolt", category: "Locks & Locksets", specs: 'Manual, 12" or 18", Heavy Duty', fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.16, UL10C", priceRange: "$88-135" },
  // Pocket Door Hardware - Hager
  { manufacturer: "Hager", code: ["HAGER"], models: ["1450"], productName: "Hager 1450 Series Pocket Door Frame", category: "Pocket Door Hardware", specs: "Steel Frame, Single Door, 2x4 or 2x6 Stud", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$185-275" },
  { manufacturer: "Hager", code: ["HAGER"], models: ["1550"], productName: "Hager 1550 Soft Close Pocket Frame", category: "Pocket Door Hardware", specs: "Steel Frame, Soft Close, Single Door", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$285-395" },
  // Johnson Hardware Pocket Doors
  { manufacturer: "Johnson", code: ["JOHNSON"], models: ["1500"], productName: "Johnson 1500 Pocket Door Frame", category: "Pocket Door Hardware", specs: "Steel Frame Kit, Single Pocket, Universal", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$165-245" },
  { manufacturer: "Johnson", code: ["JOHNSON"], models: ["2000"], productName: "Johnson 2000 Series Sliding Door Track", category: "Pocket Door Hardware", specs: "Top Mount, Heavy Duty, Up to 200 lbs", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$85-125" },
  // Hafele Sliding Systems
  { manufacturer: "Hafele", code: ["HAFELE"], models: ["940.50"], productName: "Hafele Slido Classic 80-P Sliding System", category: "Pocket Door Hardware", specs: "Top Hung, Up to 176 lbs, Soft Close", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.15", priceRange: "$380-520" },
  // Door Coordinators
  { manufacturer: "Rixson", code: ["RIXSON"], models: ["C28"], productName: "Rixson C28 Door Coordinator", category: "Coordinators", specs: "Overhead Mount, Double Door Sequencing", fireRating: "Non-Rated", ada: false, standards: "ANSI/BHMA A156.16", priceRange: "$68-95" },
  { manufacturer: "Glynn-Johnson", code: ["GJ", "GLYNNJOHNSON"], models: ["60"], productName: "Glynn-Johnson 60 Series Coordinator", category: "Coordinators", specs: "Overhead Mount, Double Door, Fire Rated", fireRating: "3 Hour", ada: false, standards: "ANSI/BHMA A156.16, UL10C", priceRange: "$95-135" },
  // Additional Exit Device Accessories - Von Duprin Trims
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["996L"], productName: "Von Duprin 996L Exit Trim", category: "Exit Devices", specs: "Lever Trim, 6-Series Compatible, Grade 1", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3", priceRange: "$280-390" },
  { manufacturer: "Von Duprin", code: ["VD", "VON DUPRIN", "VONDUPRIN"], models: ["998"], productName: "Von Duprin 998 Exit Trim with Lever", category: "Exit Devices", specs: "Lever Trim, 98/99-Series Compatible", fireRating: "3 Hour", ada: true, standards: "ANSI/BHMA A156.3", priceRange: "$295-410" }
];
function validateProductDatabase() {
  const required = ["manufacturer", "code", "models", "productName", "category", "specs", "fireRating", "ada", "standards", "priceRange"];
  const errors = [];
  const warnings = [];
  PRODUCT_DATABASE.forEach((product, index) => {
    required.forEach((field) => {
      if (product[field] === void 0 || product[field] === null) {
        errors.push(`Product ${index} (${product.productName || "Unknown"}): Missing required field '${field}'`);
      }
    });
    if (product.code && product.code.length === 0) {
      errors.push(`Product ${index} (${product.productName}): Empty manufacturer codes array`);
    }
    if (product.models && product.models.length === 0) {
      errors.push(`Product ${index} (${product.productName}): Empty models array`);
    }
    if (product.priceRange && typeof product.priceRange === "string") {
      const hasSecondDollar = product.priceRange.split("-")[1]?.includes("$");
      if (!hasSecondDollar) {
        warnings.push(`Product ${index} (${product.productName}): Price range missing $ on second value`);
      }
    }
  });
  if (errors.length > 0) {
    console.error(`[PRODUCT_DATABASE] Validation found ${errors.length} errors:`);
    errors.forEach((err) => console.error(`  - ${err}`));
  }
  if (warnings.length > 0) {
    console.warn(`[PRODUCT_DATABASE] Validation found ${warnings.length} warnings:`);
    warnings.forEach((warn5) => console.warn(`  - ${warn5}`));
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`[PRODUCT_DATABASE] Validation passed: ${PRODUCT_DATABASE.length} products OK`);
  }
  return { errors, warnings, valid: errors.length === 0 };
}
var validationResult = validateProductDatabase();
if (!validationResult.valid) {
  console.error("[PRODUCT_DATABASE] Database validation FAILED - enrichment may not work correctly");
}
function findProductMatch(manufacturerCode, modelNumber) {
  if (!manufacturerCode && !modelNumber)
    return null;
  const mfgUpper = (manufacturerCode || "").toUpperCase().trim();
  const modelUpper = (modelNumber || "").toUpperCase().trim().replace(/[\s-]/g, "");
  for (const product of PRODUCT_DATABASE) {
    const mfgMatch = product.code.some((code) => mfgUpper.includes(code.toUpperCase()) || code.toUpperCase().includes(mfgUpper));
    if (mfgMatch) {
      const modelMatch = product.models.some((model) => {
        const cleanModel = model.toUpperCase().replace(/[\s-]/g, "");
        return modelUpper === cleanModel || modelUpper.includes(cleanModel) || cleanModel.includes(modelUpper);
      });
      if (modelMatch) {
        return {
          ...product,
          matchConfidence: "high",
          matchType: "manufacturer+model"
        };
      }
    }
  }
  if (modelUpper.length >= 3) {
    for (const product of PRODUCT_DATABASE) {
      const modelMatch = product.models.some((model) => {
        const cleanModel = model.toUpperCase().replace(/[\s-]/g, "");
        return modelUpper === cleanModel || modelUpper.length >= 4 && cleanModel.includes(modelUpper);
      });
      if (modelMatch) {
        return {
          ...product,
          matchConfidence: "medium",
          matchType: "model-only"
        };
      }
    }
  }
  return null;
}
function enrichComponent(component) {
  const mfr = component.manufacturer || component.manufacturer_code;
  const mdl = component.model || component.model_number;
  const match = findProductMatch(mfr, mdl);
  if (!match) {
    return component;
  }
  return {
    ...component,
    // Fill in missing fields from product database
    product_name: component.product_name || match.productName,
    component_description: component.component_description || match.specs,
    category: component.category || match.category,
    fire_rating: component.fire_rating || match.fireRating,
    ada_compliant: component.ada_compliant !== null ? component.ada_compliant : match.ada,
    compliance: component.compliance || match.standards,
    // Add enrichment metadata
    _enriched: true,
    _enrichment_confidence: match.matchConfidence,
    _enrichment_source: "product_database",
    _matched_product: match.productName
  };
}
async function matchProductFromDb(component, env2, trade = "doors") {
  const db = env2.DB;
  const { manufacturer, model, catalog_number } = component;
  const modelSearch = (model || catalog_number || "").toUpperCase().trim();
  const mfgSearch = (manufacturer || "").toUpperCase().trim();
  if (!modelSearch && !mfgSearch)
    return null;
  try {
    if (mfgSearch && modelSearch) {
      const exact = await db.prepare(`
        SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p
        JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE p.trade = ? AND UPPER(p.base_model) = ?
          AND (UPPER(m.name) LIKE ? OR UPPER(m.slug) LIKE ?)
        LIMIT 1
      `).bind(trade, modelSearch, `%${mfgSearch}%`, `%${mfgSearch}%`).first();
      if (exact) {
        return { product: exact, confidence: "high", matchType: "exact" };
      }
    }
    if (modelSearch.length >= 3) {
      const partial = await db.prepare(`
        SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
        FROM products p
        JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE p.trade = ? AND (UPPER(p.base_model) LIKE ?
           OR UPPER(p.product_series) LIKE ?)
        ORDER BY LENGTH(p.base_model) ASC
        LIMIT 1
      `).bind(trade, `${modelSearch}%`, `%${modelSearch}%`).first();
      if (partial) {
        return { product: partial, confidence: "medium", matchType: "partial" };
      }
    }
    // Catalog-numbering heuristics below are door-hardware-specific
    // conventions (e.g. ANSI strike prefixes) -- only meaningful for the
    // 'doors' trade. Plumbing/electrical get no equivalent yet; see
    // MULTI_TRADE_BID_SUPPORT.md rollout plan step 3.
    if (trade === "doors") {
      const categoryPatterns = [
        { pattern: /^5BB/i, category: "Hinges" },
        { pattern: /^L9/i, category: "Locks" },
        { pattern: /^4[0-9]{3}/i, category: "Closers" },
        { pattern: /^8[0-9]{3}/i, category: "Seals" },
        { pattern: /^9[0-9]{3}/i, category: "Exit Devices" }
      ];
      for (const { pattern, category } of categoryPatterns) {
        if (pattern.test(modelSearch)) {
          const categoryMatch = await db.prepare(`
            SELECT p.*, m.name as manufacturer_name, m.slug as manufacturer_slug
            FROM products p
            JOIN manufacturers m ON p.manufacturer_id = m.id
            WHERE p.trade = 'doors' AND p.category_level_1 = ?
            LIMIT 1
          `).bind(category).first();
          if (categoryMatch) {
            return { product: categoryMatch, confidence: "low", matchType: "category" };
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.error("Product match error:", err);
    return null;
  }
}
async function getCutSheetsForProduct(productId, env2) {
  const db = env2.DB;
  try {
    const docs = await db.prepare(`
      SELECT id, document_type, document_title, document_url, r2_object_key,
             r2_bucket, page_count, version, published_date
      FROM product_documents
      WHERE product_id = ? AND document_type = 'cut_sheet' AND active = 1
      ORDER BY published_date DESC
    `).bind(productId).all();
    return docs.results || [];
  } catch (err) {
    console.error("Cut sheet lookup error:", err);
    return [];
  }
}
async function matchComponentToCutSheets(component, env2) {
  const match = await matchProductFromDb(component, env2);
  if (!match) {
    return {
      matched: false,
      component,
      product: null,
      cutSheets: [],
      confidence: null
    };
  }
  const cutSheets = await getCutSheetsForProduct(match.product.id, env2);
  return {
    matched: true,
    component,
    product: {
      id: match.product.id,
      name: match.product.display_name || `${match.product.manufacturer_name} ${match.product.base_model}`,
      manufacturer: match.product.manufacturer_name,
      model: match.product.base_model,
      series: match.product.product_series,
      category: match.product.category_level_1,
      ansiGrade: match.product.ansi_grade,
      fireRated: match.product.fire_rated,
      adaCompliant: match.product.ada_compliant
    },
    cutSheets: cutSheets.map((cs) => ({
      id: cs.id,
      title: cs.document_title,
      type: cs.document_type,
      url: cs.document_url,
      r2Key: cs.r2_object_key,
      bucket: cs.r2_bucket,
      pages: cs.page_count
    })),
    confidence: match.confidence,
    matchType: match.matchType
  };
}

export {
  PRODUCT_DATABASE,
  validateProductDatabase,
  findProductMatch,
  enrichComponent,
  matchProductFromDb,
  getCutSheetsForProduct,
  matchComponentToCutSheets,
};
