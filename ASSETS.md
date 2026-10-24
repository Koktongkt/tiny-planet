# Assets & licences

Tiny Planet uses **no third-party 3D models, textures or images**. Every mesh (terrain, houses, people, trees, train, boats, ruins, water) is generated in code with three.js primitives, lathe shapes and shaders.

- Font: Fredoka, bundled locally via `@fontsource/fredoka` (SIL Open Font License 1.1).
- Code libraries: three.js (MIT), React (MIT), @react-three/fiber, drei, postprocessing (MIT).
- No CC0 model packs (Quaternius or Kenney) are included, so no CC0 attribution is needed.

## Gather & Craft assets (first-party)
- `src/assets/traveller-sheet.png/.svg`: our own 2.5D sprite sheet. It is generated in code by `tools/sprites.mjs`.
- Item and UI icons (`src/game/icons.jsx`): hand-drawn-style SVG paths and filters written in code. They are not taken from any icon set.
- 3D props, sheep, the bench, the rope bridge and decor (`src/game/World.jsx`): built from three.js primitives in code.
- The Home sign texture is drawn at runtime on a canvas with the bundled Fredoka font (OFL).
- No third-party art, icons, sounds or fonts were added this round.

- Loader font: Cormorant Garamond 500 italic, latin subset (`public/fonts/cormorant-500i.woff2`, from @fontsource, SIL OFL; licence in `public/fonts/OFL-cormorant.txt`). All loader art is inline SVG made in code.

## Ambient audio & music (Stage B, first-party, no third-party sounds)
- Wind, river/stream, lake lapping, night insects, birdsong and river bubbles (`src/audio/engine.js`): synthesised live in the browser with WebAudio (filtered white/brown noise, oscillators, LFOs). No sample files, no downloads.
- Music (audio-d, replaces the Stage B piano loop): four **original compositions** written for Tiny Planet in a folk / waltz style — 'Little Planet Waltz' (outdoors), 'Lamplight' (her house), 'Professor Hoshino's Cabinet' (museum), 'Rails Through the Meadow' (train) — stored as chords + melody text in `src/audio/music/score.js` and played live by `src/audio/music/player.js`. Every instrument (piano, celesta, pizzicato, harpsichord, nylon guitar, flute, ocarina, clarinet, accordion, strings, light percussion) is synthesised in the browser (`src/audio/music/inst.js`, `src/audio/dsp.js`): no soundfonts, no sample files, no downloads.
- Activity SFX (`src/audio/sfx.js`): footsteps, fishing, foraging, digging, camera, journal, donations, dialogue voices, doors, coins, train bell, jingles, pet bark / meow — all synthesised once in the browser (first-party).
- UI blips (`src/act.js`): synthesised WebAudio tones (first-party); a fallback until the audio chunk's SFX are loaded.
