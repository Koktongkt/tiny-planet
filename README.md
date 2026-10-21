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
- **Time of day:** a full day/night cycle every real hour, from day to dusk to night, with glowing windows, lamps and fireflies.

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
| Go in / out of the house | E at the door | ✋ Action, or tap the prompt |
| Walk indoors | WASD / arrows | Stick (screen-relative), or tap the floor |
| Pet Mochi (cat, indoors) | E near him | ✋ Action |
| Throw a stick for Pip (dog, outdoors) | E near him | ✋ Action |
| Pick up what Pip dug up | E near it | ✋ Action |

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
- **Daily loop (Stage B):** a six-bed garden with growth over in-game days, gifts and friendship hearts with all 22 villagers, a daily errands board, recipes for every leftover item, food buffs (swift, cozy, lucky), ambient sound with a piano loop, and settings for volume, mute and text size. See [GAMEPLAY.md](GAMEPLAY.md).
- **Relaxing + world (Stage C):** a calmer fishing reel with 12 species and a catch card, seasons every 7 in-game days and seeded rain days, train rides between two stations, photo mode (free camera, filters, PNG + journal album), a collection journal, ruins dig spots and Professor Hoshino's museum, and Grandma's first-day note.
- **Day cycle and saves:** items respawn each in-game sunrise (one day is one real hour); progress, including the time of day, saves to localStorage and carries over across reloads. Reset from the Bag or with `?reset`.

## Home & pets

- **You start inside your house:** one cozy room with a bed, kitchen, wood stove and kettle, a table with a teapot, a bookshelf, plants and warm window light. Use the door (E) to step outside; a warm iris covers the crossing. `?out` starts outdoors.
- **Indoor decor:** placing decor from the Bag while inside puts it on the floor in front of you. Press E to pick it up again.
- **Mochi the cat** stays indoors. He naps in the sunbeam or on the bed, grooms, stretches and yawns, chases the yarn ball, sits on the windowsill and kneads the quilt. Sometimes he comes over to rub against your ankles. Press E to pet him: he purrs and shows hearts, or now and then ignores you.
- **Pip the dog** stays outdoors. He follows you at a loose distance, steering around trees, rocks and houses. When you stop he sits or lies down, and he sniffs, digs (sometimes turning up something you can pick up), rolls, chases butterflies, barks at sheep and splashes in the lake. Press E near him to play fetch. While you're inside he waits by the front door and greets you when you come out.
- **Performance:** the room and Mochi are part of the startup chunk, since they're the first view. Pip is a separate chunk (about 6 KB gzipped) that loads after the first frame and compiles his shaders on mount. Each pet's simulation and rig pause while it's out of sight. Pip checks a short list of nearby colliders, refreshed about 5 times a second, instead of scanning every tree on the planet each frame. The room's light and layer tagging runs only while you're inside.

## Loading

- **Inline HTML loader** in `index.html` paints before any JS runs. Its progress is real and staged: fetching code, then building the world, then compiling shaders, then the first frame (`src/boot.js`).
- **"Golden hour" title card:** clouds part as real progress grows, revealing a sepia ink planet that draws itself stroke by stroke as watercolour washes bleed in. The stage line is set in Cormorant Garamond italic, and there is no bar or percentage. When it is ready, "Enter the world" (any key, click or tap) opens an iris from the planet into the 3D world. With reduced motion it is a short crossfade.
- **Chunk split:** `vendor-three`, `vendor-r3f` (React, r3f, drei) and `vendor-post` (postprocessing). The game `World` and `UI` are lazy-loaded, and so are the optional character and sprite modes.
- **Terrain fix:** the curve distance checks behind terrain colouring used to block the main thread for about 35 s. They now run in a fraction of a second.
- **Before → after** (live site, headless Chromium with software WebGL, time to the first rendered frame): unthrottled **36.4 s → 1.8–3.0 s**; Fast 3G + 4x CPU **147 s → 9.4 s**. Total transfer is about 374 KB gzipped either way.
- **Smoother loading and play (perf2):** the title card animates as separate composited layers, so filters are drawn once. The world is built in slices, and shaders plus first draws warm up in short tasks behind the loader, so there are no multi-second freezes. Repeated scenery such as grass, flowers and trees is grouped so off-screen and far-side groups are skipped, which roughly halves the triangles in the game views. Render resolution is capped at 1.5x.

