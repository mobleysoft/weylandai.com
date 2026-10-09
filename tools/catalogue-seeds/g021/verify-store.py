"""Read back all five seed texts, model citations, FTS matches and offline queue state."""
import datetime
import hashlib
import json
import pathlib
import re
import sys
from store import query

evidence = pathlib.Path('tools/catalogue-seeds/g021-evidence')
books = pathlib.Path(sys.argv[1])
manifest = json.loads((evidence / 'seed-manifest.json').read_text())
result = {'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'books': [], 'corpus': []}
normalize = lambda text: re.sub(r'[ \t]+', ' ', text)

for seed in manifest:
    catalogue = query('''SELECT catalogue_id, source_hash_sha256, page_count, storage_path,
        text_extracted, index_built,
        (SELECT COUNT(*) FROM catalogue_pages p WHERE p.catalogue_id=c.catalogue_id) AS indexed_pages
        FROM catalogues c WHERE catalogue_id=?''', [seed['catalogue_id']])[0]
    assert catalogue['source_hash_sha256'] == seed['sha256']
    assert catalogue['page_count'] == catalogue['indexed_pages'] == seed['pages']
    assert catalogue['storage_path'] == seed['r2_key']
    assert catalogue['text_extracted'] == catalogue['index_built'] == 1
    pages = query('SELECT page_num, text_content FROM catalogue_pages WHERE catalogue_id=? ORDER BY page_num', [seed['catalogue_id']])
    expected = [normalize(page) for page in (books / (seed['key'] + '.txt')).read_text().split('\f')[:-1]]
    actual = [normalize(page['text_content']) for page in pages]
    assert [page['page_num'] for page in pages] == list(range(1, seed['pages'] + 1))
    assert actual == expected, seed['key'] + ': indexed text differs from source'
    book = {'key': seed['key'], 'catalogue': catalogue, 'fts_checks': [], 'documents': [],
            'page_text_check': {'pages_compared': len(actual), 'normalization': 'horizontal whitespace only',
                                'all_pages_match': True,
                                'normalized_text_sha256': hashlib.sha256('\f'.join(actual).encode()).hexdigest()}}
    for product in seed['products']:
        matches = query('''SELECT p.page_num FROM catalogue_pages_fts
            JOIN catalogue_pages p ON p.rowid=catalogue_pages_fts.rowid
            WHERE catalogue_pages_fts MATCH ? AND p.catalogue_id=? AND p.page_num=?''',
            ['"' + product['model'] + '"', seed['catalogue_id'], product['page']])
        assert matches == [{'page_num': product['page']}], product['model']
        book['fts_checks'].append({'model': product['model'], 'expected_page': product['page'], 'matches': matches})
        document = query('''SELECT id, product_id, document_url, r2_object_key, r2_bucket,
            file_hash_sha256, file_size_bytes, page_count, verified, active
            FROM product_documents WHERE id=?''', [product['document_id']])[0]
        assert document['product_id'] == product['product_id']
        assert document['document_url'] == seed['url']
        assert document['r2_object_key'] == seed['r2_key']
        assert document['file_hash_sha256'] == seed['sha256']
        assert document['file_size_bytes'] == seed['bytes']
        assert document['page_count'] == seed['pages']
        assert document['verified'] == document['active'] == 1
        book['documents'].append(document)
    result['books'].append(book)
    corpus = query('SELECT url, attempts, last_error, fetched_at, r2_key, size FROM catalog_corpus_wanted WHERE url=?', [seed['url']])[0]
    if corpus['fetched_at']:
        assert corpus['r2_key'] == seed['r2_key'] and corpus['size'] == seed['bytes']
    result['corpus'].append(corpus)

result['storage_rows_marked_fetched'] = sum(bool(row['fetched_at']) for row in result['corpus'])
result['stored_pdf_hash_verification'] = 'not performed: direct R2 access returned 403 and the download route requires approved authentication; source hashes and stored-byte counts are verified separately'
(evidence / 'store-after.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'verified_at': result['verified_at'], 'books': len(result['books']),
                  'all_pages_compared': sum(book['page_text_check']['pages_compared'] for book in result['books']),
                  'storage_rows_marked_fetched': result['storage_rows_marked_fetched']}))
