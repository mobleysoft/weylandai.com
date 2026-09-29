#!/usr/bin/env node
/**
 * bid-tabulation-crawler.mjs — sibling to door-schedule-crawler.mjs. Same
 * infrastructure (native fetch, zero third-party deps, real-URL-only
 * discipline, sha256-deduped manifest), different purpose: harvest real,
 * publicly-posted "bid tabulation" / bid-results PDFs from school-district
 * and public-agency procurement pages.
 *
 * Why this exists: door-schedule-crawler.mjs's seeds are pre-bid packages
 * (blank "BIDDER: ________" forms) or addenda — none of them contain real
 * bidder/awardee names (confirmed 2026-09-03, see tools/prospect-candidates
 * -2026-09-03.md). Bid *tabulation* documents are a different document
 * type: the sheet a district's purchasing office posts after bid opening,
 * listing every company that actually submitted a bid, their license
 * number, and their bid amount. That's real bidder-of-record data,
 * traceable to a public agency's own published PDF.
 *
 * Discovery method (manual, 2026-09-05): search engine queries for
 * "Bid Tabulation" + relevant CSI division keywords (door, hardware,
 * general construction) against known K-12/public-agency document CDNs
 * (Thrillshare/Finalsite, district-hosted WordPress/S3, state procurement
 * sites). Each seed below was fetched with a real GET during this session
 * and confirmed to return an actual PDF containing named bidders — this
 * is not a guessed-URL list. Several other candidate URLs found via the
 * same search (Winnacunnet HS door bid, SPPS 2022 door/hardware bid tab)
 * were tried and rejected: the former is a blank pre-bid form (no bidder
 * names, same dead end as the door-schedule corpus), the latter 404s (dead
 * link on the district's own current site). Rejected candidates are not
 * included as seeds — no guessing at replacement URLs.
 *
 * This script downloads the PDFs into corpus/bid-tabulations/ with the
 * same sha256-manifest pattern as door-schedule-crawler.mjs. It does NOT
 * attempt automated table parsing of bid-tab layouts (they vary wildly
 * per district/architect and several are scanned/OCR'd with garbled
 * layout — e.g. Berkeley USD's). Turning garbled per-district table
 * layouts into structured data via generic regex risks silently
 * mis-attributing a name or number, which would violate the
 * no-fabrication rule for this task. The prospect list built from these
 * documents (../prospect-list.json) was compiled by hand-reading each
 * downloaded PDF's extracted text, not by scripted parsing.
 *
 * Usage:
 *   node tools/bid-tabulation-crawler.mjs                 # crawl all seeds
 *   node tools/bid-tabulation-crawler.mjs --seed buncombe-09-24-roof
 *   node tools/bid-tabulation-crawler.mjs --verify-only    # HEAD/GET-check only, no download
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, 'corpus', 'bid-tabulations');
const MANIFEST_PATH = path.join(CORPUS_DIR, 'manifest.json');

const USER_AGENT = 'weylandai-corpus-crawler/1.0 (+construction-doc-training-corpus; contact via weylandai.com)';

// Each seed is a single, already-verified real bid-tabulation PDF URL
// (type: 'direct' only — no index-crawling here; every seed was fetched
// with a real GET this session, see status/date comment per entry).
const SEEDS = [
  {
    id: 'buncombe-09-24-roof',
    label: 'Buncombe County Schools (NC) — RFP #09.24 Charles C. Bell ES Partial Roof Replacement, Bid Tabulation',
    status: 'direct-verified', // confirmed 200, application/pdf, 2026-09-05
    url: 'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/3100/Bcs/66d7caf7-fb84-4e8d-983e-8a7509f77406/RFP_09.24-Bid_Tab.pdf',
  },
  {
    id: 'hasd-19016-library-renovation',
    label: 'Hazleton Area School District (PA) — Library/Classroom Renovation Projects Bid Package #2, Bid Tabulation (SGA Project 19.016)',
    status: 'direct-verified', // confirmed 200, application/pdf, 2026-09-05
    url: 'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/5321/Hasd/17c7ef28-a901-4c09-9ced-bd600f618c30/Library_Classroom_Renovation_Project_Bid__Tall(1).pdf',
  },
  {
    id: 'cumberland-dbhs-painting-2025',
    label: 'Cumberland County Schools (NC) — Exterior Painting Restoration, Douglas Byrd HS + two other schools, Bid Tabulation',
    status: 'direct-verified', // confirmed 200, application/pdf, 2026-09-05
    url: 'https://files-backend.assets.thrillshare.com/documents/asset/uploaded_file/4929/Ccs/edfd167d-05b3-46a2-87c9-113193be402e/Bid-Tab-Exterior-Painting-at-DBHS-2025.pdf',
  },
  {
    id: 'berkeley-832-1201-king-softball',
    label: 'Berkeley Unified School District (CA) — 832.1201 King Softball Field, Bid Tabulation Form',
    status: 'direct-verified', // confirmed 200, application/pdf (scanned), 2026-09-05
    url: 'https://www.berkeleyschools.net/wp-content/uploads/2012/06/8321201BidResults.pdf',
  },
];

// Candidates found during discovery but NOT usable as bidder-of-record
// data — kept here for honesty/traceability, not crawled.
const REJECTED_CANDIDATES = [
  {
    id: 'winnacunnet-door-bid-2021',
    label: 'Winnacunnet School District (NH) — Exterior Door Replacement RFB',
    url: 'https://campussuite-storage.s3.amazonaws.com/prod/1558718/e7fa12dc-6862-11e9-88e9-0a2901a6873e/2259718/fb04db8c-adca-11eb-8d74-0e6615f8a715/file/WHS%20DOOR%20BID%20-%202021.pdf',
    reason: 'fetched 200, but it is the blank pre-bid solicitation + blank bid form ("NAME OF CONTRACTOR: ____"), not a completed bid tabulation — no real bidder names present. Same dead end as the door-schedule-crawler seeds.',
  },
  {
    id: 'spps-a22-2443-doors-frames-hardware',
    label: 'Saint Paul Public Schools (MN) — A22-2443-JA 08A Doors Frames Hardware Supply, Bid Tabulation',
    url: 'https://www.spps.org/cms/lib/mn01910242/centricity/domain/11217/bid%20tabulation/2022/a22-2443-ja%2008a%20doors%20frames%20hardware%20supply%20-%20bid%20tabulation.pdf',
    reason: 'linked from spps.org\'s own live Bid Tabulations Archive page, but the URL 404s (real Finalsite "Page Not Found" response) — dead link on the district\'s current site, likely broken by a CMS migration. Not guessing at a replacement URL.',
  },
];

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

async function downloadDocument(seed, manifest) {
  const res = await fetchWithUA(seed.url);
  if (!res.ok) {
    console.error(`  ✗ ${seed.url} → HTTP ${res.status}`);
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('pdf') && !seed.url.toLowerCase().endsWith('.pdf')) {
    console.error(`  ✗ ${seed.url} → not a PDF (content-type: ${contentType})`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);

  const existing = manifest.documents.find((d) => d.sha256 === hash);
  if (existing) {
    console.log(`  = ${seed.url} → duplicate of ${existing.filename} (sha256 match), skipping`);
    return existing;
  }

  const filename = `${seed.id}--${hash.slice(0, 12)}.pdf`;
  await writeFile(path.join(CORPUS_DIR, filename), buf);

  const entry = {
    filename,
    seed_id: seed.id,
    sha256: hash,
    source_url: seed.url,
    source_label: seed.label,
    bytes: buf.length,
    fetched_at: new Date().toISOString(),
  };
  manifest.documents.push(entry);
  console.log(`  ✓ ${seed.url} → ${filename} (${(buf.length / 1024).toFixed(0)}KB)`);
  return entry;
}

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only');
  const seedFilter = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : null;

  await ensureCorpusDir();
  const activeSeeds = seedFilter ? SEEDS.filter((s) => s.id === seedFilter) : SEEDS;

  if (verifyOnly) {
    console.log('Verifying seeds (HEAD check, no download)...\n');
    for (const seed of activeSeeds) {
      const result = await verifySeed(seed);
      console.log(JSON.stringify(result));
    }
    return;
  }

  const manifest = await loadManifest();
  for (const seed of activeSeeds) {
    console.log(`\n— ${seed.label} [${seed.status}]`);
    await downloadDocument(seed, manifest);
  }
  await saveManifest(manifest);

  console.log(`\n${manifest.documents.length} document(s) in bid-tabulation corpus manifest.`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Corpus dir: ${CORPUS_DIR}`);
  console.log(`\n${REJECTED_CANDIDATES.length} candidate(s) evaluated and rejected (see REJECTED_CANDIDATES in this file for why): ${REJECTED_CANDIDATES.map((c) => c.id).join(', ')}`);
}

main().catch((err) => {
  console.error('Crawler failed:', err);
  process.exit(1);
});
