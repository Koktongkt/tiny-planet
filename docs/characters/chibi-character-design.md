# Cozy Chibi character design (Tiny Planet)

In-repo design reference for Tiny Planet humans in the approved Cozy Chibi style (concept B). Taken from her (the player).

Use this when designing or implementing a human in the approved "Cozy Chibi" style (concept B). Do **not** build villagers from this document until KT asks. This is the style and implementation reference taken from her (the player).

## Character template (locked by KT, pass 12): start every new chibi here

Her current build is **the template for every future chibi character**. A new character starts from this look and these
numbers, and changes only what its concept sheet asks for (see section 4). Golden reference for her: [`ref/her-turnaround-satchel.jpg`](ref/her-turnaround-satchel.jpg).

![Approved template: turnaround](ref/her-approved-turnaround.jpg)

![Approved template: face from ten angles](ref/her-approved-face-angles.jpg)

**What is locked** (source of truth `src/art/chibi/ChibiHer.jsx`; numbers are in the head frame unless stated):

| Area | Locked choice |
|---|---|
| Face features | Pass 8 eyes; pass 10 layout (eye line `E10Y -0.0048`, `E10X -0.0009`; nose dot, mouth and blush follow); brows line width `0.0040 * s` |
| Skin | `#f3bf98` |
| Profile (nose and chin) | `MIDFACE`: an oval column `[-0.0278, 0.0397, 0.02, 0.0058, 0.014, 0.0012, 0.001]` (the step out under the eye and the flat front) and a chin ellipsoid `[-0.0345, 0.0303, 0.03, 0.0162, 0.0243, 0.0055]`; `MID_FADE = 0`. Shading and AO ignore these shapes, so the front view is just the painted nose dot. Side view: a soft step under the eye, a short flat front past the mouth, a gradual curve into the chin |
| Hair | Pass 11 continuous lobe (`flare()`, `FL 0.34`, `FL_BACK 0.25`; no side-puff spheres), helmet `RH [0.069, 0.0712, 0.0668]`, slim side locks (azimuth ±1.04..±1.42, tip -0.041), top bun unchanged |
| Ears | Small flat skin ovals `[0.0042, 0.0122, 0.0076]` at `EAR {x 0.068, y -0.0165, z 0.0025}`, turned forward 0.75, no ink |
| Body | Pass 3/4 proportions; ankle `anY 0.044`, `leg 0.96`; boots `bootH 1.45`, `bootL 1.04`, `soleY`, `bootShaft`, shoe `#83492a` with a painted sole and welt |
| Outfit | Shirt `#f7ead3`, denim `#4271b8`, scarf `#d9503f`; flat rolled sleeve and jeans cuffs (`SLEEVE_GEO`, `CUFF_GEO`); ribbon scarf tails; painted seams (`outfit.seams`) |
| Satchel | `satchel.js`, `BAG_S 0.079`, wide flat strap |
| Cost | Studio 26 draw calls; head 19 calls / ~57.2k tris in the face close-up |

**How to judge a new character against the template**

1. Run the dev server (`npm run dev`) and take the standard review set with `node tools/chibi-shots.mjs <outDir>`: a four-angle turnaround plus the face from ten angles (front round to the side on both sides, a face-framed side, and two downward game-camera views). Build the same two sheets as above for the new character and show them side by side with its concept sheet and with her sheets.
2. Always check 3/4 and deep 3/4 as well as the side. Every profile change in this pass first went wrong in 3/4 (a beak, then a muzzle). Narrow face shapes stick out in 3/4; keep any profile shape broad (rx >= 0.02) and judge it from all ten angles.
3. Offer KT small, equal steps to pick from rather than one guess (the profile here was chosen from a ladder of 0.0006 steps). Show options side by side; commit only the one KT picks.
4. Check the game camera and a walk cycle before calling it done (hair through shoulders, bag against the swinging arm).

## Approved baseline

- **Pass 8** (face and eyes): live on `main` as merge `56a09bd`. Face layout is pass 6 subtle (`FT = 1`); the iris, crescent and lid line are pass 8.
- **Pass 9** (side buns): live on `main` as merge `efc30e1` (from branch `chibi-her-buns`, commit `a701b8a`). Face, eyes, top bun and fringe are unchanged from pass 8.
- **Pass 10** (turnaround sheet, satchel + hair/face/body details): golden reference [`ref/her-turnaround-satchel.jpg`](ref/her-turnaround-satchel.jpg); before/after [`ref/pass10-turnaround-compare.jpg`](ref/pass10-turnaround-compare.jpg). Approved by KT as part of the template (see below).
  - Satchel (`src/art/chibi/satchel.js`, via the optional `ext.Bag` hook): top handle, stitched flap with two buckled straps, side pockets with a daisy and a scroll, plaid blanket roll with two ties, gold compass charm. One vertex-coloured cel mesh + one ink hull (still 2 draws). Placement `BAG_AT` in `ChibiHer.jsx`; flat wide strap via `ext.strap[6]` / `ext.strapC`.
  - Face: eye line lower (`E10Y = -0.0048`) and a touch closer (`E10X = -0.0009`); nose, mouth and blush follow (`F10` scales it).
  - Hair: wider, rounder dome (`RH = [0.069, 0.0712, 0.0668]`), broad straight side locks from azimuth ±0.9 down to the jaw (they frame the face as on the sheet), fuller back volume, side puffs stretched front-to-back so they read as the bob's curled hem. Ears are still left out.
  - Body: sheet palette (shirt `#f7ead3`, denim `#4271b8`, scarf `#d9503f`), rolled sleeve cuffs (`ext.sleeveGeo`), broad notched scarf tails hanging down (`ext.tailGeo`, `ext.tails`, `ext.tailX`), painted overalls seams (`outfit.seams`: bib pocket rim, fly, hip pockets, bib top). All hooks default to the old look for villagers.
  - Cost: draw calls unchanged (studio 26); her tris ~59.4k -> ~64.7k; startup entry +0.3 KB gz (hooks only).
