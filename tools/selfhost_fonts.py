#!/usr/bin/env python3
"""Self-host the two Google families weylandai.com pages load (Space Grotesk,
Outfit) so no page needs fonts.googleapis.com / fonts.gstatic.com at request
time. One build-time download (this script), then assets/fonts/*.woff2 plus
assets/fonts.css carry the @font-face rules; pages swap their Google <link>
tags for that stylesheet. Both families are SIL Open Font License. Latin
subset only (the site is English); weights match what the pages requested.
Idempotent; run from the repo root."""
import os, re, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)
# Every Google family any weylandai.com page or Worker page template used
# (homepage/sightx: Space Grotesk + Outfit; login pages: Barlow + Barlow
# Condensed; subscribe.css: DM Mono + Manrope + Newsreader). 2026-10-05.
CSS_URL = ('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Outfit:wght@300;400;500;600'
           '&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700'
           '&family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;700&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def main():
    css = get(CSS_URL).decode('utf-8')
    out = ['/* Self-hosted Space Grotesk, Outfit, Barlow, Barlow Condensed, DM Mono, Manrope, Newsreader (all SIL OFL), built by tools/selfhost_fonts.py. Latin subset. No page on weylandai.com loads fonts.googleapis.com. */']
    blocks = re.findall(r'(/\* ([a-z-]+) \*/\s*@font-face\s*\{(.*?)\})', css, re.S)
    # Google serves one variable-font file per family (every weight points at
    # the same URL), so keep one file and one @font-face with a weight range
    fams = {}
    for whole, subset, body in blocks:
        if subset != 'latin':
            continue
        fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        style = re.search(r'font-style:\s*(\w+)', body).group(1)
        weight = int(re.search(r'font-weight:\s*(\d+)', body).group(1))
        url = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", body).group(1)
        rng = re.search(r'unicode-range:\s*([^;]+);', body).group(1)
        key = (fam, style, url)
        f = fams.setdefault(key, {'fam': fam, 'style': style, 'url': url, 'min': weight, 'max': weight, 'rng': rng})
        f['min'] = min(f['min'], weight); f['max'] = max(f['max'], weight)
    n = 0
    for key, f in fams.items():
        fam = f['fam']; base = fam.lower().replace(' ', '-')
        suffix = ('variable' if f['min'] != f['max'] else str(f['min'])) + ('-italic' if f['style'] == 'italic' else '')
        fname = '%s-%s.woff2' % (base, suffix)
        dest = os.path.join(OUT, fname)
        if not os.path.exists(dest):
            open(dest, 'wb').write(get(f['url']))
        weight = ('%d %d' % (f['min'], f['max'])) if f['min'] != f['max'] else str(f['min'])
        out.append("@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;src:url(/assets/fonts/%s) format('woff2');unicode-range:%s}" % (fam, f['style'], weight, fname, f['rng']))
        n += 1
    open(os.path.join(ROOT, 'assets', 'fonts.css'), 'w').write('\n'.join(out) + '\n')
    print('%d faces written to assets/fonts, assets/fonts.css' % n)

if __name__ == '__main__':
    main()