- **perf3:** per-frame code no longer allocates (cached colours, scratch vectors), and the clock re-renders only when its text changes. Rendering pauses while the tab is hidden, and resolution adapts between 1x and the cap when frames struggle (`?q=fixed` pins it). The room's static furniture is batched per material, which cuts indoor meshes from 595 to 271 and draw calls from 404 to 226 (`?nomerge` turns it off).

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

## Tests and checks

```bash
npm run lint         # ESLint (light: undefined names, hook rules, JSX)
npm run test:unit    # node --test tests/unit: save migrations (v1 fixture -> v4), Stage B + Stage C systems
npx playwright install chromium   # once
npm run build && npm run test:smoke   # Playwright smoke suite on the built game (starts vite preview on :4173)
npm run perf:budget -- http://localhost:4173/   # startup chunk + draw calls / triangles per view vs tests/perf/budget.json
```

The smoke suite (`tests/smoke/`) covers load and the title card, walking, gathering, crafting at the bench, sleep → reload → save
check, migrating an old v1 save, indoor controls and the door, facing the direction of travel, and the touch stick and pads on an
iPhone 13 profile, plus the Stage B loop and Stage C (fishing reel + species, photo mode capture, a train ride, ruins dig + museum + journal, the tutorial note, and the touch versions). Everything runs in headless Chromium on SwiftShader (software GL), so it is slow but needs no GPU.
`BASE_URL=http://host:port/` points it at an already-served build.

The perf gate fails a PR when the startup chunk is over 80 KB gz (warns over 70) or a key view goes over its draw-call or triangle
cap from `budget.md` (with a few % tolerance for run-to-run drift; known pre-existing overs are listed as overrides in
`tests/perf/budget.json`). FPS and JS ms per frame are reported but never fail the build, since they are noise on software GL.

## Code layout

`src/App.jsx` is being split into modules (Stage A, behaviour unchanged):
- `src/time/clock.js`: the planet clock (`rot.a` sun phase, `?t=`/`?phase=` presets, day length, restoring from the save)
- `src/save/schema.js`: save version, migrations, defaults (pure, unit-tested)
- `src/world/village.js`: village, mills and house positions, the first bridge's set-piece spots
- `src/npc/routines.js`: townsfolk and the villagers' day plans
- `src/world/sky.jsx`: sky dome, sun and moon lights, clouds, birds, fireflies
- `src/debug/`: dev-only views (`?view=charstudio`, `?view=lineup`), lazy chunks
- `src/systems/`: Stage B rules (pure, unit-tested: `garden.js`, `friendship.js`, `errands.js`, `buffs.js`). `live.js` applies them to the save, and `World3D.jsx` and `Panels.jsx` mount Studio's art and UI. These are all lazy chunks, loaded in an idle slot after the game UI.
- `src/systems/` Stage C: `weather.js` (seasons + rain), `fish.js` (balance over Studio's `game/fishTable.js`, rolls, the reel stepper), `train.js` (schedule + fares), `collection.js` (journal, museum, dig), `tutorial.js`, `photo.js` (album); `liveC.js` applies them, `WorldC.jsx` (prompts, capture, ride pin) and `PanelsC.jsx` (journal, museum, photo bar, ride chip, Studio's note + catch card). Loaded one idle step after `live.js`.
- `src/game/recipes.js`, `craft.js`, `itemsB.js`: recipes, spawns, crafting and the Stage B item names, kept out of the startup chunk. `items.js` keeps only ids, names, tools and decor.
- Studio's areas: `src/art/`, `src/ui/{gifts,errands,settings}/`, `src/audio/` (armed from `game/UI.jsx`, starts on the first gesture), and their earlier areas stay as they were: `src/pets/`, `src/home/`, `src/talk/`, characters.

New systems should be lazy-loaded (`React.lazy` / dynamic `import()`) so the startup chunk stays at or under 70 KB gz.

## CI and deploy

- Pull requests run `.github/workflows/ci.yml`: lint, unit tests, build, the perf budget gate and the smoke suite. The perf table lands in the job summary; reports are uploaded as artifacts.
- Pushes to `main` run `.github/workflows/pages.yml` (`npm ci`, `npm run build`) and deploy `dist/` to GitHub Pages. Vite uses `base: './'`, so assets resolve under `/tiny-planet/`.
