import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,now,writeJSON,textPages} from './common.mjs';
export const categories=['door_schedule','hardware_spec','floor_plan_architectural','plan_other'];
export function scheduleRows(text){
 const row=/^[ \t]*(?:\d{1,4}[A-Z]?|[A-Z]\d{1,4})[ \t]+(?:\d{1,2}['′](?:[- ]?\d{1,2}["″]?)?|\d{2,3})[ \t]*(?:[xX×][ \t]*|[ \t]{2,})(?:\d{1,2}['′](?:[- ]?\d{1,2}["″]?)?|\d{2,3})[^\n]{0,100}[ \t]+(?:[A-Z]{1,4}|\d{1,3})[ \t]+[^\n]*\b(?:HW[- ]?\d+|\d{1,3}(?:\.\d+)?)\b[^\n]*$/gm;
 // Require a material/hardware token: isolated room/window/grid numbers are not table rows.
 return (text.match(row)||[]).filter(line=>/\b(?:HM|AL|ALUM|ALUMINUM|WD|WOOD|STL|STEEL|GL|GLASS|HOLLOW\s+METAL|SCW|SC|FRP|HW[- ]?\d+)\b/i.test(line));
}
export function scheduleDoorMarks(text){
 const marks=new Set(scheduleRows(text).map(s=>s.trim().split(/\s+/)[0]));
 // Some schedules put door type/material before width and height.
 for(const line of text.split('\n'))for(const m of line.matchAll(/(?:^|[ \t]{3,})(\d{1,4}[A-Z]?|[A-Z]\d{1,4})[ \t]{2,}([^\n]{0,240})/g)){
  const tail=m[2];
  if((tail.match(/\d{1,2}['′](?:[- ]?\d{1,2}["″]?)?/g)||[]).length>=2&&/\b(?:HM|WD|AL|ALUM|WOOD|STL|STEEL|EXISTING|HW)\b/i.test(tail))marks.add(m[1]);
 }
 return [...marks];
}
const otherType=/\b(?:SITE|GRADING|ROOF|(?:REFLECTED\s+)?CEILING|PHASING|ELECTRICAL|MECHANICAL|PLUMBING|JOINT|HVAC|LIGHTING|POWER|FIRE\s+ALARM|DRAINAGE|UTILITY|UTILITIES|FOUNDATION|FRAMING|LANDSCAPE|IRRIGATION)\b/i;
const archTitle=/\b(?:FLOOR\s+PLANS?|LEVEL\s+(?:\d+[A-Z]?|ONE|TWO|THREE|FOUR|FIVE|GROUND|FIRST|SECOND|LOWER|UPPER)\s+PLANS?|OVERALL\s+PLANS?)\b/i;
const otherTitle=/\b(?:SITE|GRADING|ROOF|(?:REFLECTED\s+)?CEILING|PHASING|ELECTRICAL|MECHANICAL|PLUMBING|JOINT|HVAC|LIGHTING|POWER|FIRE\s+ALARM|DRAINAGE|UTILITY|UTILITIES|FOUNDATION|FRAMING|LANDSCAPE|IRRIGATION|DEMO(?:LITION)?)\b[^\n]{0,55}\bPLANS?\b|\b(?:SITE|CAMPGROUND)\s+LAYOUT\b|\bPLANS?\s*[-:]\s*(?:HVAC|POWER|LIGHTING|FIRE\s+ALARM)\b/i;
const archId=/^(?:A-?1\d{2}(?:\.[\dA-Z]+)?|A1\.\d{2}[A-Z]?|AD-?1\d{2}(?:\.[\dA-Z]+)?)$/i;
export const titleNoise=/[.;,]$|\b(?:REFER|SEE|NOTE|NOTES|NOTED|SCHEDULE|SHOWN|INDICATED|PROVIDE|CONTRACTOR|SHALL|MATCH|MATCHLINE|REPLACE|REQUIRED|UNLESS|COORDINATE|SYMBOLS?|LEGENDS?|KEYNOTES?|PER|WITH|WALL\s+TYPES?)\b/i;
// Short layout cells retain sheet titles and avoid prose references.
export function planEvidence(text,{reference=false,drawing=false}={}){
 const lines=text.split('\n'),cells=lines.flatMap((line,i)=>line.split(/[ \t]{3,}/).map(s=>({text:s.trim(),line:i})));
 const titles=cells.filter(c=>c.text.length<=120&&/\bPLAN(?:S)?\b|\bLAYOUT\b/i.test(c.text)&&!titleNoise.test(c.text));
 const ownSheet=cells.filter(c=>c.line>=lines.length*.65&&/^(?:A[DS]?|[MPEFCS][AD]?)[-.]?\d{1,3}(?:\.\d{1,3})?[A-Z]?$/i.test(c.text)).at(-1)?.text||null;
 const otherDiscipline=ownSheet&&/^[MPEFCS]/i.test(ownSheet);
 const architectural=titles.filter(c=>archTitle.test(c.text)&&!otherType.test(c.text)&&!otherDiscipline);
 const other=titles.filter(c=>otherTitle.test(c.text));
 const ids=cells.filter(c=>archId.test(c.text)&&c.line>=lines.length*.65).map(c=>c.text);
 const demo=titles.filter(c=>/\bDEMO(?:LITION)?\s+PLANS?\b/i.test(c.text)&&!otherType.test(c.text));
 if(ids.length&&!otherDiscipline&&(!ownSheet||archId.test(ownSheet)))architectural.push(...demo);
 const architecturalHeadings=[...new Set(architectural.map(c=>c.text))];
 const otherHeadings=[...new Set(other.filter(c=>!architectural.includes(c)).map(c=>c.text))];
 const titleBlockText=cells.filter(c=>c.line>=lines.length*.65&&c.text.length<=100&&/\b(?:PLANS?|ELEVATIONS?|SECTIONS?|DETAILS?|SCHEDULES?)\b/i.test(c.text)&&!/[.;]$|\b(?:SEE|REFER|SHALL|NOTE|RE:|PROVIDE)\b/i.test(c.text)).map(c=>c.text);
 const nonPlanTitle=(titleBlockText.some(s=>/\b(?:ELEVATIONS?|SECTIONS?|DETAILS?|SCHEDULES?)\b/i.test(s))||cells.some(c=>/^(?:EXTERIOR |INTERIOR |BUILDING |WALL )?(?:ELEVATIONS?|SECTIONS?|DETAILS?)$/i.test(c.text)))&&!titles.length;
 const idQualified=ids.length>0&&(!ownSheet||archId.test(ownSheet))&&!otherDiscipline&&!nonPlanTitle&&(architecturalHeadings.length>0||otherHeadings.length===0);
 if(otherDiscipline)otherHeadings.push(...titles.filter(c=>archTitle.test(c.text)).map(c=>c.text));
 return {floor_plan_architectural:!reference&&drawing&&(architecturalHeadings.length>0||idQualified),plan_other:!reference&&drawing&&otherHeadings.length>0,architectural_evidence:{plan_headings:architecturalHeadings,sheet_ids:[...new Set(ids)],sheet_title_text:[...new Set(titleBlockText)],own_sheet_id:ownSheet,qualification_basis:architecturalHeadings.length?'standalone sheet title':idQualified?'architectural sheet ID in lower title-block area':null},other_evidence:{plan_headings:[...new Set(otherHeadings)],own_sheet_id:ownSheet}};
}
export function classify(rec){
 // Dimension strings/numbered windows on elevations can mimic schedule rows.
 for(const p of rec.markers.door_schedule)if(p.qualified){const e=p.content_evidence;p.qualified=!p.reference_only&&!!(e.row_matches>=2&&e.column_header_count>=2||e.standalone_heading&&e.column_header_count>=3);}
 for(const category of categories)rec.qualified_page_indexes[category]=rec.markers[category].filter(p=>p.qualified).map(p=>p.page_index);
 const has=k=>rec.qualified_page_indexes[k].length>0,d=has('door_schedule'),h=has('hardware_spec'),a=has('floor_plan_architectural'),o=has('plan_other');
 rec.floor_plan_architectural=a;rec.plan_other=o;rec.class=d&&h&&a?'complete':d&&h?'pair':d?'schedule-only':h?'spec-only':a||o?'plan-only':'none';
 rec.floor_plans_in_first_quarter=rec.qualified_page_indexes.floor_plan_architectural.some(i=>i<rec.pages/4);
 rec.plan_first_quarter_page_indexes=rec.qualified_page_indexes.floor_plan_architectural.filter(i=>i<rec.pages/4);
}
export function updatePreviews(rec){
 const best=rec.markers.door_schedule.filter(p=>p.qualified).sort((a,b)=>(b.content_evidence.row_matches||0)-(a.content_evidence.row_matches||0)||b.score-a.score)[0];
 const wanted={door_schedule:best,floor_plan_architectural:rec.markers.floor_plan_architectural.find(p=>p.qualified),plan_other:rec.markers.plan_other.find(p=>p.qualified)};
 if(rec.previews.floor_plan){rec.previews.floor_plan_architectural=rec.previews.floor_plan;delete rec.previews.floor_plan;}
 for(const [kind,hit] of Object.entries(wanted)){
  const old=rec.previews[kind];
  if(old&&(!hit||old.page_index!==hit.page_index)){fs.rmSync(path.join(root,old.path),{force:true});delete rec.previews[kind];}
  if(hit&&(!rec.previews[kind]||!fs.existsSync(path.join(root,rec.previews[kind].path)))){
   const prefix='previews/'+rec.sha256.slice(0,16)+'-'+kind+'-p'+hit.page_number;
   try{execFileSync('pdftoppm',['-f',String(hit.page_number),'-l',String(hit.page_number),'-r','110','-png','-singlefile',path.join(root,rec.filename),path.join(root,prefix)],{timeout:120000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});rec.previews[kind]={path:prefix+'.png',page_index:hit.page_index,page_number:hit.page_number};}
   catch(e){rec.errors.push('Preview failed: '+e.message.split('\n')[0]);}
  }
 }
}
export function finalize(output){
 for(const rec of output){
  if(process.argv.includes('--title-check')&&!['floor_plan_architectural','plan_other'].some(k=>rec.markers[k].some(p=>p.qualified&&p.content_evidence.plan_headings.some(s=>titleNoise.test(s)))))continue;
  const file=path.join(root,rec.filename);
  let texts;try{texts=textPages(file,rec.pages);}catch(e){rec.extraction_blocker=e.message.split('\n')[0];rec.errors=[rec.extraction_blocker];rec.examined_page_indexes=[];rec.scanned_page_indexes=[];rec.page_flags=[];for(const k of [...categories,'schedule_row_shape']){rec.markers[k]=[];rec.scores[k]=0;}rec.vector_text=false;classify(rec);updatePreviews(rec);console.log('Blocked '+rec.sha256.slice(0,16)+': '+rec.extraction_blocker);continue;}
  const info=execFileSync('pdfinfo',['-f','1','-l',String(rec.pages),file],{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']});
  const dims=new Map([...info.matchAll(/Page\s+(\d+)\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/gi)].map(m=>[+m[1]-1,{width_points:+m[2],height_points:+m[3]}]));
  for(const kind of ['floor_plan_architectural','plan_other']){rec.markers[kind]=[];rec.scores[kind]=0;}
  for(const index of rec.examined_page_indexes){
   const text=texts[index],dim=dims.get(index),wide=text.split('\n').some(s=>s.trim().length>140);
   const drawing=!/\bAIA\s+Document\b/i.test(text)&&!!(dim&&(dim.width_points>1000||dim.height_points>1000)||/\b(?:SCALE|NORTH)\b/i.test(text)&&wide);
   const reference=/TABLE\s+OF\s+CONTENTS|LIST\s+OF\s+DRAWINGS|(?:DRAWING|DRAWINGS|SHEET)\s+(?:INDEX|LIST)|INDEX\s+(?:OF\s+)?(?:SHEETS|DRAWINGS)|CONTRACTOR\s+REQUESTS?\s+FOR\s+INFORMATION|REPLACE\s+with\s+(?:a\s+)?(?:Revised\s+)?Drawing\s+attached/i.test(text);
   const evidence=planEvidence(text,{reference,drawing}),flag=rec.page_flags.find(p=>p.page_index===index);
   for(const [kind,content] of [['floor_plan_architectural',evidence.architectural_evidence],['plan_other',evidence.other_evidence]]){
    flag[kind]=evidence[kind];
    if(content.plan_headings.length||content.sheet_ids?.length){const score=content.plan_headings.length?5:1;rec.markers[kind].push({page_index:index,page_number:index+1,score,markers:content.plan_headings.length?content.plan_headings:content.sheet_ids,reference_only:reference,qualified:evidence[kind],page_dimensions:dim||null,content_evidence:content});rec.scores[kind]+=score;}
   }
  }
  classify(rec);updatePreviews(rec);rec.qualification_pass_at=now();rec.plan_detection_revision=2;
  console.log('Qualified '+rec.sha256.slice(0,16)+' '+rec.class);
 }
 writeJSON('triage.json',output);return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=JSON.parse(fs.readFileSync(path.join(root,'triage.json')));
 if(output.some(r=>r.triage_version!==3))throw new Error('Re-run triage.mjs to extract round 3 evidence first');
 if(process.argv.includes('--schedule-check')){
  for(const r of output){
   if(r.extraction_blocker)continue;
   for(const hit of r.markers.door_schedule){
    const text=execFileSync('pdftotext',['-layout','-f',String(hit.page_number),'-l',String(hit.page_number),path.join(root,r.filename),'-'],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});
    const rows=scheduleRows(text);hit.content_evidence.row_matches=rows.length;
    r.markers.schedule_row_shape=r.markers.schedule_row_shape.filter(p=>p.page_index!==hit.page_index);
    if(rows.length)r.markers.schedule_row_shape.push({page_index:hit.page_index,page_number:hit.page_number,score:Math.min(rows.length,10),matching_lines:rows.length,examples:rows.slice(0,3)});
   }
   r.scores.schedule_row_shape=r.markers.schedule_row_shape.reduce((n,p)=>n+p.score,0);
   classify(r);updatePreviews(r);r.qualification_pass_at=now();
  }
  writeJSON('triage.json',output);
 }else finalize(output);
 console.log('Qualified '+output.length+' sets');
}
