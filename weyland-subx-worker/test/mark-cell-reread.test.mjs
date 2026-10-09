import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rereadMarkCell, recognitionBudget } from '../assets/client-ocr-src/schedule-grid-extraction-client.mjs';

const cell = { width: 32, height: 16, data: new Uint8ClampedArray(32 * 16 * 4).fill(255) };
function engineFor(readings) {
  let calls = 0;
  const images = [], variables = [];
  return {
    clearImage() {},
    loadImage(image) { images.push(image); },
    setVariable(name, value) { variables.push([name, value]); },
    getTextBoxes() {
      const next = readings[calls++] || ['', 0];
      return next[0] ? [{ text: next[0], confidence: next[1], rect: { left: 0, right: 20, top: 0, bottom: 12 } }] : [];
    },
    state() { return { calls, images, variables }; },
  };
}

test('uncertain identifiers are recovered only from agreeing pixel rereads, including letters and punctuation', () => {
  for (const mark of ['A07', 'B12', '037', '1J.1', '126.1.2', 'S-04']) {
    const engine = engineFor([[mark, .96], [mark, .93], [mark, .95], [mark, .94], [mark, .92]]);
    const budget = recognitionBudget();
    const result = rereadMarkCell(engine, cell, budget, 'Tir', .33);
    assert.equal(result.text, mark);
    assert.equal(result.confidence, .95);
    assert.equal(engine.state().calls, 15);
    assert.equal(budget.status().cells, 15);
    assert.ok(engine.state().variables.every(([name, value]) => name !== 'tessedit_char_whitelist' || value === ''), 'alphabetic identifiers must not use a numeric whitelist');
    assert.ok(engine.state().images.every(img => Number.isInteger(img.width) && Number.isInteger(img.height) && img.width > 0 && img.height > 0 && img.data.length === img.width * img.height * 4));
  }
});

test('a conflicting first identifier is replaced by a consistent actual reread', () => {
  const engine = engineFor([['', 0], ['', 0], ['B12', .95], ['B12', .94], ['B12', .93]]);
  const result = rereadMarkCell(engine, cell, recognitionBudget(), 'B14', .77);
  assert.equal(result.text, 'B12');
  assert.equal(result.confidence, .94);
});

test('ties or a single successful reread remain unresolved', () => {
  for (const readings of [
    [['A07', .95], ['B12', .95], ['A07', .9], ['B12', .9], ['', 0]],
    [['A07', .95], ['', 0], ['', 0], ['', 0], ['', 0]],
  ]) {
    const result = rereadMarkCell(engineFor(readings), cell, recognitionBudget(), '???', .2);
    assert.equal(result.text, null);
    assert.equal(result.confidence, 0);
  }
});

test('mark rereads share the page work and abort budget', () => {
  const engine = engineFor([['A07', .96], ['A07', .95]]);
  const budget = recognitionBudget({ maxCells: 1 });
  const result = rereadMarkCell(engine, cell, budget);
  assert.equal(result.text, null);
  assert.equal(engine.state().calls, 1);
  assert.equal(budget.status().reason, 'cell_limit');
  const controller = new AbortController(); controller.abort();
  const aborted = engineFor([['A07', .96]]);
  assert.equal(rereadMarkCell(aborted, cell, recognitionBudget({ signal: controller.signal })).text, null);
  assert.equal(aborted.state().calls, 0);
});

test('many weak distorted readings cannot outweigh a stronger supported fit', () => {
  const readings = Array.from({ length: 12 }, () => ['AQ7', .72]);
  readings.push(['A07', .91], ['A07', .87], ['', 0]);
  const result = rereadMarkCell(engineFor(readings), cell, recognitionBudget(), '???', .2);
  assert.equal(result.text, 'A07');
  assert.equal(result.confidence, .87);
});

test('near ties abstain and agreement retains the uncertain original measurement', () => {
  const tied = rereadMarkCell(engineFor([['AQ7', .879], ['AQ7', .87], ['A07', .886], ['A07', .85]]), cell, recognitionBudget(), 'A07', .662);
  assert.equal(tied.text, null);
  const same = rereadMarkCell(engineFor([['A07', .98], ['A07', .97]]), cell, recognitionBudget(), 'A07', .662);
  assert.equal(same.text, 'A07');
  assert.equal(same.confidence, .662);
});

test('hardware identifiers keep letters, leading zeroes and compound group codes', () => {
  const accept = text => /^[A-Z0-9][A-Z0-9 .\-\/#]{0,15}$/.test(text);
  for (const group of ['Q3', '03', 'Q03', 'AL2', '06 CL']) {
    const result = rereadMarkCell(engineFor([[group, .94], [group, .92]]), cell, recognitionBudget(), '', 0, accept);
    assert.equal(result.text, group);
    assert.equal(result.confidence, .92);
  }
});

test('the font-sized refinement trims white margins while retaining grey glyph pixels', () => {
  const image = { width: 90, height: 70, data: new Uint8ClampedArray(90 * 70 * 4).fill(255) };
  for (let y = 24; y < 33; y++) for (let x = 30; x < 40; x++) {
    const i = (y * image.width + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 110;
  }
  const engine = engineFor([['A12', .92], ['A12', .9]]);
  rereadMarkCell(engine, image, recognitionBudget(), 'AI2', .45);
  const refined = engine.state().images.at(-1);
  assert.equal(refined.height, 36 + 16, 'one bounded 36-pixel text crop plus its border');
  assert.ok(refined.width < image.width, 'outer cell whitespace was trimmed');
  assert.ok(refined.data.some((value, index) => index % 4 < 3 && value === 110), 'the grey source glyph was retained');
  assert.ok(refined.data.slice(0, refined.width * 8 * 4).every(value => value === 255));
});

test('transformed-only agreement cannot overwrite an identifier supported by original and reduced grey pixels', () => {
  const readings = Array.from({ length: 15 }, () => ['AQ7', .88]);
  readings[11] = ['A07', .65];
  const result = rereadMarkCell(engineFor(readings), cell, recognitionBudget(), 'A07', .66);
  assert.equal(result.text, null, 'retain the original measured A07 for review');
  assert.ok(result.readings.some(reading => reading.text === 'AQ7'));
});

test('a supported replacement can retain real leading zeroes when reduced grey pixels confirm it', () => {
  const readings = Array.from({ length: 15 }, () => ['03', .93]);
  readings[11] = ['03', .916];
  const result = rereadMarkCell(engineFor(readings), cell, recognitionBudget(), 'Q3', .871);
  assert.equal(result.text, '03');
  assert.equal(result.confidence, .93);
});

test('agreement on an invalid original identifier cannot block a valid supported reread', () => {
  const readings = Array.from({ length: 15 }, () => ['B12', .92]);
  readings[11] = ['???', .65];
  const result = rereadMarkCell(engineFor(readings), cell, recognitionBudget(), '???', .66);
  assert.equal(result.text, 'B12');
});

test('type code rereads retain legitimate single and multiple letter codes', () => {
  const accept = text => /^[A-Z0-9][A-Z0-9_.-]{0,11}$/.test(text);
  for (const code of ['C', 'CC', 'R', 'B', 'AL2', 'A12']) {
    const result = rereadMarkCell(engineFor([[code, .94], [code, .91]]), cell, recognitionBudget(), code, .66, accept);
    assert.equal(result.text, code);
    assert.equal(result.confidence, .66, 'same uncertain original keeps its measured score');
  }
});
