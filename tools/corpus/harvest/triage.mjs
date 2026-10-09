import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,now,writeJSON,records,pages} from './common.mjs';
import {finalize,scheduleRows} from './qualification.mjs';
const markers={door_schedule:[['DOOR SCHEDULE',/\bDOOR\s+SCHEDULE\b/i,5],['DOOR AND FRAME SCHEDULE',/\bDOOR\s+(?:AND|&)\s+FRAME\s+SCHEDULE\b/i,5],['OPENING SCHEDULE',/\bOPENING\s+SCHEDULE\b/i,5],['A6xx/A8xx/A9xx',/\bA[689]\d{2}(?:\.[\dA-Z]+)?\b/i,1]],hardware_spec:[['08 71 00',/\b08\s+71\s+00\b/,4],['087100/08710',/\b08710(?:0)?\b/,4],['08 70 00',/\b08\s+70\s+00\b/,4],['HARDWARE SET',/\bHARDWARE\s+SETS?\b/i,3],['HW SET',/\bHW\s+SETS?\b/i,3],['HARDWARE GROUP',/\bHARDWARE\s+GROUPS?\b/i,3],['DOOR HARDWARE SCHEDULE',/\bDOOR\s+HARDWARE\s+SCHEDULE\b/i,4]],floor_plan:[['FLOOR PLAN',/\bFLOOR\s+PLANS?\b/i,5],['A1xx',/\bA1\d{2}(?:\.[\dA-Z]+)?\b/i,1]]};
fs.mkdirSync(path.join(root,'previews'),{recursive:true});
const output=[],downloaded=[...new Map(records().filter(r=>r.outcome==='downloaded').map(r=>[r.sha256,r])).values()];
for(const doc of downloaded){
 const file=path.join(root,doc.filename),count=pages(file);
 const rec={sha256:doc.sha256,url:doc.url,family:doc.family,filename:doc.filename,pages:count,triaged_at:now(),page_index_convention:'zero-based PDF ordinal; page_number is one-based',sampled:count>200,sampling:count>200?'first 60, last 20, every 10th page between':'all pages',examined_page_indexes:[],scanned_page_indexes:[],markers:{door_schedule:[],hardware_spec:[],floor_plan:[],schedule_row_shape:[]},scores:{door_schedule:0,hardware_spec:0,floor_plan:0,schedule_row_shape:0},qualified_page_indexes:{door_schedule:[],hardware_spec:[],floor_plan:[]},previews:{},errors:[],class:'none',confidence:'automated content candidates with reference filtering; visual review required'};
 if(!count){rec.errors.push('pdfinfo unavailable or PDF unreadable; no classification possible');output.push(rec);continue;}
 const indexes=Array.from({length:count},(_,i)=>i).filter(i=>count<=200||i<60||i>=count-20||(i+1)%10===0);
 for(const index of indexes){
  let text;try{text=execFileSync('pdftotext',['-layout','-f',String(index+1),'-l',String(index+1),file,'-'],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024});}catch(e){rec.errors.push('page '+(index+1)+': pdftotext failed '+e.message.split('\n')[0]);continue;}
  rec.examined_page_indexes.push(index);if(!text.trim()){rec.scanned_page_indexes.push(index);continue;}
  for(const [category,defs] of Object.entries(markers)){const hits=defs.filter(([,re])=>re.test(text));if(hits.length){const score=hits.reduce((n,[,,weight])=>n+weight,0);rec.markers[category].push({page_index:index,page_number:index+1,score,markers:hits.map(([label])=>label)});rec.scores[category]+=score;}}
  const rows=scheduleRows(text);if(rows.length){rec.markers.schedule_row_shape.push({page_index:index,page_number:index+1,score:Math.min(rows.length,10),matching_lines:rows.length,examples:rows.slice(0,3)});rec.scores.schedule_row_shape+=Math.min(rows.length,10);}
  const reference=/TABLE\s+OF\s+CONTENTS|LIST\s+OF\s+DRAWINGS|(?:DRAWING|DRAWINGS|SHEET)\s+(?:INDEX|LIST)|INDEX\s+(?:OF\s+)?(?:SHEETS|DRAWINGS)|CONTRACTOR\s+REQUESTS?\s+FOR\s+INFORMATION|REPLACE\s+with\s+(?:a\s+)?(?:Revised\s+)?Drawing\s+attached/i.test(text);
  const wide=text.split('\n').some(line=>line.trim().length>140);
  const headerCount=[/\bWIDTH\b/i,/\bHEIGHT\b/i,/\b(?:HDW|HDWR|HARDWARE)\b/i,/\bFRAME\b/i,/\b(?:DOOR\s+(?:MARK|NO\.?|NUMBER)|MARK)\b/i,/\b(?:FIRE\s+RATING|GLAZING|JAMB|HEAD)\b/i].filter(re=>re.test(text)).length;
  let dimensions=null;
  if(rec.markers.door_schedule.some(p=>p.page_index===index)||rec.markers.floor_plan.some(p=>p.page_index===index))try{const info=execFileSync('pdfinfo',['-f',String(index+1),'-l',String(index+1),file],{encoding:'utf8',timeout:60000});const m=info.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/i);if(m)dimensions={width_points:Number(m[1]),height_points:Number(m[2])};}catch(e){rec.errors.push('Page dimensions unavailable at '+(index+1));}
  const large=dimensions&&(dimensions.width_points>1000||dimensions.height_points>1000);
  const drawing=/\b(?:SCALE|NORTH)\b/i.test(text)&&wide;
  const doorTitle=/\b(?:DOOR(?:\s+(?:AND|&)\s+FRAME)?|OPENING)\s+SCHEDULE\b/i.test(text);
  const standaloneDoorTitle=text.split('\n').some(line=>/^(?:[A-Z0-9# .-]{0,40})?(?:DOOR(?:\s+(?:AND|&)\s+FRAME)?|OPENING)\s+SCHEDULE(?:\s*[&:(-].*)?$/i.test(line.trim()));
  const actualDoor=rows.length>=2||(doorTitle&&headerCount>=3&&standaloneDoorTitle);
  const actualPlan=!/\bAIA\s+Document\b/i.test(text)&&(large||drawing)&&/\bFLOOR\s+PLANS?\b/i.test(text);
  const hardwareItems=/\b(?:HINGES?|CLOSERS?|LOCKSETS?|LATCHSETS?|EXIT\s+DEVICES?|WEATHERSTRIP|PANIC\s+DEVICE|BUTTS)\b/i.test(text);
  const sectionHeading=text.split('\n').some(line=>/^(?:SECTION\s+)?(?:08\s+7[01]\s+00|08710(?:0)?)\s*[-–—:]?\s*DOOR\s+HARDWARE\b|^DOOR\s+HARDWARE\b.*\b(?:08\s+7[01]\s+00|08710(?:0)?)\b/i.test(line.trim()));
  const separateHeading=/^[ \t]*DOOR\s+HARDWARE[ \t]*$/mi.test(text)&&/\b(?:08\s+7[01]\s+00|08710(?:0)?)\b/.test(text);
  const setHeading=/^[ \t]*(?:[A-Z0-9]+[.)][ \t]+)?(?:HARDWARE|HW)[ \t]+(?:SET|GROUP)[ \t]*(?:NO\.?[ \t]*)?[#:]?[ \t]*[A-Z]?\d+\b/mi.test(text);
  const actualHardware=sectionHeading||separateHeading||(setHeading&&hardwareItems);
  for(const [category,qualified] of [['door_schedule',actualDoor],['hardware_spec',actualHardware],['floor_plan',actualPlan]]){const hit=rec.markers[category].find(p=>p.page_index===index);if(hit){hit.reference_only=reference;hit.qualified=!!qualified&&!reference;if(dimensions)hit.page_dimensions=dimensions;if(category==='door_schedule')hit.content_evidence={standalone_heading:standaloneDoorTitle,column_header_count:headerCount,row_matches:rows.length};if(hit.qualified)rec.qualified_page_indexes[category].push(index);}}
 }
 const has=k=>rec.qualified_page_indexes[k].length>0;const d=has('door_schedule'),h=has('hardware_spec'),f=has('floor_plan');rec.class=d&&h&&f?'complete':d&&h?'pair':d?'schedule-only':h?'spec-only':f?'plan-only':'none';
 rec.floor_plans_in_first_quarter=rec.qualified_page_indexes.floor_plan.some(index=>index<count/4);
 rec.plan_first_quarter_page_indexes=rec.qualified_page_indexes.floor_plan.filter(index=>index<count/4);
 rec.scanned_note='No extracted text is marked scanned; blank pages and vector-only pages can also have no text. No OCR was performed.';
 const best=rec.markers.door_schedule.filter(p=>p.qualified).sort((a,b)=>(b.score+(rec.markers.schedule_row_shape.find(r=>r.page_index===b.page_index)?.score||0))-(a.score+(rec.markers.schedule_row_shape.find(r=>r.page_index===a.page_index)?.score||0)))[0];
 for(const [kind,p] of [['door_schedule',best],['floor_plan',rec.markers.floor_plan.find(p=>p.qualified)]])if(p){const prefix='previews/'+doc.sha256.slice(0,16)+'-'+kind+'-p'+p.page_number;try{execFileSync('pdftoppm',['-f',String(p.page_number),'-l',String(p.page_number),'-r','110','-png','-singlefile',file,path.join(root,prefix)],{timeout:120000,maxBuffer:4*1024*1024});rec.previews[kind]={path:prefix+'.png',page_index:p.page_index,page_number:p.page_number};}catch(e){rec.errors.push('Preview failed: '+e.message.split('\n')[0]);}}
 output.push(rec);writeJSON('triage.json',output);console.log(rec.class+' '+doc.sha256.slice(0,16)+' '+count+' pages');
}
finalize(output);
