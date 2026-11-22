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
ct = med([(1100, 330), (1380, 330), (1240, 268), (1090, 400)]); cb = med([(1090, 640), (1400, 640), (1250, 650)])
# card: erase only inside its stitched border (the stitch runs ~12px in from the slanted right edge) ...
fill([([(1086,300),(1340,300),(1388,312),(1398,330),(1409,420),(1414,500),(1420,600),(1422,652),(1072,652),(1072,330)], 'poly'),
      ((1128, 262, 1332, 312), 12)], ct, cb, 262, 746, 1.2, 2)
# ... then the button band, where the buttons sit right on the stitch: erase all of it and sew the stitch back
fill([([(1068,648),(1441,648),(1442,738),(1430,747),(1080,747),(1068,735)], 'poly')], cb, med([(1150, 744), (1300, 744)]), 648, 747, 1.0, 2)
DASH = (215, 162, 118)
def sew(pts, dash=9, gap=7, w=3):
    d = ImageDraw.Draw(im); segs = list(zip(pts, pts[1:])); carry = 0.0; on = True
    for (x0, y0), (x1, y1) in segs:
        L = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** .5; t = 0.0
        while t < L:
            step = min((dash if on else gap) - carry, L - t)
            if on:
                a = (x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L); b = (x0 + (x1 - x0) * (t + step) / L, y0 + (y1 - y0) * (t + step) / L)
                d.line([a, b], fill=DASH + (255,), width=w)
            t += step; carry += step
            if carry >= (dash if on else gap) - 1e-6: carry = 0.0; on = not on
sew([(1434,646),(1436,690),(1437,715),(1435,730),(1428,743),(1415,750),(1400,752)])   # right side + corner
sew([(1066,726),(1071,738),(1083,747),(1100,751)])               # left side + corner
ft = med([(940, 789), (960, 789), (1150, 789)]); fb = med([(940, 820), (960, 820), (1150, 820)])
fill([((302, 785, 900, 826), 18)], ft, fb, 785, 826, 1.5, 2)
# baked active-tab pointers on the panel rim (live tabs draw their own): copy the clean rim from just beside them
for cx in (404, 942):
    for y in range(316, 346):
        for x in range(cx - 22, cx + 23):
            px[x, y] = px[x - 48, y]
im.save(sys.argv[2])
