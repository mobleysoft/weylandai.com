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
    assert.equal(result.confidence, .92);
    assert.equal(engine.state().calls, 5);
    assert.equal(budget.status().cells, 5);
    assert.ok(engine.state().variables.every(([name, value]) => name !== 'tessedit_char_whitelist' || value === ''), 'alphabetic identifiers must not use a numeric whitelist');
    assert.ok(engine.state().images.every(img => img.width > cell.width && img.height > cell.height));
  }
});

test('a conflicting first identifier is replaced by a consistent actual reread', () => {
  const engine = engineFor([['', 0], ['', 0], ['B12', .95], ['B12', .94], ['B12', .93]]);
  const result = rereadMarkCell(engine, cell, recognitionBudget(), 'B14', .77);
  assert.equal(result.text, 'B12');
  assert.equal(result.confidence, .93);
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
