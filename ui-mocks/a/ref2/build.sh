#!/bin/sh
# Rebuild the Bag frame from the clean art (bag-src.webp, transparent background, 1672x941). Needs Pillow.
set -e; cd "$(dirname "$0")"
python3 frame.py bag-src.webp bag-frame.png
python3 - <<'PY'
from PIL import Image, ImageFilter
f = Image.open('bag-frame.png'); f.save('bag-frame.webp', 'WEBP', quality=90, alpha_quality=90, method=6)
big = f.resize((f.width * 2, f.height * 2), Image.LANCZOS)
rgb = big.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
Image.merge('RGBA', (*rgb.split(), big.getchannel('A'))).save('bag-frame@2x.webp', 'WEBP', quality=80, alpha_quality=80, method=6)
PY
rm -f bag-frame.png
