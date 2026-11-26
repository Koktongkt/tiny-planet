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

**Grandma Fuku, pass 8** (draft, dev-only: `?view=charstudio&dev=chibi-drafts&char=fuku`): polished against her turnaround sheet. Sheet / before / after: [`ref/fuku-pass8-compare.jpg`](ref/fuku-pass8-compare.jpg).
  - Pose: the teacup is gone; hands clasped at the waist as on the sheet, in every pose (still, idle, walk). Sleeves are chest-parented meshes (round shoulder, sleeve, elbow, forearm, cuff, two mitten hands) with their own ink hull; the tiny skinned arms are collapsed (`hideRigHands`) so no skin stub shows.
  - Skirt: the SDF long skirt (`body.skirt 'long'`) replaces the lathe skirt and the painted leg gap. Two new optional body knobs in `spec()`: `skirtFlare` (hem radius, default 1.12 / 1.3) and `skirtTop` (waist radius, default 0.96); Fuku uses 1.34 / 0.86 (the narrower top removes the waist crease). Skirt `#88618f`, cardigan `#9a73a0`.
  - Cardigan: a thin flared hem flap at knee height with a darker lip (open at the front under the apron); the painted cardigan line sits under it. Props sit on the real body surface via the new `coreSDF` export.
  - Apron: waist to just above the hem, wrapped on the body surface, five scallops; bigger pincushion (three pins, as on the sheet). Cream V collar enlarged; glasses `#6e4a2e`.
  - Hair: bigger dome, two broad waves at the parting instead of the curls, temple volume, low swept ridges, larger bun with a wrap ring, and full cover down to the nape (the back no longer shows bare skin).
  - Cost: one merged cel mesh + one ink hull per bone (hips, chest) replaces nine prop meshes; studio draw calls 20 -> 15.
  - Open for KT: shoulder roundness, cardigan hem height, hair wave lines (the sheet's swirl lines are not modelled), glasses rim weight (shared with Hoshino).

**Grandma Fuku, pass 9** (KT feedback on pass 8): sheet / pass 8 / pass 9, body and face: [`ref/fuku-pass9-compare.jpg`](ref/fuku-pass9-compare.jpg).
  - Face: her own jaw `FUKU_CHEEK = [0, -0.029, 0.010, 0.057, 0.027, 0.037, 0.018]` (shared `CHEEK` is `[0, -0.026, 0.012, 0.05, 0.0295, 0.035, 0.016]`): wider and fuller lower, so the bottom half is broad and round and the cheeks sit down toward the chin; the chin bottom is unchanged. Blush moved down and out (`blushAt { dx 0.0016, dy -0.003, dr 1.12 }`).
  - `castFace.jsx`: `makeFace` takes optional `cheek`, `blushAt` and `glassesGeo`; the face decal is built per cheek shape (`faceGeoFor`, cached) so it stays on the skin. Defaults unchanged: Hoshino renders pixel-identical.
  - Glasses: her own frames (`fukuGlasses`): round rims R 0.014, tube 0.0017 (shared 0.0128 / 0.0011), a low curved bridge, arms back to the ears, `#5a3a24`.
  - Hair: the front shape stands a little proud of the forehead (`H_FRONT`), so the hairline is a clean edge above the brows instead of a jagged cut through the skin; bigger bun (0.0285) and wrap ring. Tried and dropped: a rolled tube along the computed hairline (covered the brows, scribbly ink), and swirl locks on the back (stuck out like horns).
  - Arms: no shoulder puff; a tapering tube from the neck base to the shoulder gives a smooth slope. Sleeves thicker (upper 0.021, forearm 0.020-0.0212, cuff 0.0225), hands a touch further forward.
  - Apron shorter (hem at `anY + 0.045`, was `+ 0.030`); pincushion moved up with it.

**Grandma Fuku, pass 10** (KT feedback on pass 9): sheet / pass 9 / pass 10, body and face: [`ref/fuku-pass10-compare.jpg`](ref/fuku-pass10-compare.jpg).
  - Face, a rounded block: narrower head (new optional body knob `headW`, x radius only; Fuku 0.92) and a fuller jaw nearly as wide as the skull, blended broadly so the sides run straight down: `FUKU_CHEEK = [0, -0.030, 0.011, 0.050, 0.026, 0.040, 0.022]`. `makeFace` / `faceGeoFor` / `headSDF` take optional skull radii `hr` to match. Ears and glasses arms moved in with the head.
  - Hair: the sheet's swirl is painted in the hair shader (optional `makeHairMat(..., { lines })` in `castHair.js`): 9 broad locks flowing up and round the head into the bun (`twist 0.45`, a slight wave), each shaded darker on one side, thin grey-brown line between locks, and a 2-arm spiral on the bun. Fades out at the hairline and on the ears. The geometric ridges are gone. First try (15 locks, twist 0.85, darker lines) read as barber-pole stripes. Cap and temples slightly narrower to follow the head.
  - Shoulders slope down more: body top narrower (`shoulder 0.96`, `chestW 1.04`), sleeve joint 0.014 lower, a long tapering tube from the neck base down to it. Tried and dropped: moving the hidden rig's shoulder bones into the torso (stretched the body into spikes); the shoulder ball is instead tall enough to cover the collapsed rig stub.
  - Arms thicker from the side: oval sleeves (`ovalTube`): upper arm 1.22x deeper front-to-back, forearm and cuff 1.18x / 1.14x taller.
  - Hoshino and Her are unchanged (all new options default off; Hoshino's render matched to within run-to-run noise).

**Grandma Fuku, pass 11** (KT feedback on pass 10): sheet / pass 10 / pass 11, body and face: [`ref/fuku-pass11-compare.jpg`](ref/fuku-pass11-compare.jpg).
  - Jaw: full to the bottom, no visible chin, an almost straight bottom line. The cheek shape takes an optional 8th value (edge radius): the jaw is then a flat-bottomed oval puck (`ocol`, half height = ry) instead of an ellipsoid, in both the body bake (`spec` / `core`) and `headSDF`. Fuku: `FUKU_CHEEK = [0, -0.033, 0.011, 0.040, 0.013, 0.032, 0.020, 0.010]` (puck as wide as the skull, bottom at -0.056).
  - Face narrower again: `headW` 0.92 -> 0.86; ears, glasses arms, hair cap, temples and nape follow.
  - Features lower: new optional `makeFace({ featDy })` moves brows, eyes, nose, mouth and blush down together (shifts the decal sampling); Fuku 0.003, and her glasses apply the same offset.
  - Ears taller: radii `[0.0066, 0.0150, 0.0074]` (were `[0.0062, 0.0115, 0.0070]`).
  - Shoulders: a clearer slope. The sleeve shoulder is 0.024 below the rig shoulder line, with a long tapering tube from high at the neck base. The rig's own shoulder is pulled in (`shX 0.90`, `shoulder 0.90`) and its stub shrunk (`armR 0.06`, `hand 0.002`); sleeves use their own `SH_X 0.060`. A flattened cardigan yoke per side closes the gap where the body's skin paint showed through (found by tinting the body skin green).
  - Puffy sleeves: `ovalTube(..., puff)` bulges the middle of each segment (upper arm 0.22, forearm 0.24) on top of the oval cross-sections.

**Grandma Fuku, pass 12** (KT: jaw ends too sharp, top half of the head should be slightly less wide than the face): [`ref/fuku-pass12-compare.jpg`](ref/fuku-pass12-compare.jpg).
  - Jaw puck edge radius 0.010 -> 0.016 with the core shrunk to keep the size (`FUKU_CHEEK = [0, -0.033, 0.011, 0.036, 0.007, 0.028, 0.020, 0.016]`): the corners round inward, bottom still almost straight.
  - Skull narrower than the jaw: `headW` 0.86 -> 0.80 (skull half-width ~0.0465 vs jaw ~0.052); hair cap 0.0575 wide and temples pulled in to match, so the top half reads slightly narrower.
  - Ears moved out and up (`EAR {x 0.059, y -0.009, z 0.004}`) so they show beside the wider jaw from the front; glasses arms follow.

**Grandma Fuku, pass 13** (KT: trace the golden face contour): [`ref/fuku-pass13-compare.jpg`](ref/fuku-pass13-compare.jpg).
  - Traced the sheet's front face row by row (scan from the centre to the outline). With A = face half-width: straight sides from the temples to just below the eyes, then a half-ellipse bottom about 0.5A tall (no flat part, no corners; the pass 11-12 puck read as sharp); chin 0.84A below the eye line, mouth 0.43A, nose 0.17A; eyes about 0.5A apart; forehead nearly as wide as the cheeks (about 2% narrower); hairline about 1A above the eyes; big ears centred about 0.19A below the eye line, outer edge about 1.3A; hair about 1.3A wide at the temples.
  - The jaw's optional 8th value is now `h`: the jaw ellipsoid is stretched up by h (straight sides above its centre, elliptical bottom) in `spec` / `core` and `headSDF`, replacing the puck. Fuku: `FUKU_CHEEK = [0, -0.0387, 0.012, 0.0425, 0.016, 0.036, 0.012, 0.033]`, `headW 0.77`. Fitted to the sheet at the same eye spacing: widths within about 5-8% down the jaw, chin level matched.
  - Mouth and nose lower: new optional `makeFace({ featOff: { mouth, nose } })` (Fuku 0.0045 / 0.002) on top of `featDy`.
  - Hairline raised (cap moved back, front shapes up); temple hair moved out past the face edge and above the ears; ears big and low (`EAR {x 0.053, y -0.025}`, radii `[0.0072, 0.0140, 0.0098]`).

**Grandma Fuku, pass 14** (KT: face too thin, ears too lobe-like): [`ref/fuku-pass14-compare.jpg`](ref/fuku-pass14-compare.jpg).
  - Face about 6% wider: jaw rx 0.0425 -> 0.0452 (rz 0.0365), `headW` 0.77 -> 0.82; ears, glasses arms and temple hair moved out with it.
  - Ears rounder and a little higher, not hanging lobes: ry 0.0140 -> 0.0115, `EAR {x 0.0558, y -0.0225}`.

**Grandma Fuku, pass 15** (KT: ears should be reversed; bottom cheeks a little fuller): [`ref/fuku-pass15-compare.jpg`](ref/fuku-pass15-compare.jpg).
  - Ears: the sheet's ear is a big C, widest at the top and tucked in toward the jaw at the bottom; ours showed its bulk at the bottom (a lobe). The tilt is reversed (top out, `rz -d*0.26`, was `+d*0.08`), ears a little bigger (`[0.0074, 0.0130, 0.0102]`, `EAR y -0.0215`), and a darker hollow on the front face: hair-material `aSkin 2` = skin darkened 20% (new in `castHair.js`; ears with aSkin 1 unchanged). Tried and dropped: reversing the turn (`rotY -d*0.7`), which showed the ear edge-on from the front.
  - Lower cheeks fuller: the jaw's bottom ellipse is flatter and lower (ry 0.016 -> 0.0145, centre -0.0387 -> -0.0402, stretch h 0.0345) so the full width carries further down; a touch wider and deeper (rx 0.0462, rz 0.038). Chin level unchanged.

**Grandma Fuku, pass 16** (KT: jaw fuller and rounded upward, bottom half of the face wider than the top; half-rim glasses): [`ref/fuku-pass16-compare.jpg`](ref/fuku-pass16-compare.jpg).
  - Pear-shaped face: narrower skull (`headW` 0.82 -> 0.76) over a wider, fuller jaw set low with only a short straight section and a softer blend, so the face widens toward the bottom and the jaw's lower corners round upward: `FUKU_CHEEK = [0, -0.0405, 0.012, 0.0505, 0.015, 0.039, 0.018, 0.012]`.
  - Glasses are half-rim: each rim is the bottom half of the torus (`TorusGeometry(..., Math.PI)` turned down); the bridge and the arms meet the rims at the lens centre line.

**Grandma Fuku, pass 17** (KT: brows the colour of her hair and thicker; fix the hair details): [`ref/fuku-pass17-compare.jpg`](ref/fuku-pass17-compare.jpg).
  - Brows: thick soft hair-grey (`#c9c2ba`, width 0.0056, was a thin `#6a6660` 0.0032 line) with a thin darker rim (`#9d948c`), as on the sheet. New optional `featOff.brow { color, edge, width }` in `castFace.jsx`.
  - Hair locks mirror left / right (new `lines.mirror`, `round`): a parting in front and rounded U-scallops curving up into the bun behind, instead of one-way barber-pole twists. 8 locks, `twist 1.35` so the lines arc like the sheet's sweeping curves; darker, crisper lines (`#7a6c63`, alpha 0.6). Tried: plain `abs` mirror (sharp V chevrons behind, `round 0.12` softens them); `twist 0.55` (straight melon stripes).
  - Cleaner hairline: a small depth bias on the hair material (`polygonOffset -1/-2`) lets the hair's smooth edge win over the faceted skin; the front shape sits further back so the dome no longer shows a ledge.

**Grandma Fuku, pass 18** (KT: glasses lower with space under the eyes and slightly bigger; hair totally off, rebuild it): [`ref/fuku-pass18-compare.jpg`](ref/fuku-pass18-compare.jpg).
  - Glasses: rims R 0.0140 -> 0.0146 and the whole frame 0.0026 lower, so the half rim sits clear below the eyes.
  - Hair rebuilt from scratch: ONE big smooth dome (`H_CAP [[0, 0.018, -0.020], [0.066, 0.058, 0.064]]`), wider than the face and set back, so the hairline is a high round arch and the sides stop just above the ears; a nape volume; a round ball bun (`BUN_R 0.030`) raised to sit on top of the dome with a wrap ring at its base. The old front, lobe and temple shapes are gone (they made a visor ledge, side buns and creases).
  - Painted locks are now rings round the bun pushed out into petals (new `lines.rings / petals / amp`): 1.8 rings per radian, 6 petals, so the back shows two rows of scalloped locks and the front and sides show sweeping scalloped lock lines; each lock shaded darker at both edges (`petal`); the base sheen band toned down (`band 0.35`). Tried: locks running to the bun (from the front they converged like garlic segments); 2.6 rings / 8 petals (fish scales).

**Grandma Fuku, pass 19** (KT: the painted lines look wrong, try another method; the hair covers far too much head, the sheet's hair is much thinner from the front): [`ref/fuku-pass19-compare.jpg`](ref/fuku-pass19-compare.jpg).
  - No painted lines: the `lines` option is no longer used by Fuku (it stays in `castHair.js`, off by default).
  - Sculpted locks: a thin cap hugs the skull (`H_CAP [[0, 0.012, -0.015], [0.048, 0.052, 0.058]]`) and 16 lock strands (8 per side, `lockGeo`) lie on it, built along the skull-or-cap surface (`shellR`): each starts at the hairline with a blunt rounded tip, rises first and then sweeps round and up into the bun, flattened (width 0.015-0.017, 0.0066-0.0074 proud of the shell) and overlapping its neighbours. Lock lines come from the hair shader's existing dark band at `aSkin` ~0.47-0.5, written per vertex along each lock's side edges and tip (`lockLines`), so every lock has a drawn edge from every angle; the bun's wrap ring is inked the same way.
  - Hairline `hairlineY(az)`: a high round arch in front (0.037), just above the ears at the sides, the nape behind. The dome is now only a few mm proud of the skull: much thinner from the front, as on the sheet. Bun a round ball (`BUN_R 0.0255`) with a spiral wrap.
  - Tried: geometry-only overlaps relying on the ink hull (it draws only the silhouette, so the locks merged into one smooth cap); wider, thicker locks (the dome read as a helmet again).

**Grandma Fuku, pass 20** (KT: start simple, one ball wrapping the head round the forehead, another ball slightly behind the head): [`ref/fuku-pass20-compare.jpg`](ref/fuku-pass20-compare.jpg).
  - Hair is now only two balls: a cap `H_CAP [[0, 0.006, -0.0135], [0.0505, 0.059, 0.0615]]` whose front edge is the hairline across the forehead and which covers the back down to the nape, and a bun `BUN_C [0, 0.066, -0.030]`, `BUN_R 0.026`, slightly behind the top. The pass 19 locks and the nape volume are removed. Detail (locks, parting, bun wrap) to be added on this base step by step.
  - Tried: cap moved back and down to cover the nape (`[0, 0.004, -0.018]`) bared the top of the forehead; the final values split the difference.

**Grandma Fuku, pass 21** (KT: hair puffier and fuller; forehead / top of head too narrow, closer to the jaw width but still visibly smaller; bun further back, half or less of it visible from the front): [`ref/fuku-pass21-compare.jpg`](ref/fuku-pass21-compare.jpg).
  - Skull wider: `headW` 0.76 -> 0.86 (skull half-width ~0.050 against the jaw's ~0.0505 rx, still visibly narrower at the forehead).
  - Fuller cap: `H_CAP [[0, 0.009, -0.019], [0.061, 0.061, 0.066]]`, set back so the forehead edge stays put.
  - Bun back and lower: `BUN_C [0, 0.060, -0.050]`; about half of it shows above the dome from the front.
  - Ears moved out to clear the fuller hair (`EAR {x 0.0605, y -0.0225, z 0.006}`); glasses arms follow.

**Grandma Fuku, pass 22** (KT: trace the forehead hairline as a rounded block; the back of the head is too swollen, balance it lower; check the side view): [`ref/fuku-pass22-compare.jpg`](ref/fuku-pass22-compare.jpg).
  - Hairline traced from the sheet as a superellipse (`HL`: power 4, half-width 0.046, top 0.040 with a 0.0035 dip at the parting, sides down to y -0.008 at the ear tops). `shapeCap` reshapes the cap ball: in front it lies just over the skin (found by ray-marching `headSDF`) outside the line, every front triangle with a corner inside the line is cut away, and the rim vertices are snapped onto the line and seated on the skin, so the edge is exactly the traced curve. A thin ink tube along the line (`hairlineInk`, drawn with the hair shader's ink band, aSkin 0.48) gives the sheet's drawn hairline.
  - Back balanced: behind the cap centre the dome is pulled in (z x 0.80) and its mass lowered (up to 0.007), so in profile it rounds down to the nape instead of bulging high.
  - Tried: tucking the cap under the skin inside the line without cutting it (ragged edge where it grazed the faceted skin); laying the hair 1.2 mm over the skin (the skin flickered through); covering the temples down to eye level (strips of hair beside the eyes).

**Grandma Fuku, pass 23** (KT: hair a little puffier so it doesn't look wrapped round the head; brows, eyes, nose, glasses and mouth slightly higher): [`ref/fuku-pass23-compare.jpg`](ref/fuku-pass23-compare.jpg).
  - Puffier hair: cap `[[0, 0.010, -0.019], [0.065, 0.064, 0.069]]`; in front it stands 0.010 off the skin (was 0.0055) and rolls down to the hairline over a wider band (`lip = smooth(1.45, 1.0, se)^1.6`), so the edge reads as a soft rolled lip instead of a skin-tight wrap. Bun raised to `[0, 0.068, -0.050]` so about half still shows from the front; hairline ink moved slightly inside the edge and lifted (0.972 / 0.975, skin + 0.0042) so the fuller lip doesn't hide it.
  - Features higher: `FEAT_DY` 0.003 -> 0.0012 (brows, eyes, nose, mouth, blush and glasses move together).

**Grandma Fuku, pass 24** (KT: brows, eyes, nose and mouth slightly higher again): [`ref/fuku-pass24-compare.jpg`](ref/fuku-pass24-compare.jpg). `FEAT_DY` 0.0012 -> -0.0006 (the same step again; negative moves the features up from the shared layout). Glasses and blush move with them.

**Grandma Fuku, pass 25** (KT picked option D from [`ref/fuku-features-ladder.jpg`](ref/fuku-features-ladder.jpg)): `FEAT_DY` -0.0033. Next, the forehead width at the hairline: ladder [`ref/fuku-forehead-ladder.jpg`](ref/fuku-forehead-ladder.jpg) widens the hairline opening and the skull together (`HL.a` / `headW`: A 0.046 / 0.86 now, B 0.0485 / 0.89, C 0.051 / 0.92, D 0.0535 / 0.95; forehead 159 / 167 / 176 / 185 px at the same eye size). The cheeks widen a little with the skull.

**Grandma Fuku, pass 26** (KT picked forehead option D; eyes bigger at the same spacing; hair puffier at both sides): [`ref/fuku-pass26-compare.jpg`](ref/fuku-pass26-compare.jpg).
  - Forehead D: `headW` 0.95, `HL.a` 0.0535.
  - Eyes 14% bigger with the same centres: new optional `featOff.eyeScale` in `castFace.jsx` scales the eye radii only (default 1; Hoshino unchanged). Glasses rims grow with them (R 0.0146 -> 0.016).
  - Hair wider at the sides: cap x radius 0.065 -> 0.0735; ears (`EAR.x` 0.067) and glasses arms moved out to stay clear.

**Grandma Fuku, eye spacing ladder** (KT: eyes and brows further apart): new optional `featOff.eyeDx` in `castFace.jsx` moves the eyes, brows and eye-corner lines out by dx per side (default 0); Fuku's glasses follow via `EYE_DX`. Ladder [`ref/fuku-eyespacing-ladder.jpg`](ref/fuku-eyespacing-ladder.jpg): A 0 (now), B 0.0015, C 0.0030, D 0.0045.

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
