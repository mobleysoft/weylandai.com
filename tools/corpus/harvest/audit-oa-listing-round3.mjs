import fs from 'node:fs';
import path from 'node:path';
import {root,now,records,writeJSON} from './common.mjs';
const round=JSON.parse(fs.readFileSync(path.join(root,'round.json'))),url='https://oa.mo.gov/facilities/bid-opportunities/bid-listing-electronic-plans';
if(!round.finished_at)throw new Error('Serial harvester must finish before audit');
if(round.oa_listing_audit)throw new Error('Listing audit already recorded');
const robots=round.robots['https://oa.mo.gov'];
if(robots?.policy!=='allow: robots absent')throw new Error('No cached robots permission for OA');
const remaining=round.round_cap-round.received_bytes,limit=Math.min(800000,remaining);
if(limit<600000)throw new Error('Insufficient existing round budget for a listing recheck; stop');
await new Promise(r=>setTimeout(r,2000));
const result={checked_at:now(),url,http_status:null,bytes:0,limit,reason:null};
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
try{
 const response=await fetch(url,{headers:{'User-Agent':round.user_agent},redirect:'manual',signal:controller.signal});result.http_status=response.status;
 const declared=Number(response.headers.get('content-length'));
 if(!response.ok||declared>limit){await response.body?.cancel();throw new Error('Listing unavailable or larger than remaining audit allowance; HTTP '+response.status);}
 const chunks=[];
 for await(const chunk of response.body){result.bytes+=chunk.length;round.received_bytes+=chunk.length;if(result.bytes>limit){controller.abort();throw new Error('Listing audit size cap; body discarded');}chunks.push(chunk);}
 const html=Buffer.concat(chunks).toString('utf8'),links=[...new Set([...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>{try{return new URL(m[1].replace(/&amp;/g,'&'),url).href;}catch{return null;}}).filter(Boolean))];
 const relevant=links.filter(u=>{const name=decodeURIComponent(new URL(u).pathname).split('/').pop();return /\.pdf$/i.test(name)&&!/bid[ _-]*tab|\bIFB\b/i.test(name)&&/Plans|Specs|Bid Documents|Bid Docs|Addendum|Add/i.test(name);});
 result.public_pdf_links=relevant.length;result.examples=relevant.slice(0,5);result.password_input=/<input[^>]+type=["']password/i.test(html);
 result.registration_text=[...html.matchAll(/.{0,80}(?:must|please|need to)\s+(?:log\s*in|sign\s*in|register).{0,160}/gi)].map(m=>m[0].replace(/<[^>]*>/g,' '));
 if(!relevant.length)throw new Error('No public relevant PDF links exposed; stop');
 const prior=records(),done=new Set(prior.filter(r=>r.sha256).flatMap(r=>[r.url,r.final_url].filter(Boolean))),pending=new Set(round.remaining.map(r=>r.url));
 let added=0;
 for(const u of relevant)if(!done.has(u)&&!pending.has(u)){round.remaining.push({url:u,family:'missouri_oa_fmdc',kind:'document',depth:0,reason:'Exposed public listing URL; not fetched after the round document cap stop'});pending.add(u);added++;}
 result.queue_urls_added=added;round.queued_urls+=added;
 result.reason='Public static PDF links are exposed without credentials. Registration wording describes a bidder notification list; the earlier gate label was a parser false positive. Remaining URLs recorded; no PDFs fetched by this audit.';
 round.blockers=round.blockers.filter(s=>s!==url+' — no exposed relevant PDF links');
}catch(e){result.reason=e.message;round.blockers.push(url+' — listing audit: '+e.message);}
finally{
 clearTimeout(timer);round.oa_listing_audit=result;round.observations_merged_at=now();writeJSON('round.json',round);writeJSON('oa-listing-round3.json',result);
 fs.appendFileSync(path.join(root,'manifest.jsonl'),JSON.stringify({sha256:null,url,host:new URL(url).host,family:'missouri_oa_fmdc',retrieved_at:result.checked_at,bytes:result.bytes,pages:null,http_status:result.http_status,outcome:result.public_pdf_links?'enumerated':'skipped',reason:result.reason})+'\n');
 console.log(JSON.stringify(result,null,2));
}
