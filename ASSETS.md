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
- Music: the supplied MP3s in `src/audio/music/tracks/` play “Sunlit Hearthside Tales” in the house and “Sunlit Valley Stroll” outdoors. The original pieces in `src/audio/music/score.js` play in the museum and on the train and serve as fallbacks for the house and outdoor recordings.
- Activity SFX (`src/audio/sfx.js`): footsteps, fishing, foraging, digging, camera, journal, donations, dialogue voices, doors, coins, train bell, jingles, pet bark / meow — all synthesised once in the browser (first-party).
- UI blips (`src/act.js`): synthesised WebAudio tones (first-party); a fallback until the audio chunk's SFX are loaded.
