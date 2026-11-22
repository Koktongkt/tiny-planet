# Turn the cut-out bag into an empty frame: repaint the item grid, detail card and footer counter with a
# smooth top-to-bottom gradient sampled from empty spots, with feathered edges, so live UI can sit on top.
import sys, random, statistics
from PIL import Image, ImageDraw, ImageFilter
im = Image.open(sys.argv[1]).convert('RGBA'); px = im.load(); random.seed(3)
def med(pts): return tuple(int(statistics.median(px[x, y][i] for x, y in pts)) for i in range(3))
def fill(shapes, top, bot, y0, y1, feather=2.0, grain=3):
    mask = Image.new('L', im.size, 0); d = ImageDraw.Draw(mask)
    for b, r in shapes: d.rounded_rectangle(b, r, fill=255)
    mk = mask.filter(ImageFilter.GaussianBlur(feather)).load()
    X0 = min(b[0] for b, _ in shapes) - 4; X1 = max(b[2] for b, _ in shapes) + 4
    Y0 = min(b[1] for b, _ in shapes) - 4; Y1 = max(b[3] for b, _ in shapes) + 4
    for y in range(Y0, Y1 + 1):
        t = min(1, max(0, (y - y0) / (y1 - y0))); c = [top[i] * (1 - t) + bot[i] * t for i in range(3)]
        for x in range(X0, X1 + 1):
            a = mk[x, y]
            if a:
                o = px[x, y]; k = a / 255; n = random.uniform(-grain, grain)
                px[x, y] = tuple(int(o[i] * (1 - k) + (c[i] + n) * k) for i in range(3)) + (o[3],)
# item grid panel (gaps between tiles give the surface colour)
gt = med([(452, 372), (590, 372), (728, 372), (867, 372), (452, 380)]); gb = med([(452, 752), (590, 752), (728, 752), (867, 752), (452, 745)])
fill([((298, 354, 1020, 764), 24)], gt, gb, 354, 764)
# detail card: everything inside the stitched border except the two leaf sprigs in the top corners
ct = med([(1200, 292), (1210, 296), (1250, 292)]); cb = med([(1100, 660), (1300, 660), (1200, 665)])
fill([((1070, 318, 1388, 756), 14), ((1112, 284, 1318, 330), 10), ((1052, 672, 1400, 750), 22)], ct, cb, 290, 760, 1.6, 2)
# footer counter + progress bar
ft = med([(930, 792), (950, 792), (1150, 792)]); fb = med([(930, 824), (950, 824), (1150, 824)])
fill([((334, 786, 906, 830), 20)], ft, fb, 786, 830, 1.5, 2)
im.save(sys.argv[2])
# remove the baked "active tab" pointers on the panel rim (live tabs draw their own)
im = Image.open(sys.argv[2]); px = im.load()
for cx in (430, 935):
    for y in range(331, 358):
        for x in range(cx - 20, cx + 21):
            px[x, y] = px[x - 46, y]
im.save(sys.argv[2])
