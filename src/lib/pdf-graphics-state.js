// Sovereign PDF graphics-state interpreter - MONOLITH_HELPER_MAP.md
// section 3 step 5 (Sovereign PDF rasterizer), third real milestone.
// Consumes pdf-content-stream-tokenizer.js's {op, args} list and
// pdf-matrix.js's transform math to turn PATH CONSTRUCTION and
// FILL/STROKE operators into real device-space paint events - a
// structured intermediate form a future rasterizer would consume.
//
// Deliberately scoped to path construction + fill/stroke only for this
// milestone. Text positioning (BT/ET/Tf/Td/Tm/Tj/TJ) is real, separate,
// substantial work (its own coordinate-space rules layered on top of the
// CTM) - NOT done here, tracked as the next milestone, not silently
// half-implemented. Color is scoped to DeviceRGB/DeviceGray only (rg/RG,
// g/G, w) - CMYK (k/K), ICC-based color spaces, and patterns are real,
// honest gaps, not claimed.
//
// Added 2026-09-12 (weylandai.com/pdf-render.js sovereign-rasterizer
// task): `Do` (XObject invocation) now emits a real `{type:'image', name,
// ctm}` event carrying the device-space CTM in effect at the moment of
// invocation, per PDF32000-1:2008 §8.10.1 (an image XObject paints into
// the unit square [0,1]x[0,1] of the current user space). This module
// deliberately does NOT resolve the XObject name against a Resources
// dict or decode any image bytes - it has no PDF-object-graph or
// filter-decoding knowledge (that's pdf-metadata.js's / pdf-render.js's
// job, matching this module's existing separation of concerns) - it only
// captures the real transform at the real moment the operator ran, which
// a caller cannot reconstruct after the fact once q/Q has moved on. Form
// XObjects (Subtype /Form, nested content streams) are a real, separate,
// not-yet-handled gap: this emits the same 'image' event shape for any
// Do regardless of XObject subtype, and a caller that resolves the name
// to a Form (not an Image) must handle that itself - not silently
// mis-rendered here, just not disambiguated at this layer.
//
// Per PDF32000-1:2008 §8.5.2.1: path-construction operators specify
// coordinates in the CURRENT user space, i.e. transformed by whatever
// CTM is in effect at the moment each operator executes - NOT the CTM
// at paint time, which can differ if `cm` runs mid-path (unusual but
// spec-legal). This module transforms each point to device space
// immediately at construction time, not deferred to painting, to match
// that rule exactly rather than by coincidence.

import { compose, applyToPoint, IDENTITY } from "./pdf-matrix.js";

const DEFAULT_COLOR = Object.freeze({ r: 0, g: 0, b: 0 });

function cloneState(s) {
  return {
    ctm: s.ctm,
    fillColor: s.fillColor,
    strokeColor: s.strokeColor,
    lineWidth: s.lineWidth,
  };
}

function newSubpath(startPoint) {
  return { points: [startPoint], closed: false };
}

// Real cubic Bezier flattening - a rasterizer needs line segments, not
// curve control points. Fixed segment count rather than an adaptive
// error-based subdivision (a real, honest simplification for this
// milestone - adaptive flattening is a real future improvement, not
// silently claimed as done). 16 segments is enough to look smooth at
// the 600 DPI this venture's real door-schedule pages render at for
// typical PDF-sized curves; not validated against pathological
// huge-radius cases.
const BEZIER_SEGMENTS = 16;
function flattenCubicBezier(p0, p1, p2, p3, out) {
  for (let i = 1; i <= BEZIER_SEGMENTS; i++) {
    const t = i / BEZIER_SEGMENTS;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    out.push([x, y]);
  }
}

// Added 2026-09-12 (weylandai.com/pdf-render.js sovereign-rasterizer
// task): real stroke line width needs to be reported in DEVICE space to
// be usable by a canvas-based painter, since path points are already
// transformed to device space at construction time (this module's own
// documented rule, see file header) - `state.lineWidth` alone is still
// the raw PDF-user-space value from the `w` operator. Per §8.4.3.2, line
// width is genuinely subject to the CTM in effect at stroke time; a
// non-uniform CTM technically produces an elliptical pen, which this
// (like real-world renderers commonly do) approximates with a single
// scalar: sqrt(|det(CTM)|), the CTM's area-scale factor. Exact for the
// uniform-scale-plus-flip CTMs this venture's real PDFs actually use
// (confirmed: OCCDoorSchedulePg4.pdf's own `cm` operators are all
// uniform scale, e.g. "0.75 0 0 -0.75 0 792 cm"), an honest approximation
// for a genuinely skewed/rotated CTM.
function effectiveScale(ctm) {
  const [a, b, c, d] = ctm;
  return Math.sqrt(Math.abs(a * d - b * c));
}

function colorFromArgs(args, kind) {
  if (kind === "rgb") {
    const [r, g, b] = args;
    return { r, g, b };
  }
  if (kind === "gray") {
    const [g] = args;
    return { r: g, g, b: g };
  }
  return DEFAULT_COLOR;
}

