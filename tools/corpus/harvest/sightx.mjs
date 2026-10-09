import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,now,writeJSON,textPages} from './common.mjs';
import {scheduleDoorMarks} from './qualification.mjs';
const triage=JSON.parse(fs.readFileSync(path.join(root,'triage.json')));
const reviewed=JSON.parse(fs.readFileSync(path.join(root,'visual-review.json')));
const review3=JSON.parse(fs.readFileSync(path.join(root,'visual-review-round3.json')));
const topFive=['674e8c0ea89da178','32b631d235082c7c','61bd6a483519458e','43a1f0db3f7ff345','4af80165bc367de8'];
const candidates=[];
for(const rec of triage.filter(r=>r.floor_plan_architectural||topFive.includes(r.sha256.slice(0,16))||reviewed.some(v=>v.sha256===r.sha256))){
 const texts=textPages(path.join(root,rec.filename),rec.pages);
 const schedules=rec.qualified_page_indexes.door_schedule;
 const scheduleMarks=new Set(schedules.flatMap(i=>scheduleDoorMarks(texts[i])));
 const evidence=[];
 for(const i of rec.qualified_page_indexes.floor_plan_architectural){
  const lines=texts[i].split('\n'),tags=new Map();
  for(let l=0;l<lines.length*.75;l++){
   // Only short layout cells in the drawing area, not the sheet ID/title block.
   for(const cell of lines[l].split(/[ \t]{3,}/).map(s=>s.trim())){
    if(!/^(?:\d{3,4}[A-Z]?|[A-Z]\d{3,4})$/.test(cell)&&!(scheduleMarks.has(cell)&&/^(?:\d{1,4}[A-Z]?|[A-Z]\d{1,4})$/.test(cell)))continue;
    if(!tags.has(cell))tags.set(cell,{mark:cell,occurrences:0,schedule_row_match:scheduleMarks.has(cell),context:lines[l].trim().slice(0,240)});
    tags.get(cell).occurrences++;
   }
  }
  if(tags.size)evidence.push({page_index:i,in_first_quarter:i<rec.pages/4,tags:[...tags.values()].slice(0,60),unique_tag_candidates:tags.size});
 }
 const early=rec.plan_first_quarter_page_indexes,matched=evidence.some(e=>e.tags.some(t=>t.schedule_row_match)),earlyTags=evidence.some(e=>e.in_first_quarter),visual=reviewed.find(v=>v.sha256===rec.sha256);
 const score=(rec.floor_plan_architectural?100:0)+(rec.vector_text?10:0)+(early.length?60:0)+(schedules.length?25:0)+(matched?20:0)+(earlyTags?15:evidence.length?5:0)+(visual?10:0)+Math.min(early.length,10);
 const reason=(rec.floor_plan_architectural?(early.length?early.length+' architectural plan page(s) in first quarter':'Architectural plans start after first quarter'):'Review correction: no qualified architectural plan')+'; '+(schedules.length?'same-set door schedule at index '+schedules[0]:'no qualified same-set door schedule')+'; '+(matched?'plan tags match extracted schedule rows':evidence.length?'tag-shaped text on plan pages; door/room ambiguity':'no conservative tag candidates')+(visual?'; R2405-01 previously verified complete by eye':'')+'.';
 candidates.push({sha16:rec.sha256.slice(0,16),sha256:rec.sha256,url:rec.url,pages:rec.pages,class:rec.class,eligible:rec.floor_plan_architectural,architectural_plan_page_indexes:rec.qualified_page_indexes.floor_plan_architectural,architectural_plan_page_indexes_first_quarter:early,door_tag_evidence:evidence,door_schedule_exists:schedules.length>0,door_schedule_page_index:schedules[0]??null,door_schedule_page_indexes:schedules,vector_text:rec.vector_text?'yes':'no',raster_only:rec.raster_only,score,reason,prior_visual_review:visual||null,round3_visual_review:review3.findings.find(v=>v.sha16===rec.sha256.slice(0,16))||null,review_top_five_rank:topFive.indexOf(rec.sha256.slice(0,16))>=0?topFive.indexOf(rec.sha256.slice(0,16))+1:null});
}
candidates.sort((a,b)=>b.score-a.score||a.sha16.localeCompare(b.sha16));
candidates.forEach((r,i)=>r.rank=i+1);
writeJSON('sightx_candidates.json',{generated_at:now(),page_index_convention:'zero-based PDF ordinal; first quarter is index < pages/4',ranking:'Eligible architectural plans first, early pages, same-set schedules, schedule-row tag matches, vector text; score is a reproducible heuristic, not visual acceptance.',door_tag_caveat:'Tag-shaped cells are candidates: room numbers, equipment numbers and drawing references can look identical. Schedule-row matches strengthen but do not visually verify door placement. Numeric marks shorter than three digits require a schedule-row match.',sets_with_architectural_plan_first_quarter:triage.filter(r=>r.floor_plans_in_first_quarter).length,review_top_five:topFive.map(sha16=>{const c=candidates.find(r=>r.sha16===sha16);return {sha16,rank:c.rank,eligible:c.eligible,early_page_indexes:c.architectural_plan_page_indexes_first_quarter,correction:c.reason};}),candidates});
console.log(JSON.stringify({candidates:candidates.length,early_sets:triage.filter(r=>r.floor_plans_in_first_quarter).length,top_ten:candidates.slice(0,10).map(r=>({sha16:r.sha16,score:r.score,reason:r.reason})),review_top_five:topFive.map(s=>{const c=candidates.find(r=>r.sha16===s);return {sha16:s,rank:c.rank,reason:c.reason};})},null,2));
