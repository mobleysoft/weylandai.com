import fs from 'node:fs';
import path from 'node:path';
import {root,now,records,writeJSON} from './common.mjs';
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name)));
const baseline=read('round3-baseline.json'),triage=read('triage.json'),round=read('round.json'),all=records(),baselineKeys=new Set(baseline.sets.map(r=>r.sha256));
const classes=['complete','pair','schedule-only','spec-only','plan-only','none'];
const counts=sets=>Object.fromEntries(classes.map(c=>[c,sets.filter(r=>r.class===c).length]));
const existing=triage.filter(r=>baselineKeys.has(r.sha256)),added=all.slice(baseline.manifest_lines).filter(r=>r.outcome==='downloaded');
const summary={generated_at:now(),before:baseline.counts,after_existing:counts(existing),after_all:counts(triage),existing_sets:existing.length,total_sets:triage.length,architectural_floor_plan_sets:triage.filter(r=>r.floor_plan_architectural).length,architectural_first_quarter_sets:triage.filter(r=>r.floor_plans_in_first_quarter).length,plan_other_sets:triage.filter(r=>r.plan_other).length,raster_only_sets:triage.filter(r=>r.raster_only).length,new_downloads_by_family:Object.fromEntries(['missouri_oa_fmdc','missouri_um_pdc'].map(f=>[f,{sets:added.filter(r=>r.family===f).length,bytes:added.filter(r=>r.family===f).reduce((n,r)=>n+r.bytes,0)}]))};
writeJSON('round3-summary.json',summary);
const lines=['## Round 3 re-triage','', 'Updated '+summary.generated_at+'. This section supersedes the historical round 2 classification and sampling statements above. Existing downloads were not fetched again; all 459 original SHA256 keys are retained.','', '| Class | Before (459) | After, original 459 | After, all sets |','|---|---:|---:|---:|'];
for(const c of classes)lines.push('| '+c+' | '+(baseline.counts[c]||0)+' | '+summary.after_existing[c]+' | '+summary.after_all[c]+' |');
lines.push('',summary.architectural_floor_plan_sets+' sets have architectural floor plans; '+summary.architectural_first_quarter_sets+' have them in the first quarter. '+summary.plan_other_sets+' have other plans; '+summary.raster_only_sets+' list no fonts in pdffonts.','', 'Architectural and other plans have separate page/set flags. Complete requires architectural floor-plan content plus a door schedule and hardware content. Plan-only can contain either plan category. Title text (or a qualifying architectural title-block sheet ID when no title is extracted) is in content_evidence. MEP, ceiling, roof, phasing and site titles do not qualify as architectural merely because they contain FLOOR or OVERALL.','', 'For sets over 200 pages, classification examines first 60, last 20 and every fifth intervening page. pdftotext runs once per PDF with form-feed page boundaries; only selected pages are classified. Unsampled pages are unknown. raster_only is the requested no-fonts proxy, not proof that all objects are raster. Door tag-shaped text can also be room numbers or drawing references. No OCR or credentials were used.');
const sp=path.join(root,'sightx_candidates.json');
lines.push('','### Complete candidates after re-triage','');
for(const r of triage.filter(r=>r.class==='complete')){
 lines.push('- '+r.sha256.slice(0,16)+': '+r.url);
 for(const k of ['door_schedule','hardware_spec','floor_plan_architectural'])lines.push('  '+k+' indexes: '+r.qualified_page_indexes[k].join(', ')+'.');
 for(const [k,p] of Object.entries(r.previews))lines.push('  '+k+' preview: '+p.path+'.');
}
if(fs.existsSync(sp)){const sight=read('sightx_candidates.json');lines.push('','### SightX top ten','','All page indexes are zero-based. Ranking and per-page tag evidence are in sightx_candidates.json.','');for(const c of sight.candidates.slice(0,10))lines.push(c.rank+'. '+c.sha16+' — '+c.reason);lines.push('','### Correction of the review top five','');for(const c of sight.review_top_five)lines.push('- '+c.sha16+' (current rank '+c.rank+'): '+c.correction);}
lines.push('','### Additional harvest','');for(const [f,v] of Object.entries(summary.new_downloads_by_family))lines.push('- '+f+': '+v.sets+' PDFs; '+v.bytes+' saved bytes.');
if(round.round_number===3){lines.push('- Transfer budget: '+round.received_bytes+' / '+round.round_cap+' bytes; saved '+round.saved_bytes+' bytes; file cap '+round.file_cap+' bytes.','- URLs left in queue: '+round.remaining.length+'. Full queue remains in round.json.','', '### UM PDC observations','');for(const o of round.pdc_observations||[])lines.push('- '+o.url+': '+o.description);lines.push('','### Round 3 blockers','');for(const b of [...new Set(round.blockers)])lines.push('- '+b);lines.push('','### Round 3 remaining queue','');for(const r of round.remaining)lines.push('- '+r.url);}
if(round.oa_listing_audit){const a=round.oa_listing_audit;lines.push('','### Final OA listing audit','',a.reason+' '+a.public_pdf_links+' relevant public PDF links; '+a.queue_urls_added+' additional URLs added to the remaining queue. '+a.bytes+' HTML bytes charged to the same 1 GB budget. Registration text: '+a.registration_text.join(' | '));}
const failures=triage.filter(r=>r.errors.length);if(failures.length){lines.push('','### Triage errors','');for(const r of failures)lines.push('- '+r.sha256.slice(0,16)+': '+r.errors.join('; '));}
const vp=path.join(root,'verification.json');if(fs.existsSync(vp)){const v=read('verification.json');lines.push('','### Round 3 verification','',v.outcome+' at '+v.verified_at+'; '+v.triaged+' triaged sets. '+v.checks+'.');}
const report=path.join(root,'REPORT-2026-10-09.md'),original=fs.readFileSync(report,'utf8').split('\n## Round 3 re-triage')[0].trimEnd();
fs.writeFileSync(report,original+'\n\n'+lines.join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
