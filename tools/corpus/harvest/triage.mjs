import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,now,writeJSON,records,pages,textPages} from './common.mjs';
import {categories,planEvidence,classify,updatePreviews,scheduleRows} from './qualification.mjs';
const markers={door_schedule:[['DOOR SCHEDULE',/\bDOOR\s+SCHEDULE\b/i,5],['DOOR AND FRAME SCHEDULE',/\bDOOR\s+(?:AND|&)\s+FRAME\s+SCHEDULE\b/i,5],['OPENING SCHEDULE',/\bOPENING\s+SCHEDULE\b/i,5],['A6xx/A8xx/A9xx',/\bA-?[689]\d{2}(?:\.[\dA-Z]+)?\b/i,1]],hardware_spec:[['08 71 00',/\b08\s+71\s+00\b/,4],['087100/08710',/\b08710(?:0)?\b/,4],['08 70 00',/\b08\s+70\s+00\b/,4],['HARDWARE SET',/\bHARDWARE\s+SETS?\b/i,3],['HW SET',/\bHW\s+SETS?\b/i,3],['HARDWARE GROUP',/\bHARDWARE\s+GROUPS?\b/i,3],['DOOR HARDWARE SCHEDULE',/\bDOOR\s+HARDWARE\s+SCHEDULE\b/i,4]]};
const run=(command,args,maxBuffer=64*1024*1024)=>execFileSync(command,args,{encoding:'utf8',timeout:120000,maxBuffer,stdio:['ignore','pipe','pipe']});
fs.mkdirSync(path.join(root,'previews'),{recursive:true});
const previous=JSON.parse(fs.readFileSync(path.join(root,'triage.json'))),old=new Map(previous.map(r=>[r.sha256,r]));
const output=[],downloaded=[...new Map(records().filter(r=>r.outcome==='downloaded').map(r=>[r.sha256,r])).values()];
const onlyNew=process.argv.includes('--new-only');
for(const doc of downloaded){
 if(onlyNew&&old.get(doc.sha256)?.triage_version===3){output.push(old.get(doc.sha256));continue;}
 const file=path.join(root,doc.filename),count=pages(file);
 const rec={triage_version:3,sha256:doc.sha256,url:doc.url,family:doc.family,filename:doc.filename,pages:count,triaged_at:now(),page_index_convention:'zero-based PDF ordinal; page_number is one-based; first quarter means index < pages/4',sampled:count>200,sampling:count>200?'first 60, last 20, every 5th page between':'all pages',examined_page_indexes:[],scanned_page_indexes:[],page_flags:[],markers:Object.fromEntries([...categories,'schedule_row_shape'].map(k=>[k,[]])),scores:Object.fromEntries([...categories,'schedule_row_shape'].map(k=>[k,0])),qualified_page_indexes:{},previews:structuredClone(old.get(doc.sha256)?.previews||{}),errors:[],class:'none',raster_only:null,vector_text:false,confidence:'automated content candidates; title and tag evidence retained; visual review required'};
 if(!count){rec.errors.push('pdfinfo unavailable or PDF unreadable');classify(rec);output.push(rec);continue;}
 try{const fonts=run('pdffonts',[file]);rec.font_count=fonts.trim().split(/\r?\n/).slice(2).filter(s=>s.trim()).length;rec.raster_only=rec.font_count===0;}catch(e){rec.errors.push('pdffonts failed: '+e.message.split('\n')[0]);}
 const indexes=Array.from({length:count},(_,i)=>i).filter(i=>count<=200||i<60||i>=count-20||(i+1)%5===0);
 let texts,info;
 try{texts=textPages(file,count);info=run('pdfinfo',['-f','1','-l',String(count),file]);}catch(e){rec.extraction_blocker=e.message.split('\n')[0];rec.errors.push(rec.extraction_blocker);classify(rec);updatePreviews(rec);output.push(rec);continue;}
 const dimensions=new Map([...info.matchAll(/Page\s+(\d+)\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/gi)].map(m=>[Number(m[1])-1,{width_points:Number(m[2]),height_points:Number(m[3])}]));
 for(const index of indexes){
  const text=texts[index];if(text===undefined){rec.errors.push('Missing text page '+(index+1));continue;}
  rec.examined_page_indexes.push(index);const flag={page_index:index,page_number:index+1,floor_plan_architectural:false,plan_other:false,vector_text:!!text.trim()};rec.page_flags.push(flag);
  if(!text.trim()){rec.scanned_page_indexes.push(index);continue;}rec.vector_text=true;
  const rows=scheduleRows(text);if(rows.length){rec.markers.schedule_row_shape.push({page_index:index,page_number:index+1,score:Math.min(rows.length,10),matching_lines:rows.length,examples:rows.slice(0,3)});rec.scores.schedule_row_shape+=Math.min(rows.length,10);}
  const reference=/TABLE\s+OF\s+CONTENTS|LIST\s+OF\s+DRAWINGS|(?:DRAWING|DRAWINGS|SHEET)\s+(?:INDEX|LIST)|INDEX\s+(?:OF\s+)?(?:SHEETS|DRAWINGS)|CONTRACTOR\s+REQUESTS?\s+FOR\s+INFORMATION|REPLACE\s+with\s+(?:a\s+)?(?:Revised\s+)?Drawing\s+attached/i.test(text);
  const dim=dimensions.get(index),large=dim&&(dim.width_points>1000||dim.height_points>1000),wide=text.split('\n').some(s=>s.trim().length>140);
  const drawing=!/\bAIA\s+Document\b/i.test(text)&&!!(large||(/\b(?:SCALE|NORTH)\b/i.test(text)&&wide));
  const evidence=planEvidence(text,{reference,drawing});
  for(const [category,content] of [['floor_plan_architectural',evidence.architectural_evidence],['plan_other',evidence.other_evidence]]){
   flag[category]=evidence[category];
   if(content.plan_headings.length||content.sheet_ids?.length){const hit={page_index:index,page_number:index+1,score:content.plan_headings.length?5:1,markers:content.plan_headings.length?content.plan_headings:content.sheet_ids,reference_only:reference,qualified:evidence[category],page_dimensions:dim||null,content_evidence:content};rec.markers[category].push(hit);rec.scores[category]+=hit.score;}
  }
  const headerCount=[/\bWIDTH\b/i,/\bHEIGHT\b/i,/\b(?:HDW|HDWR|HARDWARE)\b/i,/\bFRAME\b/i,/\b(?:DOOR\s+(?:MARK|NO\.?|NUMBER)|MARK)\b/i,/\b(?:FIRE\s+RATING|GLAZING|JAMB|HEAD)\b/i].filter(re=>re.test(text)).length;
  const standalone=text.split('\n').flatMap(s=>s.split(/[ \t]{3,}/)).some(s=>/^(?:[A-Z0-9# .-]{0,40})?(?:DOOR(?:\s+(?:AND|&)\s+FRAME)?|OPENING)\s+SCHEDULE(?:\s*[&:(-].*)?$/i.test(s.trim()));
  const items=/\b(?:HINGES?|CLOSERS?|LOCKSETS?|LATCHSETS?|EXIT\s+DEVICES?|WEATHERSTRIP|PANIC\s+DEVICE|BUTTS)\b/i.test(text),body=/\bPART\s*[123]\b|\b(?:SUMMARY|SUBMITTALS|QUALITY\s+ASSURANCE|GENERAL\s+REQUIREMENTS)\b/i.test(text);
  const section=text.split('\n').some(s=>/^(?:SECTION\s+)?(?:08\s+7[01]\s+00|08710(?:0)?)\s*[-–—:]?\s*DOOR\s+HARDWARE\b|^DOOR\s+HARDWARE\b.*\b(?:08\s+7[01]\s+00|08710(?:0)?)\b/i.test(s.trim()));
  const separate=/^[ \t]*DOOR\s+HARDWARE[ \t]*$/mi.test(text)&&/\b(?:08\s+7[01]\s+00|08710(?:0)?)\b/.test(text),set=/^[ \t]*(?:[A-Z0-9]+[.)][ \t]+)?(?:HARDWARE|HW)[ \t]+(?:SET|GROUP)[ \t]*(?:NO\.?[ \t]*)?[#:]?[ \t]*[A-Z]?\d+\b/mi.test(text);
  for(const [category,defs] of Object.entries(markers)){
   const hits=defs.filter(([,re])=>re.test(text));if(!hits.length)continue;
   const door=category==='door_schedule',qualified=!reference&&(door?(rows.length>=2&&headerCount>=2||standalone&&headerCount>=3):((section||separate)&&(items||body)||set&&items));
   const hit={page_index:index,page_number:index+1,score:hits.reduce((n,[,,weight])=>n+weight,0),markers:hits.map(([label])=>label),reference_only:reference,qualified,content_evidence:door?{standalone_heading:standalone,column_header_count:headerCount,row_matches:rows.length}:{hardware_items:items,section_body:body}};
   rec.markers[category].push(hit);rec.scores[category]+=hit.score;
  }
 }
 classify(rec);updatePreviews(rec);rec.qualification_pass_at=now();rec.plan_detection_revision=2;
 rec.raster_note='raster_only means pdffonts listed no fonts; it does not prove pixels only. No-text pages may be blank or contain vector outlines. No OCR performed.';
 output.push(rec);writeJSON('triage.json',output);console.log(output.length+'/'+downloaded.length+' '+rec.class+' '+doc.sha256.slice(0,16)+' '+count+' pages');
}
writeJSON('triage.json',output);