- **Pass 11** (KT feedback on pass 10): before/after [`ref/pass11-turnaround-compare.jpg`](ref/pass11-turnaround-compare.jpg). Approved by KT as part of the template (see below).
  - Hair: the separate side-puff spheres are gone. The helmet's lower band flares out horizontally (`flare()`, round profile, `FL` at the sides easing to `FL_BACK` behind, zero across the face and side locks), so the sides and back are one continuous lobe with one ink hull; the flare rides the side springs (`aW` 0/1). Rows bunch toward the hem (`NT = 18`), denser azimuths behind. Do not carve a niche for the ears (it folded the shell into ink shards).
  - Ears are back (skin, `aSkin = 1`, `EAR`), resting on the hair just behind the side locks, above the flare.
  - Rolled sleeves and jeans cuffs are flat folded bands (lathe profiles, `SLEEVE_GEO` band and `ext.cuffGeo`), not round donuts.
  - Satchel `BAG_S` 0.1 -> 0.088.
  - Boots: optional body knobs `anY` (ankle up 0.01, with `leg` 1.06 -> 0.96 so the hip stays put), `footY`, `soleY` (flat sole cut), `bootShaft` (chunky ankle); `bootH` 1.45, `bootL` 1.04, `shoeY` 0.05, shoe `#83492a`; a darker painted sole band with a welt line (`outfit.seams`). All knobs default to the old foot.
  - Cost: draw calls unchanged (studio 26); her tris ~64.7k -> ~67.5k; startup entry +0.2 KB gz.
- **Pass 12** (KT feedback on pass 11): before/after [`ref/pass12-turnaround-compare.jpg`](ref/pass12-turnaround-compare.jpg). Approved by KT as part of the template (see below).
  - Kept pass 11's continuous lobe (KT preferred it over the pass-10 puffs after trying both).
  - Side locks slimmer again (azimuth ±1.04..±1.42, tip -0.041).
  - Ears small and flat against the head, turned forward (`EAR`, radii 0.0042 / 0.0094 / 0.0072), not round balls.
  - Nose (12c, KT: no bump; use the face contour, as in the sheet's side view): `MIDFACE` in `ChibiHer.jsx` is a soft swell of the mid-face around the nose, blended into the head (body knob `midface`, also in the decal's `headSDF`). In profile the line dips under the eye, comes out to a rounded nose point and slopes back to the mouth and chin. The body bake shades it with the normals and AO of the head without the swell (`S.mf` is skipped there), so from the front the face looks exactly as before; only the silhouette and its ink change.
  - Nose 12h (KT drew the profile line): straight down from under the eye, a sharp step out, a vertical front that stays forward down past the mouth, then a gradual curve into the chin. `MIDFACE` entries are ellipsoids `[y, z, rx, ry, rz, k]` or oval columns `[y, z, rx, hy, rz, k, r]` (the 7th value is an edge radius); the step and the vertical front are an oval column, a tall ellipsoid under it starts the chin curve. Same in the body bake (`ocol`) and the decal's `headSDF`. The bake grid (~0.004 head units) softens the step into a short ramp. 12i/12j (KT): the chin ellipsoid is fuller so below the mouth the profile rolls back into the chin in one continuous arc; 12j halves the extra fullness (`[-0.0345, 0.0376, 0.0134, 0.0162, 0.0203, 0.0055]`; the 12i chin sagged).
  - 12k (KT: 3/4 looked like a bird): the narrow nose box and chin stuck out of the face like a beak in 3/4. Now the step is an oval column (wide cross-section, rx 0.02, so its sides round back into the cheeks) and the chin ellipsoid is wide (rx 0.03): a broad flat lower face, as in the sheet's 3/4, with the same profile. Judge any MIDFACE change from 3/4 as well as the side.
  - 12l (KT: 3/4 a bit like a monkey): softer and less forward. Column rx 0.016, edge r 0.002, blend k 0.0035, a touch further back; chin ellipsoid 0.0014 further back with a softer blend (k 0.0075). The profile keeps its step, vertical front and chin curve, slightly softer.
  - 12m (KT: smoother in 3/4, side view untouched): every MIDFACE shape recedes by `MID_FADE * x^2` (16, head frame; body knob `midfaceFade`) away from the centre line, and the shapes are wider (rx 0.03 / 0.038) so the fade, not their edges, sets how they meet the cheeks. Zero on the centre line, so the profile is exactly unchanged. To soften 3/4 further, raise `MID_FADE`; it never changes the side view.
  - 12n tried `MID_FADE` 28; KT kept 16. Limit for later: a strong fade turns the swell into a thin keel down the centre line, whose side becomes a real contour in 3/4 and picks up a line of ink by the mouth (faint at 30, plain at 34+), and at 45+ the keel is finer than the bake grid so the profile weakens. Thinning the hull's ink on the keel's flanks was tried and broke the profile outline; do not repeat it.
  - Locked (KT): the 12k shapes moved back 0.0033 (`MIDFACE` nose z 0.0397, chin z 0.0303), `MID_FADE = 0`. Picked from a ladder of 0.0006 steps; this is halfway between options C and D. The 12l softening and the 12m-12n fades remain available (raise `MID_FADE` to ease the swells into the cheeks in 3/4; it never changes the profile).
  - Ears longer vertically (ry 0.0122); brows a touch thicker (line width 0.0040).
  - Skin `#f3bf98` (warmer, deeper peach measured off the sheet; was `#f7d3b8`).
  - Satchel `BAG_S` 0.079.
