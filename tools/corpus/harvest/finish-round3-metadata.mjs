import fs from 'node:fs';
import path from 'node:path';
import {root,now,writeJSON} from './common.mjs';
const round=JSON.parse(fs.readFileSync(path.join(root,'round.json'))),audit=JSON.parse(fs.readFileSync(path.join(root,'oa-listing-round3.json')));
if(audit.reason.includes('separate plan room')){
 audit.reason=audit.reason.replace('the separate plan room','a bidder notification list');
 audit.description_corrected_at=now();round.oa_listing_audit=audit;
 fs.appendFileSync(path.join(root,'manifest.jsonl'),JSON.stringify({sha256:null,url:audit.url,host:new URL(audit.url).host,family:'missouri_oa_fmdc',retrieved_at:audit.description_corrected_at,bytes:0,pages:null,http_status:null,outcome:'enumerated',reason:'Local evidence correction, no request: the registration wording in the OA listing concerns its bidder notification list. '+audit.public_pdf_links+' direct relevant public PDF links were observed.'})+'\n');
 writeJSON('oa-listing-round3.json',audit);writeJSON('round.json',round);
}
console.log(JSON.stringify({received_bytes:round.received_bytes,saved_bytes:round.saved_bytes,remaining:round.remaining.length,first_remaining:round.remaining.slice(0,5)},null,2));
