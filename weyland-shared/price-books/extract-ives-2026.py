#!/usr/bin/env python3
"""Ives Price Book 17 (effective May 29, 2026) -> ives-2026.json.

Input: `pdftotext -layout` of the filed book (R2 manufacturer-catalogs/b14117b49c7deb52.pdf,
210 pages). Usage: python3 -I extract-ives-2026.py ives.txt > ives-2026.json

Extracted, each row citing its page:
  hinges   pages 9-30: model, size block, finish and list in the steel-based and
           brass/stainless columns (5BB1 HW 4.5" x 4.5" 652 = $58.40, p.23)
  plates   8400 protection plates: the stocked table (p.92, finish by the substrate
           label nearest the row), the price per hundred square inches by height band
           and finish (p.93) and the hundred-square-inch sizing chart (p.93)
"""
import json, re, sys

pages = open(sys.argv[1], encoding="utf-8", errors="ignore").read().split("\f")
money = lambda s: float(s.replace(",", ""))
PAIR = re.compile(r"(?<!\S)([FB]-)?([0-9]{3}[a-z]?(?:/\d+)?|BLK|CLR|P-BLK)\s+\$([\d,]+\.\d\d)")
SIZE = re.compile(r'(\d+(?:\.\d+)?)" x (\d+(?:\.\d+)?)"(?=\s{2,}|\s*$)')
MODEL = re.compile(r"^\s{4,40}((?:BAA )?[0-9][0-9A-Z]{2,}(?: (?:HW|WT|SC))?)\s{3,}")

def norm_finish(prefix, code):
    return code.split("/")[0]

# The standard butt-hinge grids. Left out: pp.25-26 (swing-clear 5BB1 SC/BSC, sized by
# leaf width only) and p.30 (electric through-wire hinges, priced per TW option).
HINGE_PAGES = [*range(9, 25), 27, 28]
hinges, model = [], None
for pno in HINGE_PAGES:
    lines = pages[pno - 1].split("\n")
    labels = {}
    for i, line in enumerate(lines):
        sm = SIZE.search(line[:80])
        if sm:
            labels[i] = sm.group(1) + "x" + sm.group(2)
    blocks = []
    for i, line in enumerate(lines):
        m = MODEL.match(line)
        if m:
            model = m.group(1)
        rows = []
        for pm in PAIR.finditer(line):
            col = "steel" if pm.start() < 100 else "brass_stainless"
            rows.append({"finish": norm_finish(pm.group(1), pm.group(2)), "label": (pm.group(1) or "") + pm.group(2), "list": money(pm.group(3)), "substrate": col})
        if not rows or not model:
            continue
        cur = blocks[-1] if blocks else None
        steel = [r for r in rows if r["substrate"] == "steel"]
        # A size printed on a price row that already has one opens the next size (BAA tables).
        rowlabel = labels.get(i)
        starts = (cur is None or bool(m) or cur["model"] != model
                  or bool(steel and steel[0]["finish"] == "600")
                  or bool(rowlabel and cur["rowlabel"]))
        if starts:
            cur = {"start": i, "end": i, "size": None, "rows": [], "model": model, "rowlabel": None}
            blocks.append(cur)
        if rowlabel:
            cur["rowlabel"], cur["size"] = rowlabel, rowlabel
        cur["end"] = i
        cur["rows"] += rows
    # A size printed between rows belongs to the block whose rows span it.
    for i, size in labels.items():
        for b in blocks:
            if b["size"] is None and b["start"] <= i <= b["end"] + 1:
                b["size"] = size
                break
    for b in blocks:
        if not b["size"]:
            print(f"page {pno}: a {b['model']} block at line {b['start']} has no size; left out", file=sys.stderr)
            continue
        for r in b["rows"]:
            hinges.append({"model": b["model"], "size": b["size"], **r, "page": pno})

# Rates per hundred square inches, p.93.
rates = {}
for l in pages[92].split("\n"):
    m = re.match(r"\s+(\S+)\s+(\d{3}|BLK|CLR|P-BLK)\s+(Brass|Stainless|Aluminum|Plastic)\s+(\d+)\" x (\d+)\"\s+\$([\d.]+)\s+\$([\d.]+)\s+\$([\d.]+)\s+(\$[\d.]+|N/A)", l)
    if m:
        rates[m.group(2)] = {"substrate": m.group(3), "maxHeight": int(m.group(4)), "maxWidth": int(m.group(5)), "under8": float(m.group(6)), "8to16": float(m.group(7)), "16to36": float(m.group(8)), "36to48": None if m.group(9) == "N/A" else float(m.group(9)[1:])}

# Sizing chart, p.93: widths header, then a row per height.
chart_heights, chart_widths = [], []
txt = pages[92]
seg = txt[txt.find("Hundred Square Inch Sizing Chart"):]
for l in seg.split("\n"):
    if not chart_widths and re.search(r'inches\s+22"', l):
        chart_widths = [int(x) for x in re.findall(r'(\d+)"', l)]
        continue
    m = re.match(r'\s+(\d+(?:\.\d+)?)"\s+([\d.\s]+)$', l)
    if chart_widths and m:
        chart_heights.append(float(m.group(1)))

def formula(rate, h, w):
    """The book's price for a non-stocked plate (p.93): chart size, rounded up, x the rate."""
    H = next((x for x in chart_heights if x >= h), None)
    W = next((x for x in chart_widths if x >= w), None)
    if H is None or W is None:
        return None
    band = "under8" if h < 8 else "8to16" if h <= 16 else "16to36" if h <= 36 else "36to48"
    r = rate.get(band)
    return round(H * W / 100 * r, 2) if r else None

# 8400 stocked plates, p.92: number, size, list. The substrate label sits mid-block in the
# layout, so each row takes the page's finish whose p.93 formula price is closest to its
# stocked price (within 15%); a row no finish explains is left out.
import math
stocked = []
lines = pages[91].split("\n")
page_finishes = sorted({m.group(1) for l in lines for m in [re.search(r"(?:Brass|Stainless|Aluminum|Plastic)\s+(\d{3}|BLK|CLR)\s", l)] if m})
for i, l in enumerate(lines):
    m = re.search(r"((?:KP8400-\d\.)?KPLATE\.\d+)\s+(\d+(?:\.\d+)?)\" x (\d+(?:\.\d+)?)\"\s+\$([\d,]+\.\d\d)", l)
    if not m:
        continue
    h, w, lst = float(m.group(2)), float(m.group(3)), money(m.group(4))
    best = None
    for f in page_finishes:
        fp = formula(rates.get(f, {}), h, w)
        if fp:
            err = abs(math.log(lst / fp))
            if best is None or err < best[0]:
                best = (err, f, fp)
    if not best or best[0] > math.log(1.15):
        print(f"p.92: {m.group(1)} {h}x{w} ${lst} matches no finish's formula; left out", file=sys.stderr)
        continue
    stocked.append({"number": m.group(1), "height": h, "width": w, "finish": best[1], "list": lst, "formula": best[2], "page": 92})

out = {
    "book": {"manufacturer": "Ives", "title": "Ives Price Book 17", "effective": "2026-05-29", "r2Key": "manufacturer-catalogs/b14117b49c7deb52.pdf"},
    "hinges": hinges,
    "plates8400": {"stocked": stocked, "ratesPerHundredSqIn": rates, "chartHeights": chart_heights, "chartWidths": chart_widths, "ratesPage": 93, "optionsPage": 94, "standardOptions": ["B-CS"]},
}
json.dump(out, sys.stdout, indent=1)
