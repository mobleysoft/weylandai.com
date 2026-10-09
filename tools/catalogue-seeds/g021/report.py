import json,pathlib,collections,datetime,re,hashlib,sys
book_dir=pathlib.Path(sys.argv[1])
root=pathlib.Path('tools/catalogue-seeds');e=root/'g021-evidence'
store=json.load(open(e/'store-before.json'));mf=json.load(open(e/'manufacturers.json'));series=json.load(open(e/'series.json'));ev=[json.loads(l) for l in open(e/'demand-evidence.jsonl')];scan=json.load(open(e/'corpus-scan.json'));seed=json.load(open(e/'seed-manifest.json'))
after=json.load(open(e/'store-after.json'))
assert after['storage_rows_marked_fetched']==5,'Final report requires all five offline storage completions'
keys={'Rockwood':'rockwood','National Guard Products':'ngp','McKinney':'mckinney','Hager':'hager','Sargent':'sargent','Pemko':'pemko','BEST':'best','Zero':'zero','Trimco':'trimco','Corbin Russwin':'corbin-russwin','Norton':'norton','Stanley':'stanley','Rixson':'rixson','Reese':'reese','Yale':'yale','Adams Rite':'adams-rite','Glynn-Johnson':'glynn-johnson','ABH':'abh','Bommer':'bommer','Securitron':'securitron'}
titles={'rockwood':'Architectural Door Accessories product catalog','ngp':'Condensed Catalog (thresholds, seals, hinges)','mckinney':'Full Line Hinge Catalog','hager':'Catalog 29 (2024), complete technical catalog','sargent':'80 Series Exit Device Catalog 90641 (07/25)','pemko':'2025 Markar/Pemko full-line catalog','best':'9K Series cylindrical lever locks (2021)','zero':'Sealing Systems Catalog 90 (legacy edition)','trimco':'Full Line Catalog (2018)','corbin-russwin':'DC8000 Series Door Closers','norton':'7500 Series Institutional Door Closers','stanley':'BEST General Hinge Catalog (Stanley legacy FBB/CB families)','rixson':'Rixson Condensed Catalog (6/9 overhead stops; legacy edition)','reese':'2024 Weatherstrips & Thresholds','yale':'8800 Series Mortise Locks (candidate; no specific Yale series resolved)','adams-rite':'2023 Product Catalog, including MS1850S','glynn-johnson':'Overhead Door Holders/Stops 101401, including 90S','abh':'Master Catalog','bommer':'Builders Hardware Catalog 134 (legacy; availability not asserted)','securitron':'2025 Product Catalog'}
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
alias={'ngp':['nationalguardproducts','ngp'],'glynn-johnson':['glynnjohnson'],'adams-rite':['adamsrite','adamsritemanufacturing'],'corbin-russwin':['corbinrusswin'],'sargent':['sargent','sargentmanufacturing'],'hager':['hager','hagercompanies'],'zero':['zero','zerointernational']}
def info(n,k):
 ns=set(alias.get(k,[norm(n)])); mids=[x['id'] for x in store['manufacturers'] if norm(x['name']) in ns or norm(x['slug']) in ns]
 products=[x for x in store['products'] if x['manufacturer_id'] in mids];ids={x['id'] for x in products}
 cats=[x for x in store['catalogues'] if norm(x['manufacturer'] or '') in ns]
 docs=[x for x in store['documents'] if x['product_id'] in ids and x['active']]
 tech=[x for x in cats if x['page_count'] and not re.search(r'price|TEST',x['title'],re.I)]
 technical_docs=[x for x in docs if not re.search('price book',x['document_title'],re.I)]
 return {'manufacturer_ids':mids,'product_count':len(products),'catalogue_records':[{'id':x['catalogue_id'],'title':x['title'],'pages':x['page_count'],'storage_path':x['storage_path']} for x in cats],'active_document_rows':len(docs),'technical_catalogue_records':len(tech),'technical_document_rows':len(technical_docs),'status':'price-only' if docs or any(x['page_count'] for x in cats) else 'no technical book'}
