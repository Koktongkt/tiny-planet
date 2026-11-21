# Cozy Chibi animation (Tiny Planet)

In-repo animation reference for Tiny Planet humans in the approved lifelike Cozy Chibi style. Taken from her (the player) and written so any chibi human (villagers, Hoshino) can share the same life layer.

Companion design guide (proportions, face, hair, colours, mesh perf): [`chibi-character-design.md`](chibi-character-design.md). Do **not** build a new villager until KT asks.

Procedural "life" for Cozy Chibi humans: breathing, fidgets, a bouncier walk, head-led turns, look-at, blinks, saccades, expression crossfades, and secondary motion on hair, scarf and satchel. The approved baseline is her (`src/art/chibi/`). Reuse this layer for any new chibi human; do not invent a second animation system.

## Architecture

All motion is **additive** on bones the shared base pose already resets each frame. Never write `root.rotation.y` or `root.rotation.z` (the base does not reset those; values accumulate). Frame-rate independent. No per-frame allocations.

| Piece | Where | Role |
|---|---|---|
| `lifeCore.js` | `src/art/chibi/lifeCore.js` | Pure helpers (no three / react): damped `spring` (sub-steps ≤ 1/120 s, zeta 0.5–0.8 reads "alive"), `approach`, blink scheduler, gaze/saccade scheduler, `envelope`. Unit-tested in `tests/unit/chibi-life.test.mjs`. |
| `life.js` | `src/art/chibi/life.js` (lazy chunk) | `makeLife`, `lifeStep`, `lifePost`, `HAIR_OFF`. Body, look-at, mood, blinks, gaze, hair springs. |
| Face shader | `src/art/chibi/ChibiHer.jsx`, `ChibiFace` | Analytic eyes and blush (pass-8 look when static). Atlas holds brows, nose and mouth only. Reads `st.life` (`open`, `gx`/`gy`, `blush`, `squint`, `mood`). Cell crossfade via `uCellA` / `uCellB` / `uMix`. |
| Hair offsets | same file, `aW` attribute + `HOFF` in the hair shader and ink hull | Vertex offsets from `HAIR_OFF` (side bun L/R, top bun, front locks). Still **two draws**. |
| Hooks in `GhibliPerson.jsx` | `cfg.ext.life(B, st, dt, t, R_, mem, state)` after the walk/idle/activity pose; `cfg.ext.post(R_, st, dt, t)` after the base scarf/bag springs | Tiny, shared, opt-in. Characters without `ext` (current villagers) are unchanged. Also exports `mkOutline` so a hair ink hull can share the offset uniform. |

`CHIBI.ext.life` constructs `mem.life` once, sets `st.life`, then calls `lifeStep`. `CHIBI.ext.post` calls `lifePost`. Keep **all new logic in the lazy character chunk**. The startup chunk may only gain the two hook call-sites (budget below).

Studio helpers (do not ship in the player path): `?still` freezes the life layer for matched stills; add `&life` to keep it. `?seq=walkrun` scripts idle → walk → turn → run → stop. `window.__chibiFace` / `?face=` still force a face. `window.__herLife` / `__herProf` are debug/perf probes.

## Behaviours and key numbers

Scale every additive angle and offset by `MOT` (`1`, or **0.35** when `prefers-reduced-motion: reduce`). Saccade amplitude also drops to `0.4` under reduced motion (and while focused on the bike).

**Breathing and weight shift** (idle only, `idleK = 1` when not moving and not in an activity). Breath `sin(t * 2.05)`: chest scale y × `1 + 0.014`, x × `1 + 0.006`; hips scale y × `1 + 0.008`, x/z slightly inverse; arms counter-rotate on z (`±0.025`); head pitches `−0.012`. Weight shift `sin(t * 0.52) + 0.45 * sin(t * 0.21 + 1.3)` on hips x / hips z / chest z / head z.

**Idle fidgets.** After **2.5 s** still, then every **5–11 s**, never the same action twice in a row. Envelope ramp 0.45 s.

| Fidget | Duration | What it does |
|---|---|---|
| `look` | 3.4 s | Head (and a little chest) yaws; eyes lead; blink at mid-point. |
| `stretch` | 2.6 s | **Forward reach, not overhead.** Upper arms `x −1.55`, `z ±0.55`; forearms `x −0.15`; chest `x −0.05`; head `x −0.08`; a little rise and heel press. Peak head pitch stays ~0.13 rad so the face does not appear to slide, and the hands stay clear of the side buns. An overhead yawn (`z ±2.3`, head `−0.3`, chest `−0.16`) put the hands through the buns and pitched the head so far back the decal looked like it was sliding up the forehead — do not go back to that. |
| `rock` | 2.8 s | Rocks on the heels; arms settle slightly. |
| `satchel` | 2.0 s | Right arm reaches to the bag; a small bag kick. |

