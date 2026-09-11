// Sovereign PDF 2D affine matrix math - MONOLITH_HELPER_MAP.md section 3
// step 5 (Sovereign PDF rasterizer), second real milestone after the
// content-stream tokenizer. Every subsequent piece of the rasterizer
// (path construction under `cm`, text positioning under `Tm`/`Td`,
// eventual device-space rasterization) needs correct 2D affine transform
// composition - this is the small, self-contained, independently
// testable foundation for all of it, not a claim of rasterization itself.
//
// PDF matrices are 6-number row-vector affine transforms per
// PDF 32000-1:2008 §8.3.4, representing the 3x3 matrix:
//   [ a  b  0 ]
//   [ c  d  0 ]
//   [ e  f  1 ]
// applied to a row vector [x y 1] as [x y 1] * M = [x' y' 1].
//
// The `cm` operator's real, spec-defined composition rule (§8.3.4,
// "Coordinate Spaces"): the operand matrix is applied in the CURRENT
// (pre-cm) coordinate space, i.e. it's the local-to-parent transform -
// so CTM_new = M_operand * CTM_old, not CTM_old * M_operand. This
// module's compose() implements exactly that order; callers pass the
// operand matrix first, the existing CTM second - see the test file for
// a real, hand-verified nested-translation case that pins this down,
// since getting this order backwards is a real, easy, silent mistake.

export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);

// Real validation, not just a comment: any 6-number PDF matrix operand
// is finite - reject NaN/Infinity up front rather than letting it
// silently propagate into every downstream transform.
export function isValidMatrix(m) {
  return Array.isArray(m) && m.length === 6 && m.every((n) => typeof n === "number" && Number.isFinite(n));
}

// Composes `operand` (the matrix given to a `cm` operator, applied in
// the CURRENT/local coordinate space) with `base` (the existing CTM),
// per PDF32000-1:2008 §8.3.4: result = operand * base.
export function compose(operand, base) {
  if (!isValidMatrix(operand)) throw new Error(`compose: invalid operand matrix ${JSON.stringify(operand)}`);
  if (!isValidMatrix(base)) throw new Error(`compose: invalid base matrix ${JSON.stringify(base)}`);
  const [a1, b1, c1, d1, e1, f1] = operand;
  const [a2, b2, c2, d2, e2, f2] = base;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

// Applies matrix m to point (x, y): [x y 1] * m.
export function applyToPoint(m, x, y) {
  if (!isValidMatrix(m)) throw new Error(`applyToPoint: invalid matrix ${JSON.stringify(m)}`);
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// Applies matrix m to a vector (x, y) - direction only, ignores
// translation (e, f). Needed later for line-width/stroke scaling,
// where translation is irrelevant.
export function applyToVector(m, x, y) {
  if (!isValidMatrix(m)) throw new Error(`applyToVector: invalid matrix ${JSON.stringify(m)}`);
  return [m[0] * x + m[2] * y, m[1] * x + m[3] * y];
}

export function translationMatrix(tx, ty) {
  return [1, 0, 0, 1, tx, ty];
}

export function scaleMatrix(sx, sy) {
  return [sx, 0, 0, sy, 0, 0];
}

// Angle in radians, standard PDF (counter-clockwise, right-handed) rotation.
export function rotationMatrix(theta) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return [cos, sin, -sin, cos, 0, 0];
}

const DET_EPSILON = 1e-12;

// Real inverse, needed later for hit-testing / going from device space
// back to user space (e.g. clip region math). Throws on a singular
// (non-invertible) matrix rather than returning a silently wrong result -
// a real, honest failure mode a caller must handle, not NaNs propagating
// downstream.
export function invert(m) {
  if (!isValidMatrix(m)) throw new Error(`invert: invalid matrix ${JSON.stringify(m)}`);
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < DET_EPSILON) {
    throw new Error(`invert: matrix is singular (det=${det}), not invertible`);
  }
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  const ie = -(e * ia + f * ic);
  const ifv = -(e * ib + f * id);
  return [ia, ib, ic, id, ie, ifv];
}