ranked=[]
for m in mf:
 if m['manufacturer'] not in keys:continue
 n=m['manufacturer'];k=keys[n];source=json.load(open(book_dir/(k+'.json')));prior=info(n,k)
 assert prior['technical_catalogue_records']==0 and prior['technical_document_rows']==0,(n,prior)
 assert not any(c['source_hash_sha256']==source['sha256'] for c in store['catalogues'])
 models=[x for x in series if x['manufacturer']==n]
 examples=[x for x in ev if x['manufacturer']==n][:3]
 r={'rank':len(ranked)+1,**m,'book':titles[k],'key':k,'source':source,'baseline':prior,'series_counts':models,'example_evidence':examples,'seed_file':next((s['seed_file'] for s in seed if s['key']==k),None)}
 ranked.append(r)
(e/'prioritized-books.json').write_text(json.dumps(ranked,indent=2)+'\n')
(e/'public-sources.json').write_text(json.dumps([x['source'] for x in ranked],indent=2)+'\n')
# Entire observed manufacturer universe; absence of a technical catalogue is independent of PDF reachability.
coverage=[]
for m in mf:
 coverage.append({**m,'baseline':info(m['manufacturer'],keys.get(m['manufacturer'],m['manufacturer'].lower().replace(' ','-')))})
(e/'manufacturer-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
lines=['# Goal g021 — measured catalogue coverage, 2026-10-09','',
'**Five books seeded in live D1: 898 catalogue pages and 7 verified model/document links. The offline ingestion job recorded successful R2 storage for all five PDFs, totaling 139,629,559 bytes.**','',
'## Measurement and replayable inputs','',
'- Universe: **598 SHA-256-distinct harvested PDFs**, **49,517 declared pages**. All 598 local PDF hashes matched the tracked harvest. This counts harvested documents, not projects, openings, or installed quantities; repeated specifications in distinct addenda remain distinct harvested sets.',
'- Read all pages with `pdftotext -layout`, not just the earlier triage sample. 124 PDFs / 1,322 pages matched a hardware heading, section 08 71 00/10/11, or an existing reader hardware-page candidate. This includes reference/contents candidates; it is not a new adjudicated hardware-set count.',
'- **76 PDFs contain the 2,924 manufacturer evidence lines**, covering **36 observed manufacturers** in the explicit alias dictionary. Counts include named acceptable alternatives and manufacturer references. They are demand signals, not purchases or verified installed hardware.',
'- Manufacturer count = distinct harvested SHA-256 values with a matching manufacturer line on a candidate hardware page. Page and line counts are secondary evidence. Model/series count = distinct SHA-256 values with an explicit matching model on a single-manufacturer line; ambiguous multi-brand equivalence rows are excluded. Every retained line has a source URL, full SHA-256, 1-based PDF page and extracted line number.',
'- The malformed `_T2505-01 Addendum 2.pdf` emitted 11 page separators for 41 declared pages. Independent `-f N -l N` extraction recovered 41 ordinal slots, 9 nonempty. No OCR or PDF repair was performed; empty/scanned text and unresolved abbreviations remain blind spots. Regex model counts are conservative candidates, not an adjudicated hardware-item truth set.',
'- Ranking policy: first obtain one public technical book for brands with no technical book in the baseline; order by unique manufacturer sets, then evidence lines, then name. Select the broadest useful book, or a demanded series book. This deliberately does **not** assume one book covers every series. Series-specific gaps within already represented brands are listed separately below.',
'- Baseline from live `weyland_db`: **70 catalogue records, 43 manufacturers, 10,545 products, 7,832 document rows, 56 corpus URLs**. A price book or distributor price citation does not count as a technical specification book. Existing `cut_sheet` labels on whole price books were checked by title. Existing technical-book records are not a claim that their R2 objects are reachable.',
'', 'Evidence files: [raw manufacturer/model lines](g021-evidence/demand-evidence.jsonl), [598-file extraction ledger](g021-evidence/extraction.json), [full manufacturer counts](g021-evidence/manufacturers.json), [full model/series counts](g021-evidence/series.json), [live baseline + exact SQL queries](g021-evidence/store-before.json), [per-manufacturer coverage](g021-evidence/manufacturer-coverage.json).',
'', '## Top twenty missing technical books at the baseline','',
'All twenty URLs below returned HTTP 200 and PDF signatures; `pdfinfo` and `pdftotext` succeeded. [Source receipts](g021-evidence/public-sources.json) record the URL, final URL, UTC fetch time, byte count, page count and full content SHA-256. Distributor-hosted files are manufacturer-authored documents; public access required no login. Older editions are labeled, not represented as current.','',
'| Rank | Manufacturer | Sets / lines | Leading explicit model/series (sets) | Missing technical book / public PDF | Baseline |',
'|---:|---|---:|---|---|---|']
for r in ranked:
 ms=', '.join(x['model_or_series']+' ('+str(x['sets'])+')' for x in r['series_counts'][:4]) or 'No unambiguous series extracted'
 lines.append(f"| {r['rank']} | {r['manufacturer']} | {r['sets']} / {r['lines']} | {ms} | [{r['book']}]({r['source']['url']}) ({r['source']['pages']} pp.) | {r['baseline']['status']} |")
lines+=['','The 42/40/34 manufacturer counts are not book-specific coverage gains. For example, Sargent also needs its 351, 281 and 8200 books; NGP’s condensed book names 896 but does not close every NGP model gap. Yale’s manufacturer mentions did not resolve to a specific series; the 8800 link is an acquisition candidate, not proof of 8800 demand. Stanley/BEST lineage is retained under the name printed in the specification.','',
'## First five: applied seeds and retrieval evidence','',
'Each seed retains source URL, content hash, deterministic `catalog-corpus/<sha256(url)>.pdf` key, complete ordinal page text and explicit model citations. Page numbers below are PDF ordinals, not printed page labels. Manufacturer and alias rows are inserted only if missing. Existing product IDs are reused. FTS indexing is guarded by the catalogue completion flag so reruns do not duplicate index entries.','',
'| Rank / seed | Catalogue ID | Pages / bytes | Visually checked model → PDF page |', '|---|---|---:|---|']
for s in seed:
 lines.append(f"| [{s['rank']} {s['manufacturer']}]({pathlib.Path(s['seed_file']).name}) | `{s['catalogue_id']}` | {s['pages']} / {s['bytes']:,} | "+'; '.join(p['model']+' → '+str(p['page']) for p in s['products'])+' |')
lines+=['',
'- [Seed manifest](g021-evidence/seed-manifest.json): seed hashes, source content hashes, exact R2 keys and product/document IDs.',
'- [D1 application receipts](g021-evidence/d1-apply.json): successful statement batches, including a final repeat application. An initial oversized batch hit SQLite’s statement-length limit; subsequent seeds normalize horizontal whitespace and use smaller batches. Previously applied page text differs only in whitespace.',
'- [Live readback](g021-evidence/store-after.json): five catalogue IDs, all 898 page texts compared with the acquired PDFs, all seven document metadata rows and model/page FTS matches. The baseline lacked FTS maintenance triggers, so seeds explicitly index their own pages.',
'- [Local validation](g021-evidence/seed-validation.json): exact live table schema, apply twice, identical row counts, foreign-key check empty, integrity check `ok`.',
'- [Live idempotency](g021-evidence/live-idempotency.json): the final five SQL files were reapplied in 56 successful batches with **zero changes**.',
'- [Request-time check](g021-evidence/request-time-check.json): production `getFromCorpus()` and all seven seeded `/api/cut-sheets/download/:docId` cases tested with local R2 hit/miss substitutes while global external `fetch()` throws. Hits return PDF bytes; missing documents return 404 without fetching. This is a handler check, not a live authenticated HTTP download. No application request handler was changed.',
'', '## Offline PDF storage receipts','',
'Five public PDF URLs were inserted into `catalog_corpus_wanted` for the existing offline corpus job. All five now have `fetched_at`, the expected `r2_key`, matching source byte counts, `attempts = 1`, and `last_error = NULL`. The production job writes these completion fields only after `UPLOADS.put()` resolves. The source URLs are retained as provenance and offline ingestion inputs; serving uses the stored R2 key.',
'',
'The session could not independently download the stored R2 bytes: direct R2 access returned HTTP 403 and the public status request was blocked by Cloudflare 1010. Storage evidence is the completed offline job record and matching byte counts; SHA-256 checks are of the acquired public source PDFs, not a second R2 download. The existing job consumed the queue without an authenticated trigger, so the earlier token-file request is no longer needed for ingestion.',
''.join('\n| '+s['key']+' | '+next(c['fetched_at'] for c in after['corpus'] if c['url']==s['url'])+' | '+str(s['bytes'])+' |' for s in seed).join(['\n| Book | Job fetch time (UTC) | Stored bytes |\n|---|---|---:|','']),
'', '## Remaining acquisition work','',
'Unseeded top-twenty entries above remain missing. The rest of the detected brands with no technical book form this next queue (sets): '+', '.join(f"{c['manufacturer']} {c['sets']}" for c in coverage if c['manufacturer'] not in keys and c['baseline']['technical_catalogue_records']==0 and c['baseline']['technical_document_rows']==0)+'.',
'',
'Brands already partly represented still need series-specific work: LCN 1450 (5 sets), 1460 (1), 1201 (1) and automatic 4642 (2) against existing 4000/concealed/general books; Von Duprin 88 (2) against existing 22/33A-35A/98-99 books; Schlage AD-400 (1) and B500/B571/B572 (1 each) against existing L/key-system books plus ND/ALX sheets. These are acquisition/review candidates, not a claim that the existing broad books contain no mention of those models. Ives’ demanded 8400/SR64/WS406/5BB1 families already have its architectural hardware book in the baseline.',
'', '## Glynn-Johnson 90S evidence','',
'Glynn-Johnson appears in 18 harvested documents. Its existing 33-page price book and 109 price-book document links do not supply the missing technical holders/stops catalog. Explicit counts: 100S in 5 sets, 90S in 4, 450S in 2, 100F in 1. The public 101401 technical catalog was downloaded and hashed; acquisition remains priority 17 in this policy. It is not fetched during a customer request.','',
'| Harvest SHA prefix | PDF page | Public source | Evidence |','|---|---:|---|---|']
for x in ev:
 if x['manufacturer']=='Glynn-Johnson' and '90S' in x['models']:
  lines.append(f"| `{x['sha256'][:16]}` | {x['page']} | [Harvest PDF]({x['source_url']}) | {x['text'].replace('|','/')} |")
lines+=['','## Reproduce','',
'Run from the repository root. Outputs stay under `tools/catalogue-seeds`; raw PDFs and extracted working text stay outside Git. The extractor reads the original harvest directory without modifying it.','',
'```sh',
'python3 tools/catalogue-seeds/g021/extract.py /path/to/original/tools/corpus/harvest /tmp/g021/text',
'python3 tools/catalogue-seeds/g021-analyze.py /tmp/g021/text',
'python3 tools/catalogue-seeds/g021/fetch-sources.py /tmp/g021/books',
'python3 tools/catalogue-seeds/g021/build-seeds.py /tmp/g021/books',
'# Authorized D1 writes; requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_D1_TOKEN:',
'python3 tools/catalogue-seeds/g021/apply.py',
'python3 tools/catalogue-seeds/g021/verify-store.py /tmp/g021/books',
'node tools/catalogue-seeds/g021/check-request-time.mjs',
'python3 tools/catalogue-seeds/g021/report.py /tmp/g021/books',
'```','',
'The five SQL files also fit the existing `.github/workflows/d1-apply.yml` input format. No worker deployment, board update, Git commit or PDF republication was performed by this task.']
(root/'2026-10-09-g021-coverage.md').write_text('\n'.join(lines)+'\n')
print('top20',len(ranked),'missing baseline verified',all(x['baseline']['technical_catalogue_records']==0 for x in ranked))
print('ranks',[(x['rank'],x['manufacturer'],x['sets']) for x in ranked])
