import fs from 'node:fs';
import path from 'node:path';
import {root,now,writeJSON,records} from './common.mjs';
const target=path.join(root,'round3-baseline.json');
if(fs.existsSync(target))throw new Error('Round 3 baseline already exists');
const triage=JSON.parse(fs.readFileSync(path.join(root,'triage.json')));
writeJSON('round3-baseline.json',{created_at:now(),manifest_lines:records().length,counts:triage.reduce((a,r)=>(a[r.class]=(a[r.class]||0)+1,a),{}),sets:triage.map(r=>({sha256:r.sha256,class:r.class,filename:r.filename,pages:r.pages}))});
fs.copyFileSync(path.join(root,'round.json'),path.join(root,'round2.json'));
console.log('Preserved '+triage.length+' baseline SHA256 keys and round 2 queue');
