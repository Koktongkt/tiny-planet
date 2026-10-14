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
