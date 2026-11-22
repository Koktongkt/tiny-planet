#!/bin/sh
# Journal frame: the clean art (journal-src.webp, transparent background, 1448x1086, pages already empty) re-encoded
# at 1x plus a sharpened 2x, same as the Bag frame in ../ref2. Needs Pillow.
set -e; cd "$(dirname "$0")"
python3 - <<'PY'
from PIL import Image, ImageFilter
f = Image.open('journal-src.webp').convert('RGBA'); f.save('journal-frame.webp', 'WEBP', quality=90, alpha_quality=90, method=6)
big = f.resize((f.width * 2, f.height * 2), Image.LANCZOS)
rgb = big.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
Image.merge('RGBA', (*rgb.split(), big.getchannel('A'))).save('journal-frame@2x.webp', 'WEBP', quality=80, alpha_quality=80, method=6)
PY