**Walk and run.** Chibi walk params (her): `{ rate: 11, stride: 0.55, knee: 0.8, bounce: 0.026, arm: 0.7, lean: 0.06, twist: 0.12, sway: 0.075, idle: 'contra' }`. Run is detected from the phase rate (walk ~7.4/s, run ~10/s): `clamp((rate - 8.3) / 1.6, 0, 1)`. Extra forward lean **0.13 rad**, small extra bounce `0.004 * run * (1 − |sin phase|)`, bigger arm swing, head overlap spring on the bob (`freq 3.2`, `zeta 0.5`, clamp ±0.08).

**Start / stop.** A spring (`freq 1.7`, `zeta 0.42`) kicked by `−Δspeed * 1.6`: a small rock back on start, a forward pitch and settle on a sudden stop, hip squash. Lean clamp `−0.18 … 0.2`.

**Head-led turns.** The shared base rig turns the head by `~0.22 * turn` *against* the turn — cancel that, then add a lead of `0.2 * turn` (clamp ±0.4). A small body lean `−0.04 * turn * move` (clamp ±0.08). Blink when `|turn|` crosses **1.1**.

**Look-at.** Scan villagers and Pip (~3 Hz). Head takes **55%** of the offset via a spring (`freq 2.2`, `zeta 0.75`); the eyes take the rest. Yaw clamp ±1.1 rad, pitch ±0.3. **Ignore** a target behind the character (`|atan2(x, z)| > 1.9`) or **on the head** (`offset.lengthSq() < 9e-4`, about 0.03 units) — a target inside the head makes yaw flip and the eyes twitch. Occasional glance at the camera after 6 s idle (wait 8–18 s, hold ~2–4 s).

**Bike.** Lean into turns `clamp(−turn * 0.12, ±0.2)`, a happy wobble `0.025 * sin(t * 2.1)`, head tilt and a little bop. Mood is `focus` for 4.6 s of every 7 s, then a smile.

**Hair / bun springs.** Four damped springs driven by head acceleration and yaw velocity, written into `HAIR_OFF` and read by the hair + ink shaders (no extra draws). Params `[freq, zeta, gain, limit]`: side L/R `[3.0, 0.42, 1.0, 0.0045]` / `[3.1, 0.42, 1.0, 0.0045]`, top bun `[4.2, 0.5, 0.7, 0.003]`, front locks `[5.0, 0.55, 0.45, 0.002]`. **Side buns may only travel out and up from rest** (`y ≥ 0`, inward ≤ 0.4 mm). Do not let them overshoot down or in toward the shoulder on a down-bounce.

**Scarf and satchel.** `lifePost` runs *after* the base scarf/bag springs (the base kick `−bobVel * 6` and a sideways swing of ~0.8 rad will put the tails into the chest or shoulder). Then: extra overshoot on start/stop/turns; **while moving, scarf `rotation.x` must stay `≤ −0.5 * move`** (tails swing out from the chest, never into the bib); **`rotation.z` clamped to ±0.3**. Satchel gets a lean kick and the fidget bag kick. Villagers that do not opt into `ext.post` are unaffected.

**Smooth knee / foot rectifier.** The base knee is `max(0, cos(phase))` — a kink as the leg straightens, worse with a bouncier walk. In the life layer, replace that kink with a smooth rectifier of width **`KE = 0.3`** on knee and foot, and keep the extra run bounce small (0.004). The knee must never lock straight or pop.

**Blinks.** Random every **2–6 s**; **~18%** are double blinks (gap 0.16 s). Close 60 ms, hold 40 ms, open 120 ms (smoothstep). Extra blinks on a quick head turn and at the mid-point of a look-around. Sleepy: drowsy half-lids (`open ≈ 0.42`), fully shut on a nap or a very long idle (>25 s). Forced `?face=blink` / `sleepy` still work.

**Saccades.** Calm, never twitchy. Hold **0.35–1.5 s**. Each move is at least **0.12** eye-units from the last (no micro back-and-forth). Wanted focus is low-passed first (`approach` rate 8). The eye itself approaches at rate 22, **slew-limited to 12 eye-units/s**, monotonic — no spring, so no ringing. Unit-test holds, reversals and the slew limit at 30 / 60 / 144 fps.

**Expressions.** Cells: `happy`, `focus` (flatter smile, slightly lower brows), `sleepy`, `excited` (eyes × 1.05, open mouth). Crossfade at rate **9 / s** (`uCellA` / `uCellB` / `uMix`), not a hard swap. Continuous params for lids, lash shape, eye size, squint and blush. Blush pulses when happy or excited: `1 + 0.32 * blush * (0.75 + 0.25 * sin(t * 2.6))`. Smile + blush + slight squint near friends or while dialogue is open; excited on waves, pickups, pets, photos. They do not speak in dialogue — listen with a nod and a smile; hook a mouth-cell crossfade only if a character gets voice lines.

## Perf rules

