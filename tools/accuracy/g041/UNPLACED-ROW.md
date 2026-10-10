# g041 follow-up: T2507's one unplaced row, and three rows the reading may miss

Source: `tools/accuracy/g041/measure.json` (merged; the Mac's run) and the text lines of T2507's schedule page 10 that the g020 harvest kept (`tools/accuracy/g020/192a16af8f31ae0c.json`, `harvest_schedule_rows`, page 10). The PDF itself was not re-read here. This container had no R2 read access when this was written.

## The unplaced row: the schedule prints mark 132A twice
measure.json counts 46 rows read, 45 placed, all 45 by the stacked rule, and an empty `not_on_plan`. The 45 placed marks are all distinct. One mark therefore stands for two rows, and the schedule shows which:

    132 DRILL FLOOR A 5'-6" 7'-0" HM EXIST HM EXIST 1
    132 DRILL FLOOR A 6'-3" 7'-0" HM EXIST HM EXIST 1
    132 DRILL FLOOR B 5'-6" 7'-0" HM EXIST HM EXIST 1

Two rows are both room 132, door A, at different widths. readPlan groups rows by mark, so both share the single 132A tag. That is why the row is "placed" by mark but has no tag of its own.

**What decides it is the plan:** a third door tag at room 132 (C, or a second A) would mean the schedule has a typo; a plan with only 132A and 132B would mean the schedule lists one opening twice. Either way, no rule should invent a second position.

**Proposed next step:** when two rows share a mark, list the second one as "shares mark 132A with another row" rather than counting it placed. This is not done here.

## Three rows that may be missing from the 46
The page's lines print 49 door rows: 100 to 110, then 113A ... 141A, 141B, 142A and 143A. The 45 placed marks plus the duplicate 132A account for 46. The three rows **141B, 142A (LEGAL) and 143A (TROOP CMDR)** are in neither count:

    141 HHD CMND TEAM B 3'-0" 7'-0" HM EXIST HM EXIST 1 C
    142 LEGAL A 3'-0" 7'-0" HM EXIST HM EXIST 1 FF1: LVT TILE.
    143 TROOP CMDR A 3'-0" 7'-0" HM EXIST HM EXIST 1 FF2A: EPOXY (TYPE 1)

The g030 hand count is also 46, so either:
- these three rows sit somewhere the count rightly excludes (another table, or a struck or "not in contract" area); or
- the hand count and reader A both stop three rows short.

That needs the PDF page and its rendering, checked by eye. It goes first in g042's spot checks once R2 read access is in this session.

## Eye check on the Mac (2026-10-09 19:58 EDT, rendered page, not the text layer)

Sheet A-103 (PDF page 10) was rendered at 110 dpi whole and at 220 dpi over the door schedule, and read by eye. The DOOR SCHEDULE prints **49 door rows**: 100 to 110 (mark A each, 11 rows), 113A, 113B, 114A, 115A, 115B, 116A, 116B, 117A, 118A, 119A, 120A, 121A, 122A, 123A, 124A, 125A, 126A, 127A, 128A, 128B, 129A, 129B, 130A, 131A, 131B, 132A (5'-6"), 132A (6'-3"), 132B (5'-6"), 133A, 136A, 137A, 138A, 139A, 140A, 141A, 141B, 142A (LEGAL), 143A (TROOP CMDR).

- **141B, 142A and 143A are ordinary door schedule rows**, the last three in the table, not another table and not struck. Reader A (46) and the earlier "hand count" (46) both stop three rows short; that hand count was a count of text-layer lines, not of the rendered page, which is why both agree and both are wrong. Goal g043 (Gemini pool, branch t2507-last-rows) finds the cause in the shared reader and fixes it; the bar is 49 of 49 with every other set unchanged.
- **The two 132A rows are two openings that share a tag.** Floor plan A-100 (page 7) tags two doors 132A, one at the top right of the drill floor beside 133A and one at the bottom right beside 128B and 130A, plus 132B at the bottom left beside 105A. So the schedule is not a typo and the plan has no third tag: the drafter reused the mark for two openings of different widths. The rule that follows (goal g044, cloud): when a mark appears k times in the schedule and k tags carry it on the plan, each row gets its own tag, flagged "shared mark, order assumed"; never one shared position, never an invented one.
- **141A, 141B, 142A and 143A all have tags on A-100**, so once the reader reads 49 rows the stacked rule should place 48 distinct marks plus the second 132A.

Truth for this set, until g043 lands: 49 rows, 48 distinct marks, tier "eye-checked on the rendered page".
