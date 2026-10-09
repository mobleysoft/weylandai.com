import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,now,writeJSON} from './common.mjs';

export function scheduleRows(text){
 const row=/^[ \t]*(?:\d{1,4}[A-Z]?|[A-Z]\d{1,4})[ \t]+(?:\d{1,2}['′](?:[- ]?\d{1,2}["″]?)?|\d{2,3})[ \t]*(?:[xX×][ \t]*|[ \t]{2,})(?:\d{1,2}['′](?:[- ]?\d{1,2}["″]?)?|\d{2,3})[^\n]{0,100}[ \t]+(?:[A-Z]{1,4}|\d{1,3})[ \t]+[^\n]*\b(?:HW[- ]?\d+|\d{1,3}(?:\.\d+)?)\b[^\n]*$/gm;
 return text.match(row)||[];
}

// A conservative second pass prevents sheet references and TOC continuations
// from being treated as plan geometry or a hardware specification.
export function finalize(output) {
 for(const rec of output){
  const file=path.join(root,rec.filename);
  for(const hit of rec.markers.door_schedule){
   try{const text=execFileSync('pdftotext',['-layout','-f',String(hit.page_number),'-l',String(hit.page_number),file,'-'],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});const rows=scheduleRows(text);rec.markers.schedule_row_shape=rec.markers.schedule_row_shape.filter(p=>p.page_index!==hit.page_index);if(rows.length)rec.markers.schedule_row_shape.push({page_index:hit.page_index,page_number:hit.page_number,score:Math.min(rows.length,10),matching_lines:rows.length,examples:rows.slice(0,3)});hit.content_evidence??={};hit.content_evidence.row_matches=rows.length;if(rows.length>=2&&!hit.reference_only)hit.qualified=true;}catch(e){rec.errors.push('Row qualification failed on page '+hit.page_number);}
  }
  rec.scores.schedule_row_shape=rec.markers.schedule_row_shape.reduce((n,p)=>n+p.score,0);
  for(const category of ['hardware_spec','floor_plan'])for(const hit of rec.markers[category].filter(p=>p.qualified)){
   let text;try{text=execFileSync('pdftotext',['-layout','-f',String(hit.page_number),'-l',String(hit.page_number),file,'-'],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});}catch(e){hit.qualified=false;rec.errors.push('Qualification extraction failed on page '+hit.page_number);continue;}
   if(category==='floor_plan'){
    const segments=text.split('\n').flatMap(line=>line.split(/[ \t]{3,}/)).map(line=>line.trim());
    const headings=segments.filter(line=>line.length<=120&&/^(?:[A-Z0-9 .#()/-]{0,60})?\bFLOOR\s+PLANS?(?:\s*(?:[-–:]|AREA|LEVEL|SCALE|\(|$).*)?$/i.test(line)&&!(/\b(?:REFER|SEE|NOTE|NOTES|SCHEDULE|WALL)\b/i.test(line)));
    hit.qualified=headings.length>0;hit.content_evidence={plan_headings:headings.slice(0,5)};
   }else{
    const items=/\b(?:HINGES?|CLOSERS?|LOCKSETS?|LATCHSETS?|EXIT\s+DEVICES?|WEATHERSTRIP|PANIC\s+DEVICE|BUTTS)\b/i.test(text);
    const body=/\bPART\s*[123]\b|\b(?:SUMMARY|SUBMITTALS|QUALITY\s+ASSURANCE|GENERAL\s+REQUIREMENTS)\b/i.test(text);
    hit.qualified=items||body;hit.content_evidence={hardware_items:items,section_body:body};
   }
  }
  for(const category of ['door_schedule','hardware_spec','floor_plan'])rec.qualified_page_indexes[category]=rec.markers[category].filter(p=>p.qualified).map(p=>p.page_index);
  const d=rec.qualified_page_indexes.door_schedule.length,h=rec.qualified_page_indexes.hardware_spec.length,f=rec.qualified_page_indexes.floor_plan.length;
  rec.class=d&&h&&f?'complete':d&&h?'pair':d?'schedule-only':h?'spec-only':f?'plan-only':'none';
  rec.floor_plans_in_first_quarter=rec.qualified_page_indexes.floor_plan.some(i=>i<rec.pages/4);
  rec.plan_first_quarter_page_indexes=rec.qualified_page_indexes.floor_plan.filter(i=>i<rec.pages/4);
  const best=rec.markers.door_schedule.filter(p=>p.qualified).sort((a,b)=>(b.score+(rec.markers.schedule_row_shape.find(p=>p.page_index===b.page_index)?.score||0))-(a.score+(rec.markers.schedule_row_shape.find(p=>p.page_index===a.page_index)?.score||0)))[0];
  const oldDoor=rec.previews.door_schedule;
  if(oldDoor&&(!best||oldDoor.page_index!==best.page_index)){fs.rmSync(path.join(root,oldDoor.path),{force:true});delete rec.previews.door_schedule;}
  if(best&&!rec.previews.door_schedule){const prefix='previews/'+rec.sha256.slice(0,16)+'-door_schedule-p'+best.page_number;try{execFileSync('pdftoppm',['-f',String(best.page_number),'-l',String(best.page_number),'-r','110','-png','-singlefile',file,path.join(root,prefix)],{timeout:120000,maxBuffer:4*1024*1024});rec.previews.door_schedule={path:prefix+'.png',page_index:best.page_index,page_number:best.page_number};}catch(e){rec.errors.push('Qualified schedule preview failed: '+e.message.split('\n')[0]);}}
  const first=rec.markers.floor_plan.find(p=>p.qualified),old=rec.previews.floor_plan;
  if(old&&(!first||old.page_index!==first.page_index)){fs.rmSync(path.join(root,old.path),{force:true});delete rec.previews.floor_plan;}
  if(first&&!rec.previews.floor_plan){const prefix='previews/'+rec.sha256.slice(0,16)+'-floor_plan-p'+first.page_number;try{execFileSync('pdftoppm',['-f',String(first.page_number),'-l',String(first.page_number),'-r','110','-png','-singlefile',file,path.join(root,prefix)],{timeout:120000,maxBuffer:4*1024*1024});rec.previews.floor_plan={path:prefix+'.png',page_index:first.page_index,page_number:first.page_number};}catch(e){rec.errors.push('Qualified plan preview failed: '+e.message.split('\n')[0]);}}
  rec.qualification_pass_at=now();
 }
 writeJSON('triage.json',output);return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=finalize(JSON.parse(fs.readFileSync(path.join(root,'triage.json'))));
 console.log(JSON.stringify({qualified:output.length,complete:output.filter(r=>r.class==='complete').length}));
}
