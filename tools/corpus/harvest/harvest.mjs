import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root, now, writeJSON, records, pages} from './common.mjs';
const UA='WeylandAI-corpus/1.0 (+https://weylandai.com)';
const round3=process.argv.includes('--round3');
const FILE_CAP=150000000, ROUND_CAP=round3?1000000000:3000000000;
const sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json')));
fs.mkdirSync(path.join(root,'downloads'),{recursive:true});
const known=new Set(), last=new Map(), robots=new Map(), queue=[], queued=new Set(), targets=new Set();
const resume=process.argv.includes('--resume');
if(round3&&resume)throw new Error('Round 3 is a new capped round; do not resume round 2');
if(round3&&JSON.parse(fs.readFileSync(path.join(root,'round.json'))).round_number===3)throw new Error('Round 3 already started; do not reset its budget');
const state=resume?JSON.parse(fs.readFileSync(path.join(root,'round.json'))):{started_at:now(),user_agent:UA,file_cap:FILE_CAP,round_cap:ROUND_CAP,received_bytes:0,saved_bytes:0,robots:{},blockers:[],next_targets:[],remaining:[],finished_at:null};
state.manifest_start_line??=resume?0:records().length;
if(round3){state.round_number=3;state.pdc_observations=[];}
let currentIndex=-1;
if(resume){
 if(state.finished_at)throw new Error('Cannot resume a finished round; start a new round explicitly');
 state.original_limits??={file_cap:state.file_cap,round_cap:state.round_cap};
 state.file_cap=FILE_CAP;state.round_cap=ROUND_CAP;
 state.resume_events??=[];state.resume_events.push({at:now(),reason:'Tighten cap units to decimal MB/GB; preserve consumed budget'});
 // A legacy interruption did not checkpoint the in-flight body. Reserve its entire maximum size.
 if(state.pending_request||!state.interruption_reserve_bytes){const reserved=Math.min(state.pending_request?FILE_CAP:state.original_limits.file_cap,ROUND_CAP-state.received_bytes);state.interruption_reserve_bytes=(state.interruption_reserve_bytes||0)+reserved;state.received_bytes+=reserved;state.blockers.push('Interrupted request: '+reserved+' bytes conservatively reserved for its uncheckpointed transfer.');}
 for(const [origin,entry] of Object.entries(state.robots))robots.set(origin,{rules:entry.rules,fail:entry.policy.startsWith('deny:')});
 state.next_targets.forEach(url=>targets.add(url));
}
const previous=records(),visited=new Set(resume?previous.filter(r=>r.family!=='robots').map(r=>r.url):round3?previous.filter(r=>r.outcome==='downloaded'||r.sha256).flatMap(r=>[r.url,r.final_url].filter(Boolean)):[]);
if(resume)state.saved_bytes=previous.slice(state.manifest_start_line).filter(r=>r.outcome==='downloaded').reduce((n,r)=>n+r.bytes,0);
function hashes(value) { if(typeof value==='string') { for(const h of value.matchAll(/\b[a-f0-9]{64}\b/gi)) known.add(h[0].toLowerCase()); } else if(value&&typeof value==='object') for(const v of Object.values(value)) hashes(v); }
const corpus=path.dirname(root);
for(const name of ['door-schedules/manifest.json','plan-sets/manifest.json','acquisition-2026-10-09.json']) { const p=path.join(corpus,name); if(fs.existsSync(p)) hashes(JSON.parse(fs.readFileSync(p))); else state.blockers.push('Missing deduplication source: '+name); }
function scan(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,e.name); if(e.isDirectory()) scan(p); else if(e.name.endsWith('.pdf')) known.add(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')); else if(/\.(json|jsonl|txt|md)$/i.test(e.name)) hashes(fs.readFileSync(p,'utf8'));} }
if(fs.existsSync(path.join(corpus,'specs'))) scan(path.join(corpus,'specs'));
for(const r of records()) if(r.sha256) known.add(r.sha256);
function add(url,family,kind='document',depth=0) {try {const u=new URL(url);u.hash='';if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return;url=u.href;const reconstruct=resume&&['oa','pdc','pdc-project','pdc-directory'].includes(kind)&&previous.some(r=>r.url===url&&r.outcome==='enumerated');if(visited.has(url)&&!reconstruct)return;if(!queued.has(url)){queued.add(url);const entry={url,family,kind,depth};const before=round3&&family==='missouri_um_pdc'?queue.findIndex((x,i)=>i>currentIndex&&x.family==='missouri_oa_fmdc'):-1;if(before>=0)queue.splice(before,0,entry);else queue.push(entry);}}catch{}}
function log(item,extra) { const r={sha256:null,url:item.url,host:new URL(item.url).host,family:item.family,retrieved_at:now(),bytes:0,pages:null,http_status:null,outcome:'skipped',...extra}; fs.appendFileSync(path.join(root,'manifest.jsonl'),JSON.stringify(r)+'\n'); console.log(r.outcome+' '+r.url+' '+(r.reason||r.bytes)); }
async function pace(host) {const wait=2000-(Date.now()-(last.get(host)||0));if(wait>0)await new Promise(r=>setTimeout(r,wait));last.set(host,Date.now());}
function robotRules(text) {const groups=[];let group=null,hadRules=false;for(let line of text.split(/\r?\n/)){line=line.split('#')[0].trim();const m=line.match(/^([^:]+):\s*(.*)$/);if(!m)continue;const k=m[1].trim().toLowerCase(),v=m[2].trim();if(k==='user-agent'){if(!group||hadRules){group={agents:[],disallow:[]};groups.push(group);hadRules=false;}group.agents.push(v.toLowerCase());}else if(group){hadRules=true;if(k==='disallow'&&v)group.disallow.push(v);}}return groups.filter(g=>g.agents.includes('*')).flatMap(g=>g.disallow);}
function blocked(url,rules) {const u=new URL(url);let p;try{p=decodeURIComponent(u.pathname+u.search);}catch{p=u.pathname+u.search;}if(u.hostname==='bidcondocs.delaware.gov'&&/^\/_Drawings(?:\/|$)/i.test(p))return 'Hard prohibition: /_Drawings';for(const rule of rules){const anchored=rule.endsWith('$');const clean=anchored?rule.slice(0,-1):rule;const re=new RegExp('^'+clean.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+(anchored?'$':''));if(re.test(p))return 'robots.txt Disallow: '+rule;}return null;}
async function raw(url,limit,isRobots=false) {
 for(let attempt=1;attempt<=2;attempt++) {
  const u=new URL(url);await pace(u.host);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);let status=null,size=0;
  try {const response=await fetch(url,{headers:{'User-Agent':UA},redirect:'manual',signal:controller.signal});status=response.status;
   if([301,302,303,307,308].includes(status)){await response.body?.cancel();return {status,redirect:new URL(response.headers.get('location'),url).href,attempt};}
   if(status>=500||status===429){await response.body?.cancel();throw new Error('HTTP '+status);}
   if(!response.ok){await response.body?.cancel();return {status,error:'HTTP '+status,attempt};}
   const declared=Number(response.headers.get('content-length'));
   if(declared>limit){await response.body?.cancel();return {status,error:isRobots?'robots size cap':declared>FILE_CAP?'Per-file cap (Content-Length)':'Round cap: next file cannot fit remaining budget (Content-Length)',cap:true,round_cap:!isRobots&&declared<=FILE_CAP,attempt};}
   const chunks=[];
   for await(const chunk of response.body){if(size+chunk.length>limit||(!isRobots&&state.received_bytes+chunk.length>ROUND_CAP)){controller.abort();state.overflow_chunk_bytes=(state.overflow_chunk_bytes||0)+chunk.length;return {status,bytes:size,error:'Stream cap; incoming overflow chunk discarded',cap:true,round_cap:!isRobots&&limit<FILE_CAP,attempt};}size+=chunk.length;if(!isRobots)state.received_bytes+=chunk.length;chunks.push(chunk);}
   return {status,bytes:size,data:Buffer.concat(chunks),type:response.headers.get('content-type')||'',attempt};
  } catch(e) {if(attempt===2)return {status,bytes:size,error:e.message+(e.cause?.code?' ('+e.cause.code+')':''),attempt};}
  finally{clearTimeout(timer);}
 }
}
async function rulesFor(url) {const u=new URL(url),origin=u.origin;if(robots.has(origin))return robots.get(origin);const ru=origin+'/robots.txt';let r=await raw(ru,2*1024*1024,true);if(r.redirect)r={...r,error:'robots redirect: cannot establish rules safely'};const rules=r.data?robotRules(r.data.toString('utf8')):[];const fail=!!r.error&&![404,410].includes(r.status);const entry={url:ru,retrieved_at:now(),http_status:r.status,rules,policy:fail?'deny: unavailable robots':r.status===404||r.status===410?'allow: robots absent':'apply User-agent * Disallow',error:r.error||null};state.robots[origin]=entry;robots.set(origin,{rules,fail});fs.appendFileSync(path.join(root,'manifest.jsonl'),JSON.stringify({sha256:null,url:ru,host:u.host,family:'robots',retrieved_at:entry.retrieved_at,bytes:r.bytes||0,pages:null,http_status:r.status,outcome:fail?'skipped':'robots',reason:entry.error||entry.policy})+'\n');return {rules,fail};}
async function get(item) {let url=item.url;for(let n=0;n<8;n++){const rule=await rulesFor(url);const reason=rule.fail?'robots unavailable; fail closed':blocked(url,rule.rules);if(reason)return {error:reason};const r=await raw(url,Math.min(FILE_CAP,ROUND_CAP-state.received_bytes));if(!r.redirect)return {...r,final_url:url};if(/login|signin|register|authenticate/i.test(r.redirect))return {status:r.status,error:'Login/registration redirect'};url=r.redirect;}return {error:'Redirect limit'};}
function links(html,base) {const out=[];for(const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/gi)){try{out.push(new URL(m[1].replace(/&amp;/g,'&').replace(/&#0*38;/g,'&'),base).href);}catch{}}return [...new Set(out)];}
function expand(item,html,base) {
 const found=links(html,base);let selected=0;
 for(const url of found){let decoded;try{decoded=decodeURIComponent(url);}catch{decoded=url;}const isPDF=/\.pdf(?:$|[?#])/i.test(url);const name=decoded.split('/').pop();
  if(/bid[ _-]*tab/i.test(name)){if(item.family==='missouri_oa_fmdc')log({url,family:item.family},{reason:'Bid Tab excluded from this corpus'});continue;}
  if(/login|signin|register/i.test(url)){targets.add(url);continue;}
  if(item.kind==='oa'){if(isPDF&&(round3?/Plans|Specs|Bid Documents|Bid Docs|Addendum|Add/i:/Plans|Specs|Bid Documents|Bid Docs|Addendum|Add|Plans-Specs|IFB/i).test(name)){add(url,item.family);selected++;}else if(isPDF)targets.add(url);}
  else if(item.family==='missouri_um_pdc'){
   if(/(?:pdc-projects|operations-webapps)\.missouri\.edu\/pdc\/adsite\/project\.php\?/i.test(url)){add(url,item.family,'pdc-project',item.depth+1);selected++;}
   else if(isPDF&&/\/projects\/[^/]+\/(?:plans\/|sealed\/|ad\.pdf|pb\.pdf)/i.test(url)){add(url,item.family);selected++;}
   else if(/(?:pdc-projects|operations-webapps)\.missouri\.edu\/pdc\/adsite\/(?:$|[^/?]+\.(?:html?|php)(?:[?#]|$)|projects\/[^/]+\/(?:plans|sealed)\/?$)/i.test(url)&&item.depth<3){add(url,item.family,'pdc',item.depth+1);selected++;}
   else if(isPDF)targets.add(url);
  }else if(isPDF){add(url,item.family);selected++;}else if(/bids|bid-documents|project|plans|specifications/i.test(url))targets.add(url);
 }
 if(item.family==='missouri_um_pdc'){
  const ids=new Set([...html.matchAll(/\bCP\d{6}\b/gi)].map(m=>m[0].toLowerCase()));
  for(const cp of ids){
   if(item.kind!=='pdc-project'){const projectBase=/\/(?:pdc\/adsite)\//i.test(base)?base:'https://pdc-projects.missouri.edu/pdc/adsite/';add(new URL('project.php?project='+cp.toUpperCase()+'&format=html',projectBase).href,item.family,'pdc-project',1);}
  }
  if(round3){const plain=html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();state.pdc_observations.push({url:base,description:'Public HTML title '+(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'(none)')+'; '+selected+' relevant exposed links; '+ids.size+' CP project identifiers.',exposed_links:found.filter(u=>/missouri|bids|plans|sealed|project|\.pdf/i.test(u)),text_excerpt:plain.slice(0,3000)});}
 }

 return selected;
}
if(resume)for(const item of state.remaining||[])add(item.url,item.family,item.kind,item.depth);
if(round3){
 for(const e of sources.enumerators.filter(e=>e.family==='missouri_um_pdc'))for(const url of e.urls)add(url,e.family,e.kind);
 for(const e of sources.enumerators.filter(e=>e.family==='missouri_oa_fmdc'))for(const url of e.urls)add(url,e.family,e.kind);
 const priorRound=JSON.parse(fs.readFileSync(path.join(root,'round2.json')));
 for(const item of priorRound.remaining||[]){const name=decodeURIComponent(new URL(item.url).pathname).split('/').pop();if(item.family==='missouri_oa_fmdc'&&!/bid[ _-]*tab|\bIFB\b/i.test(name)&&/Plans|Specs|Bid Documents|Bid Docs|Addendum|Add/i.test(name))add(item.url,item.family,item.kind,item.depth);}
}else{
for(const f of sources.families){for(const url of [...(f.seeds||[]),...(f.low_priority_seeds||[])])add(url,f.family);for(const url of f.index_pages||[])add(url,f.family,f.family==='missouri_oa_fmdc'?'oa':'index');for(const url of f.standards_not_bid_sets||[])targets.add(url);}
for(const e of sources.enumerators)for(const url of e.urls)add(url,e.family,e.kind);
}
try {
 for(let i=0;i<queue.length;i++){
  currentIndex=i;const item=queue[i];if(state.received_bytes>=ROUND_CAP){for(const left of queue.slice(i)){state.remaining.push(left);log(left,{reason:'Round cap reached; not fetched'});}break;}
  state.pending_request=item;state.remaining=queue.slice(i);writeJSON('round.json',state);
  const r=await get(item);state.pending_request=null;
  if(round3&&item.family==='missouri_um_pdc'&&r.error)state.pdc_observations.push({url:item.url,description:'Not fetched: '+r.error+'. No page-content claim is possible.'});
  if(r.error){log(item,{http_status:r.status||null,bytes:r.bytes||0,reason:r.error});state.blockers.push(item.url+' — '+r.error);if(r.round_cap){state.stopped_at_round_cap=true;state.remaining=queue.slice(i);for(const left of queue.slice(i+1))log(left,{reason:'Round cap: not fetched after next file exceeded remaining budget'});break;}state.remaining=queue.slice(i+1);writeJSON('round.json',state);continue;}
  const magic=r.data.subarray(0,1024).includes(Buffer.from('%PDF-'));
  if(magic||/application\/pdf/i.test(r.type)){
   if(!magic){log(item,{http_status:r.status,bytes:r.bytes,reason:'PDF content type without PDF signature'});continue;}
   const sha256=crypto.createHash('sha256').update(r.data).digest('hex');if(known.has(sha256)){log(item,{sha256,http_status:r.status,bytes:r.bytes,reason:'SHA256 already in corpus or harvested'});continue;}
   const filename='downloads/'+sha256.slice(0,16)+'.pdf';fs.writeFileSync(path.join(root,filename),r.data);known.add(sha256);state.saved_bytes+=r.bytes;log(item,{sha256,http_status:r.status,bytes:r.bytes,pages:pages(path.join(root,filename)),outcome:'downloaded',filename,final_url:r.final_url});
  }else if(/text\/html/i.test(r.type)||/<html|<!doctype/i.test(r.data.subarray(0,2000).toString())){
   const html=r.data.toString('utf8');const gate=/<input[^>]+type=["']password|(?:must|please|need to)\s+(?:log\s*in|sign\s*in|register)/i.test(html);const n=expand(item,html,r.final_url);log(item,{http_status:r.status,bytes:r.bytes,outcome:n?'enumerated':'skipped',reason:gate&&!n?'Login/registration gate':n?'Public HTML; '+n+' document/project links queued':'HTML; no exposed relevant PDF links (may require JavaScript)'});if(!n)state.blockers.push(item.url+' — no exposed relevant PDF links');
  }else log(item,{http_status:r.status,bytes:r.bytes,reason:'Not PDF or public HTML: '+r.type});
  state.next_targets=[...targets].filter(url=>!queued.has(url));state.remaining=queue.slice(i+1);writeJSON('round.json',state);
 }
}catch(e){state.blockers.push('Fatal blocker: '+e.stack);console.error(e);process.exitCode=1;}
finally{state.finished_at=now();state.next_targets=[...targets].filter(url=>!queued.has(url));state.queued_urls=queue.length;writeJSON('round.json',state);}
