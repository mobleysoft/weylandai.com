import sys
from PIL import Image, ImageChops
def diff(a, b, box=None):
    A = Image.open(a).convert('L'); B = Image.open(b).convert('L')
    if box: A = A.crop(box); B = B.crop(box)
    d = ImageChops.difference(A, B).point(lambda p: 255 if p > 24 else 0)
    n = sum(1 for p in d.getdata() if p)
    return n, round(100.0 * n / (d.size[0]*d.size[1]), 2)
pairs = sys.argv[1:]
for i in range(0, len(pairs), 2):
    print(pairs[i].split('/')[-1], 'vs', pairs[i+1].split('/')[-1], diff(pairs[i], pairs[i+1]))
