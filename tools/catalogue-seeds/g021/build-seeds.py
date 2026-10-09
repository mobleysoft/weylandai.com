import json,pathlib,hashlib,sqlite3,datetime,re,sys
book_dir=pathlib.Path(sys.argv[1]);root=pathlib.Path('tools/catalogue-seeds');e=root/'g021-evidence';store=json.load(open(e/'store-before.json'))
configs=[
 ('rockwood','Rockwood','mfr-rockwood','Architectural Door Accessories','https://www.rockwoodmfg.com',['ROC','ROCKWOOD'], [('403','403','Wall Stops',101)]),
 ('ngp','National Guard Products','mfr-ngp','Condensed Catalog','https://www.ngp.com',['NGP','NG','NATIONAL GUARD'], [('896','896','Thresholds',4)]),
 ('mckinney','McKinney','mfr-mckinney','Full Line Hinge Catalog','https://www.mckinneyhinge.com',['MCK','MK','MCKINNEY'], [('TA2314','TA','Full Mortise Hinges',37),('TA2714','TA','Full Mortise Hinges',37)]),
 ('hager','Hager','mfr-hager','Catalog 29 (2024)','https://www.hagerco.com',['HAG','HAGER'], [('BB1191','BB','Full Mortise Hinges',29),('BB1279','BB','Full Mortise Hinges',29)]),
 ('sargent','Sargent','mfr-sargent','80 Series Exit Device Catalog 90641 (07/25)','https://www.sargentlock.com',['SAR','SGT','SARGENT'], [('8800','80','Exit Devices',10)])]
def q(x):return 'NULL' if x is None else str(x) if isinstance(x,int) else "'"+str(x).replace("'","''")+"'"
def ins(table,values):return 'INSERT OR IGNORE INTO '+table+' ('+', '.join(values)+') VALUES ('+', '.join(map(q,values.values()))+');\n'
receipts=[]
for rank,(key,name,mid,title,website,aliases,models) in enumerate(configs,1):
 d=json.load(open(book_dir/(key+'.json')));cid=d['sha256'][:16];d.update(rank=rank,manufacturer=name,title=name+' '+title,catalogue_id=cid,manufacturer_id=mid)
 pages=(book_dir/(key+'.txt')).read_text().split('\f')[:-1];pages=[re.sub(r'[ \t]+', ' ', t) for t in pages];assert len(pages)==d['pages']
 sql='-- Goal g021: public manufacturer technical book, verified 2026-10-09.\n-- Source: '+d['url']+'\n-- Content SHA256: '+d['sha256']+'\n-- Full book text uses 1-based PDF ordinals; the original PDF is ingested offline by catalog-corpus.\n-- INSERT OR IGNORE preserves existing records; reruns add no duplicates.\n'
 sql+=ins('manufacturers',dict(id=mid,name=name,slug=key,trade='doors',website=website,verified=1,notes='g021 public technical catalogue seed'))
 for alias in aliases:sql+=ins('manufacturer_aliases',dict(alias=alias,manufacturer_id=mid,source='g021_public_catalogue'))
 sql+=ins('catalogues',dict(catalogue_id=cid,source_filename='g021-'+key+'-'+cid+'.pdf',source_hash_sha256=d['sha256'],file_size_bytes=d['bytes'],page_count=d['pages'],manufacturer=key,title=d['title'],ingested_at=d['retrieved_at'],ingested_by='g021-catalogue-seed',storage_path=d['r2_key'],text_extracted=1,index_built=0,source_url=d['url']))
 for pn,text in enumerate(pages,1):
  sql+=ins('catalogue_pages',dict(catalogue_id=cid,page_num=pn,text_content=text,char_count=len(text),has_extractable_text=int(bool(text.strip())),search_text=text.lower()))
 d['products']=[]
 for model,series,family,page in models:
  assert model in pages[page-1]
  existing=[p for p in store['products'] if p['manufacturer_id']==mid and p['base_model'].upper()==model]
  pid=existing[0]['id'] if existing else 'prod-'+key+'-'+model.lower()
  sql+=ins('products',dict(id=pid,manufacturer_id=mid,trade='doors',product_series=series,product_family=family,base_model=model,display_name=name+' '+model,description=family+'; manufacturer technical catalogue',available=1,spec_sheet_url=d['url'],catalog_number=model,search_text=(name+' '+model+' '+series+' '+family).lower()))
  docid='doc-g021-'+key+'-'+model.lower()
  sql+=ins('product_documents',dict(id=docid,product_id=pid,document_type='cut_sheet',document_title=d['title']+' (PDF p.'+str(page)+')',document_url=d['url'],r2_object_key=d['r2_key'],r2_bucket='subx-uploads',mime_type='application/pdf',page_count=d['pages'],file_size_bytes=d['bytes'],file_hash_sha256=d['sha256'],verified=1,active=1,notes='g021: model visually verified on PDF ordinal '+str(page)+'. Full book; fetch is offline through catalog-corpus, never request-time.'))
  d['products'].append(dict(product_id=pid,document_id=docid,model=model,page=page,existing_product=bool(existing)))
 sql+="INSERT INTO catalogue_pages_fts (rowid, text_content) SELECT p.rowid, p.text_content FROM catalogue_pages p JOIN catalogues c ON c.catalogue_id = p.catalogue_id WHERE c.catalogue_id = "+q(cid)+" AND c.index_built = 0 AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = c.catalogue_id) = c.page_count;\n"
 sql+="UPDATE catalogues SET index_built = 1 WHERE index_built = 0 AND catalogue_id = "+q(cid)+" AND (SELECT COUNT(*) FROM catalogue_pages WHERE catalogue_id = "+q(cid)+") = page_count;\n"
 sql+=ins('catalog_corpus_wanted',dict(url=d['url'],reason='g021-priority-'+str(rank),requested_at=d['retrieved_at']))
 f=root/('2026-10-09-g021-'+str(rank)+'-'+key+'.sql');f.write_text(sql);d['seed_file']=str(f);d['seed_sha256']=hashlib.sha256(sql.encode()).hexdigest();receipts.append(d)
 print(f,len(sql.encode()),len(pages),'pages',d['products'])
(e/'seed-manifest.json').write_text(json.dumps(receipts,indent=2)+'\n')
# Validate the exact live table DDL, with referential integrity and apply-twice checks.
con=sqlite3.connect(':memory:');con.execute('PRAGMA foreign_keys=ON')
for t in json.load(open(e/'seed-table-schema.json'))['result'][0]['results']:con.execute(t['sql'])
con.execute("CREATE VIRTUAL TABLE catalogue_pages_fts USING fts5(text_content, content='catalogue_pages', content_rowid='rowid')")
for f in [root/pathlib.Path(d['seed_file']).name for d in receipts]:con.executescript(f.read_text())
counts=lambda:{t:con.execute('SELECT COUNT(*) FROM '+t).fetchone()[0] for t in ['manufacturers','manufacturer_aliases','catalogues','catalogue_pages','products','product_documents','catalog_corpus_wanted']}
a=counts()
for f in [root/pathlib.Path(d['seed_file']).name for d in receipts]:con.executescript(f.read_text())
b=counts();assert a==b;assert not con.execute('PRAGMA foreign_key_check').fetchall()
r={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'schema':'live D1 sqlite_master','apply_once':a,'apply_twice':b,'idempotent':True,'foreign_key_check':[],'integrity_check':con.execute('PRAGMA integrity_check').fetchone()[0]}
(e/'seed-validation.json').write_text(json.dumps(r,indent=2)+'\n');print(r)
