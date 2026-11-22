# Refine the hand-traced cut-out. The reference background is blurred while the bag is sharp, so in a band
# around the traced outline we estimate the background (normalised blur of pixels known to be outside) and keep
# only pixels that differ from it. Usage: refine.py ref.png cut.png out.png
import sys, numpy as np
from PIL import Image, ImageFilter, ImageDraw
ref = Image.open(sys.argv[1]).convert('RGB'); cut = Image.open(sys.argv[2])
A0 = cut.getchannel('A')
def grow(m, n, f):  # n passes of a 5px max/min filter
    for _ in range(n): m = m.filter(f(5))
    return m
hard = A0.point(lambda v: 255 if v > 127 else 0)
outer = grow(hard, 2, ImageFilter.MaxFilter)            # traced edge + ~4px (the trace never misses much bag)
inner = grow(hard, 6, ImageFilter.MinFilter)            # traced edge - ~12px
bgm = grow(hard.point(lambda v: 255 - v), 2, ImageFilter.MinFilter)  # surely-outside, 4px clear of the line
img = np.asarray(ref, np.float32); bm = np.asarray(bgm, np.float32) / 255
def blur(a, r): return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)
# normalised convolution at two scales, so the estimate follows background shapes but still reaches the band
B = np.zeros_like(img)
for r in (8, 20):
    w = blur(bm * 255, r)[..., None] / 255 + 1e-4
    est = np.stack([blur(img[..., c] * bm, r) for c in range(3)], -1) / w
    B = np.where((B.sum(-1, keepdims=True) == 0) & (w > .08), est, B)
d = np.sqrt(((img - B) ** 2).sum(-1))
WIN = int(sys.argv[8]) if len(sys.argv) > 8 else 15
# dark leather the colour test can't tell from the background: always bag
KEEP = [[(224,378),(232,380),(262,380),(262,500),(178,500),(190,452),(190,405),(205,398),(215,392)],   # side strap + tab
        [(265,200),(240,240),(227,262),(229,285),(242,305),(252,318),(244,332),(300,332),(300,200)]]  # underside of the flap curl
HOLE = [(726,128),(745,108),(790,98),(850,95),(900,102),(923,126)]  # inside the carry handle
HF0, HF1 = (float(sys.argv[6]), float(sys.argv[7])) if len(sys.argv) > 7 else (1.0, 2.6)
t0, t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 16, float(sys.argv[5]) if len(sys.argv) > 5 else 46
a = np.clip((d - t0) / (t1 - t0), 0, 1); a = a * a * (3 - 2 * a)
# sharpness test: the bag is in focus, the background is not. High-frequency energy, spread 4px so the smooth
# middle of a petal next to its crisp outline still counts as bag.
hf = np.abs(img - np.stack([blur(img[..., c], 1.5) for c in range(3)], -1)).mean(-1)
hfi = Image.fromarray(np.clip(hf * 20, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)).filter(ImageFilter.MaxFilter(9))
h = np.clip((np.asarray(hfi, np.float32) / 20 - HF0) / (HF1 - HF0), 0, 1)
a = a * h
o = np.asarray(outer, np.float32) / 255; i_ = np.asarray(inner, np.float32) / 255
alpha = np.where(i_ > .5, 1.0, np.where(o < .5, 0.0, a))
al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
# open (erode then dilate) to drop specks of background that slipped through
al = grow(grow(al, 1, ImageFilter.MinFilter), 1, ImageFilter.MaxFilter)
# fill pinholes inside the bag, then a soft 0.8px edge
al = grow(grow(al, 1, ImageFilter.MaxFilter), 1, ImageFilter.MinFilter).filter(ImageFilter.GaussianBlur(.8))
# crisp matte: keep what is at least half bag, trim strands thinner than ~6px, then a 0.7px anti-aliased edge
hard = al.point(lambda v: 255 if v > 127 else 0)
hard = hard.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))   # opening: drops hairs + specks
hard = hard.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))   # closing: fills pinholes
# never cut deeper than ~10px inside the hand trace (dark leather can match the background colour)
core = grow(Image.fromarray((np.asarray(A0) > 127).astype(np.uint8) * 255), 5, ImageFilter.MinFilter)
hard = Image.fromarray(np.maximum(np.asarray(hard), np.asarray(core)))
# fill enclosed holes, then trace the outer boundary and low-pass it so the silhouette is a clean curve
filled = hard.copy(); ImageDraw.floodfill(filled, (0, 0), 128)
hard = filled.point(lambda v: 0 if v == 128 else 255)
H_, W_ = hard.size[1], hard.size[0]; m = np.asarray(hard) > 0
ys, xs = np.nonzero(m); start = (int(xs[np.argmin(ys * W_ + xs)]), int(ys.min()))
N8 = [(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]
def inside(x, y): return 0 <= x < W_ and 0 <= y < H_ and m[y, x]
pts = [start]; cur = start; back = 4
while True:  # Moore-neighbour boundary tracing
    for k in range(8):
        d = (back + 1 + k) % 8; nx, ny = cur[0] + N8[d][0], cur[1] + N8[d][1]
        if inside(nx, ny): back = (d + 4) % 8; cur = (nx, ny); break
    if cur == start or len(pts) > 200000: break
    pts.append(cur)
P = np.array(pts, np.float32); n = len(P); w = WIN
ker = np.ones(w) / w
sm = np.stack([np.convolve(np.r_[P[-w:, i], P[:, i], P[:w, i]], ker, 'same')[w:w + n] for i in (0, 1)], -1)
K = 4; big = Image.new('L', (W_ * K, H_ * K), 0); dd = ImageDraw.Draw(big)
dd.polygon([(float(x) * K + K / 2, float(y) * K + K / 2) for x, y in sm], fill=255)
for poly in KEEP: dd.polygon([(x * K, y * K) for x, y in poly], fill=255)
dd.polygon([(x * K, y * K) for x, y in HOLE], fill=0)
A = np.asarray(big.resize((W_, H_), Image.LANCZOS), np.float32) / 255
# colour decontamination: edge pixels take the colour of nearby solid bag pixels instead of the old background tint
solid = (A > .97).astype(np.float32)
w = blur(solid * 255, 3)[..., None] / 255 + 1e-4
F = np.stack([blur(img[..., c] * solid, 3) for c in range(3)], -1) / w
k = np.clip((.97 - A) / .97, 0, 1)[..., None] * (w > .05)
rgb = img * (1 - k) + F * k
out = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8), 'RGBA'); out.save(sys.argv[3])
