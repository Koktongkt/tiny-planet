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
- Piano loop (`public/audio/piano-loop.ogg` Opus ~40 kbps, `public/audio/piano-loop.m4a` AAC 48 kbps for Safari, 64 s, seamless): an **original composition** written for Tiny Planet (F major, IV–V–iii–vi–ii–V7sus–I, 60 BPM). It was rendered offline by our own additive piano synth and reverb in `src/audio/render/piano.mjs` (no soundfont or samples), then encoded with ffmpeg (`-af lowpass=f=7500 -c:a libopus -b:a 40k -vbr constrained`; `-c:a aac -b:a 48k -movflags +faststart`). Released with the game; free of third-party rights.
- UI blips (`src/act.js`): synthesised WebAudio tones (first-party).
