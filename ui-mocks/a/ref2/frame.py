# Turn the clean bag art (transparent background) into an empty frame: repaint the item grid, the detail
# card's contents and the footer counter with the surface colour, so the game draws live content on top.
import sys, random, statistics
from PIL import Image, ImageDraw, ImageFilter
im = Image.open(sys.argv[1]).convert('RGBA'); px = im.load(); random.seed(3)
def med(pts): return tuple(int(statistics.median(px[x, y][i] for x, y in pts)) for i in range(3))
def fill(shapes, top, bot, y0, y1, feather=2.0, grain=3, holes=()):
    mask = Image.new('L', im.size, 0); d = ImageDraw.Draw(mask)
    for b, r in shapes:
        if r == 'poly': d.polygon(b, fill=255)
        else: d.rounded_rectangle(b, r, fill=255)
    for b, r in holes: d.rounded_rectangle(b, r, fill=0)
    mk = mask.filter(ImageFilter.GaussianBlur(feather)).load()
    X0, Y0, X1, Y1 = mask.getbbox(); X0 -= 4; Y0 -= 4; X1 += 4; Y1 += 4
    for y in range(Y0, Y1 + 1):
        t = min(1, max(0, (y - y0) / (y1 - y0))); c = [top[i] * (1 - t) + bot[i] * t for i in range(3)]
        for x in range(X0, X1 + 1):
            a = mk[x, y]
            if a:
                o = px[x, y]; k = a / 255; n = random.uniform(-grain, grain)
                px[x, y] = tuple(int(o[i] * (1 - k) + (c[i] + n) * k) for i in range(3)) + (o[3],)
GAPS = [428, 577, 725, 874]
gt = med([(x, 343) for x in GAPS] + [(x, 347) for x in GAPS]); gb = med([(x, 748) for x in GAPS] + [(x, 744) for x in GAPS])
fill([((264, 340, 1022, 752), 22)], gt, gb, 340, 752)
ct = med([(1100, 330), (1400, 330), (1240, 268), (1090, 400)]); cb = med([(1090, 640), (1420, 640), (1250, 650)])
fill([([(1086,322),(1404,322),(1414,340),(1425,500),(1432,640),(1433,730),(1420,746),(1080,746),(1070,730),(1070,340)], 'poly'), ((1086, 306, 1400, 350), 14), ((1128, 262, 1332, 312), 12), ((1061, 650, 1110, 745), 10)], ct, cb, 262, 746, 1.6, 2)
ft = med([(940, 789), (960, 789), (1150, 789)]); fb = med([(940, 820), (960, 820), (1150, 820)])
fill([((302, 785, 900, 826), 18)], ft, fb, 785, 826, 1.5, 2)
# baked active-tab pointers on the panel rim (live tabs draw their own)
for cx in (404, 942):
    fill([((cx - 18, 317, cx + 18, 340), 6)], med([(cx - 40, 322), (cx + 40, 322)]), med([(cx - 40, 336), (cx + 40, 336)]), 317, 340, 1.5, 2)
im.save(sys.argv[2])
