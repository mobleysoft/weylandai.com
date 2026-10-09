# Triage Review: "none" vs "plan-only" sets

## Verdict Table

We reviewed 10 "none" class and 10 "plan-only" class PDF sets from oa.mo.gov with "Plans" in the title.
The analysis reveals that most "none" documents are actually valid vector plan sets that were missed because `triage.mjs` strictly searches for the exact phrase "FLOOR PLAN" (or A1xx) and fails to catch other common plan types found in bid documents (e.g., Phasing Plan, Grading Plan, Demo Plan, Site Layout).

| SHA (Prefix) | Class | Verdict | Example Sheet Title Text | Pattern that should catch it |
|---|---|---|---|---|
| `3fedac1a` | none | Vector (Missed by pattern) | `FIRST FLOOR PHASING PLAN` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `63036b35` | none | Raster-only | (No text extracted) | N/A (Requires OCR) |
| `1763668d` | none | Vector (Missed by pattern) | `DEMO PLAN` / `SITE PLAN` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `d8c6fdb6` | none | Vector (Missed by pattern) | `REFLECTED CEILING PLAN` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `f540c405` | none | Vector (Missed by pattern) | `GRADING PLAN` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `805e3849` | none | Vector (Missed by pattern) | `Joint Plan` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING\|JOINT)\s+(?:.*?\s+)?PLANS?\b/i` |
| `0acdca2c` | none | Vector (Missed by pattern) | `PHASING PLAN` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `e98dcaeb` | none | Vector (Missed by pattern) | `Site Plan` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `ce407066` | none | Vector (Missed by pattern) | `CAMPGROUND LAYOUT` | `/\b(?:SITE\|CAMPGROUND)\s+LAYOUT\b/i` |
| `6111f958` | none | Vector (Missed by pattern) | `Grading Plan` | `/\b(?:FLOOR\|SITE\|ROOF\|DEMO(?:LITION)?\|PHASING\|GRADING\|REFLECTED\s+CEILING\|ELECTRICAL\|MECHANICAL\|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i` |
| `8900a915` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `4af80165` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `13c6b0f4` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `43a1f0db` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `8c025309` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `674e8c0e` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `61bd6a48` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `32b631d2` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `23d0610c` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |
| `3d190df7` | plan-only | Vector (Caught by pattern) | N/A | Current pattern caught it |

## Raster Count
We checked every file currently classified as "none" for fonts using `pdffonts`.
Total raster-only sets among all "none" records: **1 out of 151** checked.

## Exact changes to `triage.mjs` (Diff)

```diff
--- tools/corpus/harvest/triage.mjs
+++ tools/corpus/harvest/triage.mjs
@@ -3,18 +3,22 @@
 import {execFileSync} from 'node:child_process';
 import {root,now,writeJSON,records,pages} from './common.mjs';
-const markers={door_schedule:[['DOOR SCHEDULE',/\bDOOR\s+SCHEDULE\b/i,5],['DOOR AND FRAME SCHEDULE',/\bDOOR\s+(?:AND|&)\s+FRAME\s+SCHEDULE\b/i,5],['OPENING SCHEDULE',/\bOPENING\s+SCHEDULE\b/i,5],['A6xx/A8xx/A9xx',/\bA[689]\d{2}(?:\.[\dA-Z]+)?\b/i,1]],hardware_spec:[['08 71 00',/\b08\s+71\s+00\b/,4],['087100/08710',/\b08710(?:0)?\b/,4],['08 70 00',/\b08\s+70\s+00\b/,4],['HARDWARE SET',/\bHARDWARE\s+SETS?\b/i,3],['HW SET',/\bHW\s+SETS?\b/i,3],['HARDWARE GROUP',/\bHARDWARE\s+GROUPS?\b/i,3],['DOOR HARDWARE SCHEDULE',/\bDOOR\s+HARDWARE\s+SCHEDULE\b/i,4]],floor_plan:[['FLOOR PLAN',/\bFLOOR\s+PLANS?\b/i,5],['A1xx',/\bA1\d{2}(?:\.[\dA-Z]+)?\b/i,1]]};
+const markers={door_schedule:[['DOOR SCHEDULE',/\bDOOR\s+SCHEDULE\b/i,5],['DOOR AND FRAME SCHEDULE',/\bDOOR\s+(?:AND|&)\s+FRAME\s+SCHEDULE\b/i,5],['OPENING SCHEDULE',/\bOPENING\s+SCHEDULE\b/i,5],['A6xx/A8xx/A9xx',/\bA[689]\d{2}(?:\.[\dA-Z]+)?\b/i,1]],hardware_spec:[['08 71 00',/\b08\s+71\s+00\b/,4],['087100/08710',/\b08710(?:0)?\b/,4],['08 70 00',/\b08\s+70\s+00\b/,4],['HARDWARE SET',/\bHARDWARE\s+SETS?\b/i,3],['HW SET',/\bHW\s+SETS?\b/i,3],['HARDWARE GROUP',/\bHARDWARE\s+GROUPS?\b/i,3],['DOOR HARDWARE SCHEDULE',/\bDOOR\s+HARDWARE\s+SCHEDULE\b/i,4]],floor_plan:[['FLOOR PLAN',/\b(?:FLOOR|SITE|ROOF|DEMO(?:LITION)?|PHASING|GRADING|REFLECTED\s+CEILING|ELECTRICAL|MECHANICAL|PLUMBING)\s+(?:.*?\s+)?PLANS?\b/i,5],['A1xx',/\bA1\d{2}(?:\.[\dA-Z]+)?\b/i,1],['LAYOUT',/\b(?:SITE|CAMPGROUND)\s+LAYOUT\b/i,5]]};
 fs.mkdirSync(path.join(root,'previews'),{recursive:true});
 const output=[],downloaded=[...new Map(records().filter(r=>r.outcome==='downloaded').map(r=>[r.sha256,r])).values()];
 for(const doc of downloaded){
  const file=path.join(root,doc.filename),count=pages(file);
- const rec={sha256:doc.sha256,url:doc.url,family:doc.family,filename:doc.filename,pages:count,triaged_at:now(),page_index_convention:'zero-based PDF ordinal; page_number is one-based',sampled:count>200,sampling:count>200?'first 60, last 20, every 10th page between':'all pages',examined_page_indexes:[],scanned_page_indexes:[],markers:{door_schedule:[],hardware_spec:[],floor_plan:[],schedule_row_shape:[]},scores:{door_schedule:0,hardware_spec:0,floor_plan:0,schedule_row_shape:0},qualified_page_indexes:{door_schedule:[],hardware_spec:[],floor_plan:[]},previews:{},errors:[],class:'none',confidence:'automated content candidates with reference filtering; visual review required'};
+ const rec={sha256:doc.sha256,url:doc.url,family:doc.family,filename:doc.filename,pages:count,triaged_at:now(),page_index_convention:'zero-based PDF ordinal; page_number is one-based',sampled:count>200,sampling:count>200?'first 60, last 20, every 5th page between':'all pages',examined_page_indexes:[],scanned_page_indexes:[],markers:{door_schedule:[],hardware_spec:[],floor_plan:[],schedule_row_shape:[]},scores:{door_schedule:0,hardware_spec:0,floor_plan:0,schedule_row_shape:0},qualified_page_indexes:{door_schedule:[],hardware_spec:[],floor_plan:[]},previews:{},errors:[],class:'none',raster_only:false,confidence:'automated content candidates with reference filtering; visual review required'};
  if(!count){rec.errors.push('pdfinfo unavailable or PDF unreadable; no classification possible');output.push(rec);continue;}
- const indexes=Array.from({length:count},(_,i)=>i).filter(i=>count<=200||i<60||i>=count-20||(i+1)%10===0);
+ const indexes=Array.from({length:count},(_,i)=>i).filter(i=>count<=200||i<60||i>=count-20||(i+1)%5===0);
+ try{const fonts=execFileSync('pdffonts',[file],{encoding:'utf8',timeout:60000});rec.raster_only=fonts.trim().split('\n').length<=2;}catch(e){rec.errors.push('pdffonts failed: '+e.message.split('\n')[0]);}
  for(const index of indexes){
   let text;try{text=execFileSync('pdftotext',['-layout','-f',String(index+1),'-l',String(index+1),file,'-'],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});}catch(e){rec.errors.push('page '+(index+1)+': pdftotext failed '+e.message.split('\n')[0]);continue;}
@@ -34,7 +38,7 @@
   const doorTitle=/\b(?:DOOR(?:\s+(?:AND|&)\s+FRAME)?|OPENING)\s+SCHEDULE\b/i.test(text);
   const standaloneDoorTitle=text.split('\n').some(line=>/^(?:[A-Z0-9# .-]{0,40})?(?:DOOR(?:\s+(?:AND|&)\s+FRAME)?|OPENING)\s+SCHEDULE(?:\s*[&:(-].*)?$/i.test(line.trim()));
   const actualDoor=rows.length>=2||(doorTitle&&headerCount>=3&&standaloneDoorTitle);
-  const actualPlan=!/\bAIA\s+Document\b/i.test(text)&&(large||drawing)&&/\bFLOOR\s+PLANS?\b/i.test(text);
+  const actualPlan=!/\bAIA\s+Document\b/i.test(text)&&(large||drawing)&&/\b(?:FLOOR|SITE|ROOF|DEMO(?:LITION)?|PHASING|GRADING|REFLECTED\s+CEILING|ELECTRICAL|MECHANICAL|PLUMBING)\s+(?:.*?\s+)?PLANS?\b|\b(?:SITE|CAMPGROUND)\s+LAYOUT\b/i.test(text);
   const hardwareItems=/\b(?:HINGES?|CLOSERS?|LOCKSETS?|LATCHSETS?|EXIT\s+DEVICES?|WEATHERSTRIP|PANIC\s+DEVICE|BUTTS)\b/i.test(text);
```

## Top 5 SightX Floor Plan Sets
Based on checks for vector text, early sheet indexes, and presence of door tags in later pages, the 5 best sets are:
1. `674e8c0ea89da178` (Vector, Sheet Index, Door Tags)
2. `32b631d235082c7c` (Vector, Sheet Index, Door Tags)
3. `61bd6a483519458e` (Vector, Sheet Index)
4. `43a1f0db3f7ff345` (Vector, Sheet Index)
5. `4af80165bc367de8` (Vector, Door Tags)
