"""Replay public acquisitions against captured hashes; never writes to D1 or R2."""
import concurrent.futures
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.request

book_dir = pathlib.Path(sys.argv[1])
book_dir.mkdir(parents=True, exist_ok=True)
sources = json.loads(pathlib.Path('tools/catalogue-seeds/g021-evidence/public-sources.json').read_text())


def fetch(source):
    path = book_dir / (source['key'] + '.pdf')
    if path.exists():
        data = path.read_bytes()
    else:
        request = urllib.request.Request(source['url'], headers={
            'User-Agent': 'WeylandAI-catalogue-ingestion/1.0 (+https://weylandai.com)'})
        with urllib.request.urlopen(request, timeout=60) as response:
            assert response.status == 200
            data = response.read(100_000_001)
    assert data.startswith(b'%PDF'), source['key']
    assert len(data) == source['bytes'], source['key'] + ': source size changed'
    assert hashlib.sha256(data).hexdigest() == source['sha256'], source['key'] + ': source hash changed'
    if not path.exists():
        path.write_bytes(data)
    info = subprocess.check_output(['pdfinfo', str(path)], text=True)
    pages = int(next(line.split(':')[1] for line in info.splitlines() if line.startswith('Pages:')))
    assert pages == source['pages']
    subprocess.run(['pdftotext', '-layout', str(path), str(path.with_suffix('.txt'))], check=True)
    # Preserve the original acquisition timestamp so seed replay remains deterministic.
    path.with_suffix('.json').write_text(json.dumps(source, indent=2) + '\n')
    return {'key': source['key'], 'pages': pages, 'sha256': source['sha256']}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    for result in executor.map(fetch, sources):
        print(json.dumps(result), flush=True)