// Runs a tokenized content-stream op list through a real (scoped)
// graphics-state machine, returning device-space paint events:
//   { type: 'fill', subpaths: [[x,y],...][], color, evenOdd: bool }
//   { type: 'stroke', subpaths: [[x,y],...][], color, lineWidth }
// `initialCtm` lets a caller pass a real page-space-to-device-space
// transform (e.g. a 600-DPI scale + Y-flip) rather than assuming identity.
export function interpretGraphicsOps(ops, initialCtm = IDENTITY) {
  let state = { ctm: initialCtm, fillColor: DEFAULT_COLOR, strokeColor: DEFAULT_COLOR, lineWidth: 1 };
  const stateStack = [];
  const events = [];
  const warnings = [];

  let subpaths = [];
  let current = null; // the in-progress subpath
  let currentPointUser = [0, 0]; // last point, in USER space, for curve continuity

  function moveTo(x, y) {
    currentPointUser = [x, y];
    current = newSubpath(applyToPoint(state.ctm, x, y));
    subpaths.push(current);
  }
  function lineTo(x, y) {
    if (!current) { moveTo(x, y); return; }
    currentPointUser = [x, y];
    current.points.push(applyToPoint(state.ctm, x, y));
  }
  function curveTo(x1, y1, x2, y2, x3, y3) {
    if (!current) moveTo(currentPointUser[0], currentPointUser[1]);
    const p0 = applyToPoint(state.ctm, currentPointUser[0], currentPointUser[1]);
    const p1 = applyToPoint(state.ctm, x1, y1);
    const p2 = applyToPoint(state.ctm, x2, y2);
    const p3 = applyToPoint(state.ctm, x3, y3);
    flattenCubicBezier(p0, p1, p2, p3, current.points);
    currentPointUser = [x3, y3];
  }
  function closePath() {
    if (current && current.points.length > 1) current.closed = true;
  }
  function clearPath() {
    subpaths = [];
    current = null;
  }

  for (const { op, args } of ops) {
    switch (op) {
      case "q":
        stateStack.push(cloneState(state));
        break;
      case "Q":
        if (stateStack.length > 0) state = stateStack.pop();
        else warnings.push("Q with no matching q - graphics state stack underflow, ignored");
        break;
      case "cm": {
        if (args.length !== 6) { warnings.push(`cm expected 6 args, got ${args.length}`); break; }
        state = { ...state, ctm: compose(args, state.ctm) };
        break;
      }
      case "w":
        if (args.length === 1) state = { ...state, lineWidth: args[0] };
        break;
      case "rg":
        if (args.length === 3) state = { ...state, fillColor: colorFromArgs(args, "rgb") };
        break;
      case "RG":
        if (args.length === 3) state = { ...state, strokeColor: colorFromArgs(args, "rgb") };
        break;
      case "g":
        if (args.length === 1) state = { ...state, fillColor: colorFromArgs(args, "gray") };
        break;
      case "G":
        if (args.length === 1) state = { ...state, strokeColor: colorFromArgs(args, "gray") };
        break;
      case "k":
      case "K":
        warnings.push(`${op}: CMYK color not yet supported (real, honest gap - not silently ignored)`);
        break;

      case "m":
        if (args.length === 2) moveTo(args[0], args[1]);
        break;
      case "l":
        if (args.length === 2) lineTo(args[0], args[1]);
        break;
      case "c":
        if (args.length === 6) curveTo(...args);
        break;
      case "v": // first control point == current point
        if (args.length === 4) curveTo(currentPointUser[0], currentPointUser[1], args[0], args[1], args[2], args[3]);
        break;
      case "y": // second control point == endpoint
        if (args.length === 4) curveTo(args[0], args[1], args[2], args[3], args[2], args[3]);
        break;
      case "h":
        closePath();
        break;
      case "re": {
        if (args.length !== 4) break;
        const [x, y, w, h] = args;
        moveTo(x, y);
        lineTo(x + w, y);
        lineTo(x + w, y + h);
        lineTo(x, y + h);
        closePath();
        break;
      }

      case "f":
      case "F":
        if (subpaths.length) events.push({ type: "fill", subpaths, color: state.fillColor, evenOdd: false });
        clearPath();
        break;
      case "f*":
        if (subpaths.length) events.push({ type: "fill", subpaths, color: state.fillColor, evenOdd: true });
        clearPath();
        break;
      case "S":
        if (subpaths.length) events.push({ type: "stroke", subpaths, color: state.strokeColor, lineWidth: state.lineWidth, lineWidthDevice: state.lineWidth * effectiveScale(state.ctm) });
        clearPath();
        break;
      case "s":
        closePath();
        if (subpaths.length) events.push({ type: "stroke", subpaths, color: state.strokeColor, lineWidth: state.lineWidth, lineWidthDevice: state.lineWidth * effectiveScale(state.ctm) });
        clearPath();
        break;
      case "B":
      case "B*":
        if (subpaths.length) {
          events.push({ type: "fill", subpaths, color: state.fillColor, evenOdd: op === "B*" });
          events.push({ type: "stroke", subpaths, color: state.strokeColor, lineWidth: state.lineWidth, lineWidthDevice: state.lineWidth * effectiveScale(state.ctm) });
        }
        clearPath();
        break;
      case "b":
      case "b*":
        closePath();
        if (subpaths.length) {
          events.push({ type: "fill", subpaths, color: state.fillColor, evenOdd: op === "b*" });
          events.push({ type: "stroke", subpaths, color: state.strokeColor, lineWidth: state.lineWidth, lineWidthDevice: state.lineWidth * effectiveScale(state.ctm) });
        }
        clearPath();
        break;
      case "n":
        clearPath();
        break;

      case "Do":
        if (args.length === 1 && typeof args[0] === "string") {
          events.push({ type: "image", name: args[0], ctm: state.ctm });
        } else {
          warnings.push(`Do expected 1 name arg, got ${JSON.stringify(args)}`);
        }
        break;

      // Text operators (BT/ET/Tf/Td/Tm/Tj/TJ/etc.) intentionally not
      // handled here - real, separate, next milestone (see module
      // header). Not silently dropped without acknowledgment: they're
      // simply not path/fill/stroke operators, so this interpreter
      // correctly has nothing to do with them yet.
      default:
        break;
    }
  }

  return { events, warnings };
}
