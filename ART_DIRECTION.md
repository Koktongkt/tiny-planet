# Tiny Planet — Art Direction

**Mood:** a slow summer afternoon in a hillside village from a Ghibli film. It's cozy, breezy and handmade. The whole world fits in your palm.

## Palette (pastel watercolour)
| Role | Day | Dusk | Night |
|---|---|---|---|
| Sky top | `#8ec5e8` cornflower | `#6b6fa8` lavender | `#141a3a` ink blue |
| Sky horizon | `#fdf3d8` cream | `#ffb38a` apricot / `#f78fa0` rose | `#2e3c6e` deep periwinkle |
| Grass | `#9fd17a` / `#7fbf6a` / `#c8e08a` patches | warmed by the sun | cooled by moonlight `#4d6b8a` |
| Path | `#ecd9a8` sand | | |
| Water | `#7fd0dc` → `#bff0f0` foam | | |
| Roofs | `#d9655b` brick red, `#5f8fc4` slate blue, `#e8a24a` ochre | | |
| Walls | `#fbf3e4` plaster, `#f2e2c4` | | |
| Lamps / windows | `#ffcf6e` → `#ffb04a` warm glow | | |
| Fireflies | `#e8ff9a` | | |

## Shading
- Everything uses a **3-step toon ramp** (MeshToonMaterial plus a nearest-filtered gradient map), which gives flat painted light and shadow bands.
- **Inverted-hull outlines** (drei `<Outlines>`) in warm dark brown `#4a3a35`, not black, so it reads like ink lines.
- Ground uses **vertex colours** with noise patches, so the meadow looks dabbed with a brush.
- Postprocessing: soft **bloom** (windows, lamps, fireflies, sun), a subtle **vignette**, and **paper grain** noise overlay.

## Planet layout (radius 5)
- North cap: a **village** of five cottages around a little square with a lamp post.
- East: two **windmills** on a gentle rise.
- A **winding sandy path** loops around the planet and links the village and windmills.
- A **stream** meanders the other way and crosses under the path near the village.
- Forest clusters of round and conifer trees are scattered across the rest (instanced).
- **Soft lawn:** about 300 patches of short, rounded dome tufts (lobed edges, gentle wind sway), many with clumps of flowers, and smooth painted ground showing between them. No spiky blades.

## Lighting by time of day
The day cycles on its own: one full day every 3 minutes. Phase φ=0 is noon and φ=π is midnight. In walk view the sun moves across the traveller's own local sky. In planet view it moves across the visible face. `?t=day|dusk|night`, `?phase=` and `window.__setPhase()` freeze the clock for screenshots.
- **Day:** high warm-white sun, cream horizon, blue sky, soft cool fill.
- **Dusk:** low apricot sun, rose and lavender gradient, long warm bands; windows begin to glow.
- **Night:** moon-blue fill, ink sky with twinkling stars; lamps and windows blaze warm, and fireflies drift and bloom.

## Motion and ambient life
- Grass and tree crowns sway in a shared wind field (vertex shader, gusts travel across the planet).
- Windmill blades turn; the stream ripples with scrolling flow lines and foam.
- Clouds drift on slow orbits, and flocks of birds flap in arcs.
- Villagers (bean bodies, round heads, little hats) walk along great-circle routes with a bobbing gait.
- Villagers stroll along the sandy path, with small sideways offsets so they don't walk in single file.

## The traveller (playable)
- A small kid traveller: a round head with dot eyes and rosy cheeks, a wide straw hat with a red band, a blue tunic, a satchel, and a red **three-segment cape** made of damped springs. The cape trails back with speed, lifts as the traveller falls, and flutters in the wind.
- **Walk animation:** body bob and forward lean, swinging arms and legs.
- **Movement:** gravity pulls toward the planet centre, and Space jumps. Cylinder colliders on houses, windmills and trees push the traveller back out.
- **Camera:** a third-person follow camera behind and above the traveller, aligned to the local surface "up", so the horizon always curves away.
- **Planet view** (V, or `?view=orbit`): drag to spin with inertia.

