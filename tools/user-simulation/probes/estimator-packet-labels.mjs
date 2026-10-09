// Generate representative actual packet pages from Rockford with the shipped
// assembler. No matcher/network; this proves labels/layout, not cut sheets.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPageFromTextLayer } from '../../../weyland-subx-worker/src/lib/text-layer-read.js';
import { generateDoorSchedulePages, generateHardwareSetPage, mergePdfs } from '../../../weyland-subx-worker/src/lib/submittal-assembler.js';
import { createRequire } from 'node:module';
const PDFLib = createRequire(new URL('../../../weyland-subx-worker/package.json', import.meta.url))('pdf-lib');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = path.join(root, 'tools/user-simulation/reports/g018-packet-labels');
await mkdir(out, { recursive: true });
const pdf = await readFile(path.join(root, 'tools/corpus/door-schedules/f0e863d88ea688ff.pdf'));
const doors = (await readPageFromTextLayer(pdf, 29, 'door_schedule')).result.doors.map(d => ({ ...d, mark: d.door_number, width: d.size, door_material: d.material_code, notes: d.remarks, page_number: 29, field_confidence_json: JSON.stringify({ pair: d.pair, source: { page: 29, table_row: d.source_row } }) }));
const doorPages = await generateDoorSchedulePages(doors, { projectName: 'Rockford — g018 layout probe', filename: 'A2.2' });
const groups = (await readPageFromTextLayer(pdf, 23, 'hardware_schedule')).result.hardware_groups;
const g = groups.find(g => g.group_number.includes('51')) || groups[0];
const groupPages = await generateHardwareSetPage({ projectName: 'Rockford — g018 layout probe', set: { set_number: g.group_number, set_name: g.group_name || 'Utility', affirmed: 0 }, doors: doors.filter(d => d.hardware_group === g.group_number), components: g.components.map(c => ({ ...c, model: c.model_number || c.catalog_number })) }, {}, PDFLib);
await writeFile(path.join(out, 'packet-labels.pdf'), await mergePdfs([doorPages.bytes, groupPages], PDFLib));
console.log(JSON.stringify({ file: path.join(out, 'packet-labels.pdf'), doors: doors.length, group: g.group_number, scope: 'actual assembler, source-read hardware; no cut sheets or full packet' }));
