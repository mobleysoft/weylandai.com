import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { isNonHarvest, readKeySets } from './inputs.mjs';

const rawArgs = process.argv.slice(2);
const option = name => { const i = rawArgs.indexOf(name); return i < 0 ? null : rawArgs[i + 1]; };
// Sets whose loss of agreed rows is accepted for this run; the reason lives in plan/decisions.md, never here.
const ALLOW = new Set((option('--allow') || '').split(',').filter(Boolean));
const keySets = option('--key-sets') ? new Set(readKeySets(option('--key-sets'))) : null;
const nonHarvest = rawArgs.includes('--non-harvest');
const args = rawArgs.filter((a, i) => !['--allow', '--key-sets', '--non-harvest'].includes(a) && !['--allow', '--key-sets'].includes(rawArgs[i - 1]));
if (args.length !== 2) {
  console.error("Usage: compare_runs.mjs <dir1_or_ref:dir> <dir2> [--non-harvest | --key-sets <file>] [--allow <sha,...>]");
  process.exit(1);
}

const [source1, source2] = args;

function readSource(source) {
  const records = new Map();
  if (source.includes(':')) {
    const [ref, dir] = source.split(':');
    const lsTree = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', dir]).toString().trim().split('\n');
    for (const file of lsTree) {
      if (file.endsWith('.json')) {
        const content = execFileSync('git', ['show', `${ref}:${file}`]).toString();
        try {
          const data = JSON.parse(content);
          if (data.sha16) records.set(data.sha16, data);
        } catch (e) {}
      }
    }
  } else {
    const files = fs.readdirSync(source);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(source, file), 'utf8');
        try {
          const data = JSON.parse(content);
          if (data.sha16) records.set(data.sha16, data);
        } catch (e) {}
      }
    }
  }
  return records;
}

const records1 = readSource(source1);
const records2 = readSource(source2);

const TIER_RANKS = {
  "unsupported": 0,
  "untriaged": 1,
  "rejected": 2,
  "pending-truth": 3,
  "disputed": 4,
  "agreed": 5,
  "oracle-checked": 6,
  "oracle-corrected": 7
};

function tierRank(tier) {
  return TIER_RANKS[tier] ?? -1;
}

let failed = false;

console.log(`| Set | Rows A | Rows B | Agreed Before | Agreed After | Tier Before | Tier After |`);
console.log(`|---|---|---|---|---|---|---|`);

const allShas = new Set([...records1.keys(), ...records2.keys()]);

for (const sha of Array.from(allShas).sort()) {
  const r1 = records1.get(sha);
  const r2 = records2.get(sha);

  if (!r1 && !r2) continue;
  if (keySets && !keySets.has(sha)) continue;
  if (nonHarvest && !isNonHarvest(r1 || r2)) continue;
  // A fresh harvest-only run used to pass while silently omitting the repo
  // PDFs. Missing records are a coverage failure, never an allowed row loss.
  if (r1 && !r2) {
    console.log(`MISSING: ${sha} (${r1.file}) was not regenerated`);
    failed = true;
    continue;
  }

  const getMetrics = (r) => {
    if (!r) return { rowsA: '-', rowsB: '-', agreed: 0, tier: 'none' };
    return {
      rowsA: r.readers?.a?.doors ?? 0,
      rowsB: r.readers?.b?.doors ?? 0,
      agreed: r.agreement?.doors?.agreed ?? 0,
      tier: r.tier ?? 'none'
    };
  };

  const m1 = getMetrics(r1);
  const m2 = getMetrics(r2);

  let regressed = false;
  if (r1 && r2) {
    // Audited records are part of the measure too: stable door counts alone
    // cannot protect their known field values (or audited hardware items).
    if (r1.tier === 'audited') for (const c1 of r1.calibration || []) {
      const c2 = r2.calibration?.find(c => c.expected === c1.expected && c.kind === c1.kind);
      const losses = [];
      if (!c2) losses.push('missing calibration');
      else {
        for (const reader of ['reader_a', 'reader_b', 'agreed']) {
          for (const metric of ['rows_found', 'rows_fully_right', 'fields_right']) {
            if (!Number.isFinite(c2[reader]?.[metric]) || c2[reader][metric] < c1[reader][metric]) losses.push(`${reader}.${metric}`);
          }
        }
        if (c1.fields && (!Number.isFinite(c2.fields?.agreed?.right) || c2.fields.agreed.right < c1.fields.agreed.right)) losses.push('agreed fields right');
      }
      if (losses.length) {
        console.log(`CALIBRATION: ${sha} ${c1.expected}: ${losses.join(', ')}${ALLOW.has(sha) ? ' (allowed)' : ''}`);
        if (!ALLOW.has(sha)) regressed = true;
      }
    }
    // A set that loses agreed rows is a regression unless the caller names it in --allow with a reason
    // recorded elsewhere (plan/decisions.md). No set is exempt in the tool itself.
    if (m2.agreed < m1.agreed && !ALLOW.has(sha)) {
      regressed = true;
    }
    // A lower tier is a regression on the same terms: a set named in --allow is accepted (its reason is in
    // plan/decisions.md), as is the move from oracle-checked to agreed; every other drop fails the compare.
    if (tierRank(m2.tier) < tierRank(m1.tier) && !ALLOW.has(sha)) {
      if (!(m1.tier === "oracle-checked" && m2.tier === "agreed")) {
        regressed = true;
      }
    }
  }

  if (m1.rowsA !== m2.rowsA || m1.rowsB !== m2.rowsB || m1.agreed !== m2.agreed || m1.tier !== m2.tier) {
    console.log(`| ${sha} | ${m2.rowsA} | ${m2.rowsB} | ${m1.agreed} | ${m2.agreed} | ${m1.tier} | ${m2.tier} |${regressed ? ' 🚨 REGRESSION' : ''}`);
  }

  if (regressed) {
    failed = true;
  }
}

for (const sha of keySets || []) if (!records2.has(sha)) {
  console.log(`MISSING key set: ${sha}`);
  failed = true;
}

if (failed) {
  console.log('REGRESSION: missing coverage, audited calibration loss, or a set lost agreed rows or a tier; regenerate missing records. Name accepted drops with --allow <sha,...> and record why in plan/decisions.md.');
  process.exit(1);
}
console.log('no set lost agreed rows or a tier' + (ALLOW.size ? ' (allowed: ' + Array.from(ALLOW).join(', ') + ')' : ''));
