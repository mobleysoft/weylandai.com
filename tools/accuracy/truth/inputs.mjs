// Shared record selection for regeneration and comparison. Historical harvest
// records store only a basename when --dir pointed outside the repository.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

export function isNonHarvest(record) {
  const file = String(record.file || '').replaceAll('\\', '/');
  return !/(^|\/)tools\/corpus\/harvest\/downloads\//.test(file) &&
    !(record.source === 'harvest' && !file.startsWith('tools/'));
}

export function readKeySets(file) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const sets = Array.isArray(doc) ? doc : doc.sets;
  if (!Array.isArray(sets) || !sets.length) throw new Error(`Empty or invalid key-set list: ${file}`);
  const shas = sets.map(s => typeof s === 'string' ? s : s.sha16);
  if (shas.some(s => !/^[a-f0-9]{16}$/.test(s)) || new Set(shas).size !== shas.length) {
    throw new Error(`Key sets must contain unique SHA16 values: ${file}`);
  }
  return shas;
}

export function recordedInputs({ repo, harvestDir, shas = null, nonHarvest = false, occPdf = null }) {
  const dir = join(repo, 'tools/corpus/harvest/truth');
  const records = readdirSync(dir).filter(f => /^[a-f0-9]{16}\.json$/.test(f))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const selected = records.filter(r => (!nonHarvest || isNonHarvest(r)) && (!shas || shas.includes(r.sha16)));
  const unknown = (shas || []).filter(sha => !selected.some(r => r.sha16 === sha));
  if (unknown.length) throw new Error(`No truth record in the selected scope for: ${unknown.join(', ')}`);
  if (!selected.length) throw new Error('No truth records selected');
  return selected.flatMap(record => {
    let file;
    if (!isNonHarvest(record)) file = join(harvestDir || join(repo, 'tools/corpus/harvest/downloads'), basename(record.file));
    else if (occPdf && /occ/i.test(record.file) && !record.file.startsWith('tools/')) file = resolve(occPdf);
    else if (!record.file.startsWith('tools/')) {
      // A PDF outside the repository (the OCC sample) has no path in a clone. Without its environment variable the
      // record stands as committed and is named here, so a run neither crashes nor drops it silently.
      console.log('skipped', record.sha16, record.file, '(outside the repository; set OCC_PDF to regenerate it)');
      return [];
    }
    else file = resolve(repo, record.file);
    if (!existsSync(file)) throw new Error(`Missing PDF for ${record.sha16}: ${file}${/occ/i.test(record.file) ? ' (set OCC_PDF)' : ''}`);
    return [{ file, record }];
  });
}
