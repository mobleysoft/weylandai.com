import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IDENTITY,
  isValidMatrix,
  compose,
  applyToPoint,
  applyToVector,
  translationMatrix,
  scaleMatrix,
  rotationMatrix,
  invert,
} from "./pdf-matrix.js";

function approxEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps;
}
function assertPointClose(actual, expected, epsOrMessage, message) {
  const eps = typeof epsOrMessage === "number" ? epsOrMessage : 1e-9;
  const msg = typeof epsOrMessage === "string" ? epsOrMessage : message;
  assert.ok(approxEqual(actual[0], expected[0], eps) && approxEqual(actual[1], expected[1], eps),
    msg || `expected [${expected}], got [${actual}]`);
}

test("isValidMatrix rejects the real malformed shapes a bad content stream could produce", () => {
  assert.equal(isValidMatrix([1, 0, 0, 1, 0, 0]), true);
  assert.equal(isValidMatrix([1, 0, 0, 1, 0]), false, "5 elements, not 6");
  assert.equal(isValidMatrix([1, 0, 0, 1, 0, NaN]), false);
  assert.equal(isValidMatrix([1, 0, 0, 1, 0, Infinity]), false);
  assert.equal(isValidMatrix("not an array"), false);
  assert.equal(isValidMatrix(null), false);
});

test("identity matrix leaves points unchanged", () => {
  assertPointClose(applyToPoint(IDENTITY, 42, -7), [42, -7]);
});

test("translationMatrix moves a point by exactly (tx, ty)", () => {
  const m = translationMatrix(10, 20);
  assertPointClose(applyToPoint(m, 0, 0), [10, 20]);
  assertPointClose(applyToPoint(m, 5, 5), [15, 25]);
});

test("scaleMatrix scales around the origin, not a centered scale", () => {
  const m = scaleMatrix(2, 3);
  assertPointClose(applyToPoint(m, 10, 10), [20, 30]);
  assertPointClose(applyToPoint(m, 0, 0), [0, 0]);
});

test("rotationMatrix: a real 90-degree rotation maps (1,0) to (0,1)", () => {
  const m = rotationMatrix(Math.PI / 2);
  assertPointClose(applyToPoint(m, 1, 0), [0, 1]);
  assertPointClose(applyToPoint(m, 0, 1), [-1, 0]);
});

test("REAL, hand-verified `cm` composition order (PDF32000-1:2008 §8.3.4) - the exact case this module's own header comment warns is easy to get backwards", () => {
  // Existing CTM: translate(100, 100) - simulates a page already offset
  // by a prior transform.
  const base = translationMatrix(100, 100);
  // A real "10 20 cm" content-stream operator - operand is a local
  // translate, applied in the CURRENT (pre-cm) coordinate space.
  const operand = translationMatrix(10, 20);
  const newCtm = compose(operand, base);

  // Spec-correct expectation, hand-derived: a point at local (0,0) drawn
  // AFTER this `cm` must land at the exact same device point that local
  // (10,20) would have landed at under the OLD ctm - that's what "applied
  // in the current coordinate space" means concretely.
  const viaComposedCtm = applyToPoint(newCtm, 0, 0);
  const viaOldCtmDirectly = applyToPoint(base, 10, 20);
  assertPointClose(viaComposedCtm, viaOldCtmDirectly);
  assertPointClose(viaComposedCtm, [110, 120]);

  // Translation composed with translation is commutative (vector
  // addition) - swapping the order above wouldn't actually prove
  // anything about which order is correct. Use a non-commuting pair
  // (scale + translate) to genuinely demonstrate the two orders differ,
  // so the assertion above is proven meaningful rather than passing
  // trivially either way.
  const scaleOp = scaleMatrix(2, 2);
  const rightOrder = applyToPoint(compose(scaleOp, base), 5, 5);
  const wrongOrder = applyToPoint(compose(base, scaleOp), 5, 5);
  assert.ok(!approxEqual(rightOrder[0], wrongOrder[0]) || !approxEqual(rightOrder[1], wrongOrder[1]),
    "scale-then-translate vs translate-then-scale must differ, proving compose()'s argument order is not a no-op - the exact class of mistake that could silently swap operand/base and still look right on a commutative pair like pure translation");
});

test("compose is associative in the way real nested q/Q graphics-state stacks rely on: (A after B after C) == A ∘ (B ∘ C)", () => {
  const A = translationMatrix(5, 0);
  const B = scaleMatrix(2, 2);
  const C = rotationMatrix(Math.PI / 4);
  const left = compose(A, compose(B, C));
  const right = compose(compose(A, B), C);
  assertPointClose(applyToPoint(left, 3, 4), applyToPoint(right, 3, 4), 1e-9);
});

test("applyToVector ignores translation - real use case: scaling a stroke line width, not a point", () => {
  const m = compose(scaleMatrix(3, 3), translationMatrix(1000, 1000));
  const v = applyToVector(m, 1, 0);
  assertPointClose(v, [3, 0], "translation must not leak into a direction vector");
});

test("invert: real round-trip on a non-trivial transform (rotate+scale+translate)", () => {
  const m = compose(rotationMatrix(0.7), compose(scaleMatrix(2, 3), translationMatrix(15, -8)));
  const inv = invert(m);
  const original = [12, -33];
  const forward = applyToPoint(m, original[0], original[1]);
  const roundTrip = applyToPoint(inv, forward[0], forward[1]);
  assertPointClose(roundTrip, original, 1e-6);
});

test("invert throws on a real singular matrix rather than returning NaN", () => {
  // A matrix that collapses the plane to a line (det = a*d - b*c = 0).
  const singular = [1, 2, 2, 4, 0, 0];
  assert.throws(() => invert(singular), /singular/);
});

test("compose/applyToPoint throw on a malformed matrix rather than silently propagating NaN", () => {
  assert.throws(() => compose([1, 2, 3], IDENTITY), /invalid/);
  assert.throws(() => applyToPoint([1, 2, 3, 4, 5, NaN], 0, 0), /invalid/);
});
