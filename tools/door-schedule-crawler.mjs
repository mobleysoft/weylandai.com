#!/usr/bin/env node
/**
 * door-schedule-crawler.mjs — harvests real, publicly-posted door/hardware
 * schedule PDFs from school-district and public-agency bid postings, for use
 * as a training/extraction-testing corpus (jitagi-detect-schedules.js,
 * ocr-worker's /detect-schedules). Zero third-party dependencies — native
 * fetch + regex link extraction only, consistent with this project's
 * no-third-party-dependency preference (same reason ocr-worker bundles its
 * own WASM instead of pulling a hosted OCR API).
 *
 * This is NOT the live HuntX opportunity feed (that's TXDOT/CA-OPSC open
 * data in weyland.worker.js, which is tabular bid-item pricing data with no
 * document links — verified 2026-09-02, a dead end for this purpose).
 * This is a separate, offline corpus-builder: real bid *packages* (PDFs)
 * that actually contain door schedules, pulled from public agency bid
 * postings where district-mandated open-bidding transparency means the
 * PDFs sit at stable, no-login URLs during the bid window.
 *
 * Usage:
 *   node tools/door-schedule-crawler.mjs                 # crawl all seeds
 *   node tools/door-schedule-crawler.mjs --seed berryessa # crawl one seed
 *   node tools/door-schedule-crawler.mjs --verify-only    # HEAD-check seeds/known docs, no download
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, 'corpus', 'door-schedules');
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json');

const USER_AGENT = 'weylandai-corpus-crawler/1.0 (+construction-doc-training-corpus; contact via weylandai.com)';

// Each seed is a public bid-postings *index* page to crawl for linked PDFs,
// or (when status is "direct") a single already-verified document URL.
// status reflects verification state as of 2026-09-02, not an assumption —
// "direct-verified" means fetched with a real HEAD/GET this session;
// "index-unverified" means the index URL itself has not been fetch-checked
// yet (it was found via search results, not confirmed live).
const SEEDS = [
  {
    id: 'berryessa',
    label: 'Berryessa Union School District — Bid B-09-2023-24 Interior Door Replacement (3 elementary schools)',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 5.7MB, 2026-09-02
    url: 'https://www.berryessa.k12.ca.us/documents/MEASURE%20U%20BOND%20PROJECTS%202023-24/BID%20B-09-2023-24%20INTERIOR%20DOOR%20REPLACE%203%20SCHOOLS/PROJECT-MANUAL-DRAWINGS-BID-B-09-2023-24-INTERIOR-DOOR-REPLACEMENT-THREE-ELEMENTARY-SCHOOLS.pdf',
  },
  {
    id: 'rockford-24-59-add1',
    label: 'Rockford Board of Education — Bid 24-59 Addendum No. 1 (updates Door Schedule 119.2, adds exterior door 126.1.1)',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 2026-09-02
    url: 'https://core-docs.s3.us-east-1.amazonaws.com/documents/asset/uploaded_file/4629/rps/4532913/24-59_Add._No._1.pdf',
  },
  {
    id: 'rockford-24-46-add1',
    label: 'Rockford Board of Education — Bid 24-46 Addendum No. 1',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 2026-09-02
    url: 'https://core-docs.s3.us-east-1.amazonaws.com/documents/asset/uploaded_file/4629/rps/4532798/24-46_Add._No._1.pdf',
  },
  {
    id: 'rockford-26-27-add1',
    label: 'Rockford Board of Education — Bid 26-27 Addendum One (complete)',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 6.8MB, 2026-09-02
    url: 'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/4629/Rps/bfc49a08-a8c7-4373-8d6d-ca10a1218fa5/26-27-Addendum-One-COMPLETE.pdf',
  },
  {
    id: 'chula-vista',
    label: 'Chula Vista Elementary School District — bid package',
    type: 'index',
    status: 'gated-not-crawlable', // verified 2026-09-02: district's own bids page routes all solicitations through PlanetBids (third-party portal, requires registration); no direct public PDF located. Contact on file: Malia.Hall@cvesd.org.
    url: null,
  },
  {
    id: 'christina-chr23024-brenconst',
    label: 'Christina School District (DE) — Bid CHR23024 Brennen School Renovations specs',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 3.4MB, 2026-09-02
    url: 'https://bidcondocs.delaware.gov/CHR/CHR23024-BRENCONST-specs.pdf',
  },
  {
    id: 'christina-chr23018-chsgvest',
    label: 'Christina School District (DE) — Bid CHR23018 Christiana HS G-Building Secure Vestibule (entry door + hardware replacement)',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 5.9MB, 2026-09-02
    url: 'https://bidcondocs.delaware.gov/CHR/CHR23018-CHSGVEST-specs.pdf',
  },
  {
    id: 'christina-chr19038at',
    label: 'Christina School District (DE) — Bid CHR_19038At specs pt1',
    type: 'direct',
    status: 'direct-verified', // confirmed 200, application/pdf, 8.1MB, 2026-09-02
    url: 'https://bidcondocs.delaware.gov/CHR/CHR_19038At_specs_pt1.pdf',
  },
];

const KEYWORD_PATTERN = /door|hardware[\s-]?schedule|frame[\s-]?schedule|entry[\s-]?schedule/i;
const PDF_LINK_PATTERN = /href\s*=\s*["']([^"']+\.pdf)["']/gi;

async function ensureCorpusDir() {
  await mkdir(CORPUS_DIR, { recursive: true });
}

async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { updated_at: null, documents: [] };
  }
}

async function saveManifest(manifest) {
  manifest.updated_at = new Date().toISOString();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function fetchWithUA(url, opts = {}) {
  return fetch(url, { ...opts, headers: { 'User-Agent': USER_AGENT, ...(opts.headers || {}) } });
}

async function verifySeed(seed) {
  if (seed.type === 'direct') {
    if (!seed.url) return { ...seed, checked: false, reason: 'no URL set' };
    const res = await fetchWithUA(seed.url, { method: 'HEAD' });
    return {
      id: seed.id,
      label: seed.label,
      checked: true,
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentLength: res.headers.get('content-length'),
    };
  }
  if (seed.type === 'index') {
    if (!seed.url) return { id: seed.id, label: seed.label, checked: false, reason: 'index URL not yet located — needs manual research before this seed can crawl' };
    const res = await fetchWithUA(seed.url, { method: 'GET' });
    return { id: seed.id, label: seed.label, checked: true, ok: res.ok, status: res.status };
  }
}

async function downloadDocument(url, sourceLabel, manifest) {
  const res = await fetchWithUA(url);
  if (!res.ok) {
    console.error(`  ✗ ${url} → HTTP ${res.status}`);
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
    console.error(`  ✗ ${url} → not a PDF (content-type: ${contentType})`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);

  const existing = manifest.documents.find((d) => d.sha256 === hash);
  if (existing) {
    console.log(`  = ${url} → duplicate of ${existing.filename} (sha256 match), skipping`);
    return existing;
  }

  const filename = `${hash.slice(0, 16)}.pdf`;
  await writeFile(path.join(CORPUS_DIR, filename), buf);

  const entry = {
    filename,
    sha256: hash,
    source_url: url,
    source_label: sourceLabel,
    bytes: buf.length,
    fetched_at: new Date().toISOString(),
  };
  manifest.documents.push(entry);
  console.log(`  ✓ ${url} → ${filename} (${(buf.length / 1024 / 1024).toFixed(1)}MB)`);
  return entry;
}

function extractPdfLinks(html, baseUrl) {
  const links = new Set();
  let m;
  while ((m = PDF_LINK_PATTERN.exec(html)) !== null) {
    const href = m[1];
    if (!KEYWORD_PATTERN.test(href)) continue; // filter by URL text; full HTML anchor-text filtering would need real parsing, not attempted here
    try {
      links.add(new URL(href, baseUrl).toString());
    } catch {
      // malformed relative URL, skip
    }
  }
  return [...links];
}

async function crawlSeed(seed, manifest) {
  console.log(`\n— ${seed.label} [${seed.status}]`);

  if (seed.type === 'direct') {
    if (!seed.url) {
      console.log('  (no URL set, skipping)');
      return;
    }
    await downloadDocument(seed.url, seed.label, manifest);
    return;
  }

  if (seed.type === 'index') {
    if (!seed.url) {
      console.log('  (index URL not yet located — this seed needs research before it can crawl; not guessing a URL)');
      return;
    }
    const res = await fetchWithUA(seed.url);
    if (!res.ok) {
      console.log(`  ✗ index fetch failed: HTTP ${res.status}`);
      return;
    }
    const html = await res.text();
    const links = extractPdfLinks(html, seed.url);
    console.log(`  found ${links.length} keyword-matching PDF link(s)`);
    for (const link of links) {
      await downloadDocument(link, seed.label, manifest);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  const seedFilter = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : null;

  await ensureCorpusDir();
  const activeSeeds = seedFilter ? SEEDS.filter((s) => s.id === seedFilter) : SEEDS;

  if (verifyOnly) {
    console.log('Verifying seeds (HEAD/GET check, no download)...\n');
    for (const seed of activeSeeds) {
      const result = await verifySeed(seed);
      console.log(JSON.stringify(result));
    }
    return;
  }

  const manifest = await loadManifest();
  for (const seed of activeSeeds) {
    await crawlSeed(seed, manifest);
  }
  await saveManifest(manifest);

  console.log(`\n${manifest.documents.length} document(s) in corpus manifest.`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Corpus dir: ${CORPUS_DIR}`);

  const unverifiedSeeds = SEEDS.filter((s) => s.status === 'index-unverified' && !s.url);
  if (unverifiedSeeds.length) {
    console.log(`\n${unverifiedSeeds.length} seed(s) still need a real index URL located before they can crawl: ${unverifiedSeeds.map((s) => s.id).join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Crawler failed:', err);
  process.exit(1);
});
