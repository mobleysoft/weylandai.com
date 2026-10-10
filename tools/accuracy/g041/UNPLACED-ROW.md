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
