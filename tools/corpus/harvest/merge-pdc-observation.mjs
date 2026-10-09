import fs from 'node:fs';
import path from 'node:path';
import {root,now,writeJSON} from './common.mjs';
const round=JSON.parse(fs.readFileSync(path.join(root,'round.json'))),check=JSON.parse(fs.readFileSync(path.join(root,'pdc-robots-round3.json')));
if(!round.finished_at)throw new Error('Wait for the serial harvester to finish before merging state');
if(round.pdc_robots_observation_merged)throw new Error('PDC observation already merged');
if(!check.policy.startsWith('deny:'))throw new Error('Public PDC listing still needs enumeration within the existing budget');
const listing='https://operations-webapps.missouri.edu/pdc/adsite/ad.php',origin=new URL(listing).origin;
round.robots[origin]={url:check.url,retrieved_at:check.checked_at,http_status:check.http_status,rules:[],policy:check.policy,error:check.error};
round.blockers.push(listing+' — robots unavailable; '+check.error+'; no page or project PDFs fetched');
round.pdc_observations.push({url:listing,description:'This is the actual public MU listing linked from the current UM System page. Its robots.txt request failed with '+check.error+'. Stopped without fetching the listing or project pages; cannot verify current plans/sealed/ad.pdf/pb.pdf contents.'});
const construction=round.pdc_observations.find(o=>o.url.includes('umsystem.edu'));
if(construction)construction.description+=' It links to '+listing+' and describes a June 20, 2026 transition of the bidder portal to Trimble ID. No login was attempted.';
for(const [url,family,reason] of [[check.url,'robots',check.error],[listing,'missouri_um_pdc','robots unavailable; fail closed ('+check.error+')']]){
 fs.appendFileSync(path.join(root,'manifest.jsonl'),JSON.stringify({sha256:null,url,host:new URL(url).host,family,retrieved_at:check.checked_at,bytes:0,pages:null,http_status:check.http_status,outcome:'skipped',reason})+'\n');
}
round.pdc_robots_observation_merged=true;round.observations_merged_at=now();round.queued_urls++;
writeJSON('round.json',round);
const sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json'))),pdc=sources.enumerators.find(e=>e.family==='missouri_um_pdc');
if(!pdc.urls.includes(listing))pdc.urls.push(listing);
pdc.observed_listing_at=check.checked_at;pdc.observed_listing_note='Live UM System page links to operations-webapps ad.php; both Missouri PDC hosts fail TLS certificate validation at robots.txt in this environment.';
writeJSON('sources.json',sources);
console.log('Recorded both PDC host blockers and the live listing route; no additional document bytes transferred');