## v3: village life and finer detail
- **Cape:** a tapered strip of cloth, 5×8 points simulated with verlet physics. The top row is pinned to the shoulders, and the cloth holds together along its rows, columns and diagonals. Gravity pulls toward the planet centre, a body collider keeps it behind the back, and the ground keeps it above the surface. Wind gusts add flutter. Because it's simulated in world space, it trails behind and swings on its own when the traveller runs, turns or jumps. The colour shades from warm red at the shoulders to deep red at the hem.
- **Camera:** a ray from the traveller to the camera checks for houses, roofs and tree crowns. If something is in the way, the camera pulls in in front of it and lifts slightly.
- **Painted surfaces:** a shader adds noise in each object's own space for brushy colour variation on the ground, path, walls, roofs, wood, soil and stones. Soft **cloud shadows** (noise drifting at the clouds' orbit speed) slide across the ground in daylight.
- **Village props:** two **arched wooden bridges** where the path crosses a stream meander. The traveller and villagers walk up and over them.
  - A **laundry line** with four fluttering cloths.
  - **Mailboxes** with flags.
  - Two **vegetable patches** with cabbages and carrots behind white picket fences.
  - **Stepping stones** from each door.
  - A **wayside shrine** with a red roof and a little torii.
  - A Totoro-style **"BUS · Inaba" stop** with a bench.
  - **Lanterns** that sway on their lamp posts.
  - Warm windows with **curtains**, sills and lintels, and **moss** clumps on the roofs.
- **Ambient life:**
  - **Chimney smoke**: soft puffs that rise, grow and drift on the wind.
  - **Butterflies** in the daytime.
  - **Dandelion seeds** drifting upward.
  - About 900 swaying **wildflowers** on stems.
  - A **napping cat** curled by the bridge, breathing slowly with its tail twitching.
- **Views:** `?view=detail` is a fixed close-up of the village and bridge, used for details.png.

## v4: bigger world, biomes, real people
- **Scale:** the planet radius grew from 5 to 8, about 2.6× the walkable area. Hill amplitude scaled with it. Sizes, colliders and clearances are defined in world units (`K = 5/R`).
- **Zones**, laid out to stay clear of the path, stream and village (`ZONES` in `world.js`, props in `zones.jsx`):
  - **Lake:** a carved basin with a sandy shore, a watercolour water cap (ripple noise, foam rim), a plank **dock** with a lantern, a bobbing **rowboat**, reeds, rocks and an angler.
  - **Cliff and waterfall:** a mesa with rocky sides (vertex colour by slope), an animated falling sheet, foam puffs, a plunge pool and a creek running to the lake.
  - **Rice terraces:** quantised terrain steps with teal paddy tops, about 1,400 swaying rice clumps, a scarecrow, a hut and two workers.
  - **Train loop:** two rails around the southern latitude ring with about 220 sleepers, and a steam engine with three coaches (lit windows) and smoke.
  - **Harbour:** a bay with a pier, three moored boats, a red-and-white lighthouse, crates and barrels, harbour houses and two dock workers.
  - **Mossy ruins:** broken and tilted columns with moss caps and ivy, an arch, a fallen column, slabs and a visitor gazing up.
  - **Camphor forest:** 34 broad, multi-blob camphors with ferns, plus a **giant tree** on a hill with flared roots, a shimenawa rope with paper streamers, and a torii.
  - **Meadow hills:** rolling hills with about 1,500 flowers, and a **windmill field** of six mills.
- **Performance:** everything repeated is instanced. Zone props, harbour houses and townsfolk are **distance-culled** in walk and close-up views and always shown in planet view. The meadow flowers and ferns are kept simple.
- **People** (`people.jsx`), built from smooth capsules and lathe shapes:
  - Lathe torso and skirt, hips, thighs and shins with knees, feet, upper arms and forearms with elbows, and hands.
  - Faces have eyes with highlights, brows, a nose, a mouth, ears and cheeks.
  - Hairstyles: short, bob, long, bun and pigtails. Hats: straw, cap and kerchief.
  - Outfits: dress, overalls, apron dress, shirt with trousers, shorts, and a sailor collar.
  - Ages and sizes: toddler, kids, teen, adults and elders. Elders are hunched and walk slower.
  - **Walk cycle:** thighs swing with knees bending as each leg comes forward, feet roll, arms swing opposite the legs with bent elbows, the pelvis bobs and sways, the chest counter-twists, and the head counter-bobs. Idle pose: breathing, glancing around, and some figures wave.
