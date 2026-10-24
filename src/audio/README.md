# src/audio: ambience, the score and activity SFX (Stage B + audio-d)

Self-contained and lazy. It adds **nothing to the startup chunk** except `arm.js` (already there) and one line in `act.js`.

| chunk | gz | loads |
|---|---|---|
| `arm.js` (in index) | ~0.1 KB | at boot; waits for the first `pointerdown` / `keydown` |
| `ambient` (runtime, engine, zones, sfx, hooks, dsp) | ~12.4 KB | on the first gesture |
| `player` (score, instruments, player) | ~7.4 KB | 3 s later (only if Music > 0) |
| `chip` | ~1.5 KB | only with `chip: true` (the SettingsPanel replaces it in the game) |

No audio files are downloaded: every instrument and sound is synthesised in the browser (see ASSETS.md).

## Mount (done in `src/game/UI.jsx`)
```js
import { armAudio } from '../audio/arm.js'; armAudio({ chip: false })
```
`armAudio(opts)` creates and resumes the AudioContext inside the first gesture (iOS needs this), then `import()`s `./ambient.js` and calls `startAudio({ ...opts, ctx })`.

## API
```js
const A = startAudio({ getListener?, getZones?, chip?, music?: true, musicDelay?: 3000 })
A.setVolume(0..1); A.setMusic(0..1); A.setSfx(0..1); A.mute(bool); A.sfx(name, opts?); A.dispose(); A.settings // {volume, music, sfx, muted}
getAudioSettings(); onAudioSettings(fn)          // persisted in localStorage 'tp-audio'
window.__tpAudio = { ctx, sfx /* bus */, play(kind) /* act.js kinds */, fx(name, { delay, at, vol, rate, pan }) }
```
Gains: `master` (Volume, mute) → `amb` / `music` (Music × 1.4) / `sfx` (Sounds × 1.8) → soft limiter. Settings: `live.js applySettings` now also persists and applies `sfx` (save schema default `sfx: 0.8`, so the SettingsPanel shows its "Sounds" slider).

## The score (`music/`)
- `score.js`: four original pieces as chord symbols + melody text, and `arrange(id, scene, cycle, section)`, which picks the parts per 8-bar section.
  - **outdoor**: 'Little Planet Waltz', 3/4 at 138 bpm in F, 32 bars (~42 s). The lead rotates each pass: piano, then flute (ocarina in summer, clarinet in autumn, celesta in winter) with celesta answers, then accordion doubled by piano. Under it: an oom-pah-pah of pizzicato bass with accordion / pizz / piano stabs, a pad, shaker (sleigh bells in winter), guitar arpeggios and celesta sparkles in the second half. Uses a borrowed iv (Bbm) and a D-minor middle.
    - Season shifts the key and tempo (summer G, autumn D, winter Eb).
    - Evening is slower, with guitar stabs and a triangle. Night is a music box with harp-like guitar.
    - Rain switches to soft solo piano with strings; the music bus also darkens (lowpass) and ducks about 3 dB.
  - **house**: 'Lamplight', 4/4 at 72 bpm in C. Music box (or piano on alternate passes), nylon guitar arpeggios, warm strings, lydian #11 and a borrowed Fm6.
  - **museum**: 'Professor Hoshino's Cabinet', 4/4 at 96 bpm in A minor. Celesta or clarinet lead, harpsichord Alberti, walking pizzicato, woodblock ticks, a Neapolitan Bb and Fmaj7#11 for the wonder.
  - **train**: 'Rails Through the Meadow', 4/4 at 132 bpm in G. Ocarina or flute, offbeat guitar strums, a shaker chug, an accordion pad. It plays on top of the train bus.
- Feel: swing on the eighths, a Viennese lilt on waltz beat 2, ritardando at the 4- and 8-bar phrase ends, ±6 ms humanising, accents on downbeats and long notes.
- `inst.js`: sampled voices (piano, celesta, pizz, harpsichord, guitar, plus percussion) are rendered once in JS at 24 kHz, one root every 6 semitones, and re-pitched with `playbackRate`. Live voices (flute, ocarina, clarinet, accordion, strings) are PeriodicWave oscillators with vibrato, breath chiff and a detuned twin.
- `player.js`: one **deck** per piece. A change of place crossfades over 2.2 s; two decks play only during the fade. Each 10 Hz tick schedules whole bars ahead on the audio clock. One shared convolver room: 2.4 s, or 1.5 s on touch.

