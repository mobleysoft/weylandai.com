#!/usr/bin/env python3
"""fix_weylandai_wordmark.py — apply mobley.glyph_cleanup to the WeylandAI
wordmark's "W" glyph, as a worked example of the shared tool.

WHY THE RAW TRACE, NOT THE CURRENTLY-COMMITTED PATH
-----------------------------------------------------
Three manual passes earlier this session already replaced each noisy traced
curve segment with a straight line between ITS OWN two endpoints. That
approach discards exactly the information this tool needs: the real sample
points *along* each curve, which is what a least-squares fit needs to
average out trace noise properly. So this script goes back to the original,
never-hand-edited potrace output for the "W" — committed at
c798a8c ("Roll out Signal Blue/Hi-Vis Yellow brand palette..."), the first
commit that introduced this SVG — and re-derives a clean path from that
real, dense data. The result is substituted back in as the innermost
`<path d="...">` of the current file, in the same local coordinate frame
(same `scale(0.1,-0.1)` convention), leaving the outer `<g transform>` stack
(cap-height/overshoot/sizing decisions made earlier this session) untouched,
since those are legitimate word-composition choices, not the glyph defect
this task is about.

HOW THE W IS ACTUALLY STRUCTURED (determined by rendering + plotting the
raw trace — see the session's analysis, not guessed):
  - 3 flat-top "lobes" at cap height (left/outer, middle, right/outer),
    separated by 2 deep V-shaped valleys that do NOT reach the baseline.
  - The two OUTER lobes (left, right) each have a thin triangular "claw"
    notch cut up from the baseline into their body (not reaching the top) —
    present on both, confirmed mirror-symmetric, so this is a deliberate
    design detail, not trace noise, and must be preserved (not deleted).
  - The middle lobe has an analogous but shallower internal notch, self-
    symmetric about the glyph's own vertical center.
  - 4 short, exactly-vertical (90.00°, ~0 RMSE), closely-length-matched
    segments recur at the two OUTER lobes' top corners (4 instances) and at
    the claw notches' feet (2 instances) — real, intentional micro-flourishes
    (confirmed by consistency across instances), not noise, and are
    preserved at their measured average length rather than being flattened
    to a sharp point like the genuinely noisy fillets.
  - Every other short connecting arc between two long diagonals *is* trace
    noise (classify_segment agrees) and is replaced by a sharp corner (the
    intersection of the two adjacent cleaned lines).

Run: PYTHONPATH=/Users/johnmobley/mobley-kernel/src python3 fix_weylandai_wordmark.py
"""
import re
import sys
import numpy as np

sys.path.insert(0, "/Users/johnmobley/mobley-kernel/src")
from mobley.glyph_cleanup import (  # noqa: E402
    parse_path, CubicEl, fit_mirrored_edge, robust_corner, path_from_segments,
)

# The original, never-hand-edited potrace trace of the "W" glyph, as
# committed at c798a8c (first commit to introduce this SVG). Embedded as a
# constant for reproducibility — this is a historical artifact, not
# something that should depend on git history being preserved.
RAW_W_PATH = (
    "M50 801 c0 -33 4 -40 25 -45 18 -5 27 -17 35 -49 13 -45 19 -65 80 -262 "
    "45 -148 45 -145 26 -145 -9 0 -16 14 -18 38 -6 47 -58 224 -69 237 -5 5 "
    "-9 -51 -9 -133 0 -135 -1 -142 -20 -142 -16 0 -20 -7 -20 -34 l0 -34 72 -4 "
    "c40 -2 126 -2 190 0 l117 4 40 122 c21 66 47 147 56 179 9 31 19 57 23 57 "
    "4 0 32 -80 63 -178 l57 -177 128 -5 c71 -3 155 -4 187 -2 l57 5 0 33 "
    "c0 27 -4 34 -20 34 -19 0 -20 7 -20 147 0 80 -3 143 -7 140 -12 -13 -72 -222 "
    "-73 -254 0 -23 -5 -33 -15 -33 -8 0 -15 5 -15 12 0 9 45 158 121 405 "
    "7 21 19 35 40 42 25 8 29 15 29 45 l0 36 -155 0 -155 0 0 -40 "
    "c0 -31 4 -40 18 -40 43 -1 44 -11 11 -151 -17 -74 -35 -140 -38 -147 "
    "-6 -11 -75 196 -113 341 l-10 37 -87 0 -86 0 -60 -197 -59 -196 -17 59 "
    "c-60 213 -63 246 -29 254 20 5 26 13 28 43 l3 37 -155 0 -156 0 0 -39z"
)

