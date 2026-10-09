import sys,pathlib,json,sqlite3,datetime,urllib.request,os,hashlib
root=pathlib.Path('tools/catalogue-seeds');e=root/'g021-evidence';seed=json.load(open(e/'seed-manifest.json'))
url='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/d1/database/5729f77e-d7e3-4577-ab43-3c064fa90ca5/query'
receipts=json.load(open(e/'d1-apply.json')) if (e/'d1-apply.json').exists() else []
for s in seed:
 assert hashlib.sha256(pathlib.Path(s['seed_file']).read_bytes()).hexdigest()==s['seed_sha256'],s['seed_file']
 statements=[];buf=''
 for line in pathlib.Path(s['seed_file']).read_text().splitlines(True):
  buf+=line
  if sqlite3.complete_statement(buf):statements.append(buf);buf=''
 assert not buf.strip(),'Incomplete SQL in '+s['seed_file']
 batches=[];batch=''
 for stmt in statements:
  assert len(stmt.encode())<=75000,'SQL statement exceeds batch limit'
  if batch and len((batch+stmt).encode())>75000:batches.append(batch);batch=''
  batch+=stmt
 if batch:batches.append(batch)
 for i,b in enumerate(batches):
  req=urllib.request.Request(url,data=json.dumps({'sql':b}).encode(),headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_D1_TOKEN'],'Content-Type':'application/json'})
  try:
   d=json.load(urllib.request.urlopen(req,timeout=60));assert d['success'] and all(r['success'] for r in d['result']),d
  except urllib.error.HTTPError as ex:
   print(ex.code,ex.read().decode()[:1500]);raise
  receipt={'file':s['seed_file'],'batch':i+1,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'success':d['success'],'statements':len(d['result']),'changes':sum(x.get('meta',{}).get('changes',0) for x in d['result']),'rows_written':sum(x.get('meta',{}).get('rows_written',0) for x in d['result'])}
  receipts.append(receipt);print(receipt,flush=True)
  (e/'d1-apply.json').write_text(json.dumps(receipts,indent=2)+'\n')
