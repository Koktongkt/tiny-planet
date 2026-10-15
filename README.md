# Tiny Planet

### 🔗 Live: **[koktongkt.github.io/tiny-planet](https://koktongkt.github.io/tiny-planet/)**

A cozy, watercolour-toon 3D tiny planet you can walk around. Every mesh is generated in code, with no external models.

- **Village:** cottages around a square, a winding sandy path, a stream with arched bridges, laundry lines, a shrine, a bus stop, and a napping cat.
- **Biomes:**
  - Lake with a dock, a rowboat and an angler
  - Cliff waterfall
  - Rice terraces with a scarecrow and workers
  - A steam train looping the southern ring
  - Harbour with a pier, boats and a lighthouse
  - Mossy ruins
  - Camphor forest with a giant shrine tree
  - Meadow hills with a field of windmills
- **People:** the traveller and 22 villagers share a soft-body look (SDF body parts blended and baked with marching cubes, GPU-skinned). Clothes are painted in the shader; hair, hats and props ride on bones. Body shapes, hair, outfits and props vary by zone (fishers, farmers, bakers, elders). They stroll the path, chat in the square, fish, and work the terraces and docks.
- **You:** a soft-body kid traveller in a straw hat, overalls and satchel (default). Hold Shift to run.
- **Time of day:** a full day/night cycle every 3 minutes, from day to dusk to night, with glowing windows, lamps and fireflies.

## Controls

- **WASD / arrow keys:** walk · **Shift:** run · **Space:** jump · **tap or click:** walk to that spot
- **V:** toggle planet view (drag to spin, with inertia) / walk view

URL options: `?view=orbit` (planet view), `?view=detail` (village close-up), `?view=hero` (traveller close-up), `?view=lineup` (every character type), `?view=zone&z=lake-waterfall|terraces-train|harbour-ruins|forest-giant|meadow-mills` (zone close-ups), `?view=charstudio` (character studio; `angle=front|three|side|back`, `pose=walk`, `freeze=`, `compare=1`), `?t=day|dusk|night` or `?phase=` (freeze the time of day), `?oldchar=1` (v4 stick-figure people), `?char=sprite` (2.5D billboard traveller).

## Tech stack

Vite + React 18, React Three Fiber / three.js, drei (toon outlines), @react-three/postprocessing (bloom, vignette, grain), Fredoka font. Source: `src/App.jsx` (world, traveller, camera), `src/GhibliPerson.jsx` / `src/villagers.js` (soft-body people), `src/zones.jsx` (biomes), `src/people.jsx` (legacy stick figures), `src/SpritePerson.jsx` (optional billboard traveller), `src/common.jsx`, `src/world.js` (layout and zones), and `src/game/*` (Gather & Craft: `store.js` state and saves, `items.js` items and recipes, `World.jsx` props, sheep, bench and bridge, `UI.jsx` / `ui.css` / `icons.jsx` interface). Design notes: `ART_DIRECTION.md`; sample renders in `screenshots/`.

## Gather & Craft

Explore the planet, gather resources in each biome, and craft tools, food and decor at the bench beside **Home**. Full details: [GAMEPLAY.md](GAMEPLAY.md).

### Controls

| Action | Keyboard | Touch |
|---|---|---|
| Walk | WASD / arrow keys | Tap the ground |
| Jump | Space | |
| Gather / interact | E | Tap the prompt, or tap a prop (you walk to it and gather) |
| Bag | B / I / Tab | Bag button |
| Recipes | C | Recipes button |
| Fishing | E / Space / Enter | Tap the bar |
| Placing decor | R rotates, E/Enter places, Esc cancels | Placement bar buttons |
| Planet view | V | |

### Touch (phones and tablets)

The touch controls appear on touch or coarse-pointer devices. Use `?touch=1` to force them on and `?touch=0` to turn them off.