### Where she is (`zones.js defaultListener` → `ambient.js sceneFor`)
`loc` comes from state the game already has:
- `'house'` when `window.__home.inside` is true (Room.jsx `HOME.inside`).
- `'museum'` when `window.__museum.inside` is true (systems/museumC.js `MU.inside`).
- `'train'` when `window.__scRide.riding` is true (liveC `RIDE`).
- `'outdoor'` otherwise.

The other scene fields:
- `inside` is now true in the museum too, so the outdoor ambience is muffled there and rain becomes roof patter, as in the house.
- `period` comes from `T.night`: day below 0.15, evening up to 0.6, night above.
- `season` comes from `T.season`; `rain` from the zones (`T.rain` / `T.kind`).

## SFX (`sfx.js` + `hooks.js`)
- 47 recipes. Each is rendered once into a mono AudioBuffer (24 kHz, ≤ 2.7 s) when it's first used, and all of them are pre-warmed in ≤ 4 ms idle slices after start.
- Playback is one buffer source plus one gain, with at most 12 at once (the oldest is stolen first).
- Footsteps and talk have 3 seeded variants, played with a random rate between 0.92× and 1.08×.

Where each sound is triggered. Nothing below needs Codor's wiring; it is all hooked from the audio chunk.

| event | sound | hook |
|---|---|---|
| any `startAct` / `blip(kind)` | pick, spark, craft, water, door, place, feed (kibble), cook, bath, tea, read → page, sleep (music box), cast (whoosh + line), reel → splash | `act.js blip` asks `__tpAudio.play(kind)` first; the old blip is the fallback |
| petting | `bark` (Pip, when `Dog.jsx` sets `__lastAct.kind = 'dog'`) or `meow` (Mochi) | `act('pet')` |
| bobber lands / bite / reeling / catch / slipped | `plop`, `bite`, `reel` ratchet (rate follows the net's lift `bv`), `catch`, `catch_rare` (koi, sea_bream), `catch_legend` (lake_lord), `slip` | diffs `window.__fishSt` (UI.jsx) |
| dialogue page | `hmm` / `hmm2` / `hmm3` for Professor Hoshino (`key === 'scholar'`); `talk` chirps at a per-villager pitch for everyone else | diffs `window.__talk.open/page` |
| panel open / close | `page` (journal), `ui_open`, `ui_close` | diffs `G.ui.panel` |
| item into the bag / coins | `bag` (throttled), `coin` / `coin_spend` | diffs `G.s.inv` |
| tutorial step | `tut` | diffs `G.s.tutorial.done` |
| photo mode / shutter / saved | `photo_open`, `ui_close`; `shutter` then `photo_saved` when the promise resolves | `SC.PH.on`; wraps `SC.shutter` |
| donate | `donate` (when it returns true) | wraps `SC.donate` |
| dig | `dig`, then `relic` (only when something was found) | wraps `SC.digAt` |
| board / alight | `bell` / `alight` (the departure whistle stays in the engine's train bus) | diffs `__scRide.riding` |
| gift / errand delivered | `gift` (or `slip` for a disliked gift), `quest` | wraps `SB.giveGift`, `SB.deliverErrand` |
| footsteps | `step_grass`, `step_wood` (house), `step_stone` (museum, village paths), `step_wet` (rain) | predicted from `__player.phase` (one per π) between ticks; off in orbit, panels, fishing, photo mode and on the train |

## Cost
- Main thread:
  - Instrument samples take ~100 ms in total, rendered in ≤ 6 ms slices with the current place's instruments first. The first piece waits for its own samples.
  - Tick: ~0.1 ms typical, ≤ 2.5 ms worst.
  - SFX warm-up runs in ≤ 4 ms slices.
- Memory: ~8.6 MB of sample buffers.
- Audio thread, measured offline on the box:
  - Ambience alone: ~7% of real time.
  - With the score: ~13%, of which ~4% is the convolver.
  - On touch devices the shorter room and the lower note cap (48, where the tune and bass are never skipped) reduce this.
- The context suspends when muted or hidden; the score rejoins in time and doesn't catch up.

## Previews / tests
- `node --test tests/unit/audio-d.test.mjs`: the score parses, the accompaniment is chord-true, the voice load, crossfades, SFX renders and the hooks.
- Offline renders through the real graph: `/workspace/tiny-planet-perf/audio-d/render.mjs` (dev server).
- Live probe: `/workspace/tiny-planet-perf/audio-d/probe.mjs`.
