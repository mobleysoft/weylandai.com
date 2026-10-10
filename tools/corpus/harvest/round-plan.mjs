// g069: harvest round N. Pure argument parsing and queue selection for harvest.mjs, tested over a
// fake queue in round-plan.test.mjs. Round 3 keeps its own flag and its round2.json source; a later
// round N takes round N-1's work-left queue (round.json "remaining", preserved as round<N-1>.json).
export const ROUND3_CAP=1000000000, DEFAULT_CAP=3000000000;
// The round 3 Missouri OA name rule: plans, specs, bid documents and addenda; never a bid tab or an IFB.
export const OA_NAME=/Plans|Specs|Bid Documents|Bid Docs|Addendum|Add/i;
export function fileName(url){let p=new URL(url).pathname;try{p=decodeURIComponent(p);}catch{}return p.split('/').pop();}
export function oaWanted(item){const name=fileName(item.url);return item.family==='missouri_oa_fmdc'&&!/bid[ _-]*tab|\bIFB\b/i.test(name)&&OA_NAME.test(name);}
export function parseArgs(argv){
 const value=flag=>{const i=argv.indexOf(flag);if(i<0)return null;const v=argv[i+1];if(v==null||v.startsWith('--'))throw new Error(flag+' needs a value');return v;};
 const resume=argv.includes('--resume'),dryRun=argv.includes('--dry-run'),fromRemaining=argv.includes('--from-remaining');
 let round=null;const r=value('--round');
 if(r!=null){if(!/^\d+$/.test(r)||Number(r)<3)throw new Error('--round takes a whole number from 3 up (rounds 1 and 2 are the plain run and --resume)');round=Number(r);}
 if(argv.includes('--round3')){if(round!=null&&round!==3)throw new Error('--round3 and --round '+round+' disagree');round=3;}
 let capBytes=null;const c=value('--cap-bytes');
 if(c!=null){if(!/^\d+$/.test(c)||Number(c)<=0)throw new Error('--cap-bytes takes a positive whole number of bytes');capBytes=Number(c);}
 if(round!=null&&resume)throw new Error('Round '+round+' is a new capped round; do not resume round '+(round-1));
 if(round>3&&!fromRemaining)throw new Error('Round '+round+' needs --from-remaining (round '+(round-1)+'\'s work-left queue is its only source)');
 if(fromRemaining&&round==null)throw new Error('--from-remaining needs --round N');
 if(fromRemaining&&round===3)throw new Error('Round 3 already takes round 2\'s queue from round2.json; --from-remaining is for round 4 on');
 return {round,resume,dryRun,fromRemaining,capBytes:capBytes??(round!=null?ROUND3_CAP:DEFAULT_CAP)};
}
// The state file round N reads its queue from, and the refusals that keep a round's budget from being reset.
export function priorFile(round){return round===3?'round2.json':'round'+(round-1)+'.json';}
export function checkStart(opts,current,prior){
 if(opts.round==null)return;
 if(current?.round_number===opts.round)throw new Error('Round '+opts.round+' already started; do not reset its budget');
 if(opts.round>3){
  if(!prior)throw new Error('No round '+(opts.round-1)+' state to take the work-left queue from');
  if(prior.round_number!==opts.round-1)throw new Error('The prior state is round '+prior.round_number+', not round '+(opts.round-1));
  if(!prior.finished_at)throw new Error('Round '+(opts.round-1)+' has not finished; resume it instead');
 }
}
// Round N's queue: the prior round's work left, Missouri OA plans/specs/addenda only, nothing already downloaded.
export function remainingQueue(prior,visited=new Set()){
 const seen=new Set(),out=[];
 for(const item of prior?.remaining||[]){if(!oaWanted(item)||visited.has(item.url)||seen.has(item.url))continue;seen.add(item.url);out.push({url:item.url,family:item.family,kind:item.kind||'document',depth:item.depth||0});}
 return out;
}
export function dryRunLines(queue,opts,prior){
 const lines=queue.map((q,i)=>String(i+1).padStart(4)+' '+q.family+' '+fileName(q.url)+' '+q.url);
 lines.push('dry run: round '+opts.round+', '+queue.length+' files queued from round '+(prior?.round_number??'?')+'\'s '+(prior?.remaining?.length??0)+' work-left URLs; round cap '+opts.capBytes+' bytes, per-file cap 150000000 bytes; nothing fetched, nothing written');
 return lines;
}
