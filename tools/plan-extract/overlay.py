#!/usr/bin/env python3
"""Draw extracted walls over a rendered page for visual verification.
usage: overlay.py <walls.json> <pdf> <page> <out.png> [dpi]"""
import json, subprocess, sys, tempfile, os
from PIL import Image, ImageDraw

walls_json, pdf, page, out = sys.argv[1:5]
dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 48
d = json.load(open(walls_json))
tmp = tempfile.mkdtemp()
subprocess.run(["pdftoppm", "-f", page, "-l", page, "-r", str(dpi), "-png", pdf, os.path.join(tmp, "p")], check=True)
png = [f for f in os.listdir(tmp) if f.endswith(".png")][0]
im = Image.open(os.path.join(tmp, png)).convert("RGB")
s = dpi / 72.0  # points -> pixels
draw = ImageDraw.Draw(im)
for w in d.get("wallList", []):
    x1, y1, x2, y2 = [v * s for v in w["px"]]
    width = max(2, int(round(w["thickness"] * d["pointsPerFoot"] * s)))
    draw.line([(x1, y1), (x2, y2)], fill=(230, 30, 30), width=width)
im.save(out)
print("wrote", out, im.size, "walls", len(d.get("wallList", [])))
