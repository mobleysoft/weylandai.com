import {now,writeJSON} from './common.mjs';
const url='https://operations-webapps.missouri.edu/robots.txt';
const result={checked_at:now(),url,source:'Exposed MU bid-announcement link in the fetched UM System construction-bids page',user_agent:'WeylandAI-corpus/1.0 (+https://weylandai.com)',http_status:null,bytes:0,error:null,policy:null};
for(let attempt=1;attempt<=2;attempt++){
 if(attempt>1)await new Promise(r=>setTimeout(r,2000));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetch(url,{headers:{'User-Agent':result.user_agent},redirect:'manual',signal:controller.signal});result.http_status=response.status;
  if(response.status>=500||response.status===429){await response.body?.cancel();throw new Error('HTTP '+response.status);}
  if(!response.ok){await response.body?.cancel();result.error='HTTP '+response.status;result.policy=[404,410].includes(response.status)?'allow: robots absent':'deny: unavailable or redirected robots';break;}
  let body='';for await(const chunk of response.body){result.bytes+=chunk.length;if(result.bytes>2*1024*1024){controller.abort();throw new Error('Robots size cap');}body+=Buffer.from(chunk).toString('utf8');}
  result.body=body;result.policy='Robots retrieved; rules must be parsed before any page request';break;
 }catch(e){result.error=e.message+(e.cause?.code?' ('+e.cause.code+')':'');result.policy='deny: unavailable robots';}
 finally{clearTimeout(timer);}
}
writeJSON('pdc-robots-round3.json',result);console.log(JSON.stringify(result,null,2));
