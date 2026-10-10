import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rawArgs = process.argv.slice(2);
const allowIdx = rawArgs.indexOf('--allow');
// Sets whose loss of agreed rows is accepted for this run; the reason lives in plan/decisions.md, never here.
const ALLOW = new Set(allowIdx >= 0 ? (rawArgs[allowIdx + 1] || '').split(',').filter(Boolean) : []);
const args = allowIdx >= 0 ? rawArgs.filter((a, i) => i !== allowIdx && i !== allowIdx + 1) : rawArgs;
if (args.length !== 2) {
  console.error("Usage: compare_runs.mjs <dir1_or_ref:dir> <dir2> [--allow <sha,...>]");
  process.exit(1);
}

const [source1, source2] = args;

function readSource(source) {
  const records = new Map();
  if (source.includes(':')) {
    const [ref, dir] = source.split(':');
    const lsTree = execSync(`git ls-tree -r --name-only ${ref} ${dir}`).toString().trim().split('\n');
    for (const file of lsTree) {
      if (file.endsWith('.json')) {
        const content = execSync(`git show ${ref}:${file}`).toString();
        try {
          const data = JSON.parse(content);
          records.set(data.sha16, data);
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
          records.set(data.sha16, data);
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

if (failed) {
  console.log('REGRESSION: at least one set lost agreed rows or a tier; name accepted drops with --allow <sha,...> and record why in plan/decisions.md.');
  process.exit(1);
}
console.log('no set lost agreed rows or a tier' + (ALLOW.size ? ' (allowed: ' + Array.from(ALLOW).join(', ') + ')' : ''));
