# Tiny Planet

### 🔗 Live: **[koktongkt.github.io/tiny-planet](https://koktongkt.github.io/tiny-planet/)**

A cozy, watercolour-toon 3D tiny planet you can walk around: a hillside village of cottages, windmills, a winding sandy path and stream with arched bridges, forests, wildflowers, villagers, birds and a napping cat. You play a small traveller with a straw hat and a cloth-simulated red cape. The day/night cycle runs on its own, one full day every 3 minutes (day → dusk → night with glowing windows, lamps and fireflies).

## Controls

- **WASD / arrow keys:** walk · **Space:** jump · **tap or click:** walk to that spot
- **V:** toggle planet view (drag to spin, with inertia) / walk view

URL options: `?view=orbit` (planet view), `?view=detail` (fixed village close-up), `?t=day|dusk|night` or `?phase=` (freeze the time of day).

## Tech stack

Vite + React 18, React Three Fiber / three.js, drei (toon outlines), @react-three/postprocessing (bloom, vignette, grain), Fredoka font. Source: `src/App.jsx` (world, traveller, camera), `src/world.js`. Design notes: `ART_DIRECTION.md`; sample renders in `screenshots/`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5190
npm run build    # outputs dist/
npm run preview  # http://localhost:4190
```

## Deploy

Pushes to `main` run `.github/workflows/pages.yml` (`npm ci`, `npm run build`) and deploy `dist/` to GitHub Pages. Vite uses `base: './'`, so assets resolve under `/tiny-planet/`.
