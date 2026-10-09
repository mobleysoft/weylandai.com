// Read-only replay of the Mac artifacts; no browser or production requests.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DOORS, parseCsv, groupKey, csvEvidence, doorEvidence, packetEvidence, packetTextEvidence } from '../lib/estimator-assertions.mjs';
import { getDocument, Util } from '../../../weyland-subx-worker/src/vendor/pdfjs-text.mjs';
const root = new URL('../../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const guest = 'tools/user-simulation/reports-mac/upload-without-account-to-first-read-2026-10-09T18-02-15-512Z/';
const packetDir = 'tools/user-simulation/reports-mac/schedule-plus-spec-to-packet-with-hardware-2026-10-09T18-02-32-395Z/';
const estimator = 'tools/user-simulation/reports-mac/estimator-schedule-to-packet-2026-10-09T18-07-21-013Z/';
const traffic = JSON.parse(read(guest + 'desktop-traffic.json'));
const { rows } = parseCsv(read(guest + 'desktop-doors.csv'));
const detail = JSON.parse(read(packetDir + 'schedule-plus-spec-detail.json'));
const savedTraffic = JSON.parse(read(packetDir + 'traffic.json'));
const savedByProject = new Map();
for (const response of savedTraffic.responses) {
  if (/\/doors$/.test(response.path) && response.data?.session && !response.data.session.is_demo) savedByProject.set(response.data.session.project_name, response.data);
}
const savedReads = [...savedByProject].map(([project, d]) => ({ project, doors: d.doors.length,
  citations: doorEvidence(d.doors.map(r => ({ mark: r.mark, group: r.hardware_group, source: 'p.' + r.source.page + ' row ' + r.source.table_row })), project.includes('sheet-only') ? 1 : 29),
  hardware_schedule_needed: d.hardware_schedule_needed,
}));
const packet = JSON.parse(read(packetDir + 'packet-response.json'));
const text = read(packetDir + 'packet.txt');
const diff = DOORS.doors.map(d => {
  const csv = rows.find(r => r.Mark === d.mark), saved = detail.doors.find(r => r.mark === d.mark);
  return { mark: d.mark, auditRow: d.row, csvRow: csv?.['Source row'], savedRow: saved?.source?.table_row,
    group: groupKey(csv?.['Hardware group']) === groupKey(d.hardware_group), savedGroup: groupKey(saved?.hardware_group) === groupKey(d.hardware_group) };
});
const path = 'weyland-subx-worker/assets/client-ocr-src/schedule-text-layer.mjs';
const served = path.replace('client-ocr-src/', 'client-ocr/') + '.bin';
const sha = b => createHash('sha256').update(b).digest('hex');
const revisions = ['b5c9a57', 'HEAD'].map(rev => {
  const source = execFileSync('git', ['show', rev + ':' + path]);
  const bin = execFileSync('git', ['show', rev + ':' + served]);
  return { rev, same: source.equals(bin), source: sha(source), bin: sha(bin),
    binHasPricing: bin.includes('alternate_pricing:'), binHasSpec: bin.includes('d.hardware_spec_sections = sections') };
});
const captures = [guest, estimator].flatMap(dir => ['desktop', 'phone'].map(mode => {
  const csv = read(dir + mode + '-doors.csv'), parsed = parseCsv(csv).rows;
  return { file: dir + mode + '-doors.csv', citations: doorEvidence(parsed.map(r => ({ mark: r.Mark, group: r['Hardware group'], source: 'p.' + r['Source page'] + ' row ' + r['Source row'] })), 1), csv: csvEvidence(csv) };
}));
const dataUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const doc = await getDocument({ data: new Uint8Array(readFileSync(new URL('tools/user-simulation/roles/rockford-A2.2-p29.pdf', root))), disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
const readerReplays = [];
try {
  for (const [rev, servedBytes] of [['b5c9a57', false], ['b5c9a57', true], ['HEAD', true]]) {
    const workspacePath = 'weyland-subx-worker/assets/' + (servedBytes ? 'client-ocr/schedule-workspace.mjs.bin' : 'client-ocr-src/schedule-workspace.mjs');
    const workspaceUrl = dataUrl(execFileSync('git', ['show', rev + ':' + workspacePath]));
    const code = execFileSync('git', ['show', rev + ':' + (servedBytes ? served : path)], { encoding: 'utf8' })
      .replace(/(["'])\.\/schedule-workspace\.mjs(?:\?[^"']*)?\1/g, JSON.stringify(workspaceUrl));
    const reader = await import(dataUrl(code)), workspace = await import(workspaceUrl);
    const layer = await reader.pageTextLines({ Util }, await doc.getPage(1));
    const extraction = await reader.readDoorScheduleFromLines(layer.lines, layer);
    const result = workspace.guestDetail({ name: 'rockford-A2.2-p29.pdf' }, 'Replay', 1, [{ page: 1, extraction }]);
    readerReplays.push({ rev, servedBytes, doors: result.doors.length,
      hardware_schedule_needed: result.hardware_schedule_needed, csv: csvEvidence(workspace.doorListCsv(result.doors)) });
  }
} finally { await (doc.destroy?.() ?? doc.loadingTask?.destroy()); }
const corrected = { ...packet, cut_sheets: packet.sections.filter(s => s.type === 'cut_sheet').length };
const company = text.match(/PREPARED BY:\s+([^\r\n]+)/)[1].trim();
console.log(JSON.stringify({ revisions, readerReplays, captures, savedReads, diff,
  guestTraffic: traffic.responses.map(r => ({ path: r.path, status: r.status, session: r.data?.session, doors: r.data?.doors?.length, sets: r.data?.hardware_sets?.length, need: r.data?.hardware_schedule_needed })),
  guestRequests: traffic.requests, manifest: packetEvidence(packet),
  savedSpec: detail.doors[0]?.hardware_spec_sections,
  savedAlternates: Object.fromEntries(['Yes', 'No', null].map(v => [v, detail.doors.filter(d => d.alternate_pricing === v).length])),
  countOnlyCorrection: { note: 'Counterfactual replay of the captured response with only cut_sheets corrected; this is not a fresh production run.',
    manifest: packetEvidence(corrected), pdfText: packetTextEvidence(text, corrected, company) },
}, null, 2));