- Source of truth: `src/art/chibi/ChibiHer.jsx` and the optional hooks in `src/GhibliPerson.jsx`.
- Canonical picture: [`ref/her-B-chibi.jpg`](ref/her-B-chibi.jpg).
- Approved in-game eye and bun shots: [`ref/pass8-eye-closeup.jpg`](ref/pass8-eye-closeup.jpg), [`ref/pass9-front-compare.jpg`](ref/pass9-front-compare.jpg).
- Cast and villager concept sheets (per-character hair, colours, age, outfit — not a licence to start them): [`ref/chibi-sheet-main-cast.jpg`](ref/chibi-sheet-main-cast.jpg) (Her, Grandma Fuku, Professor Hoshino, Grandpa Ishi) and [`ref/chibi-sheet-villagers.jpg`](ref/chibi-sheet-villagers.jpg) (Kiko, Gonta, Mr. Tanabe, Momo, Hana, Daikichi). Ishi's sheet has a stray bun glitch; do not copy it.

These images are documentation only. They are not imported by the game and are not part of the app bundle or the GitHub Pages build.

![Concept B — her](ref/her-B-chibi.jpg)

![Pass 8 eye close-up](ref/pass8-eye-closeup.jpg)

![Pass 9 front compare](ref/pass9-front-compare.jpg)

![Main-cast style sheet](ref/chibi-sheet-main-cast.jpg)

![Villager style sheet](ref/chibi-sheet-villagers.jpg)

## 1. Style rules

**Proportions.** About **2.5 heads**. Head : torso : legs ≈ **42 : 36 : 22**. Soft barrel torso, short thick limbs, chunky round boots, mitten hands. Her shipped body knobs:

```
H: 0.89, head: 1.45, torso: 1.13, leg: 1.06, girth: 1.25, chestW: 1.12, bellyZ: 0.86,
arm: 0.92, armR: [1.12, 1.4, 1.5], armA: 0.5, shX: 1.26, hand: 1.2,
legR: 1.28, legX: 1.06, foot: 1.4, bootW: 1.5, bootH: 1.22, bootL: 0.98
```

Forearm is about two-thirds to three-quarters of the puff-sleeve width. Do not return to the old adult ratios (`head: 0.84`, `leg: 1.55`). Age is a modest height / girth / hunch change inside this chibi language, not a stretch back to those ratios.

**Head / face shape.** Soft **U**, not a sideways mochi puff. One centred jaw ellipsoid blended into the head; the chin must be smooth (two cheek blobs left a dip / double bump). In the head frame:

```
CHEEK = [0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]  // x, y, z, rx, ry, rz, smin k
ext.knot = [0, -0.023, 0.014, 1.6]                       // scarf knot, just under the chin
```

