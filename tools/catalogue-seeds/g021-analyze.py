#!/usr/bin/env python3
"""Offline, reproducible demand counts. Inputs: hash-checked pdftotext -layout files.

Run from repository root: python3 tools/catalogue-seeds/g021-analyze.py /tmp/g021/text
Counts are document demand, including acceptable manufacturers, NOT installed quantities.
"""
import collections, json, pathlib, re, sys

OUT = pathlib.Path('tools/catalogue-seeds/g021-evidence')
TEXT = pathlib.Path(sys.argv[1])
# Long names may appear anywhere; short schedule abbreviations require a separate
# layout cell or an entire line. Common English words require hardware context.
NAMES = {
 'Hager': (r'Hager', ['HAG']), 'McKinney': (r'McKinney', ['MCK']),
 'Rockwood': (r'Rockwood', ['ROC']), 'Sargent': (r'Sargent', ['SAR','SGT']),
 'Schlage': (r'Schlage', ['SCH','SCE']), 'LCN': (r'LCN', []),
 'Ives': (r'Ives', ['IVE']), 'Von Duprin': (r'Von[ -]?Duprin', ['VON','VD','VON DUP']),
 'Glynn-Johnson': (r'Glynn[ -]?Johnson', ['GLY','GJ']),
 'National Guard Products': (r'National Guard(?: Products)?', ['NGP','NG']),
 'Pemko': (r'Pemko', ['PEM']), 'Norton': (r'Norton', ['NOR']),
 'Rixson': (r'Rixson', ['RIX']), 'Trimco': (r'Trimco', ['TRI']),
 'Corbin Russwin': (r'Corbin(?:[ -]+Russwin)?', ['COR','CR']),
 'Yale': (r'Yale', ['YAL']), 'Stanley': (r'Stanley', ['STA']),
 'BEST': (r'BEST(?: Access| Lock)|Best Access Systems', ['BES']),
 'Zero': (r'Zero International', ['ZER']),
 'Reese': (r'Reese', ['REE']), 'Dorma': (r'Dorma', ['DOR','DMA','DM']),
 'Bommer': (r'Bommer', ['BOM']), 'ABH': (r'ABH|Architectural Builders Hardware', []),
 'Detex': (r'Detex', ['DET']), 'Precision': (r'Precision Hardware', ['PRE']),
 'Securitron': (r'Securitron', ['SEC']), 'HES': (r'HES|Hanchett', []),
 'Falcon': (r'Falcon', ['FAL']), 'Select': (r'Select (?:Hinges|Products)', ['SEL']),
 'Hiawatha': (r'Hiawatha', ['HIA']), 'Adams Rite': (r'Adams[ -]?Rite', ['ADA']),
 'Deltana': (r'Deltana', []), 'Don-Jo': (r'Don[ -]?Jo', []),
 'BEA': (r'BEA', []), 'Camden': (r'Camden', ['CAM']),
 'DOR-O-MATIC': (r'Dor[ -]?O[ -]?Matic', []), 'Door Controls International': (r'Door Controls International', ['DCI']),
 'Dorbin': (r'Dorbin', []), 'NGI': (r'National Guard Industries', []),
 'Horton': (r'Horton', ['HOR']), 'Lawrence': (r'Lawrence Hardware', []),
 'Soss': (r'Soss', []), 'Markar': (r'Markar', ['MAR']),
 'Security Door Controls': (r'Security Door Controls', ['SDC']),
}
SERIES = {
 'Hager': r'\b(?:BB\s?\d{4}|ECBB\d{4}|1199|1279|780[-\w]*|[456]000)\b',
 'McKinney': r'\b(?:T[AB]?\d[AB]?\d{3}|T[AB]\s*\d{4}|T[AB] SERIES|T4A\d{4})\b',
 'Rockwood': r'\b(?:[A-Z]?[0-9]{3,4}[A-Z]?|[A-Z]{2}[0-9]{2,4})\b',
 'Sargent': r'\b(?:[0-9]{2}-)?(?:[1789][0-9]{3}[A-Z]*|10X?|80|PE80|EN|281|351)[A-Z0-9-]*\b',
 'Schlage': r'\b(?:L9[0-9]{3}|ND[0-9]{2}|ALX?[0-9]{2}|B[0-9]{3}|AD-[0-9]{3}|CO-[0-9]{3})[A-Z0-9-]*\b',
 'LCN': r'\b(?:[12459][0-9]{3})(?:XP)?\b',
 'Ives': r'\b(?:5BB[0-9]|5PB[0-9]|83[0-9]|84[0-9]|SR6[45]|[WF]S\d+|[A-Z]?8400)\b',
 'Von Duprin': r'\b(?:98|99|33A|35A|22|88)[A-Z0-9-]*\b|\bEPT-?10\b',
 'Glynn-Johnson': r'\b(?:90|100|450|[149][0-9]{2})[HSFE]{1,2}\b',
 'National Guard Products': r'\b(?:[0-9]{2,5})(?:[A-Z]{1,4})?\b',
 'Pemko': r'\b(?:[0-9]{2,5})(?:[A-Z]{1,4})?\b',
 'Norton': r'\b(?:[1678][0-9]{3}|9500|9800)\b',
 'Rixson': r'\b[0-9]{1,3}(?=\s+SERIES)\b',
 'Trimco': r'\b(?:[0-9]{3,5})(?:[A-Z]{1,3})?\b',
 'Corbin Russwin': r'\b(?:CL|ML|ED|DC)[ -]?[0-9]{4}[A-Z0-9]*\b',
 'Yale': r'\b(?:[3456789][0-9]{3})(?:LN|F)\b|\b[3456789][0-9]{3}(?=\s+SERIES)\b',
 'Stanley': r'\b(?:FBB[0-9]{3}|CB[0-9]{3}|D[0-9]{4}|F[0-9]{3,4})\b',
 'BEST': r'\b(?:[0-9]{1,2}[KH][0-9A-Z]*|[0-9]+[A-Z]{2}[0-9A-Z]*)\b',
 'Zero': r'\b[0-9]{2,4}[A-Z]{1,3}\b',
 'Securitron': r'\b(?:M[0-9]{2}|BPS-[0-9-]+|EPT|CEPT)[0-9-]*\b',
 'HES': r'\b[0-9]{4}[A-Z0-9]*\b',
 'Falcon': r'\b(?:[TWBD][0-9]{3}[A-Z]*|[0-9]{2}[VR])\b',
 'Select': r'\bSL[0-9]{2,4}\b',
 'Reese': r'\b[0-9]{2,4}[A-Z]*\b',
 'Precision': r'\b[0-9]{4}\b', 'ABH': r'\b[0-9]{4}[A-Z]*\b',
 'Bommer': r'\b(?:BB[0-9]{4}|FM[0-9]{3}HD|BKC)\b', 'Hiawatha': r'\b[0-9]{3,4}[A-Z]*\b',
 'Dorma': r'\b(?:[89][0-9]{3}|TS[0-9]+)\b',
 'Adams Rite': r'\b(?:MS)?[0-9]{4}[A-Z]*\b',
}
patterns = {n: re.compile(r'\b(?:'+p+r')\b', re.I) for n,(p,a) in NAMES.items()}
shorts = {n: re.compile(r'(?:^|\s{2,}|\()('+ '|'.join(re.escape(a) for a in aa)+r')(?:\s*$|\s{2,}|\))') for n,(p,aa) in NAMES.items() if aa}
rows = json.load(open('tools/corpus/harvest/triage.json'))
extract = {r['sha256']:r for r in json.load(open(OUT/'extraction.json'))}
evidence=[]; corpus=[]
for r in rows:
 sha=r['sha256']; pages=(TEXT/(sha[:16]+'.txt')).read_text(errors='replace').split('\f')[:-1]
 truth_path=pathlib.Path('tools/corpus/harvest/truth')/(sha[:16]+'.json')
 truth=json.load(open(truth_path)) if truth_path.exists() else {}
 known=set(truth.get('pages',{}).get('hardware_pages',[]))
 # The one malformed PDF uses per-page extraction; the repair script preserves ordinals.
 repair=TEXT/(sha[:16]+'.pages.json')
 if repair.exists(): pages=json.load(open(repair))
 matched=[]
 for pn,t in enumerate(pages,1):
  qualified=(pn in known or re.search(r'(?im)^\s*(?:SECTION\s+)?08[ .]?71[ .]?(?:00|10|11)|DOOR\s+HARDWARE|^\s*HARDWARE\s+(?:SET|GROUP)\s*[:#]?[\d.]',t))
  if not qualified:continue
  matched.append(pn)
  for ln,line in enumerate(t.splitlines(),1):
   line=re.sub(r' {3,}', '  ', line)
   names=[n for n,p in patterns.items() if p.search(line) or (n in shorts and shorts[n].search(line))]
   if 'Stanley' in names and re.search(r'Stanley Security|The Stanley Works',line,re.I):names.remove('Stanley')
   for word,context in [('BEST',r'\b(?:lock|9K|7KC|45H|manufacturer)\b'),('Zero',r'\b(?:seal|threshold|gasket|weather|manufacturer|\d{2,4}[A-Z]+)\b'),('Select',r'\b(?:hinge|SL\d+)\b'),('Precision',r'\b(?:exit|device|[0-9]{4})\b')]:
    if re.search(r'\b'+word+r'\b',line,re.I) and re.search(context,line,re.I) and word not in names:names.append(word)
   for n in names:
    # Model extraction is limited to single-manufacturer lines. Multi-brand equivalence
    # tables are retained as manufacturer evidence and never assign every model to each brand.
    models=[]
    if len(names)==1 and n in SERIES and not re.search(r'www\.|https?://|\b(?:phone|fax|tel|MO \d{5})\b',line,re.I):
     model_text=re.sub(r'^\s*\d+[.)]\s*','',line.upper())
     if n=='Adams Rite' and re.search(r'FOR ADAMS RITE',model_text):model_text=''
     models=re.findall(SERIES[n],model_text)
     models=[m for m in models if m not in {'605','606','611','612','613','619','625','626','628','629','630','689','690','652','653','654','668','315','400','500'}]
     if n in {'National Guard Products','Pemko','Trimco','Yale','Rockwood','Reese','Hiawatha'}:
      models=[m for m in models if re.search(r'\d{3}',m)]
    evidence.append({'sha256':sha,'source_url':r['url'],'page':pn,'line':ln,'manufacturer':n,'models':sorted(set(models)),'text':line.strip()})
 corpus.append({'sha256':sha,'source_url':r['url'],'pages':len(pages),'hardware_pages':matched,'extraction_error':extract[sha]['error']})