AXIS_X = 580.0  # (50 + 1110) / 2 — the glyph's measured bounding-box center,
                # confirmed as the true mirror axis by how cleanly every
                # long edge paired up with angle_sum ~= 0 across it.


def pts_of(els, idxs, n_cubic=16):
    """Pool every real sample point from the given element indices."""
    out = []
    for i in idxs:
        el = els[i]
        n = n_cubic if isinstance(el, CubicEl) else 2
        out.append(el.sample(n))
    return np.vstack(out)


def main():
    els = parse_path(RAW_W_PATH)
    assert len(els) == 51, f"expected the known 51-element raw trace, got {len(els)}"

    # ---- mirrored-pair / self-symmetric edge fits -----------------------
    # Each call pools real points from BOTH instances (mirrored into one
    # frame) and returns (left_instance_line, right_instance_line) as exact
    # mirror images built from their combined real data.
    #
    # IMPORTANT geometric finding from the data (not assumed up front):
    # outerL (el2,3) and spikeL_A (el5) fit to within 0.3 degrees of being
    # PARALLEL (~-73.6 deg both). That means leg1 is a genuine constant-
    # width parallel stroke whose two sides are outerL and spikeL_A — they
    # do NOT converge to a sharp point. The real traced data shows the
    # stroke is instead capped at the bottom by a short, non-trivial
    # "foot cut" segment (el4, 42 units long, mirrored almost exactly by
    # el26 — angle_sum ~1.6 degrees) — a deliberate flat-ish foot treatment,
    # not a corner-rounding artifact. The thin "claw" notch carved into the
    # lobe below leg1 is a separate feature sharing leg1's own inner edge
    # (spikeL_A) as one of its two walls, and is itself capped at ITS
    # bottom by a second, similarly real, mirror-consistent foot cut (el8,
    # mirrored by el22 to within 0.0 degrees). Both foot cuts get the same
    # least-squares + mirror treatment as every other edge — the earlier,
    # "just intersect the two sides directly" version of this script
    # produced a wildly wrong corner here, which is exactly the kind of
    # mistake a real line-vs-parallel check catches and a symmetry-blind
    # per-segment patch would not.
    outerL, outerR = fit_mirrored_edge(pts_of(els, [2, 3]), pts_of(els, [28]), AXIS_X)
    legFootL, legFootR = fit_mirrored_edge(pts_of(els, [4]), pts_of(els, [26]), AXIS_X)
    spikeL_A, spikeR_A = fit_mirrored_edge(pts_of(els, [5]), pts_of(els, [25]), AXIS_X)
    spikeL_B, spikeR_B = fit_mirrored_edge(pts_of(els, [6, 7]), pts_of(els, [23, 24]), AXIS_X)
    crackFootL, crackFootR = fit_mirrored_edge(pts_of(els, [8]), pts_of(els, [22]), AXIS_X)
    valley1_L, valley2_R = fit_mirrored_edge(pts_of(els, [44, 45, 46, 47]), pts_of(els, [37, 36, 35, 34]), AXIS_X)

    # Self-symmetric parts of the middle lobe (axis = its own center, same
    # AXIS_X since the whole glyph is symmetric about one vertical line).
    spikeM_A, spikeM_B = fit_mirrored_edge(pts_of(els, [13, 14, 15]), pts_of(els, [16, 17]), AXIS_X)
    valley1_M, valley2_M = fit_mirrored_edge(pts_of(els, [42, 43]), pts_of(els, [38, 39]), AXIS_X)

    # ---- unified horizontal reference lines ------------------------------
    # Cap height and baseline are shared typographic lines across all three
    # lobes, not independent per-lobe measurements — align them (priority
    # #4's cap-height/baseline rule), using every real point from all
    # instances via a weighted mean.
    cap_pts = pts_of(els, [48, 49, 40, 41, 32, 33])
    cap_y = float(np.mean(cap_pts[:, 1]))
    baseline_pts = pts_of(els, [10, 11, 12, 18, 19, 20])
    baseline_y = float(np.mean(baseline_pts[:, 1]))

    # topM's own horizontal extent (its two top corners), used verbatim —
    # it is already flat (rmse ~0) and does not get a corner flourish.
    topM_pts = pts_of(els, [40, 41])

    # ---- the 4 confirmed-intentional vertical micro-flourishes ----------
    # Exactly-vertical (90.00 deg), ~0 RMSE, closely length-matched across
    # all instances -> classify_segment's own BIC test would call each of
    # these individually "line", and their cross-instance consistency (not
    # just one segment's own fit) is exactly the corroborating signal
    # priority #3 asks for. Preserve them at their measured average length
    # instead of collapsing to a sharp point.
    def el_len(i):
        e = els[i]
        p0 = e.p0
        p1 = e.p3 if isinstance(e, CubicEl) else e.p1
        return float(np.linalg.norm(p1 - p0))

    top_flourish_len = float(np.mean([el_len(50), el_len(31), el_len(47), el_len(34)]))
    foot_flourish_len = float(np.mean([el_len(9), el_len(21)]))

    # ---- reconstruct vertices --------------------------------------------
    # Outer-left lobe, outward (left) corner: outerL's own fitted line,
    # evaluated at the flourish's bottom, gives the flourish's x.
    x_TL_out = outerL.x_at_y(cap_y - top_flourish_len)
    TL_out_top = (x_TL_out, cap_y)
    TL_out_bot = (x_TL_out, cap_y - top_flourish_len)

    # leg1's own flat-ish foot cut closes off its two (near-parallel) sides.
    # outerL/spikeL_A are themselves only ~0.2 deg apart (a genuine parallel
    # stroke) and legFootL meets each at a shallow ~7-12 deg angle -> a
    # naive extrapolated intersection is ill-conditioned here (confirmed:
    # it threw the corner over 100 units outside the glyph on the first
    # attempt), so robust_corner's real-data fallback is required, not
    # optional, for this pair.
    leg1_foot_outer = robust_corner(outerL, legFootL, pts_of(els, [2, 3]), pts_of(els, [4]))
    leg1_foot_inner = robust_corner(legFootL, spikeL_A, pts_of(els, [4]), pts_of(els, [5]))
    # the claw notch carved beside leg1, sharing spikeL_A as its left wall
    # (spikeL_A vs spikeL_B are ~14 deg apart -> a true sharp corner, stable)
    spike_L_apex = robust_corner(spikeL_A, spikeL_B, pts_of(els, [5]), pts_of(els, [6, 7]))
    crack_L_bottom = robust_corner(spikeL_B, crackFootL, pts_of(els, [6, 7]), pts_of(els, [8]))

    x_spikeL_foot = crackFootL.x_at_y(baseline_y + foot_flourish_len)
    spikeL_inner_top = (x_spikeL_foot, baseline_y + foot_flourish_len)
    spikeL_inner_bot = (x_spikeL_foot, baseline_y)

    x_M_left_foot = spikeM_A.x_at_y(baseline_y)
    M_left_foot = (x_M_left_foot, baseline_y)
    spike_M_apex = robust_corner(spikeM_A, spikeM_B, pts_of(els, [13, 14, 15]), pts_of(els, [16, 17]))
    x_M_right_foot = spikeM_B.x_at_y(baseline_y)
    M_right_foot = (x_M_right_foot, baseline_y)

    x_spikeR_foot = crackFootR.x_at_y(baseline_y + foot_flourish_len)
    spikeR_inner_bot = (x_spikeR_foot, baseline_y)
    spikeR_inner_top = (x_spikeR_foot, baseline_y + foot_flourish_len)

    crack_R_bottom = robust_corner(crackFootR, spikeR_B, pts_of(els, [22]), pts_of(els, [23, 24]))
    spike_R_apex = robust_corner(spikeR_B, spikeR_A, pts_of(els, [23, 24]), pts_of(els, [25]))
    leg4_foot_inner = robust_corner(spikeR_A, legFootR, pts_of(els, [25]), pts_of(els, [26]))
    leg4_foot_outer = robust_corner(legFootR, outerR, pts_of(els, [26]), pts_of(els, [28]))

    x_TR_out = outerR.x_at_y(cap_y - top_flourish_len)
    TR_out_bot = (x_TR_out, cap_y - top_flourish_len)
    TR_out_top = (x_TR_out, cap_y)

    x_TR_in = valley2_R.x_at_y(cap_y - top_flourish_len)
    TR_in_top = (x_TR_in, cap_y)
    TR_in_bot = (x_TR_in, cap_y - top_flourish_len)

    valley2_bottom = robust_corner(valley2_R, valley2_M, pts_of(els, [34, 35, 36, 37]), pts_of(els, [38, 39]))

    TM_right = (float(np.max(topM_pts[:, 0])), cap_y)
    TM_left = (float(np.min(topM_pts[:, 0])), cap_y)

    valley1_bottom = robust_corner(valley1_M, valley1_L, pts_of(els, [42, 43]), pts_of(els, [44, 45, 46, 47]))

    x_TL_in = valley1_L.x_at_y(cap_y - top_flourish_len)
    TL_in_bot = (x_TL_in, cap_y - top_flourish_len)
    TL_in_top = (x_TL_in, cap_y)

    polygon = [
        TL_out_top, TL_out_bot,
        tuple(leg1_foot_outer), tuple(leg1_foot_inner),
        tuple(spike_L_apex), tuple(crack_L_bottom),
        spikeL_inner_top, spikeL_inner_bot,
        M_left_foot, tuple(spike_M_apex), M_right_foot,
        spikeR_inner_bot, spikeR_inner_top,
        tuple(crack_R_bottom), tuple(spike_R_apex),
        tuple(leg4_foot_inner), tuple(leg4_foot_outer),
        TR_out_bot, TR_out_top,
        TR_in_top, TR_in_bot,
        tuple(valley2_bottom),
        TM_right, TM_left,
        tuple(valley1_bottom),
        TL_in_bot, TL_in_top,
    ]
    polygon = [np.array(p) for p in polygon]

    d = path_from_segments(polygon, decimals=1)

    print(f"# cap_y={cap_y:.2f} baseline_y={baseline_y:.2f} "
          f"top_flourish_len={top_flourish_len:.2f} foot_flourish_len={foot_flourish_len:.2f}")
    print(f"# outerL angle={outerL.angle_deg:.2f} (n={outerL.n_points}) outerR angle={outerR.angle_deg:.2f}")
    print(f"# spikeL_A={spikeL_A.angle_deg:.2f} spikeL_B={spikeL_B.angle_deg:.2f} "
          f"spike_L_apex={spike_L_apex.round(1)} spike_M_apex={spike_M_apex.round(1)} spike_R_apex={spike_R_apex.round(1)}")
    print(f"# valley1_bottom={valley1_bottom.round(1)} valley2_bottom={valley2_bottom.round(1)}")
    print(f"# vertices: {len(polygon)}  (was 51 in the raw trace)")
    print(d)
    return d


if __name__ == "__main__":
    main()
