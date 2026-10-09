import os,json,urllib.request,datetime,pathlib,sys
OUT=pathlib.Path('tools/catalogue-seeds/g021-evidence')
url='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/d1/database/5729f77e-d7e3-4577-ab43-3c064fa90ca5/query'
def query(sql,params=()):
 req=urllib.request.Request(url,data=json.dumps({'sql':sql,'params':params}).encode(),headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_D1_TOKEN'],'Content-Type':'application/json'})
 d=json.load(urllib.request.urlopen(req,timeout=60));assert d['success'] and all(r['success'] for r in d['result']),d
 return d['result'][0]['results']
if __name__=='__main__':
 destination=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else OUT/'store-before.json'
 if destination.exists():raise SystemExit('Refusing to replace a captured baseline. Pass a new output path.')
 q={
 'manufacturers':'SELECT id,name,slug FROM manufacturers ORDER BY name',
 'aliases':'SELECT alias,manufacturer_id FROM manufacturer_aliases ORDER BY alias',
 'products':'SELECT id,manufacturer_id,product_series,product_family,base_model,spec_sheet_url FROM products ORDER BY manufacturer_id,base_model',
 'documents':'SELECT id,product_id,document_type,document_title,document_url,r2_object_key,file_hash_sha256,page_count,verified,active FROM product_documents ORDER BY id',
 'catalogues':'SELECT catalogue_id,manufacturer,title,source_filename,source_url,source_hash_sha256,storage_path,page_count,text_extracted,index_built FROM catalogues ORDER BY manufacturer,title',
 'corpus':'SELECT url,attempts,last_error,fetched_at,r2_key,size FROM catalog_corpus_wanted ORDER BY url'}
 d={'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'database_id':'5729f77e-d7e3-4577-ab43-3c064fa90ca5','queries':q}
 for k,s in q.items():
  d[k]=query(s);print(k,len(d[k]))
 destination.write_text(json.dumps(d,indent=2)+'\n')