def summarize(es):
 return {'sets':len({e['sha256'] for e in es}),'pages':len({(e['sha256'],e['page']) for e in es}),'lines':len(es)}
mfr=[];series=[]
for name in NAMES:
 es=[e for e in evidence if e['manufacturer']==name]
 if not es:continue
 mfr.append({'manufacturer':name,**summarize(es)})
 for model in sorted({m for e in es for m in e['models']}):
  ss=[e for e in es if model in e['models']]
  series.append({'manufacturer':name,'model_or_series':model,**summarize(ss)})
mfr.sort(key=lambda x:(-x['sets'],-x['lines'],x['manufacturer']))
series.sort(key=lambda x:(x['manufacturer'],-x['sets'],-x['lines'],x['model_or_series']))
for name,data in [('manufacturers',mfr),('series',series),('corpus-scan',corpus)]:
 (OUT/(name+'.json')).write_text(json.dumps(data,indent=2)+'\n')
(OUT/'demand-evidence.jsonl').write_text(''.join(json.dumps(e)+'\n' for e in evidence))
print(json.dumps({'scanned':len(corpus),'hardware_sets':sum(bool(r['hardware_pages']) for r in corpus),'hardware_pages':sum(len(r['hardware_pages']) for r in corpus),'manufacturers':mfr},indent=2))
