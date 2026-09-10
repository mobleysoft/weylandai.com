import { logClaudeAPICall, callEdge } from "./edge-telemetry.js";
import { resolveExtractionContract } from "./hardware-extraction-pipeline.js";
import { resolveInferenceContract } from "./hardware-extraction-vision-adapters.js";
import { generateJWT, arrayBufferToBase64 } from "../auth-module.js";

export var EXTRACTION_PROMPT_TEMPLATE = `\u{1F6A8}\u{1F6A8}\u{1F6A8} CRITICAL: STOP AND READ THIS FIRST \u{1F6A8}\u{1F6A8}\u{1F6A8}

YOU WILL FAIL THIS TASK IF YOU DON'T READ THIS SECTION CAREFULLY.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
MANDATORY PAGE SELECTION PROTOCOL
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

This PDF contains MULTIPLE pages. You MUST extract from the CORRECT page.

**STEP 1: SCAN ALL PAGES - Identify each page type**

Pages 1-3 are FLOOR PLANS (A-201, A-202, A-203):
\u274C These show architectural drawings with walls, rooms, and door LOCATIONS
\u274C Door numbers on floor plans are in CIRCLES on the drawing (101, 102, 103, 104, 105...)
\u274C These numbers are LOCATION MARKERS - they are NOT the door schedule data
\u274C Small sidebar tables on floor plans are NOT the complete door schedule
\u274C DO NOT EXTRACT FROM PAGES 1-3

Page 4 is the DOOR SCHEDULE TABLE (A-801):
\u2705 This page has "DOOR SCHEDULE" in the title block
\u2705 This is a LARGE TABLE covering the entire page (no architectural drawings)
\u2705 Table has column headers: MARK, ELEVATION, WIDTH, HT, THICKNESS, MAT, FRAME, etc.
\u2705 MARK column contains: G3, G4, 101, 131, 133, 137A, 137B, 142 (letters + gaps in numbering)
\u2705 THIS IS THE ONLY PAGE YOU SHOULD EXTRACT FROM

**STEP 2: BEFORE YOU START EXTRACTING - VERIFY**

Ask yourself these questions RIGHT NOW:
1. What page am I looking at? (must be page 4, sheet A-801)
2. Does this page say "DOOR SCHEDULE" in the title? (must be YES)
3. Is this page a LARGE TABLE format? (must be YES)
4. Does this page have architectural drawings with walls/rooms? (must be NO)
5. Are door numbers in CIRCLES on a drawing? (must be NO)

**STEP 3: LOCATE THE MARK COLUMN ON PAGE 4**

On page 4 (DOOR SCHEDULE), find the table with these characteristics:
- Large table at the top of the page
- Leftmost column header is "MARK" or similar
- MARK column contains diverse values: G3, G4, 101, 131, 133, 134, 135, 136, 137A, 137B, 139, 141, 142
- These values have LETTERS (G3, G4) and GAPS (101 \u2192 131, skips 102-130)
- NOT perfectly sequential (NOT 101, 102, 103, 104, 105...)

**STEP 4: SELF-CHECK BEFORE OUTPUTTING JSON**

Before you output JSON, answer these questions:

Q1: What page number am I extracting from?
Expected: "Page 4" or "Sheet A-801"
WRONG: "Page 1", "Page 2", "Page 3"

Q2: What are the first 5 MARK values I found?
Expected: Should include letters like "G3, G4" OR have gaps like "101, 131, 133"
WRONG: "101, 102, 103, 104, 105" (perfectly sequential = floor plan, not door schedule)

Q3: Is this page a table or a drawing?
Expected: "Large table format"
WRONG: "Architectural drawing with walls and rooms"

IF ANY ANSWER IS WRONG: GO BACK TO PAGE 4 AND START OVER.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
YOUR JOB: Construction Document Specialist for SubmittalExpress
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

CONGRATULATIONS: You have an entry-level data entry job with real consequences.

WHO DEPENDS ON YOUR WORK:
You work for SubmittalExpress, a platform serving door installation contractors (real humans, real businesses). These contractors use YOUR extracted data to bid on construction projects worth $50,000-$500,000.

WHAT HAPPENS WHEN YOU GET IT RIGHT:
\u2713 Contractor prepares accurate bid
\u2713 They win jobs at correct pricing
\u2713 They order the right materials
\u2713 Project completes on time
\u2713 They feed their families

WHAT HAPPENS WHEN YOU GET IT WRONG:
\u2717 Wrong door count = underbid = they lose $10,000+ on the job
\u2717 Wrong door specs = wrong materials ordered = project delays, penalties
\u2717 Wrong bid = they lose the job to competitors who had accurate data
\u2717 Pattern of errors = contractor stops using SubmittalExpress = we lose customer

THIS IS NOT PRACTICE DATA. THIS IS REAL WORK.
Extract with the precision of a forensic accountant reviewing tax records.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
RULE #1: THE MARK COLUMN IS YOUR PRIMARY INDEX (Memorize This)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

The construction industry uses "MARK" as the standard column header for door identifiers.
This is the MOST IMPORTANT column - it's how contractors reference every door in their bid.

**CRITICAL MAPPING:**
   MARK column (in PDF table) = door_number field (in your JSON output)

These are THE SAME THING. Direct 1:1 mapping. Zero transformation.

EXAMPLES:
   PDF shows: MARK column contains "G3" \u2192 You output: "door_number": "G3"
   PDF shows: MARK column contains "137A" \u2192 You output: "door_number": "137A"
   PDF shows: MARK column contains "131" \u2192 You output: "door_number": "131"

MARK values characteristics:
- Mix of letters and numbers (G3, G4, 137A, 137B)
- Often have gaps (101, 131, 133 - skipping 102-130, 132)
- NOT perfectly sequential (never just 1,2,3,4,5...)
- Located in the LEFTMOST column of the door schedule table

\u{1F6A8} IF YOU GENERATE SEQUENTIAL NUMBERS (1,2,3,4,5...), YOU ARE DOING IT WRONG.
\u{1F6A8} IF YOU SEE PERFECT SEQUENCES (101,102,103,104,105...), YOU'RE READING A FLOOR PLAN, NOT A DOOR SCHEDULE.

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
RULE #2: SHOW YOUR WORK (Chain-of-Thought Required)
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

Before outputting JSON, you MUST document your extraction process. This proves you found the correct page and used the correct column.

MANDATORY OUTPUT FORMAT:

EXTRACTION VERIFICATION:
1. Source page: [MUST BE "Page 4" or "Sheet A-801" - if you write anything else, you failed]
2. Page title from title block: [MUST contain "DOOR SCHEDULE" - if it says "FLOOR PLAN", you failed]
3. Visual description: [Describe what you see - is it a table or an architectural drawing?]
4. Column headers found in the table: [list the actual headers from left to right, starting with MARK]
5. MARK column location: [MUST BE leftmost column in the door schedule table]
6. First 10 MARK values extracted: [val1], [val2], [val3], [val4], [val5], [val6], [val7], [val8], [val9], [val10]
7. MARK pattern analysis:
   - Do any values contain LETTERS? [YES/NO - expected: YES for G3, G4, or YES for 137A, 137B]
   - Are there GAPS in numbering? [YES/NO - expected: YES, like 101\u2192131 skips 102-130]
   - Are values PERFECTLY SEQUENTIAL? [YES/NO - expected: NO, if YES you extracted from floor plan]

CONFIDENCE CHECKLIST (Self-Audit):
\u2610 Page number is 4 (or sheet A-801)? [___]
\u2610 Page title contains "DOOR SCHEDULE" (not "FLOOR PLAN" or "FIRST FLOOR PLAN")? [___]
\u2610 Page is a LARGE TABLE format (not architectural drawing with walls/rooms/hallways)? [___]
\u2610 MARK values include letters (G3, G4, 137A) OR have gaps (101, 131, 133 - NOT 101, 102, 103, 104)? [___]
\u2610 Extracted from table's MARK column (not room numbers from floor plan circles)? [___]

EXPECTED CORRECT ANSWERS:
- Source page: Page 4, Sheet A-801, Title "DOOR SCHEDULE"
- First 10 MARK values: G3, G4, 101, 131, 133, 134, 135, 136, 137A, 137B (or similar with letters/gaps)

IF YOUR ANSWERS DON'T MATCH THE EXPECTED PATTERN ABOVE:
\u{1F6A8} STOP IMMEDIATELY \u{1F6A8}
\u{1F6A8} GO BACK TO PAGE 4 \u{1F6A8}
\u{1F6A8} FIND THE LARGE TABLE TITLED "DOOR SCHEDULE" \u{1F6A8}
\u{1F6A8} START EXTRACTION OVER \u{1F6A8}

DECISION: If ALL FIVE boxes = YES and your MARK values match the expected pattern, proceed to JSON output.

---JSON OUTPUT BEGINS BELOW THIS LINE---

[Then output your JSON]

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
YOUR EXTRACTION TASK
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

You are extracting COMPLETE door schedule data from a construction PDF. This document contains 6 interconnected sections that must ALL be extracted:

1. DOOR SCHEDULE TABLE (main data with MARK column)
2. LEGEND - DOOR MATERIALS section (material code definitions)
3. DOOR NOTES section (numbered notes that apply to specific doors)
4. DOOR GLAZING NOTES section (lettered notes about glass/glazing)
5. DOOR TYPES section (visual diagrams showing door configurations)
6. DOOR FRAME TYPES section (frame specifications)

EXTRACTION STRATEGY:

\u{1F6A8}\u{1F6A8}\u{1F6A8} CRITICAL PAGE SELECTION \u{1F6A8}\u{1F6A8}\u{1F6A8}

**WRONG PAGE EXAMPLE (DO NOT USE):**
\u274C Pages 1-3: Floor plans (A-201, A-202, A-203)
\u274C These show architectural drawings with door circles containing numbers: 101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 203
\u274C These numbers are LOCATION MARKERS on drawings - NOT the door schedule
\u274C Small sidebar tables on floor plans are NOT the complete door schedule
\u274C If you extract from floor plans, you will get WRONG DATA

**CORRECT PAGE (MUST USE THIS):**
\u2705 Page 4 or similar (often the last page)
\u2705 Sheet number A-801, A-901, or similar (800-900 series = schedules)
\u2705 Page title "DOOR SCHEDULE" in the title block
\u2705 LARGE TABLE covering entire page (not a drawing with walls/rooms)
\u2705 Table has column headers: MARK, ELEVATION, WIDTH, HT, THICKNESS, MAT, FRAME, GLASS, HARDWARE, etc.
\u2705 MARK column contains diverse values including letters: G3, G4, 101, 131, 133, 137A, 137B, 142
\u2705 Includes "LEGEND - DOOR MATERIALS" section
\u2705 Includes "DOOR NOTES" numbered list

**MANDATORY INSTRUCTION:**
1. Scan through ALL pages in the PDF
2. SKIP pages 1-3 (these are floor plans - IGNORE THEM)
3. Find the page titled "DOOR SCHEDULE" (usually page 4, sheet A-801)
4. Extract ONLY from that page's large table format
5. Before extracting, verify the page title says "DOOR SCHEDULE" not "FLOOR PLAN"

STEP 2: LOCATE THE MARK COLUMN - Your indexing lynchpin

\u{1F3AF} **PRIMARY TARGET: The "MARK" column**
"MARK" is the current industry-standard nomenclature for door identifiers in construction schedules. This column:
- Contains unique door identifiers from architectural drawings (G3, 131, 137A, 142, etc.)
- Is ALWAYS the leftmost identifying column in the door schedule table
- Serves as the primary index for all door data in the construction industry
- Links doors between floor plans, schedules, hardware groups, and specifications

**EXTRACTION PRIORITY:**
1. **First, search for "MARK" column header** - This is the 90% case, most efficient path
2. **If MARK not found**, look for alternative nomenclature:
   - "DOOR NO." or "DOOR NUMBER"
   - "DOOR #" or "NO."
   - "DOOR MARK"
   - Or the leftmost column with door identifiers
3. **Once you identify the MARK column**, extract EXACT values as they appear
   - Do NOT generate sequential numbers (1, 2, 3...)
   - Do NOT modify the format
   - Extract precisely: "G3" \u2192 "G3", "137A" \u2192 "137A", "131" \u2192 "131"

**OTHER TABLE HEADERS** (Read from the actual document, industry-standard variations):
- WIDTH or W or W" (door width)
- HEIGHT or HT or H or H" (door height)
- SIZE (combined: "3'-0" x 7'-0"")
- THICKNESS or THK or T (typically 1-3/4")
- TYPE or DOOR TYPE (configuration: A, B, C, etc.)
- MATERIAL or MAT or MAT'L or MATL (material code: HM, WD, AL, etc.)
- FRAME or FRAME MAT or FR MAT (frame material)
- GLAZING or GLAZ or GLASS or GL (glazing type/code)
- HARDWARE or HDW or HW or HDWR SET (hardware group)
- FIRE RATING or FR or F.R. (90 MIN, 60 MIN, 20 MIN, etc.)
- NOTES or REMARKS (note references)

**CRITICAL RULE:**
Use the ACTUAL header text on THIS document to identify columns. Do NOT assume column positions.

STEP 3: Extract LEGEND - DOOR MATERIALS
- Usually in top-right corner
- Format: Code = Description (e.g., "HM = Hollow Metal")
- Extract ALL material definitions

STEP 4: Extract DOOR NOTES
- Usually numbered (1, 2, 3...)
- These contain critical specifications that apply to specific doors
- Extract the FULL text of each note
- Some doors reference these (e.g., door 101 might have "NOTE 3, 7")

STEP 5: Extract DOOR GLAZING NOTES
- Usually lettered (A, B, C...)
- Specify glazing/glass requirements
- Extract the FULL text of each note
- Doors reference these (e.g., "GLAZ A" means apply glazing note A)

STEP 6: Extract DOOR TYPES
- Visual diagrams labeled Type A, B, C, D, etc.
- Each shows door configuration (single, double, vision panel, sidelight, etc.)
- Extract type letter and describe what you see

STEP 7: Extract DOOR FRAME TYPES
- Similar to door types but for frames
- Extract type letter and specifications

HEADER-TO-FIELD MAPPING INSTRUCTIONS:

Read the actual column headers on the door schedule table, then map them to the output JSON fields as follows:

**door_number** \u2190 Extract from the MARK column (PRIMARY INDEX):
  - **First, look for "MARK"** - industry standard, most common nomenclature
  - If MARK not present, use alternatives: "DOOR NO." or "DOOR #" or "NO." or "DOOR MARK"
  - This column contains unique door identifiers linking to architectural drawings
  - Extract EXACT text as it appears - alphanumeric values are normal (G3, 131, 137A, 142, etc.)
  - NEVER generate sequential numbers (1, 2, 3...) - extract what's written in the table
  - MARK values vary by project but are always unique identifiers for each door

**size** \u2190 Extract from combined dimension column:
  - Header names: "SIZE" or "DOOR SIZE"
  - Format: "3'-0' x 7'-0'" (use single quotes for inch marks, NOT double quotes)
  - If no SIZE column exists, you'll construct this from separate WIDTH and HEIGHT

**width_inches** \u2190 Parse from WIDTH column or SIZE column:
  - Header names: "WIDTH" or "W" or "W""
  - Convert to inches: 3'-0" \u2192 36, 6'-0" \u2192 72

**height_inches** \u2190 Parse from HEIGHT column or SIZE column:
  - Header names: "HEIGHT" or "HT" or "H" or "H""
  - Convert to inches: 7'-0" \u2192 84, 8'-0" \u2192 96

**thickness_inches** \u2190 Parse from THICKNESS column:
  - Header names: "THICKNESS" or "THK" or "T"
  - Convert: 1-3/4 \u2192 1.75, 1 3/4 \u2192 1.75

**type** \u2190 Extract from TYPE column:
  - Header names: "TYPE" or "DOOR TYPE" or "DR TYPE"
  - Usually a letter: A, B, C, D, etc.

**material** \u2190 Extract from MATERIAL column:
  - Header names: "MATERIAL" or "MAT" or "MAT'L" or "MATL"
  - Material code: HM, WD, AL, GL, etc.

**frame** \u2190 Extract from FRAME column:
  - Header names: "FRAME" or "FRAME MAT" or "FR MAT" or "FRAME MATERIAL"
  - Frame material code or type

**glazing** \u2190 Extract from GLAZING column:
  - Header names: "GLAZING" or "GLAZ" or "GLASS" or "GL"
  - Glazing type/code or note reference

**hardware** \u2190 Extract from HARDWARE column:
  - Header names: "HARDWARE" or "HDW" or "HW" or "HDWR SET" or "HARDWARE GROUP"
  - Usually a number: 1, 2, 3, etc.

**fire_rating** \u2190 Extract from FIRE RATING column:
  - Header names: "FIRE RATING" or "FR" or "F.R." or "RATING"
  - Format: "90 MIN", "60 MIN", "20 MIN", or null if none

**door_notes_refs** \u2190 Extract from NOTES or REMARKS column:
  - Look for numbered references: "1, 3, 7" or "NOTE 3, 7"
  - Store as array: ["1", "3", "7"]

**glazing_notes_refs** \u2190 Extract from GLAZING NOTES references:
  - Look for lettered references: "A", "GLAZ A, C"
  - Store as array: ["A", "C"]

DIMENSION CONVERSION:
- 3'-0' \u2192 36 inches
- 7'-0' \u2192 84 inches
- 1-3/4 \u2192 1.75
- 1 3/4 \u2192 1.75

\u{1F6D1} MANDATORY PRE-OUTPUT VALIDATION \u{1F6D1}

Before outputting your JSON, answer these questions. If ANY answer is wrong, START OVER:

**Q1: What page did I extract from?**
- Expected answer: "Page 4" or "Sheet A-801" or similar
- WRONG answer: "Page 1", "Page 2", "Page 3", "A-201", "A-202", "A-203"

**Q2: What are my first 5 door_number values?**
- \u2705 CORRECT example: G3, G4, 101, 102, 103 (includes letters at start)
- \u2705 CORRECT example: 101, 131, 133, 134, 135 (non-sequential, has gaps)
- \u274C WRONG example: 101, 102, 103, 104, 105 (perfectly sequential 100-series)
- \u274C WRONG example: 201, 202, 203, 204, 205 (perfectly sequential 200-series)

**Q3: Does the page I extracted from have walls and rooms drawn on it?**
- \u2705 CORRECT answer: NO - it's a pure table/schedule page
- \u274C WRONG answer: YES - that's a floor plan, not a door schedule

**Q4: Are door numbers in circles on the drawing?**
- \u2705 CORRECT answer: NO - numbers are in table rows
- \u274C WRONG answer: YES - those are floor plan markers, GO BACK TO PAGE 4

**IF YOU ANSWERED ANY QUESTION WRONG:**
You extracted from the wrong page. Return to the page titled "DOOR SCHEDULE" (Page 4, Sheet A-801) and extract from the large table on that page.

CRITICAL JSON FORMAT RULE:
- In the "size" field, use SINGLE QUOTES for inch marks: "3'-0' x 7'-0'"
- DO NOT use double quotes for inches as they break JSON parsing
- OR omit inch marks entirely: "3-0 x 7-0"

OUTPUT FORMAT (JSON object with ALL sections):
{
  "doors": [
    {
      "door_number": "G3",
      "size": "3'-0' x 7'-0'",
      "width_inches": 36,
      "height_inches": 84,
      "type": "A",
      "material": "HM",
      "frame": "A",
      "glazing": "A",
      "hardware": "1",
      "fire_rating": "90 min",
      "door_notes_refs": ["3", "7"],
      "glazing_notes_refs": ["A"],
      "thickness_inches": 1.75,
      "remarks": null
    },
    {
      "door_number": "131",
      "size": "3'-0' x 7'-0'",
      "width_inches": 36,
      "height_inches": 84,
      "type": "B",
      "material": "WD",
      "frame": "B",
      "glazing": null,
      "hardware": "2",
      "fire_rating": "20 min",
      "door_notes_refs": ["1"],
      "glazing_notes_refs": [],
      "thickness_inches": 1.75,
      "remarks": null
    },
    {
      "door_number": "137A",
      "size": "6'-0' x 7'-0'",
      "width_inches": 72,
      "height_inches": 84,
      "type": "C",
      "material": "HM",
      "frame": "A",
      "glazing": "B",
      "hardware": "3",
      "fire_rating": null,
      "door_notes_refs": [],
      "glazing_notes_refs": ["B"],
      "thickness_inches": 1.75,
      "remarks": null
    }
  ],
  "legend": {
    "materials": [
      {"code": "HM", "description": "Hollow Metal"},
      {"code": "WD", "description": "Wood"}
    ]
  },
  "door_notes": [
    {"number": "1", "text": "Full text of note 1..."},
    {"number": "2", "text": "Full text of note 2..."}
  ],
  "glazing_notes": [
    {"letter": "A", "text": "Full text of glazing note A..."},
    {"letter": "B", "text": "Full text of glazing note B..."}
  ],
  "door_types": [
    {"type": "A", "description": "Single door with vision panel"},
    {"type": "B", "description": "Single door, solid"}
  ],
  "frame_types": [
    {"type": "A", "description": "Standard hollow metal frame"}
  ],
  "metadata": {
    "total_doors_extracted": 1,
    "pages_with_schedule": "Page numbers where door schedule was found (e.g., '4' or '1,7')",
    "extraction_warnings": []
  }
}

CRITICAL SUCCESS FACTORS:
1. Extract ALL 6 sections - don't skip Legend, Notes, or Types
2. Preserve note references in door data (e.g., door 101 references note 3)
3. Extract FULL TEXT of all notes - these contain critical specs
4. Link everything together - the notes/types are REQUIRED for accurate bidding

REMEMBER: You MUST output the EXTRACTION VERIFICATION section first, then the JSON.
Your output should look like:

EXTRACTION VERIFICATION:
[your verification here]

CONFIDENCE CHECKLIST:
[your checklist here]

DECISION: [YES/NO with reasoning]

---JSON OUTPUT BEGINS BELOW THIS LINE---

{
  "doors": [...],
  "legend": {...},
  ...
}

Do NOT skip the verification section. This is how we ensure you extracted from the correct page.`;
export async function viaApiDirect(sessionId, pdfBuffer, env2, ctx = {}) {
  const base64Image = arrayBufferToBase64(pdfBuffer);
  const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const startTime = Date.now();
  const model = "claude-opus-4-6";
  const endpoint = "https://api.anthropic.com/v1/messages";
  console.log("viaApiDirect called");
  console.log("env object keys:", Object.keys(env2));
  console.log("ANTHROPIC_API_KEY configured:", !!env2.ANTHROPIC_API_KEY);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env2.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 8e3,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Image
            }
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT_TEMPLATE
          }
        ]
      }]
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    const latencyMs2 = Date.now() - startTime;
    await logClaudeAPICall(env2, {
      apiType: "vision",
      endpoint,
      model,
      requestTimestamp,
      responseTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
      latencyMs: latencyMs2,
      errorMessage: `HTTP ${response.status}: ${errorText.substring(0, 500)}`,
      sessionId,
      userId: ctx.userId,
      pageNumber: ctx.pageNumber
    });
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const latencyMs = Date.now() - startTime;
  await logClaudeAPICall(env2, {
    apiType: "vision",
    endpoint,
    model,
    requestTimestamp,
    responseTimestamp,
    inputTokens: result.usage?.input_tokens || 0,
    outputTokens: result.usage?.output_tokens || 0,
    latencyMs,
    sessionId,
    userId: ctx.userId,
    pageNumber: ctx.pageNumber
  });
  if (result.error) {
    throw new Error(`Claude API error: ${result.error.message}`);
  }
  const extractionText = result.content[0].text.trim();
  const parsed = parseAndValidateExtraction(extractionText, { tokenUsage: result.usage });
  return parsed;
}
export function parseAndValidateExtraction(extractionText, telemetryContext = {}) {
  let responseText = extractionText;
  const verificationMatch = responseText.match(/EXTRACTION VERIFICATION:([\s\S]*?)---JSON OUTPUT BEGINS BELOW THIS LINE---/);
  if (verificationMatch) {
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log("\u{1F4CB} CLAUDE CHAIN-OF-THOUGHT VERIFICATION:");
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(verificationMatch[1].trim());
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    const verificationText = verificationMatch[1].trim();
    const pageMatch = verificationText.match(/Source page:.*?(?:page\s*(\d+)|sheet\s*(a-?\d+))/i);
    const titleMatch = verificationText.match(/Page title.*?["']([^"']+)["']/i);
    const markValuesMatch = verificationText.match(/First 10 MARK values.*?:\s*(.+)/i);
    if (pageMatch) {
      console.log("\u2713 Page extracted from:", pageMatch[1] || pageMatch[2]);
    }
    if (titleMatch) {
      console.log("\u2713 Page title:", titleMatch[1]);
    }
    if (markValuesMatch) {
      console.log("\u2713 MARK values from verification:", markValuesMatch[1].trim());
    }
  } else {
    console.error("\u26A0\uFE0F ERROR: No chain-of-thought verification found in response");
    console.error("\u26A0\uFE0F Claude may have skipped the verification step");
    console.error("\u26A0\uFE0F First 500 chars of response:", responseText.substring(0, 500));
  }
  let jsonText = responseText;
  const jsonMarker = "---JSON OUTPUT BEGINS BELOW THIS LINE---";
  if (responseText.includes(jsonMarker)) {
    jsonText = responseText.substring(responseText.indexOf(jsonMarker) + jsonMarker.length).trim();
    console.log("\u2713 Found chain-of-thought marker, extracting JSON from after marker");
  }
  jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStart = jsonText.indexOf("{");
  const jsonEnd = jsonText.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Claude response does not contain valid JSON object");
  }
  jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
  jsonText = jsonText.replace(/(\d+'-\d+)\\"(\s*x\s*\d+'-\d+)\\"/g, "$1'$2'");
  jsonText = jsonText.replace(/"size":\s*"([^"]*)\\"([^"]*)\\"([^"]*)"/g, function(match, p1, p2, p3) {
    return '"size": "' + p1 + p2 + p3 + '"';
  });
  let extractionData;
  try {
    extractionData = JSON.parse(jsonText);
  } catch (parseError) {
    console.error("JSON parse failed. First 1000 chars:", jsonText.substring(0, 1e3));
    console.error("Last 500 chars:", jsonText.substring(jsonText.length - 500));
    throw new Error(`JSON parse error: ${parseError.message}\\nReceived: ${jsonText.substring(0, 500)}`);
  }
  if (!extractionData.doors || !Array.isArray(extractionData.doors)) {
    throw new Error('Invalid response format: missing "doors" array');
  }
  const firstTenMarks = extractionData.doors.slice(0, 10).map((d) => d.door_number);
  console.log(
    "\u{1F50D} CLAUDE RAW RESPONSE - First 10 door_number values:",
    firstTenMarks.join(", ")
  );
  console.log("\u{1F50D} Total doors extracted:", extractionData.doors.length);
  const hasLettersInMarks = firstTenMarks.some((mark) => /[A-Za-z]/.test(String(mark)));
  const isSequential = firstTenMarks.length >= 5 && firstTenMarks.slice(0, 5).every((mark, idx, arr) => {
    if (idx === 0)
      return true;
    const curr = parseInt(String(mark));
    const prev = parseInt(String(arr[idx - 1]));
    return !isNaN(curr) && !isNaN(prev) && (curr === prev + 1 || curr === prev + 100);
  });
  if (isSequential && !hasLettersInMarks) {
    console.error("\u26A0\uFE0F WARNING: SEQUENTIAL DOOR NUMBERS DETECTED - Claude likely extracted from FLOOR PLAN instead of DOOR SCHEDULE");
    console.error("\u26A0\uFE0F Expected MARK pattern: G3, G4, 101, 131, 133, 137A, 137B (letters or gaps)");
    console.error("\u26A0\uFE0F Actual pattern:", firstTenMarks.join(", "));
    throw new Error("Extraction failed: Sequential door numbers detected. Claude extracted from floor plan pages (A-201, A-202, A-203) instead of the door schedule table (A-801). The MARK column should contain values like G3, G4, 101, 131, 133, 137A, 137B with letters or gaps in numbering, NOT perfectly sequential numbers like 101, 102, 103, 104, 105.");
  }
  const validatedDoors = [];
  const validationErrors = [];
  for (let i = 0; i < extractionData.doors.length; i++) {
    const door = extractionData.doors[i];
    const doorErrors = [];
    if (!door.door_number || String(door.door_number).trim() === "") {
      doorErrors.push(`Row ${i + 1}: Missing door_number`);
      continue;
    }
    const validatedDoor = {
      door_number: String(door.door_number).trim(),
      door_type: door.type || door.door_type ? String(door.type || door.door_type).trim() : null,
      material_code: door.material || door.material_code ? String(door.material || door.material_code).trim().toUpperCase() : null,
      width_inches: parseFloat(door.width_inches) || null,
      height_inches: parseFloat(door.height_inches) || null,
      thickness_inches: parseFloat(door.thickness_inches) || null,
      fire_rating: door.fire_rating ? String(door.fire_rating).trim() : null,
      hardware_group: door.hardware || door.hardware_group ? String(door.hardware || door.hardware_group).trim() : null,
      frame_material: door.frame || door.frame_material ? String(door.frame || door.frame_material).trim().toUpperCase() : null,
      remarks: door.remarks ? String(door.remarks).trim() : null,
      // Store new comprehensive fields as JSON for now
      size: door.size || null,
      glazing: door.glazing || null,
      door_notes_refs: door.door_notes_refs ? JSON.stringify(door.door_notes_refs) : null,
      glazing_notes_refs: door.glazing_notes_refs ? JSON.stringify(door.glazing_notes_refs) : null
    };
    if (validatedDoor.width_inches !== null) {
      if (validatedDoor.width_inches < 18 || validatedDoor.width_inches > 72) {
        doorErrors.push(`Door ${validatedDoor.door_number}: Width ${validatedDoor.width_inches}" outside typical range (18-72")`);
      }
    }
    if (validatedDoor.height_inches !== null) {
      if (validatedDoor.height_inches < 60 || validatedDoor.height_inches > 120) {
        doorErrors.push(`Door ${validatedDoor.door_number}: Height ${validatedDoor.height_inches}" outside typical range (60-120")`);
      }
    }
    if (validatedDoor.thickness_inches !== null) {
      const validThicknesses = [1.375, 1.5, 1.75];
      const hasValidThickness = validThicknesses.some((t) => Math.abs(t - validatedDoor.thickness_inches) < 0.01);
      if (!hasValidThickness) {
        doorErrors.push(`Door ${validatedDoor.door_number}: Thickness ${validatedDoor.thickness_inches}" not standard (1.375, 1.5, 1.75)`);
      }
    }
    const validMaterials = ["HM", "WD", "ALUM", "GL", "WOOD", "ALUMINUM", "GLASS", "STEEL"];
    if (validatedDoor.material_code && !validMaterials.includes(validatedDoor.material_code)) {
      doorErrors.push(`Door ${validatedDoor.door_number}: Unknown material code "${validatedDoor.material_code}"`);
    }
    validatedDoors.push(validatedDoor);
    if (doorErrors.length > 0) {
      validationErrors.push(...doorErrors);
    }
  }
  const errorRate = validationErrors.length / Math.max(validatedDoors.length, 1);
  const baseConfidence = 0.95;
  const confidence = Math.max(0.5, baseConfidence - errorRate * 0.3);
  console.log(`Extraction complete: ${validatedDoors.length} doors, ${validationErrors.length} warnings, confidence: ${confidence.toFixed(2)}`);
  const tokenUsage = telemetryContext.tokenUsage;
  return {
    doors: validatedDoors,
    token_usage: tokenUsage ? tokenUsage.input_tokens + tokenUsage.output_tokens : 0,
    extraction_confidence: Math.round(confidence * 100) / 100,
    validation_warnings: validationErrors,
    metadata: extractionData.metadata || {}
  };
}

