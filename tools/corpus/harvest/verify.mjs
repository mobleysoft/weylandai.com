import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,records,writeJSON,now} from './common.mjs';
const all=records(),sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json'))),round=JSON.parse(fs.readFileSync(path.join(root,'round.json'))),triage=JSON.parse(fs.readFileSync(path.join(root,'triage.json')));
const docs=all.filter(r=>r.outcome==='downloaded');
assert.ok(round.received_bytes<=3000000000,'Decimal round budget exceeded');
assert.ok(docs.every(r=>r.bytes<=150000000),'Decimal per-file cap exceeded');
const names=new Set(docs.map(r=>path.basename(r.filename)));
assert.ok(fs.readdirSync(path.join(root,'downloads')).filter(n=>n.endsWith('.pdf')).every(n=>names.has(n)),'Unmanifested PDF');
for(const r of all){for(const key of ['sha256','url','host','family','retrieved_at','bytes','pages','http_status','outcome'])assert.ok(key in r,key+' missing');assert.match(r.retrieved_at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);if(r.outcome==='skipped')assert.ok(r.reason);}
const seeds=sources.families.flatMap(f=>[...(f.seeds||[]),...(f.low_priority_seeds||[])]);
for(const url of seeds)assert.ok(all.some(r=>r.url===new URL(url).href),'Seed unaccounted: '+url);
for(const e of sources.enumerators)for(const url of e.urls)assert.ok(all.some(r=>r.url===url),'Enumerator unaccounted: '+url);
for(const doc of docs){const bytes=fs.readFileSync(path.join(root,doc.filename));assert.equal(bytes.length,doc.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),doc.sha256);assert.ok(bytes.subarray(0,1024).includes(Buffer.from('%PDF-')));assert.ok(doc.bytes<=round.file_cap);assert.ok(!/bid[ _-]*tab/i.test(decodeURIComponent(new URL(doc.url).pathname).split('/').pop()));assert.ok(!/bidcondocs\.delaware\.gov\/_Drawings/i.test(doc.url));assert.ok(triage.some(r=>r.sha256===doc.sha256));}
assert.equal(new Set(docs.map(r=>r.sha256)).size,docs.length);
for(const r of triage){assert.ok(r.examined_page_indexes.every(i=>i>=0&&i<r.pages));if(r.pages>200)assert.ok(r.examined_page_indexes.every(i=>i<60||i>=r.pages-20||(i+1)%10===0));for(const [kind,p] of Object.entries(r.previews)){assert.ok(fs.existsSync(path.join(root,p.path)));assert.equal(p.page_index+1,p.page_number);assert.ok(r.qualified_page_indexes[kind].includes(p.page_index));}if(r.class==='complete')for(const k of ['door_schedule','hardware_spec','floor_plan'])assert.ok(r.qualified_page_indexes[k].length);}
assert.equal(round.saved_bytes,all.slice(round.manifest_start_line||0).filter(r=>r.outcome==='downloaded').reduce((n,r)=>n+r.bytes,0));
const result={verified_at:now(),downloaded:docs.length,seeds_accounted:seeds.length,enumerators_accounted:sources.enumerators.length,triaged:triage.length,checks:'manifest required fields, all seeds/enumerators accounted, PDF signatures, SHA256 and sizes, unique hashes, exclusions, triage coverage, sampled-page bounds, preview existence, saved-byte accounting',outcome:'passed'};
writeJSON('verification.json',result);console.log(JSON.stringify(result,null,2));
