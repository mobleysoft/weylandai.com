import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rereadDimensionCell, recognitionBudget, doorSize, parseThickness } from '../assets/client-ocr-src/schedule-grid-extraction-client.mjs';

const image = { width: 40, height: 20, data: new Uint8ClampedArray(40 * 20 * 4).fill(255) };
function engineFor(texts) {
  let calls = 0; const images = [];
  return { clearImage() {}, loadImage(img) { images.push(img); }, setVariable() {}, getTextBoxes() {
    const text = texts[calls++] || '';
    return text ? [{ text, confidence: .91, rect: { left: 0, right: 20, top: 0, bottom: 12 } }] : [];
  }, state() { return { calls, images }; } };
}
const widthFits = t => doorSize(t, '7\'-0"').width_inches != null;
const reread = (engine, first, accept = widthFits, opts = {}) => rereadDimensionCell(engine, image, 0, 40, 0, 20, { inset: 3, ...opts }, first, accept);

test('dimension consensus requires two valid semantic values; repeated invalid digits cannot approve one read', () => {
  const result = reread(engineFor(['3\'-6"', '36"', '36"', '36"', 'bad']), '36"');
  assert.equal(result.text, null);
});
test('repeated impossible dimensions do not suppress two agreeing valid reads', () => {
  const result = reread(engineFor(['8\'-12"', '8\'-12"', '3\'-4"', '3-4"', '8\'-12"']), '8\'-12"');
  assert.equal(doorSize(result.text, '7\'-0"').width_inches, 40);
  assert.equal(result.confidence, .91);
});
test('varied architectural widths and mixed fractions agree by parsed value', () => {
  for (const [a, b, inches] of [['2\'-6"', '2-6"', 30], ['3\'-6"', '3-6"', 42], ['4\'-0"', '4-0"', 48], ['3\'-0 1/2"', '3-0 1/2"', 36.5], ['6\'-8"', '6-8"', 80]]) {
    const result = reread(engineFor([a, b]), 'bad');
    assert.equal(doorSize(result.text, '7\'-0"').width_inches, inches);
  }
});
test('plain inches and feet-inches with matching digits remain different dimensions', () => {
  const acceptsEither = t => doorSize(t, '84"').width_inches != null || widthFits(t);
  const result = reread(engineFor(['36"', '3\'-6"', '36"', '3\'-6"']), 'bad', acceptsEither);
  assert.equal(result.text, null, '36 inches and 42 inches must not share a vote');
});
test('thickness variants share a valid fractional value', () => {
  const result = reread(engineFor(['13/4"', '1 3/4"']), 'bad', t => parseThickness(t) != null);
  assert.equal(parseThickness(result.text), 1.75);
});
test('reread uses the original inset and shares the page budget', () => {
  const engine = engineFor(['3\'-0"', '3\'-0"']);
  const budget = recognitionBudget({ maxCells: 1 });
  const result = reread(engine, 'bad', widthFits, { recognitionBudget: budget });
  assert.equal(result.text, null);
  assert.equal(engine.state().calls, 1);
  assert.equal(engine.state().images[0].width, 50);
  assert.equal(engine.state().images[0].height, 30);
  assert.equal(budget.status().reason, 'cell_limit');
});

// The recognizer can support multiple plausible sizes when ink is obscured.
// A weak majority must keep that ambiguity, including with whitelist views.
test('conflicting physical sizes from weak views remain unread', () => {
  const engine = engineFor(['2\'-9"', '2\'-9"', '2\'-9"', '2\'-0"', '2\'-0"']);
  const recognize = engine.getTextBoxes;
  engine.getTextBoxes = () => recognize().map(word => ({ ...word, confidence: .59 }));
  assert.equal(reread(engine, 'bad').text, null);
});
test('plain inches require a physically valid paired width and height', () => {
  assert.deepEqual(doorSize('36"', '84"'), { width_inches: 36, height_inches: 84 });
  assert.deepEqual(doorSize('20"', '614"'), { width_inches: null, height_inches: null });
  assert.deepEqual(doorSize('340"', '84"'), { width_inches: null, height_inches: null });
  assert.deepEqual(doorSize('3\'-0"', '614"'), { width_inches: 36, height_inches: null });
});
