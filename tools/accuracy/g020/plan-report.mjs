#!/usr/bin/env node
// Run the unchanged S1 reader on the ranked real sets, retaining both production
// schedule input and the harvest's independent schedule-row marks. No gold labels.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openPdf, pageItems } from '../truth/pdf.mjs';
import { readA } from '../truth/reader_a.mjs';
import { readPlan } from '../../../weyland-shared/plan-read.js';
import { scheduleDoorMarks } from '../../corpus/harvest/qualification.mjs';
import { modelFromSubx, attachPlan } from '../../../weyland-sightx-worker/src/lib/schedule-model.js';

const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(out, '../../..');
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node tools/accuracy/g020/plan-report.mjs <harvest-download-dir>');
const candidateFile = path.join(repo, 'tools/corpus/harvest/sightx_candidates.json');
const candidates = JSON.parse(fs.readFileSync(candidateFile)).candidates.slice(0, 10);
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const doorPage = t => /\bDOOR\b/i.test(t) && /\bSCHEDULE\b/i.test(t) && /\b(HARDWARE|HDWR?|HW|H\/W|HDW\.?\s*SET|SET|GROUP)\b/i.test(t) && /\b(MARK|TAG|NO\.?|NUMBER|#)\b/i.test(t);
const results = [];
for (const c of candidates) {
  const file = path.resolve(dir, c.sha16 + '.pdf');
  const bytes = fs.readFileSync(file);
  if (createHash('sha256').update(bytes).digest('hex') !== c.sha256) throw new Error('Hash mismatch: ' + file);
  const pdf = await openPdf(bytes), pages = [], doors = [], readPages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pageItems(pdf, p); pages.push(page);
    if (page.items.length >= 15 && doorPage(page.items.map(i => i.str).join('\n'))) {
      const a = await readA(pdf, p, 'door_schedule');
      doors.push(...(a.doors || []).map(d => ({ page: p, ...d })));
      readPages.push({ page: p, rows: (a.doors || []).length, error: a.error || null });
    }
  }
  const text = execFileSync('pdftotext', ['-layout', file, '-'], { maxBuffer: 50 * 1024 * 1024 }).toString().split('\f');
  if (text.length - 1 !== pdf.numPages) throw new Error('Text page boundaries disagree with PDF: ' + c.sha16);
  const reference = c.door_schedule_page_indexes.flatMap(i => scheduleDoorMarks(text[i]).map(mark => ({ mark, page: i + 1 })));
  const referenceRows = c.door_schedule_page_indexes.map(i => ({page: i + 1, marks: scheduleDoorMarks(text[i]), lines: text[i].split('\n').filter(line => scheduleDoorMarks(line).length)}));
  const production = readPlan(pages, doors), diagnostic = readPlan(pages, reference);
  const truth = JSON.parse(fs.readFileSync(path.join(repo, 'tools/corpus/harvest/truth', c.sha16 + '.json')));
  if (truth.readers.a.doors !== doors.length) throw new Error('Production rows disagree with truth_run: ' + c.sha16);
  const oracle = truth.oracles.marks_on_plan;
  if (oracle.applicable && oracle.pass !== doors.length - production.marks_not_on_plan.length) throw new Error('Plan count disagrees with truth_run');
  const evidence = {
    sha16: c.sha16, sha256: c.sha256, rank: c.rank, source_url: c.url, page_count: pdf.numPages,
    candidate_plan_pages: c.architectural_plan_page_indexes.map(p => p + 1),
    candidate_schedule_pages: c.door_schedule_page_indexes.map(p => p + 1),
    production_schedule_pages: readPages, production_doors: doors, production_plan: production,
    diagnostic_note: 'Unchanged S1 reader supplied harvest schedule-row regex marks, not production doors or audited truth. Tag-shaped text can be room/grid/detail numbers. Unmatched tags are style candidates, not verified doors.',
    harvest_schedule_rows: referenceRows, harvest_schedule_marks: reference, harvest_marks_plan: diagnostic,
    truth: { tier: truth.tier, readers: truth.readers, agreement: truth.agreement, marks_on_plan: oracle },
  };
  save(c.sha16 + '.json', evidence);
  // This model is explicitly a diagnostic: marks have no audited sizes or hardware.
  const model = attachPlan(modelFromSubx({ session: { project_name: decodeURIComponent(c.url.split('/').pop()) + ' — harvest-mark diagnostic' }, doors: reference.map(d => ({mark: d.mark, page_number: d.page})), components: [] }), {found: !!diagnostic.tags.length, ...diagnostic});
  model.notes.unshift(evidence.diagnostic_note);
  save(c.sha16 + '.model.json', model);
  results.push({rank: c.rank, sha16:c.sha16, project: decodeURIComponent(c.url.split('/').pop()).replace(/\.pdf$/, ''), candidate_plan_pages: evidence.candidate_plan_pages, schedule_pages: evidence.candidate_schedule_pages, production: production.counts, diagnostic: diagnostic.counts, plan_sheets: diagnostic.plan_sheets, model_counts: model.layout.counts || null});
  console.log(c.rank, c.sha16, JSON.stringify({production: production.counts, diagnostic: diagnostic.counts}));
  if (pdf.destroy) await pdf.destroy();
  else if (pdf.loadingTask?.destroy) await pdf.loadingTask.destroy();
}
save('index.json', { generated_at: new Date().toISOString(), git_head: execFileSync('git', ['rev-parse','HEAD'], {cwd: repo}).toString().trim(), candidate_sha256: createHash('sha256').update(fs.readFileSync(candidateFile)).digest('hex'), page_convention: 'All report page numbers are one-based PDF ordinals; source candidate indexes are zero-based.', results });