- **The traveller** is now a kid in a straw hat, overalls and satchel (no cape). Hold Shift to run.
- **Townsfolk:** 10 walk the path, 3 chat in the village square, and others pace at the harbour, terraces, mills and giant tree, fish from the lake dock, or stand at the ruins.
- **Views:**
  - `?view=hero`: front three-quarter shot of the traveller.
  - `?view=lineup`: every character type standing in a row.
  - `?view=zone&z=lake-waterfall|terraces-train|harbour-ruins|forest-giant|meadow-mills`: zone close-ups.
  - `&trainAt=<lon>`: parks the train at a set position.

## Soft-body characters (current default)
The player and all 22 villagers share one **soft-body** look: an SDF of head, neck, torso, arms and legs blended with smooth-min, baked once per body type with marching cubes, then skinned to a small skeleton (GPU skinning). Limbs grow out of the body with no seams. Clothes (overalls, dresses, aprons, yukata, sailor collars, jackets, cardigans) are painted in the fragment shader from rest-pose regions with anti-aliased edges. Rigid pieces (hair, hats, sleeves, cuffs, scarf, satchel, props) ride on bones.

### Flags
- **Default:** soft-body player (`GhibliPerson`) and soft-body villagers (`Character` + `villagers.js`).
- `?oldchar=1`: restores the v4 stick-figure player and villagers.
- `?char=sprite`: the 2.5D billboard traveller (front/back/side sheet in `src/assets/traveller-sheet.png`).
- Character studio: `?view=charstudio` with `angle=front|three|side|back`, `pose=walk`, `freeze=`, `compare=1`.

### Variety
Villagers differ by body (tall / short / round / slim, toddler → hunched elder), hair (bob, braids, bun, ponytail, short, long, bald, beard, grey), clothing matching their zone (fishers at the harbour, farmers at the terraces, bakers and elders in the square), props (baskets, fishing rods, parasols, canes, glasses), and walk / idle personality.

### Performance
- Body meshes are cached per body-parameter set; materials are cached per outfit.
- Static rigid pieces under each bone (hat, glasses, buttons, props, scarf ring, straps) are **merged** into one cel mesh + one basic mesh + one outline mesh at mount time.
- Villagers fade through three LOD levels by camera distance (props and sleeves drop first, face detail next). Whole walkers are culled past the planet horizon and, in close views, past ~12 units.
- A planet-wide **horizon cull** also hides world meshes on the far side (houses, trees, flowers) so the orbit overview stays under ~1,000 draw calls.

## Gather & Craft UI
- Panels use warm watercolour paper (a radial cream gradient) with a 2.6px ink border (#4a3a35), wobbly uneven corner radii and an inner dashed stitch line.
- All text is set in Fredoka.
- Icons are SVG drawings with a soft wash blob behind the ink linework, wobble and wash filters, and a highlight stroke.
- Gatherables are small toon props with back-face ink hulls. They are about 1.4× scale so they read against the ground cover.
- The current interact target gets a pulsing chalk-white ring, drawn through the grass.
- Pickup: the prop pops, sparkles burst, it shrinks into the player, and its icon arcs to the Bag button.
- Colour accents:
  - Ready recipes are green (#6f9e4f).
  - Missing ingredients are red-brown (#c0503f).
  - Locked recipes are a dashed "???" card.

## Loading screen
- **Sky:** a pastel wash sky (cream sun glow and pink haze over a blue-to-sage-to-cream gradient), multiplied with an SVG `feTurbulence` paper grain.
- **Hills:** three hill layers and the clouds go through a turbulence displacement filter, which gives torn watercolour edges.
- **Leafy loading bar:** a paper groove with an ink outline. It fills left to right with real progress: a green wash crossed by a wavy brown branch. Ink-outlined leaves and cream or pink blossoms pop out above and below it as the fill passes them.
- **Traveller:** the SVG traveller (bun, red scarf, blue overalls, satchel) stands on top of the bar at the current progress point.
  - It walks while progress advances and breathes idly while a stage is working.
  - At 100% it hops three times and waves.
- **Panels:** the tip card and the "Press to enter" button reuse the game's paper-and-ink panel language and Fredoka, with a rounded system font as fallback.
- **Reduced motion:** with `prefers-reduced-motion`, cloud drift, the walk, hop and wave, and the fades are switched off. The bar still shows progress.
