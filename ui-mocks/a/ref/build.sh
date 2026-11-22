#!/bin/sh
# Rebuild the Bag frame from the reference art. Needs python3 with Pillow + numpy.
# Swap bag-ref.png for a higher-resolution version and re-run (the traced points in cut.py/frame.py/refine.py
# are in 1672x941 pixels, so scale the image to that size first or scale the points).
set -e; cd "$(dirname "$0")"
python3 cut.py bag-ref.png bag-cut.png                       # hand-traced outline
python3 refine.py bag-ref.png bag-cut.png bag-cut2.png 22 48 1.0 2.6 15   # snap the outline to the real bag edge
python3 frame.py bag-cut2.png bag-frame.png                  # erase the printed grid, card and counter
python3 - <<'PY'
from PIL import Image, ImageFilter
f = Image.open('bag-frame.png'); f.save('bag-frame.webp', 'WEBP', quality=90, alpha_quality=90, method=6)
big = f.resize((f.width * 2, f.height * 2), Image.LANCZOS)
rgb = big.convert('RGB').filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
Image.merge('RGBA', (*rgb.split(), big.getchannel('A'))).save('bag-frame@2x.webp', 'WEBP', quality=90, alpha_quality=90, method=6)
PY
rm -f bag-cut.png bag-cut2.png bag-frame.png
