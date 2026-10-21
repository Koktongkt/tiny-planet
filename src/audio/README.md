# src/audio: ambient sound + piano loop (Stage B)

Self-contained. It makes **no App.jsx changes** and has **zero startup-chunk cost** when mounted from a lazy chunk.

## Mount (Codor)
Recommended, 0 bytes in the startup chunk: add one line at module level in a chunk that loads right after the first frame, e.g. the end of `src/game/UI.jsx`:
```js
import { armAudio } from '../audio/arm.js'; armAudio() // Stage B ambient audio (src/audio): starts on first gesture
```
Alternative in `src/main.jsx`: `import { armAudio } from './audio/arm.js'; armAudio()`. This catches even a gesture made before the game chunk has loaded, but costs about 0.11 KB gz in the index chunk (69.96 to 70.07 KB, which is over the 70 KB budget).

`armAudio(opts)` adds capture listeners for `pointerdown` and `keydown`. On the first gesture it creates and resumes the AudioContext inside the gesture, which iOS requires. It then `import()`s `./index.js` and calls `startAudio({ ...opts, ctx })`.

## API (stage-b-contract.md)
```js
import { startAudio, getAudioSettings, onAudioSettings } from './audio/index.js' // lazy chunk
const A = startAudio({ getListener?, getZones?, chip?: true, music?: true, musicDelay?: 4000 })
A.setVolume(0..1); A.setMusic(0..1); A.mute(bool); A.dispose(); A.settings // {volume, music, muted}
getAudioSettings() // {volume, music, muted}, for <SettingsPanel value>
onAudioSettings(fn) // -> unsubscribe; fires on every change (persisted in localStorage 'tp-audio')
```
- `getListener()` returns `{ n: unit Vector3 on the planet, mode: VIEW.mode, inside: bool, night: 0..1 }`. The default reads `window.__player`, `window.__home`, `window.__layout` and `T`/`VIEW` from common.jsx.
- `getZones(listener)` returns 0..1 weights `{ river, lake, forest, village, meadow, hill, night }`. The default (`zones.js`) uses world.js (`streamNear`, `ZONES`, `height`).
- `chip: false` hides the built-in parchment speaker and note chip, for when the SettingsPanel takes over.
- SFX share the master and mute when `src/act.js` uses `window.__tpAudio.{ctx, sfx}` (see the 2-line patch in the art-b report).

## Cost
- 0 KB is fetched before the first gesture. After it, ~4.5 KB gz of JS (index + engine + zones) plus 1.5 KB gz for the chip. The procedural layers download nothing. The piano (`public/audio/piano-loop.ogg`, 328 KB; `.m4a` 396 KB for Safari) streams through an `<audio>` element 4 s later and decodes off the main thread.
- The graph builds in ~27 small tasks (≤ ~3 ms each, usually ~1 ms), so there are no long tasks. Mix updates run at 10 Hz on a timer, never per frame. The AudioContext suspends when muted or the tab is hidden.

## Re-rendering the piano
`node src/audio/render/piano.mjs out.wav`, then see ASSETS.md for the ffmpeg lines.