- **No new draw calls.** Hair stays two draws (cel + ink); face stays one. No new meshes or textures for life. The atlas stays 2×2 cells.
- **No per-frame allocations.** Reuse module-level scratch vectors; springs and schedulers mutate existing state.
- **Life-layer CPU:** keep it well under **0.2 ms/frame** even with 4× mobile CPU throttle (her baseline ≈ 0.03–0.05 ms desktop, 0.09–0.15 ms on iPhone 13 emulation at 4×). Profile with `window.__herProf = { ms: 0, n: 0 }` around `lifeStep`.
- **Startup chunk** (entry, gzip **level 9**, `tests/perf/budget.mjs`): target **≤ 70 KB**, fail **> 80 KB**. New animation code belongs in the lazy character chunk. A hook in `GhibliPerson.jsx` must stay tiny (her life layer added **+0.03 KB**; the cap for that hook is about **+0.3 KB**).
- **Walk-view scene budgets:** mobile **350 calls / 390k tris**, desktop **500 / 600k**. Her own share is 22 calls / 58,380 tris — do not grow it.
- No lag on iPhone. `prefers-reduced-motion` is mandatory (`MOT = 0.35`).

## Glitch checklist

Review clips (or stepped frames) before showing KT. For each item, fix in the life layer or the capture path, not by weakening the shared villager pose unless the bug is truly in the shared rig and KT agrees.

1. **Eye jitter / twitch.** Eyes must hold 0.35–1.5 s and move once, smoothly, in one direction. Check: a gaze spring that is underdamped; a look target that changes every frame; a target on or inside the head (including a debug hook that writes `0,0,0`); excited mode raising the saccade rate. Confirm with the gaze unit test and by sampling `gx` during an expression change.
2. **Scarf in the chest or bib.** Watch downward walk bounces and turns from the front. After `lifePost`, tails must stay off the bib (`rotation.x ≤ −0.5 * move`) and near the centre line (`z` in ±0.3).
3. **Side bun in the shoulder or arm.** Watch the near bun on the down-bounce (front and 3/4). It must not travel below or inward of rest. If a new hairstyle sits on the shoulder, give it the same out-and-up clamp (or a tighter one).
4. **Knee pop as the leg straightens.** Watch the far leg at mid-stride, especially into a run. Plot knee/foot `rotation.x` if needed: a kink in the first or second difference means the rectifier is missing or too sharp. Never let the knee lock at 0.
5. **Hands through the hair, or the face “sliding” up the head.** The face decal is a rigid child of the head bone (skin weight at the eyes/mouth should be ≥ 0.95). If the features look like they slide, the head is pitching too far, not the UVs coming loose — reduce the idle/fidget head pitch (keep stretch ≲ 0.13 rad). Arms that go overhead will hit side buns; use a forward/outward reach instead. Check the peak from front, 3/4, side and back.

Also: do not capture with the **hero** camera (see below). A solid wall filling the frame is almost always the camera inside scenery.

## Capture and verify

- In-game clips use the **follow** camera (what players use; it raycasts against `OCC` and will not go through walls). **Never** `?view=hero` or `window.__setView('hero')` — hero sits 0.95 forward and 0.45 to the side with no occlusion, and will clip through houses.
- Start bike (and other in-world action) clips in the **meadow** (`?at=meadow`), not the village square, so the whole clip stays in the open. Capture zoom may be tightened in the script (`window.__cam.zoom = 0.7`) without changing the game camera.
- Review the stepped frames yourself (especially starts, stops, turns, down-bounces, stretches, blinks, expression changes, and 1 s either side of any suspected glitch) **before** showing KT.
- `npm run build` and `node --test tests/unit/*.test.mjs` must pass. Add or extend tests when you change `lifeCore` (springs, blink, gaze).
- Check the startup chunk with `tests/perf/budget.mjs` (gzip level 9) and confirm draw calls / tris have not grown.

## Process

- Work in a **new worktree**, branched from `origin/main`. `/workspace/tiny-planet-repo` is read-only and must never be used.
- **Commit after each milestone. Never push.** Codor pushes. Nothing merges or goes live without **KT's yes**.
- Leave other characters unchanged unless the task is specifically to give them this layer.
- Do not send or post anything externally.

## Adding a new villager

Do not start a villager until KT asks. When they do:

1. Read the companion design guide (`docs/characters/chibi-character-design.md`) first, then this document. Match approved proportions, face recipe and hair construction; change identity with hair, colour, age and outfit, not a new body language.
2. Put the character in a **lazy** module. Do not add animation logic to the startup chunk.
3. Reuse `lifeCore.js`. Parameterise `life.js` (or a thin wrapper) with that character's fidget set, walk params and hair-spring weights. Wire `cfg.ext.life` and `cfg.ext.post` only — do not grow `GhibliPerson` beyond the existing hooks.
4. Drive the face from `st.life` (analytic eyes if they share the shader; otherwise still blink / gaze / crossfade rather than hard swaps).
5. Tune hair and scarf clamps for *their* hair and costume (a bob, a hat, or no satchel will need different limits than her side buns).
6. Run the unit tests, the startup-chunk check, the glitch checklist, and a follow-camera capture (meadow or another open spot). Confirm reduced-motion still damps them.
7. Commit, do not push, and wait for KT.
