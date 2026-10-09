import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,records,writeJSON,now} from './common.mjs';
import {titleNoise} from './qualification.mjs';
const all=records(),sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json'))),round=JSON.parse(fs.readFileSync(path.join(root,'round.json'))),triage=JSON.parse(fs.readFileSync(path.join(root,'triage.json')));
const docs=all.filter(r=>r.outcome==='downloaded');
assert.ok(round.received_bytes<=round.round_cap,'Decimal round budget exceeded');
if(round.round_number===3)assert.equal(round.round_cap,1000000000);
assert.ok(docs.every(r=>r.bytes<=150000000),'Decimal per-file cap exceeded');
const names=new Set(docs.map(r=>path.basename(r.filename)));
assert.ok(fs.readdirSync(path.join(root,'downloads')).filter(n=>n.endsWith('.pdf')).every(n=>names.has(n)),'Unmanifested PDF');
for(const r of all){for(const key of ['sha256','url','host','family','retrieved_at','bytes','pages','http_status','outcome'])assert.ok(key in r,key+' missing');assert.match(r.retrieved_at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);if(r.outcome==='skipped')assert.ok(r.reason);}
const seeds=sources.families.flatMap(f=>[...(f.seeds||[]),...(f.low_priority_seeds||[])]);
for(const url of seeds)assert.ok(all.some(r=>r.url===new URL(url).href),'Seed unaccounted: '+url);
for(const e of sources.enumerators)for(const url of e.urls)assert.ok(all.some(r=>r.url===url),'Enumerator unaccounted: '+url);
for(const doc of docs){const bytes=fs.readFileSync(path.join(root,doc.filename));assert.equal(bytes.length,doc.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),doc.sha256);assert.ok(bytes.subarray(0,1024).includes(Buffer.from('%PDF-')));assert.ok(doc.bytes<=round.file_cap);assert.ok(!/bid[ _-]*tab/i.test(decodeURIComponent(new URL(doc.url).pathname).split('/').pop()));assert.ok(!/bidcondocs\.delaware\.gov\/_Drawings/i.test(doc.url));assert.ok(triage.some(r=>r.sha256===doc.sha256));}
assert.equal(new Set(docs.map(r=>r.sha256)).size,docs.length);
assert.equal(new Set(triage.map(r=>r.sha256)).size,docs.length);
assert.equal(triage.length,docs.length);
for(const r of triage){
 assert.equal(r.triage_version,3);
 const expected=Array.from({length:r.pages},(_,i)=>i).filter(i=>r.pages<=200||i<60||i>=r.pages-20||(i+1)%5===0);
 assert.deepEqual(r.examined_page_indexes,r.extraction_blocker?[]:expected,'Missing sampled pages: '+r.sha256);
 if(r.extraction_blocker)assert.ok(r.errors.includes(r.extraction_blocker));
 assert.equal(typeof r.raster_only,'boolean');
 assert.equal(r.raster_only,r.font_count===0);
 assert.deepEqual(r.page_flags.map(p=>p.page_index),r.examined_page_indexes);
 for(const kind of ['floor_plan_architectural','plan_other']){
  assert.equal(r[kind],r.qualified_page_indexes[kind].length>0);
  assert.deepEqual(r.page_flags.filter(p=>p[kind]).map(p=>p.page_index),r.qualified_page_indexes[kind]);
  for(const hit of r.markers[kind].filter(p=>p.qualified)){assert.ok(hit.content_evidence.plan_headings.length||hit.content_evidence.sheet_ids?.length,'Missing plan title/ID evidence');assert.ok(hit.content_evidence.plan_headings.every(s=>!titleNoise.test(s)),'Prose or legend used as plan title');}
 }
 for(const p of r.markers.door_schedule.filter(p=>p.qualified)){const e=p.content_evidence;assert.ok(e.row_matches>=2&&e.column_header_count>=2||e.standalone_heading&&e.column_header_count>=3,'Schedule lacks table evidence');}
 for(const [kind,p] of Object.entries(r.previews)){assert.ok(fs.existsSync(path.join(root,p.path)));assert.equal(p.page_index+1,p.page_number);assert.ok(r.qualified_page_indexes[kind].includes(p.page_index));}
 if(r.class==='complete')for(const k of ['door_schedule','hardware_spec','floor_plan_architectural'])assert.ok(r.qualified_page_indexes[k].length);
}
const baseline=JSON.parse(fs.readFileSync(path.join(root,'round3-baseline.json')));
const reviewed=sha=>triage.find(r=>r.sha256.startsWith(sha));
for(const sha of ['674e8c0ea89da178','61bd6a483519458e'])assert.equal(reviewed(sha).floor_plan_architectural,false,'MEP/fire-alarm review regression');
assert.deepEqual(reviewed('32b631d235082c7c').plan_first_quarter_page_indexes,[]);
for(const sha of ['43a1f0db3f7ff345','4af80165bc367de8'])assert.ok(reviewed(sha).floor_plans_in_first_quarter);
assert.equal(reviewed('a4b7b0a81c5a6602').class,'complete');
for(const r of baseline.sets)assert.ok(docs.some(d=>d.sha256===r.sha256&&d.filename===r.filename),'Baseline SHA256/filename changed');
const candidatesPath=path.join(root,'sightx_candidates.json');
if(fs.existsSync(candidatesPath))for(const c of JSON.parse(fs.readFileSync(candidatesPath)).candidates){const r=triage.find(r=>r.sha256===c.sha256);assert.deepEqual(c.architectural_plan_page_indexes_first_quarter,r.plan_first_quarter_page_indexes);assert.deepEqual(c.door_schedule_page_indexes,r.qualified_page_indexes.door_schedule);for(const e of c.door_tag_evidence)assert.ok(r.qualified_page_indexes.floor_plan_architectural.includes(e.page_index));}
assert.equal(round.saved_bytes,all.slice(round.manifest_start_line||0).filter(r=>r.outcome==='downloaded').reduce((n,r)=>n+r.bytes,0));
if(round.round_number===3){const accounted=all.slice(round.manifest_start_line).filter(r=>r.family!=='robots').reduce((n,r)=>n+r.bytes,0);assert.equal(round.received_bytes,accounted,'Round 3 transfer accounting differs from manifest');assert.ok(round.pdc_robots_observation_merged);assert.ok(round.oa_listing_audit.public_pdf_links>0);}
const result={verified_at:now(),downloaded:docs.length,baseline_sha256_preserved:baseline.sets.length,seeds_accounted:seeds.length,enumerators_accounted:sources.enumerators.length,triaged:triage.length,extraction_blockers:triage.filter(r=>r.extraction_blocker).map(r=>({sha16:r.sha256.slice(0,16),reason:r.extraction_blocker})),round_cap:round.round_cap,received_bytes:round.received_bytes,checks:'manifest fields, source coverage, PDF signatures, SHA256 and sizes, preserved baseline hashes, unique hashes, exclusions, exact fifth-page sampling coverage or explicit extraction blocker, per-page/set plan flags, title/ID evidence, complete requires architectural plan, candidate evidence indexes, previews, saved-byte accounting',outcome:'passed'};
writeJSON('verification.json',result);console.log(JSON.stringify(result,null,2));