export async function viaSabpClaudeCode(sessionId, pdfBuffer, env2, ctx = {}) {
  const session = await env2.DB.prepare(
    `SELECT n.mhs_id, s.document_type, s.tenant_id, s.total_pages
     FROM hardware_extraction_sessions s JOIN nodes n ON n.id = s.user_id
     WHERE s.id = ?`
  ).bind(sessionId).first();
  if (!session?.mhs_id)
    return { sync: true, error: "no_mhs_id_for_session_owner" };
  const _schedType = session.document_type === "door_schedule" ? "door_schedule" : null;
  const contract = await resolveExtractionContract(env2, {
    sessionId,
    pageNumber: 1,
    totalPages: session.total_pages || 1,
    tenantId: session.tenant_id || null,
    scheduleType: _schedType
  });
  const _inf = resolveInferenceContract(env2);
  const messages = [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: arrayBufferToBase64(pdfBuffer)
        }
      },
      { type: "text", text: contract.prompt }
    ]
  }];
  const r = await callEdge("POST", "/ai/v1/jobs/queue", env2, {
    owner_id: session.mhs_id,
    venture_code: "weyland",
    model_hint: _inf.model,
    max_tokens: _inf.max_tokens,
    temperature: _inf.temperature,
    messages,
    metadata: {
      session_id: sessionId,
      kind: _schedType === "door_schedule" ? "door_schedule_extract" : "hardware_schedule_extract",
      prompt_sha256: contract.provenance.prompt_sha256
    }
  });
  if (r.status !== 200 || !r.body?.job_id) {
    return { sync: true, error: "queue_failed", detail: r.body };
  }
  await env2.DB.prepare(
    `UPDATE hardware_extraction_sessions
     SET pending_job_id = ?, pending_job_queued_at = ?
     WHERE id = ?`
  ).bind(r.body.job_id, (/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
  return { sync: false, job_id: r.body.job_id };
}
export async function viaLocalSubprocess(sessionId, pdfBuffer, env2, ctx = {}) {
  const messages = [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: arrayBufferToBase64(pdfBuffer)
        }
      },
      { type: "text", text: EXTRACTION_PROMPT_TEMPLATE }
    ]
  }];
  const sidecar = env2.LOCAL_VISION_SIDECAR_URL || "http://127.0.0.1:9999";
  const r = await fetch(`${sidecar}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model_hint: "claude-opus-4-7", max_tokens: 8e3 })
  });
  if (!r.ok)
    return { sync: true, error: "sidecar_unreachable", http_status: r.status };
  const result = await r.json();
  if (!result.success)
    return { sync: true, error: "sidecar_error", detail: result.error };
  const text = result.result?.content?.[0]?.text || "";
  const persisted = parseAndValidateExtraction(text);
  return { sync: true, ...persisted };
}
export function adaptersForEdition(env2) {
  const isLocal = env2.WEYLAND_EDITION === "local";
  return {
    api_direct: viaApiDirect,
    ...!isLocal && { claude_code_local: viaSabpClaudeCode },
    ...isLocal && { claude_code_subprocess: viaLocalSubprocess }
  };
}
export async function dispatchVisionExtraction(sessionId, pdfBuffer, env2, ctx = {}) {
  const row = await env2.DB.prepare(
    `SELECT extraction_route FROM hardware_extraction_sessions WHERE id = ?`
  ).bind(sessionId).first();
  const ADAPTERS = adaptersForEdition(env2);
  const DEFAULT_ROUTE = env2.WEYLAND_EDITION === "local" ? "claude_code_subprocess" : "claude_code_local";
  const route = row?.extraction_route in ADAPTERS ? row.extraction_route : DEFAULT_ROUTE in ADAPTERS ? DEFAULT_ROUTE : "api_direct";
  const result = await ADAPTERS[route](sessionId, pdfBuffer, env2, ctx);
  if (row && result?.sync !== false && !result?.error) {
    await env2.DB.prepare(
      `UPDATE hardware_extraction_sessions SET extraction_completed_at = ?
       WHERE id = ? AND extraction_completed_at IS NULL`
    ).bind((/* @__PURE__ */ new Date()).toISOString(), sessionId).run();
  }
  return result;
}

export function pdfBufferOrNull(buf, keyForLog) {
  if (!buf)
    return null;
  try {
    const head = new Uint8Array(buf, 0, Math.min(5, buf.byteLength));
    const magic = String.fromCharCode(...head);
    if (magic === "%PDF-")
      return buf;
    console.warn(`[PDF Cache Guard] ${keyForLog}: cached value is NOT a PDF (head='${magic}', ${buf.byteLength}B) \u2014 ignoring cache, streaming from R2`);
  } catch (e) {
    console.warn(`[PDF Cache Guard] ${keyForLog}: unreadable cached value \u2014 ignoring cache: ${e.message}`);
  }
  return null;
}
export async function generateR2StreamUrl(bufferKey, env2) {
  const token = await generateJWT({ key: bufferKey }, env2.JWT_SECRET, 3e5);
  const origin = env2.APP_URL || "https://weyland.onamerica.org";
  return `${origin}/api/internal/r2-stream?token=${encodeURIComponent(token)}`;
}

export function getUnaffirmReason(item, type) {
  if (type === "group") {
    if (!item.group_number && !item.groupNumber)
      return "Missing group number";
    return "Not yet reviewed";
  }
  if (type === "component") {
    if (!item.type && !item.component_type)
      return "Missing component type";
    if (!item.manufacturer && !item.manufacturer_code)
      return "Missing manufacturer";
    if (item.flagged)
      return "Flagged for review";
    return "Not yet reviewed";
  }
  return "Unknown";
}