Approved shape vs the concept (W = hair-silhouette head width, FH = bang tip → chin): face height **0.398 W** (ref 0.397); width at the eyes **0.634 W**; at the mouth **0.599 W**; 10% above the chin **0.425 W** (a touch narrower than the concept's 0.458, accepted).

**Face layout.** Features sit slightly **smaller, higher and closer together** than a literal trace of the concept (KT, pass 6). Tweak scale `FT = 1` — do not ship the 1.5 "stronger" trial. Shared constants, used by all four expressions:

```
FDY = 0.0022 * FT,  FDX = 0.0032 * FT,  FS = 1 - 0.09 * FT
EYE = { x: 0.0278 - FDX, y: -0.0153 + FDY, rx: 0.0116 * FS, ry: 0.0127 * FS }
    = { x: 0.0246, y: -0.0131, rx: 0.01056, ry: 0.01156 }   // at FT = 1
```

Approved landmarks (pass 6 / 8, `FT = 1`). Deltas from the concept are intentional; do not "correct" them back.

| landmark | concept | approved |
|---|---|---|
| eye centre \|x\| (×W) | 0.161 | 0.145 |
| eye centre y (×FH) | 0.442 | 0.403 |
| eye width × height (×W) | 0.144 × 0.154 | 0.128 × 0.141 |
| inter-eye gap (×W) | 0.183 | 0.163 |
| brow y (×FH) | 0.067 | 0.061 |
| mouth y (×FH) | 0.735 | 0.693 |
| mouth width (×W) | 0.090 | 0.091 |
| blush centre \|x\| (×W) / y (×FH) | 0.225 / 0.687 | 0.207 / 0.640 |
| blush size (×W) | 0.098 | 0.092 |

Keep the brows under the bang tips. Eye→mouth gap is **0.290 FH** (concept 0.302).

**Eyes (exact pass 8 recipe — keep this for everyone).** Round cream-white sclera `#fffaf4`. The iris is a large near-black brown ellipse filling most of the eye, **pushed toward the nose** so a white crescent stays on the outer side.

- Centre: `ix = x - sd * RX * 0.22`, `iy = y + RY * 0.02`. Size: `IX = RX * 0.78`, `IY = RY * 0.97`. Outer crescent ≈ **22% of eye width** at mid-height, tapering to nothing at the top and bottom; the iris touches the nose-side edge.
- Fill: edge ring `#1a110d`; inner 0.9 ellipse, linear `#1e1410` (top) → `#2a1a12` from 55% down; warm lower glow `#6b4430` (alpha 0.85 → 0.5 → 0) in an ellipse `0.66 IX × 0.40 IY` centred at `+0.70 IY`. No separate pupil, no second light-brown band.
- **One** highlight only, pure `#fff`, radius `0.34 RX` at `(+0.30 IX, -0.36 IY)` — upper right on both eyes. No lower-left dot, no extra excited sparkle.
- Lid: an **open tapered upper band**, not a closed ring. Angle `-0.35` (nose-side top) over the top to `-π - 0.45` (outer side, ~43% below centre). Max thickness `0.2 RY` (35% outside / 65% inside the eye edge); tapers in over the first 16% and out over the last 40%; heaviest at the outer-upper corner; mirrored per eye (`sd`). The rest of the eye gets only a faint soft boundary `rgba(58,34,26,.28)` at width `0.0005 * s`.
- Closed lids (blink / sleepy): a thick downward-curved lash in ink `#1e1410`, no iris. Excited open eyes scale `1.05` and do not grow a second highlight.
- Must stay readable at game-camera distance and on the **640 px** mobile atlas. See [`ref/pass8-eye-closeup.jpg`](ref/pass8-eye-closeup.jpg).

**Brows, blush, nose, mouth.** Short, thick, softly arched brows `#3b2621`, round ends, line width `0.0034 * s`, tucked just under the bangs (excited / sleepy / rest shift the brow y only slightly: 0.0108 / 0.0088 / 0.0098, plus `0.0004 * FT`). Blush: soft saturated pink ovals `rgba(244,146,140,…)` under the outer eyes, radius `0.0105 * s`, slightly flattened (`ry = 0.86 r`). Nose: a tiny warm dot `rgba(232,148,128,.9)` at `(0, -0.0211)`. Mouth: a small soft U (happy / blink) or a little frown (sleepy) in `#c0533f`; excited is an open D with tongue `#a3403a` / `#ef8076`. Keep the mouth clustered with the eyes.

**Hair.** One sculpted helmet plus clumps, merged to **one cel mesh + one ink hull**. Dark brown `#3b2a22` (shader base `#432c22`, sheen band `#7a5641`). Construction in the head frame:

- Helmet ellipsoid `RH = [0.0662, 0.07, 0.0655]`, centre `[0, 0.003, -0.0045]`, `helmetGeo(NT = 10)`. Hair hangs **straight down** below the equator (it does not hug the jaw). Fringe tips tuck onto the forehead so no double ink line shows under the bangs.
- Fringe from `LOCKS`: three centre locks with a visible but shallow part, outer locks curving down over the temples, plus face-framing side locks down to the cheeks in front of the side buns (`a` from ±1.08 to ±1.40, tip Y `-0.034`). Painted grooves between locks; ink along the fringe lip (`aSkin` 0.47–0.49 → `#2b1a14`).
- **Top bun:** sphere at `[0, 0.0715, -0.008]`, radii `[0.0168, 0.016, 0.017]`, plus a small wrap ring. Leave this as-is unless KT asks.
- **Side buns (pass 9, `PT = 1`):**

| | pass 8 (live before 9) | pass 9 (approved) |
|---|---|---|
| centre | (±0.0615, -0.0270, -0.020) | (±0.0600, -0.0310, -0.014) |
| radii x / y / z | 0.021 / 0.024 / 0.022 | 0.0254 / 0.0259 / 0.0255 (~+21 / +8 / +16%) |

  From the **game camera** they must sit at the **blush-to-mouth line**, not at eye level. A straight ortho front view is misleading: buns that sit behind the head centre are lifted by the downward camera. Pass 9 moves them forward (`z + 0.006`) as well as slightly down. Do not go lower or larger — the 1.5× trial clipped the shoulders. See [`ref/pass9-front-compare.jpg`](ref/pass9-front-compare.jpg).
- Ears were removed; they poked through the side locks. Only re-add them if they stay hidden or are carved into the lock.

**Ink, toon, outfit.** Shared inverted-hull outline, `uT = 0.0042`, colour `#3b2621`. Face and lash ink `#1e1410`. Cel / toon shading only (sun + warm light, cool-warm shade tint, a little rim). Flat, limited palettes; no PBR, no busy trim that costs a draw. Her outfit is simple overalls: skin `#f7d3b8`, cream top `#fbf6ec`, blue bib `#4f7cc4` (`bibW: 0.042`, `waistUp: 0.04`), light-blue rolled cuffs `#6f98d4`, brown boots `#7a4a2e` (`shoeY: 0.036`), two yellow buttons, red scarf `#e0614f`, soft satchel `#a8703f` with a flap and a cross-body `ext.strap`. A clasp button was skipped to save a draw.

## 2. Technical recipe (this codebase)

Her is the same SDF soft-body, marching-cubes bake and GPU skin as every villager (`GhibliPerson` `Character`, same bones and poses). The chibi look is a **lazy chunk**: `src/art/chibi/ChibiHer.jsx`, prefetched from `App.jsx` in parallel with boot (`const chibiMod = CHIBI ? import(...) : null`). `?chibi=0` keeps the old traveller look. Nothing from this file may land in the startup entry.

**Face.** Canvas atlas, drawn once in `drawFaces` — no image file. Decal region `FX = 0.052`, `FY0 = -0.047`, `FY1 = 0.019`; 2×2 of `happy`, `blink`, `sleepy`, `excited`. Atlas **1024** on desktop, **640** on coarse-pointer (`TOUCH`). Texture: `SRGB`, **anisotropy 8**, trilinear mips (`LinearMipmapLinearFilter`). One transparent decal mesh (`renderOrder 2`), `uCell` selects the expression. The decal grid (`NX = 30`, `NY = 22`) is projected onto the same head SDF as the body, then lifted a hair.

**Expressions + blink.** Default `happy`. `excited` when `st.act` is in `{wave, play, reel, pick, pet, photo_wave, photo_peace, photo_hold_fish, photo_twirl, photo_kneel}` and `actW > 0.3`. `sleepy` when napping, or `T.night > 0.7` and idle > 4 s, or idle > 25 s. Auto-blink: `blinkT` resets to `2.4 + random * 2.6` s; if `blinkT < 0.12` and not sleepy, show `blink`. Debug: `?face=` or `window.__chibiFace`.

**Shared hooks.** New `body` / `outfit` / `ext` fields in `GhibliPerson.jsx` (`cheek`, `bellyZ`, `chestW`, `armA`, `armR`, `shX`, `legX`, `legR`, `bootW/H/L`, `bibW`, `waistUp`, `ext.ring`, `ext.strap`, `ext.bagGeo`, `ext.bagC`, …) are **optional and default to the old constants**. Villagers must not change when these hooks exist. After a chibi edit, confirm `?chibi=0` still matches the previous traveller (calls, tris, and pixels within run-to-run noise).

**Perf.** Official caps live in `tests/perf/budget.mjs` / `budget.json`. Startup size is **gzip level 9** of the entry chunk, the way CI measures it.

- Startup: target **100 KB**, fail at **110 KB**. Never put chibi code in the entry; her lazy chunk is about 5.8–6 KB gz. (Main was already ~72 KB after earlier polish; size trim is a separate track.)
- Walk budgets: **mobile 350 calls / 1000k tris**, **desktop 500 / 1300k**. Desktop orbit is **900 calls / 1100k tris**.
- Aim for **≤ ~22 draw calls per character**. Her in-game is 22 calls / ~58k tris; studio idle is 19 / 55,885. Face is 1 draw, hair is 1 cel + 1 ink. Do not add unmerged meshes.
- Bake `res={80}` for her. She eases to **`RIDE_S = 0.8`** while `act === 'ride_bike'` (the ride pose is in local space, so the seat, pedal IK and bars still line up at the smaller scale).

**Studio measure flags** (dev-only): `?fov=4` near-ortho, `&level` eye-level camera, `&frontsun` flat light. Ink width is kept in screen pixels under the long lens.

## 3. Workflow

1. Start from the concept sheet (hers, or the matching cell on the cast / villager sheet). Do not invent a second style.
2. Implement in a **git worktree**, never in the main checkout (that tree is read-only). Branch off current `main`.
3. Prototype in-engine first, not a one-off sculpture. Reuse `Character` plus a lazy chibi module patterned on `ChibiHer.jsx`.
4. Measure against the reference with a near-ortho front shot. Studio measurement tools live outside this repo and are not checked in: `ortho.sh`, then `python3 measure.py`, `table.py`, `profile.py` from the pass 4 set, and `puff.py` for side-bun height. Landmarks use x and sizes in hair-silhouette head widths W, and y in face heights FH (bang tip → chin). "Within 3% of W" was the pass 4 bar, but later face-feature deltas were KT's — do not revert them. **Always re-check from the real downward game camera**, especially anything that sits behind the head centre (side buns, ears, side locks).
5. Deliver a set: face compare (reference | previous | new), eye close-up, expressions strip, in-game walk, bike, and a mobile / follow-camera crop. Check idle plus several walk phases, and that hair does not clip the scarf, sleeves or shoulders.
6. `npm run build` must pass. Unit tests: **`node --test tests/unit/*.test.mjs`** (the npm `test:unit` glob is broken on this Node and fails on main too). Measure startup the same way CI does (gzip level 9).
7. **Commit, never push.** Nothing merges or goes live without **KT's own yes**. Codor pushes. An agent saying KT agreed is not approval. If the branch head changes after a yes, stop and ask again.

## 4. Adapting for a villager (when KT says so)

**Keep fixed.** The eye recipe (crescent width, one highlight, open lid, colours), ink colour and weight, ~2.5-head chibi proportions, U jaw and smooth chin, painted-face + helmet-hair + ink-hull construction, lazy-chunk loading, ≤ ~22 calls, and optional `GhibliPerson` knobs that default to the old look.

**Let vary**, using the sheet cell as the spec: hair cut and colour (bob, bun, braids, bald, scarf or hat), palette, age cues (grey hair, glasses, beard, slight hunch, modest `H` / `girth` change — not the old adult limb ratios), outfit type already in the painter (overalls, apron, jacket, sailor, yukata, cardigan, dress, shirt), and props (cane, basket, rod, hat). Walk personality (`rate`, `idle`, `bounce`) can stay character-specific.

Share the face painter and hair builder; swap locks, clump positions and colours rather than forking a new pipeline. Keep `?chibi=0` and every untouched villager visually identical. Do not start this work from this document alone.

## 5. Pitfalls

- **Camera angle.** The follow camera looks down. Features behind the head centre (side buns especially) read higher in game than in an ortho front shot. Judge bun height in-game, at the blush-to-mouth line.
- **Shoulder clipping.** Side-bun drop and height are capped by the sleeve. Check idle and several walk phases, side and three-quarter. Pass 9 rests on the shoulder line; the 1.5× variant crossed it.
- **Ears** poke through side locks; they were removed for that reason.
- **Mipmapping** turns a small second highlight into noise and can swallow a weak crescent. Keep one large highlight (~34% of eye width), anisotropy 8, and proof it on the 640 px atlas and at game distance.
- **Closed eye rings** look wrong; end the lid partway down the outer side.
- **Two cheek blobs** make a double chin; use one jaw ellipsoid and a soft smin (`k = 0.016`).
- **Draw-call creep.** Merge hair clumps; do not add clasp buttons, extra ear meshes or unmerged hats if they blow the ~22-call budget. The old traveller was 33 calls; do not regress toward that.
- **Startup.** Chibi code stays lazy. Measure gzip level 9, not a looser setting (that is how a 72.55 KB entry was once reported as 74.39).
- **Tests.** Use `node --test tests/unit/*.test.mjs`, not `npm run test:unit`.
- **Studio gaps.** `?act=` has not been reliably switching `photo_*` poses; do not claim those were verified unless you have frames. Bike checks were on the branch's then-current `bicycle.glb`.
- **Side locks** can still read as flat dark panels in close-up; the concept wraps more softly. Fix later if KT asks, not as a drive-by.
- Worktrees only; commit and stop; KT's yes, then Codor pushes.

## 6. Pets (Cozy Chibi pets: Pip and Mochi)

Concept: [`ref/pets-chibi-concept.jpg`](ref/pets-chibi-concept.jpg) (top row Pip the Shiba, bottom row Mochi the Siamese). Approved state: [`ref/pets-final.jpg`](ref/pets-final.jpg); KT's passes are recorded in the `ref/pip-*` and `ref/mochi-*` sheets.

![Pets concept](ref/pets-chibi-concept.jpg)

**Construction.** The pets keep the procedural `Quadruped` rig (`src/pets/Quadruped.jsx`) for motion only; the look lives in per-species modules built on `src/pets/sdfKit.js`:

- One smooth mesh per head and per torso, meshed from a soft-blended SDF (`starMesh`: rays from an inside point, welded and relaxed). Ears are part of the head shape (round cones, smooth-unioned), and the torso grows four short leg roots, so ears and legs grow out of the body with no seams. Legs are a shared smooth column whose ink outline stops inside the root.
- Coat patterns live in the fur shader (`patchFur`), so their edges stay crisp at any distance: Pip's cream urajiro, bib, belly and thighs; Mochi's mask, ear insides, whisker stripes, back stripes, chest ruff and socks.
- Faces are a painted canvas decal projected from the front (`faceDecal`, same idea as her face), a 2x2 atlas of eyes open/shut x mouth open/shut chosen from the pose. Shared eye (`paintEye`): cream-white eye, brown iris pushed toward the nose (white on the outer side only), ink rim and upper lid, one highlight.
- Small 3D noses keep the profile. Mochi's tail is a smooth tube rebuilt each frame along the springy tail chain; Pip's is a fat spiral with the swirl painted on.

**Pip (`shibaHead.jsx`, `shibaBody.jsx`).** Orange `#e07f30` / cream `#f6d6a8`. Wide skull, higher soft cheek bumps, fuller lower cheeks and chin; in profile the black nose is the most forward point and the face drops straight down from it to the chin. Shorter, wide-based ears with pink insides. Orange back, flanks and hind thighs; slim cream bib and belly; cream front legs.

**Mochi (`catHead.jsx`, `catBody.jsx`).** Cream `#f0cc98`, points `#6e4733`, socks `#7a4e36`. Mask: a point high on the forehead, a ring round each eye flowing smoothly into short wing tips, one smooth curve down to below the mouth. Bold whisker stripes under the wings; big ears turned slightly out; small white tufted chest ruff on the front of the chest; brown back stripes; thin ringed tail with a dark tip. The nose is small and dark on the mask (KT: leave as is for now).

**Pitfalls.** Never let a pattern edge reach zero width (it leaves a hairline; guard with a minimum width). Never write `smoothstep` with reversed edges (undefined in GLSL). When splicing GLSL into the shared shader, end the splice on a fresh line. Ear-aimed rays must blend their start points continuously, or the head cracks or folds between the ears.

**Perf.** Fewer draw calls than the old sphere-built pets (dog sitting 379 -> 290, cat petting 258 -> 172); startup entry unchanged. Dev studio: `/petstudio.html?pet=pip|mochi` with `&head`, `&prof`, `&one&yaw=`, `&pose=sit|lie`.

## 7. Grandpa Ishi (draft, pass 1)

Concept: [`ref/ishi-character-sheet.png`](ref/ishi-character-sheet.png). Pass 1 vs the sheet: [`ref/ishi-pass1-compare.jpg`](ref/ishi-pass1-compare.jpg).
Dev only, like Fuku and Hoshino: `?view=charstudio&dev=chibi-drafts&char=ishi&still` (`&cast` shows all four). The game still renders the old grandpa.

- Code: `src/art/chibi/ChibiIshi.jsx`, on the shared pipeline (`castFace.jsx` kind `ishi`, `castHair.js`). Motion profile `ISHI_MOTION` in `motion.js` is a placeholder; no animation pass yet (still pose only, like the other drafts).
- Head: bald (the body bake's skin), white top knot with a wrap ring. Brows (4 puffs each), round nose and broad mustache (4 lobes each side) are 3D lumps placed on the face surface (`surfZ` marches `headSDF`), merged with the knot and big forward-turned ears into one hair mesh + one ink hull. A per-vertex `aInk` thins the hull on the face pieces (0.38) so the mustache does not grow a heavy black underside.
- Face atlas (`kind: 'ishi'`): no painted brows, nose or mouth; three soft forehead lines and eye-corner crinkles; the excited cell paints a small open mouth under the mustache.
- Outfit: `openJacket` painter (navy haori `#2d3548` to the thigh, cream robe `#efe2c8`, brown trousers `#4a3e34`), `bare` legs below mid-shin, `shoe` = skin. 3D: crossed robe collar, a brown sash across the opening, sandals on the foot bones (soles under the raised `footY`/`soleY`).
- Still pose: chest-parented wide haori sleeves with a dark sleeve mouth; gnarled cane in his right hand standing by the foot; pipe in his left in front of the belly.
- Cost: studio 20 draw calls / ~46k tris.
- Open items for KT: haori is painted on (tight, not the sheet's loose boxy drape); shoulders show small stubs from the hidden skinned arms (same as the other drafts); no animation.

### Ishi pass 2 (KT: face first; scalp vs face contrast; follow the head and face shape)

Before/after: [`ref/ishi-pass2-face-compare.jpg`](ref/ishi-pass2-face-compare.jpg).

- **Scalp colour.** The shading bake's AO adds a hidden hair-helmet ellipsoid over the skull, so a bald scalp was baked as if under hair and came out dark orange. New opt-in body knob `bald: true` leaves it out (default unchanged for everyone else). The scalp now shades like the face.
- **Head shape**, measured off the sheet's front and side views with the eye size as the scale (eyes, brows and mustache as fractions of head height: brows 0.375, eyes 0.615, nose 0.71, mustache 0.75-0.92; height : width ≈ 1.0):
  - New opt-in knobs in `spec()`: `headS` (skull radii scale) and `cranium` (an extra dome ellipsoid blended into the skull, head-frame units). Ishi: `headS [0.965, 0.98, 1.07]`, `cranium [0.014, -0.004, 0.048, 0.038, 0.054, 0.012]` (a broad round crown; stretching the skull instead made the top an egg point), jaw `[0, -0.029, 0.010, 0.046, 0.032, 0.034, 0.022]` (broad, round lower face).
  - `castFace.jsx`: `makeHeadSDF({ headS, cranium, cheek })` and `makeFaceGeo(sdf)`; `makeFace({ shape })` projects the decal onto that head. Defaults are the old constants, so Fuku and Hoshino are unchanged.
- **Face pieces** rebuilt as chains of overlapping lumps along a curve so the outlines are smooth: brows are thick crescents set high and wide (x 0.0175-0.044), the outer end drooping; the mustache is two full lobes (11 lumps each) from under the nose out to small flicked tips; the nose is a wider ball with a fine outline. Ears are bigger, lower (nose height) and further back, with an inner lump whose fine ink reads as the fold. The top knot moved back a little.
- Cost: still 13 calls in the face close-up; tris ~43k -> ~57k (similar to her face close-up).
- Not changed: the body's ink hull is thicker under the jaw than the sheet's thin outline (shared by every character).

### Ishi pass 3 (KT: follow the mustache closely; the ears are wrong)

Before/after: [`ref/ishi-pass3-compare.jpg`](ref/ishi-pass3-compare.jpg).

- **Mustache**: traced off the sheet (`MUS_R` in `ChibiIshi.jsx`, head frame): one bell-shaped piece whose top edge hugs the sides of the nose and slopes down to pointed outer tips, a feathery underside of strand points and a V notch in the middle. Each half is a closed puff of rings shrinking from the outline to a centre, domed up to 0.0088 under the nose (the sheet's side view: it stands out nearly as far as the nose), thinner toward the tips. A flat extrude did not work: its few big cap triangles let the rounded face poke through.
- **White hair shading**: the shared hair shader shaded everything with a warm brown, so the white mustache's underside came out peach and looked like skin showing through. `makeHairMat(..., shade)` takes an optional shadow tint (default unchanged); Ishi uses a light cool grey `[0.80, 0.80, 0.85]`, as on the sheet.
- **Ears**: a flat C lying against the side of the head at nose height, set well back (`EAR` y -0.025, z -0.008), standing 0.0068 off the head and turned forward 0.62 so the bowl shows from the front: a flat disc, a thick rim curling round the back and top (opening toward the face), a small inner curl, and a darker warm bowl. The bowl uses a new hair-shader skin shade: `aSkin` 0.5-0.9 is a darker skin (1 stays plain skin, so Fuku's and Hoshino's ears are unchanged).
- Face pieces are now placed on the real baked surface (`sdf` from `GhibliPerson.jsx` is exported for this); it matches the head SDF on the face, so nothing moved.
- Cost: face close-up 13 calls / ~53k tris.

### Ishi pass 4 (KT: mouth to chin fuller with a curved contour, not slanting in right after the nose; ears point up)

Compare: [`ref/ishi-pass4-compare.jpg`](ref/ishi-pass4-compare.jpg).

- **Chin**: new opt-in body knob `chin` (same form as `cranium`: `[y, z, rx, ry, rz, k]` in the head frame, blended into the skull and shaded with it; `makeHeadSDF` takes it too). Ishi: `CHIN [-0.049, 0.030, 0.027, 0.015, 0.021, 0.012]`, and the jaw moved forward (`JAW` z 0.010 -> 0.019, rz 0.034 -> 0.040). In profile the face now drops nearly straight from the nose base to a full round chin, then curves back under to the neck, as in the sheet's side view (before, the line ran diagonally from the nose to the throat). The jaw ellipsoid alone cannot do this: its front-bottom is always a rounded slope.
- **Ears**: egg-shaped with the broad end up (wider at the top, narrowing to the lobe), the top flaring out from the head and the lobe tucked in (`rotateZ -0.27` in the ear frame), standing nearly upright (`rotateX -0.10`). Before, they stood out most at the bottom and read as drooping.

### Ishi pass 5 (KT: fuller cheeks, slightly round at the sides; forehead lines higher, curving upward, fainter)

Compare: [`ref/ishi-pass5-compare.jpg`](ref/ishi-pass5-compare.jpg).

- **Cheeks**: jaw wider and rounder (`JAW [0, -0.030, 0.017, 0.053, 0.033, 0.041, 0.026]`, was rx 0.046, k 0.022), so the lower sides of the face bulge gently (about 0.9 W across at the mustache, as on the sheet).
- **Forehead lines**: the face decal can now reach higher per character (`makeFace({ fy1 })`, default 0.019 unchanged; Ishi 0.034, the grid rows scale with it). Two lines at y 0.029 / 0.025 (sheet: ~0.2 H below the top), arched upward with a soft wave in the middle, `rgba(184,124,98,0.30)` at width 0.0009 (was 0.55 alpha, 0.0011, just above the brows).

### Ishi pass 6 (KT: bigger eyes; forehead lines bend gently upward; clothes detail; colour bleeding from chin to clothes)

Compare: [`ref/ishi-pass6-compare.jpg`](ref/ishi-pass6-compare.jpg).

- **Eyes**: `makeFace({ eyeS })` scales the eye (default 1, the template); Ishi 1.12.
- **Forehead lines**: two faint lines (alpha 0.30) at y 0.028 / 0.0244 whose ends lift gently (a shallow U), not an arch.
- **Chin to clothes**: the outfit painter switches to clothing below one fixed neck height, and Ishi's lowered chin dipped below it, so its underside was painted haori navy and robe cream. Two opt-in knobs fix it: `outfit.skinEll [cx, cy, cz, rx, ry, rz]` (always skin inside this ellipsoid; Ishi: his jaw, inflated) and `body.headUp` (lift the head off the shoulders; Ishi 0.012) so the chin sits just above the collar, as on the sheet. Both default to the old look.
- **Collars**: 3D bands laid on the baked body surface (found with the exported `sdf`): the haori's darker collar band (eri) runs up one front edge, stands round the back of the neck (taller at the back) and down the other edge; the cream robe collar crosses left over right into a V under the chin. One mesh + one ink hull.
- **Loose clothes** (one mesh + one ink hull on the hips): the haori's lower body is a thick, flared, open-fronted shell from under the arms to mid-thigh (measured against the body, flare 0.006 -> 0.021, darker lining, the eri running down its edges); a tall sash (0.040) wrapped right round the waist on top of the trousers, two dark stripes, a soft knot with a loop each side and a short end; wide trouser legs to mid-calf with a darker hem and a seat piece joining them; wider, boxier sleeves.
- Cost: turnaround 22 draw calls / ~65k tris.
- Still open: the sheet's haori is boxier at the shoulders, with sleeves hanging straight from wide shoulders; the back collar band reads thin behind the head.

### Ishi pass 7 (KT: face sides at the ears pushed in slightly; fuller, rounder lower back of the head in profile; wider, puffier, oversized jacket)

Compare: [`ref/ishi-pass7-compare.jpg`](ref/ishi-pass7-compare.jpg).

- **Face at the ears**: skull a touch narrower (`headS` x 0.965 -> 0.95) and the jaw's widest point moved down below the ears (`JAW` y -0.030 -> -0.035, rx 0.053 -> 0.052, ry 0.033 -> 0.031), so the sides pull in at ear level and the lower cheeks stay full.
- **Back of the head**: new opt-in `body.lumps` (a list of head lumps, same form as `cranium` / `chin`; `makeHeadSDF` takes `lumps` too). Ishi: `OCCIPUT [-0.018, -0.024, 0.042, 0.030, 0.039, 0.016]`, so the skull rounds right down to the nape in profile.
- **Oversized haori**: the shell now starts at the neck and covers the shoulders in a soft round slope (from a collar 0.013 off the neck out to the shoulder line), stands 0.012 off the body and flares to 0.036 at the hem; its front opening follows the lapel line row by row (`haoriEdge`), and the eri runs along that edge. The standing back collar sits on top of it. Sleeves are bigger (upper arm 0.0215, mouth 0.030) and hang from shoulders moved out 0.010.
- Cost: turnaround 22 calls / ~68k tris.

### Ishi pass 8 (KT: shorter, cuter brows; cuter mustache; darker sandals; less full mouth and chin in profile)

Compare: [`ref/ishi-pass8-compare.jpg`](ref/ishi-pass8-compare.jpg).

- **Brows**: a short plump arch over each eye (6 lumps, x 0.0175 to 0.036, was to 0.044), round at both ends, no long outer droop.
- **Mustache**: smaller and rounder (`MUS_R` half-width 0.026, was 0.031): a soft round tip and two gentle scallops underneath instead of strand points; a little less puff (0.0078 under the nose).
- **Mouth and chin**: pulled back in profile (`CHIN` z 0.030 -> 0.026, rz 0.021 -> 0.019; `JAW` z 0.017 -> 0.014).
- **Sandals**: darker (straps `#563220`, soles `#3c2216`) and chunkier: each strap arches from the sole over the foot's real cross-section at that point (they were buried inside the foot), with a thick band (tube 0.26); the sole is a touch thicker.

### Ishi pass 9 (KT: bigger mustache, wider, covering more of the mouth)

Compare: [`ref/ishi-pass9-compare.jpg`](ref/ishi-pass9-compare.jpg). The pass-8 outline scaled out from under the nose: x 1.22 (half-width 0.032), everything below y -0.0336 stretched down 1.32 (bottom about -0.051); the puff scales with the width (0.0082 under the nose).

### Ishi pass 10 (KT: why are there black lines inside the mustache?)

Before/after: [`ref/ishi-pass10-mustache.jpg`](ref/ishi-pass10-mustache.jpg).

- **Cause**: each half was built as rings shrinking to one centre point, which only works when every point of the outline can see that centre in a straight line. Pass 9 scaled the outline but not the centres, and with the scalloped underside the rings folded over themselves; the folded strips faced the wrong way, so the ink hull and shadow showed through as dark diagonal lines.
- **Fix**: `mustacheGeo` no longer has a centre. The whole outline is triangulated (`ShapeUtils.triangulateShape`), subdivided 4 times, and every point is raised off the face by its distance from the edge (a rounded rim within 0.0045, then a soft dome; thickest under the nose). The back is the same mesh just inside the face, joined by a wall along the outline's boundary edges. Any outline works without folding.
- **Outline**: a soft grey edge painted through the hair shader (`aSkin` 0.36 at the rim fading over 0.0016; values 0.1..0.38 darken hair), as on the sheet, plus a fine hull (ink 0.3) for the silhouette. A heavier hull left jagged black slivers under the scallops.
