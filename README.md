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
- **People:** townsfolk of all ages with varied hair, hats and outfits, and a full walk cycle. They stroll the path, chat in the square, fish, and work the terraces and docks.
- **You:** a kid traveller in a straw hat, overalls and satchel.
- **Time of day:** a full day/night cycle every 3 minutes, from day to dusk to night, with glowing windows, lamps and fireflies.

## Controls

- **WASD / arrow keys:** walk · **Shift:** run · **Space:** jump · **tap or click:** walk to that spot
- **V:** toggle planet view (drag to spin, with inertia) / walk view

URL options: `?view=orbit` (planet view), `?view=detail` (village close-up), `?view=hero` (traveller close-up), `?view=lineup` (every character type), `?view=zone&z=lake-waterfall|terraces-train|harbour-ruins|forest-giant|meadow-mills` (zone close-ups), `?t=day|dusk|night` or `?phase=` (freeze the time of day).

## Tech stack

Vite + React 18, React Three Fiber / three.js, drei (toon outlines), @react-three/postprocessing (bloom, vignette, grain), Fredoka font. Source: `src/App.jsx` (world, traveller, camera), `src/zones.jsx` (biomes), `src/people.jsx` (characters), `src/common.jsx`, and `src/world.js` (layout and zones). Design notes: `ART_DIRECTION.md`; sample renders in `screenshots/`.

## Licences

See [ASSETS.md](ASSETS.md).

- **No third-party 3D models, textures or images.** Everything is generated in code with three.js primitives, lathe shapes and shaders, and no CC0 model packs are included.
- **Font:** Fredoka, bundled via `@fontsource/fredoka` (SIL Open Font License 1.1).
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
