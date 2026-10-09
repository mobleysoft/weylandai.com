import json,subprocess,pathlib,concurrent.futures,hashlib,sys
rows=json.load(open('tools/corpus/harvest/triage.json'))
root=pathlib.Path(sys.argv[1]);text_dir=pathlib.Path(sys.argv[2]);text_dir.mkdir(parents=True,exist_ok=True)
def run(r):
 p=root/r['filename'];out=text_dir/(r['sha256'][:16]+'.txt')
 if not p.exists():return {'sha256':r['sha256'],'error':'missing PDF'}
 sha=hashlib.file_digest(open(p,'rb'),'sha256').hexdigest()
 if sha!=r['sha256']:return {'sha256':r['sha256'],'error':'hash mismatch'}
 x=subprocess.run(['pdftotext','-layout',str(p),str(out)],capture_output=True)
 txt=out.read_text(errors='replace') if out.exists() else ''
 record={'sha256':sha,'url':r['url'],'family':r['family'],'pages_expected':r['pages'],'pages_extracted':len(txt.split('\f'))-1,'text_bytes':len(txt.encode()),'error':x.stderr.decode()[:200] if x.returncode else None}
 if record['pages_extracted']!=r['pages']:
  pages=[]
  for n in range(1,r['pages']+1):
   one=subprocess.run(['pdftotext','-f',str(n),'-l',str(n),'-layout',str(p),'-'],capture_output=True,check=True)
   pages.append(one.stdout.decode(errors='replace').rstrip('\f'))
  out.with_suffix('.pages.json').write_text(json.dumps(pages))
  record['ordinal_recovery']={'method':'independent pdftotext -f N -l N','pages':len(pages),'nonempty_pages':sum(bool(t.strip()) for t in pages),'note':'Empty pages remain empty; no OCR or PDF repair.'}
 return record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex: result=list(ex.map(run,rows))
pathlib.Path('tools/catalogue-seeds/g021-evidence/extraction.json').write_text(json.dumps(result,indent=2)+'\n')
print('done',len(result),'errors',sum(bool(r['error']) for r in result),'page mismatches',sum(r.get('pages_expected')!=r.get('pages_extracted') for r in result))
