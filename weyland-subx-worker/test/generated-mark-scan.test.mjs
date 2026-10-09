// Generated pixels go through the actual shipped OCR/model and shared row parser.
// Expected identifiers stay in the test and are never passed to recognition.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { ocrPage } from '../../tools/accuracy/truth/ocr.mjs';
import { readDoorScheduleFromLines } from '../assets/client-ocr-src/schedule-text-layer.mjs';
import { guestDetail } from '../assets/client-ocr-src/schedule-workspace.mjs';

test('generated ruled schedules preserve varied marks and expose uncertain identifiers for review', { timeout: 60000 }, async () => {
  const marks = ['A07', 'B12', 'B14', '037', '1J.1', '126.1.2', 'S-04', '205', 'AQ7', 'Q3'];
  const groups = ['Q3', '03', '06 CL', 'Q03', 'A12', 'AL2', '09', 'A07'];
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([792, 612]);
  const widths = [85, 160, 75, 75, 70, 105, 100];
  const headers = ['DOOR NO.', 'ROOM NAME', 'WIDTH', 'HEIGHT', 'TYPE', 'HW GROUP', 'FIRE RATING'];
  const xs = [40]; for (const width of widths) xs.push(xs[xs.length - 1] + width);
  const top = 510, pitch = 32;
  page.drawText('DOOR SCHEDULE', { x: 40, y: 550, size: 20, font });
  for (let row = 0; row <= marks.length + 1; row++) page.drawLine({ start: { x: xs[0], y: top - row * pitch }, end: { x: xs[xs.length - 1], y: top - row * pitch }, thickness: .7 });
  for (const x of xs) page.drawLine({ start: { x, y: top }, end: { x, y: top - (marks.length + 1) * pitch }, thickness: .7 });
  for (let row = 0; row <= marks.length; row++) {
    const cells = row === 0 ? headers : [marks[row - 1], 'OFFICE', '3\'-0"', '7\'-0"', 'A', groups[(row - 1) % groups.length], '60 MIN'];
    cells.forEach((text, col) => page.drawText(text, { x: xs[col] + 5, y: top - row * pitch - 21, size: row === 0 ? 10 : 13, font }));
  }
  const dir = mkdtempSync(join(tmpdir(), 'weyland-mark-scan-'));
  try {
    const path = join(dir, 'marks.pdf'); writeFileSync(path, await pdf.save());
    const ocr = await ocrPage(path, 1, { rotations: [0], dpi: 240 });
    const result = await readDoorScheduleFromLines(ocr.lines, ocr, {});
    assert.ok(result);
    assert.equal(result.doors.length, marks.length, 'all physical rows remain represented');
    const detail = guestDetail({ name: 'marks.pdf' }, 'Generated mark regression', 1, [{ page: 1, extraction: { doors: result.doors.map(d => ({ ...d, read_from: 'ocr_lines', confidence_source: 'ocr_words' })) } }]);
    for (const door of detail.doors) for (const [field, confidence] of Object.entries(door.field_confidence || {})) {
      if (confidence < .8 && ['mark', 'hardware_group'].includes(field)) assert.ok(door.unsure.includes(field), 'correct but uncertain identifiers still need review');
    }
    let correct = 0;
    result.doors.forEach((door, index) => {
      if (door.door_number === marks[index]) correct++;
      else {
        assert.ok(door.field_confidence.mark < .8, 'an incorrect identifier must retain its measured uncertainty: ' + JSON.stringify({ expected: marks[index], read: door.door_number, confidence: door.field_confidence.mark }));
        assert.ok(detail.doors[index].unsure.includes('mark'), 'the actual workspace must flag the uncertain identifier');
      }
    });
    assert.deepEqual(result.doors.map(d => d.door_number), marks);
    assert.deepEqual(result.doors.map(d => d.hardware_group), marks.map((_, index) => groups[index % groups.length]));
    assert.equal(correct, marks.length);
    console.log('Generated mark scan:', JSON.stringify({ exact: correct, total: marks.length, review: detail.doors.filter(d => d.unsure.includes('mark') || d.unsure.includes('hardware_group')).map(d => ({ mark: d.mark, group: d.hardware_group, confidence: d.field_confidence, unsure: d.unsure })) }));
    assert.equal(result.unresolved_rows.length, 0);
    assert.equal(ocr.partial, false);
    assert.ok(ocr.words.some(w => w.grid_row != null));
    assert.ok(result.doors.every(d => d.width_inches === 36 && d.height_inches === 84));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