| Action | Touch |
|---|---|
| Walk | Drag the stick (bottom-left). It steers toward the direction you push, and speed follows how far you push |
| Run | Push the stick to the edge (the knob turns orange) |
| Jump | **Jump** button (bottom-right) |
| Gather / interact / reel a fish / place decor | **✋ Action** button, which does the same thing as E. You can also tap the prompt or the prop |
| Walk to a spot | Tap the ground (a clean tap; drags don't count) |
| Look around | Drag one finger on empty screen to turn, and drag up or down to tilt |
| Zoom | Pinch |
| Planet view | **Planet / Walk** button |
| Bag / Recipes | Buttons under the clock |

You can use the stick and buttons together with several fingers. Supported devices give light haptic feedback. Page scroll and zoom are locked, and the layout respects safe-area insets. In portrait, a dismissible hint suggests turning sideways; play works either way. On touch devices the render resolution is capped at 1.25x and post-processing MSAA is 2x (4x on desktop). The look is otherwise unchanged.

### Features
- **Gathering** in every zone: forest wood and mushrooms, meadow flowers and sheep wool, lake fish and shells, terrace rice and tea, cliff stone and crystal, and night-only glowing moss and fireflies.
- **Fishing minigame:** stop the marker in the green zone (3 tries).
- **Crafting:** 12 recipes across tools (Rod, Watering Can, Lantern), food, decor and the Rope Bridge unlock, which leads to a clifftop picnic spot with a chest. Undiscovered recipes show as "???".
- **Decor placement** near Home, with a green/red ghost preview; press E to pick it back up.
- **Day cycle and saves:** items respawn each in-game sunrise (3 minutes per day); progress saves to localStorage. Reset from the Bag or with `?reset`.

## Loading

- **Inline HTML loader** in `index.html` paints before any JS runs. Its progress is real and staged: fetching code, then building the world, then compiling shaders, then the first frame (`src/boot.js`).
- **"Golden hour" title card:** clouds part as real progress grows, revealing a sepia ink planet that draws itself stroke by stroke as watercolour washes bleed in. The stage line is set in Cormorant Garamond italic, and there is no bar or percentage. When it is ready, "Enter the world" (any key, click or tap) opens an iris from the planet into the 3D world. With reduced motion it is a short crossfade.
- **Chunk split:** `vendor-three`, `vendor-r3f` (React, r3f, drei) and `vendor-post` (postprocessing). The game `World` and `UI` are lazy-loaded, and so are the optional character and sprite modes.
- **Terrain fix:** the curve distance checks behind terrain colouring used to block the main thread for about 35 s. They now run in a fraction of a second.
- **Before → after** (live site, headless Chromium with software WebGL, time to the first rendered frame): unthrottled **36.4 s → 1.8–3.0 s**; Fast 3G + 4x CPU **147 s → 9.4 s**. Total transfer is about 374 KB gzipped either way.
- **Smoother loading and play (perf2):** the title card animates as separate composited layers, so filters are drawn once. The world is built in slices, and shaders plus first draws warm up in short tasks behind the loader, so there are no multi-second freezes. Repeated scenery such as grass, flowers and trees is grouped so off-screen and far-side groups are skipped, which roughly halves the triangles in the game views. Render resolution is capped at 1.5x.

## Licences

See [ASSETS.md](ASSETS.md).

- **No third-party 3D models, textures, images or icons.** Terrain, houses, people, trees, train, boats, ruins and water are generated in code (primitives, lathe shapes, SDF soft bodies and shaders).
- **Gather & Craft assets are first-party, generated in code:** the traveller sprite sheet (`src/assets/`, made by `tools/sprites.mjs`), the item and UI icons (`src/game/icons.jsx`, SVG written in code), and the props, sheep, bench, rope bridge and decor (`src/game/World.jsx`, three.js primitives).
- **Fonts:** Fredoka, bundled via `@fontsource/fredoka`, and Cormorant Garamond 500 italic (loader title card, `public/fonts/cormorant-500i.woff2`, licence in `public/fonts/OFL-cormorant.txt`), both SIL Open Font License 1.1.
- **Libraries:** three.js, React, @react-three/fiber, drei and postprocessing, all MIT.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # outputs dist/
npm run preview  # http://localhost:4190
```

## Deploy

Pushes to `main` run `.github/workflows/pages.yml` (`npm ci`, `npm run build`) and deploy `dist/` to GitHub Pages. Vite uses `base: './'`, so assets resolve under `/tiny-planet/`.
